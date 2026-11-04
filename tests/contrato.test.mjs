import { test } from "node:test";
import assert from "node:assert/strict";
import { accionesDelPrototipo, contratoAprobable } from "../lib/accionesContrato.js";
import { validarContrato, documentoOpenAPI } from "../lib/validarContrato.js";
import { peticionDePrueba, evaluarRespuesta, probarPermisosContrato } from "../lib/pruebaContrato.js";

const contexto = {
  pantallas: [{ nombre: "Órdenes", plataforma: "Web", rfs: ["RF01"], html: '<button>Consultar órdenes</button>' }],
  analisis: { actores: [{ nombre: "Recepcionista" }, { nombre: "Mecánico" }], requerimientos_funcionales: [{ codigo: "RF01" }] },
  stack: { piezas: [{ pieza: "supabase" }] },
  inventario: { tablas: [{ nombre: "orden", columnas: [{ nombre: "id" }, { nombre: "estado" }], permisos: { select: true, update: true } }], funciones: [{ nombre: "cerrar_orden", ejecutable: true, nombresArgumentos: ["orden_id"], cantidadArgumentos: 1, argumentosConDefecto: 0 }] },
};
const op = { id: "ordenes", nombre: "Consultar órdenes", tipo: "tabla", recurso: "orden", metodo: "GET", roles: ["Recepcionista"], requerimientos: ["RF01"], entrada: { type: "object" }, salida: { type: "array", items: { type: "object" } }, prueba: { filtros: { id: "eq.1" } } };
const resultado = { operaciones: [op], acciones: [{ id: "p1-a1", tipo: "api", operaciones: ["ordenes"] }] };
const clonar = (v) => structuredClone(v);

