// CP-01 a CP-05 (autenticación) y CP-29 (ruta de generación sin sesión).
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const EMAIL = process.env.ICASE_PRUEBAS_EMAIL;
const CLAVE = process.env.ICASE_PRUEBAS_CLAVE;
test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  if (!EMAIL || !CLAVE) throw new Error("Faltan ICASE_PRUEBAS_EMAIL e ICASE_PRUEBAS_CLAVE en .env.pruebas");
  mkdirSync("tests/e2e/.auth", { recursive: true });
});

async function iniciarSesion(page, clave = CLAVE) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(clave);
  await page.locator('button[type="submit"]').click();
}

// Tras entrar aparece el aviso "¡Bienvenido de nuevo!": se acepta como lo haría el usuario.
async function aceptarBienvenida(page) {
  const aceptar = page.getByRole("button", { name: "Aceptar" });
  await aceptar.waitFor({ state: "visible", timeout: 10_000 }).then(() => aceptar.click()).catch(() => {});
}

test("CP-01 Registro de una cuenta nueva", async ({ page }) => {
  await page.goto("/registro");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(CLAVE);
  await page.locator('button[type="submit"]').click();
  // Cuenta nueva: vuelve a /login con el aviso. Si ya existía (segunda ejecución), Supabase lo informa.
  const aviso = page.getByText(/Cuenta creada|already registered/i);
  await expect(aviso).toBeVisible();
  if (/already registered/i.test(await aviso.innerText())) {
    test.info().annotations.push({ type: "nota", description: "La cuenta ya existía: el registro informa que el correo está registrado." });
  } else {
    await expect(page).toHaveURL(/\/login\?registrado=1/);
  }
});

test("CP-02 Inicio de sesión con credenciales válidas", async ({ page }) => {
  await iniciarSesion(page);
  await expect(page).toHaveURL(/\/(\?bienvenida=1)?$/);
  await expect(page.getByRole("heading", { name: "Mis proyectos" })).toBeVisible();
  await expect(page.getByText("¡Bienvenido de nuevo!")).toBeVisible();
  await aceptarBienvenida(page);
  await page.context().storageState({ path: "tests/e2e/.auth/pruebas.json" });
});

test("CP-03 Inicio de sesión con contraseña incorrecta", async ({ page }) => {
  await iniciarSesion(page, "Incorrecta123");
  await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("CP-04 Acceso a una ruta protegida sin sesión", async ({ page }) => {
  await page.goto("/proyectos/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Mis proyectos" })).toHaveCount(0);
});

test("CP-05 Cierre de sesión", async ({ page }) => {
  await iniciarSesion(page);
  await expect(page.getByRole("heading", { name: "Mis proyectos" })).toBeVisible();
  await aceptarBienvenida(page);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login\?sesion=cerrada/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("CP-29 Llamada a una ruta de generación sin sesión", async ({ request }) => {
  const resp = await request.post("/api/generar-casos-uso", {
    data: { analisis: { actores: [], requerimientos_funcionales: [] } },
    maxRedirects: 0,
  });
  // El proxy responde con una redirección a /login antes de llegar a la ruta (y a la IA).
  expect([302, 303, 307, 308]).toContain(resp.status());
  expect(resp.headers()["location"]).toMatch(/\/login/);
});
