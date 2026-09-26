import { GoogleGenAI } from "@google/genai";
import { modelosGroq, generarConGroq } from "./groq.js";
import { claudeDisponible, generarConClaude } from "./claude.js";

// Punto único para llamar a la IA: Claude primero si el usuario lo activó, luego los modelos
// de Gemini y, si todos fallan, los de Groq.

// Sin reintentos internos del SDK: si un modelo falla se pasa directo al siguiente de la lista.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { retryOptions: { attempts: 1 } },
});

// Se prueban en orden, del más potente al más básico; Groq queda como último recurso.
// Los Pro no están: el plan gratuito no tiene cuota para ellos (responden 429 al instante).
// Se configura con GEMINI_MODELOS="modelo1,modelo2,...".
const MODELOS = (
  process.env.GEMINI_MODELOS ||
  "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3-flash-preview"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Cuando Google está saturado puede tardar minutos en devolver el 503. Si un modelo no empieza
// a responder en este tiempo se pasa al siguiente. Solo limita el arranque: una vez que llega
// la primera parte de la respuesta, se espera a que termine aunque sea larga (ej. mockups).
const ESPERA_ARRANQUE_MS = Number(process.env.GEMINI_ESPERA_ARRANQUE_MS) || 45_000;

// Un modelo que se quedó colgado (tardó en fallar) pasa al final de la lista durante un rato,
// para no volver a esperarlo en cada llamada. Los que fallan rápido (503 inmediato) no:
// reintentarlos cuesta un segundo y así siempre se usa el más potente disponible.
// El estado se conserva mientras viva la instancia del servidor.
const enPausaHasta = new Map(); // id → timestamp
const PAUSA_TRAS_CUELGUE_MS = 2 * 60_000;
const FALLO_LENTO_MS = 10_000;

// Las rutas tienen maxDuration = 300 s; se deja margen para responder antes de que Vercel corte.
const PRESUPUESTO_MS = 270_000;

async function generarConModelo(model, contents, config) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), ESPERA_ARRANQUE_MS);

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      // includeThoughts hace que el razonamiento llegue en cuanto el modelo empieza a trabajar,
      // así el plazo de arranque no confunde "pensando" con "colgado".
      config: {
        ...config,
        thinkingConfig: { includeThoughts: true, ...config?.thinkingConfig },
        abortSignal: controlador.signal,
      },
    });

    let texto = "";
    for await (const parte of stream) {
      clearTimeout(temporizador);
      for (const p of parte.candidates?.[0]?.content?.parts ?? []) {
        if (p.text && !p.thought) texto += p.text;
      }
    }

    if (!texto) throw new Error(`El modelo ${model} devolvió una respuesta vacía.`);
    return { text: texto, modelVersion: model };
  } finally {
    clearTimeout(temporizador);
  }
}

function ordenarCandidatos(contents, usarClaude) {
  const candidatos = [
    ...(usarClaude && claudeDisponible()
      ? [{ id: "claude", generar: generarConClaude, prioritario: true }]
      : []),
    ...MODELOS.map((m) => ({ id: m, generar: (c, cfg) => generarConModelo(m, c, cfg) })),
    ...modelosGroq(contents).map((m) => ({
      id: `groq:${m}`,
      generar: (c, cfg) => generarConGroq(m, c, cfg),
    })),
  ];

  // Claude, cuando el usuario lo activó, va siempre primero; el resto se ordena por pausa.
  const grupo = (c) => (c.prioritario ? 0 : Date.now() < (enPausaHasta.get(c.id) ?? 0) ? 2 : 1);
  // sort es estable: dentro de cada grupo se respeta el orden original (del más potente al más básico).
  return candidatos.sort((a, b) => grupo(a) - grupo(b));
}

// usarClaude: el usuario activó "Usar Claude" (pruebas reales); si no, solo Gemini y Groq.
export async function generarContenido({ contents, config, usarClaude = false }) {
  const inicio = Date.now();
  let ultimoError;

  for (const candidato of ordenarCandidatos(contents, usarClaude)) {
    if (Date.now() - inicio > PRESUPUESTO_MS) break;
    const inicioIntento = Date.now();
    try {
      const respuesta = await candidato.generar(contents, config);
      console.info(`[ia] respondió ${candidato.id} en ${Math.round((Date.now() - inicio) / 1000)} s`);
      enPausaHasta.delete(candidato.id);
      return respuesta;
    } catch (error) {
      // Cualquier fallo (saturación, límite, clave inválida o bloqueada, modelo retirado)
      // pasa al siguiente candidato: otro modelo u otro proveedor puede responder.
      ultimoError = error;
      console.warn(`[ia] ${candidato.id} falló: ${String(error?.message).slice(0, 200)}`);
      if (Date.now() - inicioIntento > FALLO_LENTO_MS) {
        enPausaHasta.set(candidato.id, Date.now() + PAUSA_TRAS_CUELGUE_MS);
      }
    }
  }

  const proveedores = process.env.GROQ_API_KEY ? "Gemini ni de Groq" : "Gemini";
  throw new Error(
    `Ningún modelo de ${proveedores} pudo responder. Suele ser saturación temporal: intenta de nuevo en unos minutos.` +
      (ultimoError?.message ? `\n\nÚltimo error: ${ultimoError.message}` : "")
  );
}
