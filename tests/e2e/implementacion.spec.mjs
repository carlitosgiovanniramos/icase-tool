// CP-25 a CP-27: fase de Implementación del caso de estudio "Cuerpo de Bomberos" en el equipo local
// (icase-tool con `npm run all`, runner y Docker). Usa la sesión del dueño del proyecto, guardada con
// `node tests/e2e/guardar-sesion.mjs` en tests/e2e/.auth/usuario.json.
import { test, expect } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const PROYECTO = process.env.ICASE_PROYECTO_BOMBEROS || "10784326-7058-4a78-ac13-d0470623a5d5";
const LEVANTAR = 20 * 60_000;
test.describe.configure({ mode: "serial" });

async function abrirImplementacion(page) {
  await page.goto(`/proyectos/${PROYECTO}`);
  await page.getByRole("button", { name: /^(\d+|✓) Implementación/ }).first().click();
  await expect(page.getByRole("heading", { name: "Ejecución" })).toBeVisible();
}
const evidencia = (page, nombre) => page.screenshot({ path: `tests/e2e/evidencias/${nombre}.png`, fullPage: false });

// Pulsa "Levantar" (o "Actualizar y reiniciar") salvo que ya haya una operación en curso, y espera a que
// termine: todos los servicios quedan "Encendido" (o "Completada" las tareas de un solo uso), sin errores.
async function levantarYEsperar(page) {
  const enCurso = page.getByRole("button", { name: /^(Levantando|Deteniendo)\.\.\.$/ });
  const levantar = page.getByRole("button", { name: /^(Levantar|Actualizar y reiniciar)$/ });
  await expect(enCurso.or(levantar).first()).toBeVisible();
  if (await levantar.isVisible()) {
    await levantar.click();
    await enCurso.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  }
  await expect(enCurso).toHaveCount(0, { timeout: LEVANTAR });
  await expect(page.getByText("Encendido", { exact: true }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/^Con errores$/i)).toHaveCount(0, { timeout: 60_000 });
}

test("CP-25 Base de datos generada y probada en contenedores", async ({ page }) => {
  await abrirImplementacion(page);
  await page.getByRole("button", { name: "▸ Base de datos" }).click();
  const ficha = page.getByText(/Probada en contenedores/).first();
  await expect(ficha).toBeVisible();
  // La ficha está repartida en varios elementos: se lee el texto de la página.
  const texto = (await page.getByRole("main").innerText()).replace(/\s+/g, " ");
  expect(texto).toMatch(/Tablas del ER\s*22\/22/i);
  expect(texto).toMatch(/Con RLS y políticas\s*22\/22/i);
  expect(texto).toMatch(/Con datos de prueba\s*22\/22/i);
  expect(texto).toMatch(/3 usuarios de prueba/i);
  await ficha.scrollIntoViewIfNeeded();
  await evidencia(page, "CP-25-base-de-datos");
  const resumen = texto.match(/Probada en contenedores.{0,160}/i);
  test.info().annotations.push({ type: "resultado", description: resumen ? resumen[0] : "" });
});

test("CP-26 Levantar el proyecto generado", async ({ page, request }) => {
  test.setTimeout(LEVANTAR + 5 * 60_000);
  await abrirImplementacion(page);
  const t0 = Date.now();
  await levantarYEsperar(page);
  const segundos = Math.round((Date.now() - t0) / 1000);
  // Cada dirección del sistema responde.
  const enlaces = page.getByRole("link").filter({ has: page.getByText(/localhost:\d+|https:\/\//) });
  await expect(page.getByText("Direcciones del sistema")).toBeVisible({ timeout: 60_000 });
  const urls = await page.locator("a[href^='http://localhost'], a[href*=':1']").evaluateAll((as) => as.map((a) => a.href));
  const estados = [];
  for (const url of [...new Set(urls)]) {
    const r = await request.get(url, { failOnStatusCode: false, timeout: 60_000 });
    estados.push(`${url} → ${r.status()}`);
  }
  void enlaces;
  await page.getByText("Direcciones del sistema").scrollIntoViewIfNeeded();
  await evidencia(page, "CP-26-levantado");
  test.info().annotations.push({ type: "resultado", description: `Levantado en ${segundos} s; ${estados.join("; ")}` });
  // La web, la app y la documentación responden 200; la API de Supabase responde aunque pida clave (401).
  for (const e of estados) expect(e).toMatch(/→ (200|401)$/);
});

test("CP-27 Borrar datos con respaldo previo", async ({ page, request }) => {
  test.setTimeout(LEVANTAR + 10 * 60_000);
  await abrirImplementacion(page);
  await page.getByRole("button", { name: "Borrar datos" }).click();
  await expect(page.getByText(/Antes se guarda un respaldo/)).toBeVisible();
  await evidencia(page, "CP-27-confirmacion");
  await page.getByRole("button", { name: "Borrar datos", exact: true }).last().click();
  const aviso = page.getByText(/Respaldo guardado en /);
  await expect(aviso).toBeVisible({ timeout: 10 * 60_000 });
  await evidencia(page, "CP-27-respaldo");
  const carpeta = (await aviso.innerText()).replace(/^.*Respaldo guardado en\s*/, "").trim();
  expect(existsSync(carpeta)).toBe(true);
  const archivos = readdirSync(carpeta);
  expect(archivos).toContain(".env");
  expect(archivos).toContain("respaldo.json");
  expect(archivos.some((a) => a.endsWith(".tar.gz"))).toBe(true);
  await page.getByRole("button", { name: "Aceptar" }).click();
  // Al levantar de nuevo, la base se crea otra vez desde las migraciones y los datos de prueba.
  await levantarYEsperar(page);
  const web = await request.get("http://localhost:3001/login", { failOnStatusCode: false });
  expect(web.status()).toBe(200);
  await evidencia(page, "CP-27-levantado-de-nuevo");
  test.info().annotations.push({ type: "resultado", description: `Respaldo en ${path.basename(path.dirname(carpeta))}/${path.basename(carpeta)}: ${archivos.join(", ")}` });
});
