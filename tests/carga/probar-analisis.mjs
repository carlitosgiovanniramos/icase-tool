// Prueba manual del prompt de generar-analisis con la entrada de "Reserva de salas de estudio" (APE4):
// envía a /api/generar-analisis la descripción, el contexto y las respuestas de la entrevista, y resume
// lo que devuelve. Uso: node tests/carga/probar-analisis.mjs [url]   (cookie de tests/carga/sesion.mjs)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:3000";
const cookie = readFileSync("tests/carga/.sesion.txt", "utf8");

const cuerpo = {
  nombre: "Reserva de salas de estudio",
  prompt:
    "Aplicación web para gestionar las reservas de salas de estudio de una biblioteca universitaria. Hay dos roles: estudiante y administrador. El estudiante puede consultar las salas disponibles por fecha, horario y capacidad; crear una reserva; ver sus reservas; y cancelar una reserva antes de que comience. El administrador puede registrar y editar salas, indicar su capacidad y ubicación, bloquear horarios por mantenimiento y consultar todas las reservas.\n\nCada reserva corresponde a un estudiante, una sala, una fecha, una hora de inicio y una hora de fin. El sistema debe impedir reservas que se solapen con otra reserva o con un bloqueo de mantenimiento. Las salas están disponibles de 08:00 a 20:00 y cada reserva dura entre una y dos horas. Una reserva puede estar confirmada, cancelada o finalizada. Al crearla o cancelarla, el sistema muestra una confirmación. No se requieren pagos ni integraciones externas.",
  contexto: {
    problema: "Las reservas de salas se hacen en un cuaderno o por mensaje, y se producen cruces de horario y reservas perdidas.",
    usuarios: "Estudiante, Administrador",
    incluye: "Consulta de salas por fecha, horario y capacidad; reservas y cancelación por el estudiante; registro y edición de salas; bloqueo de horarios por mantenimiento; consulta de todas las reservas por el administrador",
    no_incluye: "Pagos, integraciones externas, notificaciones y app móvil",
    reglas: [
      "No se permiten reservas que se solapen con otra reserva o con un bloqueo de mantenimiento",
      "Las salas están disponibles de 08:00 a 20:00",
      "Cada reserva dura entre una y dos horas",
      "Una reserva puede estar confirmada, cancelada o finalizada",
      "El estudiante solo puede cancelar una reserva antes de que comience",
      "Al crear o cancelar una reserva, el sistema muestra una confirmación",
    ].join("\n"),
    tecnologias: "Next.js y Supabase (PostgreSQL y Auth)",
    plataformas: ["Web"],
    calidad: ["Seguridad", "Usabilidad"],
    entrevista: [
      { pregunta: "¿Las reservas se hacen en bloques fijos o el estudiante puede elegir cualquier hora de inicio?", respuesta: "Bloques fijos de una hora que empiezan en punto (08:00, 09:00, ..., 19:00). Una reserva puede ocupar uno o dos bloques seguidos." },
      { pregunta: "¿Cada reserva es para una sola persona o se indican ocupantes?", respuesta: "Cada reserva es de un solo estudiante, sin indicar número de ocupantes. La capacidad de la sala se usa solo como filtro de búsqueda." },
      { pregunta: "¿Qué pasa con las reservas futuras si se edita o desactiva una sala?", respuesta: "Si el administrador desactiva una sala, no puede hacerlo mientras tenga reservas confirmadas futuras. Cambiar capacidad o ubicación no afecta las reservas existentes." },
      { pregunta: "¿Un estudiante ve las reservas de otros?", respuesta: "No. El estudiante solo ve sus propias reservas; de las demás solo ve que el horario está ocupado, sin datos de quién reservó." },
      { pregunta: "¿El administrador crea o cancela reservas?", respuesta: "El administrador puede consultar todas las reservas, bloquear horarios y cancelar cualquier reserva, pero no crea reservas en nombre de un estudiante." },
    ],
  },
  usarClaude: false,
};

const t0 = Date.now();
const r = await fetch(`${URL}/api/generar-analisis`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(cuerpo), redirect: "manual" });
const texto = await r.text();
const seg = Math.round((Date.now() - t0) / 1000);
let j;
try { j = JSON.parse(texto); } catch { console.log("respuesta no JSON:", r.status, texto.slice(0, 300)); process.exit(1); }
if (j.error) { console.log("error:", j.error.slice(0, 400)); process.exit(1); }
mkdirSync("tests/carga/resultados", { recursive: true });
writeFileSync("tests/carga/resultados/analisis-reservas.json", JSON.stringify(j, null, 2));
console.log(`HTTP ${r.status} en ${seg} s · modelo ${j.modelo_ia}`);
console.log(`Actores (${j.actores.length}):`, j.actores.map((a) => a.nombre).join(", "));
console.log(`RF: ${j.requerimientos_funcionales.length} · RNF: ${j.requerimientos_no_funcionales.length}`);
for (const x of j.requerimientos_funcionales) console.log(`  ${x.codigo} [${(x.actores || []).join("/")}] ${x.nombre}`);
for (const x of j.requerimientos_no_funcionales) console.log(`  ${x.codigo} (${x.categoria}) ${x.nombre}`);
console.log("Advertencias:", j.advertencias?.length ? "\n  - " + j.advertencias.join("\n  - ") : "ninguna");
