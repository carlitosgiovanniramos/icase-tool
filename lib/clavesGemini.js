// Varias claves de Gemini, usadas por turnos: se usa la primera y, solo si Google responde que se acabó su cuota
// (o que la clave no sirve), se pasa a la siguiente dentro de la misma petición. Sin servidor ni red propios:
// solo decide el orden y recuerda cuál clave está agotada para cada modelo mientras viva la instancia.
//
// La cuota gratuita de Gemini es por proyecto de Google (y por modelo): las claves tienen que ser de proyectos
// distintos para que sumen. Nunca se escribe una clave en el log: solo su posición ("clave 2 de 3").

const PAUSA_POR_DEFECTO_MS = 60_000; // cuota agotada sin saber cuándo se renueva (límite por minuto)
const PAUSA_CLAVE_INUTIL_MS = 30 * 60_000; // clave inválida, revocada o sin permiso
const PAUSA_MAXIMA_MS = 12 * 3600_000;

// GEMINI_API_KEYS="clave1,clave2,clave3" (separadas por coma, espacio o salto de línea) y/o GEMINI_API_KEY.
// Sin repetidas y en ese orden.
export function leerClaves(env = process.env) {
  const lista = [...String(env.GEMINI_API_KEYS || "").split(/[\s,;]+/), String(env.GEMINI_API_KEY || "")].map((k) => k.trim()).filter(Boolean);
  return [...new Set(lista)];
}

export const esErrorDeCuota = (error) => /RESOURCE_EXHAUSTED|\b429\b/.test(String(error?.message || ""));
export const esErrorDeClave = (error) => /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|\b403\b/i.test(String(error?.message || ""));

// llamar(indice) hace la petición con la clave de esa posición. estado: Map compartido ("modelo|indice" → hasta
// cuándo está agotada). segundosDeReintento(error): segundos que Google dice que faltan para renovar la cuota.
// Si todas las claves fallan, lanza el último error con segundosReintento = lo que falta para la primera que se
// renueve, para que el modelo quede en pausa ese tiempo.
export async function conRotacionDeClaves({ modelo, total, llamar, estado, segundosDeReintento = () => null, ahora = Date.now }) {
  if (!total) throw new Error("Falta GEMINI_API_KEY (o GEMINI_API_KEYS) en el servidor.");
  const llave = (i) => `${modelo}|${i}`;
  const agotada = (i) => ahora() < (estado.get(llave(i)) ?? 0);
  // Las agotadas van al final (por si ya se renovaron antes de lo previsto); el orden original se respeta.
  const orden = [...Array(total).keys()].sort((a, b) => agotada(a) - agotada(b));

  let ultimo;
  for (const [posicion, i] of orden.entries()) {
    try {
      return await llamar(i);
    } catch (error) {
      const cuota = esErrorDeCuota(error);
      if (!cuota && !esErrorDeClave(error)) throw error; // otro fallo: lo maneja el siguiente modelo, no otra clave
      ultimo = error;
      const segundos = cuota ? segundosDeReintento(error) : null;
      const pausa = cuota ? (segundos ? segundos * 1000 : PAUSA_POR_DEFECTO_MS) : PAUSA_CLAVE_INUTIL_MS;
      estado.set(llave(i), ahora() + Math.min(pausa, PAUSA_MAXIMA_MS));
      if (total > 1) {
        console.warn(`[ia] ${modelo}: clave ${i + 1} de ${total} ${cuota ? "sin cuota" : "no sirve"}${posicion < orden.length - 1 ? ", paso a la siguiente" : ""}`);
      }
    }
  }

  const primeraEnRenovarse = Math.min(...orden.map((i) => estado.get(llave(i)) ?? 0));
  ultimo.segundosReintento = Math.max(1, Math.ceil((primeraEnRenovarse - ahora()) / 1000));
  throw ultimo;
}
