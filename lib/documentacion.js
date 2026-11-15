// Documentación de un proyecto generado (paso "Documentación" de la Implementación): manual de usuario,
// manual de desarrolladores y API, en Markdown para el sitio Docusaurus de la pieza "docusaurus".
//
// Todo sale de lo que el proyecto ya tiene aprobado (análisis, diseño e implementación), sin IA: así la
// documentación es exacta, no cuesta y sirve para cualquier proyecto. Corre en el navegador porque los
// diagramas de Mermaid se dibujan ahí (los SVG llegan ya dibujados).
//
// generarDocumentacion({ proyecto, contexto, artefactos, svgs, pantallas }) -> [{ ruta, contenido }]
//   pantallas: plan del prototipo [{ nombre, plataforma, rfs, actores }] (los actores salen del plan).

import { CONTRASENA_PRUEBA } from "./archivosBD.js";
import { extraerExplicacion } from "./diagramas.js";

const CARPETA = "docs";
const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
const texto = (v) => String(v ?? "").trim();

// "Jefe de guardia" -> "jefe-de-guardia"
export function slug(valor) {
  return (
    texto(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pagina"
  );
}

const celda = (v) => (texto(v) || "—").replace(/\|/g, "\\|").replace(/\r?\n+/g, "; ");
function tabla(columnas, filas) {
  if (!filas.length) return "";
  return [
    `| ${columnas.join(" | ")} |`,
    `| ${columnas.map(() => "---").join(" | ")} |`,
    ...filas.map((f) => `| ${f.map(celda).join(" | ")} |`),
    "",
  ].join("\n");
}
const json = (valor) => "```json\n" + JSON.stringify(valor ?? {}, null, 2) + "\n```\n";
const vacio = (o) => !o || (typeof o === "object" && !Object.keys(o).length);

function pagina(titulo, posicion, cuerpo, extra = {}) {
  const frente = [
    "---",
    `title: ${JSON.stringify(titulo)}`,
    `sidebar_position: ${posicion}`,
    ...Object.entries(extra).map(([k, v]) => `${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`),
    "---",
    "",
  ].join("\n");
  return `${frente}\n${cuerpo.trim()}\n`;
}

function figura(svgs, clave, titulo) {
  return svgs[clave] ? `![${titulo}](/img/diagramas/${clave}.svg)\n` : "";
}

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

const archivoOperacion = (op) => `api/operaciones/${slug(op.id)}`;

// --- Inicio ----------------------------------------------------------------------------------

function inicio(d) {
  const { proyecto, contexto, actores, rf, plataformas } = d;
  return pagina(proyecto.nombre, 1, `
${texto(proyecto.prompt)}

${texto(contexto.problema) ? `## Problema que resuelve\n\n${texto(contexto.problema)}\n` : ""}
## Quién lo usa

${tabla(["Rol", "Descripción"], actores.map((a) => [a.nombre, a.descripcion]))}
${plataformas.length ? `El sistema funciona en: ${plataformas.join(", ")}.\n` : ""}
Ofrece ${rf.length} funciones (requerimientos funcionales).

## Cómo está organizada esta documentación

- **[Manual de usuario](/manual/introduccion):** cómo usar el sistema según su rol, pantalla por pantalla.
- **[Desarrolladores](/desarrolladores/arquitectura):** arquitectura, instalación, estructura del código, base de datos, backend y frontend.
- **[API](/api/introduccion):** cada operación que expone el sistema, con su entrada y su salida.
`, { slug: "/" });
}

// --- Manual de usuario -----------------------------------------------------------------------

function manualIntroduccion(d) {
  const { actores, plan, plataformas, contexto } = d;
  const filas = actores.map((a) => {
    const suyas = plan.filter((p) => lista(p.actores).some((x) => slug(x) === slug(a.nombre)));
    const enPlataformas = [...new Set(suyas.map((p) => p.plataforma))];
    return [a.nombre, a.descripcion, enPlataformas.join(", ") || plataformas.join(", ")];
  });
  return pagina("Introducción", 1, `
Este manual explica cómo usar el sistema. Cada rol tiene su propia página con las tareas que puede hacer
y las pantallas que usa.

## Roles

${tabla(["Rol", "Qué hace", "Dónde"], filas)}
## Cómo ingresar

1. Abra la aplicación${plataformas.length > 1 ? ` (${plataformas.join(" o ")})` : ""}.
2. Escriba su correo y su contraseña, y pulse el botón para iniciar sesión.
3. El sistema muestra solo las opciones de su rol: si no ve una función, su rol no la tiene.

${texto(contexto.reglas) ? `## Reglas que aplica el sistema\n\n${texto(contexto.reglas)}\n` : ""}
## Roles y páginas

${actores.map((a) => `- [${a.nombre}](/manual/${slug(a.nombre)})`).join("\n")}
- [Navegación del sistema](/manual/navegacion)
`, { slug: "/manual/introduccion" });
}

function manualActor(d, actor, posicion) {
  const { rf, plan, acciones, operaciones, nombreRf } = d;
  const clave = slug(actor.nombre);
  const suyos = rf.filter((r) => lista(r.actores).some((x) => slug(x) === clave));
  const pantallas = plan.filter((p) => lista(p.actores).some((x) => slug(x) === clave));
  const opPorId = Object.fromEntries(operaciones.map((o) => [o.id, o]));
  const puede = (accion) => {
    const ops = lista(accion.operaciones).map((id) => opPorId[id]).filter(Boolean);
    return !ops.length || ops.some((o) => lista(o.roles).some((r) => slug(r) === clave));
  };

  const secPantallas = [];
  for (const plataforma of [...new Set(pantallas.map((p) => p.plataforma))]) {
    secPantallas.push(`### ${plataforma}\n`);
    for (const p of pantallas.filter((x) => x.plataforma === plataforma)) {
      const suyas = acciones.filter((a) => a.pantalla === p.nombre && (!a.plataforma || a.plataforma === p.plataforma) && puede(a));
      secPantallas.push(`#### ${p.nombre}\n`);
      if (lista(p.rfs).length) secPantallas.push(`Sirve para: ${lista(p.rfs).map((c) => nombreRf[c] || c).join("; ")}.\n`);
      if (suyas.length) secPantallas.push(`Lo que puede hacer aquí:\n\n${suyas.map((a) => `- ${a.nombre}`).join("\n")}\n`);
    }
  }

  const tareas = suyos.map((r) => [
    `### ${r.codigo} · ${r.nombre}`,
    "",
    texto(r.descripcion),
    "",
    texto(r.precondiciones) ? `**Antes de empezar:** ${texto(r.precondiciones)}\n` : "",
    texto(r.postcondiciones) ? `**Al terminar:** ${texto(r.postcondiciones)}\n` : "",
  ].join("\n"));

  return pagina(actor.nombre, posicion, `
${texto(actor.descripcion)}

## Qué puede hacer

${tabla(["Código", "Función", "Prioridad"], suyos.map((r) => [r.codigo, r.nombre, r.prioridad]))}
${secPantallas.length ? `## Pantallas que usa\n\n${secPantallas.join("\n")}` : ""}
## Paso a paso de cada función

${tareas.join("\n") || "Este rol no tiene funciones asignadas."}
`, { slug: `/manual/${clave}` });
}

function manualNavegacion(d, svgs, posicion) {
  const { artefactos } = d;
  return pagina("Navegación del sistema", posicion, `
## Árbol de navegación

Cómo se llega a cada pantalla desde el menú de cada plataforma.

${figura(svgs, "arbol", "Árbol de navegación")}
${texto(extraerExplicacion(artefactos.arbol))}

## Casos de uso

Qué funciones del sistema usa cada rol.

${figura(svgs, "casos_uso", "Diagrama de casos de uso")}
${texto(extraerExplicacion(artefactos.casos_uso))}
`, { slug: "/manual/navegacion" });
}

// --- Desarrolladores -------------------------------------------------------------------------

function devArquitectura(d, svgs) {
  const { stack, titulo, artefactos } = d;
  return pagina("Arquitectura", 1, `
## Diagrama de arquitectura

${figura(svgs, "arquitectura", "Diagrama de arquitectura")}
${texto(extraerExplicacion(artefactos.arquitectura))}

## Diagrama de sistemas

${figura(svgs, "sistema", "Diagrama de sistemas")}
${texto(extraerExplicacion(artefactos.sistema))}

## Stack técnico

${texto(stack.explicacion)}

${tabla(["Pieza", "Servicios opcionales"], lista(stack.piezas).map((p) => [titulo(p.pieza), lista(p.opcionales).join(", ")]))}
${stack.altaDisponibilidad ? "La aplicación web corre con **alta disponibilidad**: una instancia activa, otra en espera y un balanceador.\n" : ""}
### Cómo se implementa cada componente

${tabla(["Componente", "Tecnología", "Se implementa con", "RF"], lista(stack.componentes).map((c) => [c.nombre, c.tecnologia, c.pieza ? titulo(c.pieza) : c.resolucion, lista(c.requerimientos).join(", ")]))}
### Librerías

${tabla(["Paquete", "En", "Para qué", "RF"], lista(stack.librerias).map((l) => [`\`${l.nombre}\``, titulo(l.pieza), l.motivo, lista(l.requerimientos).join(", ")]))}
`, { slug: "/desarrolladores/arquitectura" });
}

function devInstalacion(d) {
  const { stack, artefactos } = d;
  const bd = artefactos.impl_bd || {};
  const externos = lista(stack.externos);
  return pagina("Instalación y ejecución", 2, `
El sistema corre en contenedores Docker: cada pieza en su propio contenedor, con su propia base de datos.

## Requisitos

- Docker con Docker Compose (Docker Desktop en Windows o macOS; Docker Engine en Linux).
- Los puertos libres que indica el archivo \`.env\`.

## Levantar el sistema

1. Copie \`.env.example\` como \`.env\` y complete las claves que falten.
2. En la carpeta del proyecto, ejecute:

\`\`\`bash
docker compose up -d --build
\`\`\`

3. La primera vez se aplican las migraciones y los datos de prueba de la base.
4. Para detenerlo: \`docker compose down\`. Para empezar con la base vacía de nuevo: \`docker compose down -v\`.

## Contenedores

${tabla(["Contenedor", "Qué es"], lista(stack.contenedores).map((c) => [`\`${c.nombre}\``, `${c.descripcion}${c.tarea ? " (tarea de un solo uso)" : ""}`]))}
- \`docs\`: esta documentación (Docusaurus).

${externos.length ? `## Servicios externos\n\nNecesitan una clave propia en \`.env\`. Sin ella el sistema arranca y solo esa función avisa que falta.\n\n${tabla(["Servicio", "Variable", "Lo usa", "Nota"], externos.map((x) => [x.servicio, `\`${x.variable}\``, lista(x.usadoPor).join(", "), x.nota]))}` : ""}
${typeof bd.prueba?.usuarios === "number" ? `## Usuarios de prueba\n\nLos datos de prueba crean ${bd.prueba.usuarios} usuarios, uno por rol, con la contraseña \`${CONTRASENA_PRUEBA}\`.\n` : ""}
`, { slug: "/desarrolladores/instalacion" });
}

function devEstructura(d) {
  const estructura = d.artefactos.impl_estructura || {};
  const archivos = lista(estructura.archivos);
  const c = estructura.cobertura || {};
  const fr = (par) => (Array.isArray(par) && par[1] ? `${par[0]} de ${par[1]}` : "—");
  const piezas = Object.entries(estructura.piezas || {}).map(([pieza, info]) => {
    const suyos = archivos.filter((a) => a.pieza === pieza);
    return `## ${info.titulo} · \`${info.carpeta}/\`\n\n${texto(info.notas)}\n\n${tabla(["Archivo", "Para qué", "RF"], suyos.map((a) => [`\`${a.ruta}\``, a.proposito, lista(a.requerimientos).join(", ")]))}`;
  });
  return pagina("Estructura del código", 3, `
El proyecto tiene ${archivos.length} archivos organizados por pieza. Cada archivo indica para qué sirve
y qué requerimientos implementa.

${tabla(["Cobertura", "Valor"], [["Pantallas del prototipo", fr(c.pantallas)], ["Tablas del modelo de datos", fr(c.tablas)], ["Módulos", fr(c.modulos)], ["Requerimientos funcionales", fr(c.requerimientos)]])}
${piezas.join("\n")}
`, { slug: "/desarrolladores/estructura" });
}

