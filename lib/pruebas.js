// Fase de Pruebas: casos de prueba, trazabilidad con los requerimientos y hallazgos. Funciones puras,
// sin IA ni red: las usan la página del proyecto, el informe y las pruebas automáticas.
//
// Forma del paso "Plan de pruebas" (proyectos.pruebas_plan):
//   casos:     [{ id, titulo, rfs, actor, tipo, precondiciones, pasos, esperado, resultado, observacion }]
//              resultado: "pendiente" | "aprobado" | "fallido" (lo marca la persona que ejecuta el caso)
//   hallazgos: [{ id, caso, titulo, gravedad, estado, descripcion }]
//              gravedad: "alta" | "media" | "baja"; estado: "abierto" | "corregido"

export const TIPOS_CASO = { funcional: "Funcional", permisos: "Permisos", validacion: "Validación" };
export const RESULTADOS = { pendiente: "Sin ejecutar", aprobado: "Aprobó", fallido: "Falló" };
export const GRAVEDADES = { alta: "Alta", media: "Media", baja: "Baja" };

const normalizarCodigo = (c) => String(c ?? "").replace(/[-\s]/g, "").toUpperCase();
const normalizarTexto = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim();

const comoLista = (v) => (Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v.trim()] : []).map((x) => String(x).trim()).filter(Boolean);

// Deja cada caso con todos sus campos y un identificador CP-01, CP-02... en orden.
export function normalizarCasos(casos = []) {
  return casos
    .filter((c) => c && String(c.titulo || "").trim())
    .map((c, i) => ({
      id: `CP-${String(i + 1).padStart(2, "0")}`,
      titulo: String(c.titulo).trim(),
      rfs: [...new Set(comoLista(c.rfs).map(normalizarCodigo))],
      actor: String(c.actor || "").trim(),
      tipo: TIPOS_CASO[c.tipo] ? c.tipo : "funcional",
      precondiciones: String(c.precondiciones || "").trim(),
      pasos: comoLista(c.pasos),
      esperado: String(c.esperado || "").trim(),
      resultado: RESULTADOS[c.resultado] ? c.resultado : "pendiente",
      observacion: String(c.observacion || "").trim(),
    }));
}

// Al regenerar los casos se conserva lo ya ejecutado: un caso nuevo con el mismo título hereda el resultado y
// la observación del anterior, y los hallazgos siguen apuntando a su caso (con su identificador nuevo).
export function conservarResultados(previo, casosNuevos) {
  if (!previo?.casos?.length) return { casos: casosNuevos, hallazgos: [] };
  const porTitulo = new Map(previo.casos.map((c) => [normalizarTexto(c.titulo), c]));
  const nuevoId = new Map();
  const casos = casosNuevos.map((c) => {
    const antes = porTitulo.get(normalizarTexto(c.titulo));
    if (!antes) return c;
    nuevoId.set(antes.id, c.id);
    return { ...c, resultado: antes.resultado || "pendiente", observacion: antes.observacion || "" };
  });
  const hallazgos = (previo.hallazgos || []).filter((h) => !h.caso || nuevoId.has(h.caso)).map((h) => ({ ...h, caso: h.caso ? nuevoId.get(h.caso) : "" }));
  return { casos, hallazgos };
}

// Trazabilidad: por cada requerimiento funcional, los casos que lo prueban y cómo van.
export function trazabilidad(analisis, casos = []) {
  const filas = (analisis?.requerimientos_funcionales || []).map((r) => {
    const codigo = normalizarCodigo(r.codigo);
    const delRf = casos.filter((c) => c.rfs?.includes(codigo));
    return {
      codigo: r.codigo,
      nombre: r.nombre || "",
      casos: delRf.map((c) => c.id),
      aprobados: delRf.filter((c) => c.resultado === "aprobado").length,
      fallidos: delRf.filter((c) => c.resultado === "fallido").length,
      pendientes: delRf.filter((c) => c.resultado === "pendiente").length,
    };
  });
  const codigos = new Set(filas.map((f) => normalizarCodigo(f.codigo)));
  return {
    filas,
    sinCubrir: filas.filter((f) => !f.casos.length).map((f) => f.codigo),
    // Casos que citan un requerimiento que ya no existe en el análisis.
    huerfanos: casos.filter((c) => c.rfs?.some((rf) => !codigos.has(rf))).map((c) => c.id),
  };
}

export function resumenPruebas(plan) {
  const casos = plan?.casos || [];
  const hallazgos = plan?.hallazgos || [];
  return {
    total: casos.length,
    aprobados: casos.filter((c) => c.resultado === "aprobado").length,
    fallidos: casos.filter((c) => c.resultado === "fallido").length,
    pendientes: casos.filter((c) => c.resultado === "pendiente").length,
    hallazgos: hallazgos.length,
    abiertos: hallazgos.filter((h) => h.estado !== "corregido").length,
    abiertosGraves: hallazgos.filter((h) => h.estado !== "corregido" && h.gravedad === "alta").length,
  };
}

// Qué impide aprobar el paso (errores) y qué conviene reconocer antes (avisos).
export function revisarParaAprobar(plan, analisis) {
  const errores = [];
  const avisos = [];
  if (!plan?.casos?.length) return { errores: ["No hay casos de prueba."], avisos };
  const t = trazabilidad(analisis, plan.casos);
  if (t.sinCubrir.length) errores.push(`Requerimientos sin ningún caso de prueba: ${t.sinCubrir.join(", ")}.`);
  const r = resumenPruebas(plan);
  if (r.abiertosGraves) errores.push(`Hay ${r.abiertosGraves} hallazgo${r.abiertosGraves === 1 ? "" : "s"} de gravedad alta sin corregir.`);
  if (r.fallidos) avisos.push(`${r.fallidos} caso${r.fallidos === 1 ? "" : "s"} fallido${r.fallidos === 1 ? "" : "s"}`);
  if (r.pendientes) avisos.push(`${r.pendientes} caso${r.pendientes === 1 ? "" : "s"} sin ejecutar`);
  if (r.abiertos - r.abiertosGraves > 0) avisos.push(`${r.abiertos - r.abiertosGraves} hallazgo${r.abiertos - r.abiertosGraves === 1 ? "" : "s"} abierto${r.abiertos - r.abiertosGraves === 1 ? "" : "s"} de gravedad media o baja`);
  return { errores, avisos };
}

// Siguiente identificador libre de un hallazgo (H-01, H-02...).
export function idHallazgo(hallazgos = []) {
  const usados = hallazgos.map((h) => Number(String(h.id).replace(/\D/g, "")) || 0);
  return `H-${String(Math.max(0, ...usados) + 1).padStart(2, "0")}`;
}

// Ficha que se guarda en proyectos.pruebas_plan.
export function fichaPruebas({ casos, hallazgos = [], modelo, previa }) {
  return {
    casos,
    hallazgos,
    modelo: modelo || previa?.modelo || null,
    actualizado: new Date().toISOString(),
  };
}
