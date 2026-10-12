import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { resumenDelArbol } from "@/lib/arbol";
import { plataformaDeArquitectura } from "@/lib/plataformas";

export const maxDuration = 300;

// Diagrama de sistemas: organiza los componentes del sistema en subsistemas y muestra con qué
// tecnología está hecho cada uno y qué funciones (requerimientos) cumple. Es la expresión física
// del análisis funcional: responde "de qué está compuesto el sistema y qué parte cumple cada
// función". A diferencia de la arquitectura (capas y comunicación), aquí no hay flujos: solo la
// jerarquía de composición.
//
// Se genera en PlantUML WBS (lo dibuja Kroki), que produce la forma de la plantilla clásica
// "Diagrama de sistemas y subsistemas": el objeto arriba, los subsistemas primarios en una fila,
// los secundarios debajo (si existen) y los componentes apilados en columna bajo cada uno.
//
// La IA NO escribe el estilo: la aplicación lo inserta después de validar. Tras generar, se valida
// el diagrama y, si incumple las reglas, se pide una corrección (un solo reintento).

// Con dos plataformas, sus áreas de presentación y los servicios de una plataforma de backend, 20
// nodos no alcanzan sin fundir componentes que no tienen que ver.
const MAX_NODOS = 24;
// Máximo de códigos (RF y RNF) por componente. La capa de datos queda exenta: guarda casi todo.
// También los servicios de una plataforma de backend (Supabase, Firebase...): son pocos y por el
// de datos pasa casi todo, así que recortar su lista lo deja incoherente con la base de datos.
// Con un tope más bajo la IA, para cumplirlo, repartía los RF en áreas que no les corresponden.
const MAX_CODIGOS = 12;

// Almacenamiento en el propio dispositivo: es un componente de datos, no de presentación.
const ALMACEN_LOCAL = /sqlite|almacenamiento local|indexeddb|\b(hive|realm|room)\b/i;
// Palabras del nombre de una plataforma que no la distinguen de otra ("Aplicación Web" → "web").
const PALABRAS_GENERICAS = new Set(["aplicacion", "app", "plataforma", "panel", "portal", "sitio", "cliente", "de", "la", "el"]);

// Tres colores: objeto y primarios (navy), secundarios (gris claro), componentes (blanco). Los
// servicios de terceros son componentes con borde punteado, no un color más.
const ESTILOS = `<style>
wbsDiagram {
  node {
    BackgroundColor #ffffff
    LineColor #1e293b
    FontColor #1e293b
    FontSize 12
    RoundCorner 0
    Padding 8
  }
  arrow {
    LineColor #1e293b
  }
  :depth(0) {
    BackgroundColor #1e293b
    FontColor #ffffff
    FontStyle bold
  }
  :depth(1) {
    BackgroundColor #1e293b
    FontColor #ffffff
  }
  .secundario {
    BackgroundColor #eef2f6
  }
  .externo {
    LineStyle 4
  }
}
</style>`;

// Ejemplo de un sistema AJENO a cualquier proyecto real. Sirve solo para mostrar la sintaxis y el
// nivel de detalle. Los componentes, tecnologías y códigos NO deben copiarse.
const EJEMPLO = `@startwbs
* Sistema de Reservas de Canchas
** Subsistema de presentación
*** Portal Web <<secundario>>
****:Reserva de canchas
React
RF01, RF02;
****:Panel del administrador
React
RF05;
*** App Móvil <<secundario>>
****:Mis reservas
Flutter
RF01, RF03;
****:Avisos al jugador
Flutter
RF06;
** Subsistema de servicios
***:Reservas y horarios
Node.js / Express
RF01, RF02, RF03;
***:Autenticación y roles
JWT
RF04, RNF02;
***:Avisos a jugadores
WebSocket
RF06;
** Subsistema de datos
***:Base de datos
PostgreSQL
RF01, RF03, RF04;
** Subsistema de integración
***:Recordatorios por correo
SendGrid
RF07; <<externo>>
@endwbs`;

