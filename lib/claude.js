import Anthropic from "@anthropic-ai/sdk";
import { esModeloClaude } from "./modelosClaude.js";

// Claude (API de pago) para las pruebas reales: solo se usa cuando el usuario activa el
// interruptor "Usar Claude" y existe ANTHROPIC_API_KEY. En ese modo responde solo Claude: si
// falla se informa el motivo (ver generarSoloConClaude en gemini.js).

// Modelo por defecto: Sonnet 5 por costo (el crédito es limitado); se cambia con CLAUDE_MODELO (por
// ejemplo claude-haiku-5-5, 20 veces más barato). El usuario puede elegir otro de
// lib/modelosClaude.js en la barra lateral.
const MODELO = process.env.CLAUDE_MODELO || "claude-sonnet-5";
export const modeloClaudePredeterminado = () => MODELO;

// Precio en USD por millón de tokens [entrada, salida], para estimar lo gastado.
const PRECIOS = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-haiku-4-5": [1, 5],
};
// Haiku 5.5 cobra más cuando la entrada pasa de 100.000 tokens.
const PRECIOS_ENTRADA_LARGA = { "claude-haiku-5-5": [100_000, [0.5, 2.5]] };

// Tope de tokens de salida por llamada: limita lo máximo que puede costar una generación.
const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS) || 32000;

let cliente;
function obtenerCliente() {
  // Lee ANTHROPIC_API_KEY del entorno. Una pantalla compleja del prototipo puede tardar varios
  // minutos; 280 s deja margen dentro de los 300 s de maxDuration de las rutas.
  cliente ??= new Anthropic({ timeout: 280_000, maxRetries: 1 });
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
  const tokensEntrada =
    (uso.input_tokens || 0) +
    (uso.cache_creation_input_tokens || 0) * 1.25 +
    (uso.cache_read_input_tokens || 0) * 0.1;
  const [limite, precioLargo] = PRECIOS_ENTRADA_LARGA[modelo] ?? [];
  const [entrada, salida] = (limite && tokensEntrada > limite ? precioLargo : null) ?? PRECIOS[modelo] ?? PRECIOS[MODELO] ?? [5, 25];
  return (tokensEntrada * entrada + (uso.output_tokens || 0) * salida) / 1_000_000;
}

// esfuerzo ("low" | "medium" | "high"): cuánto razona Claude antes de responder. El
// razonamiento se cobra como salida, así que bajarlo abarata tareas que no lo necesitan
// (ej. escribir el HTML de una pantalla con un estilo ya definido). Por defecto, el del modelo.
// modelo: el elegido en la barra lateral; uno que no está en la lista usa el predeterminado.
export async function generarConClaude(contents, config, esfuerzo, modelo) {
  // Streaming para no chocar con timeouts HTTP en respuestas largas (ej. mockups).
  const stream = obtenerCliente().messages.stream({
    model: esModeloClaude(modelo) ? modelo : MODELO,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: aContenido(contents) }],
    ...(esfuerzo && { output_config: { effort: esfuerzo } }),
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
