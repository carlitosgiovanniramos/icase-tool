// Runner de icase-tool: el único proceso que ejecuta Docker. icase-tool (Next.js) le pide
// escribir los archivos de un proyecto en su carpeta de trabajo y levantarlo, detenerlo o leer
// su estado y sus logs. Escucha solo en 127.0.0.1 y exige RUNNER_TOKEN en cada petición.
//
// Uso: npm run runner (lee las variables de .env.local).
//   RUNNER_TOKEN             clave compartida con icase-tool (obligatoria)
//   RUNNER_PORT              puerto del runner (por defecto 4100)
//   WORKSPACES_DIR           carpeta de trabajo de los proyectos (por defecto C:\icase-workspaces)
//   RUNNER_INACTIVIDAD_MIN   minutos sin uso antes de apagar un proyecto (por defecto 60)

import http from "node:http";
import net from "node:net";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

const PUERTO = Number(process.env.RUNNER_PORT) || 4100;
const TOKEN = process.env.RUNNER_TOKEN || "";
const RAIZ = path.resolve(process.env.WORKSPACES_DIR || "C:\\icase-workspaces");
const INACTIVIDAD_MS = (Number(process.env.RUNNER_INACTIVIDAD_MIN) || 60) * 60_000;
const MAX_CUERPO = 20 * 1024 * 1024;
const MAX_SALIDA = 100_000; // caracteres de salida de docker que se conservan por proyecto
const ESPERA_CORTA_MS = 60_000; // estado, logs
const ESPERA_LARGA_MS = 15 * 60_000; // construir imágenes y levantar

// Toda variable de .env que termina en _PORT es un puerto de la PC donde se publica un contenedor;
// su valor en .env.example es el primer puerto que se prueba.
const ES_PUERTO = /_PORT$/;

if (!TOKEN) {
  console.error("Falta RUNNER_TOKEN en .env.local. Agrega una clave larga y aleatoria, la misma que usa icase-tool.");
  process.exit(1);
}

// Estado en memoria de cada proyecto: operación en curso, su salida y el último uso.
const proyectos = new Map();
function estadoDe(id) {
  if (!proyectos.has(id)) {
    proyectos.set(id, { operacion: null, salida: "", error: null, encendido: false, ultimoUso: Date.now() });
  }
  return proyectos.get(id);
}

class ErrorRunner extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// --- Validaciones ---------------------------------------------------------------------------

const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,62}$/;
const SERVICIO_VALIDO = /^[a-z0-9][a-z0-9_-]{0,62}$/;

function carpetaDe(id) {
  if (!ID_VALIDO.test(id)) throw new ErrorRunner(400, "Identificador de proyecto no válido.");
  return path.join(RAIZ, id);
}

const nombreCompose = (id) => `icase_${id}`;

// Ruta relativa segura dentro de la carpeta del proyecto: sin "..", sin rutas absolutas y sin
// tocar .env, que lo administra el runner.
function rutaSegura(carpeta, ruta) {
  const limpia = path.posix.normalize(String(ruta || "").replace(/\\/g, "/"));
  if (!limpia || limpia === "." || limpia.startsWith("../") || limpia === ".." || path.isAbsolute(limpia) || /^[a-zA-Z]:/.test(limpia)) {
    throw new ErrorRunner(400, `Ruta de archivo no válida: ${ruta}`);
  }
  if (limpia === ".env" || limpia === ".icase-stack") throw new ErrorRunner(400, `El archivo ${limpia} lo genera el runner.`);
  const destino = path.resolve(carpeta, limpia);
  if (!destino.startsWith(carpeta + path.sep)) throw new ErrorRunner(400, `Ruta de archivo no válida: ${ruta}`);
  return destino;
}

// --- Docker ---------------------------------------------------------------------------------

// Mensaje entendible a partir de la salida de un comando de Docker que falló.
function explicarErrorDocker(texto) {
  if (/cannot connect to the docker daemon|error during connect|dockerDesktopLinuxEngine|pipe.*docker/i.test(texto)) {
    return "Docker Desktop no está encendido.";
  }
  const puerto = texto.match(/(?:0\.0\.0\.0|\[::\]|127\.0\.0\.1):(\d+).*(?:already allocated|address already in use)/i);
  if (puerto) return `El puerto ${puerto[1]} de la PC ya está en uso.`;
  const linea = texto.split(/\r?\n/).reverse().find((l) => /error|failed|unhealthy/i.test(l));
  return linea ? linea.trim().slice(0, 300) : null;
}

