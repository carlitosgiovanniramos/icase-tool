import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearContexto } from "@/lib/contexto";
import { CARACTERISTICAS_25010, INSTRUCCION_25010, normalizarRNF } from "@/lib/iso25010";
import { leerJson, sumarCosto, normalizarCodigo } from "@/lib/jsonIA";

export const maxDuration = 300;

// Después de generar se revisa el conjunto: referencias entre requerimientos, actores, redacción
// y clasificación. Lo que se puede comprobar por código se le devuelve a la IA para que lo
// corrija (un solo reintento). Lo que no (que un requerimiento dé por hecho algo que ningún otro
// cubre, o un flujo sin salida) lo busca una segunda llamada que solo revisa: pedirle a la misma
// respuesta que declarara sus propios huecos no funcionó, porque lo que no notó al escribir
// tampoco lo declara. Lo que encuentre el revisor sale como advertencia; no cambia el análisis.

const METODOS = ["Inspección", "Análisis", "Demostración", "Prueba"];
const MAX_HUECOS = 6;
// Las rutas tienen 300 s; si al revisor le quedarían menos de estos, no se intenta.
const LIMITE_RUTA_MS = 270_000;
const MINIMO_REVISION_MS = 30_000;

// Revisa el análisis y devuelve la lista de problemas (vacía si todo está bien).
function validarAnalisis(analisis) {
  const problemas = [];
  const rf = analisis.requerimientos_funcionales || [];
  const rnf = analisis.requerimientos_no_funcionales || [];
  const todos = [...rf, ...rnf];
  const actores = new Set((analisis.actores || []).map((a) => a.nombre));
  const codigos = todos.map((r) => normalizarCodigo(r.codigo));
  const existentes = new Set(codigos);

  if (!rf.length) return ["No hay requerimientos funcionales."];

  const repetidos = [...new Set(codigos.filter((c, i) => codigos.indexOf(c) !== i))];
  if (repetidos.length) problemas.push(`Códigos repetidos: ${repetidos.join(", ")}.`);

  const dependencias = new Map();
  for (const r of todos) {
    const codigo = normalizarCodigo(r.codigo);
    const deps = (Array.isArray(r.dependencias) ? r.dependencias : []).map(normalizarCodigo);
    dependencias.set(codigo, deps);

    const inexistentes = deps.filter((d) => !existentes.has(d));
    if (inexistentes.length) problemas.push(`${r.codigo} depende de ${inexistentes.join(", ")}, que no existe.`);
    if (deps.includes(codigo)) problemas.push(`${r.codigo} depende de sí mismo.`);

    const desconocidos = (r.actores || []).filter((a) => !actores.has(a));
    if (desconocidos.length) problemas.push(`${r.codigo} usa actores que no están en la lista: ${desconocidos.join(", ")}.`);

    if (!/^El sistema\b.*\bdeb(e|erá|era)(?![a-záéíóúñ])/i.test(String(r.descripcion || ""))) {
      problemas.push(`${r.codigo} no está redactado como "El sistema debe...".`);
    }
    if (!METODOS.includes(r.metodo_verificacion)) problemas.push(`${r.codigo} no tiene un método de verificación válido.`);
  }

  // Dependencias en círculo: A depende de B y B (directa o indirectamente) de A.
  const estado = new Map();
  const enCiclo = [];
  const visitar = (c) => {
    if (estado.get(c) === "listo") return;
    if (estado.get(c) === "abierto") return void enCiclo.push(c);
    estado.set(c, "abierto");
    (dependencias.get(c) || []).filter((d) => existentes.has(d)).forEach(visitar);
    estado.set(c, "listo");
  };
  [...dependencias.keys()].forEach(visitar);
  if (enCiclo.length) problemas.push(`Hay dependencias en círculo que pasan por: ${[...new Set(enCiclo)].join(", ")}.`);

  for (const r of rnf) {
    const caracteristica = CARACTERISTICAS_25010.find((c) => c.nombre === r.categoria);
    if (!caracteristica) problemas.push(`${r.codigo} tiene una categoría que no es de ISO/IEC 25010: "${r.categoria}".`);
    else if (r.subcategoria && !caracteristica.subcaracteristicas.includes(r.subcategoria)) {
      problemas.push(`${r.codigo}: "${r.subcategoria}" no es una subcaracterística de "${r.categoria}".`);
    }
  }

  return problemas;
}

