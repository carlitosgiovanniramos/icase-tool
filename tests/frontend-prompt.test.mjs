// El generador del frontend arma su contexto (archivos fijos de la pieza, pantallas, operaciones del
// contrato) sin llamar a la IA de verdad. Uso: node --test --experimental-test-module-mocks tests/frontend-prompt.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

let prompt = "";
mock.module("../lib/gemini.js", {
  namedExports: {
    generarContenido: async ({ contents }) => {
      prompt = contents[0].text;
      return { text: '"use client";\nimport { supabaseNavegador } from "../../lib/supabase/navegador";\nexport default function Login() { return null; }', modelVersion: "simulado", costoUsd: 0 };
    },
  },
});
const { generarArchivoFrontend } = await import("../lib/frontend.js");

test("una página recibe su pantalla, sus operaciones, los controles y los archivos fijos de la pieza", async () => {
  const estructura = { archivos: [
    { ruta: "web/package.json", pieza: "nextjs", tipo: "configuracion", proposito: "Dependencias" },
    { ruta: "web/app/login/page.js", pieza: "nextjs", tipo: "pagina", proposito: "Inicio de sesión", pantallas: ["Inicio de Sesión Web"], requerimientos: ["RF02"] },
  ] };
  const r = await generarArchivoFrontend({
    nombre: "Bomberos",
    estructura,
    plataforma: "web",
    archivo: "web/app/login/page.js",
    stack: { piezas: [{ pieza: "nextjs" }, { pieza: "supabase" }] },
    analisis: { actores: [{ nombre: "Bombero" }], requerimientos_funcionales: [{ codigo: "RF02", nombre: "Autenticación", descripcion: "Ingresa con su cuenta" }] },
    contrato: {
      operaciones: [{ id: "op_login", nombre: "Iniciar sesión", tipo: "auth", recurso: "login", metodo: "POST", roles: ["Bombero"], requerimientos: ["RF02"] }, { id: "op_otra", tipo: "tabla", recurso: "vehiculo", requerimientos: ["RF09"] }],
      acciones: [{ pantalla: "Inicio de Sesión Web", nombre: "Ingresar al Sistema", tipo: "api", operaciones: ["op_login"] }],
    },
    pantallas: [{ nombre: "Inicio de Sesión Web", plataforma: "Web", html: "<html><body><button>Ingresar al Sistema</button></body></html>" }],
    anteriores: [],
  });
  assert.deepEqual(r.advertencias, []);
  assert.match(prompt, /web\/lib\/supabase\/navegador\.js\n/); // archivo fijo de la pieza con su código
  assert.match(prompt, /export function supabaseNavegador/);
  assert.match(prompt, /<button>Ingresar al Sistema<\/button>/); // HTML de su pantalla
  assert.match(prompt, /"op_login"/);
  assert.doesNotMatch(prompt, /"op_otra"/); // no lleva operaciones de otras pantallas
  assert.match(prompt, /"control":"Ingresar al Sistema"/);
});
