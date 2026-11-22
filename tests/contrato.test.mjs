import { test } from "node:test";
import assert from "node:assert/strict";
import { accionesDelPrototipo, agruparAcciones, expandirAsignaciones, pantallasParaContrato, contratoAprobable } from "../lib/accionesContrato.js";
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
test("los controles iguales de una pantalla se asignan una vez y se copian a todos", () => {
  const pantallas = [
    { nombre: "Parte", rfs: ["RF01"], html: "<button>Agregar</button><button>agregar</button><button>Guardar</button>" },
    { nombre: "Otra", rfs: ["RF01"], html: "<button>Agregar</button>" },
  ];
  const acciones = accionesDelPrototipo(pantallas);
  const grupos = agruparAcciones(acciones);
  assert.equal(grupos.length, 3); // "Agregar" de Parte (2 veces), "Guardar", y el "Agregar" de otra pantalla
  assert.deepEqual(pantallasParaContrato(grupos)[0].controles[0], { id: "p1-a1", tipo: "button", nombre: "Agregar", veces: 2 });
  const expandidas = expandirAsignaciones([
    { id: "p1-a1", tipo: "local", motivo: "Agrega una fila" },
    { id: "p1-a3", tipo: "api", operaciones: ["op"] },
    { id: "p2-a1", tipo: "local", motivo: "x" },
    { id: "p1-a2", tipo: "api", operaciones: ["op"] }, // una asignación explícita no la pisa su grupo
  ], grupos);
  assert.deepEqual(expandidas.map((a) => [a.id, a.tipo]).sort(), [["p1-a1", "local"], ["p1-a2", "api"], ["p1-a3", "api"], ["p2-a1", "local"]]);
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
test("acepta los nombres del SDK de Supabase para iniciar y cerrar sesión", () => {
  for (const [recurso, esperado] of [["auth.signInWithPassword", "login"], ["auth.signOut", "logout"], ["getSession", "sesion"]]) {
    const copia = clonar(resultado); Object.assign(copia.operaciones[0], { tipo: "auth", recurso, metodo: "POST" });
    const ficha = validarContrato(copia, contexto);
    assert.deepEqual(ficha.errores, []);
    assert.equal(ficha.operaciones[0].recurso, esperado);
  }
});
test("cerrar sesión no necesita cubrir un RF de la pantalla", () => {
  const ctx = clonar(contexto); ctx.pantallas[0].html = "<button>Cerrar sesión</button>";
  const copia = clonar(resultado); Object.assign(copia.operaciones[0], { tipo: "auth", recurso: "auth.signOut", metodo: "POST", requerimientos: ["RF02"] });
  ctx.analisis.requerimientos_funcionales.push({ codigo: "RF02" });
  assert.deepEqual(validarContrato(copia, ctx).errores, []);
});
test("una Edge Function puede llevar guiones en el nombre", () => {
  const copia = clonar(resultado); Object.assign(copia.operaciones[0], { tipo: "edge", recurso: "admin-crear-usuario", metodo: "POST", descripcion: "Crear cuenta." });
  assert.deepEqual(validarContrato(copia, contexto).errores, []);
  copia.operaciones[0].recurso = "../otra";
  assert.match(validarContrato(copia, contexto).errores.join(" "), /Edge Function no válido/);
});
test("una operación sin botón es una advertencia, no un error", () => {
  const copia = clonar(resultado); copia.operaciones.push({ ...clonar(op), id: "al_cargar" });
  const ficha = validarContrato(copia, contexto);
  assert.deepEqual(ficha.errores, []);
  assert.match(ficha.advertencias.join(" "), /al_cargar: no la usa ninguna acción/);
});
test("un rol que ningún RF citado autoriza se quita con aviso, sin distinguir mayúsculas ni tildes", () => {
  const ctx = clonar(contexto); ctx.analisis.requerimientos_funcionales[0].actores = ["Recepcionista"];
  const copia = clonar(resultado); copia.operaciones[0].roles = ["recepcionista", "Mecanico"];
  const ficha = validarContrato(copia, ctx);
  assert.deepEqual(ficha.errores, []);
  assert.deepEqual(ficha.operaciones[0].roles, ["Recepcionista"]);
  assert.match(ficha.advertencias.join(" "), /se quitó el rol Mecánico porque ningún requerimiento que cita \(RF01\)/);
});
test("si ningún rol de la operación está autorizado, sigue siendo un error", () => {
  const ctx = clonar(contexto); ctx.analisis.requerimientos_funcionales[0].actores = ["Recepcionista"];
  const copia = clonar(resultado); copia.operaciones[0].roles = ["Mecánico"];
  assert.match(validarContrato(copia, ctx).errores.join(" "), /Mecánico no figura entre los actores de RF01/);
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
test("un actor con preposición encuentra su usuario: Jefe de guardia es jefe_guardia", async () => {
  const fetchImpl = async (url) => (url.includes("/auth/") ? Response.json({ access_token: "t" }) : Response.json([{ id: 1 }]));
  const ctx = clonar(contexto); ctx.analisis.actores = [{ nombre: "Jefe de guardia" }];
  const copia = clonar(resultado); copia.operaciones[0].roles = ["Jefe de guardia"];
  const prueba = await probarPermisosContrato({ baseUrl: "http://127.0.0.1:8000", anonKey: "anon", usuarios: [{ email: "jefe_guardia@prueba.local", rol: "jefe_guardia" }], actores: ctx.analisis.actores, contrato: validarContrato(copia, ctx), fetchImpl });
  assert.equal(prueba.resultados.find((r) => r.operacion === "autenticacion").estado, "correcta");
});
test("con el backend encendido, una Edge Function se prueba como cada actor", async () => {
  const edge = { ...clonar(op), id: "crear", tipo: "edge", recurso: "crear-usuario", metodo: "POST", descripcion: "Crea una cuenta.", prueba: { cuerpo: { email: "x@prueba.local" } } };
  assert.deepEqual(peticionDePrueba(edge, "Recepcionista"), { ruta: "/functions/v1/crear-usuario", metodo: "POST", cuerpo: { email: "x@prueba.local" } });
  const fetchImpl = async (url, opciones) => {
    if (url.includes("/auth/")) return Response.json({ access_token: JSON.parse(opciones.body).email.startsWith("recep") ? "recep" : "mecanico" });
    return opciones.headers.Authorization === "Bearer recep" ? Response.json({ id: "nuevo" }) : Response.json({ error: "Sin permiso" }, { status: 403 });
  };
  const contrato = { operaciones: [edge] };
  const usuarios = [{ email: "recepcionista@prueba.local", rol: "Recepcionista" }, { email: "mecanico@prueba.local", rol: "Mecánico" }];
  const sinFunciones = await probarPermisosContrato({ baseUrl: "http://x", anonKey: "a", usuarios, actores: contexto.analisis.actores, contrato, fetchImpl });
  assert.equal(sinFunciones.pendientes, 1);
  const conFunciones = await probarPermisosContrato({ baseUrl: "http://x", anonKey: "a", usuarios, actores: contexto.analisis.actores, contrato, fetchImpl, conFunciones: true });
  assert.deepEqual(conFunciones.resultados.filter((r) => r.operacion === "crear").map((r) => r.estado), ["correcta", "correcta"]);
});
test("los archivos del backend son las Edge Functions, sin el enrutador fijo", async () => {
  const { archivosDeBackend } = await import("../lib/archivosBackend.js");
  const estructura = { archivos: [
    { ruta: "supabase/functions/notificar-push/index.ts", pieza: "supabase" },
    { ruta: "supabase/functions/main/index.ts", pieza: "supabase" },
    { ruta: "supabase/migrations/0001.sql", pieza: "supabase" },
    { ruta: "supabase/functions/crear-usuario/index.ts", pieza: "supabase" },
    { ruta: "web/app/page.js", pieza: "nextjs" },
  ] };
  assert.deepEqual(archivosDeBackend(estructura).map((a) => a.ruta), ["supabase/functions/crear-usuario/index.ts", "supabase/functions/notificar-push/index.ts"]);
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

test("las rutas REST de Auth equivalen a las operaciones del cliente", () => {
  const rutas = { "/auth/v1/token?grant_type=password": "login", "/auth/v1/logout": "logout", "/auth/v1/user": "sesion", "/auth/v1/recover": "recuperar" };
  for (const [ruta, esperada] of Object.entries(rutas)) {
    const copia = clonar(resultado);
    Object.assign(copia.operaciones[0], { tipo: "auth", recurso: ruta, metodo: "POST", prueba: {} });
    const ficha = validarContrato(copia, contexto);
    assert.equal(ficha.operaciones[0].recurso, esperada);
    assert.doesNotMatch(ficha.errores.join(" "), /no es una operación Auth/);
  }
  const inventada = clonar(resultado);
  Object.assign(inventada.operaciones[0], { tipo: "auth", recurso: "/auth/v1/admin/users", metodo: "POST", prueba: {} });
  assert.match(validarContrato(inventada, contexto).errores.join(" "), /no es una operación Auth/);
});
test("order, limit y offset de PostgREST no son columnas, pero en un POST sí se revisan", () => {
  const consulta = clonar(resultado);
  consulta.operaciones[0].entrada = { type: "object", properties: { estado: { type: "string" }, order: { type: "string" }, limit: { type: "integer" }, offset: { type: "integer" } } };
  assert.doesNotMatch(validarContrato(consulta, contexto).errores.join(" "), /columna inexistente/);
  const alta = clonar(resultado);
  Object.assign(alta.operaciones[0], { metodo: "POST", entrada: { type: "object", properties: { order: { type: "string" } } } });
  assert.match(validarContrato(alta, contexto).errores.join(" "), /columna inexistente \(order\)/);
  const inventada = clonar(resultado);
  inventada.operaciones[0].entrada = { type: "object", properties: { color: { type: "string" } } };
  assert.match(validarContrato(inventada, contexto).errores.join(" "), /columna inexistente \(color\)/);
});

test("una Edge Function escrita como ruta se reduce a su nombre", () => {
  for (const [escrito, nombre] of [["functions/v1/registrar-sala", "registrar-sala"], ["/functions/v1/finalizar-reservas/", "finalizar-reservas"], ["supabase/functions/crear-usuario/index.ts", "crear-usuario"]]) {
    const copia = clonar(resultado);
    Object.assign(copia.operaciones[0], { tipo: "edge", recurso: escrito, metodo: "POST", descripcion: "Función pendiente.", prueba: {} });
    const ficha = validarContrato(copia, contexto);
    assert.equal(ficha.operaciones[0].recurso, nombre);
    assert.doesNotMatch(ficha.errores.join(" "), /nombre de Edge Function no válido/);
  }
  const invalida = clonar(resultado);
  Object.assign(invalida.operaciones[0], { tipo: "edge", recurso: "crear usuario!", metodo: "POST", descripcion: "x", prueba: {} });
  assert.match(validarContrato(invalida, contexto).errores.join(" "), /nombre de Edge Function no válido/);
});

test("un recurso relacionado de PostgREST (otra tabla) no es una columna inexistente, en una consulta", () => {
  const ctx = clonar(contexto);
  ctx.inventario.tablas.push({ nombre: "usuario", columnas: [{ nombre: "id" }], permisos: { select: true } });
  const consulta = clonar(resultado);
  consulta.operaciones[0].salida = { type: "array", items: { type: "object", properties: { id: { type: "integer" }, usuario: { type: "object", properties: { identificador: { type: "string" } } } } } };
  assert.doesNotMatch(validarContrato(consulta, ctx).errores.join(" "), /columna inexistente/);
  const inventada = clonar(consulta);
  inventada.operaciones[0].salida.items.properties.color = { type: "string" };
  assert.match(validarContrato(inventada, ctx).errores.join(" "), /columna inexistente \(color\)/);
  const alta = clonar(resultado);
  Object.assign(alta.operaciones[0], { metodo: "POST", entrada: { type: "object", properties: { usuario: { type: "string" } } } });
  assert.match(validarContrato(alta, ctx).errores.join(" "), /columna inexistente \(usuario\)/);
});

test("en un POST o PATCH no se envían columnas sin permiso de escritura para authenticated", () => {
  const ctx = clonar(contexto);
  ctx.inventario.tablas[0].columnas = [{ nombre: "id", insertar: false, actualizar: false }, { nombre: "estado", insertar: false, actualizar: true }];
  ctx.inventario.tablas[0].permisos = { select: true, insert: true, update: true };
  const alta = clonar(resultado);
  Object.assign(alta.operaciones[0], { metodo: "POST", entrada: { type: "object", properties: { estado: { type: "string" } } }, prueba: { cuerpo: { estado: "abierta" } } });
  assert.match(validarContrato(alta, ctx).errores.join(" "), /no tiene permiso para insertar la columna estado/);
  const edicion = clonar(resultado);
  Object.assign(edicion.operaciones[0], { metodo: "PATCH", entrada: { type: "object", properties: { estado: { type: "string" } } }, prueba: { cuerpo: { estado: "abierta" }, filtros: { id: "eq.1" } } });
  assert.doesNotMatch(validarContrato(edicion, ctx).errores.join(" "), /no tiene permiso para/);
  // un inventario anterior, sin permisos por columna, no genera errores
  const viejo = clonar(contexto);
  const sinDato = clonar(resultado);
  Object.assign(sinDato.operaciones[0], { metodo: "POST", entrada: { type: "object", properties: { estado: { type: "string" } } }, prueba: { cuerpo: { estado: "abierta" } } });
  assert.doesNotMatch(validarContrato(sinDato, viejo).errores.join(" "), /no tiene permiso para/);
});
