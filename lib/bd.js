import { generarContenido } from "./gemini.js";
import { sumarCosto } from "./jsonIA.js";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "./analisis.js";
import { catalogo } from "./implementacion.js";
import { CAPACIDADES } from "./capacidades.js";
import { entidadesER, leerGuia } from "./estructura.js";
import { archivosDeBaseDatos, archivoQueFallo, errorDeSalida, tablaDeEntidad, CONTRASENA_PRUEBA } from "./archivosBD.js";

// Paso "Base de datos" (tercero de la Implementación): escribe las migraciones y los datos de
// prueba que planificó la estructura de carpetas, un archivo por petición y en el orden en que
// se aplican (cada uno recibe el código de los anteriores). El código revisa cada archivo (tablas
// del ER, RLS, claves foráneas, datos de prueba) y la prueba en contenedores (runner/index.mjs)
// comprueba que la base arranca con todo. Solo se usa en el servidor.

const LIMITE_RUTA_MS = 280_000;

// Requerimientos que piden un resumen criptográfico: lo calcula la base, no el cliente.
const PIDE_HASH = CAPACIDADES.find((c) => c.clave === "hash").patron;
const requerimientosConHash = (analisis) =>
  [...(analisis?.requerimientos_funcionales || []), ...(analisis?.requerimientos_no_funcionales || [])]
    .filter((r) => PIDE_HASH.test(`${r.nombre || ""} ${r.descripcion || ""}`))
    .map((r) => r.codigo);

// Pieza del stack que tiene la base de datos: la que declara "bd" en su pieza.json.
export function piezaDeBaseDatos(stack, fichas) {
  return fichas.find((f) => f.bd && (stack?.piezas || []).some((p) => p.pieza === f.nombre)) || null;
}

// --- Lectura del SQL ------------------------------------------------------------------------

// Quita los bloques de markdown que a veces rodean la respuesta.
function limpiarSQL(texto) {
  const s = String(texto || "").trim();
  const bloque = s.match(/```(?:sql|postgresql|pgsql)?\s*\n([\s\S]*?)```/i);
  return (bloque ? bloque[1] : s).trim() + "\n";
}

const sinComentarios = (sql) => String(sql || "").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, "");

// Nombre con esquema opcional: dos grupos (esquema, nombre).
const NOMBRE = String.raw`(?:"?([A-Za-z_][\w$]*)"?\.)?"?([A-Za-z_][\w$]*)"?`;
const expresion = (patron) => new RegExp(patron.replace("NOMBRE", () => NOMBRE), "gi");
const CREAR = String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?NOMBRE`;
const RLS = String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?NOMBRE\s+enable\s+row\s+level\s+security`;
const POLITICA = String.raw`\bcreate\s+policy\s+(?:"[^"]*"|[\w$]+)\s+on\s+NOMBRE`;
const REFERENCIA = String.raw`\breferences\s+NOMBRE`;
const INSERCION = String.raw`\binsert\s+into\s+NOMBRE`;

// Coincidencias en el esquema public (o sin esquema), con su posición.
function enPublic(sql, patron) {
  return [...sinComentarios(sql).matchAll(expresion(patron))]
    .filter((m) => !m[1] || m[1].toLowerCase() === "public")
    .map((m) => ({ nombre: m[2].toLowerCase(), posicion: m.index }));
}

export const tablasCreadas = (sql) => [...new Set(enPublic(sql, CREAR).map((m) => m.nombre))];

// --- Validación -----------------------------------------------------------------------------

