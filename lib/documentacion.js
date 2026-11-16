// Documentación de un proyecto generado (paso "Documentación" de la Implementación): manual de usuario,
// manual de desarrolladores y API, en Markdown para el sitio Docusaurus de la pieza "docusaurus".
//
// Todo sale de lo que el proyecto ya tiene aprobado (análisis, diseño e implementación):
//   - Las páginas que se leen (inicio, primeros pasos, guía de cada rol, preguntas frecuentes, arquitectura
//     y guía de la API) las redacta la IA, una por petición, solo con los datos de su tema
//     (lib/documentacionIA.js). Aquí se arma qué recibe cada una y lo que se le agrega debajo (tablas y
//     diagramas exactos).
//   - Lo que debe ser exacto (cada endpoint con su JSON y un ejemplo, acciones por pantalla, estructura,
//     base de datos, requerimientos) sale directo de los datos, sin IA.
// Corre en el navegador porque los diagramas de Mermaid se dibujan ahí (los SVG llegan ya dibujados).
//
// planDocumentacion({ proyecto, contexto, artefactos, svgs, pantallas }) ->
//   { archivos: [{ ruta, contenido }], paginas: [{ ruta, titulo, posicion, slug, tipo, datos, anexo }] }
//   pantallas: plan del prototipo [{ nombre, plataforma, rfs, actores }] (los actores salen del plan).

import { CONTRASENA_PRUEBA } from "./archivosBD.js";
import { extraerExplicacion } from "./diagramas.js";

export const CARPETA_DOCS = "docs";
const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
const texto = (v) => String(v ?? "").trim();

// "Jefe de guardia" -> "jefe-de-guardia"
export function slug(valor) {
  return (
    texto(valor)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pagina"
  );
}

const celda = (v) => (texto(v) || "—").replace(/\|/g, "\\|").replace(/\r?\n+/g, "; ");
function tabla(columnas, filas) {
  if (!filas.length) return "";
  return [`| ${columnas.join(" | ")} |`, `| ${columnas.map(() => "---").join(" | ")} |`, ...filas.map((f) => `| ${f.map(celda).join(" | ")} |`), ""].join("\n");
}
const bloque = (lenguaje, codigo) => "```" + lenguaje + "\n" + codigo.trimEnd() + "\n```\n";
const vacio = (o) => !o || (typeof o === "object" && !Object.keys(o).length);

export function frente(titulo, posicion, slugPagina) {
  return ["---", `title: ${JSON.stringify(titulo)}`, `sidebar_position: ${posicion}`, `slug: ${JSON.stringify(slugPagina)}`, "---", ""].join("\n");
}
const pagina = (titulo, posicion, slugPagina, cuerpo) => `${frente(titulo, posicion, slugPagina)}\n${cuerpo.trim()}\n`;
// Un SVG como archivo propio (<img src="...svg">) tiene que ser XML válido: Mermaid escribe los saltos
// de línea de las etiquetas como <br> sin cerrar y espacios como &nbsp;, que dentro de la página se ven
// bien pero como archivo rompen la imagen.
export function svgComoArchivo(svg) {
  return String(svg)
    .replace(/<br\s*>/gi, "<br/>")
    .replace(/<(hr|img|input|col|wbr)(\s[^<>]*?)?(?<!\/)>/gi, "<$1$2/>")
    .replace(/&nbsp;/g, "&#160;");
}

const figura = (svgs, clave, titulo) => (svgs[clave] ? `![${titulo}](/img/diagramas/${clave}.svg)\n` : "");

// --- Datos comunes ---------------------------------------------------------------------------

