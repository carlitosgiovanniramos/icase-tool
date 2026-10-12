import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { leerJson, sumarCosto, normalizarTexto, normalizarCodigo } from "@/lib/jsonIA";

export const maxDuration = 300;

// Propone la lista de pantallas del prototipo a partir de los requerimientos (con qué RF cubre
// cada una), para que el usuario elija cuáles generar.
//
// Cada pantalla trae además su lugar en la navegación: la entrada del menú principal bajo la que
// va ("seccion") o la pantalla desde la que se abre ("abre_desde"). Con eso el prototipo se
// genera con un menú por secciones, en vez de uno plano con todas las pantallas, y el árbol de
// navegación sale con jerarquía.
//
// Después de proponer se valida la lista (cada RF con pantalla, nombres únicos, navegación
// coherente) y, si incumple, se pide una corrección (un solo reintento). Lo que quede pendiente
// se devuelve en "advertencias".

// Entradas máximas del menú principal: una barra lateral con más no se lee; en móvil la barra
// inferior admite menos.
const MAX_SECCIONES = 7;
const MAX_SECCIONES_MOVIL = 5;
const esMovil = (plataforma) => /m[oó]vil/i.test(plataforma || "");
const ES_ACCESO = /sesi[oó]n|login|acceso|registro de cuenta|recuperar/i;