// Problemas de un archivo para la IA. ctx: { archivo, plan, entidades (tablas del ER),
// anteriores (tablas que crean los archivos previos), ficha }.
export function validarSQL(sql, ctx) {
  const { archivo, plan, entidades, anteriores, ficha } = ctx;
  const problemas = [];
  const limpio = sinComentarios(sql);
  if (!limpio.trim()) return ["El archivo está vacío."];

  const esDatos = archivo.tipo === "datos";
  const creadas = enPublic(sql, CREAR);
  const nombresCreados = [...new Set(creadas.map((c) => c.nombre))];
  const esperadas = esDatos ? [] : (archivo.tablas || []).map(tablaDeEntidad);
  const deOtroArchivo = (t) => plan.find((a) => a !== archivo && (a.tablas || []).map(tablaDeEntidad).includes(t));

  const faltan = esperadas.filter((t) => !nombresCreados.includes(t));
  if (faltan.length) problemas.push(`No crea las tablas que le corresponden: ${faltan.join(", ")}.`);
  for (const t of nombresCreados.filter((n) => !esperadas.includes(n))) {
    const otro = deOtroArchivo(t);
    if (otro) problemas.push(`Crea ${t}, que corresponde a ${otro.ruta}.`);
    else if (anteriores.has(t)) problemas.push(`Crea ${t}, que ya existe por un archivo anterior.`);
    else if (!entidades.includes(t)) problemas.push(`Crea ${t}, que no es una entidad del ER (para contadores usa secuencias).`);
  }

  // Cada clave foránea apunta a una tabla que ya existe en ese punto.
  for (const r of enPublic(sql, REFERENCIA)) {
    const antes = creadas.filter((c) => c.posicion < r.posicion);
    if (anteriores.has(r.nombre) || antes.some((c) => c.nombre === r.nombre)) continue;
    const tabla = antes.at(-1)?.nombre;
    problemas.push(`${tabla ? `${tabla} referencia` : "Referencia"} a ${r.nombre}, que todavía no existe en ese punto.`);
  }

  if (ficha.bd?.rls && nombresCreados.length) {
    const conRls = new Set(enPublic(sql, RLS).map((m) => m.nombre));
    const conPoliticas = new Set(enPublic(sql, POLITICA).map((m) => m.nombre));
    const sinRls = nombresCreados.filter((t) => !conRls.has(t));
    const sinPoliticas = nombresCreados.filter((t) => !conPoliticas.has(t));
    if (sinRls.length) problemas.push(`Sin "enable row level security": ${sinRls.join(", ")}.`);
    if (sinPoliticas.length) problemas.push(`Sin políticas de acceso: ${sinPoliticas.join(", ")}.`);
  }

  if (esDatos) {
    const existentes = new Set([...anteriores, ...nombresCreados]);
    const inserciones = enPublic(sql, INSERCION);
    if (!inserciones.length) problemas.push("No inserta datos de prueba.");
    const inexistentes = [...new Set(inserciones.map((i) => i.nombre).filter((t) => !existentes.has(t)))];
    if (inexistentes.length) problemas.push(`Inserta en tablas que no existen: ${inexistentes.join(", ")}.`);
    const usuarios = ficha.bd?.usuarios;
    if (usuarios && !new RegExp(String.raw`\binsert\s+into\s+${usuarios.replace(".", String.raw`\.`)}\b`, "i").test(limpio)) {
      problemas.push(`No crea los usuarios de prueba en ${usuarios}.`);
    }
  }

  if (/\b(drop\s+(table|schema)|truncate)\b/i.test(limpio)) problemas.push("Usa drop table, drop schema o truncate: la base se crea desde cero.");
  if (/^\s*(begin|start\s+transaction|commit)\s*;/im.test(limpio)) problemas.push("Usa begin/commit: el archivo ya se aplica en una transacción.");
  if (/^\s*\\[a-z]/im.test(limpio)) problemas.push("Usa comandos de psql (\\c, \\i...): solo SQL.");
  return problemas;
}

// --- Prompt ---------------------------------------------------------------------------------