function datos({ proyecto, contexto = {}, artefactos = {}, pantallas = [] }) {
  const analisis = artefactos.analisis || {};
  const rf = lista(analisis.requerimientos_funcionales);
  const rnf = lista(analisis.requerimientos_no_funcionales);
  const actores = lista(analisis.actores);
  const contrato = artefactos.impl_contrato || {};
  const operaciones = lista(contrato.operaciones);
  const acciones = lista(contrato.acciones);
  const stack = artefactos.impl_stack || {};
  const titulo = (pieza) => stack.titulos?.[pieza] || pieza;
  const supabase = lista(stack.piezas).some((p) => p.pieza === "supabase");
  // Sin actores en el plan del prototipo, los de una pantalla son los de los requerimientos que cubre.
  const actoresDeRfs = (rfs) => [...new Set(rf.filter((r) => lista(rfs).includes(r.codigo)).flatMap((r) => lista(r.actores)))];
  const plan = (pantallas.length
    ? pantallas
    : lista(artefactos.prototipo).map((p) => ({ nombre: p.nombre, plataforma: p.plataforma || "Web", rfs: p.rfs || [], actores: [] }))
  ).map((p) => ({ ...p, actores: lista(p.actores).length ? p.actores : actoresDeRfs(p.rfs) }));
  const plataformas = [...new Set(plan.map((p) => p.plataforma).filter(Boolean))];
  const nombreRf = Object.fromEntries(rf.map((r) => [r.codigo, r.nombre]));
  return { proyecto, contexto, artefactos, analisis, rf, rnf, actores, contrato, operaciones, acciones, stack, titulo, supabase, plan, plataformas, nombreRf };
}

// Ruta HTTP de una operación del contrato.
function rutaDe(op, supabase) {
  if (!supabase) return `${op.metodo} /${String(op.recurso).replace(/^\//, "")}`;
  if (op.tipo === "tabla") return `${op.metodo} /rest/v1/${op.recurso}`;
  if (op.tipo === "rpc") return `POST /rest/v1/rpc/${op.recurso}`;
  if (op.tipo === "edge") return `${op.metodo || "POST"} /functions/v1/${op.recurso}`;
  if (op.tipo === "auth") return `Supabase Auth · ${op.recurso}`;
  return `${op.metodo} ${op.recurso}`;
}
const enlaceOperacion = (op) => `/api/operaciones/${slug(op.id)}`;

// Valor de ejemplo según el esquema JSON (para los ejemplos de código).
function ejemplo(esquema, nombre = "") {
  if (!esquema || typeof esquema !== "object") return null;
  if (esquema.example !== undefined) return esquema.example;
  if (Array.isArray(esquema.enum) && esquema.enum.length) return esquema.enum[0];
  switch (esquema.type) {
    case "object":
      return Object.fromEntries(Object.entries(esquema.properties || {}).map(([k, v]) => [k, ejemplo(v, k)]));
    case "array":
      return [ejemplo(esquema.items, nombre)];
    case "integer":
      return 1;
    case "number":
      return /lat/i.test(nombre) ? -1.3964 : /lon|lng/i.test(nombre) ? -78.4247 : 1.5;
    case "boolean":
      return true;
    default:
      return /fecha|date/i.test(nombre) ? "2026-11-15" : /hora|_at$|time/i.test(nombre) ? "2026-11-15T10:30:00Z" : /correo|email/i.test(nombre) ? "usuario@correo.com" : /id$/i.test(nombre) ? "…" : "texto";
  }
}