function devBaseDatos(d, svgs) {
  const { artefactos } = d;
  const bd = artefactos.impl_bd || {};
  const prueba = bd.prueba || {};
  return pagina("Base de datos", 4, `
## Modelo de datos

${figura(svgs, "er", "Diagrama entidad-relación")}
${texto(extraerExplicacion(artefactos.er))}

${svgs.clases ? `## Clases del dominio\n\n${figura(svgs, "clases", "Diagrama de clases")}\n${texto(extraerExplicacion(artefactos.clases))}\n` : ""}
## Migraciones

Se aplican en este orden sobre una base vacía.

${tabla(["Archivo", "Líneas", "Tablas"], lista(bd.archivos).map((a) => [`\`${a.ruta}\``, a.lineas, lista(a.tablas).join(", ")]))}
${lista(prueba.tablas).length ? `## Tablas y reglas de acceso\n\n${tabla(["Tabla", "Reglas de acceso", "Políticas", "Filas de prueba"], prueba.tablas.map((t) => [`\`${t.tabla}\``, t.rls === true ? "Sí" : t.rls === false ? "No" : "", t.politicas, t.filas]))}` : ""}
`, { slug: "/desarrolladores/base-de-datos" });
}

function devRequerimientos(d) {
  const { rf, rnf } = d;
  return pagina("Requerimientos", 5, `
## Funcionales

${tabla(["Código", "Nombre", "Prioridad", "Actores"], rf.map((r) => [r.codigo, r.nombre, r.prioridad, lista(r.actores).join(", ")]))}
## No funcionales

${tabla(["Código", "Nombre", "Descripción"], rnf.map((r) => [r.codigo, r.nombre, r.descripcion]))}
`, { slug: "/desarrolladores/requerimientos" });
}