test("extrae formularios, botones anidados y submit sin interpretar scripts", () => {
  const acciones = accionesDelPrototipo([{ nombre: "Formulario", html: '<script><button>Falso</button></script><form><button>Guardar</button><input type="submit" value="Enviar"></form><a href="/">Inicio</a>' }]);
  assert.equal(acciones.length, 4);
  assert.deepEqual(acciones.map((a) => a.tipo), ["form", "button", "input", "a"]);
  assert.equal(acciones[1].nombre, "Guardar");
  assert.equal(acciones[2].nombre, "Enviar");
});
test("una pantalla estática sigue necesitando una asignación", () => assert.equal(accionesDelPrototipo([{ nombre: "Inicio", html: "<h1>Inicio</h1>" }])[0].tipo, "consulta"));
test("contrato válido cubre la acción real y puede aprobarse", () => {
  const ficha = validarContrato(resultado, contexto);
  assert.deepEqual(ficha.errores, []);
  assert.equal(contratoAprobable(ficha), true);
});
test("rechaza tablas, roles y requerimientos inventados", () => {
  const copia = clonar(resultado); Object.assign(copia.operaciones[0], { recurso: "inexistente", roles: ["Dueño"], requerimientos: ["RF999"] });
  const errores = validarContrato(copia, contexto).errores.join(" ");
  assert.match(errores, /roles válidos/);
  assert.match(errores, /requerimientos existentes/);
  assert.match(errores, /no existe en el inventario/);
});
test("no inventa acceso a una tabla sin grant", () => {
  const ctx = clonar(contexto); ctx.inventario.tablas[0].permisos.select = false;
  assert.match(validarContrato(resultado, ctx).errores.join(" "), /no tiene permiso/);
});
test("una RPC debe existir y respetar sus argumentos obligatorios", () => {
  const copia = clonar(resultado); Object.assign(copia.operaciones[0], { tipo: "rpc", recurso: "cerrar_orden", metodo: "POST", prueba: { cuerpo: {} } });
  assert.match(validarContrato(copia, contexto).errores.join(" "), /obligatorios/);
  copia.operaciones[0].prueba.cuerpo = { orden_id: 1 };
  assert.deepEqual(validarContrato(copia, contexto).errores, []);
  copia.operaciones[0].prueba.cuerpo = { inventado: 1 };
  assert.match(validarContrato(copia, contexto).errores.join(" "), /inexistentes/);
});
test("crear cuentas por Auth admin no es una operación de cliente", () => {
  const copia = clonar(resultado); Object.assign(copia.operaciones[0], { tipo: "auth", recurso: "admin" });
  assert.match(validarContrato(copia, contexto).errores.join(" "), /Edge Function/);
});
test("una Edge Function se declara pendiente y cubre su acción", () => {
  const copia = clonar(resultado); Object.assign(copia.operaciones[0], { tipo: "edge", recurso: "crear_usuario", metodo: "POST", descripcion: "Crear una cuenta con Auth admin solo para el administrador." });
  const ficha = validarContrato(copia, contexto);
  assert.deepEqual(ficha.errores, []);
  assert.match(ficha.advertencias.join(" "), /etapa 8/);
});
test("bloquea acciones omitidas, duplicadas e inventadas", () => {
  for (const acciones of [[], [...resultado.acciones, ...resultado.acciones], [{ id: "inventada", tipo: "local", motivo: "x" }]]) {
    const ficha = validarContrato({ ...resultado, acciones }, contexto);
    assert.equal(contratoAprobable(ficha), false);
  }
});
test("navegación requiere explicación y no puede citar operaciones inexistentes", () => {
  const ficha = validarContrato({ operaciones: [], acciones: [{ id: "p1-a1", tipo: "navegacion", motivo: "Abrir pantalla de órdenes" }] }, contexto);
  assert.deepEqual(ficha.errores, []);
  assert.ok(ficha.advertencias.length);
});
test("OpenAPI conserva entradas, salidas, roles, RF y parámetros de ruta", () => {
  const ctx = { ...contexto, stack: { piezas: [{ pieza: "express" }] } };
  const ficha = validarContrato({ ...resultado, operaciones: [{ ...op, tipo: "http", metodo: "PATCH", recurso: "/api/ordenes/{id}" }] }, ctx);
  assert.deepEqual(ficha.errores, []);
  const ruta = documentoOpenAPI(ficha, "Taller").paths["/api/ordenes/{id}"].patch;
  assert.equal(ruta.parameters[0].in, "path");
  assert.equal(ruta.requestBody.content["application/json"].schema.type, "object");
  assert.deepEqual(ruta["x-roles"], op.roles);
});
test("no pierde silenciosamente operaciones HTTP con la misma ruta y método", () => {
  const ctx = { ...contexto, stack: { piezas: [{ pieza: "express" }] } };
  const ficha = validarContrato({ ...resultado, operaciones: [{ ...op, tipo: "http", recurso: "/api/ordenes" }, { ...op, id: "otra", tipo: "http", recurso: "/api/ordenes" }] }, ctx);
  assert.match(ficha.errores.join(" "), /ruta HTTP repetidos/);
});
test("rechaza esquemas con referencias sin definir o arrays sin items", () => {
  for (const salida of [{ type: "array" }, { type: "object", properties: { orden: { $ref: "#/components/schemas/NoExiste" } } }, { type: "object", properties: { inventada: { type: "string" } } }]) {
    const ficha = validarContrato({ ...resultado, operaciones: [{ ...op, salida }] }, contexto);
    assert.ok(ficha.errores.length);
  }
});
test("las pruebas no permiten URLs externas ni escrituras masivas", () => {
  assert.throws(() => peticionDePrueba({ ...op, recurso: "http://externo" }, "Recepcionista"));
  assert.throws(() => peticionDePrueba({ ...op, metodo: "DELETE", prueba: { filtros: {} } }, "Recepcionista"));
  assert.throws(() => peticionDePrueba({ ...op, prueba: { filtros: { select: "*" } } }, "Recepcionista"));
});
test("una consulta sin filas y los errores de negocio no prueban permisos", () => {
  assert.equal(evaluarRespuesta(op, false, { status: 200, datos: [] }).estado, "inconclusa");
  assert.equal(evaluarRespuesta(op, false, { status: 400, datos: { code: "23503" } }).estado, "inconclusa");
  assert.equal(evaluarRespuesta(op, false, { status: 400, datos: { code: "P0001" } }).estado, "inconclusa");
  assert.equal(evaluarRespuesta(op, false, { status: 200, datos: [{ id: 1 }] }).estado, "fallida");
  assert.equal(evaluarRespuesta(op, false, { status: 403, datos: { code: "42501" } }).estado, "correcta");
});
test("matriz HTTP con login real simulado: un rol permitido y otro prohibido", async () => {
  const llamadas = [];
  const fetchImpl = async (url, opciones) => {
    llamadas.push({ url, opciones });
    if (url.includes("/auth/")) return Response.json({ access_token: JSON.parse(opciones.body).email.startsWith("recep") ? "recep" : "mecanico" });
    return opciones.headers.Authorization === "Bearer recep" ? Response.json([{ id: 1 }]) : Response.json({ code: "42501" }, { status: 403 });
  };
  const prueba = await probarPermisosContrato({ baseUrl: "http://127.0.0.1:8000", anonKey: "anon", usuarios: [{ email: "recepcionista@prueba.local", rol: "Recepcionista" }, { email: "mecanico@prueba.local", rol: "Mecánico" }], actores: contexto.analisis.actores, contrato: validarContrato(resultado, contexto), fetchImpl });
  assert.equal(prueba.ok, true); assert.equal(prueba.correctas, 4);
  assert.ok(llamadas.filter((x) => x.url.includes("/rest/")).every((x) => x.opciones.headers.Prefer.includes("tx=rollback")));
  assert.equal(JSON.stringify(prueba).includes("Bearer"), false);
});
test("usuarios no identificables dejan la prueba sin verificar", async () => {
  const prueba = await probarPermisosContrato({ baseUrl: "http://127.0.0.1:8000", anonKey: "anon", usuarios: [], actores: contexto.analisis.actores, contrato: validarContrato(resultado, contexto), fetchImpl: () => { throw new Error("No debe llamar"); } });
  assert.equal(prueba.ok, false); assert.ok(prueba.inconclusas > 0);
});
test("RLS sin filas prueba un rechazo solo con un control positivo idéntico", async () => {
  const fetchImpl = async (url, opciones) => {
    if (url.includes("/auth/")) return Response.json({ access_token: JSON.parse(opciones.body).email.startsWith("recep") ? "recep" : "mecanico" });
    return Response.json(opciones.headers.Authorization === "Bearer recep" ? [{ id: 1 }] : []);
  };
  const ctx = { baseUrl: "http://127.0.0.1:8000", anonKey: "anon", usuarios: [{ email: "recepcionista@prueba.local", rol: "Recepcionista" }, { email: "mecanico@prueba.local", rol: "Mecánico" }], actores: contexto.analisis.actores, contrato: validarContrato(resultado, contexto), fetchImpl };
  assert.equal((await probarPermisosContrato(ctx)).ok, true);
  const diferente = clonar(ctx.contrato);
  diferente.operaciones[0].prueba.porRol = { "Mecánico": { filtros: { id: "eq.999" } } };
  assert.equal((await probarPermisosContrato({ ...ctx, contrato: diferente })).ok, false);
});
