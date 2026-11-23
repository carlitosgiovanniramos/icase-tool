import { test, mock } from "node:test";
import assert from "node:assert/strict";

// La IA simulada devuelve un caso por cada requerimiento de la lista del prompt, salvo los que se
// indiquen en "omitir" la primera vez que se piden (para probar el reintento por cobertura).
const llamadas = [];
let omitir = new Set();
mock.module(new URL("../lib/gemini.js", import.meta.url).href, {
  namedExports: {
    generarContenido: async ({ contents }) => {
      const texto = contents[0].text;
      const lista = texto.split("Requerimientos funcionales a probar (con sus actores):\n")[1].split("\n\n")[0];
      const codigos = [...lista.matchAll(/^(RF\d+)/gm)].map((m) => m[1]);
      llamadas.push(codigos);
      const casos = codigos
        .filter((c) => !omitir.has(c))
        .map((c) => ({ titulo: `Probar ${c}`, rfs: [c.toLowerCase()], actor: "administrador", tipo: "funcional", precondiciones: "Sesión iniciada", pasos: ["Abrir", "Guardar", "Ver"], esperado: "Queda guardado" }));
      omitir = new Set();
      return { text: JSON.stringify({ casos }), modelVersion: "simulado", costoUsd: 0 };
    },
  },
});

const { generarPruebas } = await import("../lib/pruebasIA.js");
const { normalizarCasos, conservarResultados, trazabilidad, resumenPruebas, revisarParaAprobar, idHallazgo } = await import("../lib/pruebas.js");

const analisis = (n) => ({
  actores: [{ nombre: "Administrador" }, { nombre: "Estudiante" }],
  requerimientos_funcionales: Array.from({ length: n }, (_, i) => ({ codigo: `RF${String(i + 1).padStart(2, "0")}`, nombre: `Función ${i + 1}`, descripcion: "x", actores: ["Administrador"] })),
});

test("reparte los requerimientos en lotes de 8 y numera los casos", async () => {
  llamadas.length = 0;
  const r = await generarPruebas({ nombre: "Demo", analisis: analisis(20) });
  assert.deepEqual(llamadas.map((l) => l.length).sort(), [4, 8, 8]);
  assert.equal(r.casos.length, 20);
  assert.equal(r.casos[0].id, "CP-01");
  assert.equal(r.casos[19].id, "CP-20");
  assert.equal(r.casos[0].actor, "Administrador"); // nombre exacto del análisis
  assert.deepEqual(r.advertencias, []);
});

test("pide solo los requerimientos que quedaron sin caso", async () => {
  llamadas.length = 0;
  omitir = new Set(["RF03"]);
  const r = await generarPruebas({ nombre: "Demo", analisis: analisis(5) });
  assert.equal(llamadas.length, 2);
  assert.deepEqual(llamadas[1], ["RF03"]);
  assert.equal(trazabilidad(analisis(5), r.casos).sinCubrir.length, 0);
});

test("trazabilidad: detecta requerimientos sin caso y casos huérfanos", () => {
  const casos = normalizarCasos([
    { titulo: "A", rfs: ["RF01"] },
    { titulo: "B", rfs: ["RF-09"] },
  ]);
  const t = trazabilidad(analisis(2), casos);
  assert.deepEqual(t.sinCubrir, ["RF02"]);
  assert.deepEqual(t.huerfanos, ["CP-02"]);
});