// Ejecuta "docker ..." sin shell. Con cwd, en la carpeta del proyecto.
function docker(argumentos, { cwd, espera = ESPERA_CORTA_MS, alSalir } = {}) {
  return new Promise((resolver, rechazar) => {
    const proceso = spawn("docker", argumentos, { cwd, windowsHide: true });
    let salida = "";
    const agregar = (trozo) => {
      salida = (salida + trozo.toString()).slice(-MAX_SALIDA);
      alSalir?.(salida);
    };
    proceso.stdout.on("data", agregar);
    proceso.stderr.on("data", agregar);

    const temporizador = setTimeout(() => {
      proceso.kill();
      rechazar(new ErrorRunner(504, "Docker tardó demasiado en responder."));
    }, espera);

    proceso.on("error", (err) => {
      clearTimeout(temporizador);
      rechazar(new ErrorRunner(500, err.code === "ENOENT" ? "Docker no está instalado en esta PC." : err.message));
    });
    proceso.on("close", (codigo) => {
      clearTimeout(temporizador);
      if (codigo === 0) return resolver(salida);
      const err = new ErrorRunner(500, explicarErrorDocker(salida) || "Docker devolvió un error.");
      err.salida = salida;
      rechazar(err);
    });
  });
}

// "docker compose -p icase_<id> ..." en la carpeta del proyecto.
function compose(id, argumentos, opciones = {}) {
  const carpeta = carpetaDe(id);
  if (!existsSync(carpeta)) {
    return Promise.reject(new ErrorRunner(400, "El proyecto todavía no tiene carpeta de trabajo: primero hay que sincronizarlo."));
  }
  return docker(["compose", "-p", nombreCompose(id), ...argumentos], { ...opciones, cwd: carpeta });
}

// --- Archivo .env del proyecto --------------------------------------------------------------

function leerVariables(texto) {
  const variables = {};
  for (const linea of String(texto || "").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m) variables[m[1]] = m[2].trim();
  }
  return variables;
}

const escribirVariables = (variables) =>
  Object.entries(variables).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";

async function leerEnv(carpeta) {
  try {
    return leerVariables(await readFile(path.join(carpeta, ".env"), "utf8"));
  } catch {
    return null;
  }
}

// Puertos de la PC que ya publican otros contenedores (de cualquier proyecto). En Windows, abrir
// el puerto desde Node no siempre falla aunque Docker Desktop lo tenga tomado, por eso se le pregunta
// a Docker además de probar el puerto.
async function puertosDeDocker() {
  const salida = await docker(["ps", "--format", "{{.Ports}}"]);
  return new Set([...salida.matchAll(/:(\d+)->/g)].map((m) => Number(m[1])));
}

// Libre si nadie responde en el puerto y se puede abrir.
function puertoLibre(puerto) {
  return new Promise((resolver) => {
    const conexion = net.connect({ port: puerto, host: "127.0.0.1" });
    conexion.setTimeout(500);
    const ocupado = () => {
      conexion.destroy();
      resolver(false);
    };
    conexion.once("connect", ocupado);
    conexion.once("timeout", ocupado);
    conexion.once("error", () => {
      const servidor = net.createServer();
      servidor.once("error", () => resolver(false));
      servidor.once("listening", () => servidor.close(() => resolver(true)));
      servidor.listen(puerto, "0.0.0.0");
    });
  });
}

async function buscarPuertoLibre(desde, ocupados) {
  for (let p = desde; p < desde + 1000; p++) {
    if (p === PUERTO || ocupados.has(p)) continue;
    if (await puertoLibre(p)) return p;
  }
  throw new ErrorRunner(500, `No hay puertos libres a partir del ${desde}.`);
}

// Asigna a cada puerto publicado uno libre de la PC. Si el proyecto ya está encendido, sus
// puertos están ocupados por él mismo y se conservan.
async function asignarPuertos(variables, encendido) {
  const deDocker = encendido ? new Set() : await puertosDeDocker();
  const usados = new Set();
  for (const clave of Object.keys(variables).filter((k) => ES_PUERTO.test(k))) {
    const actual = Number(variables[clave]);
    const libre = actual && !usados.has(actual) && !deDocker.has(actual) && (await puertoLibre(actual));
    if (actual && !usados.has(actual) && (encendido || libre)) {
      usados.add(actual);
      continue;
    }
    const nuevo = await buscarPuertoLibre(actual || 8000, new Set([...usados, ...deDocker]));
    variables[clave] = String(nuevo);
    usados.add(nuevo);
  }
  return variables;
}

