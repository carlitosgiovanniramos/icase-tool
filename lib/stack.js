import { generarContenido } from "./gemini.js";
import { leerJson, normalizarTexto, sumarCosto } from "./jsonIA.js";
import { formatearRequerimientos, formatearIndicaciones } from "./analisis.js";
import { armarProyecto, catalogo } from "./implementacion.js";

// Paso "Stack técnico" (primero de la Implementación): a partir de la arquitectura y del diagrama
// de sistemas aprobados, elige las piezas del catálogo (plantillas/) que implementan cada
// tecnología, sin sustituir ninguna. La IA propone y el código valida contra el catálogo y contra
// las tecnologías que aparecen en los diagramas; los contenedores no los decide la IA, salen del
// armador real. Solo se usa en el servidor.

const RESOLUCIONES = new Set(["pieza", "externo", "dentro_de_app", "infraestructura", "no_soportado"]);
const VARIABLE_VALIDA = /^[A-Z][A-Z0-9_]*$/;

// ¿Aparece la palabra clave en el texto? Con límites de palabra, y "react" no cuenta dentro de
// "React Native" (es otra tecnología).
function menciona(texto, clave) {
  const k = normalizarTexto(clave);
  if (!k) return false;
  const patron = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])(?! native)`);
  return patron.test(texto);
}

// Piezas del catálogo cuyas palabras clave aparecen en el diseño.
export function piezasMencionadas(fichas, textoDiseno) {
  const texto = normalizarTexto(textoDiseno);
  return fichas.filter((f) => (f.reconoce || []).some((k) => menciona(texto, k))).map((f) => f.nombre);
}

// --- Librerías -----------------------------------------------------------------------------

// Capacidades que suelen necesitar una librería y no vienen con la tecnología. Si un requerimiento
// las pide, cada pieza (de las capas indicadas) que implementa ese requerimiento según el diagrama
// de sistemas debe tener una librería con esa capacidad. Las capas que ya la traen de serie no se
// listan (ej. el navegador y Deno ya calculan hashes).
export const CAPACIDADES = [
  { clave: "firma", que: "dibujar una firma en pantalla", capas: ["web", "movil"], patron: /firma[^.;]{0,80}(trazad|pantalla|dibuj|manuscrit|t[aá]ctil)|(trazad|dibuj)[^.;]{0,40}firma/i },
  { clave: "pdf", que: "generar o exportar PDF", capas: ["web", "movil"], patron: /\bpdf\b/i },
  { clave: "notificaciones", que: "recibir notificaciones push", capas: ["movil"], patron: /notificaci[oó]n(es)?\s+push|push\s+notification/i },
  { clave: "almacenamiento_local", que: "guardar datos en el dispositivo sin conexión", capas: ["movil"], patron: /sin conexi[oó]n|offline|desconexi[oó]n/i },
  { clave: "conexion", que: "detectar cuándo vuelve la conexión para sincronizar", capas: ["movil"], patron: /sincroniz[^.;]{0,80}(conexi[oó]n|reconect|restablec)|(conexi[oó]n|reconect|restablec)[^.;]{0,80}sincroniz/i },
  { clave: "mapa", que: "mostrar un mapa", capas: ["web", "movil"], patron: /\bmapas?\b|geolocaliz/i },
  { clave: "graficos", que: "dibujar gráficos o métricas", capas: ["web", "movil"], patron: /(?<![a-záéíóúñ])gr[aá]fic[oa]s?\b|tablero de m[eé]tricas|dashboard/i },
  { clave: "hash", que: "calcular un resumen criptográfico", capas: ["movil"], patron: /sha-?\d+|\bhash\b|resumen criptogr/i },
];

// Requerimientos (RF y RNF) que piden cada capacidad.
function capacidadesPedidas(analisis) {
  const requerimientos = [...(analisis?.requerimientos_funcionales || []), ...(analisis?.requerimientos_no_funcionales || [])];
  return CAPACIDADES.map((c) => ({
    ...c,
    requerimientos: requerimientos.filter((r) => c.patron.test(`${r.nombre || ""} ${r.descripcion || ""}`)).map((r) => r.codigo),
  })).filter((c) => c.requerimientos.length);
}

const URL_REGISTRO = {
  npm: (n) => `https://registry.npmjs.org/${n.replace("/", "%2F")}`,
  pub: (n) => `https://pub.dev/api/packages/${n}`,
  jsr: (n) => `https://jsr.io/${n}/meta.json`,
};