const TECNOLOGIA_GENERICA =
  /^(framework( web)?|api( rest)?|rest api|servicio( auth)?|base de datos( relacional)?|servidor( de aplicaciones)?|backend|frontend)$/i;

const normalizarCodigo = (c) => c.replace(/[-\s]/g, "").toUpperCase();
const normalizarTexto = (t) =>
  String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const sumar = (a, b) => (typeof a === "number" || typeof b === "number" ? (a || 0) + (b || 0) : a);

// Extrae el primer objeto JSON completo de la respuesta e ignora cualquier texto antes o después.
function limpiarJson(texto) {
  const s = String(texto || "").trim();
  const inicio = s.indexOf("{");
  if (inicio === -1) throw new Error("La IA no devolvió un JSON.");

  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < s.length; i++) {
    const c = s[i];
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === "{") profundidad++;
    else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return s.slice(inicio, i + 1);
    }
  }
  throw new Error("El JSON de la IA llegó incompleto.");
}

function limpiarPlantuml(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/^```(?:plantuml|puml)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// La aplicación inserta el estilo (y descarta cualquiera que haya escrito la IA).
function aplicarEstilo(codigo) {
  const sinEstilo = codigo.replace(/<style>[\s\S]*?<\/style>\s*/i, "");
  return sinEstilo.replace(/@startwbs\s*/i, `@startwbs\n${ESTILOS}\n`);
}

// Convierte el Mermaid de la arquitectura aprobada en una lista legible: capa -> componente — tecnología.
// Así el diagrama de sistemas parte de los mismos componentes y tecnologías, sin que la IA tenga que
// interpretar código Mermaid.
function resumirArquitectura(diagrama) {
  if (!diagrama) return "";
  const texto = String(diagrama);
  if (!/flowchart|graph\s/i.test(texto)) return texto;

  const capas = {};
  const pila = [];
  for (const linea of texto.split("\n")) {
    const t = linea.trim();
    if (!t || t.startsWith("%%")) continue;

    const sub = t.match(/^subgraph\s+\w+\s*\["([^"]+)"\]/);
    if (sub) {
      pila.push(sub[1]);
      capas[sub[1]] = capas[sub[1]] || [];
      continue;
    }
    if (t === "end") {
      pila.pop();
      continue;
    }

    const nodo = t.match(/^\w+\s*[\[\(]+"([^"]+)"/);
    if (nodo && pila.length) {
      const [nombre, ...tec] = nodo[1].split(/<br\s*\/?>/i);
      capas[pila[pila.length - 1]].push(`${nombre.trim()}${tec.length ? " — " + tec.join(" ").trim() : ""}`);
    }
  }

  const bloques = Object.entries(capas)
    .filter(([, items]) => items.length)
    .map(([capa, items]) => `  ${capa}:\n${items.map((i) => `    - ${i}`).join("\n")}`);
  return bloques.length ? bloques.join("\n") : texto;
}

// Nombres de los componentes de la arquitectura aprobada (módulos del backend, datos y externos).
// El diagrama de sistemas debe llamarlos exactamente igual.
function extraerComponentes(diagrama) {
  const nombres = [];
  let capaActual = null;
  for (const linea of String(diagrama || "").split("\n")) {
    const t = linea.trim();
    const sub = t.match(/^subgraph\s+(\w+)/i);
    if (sub) {
      capaActual = sub[1].toUpperCase();
      continue;
    }
    if (t === "end") {
      capaActual = null;
      continue;
    }
    if (capaActual && ["BACKEND", "DATOS", "EXTERNOS"].includes(capaActual)) {
      const m = t.match(/^\w+\s*[\[\(]+"([^"]+)"/);
      if (m) nombres.push(m[1].split(/<br\s*\/?>/i)[0].trim());
    }
  }
  return nombres;
}

// Revisa el WBS generado y devuelve la lista de problemas (vacía si todo está bien).
//   plataforma: la plataforma de backend como servicio de la arquitectura, si la hay.
//   arbol: resumen del árbol de navegación (los RF con pantalla en cada plataforma), si se pudo leer.
//   codigosRNF: códigos de los requerimientos no funcionales, para detectar los inventados.
function validarDiagrama(codigo, codigosRF, componentes = [], explicacion = "", { plataforma, arbol, codigosRNF } = {}) {
  if (!/@startwbs/i.test(codigo) || !/@endwbs/i.test(codigo)) return ["Falta @startwbs o @endwbs."];

  const problemas = [];
  const cuerpo = codigo.replace(/<style>[\s\S]*?<\/style>/i, "").split("\n");
  const cierraNodo = /;\s*(<<\w+>>)?$/;
  const nodos = [];
  const pila = []; // antecesores del nodo que se está leyendo
  let actual = null;
  let subsistema = "";

  for (const crudo of cuerpo) {
    const linea = crudo.trim();
    if (!linea || /^@(start|end)wbs/i.test(linea)) continue;

    if (actual) {
      actual.lineas.push(linea);
      if (cierraNodo.test(linea)) actual = null;
      continue;
    }

    const m = linea.match(/^(\*+)(:?)\s*(.*)$/);
    if (!m) continue;
    if (m[1].length === 2) subsistema = m[3];
    const nodo = { nivel: m[1].length, multilinea: m[2] === ":", lineas: [m[3]], subsistema };
    while (pila.length && pila[pila.length - 1].nivel >= nodo.nivel) pila.pop();
    nodo.padres = pila.map((p) => p.lineas[0]);
    pila.push(nodo);
    nodos.push(nodo);
    if (nodo.multilinea && !cierraNodo.test(m[3])) actual = nodo;
  }

  if (!nodos.length) return ["No hay ningún nodo."];

  if (nodos.length > MAX_NODOS) problemas.push(`Tiene ${nodos.length} nodos y el máximo es ${MAX_NODOS}: agrupa componentes afines.`);
  if (nodos[0].nivel !== 1) problemas.push("El primer nodo debe ser el sistema completo, con un solo asterisco (*).");
  if (nodos.filter((n) => n.nivel === 1).length !== 1) problemas.push("Debe haber un único nodo de nivel * (el sistema completo).");

  for (let i = 1; i < nodos.length; i++) {
    if (nodos[i].nivel > nodos[i - 1].nivel + 1) {
      problemas.push(`Se salta un nivel antes de "${nodos[i].lineas[0]}": no pases de ${nodos[i - 1].nivel} a ${nodos[i].nivel} asteriscos.`);
    }
  }

  // Un subsistema secundario solo tiene sentido si agrupa al menos dos componentes.
  nodos.forEach((n, i) => {
    if (!/<<secundario>>/.test(n.lineas[0])) return;
    let hijos = 0;
    for (let j = i + 1; j < nodos.length && nodos[j].nivel > n.nivel; j++) {
      if (nodos[j].nivel === n.nivel + 1) hijos++;
    }
    if (hijos < 2) {
      problemas.push(
        `El subsistema secundario "${n.lineas[0].replace(/<<secundario>>/, "").trim()}" tiene ${hijos} componente(s): sin al menos 2 sobra ese nivel; pon sus componentes directamente bajo el subsistema primario.`
      );
    }
  });

  for (const n of nodos.filter((x) => x.multilinea)) {
    const nombre = n.lineas[0];
    const tecnologia = (n.lineas[1] || "").replace(/;.*$/, "").trim();
    if (n.lineas.length < 3) {
      problemas.push(`El componente "${nombre}" debe tener tres líneas: nombre, tecnología y códigos terminados en ;`);
    } else if (!tecnologia || TECNOLOGIA_GENERICA.test(tecnologia)) {
      problemas.push(`El componente "${nombre}" usa una categoría genérica ("${tecnologia}") como tecnología; usa el nombre propio de la tecnología.`);
    }

    const deServicios = /servicio/.test(normalizarTexto(n.subsistema));
    if (plataforma && deServicios && normalizarTexto(tecnologia) === normalizarTexto(plataforma.nombre)) {
      problemas.push(`El componente "${nombre}" tiene como tecnología solo "${tecnologia}", que es la plataforma: indica el producto o mecanismo concreto de ese servicio (ej. JWT, PostgREST, WebSocket, Deno / TypeScript).`);
    }

    const cantidadCodigos = (n.lineas.join(" ").match(/\bRN?F-?\s?\d+\b/gi) || []).length;
    if (cantidadCodigos > MAX_CODIGOS && !/datos/i.test(n.subsistema) && !(plataforma && deServicios)) {
      problemas.push(`El componente "${nombre}" lista ${cantidadCodigos} códigos (máximo ${MAX_CODIGOS}); reparte sus funciones en componentes más específicos.`);
    }
  }

  if (codigosRF.size) {
    const usados = new Set((cuerpo.join("\n").match(/\bRF-?\s?\d+\b/gi) || []).map(normalizarCodigo));
    const faltan = [...codigosRF].filter((c) => !usados.has(c));
    const sobran = [...usados].filter((c) => !codigosRF.has(c));
    if (faltan.length) {
      problemas.push(
        `Ningún componente cumple estos requerimientos funcionales: ${faltan.join(", ")}. Asígnalos al módulo de la arquitectura que los implementa; si ninguno los cubre, no los metas en un módulo de otro dominio.`
      );
    }
    if (sobran.length) problemas.push(`Hay códigos que no existen en los requerimientos: ${sobran.join(", ")}. Elimínalos.`);
  }

  if (codigosRNF) {
    const usadosRNF = new Set((cuerpo.join("\n").match(/\bRNF-?\s?\d+\b/gi) || []).map(normalizarCodigo));
    const inventados = [...usadosRNF].filter((c) => !codigosRNF.has(c));
    if (inventados.length) {
      problemas.push(`Hay códigos de requerimientos no funcionales que no existen: ${inventados.join(", ")}. Elimínalos.`);
    }
  }

  // --- Coherencia entre subsistemas ---
  const componentesDe = (patron) => nodos.filter((n) => n.multilinea && patron.test(normalizarTexto(n.subsistema)));
  const rfsDe = (lista) =>
    new Set((lista.flatMap((n) => n.lineas).join(" ").match(/\bRF-?\s?\d+\b/gi) || []).map(normalizarCodigo));
  const esLocal = (n) => ALMACEN_LOCAL.test(n.lineas.join(" "));
  const presentacion = componentesDe(/presentacion/);
  const servicios = componentesDe(/servicio/);

  const localesEnPresentacion = presentacion.filter(esLocal).map((n) => `"${n.lineas[0]}"`);
  if (localesEnPresentacion.length) {
    problemas.push(`${localesEnPresentacion.join(", ")} es almacenamiento en el dispositivo, no una pantalla: va en el subsistema de datos.`);
  }

  // A los datos del servidor se llega por un servicio: lo que guarda la base lo atiende alguno.
  if (servicios.length) {
    const enServicios = rfsDe(servicios);
    const sinServicio = [...rfsDe(componentesDe(/datos/).filter((n) => !esLocal(n)))].filter((c) => !enServicios.has(c));
    if (sinServicio.length) {
      problemas.push(`El subsistema de datos guarda ${sinServicio.join(", ")}, pero ningún componente de servicios los lista: a esos datos se llega por un servicio (${plataforma ? "el servicio de datos de la plataforma" : "el módulo que los implementa"}). Agrégalos ahí.`);
    }
  }

  // Lo que el árbol de navegación muestra en una plataforma debe estar en su presentación, y lo
  // que solo tiene pantallas en otra plataforma no.
  const conPantalla = new Set((arbol?.plataformas || []).flatMap((p) => p.rfs));
  for (const rama of arbol?.plataformas || []) {
    const claves = normalizarTexto(rama.nombre).split(/\s+/).filter((p) => p && !PALABRAS_GENERICAS.has(p));
    const suyos = rama.nombre
      ? presentacion.filter((n) => n.padres.some((p) => claves.some((c) => normalizarTexto(p).includes(c))))
      : presentacion;
    if (!suyos.length) continue; // la presentación no está dividida por plataforma: no se puede comparar
    const listados = rfsDe(suyos);
    const faltan = rama.rfs.filter((c) => !listados.has(c) && (!codigosRF.size || codigosRF.has(c)));
    if (faltan.length) {
      problemas.push(`Según el árbol de navegación, ${rama.nombre || "el sistema"} tiene pantallas para ${faltan.join(", ")}, pero ningún componente de presentación ${rama.nombre ? "de esa plataforma " : ""}los lista.`);
    }
    const ajenos = [...listados].filter((c) => conPantalla.has(c) && !rama.rfs.includes(c));
    if (ajenos.length) {
      problemas.push(`La presentación de ${rama.nombre} lista ${ajenos.join(", ")}, pero según el árbol de navegación esas funciones solo tienen pantallas en otra plataforma: quítalas de ahí.`);
    }
  }

  // Los nombres deben coincidir con los de la arquitectura aprobada (acepta nombres más largos que los contengan).
  if (componentes.length) {
    const textoNorm = normalizarTexto(cuerpo.join("\n"));
    const sinNombre = componentes.filter((c) => !textoNorm.includes(normalizarTexto(c)));
    if (sinNombre.length) {
      problemas.push(`Estos componentes de la arquitectura no aparecen con su nombre exacto: ${sinNombre.join(", ")}. Usa el mismo nombre que en la arquitectura.`);
    }
  }

  // La explicación no puede justificar la presentación por reparto de carga ni afirmar cosas que no se ven.
  if (/(balancear|carga de requerimientos|reparto de (requerimientos|carga)|ultrarr[aá]pid|escalab|robust|mantenib)/i.test(String(explicacion || ""))) {
    problemas.push("La explicación justifica la división por reparto de carga o usa adjetivos de calidad; justifícala por las áreas del negocio y describe solo lo que el diagrama muestra.");
  }

  return problemas;
}

async function generar(contents, usarClaude) {
  const response = await generarContenido({
    usarClaude,
    contents,
    config: { responseMimeType: "application/json" },
  });
  return { response, resultado: JSON.parse(limpiarJson(response.text)) };
}

export async function POST(request) {
  try {
    const {
      nombre,
      descripcion,
      analisis,
      plataformas,
      tecnologias,
      diagramaArquitectura,
      arbolNavegacion,
      indicaciones,
      usarClaude,
    } = await request.json();

    const a = analisis || {};
    const textoRF = formatearRequerimientos(a.requerimientos_funcionales);
    const codigosRF = new Set((String(textoRF).match(/\bRF-?\s?\d+\b/gi) || []).map(normalizarCodigo));
    const arquitectura = resumirArquitectura(diagramaArquitectura);
    const componentes = extraerComponentes(diagramaArquitectura);
    const plataforma = plataformaDeArquitectura(diagramaArquitectura);

    // El árbol dice qué pantallas tiene cada plataforma y qué RF cubren: de ahí salen las áreas
    // de presentación, en vez de repartirlas por intuición.
    const arbol = resumenDelArbol(arbolNavegacion);
    const contextoArbol = arbol
      ? `- Árbol de navegación aprobado (las pantallas reales de cada plataforma; entre paréntesis, los roles de cada sección o los RF que cubre cada pantalla):
${arbol.texto}
${arbol.plataformas
  .filter((p) => p.rfs.length)
  .map((p) => `- RF con pantalla en ${p.nombre || "el sistema"}: ${p.rfs.join(", ")}`)
  .join("\n")}
`
      : arbolNavegacion
      ? `- Árbol de navegación aprobado (úsalo para dividir la presentación en áreas con funciones distintas):\n${arbolNavegacion}\n`
      : "";

    const instrucciones = `
Genera un DIAGRAMA DE SISTEMAS para "${nombre || "el sistema"}", en PlantUML (diagrama WBS).

Un diagrama de sistemas organiza los componentes físicos del sistema en sistemas y subsistemas. Es la expresión física del análisis funcional: muestra de qué está compuesto el sistema internamente, con qué tecnología está hecho cada componente y qué función cumple cada uno. NO es un diagrama de contexto, de flujo, de despliegue ni de capas con comunicación. Debe ser ESPECÍFICO de este sistema: cada componente lleva el nombre del módulo del negocio y su tecnología real; nada que pudiera servir igual para cualquier otro sistema.

CONTEXTO
- Qué hace el sistema: ${descripcion?.trim() || "ver los requerimientos funcionales"}
- Actores:
${formatearActores(a)}
- Plataformas: ${plataformas?.length ? plataformas.join(", ") : "no definidas"}
- Tecnologías elegidas por el cliente: ${tecnologias?.trim() || "no definidas"}
- Componentes y tecnologías: ${
      arquitectura
        ? `los del diagrama de arquitectura aprobado. Es la misma solución vista como composición: usa estos mismos componentes y estas mismas tecnologías, sin cambiarlos ni agregar otros. Única excepción: el componente de presentación se puede dividir en varias áreas según la regla de asignación de requerimientos.\n${arquitectura}`
        : "no hay diagrama de arquitectura; derívalos de los requerimientos y de las tecnologías elegidas."
    }
${contextoArbol}- Funciones que el sistema debe cumplir (requerimientos funcionales):
${textoRF}
- Requerimientos no funcionales:
${formatearRequerimientos(a.requerimientos_no_funcionales, { conCategoria: true })}
${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
- OBJETO (nivel *): un único nodo, el sistema completo, con su nombre real.
- SUBSISTEMAS PRIMARIOS (nivel **): normalmente presentación, servicios, datos e integración; seguridad o infraestructura solo si los requerimientos lo justifican. Omite "integración" si no hay servicios externos.
- SUBSISTEMAS SECUNDARIOS (nivel ***), solo si existen: cuando un primario se divide naturalmente en partes y cada parte agrupa AL MENOS DOS componentes (ej. presentación en Panel Web y App Móvil), marcados con <<secundario>>. Si una parte tendría un solo componente, no la crees: ese componente va directamente bajo el subsistema primario.
- COMPONENTES (un nivel debajo de su subsistema): cada uno con tres líneas: 1) nombre del módulo según el negocio (ej. "Ventas, Caja y POS"; nunca un nombre genérico como "Módulo de servicios"), 2) tecnología con nombre propio, 3) códigos de los requerimientos que cumple. Los servicios de terceros, marcados con <<externo>>.
- Los componentes del subsistema de servicios son los módulos del backend de la arquitectura, uno por módulo, con EXACTAMENTE el mismo nombre. Lo mismo vale para la base de datos, la caché y los servicios externos: no renombres, no traduzcas, no abrevies. Se puede agregar una palabra (ej. "Base de Datos Relacional" si en la arquitectura es "Base de Datos"), pero nunca sustituir una por otra (ej. "Autenticación y Autorización" no reemplaza a "Autenticación y Roles").

