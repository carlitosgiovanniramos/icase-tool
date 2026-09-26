// Formatea el análisis aprobado para los prompts de los pasos siguientes, con todo lo que se
// sabe de cada requerimiento (actores asignados, dependencias, prioridad), para que la IA no
// tenga que adivinar relaciones que ya están definidas.

function comoLista(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  if (typeof valor === "string" && valor.trim()) return [valor.trim()];
  return [];
}

export function formatearActores(analisis) {
  return (analisis.actores || [])
    .map((a) => `- ${a.nombre}${a.descripcion ? `: ${a.descripcion}` : ""}`)
    .join("\n");
}

export function formatearRequerimientos(requerimientos = [], { conCategoria = false } = {}) {
  return requerimientos
    .map((r) => {
      const categoria = conCategoria && r.categoria ? ` (${r.categoria})` : "";
      const partes = [`${r.codigo}${categoria}${r.nombre ? ` - ${r.nombre}` : ""}: ${r.descripcion}`];
      const actores = comoLista(r.actores);
      const dependencias = comoLista(r.dependencias);
      if (actores.length) partes.push(`actores: ${actores.join(", ")}`);
      if (dependencias.length) partes.push(`depende de: ${dependencias.join(", ")}`);
      if (r.prioridad) partes.push(`prioridad ${r.prioridad}`);
      return partes.join(" | ");
    })
    .join("\n");
}

// Indicaciones opcionales que el usuario escribe para un paso concreto (ej. "agrupa por módulo").
export function formatearIndicaciones(indicaciones) {
  const texto = indicaciones?.trim();
  if (!texto) return "";
  return `
Indicaciones del usuario para este resultado. Respétalas por encima de las reglas generales de organización y presentación, pero sin contradecir los requerimientos:
${texto}
`;
}
