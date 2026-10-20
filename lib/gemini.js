import { GoogleGenAI } from "@google/genai";
import { modelosGroq, generarConGroq } from "./groq.js";
import { claudeDisponible, generarConClaude } from "./claude.js";

// Punto único para llamar a la IA: solo Claude si el usuario lo activó; si eligió un modelo
// gratuito, solo ese; si no (automático), los modelos de Gemini y, si todos fallan, los de Groq.

// Sin reintentos internos del SDK: si un modelo falla se pasa directo al siguiente de la lista.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { retryOptions: { attempts: 1 } },
});

// Se prueban en orden, del más potente al más básico; Groq queda como último recurso.
// Solo modelos del plan gratuito: lo de pago es únicamente Claude. Los Pro y Gemini 4 Argon no
// están porque el plan gratuito no tiene cuota para ellos (responden 429 al instante).
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
const PAUSA_MAXIMA_POR_CUOTA_MS = 12 * 3600_000;

// Un 429 por cuota trae en el error el tiempo hasta que se renueva ("retryDelay": "30499s"):
// unos segundos si se agotó la cuota por minuto, horas si se agotó la diaria. Con ese dato el
// modelo queda en pausa ese tiempo en vez de intentarse en cada llamada.
// Devuelve esos segundos, o null si el error no es de cuota.
function segundosDeReintento(error) {
  const texto = String(error?.message || "");
  if (!/RESOURCE_EXHAUSTED|429/.test(texto)) return null;
  const m = texto.match(/retryDelay\\*"\s*:\s*\\*"(\d+(?:\.\d+)?)s/);
  return m ? Number(m[1]) : null;
}

// Motivo legible de un fallo para el log. "Incomplete JSON segment at the end" lo lanza el SDK
// cuando Google cierra la respuesta a medias, casi siempre por saturación (como los 503).
function explicarFallo(error) {
  const texto = String(error?.message);
  if (/Incomplete JSON segment/i.test(texto)) return "Google cortó la respuesta (saturación)";
  if (/\\?"code\\?":\s*503|high demand|UNAVAILABLE/i.test(texto)) return "Google está saturado (503)";
  return texto.slice(0, 200);
}

// Las rutas tienen maxDuration = 300 s; se deja margen para responder antes de que Vercel corte.
const PRESUPUESTO_MS = 270_000;

// espera: plazo para empezar a responder (con un modelo elegido a mano se le da todo el presupuesto).
async function generarConModelo(model, contents, config, espera = ESPERA_ARRANQUE_MS) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), espera);

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

function candidatos(contents) {
  return [
    ...MODELOS.map((m) => ({ id: m, generar: (c, cfg, espera) => generarConModelo(m, c, cfg, espera) })),
    ...modelosGroq(contents).map((m) => ({
      id: `groq:${m}`,
      generar: (c, cfg) => generarConGroq(m, c, cfg),
    })),
  ];
}

function ordenarCandidatos(contents) {
  const enPausa = (c) => Date.now() < (enPausaHasta.get(c.id) ?? 0);
  // sort es estable: dentro de cada grupo se respeta el orden original (del más potente al más básico).
  return candidatos(contents).sort((a, b) => enPausa(a) - enPausa(b));
}

// Modelos gratuitos para elegir en la interfaz, con la hora hasta la que están en pausa (sin
// cuota o colgados) si es el caso.
export function modelosGratuitos() {
  return candidatos([]).map(({ id }) => ({
    id,
    proveedor: id.startsWith("groq:") ? "Groq" : "Gemini",
    nombre: id.replace(/^groq:/, ""),
    pausaHasta: Date.now() < (enPausaHasta.get(id) ?? 0) ? enPausaHasta.get(id) : null,
  }));
}

// Un fallo deja al modelo en pausa si se quedó sin cuota (el tiempo que indica Google) o si
// tardó en fallar (colgado), para no esperarlo en cada llamada.
function registrarFallo(candidato, error, inicioIntento) {
  const reintento = segundosDeReintento(error);
  if (reintento) {
    // Sin cuota: en pausa hasta que se renueve (con tope), para no intentarlo en cada llamada.
    enPausaHasta.set(candidato.id, Date.now() + Math.min(reintento * 1000, PAUSA_MAXIMA_POR_CUOTA_MS));
    console.warn(`[ia] ${candidato.id} sin cuota: en pausa ${Math.round(Math.min(reintento, PAUSA_MAXIMA_POR_CUOTA_MS / 1000) / 60)} min`);
    return;
  }
  console.warn(`[ia] ${candidato.id} falló: ${explicarFallo(error)}`);
  if (Date.now() - inicioIntento > FALLO_LENTO_MS) {
    enPausaHasta.set(candidato.id, Date.now() + PAUSA_TRAS_CUELGUE_MS);
  }
}