function armarPrompt(ctx) {
  const { nombre, descripcion, analisis, stack, ficha, guia, diagramaER, diagramaClases, plan, archivo, previos, actual, instruccion, error, indicaciones } = ctx;
  const esDatos = archivo.tipo === "datos";
  const piezas = (stack.piezas || []).map((p) => p.pieza + (p.opcionales?.length ? ` (${p.opcionales.join(", ")})` : "")).join(", ");
  const actores = (analisis?.actores || []).map((a) => a.nombre);
  const hash = requerimientosConHash(analisis);
  const lista = plan
    .map((a) => `- ${a.ruta}${a === archivo ? "  <- ESTE ARCHIVO" : ""}: ${a.proposito}${a.tablas?.length ? ` | tablas: ${a.tablas.map(tablaDeEntidad).join(", ")}` : ""}`)
    .join("\n");

  const debe = esDatos
    ? `- Datos de prueba realistas para este sistema, que respeten las claves foráneas, los check y los triggers de las migraciones: entre 3 y 10 filas en las tablas principales, con ids fijos (uuid literales) para relacionarlas.
- Un usuario de prueba por actor (${actores.join(", ")}), con el correo <actor>@prueba.local (en minúsculas, sin tildes ni espacios) y la contraseña ${CONTRASENA_PRUEBA}, y su fila en la tabla de usuarios del ER con su rol.
- Inserciones en orden de dependencia.`
    : `- Una tabla por cada entidad de "tablas" de este archivo, con el nombre de la entidad en minúsculas (PARTE_CRONOLOGIA -> parte_cronologia), y las columnas, tipos y relaciones del ER.
- Clave primaria, claves foráneas (con on delete acorde a la relación), not null, unique y check que piden el ER y los requerimientos; índices en las claves foráneas y en las columnas por las que se filtra.
- La integridad la garantiza la base, no el cliente: códigos secuenciales, bloqueo de lo que ya se cerró o firmó y las reglas de los RF que impiden una operación (por ejemplo, asignar un recurso no disponible), con funciones y triggers sobre las tablas de este archivo.${hash.length ? `
- ${hash.join(", ")} pide un resumen criptográfico: lo calcula la base con digest de pgcrypto (por ejemplo sha256 del contenido como jsonb) en una función o trigger, en el archivo donde ya existen las tablas de ese contenido; el cliente no lo envía y la columna no se acepta desde fuera.` : ""}${ficha.bd?.rls ? `
- RLS activado en cada tabla y políticas por actor (${actores.join(", ")}) según los requerimientos de cada tabla.` : ""}
- Un comentario corto con el RF de cada regla.`;

  const tarea = error
    ? `TAREA: este archivo falló al aplicarse en PostgreSQL. Corrige el error y lo que lo cause, sin cambiar lo demás.

Error:
${error}

Archivo actual:
${actual}`
    : actual
    ? `TAREA: modifica el archivo actual según la instrucción del usuario. Conserva lo que la instrucción no cambia. Las reglas siguen valiendo.

Instrucción del usuario:
${instruccion}

Archivo actual:
${actual}`
    : "TAREA: escribe el archivo completo.";

  return `Eres un ingeniero de bases de datos. Vas a escribir el archivo ${archivo.ruta} de la base de datos (${ficha.titulo}) de un sistema cuyo diseño, stack técnico y estructura de carpetas ya están aprobados.

CONTEXTO
Sistema: ${nombre}
${descripcion || ""}

Stack aprobado: ${piezas}

Guía de la pieza (reglas que el código debe cumplir):
${guia}

Archivos de la base de datos, en el orden en que se aplican:
${lista}

Este archivo: ${archivo.ruta}
Propósito: ${archivo.proposito}
${esDatos ? "" : `Tablas que crea: ${(archivo.tablas || []).map(tablaDeEntidad).join(", ") || "(ninguna: solo lo que dice el propósito)"}\n`}Requerimientos: ${(archivo.requerimientos || []).join(", ") || "(ninguno)"}

Actores:
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis?.requerimientos_funcionales || [])}

Requerimientos no funcionales:
${formatearRequerimientos(analisis?.requerimientos_no_funcionales || [], { conCategoria: true })}

Diagrama entidad-relación aprobado:
${diagramaER}

Diagrama de clases aprobado:
${diagramaClases || "(no hay)"}

${previos.length ? `Archivos anteriores, ya aplicados (usa sus tablas, columnas, tipos y funciones; no los repitas):
${previos.map((p) => `--- ${p.ruta} ---\n${p.contenido}`).join("\n\n")}` : "Es el primer archivo: la base está vacía."}

QUÉ DEBE MOSTRAR
${debe}
${formatearIndicaciones(indicaciones)}
QUÉ NO QUIERO
- Tablas que no son entidades del ER, ni las que crean otros archivos.
- Columnas de contraseña (las maneja la autenticación) ni cifrado de columnas: el cifrado en reposo se resuelve en el disco del servidor.
- drop o truncate de tablas, ni cambios a lo que crearon otros archivos salvo lo que este archivo necesita agregar.
- begin/commit, comandos de psql (\\c, \\i, \\set) ni markdown.
- Funciones o tablas que ningún requerimiento pide.

FORMATO
${tarea}

Responde solo con el SQL del archivo, sin explicaciones ni bloques de markdown.`;
}