function devBackendFrontend(d) {
  const backend = d.artefactos.impl_backend || {};
  const frontend = d.artefactos.impl_frontend || {};
  const nombres = { web: "Aplicación web", movil: "Aplicación móvil" };
  const plataformas = Object.entries(frontend.plataformas || {}).filter(([, x]) => lista(x?.archivos).length);
  return pagina("Backend y frontend", 6, `
## Backend

${lista(backend.archivos).length ? tabla(["Archivo", "Líneas"], backend.archivos.map((a) => [`\`${a.ruta}\``, a.lineas])) : "El sistema no necesita lógica de servidor aparte de la base de datos."}
${backend.prueba ? `Prueba: ${backend.prueba.correctas} correctas, ${backend.prueba.fallidas} fallidas, ${backend.prueba.inconclusas} sin verificar.\n` : ""}
## Frontend

${plataformas
  .map(([clave, x]) => `### ${nombres[clave] || clave}\n\n${x.archivos.length} archivos · ${x.compilacion ? (x.compilacion.ok ? "compila" : "no compila") : "sin compilar"}\n\n${tabla(["Archivo", "Líneas"], x.archivos.map((a) => [`\`${a.ruta}\``, a.lineas]))}`)
  .join("\n")}
`, { slug: "/desarrolladores/backend-y-frontend" });
}