// Paquetes que no existen en su registro (nombres inventados). Las Edge Functions (Deno) aceptan
// "jsr:@scope/nombre" o "npm:nombre". Si el registro no responde, no se marca nada.
export async function paquetesInexistentes(librerias, fichas) {
  const porNombre = Object.fromEntries(fichas.map((f) => [f.nombre, f]));
  const revisar = async (l) => {
    let registro = porNombre[l.pieza]?.registro;
    let nombre = l.nombre.replace(/@[\^~]?\d[\w.-]*$/, ""); // sin versión
    if (registro === "deno") {
      registro = nombre.startsWith("jsr:") ? "jsr" : "npm";
      nombre = nombre.replace(/^(jsr|npm):/, "");
    }
    // Solo el paquete, sin la ruta interna: "@std/crypto/sha256" -> "@std/crypto", "firebase/app" -> "firebase".
    if (registro !== "pub") nombre = nombre.split("/").slice(0, nombre.startsWith("@") ? 2 : 1).join("/");
    if (!URL_REGISTRO[registro]) return null;
    try {
      const r = await fetch(URL_REGISTRO[registro](nombre), { method: "GET", signal: AbortSignal.timeout(6000) });
      return r.status === 404 ? `${l.nombre} (${registro === "pub" ? "pub.dev" : registro})` : null;
    } catch {
      return null;
    }
  };
  return (await Promise.all(librerias.map(revisar))).filter(Boolean);
}

// --- Catálogo en el diseño (generador de arquitectura) --------------------------------------

const CAPAS_LEGIBLES = { web: "Web", movil: "Móvil", backend: "Backend", datos: "Base de datos" };