TECNOLOGÍAS
- ${tecnologias?.trim() ? `Usa las tecnologías elegidas por el cliente (${tecnologias.trim()}) y las de la arquitectura aprobada.` : "Usa las tecnologías de la arquitectura aprobada; no inventes otras."}
- La tecnología de un componente del backend es la del servidor de su capa (el título del grupo en la arquitectura, ej. Node.js / NestJS), salvo que tenga una propia y más específica (JWT, WebSocket, Redis).
- PROHIBIDO usar categorías como si fueran tecnologías: "Framework Web", "API REST", "Servicio Auth", "Base de datos relacional", "Servidor". La segunda línea de cada componente es siempre un nombre propio (React, PostgreSQL, Redis...).
${plataforma ? `- El backend es la plataforma ${plataforma.nombre}: la tecnología de cada uno de sus servicios es su producto o mecanismo concreto (ej. JWT, PostgREST, WebSocket, Deno / TypeScript), no solo "${plataforma.nombre}".\n` : ""}
REGLAS DE ASIGNACIÓN DE REQUERIMIENTOS
- Cada requerimiento funcional aparece en AL MENOS un componente: el ${plataforma ? "servicio" : "módulo"} que lo implementa. Si hay una pantalla para esa función, también en el componente de presentación correspondiente. Si la función llega al usuario en tiempo real (ej. alertas), su código también va en el componente de presentación que la muestra.
- PRESENTACIÓN: las áreas salen del árbol de navegación. Cada componente de presentación agrupa secciones del árbol de SU plataforma y lista los RF de las pantallas de esas secciones. Si una función tiene pantallas en dos plataformas, su RF va en un componente de cada una: no la dejes solo en una. Si sus pantallas están en una sola plataforma, su RF va solo en la presentación de esa plataforma.
- Un RF sin pantalla en el árbol va en el área donde se usa: guíate por sus actores y por el RF del que depende. Una validación o regla que ocurre al registrar algo va junto a ese registro, no en administración ni en monitoreo.
- Si un RF sin pantalla en el árbol dice en su descripción que aplica en varias plataformas (ej. "en la web o en la aplicación móvil"), va en un componente de presentación de cada una.
- NUNCA muevas un RF a un área que no le corresponde para cumplir el máximo de códigos. Si un área supera el máximo, divídela en dos componentes del mismo tema (ej. "Registro de pedidos" y "Cierre y cobro de pedidos").
- DATOS: la base de datos lista los RF cuyos datos guarda. El almacenamiento local del dispositivo (ej. SQLite) es un componente del subsistema de DATOS, con los requerimientos de uso sin conexión; nunca va en presentación.
- Todo RF que liste un componente de datos del servidor debe estar también en el componente de servicios por el que se llega a esos datos.
${plataforma
  ? `- SERVICIOS de ${plataforma.nombre}: no hay módulos de negocio en el servidor. El servicio de datos (la API por la que los clientes leen y escriben) lista TODOS los RF cuyos datos pasan por él: los mismos que la base de datos, más las reglas que se aplican en el servidor (validaciones, bloqueos, permisos). Autenticación: solo acceso, usuarios y roles. Tiempo real: solo lo que se actualiza en vivo. Funciones: solo lo que ejecutan (ej. notificaciones, generación de archivos, tareas). Un servicio no lista un RF solo por estar relacionado con él.\n`
  : ""}- Los RNF solo en el componente que los satisface (ej. seguridad en Autenticación; uso sin conexión en el almacenamiento local).
