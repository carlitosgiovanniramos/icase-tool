import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Document, parse } from "yaml";

// Arma el proyecto de la fase de Implementación a partir de las piezas del catálogo
// (plantillas/<pieza>/) que corresponden a las tecnologías del diseño, más los archivos que generó
// la IA (tabla archivos_proyecto). Solo se usa en el servidor.
//
// Una pieza tiene:
//   pieza.json             ficha: servicios, opcionales, integraciones, variables, enlaces
//   compose.yml            su parte del docker-compose.yml
//   compose.<otra>.yml     lo que agrega cuando el proyecto también usa la pieza <otra>
//   archivos/              archivos fijos que se copian al proyecto
//   archivos.<otra>/       archivos fijos que solo van con la pieza <otra> (pisan a los de archivos/)

// Proyectos que todavía no tienen el paso "Stack técnico" aprobado (proyecto de referencia de la
// Etapa 2): React + Express + PostgreSQL.
export const PIEZAS_POR_DEFECTO = [{ pieza: "postgres" }, { pieza: "express" }, { pieza: "react" }];

const NOMBRE_VALIDO = /^[a-z0-9-]+$/;
const raizPiezas = () => path.join(process.cwd(), "plantillas");

// Nombre de la base de datos a partir del nombre del proyecto: minúsculas, sin tildes y solo
// letras, números y guiones bajos. "Sistema de Bomberos" -> "sistema_de_bomberos".
export function nombreBaseDatos(nombre) {
  const limpio = String(nombre || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/, "");
  return /^[a-z]/.test(limpio) ? limpio : `app${limpio ? `_${limpio}` : ""}`;
}

// --- Lectura de piezas ----------------------------------------------------------------------

