// Archivos de Caddy de los proyectos (<id>.caddy en CADDY_PROYECTOS). El runner escribe uno al levantar un
// proyecto y Caddy los importa todos. Si dos archivos declaran el mismo sitio (host:puerto), Caddy no arranca
// ("ambiguous site definition") y el servidor deja de publicar todos los proyectos. Un proyecto detenido no
// libera su puerto en el .env, así que otro proyecto puede recibir el mismo número y chocar con su archivo.
// Sin dependencias del servidor: lo usa runner/index.mjs y las pruebas.

// Direcciones de sitio de un archivo de Caddy: las líneas "<host>:<puerto> {" que no son comentarios.
export function direccionesDeSitios(texto) {
  return [...String(texto || "").matchAll(/^[ \t]*([^\s#{}]+:\d+)[ \t]*\{/gm)].map((m) => m[1].toLowerCase());
}

// Archivos de otros proyectos que declaran alguna de las direcciones nuevas. archivos: [{ nombre, contenido }].
// Esos archivos son de proyectos detenidos: el que está encendido tiene sus puertos ocupados en Docker y el
// runner nunca le asigna esos mismos números a otro.
export function archivosEnConflicto(archivos, direccionesNuevas) {
  const nuevas = new Set(direccionesNuevas.map((d) => d.toLowerCase()));
  return archivos.filter((a) => direccionesDeSitios(a.contenido).some((d) => nuevas.has(d))).map((a) => a.nombre);
}