// --- Generación -----------------------------------------------------------------------------

// cuerpo: { nombre, descripcion, analisis, stack, estructura, diagramaER, diagramaClases,
//   indicaciones, usarClaude, archivo (ruta), anteriores: [{ ruta, contenido }] } y, para
//   modificarlo, { actual, instruccion } o, para corregirlo, { actual, error }.
export async function generarArchivoBD(cuerpo) {
  const inicio = Date.now();
  const { stack, estructura, archivo: ruta, anteriores = [], usarClaude } = cuerpo;
  const ficha = piezaDeBaseDatos(stack, await catalogo());
  if (!ficha) throw new Error("El stack no tiene una pieza de base de datos.");
  const plan = archivosDeBaseDatos(estructura);
  const archivo = plan.find((a) => a.ruta === ruta);
  if (!archivo) throw new Error(`"${ruta}" no es un archivo de la base de datos en la estructura aprobada.`);

  // Solo los archivos que se aplican antes que este.
  const previos = plan
    .slice(0, plan.indexOf(archivo))
    .map((a) => anteriores.find((x) => x.ruta === a.ruta))
    .filter((p) => p?.contenido);
  const ctx = {
    ...cuerpo,
    ficha,
    guia: await leerGuia(ficha.nombre),
    plan,
    archivo,
    previos,
    entidades: entidadesER(cuerpo.diagramaER).map(tablaDeEntidad),
    anteriores: new Set(previos.flatMap((p) => tablasCreadas(p.contenido))),
  };

  let costo;
  const generar = async (extra = "", presupuestoMs) => {
    const response = await generarContenido({
      usarClaude,
      contents: [{ text: armarPrompt(ctx) + extra }],
      ...(presupuestoMs ? { presupuestoMs } : {}),
    });
    costo = sumarCosto(costo, response.costoUsd);
    const contenido = limpiarSQL(response.text);
    return { response, contenido, problemas: validarSQL(contenido, ctx) };
  };

  let resultado = await generar();
  const restante = LIMITE_RUTA_MS - (Date.now() - inicio);
  if (resultado.problemas.length && restante > 60_000) {
    try {
      const reintento = await generar(
        `

TU RESPUESTA ANTERIOR TIENE ESTOS PROBLEMAS:
${resultado.problemas.map((p) => `- ${p}`).join("\n")}

Respuesta anterior:
${resultado.contenido}

Corrígela y responde de nuevo con el archivo completo.`,
        restante - 10_000
      );
      if (reintento.problemas.length <= resultado.problemas.length) resultado = reintento;
    } catch {
      // Si el reintento falla, se conserva el primer resultado con sus advertencias.
    }
  }

  return {
    ruta,
    contenido: resultado.contenido,
    advertencias: resultado.problemas,
    modelo_ia: resultado.response.modelVersion,
    costo_ia: costo,
  };
}

// --- Prueba en contenedores -----------------------------------------------------------------