// Modelo gratuito elegido por el usuario: responde solo ese, sin pasar a otros, y con todo el
// presupuesto para empezar (quien lo eligió prefiere esperarlo).
async function generarSoloCon(id, contents, config, presupuestoMs) {
  const candidato = candidatos(contents).find((c) => c.id === id);
  if (!candidato) throw new Error(`El modelo ${id} ya no está en la lista de modelos gratuitos. Elige otro o vuelve a Automático.`);
  const inicio = Date.now();
  try {
    const respuesta = await candidato.generar(contents, config, presupuestoMs);
    console.info(`[ia] respondió ${id} (elegido) en ${Math.round((Date.now() - inicio) / 1000)} s`);
    enPausaHasta.delete(id);
    return respuesta;
  } catch (error) {
    registrarFallo(candidato, error, inicio);
    const motivo = segundosDeReintento(error) ? "se acabó su cuota gratuita" : explicarFallo(error);
    throw new Error(`${id} no pudo responder: ${motivo}. Elige otro modelo o vuelve a Automático.`);
  }
}

// Con "Usar Claude" activado responde SOLO Claude: si falla, se informa el motivo en vez de
// pasar en silencio a Gemini, para que las pruebas reales sean siempre de Claude.
async function generarSoloConClaude(contents, config, esfuerzo) {
  if (!claudeDisponible()) {
    throw new Error("Claude está activado, pero el servidor no tiene ANTHROPIC_API_KEY configurada.");
  }
  const inicio = Date.now();
  try {
    const respuesta = await generarConClaude(contents, config, esfuerzo);
    console.info(`[ia] respondió claude en ${Math.round((Date.now() - inicio) / 1000)} s`);
    return respuesta;
  } catch (error) {
    // Los errores de la API traen el motivo real en error.error.error.message.
    const motivo = error?.error?.error?.message || error?.message || String(error);
    console.warn(`[ia] claude falló: ${motivo}`);
    throw new Error(`Claude no pudo responder: ${motivo}`);
  }
}

// usarClaude: la preferencia de IA que envía el navegador (ver pedirIA en lib/preferenciaClaude.js):
//   true      el usuario activó "Usar Claude" (pruebas reales): responde solo Claude;
//   "<id>"    eligió un modelo gratuito (ej. "gemini-3.8-flash", "groq:openai/gpt-oss-120b"): solo ese;
//   false     automático: Gemini y luego Groq.
// esfuerzoClaude: razonamiento de Claude para esta tarea ("low" abarata tareas simples).
// presupuestoMs: tiempo para probar modelos (por defecto, casi todo el límite de la ruta); una
// ruta que hace dos llamadas pasa en la segunda solo lo que le queda. No corta un modelo que ya
// empezó a responder.
export async function generarContenido({
  contents,
  config,
  usarClaude = false,
  esfuerzoClaude,
  presupuestoMs = PRESUPUESTO_MS,
}) {
  if (usarClaude === true) return generarSoloConClaude(contents, config, esfuerzoClaude);
  if (typeof usarClaude === "string" && usarClaude) return generarSoloCon(usarClaude, contents, config, presupuestoMs);

  const inicio = Date.now();
  let ultimoError;

  for (const candidato of ordenarCandidatos(contents)) {
    if (Date.now() - inicio > presupuestoMs) break;
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
      registrarFallo(candidato, error, inicioIntento);
    }
  }

  const proveedores = process.env.GROQ_API_KEY ? "Gemini ni de Groq" : "Gemini";
  throw new Error(
    `Ningún modelo de ${proveedores} pudo responder. Suele ser saturación temporal: intenta de nuevo en unos minutos.` +
      (ultimoError?.message ? `\n\nÚltimo error: ${ultimoError.message}` : "")
  );
}