- Si el cliente web tiene varias áreas con funciones distintas (ej. punto de venta y administración), crea un componente de presentación por área y reparte los requerimientos entre ellos. Ningún componente de presentación ${plataforma ? "" : "o de servicios "}lista más de ${MAX_CODIGOS} códigos${plataforma ? " (los servicios de la plataforma no tienen ese límite)" : ""}.
- Si un requerimiento funcional no encaja en ningún módulo de la arquitectura, no lo metas en un módulo de otro dominio: déjalo sin asignar. El sistema lo registrará como advertencia.
- Escribe SOLO códigos que existan en la lista de requerimientos. No inventes códigos ni escribas la descripción.

QUÉ NO QUIERO
- No incluyas detalles de código, tablas, endpoints ni pantallas.
- No inventes componentes, tecnologías ni sistemas externos que no estén en el contexto.
- No copies los componentes, tecnologías ni códigos del ejemplo; es de otro sistema y sirve solo para mostrar la sintaxis.
- No escribas el bloque <style>: la aplicación lo agrega.

FORMATO
- PlantUML entre @startwbs y @endwbs. La profundidad la marca el número de asteriscos (*, **, ***, ****); nunca saltes un nivel.
- Nodo de una línea: "** Texto". Componente de tres líneas: "***:Nombre" en una línea, la tecnología en la siguiente y "códigos;" en la última (el ; cierra el nodo). El estereotipo va al final: "Texto <<secundario>>" o "códigos; <<externo>>".
- Máximo ${MAX_NODOS} nodos en total: si hay más componentes, agrupa los afines en uno (ej. "Partes y bitácora").
- Textos cortos, sin párrafos.
- En "explicacion", de 3 a 5 líneas cortas (una idea por línea, separadas con \\n) sobre cómo se divide el sistema y qué subsistema sostiene las funciones principales. Solo afirma lo que el diagrama muestra y no atribuyas a un subsistema una función cuyos requerimientos no estén en sus componentes: no uses adjetivos de calidad (ultrarrápido, escalable, robusto) ni menciones algo que no esté dibujado (ej. "adaptado a las sucursales"). Justifica la división de la presentación por las áreas del negocio (ej. caja, inventario, administración), nunca por reparto de requerimientos o de carga. Describe el backend con el estilo de la arquitectura aprobada: si es una sola API dividida en módulos, no uses palabras como "descentraliza", "distribuido" o "microservicios".

