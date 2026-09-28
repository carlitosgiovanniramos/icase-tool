// Cadena de artefactos del proyecto, en orden de dependencia: cada paso se genera a partir
// de los anteriores, así que un cambio en uno deja desactualizados todos los que le siguen.
//   fase:       fase a la que pertenece (la fase "analisis" tiene además su propia aprobación
//               general, fases_aprobadas.analisis, que exige sus dos subfases aprobadas)
//   aprobacion: clave dentro de proyectos.fases_aprobadas
//   columna:    columna de proyectos donde se guarda el artefacto
//   diagrama:   el artefacto es código Mermaid que se renderiza como SVG
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
    nombre: "Diagrama del sistema",
    aprobacion: "diseno_sistema",
    columna: "diagrama_sistema",
    ruta: "/api/generar-diagrama-sistema",
    diagrama: true,
  },
];

export const PASO = Object.fromEntries(PASOS.map((p) => [p.clave, p]));

export function pasosDespuesDe(clave) {
  const i = PASOS.findIndex((p) => p.clave === clave);
  return PASOS.slice(i + 1);
}

export function listarNombres(pasos) {
  return pasos.map((p) => p.nombre).join(", ");
}
