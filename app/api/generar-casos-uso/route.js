import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { leerJson, sumarCosto, normalizarTexto, normalizarCodigo } from "@/lib/jsonIA";

export const maxDuration = 300;

// Diagrama de casos de uso en Mermaid (flowchart). Se probó en PlantUML, con notación UML
// estricta, pero en sistemas con varios actores conectados a muchos casos de uso su acomodo
// cruza las líneas y se vuelve ilegible; Mermaid lo ordena mejor. El prompt sigue la estructura
// CONTEXTO / QUÉ DEBE MOSTRAR / QUÉ NO QUIERO / FORMATO.
//
// Después de generar se valida el diagrama contra el análisis (casos y actores completos, enlaces
// según los actores de cada requerimiento, uso correcto de «include») y, si incumple, se pide una
// corrección (un solo reintento). Lo que quede pendiente se devuelve en "advertencias".

// Con más casos de uso que estos, el diagrama se agrupa en módulos para poder leerse.
const MAX_SIN_MODULOS = 12;
// Un caso incluido por muchos otros casi siempre es un requisito previo dibujado como «include».
const MAX_INCLUIDO_POR = 3;

// Tres colores: actores (blanco, borde navy), casos de uso (gris claro) y el límite del sistema.
const ESTILOS = `classDef actor fill:#ffffff,stroke:#1e293b,color:#1e293b,stroke-width:2px;
    classDef casoUso fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    style SISTEMA fill:#ffffff,stroke:#1e293b,color:#1e293b,stroke-width:1px`;
const ESTILO_MODULO = "fill:#ffffff,stroke:#94a3b8,color:#1e293b,stroke-width:1px,stroke-dasharray:4 3";

// Ejemplo de un sistema AJENO a cualquier proyecto real: muestra la sintaxis y, sobre todo, qué es
// un «include» (un paso que el caso base ejecuta siempre) y qué un «extend» (un agregado opcional).
const EJEMPLO = `flowchart LR
    CLIENTE["Cliente"]
    VENDEDOR["Vendedor"]

    subgraph SISTEMA["Sistema de Pedidos"]
        RF01(["Iniciar sesión"])
        RF02(["Registrar pedido"])
        RF03(["Validar existencias"])
        RF04(["Aplicar cupón de descuento"])
        RF05(["Consultar pedidos"])
    end

    CLIENTE --> RF01
    VENDEDOR --> RF01
    CLIENTE --> RF02
    CLIENTE --> RF04
    VENDEDOR --> RF05
    RF02 -.->|"«include»"| RF03
    RF04 -.->|"«extend»"| RF02

    ${ESTILOS}
    class CLIENTE,VENDEDOR actor
    class RF01,RF02,RF03,RF04,RF05 casoUso`;