// --- API -------------------------------------------------------------------------------------

function apiIntroduccion(d) {
  const { operaciones, supabase, actores, contrato } = d;
  const prueba = contrato.prueba;
  const acceso = supabase
    ? `La API la ofrece Supabase a través de su puerta de entrada (la dirección del servicio \`api-gw\`):

- **Datos de tablas:** \`/rest/v1/<tabla>\` (GET, POST, PATCH, DELETE).
- **Funciones de la base:** \`POST /rest/v1/rpc/<funcion>\`.
- **Funciones del servidor:** \`/functions/v1/<funcion>\`.
- **Sesión:** \`/auth/v1/...\` (Supabase Auth).

Cada petición lleva la clave pública en el encabezado \`apikey\` y, con la sesión iniciada, el token en
\`Authorization: Bearer <token>\`. La base decide qué puede hacer cada rol con sus reglas de acceso.`
    : "Cada operación indica su método HTTP y su ruta. Con la sesión iniciada, las peticiones llevan el token en `Authorization: Bearer <token>`.";
  return pagina("Introducción", 1, `
La API tiene ${operaciones.length} operaciones. Cada una indica qué roles pueden usarla y qué
requerimientos cumple; su página muestra el JSON de entrada y de salida.

## Acceso

${acceso}

## Roles

${actores.map((a) => `- ${a.nombre}`).join("\n")}

${prueba ? `## Prueba de permisos\n\nCada operación se llamó como cada rol para comprobar que solo los roles permitidos pueden usarla: ${prueba.correctas} correctas, ${prueba.fallidas} fallidas y ${prueba.inconclusas} sin verificar.\n` : ""}
## Operaciones

${tabla(["Operación", "Ruta", "Roles", "RF"], operaciones.map((op) => [`[${op.nombre}](/${archivoOperacion(op)})`, `\`${rutaDe(op, supabase)}\``, lista(op.roles).join(", "), lista(op.requerimientos).join(", ")]))}
`, { slug: "/api/introduccion" });
}

function apiAcciones(d) {
  const { acciones, operaciones } = d;
  const nombreOp = Object.fromEntries(operaciones.map((o) => [o.id, o]));
  return pagina("Acciones por pantalla", 2, `
Qué operación usa cada acción de cada pantalla. Las acciones locales o de navegación no llaman a la API.

${tabla(["Pantalla", "Acción", "Operaciones"], acciones.map((a) => [`${a.pantalla}${a.plataforma ? ` (${a.plataforma})` : ""}`, a.nombre, lista(a.operaciones).length ? a.operaciones.map((id) => (nombreOp[id] ? `[${nombreOp[id].nombre}](/${archivoOperacion(nombreOp[id])})` : id)).join(", ") : `${a.tipo}: ${texto(a.motivo)}`]))}
`, { slug: "/api/acciones" });
}

function apiOperacion(d, op, posicion) {
  const { supabase, nombreRf } = d;
  return pagina(op.nombre, posicion, `
\`${rutaDe(op, supabase)}\`

${texto(op.descripcion)}

${tabla(["Dato", "Valor"], [["Identificador", `\`${op.id}\``], ["Tipo", op.tipo], ["Recurso", `\`${op.recurso}\``], ["Método", op.metodo], ["Roles", lista(op.roles).join(", ")], ["Requerimientos", lista(op.requerimientos).map((c) => `${c} · ${nombreRf[c] || ""}`).join("; ")]])}
## Entrada

