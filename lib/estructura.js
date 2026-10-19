import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { generarContenido } from "./gemini.js";
import { leerJson, normalizarTexto, sumarCosto } from "./jsonIA.js";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "./analisis.js";
import { armarProyecto, catalogo } from "./implementacion.js";
import { componentesDeSistema, resolverComponentes } from "./stack.js";

// Paso "Estructura de carpetas" (segundo de la Implementación): la lista completa de archivos que
// hay que escribir en cada pieza del stack aprobado, antes de escribir código. Se genera una pieza
// por llamada, en paralelo, cada una solo con lo que le corresponde (la web sus pantallas, la app
// las suyas, la base de datos el ER). El código valida la cobertura: cada pantalla del prototipo,
// cada tabla del ER, cada módulo del diagrama de sistemas y cada RF quedan en algún archivo.
// Solo se usa en el servidor.

export const TIPOS_ARCHIVO = [
  "pagina",
  "componente",
  "navegacion",
  "servicio",
  "modelo",
  "migracion",
  "datos",
  "funcion",
  "ruta",
  "controlador",
  "middleware",
  "configuracion",
  "estilo",
  "otro",
];
const ORIGENES = ["prototipo", "arbol", "er", "clases", "sistemas", "requerimientos", "casos_uso", "stack"];
const RUTA_VALIDA = /^[\w\-.\[\]()@ /]+$/;
const LIMITE_RUTA_MS = 280_000;

const plataformaDePantalla = (p) => (/m[oó]vil|mobile|android|\bios\b/i.test(p || "") ? "movil" : "web");
const igual = (a, b) => normalizarTexto(a) === normalizarTexto(b);

