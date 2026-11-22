// Inicia sesión con la cuenta de pruebas y prepara los datos de las pruebas de carga de k6:
//   tests/carga/.sesion.txt                      cookies de la sesión (ignorado por git)
//   tests/carga/datos/analisis-biblioteca.json    análisis aprobado del proyecto de prueba (entrada de la IA)
// Uso: node tests/carga/sesion.mjs [url]   (por defecto ICASE_URL o la app desplegada)
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env.pruebas")) process.loadEnvFile(".env.pruebas");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const URL = process.argv[2] || process.env.ICASE_URL || "https://icase-tool.vercel.app";

const navegador = await chromium.launch({ channel: "chrome" });
const contexto = await navegador.newContext();
const page = await contexto.newPage();
await page.goto(`${URL}/login`);
await page.locator('input[name="email"]').fill(process.env.ICASE_PRUEBAS_EMAIL);
await page.locator('input[name="password"]').fill(process.env.ICASE_PRUEBAS_CLAVE);
await page.locator('button[type="submit"]').click();
await page.getByRole("button", { name: "Aceptar" }).click();
const cookies = (await contexto.cookies()).filter((c) => c.name.startsWith("sb-"));
await navegador.close();
writeFileSync("tests/carga/.sesion.txt", cookies.map((c) => `${c.name}=${c.value}`).join("; "));
console.log(`Sesión guardada (${cookies.length} cookies)`);

// Análisis del proyecto de prueba, leído con el token de la sesión (respeta RLS).
const estado = "tests/e2e/.auth/proyecto.json";
if (!existsSync(estado)) throw new Error("Falta el proyecto de prueba: ejecuta antes las pruebas de flujo (CP-06).");
const { id } = JSON.parse(readFileSync(estado, "utf8"));
// La cookie de @supabase/ssr guarda la sesión como "base64-<JSON en base64>", a veces partida en trozos (.0, .1…).
const valor = cookies.filter((c) => /auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)).map((c) => c.value).join("");
const sesion = JSON.parse(Buffer.from(valor.replace(/^base64-/, ""), "base64").toString("utf8"));
const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/proyectos?id=eq.${id}&select=analisis`, {
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${sesion.access_token}` },
});
const [fila] = await resp.json();
if (!fila?.analisis) throw new Error("El proyecto de prueba no tiene análisis guardado.");
mkdirSync("tests/carga/datos", { recursive: true });
writeFileSync("tests/carga/datos/analisis-biblioteca.json", JSON.stringify(fila.analisis, null, 2));
console.log(`Análisis guardado: ${fila.analisis.requerimientos_funcionales?.length} RF y ${fila.analisis.actores?.length} actores`);
