// Base visual del prototipo aprobado, para que la aplicación se vea igual: el CSS compartido de las
// pantallas (lo escribe el código, no la IA), el menú lateral de cada rol y las clases que existen.
// Sin dependencias de Node: lo usan el navegador (que arma lo que se envía) y el servidor.

const MARCA_PROPIOS = "/* Propios de esta pantalla */";

// CSS compartido de una pantalla del prototipo: su <style> sin la parte propia de esa pantalla.
export function extraerEstiloBase(html) {
  const css = String(html || "").match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
  return css.split(MARCA_PROPIOS)[0].trim();
}

// Menú lateral (<aside class="barra">) de las pantallas, sin repetir el mismo menú.
export function menusDelPrototipo(pantallas = [], maximo = 3) {
  const vistos = new Set();
  const menus = [];
  for (const p of pantallas) {
    const aside = String(p?.html || "").match(/<aside\s+class="barra"[\s\S]*?<\/aside>/i)?.[0];
    if (!aside) continue;
    const entradas = [...aside.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1].trim()).join("|");
    if (vistos.has(entradas)) continue;
    vistos.add(entradas);
    menus.push(aside.replace(/\s+/g, " ").trim());
    if (menus.length >= maximo) break;
  }
  return menus;
}

// { css, menus } del prototipo, o null si todavía no hay pantallas con estilo.
export function baseVisualDelPrototipo(pantallas = []) {
  const css = pantallas.map((p) => extraerEstiloBase(p?.html)).find((c) => c.length > 200);
  if (!css) return null;
  return { css, menus: menusDelPrototipo(pantallas) };
}

export const clasesDeCss = (css) => new Set([...String(css || "").matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
export const variablesDeCss = (css) => [...new Set([...String(css || "").matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))];

// Clases que escribe un archivo en className="..." o className={...} (solo la parte fija: lo que se
// calcula con ${...} no se puede comprobar).
export function clasesUsadas(codigo) {
  const usadas = new Set();
  const texto = String(codigo || "");
  const agregar = (cadena) => {
    const fija = String(cadena).replace(/\$\{[^}]*\}/g, " ");
    for (const t of fija.split(/\s+/)) if (/^[A-Za-z_][\w-]*$/.test(t)) usadas.add(t);
  };
  // Cadenas de una expresión; en una plantilla, su parte fija y también las cadenas de sus ${...}.
  const desdeExpresion = (expresion) => {
    for (const s of String(expresion).matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
      if (s[3] !== undefined) {
        // prefijo-${valor}: las clases reales son prefijo + cada cadena del ${...} (aviso-${t ? "ok" : "error"} → aviso-ok, aviso-error).
        // Si no se puede resolver (${tipo}), no se comprueba: ni el prefijo suelto ni nada.
        const resto = s[3].replace(/([A-Za-z_][\w-]*)\$\{([^}]*)\}/g, (_, prefijo, interior) => {
          for (const v of interior.matchAll(/"([^"]*)"|'([^']*)'/g)) if (/^[\w-]+$/.test(v[1] ?? v[2])) usadas.add(prefijo + (v[1] ?? v[2]));
          return " ";
        });
        agregar(resto);
        for (const interior of resto.matchAll(/\$\{([^}]*)\}/g)) desdeExpresion(interior[1]);
      } else agregar(s[1] ?? s[2] ?? "");
    }
  };
  for (const m of texto.matchAll(/className\s*=\s*/g)) {
    let i = m.index + m[0].length;
    const abre = texto[i];
    if (abre === '"' || abre === "'") {
      const fin = texto.indexOf(abre, i + 1);
      if (fin !== -1) agregar(texto.slice(i + 1, fin));
    } else if (abre === "{") {
      let profundidad = 0;
      let j = i;
      for (; j < texto.length; j++) {
        if (texto[j] === "{") profundidad++;
        else if (texto[j] === "}" && --profundidad === 0) break;
      }
      desdeExpresion(texto.slice(i + 1, j));
    }
  }
  return usadas;
}

// CSS que el propio archivo define en un <style> (con o sin jsx).
export function estiloPropio(codigo) {
  const bloques = [];
  for (const m of String(codigo || "").matchAll(/<style[^>]*>\s*(?:\{\s*`([\s\S]*?)`\s*\}|([\s\S]*?))\s*<\/style>/g)) bloques.push(m[1] ?? m[2] ?? "");
  return bloques.join("\n");
}

// Clases que el archivo usa y que no existen ni en el CSS global ni en su <style>.
export function clasesInexistentes(codigo, cssGlobal) {
  const definidas = new Set([...clasesDeCss(cssGlobal), ...clasesDeCss(estiloPropio(codigo))]);
  return [...clasesUsadas(codigo)].filter((c) => !definidas.has(c));
}
