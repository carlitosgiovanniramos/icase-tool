import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { generarContenido } from "./gemini.js";
import { sumarCosto } from "./jsonIA.js";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "./analisis.js";
import { leerGuia } from "./estructura.js";
import { archivosDeFrontend, capaDe } from "./archivosFrontend.js";
import { clasesDeCss, variablesDeCss, clasesInexistentes } from "./baseVisual.js";

// Paso "Frontend" (sexto de la Implementación): escribe la web (Next.js o React) y la app (Flutter)
// archivo por archivo, por capas. Cada página se escribe a partir de su pantalla del prototipo (HTML y
// CSS aprobados) y de las operaciones del contrato que usan sus controles. La prueba compila la
// imagen en Docker (runner, operación "compilar") y corrige con el error el archivo que falló.
// Solo se usa en el servidor.

const LIMITE_RUTA_MS = 280_000;
const MAX_PANTALLA = 70_000; // caracteres del HTML de la primera pantalla de un archivo
const MAX_PANTALLA_EXTRA = 20_000; // de las demás (las variantes de una ruta dinámica)
const CODIGO = /\.(js|jsx|mjs|ts|tsx|dart|json|yaml)$/;

// Archivos fijos de la pieza (plantillas/<pieza>/archivos y, con Supabase, archivos.supabase): el
// código generado los importa y no los reescribe.
async function leerFijos(pieza, conSupabase) {
  const raiz = path.join(process.cwd(), "plantillas", pieza);
  const fijos = [];
  for (const carpeta of ["archivos", ...(conSupabase ? ["archivos.supabase"] : [])]) {
    const base = path.join(raiz, carpeta);
    if (!existsSync(base)) continue;
    for (const entrada of await readdir(base, { recursive: true, withFileTypes: true })) {
      if (!entrada.isFile()) continue;
      const completo = path.join(entrada.parentPath ?? entrada.path, entrada.name);
      const ruta = path.relative(base, completo).split(path.sep).join("/");
      fijos.push({ ruta, contenido: CODIGO.test(ruta) ? await readFile(completo, "utf8") : null });
    }
  }
  return fijos;
}

function limpiarCodigo(texto) {
  const bloque = String(texto || "").match(/```[a-z]*\n([\s\S]*?)```/i);
  return (bloque ? bloque[1] : String(texto || "")).trim() + "\n";
}

// --- Revisión determinista --------------------------------------------------------------------

const EXTENSIONES_WEB = ["", ".js", ".jsx", ".mjs", "/index.js", "/index.jsx"];
const MODULOS_NODE = /^(node:|fs$|path$|crypto$|url$|stream$|buffer$|util$|os$)/;

function dependenciasDe(anteriores, carpeta) {
  const paquete = anteriores.find((a) => a.ruta === `${carpeta}/package.json`)?.contenido;
  if (paquete) {
    try {
      const json = JSON.parse(paquete);
      return new Set(Object.keys({ ...json.dependencies, ...json.devDependencies }));
    } catch { return null; }
  }
  const pubspec = anteriores.find((a) => a.ruta === `${carpeta}/pubspec.yaml`)?.contenido;
  if (pubspec) {
    const seccion = pubspec.split(/\n(?=\S)/).filter((b) => /^(dependencies|dev_dependencies):/.test(b)).join("\n");
    return new Set([...seccion.matchAll(/^\s{2}([a-z_][a-z0-9_]*):/gm)].map((m) => m[1]));
  }
  return null;
}

