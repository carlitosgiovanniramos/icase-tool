// La web debe verse igual que el prototipo aprobado: su CSS global sale del prototipo (sin IA), el armazón
// recibe el menú del prototipo y las páginas no pueden usar clases que no existan. La IA se simula.
// Uso: node --test --experimental-test-module-mocks tests/frontend-estilos.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

let llamadasIA = 0;
mock.module(new URL("../lib/gemini.js", import.meta.url).href, {
  namedExports: {
    generarContenido: async ({ contents }) => {
      llamadasIA++;
      mock.prompts = [...(mock.prompts || []), contents[0].text];
      return { text: "export default function Pagina() { return null; }\n", modelVersion: "simulado", costoUsd: 0 };
    },
  },
});

const { extraerEstiloBase, menusDelPrototipo, baseVisualDelPrototipo, clasesDeCss, clasesUsadas, estiloPropio, clasesInexistentes } = await import("../lib/baseVisual.js");
const { validarFrontend, generarArchivoFrontend } = await import("../lib/frontend.js");

const CSS_BASE = `:root { --fondo: #fafafa; --primario: #335; --radio: 2px; }
.btn { border-radius: var(--radio); }
.btn-primario { background: var(--primario); }
.tarjeta { background: #fff; }
.app { display: flex; }
.barra { width: 232px; }
.activo { font-weight: 600; }
${"/* relleno */\n".repeat(20)}`;
const html = (propios = "") => `<!DOCTYPE html><html><head><style>
${CSS_BASE}
/* Propios de esta pantalla */
${propios}
</style></head><body><div class="app"><aside class="barra"><nav><a href="#" class="activo"><span>Salas</span></a><a href="#"><span>Bloqueos</span></a></nav></aside></div></body></html>`;

test("el CSS base del prototipo es el compartido, sin lo propio de la pantalla", () => {
  const css = extraerEstiloBase(html(".solo-esta { color: red; }"));
  assert.match(css, /\.btn-primario/);
  assert.doesNotMatch(css, /solo-esta/);
});

test("el menú de cada rol se toma una vez, sin repetirlo", () => {
  const pantallas = [{ html: html() }, { html: html() }, { html: html().replace("Salas", "Reservar") }];
  assert.equal(menusDelPrototipo(pantallas).length, 2);
  assert.equal(baseVisualDelPrototipo([{ html: "<style>.a{}</style>" }]), null);
  assert.equal(baseVisualDelPrototipo(pantallas).menus.length, 2);
});

test("lee las clases de className en cadenas, llaves y plantillas", () => {
  const codigo = `<div className="tarjeta rejilla"><b className={"btn"} /><i className={\`btn-primario \${x ? "activo" : "otra"} fija\`} /><u className={a ? "uno" : 'dos'} /></div>`;
  const usadas = clasesUsadas(codigo);
  for (const c of ["tarjeta", "rejilla", "btn", "btn-primario", "activo", "otra", "fija", "uno", "dos"]) assert.ok(usadas.has(c), c);
});

test("una clase armada con prefijo y valor (aviso-${tipo}) se comprueba con sus valores reales", () => {
  const css = ".aviso {} .aviso-ok {} .aviso-error {}";
  const conValores = "<div className={`aviso aviso-${exito ? \"ok\" : \"error\"}`} />";
  assert.deepEqual(clasesInexistentes(conValores, css), []);
  const inventada = "<div className={`aviso aviso-${exito ? \"ok\" : \"peligro\"}`} />";
  assert.deepEqual(clasesInexistentes(inventada, css), ["aviso-peligro"]);
  // sin valores resolubles no se marca nada
  assert.deepEqual(clasesInexistentes("<div className={`aviso aviso-${tipo}`} />", css), []);
});

test("una clase que no está en el CSS global ni en su <style> se detecta", () => {
  const codigo = `export default function P() { return (<div className="tarjeta encabezado-pagina propia"><style jsx>{\`.propia { color: var(--primario); }\`}</style></div>); }`;
  assert.deepEqual(clasesInexistentes(codigo, CSS_BASE), ["encabezado-pagina"]);
  assert.ok(estiloPropio(codigo).includes(".propia"));
  assert.ok(clasesDeCss(CSS_BASE).has("btn-primario"));
});

const ctx = (extra = {}) => ({
  archivo: { ruta: "web/app/salas/page.js", tipo: "pagina", pieza: "nextjs" },
  existentes: new Set(),
  anteriores: [],
  carpeta: "web",
  prototipoBase: { css: CSS_BASE },
  ...extra,
});

test("la revisión del frontend marca las clases inventadas y acepta las del prototipo", () => {
  const mala = `export default function P() { return <div className="contenedor tarjeta modal-fondo" />; }`;
  assert.match(validarFrontend(mala, ctx()).join(" "), /clases que no existen.*contenedor, modal-fondo/);
  const buena = `export default function P() { return <div className="tarjeta btn btn-primario" />; }`;
  assert.deepEqual(validarFrontend(buena, ctx()), []);
  // sin el CSS del prototipo (proyectos anteriores) no se revisa
  assert.deepEqual(validarFrontend(mala, ctx({ prototipoBase: null })), []);
});

const cuerpo = (archivo, extra = {}) => ({
  nombre: "Reserva",
  analisis: { actores: [], requerimientos_funcionales: [], requerimientos_no_funcionales: [] },
  stack: { piezas: [{ pieza: "nextjs" }, { pieza: "supabase" }] },
  estructura: { archivos: [
    { ruta: "web/app/globals.css", tipo: "estilo", pieza: "nextjs", proposito: "Estilos", requerimientos: [] },
    { ruta: "web/app/layout.js", tipo: "navegacion", pieza: "nextjs", proposito: "Armazón", requerimientos: [] },
  ] },
  plataforma: "web",
  archivo,
  prototipoBase: { css: CSS_BASE, menus: ['<aside class="barra"><span>Salas</span></aside>'] },
  pantallas: [],
  anteriores: [],
  ...extra,
});

test("los estilos globales salen del prototipo, sin llamar a la IA", async () => {
  llamadasIA = 0;
  const r = await generarArchivoFrontend(cuerpo("web/app/globals.css"));
  assert.equal(llamadasIA, 0);
  assert.match(r.contenido, /\.btn-primario/);
  assert.match(r.contenido, /\.cargando/);
  assert.equal(r.modelo_ia, "prototipo");
  assert.deepEqual(r.advertencias, []);
});

test("el armazón recibe la barra lateral del prototipo y las clases disponibles", async () => {
  mock.prompts = [];
  await generarArchivoFrontend(cuerpo("web/app/layout.js"));
  const prompt = mock.prompts[0];
  assert.match(prompt, /REFERENCIA VISUAL/);
  assert.match(prompt, /BARRA LATERAL a la izquierda, no una barra superior/);
  assert.match(prompt, /<aside class="barra"><span>Salas<\/span><\/aside>/);
  assert.match(prompt, /Clases disponibles: .*btn-primario/);
  assert.match(prompt, /no existen --color-/);
});

test("el frontend web debe redirigir al cerrar sesión o al perderla", async () => {
  mock.prompts = [];
  await generarArchivoFrontend(cuerpo("web/app/layout.js"));
  assert.match(mock.prompts[0], /Tras cerrarSesion\(\) se llama router\.replace\("\/"\)/);
  assert.match(mock.prompts[0], /onAuthStateChange/);
});
