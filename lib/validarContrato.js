import { accionesDelPrototipo, normalizarRol } from "./accionesContrato.js";

const lista = (v) => Array.isArray(v) ? v : [];
const cadena = (v) => typeof v === "string" ? v.trim() : "";
const objeto = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const IDENTIFICADOR = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Las Edge Functions de Supabase se nombran con guiones (crear-usuario).
const NOMBRE_FUNCION = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const METODOS = ["GET", "POST", "PATCH", "DELETE"];

// Operaciones de Auth permitidas en el cliente. Se aceptan también los nombres del SDK de Supabase
// (auth.signInWithPassword, signOut...), que es lo que suelen escribir los modelos.
const AUTH_CLIENTE = {
  login: "login", signin: "login", signinwithpassword: "login", signinwithotp: "login", signinwithoauth: "login",
  logout: "logout", signout: "logout",
  recuperar: "recuperar", resetpasswordforemail: "recuperar", updateuser: "recuperar",
  sesion: "sesion", getsession: "sesion", getuser: "sesion", refreshsession: "sesion", onauthstatechange: "sesion",
};
const operacionAuth = (recurso) => AUTH_CLIENTE[recurso.replace(/^auth\./i, "").toLowerCase().replace(/[^a-z]/g, "")];

function erroresEsquema(esquema, ruta, nivel = 0) {
  if (nivel > 20) return [`${ruta}: esquema demasiado profundo.`];
  if (!esquema || typeof esquema !== "object" || Array.isArray(esquema)) return [`${ruta}: esquema no válido.`];
  const errores = [];
  if (esquema.$ref) errores.push(`${ruta}: usa un esquema inline; no se admiten referencias externas o sin definir.`);
  if (esquema.type === "array") {
    if (!esquema.items || Array.isArray(esquema.items)) errores.push(`${ruta}: un array necesita un esquema items.`);
    else errores.push(...erroresEsquema(esquema.items, `${ruta}.items`, nivel + 1));
  }
  for (const [nombre, valor] of Object.entries(objeto(esquema.properties))) errores.push(...erroresEsquema(valor, `${ruta}.${nombre}`, nivel + 1));
  for (const nombre of lista(esquema.required)) if (!Object.hasOwn(objeto(esquema.properties), nombre)) errores.push(`${ruta}: required cita una propiedad inexistente (${nombre}).`);
  for (const clave of ["allOf", "anyOf", "oneOf"]) for (const hijo of lista(esquema[clave])) errores.push(...erroresEsquema(hijo, ruta, nivel + 1));
  return errores;
}