// Tecnologías que la Implementación sabe construir, por capa, para el prompt de la arquitectura.
// Ej. "Web: Next.js, React · Móvil: Flutter · Backend: Supabase (Auth, ...), Node.js / Express · ..."
export function catalogoParaDiseno(fichas) {
  return Object.entries(CAPAS_LEGIBLES)
    .map(([capa, nombre]) => {
      const piezas = fichas
        .filter((f) => f.capa === capa)
        .map((f) => (Object.keys(f.opcionales || {}).length ? `${f.titulo} (servicios: ${Object.keys(f.opcionales).join(", ")})` : f.titulo));
      return piezas.length ? `${nombre}: ${piezas.join(", ")}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

// Revisa que los clientes, el backend y la base de datos del diagrama de arquitectura (Mermaid
// con subgraph CLIENTES, BACKEND y DATOS) usen tecnologías del catálogo. Lo que eligió el cliente
// en el Análisis (tecnologiasCliente) se respeta: va como aviso, no como problema a corregir.
export function revisarTecnologiasArquitectura(diagrama, fichas, tecnologiasCliente = "") {
  const problemas = [];
  const avisos = [];
  const delCliente = normalizarTexto(tecnologiasCliente);
  const deCapa = (capas) => fichas.filter((f) => capas.includes(f.capa));
  const reconocida = (texto, capas) => piezasMencionadas(deCapa(capas), texto).length > 0;
  const catalogoDe = (capas) => deCapa(capas).map((f) => f.titulo).join(", ");

  const revisar = (elemento, tecnologia, capas) => {
    if (!tecnologia || reconocida(tecnologia, capas)) return;
    // "API REST · Django": basta con que una de sus partes sea lo que escribió el cliente.
    const partes = tecnologia.split(/[·/,]|\sy\s/).map(normalizarTexto).filter((p) => p.length > 2);
    if (delCliente && partes.some((p) => menciona(delCliente, p))) {
      avisos.push(`${elemento}: ${tecnologia} la eligió el cliente y no tiene implementación automática (catálogo: ${catalogoDe(capas)}).`);
    } else {
      problemas.push(`${elemento} usa "${tecnologia}", que la Implementación no sabe construir. Usa una tecnología del catálogo: ${catalogoDe(capas)}.`);
    }
  };

  let subgraph = null;
  for (const linea of String(diagrama || "").split("\n")) {
    const t = linea.trim();
    if (t.startsWith("%%")) continue;
    const sub = t.match(/^subgraph\s+([A-Za-z_]\w*)(?:\s*\["([^"]*)"\])?/);
    if (sub) {
      subgraph = sub[1].toUpperCase();
      // "Backend — Supabase" / "Backend — API REST · Node.js / Express": la tecnología va en el título.
      if (subgraph === "BACKEND" && !/microservicios/i.test(sub[2] || "")) {
        revisar("El backend", (sub[2] || "").split(/—|-{1,2}/).slice(1).join(" ").trim(), ["backend"]);
      }
      continue;
    }
    if (t === "end") {
      subgraph = null;
      continue;
    }
    const nodo = t.match(/^([A-Za-z_]\w*)\s*([\[\(\{]+)"?([^"\]\)]*)/);
    if (!nodo) continue;
    const [, id, apertura, etiqueta] = nodo;
    const [nombre, ...resto] = etiqueta.split(/<br\s*\/?>/i);
    const tecnologia = resto.join(" ").trim();
    if (subgraph === "CLIENTES") {
      // El almacenamiento local vive dentro de la app: no es una pieza.
      if (id === "LOCAL" || /sqlite|almacenamiento local/i.test(etiqueta)) continue;
      const movil = id === "MOVIL" || /m[oó]vil|android|\bios\b/i.test(nombre);
      revisar(nombre.trim() || id, tecnologia, movil ? ["movil"] : ["web"]);
    } else if (subgraph === "DATOS" && apertura.includes("(") && apertura.includes("[")) {
      // Cilindro: base de datos ("PostgreSQL" o "PostgreSQL<br/>Préstamos").
      revisar("La base de datos", nombre.trim(), ["datos"]);
    }
  }
  return { problemas, avisos };
}

// Componentes del diagrama de sistemas (PlantUML WBS): las hojas del árbol, con su tecnología, sus
// requerimientos y si son servicios externos. Formato de los nodos:
//   *** Panel Web <<secundario>>          nodo de una línea
//   ****:Emergencias — Registro           nodo de varias líneas: nombre, tecnología, RF; termina en ";"
//   Next.js
//   RF03, RF04;  <<externo>>
export function componentesDeSistema(diagrama) {
  const nodos = [];
  const lineas = String(diagrama || "").split(/\r?\n/);
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(\*+)(:?)\s*(.*)$/);
    if (!m) continue;
    const profundidad = m[1].length;
    const partes = [m[3]];
    if (m[2] === ":") {
      while (!/;\s*(<<[^>]*>>\s*)*$/.test(partes.at(-1)) && i + 1 < lineas.length) partes.push(lineas[++i]);
    }
    const texto = partes.join("\n");
    const limpias = partes.map((p) => p.replace(/<<[^>]*>>/g, "").replace(/;\s*$/, "").trim()).filter(Boolean);
    const requerimientos = (texto.match(/\bR(?:N)?F\d+\b/g) || []).filter((v, j, a) => a.indexOf(v) === j);
    const sinRequerimientos = limpias.filter((p) => !/^\s*R(?:N)?F\d+/.test(p));
    nodos.push({
      profundidad,
      nombre: sinRequerimientos[0] || "",
      tecnologia: sinRequerimientos.slice(1).join(" ") || (sinRequerimientos[0]?.split(/\s+—\s+/)[1] ?? ""),
      requerimientos,
      externo: /<<\s*externo\s*>>/i.test(texto),
    });
  }

  const ruta = [];
  return nodos.flatMap((n, i) => {
    ruta.length = n.profundidad - 1;
    ruta[n.profundidad - 1] = n.nombre;
    const esHoja = !nodos[i + 1] || nodos[i + 1].profundidad <= n.profundidad;
    if (!esHoja || n.profundidad < 3) return [];
    return [{ ...n, ubicacion: ruta.slice(1, -1).filter(Boolean).join(" / ") }];
  });
}

// Cómo se implementa cada componente del diagrama de sistemas con el stack elegido: la pieza que
// reconoce su tecnología, servicio externo, o lo que la IA indicó para esa tecnología en "elementos".
export function resolverComponentes(componentes, piezas, elementos, fichas) {
  const porNombre = Object.fromEntries(fichas.map((f) => [f.nombre, f]));
  const elegidas = new Set(piezas.flatMap((p) => [p.pieza, ...(porNombre[p.pieza]?.incluye || [])]));
  return componentes.map((c) => {
    const texto = `${c.tecnologia} ${c.nombre} ${c.ubicacion}`;
    const pieza = piezasMencionadas(fichas, texto).find((n) => elegidas.has(n) && n !== "alta-disponibilidad");
    if (pieza) {
      const implementa = piezas.some((p) => p.pieza === pieza) ? pieza : piezas.find((p) => porNombre[p.pieza]?.incluye?.includes(pieza))?.pieza;
      return { ...c, resolucion: "pieza", pieza: implementa || pieza };
    }
    // Un servicio opcional elegido que se reconoce por su función (ej. Auth por "JWT", Realtime por
    // "WebSocket" en un diseño con Supabase).
    const normalizado = normalizarTexto(texto);
    const porOpcional = piezas.find((p) =>
      (p.opcionales || []).some((o) => (porNombre[p.pieza]?.opcionales?.[o] || []).some((k) => menciona(normalizado, k)))
    );
    if (porOpcional) return { ...c, resolucion: "pieza", pieza: porOpcional.pieza };
    if (c.externo) return { ...c, resolucion: "externo", pieza: null };
    const tecnologia = normalizarTexto(c.tecnologia);
    const elemento = tecnologia && elementos.find((e) => normalizarTexto(e.elemento).includes(tecnologia));
    if (elemento && elemento.resolucion !== "no_soportado") return { ...c, resolucion: elemento.resolucion, pieza: elemento.pieza };
    return { ...c, resolucion: "sin_resolver", pieza: null };
  });
}

// Devuelve el stack limpio y la lista de problemas que la IA debe corregir.
// diagramaSistema: para comprobar que cada componente quede implementado.
// analisis: requerimientos, para comprobar que las capacidades que piden tengan su librería.
export function validarStack(stack, fichas, textoDiseno, diagramaSistema = "", analisis = null) {
  const problemas = [];
  const porNombre = Object.fromEntries(fichas.map((f) => [f.nombre, f]));
  const piezas = [];

  for (const p of Array.isArray(stack?.piezas) ? stack.piezas : []) {
    const ficha = porNombre[p?.pieza];
    if (!ficha) {
      problemas.push(`"${p?.pieza}" no es una pieza del catálogo. Usa solo: ${fichas.map((f) => f.nombre).join(", ")}.`);
      continue;
    }
    if (ficha.nombre === "alta-disponibilidad") continue; // se indica con altaDisponibilidad
    if (piezas.some((x) => x.pieza === ficha.nombre)) continue;
    const validos = Object.keys(ficha.opcionales || {});
    const opcionales = [...new Set((p.opcionales || []).filter((o) => validos.includes(o)))];
    for (const o of p.opcionales || []) {
      if (!validos.includes(o)) problemas.push(`"${o}" no es un servicio opcional de ${ficha.nombre} (válidos: ${validos.join(", ") || "ninguno"}).`);
    }
    piezas.push({ pieza: ficha.nombre, ...(validos.length ? { opcionales } : {}), origen: String(p.origen || "") });
  }

  if (!piezas.length) problemas.push("No se eligió ninguna pieza del catálogo.");
  if (!piezas.some((p) => ["backend", "datos"].includes(porNombre[p.pieza].capa))) {
    problemas.push("Falta la pieza de backend o de datos del diseño.");
  }

  // Tecnologías del diseño que tienen pieza en el catálogo y no se eligieron (salvo que otra
  // pieza elegida ya las incluya, como Supabase con PostgreSQL).
  const incluidas = new Set(piezas.flatMap((p) => [p.pieza, ...(porNombre[p.pieza].incluye || [])]));
  const altaEnDiseno = piezasMencionadas(fichas, textoDiseno).includes("alta-disponibilidad");
  for (const nombre of piezasMencionadas(fichas, textoDiseno)) {
    if (nombre === "alta-disponibilidad" || incluidas.has(nombre)) continue;
    problemas.push(`El diseño menciona ${porNombre[nombre].titulo} y no se eligió la pieza "${nombre}". Si de verdad no corresponde, explícalo en "avisos".`);
  }

  let altaDisponibilidad = !!stack?.altaDisponibilidad;
  const piezaWeb = piezas.find((p) => porNombre[p.pieza].altaDisponibilidad);
  if (altaDisponibilidad && !piezaWeb) {
    problemas.push("La alta disponibilidad necesita una pieza web (Next.js o React) en el proyecto.");
    altaDisponibilidad = false;
  }
  if (altaEnDiseno && !altaDisponibilidad && !(stack?.avisos || []).some((a) => /disponibilidad/i.test(a))) {
    problemas.push("El diseño pide alta disponibilidad (master/esclavo, failover): marca altaDisponibilidad o explica en \"avisos\" por qué no.");
  }

  const elementos = (Array.isArray(stack?.elementos) ? stack.elementos : [])
    .map((e) => ({
      elemento: String(e?.elemento || "").trim(),
      diagrama: String(e?.diagrama || "").trim(),
      resolucion: RESOLUCIONES.has(e?.resolucion) ? e.resolucion : "no_soportado",
      pieza: porNombre[e?.pieza] ? e.pieza : null,
      detalle: String(e?.detalle || "").trim(),
    }))
    .filter((e) => e.elemento);
  if (!elementos.length) problemas.push('Falta "elementos": cómo se resuelve cada caja de la arquitectura y del diagrama de sistemas.');
  for (const e of elementos) {
    if (e.resolucion === "pieza" && !e.pieza) problemas.push(`"${e.elemento}" dice resolverse con una pieza, pero no indica una pieza válida del catálogo.`);
  }

  const externos = [];
  for (const x of Array.isArray(stack?.externos) ? stack.externos : []) {
    const variable = String(x?.variable || "").trim().toUpperCase();
    if (!VARIABLE_VALIDA.test(variable)) {
      problemas.push(`La variable del servicio externo "${x?.servicio}" no es válida (usa MAYUSCULAS_CON_GUIONES_BAJOS).`);
      continue;
    }
    if (externos.some((e) => e.variable === variable)) continue;
    externos.push({
      servicio: String(x.servicio || "").trim(),
      variable,
      usadoPor: Array.isArray(x.usadoPor) ? x.usadoPor.map(String) : [],
      requerimientos: Array.isArray(x.requerimientos) ? x.requerimientos.map(String) : [],
      nota: String(x.nota || "").trim(),
    });
  }

  // Cada componente del diagrama de sistemas debe quedar implementado por alguna parte del stack.
  const componentes = resolverComponentes(componentesDeSistema(diagramaSistema), piezas, elementos, fichas);
  for (const c of componentes.filter((c) => c.resolucion === "sin_resolver")) {
    problemas.push(
      `El componente "${c.nombre}"${c.tecnologia ? ` (${c.tecnologia})` : ""} del diagrama de sistemas no queda implementado por ninguna pieza ni está en "elementos". Inclúyelo en "elementos" con su resolución.`
    );
  }

  const claves = new Set(CAPACIDADES.map((c) => c.clave));
  const librerias = (Array.isArray(stack?.librerias) ? stack.librerias : [])
    .map((l) => ({
      nombre: String(l?.nombre || "").trim(),
      pieza: String(l?.pieza || "").trim(),
      capacidad: claves.has(l?.capacidad) ? l.capacidad : "otra",
      motivo: String(l?.motivo || "").trim(),
      requerimientos: Array.isArray(l?.requerimientos) ? l.requerimientos.map(String) : [],
    }))
    .filter((l) => l.nombre);
  for (const l of librerias) {
    if (!piezas.some((p) => p.pieza === l.pieza)) problemas.push(`La librería "${l.nombre}" es de la pieza "${l.pieza}", que no está en el stack.`);
    const motivo = porNombre[l.pieza]?.incompatibles?.[l.nombre.replace(/^(npm|jsr):/, "")];
    if (motivo) problemas.push(`"${l.nombre}" no sirve en ${porNombre[l.pieza].titulo}: ${motivo}.`);
  }

  // Librerías base de cada combinación de piezas (ej. el cliente de Supabase en la app Flutter):
  // las declara la pieza, no dependen de la IA.
  const elegidas = new Set(piezas.map((p) => p.pieza));
  for (const p of piezas) {
    for (const [integracion, base] of Object.entries(porNombre[p.pieza].librerias || {})) {
      if (!elegidas.has(integracion)) continue;
      for (const b of base) {
        if (!librerias.some((l) => l.pieza === p.pieza && l.nombre === b.nombre)) {
          librerias.unshift({ nombre: b.nombre, pieza: p.pieza, capacidad: "otra", motivo: b.motivo, requerimientos: [], base: true });
        }
      }
    }
  }

  // Cada capacidad que piden los requerimientos (firma, PDF, sin conexión...) debe tener una
  // librería en cada pieza que implementa esos requerimientos según el diagrama de sistemas.
  for (const c of capacidadesPedidas(analisis)) {
    const piezasQueLaUsan = new Set(
      componentes
        .filter((comp) => comp.pieza && comp.requerimientos.some((r) => c.requerimientos.includes(r)))
        .map((comp) => comp.pieza)
        .filter((p) => c.capas.includes(porNombre[p]?.capa))
    );
    // Capacidades propias del dispositivo (sin conexión, notificaciones...): si el diagrama no las
    // asigna a un componente de la app, igual las necesita la app.
    if (!piezasQueLaUsan.size && c.capas.length === 1) {
      piezas.filter((p) => porNombre[p.pieza].capa === c.capas[0]).forEach((p) => piezasQueLaUsan.add(p.pieza));
    }
    for (const p of piezasQueLaUsan) {
      if (!librerias.some((l) => l.pieza === p && l.capacidad === c.clave)) {
        problemas.push(
          `${c.requerimientos.join(", ")} piden ${c.que} en ${porNombre[p].titulo} y no hay librería con "capacidad": "${c.clave}" en esa pieza. Agrégala.`
        );
      }
    }
  }

  return {
    stack: {
      piezas,
      altaDisponibilidad,
      elementos,
      componentes,
      librerias,
      externos,
      avisos: (Array.isArray(stack?.avisos) ? stack.avisos : []).map(String).filter(Boolean),
      explicacion: String(stack?.explicacion || "").trim(),
    },
    problemas,
  };
}

// --- Generación ---------------------------------------------------------------------------

function describirCatalogo(fichas) {
  return fichas
    .map((f) => {
      const partes = [`- ${f.nombre} (${f.titulo}, capa ${f.capa}): reconoce ${(f.reconoce || []).join(", ")}`];
      const opcionales = Object.keys(f.opcionales || {});
      if (opcionales.length) partes.push(`  servicios opcionales: ${opcionales.join(", ")} (inclúyelos solo si el diseño los tiene)`);
      if (f.incluye?.length) partes.push(`  ya incluye: ${f.incluye.join(", ")}`);
      if (f.descripcion) partes.push(`  ${f.descripcion}`);
      return partes.join("\n");
    })
    .join("\n");
}

const FORMATO = `{
  "piezas": [
    { "pieza": "nombre exacto del catálogo", "opcionales": ["solo servicios opcionales de esa pieza que el diseño tiene"], "origen": "qué cajas de la arquitectura y del diagrama de sistemas la piden" }
  ],
  "altaDisponibilidad": false,
  "elementos": [
    { "elemento": "caja tal como aparece en el diseño, ej. 'Panel Web · Next.js'", "diagrama": "arquitectura | sistemas | ambos", "resolucion": "pieza | externo | dentro_de_app | infraestructura | no_soportado", "pieza": "nombre de la pieza si resolucion es pieza, si no null", "detalle": "cómo se implementa, una frase" }
  ],
  "librerias": [
    { "nombre": "paquete exacto de su ecosistema (npm, pub.dev; en Edge Functions jsr:@scope/nombre o npm:nombre)", "pieza": "pieza donde se usa", "capacidad": "${CAPACIDADES.map((c) => c.clave).join(" | ")} | otra", "motivo": "para qué, una frase", "requerimientos": ["RF06"] }
  ],
  "externos": [
    { "servicio": "Google Maps", "variable": "GOOGLE_MAPS_API_KEY", "usadoPor": ["servicio o app que lo usa: web, movil, functions..."], "requerimientos": ["RF06"], "nota": "qué más necesita además de la clave, si aplica" }
  ],
  "avisos": ["lo que no se puede implementar tal cual o hay que decidir; vacío si no hay"],
  "explicacion": "3 a 5 líneas: qué piezas forman el proyecto y por qué"
}`;

function armarPrompt({ nombre, descripcion, analisis, diagramaArquitectura, diagramaSistema, tecnologias, plataformas, indicaciones, fichas, actual, instruccion }) {
  const rf = formatearRequerimientos(analisis?.requerimientos_funcionales || []);
  const rnf = formatearRequerimientos(analisis?.requerimientos_no_funcionales || [], { conCategoria: true });

  const tarea = actual
    ? `TAREA: modifica la ficha de stack actual según la instrucción del usuario. Conserva todo lo que la instrucción no cambia. Las reglas siguen valiendo: si la instrucción pide algo que contradice el diseño aprobado o que el catálogo no tiene, no lo inventes; explícalo en "avisos".

Instrucción del usuario:
${instruccion}

Ficha actual:
${JSON.stringify(actual)}`
    : "TAREA: arma la ficha de stack técnico del proyecto.";

  return `Eres un arquitecto de software. Vas a decidir con qué piezas se implementa en contenedores Docker un sistema cuyo diseño ya está aprobado.

CONTEXTO
Sistema: ${nombre}
${descripcion || ""}

Diagrama de arquitectura aprobado (Mermaid):
${diagramaArquitectura || "(no hay)"}

Diagrama de sistemas aprobado (PlantUML WBS: subsistemas, componentes con su tecnología y los RF que cumplen; <<externo>> = servicio externo):
${diagramaSistema || "(no hay)"}

Tecnologías declaradas por el usuario: ${tecnologias || "(no hay)"}
Plataformas: ${(plataformas || []).join(", ") || "(no indicadas)"}

Requerimientos funcionales:
${rf}

Requerimientos no funcionales:
${rnf}

Catálogo de piezas disponibles (cada pieza es una tecnología ya preparada para Docker):
${describirCatalogo(fichas)}

QUÉ DEBE MOSTRAR
- Las piezas del catálogo que implementan EXACTAMENTE las tecnologías del diseño. La implementación sigue siempre el diseño aprobado.
- En "elementos", TODAS las cajas de la arquitectura y los componentes del diagrama de sistemas, cada uno con su resolución:
  pieza (lo implementa una pieza del catálogo), externo (servicio de terceros que se usa con su clave: mapas, notificaciones, pagos, correo), dentro_de_app (vive dentro de otra aplicación, ej. almacenamiento local SQLite dentro de la app móvil), infraestructura (alta disponibilidad, balanceo), no_soportado (tecnología del diseño que el catálogo no tiene).
- Servicios opcionales de una pieza: inclúyelos solo si alguna caja del diseño los nombra (ej. Supabase Realtime, Storage, Edge Functions, Auth).
- altaDisponibilidad: true solo si el diseño pide servidor master/esclavo, standby o failover.
- "librerias": recorre CADA requerimiento funcional y no funcional. Si necesita una capacidad que la tecnología de su pieza no trae de serie (por ejemplo: dibujar una firma en pantalla, generar un PDF, recibir notificaciones push en la app, detectar si hay conexión para sincronizar, calcular un hash, mostrar un mapa, guardar datos en el dispositivo, dibujar gráficos), agrega la librería en CADA pieza donde se usa esa función: si la usan la web y la app, una en cada una. Indica en "requerimientos" los RF/RNF que la piden.
  - Nombre exacto del paquete en el registro de su ecosistema: npm para Next.js, React y Express; pub.dev para Flutter; jsr o npm compatibles con Deno para las Edge Functions de Supabase.
  - Cada librería debe funcionar en el entorno de ejecución de su pieza: nada de librerías para Node.js en Deno, ni paquetes web en Flutter. Si el entorno ya trae la capacidad (fetch, criptografía del navegador o de Deno), no agregues una librería para eso.
  - En "capacidad" indica cuál de estas cubre: ${CAPACIDADES.map((c) => `${c.clave} (${c.que})`).join(", ")}; si no es ninguna, "otra".
  - No hace falta listar el cliente de Supabase ni el de PostgreSQL: los agrega la pieza.
- "externos": cada servicio externo del diseño con la variable de entorno de su clave. Usa la forma de conexión vigente de cada servicio, no las retiradas o en desuso (ej. Firebase Cloud Messaging con la API HTTP v1 y una cuenta de servicio, no la clave de servidor antigua). En "usadoPor" van TODOS los que lo usan, incluida la app si recibe sus notificaciones o muestra sus mapas (la app necesita también la configuración del proveedor; dilo en "nota").
- "avisos": solo lo que el usuario tiene que decidir o lo que no se puede implementar tal cual. No repitas confirmaciones ni lo que ya muestran "piezas" y "elementos".
${formatearIndicaciones(indicaciones)}
QUÉ NO QUIERO
- No sustituyas tecnologías: si el diseño dice Flutter, no propongas React; si dice Supabase, no propongas Express. Si una tecnología del diseño no tiene pieza, márcala no_soportado y explícalo en "avisos".
- No agregues tecnologías, servicios ni librerías que el diseño y los requerimientos no justifiquen.
- No uses nombres de piezas ni de servicios opcionales fuera del catálogo.
- No decidas cuántos contenedores hay: eso sale de las piezas.

FORMATO
${tarea}

Responde solo con este JSON:
${FORMATO}`;
}

// cuerpo: { nombre, descripcion, analisis, diagramaArquitectura, diagramaSistema, tecnologias,
//   plataformas, indicaciones, usarClaude } y, para "Ampliar con IA", { actual, instruccion }.
// Un reintento si la validación encuentra problemas; los que queden vuelven como advertencias.
export async function generarStack(cuerpo) {
  const { usarClaude, diagramaArquitectura, diagramaSistema, tecnologias, nombre } = cuerpo;
  const fichas = await catalogo();
  const textoDiseno = [diagramaArquitectura, diagramaSistema, tecnologias].filter(Boolean).join("\n");
  const prompt = armarPrompt({ ...cuerpo, fichas });

  const generar = async (texto) => {
    const response = await generarContenido({
      usarClaude,
      contents: [{ text: texto }],
      config: { responseMimeType: "application/json" },
    });
    const resultado = validarStack(leerJson(response.text), fichas, textoDiseno, diagramaSistema, cuerpo.analisis);
    // Nombres de paquete que no existen en su registro (npm, pub.dev, jsr).
    const inexistentes = await paquetesInexistentes(resultado.stack.librerias, fichas);
    if (inexistentes.length) {
      resultado.problemas.push(`Estos paquetes no existen en su registro: ${inexistentes.join(", ")}. Usa el nombre exacto de un paquete publicado.`);
    }
    return { response, ...resultado };
  };

  let { response, stack, problemas } = await generar(prompt);
  let costo = response.costoUsd;

  if (problemas.length) {
    try {
      const reintento = await generar(
        `${prompt}

TU RESPUESTA ANTERIOR TIENE ESTOS PROBLEMAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Respuesta anterior:
${JSON.stringify(stack)}

Corrígela y responde de nuevo con el JSON completo.`
      );
      costo = sumarCosto(costo, reintento.response.costoUsd);
      if (reintento.problemas.length <= problemas.length) ({ response, stack, problemas } = reintento);
    } catch {
      // Si el reintento falla, se conserva el primer resultado con sus advertencias.
    }
  }

  // Los contenedores salen del armador real, con las piezas elegidas.
  const { servicios } = await armarProyecto({
    nombre,
    generados: [],
    piezas: stack.piezas,
    altaDisponibilidad: stack.altaDisponibilidad,
  });

  return {
    ...stack,
    titulos: Object.fromEntries(fichas.map((f) => [f.nombre, f.titulo])),
    contenedores: servicios,
    advertencias: problemas,
    modelo_ia: response.modelVersion,
    costo_ia: costo,
  };
}