// Revisa la propuesta y devuelve la lista de problemas (vacía si todo está bien).
function validarPantallas(pantallas, analisis, plataformas) {
  if (!Array.isArray(pantallas) || !pantallas.length) return ["No se propuso ninguna pantalla."];

  const problemas = [];
  const codigos = new Set((analisis.requerimientos_funcionales || []).map((r) => normalizarCodigo(r.codigo)));

  const nombres = pantallas.map((p) => normalizarTexto(p.nombre));
  const repetidas = [...new Set(pantallas.filter((p, i) => nombres.indexOf(normalizarTexto(p.nombre)) !== i).map((p) => p.nombre))];
  if (repetidas.length) problemas.push(`Hay pantallas con el mismo nombre: ${repetidas.join(", ")}. Cada nombre debe ser único.`);

  const cubiertos = new Set(pantallas.flatMap((p) => (p.rfs || []).map(normalizarCodigo)));
  const sinPantalla = [...codigos].filter((c) => !cubiertos.has(c));
  const inventados = [...cubiertos].filter((c) => !codigos.has(c));
  if (sinPantalla.length) {
    problemas.push(`Ninguna pantalla cubre estos requerimientos: ${sinPantalla.join(", ")}. Agrégalos a la pantalla donde el usuario los usa o donde se ve su efecto (una regla o validación va en la pantalla de la acción que la dispara).`);
  }
  if (inventados.length) problemas.push(`Hay códigos de requerimientos que no existen: ${inventados.join(", ")}. Elimínalos.`);

  const dePlataforma = (p) => p.plataforma || plataformas[0];
  const fueraDeLista = pantallas.filter((p) => !plataformas.includes(dePlataforma(p))).map((p) => p.nombre);
  if (fueraDeLista.length) problemas.push(`Pantallas con una plataforma que no es del sistema: ${fueraDeLista.join(", ")}.`);

  for (const plataforma of plataformas) {
    const suyas = pantallas.filter((p) => dePlataforma(p) === plataforma);
    const porNombre = new Map(suyas.map((p) => [normalizarTexto(p.nombre), p]));

    for (const p of suyas.filter((x) => x.abre_desde)) {
      const origen = porNombre.get(normalizarTexto(p.abre_desde));
      if (!origen) problemas.push(`"${p.nombre}" dice abrirse desde "${p.abre_desde}", que no es una pantalla de ${plataforma}.`);
      else if (origen === p) problemas.push(`"${p.nombre}" no puede abrirse desde sí misma.`);
    }

    // Sin "seccion" ni "abre_desde" solo queda el inicio de sesión, que no es parte del menú.
    const sinLugar = suyas.filter((p) => !p.seccion && !p.abre_desde && !ES_ACCESO.test(p.nombre || "")).map((p) => p.nombre);
    if (sinLugar.length) {
      problemas.push(`Pantallas de ${plataforma} sin lugar en la navegación: ${sinLugar.join(", ")}. Indica su "seccion" del menú o desde qué pantalla se abren ("abre_desde").`);
    }

    const secciones = [...new Set(suyas.filter((p) => p.seccion).map((p) => normalizarTexto(p.seccion)))];
    const maximo = esMovil(plataforma) ? MAX_SECCIONES_MOVIL : MAX_SECCIONES;
    if (secciones.length > maximo) {
      problemas.push(`El menú de ${plataforma} quedaría con ${secciones.length} entradas (máximo ${maximo}): agrupa pantallas afines bajo una misma "seccion" o haz que las secundarias se abran desde otra con "abre_desde".`);
    }
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
    const { analisis, diagramaEr, plataformas, indicaciones, usarClaude } = await request.json();

    const listaPlataformas = plataformas?.length ? plataformas : ["Web"];

    const instrucciones = `
Eres un diseñador UX/UI experto. Con base en este análisis aprobado, propone las pantallas que el sistema necesita.

Actores:
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${diagramaEr ? `\nModelo de datos (Mermaid):\n${diagramaEr}\n` : ""}
Plataformas del sistema: ${listaPlataformas.join(", ")}
${formatearIndicaciones(indicaciones)}
Reglas:
- TODOS los requerimientos funcionales deben quedar cubiertos por al menos una pantalla. Los que son reglas o validaciones automáticas (bloquear, validar, sincronizar) van en la pantalla de la acción que los dispara o donde se ve su efecto. No dupliques pantallas ni crees pantallas que ningún requerimiento justifique.
- Agrupa en una misma pantalla los requerimientos que el usuario resuelve en el mismo lugar (ej. listar, filtrar y buscar partes).
- Si un requerimiento se usa en varias plataformas, crea una pantalla en cada una (con nombres distintos).
- Incluye una pantalla de inicio de sesión por plataforma si el sistema tiene autenticación o roles.
- Asigna a cada pantalla la plataforma donde la usa su actor (una de: ${listaPlataformas.join(", ")}).
- Ordénalas según el flujo de uso. Cada nombre de pantalla es único.
- Sugiere un color primario de marca (hex) coherente con el dominio del sistema.

Navegación (define cómo se llega a cada pantalla; el menú del prototipo se arma con esto):
- "seccion": la entrada del MENÚ PRINCIPAL bajo la que va la pantalla (nombre corto del área, ej. "Pedidos", "Inventario"). Las pantallas de una misma área comparten la misma "seccion" y forman su submenú. Una pantalla que es por sí sola una entrada del menú lleva su propio nombre corto como "seccion".
- "abre_desde": para las pantallas que NO están en el menú porque se abren desde otra con un botón o enlace (formularios de alta o edición, detalles, pasos de un flujo): el nombre EXACTO de esa otra pantalla, de la misma plataforma. En ese caso deja "seccion" vacío.
- Toda pantalla tiene "seccion" o "abre_desde", nunca los dos. El inicio de sesión no va en el menú: deja los dos vacíos.
- Máximo ${MAX_SECCIONES} entradas en el menú principal de cada plataforma (${MAX_SECCIONES_MOVIL} en móvil, que usa una barra inferior).

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "color_primario": "#RRGGBB",
  "pantallas": [
    {
      "nombre": "string (2-5 palabras)",
      "descripcion": "string (una línea: qué muestra y qué permite hacer)",
      "rfs": ["RF01"],
      "actores": ["string"],
      "plataforma": "${listaPlataformas[0]}",
      "seccion": "string (entrada del menú principal) o vacío",
      "abre_desde": "string (nombre exacto de la pantalla que la abre) o vacío"
    }
  ]
}
`;

    const validar = (r) => validarPantallas(r.pantallas, analisis, listaPlataformas);

    const inicial = await generar(instrucciones, usarClaude);
    let resultado = inicial.resultado;
    let response = inicial.response;
    let problemas = validar(resultado);
    let costo = response.costoUsd;

    // Un solo reintento: se le muestran a la IA los problemas concretos y su propuesta anterior.
    if (problemas.length) {
      try {
        const reintento = await generar(
          `${instrucciones}

TU RESPUESTA ANTERIOR NO CUMPLIÓ ESTAS REGLAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Respuesta anterior:
${JSON.stringify(resultado)}

Corrígela cumpliendo TODAS las reglas y responde de nuevo con el JSON completo.`,
          usarClaude
        );
        const problemasNuevos = validar(reintento.resultado);
        costo = sumarCosto(costo, reintento.response.costoUsd);
        if (problemasNuevos.length <= problemas.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          problemas = problemasNuevos;
        }
      } catch {
        // Si el reintento falla, se conserva la primera propuesta.
      }
    }

    return NextResponse.json({
      ...resultado,
      advertencias: problemas,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
