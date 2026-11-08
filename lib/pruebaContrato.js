import { normalizarRol } from "./accionesContrato.js";

const objeto = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
const identificador = /^[A-Za-z_][A-Za-z0-9_]*$/;

const nombreFuncion = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// Construye exclusivamente peticiones locales (PostgREST o Edge Functions), sin SQL ni URLs del modelo.
export function peticionDePrueba(op, rol) {
  if (!(["GET", "POST", "PATCH", "DELETE"].includes(op.metodo))) throw new Error("Método no válido.");
  if (op.tipo === "edge") {
    if (!nombreFuncion.test(op.recurso)) throw new Error("Nombre de Edge Function no válido.");
    const prueba = { ...objeto(op.prueba), ...objeto(op.prueba?.porRol?.[rol]) };
    if (!Object.keys(objeto(op.prueba)).length) throw new Error("Faltan datos de prueba.");
    return { ruta: `/functions/v1/${op.recurso}`, metodo: op.metodo, cuerpo: op.metodo === "GET" ? undefined : objeto(prueba.cuerpo) };
  }
  if (!["tabla", "rpc"].includes(op.tipo) || !identificador.test(op.recurso)) throw new Error("Recurso no válido para una prueba PostgREST.");
  if (op.tipo === "rpc" && op.metodo !== "POST") throw new Error("Una RPC requiere POST.");
  const prueba = { ...objeto(op.prueba), ...objeto(op.prueba?.porRol?.[rol]) };
  if (!Object.keys(objeto(op.prueba)).length) throw new Error("Faltan datos de prueba.");
  const filtros = objeto(prueba.filtros);
  // No permitir preferencias, cambios de esquema ni filtros masivos para escrituras.
  if (["PATCH", "DELETE"].includes(op.metodo) && !Object.entries(filtros).some(([k, v]) => identificador.test(k) && /^eq\.[^\s]+$/.test(String(v)))) throw new Error("PATCH y DELETE necesitan un filtro exacto sobre una fila de prueba.");
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (!identificador.test(clave) || ["limit", "offset", "select", "order", "columns", "on_conflict"].includes(clave) || typeof valor !== "string") throw new Error("Filtro de prueba no válido.");
    consulta.set(clave, valor);
  }
  if (op.tipo === "tabla" && op.metodo === "GET") consulta.set("limit", "10");
  const cuerpo = objeto(prueba.cuerpo);
  if (["POST", "PATCH"].includes(op.metodo) && !Object.keys(cuerpo).length && op.tipo !== "rpc") throw new Error("Falta el cuerpo de la escritura de prueba.");
  return { ruta: `/rest/v1/${op.tipo === "rpc" ? "rpc/" : ""}${op.recurso}${consulta.size ? `?${consulta}` : ""}`, metodo: op.metodo, cuerpo: ["POST", "PATCH"].includes(op.metodo) ? cuerpo : undefined };
}

export function evaluarRespuesta(op, permitido, respuesta) {
  if (respuesta.errorRed) return { estado: "inconclusa", detalle: "La API no respondió." };
  if (respuesta.status >= 200 && respuesta.status < 300) {
    if (op.tipo === "tabla" && (!Array.isArray(respuesta.datos) || !respuesta.datos.length)) return { estado: "inconclusa", detalle: "No afectó ni devolvió filas: no demuestra el permiso. Revisa los datos de prueba." };
    return { estado: permitido ? "correcta" : "fallida", detalle: permitido ? "La operación respondió con datos." : "El usuario pudo ejecutar una operación que el contrato le prohíbe." };
  }
  if ([401, 403].includes(respuesta.status) || respuesta.datos?.code === "42501") return { estado: permitido ? "fallida" : "correcta", detalle: permitido ? "La API rechazó un rol permitido por el contrato." : "La API rechazó la operación sin permiso." };
  // Una FK, un argumento inexistente o una regla de negocio no demuestran seguridad.
  return { estado: "inconclusa", detalle: `La API devolvió ${respuesta.status} (${respuesta.datos?.code || "error"}); revisa los datos o la regla de negocio de la prueba.` };
}

