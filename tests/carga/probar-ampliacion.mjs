// Prueba manual del prompt de ampliar-analisis (APE4): parte del análisis que dejó probar-analisis.mjs
// (tests/carga/resultados/analisis-reservas.json) y le pide la misma ampliación que hizo el usuario.
// Uso: node tests/carga/probar-ampliacion.mjs [url]   (cookie de tests/carga/sesion.mjs)
import { readFileSync, writeFileSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:3000";
const cookie = readFileSync("tests/carga/.sesion.txt", "utf8");
const analisis = JSON.parse(readFileSync("tests/carga/resultados/analisis-reservas.json", "utf8"));
delete analisis.advertencias;
delete analisis.modelo_ia;
delete analisis.costo_ia;

const cuerpo = {
  prompt: "Aplicación web para gestionar las reservas de salas de estudio de una biblioteca universitaria. Hay dos roles: estudiante y administrador.",
  contexto: {
    usuarios: "Estudiante, Administrador",
    no_incluye: "Pagos, integraciones externas, notificaciones y app móvil",
    tecnologias: "Next.js y Supabase (PostgreSQL y Auth)",
    plataformas: ["Web"],
    calidad: ["Seguridad", "Usabilidad"],
  },
  analisis,
  instruccion: "Los estudiantes se registran solos con correo y contraseña. El rol de administrador solo lo asigna otro administrador, y el primero se crea al desplegar el sistema.",
  usarClaude: false,
};

const t0 = Date.now();
const r = await fetch(`${URL}/api/ampliar-analisis`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(cuerpo), redirect: "manual" });
const j = JSON.parse(await r.text());
if (j.error) { console.log("error:", j.error.slice(0, 400)); process.exit(1); }
writeFileSync("tests/carga/resultados/ampliacion-reservas.json", JSON.stringify(j, null, 2));
console.log(`HTTP ${r.status} en ${Math.round((Date.now() - t0) / 1000)} s · modelo ${j.modelo_ia}`);
console.log("Actores nuevos:", (j.actores_nuevos || []).map((a) => a.nombre).join(", ") || "ninguno");
console.log(`RF nuevos: ${j.requerimientos_funcionales.length} · RNF nuevos: ${j.requerimientos_no_funcionales.length} · modificados: ${j.modificados_funcionales.length + j.modificados_no_funcionales.length}`);
for (const x of j.requerimientos_funcionales) console.log(`  ${x.codigo} [${(x.actores || []).join("/")}] ${x.nombre}\n     antes: ${x.precondiciones}`);
for (const x of j.requerimientos_no_funcionales) console.log(`  ${x.codigo} (${x.categoria}) ${x.nombre}`);
