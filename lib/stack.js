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
export function validarStack(stack, fichas, textoDiseno, diagramaSistema = "") {
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

  const librerias = (Array.isArray(stack?.librerias) ? stack.librerias : [])
    .map((l) => ({
      nombre: String(l?.nombre || "").trim(),
      pieza: String(l?.pieza || "").trim(),
      motivo: String(l?.motivo || "").trim(),
      requerimientos: Array.isArray(l?.requerimientos) ? l.requerimientos.map(String) : [],
    }))
    .filter((l) => l.nombre);
  for (const l of librerias) {
    if (!piezas.some((p) => p.pieza === l.pieza)) problemas.push(`La librería "${l.nombre}" es de la pieza "${l.pieza}", que no está en el stack.`);
  }

  // Cada componente del diagrama de sistemas debe quedar implementado por alguna parte del stack.
  const componentes = resolverComponentes(componentesDeSistema(diagramaSistema), piezas, elementos, fichas);
  for (const c of componentes.filter((c) => c.resolucion === "sin_resolver")) {
    problemas.push(
      `El componente "${c.nombre}"${c.tecnologia ? ` (${c.tecnologia})` : ""} del diagrama de sistemas no queda implementado por ninguna pieza ni está en "elementos". Inclúyelo en "elementos" con su resolución.`
    );
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
    { "nombre": "paquete exacto de su ecosistema (npm, pub.dev)", "pieza": "pieza donde se usa", "motivo": "para qué, una frase", "requerimientos": ["RF06"] }
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
- "librerias": solo las que exige un requerimiento o una tecnología del diseño (ej. cliente de Supabase en la web y en la app, SQLite en la app si hay modo sin conexión, mapas si hay geolocalización), con el nombre exacto del paquete.
- "externos": cada servicio externo del diseño con la variable de entorno de su clave. Usa la forma de conexión vigente de cada servicio, no las retiradas o en desuso (ej. Firebase Cloud Messaging con la API HTTP v1 y una cuenta de servicio, no la clave de servidor antigua).
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
    return { response, ...validarStack(leerJson(response.text), fichas, textoDiseno, diagramaSistema) };
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