const resumir = (r) =>
  `${r.codigo} - ${r.nombre}: ${r.descripcion} | antes: ${r.precondiciones || "-"} | después: ${r.postcondiciones || "-"}`;

// Segunda lectura del análisis ya escrito, por una IA que solo revisa. Devuelve { huecos, costo }:
// huecos es la lista de textos para mostrar como advertencias (vacía si no encontró nada o si la
// revisión falló: un fallo aquí no debe impedir entregar los requerimientos).
async function revisarHuecos(analisis, contexto, usarClaude, presupuestoMs) {
  const instrucciones = `
Eres un revisor de requerimientos de software. Otro analista escribió los requerimientos de abajo; tu único trabajo es encontrar lo que les FALTA para que el sistema se pueda usar de principio a fin. No los reescribas ni propongas mejoras de estilo.

Contexto del sistema:
${contexto}

Actores: ${(analisis.actores || []).map((a) => a.nombre).join(", ")}

Requerimientos funcionales:
${(analisis.requerimientos_funcionales || []).map(resumir).join("\n")}

Requerimientos no funcionales:
${(analisis.requerimientos_no_funcionales || []).map(resumir).join("\n")}

Busca SOLO estos cuatro tipos de problema:
1. SUPUESTO SIN CUBRIR: un requerimiento da por hecho algo que el sistema debería gestionar (cuentas de usuario y sus roles, un catálogo, un registro, una asignación) y ningún requerimiento permite crearlo o administrarlo. Recorre las precondiciones una por una: ¿qué requerimiento hace que esa condición sea cierta?
2. FLUJO SIN SALIDA: siguiendo los estados y las precondiciones, un registro puede quedar en una situación desde la que ningún requerimiento permite continuar ni volver atrás.
3. CONTRADICCIÓN: dos requerimientos que no pueden cumplirse a la vez, o una misma palabra usada para dos cosas distintas.
4. CONTRA LO DECIDIDO: un requerimiento exige algo que el contexto deja fuera del alcance o que contradice las tecnologías o decisiones ya tomadas.

No cuentan como problema: funciones nuevas que el contexto no pide, la infraestructura (servidores, internet, proveedores), ni lo que el contexto deja fuera del alcance. Tampoco pidas un requerimiento para administrar una lista de valores fijos que el propio requerimiento ya enumera (tipos, canales, estados), ni para un dato que el usuario escribe como texto libre: eso no es un catálogo. Reporta solo lo que de verdad impediría usar el sistema. Si no encuentras nada, devuelve la lista vacía: es una respuesta válida y preferible a inventar.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional (máximo ${MAX_HUECOS} problemas, los más graves primero):
{
  "huecos": [
    {
      "requerimientos": ["RF09"],
      "problema": "string (una frase: qué falta o qué choca, y por qué impide usar el sistema)"
    }
  ]
}
`;

  try {
    const response = await generarContenido({
      usarClaude,
      contents: instrucciones,
      config: { responseMimeType: "application/json" },
      presupuestoMs,
    });
    const existentes = new Set(
      [...(analisis.requerimientos_funcionales || []), ...(analisis.requerimientos_no_funcionales || [])].map((r) =>
        normalizarCodigo(r.codigo)
      )
    );
    const huecos = (leerJson(response.text).huecos || [])
      .filter((h) => h?.problema)
      .slice(0, MAX_HUECOS)
      .map((h) => {
        const codigos = (Array.isArray(h.requerimientos) ? h.requerimientos : []).filter((c) => existentes.has(normalizarCodigo(c)));
        return `${codigos.length ? `${codigos.join(", ")}: ` : ""}${String(h.problema).trim()}`;
      });
    return { huecos, costo: response.costoUsd };
  } catch {
    return { huecos: [], costo: undefined };
  }
}