// Cómo se llama una operación desde la aplicación (supabase-js) o por HTTP.
function codigoEjemplo(op, supabase) {
  const cuerpo = vacio(op.entrada?.properties) ? null : ejemplo(op.entrada);
  const json = (v) => JSON.stringify(v, null, 2).replace(/\n/g, "\n  ");
  if (!supabase) {
    return bloque("bash", `curl -X ${op.metodo} "$API/${String(op.recurso).replace(/^\//, "")}" \\\n  -H "Authorization: Bearer $TOKEN"${cuerpo ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(cuerpo)}'` : ""}`);
  }
  if (op.tipo === "rpc") return bloque("js", `const { data, error } = await supabase.rpc("${op.recurso}"${cuerpo ? `, ${json(cuerpo)}` : ""});`);
  if (op.tipo === "edge") return bloque("js", `const { data, error } = await supabase.functions.invoke("${op.recurso}"${cuerpo ? `, {\n  body: ${json(cuerpo)},\n}` : ""});`);
  if (op.tipo === "auth") return bloque("js", `const { data, error } = await supabase.auth.${op.recurso}(${cuerpo ? json(cuerpo) : ""});`);
  const filtro = Object.entries(op.prueba?.filtros || {})[0];
  // El filtro de la prueba dice qué columna identifica la fila; el valor va en una variable con su nombre.
  const variable = filtro ? filtro[0].replace(/_([a-z])/g, (_, l) => l.toUpperCase()) : "";
  const donde = filtro ? `\n  .eq("${filtro[0]}", ${variable})` : "";
  if (op.metodo === "GET") return bloque("js", `const { data, error } = await supabase\n  .from("${op.recurso}")\n  .select("*")${donde};`);
  if (op.metodo === "POST") return bloque("js", `const { data, error } = await supabase\n  .from("${op.recurso}")\n  .insert(${cuerpo ? json(cuerpo) : "{}"})\n  .select();`);
  if (op.metodo === "PATCH") return bloque("js", `const { data, error } = await supabase\n  .from("${op.recurso}")\n  .update(${cuerpo ? json(cuerpo) : "{}"})${donde || '\n  .eq("id", id)'}\n  .select();`);
  if (op.metodo === "DELETE") return bloque("js", `const { error } = await supabase\n  .from("${op.recurso}")\n  .delete()${donde || '\n  .eq("id", id)'};`);
  return "";
}

// --- Páginas desde los datos -----------------------------------------------------------------

function manualNavegacion(d, svgs, posicion) {
  const { artefactos } = d;
  return pagina("Mapa del sistema", posicion, "/manual/navegacion", `
Cómo se llega a cada pantalla desde el menú de cada plataforma y qué funciones usa cada rol.

## Árbol de navegación

${figura(svgs, "arbol", "Árbol de navegación")}
${texto(extraerExplicacion(artefactos.arbol))}

## Casos de uso

${figura(svgs, "casos_uso", "Diagrama de casos de uso")}
${texto(extraerExplicacion(artefactos.casos_uso))}
`);
}

function devInstalacion(d) {
  const { stack, artefactos } = d;
  const bd = artefactos.impl_bd || {};
  const externos = lista(stack.externos);
  return pagina("Instalación y ejecución", 2, "/desarrolladores/instalacion", `
El sistema corre en contenedores Docker: cada pieza en su propio contenedor, con su propia base de datos.

## Requisitos

- Docker con Docker Compose (Docker Desktop en Windows o macOS; Docker Engine en Linux).
- Los puertos libres que indica el archivo \`.env\`.

## Levantar el sistema

1. Copie \`.env.example\` como \`.env\` y complete las claves que falten.
2. En la carpeta del proyecto, ejecute:

${bloque("bash", "docker compose up -d --build")}
3. La primera vez se aplican las migraciones y los datos de prueba de la base.
4. Para detenerlo: \`docker compose down\`. Para empezar con la base vacía: \`docker compose down -v\`.

## Contenedores

${tabla(["Contenedor", "Qué es"], [...lista(stack.contenedores).map((c) => [`\`${c.nombre}\``, `${c.descripcion}${c.tarea ? " (tarea de un solo uso)" : ""}`]), ["`docs`", "Esta documentación (Docusaurus)"]])}
${externos.length ? `## Servicios externos\n\nNecesitan una clave propia en \`.env\`. Sin ella el sistema arranca y solo esa función avisa que falta.\n\n${tabla(["Servicio", "Variable", "Lo usa", "Nota"], externos.map((x) => [x.servicio, `\`${x.variable}\``, lista(x.usadoPor).join(", "), x.nota]))}` : ""}
${typeof bd.prueba?.usuarios === "number" ? `## Usuarios de prueba\n\nLos datos de prueba crean ${bd.prueba.usuarios} usuarios, uno por rol, con la contraseña \`${CONTRASENA_PRUEBA}\`.\n` : ""}
`);
}

function devEstructura(d) {
  const estructura = d.artefactos.impl_estructura || {};
  const archivos = lista(estructura.archivos);
  const c = estructura.cobertura || {};
  const fr = (par) => (Array.isArray(par) && par[1] ? `${par[0]} de ${par[1]}` : "—");
  const piezas = Object.entries(estructura.piezas || {}).map(([pieza, info]) => {
    const suyos = archivos.filter((a) => a.pieza === pieza);
    return `## ${info.titulo} · \`${info.carpeta}/\`\n\n${texto(info.notas)}\n\n${tabla(["Archivo", "Para qué", "RF"], suyos.map((a) => [`\`${a.ruta.slice((info.carpeta || "").length + 1) || a.ruta}\``, a.proposito, lista(a.requerimientos).join(", ")]))}`;
  });
  return pagina("Estructura del código", 3, "/desarrolladores/estructura", `
El proyecto tiene ${archivos.length} archivos organizados por pieza. Cada archivo indica para qué sirve
y qué requerimientos implementa.

${tabla(["Cobertura", "Valor"], [["Pantallas del prototipo", fr(c.pantallas)], ["Tablas del modelo de datos", fr(c.tablas)], ["Módulos", fr(c.modulos)], ["Requerimientos funcionales", fr(c.requerimientos)]])}
${piezas.join("\n")}
`);
}