function limpiarMermaid(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Los módulos (subgraph dentro de SISTEMA) reciben su estilo aquí, para que no tomen el amarillo
// por defecto de Mermaid.
function aplicarEstiloModulos(codigo) {
  const modulos = [...codigo.matchAll(/^\s*subgraph\s+(\w+)/gm)].map((m) => m[1]).filter((id) => id !== "SISTEMA");
  const faltan = modulos.filter((id) => !new RegExp(`^\\s*style\\s+${id}\\b`, "m").test(codigo));
  return faltan.length ? `${codigo}\n${faltan.map((id) => `    style ${id} ${ESTILO_MODULO}`).join("\n")}` : codigo;
}

const listar = (items, max = 6) =>
  items.slice(0, max).join("; ") + (items.length > max ? `; y ${items.length - max} más` : "");

// Revisa el diagrama contra el análisis y devuelve la lista de problemas (vacía si todo está bien).
function validarDiagrama(codigo, analisis) {
  if (!codigo) return ["El diagrama está vacío."];

  const requerimientos = analisis.requerimientos_funcionales || [];
  const porCodigo = new Map(requerimientos.map((r) => [normalizarCodigo(r.codigo), r]));
  const actoresAnalisis = (analisis.actores || []).map((a) => a.nombre);

  const etiquetas = new Map();
  const flechas = [];
  const modulos = new Set();
  for (const cruda of codigo.split("\n")) {
    const linea = cruda.trim();
    if (!linea || linea.startsWith("%%")) continue;
    const sub = linea.match(/^subgraph\s+(\w+)/);
    if (sub) {
      if (sub[1] !== "SISTEMA") modulos.add(sub[1]);
      continue;
    }
    const flecha = linea.match(/^(\w+)\s*(-->|-\.->)\s*(?:\|\s*"?([^|"]*)"?\s*\|\s*)?(\w+)\s*;?$/);
    if (flecha) {
      flechas.push({ origen: flecha[1], punteada: flecha[2] !== "-->", etiqueta: flecha[3] || "", destino: flecha[4] });
      continue;
    }
    const nodo = linea.match(/^(\w+)\s*[\[(]+\s*"([^"]*)"/);
    if (nodo && !/^(class|classDef|style|end)$/.test(nodo[1])) etiquetas.set(nodo[1], nodo[2]);
  }

  const problemas = [];
  const esCaso = (id) => /^RF\d+$/i.test(id);
  const casos = new Set([...etiquetas.keys()].filter(esCaso).map(normalizarCodigo));
  const actores = new Map([...etiquetas].filter(([id]) => !esCaso(id)).map(([id, texto]) => [id, texto]));

  // Casos de uso: uno por requerimiento funcional, ni más ni menos.
  const faltan = [...porCodigo.keys()].filter((c) => !casos.has(c));
  const sobran = [...casos].filter((c) => !porCodigo.has(c));
  if (faltan.length) problemas.push(`Faltan los casos de uso de estos requerimientos: ${faltan.join(", ")}.`);
  if (sobran.length) problemas.push(`Hay casos de uso de requerimientos que no existen: ${sobran.join(", ")}. Elimínalos.`);

  // Actores: los del análisis, con su mismo nombre.
  const idDeActor = new Map();
  for (const nombre of actoresAnalisis) {
    const id = [...actores].find(([, texto]) => normalizarTexto(texto) === normalizarTexto(nombre))?.[0];
    if (id) idDeActor.set(nombre, id);
    else problemas.push(`Falta el actor "${nombre}".`);
  }
  const inventados = [...actores].filter(([id]) => ![...idDeActor.values()].includes(id)).map(([, texto]) => `"${texto}"`);
  if (inventados.length) problemas.push(`Hay actores que no están en el análisis: ${inventados.join(", ")}. Elimínalos.`);

  // Enlaces actor → caso según "actores" de cada requerimiento. Un actor también llega a los
  // casos de los actores de los que hereda.
  const hereda = new Map();
  const directos = new Map();
  for (const f of flechas) {
    if (!actores.has(f.origen)) continue;
    if (actores.has(f.destino)) hereda.set(f.origen, [...(hereda.get(f.origen) || []), f.destino]);
    else if (esCaso(f.destino)) directos.set(f.origen, [...(directos.get(f.origen) || []), normalizarCodigo(f.destino)]);
  }
  const alcanza = (id, codigoRF, vistos = new Set()) => {
    if (vistos.has(id)) return false;
    vistos.add(id);
    return (directos.get(id) || []).includes(codigoRF) || (hereda.get(id) || []).some((g) => alcanza(g, codigoRF, vistos));
  };

  const sinEnlace = [];
  const deMas = [];
  for (const [codigoRF, r] of porCodigo) {
    if (!casos.has(codigoRF)) continue;
    const asignados = (r.actores || []).filter((a) => idDeActor.has(a));
    for (const a of asignados) if (!alcanza(idDeActor.get(a), codigoRF)) sinEnlace.push(`${a} → ${codigoRF}`);
    for (const [nombre, id] of idDeActor) {
      if ((directos.get(id) || []).includes(codigoRF) && !(r.actores || []).includes(nombre)) deMas.push(`${nombre} → ${codigoRF}`);
    }
  }
  if (sinEnlace.length) problemas.push(`Faltan enlaces de actores con casos de uso que tienen asignados: ${listar(sinEnlace)}.`);
  if (deMas.length) problemas.push(`Hay actores enlazados a casos de uso que no tienen asignados: ${listar(deMas)}. Quita esos enlaces.`);

  // Relaciones entre casos de uso.
  const entreCasos = flechas.filter((f) => esCaso(f.origen) && esCaso(f.destino));
  const sinTipo = entreCasos.filter((f) => !/include|extend/i.test(f.etiqueta)).map((f) => `${f.origen} → ${f.destino}`);
  if (sinTipo.length) problemas.push(`Hay relaciones entre casos de uso sin «include» ni «extend»: ${listar(sinTipo)}.`);

  const incluye = new Map();
  const incluidoPor = new Map();
  for (const f of entreCasos.filter((x) => /include/i.test(x.etiqueta))) {
    const [base, incluido] = [normalizarCodigo(f.origen), normalizarCodigo(f.destino)];
    incluye.set(base, [...(incluye.get(base) || []), incluido]);
    incluidoPor.set(incluido, [...(incluidoPor.get(incluido) || []), base]);
  }
  for (const [incluido, bases] of incluidoPor) {
    if (bases.length > MAX_INCLUIDO_POR) {
      problemas.push(
        `${incluido} ("${porCodigo.get(incluido)?.nombre || ""}") aparece incluido por ${bases.length} casos de uso (${bases.join(", ")}): eso es un requisito previo, no un paso que cada uno ejecute. Quita esos «include» y deja solo los de los casos que de verdad lo ejecutan dentro de su flujo.`
      );
    }
  }
  const enCiclo = (c, camino = []) => {
    if (camino.includes(c)) return true;
    return (incluye.get(c) || []).some((s) => enCiclo(s, [...camino, c]));
  };
  const ciclos = [...incluye.keys()].filter((c) => enCiclo(c));
  if (ciclos.length) problemas.push(`Hay «include» en círculo entre: ${ciclos.join(", ")}. Un caso no puede incluirse a sí mismo, ni directa ni indirectamente.`);

  if (casos.size > MAX_SIN_MODULOS && modulos.size < 2) {
    problemas.push(`Son ${casos.size} casos de uso: agrúpalos en módulos (subgraph dentro de SISTEMA) para que el diagrama se pueda leer.`);
  }

  return problemas;
}

async function generar(contents, usarClaude) {
  const response = await generarContenido({
    usarClaude,
    contents,
    config: { responseMimeType: "application/json" },
  });
  return { response, resultado: leerJson(response.text) };
}

export async function POST(request) {
  try {
    const { analisis, indicaciones, usarClaude } = await request.json();
    const totalCasos = (analisis.requerimientos_funcionales || []).length;

    const instrucciones = `
Genera un DIAGRAMA DE CASOS DE USO del sistema, en Mermaid.

CONTEXTO
- Actores:
${formatearActores(analisis)}
- Requerimientos funcionales (con sus actores asignados, dependencias y prioridad):
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
- Cada actor como nodo rectangular fuera del límite del sistema: ID["Nombre del actor"].
- Todos los casos de uso dentro de un único subgraph SISTEMA["Nombre del sistema"] (el límite del sistema).
- Un caso de uso por requerimiento funcional, con forma de estadio, un texto corto (verbo + objeto) y como id el código del requerimiento: RF02(["Registrar parte"]).
- Cada actor conectado con --> a TODOS los casos de uso de los requerimientos que lo tienen asignado en "actores", y solo a esos.
- Si la descripción de un actor indica que es un tipo más específico de otro (hereda sus capacidades), la generalización: ESPECIFICO -->|"hereda"| GENERAL. En ese caso, conecta al actor específico solo con los casos de uso que NO hereda del general, para no repetir líneas.
${totalCasos > MAX_SIN_MODULOS
  ? `- Son ${totalCasos} casos de uso: agrúpalos en módulos del negocio, de 3 a 7, cada uno como un subgraph DENTRO de SISTEMA (ids MOD1, MOD2...: subgraph MOD1["Nombre del módulo"]). Cada caso de uso va en un solo módulo.`
  : "- Si las indicaciones piden agrupar (ej. por módulo), usa un subgraph por grupo dentro de SISTEMA."}

RELACIONES ENTRE CASOS DE USO (son lo que más se dibuja mal)
- Las "dependencias" de un requerimiento NO son relaciones entre casos de uso. Casi todas son REQUISITOS PREVIOS: haber iniciado sesión, que ya exista el registro sobre el que se trabaja, que un catálogo ya esté cargado. Los requisitos previos NO se dibujan.
- «include»: SOLO cuando el caso base ejecuta SIEMPRE al otro como un paso dentro de su propio flujo, en la misma interacción. Los requerimientos que son reglas o validaciones automáticas (validar, bloquear, impedir, restringir) suelen ser el caso incluido por la acción que los dispara. Se escribe BASE -.->|"«include»"| INCLUIDO.
- «extend»: SOLO cuando un caso agrega pasos opcionales o condicionales a otro (ej. datos que solo se registran para un tipo de registro, o una acción que el usuario puede o no hacer). Se escribe AMPLIACION -.->|"«extend»"| BASE.
- Ningún caso de uso incluye al inicio de sesión ni a la gestión de usuarios o de catálogos: son requisitos previos.
- Consultar, listar, exportar o ver un tablero NO incluyen al caso que creó los datos.
- Un mismo caso no puede aparecer incluido por más de ${MAX_INCLUIDO_POR} casos: si te pasa, es un requisito previo y no se dibuja.
- Si dudas entre dibujar una relación o no, no la dibujes: un diagrama con pocas relaciones correctas vale más que uno con muchas dudosas.

QUÉ NO QUIERO
- No inventes actores, casos de uso ni relaciones que el análisis no indique.
- No pongas descripciones largas ni códigos dentro de los textos de los casos de uso.
- No uses colores distintos de los del estilo indicado.

FORMATO
- Mermaid "flowchart LR".
- Ids sin espacios ni tildes (actores en MAYÚSCULAS, casos de uso con el código RF). Todos los textos entre comillas dobles.
- Máximo 3 colores. Define al final EXACTAMENTE este estilo y asigna las clases (actor a los actores, casoUso a los casos de uso). No escribas "style" para los módulos: la aplicación lo agrega.
    ${ESTILOS}
- En "explicacion", de 3 a 5 líneas cortas (una idea por línea, separadas con \\n) sobre lo que muestra el diagrama: qué actores intervienen y cuáles son los casos de uso principales.

Ejemplo de sintaxis válida (sistema ajeno, no copiar sus casos): "Registrar pedido" incluye "Validar existencias" porque siempre la ejecuta; "Aplicar cupón" lo extiende porque es opcional; ninguno incluye a "Iniciar sesión".
${EJEMPLO}

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "diagrama_mermaid": "código mermaid completo aquí, como un solo string",
  "explicacion": "línea 1\\nlínea 2\\nlínea 3"
}
`;

    const inicial = await generar(instrucciones, usarClaude);
    let resultado = inicial.resultado;
    let response = inicial.response;
    let diagrama = limpiarMermaid(resultado.diagrama_mermaid);
    let problemas = validarDiagrama(diagrama, analisis);
    let costo = response.costoUsd;

    // Un solo reintento: se le muestran a la IA los problemas concretos y su diagrama anterior.
    if (problemas.length) {
      try {
        const reintento = await generar(
          `${instrucciones}

TU RESPUESTA ANTERIOR NO CUMPLIÓ ESTAS REGLAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Diagrama anterior:
${diagrama}

Corrígelo cumpliendo TODAS las reglas y responde de nuevo con el mismo JSON.`,
          usarClaude
        );
        const diagramaNuevo = limpiarMermaid(reintento.resultado.diagrama_mermaid);
        const problemasNuevos = validarDiagrama(diagramaNuevo, analisis);
        costo = sumarCosto(costo, reintento.response.costoUsd);
        if (problemasNuevos.length <= problemas.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          diagrama = diagramaNuevo;
          problemas = problemasNuevos;
        }
      } catch {
        // Si el reintento falla, se conserva el primer resultado.
      }
    }

    return NextResponse.json({
      ...resultado,
      diagrama_mermaid: aplicarEstiloModulos(diagrama),
      advertencias: problemas,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