// Claves que piden las piezas en .env.example, generadas una vez por proyecto:
//   {{secreto:hex:N}} / {{secreto:base64:N}}   N bytes aleatorios
//   {{jwt:<rol>}}                               JWT HS256 firmado con JWT_SECRET (claves de Supabase)
const SECRETO = /^\{\{secreto:(hex|base64):(\d+)\}\}$/;
const JWT = /^\{\{jwt:([a-z_]+)\}\}$/;

function firmarJwt(rol, secreto) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const contenido = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: rol, iss: "supabase", iat, exp: iat + 5 * 365 * 24 * 3600 })}`;
  return `${contenido}.${crypto.createHmac("sha256", secreto).update(contenido).digest("base64url")}`;
}

// .env del proyecto: conserva los valores que ya tenía (la base de datos se creó con esas claves) y
// agrega las variables nuevas de .env.example, generando las claves que pidan.
function completarVariables(ejemplo, existentes) {
  const variables = { ...existentes };
  const jwts = [];
  for (const [clave, valor] of Object.entries(ejemplo)) {
    if (clave in variables) continue;
    const secreto = valor.match(SECRETO);
    if (secreto) variables[clave] = crypto.randomBytes(Number(secreto[2])).toString(secreto[1]);
    else if (JWT.test(valor)) jwts.push([clave, valor.match(JWT)[1]]);
    else variables[clave] = valor;
  }
  for (const [clave, rol] of jwts) {
    if (!variables.JWT_SECRET) throw new ErrorRunner(400, `${clave} necesita JWT_SECRET en .env.example.`);
    variables[clave] = firmarJwt(rol, variables.JWT_SECRET);
  }
  return variables;
}

// --- Operaciones ----------------------------------------------------------------------------

// Archivo de la carpeta del proyecto con la firma de su stack (piezas elegidas).
const ARCHIVO_STACK = ".icase-stack";
const CONSERVAR = new Set([".env", ARCHIVO_STACK]);

// firma: identifica las piezas del proyecto. Si cambió (por ejemplo, de PostgreSQL a Supabase), lo
// anterior no sirve: se borran sus contenedores, datos e imágenes y se generan claves nuevas.
async function sincronizar(id, archivos, firma) {
  if (!Array.isArray(archivos) || !archivos.length) throw new ErrorRunner(400, "No llegaron archivos.");
  const estado = estadoDe(id);
  if (estado.operacion) throw new ErrorRunner(409, "Ya hay una operación en curso para este proyecto.");
  const carpeta = carpetaDe(id);
  const destinos = archivos.map((a) => [rutaSegura(carpeta, a.ruta), String(a.contenido ?? "")]);

  await mkdir(carpeta, { recursive: true });
  const anterior = await readFile(path.join(carpeta, ARCHIVO_STACK), "utf8").catch(() => null);
  if (firma && anterior !== firma && (await leerEnv(carpeta))) {
    estado.operacion = "reiniciando";
    try {
      if (existsSync(path.join(carpeta, "docker-compose.yml"))) {
        await compose(id, ["down", "-v", "--remove-orphans", "--rmi", "local"], { espera: ESPERA_LARGA_MS });
      }
      await rm(path.join(carpeta, ".env"), { force: true });
    } finally {
      estado.operacion = null;
    }
  }

  // La carpeta queda igual a los archivos recibidos: se borra lo anterior salvo .env, que guarda
  // las claves con las que se creó la base de datos, y la firma del stack.
  for (const entrada of await readdir(carpeta)) {
    if (!CONSERVAR.has(entrada)) await rm(path.join(carpeta, entrada), { recursive: true, force: true });
  }
  if (firma) await writeFile(path.join(carpeta, ARCHIVO_STACK), firma, "utf8");
  for (const [destino, contenido] of destinos) {
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, contenido, "utf8");
  }

  const ejemplo = leerVariables(archivos.find((a) => a.ruta === ".env.example")?.contenido);
  const existentes = (await leerEnv(carpeta)) || {};
  const variables = completarVariables(ejemplo, existentes);
  const nuevas = Object.keys(variables).filter((k) => !(k in existentes));
  if (nuevas.length) {
    // Los puertos se verifican al levantar; aquí solo se completan los que faltan.
    await writeFile(path.join(carpeta, ".env"), escribirVariables(variables), "utf8");
  }
  return { archivos: destinos.length };
}

async function contenedores(id) {
  const salida = await compose(id, ["ps", "-a", "--format", "json"]);
  const texto = salida.trim();
  if (!texto) return [];
  // Según la versión, Compose devuelve un arreglo JSON o un objeto JSON por línea.
  const lista = texto.startsWith("[") ? JSON.parse(texto) : texto.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  return lista.map((c) => ({
    servicio: c.Service,
    estado: c.State, // running | exited | created | restarting...
    salud: c.Health || null, // healthy | unhealthy | starting
    codigoSalida: c.ExitCode ?? null,
  }));
}

function levantar(id, servicios = []) {
  const estado = estadoDe(id);
  if (estado.operacion) throw new ErrorRunner(409, "Ya hay una operación en curso para este proyecto.");
  for (const s of servicios) if (!SERVICIO_VALIDO.test(s)) throw new ErrorRunner(400, `Servicio no válido: ${s}`);

  estado.operacion = "levantando";
  estado.salida = "";
  estado.error = null;

  // Se responde enseguida; construir las imágenes puede tardar minutos. El navegador consulta
  // el estado hasta que termina.
  (async () => {
    try {
      const carpeta = carpetaDe(id);
      const variables = await leerEnv(carpeta);
      if (!variables) throw new ErrorRunner(400, "Primero hay que sincronizar los archivos del proyecto.");
      const encendido = (await contenedores(id)).some((c) => c.estado === "running");
      await writeFile(path.join(carpeta, ".env"), escribirVariables(await asignarPuertos(variables, encendido)), "utf8");

      await compose(id, ["up", "-d", "--build", "--wait", "--remove-orphans", ...servicios], {
        espera: ESPERA_LARGA_MS,
        alSalir: (s) => (estado.salida = s),
      });
      estado.encendido = true;
    } catch (err) {
      estado.error = err.message;
      if (err.salida) estado.salida = err.salida;
    } finally {
      estado.operacion = null;
      estado.ultimoUso = Date.now();
    }
  })();

  return { operacion: "levantando" };
}

async function consultarEstado(id) {
  const estado = estadoDe(id);
  const variables = await leerEnv(carpetaDe(id));
  const base = { operacion: estado.operacion, error: estado.error, salida: estado.operacion || estado.error ? estado.salida : "" };
  if (!variables) return { ...base, sincronizado: false, servicios: [] };

  const servicios = await contenedores(id);
  return {
    ...base,
    sincronizado: true,
    servicios,
    // Puertos de la PC asignados al proyecto ({ WEB_PORT: 3001, ... }); icase-tool les pone nombre.
    puertos: Object.fromEntries(
      Object.entries(variables).filter(([k]) => ES_PUERTO.test(k)).map(([k, v]) => [k, Number(v)])
    ),
  };
}

async function logs(id, servicio) {
  if (servicio && !SERVICIO_VALIDO.test(servicio)) throw new ErrorRunner(400, "Servicio no válido.");
  return { logs: await compose(id, ["logs", "--no-color", "--tail", "200", ...(servicio ? [servicio] : [])]) };
}

async function detener(id, { borrarDatos = false, eliminar = false } = {}) {
  const estado = estadoDe(id);
  if (estado.operacion) throw new ErrorRunner(409, "Ya hay una operación en curso para este proyecto.");
  const carpeta = carpetaDe(id);
  estado.operacion = "deteniendo";
  try {
    if (await leerEnv(carpeta)) {
      const argumentos = ["down"];
      if (borrarDatos || eliminar) argumentos.push("-v");
      if (eliminar) argumentos.push("--rmi", "local");
      await compose(id, argumentos, { espera: ESPERA_LARGA_MS });
    }
    if (eliminar) await rm(carpeta, { recursive: true, force: true });
    estado.encendido = false;
    estado.error = null;
    return { detenido: true };
  } finally {
    estado.operacion = null;
  }
}

// --- Prueba de la base de datos -------------------------------------------------------------

// Un error de PostgreSQL al aplicar un archivo (no de Docker): "ERROR:  ..." o "psql:archivo:N: ERROR".
const ERROR_SQL = /(^|\s|\|)ERROR:\s/m;

// Lo que quedó en la base: cada tabla de public con su RLS, políticas, filas y si la API
// (rol authenticated, si existe) puede leerla.
const CONSULTA_TABLAS = `select coalesce(json_agg(t order by t.tabla), '[]') from (
  select c.relname as tabla, c.relrowsecurity as rls,
    (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)::int as politicas,
    (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text::int as filas,
    case when exists (select 1 from pg_roles where rolname = 'authenticated')
      then has_table_privilege('authenticated', c.oid, 'select') end as api
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')) t`;
// Solo existen con algunas piezas (Supabase): si fallan, quedan en null.
const CONSULTAS_OPCIONALES = {
  buckets: "select coalesce(json_agg(id order by id), '[]') from storage.buckets",
  realtime: "select coalesce(json_agg(tablename order by tablename), '[]') from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'",
  usuarios: "select count(*) from auth.users",
  // Usuarios que Auth no encontrará (instance_id distinto de ceros) y con el rol donde el propio
  // usuario puede cambiarlo.
  revisionUsuarios: `select json_build_object(
    'instancia', count(*) filter (where instance_id is distinct from '00000000-0000-0000-0000-000000000000'),
    'rolEnUsuario', count(*) filter (where raw_user_meta_data ?| array['rol', 'role'])) from auth.users`,
};

// Prueba la base en un proyecto aparte (icase_<id>-bd), con su propia carpeta y sus volúmenes:
// aplica las migraciones y los datos de prueba desde cero y lee lo que quedó. No toca el proyecto
// del usuario ni sus datos, y al terminar se borra.
//   servicio, modo: "tarea" (servicio de un solo uso que aplica los archivos, como migraciones de
//     Supabase) o "servicio" (la base aplica sus scripts al crearse, como PostgreSQL)
//   conexion: { usuario, baseDatos }, con ${VARIABLE} del .env si hace falta
async function probarBaseDatos(id, { archivos, servicio, modo, conexion = {} }) {
  if (!Array.isArray(archivos) || !archivos.length) throw new ErrorRunner(400, "No llegaron archivos.");
  if (!SERVICIO_VALIDO.test(String(servicio))) throw new ErrorRunner(400, "Servicio no válido.");
  if (!["tarea", "servicio"].includes(modo)) throw new ErrorRunner(400, "Modo de prueba no válido.");
  const idPrueba = `${id}-bd`;
  const carpeta = carpetaDe(idPrueba);
  const estado = estadoDe(idPrueba);
  if (estado.operacion) throw new ErrorRunner(409, "Ya hay una prueba de la base en curso para este proyecto.");
  estado.operacion = "probando";

  const borrar = async () => {
    if (existsSync(path.join(carpeta, "docker-compose.yml"))) {
      await compose(idPrueba, ["down", "-v", "--remove-orphans"], { espera: ESPERA_LARGA_MS }).catch(() => {});
    }
    await rm(carpeta, { recursive: true, force: true });
  };

  try {
    await borrar();
    await mkdir(carpeta, { recursive: true });
    for (const a of archivos) {
      const destino = rutaSegura(carpeta, a.ruta);
      await mkdir(path.dirname(destino), { recursive: true });
      await writeFile(destino, String(a.contenido ?? ""), "utf8");
    }
    const ejemplo = leerVariables(archivos.find((a) => a.ruta === ".env.example")?.contenido);
    const variables = await asignarPuertos(completarVariables(ejemplo, {}), false);
    await writeFile(path.join(carpeta, ".env"), escribirVariables(variables), "utf8");

    // Con "servicio", la base reinicia sola si un script falla y vuelve a arrancar sin
    // aplicarlos: el error se busca siempre en sus logs.
    let salida = "";
    try {
      salida =
        modo === "tarea"
          ? await compose(idPrueba, ["run", "--rm", "-T", servicio], { espera: ESPERA_LARGA_MS })
          : await compose(idPrueba, ["up", "-d", "--wait", servicio], { espera: ESPERA_LARGA_MS });
    } catch (err) {
      salida = err.salida || "";
      if (modo === "tarea" && !ERROR_SQL.test(salida)) throw err;
    }
    if (modo === "servicio") {
      salida += "\n" + (await compose(idPrueba, ["logs", "--no-color", servicio]).catch(() => ""));
    }
    if (ERROR_SQL.test(salida)) return { ok: false, salida: salida.slice(-MAX_SALIDA) };

    const reemplazar = (v) => String(v || "").replace(/\$\{(\w+)\}/g, (m, k) => variables[k] ?? "");
    const psql = (consulta) =>
      compose(idPrueba, [
        "exec", "-T", "db", "psql", "-X", "-At", "-v", "ON_ERROR_STOP=1",
        "-U", reemplazar(conexion.usuario) || "postgres",
        "-d", reemplazar(conexion.baseDatos) || "postgres",
        "-c", consulta,
      ]).then((s) => JSON.parse(s.trim()));

    const resumen = { ok: true, salida: salida.slice(-20_000), tablas: await psql(CONSULTA_TABLAS) };
    for (const [clave, consulta] of Object.entries(CONSULTAS_OPCIONALES)) {
      resumen[clave] = await psql(consulta).catch(() => null);
    }
    return resumen;
  } finally {
    await borrar().catch(() => {});
    estado.operacion = null;
  }
}

// Apaga los proyectos que este runner levantó y nadie consulta hace rato.
setInterval(async () => {
  for (const [id, estado] of proyectos) {
    if (!estado.encendido || estado.operacion || Date.now() - estado.ultimoUso < INACTIVIDAD_MS) continue;
    try {
      await detener(id);
      console.log(`Proyecto ${id} apagado por inactividad.`);
    } catch (err) {
      console.error(`No se pudo apagar ${id}:`, err.message);
    }
  }
}, 60_000).unref();

// --- Servidor HTTP --------------------------------------------------------------------------

function autorizado(req) {
  const recibido = Buffer.from(String(req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
  const esperado = Buffer.from(TOKEN);
  return recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
}

async function leerCuerpo(req) {
  let tamano = 0;
  const trozos = [];
  for await (const trozo of req) {
    tamano += trozo.length;
    if (tamano > MAX_CUERPO) throw new ErrorRunner(413, "Los archivos del proyecto superan el tamaño permitido.");
    trozos.push(trozo);
  }
  if (!trozos.length) return {};
  try {
    return JSON.parse(Buffer.concat(trozos).toString("utf8"));
  } catch {
    throw new ErrorRunner(400, "El cuerpo no es un JSON válido.");
  }
}

function responder(res, estado, datos) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(datos));
}

const servidor = http.createServer(async (req, res) => {
  try {
    if (!autorizado(req)) return responder(res, 401, { error: "No autorizado." });

    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/salud") return responder(res, 200, { estado: "ok" });

    const m = url.pathname.match(/^\/proyectos\/([^/]+)\/([a-z]+)$/);
    if (!m) throw new ErrorRunner(404, "Ruta no encontrada.");
    const [, id, accion] = m;
    carpetaDe(id); // valida el id antes de hacer nada
    estadoDe(id).ultimoUso = Date.now();

    const ruta = `${req.method} ${accion}`;
    if (ruta === "POST sincronizar") {
      const { archivos, firma } = await leerCuerpo(req);
      return responder(res, 200, await sincronizar(id, archivos, firma));
    }
    if (ruta === "POST levantar") return responder(res, 202, levantar(id, (await leerCuerpo(req)).servicios));
    if (ruta === "GET estado") return responder(res, 200, await consultarEstado(id));
    if (ruta === "GET logs") return responder(res, 200, await logs(id, url.searchParams.get("servicio")));
    if (ruta === "POST detener") return responder(res, 200, await detener(id, await leerCuerpo(req)));
    if (ruta === "POST eliminar") return responder(res, 200, await detener(id, { eliminar: true }));
    if (ruta === "POST probarbd") return responder(res, 200, await probarBaseDatos(id, await leerCuerpo(req)));
    throw new ErrorRunner(404, "Ruta no encontrada.");
  } catch (err) {
    if (!(err instanceof ErrorRunner)) console.error(err);
    responder(res, err.estado || 500, { error: err.message, salida: err.salida });
  }
});

await mkdir(RAIZ, { recursive: true });
servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`Runner de icase-tool en http://127.0.0.1:${PUERTO} · proyectos en ${RAIZ}`);
});