function devBaseDatos(d, svgs) {
  const { artefactos } = d;
  const bd = artefactos.impl_bd || {};
  const prueba = bd.prueba || {};
  return pagina("Base de datos", 4, "/desarrolladores/base-de-datos", `
## Modelo de datos

${figura(svgs, "er", "Diagrama entidad-relación")}
${texto(extraerExplicacion(artefactos.er))}

${svgs.clases ? `## Clases del dominio\n\n${figura(svgs, "clases", "Diagrama de clases")}\n${texto(extraerExplicacion(artefactos.clases))}\n` : ""}
## Migraciones

Se aplican en este orden sobre una base vacía.

${tabla(["Archivo", "Líneas", "Tablas"], lista(bd.archivos).map((a) => [`\`${a.ruta}\``, a.lineas, lista(a.tablas).join(", ")]))}
${lista(prueba.tablas).length ? `## Tablas y reglas de acceso\n\n${tabla(["Tabla", "Reglas de acceso", "Políticas", "Filas de prueba"], prueba.tablas.map((t) => [`\`${t.tabla}\``, t.rls === true ? "Sí" : t.rls === false ? "No" : "", t.politicas, t.filas]))}` : ""}
`);
}

function devRequerimientos(d) {
  const { rf, rnf } = d;
  return pagina("Requerimientos", 5, "/desarrolladores/requerimientos", `
## Funcionales

${tabla(["Código", "Nombre", "Prioridad", "Actores"], rf.map((r) => [r.codigo, r.nombre, r.prioridad, lista(r.actores).join(", ")]))}
## No funcionales

${tabla(["Código", "Nombre", "Descripción"], rnf.map((r) => [r.codigo, r.nombre, r.descripcion]))}
`);
}

function devBackendFrontend(d) {
  const backend = d.artefactos.impl_backend || {};
  const frontend = d.artefactos.impl_frontend || {};
  const nombres = { web: "Aplicación web", movil: "Aplicación móvil" };
  const plataformas = Object.entries(frontend.plataformas || {}).filter(([, x]) => lista(x?.archivos).length);
  return pagina("Backend y frontend", 6, "/desarrolladores/backend-y-frontend", `
## Backend

${lista(backend.archivos).length ? tabla(["Archivo", "Líneas"], backend.archivos.map((a) => [`\`${a.ruta}\``, a.lineas])) : "El sistema no necesita lógica de servidor aparte de la base de datos."}
${backend.prueba ? `Prueba: ${backend.prueba.correctas} correctas, ${backend.prueba.fallidas} fallidas, ${backend.prueba.inconclusas} sin verificar.\n` : ""}
## Frontend

${plataformas
  .map(([clave, x]) => `### ${nombres[clave] || clave}\n\n${x.archivos.length} archivos · ${x.compilacion ? (x.compilacion.ok ? "compila" : "no compila") : "sin compilar"}\n\n${tabla(["Archivo", "Líneas"], x.archivos.map((a) => [`\`${a.ruta}\``, a.lineas]))}`)
  .join("\n")}
`);
}