// Resultado de la prueba del runner revisado contra el diseño: qué entidades del ER quedaron como
// tabla, cuáles tienen RLS y políticas, cuáles datos de prueba, y los usuarios por actor.
// prueba: { ok, salida, tablas: [{ tabla, rls, politicas, filas, api }], buckets, realtime, usuarios }
// contenidos: [{ ruta, contenido }] de los archivos de la base, para lo que se revisa en el código.
export function revisarPrueba(prueba, { diagramaER, analisis, estructura, ficha, contenidos = [] }) {
  const rutas = archivosDeBaseDatos(estructura).map((a) => a.ruta);
  const fecha = new Date().toISOString();
  if (!prueba.ok) {
    const archivo = archivoQueFallo(prueba.salida, rutas);
    const error = errorDeSalida(prueba.salida);
    return {
      ok: false,
      fecha,
      archivo,
      error,
      salida: String(prueba.salida || "").slice(-6000),
      advertencias: [`${archivo || "La base"} falló al aplicarse: ${error.split("\n")[0]}`],
    };
  }

  const tablas = prueba.tablas || [];
  const nombres = new Set(tablas.map((t) => t.tabla));
  const entidades = entidadesER(diagramaER).map(tablaDeEntidad);
  const advertencias = [];

  const sinTabla = entidades.filter((e) => !nombres.has(e));
  if (sinTabla.length) advertencias.push(`Entidades del ER sin tabla en la base: ${sinTabla.join(", ")}.`);
  const extra = tablas.filter((t) => !entidades.includes(t.tabla)).map((t) => t.tabla);
  if (extra.length) advertencias.push(`Tablas que no están en el ER: ${extra.join(", ")}.`);

  const rls = !!ficha.bd?.rls;
  if (rls) {
    const sinRls = tablas.filter((t) => !t.rls).map((t) => t.tabla);
    const sinPoliticas = tablas.filter((t) => t.rls && !t.politicas).map((t) => t.tabla);
    const sinApi = tablas.filter((t) => t.api === false).map((t) => t.tabla);
    if (sinRls.length) advertencias.push(`Tablas sin RLS: ${sinRls.join(", ")}.`);
    if (sinPoliticas.length) advertencias.push(`Tablas con RLS pero sin políticas (nadie puede leerlas): ${sinPoliticas.join(", ")}.`);
    if (sinApi.length) advertencias.push(`La API no tiene permiso sobre: ${sinApi.join(", ")}.`);
  }

  const hayDatos = rutas.some((r) => estructura.archivos.find((a) => a.ruta === r)?.tipo === "datos");
  if (hayDatos && !tablas.some((t) => t.filas > 0)) advertencias.push("Los datos de prueba no dejaron filas en ninguna tabla.");
  const actores = (analisis?.actores || []).length;
  if (ficha.bd?.usuarios && hayDatos && typeof prueba.usuarios === "number" && prueba.usuarios < actores) {
    advertencias.push(`Hay ${prueba.usuarios} usuarios de prueba para ${actores} actores.`);
  }

  const hash = requerimientosConHash(analisis);
  if (hash.length && !contenidos.some((c) => /\bdigest\s*\(/i.test(sinComentarios(c.contenido)))) {
    advertencias.push(`${hash.join(", ")} pide un resumen criptográfico y ninguna migración lo calcula en la base (digest de pgcrypto).`);
  }

  const conTabla = entidades.filter((e) => nombres.has(e)).length;
  return {
    ok: true,
    fecha,
    tablas,
    buckets: prueba.buckets ?? null,
    realtime: prueba.realtime ?? null,
    usuarios: prueba.usuarios ?? null,
    cobertura: {
      tablas: [conTabla, entidades.length],
      ...(rls ? { rls: [tablas.filter((t) => t.rls && t.politicas).length, tablas.length] } : {}),
      ...(hayDatos ? { datos: [tablas.filter((t) => t.filas > 0).length, tablas.length] } : {}),
    },
    advertencias,
  };
}
