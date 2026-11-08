// Compartido con el navegador y el runner. Los identificadores no los elige la IA.
export const normalizarRol = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const texto = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function accionesDelPrototipo(pantallas = []) {
  return pantallas.flatMap((p, pantalla) => {
    const html = String(p.html || "").replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    const controles = [...html.matchAll(/<(button|a|form)\b([^>]*)>|<input\b([^>]*\btype\s*=\s*["']?(?:submit|button)["']?[^>]*)>/gi)];
    // Una pantalla sin controles también tiene una operación de consulta o una justificación local.
    return (controles.length ? controles : [null]).map((m, i) => {
      const attrs = m ? m[2] || m[3] || "" : "";
      const etiqueta = attrs.match(/(?:aria-label|title|value)\s*=\s*["']([^"']+)["']/i)?.[1];
      const contenido = m?.[1] ? html.slice(m.index + m[0].length).split(new RegExp(`</${m[1]}\\s*>`, "i"))[0] : "";
      return { id: `p${pantalla + 1}-a${i + 1}`, pantalla: p.nombre, plataforma: p.plataforma || "Web", tipo: m?.[1] || (m ? "input" : "consulta"), nombre: etiqueta || texto(contenido).slice(0, 180) || "Consultar pantalla", rfs: p.rfs || [] };
    });
  });
}

// Controles iguales (mismo tipo y nombre) de una misma pantalla, como los "Agregar" de cada fila de un
// formulario: la IA asigna el grupo una vez y expandirAsignaciones copia esa asignación a cada control.
// El id del grupo es el del primer control, así que una asignación por control sigue siendo válida.
const claveNombre = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function agruparAcciones(acciones = []) {
  const grupos = new Map();
  for (const a of acciones) {
    const clave = `${a.pantalla}|${a.tipo}|${claveNombre(a.nombre)}`;
    if (!grupos.has(clave)) grupos.set(clave, { ...a, miembros: [] });
    grupos.get(clave).miembros.push(a.id);
  }
  return [...grupos.values()];
}

export function expandirAsignaciones(asignaciones, grupos) {
  const porId = new Map(grupos.map((g) => [g.id, g]));
  const resultado = new Map();
  // Primero las asignaciones de un control suelto, para que una explícita no la pise la de su grupo.
  const lista = Array.isArray(asignaciones) ? asignaciones : [];
  for (const a of lista) if (a && !porId.has(a.id) && !resultado.has(a.id)) resultado.set(a.id, a);
  for (const a of lista) {
    if (!a || !porId.has(a.id)) continue;
    for (const id of porId.get(a.id).miembros) if (!resultado.has(id)) resultado.set(id, { ...a, id });
  }
  return [...resultado.values()];
}

// Lista compacta para la IA: cada pantalla con sus controles distintos y cuántas veces aparece cada uno.
export function pantallasParaContrato(grupos) {
  const pantallas = new Map();
  for (const g of grupos) {
    if (!pantallas.has(g.pantalla)) pantallas.set(g.pantalla, { pantalla: g.pantalla, plataforma: g.plataforma, rfs: g.rfs, controles: [] });
    pantallas.get(g.pantalla).controles.push({ id: g.id, tipo: g.tipo, nombre: g.nombre, ...(g.miembros.length > 1 ? { veces: g.miembros.length } : {}) });
  }
  return [...pantallas.values()];
}

export function contratoAprobable(contrato) {
  return !!contrato?.acciones?.length && !contrato.errores?.length && contrato.cobertura?.acciones?.[0] === contrato.cobertura?.acciones?.[1];
}
