import { generarContenido } from "./gemini.js";
import { sumarCosto } from "./jsonIA.js";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "./analisis.js";
import { leerGuia } from "./estructura.js";
import { archivosDeBackend, FUNCION } from "./archivosBackend.js";

// Paso "Backend" (quinto de la Implementación): escribe la lógica de negocio que cumple el contrato,
// un archivo por petición como la base de datos. Con Supabase son las Edge Functions (Deno); con
// Express, los archivos del servidor. La prueba en contenedores reutiliza la del contrato con las
// funciones encendidas (lib/pruebaContrato.js). Solo se usa en el servidor.

const LIMITE_RUTA_MS = 280_000;

const nombreDeFuncion = (ruta) => ruta.match(FUNCION)?.[1];

function limpiarCodigo(texto) {
  const bloque = String(texto || "").match(/```[a-z]*\n([\s\S]*?)```/i);
  return (bloque ? bloque[1] : String(texto || "")).trim() + "\n";
}

// Revisión determinista: lo que se puede comprobar sin ejecutar el código.
export function validarBackend(contenido, ctx) {
  const problemas = [];
  if (!contenido.trim()) return ["El archivo está vacío."];
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/.test(contenido)) problemas.push("Tiene una clave o un JWT escrito en el código: léela de una variable de entorno.");
  if (ctx.funcion) {
    if (!/Deno\.serve\s*\(/.test(contenido)) problemas.push("Una Edge Function debe atender las peticiones con Deno.serve(...).");
    if (/SUPABASE_SERVICE_ROLE_KEY/.test(contenido) && !/Deno\.env\.get\(\s*["']SUPABASE_SERVICE_ROLE_KEY["']\s*\)/.test(contenido)) problemas.push("La clave de servicio se lee con Deno.env.get(\"SUPABASE_SERVICE_ROLE_KEY\").");
    if (ctx.operaciones.length && !/authorization/i.test(contenido)) problemas.push("No lee el encabezado Authorization: la función debe identificar a quien llama y comprobar su rol antes de actuar.");
    for (const op of ctx.operaciones) {
      const prohibidos = ctx.actores.filter((a) => !op.roles.includes(a));
      if (prohibidos.length && !/403/.test(contenido)) problemas.push(`${op.id} solo la usa ${op.roles.join(", ")}: responde 403 a los demás roles.`);
    }
  }
  return [...new Set(problemas)];
}

function armarPrompt(ctx) {
  const { archivo, funcion, operaciones, analisis, guia, plan, previos, sql, stack, nombre, descripcion, indicaciones } = ctx;
  const requerimientos = (archivo.requerimientos || []).length
    ? (analisis?.requerimientos_funcionales || []).concat(analisis?.requerimientos_no_funcionales || []).filter((r) => archivo.requerimientos.includes(r.codigo))
    : [];
  const externos = (stack?.externos || []).filter((e) => (e.requerimientos || []).some((r) => (archivo.requerimientos || []).includes(r)));
  return `Eres un desarrollador backend. Escribe el archivo "${archivo.ruta}" del sistema "${nombre}" (${descripcion || ""}), cuyo diseño, base de datos y contrato de API ya están aprobados.

CONTEXTO
- Propósito del archivo: ${archivo.proposito || ""}
- Actores:
${formatearActores(analisis || {})}
- Requerimientos que cumple:
${formatearRequerimientos(requerimientos)}
- Operaciones del contrato que implementa: ${JSON.stringify(operaciones)}
- Servicios externos que usa (claves por variable de entorno): ${JSON.stringify(externos)}
- Guía de la pieza:
${guia}
- Archivos del backend: ${plan.map((a) => `${a.ruta}: ${a.proposito}`).join(" | ")}
${previos.length ? `- Ya escritos:\n${previos.map((p) => `--- ${p.ruta}\n${p.contenido}`).join("\n")}` : ""}
- Base de datos (migraciones aprobadas; los roles, funciones y triggers que el código debe usar están aquí):
${sql.map((s) => `--- ${s.ruta}\n${s.contenido}`).join("\n")}
${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
${funcion ? `- Una Edge Function de Supabase (Deno, TypeScript) con Deno.serve. Responde OPTIONS con los encabezados CORS y todas las respuestas en JSON con esos encabezados.
- Variables: Deno.env.get("SUPABASE_URL"), "SUPABASE_ANON_KEY" y "SUPABASE_SERVICE_ROLE_KEY". Importa el cliente con "npm:@supabase/supabase-js@2".
- Seguridad: lee el encabezado Authorization; sin él, 401. Con un cliente creado con la clave anon y ese encabezado, identifica al usuario y su rol como lo hace la base (por ejemplo, la función rol_actual()). Si el rol no está entre los de la operación del contrato, 403. Solo después usa un cliente con la clave de servicio, y solo para lo que el usuario no puede hacer por sí mismo.
- Valida el cuerpo según la entrada de la operación: si falta o es inválido, 400 con un mensaje claro.
- Si una clave de un servicio externo no está configurada, 503 con el nombre de la variable que falta.
- Errores de la base o de Auth: el código HTTP que corresponda y un mensaje claro, sin exponer detalles internos.` : `- El archivo del servidor según la guía de la pieza, coherente con los ya escritos y con las operaciones del contrato.`}
QUÉ NO QUIERO
- Claves, contraseñas o tokens escritos en el código.
- Saltarse los permisos de la base usando la clave de servicio antes de comprobar el rol.
- Inventar tablas, columnas, funciones de la base u operaciones que no estén en el contexto.
FORMATO
Solo el contenido del archivo, sin explicaciones ni bloques de markdown.`;
}

// cuerpo: { nombre, descripcion, analisis, stack, estructura: { archivos }, contrato: { operaciones },
//   sql: [{ ruta, contenido }], archivo, anteriores: [{ ruta, contenido }], indicaciones, usarClaude }
export async function generarArchivoBackend(cuerpo) {
  const inicio = Date.now();
  const { estructura, archivo: ruta, anteriores = [], usarClaude, contrato } = cuerpo;
  const plan = archivosDeBackend(estructura);
  const archivo = plan.find((a) => a.ruta === ruta);
  if (!archivo) throw new Error(`"${ruta}" no es un archivo del backend en la estructura aprobada.`);
  const funcion = nombreDeFuncion(ruta);
  const operaciones = (contrato?.operaciones || [])
    .filter((op) => (funcion ? op.tipo === "edge" && op.recurso === funcion : op.tipo === "http"))
    .map(({ id, nombre, metodo, recurso, roles, requerimientos, descripcion, entrada, salida }) => ({ id, nombre, metodo, recurso, roles, requerimientos, descripcion, entrada, salida }));
  const ctx = {
    ...cuerpo,
    archivo,
    funcion,
    operaciones,
    actores: (cuerpo.analisis?.actores || []).map((a) => a.nombre),
    guia: await leerGuia(archivo.pieza),
    plan,
    previos: plan.slice(0, plan.indexOf(archivo)).map((a) => anteriores.find((x) => x.ruta === a.ruta)).filter((p) => p?.contenido),
    sql: cuerpo.sql || [],
  };

  let costo;
  const generar = async (extra = "", presupuestoMs) => {
    const response = await generarContenido({ usarClaude, contents: [{ text: armarPrompt(ctx) + extra }], ...(presupuestoMs ? { presupuestoMs } : {}) });
    costo = sumarCosto(costo, response.costoUsd);
    const contenido = limpiarCodigo(response.text);
    return { response, contenido, problemas: validarBackend(contenido, ctx) };
  };

  let resultado = await generar();
  const restante = LIMITE_RUTA_MS - (Date.now() - inicio);
  if (resultado.problemas.length && restante > 60_000) {
    try {
      const reintento = await generar(`\n\nTU RESPUESTA ANTERIOR TIENE ESTOS PROBLEMAS:\n${resultado.problemas.map((p) => `- ${p}`).join("\n")}\n\nRespuesta anterior:\n${resultado.contenido}\n\nCorrígela y responde de nuevo con el archivo completo.`, restante - 10_000);
      if (reintento.problemas.length <= resultado.problemas.length) resultado = reintento;
    } catch {
      // Si el reintento falla, se conserva el primer resultado con sus advertencias.
    }
  }
  return { ruta, contenido: resultado.contenido, advertencias: resultado.problemas, modelo_ia: resultado.response.modelVersion, costo_ia: costo };
}
