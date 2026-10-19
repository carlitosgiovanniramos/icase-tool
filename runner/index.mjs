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

// Puertos de la PC donde se publican los contenedores: [variable de .env, primer puerto a probar].
const PUERTOS_PUBLICADOS = [
  ["FRONTEND_PORT", 8080],
  ["BACKEND_PORT", 4000],
];

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
  if (limpia === ".env") throw new ErrorRunner(400, "El archivo .env lo genera el runner.");
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
  for (const [clave, desde] of PUERTOS_PUBLICADOS) {
    const actual = Number(variables[clave]);
    const libre = actual && !usados.has(actual) && !deDocker.has(actual) && (await puertoLibre(actual));
    if (actual && !usados.has(actual) && (encendido || libre)) {
      usados.add(actual);
      continue;
    }
    const nuevo = await buscarPuertoLibre(actual || desde, new Set([...usados, ...deDocker]));
    variables[clave] = String(nuevo);
    usados.add(nuevo);
  }
  return variables;
}

// --- Operaciones ----------------------------------------------------------------------------

async function sincronizar(id, archivos) {
  if (!Array.isArray(archivos) || !archivos.length) throw new ErrorRunner(400, "No llegaron archivos.");
  const carpeta = carpetaDe(id);
  const destinos = archivos.map((a) => [rutaSegura(carpeta, a.ruta), String(a.contenido ?? "")]);

  await mkdir(carpeta, { recursive: true });
  // La carpeta queda igual a los archivos recibidos: se borra lo anterior salvo .env, que guarda
  // la contraseña con la que se creó la base de datos.
  for (const entrada of await readdir(carpeta)) {
    if (entrada !== ".env") await rm(path.join(carpeta, entrada), { recursive: true, force: true });
  }
  for (const [destino, contenido] of destinos) {
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, contenido, "utf8");
  }

  if (!(await leerEnv(carpeta))) {
    const ejemplo = archivos.find((a) => a.ruta === ".env.example");
    const variables = leerVariables(ejemplo?.contenido);
    if ("DB_PASSWORD" in variables || !ejemplo) variables.DB_PASSWORD = crypto.randomBytes(18).toString("hex");
    await writeFile(path.join(carpeta, ".env"), escribirVariables(await asignarPuertos(variables, false)), "utf8");
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

      await compose(id, ["up", "-d", "--build", "--wait", ...servicios], {
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
  const frontend = servicios.find((s) => s.servicio === "frontend" && s.estado === "running");
  return {
    ...base,
    sincronizado: true,
    servicios,
    puertos: { frontend: Number(variables.FRONTEND_PORT) || null, backend: Number(variables.BACKEND_PORT) || null },
    url: frontend && variables.FRONTEND_PORT ? `http://localhost:${variables.FRONTEND_PORT}` : null,
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
    if (ruta === "POST sincronizar") return responder(res, 200, await sincronizar(id, (await leerCuerpo(req)).archivos));
    if (ruta === "POST levantar") return responder(res, 202, levantar(id, (await leerCuerpo(req)).servicios));
    if (ruta === "GET estado") return responder(res, 200, await consultarEstado(id));
    if (ruta === "GET logs") return responder(res, 200, await logs(id, url.searchParams.get("servicio")));
    if (ruta === "POST detener") return responder(res, 200, await detener(id, await leerCuerpo(req)));
    if (ruta === "POST eliminar") return responder(res, 200, await detener(id, { eliminar: true }));
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