// Entidades del diagrama entidad-relación (Mermaid erDiagram): las que tienen bloque de atributos y
// las que solo aparecen en una relación.
const CARDINALIDAD = "(?:\\|\\||\\|o|o\\||\\}o|o\\{|\\}\\||\\|\\{)";
const RELACION = new RegExp(`^([A-Za-z_]\\w*)\\s*${CARDINALIDAD}(?:--|\\.\\.)${CARDINALIDAD}\\s*([A-Za-z_]\\w*)`);
export function entidadesER(codigo) {
  const nombres = new Set();
  for (const linea of String(codigo || "").split("\n")) {
    const t = linea.trim();
    if (!t || t.startsWith("%%")) continue;
    const bloque = t.match(/^([A-Za-z_]\w*)\s*\{/);
    if (bloque && bloque[1] !== "erDiagram") nombres.add(bloque[1]);
    const relacion = t.match(RELACION);
    if (relacion) {
      nombres.add(relacion[1]);
      nombres.add(relacion[2]);
    }
  }
  return [...nombres];
}

async function leerGuia(pieza) {
  const archivo = path.join(process.cwd(), "plantillas", pieza, "README.md");
  return existsSync(archivo) ? readFile(archivo, "utf8") : "";
}

// --- Prompt ------------------------------------------------------------------------------

const FORMATO = `{
  "archivos": [
    {
      "ruta": "carpeta de la pieza/... (ruta relativa a la raíz del proyecto)",
      "tipo": "${TIPOS_ARCHIVO.join(" | ")}",
      "proposito": "qué hace el archivo, una frase",
      "requerimientos": ["RF03"],
      "origen": "${ORIGENES.join(" | ")} (artefacto del diseño del que sale)",
      "pantallas": ["nombre exacto de cada pantalla del prototipo que cubre, si es una página"],
      "tablas": ["nombre exacto de cada entidad del ER que crea, si es una migración"],
      "modulo": "nombre exacto del componente del diagrama de sistemas que implementa, o vacío"
    }
  ],
  "notas": "1 a 3 líneas: cómo se organiza la pieza"
}`;

function armarPrompt(ctx) {
  const { ficha, carpeta, nombre, descripcion, analisis, stack, guia, fijas, pantallas, entidades, modulos, arbol, diagramaER, diagramaClases, indicaciones, actual, instruccion } = ctx;
  const librerias = (stack.librerias || []).filter((l) => l.pieza === ficha.nombre).map((l) => `${l.nombre} (${l.motivo})`);
  // Decisiones del stack aprobado sobre cada elemento del diseño (ej. qué cliente usa Realtime).
  const decisiones = (stack.elementos || []).filter((e) => e.detalle).map((e) => `- ${e.elemento}: ${e.detalle}`);
  const externos = (stack.externos || []).map((x) => `${x.servicio}: ${x.variable} (lo usan ${x.usadoPor.join(", ")})`);
  const piezas = (stack.piezas || []).map((p) => p.pieza + (p.opcionales?.length ? ` (${p.opcionales.join(", ")})` : "")).join(", ");

  const bloques = [];
  if (pantallas.length) {
    bloques.push(`Pantallas del prototipo de esta plataforma (cada una debe quedar cubierta por una página):
${pantallas.map((p) => `- "${p.nombre}" | ${(p.rfs || []).join(", ") || "sin RF"}`).join("\n")}

Árbol de navegación aprobado (Mermaid; usa la parte de esta plataforma para las rutas y el menú):
${arbol || "(no hay)"}`);
  }
  if (entidades.length) {
    bloques.push(`Diagrama entidad-relación aprobado (cada entidad debe quedar creada por una migración):
${diagramaER}

Diagrama de clases aprobado:
${diagramaClases || "(no hay)"}`);
  } else if (diagramaClases) {
    bloques.push(`Entidades del modelo de datos (para los tipos y el acceso a datos): ${entidadesER(diagramaER).join(", ") || "(no hay)"}`);
  }

  const tarea = actual
    ? `TAREA: modifica la lista actual de archivos de esta pieza según la instrucción del usuario. Conserva lo que la instrucción no cambia. Si la instrucción no tiene que ver con esta pieza, devuelve la lista tal cual. Las reglas siguen valiendo.

Instrucción del usuario:
${instruccion}

Lista actual:
${JSON.stringify(actual)}`
    : "TAREA: planifica la lista completa de archivos de esta pieza.";

  return `Eres un arquitecto de software. Vas a planificar la estructura de archivos de la pieza "${ficha.titulo}" (carpeta ${carpeta}/) de un sistema cuyo diseño y stack técnico ya están aprobados. Todavía no se escribe código: solo la lista de archivos con su propósito.

CONTEXTO
Sistema: ${nombre}
${descripcion || ""}

Stack aprobado: ${piezas}${stack.altaDisponibilidad ? " + alta disponibilidad del servidor web" : ""}
Librerías de esta pieza: ${librerias.join("; ") || "(ninguna)"}
Servicios externos del sistema: ${externos.join("; ") || "(ninguno)"}

Cómo implementa el stack aprobado cada elemento del diseño (respeta estas decisiones):
${decisiones.join("\n") || "(sin detalle)"}

Guía de la pieza (qué se genera dentro de ella y reglas que el código debe cumplir):
${guia}

Archivos fijos de la pieza, que ya existen (NO los incluyas): ${fijas.join(", ") || "(ninguno)"}

Componentes del diagrama de sistemas que implementa esta pieza (cada uno debe quedar en "modulo" de algún archivo):
${modulos.map((m) => `- "${m.nombre}" (${m.tecnologia}): ${m.requerimientos.join(", ")}`).join("\n") || "(ninguno)"}

Actores:
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis?.requerimientos_funcionales || [])}

Requerimientos no funcionales:
${formatearRequerimientos(analisis?.requerimientos_no_funcionales || [], { conCategoria: true })}

${bloques.join("\n\n")}

QUÉ DEBE MOSTRAR
- Todos los archivos que hay que escribir dentro de ${carpeta}/ para implementar esta pieza, siguiendo su guía: páginas o pantallas, navegación, componentes reutilizados, acceso a datos, servicios, modelos, migraciones o funciones, según la pieza.${pantallas.length ? `
- Cada pantalla del prototipo listada arriba, cubierta por un archivo de tipo "pagina", con su nombre exacto en "pantallas". Pantallas que solo cambian por un parámetro (por ejemplo, el tipo de emergencia) pueden compartir una página con ruta dinámica: lista en "pantallas" todas las que cubre.
- Rutas y menú según el árbol de navegación de esta plataforma.` : ""}${entidades.length ? `
- Cada entidad del ER creada por una migración, con su nombre exacto en "tablas". Agrupa en pocas migraciones por área, en orden de dependencia (numeradas: 0001_..., 0002_...), con sus políticas de acceso por rol.` : ""}
- Cada componente del diagrama de sistemas listado arriba, con su nombre exacto en "modulo" de los archivos que lo implementan.
- En "requerimientos", los códigos RF/RNF que implementa el archivo (solo de las listas de arriba).
${formatearIndicaciones(indicaciones)}
QUÉ NO QUIERO
- Archivos fijos de la pieza, archivos fuera de ${carpeta}/ ni carpetas que crean las herramientas (node_modules/, .next/, build/, android/, ios/, web/ de Flutter).
- Pantallas, tablas, módulos o requerimientos que no estén en el diseño.
- Funciones que ningún requerimiento pide (tableros, métricas, gráficos, chat, reportes, tiempo real...), aunque una pantalla del prototipo las sugiera o una tecnología las permita: cada página, componente, servicio o función implementa algún requerimiento de la lista.
- Código: solo la lista de archivos.

FORMATO
${tarea}

Responde solo con este JSON:
${FORMATO}`;
}

// --- Validación --------------------------------------------------------------------------

// Limpia los archivos de una pieza y devuelve los problemas para la IA y la cobertura.
export function validarPieza(resultado, ctx) {
  const { ficha, carpeta, fijas, pantallas, entidades, modulos, codigos } = ctx;
  const problemas = [];
  const fijasSet = new Set(fijas);
  const archivos = [];
  const vistos = new Set();

  for (const a of Array.isArray(resultado?.archivos) ? resultado.archivos : []) {
    const ruta = String(a?.ruta || "").trim().replace(/\\/g, "/").replace(/^\.?\//, "");
    if (!ruta) continue;
    if (!ruta.startsWith(`${carpeta}/`)) {
      problemas.push(`"${ruta}" está fuera de la carpeta de la pieza (${carpeta}/).`);
      continue;
    }
    if (ruta.split("/").includes("..") || !RUTA_VALIDA.test(ruta)) {
      problemas.push(`"${ruta}" no es una ruta válida.`);
      continue;
    }
    if (fijasSet.has(ruta)) {
      problemas.push(`"${ruta}" es un archivo fijo de la pieza: no lo incluyas.`);
      continue;
    }
    if (vistos.has(ruta)) continue;
    vistos.add(ruta);

    const requerimientos = (Array.isArray(a.requerimientos) ? a.requerimientos : []).map((r) => String(r).trim().toUpperCase());
    const inexistentes = requerimientos.filter((r) => !codigos.has(r));
    if (inexistentes.length) problemas.push(`"${ruta}" cita requerimientos que no existen: ${inexistentes.join(", ")}.`);

    const nombresPantallas = (Array.isArray(a.pantallas) ? a.pantallas : [])
      .map((n) => pantallas.find((p) => igual(p.nombre, n))?.nombre || null)
      .filter(Boolean);
    const nombresTablas = (Array.isArray(a.tablas) ? a.tablas : [])
      .map((n) => entidades.find((e) => igual(e, n)) || null)
      .filter(Boolean);
    const modulo = modulos.find((m) => igual(m.nombre, a.modulo))?.nombre || "";

    archivos.push({
      ruta,
      pieza: ficha.nombre,
      tipo: TIPOS_ARCHIVO.includes(a.tipo) ? a.tipo : "otro",
      proposito: String(a.proposito || "").trim(),
      requerimientos: requerimientos.filter((r) => codigos.has(r)),
      origen: ORIGENES.includes(a.origen) ? a.origen : "requerimientos",
      ...(nombresPantallas.length ? { pantallas: [...new Set(nombresPantallas)] } : {}),
      ...(nombresTablas.length ? { tablas: [...new Set(nombresTablas)] } : {}),
      ...(modulo ? { modulo } : {}),
    });
  }

  if (!archivos.length) problemas.push(`No se planificó ningún archivo para ${ficha.titulo}.`);

  // Toda la lógica responde a un requerimiento: un componente, servicio o función sin ninguno (o
  // una página que no cubre ninguna pantalla) es una función que el diseño no pide.
  const sinRequerimiento = archivos.filter(
    (a) => ["componente", "servicio", "funcion", "pagina"].includes(a.tipo) && !a.requerimientos.length && !a.pantallas?.length
  );
  if (sinRequerimiento.length) {
    problemas.push(
      `Estos archivos no implementan ningún requerimiento: ${sinRequerimiento.map((a) => `"${a.ruta}"`).join(", ")}. Indica qué RF/RNF implementan o quítalos si el diseño no los pide.`
    );
  }

  const cubiertas = new Set(archivos.flatMap((a) => a.pantallas || []));
  const sinPagina = pantallas.filter((p) => !cubiertas.has(p.nombre));
  if (sinPagina.length) {
    problemas.push(`Pantallas del prototipo sin página: ${sinPagina.map((p) => `"${p.nombre}"`).join(", ")}. Inclúyelas en "pantallas" del archivo que las implementa.`);
  }
  const tablasCubiertas = new Set(archivos.flatMap((a) => a.tablas || []));
  const sinMigracion = entidades.filter((e) => !tablasCubiertas.has(e));
  if (sinMigracion.length) {
    problemas.push(`Entidades del ER sin migración: ${sinMigracion.join(", ")}. Inclúyelas en "tablas" de la migración que las crea.`);
  }
  const modulosCubiertos = new Set(archivos.map((a) => a.modulo).filter(Boolean));
  const sinArchivos = modulos.filter((m) => !modulosCubiertos.has(m.nombre));
  if (sinArchivos.length) {
    problemas.push(`Componentes del diagrama de sistemas sin archivos: ${sinArchivos.map((m) => `"${m.nombre}"`).join(", ")}. Indícalos en "modulo" de los archivos que los implementan.`);
  }

  return {
    archivos,
    notas: String(resultado?.notas || "").trim(),
    problemas,
    cobertura: {
      pantallas: [pantallas.length - sinPagina.length, pantallas.length],
      tablas: [entidades.length - sinMigracion.length, entidades.length],
      modulos: [modulos.length - sinArchivos.length, modulos.length],
    },
  };
}

// RF que ningún archivo de ninguna pieza cubre, con las piezas que deberían cubrirlos (las que
// implementan su componente en el diagrama de sistemas; si ninguna, todas).
function rfSinCubrir(resultados, analisis, componentes) {
  const cubiertos = new Set(Object.values(resultados).flatMap((r) => r.archivos.flatMap((a) => a.requerimientos)));
  const piezas = Object.keys(resultados);
  return (analisis?.requerimientos_funcionales || [])
    .map((r) => r.codigo)
    .filter((codigo) => !cubiertos.has(codigo))
    .map((codigo) => {
      const responsables = [...new Set(componentes.filter((c) => c.requerimientos.includes(codigo) && piezas.includes(c.pieza)).map((c) => c.pieza))];
      return { codigo, piezas: responsables.length ? responsables : piezas };
    });
}

// --- Generación --------------------------------------------------------------------------

// cuerpo: { nombre, descripcion, analisis, stack, diagramaER, diagramaClases, arbol,
//   diagramaSistema, pantallas: [{ nombre, plataforma, rfs }], indicaciones, usarClaude } y, para
//   "Ampliar con IA", { actual: { archivos }, instruccion }.
export async function generarEstructura(cuerpo) {
  const inicio = Date.now();
  const { stack, analisis, diagramaER, diagramaSistema, usarClaude, actual, instruccion } = cuerpo;
  if (!stack?.piezas?.length) throw new Error("Falta el stack técnico aprobado.");

  const fichas = await catalogo();
  const porNombre = Object.fromEntries(fichas.map((f) => [f.nombre, f]));
  const { archivos: delArmador } = await armarProyecto({
    nombre: cuerpo.nombre,
    generados: [],
    piezas: stack.piezas,
    altaDisponibilidad: stack.altaDisponibilidad,
  });
  const fijas = delArmador.map((a) => a.ruta);
  const componentes = resolverComponentes(componentesDeSistema(diagramaSistema), stack.piezas, stack.elementos || [], fichas);
  const codigos = new Set(
    [...(analisis?.requerimientos_funcionales || []), ...(analisis?.requerimientos_no_funcionales || [])].map((r) => r.codigo)
  );
  const entidades = entidadesER(diagramaER);

  // Contexto de cada pieza que tiene código propio (las de infraestructura no).
  const contextos = [];
  for (const { pieza } of stack.piezas) {
    const ficha = porNombre[pieza];
    if (!ficha?.carpeta) continue;
    const plataforma = ["web", "movil"].includes(ficha.capa) ? ficha.capa : null;
    const conTablas = ficha.capa === "datos" || (ficha.incluye || []).includes("postgres");
    contextos.push({
      ...cuerpo,
      ficha,
      carpeta: ficha.carpeta,
      guia: await leerGuia(pieza),
      fijas: fijas.filter((r) => r.startsWith(`${ficha.carpeta}/`)),
      pantallas: plataforma ? (cuerpo.pantallas || []).filter((p) => plataformaDePantalla(p.plataforma) === plataforma) : [],
      entidades: conTablas ? entidades : [],
      // Componentes con algún RF (los que solo tienen RNF, como la alta disponibilidad, no llevan archivos propios).
      modulos: componentes.filter((c) => c.pieza === pieza && c.requerimientos.some((r) => /^RF/.test(r))),
      codigos,
      actual: actual ? (actual.archivos || []).filter((a) => a.pieza === pieza) : null,
      instruccion,
    });
  }
  if (!contextos.length) throw new Error("El stack no tiene piezas con código propio.");

  let costo;
  const generarPieza = async (ctx, extra = "", presupuestoMs) => {
    const response = await generarContenido({
      usarClaude,
      contents: [{ text: armarPrompt(ctx) + extra }],
      config: { responseMimeType: "application/json" },
      ...(presupuestoMs ? { presupuestoMs } : {}),
    });
    costo = sumarCosto(costo, response.costoUsd);
    return { response, ...validarPieza(leerJson(response.text), ctx) };
  };

  const resultados = {};
  const respuestas = await Promise.all(contextos.map((ctx) => generarPieza(ctx)));
  contextos.forEach((ctx, i) => (resultados[ctx.ficha.nombre] = respuestas[i]));

  const problemasDe = (pieza) => [
    ...resultados[pieza].problemas,
    ...rfSinCubrir(resultados, analisis, componentes)
      .filter((r) => r.piezas.includes(pieza))
      .map((r) => `${r.codigo} no queda cubierto por ningún archivo. Inclúyelo en "requerimientos" de los archivos que lo implementan.`),
  ];

  // Un reintento por pieza con problemas, si queda tiempo dentro del límite de la ruta.
  const restante = LIMITE_RUTA_MS - (Date.now() - inicio);
  const conProblemas = contextos.filter((ctx) => problemasDe(ctx.ficha.nombre).length);
  if (conProblemas.length && restante > 60_000) {
    await Promise.all(
      conProblemas.map(async (ctx) => {
        const pieza = ctx.ficha.nombre;
        const problemas = problemasDe(pieza);
        try {
          const reintento = await generarPieza(
            ctx,
            `

TU RESPUESTA ANTERIOR TIENE ESTOS PROBLEMAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Respuesta anterior:
${JSON.stringify({ archivos: resultados[pieza].archivos, notas: resultados[pieza].notas })}

Corrígela y responde de nuevo con el JSON completo.`,
            restante - 10_000
          );
          if (reintento.problemas.length <= resultados[pieza].problemas.length) resultados[pieza] = reintento;
        } catch {
          // Si el reintento falla, se conserva el primer resultado con sus advertencias.
        }
      })
    );
  }

  const advertencias = [
    ...contextos.flatMap((ctx) => resultados[ctx.ficha.nombre].problemas.map((p) => `${ctx.ficha.titulo}: ${p}`)),
    ...rfSinCubrir(resultados, analisis, componentes).map((r) => `${r.codigo} no queda cubierto por ningún archivo.`),
  ];
  const archivos = contextos.flatMap((ctx) => resultados[ctx.ficha.nombre].archivos).sort((a, b) => a.ruta.localeCompare(b.ruta));
  const suma = (clave) =>
    contextos.reduce(
      (t, ctx) => [t[0] + resultados[ctx.ficha.nombre].cobertura[clave][0], t[1] + resultados[ctx.ficha.nombre].cobertura[clave][1]],
      [0, 0]
    );
  const totalRF = (analisis?.requerimientos_funcionales || []).length;
  const sinRF = rfSinCubrir(resultados, analisis, componentes).length;

  return {
    archivos,
    piezas: Object.fromEntries(contextos.map((ctx) => [ctx.ficha.nombre, { titulo: ctx.ficha.titulo, carpeta: ctx.carpeta, notas: resultados[ctx.ficha.nombre].notas }])),
    cobertura: { pantallas: suma("pantallas"), tablas: suma("tablas"), modulos: suma("modulos"), requerimientos: [totalRF - sinRF, totalRF] },
    advertencias,
    modelo_ia: respuestas.at(-1)?.response?.modelVersion,
    costo_ia: costo,
  };
}