function apiAcciones(d) {
  const { acciones, operaciones } = d;
  const porId = Object.fromEntries(operaciones.map((o) => [o.id, o]));
  const pantallas = [...new Map(acciones.map((a) => [`${a.pantalla}|${a.plataforma || ""}`, { pantalla: a.pantalla, plataforma: a.plataforma }])).values()];
  const secciones = pantallas.map(({ pantalla, plataforma }) => {
    const suyas = acciones.filter((a) => a.pantalla === pantalla && (a.plataforma || "") === (plataforma || "") && lista(a.operaciones).length);
    if (!suyas.length) return "";
    return `## ${pantalla}${plataforma ? ` · ${plataforma}` : ""}\n\n${suyas.map((a) => `- **${a.nombre}:** ${a.operaciones.map((id) => (porId[id] ? `[${porId[id].nombre}](${enlaceOperacion(porId[id])})` : id)).join(", ")}`).join("\n")}\n`;
  });
  return pagina("Acciones por pantalla", 3, "/api/acciones", `
Qué operación de la API usa cada botón o formulario de cada pantalla. Las acciones que solo navegan o
trabajan dentro de la pantalla no llaman a la API y no se listan.

${secciones.filter(Boolean).join("\n")}
`);
}

function apiOperacion(d, op, posicion) {
  const { supabase, nombreRf } = d;
  return pagina(op.nombre, posicion, enlaceOperacion(op), `
\`${rutaDe(op, supabase)}\`

${texto(op.descripcion)}

${tabla(["Dato", "Valor"], [["Roles que la pueden usar", lista(op.roles).join(", ")], ["Requerimientos", lista(op.requerimientos).map((c) => `${c} · ${nombreRf[c] || ""}`).join("; ")], ["Tipo", op.tipo], ["Recurso", `\`${op.recurso}\``], ["Identificador", `\`${op.id}\``]])}
## Ejemplo

${codigoEjemplo(op, supabase)}
## Entrada

${vacio(op.entrada?.properties) ? "No recibe datos.\n" : bloque("json", JSON.stringify(op.entrada, null, 2))}
## Salida

