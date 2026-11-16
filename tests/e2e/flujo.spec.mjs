// CP-06 a CP-24: registro del proyecto, generación con IA en Análisis y Diseño, edición, almacenamiento,
// control de versiones y exportación, con la cuenta de pruebas y los modelos gratuitos (Claude apagado).
// Las pruebas comparten una sola página y van en orden: cada fase usa lo aprobado en la anterior.
// El identificador del proyecto creado se guarda en tests/e2e/.auth/proyecto.json para retomar una ejecución
// (ICASE_RETOMAR=1 reutiliza ese proyecto y salta la creación).
import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const EMAIL = process.env.ICASE_PRUEBAS_EMAIL;
const CLAVE = process.env.ICASE_PRUEBAS_CLAVE;
const ESTADO = "tests/e2e/.auth/proyecto.json";
const PDF = "tests/e2e/datos/reglamento-biblioteca.pdf";
const NOMBRE = "Biblioteca escolar";
const DESCRIPCION = "Sistema web para el préstamo de libros de la biblioteca de una unidad educativa. El bibliotecario registra libros y préstamos; el estudiante consulta el catálogo y sus préstamos. Un estudiante puede tener hasta tres libros prestados por siete días.";
const IA = 10 * 60_000; // espera máxima de una generación con IA

// Modo normal (no serial): si un caso falla, los siguientes se ejecutan igual y retoman el proyecto guardado.
test.describe.configure({ mode: "default" });
let page;
const leerProyecto = () => (existsSync(ESTADO) ? JSON.parse(readFileSync(ESTADO, "utf8")).id : null);
let proyectoId = process.env.ICASE_RETOMAR ? leerProyecto() : null;

test.beforeAll(async ({ browser }) => {
  mkdirSync("tests/e2e/.auth", { recursive: true });
  mkdirSync("tests/e2e/evidencias", { recursive: true });
  const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-EC" });
  page = await contexto.newPage();
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(CLAVE);
  await page.locator('button[type="submit"]').click();
  await page.getByRole("button", { name: "Aceptar" }).click();
  // Documento de entrada (CP-08): un PDF con el reglamento de préstamos, generado con el propio Chrome.
  if (!existsSync(PDF)) {
    mkdirSync("tests/e2e/datos", { recursive: true });
    const p = await contexto.newPage();
    await p.setContent(`<h1>Reglamento de préstamos de la biblioteca</h1><ol>
      <li>Cada estudiante puede tener como máximo tres libros prestados al mismo tiempo.</li>
      <li>El plazo de préstamo es de siete días calendario y puede renovarse una vez.</li>
      <li>Un estudiante con libros atrasados no puede pedir nuevos préstamos.</li>
      <li>El bibliotecario registra los libros con su título, autor, ISBN y número de ejemplares.</li></ol>`);
    await p.pdf({ path: PDF, format: "A4" });
    await p.close();
  }
});

test.afterAll(async () => page?.context().close());