export function validarFrontend(contenido, ctx) {
  const { archivo, existentes, anteriores, carpeta } = ctx;
  const problemas = [];
  if (!contenido.trim()) return ["El archivo está vacío."];
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/.test(contenido)) problemas.push("Tiene una clave o un JWT escrito en el código: va en una variable de entorno.");
  const deps = dependenciasDe(anteriores, carpeta);

  if (archivo.ruta.endsWith("package.json")) {
    try {
      const json = JSON.parse(contenido);
      for (const d of ["next", "react", "react-dom"]) if (archivo.pieza === "nextjs" && !json.dependencies?.[d]) problemas.push(`Falta la dependencia ${d}.`);
      if (!json.scripts?.build) problemas.push("Falta el script build.");
    } catch { problemas.push("package.json no es JSON válido."); }
    return problemas;
  }
  if (archivo.ruta.endsWith("pubspec.yaml")) {
    if (!/^name:\s*[a-z_][a-z0-9_]*/m.test(contenido)) problemas.push("pubspec.yaml necesita name en minúsculas y guiones bajos.");
    if (!/^\s{2}flutter:\s*\n\s{4}sdk:\s*flutter/m.test(contenido)) problemas.push("pubspec.yaml debe depender de flutter (sdk: flutter).");
    return problemas;
  }

  if (/\.(js|jsx|mjs)$/.test(archivo.ruta)) {
    const directorio = path.posix.dirname(archivo.ruta);
    for (const [, origen] of contenido.matchAll(/(?:import\s[^'"]*?from\s*|import\s*\(|require\()\s*["']([^"']+)["']/g)) {
      if (origen.startsWith(".")) {
        const base = path.posix.normalize(path.posix.join(directorio, origen));
        if (!EXTENSIONES_WEB.some((e) => existentes.has(base + e))) problemas.push(`Importa "${origen}", que no existe en la estructura ni en los archivos fijos.`);
      } else if (origen.startsWith("@/")) {
        if (!existentes.has(`${carpeta}/jsconfig.json`)) problemas.push(`Usa el alias "${origen}" sin jsconfig.json: usa rutas relativas.`);
      } else if (deps && !MODULOS_NODE.test(origen)) {
        const paquete = origen.startsWith("@") ? origen.split("/").slice(0, 2).join("/") : origen.split("/")[0];
        if (!deps.has(paquete)) problemas.push(`Importa el paquete ${paquete}, que no está en package.json.`);
      }
    }
    // La interfaz debe verse como el prototipo: solo clases del CSS global (que es el del prototipo) o definidas en su <style>.
    if (ctx.prototipoBase?.css && archivo.tipo !== "estilo") {
      const sueltas = clasesInexistentes(contenido, ctx.prototipoBase.css);
      if (sueltas.length) problemas.push(`Usa clases que no existen en los estilos globales del prototipo ni en su <style>: ${sueltas.slice(0, 10).join(", ")}${sueltas.length > 10 ? "..." : ""}. Usa las clases del prototipo y no inventes otras.`);
    }
    const usaCliente = /\b(useState|useEffect|useRef|useRouter|usePathname|useCallback|useMemo)\s*\(|\bon(Click|Change|Submit)=\{/.test(contenido);
    if (usaCliente && !/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(contenido)) problemas.push('Usa estado o eventos del navegador: la primera línea debe ser "use client".');
    if (/\/(page|layout)\.jsx?$/.test(archivo.ruta) && !/export\s+default/.test(contenido)) problemas.push("Una página o layout debe tener export default.");
    if (/\buse client\b/.test(contenido) && /export\s+(const\s+)?metadata\b/.test(contenido)) problemas.push("Un componente de cliente no puede exportar metadata.");
  }

  if (archivo.ruta.endsWith(".dart")) {
    const app = anteriores.find((a) => a.ruta === `${carpeta}/pubspec.yaml`)?.contenido?.match(/^name:\s*([a-z_][a-z0-9_]*)/m)?.[1];
    for (const [, origen] of contenido.matchAll(/^import\s+'([^']+)'/gm)) {
      if (origen.startsWith("package:")) {
        const [paquete, ...resto] = origen.slice(8).split("/");
        if (app && paquete === app) {
          if (!existentes.has(`${carpeta}/lib/${resto.join("/")}`)) problemas.push(`Importa "${origen}", que no existe en la estructura.`);
        } else if (deps && paquete !== "flutter" && paquete !== "flutter_test" && !deps.has(paquete)) problemas.push(`Importa el paquete ${paquete}, que no está en pubspec.yaml.`);
      } else if (!origen.startsWith("dart:")) {
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(archivo.ruta), origen));
        if (!existentes.has(base)) problemas.push(`Importa "${origen}", que no existe en la estructura.`);
      }
    }
  }
  return [...new Set(problemas)];
}

// --- Prompt ---------------------------------------------------------------------------------

const htmlParaPrompt = (html, maximo) => {
  const texto = String(html || "");
  return texto.length > maximo ? `${texto.slice(0, maximo)}\n<!-- recortado: ${texto.length - maximo} caracteres más -->` : texto;
};

// Qué estilos y qué armazón debe tener la web: los del prototipo aprobado, no unos inventados.
function referenciaVisual(ctx) {
  const { plataforma, archivo, prototipoBase } = ctx;
  if (plataforma !== "web" || !prototipoBase?.css || archivo.tipo === "estilo") return "";
  const clases = [...clasesDeCss(prototipoBase.css)].sort();
  const variables = variablesDeCss(prototipoBase.css);
  const esArmazon = archivo.tipo === "navegacion" || /(layout|menu|armazon)/i.test(archivo.ruta);
  return `REFERENCIA VISUAL (la aplicación debe verse IGUAL que el prototipo aprobado)
- Los estilos globales de la web son el CSS compartido del prototipo, copiado tal cual. Clases disponibles: ${clases.join(", ")}.
- Variables disponibles: ${variables.join(", ")}.
- Usa SOLO esas clases. Si una pantalla necesita algo propio, defínelo en un <style> del componente usando las variables var(--...). No inventes clases ni variables (no existen --color-..., --radio-sm ni similares) y no escribas colores ni radios propios.
${esArmazon && prototipoBase.menus?.length ? `- ARMAZÓN: la aplicación tiene una BARRA LATERAL a la izquierda, no una barra superior. Estructura exacta: <div className="app"><aside className="barra">menú y sesión</aside><main className="contenido"><div className="contenido-interno">{children}</div></main></div>. La ruta de acceso ("/") no lleva barra lateral: solo <main className="acceso">. El menú muestra solo las entradas del rol de la persona (según el árbol de navegación), con la entrada de la ruta actual con className="activo", y abajo el bloque className="sesion" con el rol y "Cerrar sesión". Así es el armazón en el prototipo (un menú por rol; conserva su estructura, sus clases y sus iconos):
${prototipoBase.menus.map((m) => `  ${m}`).join("\n")}
` : ""}
`;
}

function armarPrompt(ctx) {
  const { archivo, plataforma, plan, previos, fijos, guia, pantallas, operaciones, controles, analisis, arbol, nombre, descripcion, indicaciones, error, actual, instruccion } = ctx;
  const requerimientos = (analisis?.requerimientos_funcionales || []).concat(analisis?.requerimientos_no_funcionales || []).filter((r) => (archivo.requerimientos || []).includes(r.codigo));
  const web = plataforma === "web";
  return `Eres un desarrollador ${web ? "web (Next.js, JavaScript)" : "móvil (Flutter, Dart)"}. Escribe el archivo "${archivo.ruta}" del sistema "${nombre}" (${descripcion || ""}). El diseño, la base de datos, el contrato de API y el backend ya están aprobados y funcionando.

CONTEXTO
- Archivo: ${JSON.stringify(archivo)}
- Actores:
${formatearActores(analisis || {})}
- Requerimientos que cumple:
${formatearRequerimientos(requerimientos)}
- Guía de la pieza (reglas obligatorias):
${guia}
- Archivos fijos de la pieza (no se reescriben; impórtalos si los necesitas):
${fijos.map((f) => `--- ${f.ruta}${f.contenido ? `\n${f.contenido}` : " (sin código)"}`).join("\n")}
- Todos los archivos de esta plataforma (rutas exactas para importar): ${plan.map((a) => `${a.ruta} [${a.tipo}]: ${a.proposito}`).join(" | ")}
${previos.length ? `- Ya escritos (respeta sus nombres y exportaciones):\n${previos.map((p) => `--- ${p.ruta}\n${p.contenido}`).join("\n")}` : ""}
- Operaciones del contrato que usa este archivo (con Supabase: tabla = supabase.from(recurso), rpc = supabase.rpc(recurso, argumentos), edge = supabase.functions.invoke(recurso), auth = supabase.auth): ${JSON.stringify(operaciones)}
${controles.length ? `- Controles de su pantalla y lo que hace cada uno según el contrato: ${JSON.stringify(controles)}` : ""}
${arbol && ["navegacion", "pagina"].includes(archivo.tipo) ? `- Árbol de navegación aprobado:\n${arbol}` : ""}
${pantallas.length ? `- Pantalla${pantallas.length > 1 ? "s" : ""} del prototipo aprobado que implementa (HTML con su CSS):\n${pantallas.map((p, i) => `--- ${p.nombre} (${p.plataforma})\n${htmlParaPrompt(p.html, i ? MAX_PANTALLA_EXTRA : MAX_PANTALLA)}`).join("\n")}` : ""}
${referenciaVisual(ctx)}${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
${web ? `- Si es una página o un componente de pantalla: la MISMA interfaz del prototipo (estructura, textos, colores y estilos). Reutiliza las clases de los estilos globales; el CSS propio de la pantalla va en un <style> dentro del componente. Los scripts del prototipo pasan a estado y eventos de React.
- Pistas del prototipo: un botón o formulario con data-operacion="Clase.operacion" ejecuta esa operación (úsala para elegir la operación del contrato que le corresponde) y un campo con name="atributo" guarda ese atributo de la clase (úsalo como nombre del campo y de la columna). Los modales (<input class="modal-chk"> con sus <label for>), los atributos onsubmit y onclick, data-pantalla y parent.postMessage existen solo para recorrer el prototipo: NO se copian. Se implementan con estado de React (useState para abrir y cerrar cada modal y mostrar el mensaje de resultado), onSubmit y la navegación de la app. El aviso .toast aparece tras el resultado real de la operación; los .vacio con hidden se muestran cuando no hay datos o resultados; el aviso de credenciales incorrectas, cuando el inicio de sesión falla; la validación de los campos (required, min, max, pattern) se conserva.
- Los datos de ejemplo del prototipo se reemplazan por datos reales: cada control hace lo que dice el contrato, con supabaseNavegador() del archivo fijo (lib/supabase/navegador.js). Muestra carga, vacío y error con mensajes breves.
- Importaciones con rutas relativas exactas a los archivos de la lista; los componentes con estado o eventos empiezan con "use client".
- Sesión: quien cierra sesión (menú) o ya no tiene sesión (protección de rutas) siempre acaba en la ruta de acceso. Tras cerrarSesion() se llama router.replace("/") y router.refresh(); la protección de rutas redirige con router.replace("/") apenas no hay sesión y escucha onAuthStateChange para hacerlo también cuando la sesión se cierra desde otro lugar. Nunca se deja un texto de "redirigiendo" sin que la redirección ocurra, ni el menú lateral dibujado sin sesión.
- Cada componente, página y layout exporta su función por defecto (export default) y se importa así; los servicios de lib/ exportan funciones con nombre.
- Si es package.json: dependencias exactas de las librerías del stack que usan los archivos de la lista y los scripts dev, build y start.
- Si es el estilo global: las variables, tipografías y clases comunes de las pantallas del prototipo.
- Si es el menú o la navegación principal: al final, el enlace "Documentación" que abre process.env.NEXT_PUBLIC_DOCS_URL en una pestaña nueva (el sitio de documentación del sistema); si la variable está vacía, no se muestra.` : `- Si es una pantalla: la MISMA interfaz del prototipo móvil, con widgets de Flutter y los colores del prototipo en el tema.
- Pistas del prototipo: data-operacion="Clase.operacion" indica la operación que ejecuta cada botón o formulario, y name="atributo" el atributo de la clase que guarda cada campo. Los trucos solo para recorrer el prototipo (modales con casilla oculta, onsubmit, data-pantalla, postMessage) no se copian: se implementan con el estado y la navegación de Flutter.
- Los datos de ejemplo se reemplazan por datos reales con Supabase.instance.client según el contrato; estados de carga, vacío y error.
- Importaciones package:<nombre de la app>/... exactas a los archivos de la lista.
- Si es pubspec.yaml: nombre de la app, sdk ">=3.11.0 <4.0.0" y las dependencias del stack que usan los archivos.`}
QUÉ NO QUIERO
- Archivos, componentes, rutas, tablas, funciones u operaciones que no estén en el contexto.
- Claves escritas en el código, datos de ejemplo fijos en lugar de los de la base, ni pantallas distintas a las del prototipo.
- Código de demostración del prototipo: casillas ocultas para modales, onsubmit u onclick en línea, data-pantalla o postMessage.
- TypeScript en la web, ni middleware.js (en Next.js 16 es proxy.js).
FORMATO
Solo el contenido del archivo, sin explicaciones ni bloques de markdown.${error ? `

LA COMPILACIÓN FALLÓ CON ESTE ERROR (corrige este archivo para que compile):
${String(error).slice(-6000)}

Contenido actual del archivo:
${actual || ""}` : ""}${instruccion && actual ? `

TAREA: modifica el archivo actual según la instrucción del usuario. Conserva lo que la instrucción no cambia; las reglas de arriba siguen valiendo. Responde con el archivo completo.

Instrucción del usuario:
${instruccion}

Contenido actual del archivo:
${actual}` : ""}`;
}

// cuerpo: { nombre, descripcion, analisis, stack, estructura: { archivos }, plataforma, contrato:
//   { operaciones, acciones }, pantallas: [{ nombre, plataforma, html }], arbol, archivo,
//   anteriores: [{ ruta, contenido }], indicaciones, usarClaude }; para corregir, { error, actual }; y para
//   modificarlo a pedido del usuario, { instruccion, actual }.
export async function generarArchivoFrontend(cuerpo) {
  const inicio = Date.now();
  const { estructura, plataforma, archivo: ruta, anteriores = [], usarClaude, contrato, stack } = cuerpo;
  const plan = archivosDeFrontend(estructura, plataforma);
  const archivo = plan.find((a) => a.ruta === ruta);
  if (!archivo) throw new Error(`"${ruta}" no es un archivo del frontend (${plataforma}) en la estructura aprobada.`);
  const carpeta = ruta.split("/")[0];
  const fijos = await leerFijos(archivo.pieza, (stack?.piezas || []).some((p) => p.pieza === "supabase"));

  // Operaciones: las que usan los controles de sus pantallas y las de sus requerimientos.
  const pantallas = (cuerpo.pantallas || []).filter((p) => (archivo.pantallas || []).includes(p.nombre));
  const acciones = (contrato?.acciones || []).filter((a) => (archivo.pantallas || []).includes(a.pantalla));
  const idsDeControles = new Set(acciones.flatMap((a) => a.operaciones || []));
  const operaciones = (contrato?.operaciones || [])
    .filter((op) => idsDeControles.has(op.id) || (op.requerimientos || []).some((r) => (archivo.requerimientos || []).includes(r)))
    .map(({ id, nombre, tipo, recurso, metodo, roles, descripcion, entrada, salida }) => ({ id, nombre, tipo, recurso, metodo, roles, descripcion, entrada, salida }));
  const controles = [...new Map(acciones.map((a) => [`${a.pantalla}|${a.nombre}`, { pantalla: a.pantalla, control: a.nombre, tipo: a.tipo, operaciones: a.operaciones, motivo: a.motivo }])).values()];

  const ctx = {
    ...cuerpo,
    archivo,
    plan,
    carpeta,
    fijos: fijos.map((f) => ({ ruta: `${carpeta}/${f.ruta.replace(/^[^/]+\//, "")}`, contenido: f.contenido })),
    guia: await leerGuia(archivo.pieza),
    pantallas,
    operaciones,
    controles,
    // Contexto de las capas anteriores (no las de la misma capa, que se generan a la vez).
    previos: anteriores.filter((a) => plan.some((p) => p.ruta === a.ruta && capaDe(p) < capaDe(archivo))),
    anteriores,
    existentes: new Set([...plan.map((a) => a.ruta), ...fijos.map((f) => `${carpeta}/${f.ruta.replace(/^[^/]+\//, "")}`)]),
  };

  // El CSS global de la web es el del prototipo, copiado tal cual por el código: así los colores, las esquinas y los
  // componentes son los aprobados y no una versión que invente la IA.
  if (plataforma === "web" && archivo.tipo === "estilo" && cuerpo.prototipoBase?.css && !cuerpo.error && !cuerpo.instruccion) {
    const contenido = `/* Estilos globales: copia del CSS compartido del prototipo aprobado. Para cambiarlos, cambia el prototipo y regenera el frontend. */
${cuerpo.prototipoBase.css}

/* Utilidades de la aplicación (estados que el prototipo estático no tiene) */
.cargando { padding: 32px; text-align: center; color: var(--texto-suave); }
`;
    return { ruta, contenido, advertencias: [], modelo_ia: "prototipo", costo_ia: 0 };
  }

  let costo;
  const generar = async (extra = "", presupuestoMs) => {
    const response = await generarContenido({ usarClaude, contents: [{ text: armarPrompt(ctx) + extra }], ...(presupuestoMs ? { presupuestoMs } : {}) });
    costo = sumarCosto(costo, response.costoUsd);
    const contenido = limpiarCodigo(response.text);
    return { response, contenido, problemas: validarFrontend(contenido, ctx) };
  };

  let resultado = await generar();
  const restante = LIMITE_RUTA_MS - (Date.now() - inicio);
  if (resultado.problemas.length && restante > 60_000) {
    try {
      const reintento = await generar(`\n\nTU RESPUESTA ANTERIOR TIENE ESTOS PROBLEMAS:\n${resultado.problemas.map((p) => `- ${p}`).join("\n")}\n\nRespuesta anterior:\n${resultado.contenido}\n\nCorrígela y responde de nuevo con el archivo completo.`, restante - 10_000);
      if (reintento.problemas.length <= resultado.problemas.length) resultado = reintento;
    } catch {
      // Si el reintento falla, se conserva el primer resultado con sus advertencias.
    }
  }
  return { ruta, contenido: resultado.contenido, advertencias: resultado.problemas, modelo_ia: resultado.response.modelVersion, costo_ia: costo };
}