${vacio(op.salida) ? "No devuelve datos.\n" : bloque("json", JSON.stringify(op.salida, null, 2))}
`);
}

// --- Páginas que redacta la IA: qué recibe cada una y qué se le agrega debajo -----------------

function paginasIA(d, svgs) {
  const { proyecto, contexto, actores, rf, rnf, plan, plataformas, acciones, operaciones, stack, titulo, supabase, artefactos } = d;
  const opPorId = Object.fromEntries(operaciones.map((o) => [o.id, o]));
  const rfsCortos = (filtro = () => true) => rf.filter(filtro).map((r) => ({ codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion, actores: lista(r.actores), precondiciones: r.precondiciones, postcondiciones: r.postcondiciones }));
  const general = { nombre: proyecto.nombre, descripcion: texto(proyecto.prompt), plataformas };
  const paginas = [];

  paginas.push({
    ruta: "docs/docs/index.md", titulo: proyecto.nombre, posicion: 1, slug: "/", tipo: "inicio",
    datos: { ...general, problema: contexto.problema, alcance: contexto.incluye, fuera_de_alcance: contexto.no_incluye, roles: actores, funciones: rf.map((r) => r.nombre), tecnologias: lista(stack.piezas).map((p) => titulo(p.pieza)) },
    anexo: `## Secciones\n\n- [Manual de usuario](/manual/introduccion): cómo usar el sistema según su rol.\n- [Desarrolladores](/desarrolladores/arquitectura): arquitectura, instalación, código y base de datos.\n- [API](/api/introduccion): cada operación con su entrada, su salida y un ejemplo.\n`,
  });

  paginas.push({
    ruta: "docs/docs/manual/introduccion.md", titulo: "Primeros pasos", posicion: 1, slug: "/manual/introduccion", tipo: "primeros_pasos",
    datos: {
      ...general,
      roles: actores.map((a) => ({ ...a, plataformas: [...new Set(plan.filter((p) => lista(p.actores).some((x) => slug(x) === slug(a.nombre))).map((p) => p.plataforma))] })),
      pantallas_de_acceso: plan.filter((p) => /login|sesi[oó]n|acceso|ingreso/i.test(p.nombre)).map((p) => ({ ...p, acciones: acciones.filter((a) => a.pantalla === p.nombre).map((a) => a.nombre) })),
      reglas: contexto.reglas,
      calidad: rnf.map((r) => ({ nombre: r.nombre, descripcion: r.descripcion })),
    },
    anexo: `## Guías por rol\n\n${actores.map((a) => `- [${a.nombre}](/manual/${slug(a.nombre)})`).join("\n")}\n- [Mapa del sistema](/manual/navegacion)\n- [Preguntas frecuentes](/manual/preguntas-frecuentes)\n`,
  });

  actores.forEach((actor, i) => {
    const clave = slug(actor.nombre);
    const suyas = plan.filter((p) => lista(p.actores).some((x) => slug(x) === clave));
    const puede = (a) => {
      const ops = lista(a.operaciones).map((id) => opPorId[id]).filter(Boolean);
      return !ops.length || ops.some((o) => lista(o.roles).some((r) => slug(r) === clave));
    };
    paginas.push({
      ruta: `docs/docs/manual/${clave}.md`, titulo: actor.nombre, posicion: i + 2, slug: `/manual/${clave}`, tipo: "guia_rol",
      datos: {
        ...general,
        rol: actor,
        funciones: rfsCortos((r) => lista(r.actores).some((x) => slug(x) === clave)),
        pantallas: suyas.map((p) => ({
          nombre: p.nombre,
          plataforma: p.plataforma,
          para_que: lista(p.rfs).map((c) => d.nombreRf[c] || c),
          acciones: acciones.filter((a) => a.pantalla === p.nombre && (!a.plataforma || a.plataforma === p.plataforma) && puede(a)).map((a) => a.nombre),
        })),
        navegacion: texto(artefactos.arbol).slice(0, 6000),
        reglas: contexto.reglas,
      },
    });
  });

  paginas.push({
    ruta: "docs/docs/manual/preguntas-frecuentes.md", titulo: "Preguntas frecuentes", posicion: actores.length + 3, slug: "/manual/preguntas-frecuentes", tipo: "preguntas",
    datos: { ...general, roles: actores.map((a) => a.nombre), funciones: rfsCortos(), reglas: contexto.reglas, calidad: rnf.map((r) => ({ nombre: r.nombre, descripcion: r.descripcion })) },
  });

  paginas.push({
    ruta: "docs/docs/desarrolladores/arquitectura.md", titulo: "Arquitectura", posicion: 1, slug: "/desarrolladores/arquitectura", tipo: "arquitectura",
    datos: {
      ...general,
      explicacion_arquitectura: extraerExplicacion(artefactos.arquitectura),
      explicacion_sistema: extraerExplicacion(artefactos.sistema),
      stack: stack.explicacion,
      piezas: lista(stack.piezas).map((p) => titulo(p.pieza)),
      alta_disponibilidad: !!stack.altaDisponibilidad,
      contenedores: lista(stack.contenedores).map((c) => ({ nombre: c.nombre, descripcion: c.descripcion })),
      componentes: lista(stack.componentes).map((c) => ({ nombre: c.nombre, tecnologia: c.tecnologia, pieza: c.pieza ? titulo(c.pieza) : c.resolucion })),
      servicios_externos: lista(stack.externos).map((x) => x.servicio),
    },
    anexo: [
      svgs.arquitectura ? `## Diagrama de arquitectura\n\n${figura(svgs, "arquitectura", "Diagrama de arquitectura")}` : "",
      svgs.sistema ? `## Diagrama de sistemas\n\n${figura(svgs, "sistema", "Diagrama de sistemas")}` : "",
      lista(stack.componentes).length ? `## Cómo se implementa cada componente\n\n${tabla(["Componente", "Tecnología", "Se implementa con", "RF"], stack.componentes.map((c) => [c.nombre, c.tecnologia, c.pieza ? titulo(c.pieza) : c.resolucion, lista(c.requerimientos).join(", ")]))}` : "",
      lista(stack.librerias).length ? `## Librerías\n\n${tabla(["Paquete", "En", "Para qué"], stack.librerias.map((l) => [`\`${l.nombre}\``, titulo(l.pieza), l.motivo]))}` : "",
    ].filter(Boolean).join("\n"),
  });

  const auth = operaciones.filter((o) => o.tipo === "auth").map((o) => ({ nombre: o.nombre, recurso: o.recurso, entrada: o.entrada, descripcion: o.descripcion }));
  paginas.push({
    ruta: "docs/docs/api/introduccion.md", titulo: "Introducción", posicion: 1, slug: "/api/introduccion", tipo: "api",
    datos: {
      ...general,
      tipo_api: supabase ? "Supabase (PostgREST para tablas y funciones, Edge Functions, Supabase Auth)" : "REST",
      roles: actores.map((a) => a.nombre),
      operaciones_de_sesion: auth,
      cantidad_operaciones: operaciones.length,
      ejemplos: operaciones.slice(0, 6).map((o) => ({ nombre: o.nombre, tipo: o.tipo, recurso: o.recurso, metodo: o.metodo, roles: o.roles })),
      prueba_de_permisos: d.contrato.prueba ? { correctas: d.contrato.prueba.correctas, fallidas: d.contrato.prueba.fallidas, sin_verificar: d.contrato.prueba.inconclusas } : null,
    },
    anexo: `## Operaciones\n\n${tabla(["Operación", "Ruta", "Roles"], operaciones.map((op) => [`[${op.nombre}](${enlaceOperacion(op)})`, `\`${rutaDe(op, supabase)}\``, lista(op.roles).join(", ")]))}`,
  });
  return paginas;
}

