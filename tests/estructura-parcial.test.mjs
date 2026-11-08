// Una pieza que falla al generar la estructura no descarta las que salieron bien, y "Continuar"
// (previo) genera solo las que faltan. La IA se simula: no se llama a ningún modelo.
// Uso: node --test --experimental-test-module-mocks tests/estructura-parcial.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const llamadas = [];
let fallar = new Set();
mock.module(new URL("../lib/gemini.js", import.meta.url).href, {
  namedExports: {
    generarContenido: async ({ contents }) => {
      const carpeta = contents[0].text.match(/\(carpeta (\w+)\/\)/)[1];
      llamadas.push(carpeta);
      if (fallar.has(carpeta)) throw new Error("La respuesta se cortó por el límite de tokens.");
      const archivos = [{ ruta: `${carpeta}/src/modulo.js`, tipo: "servicio", proposito: "Prueba", requerimientos: ["RF01"], origen: "requerimientos" }];
      return { text: JSON.stringify({ archivos, notas: `notas ${carpeta}` }), modelVersion: "simulado", costoUsd: 0 };
    },
  },
});
const { generarEstructura } = await import("../lib/estructura.js");

const cuerpo = {
  nombre: "Prueba",
  analisis: { actores: [], requerimientos_funcionales: [{ codigo: "RF01", nombre: "Algo", actores: [] }], requerimientos_no_funcionales: [] },
  stack: { piezas: [{ pieza: "nextjs" }, { pieza: "flutter" }, { pieza: "supabase", opcionales: [] }], elementos: [], altaDisponibilidad: false },
  diagramaER: "",
  diagramaSistema: "",
  pantallas: [],
};

test("una pieza que falla queda en faltan y las demás se conservan", async () => {
  fallar = new Set(["web"]);
  llamadas.length = 0;
  const r = await generarEstructura(cuerpo);
  assert.equal(r.incompleto, true);
  assert.deepEqual(r.faltan.map((f) => f.pieza), ["nextjs"]);
  assert.deepEqual(Object.keys(r.piezas).sort(), ["flutter", "supabase"]);
  assert.ok(r.archivos.some((a) => a.ruta === "movil/src/modulo.js"));
  assert.ok(r.advertencias[0].startsWith("Falta Next.js"));
  assert.equal(r.cobertura.requerimientos, undefined);

  // Continuar: solo se pide la pieza que faltó.
  fallar = new Set();
  llamadas.length = 0;
  const c = await generarEstructura({ ...cuerpo, previo: { archivos: r.archivos, piezas: r.piezas } });
  assert.deepEqual(llamadas, ["web"]);
  assert.equal(c.incompleto, undefined);
  assert.deepEqual(Object.keys(c.piezas).sort(), ["flutter", "nextjs", "supabase"]);
  assert.equal(c.piezas.flutter.notas, "notas movil");
  assert.deepEqual(c.cobertura.requerimientos, [1, 1]);
});

test("si fallan todas las piezas, no hay nada que guardar", async () => {
  fallar = new Set(["web", "movil", "supabase"]);
  await assert.rejects(generarEstructura(cuerpo), /límite de tokens/);
});

test("al ampliar, la pieza que falla conserva su lista actual", async () => {
  fallar = new Set(["movil"]);
  const actual = {
    archivos: [{ ruta: "movil/src/viejo.js", pieza: "flutter", tipo: "servicio", proposito: "Antes", requerimientos: ["RF01"], origen: "requerimientos" }],
    piezas: { flutter: { notas: "notas viejas" } },
  };
  const r = await generarEstructura({ ...cuerpo, actual, instruccion: "cambia algo" });
  assert.equal(r.incompleto, undefined);
  assert.ok(r.archivos.some((a) => a.ruta === "movil/src/viejo.js"));
  assert.equal(r.piezas.flutter.notas, "notas viejas");
  assert.ok(r.advertencias.some((a) => a.startsWith("Flutter: no se pudo modificar")));
});
