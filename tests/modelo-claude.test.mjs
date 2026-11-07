// El modelo de Claude elegido en la barra lateral ("claude:<id>") es el que se pide a la API; uno
// desconocido usa el predeterminado (CLAUDE_MODELO). La API se simula: no se gasta nada.
// Uso: node --test --experimental-test-module-mocks tests/modelo-claude.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const pedidos = [];
mock.module("@anthropic-ai/sdk", {
  defaultExport: class {
    messages = {
      stream: (p) => {
        pedidos.push(p.model);
        return {
          finalMessage: async () => ({
            stop_reason: "end_turn",
            model: p.model,
            usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
            content: [{ type: "text", text: "{}" }],
          }),
        };
      },
    };
  },
});
process.env.ANTHROPIC_API_KEY = "prueba";
process.env.CLAUDE_MODELO = "claude-haiku-5-5";
const { generarContenido } = await import("../lib/gemini.js");

test("el modelo elegido llega a la API y su costo usa su precio", async () => {
  const opus = await generarContenido({ contents: "hola", usarClaude: "claude:claude-opus-5-5" });
  const predeterminado = await generarContenido({ contents: "hola", usarClaude: true });
  await generarContenido({ contents: "hola", usarClaude: "claude:modelo-inventado" });
  assert.deepEqual(pedidos, ["claude-opus-5-5", "claude-haiku-5-5", "claude-haiku-5-5"]);
  assert.equal(opus.costoUsd, 24); // 1 millón de entrada a $4 y 1 millón de salida a $20
  assert.equal(predeterminado.costoUsd, 3); // Haiku 5.5 con más de 100.000 de entrada: $0,50 y $2,50
  assert.equal(predeterminado.modelVersion, "claude:claude-haiku-5-5");
});
