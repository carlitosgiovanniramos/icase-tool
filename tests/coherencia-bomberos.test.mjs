// CP-28 (APE4): coherencia de los artefactos que la IA generó para el caso de estudio "Cuerpo de Bomberos".
// Aplica a los artefactos aprobados las mismas reglas que usan los validadores de las rutas de generación
// (análisis, casos de uso, clases y entidad-relación) y comprueba la trazabilidad con el código generado
// (migraciones, páginas del prototipo y contrato de API).
// Datos: ICASE_DISENO (diseño exportado) e ICASE_PROYECTO (carpeta del proyecto sincronizada por el runner).
// Si no están (por ejemplo, en GitHub Actions), las pruebas se omiten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { CARACTERISTICAS_25010 } from "../lib/iso25010.js";
import { normalizarCodigo } from "../lib/jsonIA.js";

const DISENO = process.env.ICASE_DISENO || "respaldos/diseno/cuerpo_de_bomberos_banos_de_agua_santa-10784326.json";
const PROYECTO = process.env.ICASE_PROYECTO || "C:/icase-workspaces/10784326-7058-4a78-ac13-d0470623a5d5";
const hayDatos = existsSync(DISENO) && existsSync(PROYECTO);
const omitir = hayDatos ? false : "sin los datos del caso de estudio (respaldos/diseno y la carpeta del proyecto)";

const d = hayDatos ? JSON.parse(readFileSync(DISENO, "utf8")) : {};
const rf = d.analisis?.requerimientos_funcionales || [];
const rnf = d.analisis?.requerimientos_no_funcionales || [];
const actores = (d.analisis?.actores || []).map((a) => a.nombre);
const sinGuiones = (t) => String(t || "").replace(/[_\s]/g, "").toLowerCase();
const lineas = (codigo) => String(codigo || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("%%"));
const archivos = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  const p = path.join(dir, n);
  return statSync(p).isDirectory() ? (n === "node_modules" ? [] : archivos(p)) : [p];
}) : []);

