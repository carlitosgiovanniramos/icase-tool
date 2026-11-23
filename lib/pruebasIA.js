// Casos de prueba del paso "Plan de pruebas": la IA propone, con el análisis aprobado, los casos de cada
// requerimiento funcional; el código reparte el trabajo en lotes, revisa que cada requerimiento quede
// cubierto (y pide solo los que falten) y numera los casos. Solo se usa en el servidor.

import { generarContenido } from "./gemini.js";
import { leerJson, sumarCosto } from "./jsonIA.js";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "./analisis.js";
import { normalizarCasos, trazabilidad } from "./pruebas.js";

const POR_LOTE = 8; // requerimientos por petición, para que ninguna respuesta se corte

const normalizarCodigo = (c) => String(c ?? "").replace(/[-\s]/g, "").toUpperCase();

// Lo que cada requerimiento dice de antes y de después de ejecutarse: de ahí salen las precondiciones y
// el resultado esperado de sus casos, en vez de inventarlos.
function formatearCondiciones(requerimientos) {
  return requerimientos
    .filter((r) => r.precondiciones || r.postcondiciones)
    .map((r) => `${r.codigo}${r.precondiciones ? ` | antes: ${r.precondiciones}` : ""}${r.postcondiciones ? ` | después: ${r.postcondiciones}` : ""}`)
    .join("\n");
}

// Pantallas reales del prototipo que cumplen los requerimientos del lote, con sus botones y enlaces: los
// pasos de los casos usan esos nombres exactos.
export function pantallasDelLote(pantallas = [], requerimientos) {
  const codigos = new Set(requerimientos.map((r) => normalizarCodigo(r.codigo)));
  return pantallas.filter((p) => (p.rfs || []).some((rf) => codigos.has(normalizarCodigo(rf))));
}

function formatearPantallas(pantallas) {
  return pantallas
    .map((p) => {
      const partes = [`${p.nombre} (${p.plataforma || "Web"}; cumple ${(p.rfs || []).join(", ")})`];
      if (p.actores?.length) partes.push(`actores: ${p.actores.join(", ")}`);
      if (p.acciones?.length) partes.push(`botones y enlaces: ${p.acciones.join("; ")}`);
      return `- ${partes.join(" | ")}`;
    })
    .join("\n");
}

export function armarPromptPruebas({ nombre, analisis, requerimientos, reglas, indicaciones, pantallas = [] }) {
  const condiciones = formatearCondiciones(requerimientos);
  const delLote = pantallasDelLote(pantallas, requerimientos);
  return `Eres un ingeniero de pruebas de software. Redacta los casos de prueba funcionales del sistema "${nombre || ""}", en español, para que cualquier persona pueda ejecutarlos a mano sin conocer el código.

CONTEXTO
Actores del sistema:
${formatearActores(analisis)}

Requerimientos funcionales a probar (con sus actores):
${formatearRequerimientos(requerimientos)}
${condiciones ? `\nPrecondiciones y postcondiciones de los requerimientos:\n${condiciones}\n` : ""}${delLote.length ? `\nPantallas del prototipo aprobado que los cumplen:\n${formatearPantallas(delLote)}\n` : ""}${reglas?.trim() ? `\nReglas de negocio del sistema:\n${reglas.trim()}\n` : ""}${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
- De 1 a 3 casos por requerimiento: siempre el flujo normal y, cuando el requerimiento lo permita, un caso de validación (datos inválidos o incompletos) o de permisos (un actor que NO debe poder hacerlo).
- Cada caso: "titulo" (qué se prueba, en una línea), "rfs" (los códigos que prueba, ej. ["RF03"]), "actor" (uno de los actores de arriba, con su mismo nombre), "tipo" ("funcional", "validacion" o "permisos"), "precondiciones" (qué debe existir antes; toma las del requerimiento si las tiene), "pasos" (lista de 3 a 7 pasos cortos en lenguaje de usuario) y "esperado" (qué debe ocurrir si todo funciona; toma las postcondiciones del requerimiento si las tiene).
- Los pasos usan los nombres EXACTOS de las pantallas y de los botones o enlaces de la lista de pantallas, entre comillas. Si un requerimiento no tiene pantalla en la lista, describe el paso sin nombrar pantallas ni botones.
- Todos los requerimientos de la lista deben tener al menos un caso.

QUÉ NO QUIERO
- Pantallas, botones, campos, valores, mensajes, tecnologías o reglas que no estén en los datos de arriba. Si un dato no está, no lo supongas: descríbelo en general.
- Casos repetidos ni casos de requerimientos que no estén en la lista.
- Pasos vagos como "verificar que funcione".

FORMATO
Solo un JSON válido, sin texto antes ni después: { "casos": [ { "titulo": "", "rfs": [""], "actor": "", "tipo": "", "precondiciones": "", "pasos": [""], "esperado": "" } ] }`;
}

async function pedirLote({ nombre, analisis, requerimientos, reglas, indicaciones, pantallas, usarClaude }) {
  const respuesta = await generarContenido({
    usarClaude,
    contents: [{ text: armarPromptPruebas({ nombre, analisis, requerimientos, reglas, indicaciones, pantallas }) }],
    config: { responseMimeType: "application/json" },
  });
  const datos = leerJson(respuesta.text);
  return { casos: Array.isArray(datos.casos) ? datos.casos : [], modelo: respuesta.modelVersion, costo: respuesta.costoUsd };
}

// Deja el actor con el nombre exacto del análisis (la IA a veces lo abrevia).
function ajustarActores(casos, analisis) {
  const nombres = (analisis.actores || []).map((a) => a.nombre);
  const llave = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return casos.map((c) => ({ ...c, actor: nombres.find((n) => llave(n) === llave(c.actor)) || c.actor }));
}

export async function generarPruebas({ nombre, analisis, reglas, indicaciones, pantallas, usarClaude }) {
  const requerimientos = analisis?.requerimientos_funcionales || [];
  if (!requerimientos.length) throw new Error("El análisis no tiene requerimientos funcionales.");

  const lotes = [];
  for (let i = 0; i < requerimientos.length; i += POR_LOTE) lotes.push(requerimientos.slice(i, i + POR_LOTE));
  const resultados = await Promise.all(lotes.map((requerimientos) => pedirLote({ nombre, analisis, requerimientos, reglas, indicaciones, pantallas, usarClaude })));

  let casos = resultados.flatMap((r) => r.casos);
  let modelo = resultados.find((r) => r.modelo)?.modelo;
  let costo = resultados.reduce((t, r) => sumarCosto(t, r.costo), undefined);

  // Un solo reintento con los requerimientos que quedaron sin ningún caso.
  const faltan = trazabilidad(analisis, normalizarCasos(casos)).sinCubrir;
  if (faltan.length) {
    const pendientes = requerimientos.filter((r) => faltan.includes(r.codigo));
    const extra = await pedirLote({ nombre, analisis, requerimientos: pendientes, reglas, indicaciones, pantallas, usarClaude });
    casos = [...casos, ...extra.casos];
    costo = sumarCosto(costo, extra.costo);
  }

  const finales = normalizarCasos(ajustarActores(casos, analisis));
  const { sinCubrir } = trazabilidad(analisis, finales);
  const advertencias = sinCubrir.length ? [`Sin caso de prueba: ${sinCubrir.join(", ")}. Agrégalos a mano o vuelve a generar.`] : [];
  return { casos: finales, advertencias, modelo_ia: modelo, costo_ia: costo };
}