// El modelo propone; estos errores siempre se recalculan, también al editar a mano.
export function validarContrato(resultado, contexto) {
  const acciones = accionesDelPrototipo(contexto.pantallas);
  const roles = lista(contexto.analisis?.actores).map((a) => a.nombre);
  // Mayúsculas y tildes no distinguen roles: "Jefe de Guardia" es el actor "Jefe de guardia".
  const rolDelAnalisis = (r) => roles.find((nombre) => normalizarRol(nombre) === normalizarRol(r));
  const codigos = new Set([...lista(contexto.analisis?.requerimientos_funcionales), ...lista(contexto.analisis?.requerimientos_no_funcionales)].map((r) => r.codigo));
  const funcionales = lista(contexto.analisis?.requerimientos_funcionales);
  const supabase = contexto.stack?.piezas?.some((p) => p.pieza === "supabase");
  const inventario = contexto.inventario;
  const errores = [];
  const advertencias = [];
  const ids = new Set();
  const rutas = new Set();
  const operaciones = lista(resultado?.operaciones).map((valor, i) => {
    const o = objeto(valor);
    const op = { id: cadena(o.id), nombre: cadena(o.nombre), tipo: cadena(o.tipo), recurso: cadena(o.recurso), metodo: cadena(o.metodo).toUpperCase(), roles: [...new Set(lista(o.roles).map((r) => rolDelAnalisis(cadena(r)) || cadena(r)))], requerimientos: [...new Set(lista(o.requerimientos).map(cadena))], descripcion: cadena(o.descripcion), entrada: objeto(o.entrada), salida: objeto(o.salida), prueba: objeto(o.prueba) };
    if (op.tipo === "auth" && operacionAuth(op.recurso)) op.recurso = operacionAuth(op.recurso);
    const prefijo = `Operación ${op.id || i + 1}`;
    if (!op.id || ids.has(op.id)) errores.push(`${prefijo}: identificador vacío o repetido.`);
    ids.add(op.id);
    if (!op.nombre || !op.roles.length || op.roles.some((r) => !roles.includes(r))) errores.push(`${prefijo}: faltan roles válidos del análisis.`);
    if (!op.requerimientos.length || op.requerimientos.some((r) => !codigos.has(r))) errores.push(`${prefijo}: debe citar requerimientos existentes.`);
    const asociados = funcionales.filter((r) => op.requerimientos.includes(r.codigo));
    const actoresAsignados = new Set(asociados.flatMap((r) => lista(r.actores)).map(normalizarRol));
    const sobrantes = op.roles.filter((r) => !actoresAsignados.has(normalizarRol(r)));
    if (asociados.length && asociados.every((r) => lista(r.actores).length) && sobrantes.length) {
      errores.push(`${prefijo}: ${sobrantes.join(", ")} no figura entre los actores de ${asociados.map((r) => r.codigo).join(", ")}. Quita ese rol o cita el RF que lo autoriza.`);
    }
    const tipos = ["object", "array", "string", "number", "integer", "boolean"];
    if (!tipos.includes(op.salida.type)) errores.push(`${prefijo}: falta un esquema de salida con tipo explícito.`);
    if (["POST", "PATCH"].includes(op.metodo) && !tipos.includes(op.entrada.type)) errores.push(`${prefijo}: falta un esquema de entrada con tipo explícito.`);
    errores.push(...erroresEsquema(op.salida, `${prefijo} salida`));
    if (["POST", "PATCH"].includes(op.metodo)) errores.push(...erroresEsquema(op.entrada, `${prefijo} entrada`));
    if (!METODOS.includes(op.metodo)) errores.push(`${prefijo}: método no válido.`);
    if (supabase) {
      if (["tabla", "rpc"].includes(op.tipo) && !IDENTIFICADOR.test(op.recurso)) errores.push(`${prefijo}: recurso no válido.`);
      if (op.tipo === "edge" && !NOMBRE_FUNCION.test(op.recurso)) errores.push(`${prefijo}: nombre de Edge Function no válido.`);
      if (op.tipo === "tabla") {
        const tabla = inventario?.tablas?.find((t) => t.nombre === op.recurso);
        if (!tabla) errores.push(`${prefijo}: la tabla o vista no existe en el inventario probado.`);
        const permiso = { GET: "select", POST: "insert", PATCH: "update", DELETE: "delete" }[op.metodo];
        if (tabla?.permisos?.[permiso] === false) errores.push(`${prefijo}: authenticated no tiene permiso ${permiso} sobre ${op.recurso}.`);
        const columnas = new Set(lista(tabla?.columnas).map((c) => c.nombre));
        for (const c of Object.keys(objeto(op.prueba.cuerpo))) if (!columnas.has(c)) errores.push(`${prefijo}: columna de prueba inexistente ${c}.`);
        if (tabla) {
          const campos = [...Object.keys(objeto(op.entrada.properties)), ...Object.keys(objeto(op.salida.type === "array" ? op.salida.items?.properties : op.salida.properties))];
          for (const c of new Set(campos)) if (!columnas.has(c)) errores.push(`${prefijo}: el esquema cita una columna inexistente (${c}).`);
        }
      } else if (op.tipo === "rpc") {
        const funciones = lista(inventario?.funciones).filter((f) => f.nombre === op.recurso && f.ejecutable);
        if (!funciones.length) errores.push(`${prefijo}: la RPC no existe o no permite execute a authenticated.`);
        if (op.metodo !== "POST") errores.push(`${prefijo}: las RPC se contratan con POST.`);
        const argumentos = Object.keys(objeto(op.prueba.cuerpo));
        if (funciones.length && !funciones.some((f) => argumentos.every((a) => lista(f.nombresArgumentos).includes(a)))) errores.push(`${prefijo}: argumentos RPC inexistentes.`);
        const compatibles = funciones.filter((f) => argumentos.every((a) => lista(f.nombresArgumentos).includes(a)));
        if (compatibles.length && !compatibles.some((f) => lista(f.nombresArgumentos).slice(0, (f.cantidadArgumentos ?? 0) - (f.argumentosConDefecto ?? 0)).every((a) => argumentos.includes(a)))) errores.push(`${prefijo}: faltan argumentos RPC obligatorios en la prueba.`);
      } else if (op.tipo === "edge") {
        if (!op.descripcion) errores.push(`${prefijo}: describe la función que se construirá en Backend.`);
        advertencias.push(`${prefijo}: Edge Function pendiente de construir en la etapa 8.`);
      } else if (op.tipo === "auth") {
        if (!["login", "logout", "recuperar", "sesion"].includes(op.recurso)) errores.push(`${prefijo}: "${op.recurso}" no es una operación Auth del cliente (login, logout, recuperar o sesion). La administración de cuentas necesita una Edge Function.`);
      } else errores.push(`${prefijo}: tipo no válido para Supabase.`);
    } else {
      if (op.tipo !== "http" || !/^\/[A-Za-z0-9_/{\}.-]*$/.test(op.recurso)) errores.push(`${prefijo}: ruta HTTP no válida.`);
      const ruta = `${op.metodo} ${op.recurso}`;
      if (rutas.has(ruta)) errores.push(`${prefijo}: método y ruta HTTP repetidos.`);
      rutas.add(ruta);
    }
    if (!["edge", "auth"].includes(op.tipo) && !Object.keys(op.prueba).length) advertencias.push(`${prefijo}: faltan datos de prueba para comprobar permisos.`);
    return op;
  });
  const asignaciones = lista(resultado?.acciones).map(objeto);
  const mapa = acciones.map((accion) => {
    const candidatas = asignaciones.filter((a) => a.id === accion.id);
    const a = candidatas[0] || {};
    const asignadas = [...new Set(lista(a.operaciones).map(cadena))];
    const tipo = cadena(a.tipo);
    const motivo = cadena(a.motivo);
    const valida = candidatas.length === 1 && (tipo === "api" ? asignadas.length > 0 && asignadas.every((id) => operaciones.some((op) => op.id === id)) : ["local", "navegacion"].includes(tipo) && !!motivo && asignadas.length === 0);
    // Iniciar o cerrar sesión es transversal: no cumple un RF propio de la pantalla donde está el botón.
    const deSesion = asignadas.length > 0 && operaciones.filter((op) => asignadas.includes(op.id)).every((op) => op.tipo === "auth");
    if (tipo === "api" && accion.rfs.length && !deSesion && !operaciones.some((op) => asignadas.includes(op.id) && op.requerimientos.some((rf) => accion.rfs.includes(rf)))) errores.push(`${accion.pantalla} / ${accion.nombre}: sus operaciones no cubren ningún RF de esta pantalla.`);
    if (!valida) errores.push(`${accion.pantalla} / ${accion.nombre}: falta una asignación válida y única a la API o una justificación local/de navegación.`);
    return { ...accion, tipo, operaciones: asignadas, motivo, cubierta: valida };
  });
  for (const a of asignaciones) if (!acciones.some((x) => x.id === a.id)) errores.push(`Acción inventada: ${a.id}.`);
  // Una operación sin botón puede ser legítima (la consulta al cargar una pantalla, el registro del token
  // push al abrir la app): se avisa para revisarla, no bloquea.
  for (const op of operaciones) if (!mapa.some((a) => a.operaciones.includes(op.id))) advertencias.push(`Operación ${op.id}: no la usa ninguna acción del prototipo; revisa que la necesite una pantalla al cargar o la app.`);
  if (!acciones.length) errores.push("El prototipo no tiene pantallas.");
  if (supabase && !inventario) errores.push("Falta el inventario real de la base probada.");
  const cubiertos = new Set(operaciones.flatMap((o) => o.requerimientos));
  const sinRF = lista(contexto.analisis?.requerimientos_funcionales).filter((r) => !cubiertos.has(r.codigo));
  if (sinRF.length) advertencias.push(`Requerimientos sin operación (revisar si son locales): ${sinRF.map((r) => r.codigo).join(", ")}.`);
  return { tipo: supabase ? "supabase" : "openapi", operaciones, acciones: mapa, errores: [...new Set(errores)], advertencias: [...new Set(advertencias)], cobertura: { acciones: [mapa.filter((a) => a.cubierta).length, acciones.length], requerimientos: [lista(contexto.analisis?.requerimientos_funcionales).length - sinRF.length, lista(contexto.analisis?.requerimientos_funcionales).length] }, actualizado: new Date().toISOString() };
}

export function documentoOpenAPI(contrato, nombre) {
  const paths = {};
  for (const op of contrato.operaciones) {
    if (op.tipo !== "http") continue;
    const parameters = [...op.recurso.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
    paths[op.recurso] ??= {};
    paths[op.recurso][op.metodo.toLowerCase()] = { operationId: op.id, summary: op.nombre, description: op.descripcion, "x-roles": op.roles, "x-requerimientos": op.requerimientos, parameters,
      ...(["POST", "PATCH"].includes(op.metodo) ? { requestBody: { required: true, content: { "application/json": { schema: op.entrada } } } } : {}),
      responses: { 200: { description: "Operación realizada", content: { "application/json": { schema: op.salida } } }, 401: { description: "Sin autenticar" }, 403: { description: "Sin permiso" } }, security: [{ bearerAuth: [] }] };
  }
  return { openapi: "3.0.3", info: { title: nombre || "Contrato del proyecto", version: "1.0.0" }, paths, components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } } };
}
