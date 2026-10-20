// Cadena de artefactos del proyecto, en orden de dependencia: cada paso se genera a partir
// de los anteriores, así que un cambio en uno deja desactualizados todos los que le siguen.
//   fase:       fase a la que pertenece (la fase "analisis" tiene además su propia aprobación
//               general, fases_aprobadas.analisis, que exige sus dos subfases aprobadas)
//   aprobacion: clave dentro de proyectos.fases_aprobadas
//   columna:    columna de proyectos donde se guarda el artefacto
//   diagrama:   el artefacto es código de diagrama que se renderiza como SVG (Mermaid en el
//               navegador o PlantUML con Kroki, según el código; ver lib/diagramas.js)
//   archivos:   el paso escribe código en archivos_proyecto (paso = clave), que se borra con él
export const PASOS = [
  {
    clave: "analisis",
    fase: "analisis",
    nombre: "Requerimientos",
    aprobacion: "requerimientos",
    columna: "analisis",
    ruta: "/api/generar-analisis",
  },
  {
    clave: "casos_uso",
    fase: "analisis",
    nombre: "Diagrama de casos de uso",
    aprobacion: "casos_uso",
    columna: "diagrama_casos_uso",
    ruta: "/api/generar-casos-uso",
    diagrama: true,
  },
  // Primero el dominio (clases) y luego cómo se guarda (entidad-relación, que se deriva de ellas).
  {
    clave: "clases",
    fase: "diseno",
    nombre: "Diagrama de clases",
    aprobacion: "diseno_clases",
    columna: "diagrama_clases",
    ruta: "/api/generar-diagrama-clases",
    diagrama: true,
  },
  {
    clave: "er",
    fase: "diseno",
    nombre: "Diagrama entidad-relación",
    aprobacion: "diseno_er",
    columna: "diagrama_er",
    ruta: "/api/generar-diagrama-er",
    diagrama: true,
  },
  {
    clave: "prototipo",
    fase: "diseno",
    nombre: "Prototipo de pantallas",
    aprobacion: "diseno_prototipo",
    columna: "mockups",
    ruta: "/api/generar-mockups",
  },
  {
    clave: "arbol",
    fase: "diseno",
    nombre: "Árbol de navegación",
    aprobacion: "diseno_arbol",
    columna: "arbol_navegacion",
    ruta: "/api/generar-arbol-navegacion",
    diagrama: true,
  },
  {
    clave: "arquitectura",
    fase: "diseno",
    nombre: "Diagrama de arquitectura",
    aprobacion: "diseno_arquitectura",
    columna: "diagrama_arquitectura",
    ruta: "/api/generar-arquitectura",
    diagrama: true,
  },
  {
    clave: "sistema",
    fase: "diseno",
    nombre: "Diagrama de sistemas",
    aprobacion: "diseno_sistema",
    columna: "diagrama_sistema",
    ruta: "/api/generar-diagrama-sistema",
    diagrama: true,
  },
  // Implementación: con qué piezas del catálogo (plantillas/) se construye el diseño aprobado.
  {
    clave: "impl_stack",
    fase: "implementacion",
    nombre: "Stack técnico",
    aprobacion: "impl_stack",
    columna: "stack_implementacion",
    ruta: "/api/generar-stack",
  },
  // Lista de archivos de cada pieza, con su propósito y lo que cubre del diseño, antes del código.
  {
    clave: "impl_estructura",
    fase: "implementacion",
    nombre: "Estructura de carpetas",
    aprobacion: "impl_estructura",
    columna: "estructura_implementacion",
    ruta: "/api/generar-estructura",
  },
  // Migraciones y datos de prueba de la estructura, probados en contenedores. El código de cada
  // archivo va en archivos_proyecto (archivos: el paso los borra al eliminarse); la columna
  // guarda la lista y el resultado de la prueba.
  {
    clave: "impl_bd",
    fase: "implementacion",
    nombre: "Base de datos",
    aprobacion: "impl_bd",
    columna: "bd_implementacion",
    ruta: "/api/generar-bd",
    archivos: true,
  },
];

export const PASO = Object.fromEntries(PASOS.map((p) => [p.clave, p]));

// Pasos de la fase de Implementación (ver docs/plan-implementacion.md). Los que ya tienen
// generador están también en PASOS; los demás solo se listan como pendientes: cada uno pasa a
// PASOS cuando tenga su generador, porque antes la cascada intentaría generarlos.
export const PASOS_IMPLEMENTACION = [
  { clave: "impl_stack", nombre: "Stack técnico" },
  { clave: "impl_estructura", nombre: "Estructura de carpetas" },
  { clave: "impl_bd", nombre: "Base de datos" },
  { clave: "impl_contrato", nombre: "Contrato de API" },
  { clave: "impl_backend", nombre: "Backend" },
  { clave: "impl_frontend", nombre: "Frontend" },
];

export function pasosDespuesDe(clave) {
  const i = PASOS.findIndex((p) => p.clave === clave);
  return PASOS.slice(i + 1);
}

export function listarNombres(pasos) {
  return pasos.map((p) => p.nombre).join(", ");
}
