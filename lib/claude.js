import Anthropic from "@anthropic-ai/sdk";

// Claude (API de pago) para las pruebas reales: solo se usa cuando el usuario activa el
// interruptor "Usar Claude" y existe ANTHROPIC_API_KEY. Si falla, la cadena sigue con Gemini/Groq.

// Sonnet 5 por costo (el crédito es limitado); se puede cambiar con CLAUDE_MODELO.
const MODELO = process.env.CLAUDE_MODELO || "claude-sonnet-5";

// Precio en USD por millón de tokens [entrada, salida], para estimar lo gastado.
const PRECIOS = {
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};

// Tope de tokens de salida por llamada: limita lo máximo que puede costar una generación.
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS) || 32000;

let cliente;
function obtenerCliente() {
  // Lee ANTHROPIC_API_KEY del entorno. Un solo reintento: si falla, pasa a Gemini.
  cliente ??= new Anthropic({ timeout: 240_000, maxRetries: 1 });
  return cliente;
}

export function claudeDisponible() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Convierte el formato de Gemini (string o arreglo de parts) a bloques de contenido de Claude.
function aContenido(contents) {
  const partes = typeof contents === "string" ? [{ text: contents }] : contents;
  return partes.map((p) =>
    p.inlineData
      ? {
          type: "image",
          source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data },
        }
      : { type: "text", text: p.text }
  );
}

// Las rutas esperan JSON puro; Claude a veces lo envuelve en ```json ... ```.
function extraerJson(texto) {
  const sinBloque = texto.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const inicio = sinBloque.indexOf("{");
  const fin = sinBloque.lastIndexOf("}");
  return inicio !== -1 && fin > inicio ? sinBloque.slice(inicio, fin + 1) : sinBloque;
}

function estimarCosto(modelo, uso) {
  const [entrada, salida] = PRECIOS[modelo] ?? PRECIOS[MODELO] ?? [5, 25];
  const tokensEntrada =
    (uso.input_tokens || 0) +
    (uso.cache_creation_input_tokens || 0) * 1.25 +
    (uso.cache_read_input_tokens || 0) * 0.1;
  return (tokensEntrada * entrada + (uso.output_tokens || 0) * salida) / 1_000_000;
}

export async function generarConClaude(contents, config) {
  // Streaming para no chocar con timeouts HTTP en respuestas largas (ej. mockups).
  // Si Claude rechaza o falla, generarContenido pasa a Gemini/Groq.
  const stream = obtenerCliente().messages.stream({
    model: MODELO,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: aContenido(contents) }],
  });
  const mensaje = await stream.finalMessage();

  if (mensaje.stop_reason === "refusal") {
    throw new Error(`Claude rechazó la solicitud (${mensaje.stop_details?.category ?? "sin categoría"}).`);
  }
  if (mensaje.stop_reason === "max_tokens") {
    throw new Error("La respuesta de Claude se cortó por el límite de tokens.");
  }

  let texto = mensaje.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!texto) throw new Error("Claude devolvió una respuesta vacía.");
  if (config?.responseMimeType === "application/json") texto = extraerJson(texto);

  return {
    text: texto,
    modelVersion: `claude:${mensaje.model}`,
    costoUsd: estimarCosto(mensaje.model, mensaje.usage),
  };
}
