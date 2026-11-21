// Kimi y Mistral: APIs compatibles con OpenAI, usadas como modelos gratuitos de
// respaldo junto a Gemini y Groq. Cada proveedor solo existe si tiene su clave en el entorno:
//   KIMI_API_KEY   → Kimi (KIMI_MODELOS, por defecto moonshotai/kimi-k3.1-pro)
//   MISTRAL_API_KEY  → Mistral Large 4, también por NVIDIA pero con su propia clave
//                      (MISTRAL_MODELOS, por defecto mistralai/mistral-large-4-1t-a52b)

const PROVEEDORES = {
  kimi: {
    nombre: "Kimi",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    clave: () => process.env.KIMI_API_KEY,
    modelos: () => (process.env.KIMI_MODELOS || "moonshotai/kimi-k3.1-pro"),
    maxTokens: () => Number(process.env.KIMI_MAX_TOKENS_SALIDA) || 16384,
    // El modo JSON de NVIDIA no es igual en todos los modelos: se pide en el prompt y se lee igual.
    modoJson: false,
    extra: { reasoning_effort: "low" },
  },
  mistral: {
    nombre: "Mistral",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    clave: () => process.env.MISTRAL_API_KEY,
    modelos: () => (process.env.MISTRAL_MODELOS || "mistralai/mistral-large-4-1t-a52b"),
    maxTokens: () => Number(process.env.MISTRAL_MAX_TOKENS_SALIDA) || 8192,
    modoJson: false,
    extra: { reasoning_effort: "low" },
  },
};

const lista = (texto) => texto.split(",").map((m) => m.trim()).filter(Boolean);

export function modelosDeProveedor(proveedor) {
  const p = PROVEEDORES[proveedor];
  return p?.clave() ? lista(p.modelos()) : [];
}

function aMensajes(contents) {
  const partes = typeof contents === "string" ? [{ text: contents }] : contents;
  const texto = partes.filter((p) => p.text).map((p) => p.text).join("\n\n");
  const imagenes = partes.filter((p) => p.inlineData);
  if (!imagenes.length) return [{ role: "user", content: texto }];
  return [
    {
      role: "user",
      content: [
        { type: "text", text: texto },
        ...imagenes.map((p) => ({
          type: "image_url",
          image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
        })),
      ],
    },
  ];
}

export async function generarConProveedor(proveedor, model, contents, config) {
  const p = PROVEEDORES[proveedor];
  const etiqueta = `${p.nombre} ${model}`;
  const modoJson = config?.responseMimeType === "application/json";
  const mensajes = aMensajes(contents);
  if (modoJson && !/json/i.test(JSON.stringify(mensajes))) {
    mensajes.push({ role: "user", content: "Responde únicamente con JSON válido." });
  }

  const resp = await fetch(p.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.clave()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: mensajes,
      max_tokens: p.maxTokens(),
      ...p.extra,
      ...(modoJson && p.modoJson && { response_format: { type: "json_object" } }),
    }),
    signal: AbortSignal.timeout(240_000),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const error = new Error(`${etiqueta}: ${data?.error?.message || data?.detail || data?.message || resp.statusText}`);
    error.status = resp.status;
    throw error;
  }

  const texto = data?.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!texto) throw new Error(`${etiqueta} devolvió una respuesta vacía.`);
  // Un JSON cortado por el límite de tokens no se puede usar: mejor probar el siguiente modelo.
  if (modoJson && data.choices[0].finish_reason === "length") {
    throw new Error(`${etiqueta}: la respuesta se cortó por el límite de tokens.`);
  }
  const u = data.usage;
  const uso = u ? { entrada: u.prompt_tokens ?? 0, salida: u.completion_tokens ?? 0, total: u.total_tokens ?? 0 } : null;
  return { text: texto, modelVersion: `${proveedor}:${model}`, uso };
}

export const NOMBRES_PROVEEDOR = { kimi: "Kimi", mistral: "Mistral" };
