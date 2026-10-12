// El modelo responde con el documento HTML; se quita cualquier texto o markdown alrededor.
export function extraerHtml(texto) {
  const inicio = texto.search(/<!doctype html|<html/i);
  const fin = texto.toLowerCase().lastIndexOf("</html>");
  if (inicio === -1 || fin === -1) return null;
  return texto.slice(inicio, fin + "</html>".length);
}

const SIN_TEXTO = /<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi;
const ICONO = /<(span|i)\b[^>]*class="[^"]*material-(?:symbols|icons)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi;
const MENU = /<(nav|aside)\b[\s\S]*?<\/\1>/gi;
const ENTIDADES = { amp: "&", nbsp: " ", quot: '"', lt: "<", gt: ">" };

function textoPlano(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(\w+);/g, (todo, nombre) => ENTIDADES[nombre] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Texto de un enlace o botón. Los que solo tienen un icono (campana, engranaje) se describen
// con su title/aria-label o, si no hay, con el nombre del icono.
function etiqueta(elemento) {
  const texto = textoPlano(elemento.replace(ICONO, " "));
  if (texto) return texto;
  const atributo = elemento.match(/\b(?:aria-label|title)="([^"]+)"/i);
  if (atributo) return atributo[1].trim();
  const icono = textoPlano(elemento);
  return icono ? `icono ${icono}` : "";
}

function etiquetas(html, selector, { max, largo }) {
  const elementos = html.match(new RegExp(`<(${selector})\\b[\\s\\S]*?<\\/\\1>`, "gi")) || [];
  const textos = elementos.map(etiqueta).filter((t) => t.length > 1 && t.length <= largo);
  return [...new Set(textos)].slice(0, max);
}

// Navegación real de una pantalla del prototipo: las opciones de sus menús (<nav>, <aside>) y
// los botones y enlaces del resto de la página. Con esto el árbol de navegación se arma con los
// menús que el prototipo muestra, en vez de adivinarlos por el nombre de las pantallas.
export function resumirNavegacion(html) {
  const pagina = String(html ?? "").replace(SIN_TEXTO, " ");
  const menus = (pagina.match(MENU) || [])
    .map((bloque) => etiquetas(bloque, "a|button|li", { max: 14, largo: 40 }))
    .filter((opciones) => opciones.length > 1)
    .slice(0, 4);
  const acciones = etiquetas(pagina.replace(MENU, " "), "a|button", { max: 14, largo: 45 });
  return { menus, acciones };
}
