// Modelo de calidad del producto ISO/IEC 25010:2011 (8 características y sus subcaracterísticas),
// usado para clasificar los requerimientos no funcionales. Lo comparten los prompts, la
// normalización de lo que devuelve la IA y la interfaz (colores y formulario).
export const CARACTERISTICAS_25010 = [
  {
    nombre: "Adecuación funcional",
    subcaracteristicas: ["Completitud funcional", "Corrección funcional", "Pertinencia funcional"],
  },
  {
    nombre: "Eficiencia de desempeño",
    subcaracteristicas: ["Comportamiento temporal", "Utilización de recursos", "Capacidad"],
  },
  {
    nombre: "Compatibilidad",
    subcaracteristicas: ["Coexistencia", "Interoperabilidad"],
  },
  {
    nombre: "Usabilidad",
    subcaracteristicas: [
      "Capacidad para reconocer su adecuación",
      "Capacidad de aprendizaje",
      "Capacidad para ser usado",
      "Protección contra errores de usuario",
      "Estética de la interfaz de usuario",
      "Accesibilidad",
    ],
  },
  {
    nombre: "Fiabilidad",
    subcaracteristicas: ["Madurez", "Disponibilidad", "Tolerancia a fallos", "Capacidad de recuperación"],
  },
  {
    nombre: "Seguridad",
    subcaracteristicas: ["Confidencialidad", "Integridad", "No repudio", "Responsabilidad", "Autenticidad"],
  },
  {
    nombre: "Mantenibilidad",
    subcaracteristicas: [
      "Modularidad",
      "Reusabilidad",
      "Analizabilidad",
      "Capacidad para ser modificado",
      "Capacidad para ser probado",
    ],
  },
  {
    nombre: "Portabilidad",
    subcaracteristicas: ["Adaptabilidad", "Capacidad para ser instalado", "Capacidad para ser reemplazado"],
  },
];

const simplificar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Nombres habituales que no son los de la norma (los que usaba la app antes, o los que suele
// inventar la IA) → [característica, subcaracterística].
const SINONIMOS = {
  funcionalidad: ["Adecuación funcional"],
  rendimiento: ["Eficiencia de desempeño"],
  desempeno: ["Eficiencia de desempeño"],
  eficiencia: ["Eficiencia de desempeño"],
  performance: ["Eficiencia de desempeño"],
  escalabilidad: ["Eficiencia de desempeño", "Capacidad"],
  "tiempo de respuesta": ["Eficiencia de desempeño", "Comportamiento temporal"],
  confiabilidad: ["Fiabilidad"],
  recuperacion: ["Fiabilidad", "Capacidad de recuperación"],
  respaldo: ["Fiabilidad", "Capacidad de recuperación"],
  respaldos: ["Fiabilidad", "Capacidad de recuperación"],
  privacidad: ["Seguridad", "Confidencialidad"],
  autenticacion: ["Seguridad", "Autenticidad"],
  auditoria: ["Seguridad", "Responsabilidad"],
  trazabilidad: ["Seguridad", "Responsabilidad"],
  instalacion: ["Portabilidad", "Capacidad para ser instalado"],
};

// Lleva la categoría (y subcategoría) de un RNF a los nombres exactos de la norma. Acepta la
// característica, una subcaracterística suelta ("Disponibilidad" → Fiabilidad · Disponibilidad)
// o un sinónimo conocido. Si no la reconoce, la deja como está.
export function normalizarCategoria(categoria, subcategoria) {
  const cat = simplificar(categoria);
  const sub = simplificar(subcategoria);

  let caracteristica = CARACTERISTICAS_25010.find((c) => simplificar(c.nombre) === cat);
  let subcaracteristica;
  if (!caracteristica) {
    caracteristica = CARACTERISTICAS_25010.find((c) =>
      c.subcaracteristicas.some((s) => simplificar(s) === cat)
    );
    subcaracteristica = caracteristica?.subcaracteristicas.find((s) => simplificar(s) === cat);
  }
  if (!caracteristica && SINONIMOS[cat]) {
    const [nombre, s] = SINONIMOS[cat];
    caracteristica = CARACTERISTICAS_25010.find((c) => c.nombre === nombre);
    subcaracteristica = s;
  }
  if (!caracteristica) return { categoria, subcategoria };

  // La subcaracterística indicada solo vale si pertenece a esa característica.
  const indicada = caracteristica.subcaracteristicas.find((s) => simplificar(s) === sub);
  return {
    categoria: caracteristica.nombre,
    subcategoria: indicada || subcaracteristica || undefined,
  };
}

// Aplica normalizarCategoria a una lista de RNF.
export function normalizarRNF(lista = []) {
  return lista.map((r) => {
    const { categoria, subcategoria } = normalizarCategoria(r.categoria, r.subcategoria);
    const normalizado = { ...r, categoria };
    if (subcategoria) normalizado.subcategoria = subcategoria;
    else delete normalizado.subcategoria;
    return normalizado;
  });
}

// "Fiabilidad · Disponibilidad", o solo la característica si no tiene subcaracterística.
export function textoCategoria(r) {
  return [r.categoria, r.subcategoria].filter(Boolean).join(" · ");
}

// Instrucción para los prompts que generan RNF.
export const INSTRUCCION_25010 = `Clasifica cada requerimiento no funcional según el modelo de calidad del producto ISO/IEC 25010:2011. En "categoria" usa EXACTAMENTE el nombre de una de sus 8 características y en "subcategoria" EXACTAMENTE el de una de sus subcaracterísticas:
${CARACTERISTICAS_25010.map((c) => `- ${c.nombre}: ${c.subcaracteristicas.join(", ")}`).join("\n")}
"Adecuación funcional" normalmente la cubren los requerimientos funcionales: úsala en un no funcional solo para restricciones de exactitud o completitud (ej. precisión de cálculos).`;
