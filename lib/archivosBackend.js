// Archivos del backend en la estructura aprobada, en orden. Lo comparten el servidor (lib/backend.js)
// y el navegador (la página del proyecto). Con Supabase, cada Edge Function (main es el enrutador
// fijo de la pieza); con Express, los archivos de su pieza.
export const FUNCION = /^supabase\/functions\/([^/]+)\/[^/]+\.(ts|js)$/;

export function archivosDeBackend(estructura) {
  return (estructura?.archivos || [])
    .filter((a) => (a.pieza === "supabase" && FUNCION.test(a.ruta) && a.ruta.match(FUNCION)[1] !== "main") || a.pieza === "express")
    .sort((a, b) => a.ruta.localeCompare(b.ruta));
}
