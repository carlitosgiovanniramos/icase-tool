// Prueba de rendimiento con k6 (APE4, 8.2.2): generación del diagrama de casos de uso con IA
// (POST /api/generar-casos-uso, modelos gratuitos: Gemini y, si falla, Groq).
// Escalones de concurrencia: 1, 2, 5 y 10 solicitudes simultáneas, uno detrás de otro.
// Registra tiempo de respuesta, errores, tiempos agotados y tokens (campo tokens_ia de la respuesta).
// Uso: k6 run -e URL=http://localhost:3100 -e COOKIE="<cookies>" tests/carga/generacion-ia.js
import http from "k6/http";
import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const URL = __ENV.URL || "http://localhost:3100";
const COOKIE = __ENV.COOKIE || "";
const ANALISIS = JSON.parse(open("./datos/analisis-biblioteca.json"));

const errores = new Rate("errores");
const agotados = new Counter("tiempos_agotados");
const tiempoIA = new Trend("tiempo_generacion", true);
const tokensEntrada = new Trend("tokens_entrada");
const tokensSalida = new Trend("tokens_salida");
const tokensTotal = new Trend("tokens_total");

// Cada escalón empieza cuando el anterior ya debió terminar (una generación tarda menos de 5 min).
const escalon = (vus, inicio) => ({ executor: "per-vu-iterations", vus, iterations: 1, startTime: inicio, maxDuration: "6m", tags: { concurrencia: String(vus) } });
export const options = {
  scenarios: {
    c1: escalon(1, "0s"),
    c2: escalon(2, "6m"),
    c5: escalon(5, "12m"),
    c10: escalon(10, "18m"),
  },
  thresholds: {
    "tiempo_generacion{concurrencia:1}": ["avg<120000"],
    "errores{concurrencia:5}": ["rate<0.05"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(95)"],
};

export default function () {
  const r = http.post(`${URL}/api/generar-casos-uso`, JSON.stringify({ analisis: ANALISIS, usarClaude: false }), {
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    redirects: 0,
    timeout: "300s",
  });
  let cuerpo = null;
  try { cuerpo = r.json(); } catch { /* respuesta no JSON */ }
  const ok = check(r, {
    "estado 200": (x) => x.status === 200,
    "trae el diagrama": () => !!(cuerpo && cuerpo.diagrama_mermaid),
  });
  errores.add(!ok);
  if (r.error_code === 1050 || r.status === 504) agotados.add(1);
  tiempoIA.add(r.timings.duration);
  const t = cuerpo && cuerpo.tokens_ia;
  if (t) {
    tokensEntrada.add(t.entrada);
    tokensSalida.add(t.salida);
    tokensTotal.add(t.total);
  }
  console.log(`concurrencia=${__ENV.K6_SCENARIO || ""} vu=${__VU} estado=${r.status} s=${Math.round(r.timings.duration / 1000)} modelo=${cuerpo && cuerpo.modelo_ia} tokens=${t ? t.total : "-"} advertencias=${cuerpo && cuerpo.advertencias ? cuerpo.advertencias.length : "-"}`);
}