${vacio(op.entrada?.properties) ? "No recibe datos.\n" : json(op.entrada)}
## Salida

${vacio(op.salida) ? "No devuelve datos.\n" : json(op.salida)}
${!vacio(op.prueba) ? `## Ejemplo\n\nDatos con que se probó la operación:\n\n${json(op.prueba)}` : ""}
`, { slug: `/${archivoOperacion(op)}` });
}

// --- Documento completo ----------------------------------------------------------------------

export function generarDocumentacion({ proyecto, contexto, artefactos, svgs = {}, pantallas = [] }) {
  const d = datos({ proyecto, contexto, artefactos, pantallas });
  const archivos = [];
  const agregar = (ruta, contenido) => archivos.push({ ruta: `${CARPETA}/${ruta}`, contenido });

  agregar(
    "proyecto.json",
    JSON.stringify({ nombre: proyecto.nombre, descripcion: texto(proyecto.prompt).split(/(?<=\.)\s/)[0].slice(0, 160), generado: new Date().toISOString().slice(0, 10) }, null, 2) + "\n"
  );
  agregar("docs/index.md", inicio(d));

  agregar("docs/manual/_category_.json", JSON.stringify({ label: "Manual de usuario", position: 2 }, null, 2) + "\n");
  agregar("docs/manual/introduccion.md", manualIntroduccion(d));
  d.actores.forEach((a, i) => agregar(`docs/manual/${slug(a.nombre)}.md`, manualActor(d, a, i + 2)));
  agregar("docs/manual/navegacion.md", manualNavegacion(d, svgs, d.actores.length + 2));

  agregar("docs/desarrolladores/_category_.json", JSON.stringify({ label: "Desarrolladores", position: 3 }, null, 2) + "\n");
  agregar("docs/desarrolladores/arquitectura.md", devArquitectura(d, svgs));
  agregar("docs/desarrolladores/instalacion.md", devInstalacion(d));
  agregar("docs/desarrolladores/estructura.md", devEstructura(d));
  agregar("docs/desarrolladores/base-de-datos.md", devBaseDatos(d, svgs));
  agregar("docs/desarrolladores/requerimientos.md", devRequerimientos(d));
  agregar("docs/desarrolladores/backend-y-frontend.md", devBackendFrontend(d));

  agregar("docs/api/_category_.json", JSON.stringify({ label: "API", position: 4 }, null, 2) + "\n");
  agregar("docs/api/introduccion.md", apiIntroduccion(d));
  agregar("docs/api/acciones.md", apiAcciones(d));
  agregar("docs/api/operaciones/_category_.json", JSON.stringify({ label: "Operaciones", position: 3 }, null, 2) + "\n");
  d.operaciones.forEach((op, i) => agregar(`docs/api/operaciones/${slug(op.id)}.md`, apiOperacion(d, op, i + 1)));

  for (const [clave, svg] of Object.entries(svgs)) {
    if (svg && /^\s*<svg[\s>]/i.test(svg)) agregar(`static/img/diagramas/${clave}.svg`, svg);
  }
  return archivos;
}

// Resumen para la ficha del paso: cuántas páginas tiene cada sección.
export function resumenDocumentacion(archivos) {
  const cuenta = (carpeta) => archivos.filter((a) => a.ruta.startsWith(`${CARPETA}/docs/${carpeta}/`) && a.ruta.endsWith(".md")).length;
  return {
    manual: cuenta("manual"),
    desarrolladores: cuenta("desarrolladores"),
    api: cuenta("api"),
    diagramas: archivos.filter((a) => a.ruta.endsWith(".svg")).length,
    archivos: archivos.map((a) => ({ ruta: a.ruta, lineas: a.contenido.split("\n").length })),
  };
}
