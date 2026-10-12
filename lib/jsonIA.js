// Lee el JSON de una respuesta de la IA: toma el primer objeto completo e ignora cualquier
// texto o bloque de código que el modelo haya puesto antes o después.
export function leerJson(texto) {
  const s = String(texto || "").trim();
  const inicio = s.indexOf("{");
  if (inicio === -1) throw new Error("La IA no devolvió un JSON.");

  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < s.length; i++) {
    const c = s[i];
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === "{") profundidad++;
    else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return JSON.parse(s.slice(inicio, i + 1));
    }
  }
  throw new Error("El JSON de la IA llegó incompleto.");
}

// Suma el costo de dos llamadas (solo Claude lo informa; con Gemini queda sin definir).
export const sumarCosto = (a, b) => (typeof a === "number" || typeof b === "number" ? (a || 0) + (b || 0) : a);

// Compara textos sin tildes, mayúsculas ni signos.
export const normalizarTexto = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim();

export const normalizarCodigo = (c) => String(c ?? "").replace(/[-\s]/g, "").toUpperCase();