test("al regenerar se conservan resultados y hallazgos de los casos repetidos", () => {
  const previa = {
    casos: normalizarCasos([{ titulo: "Crear sala", rfs: ["RF01"], resultado: "fallido", observacion: "Error 500" }, { titulo: "Borrar sala", rfs: ["RF02"], resultado: "aprobado" }]),
    hallazgos: [
      { id: "H-01", caso: "CP-01", titulo: "Falla", gravedad: "alta", estado: "abierto" },
      { id: "H-02", caso: "CP-02", titulo: "Otra", gravedad: "baja", estado: "abierto" },
    ],
  };
  const nuevos = normalizarCasos([{ titulo: "Agregar algo", rfs: ["RF03"] }, { titulo: "crear  SALA", rfs: ["RF01"] }]);
  const { casos, hallazgos } = conservarResultados(previa, nuevos);
  assert.equal(casos[1].resultado, "fallido");
  assert.equal(casos[1].observacion, "Error 500");
  assert.equal(casos[0].resultado, "pendiente");
  assert.deepEqual(hallazgos.map((h) => [h.id, h.caso]), [["H-01", "CP-02"]]); // el de "Borrar sala" se va con su caso
});

test("revisarParaAprobar: errores impiden, avisos solo se reconocen", () => {
  const a = analisis(2);
  const plan = { casos: normalizarCasos([{ titulo: "A", rfs: ["RF01"], resultado: "aprobado" }]), hallazgos: [] };
  assert.match(revisarParaAprobar(plan, a).errores[0], /RF02/);

  plan.casos = normalizarCasos([{ titulo: "A", rfs: ["RF01"], resultado: "fallido" }, { titulo: "B", rfs: ["RF02"] }]);
  plan.hallazgos = [{ id: "H-01", caso: "CP-01", titulo: "x", gravedad: "alta", estado: "abierto" }];
  let rev = revisarParaAprobar(plan, a);
  assert.equal(rev.errores.length, 1);
  assert.match(rev.errores[0], /gravedad alta/);

  plan.hallazgos[0].estado = "corregido";
  rev = revisarParaAprobar(plan, a);
  assert.equal(rev.errores.length, 0);
  assert.equal(rev.avisos.length, 2); // un fallido y uno sin ejecutar
  assert.deepEqual(resumenPruebas(plan), { total: 2, aprobados: 0, fallidos: 1, pendientes: 1, hallazgos: 1, abiertos: 0, abiertosGraves: 0 });
});

test("idHallazgo no repite identificadores", () => {
  assert.equal(idHallazgo([]), "H-01");
  assert.equal(idHallazgo([{ id: "H-01" }, { id: "H-04" }]), "H-05");
});

test("el prompt lleva las condiciones del requerimiento y las pantallas reales que lo cumplen", async () => {
  const { armarPromptPruebas, pantallasDelLote } = await import("../lib/pruebasIA.js");
  const a = analisis(2);
  a.requerimientos_funcionales[0].precondiciones = "El usuario tiene cuenta activa";
  a.requerimientos_funcionales[0].postcondiciones = "Se muestra el menú del rol";
  const pantallas = [
    { nombre: "Iniciar sesión", plataforma: "Web", rfs: ["RF01"], actores: ["Estudiante"], acciones: ["Ingresar", "Olvidé mi contraseña"] },
    { nombre: "Salas", plataforma: "Web", rfs: ["rf-02"], actores: ["Administrador"], acciones: ["Nueva sala"] },
  ];
  const un = armarPromptPruebas({ nombre: "Demo", analisis: a, requerimientos: [a.requerimientos_funcionales[0]], pantallas });
  assert.match(un, /RF01 \| antes: El usuario tiene cuenta activa \| después: Se muestra el menú del rol/);
  assert.match(un, /Iniciar sesión \(Web; cumple RF01\)/);
  assert.match(un, /botones y enlaces: Ingresar; Olvidé mi contraseña/);
  assert.doesNotMatch(un, /Nueva sala/); // la pantalla de otro requerimiento no entra
  assert.equal(pantallasDelLote(pantallas, [a.requerimientos_funcionales[1]]).length, 1); // rf-02 coincide con RF02

  const sin = armarPromptPruebas({ nombre: "Demo", analisis: a, requerimientos: [a.requerimientos_funcionales[1]], pantallas: [] });
  assert.doesNotMatch(sin, /Pantallas del prototipo aprobado/);
});
