// Prueba de carga con k6 (APE4, 8.2.2): acceso a la vista "Mis proyectos" de I-CASE Tool con sesión iniciada.
// La página se arma en el servidor (Next.js) y consulta Supabase en cada visita.
// Uso: k6 run -e URL=https://icase-tool.vercel.app -e COOKIE="<cookies de sesión>" tests/carga/vista.js
// COOKIE se obtiene con: node tests/carga/sesion.mjs  (escribe tests/carga/.sesion.txt, ignorado por git)
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const URL = __ENV.URL || "https://icase-tool.vercel.app";
const COOKIE = __ENV.COOKIE || "";

const errores = new Rate("errores");
const tiempoVista = new Trend("tiempo_vista", true);

export const options = {
  scenarios: {
    rampa: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "30s", target: 10 },
        { duration: "45s", target: 20 },
        { duration: "30s", target: 20 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    "http_req_duration{vista:proyectos}": ["p(95)<3000"],
    errores: ["rate<0.01"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)"],
};

export default function visitarVista() {
  const r = http.get(`${URL}/`, { headers: { Cookie: COOKIE }, redirects: 0, tags: { vista: "proyectos" }, timeout: "30s" });
  // Con sesión válida responde 200 con "Mis proyectos"; una redirección a /login es un error de la prueba.
  const ok = check(r, {
    "estado 200": (x) => x.status === 200,
    "muestra Mis proyectos": (x) => String(x.body || "").includes("Mis proyectos"),
  });
  errores.add(!ok);
  tiempoVista.add(r.timings.duration);
  sleep(1);
}