async function leerCarpeta(raiz) {
  if (!existsSync(raiz)) return [];
  const archivos = [];
  for (const entrada of await readdir(raiz, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    const completa = path.join(entrada.parentPath, entrada.name);
    archivos.push({
      ruta: path.relative(raiz, completa).split(path.sep).join("/"),
      contenido: await readFile(completa, "utf8"),
    });
  }
  return archivos;
}

async function leerYaml(archivo) {
  return existsSync(archivo) ? parse(await readFile(archivo, "utf8")) || {} : null;
}

export async function leerPieza(nombre) {
  if (!NOMBRE_VALIDO.test(nombre)) throw new Error(`Pieza no válida: ${nombre}`);
  const raiz = path.join(raizPiezas(), nombre);
  if (!existsSync(path.join(raiz, "pieza.json"))) throw new Error(`La pieza "${nombre}" no existe en el catálogo.`);
  const ficha = JSON.parse(await readFile(path.join(raiz, "pieza.json"), "utf8"));
  return { ficha, raiz };
}

// Fichas de todas las piezas del catálogo (para el paso "Stack técnico").
export async function catalogo() {
  const nombres = (await readdir(raizPiezas(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  return Promise.all(nombres.map(async (n) => (await leerPieza(n)).ficha));
}

// --- Composición ----------------------------------------------------------------------------

const esObjeto = (v) => v && typeof v === "object" && !Array.isArray(v);

// Une b sobre a: los objetos se combinan; listas y valores simples de b reemplazan a los de a.
function unir(a, b) {
  if (!esObjeto(a) || !esObjeto(b)) return structuredClone(b);
  const r = { ...a };
  for (const [k, v] of Object.entries(b)) r[k] = k in r ? unir(r[k], v) : structuredClone(v);
  return r;
}

// Alta disponibilidad: el servicio web pasa a <servicio>-master y <servicio>-esclavo (misma app) y
// el puerto lo publica el balanceador, que deriva al esclavo si el master no responde.
function aplicarAltaDisponibilidad(compose, { servicio, variablePuerto }, valorPorDefecto) {
  const original = compose.services[servicio];
  if (!original) return;
  if (!original.healthcheck) throw new Error(`El servicio "${servicio}" necesita healthcheck para la alta disponibilidad.`);
  delete compose.services[servicio];
  const sinPuertos = { ...original };
  delete sinPuertos.ports;
  for (const rol of ["master", "esclavo"]) {
    compose.services[`${servicio}-${rol}`] = unir(sinPuertos, { environment: { INSTANCIA: `${servicio}-${rol}` } });
  }
  compose.services.balanceador = {
    image: "nginx:1.27-alpine",
    restart: "unless-stopped",
    depends_on: {
      [`${servicio}-master`]: { condition: "service_healthy" },
      [`${servicio}-esclavo`]: { condition: "service_healthy" },
    },
    ports: [`\${${variablePuerto}:-${valorPorDefecto}}:80`],
    volumes: ["./balanceador/nginx.conf:/etc/nginx/conf.d/default.conf:ro"],
  };
}

// Quita las dependencias hacia servicios que no están en el proyecto (por ejemplo, migraciones
// espera a storage solo si el diseño tiene Storage) y los volúmenes que nadie usa.
function limpiar(compose) {
  const servicios = new Set(Object.keys(compose.services));
  for (const s of Object.values(compose.services)) {
    if (esObjeto(s.depends_on)) {
      for (const dep of Object.keys(s.depends_on)) if (!servicios.has(dep)) delete s.depends_on[dep];
      if (!Object.keys(s.depends_on).length) delete s.depends_on;
    }
  }
  if (compose.volumes) {
    const usados = new Set(
      Object.values(compose.services).flatMap((s) => (s.volumes || []).map((v) => String(v).split(":")[0]))
    );
    for (const v of Object.keys(compose.volumes)) if (!usados.has(v)) delete compose.volumes[v];
    if (!Object.keys(compose.volumes).length) delete compose.volumes;
  }
}

function yamlCompose(compose, piezas) {
  const doc = new Document(compose, { version: "1.1" }); // 1.1: comillas en "no", "true", etc.
  doc.commentBefore =
    ` Generado por icase-tool con las piezas: ${piezas.join(", ")}.\n` +
    " Los archivos fijos y este docker-compose.yml salen del catálogo de piezas, no de la IA.";
  return doc.toString({ lineWidth: 0 });
}

function textoEnv(bloques) {
  return (
    bloques
      .filter((b) => Object.keys(b.variables).length)
      .map((b) => `# ${b.titulo}\n` + Object.entries(b.variables).map(([k, v]) => `${k}=${v}`).join("\n"))
      .join("\n\n") + "\n"
  );
}

// piezas: [{ pieza: "supabase", opcionales: ["auth", "realtime"] }, { pieza: "nextjs" }, ...]
// altaDisponibilidad: duplica el servicio web en master y esclavo con balanceador.
// externos: [{ servicio, variable, usadoPor: ["functions", "web"...] }] del paso "Stack técnico":
//   cada clave va vacía a .env.example y como variable de entorno a los servicios que la usan.
// Devuelve los archivos del proyecto (fijos y generados) ordenados por ruta, y los servicios.
export async function armarProyecto({
  nombre,
  generados,
  piezas = PIEZAS_POR_DEFECTO,
  altaDisponibilidad = false,
  externos = [],
}) {
  const elegidas = [...piezas];
  if (altaDisponibilidad && !elegidas.some((p) => p.pieza === "alta-disponibilidad")) {
    elegidas.push({ pieza: "alta-disponibilidad" });
  }
  const nombres = new Set(elegidas.map((p) => p.pieza));
  const valores = { nombre_bd: nombreBaseDatos(nombre) };

  let compose = { services: {} };
  const fijos = new Map(); // ruta -> contenido
  const bloquesEnv = [];
  const descripciones = {}; // servicio -> descripción, de las fichas
  let objetivoAlta = null;

  for (const { pieza, opcionales = [] } of elegidas) {
    const { ficha, raiz } = await leerPieza(pieza);
    const capas = ["", ...(ficha.integraciones || []).filter((i) => nombres.has(i)).map((i) => `.${i}`)];

    for (const capa of capas) {
      const parte = await leerYaml(path.join(raiz, `compose${capa}.yml`));
      if (parte) compose = unir(compose, parte);
      for (const a of await leerCarpeta(path.join(raiz, `archivos${capa}`))) fijos.set(a.ruta, a.contenido);
    }

    // Servicios opcionales de la pieza que el diseño no tiene: fuera.
    for (const opcional of Object.keys(ficha.opcionales || {})) {
      if (!opcionales.includes(opcional)) delete compose.services[opcional];
    }

    Object.assign(descripciones, ficha.servicios || {});
    if (ficha.altaDisponibilidad) objetivoAlta = { ...ficha.altaDisponibilidad, variables: ficha.variables || {} };
    bloquesEnv.push({ titulo: ficha.titulo, variables: ficha.variables || {} });
  }

  // Claves de servicios externos: antes de la alta disponibilidad, para que master y esclavo las
  // hereden. Sin valor, el servicio arranca igual y solo esa función avisa que falta la clave.
  for (const { variable, usadoPor = [] } of externos) {
    for (const s of usadoPor) {
      if (compose.services[s]) compose.services[s] = unir(compose.services[s], { environment: { [variable]: `\${${variable}:-}` } });
    }
  }
  if (externos.length) {
    bloquesEnv.push({
      titulo: "Servicios externos: claves propias del proyecto (vacías hasta configurarlas)",
      variables: Object.fromEntries(externos.map((x) => [x.variable, ""])),
    });
  }

  if (nombres.has("alta-disponibilidad")) {
    if (!objetivoAlta) throw new Error("La alta disponibilidad necesita una pieza web en el proyecto.");
    aplicarAltaDisponibilidad(compose, objetivoAlta, objetivoAlta.variables[objetivoAlta.variablePuerto]);
    const base = descripciones[objetivoAlta.servicio];
    descripciones[`${objetivoAlta.servicio}-master`] = `${base} · master activo`;
    descripciones[`${objetivoAlta.servicio}-esclavo`] = `${base} · esclavo en espera`;
    valores.servicio = objetivoAlta.servicio;
    valores.puerto = String(objetivoAlta.puerto);
  }
  limpiar(compose);

  const reemplazar = (texto) => texto.replace(/\{\{(nombre_bd|servicio|puerto)\}\}/g, (m, clave) => valores[clave] ?? m);
  const lista = [...fijos].map(([ruta, contenido]) => ({ ruta, contenido: reemplazar(contenido), origen: "plantilla" }));
  lista.push({ ruta: "docker-compose.yml", contenido: yamlCompose(compose, [...nombres]), origen: "plantilla" });
  lista.push({ ruta: ".env.example", contenido: reemplazar(textoEnv(bloquesEnv)), origen: "plantilla" });

  // Los archivos fijos mandan: si la IA generó uno con la misma ruta, se ignora.
  const rutasFijas = new Set(lista.map((a) => a.ruta));
  for (const a of generados || []) {
    if (rutasFijas.has(a.ruta)) continue;
    lista.push({ ruta: a.ruta, contenido: a.contenido ?? "", origen: "generado", estado: a.estado, paso: a.paso });
  }

  return {
    archivos: lista.sort((a, b) => a.ruta.localeCompare(b.ruta)),
    servicios: Object.keys(compose.services).map((s) => ({
      nombre: s,
      descripcion: descripciones[s] || s,
      // Tarea de un solo uso (restart "no"): termina sola y no queda encendida.
      tarea: compose.services[s].restart === "no",
    })),
  };
}
