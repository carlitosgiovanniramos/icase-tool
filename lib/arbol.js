import { esPlantUML } from "./diagramas.js";

// Árbol de navegación en Mermaid: raíz → [plataforma] → sección (entrada del menú) → pantalla →
// pantallas que se abren desde ella. La IA decide la estructura y la devuelve como JSON; el
// código Mermaid lo escribe la aplicación (armarArbol), así la sintaxis siempre es válida, cada
// pantalla del prototipo aparece una sola vez y los RF son los del prototipo, no los que la IA
// recuerde.

// Tres colores por nivel: raíz y plataformas (azul oscuro), secciones (gris claro), pantallas (blanco).
const ESTILOS = `classDef raiz fill:#1e293b,stroke:#1e293b,color:#ffffff,stroke-width:2px;
    classDef plataforma fill:#475569,stroke:#1e293b,color:#ffffff,stroke-width:1px;
    classDef seccion fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef pantalla fill:#ffffff,stroke:#94a3b8,color:#334155,stroke-width:1px;`;

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim();

const comoLista = (valor) =>
  (Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split(",") : [])
    .map((v) => String(v).trim())
    .filter(Boolean);

function nombrePlataforma(plataforma) {
  if (/^m[oó]vil$/i.test(plataforma)) return "Aplicación Móvil";
  if (/^web$/i.test(plataforma)) return "Aplicación Web";
  return plataforma;
}