export async function POST(request) {
  try {
    const { prompt, documentoTexto, imagenUrl, contexto: contextoElicitacion, usarClaude } = await request.json();

    let contexto = `Idea del usuario: ${prompt}`;

    const elicitacion = formatearContexto(contextoElicitacion);
    if (elicitacion) {
      contexto += `\n\nInformación de elicitación proporcionada por el usuario. Tiene prioridad sobre cualquier suposición tuya; respeta especialmente el alcance, los usuarios y las reglas de negocio:\n${elicitacion}`;
    }

    if (documentoTexto) {
      contexto += `\n\nContexto adicional extraído de un documento adjunto:\n${documentoTexto}`;
    }

    const instrucciones = `
Eres un analista de requisitos certificado, experto en ingeniería de requerimientos según la norma ISO/IEC/IEEE 29148:2018 (Systems and software engineering — Life cycle processes — Requirements engineering).

Con base en el siguiente contexto (y la imagen adjunta, si existe), identifica los actores principales del sistema y redacta TODOS los requerimientos funcionales y no funcionales necesarios para cubrir por completo el alcance descrito — ni más ni menos de los que el sistema realmente necesita. No hay un número fijo: un sistema simple puede necesitar pocos requerimientos y uno complejo puede necesitar muchos más; tú decides la cantidad según lo que exige el alcance.

${contexto}

Cada requerimiento debe cumplir las características de calidad que exige la norma ISO/IEC/IEEE 29148:2018 para un requisito individual:
- Necesario: se conecta directamente con una necesidad real descrita en el contexto.
- Singular/atómico: expresa UNA sola capacidad o restricción verificable (evita unir varias ideas con "y"/"además" en una misma descripción).
- No ambiguo: una sola interpretación posible.
- Verificable: debe poderse comprobar objetivamente que se cumplió.
- Factible: alcanzable con tecnología y recursos razonables.
- Libre de implementación: describe QUÉ debe hacer el sistema, no CÓMO se construye técnicamente.
- Redactado con lenguaje imperativo tipo "El sistema debe/deberá..." (equivalente al "shall" normativo).

Además, para cada requerimiento indica su método de verificación según la norma (uno de: "Inspección", "Análisis", "Demostración", "Prueba") — cómo se comprobará en la práctica que el requerimiento se cumple.

${INSTRUCCION_25010}

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta estructura exacta:
{
  "actores": [
    { "nombre": "string", "descripcion": "string" }
  ],
  "requerimientos_funcionales": [
    {
      "codigo": "RF01",
      "nombre": "string (título corto del requerimiento, 3-6 palabras)",
      "descripcion": "string (redactado como 'El sistema debe/deberá...', singular y verificable)",
      "dependencias": ["RF03"],
      "prioridad": "alta | media | baja",
      "actores": ["string (nombre de un actor ya listado arriba)"],
      "precondiciones": "string",
      "postcondiciones": "string",
      "metodo_verificacion": "Inspección | Análisis | Demostración | Prueba"
    }
  ],
  "requerimientos_no_funcionales": [
    {
      "codigo": "RNF01",
      "nombre": "string (título corto del requerimiento, 3-6 palabras)",
      "categoria": "string (característica ISO/IEC 25010)",
      "subcategoria": "string (subcaracterística ISO/IEC 25010 de esa característica)",
      "descripcion": "string (redactado como 'El sistema debe/deberá...', singular y verificable)",
      "dependencias": ["RF01"],
      "prioridad": "alta | media | baja",
      "actores": ["string (nombre de un actor ya listado arriba)"],
      "precondiciones": "string",
      "postcondiciones": "string",
      "metodo_verificacion": "Inspección | Análisis | Demostración | Prueba"
    }
  ]
}

Cierre del conjunto (revísalo ANTES de responder; es el error más frecuente):
- Todo lo que un requerimiento da por hecho que el sistema gestiona debe estar cubierto por otro requerimiento funcional. Ejemplos: si los usuarios inician sesión con un rol, debe existir el que crea las cuentas y asigna los roles; si uno valida o bloquea la asignación de un recurso, debe existir el que permite asignarlo; si uno exige que algo "esté registrado en el sistema" o menciona un módulo o catálogo, debe existir el que lo registra o administra; si uno consulta, exporta o notifica algo, debe existir el que lo genera.
- Recorre las precondiciones y descripciones buscando esos supuestos. Si encuentras uno sin cubrir, agrega el requerimiento que falta (salvo que el contexto lo deje fuera del alcance).
- Sigue cada registro por sus estados: desde cualquier estado debe haber un requerimiento que permita continuar. Si una validación puede bloquear un paso, el usuario debe poder corregir lo que falta.
- Si el contexto incluye tecnologías o decisiones técnicas ya tomadas, ningún requerimiento puede contradecirlas ni exigir algo que no ofrecen (ej. no pidas certificados digitales si se decidió una firma dibujada en pantalla).
- Un término significa lo mismo en todos los requerimientos: no uses una misma palabra para dos cosas distintas.

Reglas:
- "dependencias" es un arreglo con los códigos (RF/RNF) de otros requerimientos de los que depende; usa [] si no depende de ninguno.
- "actores" es un arreglo con nombres de actores que ya definiste en la lista "actores"; usa [] si no aplica un actor humano directo.
- "precondiciones" y "postcondiciones" deben ser concretas y verificables (qué debe cumplirse antes y qué queda garantizado después). Si para un requerimiento no funcional realmente no aplica alguna, usa "No aplica".
- El conjunto completo de requerimientos, visto en su totalidad, debe ser consistente (sin contradicciones entre sí) y completo (cubre todo el alcance descrito, sin dejar huecos).
- La cantidad de actores, requerimientos funcionales y no funcionales la defines tú según el alcance real del sistema descrito; no inventes actores que el contexto no justifique.
`;

    const parts = [{ text: instrucciones }];

    if (imagenUrl) {
      const respImg = await fetch(imagenUrl);
      const bufferImg = await respImg.arrayBuffer();
      const base64Img = Buffer.from(bufferImg).toString("base64");
      const mimeType = respImg.headers.get("content-type") || "image/png";

      parts.push({ inlineData: { mimeType, data: base64Img } });
    }

    const generar = async (partes) => {
      const response = await generarContenido({
        usarClaude,
        contents: partes,
        config: { responseMimeType: "application/json" },
      });
      const resultado = leerJson(response.text);
      // La categoría se lleva a los nombres exactos de la norma, aunque la IA los escriba distinto.
      resultado.requerimientos_no_funcionales = normalizarRNF(resultado.requerimientos_no_funcionales);
      return { response, resultado };
    };

    const inicio = Date.now();
    const inicial = await generar(parts);
    let { resultado, response } = inicial;
    let problemas = validarAnalisis(resultado);
    let costo = response.costoUsd;

    // Un solo reintento: se le muestran a la IA los problemas concretos y su respuesta anterior.
    if (problemas.length) {
      try {
        const correccion = `

TU RESPUESTA ANTERIOR TIENE ESTOS PROBLEMAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Respuesta anterior:
${JSON.stringify(resultado)}

Corrígela y responde de nuevo con el JSON completo.`;
        const reintento = await generar([{ text: instrucciones + correccion }, ...parts.slice(1)]);
        const problemasNuevos = validarAnalisis(reintento.resultado);
        costo = sumarCosto(costo, reintento.response.costoUsd);
        if (problemasNuevos.length <= problemas.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          problemas = problemasNuevos;
        }
      } catch {
        // Si el reintento falla, se conserva el primer resultado.
      }
    }

    // Revisión de huecos, si queda tiempo dentro del límite de la ruta.
    let huecos = [];
    const restante = LIMITE_RUTA_MS - (Date.now() - inicio);
    if (restante > MINIMO_REVISION_MS) {
      const revision = await revisarHuecos(resultado, contexto, usarClaude, restante);
      huecos = revision.huecos;
      costo = sumarCosto(costo, revision.costo);
    }

    return NextResponse.json({
      ...resultado,
      advertencias: [...problemas, ...huecos],
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
