// Archivos del paso "Base de datos" dentro de la estructura de carpetas aprobada y lectura de la
// salida de su prueba en contenedores. Se usa en el navegador y en el servidor.

// Contraseña de los usuarios de prueba (uno por actor) que crean los datos de prueba.
export const CONTRASENA_PRUEBA = "Prueba123!";

// Nombre de la tabla de una entidad del ER: PARTE_CRONOLOGIA -> parte_cronologia.
export const tablaDeEntidad = (entidad) => String(entidad || "").trim().toLowerCase();

// Migraciones de la pieza que tiene la base (en orden de nombre, que es el orden en que se
// aplican) y después sus datos de prueba.
export function archivosDeBaseDatos(estructura) {
  const archivos = (estructura?.archivos || []).filter((a) => /\.sql$/i.test(a.ruta));
  const pieza = archivos.find((a) => a.tipo === "migracion")?.pieza;
  if (!pieza) return [];
  const porRuta = (a, b) => a.ruta.localeCompare(b.ruta);
  const dePieza = archivos.filter((a) => a.pieza === pieza);
  return [
    ...dePieza.filter((a) => a.tipo === "migracion").sort(porRuta),
    ...dePieza.filter((a) => a.tipo === "datos").sort(porRuta),
  ];
}

// Archivo que falló al aplicarse: los archivos se aplican en orden y se detienen en el primer
// error, así que es el último que menciona la salida.
export function archivoQueFallo(salida, rutas) {
  const texto = String(salida || "");
  let elegido = null;
  let posicion = -1;
  for (const ruta of rutas) {
    const i = texto.lastIndexOf(ruta.split("/").pop());
    if (i > posicion) {
      posicion = i;
      elegido = ruta;
    }
  }
  return elegido;
}

// El error de PostgreSQL en la salida (la línea ERROR y las que la explican: LINE, DETAIL,
// HINT, CONTEXT), para mostrarlo y pasárselo a la IA.
export function errorDeSalida(salida) {
  const lineas = String(salida || "").split(/\r?\n/);
  const inicio = lineas.findIndex((l) => /\bERROR:\s/.test(l));
  return (inicio === -1 ? lineas.slice(-15) : lineas.slice(inicio, inicio + 8)).join("\n").trim();
}
