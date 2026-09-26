// Respaldo con Groq (API compatible con OpenAI) para cuando todos los modelos de Gemini fallan.
// Solo se usa si existe GROQ_API_KEY.

const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";

const MODELOS_TEXTO = (
  process.env.GROQ_MODELOS || "openai/gpt-oss-120b,openai/gpt-oss-20b"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Sin este valor Groq corta la respuesta en ~3000 tokens (insuficiente para los mockups).
// El plan gratuito permite ~8000 tokens por minuto por modelo, contando prompt + respuesta.
const MAX_TOKENS_SALIDA = Number(process.env.GROQ_MAX_TOKENS_SALIDA) || 6000;

// Opcional: único modelo al que se le envían imágenes; los demás reciben solo el texto.
// Groq no ofrece ahora ningún modelo con visión, así que por defecto no hay ninguno.
const MODELO_VISION = process.env.GROQ_MODELO_VISION || null;

function tieneImagenes(contents) {
  return Array.isArray(contents) && contents.some((p) => p.inlineData);
}

function aceptaImagenes(model) {
  return !!MODELO_VISION && model === MODELO_VISION;
}

export function modelosGroq(contents) {
  if (!process.env.GROQ_API_KEY) return [];
  if (!MODELO_VISION) return MODELOS_TEXTO;
  const orden = tieneImagenes(contents)
    ? [MODELO_VISION, ...MODELOS_TEXTO]
    : [...MODELOS_TEXTO, MODELO_VISION];
  return [...new Set(orden)];
}

// Convierte el formato de Gemini (string o arreglo de parts) a mensajes de chat.
function aMensajes(contents, conImagenes) {
  const partes = typeof contents === "string" ? [{ text: contents }] : contents;
  const texto = partes.filter((p) => p.text).map((p) => p.text).join("\n\n");

  if (!conImagenes || !tieneImagenes(contents)) {
    return [{ role: "user", content: texto }];
  }

  return [
    {
      role: "user",
      content: [
        { type: "text", text: texto },
        ...partes
          .filter((p) => p.inlineData)
          .map((p) => ({
            type: "image_url",
            image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
          })),
      ],
    },
  ];
}

export async function generarConGroq(model, contents, config) {
  const modoJson = config?.responseMimeType === "application/json";
  const mensajes = aMensajes(contents, aceptaImagenes(model));
  // Groq rechaza el modo JSON si el prompt no menciona la palabra "json".
  if (modoJson && !/json/i.test(JSON.stringify(mensajes))) {
    mensajes.push({ role: "user", content: "Responde únicamente con JSON válido." });
  }

  const resp = await fetch(URL_GROQ, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: mensajes,
      max_completion_tokens: MAX_TOKENS_SALIDA,
      // Menos razonamiento interno deja más tokens del límite para la respuesta.
      ...(model.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
      ...(modoJson && { response_format: { type: "json_object" } }),
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const error = new Error(`Groq ${model}: ${data?.error?.message || resp.statusText}`);
    error.status = resp.status;
    throw error;
  }

  // Algunos modelos de razonamiento (ej. Qwen) incluyen su razonamiento entre <think>...</think>.
  const texto = data?.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!texto) throw new Error(`Groq ${model} devolvió una respuesta vacía.`);
  // Un JSON cortado por el límite de tokens no se puede usar: mejor probar el siguiente modelo.
  if (modoJson && data.choices[0].finish_reason === "length") {
    throw new Error(`Groq ${model}: la respuesta se cortó por el límite de tokens.`);
  }
  return { text: texto, modelVersion: `groq:${model}` };
}
