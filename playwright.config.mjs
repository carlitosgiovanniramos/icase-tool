// Pruebas funcionales de extremo a extremo de I-CASE Tool con Playwright (APE4, sección 8.2.1).
// Credenciales y dirección en .env.pruebas (ignorado por git):
//   ICASE_URL              aplicación a probar (por defecto la desplegada en Vercel)
//   ICASE_PRUEBAS_EMAIL    cuenta de pruebas
//   ICASE_PRUEBAS_CLAVE    su contraseña
//   ICASE_LOCAL_URL        icase-tool en local, para la fase de Implementación (por defecto http://localhost:3000)
// Uso: npx playwright test [--project=autenticacion|flujo|implementacion]
import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.pruebas")) process.loadEnvFile(".env.pruebas");

export const URL_APP = process.env.ICASE_URL || "https://icase-tool.vercel.app";
export const URL_LOCAL = process.env.ICASE_LOCAL_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/e2e/resultados",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Las generaciones con IA tardan: cada prueba tiene hasta 15 minutos.
  timeout: 15 * 60_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/reporte", open: "never" }],
    ["json", { outputFile: "tests/e2e/reporte/resultados.json" }],
  ],
  use: {
    baseURL: URL_APP,
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    locale: "es-EC",
    screenshot: "on",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "autenticacion", testMatch: /autenticacion\.spec\.mjs/ },
    // El flujo inicia su propia sesión: CP-05 cierra la sesión en todos los dispositivos.
    { name: "flujo", testMatch: /flujo\.spec\.mjs/ },
    { name: "implementacion", testMatch: /implementacion\.spec\.mjs/, use: { baseURL: URL_LOCAL, storageState: "tests/e2e/.auth/usuario.json" } },
  ],
});