// --- Documento completo ----------------------------------------------------------------------

export function planDocumentacion({ proyecto, contexto, artefactos, svgs = {}, pantallas = [] }) {
  const d = datos({ proyecto, contexto, artefactos, pantallas });
  const archivos = [];
  const agregar = (ruta, contenido) => archivos.push({ ruta: `${CARPETA_DOCS}/${ruta}`, contenido });
  const json = (v) => JSON.stringify(v, null, 2) + "\n";

  agregar("proyecto.json", json({ nombre: proyecto.nombre, descripcion: texto(proyecto.prompt).split(/(?<=\.)\s/)[0].slice(0, 160), generado: new Date().toISOString().slice(0, 10) }));
  agregar("docs/manual/_category_.json", json({ label: "Manual de usuario", position: 2 }));
  agregar("docs/manual/navegacion.md", manualNavegacion(d, svgs, d.actores.length + 2));
  agregar("docs/desarrolladores/_category_.json", json({ label: "Desarrolladores", position: 3 }));
  agregar("docs/desarrolladores/instalacion.md", devInstalacion(d));
  agregar("docs/desarrolladores/estructura.md", devEstructura(d));
  agregar("docs/desarrolladores/base-de-datos.md", devBaseDatos(d, svgs));
  agregar("docs/desarrolladores/requerimientos.md", devRequerimientos(d));
  agregar("docs/desarrolladores/backend-y-frontend.md", devBackendFrontend(d));
  agregar("docs/api/_category_.json", json({ label: "API", position: 4 }));
  agregar("docs/api/acciones.md", apiAcciones(d));
  agregar("docs/api/operaciones/_category_.json", json({ label: "Operaciones", position: 4 }));
  d.operaciones.forEach((op, i) => agregar(`docs/api/operaciones/${slug(op.id)}.md`, apiOperacion(d, op, i + 1)));
  for (const [clave, svg] of Object.entries(svgs)) {
    if (svg && /<svg[\s>]/i.test(svg)) agregar(`static/img/diagramas/${clave}.svg`, svgComoArchivo(svg));
  }
  return { archivos, paginas: paginasIA(d, svgs) };
}

// Página redactada por la IA: su encabezado, el texto y lo que se agrega debajo.
export function componerPagina(p, cuerpo) {
  return `${frente(p.titulo, p.posicion, p.slug)}\n${texto(cuerpo)}\n${p.anexo ? `\n${p.anexo.trim()}\n` : ""}`;
}

// Resumen para la ficha del paso: cuántas páginas tiene cada sección y cuáles redactó la IA.
export function resumenDocumentacion(archivos, { redactadas = [], pendientes = [] } = {}) {
  const cuenta = (carpeta) => archivos.filter((a) => a.ruta.startsWith(`${CARPETA_DOCS}/docs/${carpeta}/`) && a.ruta.endsWith(".md")).length;
  return {
    manual: cuenta("manual"),
    desarrolladores: cuenta("desarrolladores"),
    api: cuenta("api"),
    diagramas: archivos.filter((a) => a.ruta.endsWith(".svg")).length,
    redactadas,
    pendientes,
    incompleto: pendientes.length > 0,
    archivos: archivos.map((a) => ({ ruta: a.ruta, lineas: a.contenido.split("\n").length })),
  };
}
