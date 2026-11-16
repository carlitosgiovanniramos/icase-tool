// Abre Chrome con icase-tool en local para que el dueño del proyecto inicie sesión a mano; al entrar, guarda la
// sesión en tests/e2e/.auth/usuario.json (ignorado por git) para las pruebas de Implementación (CP-25 a CP-27).
// Uso: node tests/e2e/guardar-sesion.mjs [url]   (por defecto http://localhost:3000)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || process.env.ICASE_LOCAL_URL || "http://localhost:3000";
mkdirSync("tests/e2e/.auth", { recursive: true });
const navegador = await chromium.launch({ channel: "chrome", headless: false });
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
const pagina = await contexto.newPage();
await pagina.goto(`${URL}/login`);
console.log("Inicie sesión en la ventana de Chrome que se abrió (tiene 10 minutos).");
await pagina.waitForURL((u) => !u.pathname.startsWith("/login") && !u.pathname.startsWith("/registro"), { timeout: 10 * 60_000 });
await pagina.waitForLoadState("networkidle").catch(() => {});
await contexto.storageState({ path: "tests/e2e/.auth/usuario.json" });
console.log("Sesión guardada en tests/e2e/.auth/usuario.json");
await navegador.close();
