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

export function contratoAprobable(contrato) {
  return !!contrato?.acciones?.length && !contrato.errores?.length && contrato.cobertura?.acciones?.[0] === contrato.cobertura?.acciones?.[1];
}
