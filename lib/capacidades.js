// Sin dependencias del servidor: la usan lib/stack.js y el formulario de librerías del navegador.

// Capacidades que suelen necesitar una librería y no vienen con la tecnología. Si un requerimiento
// las pide, cada pieza (de las capas indicadas) que implementa ese requerimiento según el diagrama
// de sistemas debe tener una librería con esa capacidad. Las capas que ya la traen de serie no se
// listan (ej. el navegador y Deno ya calculan hashes).
export const CAPACIDADES = [
  { clave: "firma", que: "dibujar una firma en pantalla", capas: ["web", "movil"], patron: /firma[^.;]{0,80}(trazad|pantalla|dibuj|manuscrit|t[aá]ctil)|(trazad|dibuj)[^.;]{0,40}firma/i },
  { clave: "pdf", que: "generar o exportar PDF", capas: ["web", "movil"], patron: /\bpdf\b/i },
  { clave: "notificaciones", que: "recibir notificaciones push", capas: ["movil"], patron: /notificaci[oó]n(es)?\s+push|push\s+notification/i },
  { clave: "almacenamiento_local", que: "guardar datos en el dispositivo sin conexión", capas: ["movil"], patron: /sin conexi[oó]n|offline|desconexi[oó]n/i },
  { clave: "conexion", que: "detectar cuándo vuelve la conexión para sincronizar", capas: ["movil"], patron: /sincroniz[^.;]{0,80}(conexi[oó]n|reconect|restablec)|(conexi[oó]n|reconect|restablec)[^.;]{0,80}sincroniz/i },
  { clave: "mapa", que: "mostrar un mapa", capas: ["web", "movil"], patron: /\bmapas?\b|geolocaliz/i },
  { clave: "graficos", que: "dibujar gráficos o métricas", capas: ["web", "movil"], patron: /(?<![a-záéíóúñ])gr[aá]fic[oa]s?\b|tablero de m[eé]tricas|dashboard/i },
  { clave: "hash", que: "calcular un resumen criptográfico", capas: ["movil"], patron: /sha-?\d+|\bhash\b|resumen criptogr/i },
  { clave: "ubicacion", que: "obtener la ubicación GPS del dispositivo", capas: ["movil"], patron: /geolocaliz|coordenadas|\bgps\b|ubicaci[oó]n (actual|del dispositivo)/i },
  { clave: "adjuntos", que: "adjuntar imágenes o fotos (cámara o galería)", capas: ["movil"], patron: /adjunt[^.;]{0,60}(imagen|foto|archivo)|(imagen|foto)[^.;]{0,40}adjunt|\bfotos?\b|fotograf|c[aá]mara/i },
];