VERIFICACIÓN ANTES DE RESPONDER
1. Hay un solo nodo de nivel * y ningún salto de nivel.
2. No pasa de ${MAX_NODOS} nodos.
3. Ningún componente usa una categoría genérica como tecnología.
4. Todos los RF aparecen al menos una vez (salvo los que ningún módulo de la arquitectura cubre) y no hay códigos inventados.
5. Los componentes y tecnologías coinciden con la arquitectura aprobada.
6. La presentación está dividida por áreas según el árbol de navegación, cada plataforma lista los RF de sus propias pantallas y ningún componente de presentación lista más de ${MAX_CODIGOS} códigos.
7. Cada módulo, la base de datos, la caché y los servicios externos llevan el mismo nombre que en la arquitectura.
8. Cada nodo <<secundario>> agrupa al menos dos componentes.
9. El almacenamiento local está en datos, y todo RF de la base de datos está también en un componente de servicios.

Ejemplo de sintaxis válida (sistema ajeno, no copiar sus componentes ni códigos):
${EJEMPLO}

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional ni bloques de código:
{
  "diagrama_plantuml": "código PlantUML completo aquí, como un solo string",
  "explicacion": "línea 1\\nlínea 2\\nlínea 3"
}
`;

    const inicial = await generar(instrucciones, usarClaude);
    let resultado = inicial.resultado;
    let response = inicial.response;
    let diagrama = limpiarPlantuml(resultado.diagrama_plantuml);
    const codigosRNF = new Set((a.requerimientos_no_funcionales || []).map((r) => normalizarCodigo(r.codigo)));
    const coherencia = { plataforma, arbol, codigosRNF };
    let problemas = validarDiagrama(diagrama, codigosRF, componentes, resultado.explicacion, coherencia);
    let costo = response.costoUsd;

    // Un solo reintento: se le muestran a la IA los problemas concretos y su diagrama anterior.
    if (problemas.length) {
      try {
        const reintento = await generar(
          `${instrucciones}

TU RESPUESTA ANTERIOR NO CUMPLIÓ ESTAS REGLAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Diagrama anterior:
${diagrama}

Corrígelo cumpliendo TODAS las reglas y responde de nuevo con el mismo JSON.`,
          usarClaude
        );
        const diagramaNuevo = limpiarPlantuml(reintento.resultado.diagrama_plantuml);
        const problemasNuevos = validarDiagrama(diagramaNuevo, codigosRF, componentes, reintento.resultado.explicacion, coherencia);
        costo = sumar(costo, reintento.response.costoUsd);
        if (problemasNuevos.length <= problemas.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          diagrama = diagramaNuevo;
          problemas = problemasNuevos;
        }
      } catch {
        // Si el reintento falla, se conserva el primer resultado.
      }
    }

    return NextResponse.json({
      ...resultado,
      diagrama_plantuml: aplicarEstilo(diagrama),
      advertencias: problemas,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}