const mismaPlataforma = (a, b) => {
  const [x, y] = [normalizar(a), normalizar(b)];
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

// Menú principal de una plataforma: el que más pantallas comparten.
export function menuPrincipal(pantallas) {
  const veces = new Map();
  for (const p of pantallas) {
    for (const menu of p.navegacion?.menus || []) {
      const clave = menu.join(" · ");
      veces.set(clave, { menu, total: (veces.get(clave)?.total || 0) + 1 });
    }
  }
  const [mejor] = [...veces.values()].sort((a, b) => b.total - a.total);
  return mejor && mejor.total > 1 ? mejor.menu : null;
}

// Convierte la estructura que devolvió la IA en el árbol definitivo y su código Mermaid.
//   pantallas: las del prototipo ({ nombre, plataforma, rfs }); si no hay, se aceptan las de la IA.
//   codigosRF: códigos válidos, para descartar los inventados cuando no hay prototipo.
// Devuelve { codigo, advertencias, sinUbicar }: sinUbicar son las pantallas del prototipo que la
// IA omitió o puso mal, y que quedaron directamente bajo su plataforma.
export function armarArbol({ nombre, plataformas, pantallas, codigosRF, respuesta }) {
  const advertencias = [];
  const hayPrototipo = pantallas.length > 0;
  const porNombre = new Map(pantallas.map((p) => [normalizar(p.nombre), p]));
  const usadas = new Set();
  const descartadas = [];

  const ramasIA = Array.isArray(respuesta?.plataformas) ? respuesta.plataformas : [];
  const nombres = plataformas.length
    ? plataformas
    : ramasIA.map((r) => String(r?.plataforma || r?.nombre || "").trim()).filter(Boolean);
  const variasPlataformas = nombres.length > 1;

  // Devuelve una lista: un nodo descartado deja en su lugar a sus hijos.
  function convertir(nodo, plataforma) {
    if (!nodo || typeof nodo !== "object") return [];
    const titulo = String(nodo.nombre ?? "").trim();
    const hijos = (Array.isArray(nodo.hijos) ? nodo.hijos : []).flatMap((h) => convertir(h, plataforma));
    if (!titulo) return hijos;

    const pantalla = porNombre.get(normalizar(titulo));
    // Una entrada del menú puede llamarse igual que una pantalla (ej. "Inicio"): es sección si la
    // IA la marcó así y la pantalla de ese nombre va dentro o es de otra plataforma.
    const pantallaDentro = (nodo.hijos || []).some((h) => normalizar(h?.nombre) === normalizar(titulo));
    const pantallaAjena =
      variasPlataformas && pantalla?.plataforma && !mismaPlataforma(pantalla.plataforma, plataforma);
    let esSeccion = nodo.tipo === "seccion";
    if (hayPrototipo) {
      esSeccion = pantalla ? esSeccion && (pantallaDentro || pantallaAjena) : nodo.tipo !== "pantalla";
    }

    if (esSeccion) {
      if (!hijos.length) return [];
      // Sección con una única pantalla del mismo nombre: sobra el nivel.
      if (hijos.length === 1 && normalizar(hijos[0].nombre) === normalizar(titulo)) return hijos;
      return [{ tipo: "seccion", nombre: titulo, detalle: comoLista(nodo.roles), hijos }];
    }

    if (!hayPrototipo) {
      const rfs = comoLista(nodo.rfs).filter((c) => !codigosRF?.size || codigosRF.has(c.replace(/[-\s]/g, "").toUpperCase()));
      return [{ tipo: "pantalla", nombre: titulo, detalle: rfs, hijos }];
    }

    if (!pantalla) {
      descartadas.push(titulo);
      return hijos;
    }
    // Repetida o en la rama de otra plataforma: se descarta aquí; si no quedó en ningún otro
    // lugar, se agrega al final bajo su plataforma.
    const clave = normalizar(pantalla.nombre);
    const enSuPlataforma =
      !variasPlataformas || !pantalla.plataforma || mismaPlataforma(pantalla.plataforma, plataforma);
    if (usadas.has(clave) || !enSuPlataforma) return hijos;
    usadas.add(clave);
    return [{ tipo: "pantalla", nombre: pantalla.nombre, detalle: pantalla.rfs || [], hijos }];
  }

  const ramas = nombres.map((plataforma) => ({
    plataforma,
    nodos: ramasIA
      .filter((r) => !variasPlataformas || mismaPlataforma(r?.plataforma || r?.nombre, plataforma))
      .flatMap((r) => (Array.isArray(r?.nodos) ? r.nodos : []).flatMap((n) => convertir(n, plataforma))),
  }));
  if (!ramas.length) ramas.push({ plataforma: "", nodos: [] });

  const sinUbicar = pantallas.filter((p) => !usadas.has(normalizar(p.nombre)));
  for (const p of sinUbicar) {
    const rama = ramas.find((r) => mismaPlataforma(r.plataforma, p.plataforma)) || ramas[0];
    rama.nodos.push({ tipo: "pantalla", nombre: p.nombre, detalle: p.rfs || [], hijos: [] });
  }

  if (sinUbicar.length) {
    advertencias.push(
      `No se pudo ubicar en la navegación: ${sinUbicar.map((p) => p.nombre).join(", ")}. Quedaron al final de su plataforma; muévelas desde la pestaña Código o con "Ampliar con IA".`
    );
  }
  if (descartadas.length) {
    advertencias.push(`Se quitaron pantallas que no están en el prototipo: ${descartadas.join(", ")}.`);
  }
  if (!ramas.some((r) => r.nodos.length)) throw new Error("La IA no devolvió ninguna pantalla para el árbol.");

  // --- Código Mermaid ---
  const texto = (t) => String(t).replace(/"/g, "#quot;").replace(/\s+/g, " ").trim();
  const lineas = ["flowchart TD", `    RAIZ(["${texto(nombre)}"])`];
  const clases = { plataforma: [], seccion: [], pantalla: [] };

  function escribir(nodo, id, padre) {
    const detalle = nodo.detalle?.length ? `<br/>${texto(nodo.detalle.join(", "))}` : "";
    lineas.push(`    ${id}["${texto(nodo.nombre)}${detalle}"]`, `    ${padre} --> ${id}`);
    clases[nodo.tipo].push(id);
    nodo.hijos.forEach((hijo, i) => escribir(hijo, `${id}_${i + 1}`, id));
  }

  ramas.forEach((rama, i) => {
    if (!rama.nodos.length) return;
    lineas.push("");
    if (variasPlataformas) {
      const id = `P${i + 1}`;
      lineas.push(`    ${id}["${texto(nombrePlataforma(rama.plataforma))}"]`, `    RAIZ --> ${id}`);
      clases.plataforma.push(id);
      rama.nodos.forEach((nodo, j) => escribir(nodo, `${id}_${j + 1}`, id));
    } else {
      rama.nodos.forEach((nodo, j) => escribir(nodo, `N${j + 1}`, "RAIZ"));
    }
  });

  lineas.push("", `    ${ESTILOS}`, "    class RAIZ raiz;");
  for (const [clase, ids] of Object.entries(clases)) {
    if (ids.length) lineas.push(`    class ${ids.join(",")} ${clase};`);
  }

  return { codigo: lineas.join("\n"), advertencias, sinUbicar: sinUbicar.map((p) => p.nombre) };
}

// --- Vistas por plataforma ---
// Con varias plataformas el árbol completo queda demasiado ancho para leerlo: se puede ver la
// rama de una sola. Las dos funciones leen el código guardado, así también sirven para un árbol
// editado a mano mientras conserve "A --> B" y la clase "plataforma".

const DEFINICION = /^\s*(\w+)\s*[\[({]/;
const CONEXION = /^\s*(\w+)\s*-->\s*(\w+)\s*;?\s*$/;
const CLASE = /^(\s*class\s+)([\w,\s]+?)(\s+\w+\s*;?\s*)$/;

function leerArbol(codigo) {
  if (!codigo || esPlantUML(codigo)) return null;
  const lineas = String(codigo).split("\n");
  const hijos = new Map();
  const conPadre = new Set();
  const etiquetas = new Map();
  const detalles = new Map(); // segunda línea del nodo: roles de una sección o RF de una pantalla
  const plataformas = [];

  for (const linea of lineas) {
    const conexion = linea.match(CONEXION);
    if (conexion) {
      hijos.set(conexion[1], [...(hijos.get(conexion[1]) || []), conexion[2]]);
      conPadre.add(conexion[2]);
      continue;
    }
    const clase = linea.match(CLASE);
    if (clase) {
      if (clase[3].trim().replace(";", "").trim() === "plataforma") {
        plataformas.push(...clase[2].split(",").map((id) => id.trim()).filter(Boolean));
      }
      continue;
    }
    const definicion = linea.match(DEFINICION);
    if (definicion) {
      const etiqueta = linea.match(/"([^"]*)"/);
      const [nombre, ...resto] = (etiqueta?.[1] || definicion[1]).replace(/#quot;/g, '"').split(/<br\s*\/?>/i);
      etiquetas.set(definicion[1], nombre.trim());
      detalles.set(definicion[1], resto.join(", ").trim());
    }
  }

  const raices = [...hijos.keys()].filter((id) => !conPadre.has(id));
  if (raices.length !== 1) return null;
  return { lineas, hijos, etiquetas, detalles, raiz: raices[0], plataformas };
}

// El árbol como texto para los prompts de los pasos siguientes (un nodo por línea, con sangría),
// y los RF que cubren las pantallas de cada plataforma. Devuelve null si el código no se puede
// leer (ej. un árbol antiguo en PlantUML).
//   plataformas: [{ nombre, rfs }]; un árbol de una sola plataforma devuelve una con nombre "".
export function resumenDelArbol(codigo) {
  const arbol = leerArbol(codigo);
  if (!arbol) return null;

  const lineas = [];
  const rfsDe = (id, rfs = new Set(), vistos = new Set()) => {
    if (vistos.has(id)) return rfs;
    vistos.add(id);
    for (const rf of arbol.detalles.get(id)?.match(/\bRF-?\s?\d+\b/gi) || []) rfs.add(rf.replace(/[-\s]/g, "").toUpperCase());
    (arbol.hijos.get(id) || []).forEach((hijo) => rfsDe(hijo, rfs, vistos));
    return rfs;
  };
  const escribir = (id, nivel, vistos = new Set()) => {
    if (vistos.has(id)) return;
    vistos.add(id);
    const detalle = arbol.detalles.get(id);
    lineas.push(`${"  ".repeat(nivel)}- ${arbol.etiquetas.get(id) || id}${detalle ? ` (${detalle})` : ""}`);
    (arbol.hijos.get(id) || []).forEach((hijo) => escribir(hijo, nivel + 1, vistos));
  };
  escribir(arbol.raiz, 0);

  const ramas = (arbol.hijos.get(arbol.raiz) || []).filter((id) => arbol.plataformas.includes(id));
  const plataformas = ramas.length
    ? ramas.map((id) => ({ nombre: arbol.etiquetas.get(id) || id, rfs: [...rfsDe(id)].sort() }))
    : [{ nombre: "", rfs: [...rfsDe(arbol.raiz)].sort() }];

  return { texto: lineas.join("\n"), plataformas };
}

// Plataformas del árbol: [{ id, nombre }]. Vacío si el árbol es de una sola plataforma.
export function plataformasDelArbol(codigo) {
  const arbol = leerArbol(codigo);
  if (!arbol) return [];
  const ramas = (arbol.hijos.get(arbol.raiz) || []).filter((id) => arbol.plataformas.includes(id));
  return ramas.length > 1 ? ramas.map((id) => ({ id, nombre: arbol.etiquetas.get(id) || id })) : [];
}

// Código del árbol con una sola plataforma: la raíz, esa plataforma y todo lo que cuelga de ella.
export function ramaDelArbol(codigo, idPlataforma) {
  const arbol = leerArbol(codigo);
  if (!arbol) return codigo;

  const visibles = new Set([arbol.raiz]);
  const pendientes = [idPlataforma];
  while (pendientes.length) {
    const id = pendientes.pop();
    if (visibles.has(id)) continue;
    visibles.add(id);
    pendientes.push(...(arbol.hijos.get(id) || []));
  }

  return arbol.lineas
    .flatMap((linea) => {
      const conexion = linea.match(CONEXION);
      if (conexion) return visibles.has(conexion[1]) && visibles.has(conexion[2]) ? [linea] : [];
      const clase = linea.match(CLASE);
      if (clase) {
        const ids = clase[2].split(",").map((id) => id.trim()).filter((id) => visibles.has(id));
        return ids.length ? [`${clase[1]}${ids.join(",")}${clase[3]}`] : [];
      }
      const definicion = linea.match(DEFINICION);
      if (definicion) return visibles.has(definicion[1]) ? [linea] : [];
      return [linea];
    })
    .join("\n");
}
