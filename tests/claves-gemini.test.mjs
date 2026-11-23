// Varias claves de Gemini: se pasa a la siguiente solo si se acabó la cuota (o la clave no sirve).
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerClaves, conRotacionDeClaves, esErrorDeCuota } from "../lib/clavesGemini.js";

const cuota = () => new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}');
const saturado = () => new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}');
const claveMala = () => new Error('{"error":{"code":400,"message":"API key not valid. Please pass a valid API key."}}');

test("lee las claves de GEMINI_API_KEYS y de GEMINI_API_KEY, sin repetir y en orden", () => {
  assert.deepEqual(leerClaves({ GEMINI_API_KEYS: "a, b\nc;a", GEMINI_API_KEY: "d" }), ["a", "b", "c", "d"]);
  assert.deepEqual(leerClaves({ GEMINI_API_KEY: "sola" }), ["sola"]);
  assert.deepEqual(leerClaves({}), []);
});

test("usa la primera clave y no toca las demás si responde", async () => {
  const usadas = [];
  const r = await conRotacionDeClaves({ modelo: "m", total: 3, estado: new Map(), llamar: async (i) => (usadas.push(i), "ok") });
  assert.equal(r, "ok");
  assert.deepEqual(usadas, [0]);
});

test("si la primera se quedó sin cuota, responde la segunda, y la primera queda de último", async () => {
  const estado = new Map();
  const usadas = [];
  const llamar = async (i) => {
    usadas.push(i);
    if (i === 0) throw cuota();
    return `clave${i}`;
  };
  assert.equal(await conRotacionDeClaves({ modelo: "m", total: 3, estado, llamar, segundosDeReintento: () => 3600 }), "clave1");
  assert.deepEqual(usadas, [0, 1]);

  // La siguiente petición ya no pierde una llamada con la agotada: empieza por la 1.
  usadas.length = 0;
  assert.equal(await conRotacionDeClaves({ modelo: "m", total: 3, estado, llamar }), "clave1");
  assert.deepEqual(usadas, [1]);
});

test("la cuota es por modelo: una clave agotada para un modelo sigue sirviendo para otro", async () => {
  const estado = new Map();
  await conRotacionDeClaves({ modelo: "a", total: 2, estado, llamar: async (i) => { if (i === 0) throw cuota(); return 1; } });
  const usadas = [];
  await conRotacionDeClaves({ modelo: "b", total: 2, estado, llamar: async (i) => (usadas.push(i), 1) });
  assert.deepEqual(usadas, [0]);
});

test("un fallo que no es de cuota (saturación) no cambia de clave: lo maneja el siguiente modelo", async () => {
  const usadas = [];
  await assert.rejects(
    conRotacionDeClaves({ modelo: "m", total: 3, estado: new Map(), llamar: async (i) => { usadas.push(i); throw saturado(); } }),
    /UNAVAILABLE/
  );
  assert.deepEqual(usadas, [0]);
});

test("una clave inválida también pasa a la siguiente", async () => {
  const usadas = [];
  const r = await conRotacionDeClaves({ modelo: "m", total: 2, estado: new Map(), llamar: async (i) => { usadas.push(i); if (i === 0) throw claveMala(); return "ok"; } });
  assert.equal(r, "ok");
  assert.deepEqual(usadas, [0, 1]);
});

test("con todas las claves agotadas lanza el error con el tiempo hasta que se renueve la primera", async () => {
  let ahora = 1_000_000;
  const tiempos = { 0: 7200, 1: 600 };
  let error;
  try {
    await conRotacionDeClaves({
      modelo: "m", total: 2, estado: new Map(), ahora: () => ahora,
      segundosDeReintento: () => null,
      llamar: async () => { throw cuota(); },
    });
  } catch (e) { error = e; }
  assert.ok(esErrorDeCuota(error));
  assert.equal(error.segundosReintento, 60); // sin dato de Google: pausa por defecto de un minuto

  const e2 = await conRotacionDeClaves({
    modelo: "n", total: 2, estado: new Map(), ahora: () => ahora,
    segundosDeReintento: (err) => tiempos[err.indice],
    llamar: async (i) => { const err = cuota(); err.indice = i; throw err; },
  }).catch((e) => e);
  assert.equal(e2.segundosReintento, 600); // la que se renueva antes
});

test("sin claves configuradas, el error lo dice claro", async () => {
  await assert.rejects(conRotacionDeClaves({ modelo: "m", total: 0, estado: new Map(), llamar: async () => 1 }), /GEMINI_API_KEYS/);
});
