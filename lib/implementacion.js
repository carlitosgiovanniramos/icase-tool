import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// Arma el proyecto completo de la fase de Implementación: los archivos fijos de la plantilla del
// stack (plantillas/<nombre>/) más los que generó la IA (tabla archivos_proyecto). Solo se usa en
// el servidor.

export const PLANTILLA_POR_DEFECTO = "react-express-postgres";

// Documentación de la plantilla para icase-tool, no forma parte del proyecto generado.
const SOLO_DE_LA_PLANTILLA = new Set(["README.md"]);

const PLANTILLA_VALIDA = /^[a-z0-9-]+$/;

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

async function leerPlantilla(nombre) {
  if (!PLANTILLA_VALIDA.test(nombre)) throw new Error(`Plantilla no válida: ${nombre}`);
  const raiz = path.join(process.cwd(), "plantillas", nombre);
  const entradas = await readdir(raiz, { recursive: true, withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    const completa = path.join(entrada.parentPath, entrada.name);
    const ruta = path.relative(raiz, completa).split(path.sep).join("/");
    if (SOLO_DE_LA_PLANTILLA.has(ruta)) continue;
    archivos.push({ ruta, contenido: await readFile(completa, "utf8") });
  }
  return archivos;
}

// Lista de archivos del proyecto, ordenada por ruta. Los de la plantilla mandan: si la IA generó
// un archivo con la misma ruta, se ignora, porque los archivos fijos no los escribe la IA.
export async function armarProyecto({ nombre, generados, plantilla = PLANTILLA_POR_DEFECTO }) {
  const variables = { nombre_bd: nombreBaseDatos(nombre) };
  const reemplazar = (texto) => texto.replace(/\{\{(\w+)\}\}/g, (m, clave) => variables[clave] ?? m);

  const fijos = (await leerPlantilla(plantilla)).map((a) => ({
    ruta: a.ruta,
    contenido: reemplazar(a.contenido),
    origen: "plantilla",
  }));
  const rutasFijas = new Set(fijos.map((a) => a.ruta));
  const propios = (generados || [])
    .filter((a) => !rutasFijas.has(a.ruta))
    .map((a) => ({ ruta: a.ruta, contenido: a.contenido ?? "", origen: "generado", estado: a.estado, paso: a.paso }));

  return [...fijos, ...propios].sort((a, b) => a.ruta.localeCompare(b.ruta));
}
