// Toda pieza con interfaz debe planificar su archivo de estilos globales (tipo "estilo"), para que
// las páginas no repitan cada una su propio CSS. La IA se simula: no se llama a ningún modelo.
// Uso: node --test --experimental-test-module-mocks tests/estructura-estilos.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module(new URL("../lib/gemini.js", import.meta.url).href, {
  namedExports: { generarContenido: async () => ({ text: "{}", modelVersion: "simulado" }) },
});

const { validarPieza } = await import("../lib/estructura.js");

const pantallas = [{ nombre: "Pedidos", plataforma: "Web", rfs: ["RF01"] }];
const pagina = {
  ruta: "web/app/pedidos/page.js",
  tipo: "pagina",
  proposito: "Lista los pedidos.",
  requerimientos: ["RF01"],
  pantallas: ["Pedidos"],
};
const estilo = { ruta: "web/app/globals.css", tipo: "estilo", proposito: "Estilos globales.", requerimientos: [] };
const ctx = (extra = {}) => ({
  ficha: { nombre: "nextjs", titulo: "Next.js" },
  carpeta: "web",
  fijas: [],
  pantallas,
  entidades: [],
  modulos: [],
  codigos: new Set(["RF01"]),
  ...extra,
});

test("una pieza con pantallas sin archivo de estilos tiene un problema", () => {
  const { problemas } = validarPieza({ archivos: [pagina] }, ctx());
  assert.ok(problemas.some((p) => /estilos globales/.test(p) && p.includes("web/app/globals.css")));
});

test("con su archivo de estilos no hay problema", () => {
  const { problemas } = validarPieza({ archivos: [pagina, estilo] }, ctx());
  assert.equal(problemas.filter((p) => /estilos globales/.test(p)).length, 0);
});

test("una pieza sin pantallas (datos, funciones) no necesita estilos", () => {
  const { problemas } = validarPieza({ archivos: [] }, ctx({ pantallas: [] }));
  assert.equal(problemas.filter((p) => /estilos globales/.test(p)).length, 0);
});

test("al modificar una lista existente no se exige", () => {
  const { problemas } = validarPieza({ archivos: [pagina] }, ctx({ actual: [pagina] }));
  assert.equal(problemas.filter((p) => /estilos globales/.test(p)).length, 0);
});