// conFunciones: las Edge Functions del backend están encendidas y se prueban como las RPC (sus
// escrituras no se revierten: el proyecto de prueba es desechable).
export async function probarPermisosContrato({ baseUrl, anonKey, usuarios, actores, contrato, fetchImpl = fetch, presupuestoMs = 80_000, conFunciones = false }) {
  const inicio = Date.now();
  const resultados = [];
  const tokens = new Map();
  // Una Edge Function puede tardar en su primer arranque (descarga sus dependencias).
  const peticion = async (ruta, opciones, espera = 5000) => {
    try {
      const respuesta = await fetchImpl(`${baseUrl}${ruta}`, { ...opciones, signal: AbortSignal.timeout(Math.max(1, Math.min(espera, presupuestoMs - (Date.now() - inicio)))), headers: { apikey: anonKey, "Content-Type": "application/json", ...opciones?.headers } });
      return { status: respuesta.status, datos: await respuesta.json().catch(() => null) };
    } catch { return { errorRed: true }; }
  };
  // "Jefe de guardia" (actor del análisis) es el rol jefe_guardia de la base: se ignoran artículos y preposiciones.
  const claveRol = (v) => normalizarRol(String(v || "").replace(/\b(de|del|la|las|el|los|y)\b/gi, " "));
  for (const actor of actores) {
    if (Date.now() - inicio >= presupuestoMs) break;
    const candidatos = usuarios.filter((u) => claveRol(u.rol) === claveRol(actor.nombre) || claveRol(u.email.split("@")[0]) === claveRol(actor.nombre));
    if (candidatos.length !== 1) { resultados.push({ rol: actor.nombre, operacion: "autenticacion", estado: "inconclusa", detalle: "No hay un único usuario @prueba.local identificable para este actor." }); continue; }
    const login = await peticion("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: candidatos[0].email, password: "Prueba123!" }) });
    if (login.status === 200 && login.datos?.access_token) tokens.set(actor.nombre, login.datos.access_token);
    resultados.push({ rol: actor.nombre, operacion: "autenticacion", estado: tokens.has(actor.nombre) ? "correcta" : "inconclusa", detalle: tokens.has(actor.nombre) ? "Inicio de sesión real correcto." : "No pudo iniciar sesión el usuario de prueba." });
  }
  let solicitudes = 0;
  for (const op of contrato.operaciones) {
    if (!["tabla", "rpc"].includes(op.tipo) && !(op.tipo === "edge" && conFunciones)) {
      resultados.push({ operacion: op.id, estado: "pendiente", detalle: op.tipo === "edge" ? "Se probará al construir la Edge Function en Backend." : "Las pruebas automáticas cubren el acceso a datos y RPC; revisar este flujo al construir sus clientes." });
      continue;
    }
    const controlesPositivos = new Set();
    const vaciasProhibidas = [];
    for (const actor of actores) {
      const base = { operacion: op.id, rol: actor.nombre, permitido: op.roles.includes(actor.nombre) };
      if (!tokens.has(actor.nombre) || Date.now() - inicio >= presupuestoMs || solicitudes >= 200) { resultados.push({ ...base, estado: "inconclusa", detalle: "Falta sesión o se alcanzó el límite de la prueba. Puedes volver a probar." }); continue; }
      let solicitud;
      try { solicitud = peticionDePrueba(op, actor.nombre); }
      catch (error) { resultados.push({ ...base, estado: "inconclusa", detalle: error.message }); continue; }
      solicitudes++;
      const respuesta = await peticion(solicitud.ruta, { method: solicitud.metodo, headers: { Authorization: `Bearer ${tokens.get(actor.nombre)}`, Prefer: "tx=rollback,return=representation" }, body: solicitud.cuerpo ? JSON.stringify(solicitud.cuerpo) : undefined }, op.tipo === "edge" ? 30_000 : 5000);
      const evaluacion = { ...base, http: respuesta.status, ...evaluarRespuesta(op, base.permitido, respuesta) };
      const firma = JSON.stringify(solicitud);
      if (base.permitido && evaluacion.estado === "correcta") controlesPositivos.add(firma);
      if (!base.permitido && op.tipo === "tabla" && respuesta.status >= 200 && respuesta.status < 300 && Array.isArray(respuesta.datos) && !respuesta.datos.length) vaciasProhibidas.push({ evaluacion, firma });
      resultados.push(evaluacion);
    }
    // RLS oculta filas sin devolver 403. Solo afirmar el rechazo si la MISMA petición
    // devolvió/afectó filas con un rol permitido y el dataset no cambió (rollback).
    for (const { evaluacion, firma } of vaciasProhibidas) if (controlesPositivos.has(firma)) {
      evaluacion.estado = "correcta";
      evaluacion.detalle = "RLS ocultó las filas; la misma petición sí devolvió filas para un rol permitido.";
    }
  }
  // Si el presupuesto terminó antes de iniciar sesión, no dejar una matriz vacía en verde.
  for (const actor of actores) if (!resultados.some((r) => r.rol === actor.nombre && r.operacion === "autenticacion")) resultados.push({ rol: actor.nombre, operacion: "autenticacion", estado: "inconclusa", detalle: "Se agotó el tiempo disponible." });
  const total = (estado) => resultados.filter((r) => r.estado === estado).length;
  return { fecha: new Date().toISOString(), ok: resultados.length > 0 && !total("fallida") && !total("inconclusa"), correctas: total("correcta"), fallidas: total("fallida"), inconclusas: total("inconclusa"), pendientes: total("pendiente"), resultados };
}