const abrirProyecto = async () => {
  proyectoId ||= leerProyecto();
  await page.goto(`/proyectos/${proyectoId}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};
const abrirFase = async (nombre) => {
  // En el resumen, una fase completada se muestra como "✓ Análisis"; dentro de las fases, "1 Análisis".
  await page.getByRole("button", { name: new RegExp(`^(\\d+|✓) ${nombre}`) }).first().click();
};
const crear = () => page.getByRole("main").getByRole("button", { name: "Crear proyecto" }).click();
const estructura = async (nombre) => writeFileSync(`tests/e2e/evidencias/${nombre}.yaml`, await page.locator("main").ariaSnapshot());
const evidencia = (nombre) => page.screenshot({ path: `tests/e2e/evidencias/${nombre}.png`, fullPage: false });

test("CP-06 Crear un proyecto con nombre y descripción", async () => {
  test.skip(!!proyectoId, "Se retoma un proyecto ya creado");
  await page.getByRole("navigation").getByRole("link", { name: "Crear proyecto" }).click();
  await page.getByPlaceholder("Ej: Sistema de citas médicas").fill(NOMBRE);
  await page.getByPlaceholder(/Ej: app de citas/).fill(DESCRIPCION);
  await crear();
  await expect(page).toHaveURL(/\/$/);
  const tarjeta = page.getByRole("link", { name: new RegExp(NOMBRE) }).first();
  await expect(tarjeta).toBeVisible();
  await tarjeta.click();
  await expect(page).toHaveURL(/\/proyectos\/[0-9a-f-]{36}/);
  proyectoId = page.url().match(/proyectos\/([0-9a-f-]{36})/)[1];
  writeFileSync(ESTADO, JSON.stringify({ id: proyectoId }));
  await expect(page.getByRole("heading", { name: NOMBRE, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /01 Análisis Disponible/ })).toBeVisible();
  await evidencia("CP-06-proyecto-creado");
});

test("CP-07 Crear un proyecto con campos obligatorios vacíos", async () => {
  await page.goto("/crear");
  const nombre = page.getByPlaceholder("Ej: Sistema de citas médicas");
  const descripcion = page.getByPlaceholder(/Ej: app de citas/);
  await descripcion.fill("Descripción sin nombre");
  await crear();
  await expect(page).toHaveURL(/\/crear/);
  expect(await nombre.evaluate((el) => el.validity.valueMissing)).toBe(true);
  await nombre.fill("Proyecto sin descripción");
  await descripcion.fill("");
  await crear();
  await expect(page).toHaveURL(/\/crear/);
  expect(await descripcion.evaluate((el) => el.validity.valueMissing)).toBe(true);
  await evidencia("CP-07-campos-obligatorios");
  await page.goto("/");
  await expect(page.getByText("Proyecto sin descripción")).toHaveCount(0);
  await expect(page.getByText("Descripción sin nombre")).toHaveCount(0);
});

test("CP-08 Carga de un documento al crear el proyecto", async () => {
  await page.goto("/crear");
  await page.getByPlaceholder("Ej: Sistema de citas médicas").fill(`${NOMBRE} (con documento)`);
  await page.getByPlaceholder(/Ej: app de citas/).fill(DESCRIPCION);
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles(PDF);
  const procesado = page.waitForResponse((r) => r.url().includes("/api/procesar-documento"), { timeout: 120_000 });
  await crear();
  const resp = await procesado;
  expect(resp.status()).toBe(200);
  const cuerpo = await resp.json();
  expect(cuerpo.texto || "").toMatch(/tres libros/i);
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });
  await expect(page.getByRole("link", { name: /con documento/ }).first()).toBeVisible();
  await evidencia("CP-08-documento-procesado");
});

test("CP-09 Contexto del análisis y entrevista con la IA", async () => {
  await abrirProyecto();
  await abrirFase("Análisis");
  await page.getByRole("textbox", { name: /^Usuarios y roles/ }).fill("Bibliotecario, Estudiante");
  await page.getByRole("textbox", { name: /^Reglas de negocio/ }).fill("Un estudiante puede tener como máximo tres libros prestados\nEl préstamo dura siete días");
  await page.getByRole("textbox", { name: /^Fuera de alcance/ }).fill("Pagos y multas en línea");
  await page.getByRole("button", { name: "Web", exact: true }).click();
  await expect(page.getByText(/Guardado/).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Iniciar entrevista" }).click();
  // Cada pregunta trae su motivo y un campo para responder.
  const respuestas = page.getByRole("textbox", { name: /respuesta/i });
  await expect(respuestas.first()).toBeVisible({ timeout: IA });
  const n = await respuestas.count();
  expect(n).toBeGreaterThan(0);
  await respuestas.first().fill("El bibliotecario registra a los estudiantes en el sistema; no hay integración con otros sistemas.");
  await evidencia("CP-09-entrevista");
  await page.waitForTimeout(3000);
  await page.reload();
  await abrirFase("Análisis");
  await expect(page.getByRole("textbox", { name: /^Usuarios y roles/ })).toHaveValue("Bibliotecario, Estudiante");
  test.info().annotations.push({ type: "resultado", description: `${n} preguntas de la entrevista; el contexto se conserva al recargar.` });
});

// Despliega un grupo plegable (<details>) por el título de su encabezado.
async function desplegar(titulo) {
  const g = page.getByRole("group").filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });
  if (!(await g.evaluate((el) => el.open).catch(() => false))) await g.locator("summary").first().click();
  return g;
}
const tiempos = {};
async function medir(nombre, accion, listo) {
  const t0 = Date.now();
  await accion();
  await listo();
  tiempos[nombre] = Math.round((Date.now() - t0) / 1000);
  test.info().annotations.push({ type: "tiempo", description: `${nombre}: ${tiempos[nombre]} s` });
  await cerrarAvisoRevision(nombre);
}
// Tras generar, la herramienta puede avisar "<paso>: revisa antes de aprobar" (huecos que detectó la revisión
// con IA o la validación). Se registra el aviso como evidencia y se cierra con "Aceptar".
async function cerrarAvisoRevision(nombre) {
  const titulo = page.getByRole("heading", { name: /revisa antes de aprobar/i });
  if (!(await titulo.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false))) return;
  const texto = await titulo.locator("xpath=..").innerText();
  test.info().annotations.push({ type: "aviso", description: `${nombre}: ${texto.replace(/\s+/g, " ").slice(0, 400)}` });
  await page.screenshot({ path: `tests/e2e/evidencias/aviso-${nombre.replace(/\s+/g, "-")}.png` });
  await page.getByRole("button", { name: "Aceptar" }).last().click();
  await expect(titulo).toBeHidden();
}

test("CP-10 Generar actores y requerimientos", async () => {
  await abrirProyecto();
  await abrirFase("Análisis");
  const generar = page.getByRole("button", { name: "Generar actores y requerimientos", exact: true });
  const regenerar = page.getByRole("button", { name: "Regenerar actores y requerimientos" });
  await expect(generar.or(regenerar)).toBeVisible();
  if (await generar.isVisible()) await medir("requerimientos", () => generar.click(), () => expect(regenerar).toBeVisible({ timeout: IA }));
  await expect(page.getByRole("main").getByText(/Gemini|Groq|Llama|Qwen|GPT|Kimi/i).first()).toBeVisible();
  const actores = await desplegar("Actores");
  await expect(actores.getByRole("heading", { name: "Bibliotecario", level: 4 })).toBeVisible();
  const rf = await desplegar("Requerimientos funcionales");
  await expect(rf.getByText("RF01").first()).toBeVisible();
  const rnf = await desplegar("Requerimientos no funcionales");
  await expect(rnf.getByText(/RNF01/).first()).toBeVisible();
  const nRF = await rf.getByRole("heading", { level: 4 }).count();
  const nRNF = await rnf.getByRole("heading", { level: 4 }).count();
  const nAct = await actores.getByRole("heading", { level: 4 }).count();
  await estructura("CP-10-requerimientos");
  await rf.scrollIntoViewIfNeeded();
  await evidencia("CP-10-requerimientos");
  test.info().annotations.push({ type: "resultado", description: `${nAct} actores, ${nRF} RF y ${nRNF} RNF` });
});

test("CP-11 Editar un requerimiento a mano", async () => {
  await abrirProyecto();
  await abrirFase("Análisis");
  const rf = await desplegar("Requerimientos funcionales");
  const nueva = `El sistema debe permitir el ingreso con correo y contraseña, diferenciando los roles de Bibliotecario y Estudiante (editado ${Date.now()}).`;
  await rf.getByRole("button", { name: "✎ Editar" }).first().click();
  await rf.getByRole("textbox", { name: "Descripción" }).fill(nueva);
  await rf.getByRole("combobox", { name: "Prioridad" }).selectOption("Media");
  await rf.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(rf.getByText(nueva)).toBeVisible();
  await evidencia("CP-11-editado");
  await page.waitForTimeout(2000);
  await page.reload();
  await abrirFase("Análisis");
  const rf2 = await desplegar("Requerimientos funcionales");
  await expect(rf2.getByText(nueva)).toBeVisible();
  await expect(rf2.getByText(/Prioridad media/).first()).toBeVisible();
});

test("CP-12 Ampliar los requerimientos con IA", async () => {
  await abrirProyecto();
  await abrirFase("Análisis");
  const rf = await desplegar("Requerimientos funcionales");
  const antes = await rf.getByRole("heading", { level: 4 }).count();
  await page.getByRole("textbox", { name: /Ej: faltan requerimientos/ }).fill("Agrega un requerimiento para exportar el reporte de préstamos a PDF");
  await medir("ampliar", () => page.getByRole("button", { name: "Aplicar cambios" }).click(),
    () => expect(rf.getByRole("heading", { level: 4 })).toHaveCount(antes + 1, { timeout: IA }));
  await expect(rf.getByText(/PDF/).first()).toBeVisible();
  await estructura("CP-12-ampliado");
  await rf.getByText(/PDF/).first().scrollIntoViewIfNeeded();
  await evidencia("CP-12-ampliado");
  test.info().annotations.push({ type: "resultado", description: `De ${antes} a ${antes + 1} requerimientos funcionales` });
});

// Despliega un paso plegado ("▸ Título") de la fase abierta.
async function abrirPaso(titulo) {
  const plegado = page.getByRole("button", { name: new RegExp(`^▸ ${titulo}$`, "i") });
  if (await plegado.isVisible()) await plegado.click();
}
// Genera un paso con IA si todavía no tiene resultado (o lo deja como está al retomar) y mide el tiempo.
async function generarPaso(nombreBoton, clave) {
  await abrirPaso(nombreBoton);
  const generar = page.getByRole("button", { name: `Generar ${nombreBoton}`, exact: true });
  const regenerar = page.getByRole("button", { name: `Regenerar ${nombreBoton}`, exact: true });
  // Aprobado (bloqueado), el paso muestra "Editar" y no se vuelve a generar.
  await expect(generar.or(regenerar).or(page.getByRole("main").getByRole("button", { name: "Editar", exact: true })).first()).toBeVisible();
  if (await generar.isVisible()) await medir(clave, () => generar.click(), () => expect(regenerar).toBeVisible({ timeout: IA }));
}
// Aprueba un paso si todavía no está aprobado.
async function aprobar(nombre) {
  const boton = page.getByRole("button", { name: `Aprobar ${nombre}` });
  if (await boton.isVisible()) await boton.click();
  await expect(boton).toBeHidden();
}

// Aprueba una fase y, si aparece, continúa a la siguiente; la siguiente queda habilitada.
async function aprobarFase(fase, siguiente) {
  const aprobarF = page.getByRole("button", { name: `Aprobar fase de ${fase}` });
  if (await aprobarF.isVisible()) await aprobarF.click();
  const continuar = page.getByRole("button", { name: `Continuar a ${siguiente}` });
  await continuar.waitFor({ state: "visible", timeout: 5000 }).then(() => continuar.click()).catch(() => {});
  await expect(page.getByRole("button", { name: new RegExp(`^(\\d+|✓) ${siguiente}`) }).first()).toBeEnabled();
}

test("CP-13 Casos de uso y aprobación del Análisis", async () => {
  await abrirProyecto();
  await abrirFase("Análisis");
  await aprobar("Requerimientos");
  await generarPaso("diagrama de casos de uso", "casos de uso");
  const dibujo = page.getByRole("main").getByRole("document").first();
  await expect(dibujo.getByText("Bibliotecario", { exact: true }).first()).toBeVisible();
  await expect(dibujo.getByText("Estudiante", { exact: true }).first()).toBeVisible();
  await evidencia("CP-13-casos-de-uso");
  await aprobar("Casos de uso");
  await aprobarFase("Análisis", "Diseño");
  await estructura("CP-13-diseno");
});

// Aprueba el paso pendiente que esté abierto (botón "Aprobar <paso>", no el de la fase).
async function aprobarPaso() {
  await cerrarAvisoRevision("antes de aprobar");
  const botones = page.getByRole("main").getByRole("button", { name: /^Aprobar (?!fase)/ });
  await expect(botones.first()).toBeVisible();
  const nombre = await botones.first().innerText();
  await botones.first().click();
  await expect(page.getByRole("button", { name: nombre, exact: true })).toBeHidden();
}
// Dibujo del paso: el último diagrama (document) visible de la fase.
const dibujo = () => page.getByRole("main").getByRole("document").last();

test("CP-14 Generar los diagramas de clases y entidad-relación", async () => {
  await abrirProyecto();
  await abrirFase("Diseño");
  await generarPaso("diagrama de clases", "clases");
  await expect(dibujo()).toBeVisible();
  await expect(dibujo().getByText(/Libro/i).first()).toBeVisible();
  await evidencia("CP-14-clases");
  if (await page.getByRole("button", { name: /^Aprobar (?!fase)/ }).first().isVisible()) await aprobarPaso();
  await generarPaso("diagrama entidad-relación", "entidad-relación");
  await expect(dibujo().getByText(/LIBRO/).first()).toBeVisible();
  await evidencia("CP-14-entidad-relacion");
  await estructura("CP-14-diseno");
});

test("CP-15 Editar el código de un diagrama", async () => {
  await abrirProyecto();
  await abrirFase("Diseño");
  await abrirPaso("Diagrama entidad-relación");
  await page.getByRole("main").getByRole("button", { name: "Código", exact: true }).last().click();
  const codigo = page.getByRole("main").getByRole("textbox").filter({ hasText: "erDiagram" }).first();
  await expect(codigo).toBeVisible();
  const original = await codigo.inputValue();
  // Válido: un atributo nuevo en la entidad de préstamos.
  const valido = original.includes("fecha_devolucion")
    ? original
    : original.replace(/(\n(\s*)\w+\s+fecha_vencimiento[^\n]*)/, "$1\n$2date fecha_devolucion");
  expect(valido).toContain("fecha_devolucion");
  await codigo.fill(valido);
  const guardar = page.getByRole("main").getByRole("button", { name: "Guardar cambios" });
  if (await guardar.isEnabled()) await guardar.click();
  await expect(dibujo().getByText("fecha_devolucion").first()).toBeVisible();
  await evidencia("CP-15-codigo-valido");
  // Inválido: una relación con sintaxis rota.
  await codigo.fill(`${valido}\n  PRESTAMO ||--o{ :::: sin destino`);
  if (await guardar.isEnabled()) await guardar.click();
  await page.waitForTimeout(2000);
  await evidencia("CP-15-codigo-invalido");
  await estructura("CP-15-invalido");
  await page.reload();
  await abrirFase("Diseño");
  await abrirPaso("Diagrama entidad-relación");
  await page.getByRole("main").getByRole("button", { name: "Código", exact: true }).last().click();
  const guardado = await page.getByRole("main").getByRole("textbox").filter({ hasText: "erDiagram" }).first().inputValue();
  expect(guardado).toContain("fecha_devolucion");
  expect(guardado).not.toContain(":::: sin destino");
});

test("CP-16 Generar el prototipo de pantallas", async () => {
  test.setTimeout(45 * 60_000);
  await abrirProyecto();
  await abrirFase("Diseño");
  if (await page.getByRole("button", { name: "Aprobar Diagrama entidad-relación" }).isVisible()) await aprobarPaso();
  await abrirPaso("Prototipo de pantallas");
  const generar = page.getByRole("button", { name: /^Generar prototipo \(\d+ pantallas?\)/ });
  if (await generar.isVisible()) {
    await page.getByRole("main").getByRole("textbox").filter({ hasText: /^#/ }).or(page.getByRole("main").locator('input[value^="#"]')).first().fill("#1E3A8A");
    await medir("proponer pantallas", () => page.getByRole("button", { name: "Proponer pantallas con IA" }).click(),
      () => expect(generar).toBeEnabled({ timeout: IA }));
    const pantallas = Number((await generar.innerText()).match(/\((\d+)/)[1]);
    expect(pantallas).toBeGreaterThan(0);
    await evidencia("CP-16-pantallas-propuestas");
    await medir("prototipo", () => generar.click(),
      // Se genera pantalla por pantalla ("Generando 3/8: …"); termina cuando ya no hay generación en curso.
      async () => {
        await expect(page.getByRole("button", { name: /^Generando \d+\/\d+/ })).toBeVisible({ timeout: 60_000 });
        await expect(page.getByRole("button", { name: /^Generando \d+\/\d+/ })).toHaveCount(0, { timeout: 40 * 60_000 });
        await expect(page.getByRole("button", { name: /^Regenerar prototipo \(\d+ pantallas?\)/ })).toBeVisible();
      });
    test.info().annotations.push({ type: "resultado", description: `${pantallas} pantallas propuestas` });
  }
  // Si alguna pantalla llegó incompleta, la herramienta avisa "Prototipo generado con errores" y ofrece
  // "Agregar faltantes (n)": se registra el aviso y se completan (hasta 3 intentos), como lo haría el usuario.
  for (let intento = 1; intento <= 3; intento++) {
    const errores = page.getByRole("heading", { name: "Prototipo generado con errores" });
    if (await errores.isVisible()) {
      const texto = await errores.locator("xpath=..").innerText();
      test.info().annotations.push({ type: "aviso", description: `intento ${intento}: ${texto.replace(/\s+/g, " ").slice(0, 400)}` });
      await page.screenshot({ path: `tests/e2e/evidencias/aviso-prototipo-${intento}.png` });
      await page.getByRole("button", { name: "Aceptar" }).last().click();
    }
    const faltantes = page.getByRole("button", { name: /^Agregar faltantes \(\d+\)/ });
    if (!(await faltantes.isVisible())) break;
    const n = (await faltantes.innerText()).match(/\((\d+)\)/)[1];
    await medir(`faltantes ${intento}`, () => faltantes.click(), async () => {
      await expect(page.getByRole("button", { name: /^Generando \d+\/\d+/ })).toBeVisible({ timeout: 60_000 }).catch(() => {});
      await expect(page.getByRole("button", { name: /^Generando \d+\/\d+/ })).toHaveCount(0, { timeout: 20 * 60_000 });
    });
    test.info().annotations.push({ type: "resultado", description: `intento ${intento}: ${n} pantallas faltantes regeneradas` });
  }
  const total = Number((await page.getByRole("button", { name: /^Regenerar prototipo \(\d+ pantallas?\)/ }).innerText()).match(/\((\d+)/)[1]);
  await expect(page.getByText(/^generada$/i)).toHaveCount(total);
  test.info().annotations.push({ type: "resultado", description: `${total} de ${total} pantallas generadas` });
  await estructura("CP-16-prototipo");
  await evidencia("CP-16-prototipo");
});

test("CP-17 Árbol de navegación, arquitectura, sistemas y aprobación del Diseño", async () => {
  test.setTimeout(45 * 60_000);
  await abrirProyecto();
  await abrirFase("Diseño");
  const aprobarPrototipo = page.getByRole("button", { name: "Aprobar Prototipo", exact: true });
  if (await aprobarPrototipo.isVisible()) await aprobarPaso();
  for (const [titulo, clave] of [["Árbol de navegación", "árbol de navegación"], ["Diagrama de arquitectura", "arquitectura"], ["Diagrama de sistemas", "sistemas"]]) {
    await abrirPaso(titulo);
    const generar = page.getByRole("main").getByRole("button", { name: /^Generar (?!prototipo)/ }).first();
    const aprobarB = page.getByRole("main").getByRole("button", { name: /^Aprobar (?!fase)/ }).first();
    await expect(generar.or(aprobarB).or(page.getByRole("button", { name: /^Aprobar fase de Diseño|^Continuar a Implementación/ })).first()).toBeVisible();
    if (await generar.isVisible()) await medir(clave, () => generar.click(), () => expect(aprobarB).toBeVisible({ timeout: IA }));
    // Mermaid se dibuja como SVG (document); PlantUML (diagrama de sistemas) como imagen.
    await expect(page.getByRole("main").getByRole("document").or(page.getByRole("main").getByRole("img")).last()).toBeVisible();
    await evidencia(`CP-17-${clave.replace(/\s+/g, "-")}`);
    if (await aprobarB.isVisible()) await aprobarPaso();
  }
  await aprobarFase("Diseño", "Implementación");
  await expect(page.getByRole("button", { name: /^(\d+|✓) Informe/ }).first()).toBeEnabled();
  await estructura("CP-17-implementacion");
});

async function iniciarSesion() {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(CLAVE);
  await page.locator('button[type="submit"]').click();
  await page.getByRole("button", { name: "Aceptar" }).click();
}
// Abre la pestaña "Código" del paso abierto y devuelve su cuadro de texto.
async function codigoDelPaso(marca) {
  await page.getByRole("main").getByRole("button", { name: "Código", exact: true }).last().click();
  // El código es el único cuadro de texto sin texto de ejemplo del paso abierto; su contenido se comprueba por el valor.
  // Si hay varios pasos abiertos, se elige el cuadro cuyo contenido corresponde al diagrama pedido.
  const patron = typeof marca === "string" ? new RegExp(marca) : marca;
  const cajas = page.getByRole("main").locator("textarea:not([placeholder])");
  await expect(cajas.first()).toBeVisible();
  for (const caja of await cajas.all()) if (patron.test(await caja.inputValue())) return caja;
  throw new Error(`No hay un cuadro de código con ${patron}`);
}

test("CP-18 Persistencia de los artefactos", async () => {
  await abrirProyecto();
  await page.reload();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
  await iniciarSesion();
  await page.getByRole("link", { name: new RegExp(NOMBRE) }).first().click();
  await expect(page.getByRole("button", { name: /^✓ Análisis/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^✓ Diseño/ })).toBeVisible();
  await abrirFase("Análisis");
  await abrirPaso("Actores y requerimientos");
  const rf = await desplegar("Requerimientos funcionales");
  await expect(rf.getByText(/PDF/).first()).toBeVisible();
  await abrirFase("Diseño");
  await abrirPaso("Diagrama entidad-relación");
  const er = await codigoDelPaso("erDiagram");
  expect(await er.inputValue()).toContain("fecha_devolucion");
  await evidencia("CP-18-persistencia");
});

test("CP-19 Editar un paso aprobado deja desactualizados los siguientes", async () => {
  await abrirProyecto();
  await abrirFase("Diseño");
  await abrirPaso("Diagrama de clases");
  await page.getByRole("main").getByRole("button", { name: "Editar", exact: true }).first().click();
  const confirmacion = page.getByRole("heading", { name: "¿Editar diagrama de clases?" });
  await expect(confirmacion).toBeVisible();
  await expect(page.getByText(/perderá su aprobación y afectará a: Diagrama entidad-relación/)).toBeVisible();
  await evidencia("CP-19-confirmacion");
  await page.getByRole("button", { name: "Editar", exact: true }).last().click();
  const codigo = await codigoDelPaso("classDiagram");
  const actual = await codigo.inputValue();
  await codigo.fill(actual.includes("class Autor") ? actual.replace(/\n\s*class Autor[\s\S]*?\}\n?/, "\n") : `${actual}\n    class Autor {\n      +String nombre\n    }`);
  await page.getByRole("main").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Desactualizado").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Actualizar todo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Conservar como está" })).toBeVisible();
  const n = await page.getByText("Desactualizado", { exact: true }).count();
  await estructura("CP-19-desactualizados");
  await evidencia("CP-19-desactualizados");
  test.info().annotations.push({ type: "resultado", description: `${n} etiquetas "Desactualizado"` });
});

test("CP-20 Conservar los pasos como están", async () => {
  await abrirProyecto();
  await abrirFase("Diseño");
  await page.getByRole("button", { name: "Conservar como está" }).click();
  await expect(page.getByRole("heading", { name: "¿Conservar como está?" })).toBeVisible();
  await evidencia("CP-20-confirmacion");
  await page.getByRole("button", { name: "Conservar", exact: true }).click();
  await expect(page.getByText("Desactualizado", { exact: true })).toHaveCount(0, { timeout: 30_000 });
  await evidencia("CP-20-conservados");
  // El paso editado queda pendiente de aprobación: se aprueba y se vuelve a aprobar la fase.
  if (await page.getByRole("main").getByRole("button", { name: /^Aprobar (?!fase)/ }).first().isVisible()) await aprobarPaso();
  await aprobarFase("Diseño", "Implementación");
  await estructura("CP-20-conservados");
});

// Confirma un modal de confirmación si aparece (botón con el texto dado).
async function confirmarSiAparece(texto) {
  const boton = page.getByRole("button", { name: texto, exact: true }).last();
  await boton.waitFor({ state: "visible", timeout: 5000 }).then(() => boton.click()).catch(() => {});
}

test("CP-21 Actualizar todo en cascada", async () => {
  test.setTimeout(30 * 60_000);
  await abrirProyecto();
  await abrirFase("Diseño");
  await abrirPaso("Diagrama de arquitectura");
  await page.getByRole("main").getByRole("button", { name: "Editar", exact: true }).first().click();
  await page.getByRole("button", { name: "Editar", exact: true }).last().click();
  const codigo = await codigoDelPaso(/flowchart|graph|@startuml/);
  await codigo.fill(`${(await codigo.inputValue()).trimEnd()}\n%% revisado en las pruebas ${Date.now()}`);
  await page.getByRole("main").getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Desactualizado", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await medir("actualizar todo", async () => {
    await page.getByRole("button", { name: "Actualizar todo" }).click();
    await confirmarSiAparece("Actualizar");
  }, () => expect(page.getByText("Desactualizado", { exact: true })).toHaveCount(0, { timeout: IA }));
  await abrirPaso("Diagrama de sistemas");
  await expect(page.getByText(/Actualizado · pendiente de revisión/).first()).toBeVisible();
  await estructura("CP-21-actualizado");
  await evidencia("CP-21-actualizado");
});

test("CP-22 Regenerar un artefacto pide confirmación", async () => {
  await abrirProyecto();
  await abrirFase("Diseño");
  await soloPaso("Diagrama de arquitectura");
  const aprobarArquitectura = page.getByRole("button", { name: "Aprobar Diagrama de arquitectura" });
  await aprobarArquitectura.waitFor({ state: "visible", timeout: 10_000 }).then(() => aprobarPaso()).catch(() => {});
  await soloPaso("Diagrama de sistemas");
  const regenerar = page.getByRole("button", { name: "Regenerar diagrama de sistemas", exact: true });
  await expect(regenerar).toBeVisible();
  const codigo = await codigoDelPaso(/@startuml|Explicación|package|component/);
  const antes = await codigo.inputValue();
  await regenerar.click();
  await expect(page.getByRole("heading", { name: "¿Regenerar diagrama de sistemas?" })).toBeVisible();
  await expect(page.getByText(/Se reemplazará la versión actual/)).toBeVisible();
  await evidencia("CP-22-confirmacion");
  await page.getByRole("button", { name: "Cancelar", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "¿Regenerar diagrama de sistemas?" })).toBeHidden();
  expect(await codigo.inputValue()).toBe(antes);
  // Se aprueba el diagrama de sistemas actualizado y la fase, para el informe.
  await expect(page.getByRole("button", { name: "Aprobar Diagrama de sistemas" })).toBeVisible();
  await aprobarPaso();
  await aprobarFase("Diseño", "Implementación");
});

// Deja abierto solo el paso indicado (pliega los demás), para que sus botones no se confundan.
async function soloPaso(titulo) {
  // Se pliega de a uno y se vuelve a leer la lista: al plegar, los botones abiertos cambian.
  for (let i = 0; i < 12; i++) {
    // textContent conserva las mayúsculas originales (el CSS muestra los títulos en mayúsculas).
    const abiertos = (await page.getByRole("button", { name: /^▾ / }).allTextContents()).map((t) => t.replace(/^▾\s*/, "").trim());
    const otro = abiertos.find((n) => n !== titulo);
    if (!otro) break;
    await page.getByRole("button", { name: `▾ ${otro}`, exact: true }).click();
  }
  await abrirPaso(titulo);
}

test("CP-23 Descargar un diagrama en SVG", async () => {
  await abrirProyecto();
  await abrirFase("Diseño");
  const resultados = [];
  for (const [titulo, marca] of [["Diagrama entidad-relación", "PRESTAMO"], ["Diagrama de arquitectura", "Express"]]) {
    await soloPaso(titulo);
    const descarga = page.waitForEvent("download");
    await page.getByRole("main").getByRole("button", { name: "Descargar SVG" }).click();
    const archivo = await descarga;
    const ruta = `tests/e2e/evidencias/${archivo.suggestedFilename()}`;
    await archivo.saveAs(ruta);
    const svg = readFileSync(ruta, "utf8");
    // Bien formado: sin errores de XML (así se abre como imagen fuera de I-CASE Tool).
    const error = await page.evaluate((x) => new DOMParser().parseFromString(x, "image/svg+xml").querySelector("parsererror")?.textContent || "", svg);
    resultados.push({
      archivo: archivo.suggestedFilename(),
      kb: Math.round(svg.length / 1024),
      svg: /<svg[\s>]/.test(svg),
      marca: svg.includes(marca),
      valido: !error,
      error: error.split("\n")[0],
      brSinCerrar: (svg.match(/<br>/g) || []).length,
    });
  }
  test.info().annotations.push({ type: "resultado", description: JSON.stringify(resultados) });
  writeFileSync("tests/e2e/evidencias/CP-23-svg.json", JSON.stringify(resultados, null, 2));
  for (const r of resultados) {
    expect.soft(r.svg, `${r.archivo}: es SVG`).toBe(true);
    expect.soft(r.marca, `${r.archivo}: trae el contenido del diagrama`).toBe(true);
    expect.soft(r.valido, `${r.archivo}: XML bien formado (${r.error})`).toBe(true);
  }
});

test("CP-24 Exportar el informe del proyecto en PDF", async () => {
  await abrirProyecto();
  await abrirFase("Informe");
  const exportar = page.getByRole("button", { name: /Exportar PDF/ });
  await expect(exportar).toBeVisible({ timeout: 60_000 });
  // "Exportar PDF" abre el diálogo de impresión del navegador: se registra la llamada y se imprime a PDF
  // con el motor del navegador (lo mismo que "Guardar como PDF").
  await page.evaluate(() => { window.__impreso = 0; window.print = () => { window.__impreso++; }; });
  await exportar.click();
  expect(await page.evaluate(() => window.__impreso)).toBe(1);
  await page.emulateMedia({ media: "print" });
  const ruta = "tests/e2e/evidencias/informe-biblioteca-escolar.pdf";
  await page.pdf({ path: ruta, format: "A4", printBackground: true });
  await page.emulateMedia({ media: "screen" });
  const { PDFParse } = await import("pdf-parse");
  const lector = new PDFParse({ data: readFileSync(ruta) });
  const { text, total } = await lector.getText();
  await lector.destroy();
  for (const seccion of [NOMBRE, "Requerimientos", "casos de uso", "clases", "entidad-relación", "Prototipo", "arquitectura"]) {
    expect(text.toLowerCase()).toContain(seccion.toLowerCase());
  }
  await evidencia("CP-24-informe");
  test.info().annotations.push({ type: "resultado", description: `PDF de ${total} páginas` });
});
