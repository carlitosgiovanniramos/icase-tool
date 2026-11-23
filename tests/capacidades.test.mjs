// Detección de capacidades que piden una librería (lib/capacidades.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAPACIDADES } from "../lib/capacidades.js";

const firma = CAPACIDADES.find((c) => c.clave === "firma").patron;

test("\"confirmación\" y \"confirmar\" no cuentan como firma", () => {
  assert.equal(firma.test("validando los datos y mostrando la confirmación en pantalla."), false);
  assert.equal(firma.test("solicitando confirmación explícita en pantalla antes de ejecutar la acción"), false);
  assert.equal(firma.test("el usuario debe confirmar en pantalla la operación"), false);
  assert.equal(firma.test("reafirmar el dibujo del formulario"), false);
});

test("una firma dibujada en pantalla sí se detecta", () => {
  assert.equal(firma.test("el bombero firma en pantalla el parte"), true);
  assert.equal(firma.test("La firma trazada en pantalla queda guardada"), true);
  assert.equal(firma.test("firma en pantalla del jefe de guardia"), true);
  assert.equal(firma.test("el usuario dibuja su firma con el dedo"), true);
  assert.equal(firma.test("firma manuscrita del cliente"), true);
});
