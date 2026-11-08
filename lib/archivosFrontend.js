// Archivos del frontend en la estructura aprobada, por plataforma y en capas: cada capa se genera
// después de las anteriores, porque importa sus archivos (la configuración y los servicios antes que
// los componentes, y los componentes antes que las páginas). Lo comparten el servidor y el navegador.
export const PIEZAS_FRONTEND = { web: ["nextjs", "react"], movil: ["flutter"] };

const CAPA = { configuracion: 0, estilo: 1, modelo: 2, otro: 2, servicio: 3, middleware: 3, componente: 4, navegacion: 5, pagina: 6 };
export const capaDe = (archivo) => CAPA[archivo.tipo] ?? 2;

export function archivosDeFrontend(estructura, plataforma) {
  const piezas = PIEZAS_FRONTEND[plataforma] || [];
  return (estructura?.archivos || [])
    .filter((a) => piezas.includes(a.pieza))
    .sort((a, b) => capaDe(a) - capaDe(b) || a.ruta.localeCompare(b.ruta));
}

// Plataformas que tiene el proyecto, según las piezas de su estructura.
export const plataformasDeFrontend = (estructura) =>
  Object.keys(PIEZAS_FRONTEND).filter((p) => archivosDeFrontend(estructura, p).length);

// Archivo de la plataforma que aparece en la salida de una compilación fallida (el primero que se
// menciona), para corregirlo con el error. Next.js cita rutas como ./app/(panel)/page.js; Flutter,
// lib/pantallas/login.dart:12:5.
export function archivoQueFalloCompilacion(salida, archivos) {
  const completo = String(salida || "");
  const inicio = completo.search(/Failed to compile|Type error|Module not found|SyntaxError|\bError:|: Error:|error:/);
  // Desde el comienzo de la línea del error: Flutter pone la ruta antes de "Error:".
  const texto = inicio === -1 ? completo : completo.slice(completo.lastIndexOf("\n", inicio) + 1);
  let mejor = null;
  for (const a of archivos) {
    const relativa = a.ruta.split("/").slice(1).join("/");
    const posicion = texto.indexOf(relativa);
    if (posicion !== -1 && (!mejor || posicion < mejor.posicion)) mejor = { ruta: a.ruta, posicion };
  }
  return mejor?.ruta || null;
}