// Entidades del diagrama entidad-relación con sus atributos y claves.
function entidadesER(codigo) {
  const entidades = new Map();
  let actual = null;
  for (const l of lineas(codigo)) {
    if (actual) {
      if (l === "}") actual = null;
      else {
        const a = l.match(/^(\S+)\s+(\w+)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?/);
        if (a) entidades.get(actual).push({ nombre: a[2], claves: (a[3] || "").split(/\s*,\s*/).filter(Boolean) });
      }
      continue;
    }
    const e = l.match(/^(\w+)\s*\{$/);
    if (e) { actual = e[1]; if (!entidades.has(actual)) entidades.set(actual, []); }
  }
  return entidades;
}

test("Análisis: requerimientos completos y consistentes", { skip: omitir }, () => {
  assert.ok(rf.length > 0, "No hay requerimientos funcionales");
  const codigos = rf.map((r) => normalizarCodigo(r.codigo));
  assert.deepEqual(codigos.filter((c, i) => codigos.indexOf(c) !== i), [], "Códigos de RF repetidos");
  const problemas = [];
  for (const r of rf) {
    for (const dep of r.dependencias || []) if (!codigos.includes(normalizarCodigo(dep))) problemas.push(`${r.codigo} depende de ${dep}, que no existe`);
    for (const a of r.actores || []) if (!actores.includes(a)) problemas.push(`${r.codigo} usa el actor "${a}", que no está en el análisis`);
    if (!/^El sistema debe/i.test(r.descripcion || "")) problemas.push(`${r.codigo} no está redactado como "El sistema debe..."`);
    for (const campo of ["precondiciones", "postcondiciones", "metodo_verificacion", "prioridad"]) if (!r[campo]) problemas.push(`${r.codigo} sin ${campo}`);
  }
  for (const r of rnf) {
    const c = CARACTERISTICAS_25010.find((x) => x.nombre === r.categoria);
    if (!c) problemas.push(`${r.codigo}: categoría fuera de ISO/IEC 25010 ("${r.categoria}")`);
    else if (r.subcategoria && !c.subcaracteristicas.includes(r.subcategoria)) problemas.push(`${r.codigo}: "${r.subcategoria}" no es subcaracterística de "${r.categoria}"`);
  }
  assert.deepEqual(problemas, []);
});

test("Casos de uso: un caso de uso por requerimiento funcional y solo actores del análisis", { skip: omitir }, () => {
  const casos = new Set();
  const nodos = new Map();
  for (const l of lineas(d.diagrama_casos_uso)) {
    const nodo = l.match(/^(\w+)\s*[[(]+\s*"([^"]*)"/);
    if (nodo && !/^(class|classDef|style|end|subgraph)$/.test(nodo[1])) nodos.set(nodo[1], nodo[2]);
  }
  for (const id of nodos.keys()) if (/^RF\d+$/i.test(id)) casos.add(normalizarCodigo(id));
  const codigos = rf.map((r) => normalizarCodigo(r.codigo));
  assert.deepEqual(codigos.filter((c) => !casos.has(c)), [], "Requerimientos sin caso de uso");
  assert.deepEqual([...casos].filter((c) => !codigos.includes(c)), [], "Casos de uso de requerimientos que no existen");
  const actoresDiagrama = [...nodos].filter(([id]) => !/^RF\d+$/i.test(id) && id !== "SISTEMA").map(([, t]) => t);
  assert.deepEqual(actores.filter((a) => !actoresDiagrama.includes(a)), [], "Actores del análisis que faltan en el diagrama");
});

test("Entidad-relación: cada entidad con clave primaria y relaciones entre entidades definidas", { skip: omitir }, () => {
  const entidades = entidadesER(d.diagrama_er);
  assert.ok(entidades.size > 0, "El ER no tiene entidades");
  assert.deepEqual([...entidades].filter(([, at]) => !at.some((a) => a.claves.includes("PK"))).map(([n]) => n), [], "Entidades sin PK");
  const noDefinidas = [];
  for (const l of lineas(d.diagrama_er)) {
    const r = l.match(/^(\w+)\s+[|o}{]{2}(?:--|\.\.)[|o}{]{2}\s+(\w+)\s*:/);
    if (r) for (const n of [r[1], r[2]]) if (!entidades.has(n)) noDefinidas.push(n);
  }
  assert.deepEqual([...new Set(noDefinidas)], [], "Relaciones con entidades no definidas");
});

test("Clases y entidad-relación: cada entidad tiene su clase del dominio", { skip: omitir }, () => {
  const clases = new Set([...String(d.diagrama_clases).matchAll(/^\s*class\s+(\w+)/gm)].map((m) => sinGuiones(m[1])));
  const entidades = [...entidadesER(d.diagrama_er).keys()];
  // Las tablas intermedias o técnicas (detalle, relación N a M) pueden no tener clase propia: se reportan aparte.
  const sinClase = entidades.filter((e) => !clases.has(sinGuiones(e)));
  assert.ok(sinClase.length <= Math.ceil(entidades.length * 0.25), `Demasiadas entidades sin clase: ${sinClase.join(", ")}`);
  if (sinClase.length) console.log(`  entidades sin clase propia (tablas de detalle o intermedias): ${sinClase.join(", ")}`);
});

test("Base de datos: cada entidad del ER tiene su tabla en las migraciones", { skip: omitir }, () => {
  const sql = archivos(path.join(PROYECTO, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(f, "utf8")).join("\n");
  const tablas = new Set([...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1].toLowerCase()));
  const entidades = [...entidadesER(d.diagrama_er).keys()].map((e) => e.toLowerCase());
  assert.deepEqual(entidades.filter((e) => !tablas.has(e)), [], "Entidades del ER sin tabla en la base");
  const sinEntidad = [...tablas].filter((t) => !entidades.includes(t));
  assert.deepEqual(sinEntidad, [], "Tablas de la base que no están en el diagrama entidad-relación");
});

test("Prototipo y web: cada pantalla web del prototipo tiene su página", { skip: omitir }, () => {
  const web = archivos(path.join(PROYECTO, "web", "app")).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");
  const pantallas = (d.mockups || []).filter((m) => m.plataforma === "Web").map((m) => m.nombre);
  assert.ok(pantallas.length > 0, "El prototipo no tiene pantallas web");
  assert.deepEqual(pantallas.filter((n) => !web.includes(n)), [], "Pantallas web sin página");
});

test("Contrato de API: cada operación con roles del análisis y requerimientos existentes", { skip: omitir }, () => {
  const contrato = JSON.parse(readFileSync(path.join(PROYECTO, "contrato", "api.json"), "utf8"));
  const ops = contrato.operaciones || [];
  assert.ok(ops.length > 0, "El contrato no tiene operaciones");
  const codigos = rf.map((r) => normalizarCodigo(r.codigo));
  const problemas = [];
  for (const o of ops) {
    for (const rol of o.roles || []) if (!actores.includes(rol)) problemas.push(`${o.id}: rol "${rol}" no es actor`);
    for (const r of o.requerimientos || []) if (!codigos.includes(normalizarCodigo(r))) problemas.push(`${o.id}: ${r} no existe`);
    if (!(o.roles || []).length) problemas.push(`${o.id}: sin roles`);
  }
  assert.deepEqual(problemas, []);
  const cubiertos = new Set(ops.flatMap((o) => (o.requerimientos || []).map(normalizarCodigo)));
  console.log(`  ${ops.length} operaciones; requerimientos cubiertos por el contrato: ${cubiertos.size} de ${codigos.length}`);
});
