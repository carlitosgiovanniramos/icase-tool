import { stringify } from "yaml";
import { generarContenido } from "./gemini.js";
import { leerJson, sumarCosto } from "./jsonIA.js";
import { accionesDelPrototipo } from "./accionesContrato.js";
import { validarContrato, documentoOpenAPI } from "./validarContrato.js";

export async function generarContrato(contexto) {
  const acciones = accionesDelPrototipo(contexto.pantallas);
  const prompt = `Eres el arquitecto de un sistema con diseño aprobado. Define el contrato que usarán el backend y los clientes.
CONTEXTO
${JSON.stringify({ nombre: contexto.nombre, analisis: contexto.analisis, casosUso: contexto.casosUso, clases: contexto.diagramaClases, sistemas: contexto.diagramaSistema, stack: contexto.stack, estructura: contexto.estructura, inventario: contexto.inventario, sql: contexto.sql, acciones, indicaciones: contexto.indicaciones, actual: contexto.actual, instruccion: contexto.instruccion })}
QUÉ DEBE MOSTRAR
- Una asignación para CADA id de acciones. Clasifica como api, navegacion o local (navegación, abrir modal, filtros locales); justifica las dos últimas. Formularios y sus botones pueden compartir operación.
- Operaciones con roles EXACTOS de los actores y códigos RF/RNF existentes. Incluye consultas de datos, aunque la pantalla solo tenga botones de navegación.
- Con Supabase: tabla (recurso exacto, GET/POST/PATCH/DELETE), rpc (POST, nombre y argumentos reales), auth (login/logout/recuperar/sesion) o edge (función todavía pendiente para la etapa 8). Una operación compleja de negocio usa la RPC existente, no escrituras que eludan sus comprobaciones. Crear cuentas requiere edge, nunca Auth admin en el navegador.
- Con Express: tipo http, recurso /api/... y entrada/salida con JSON Schema para OpenAPI 3.0. No cambies el stack.
- Para cada tabla/RPC: prueba con cuerpo JSON y filtros PostgREST (objeto clave: valor, por ejemplo id: eq.uuid). Usa ids y datos reales del seed. Una petición de prueba se repetirá como CADA actor. Debe funcionar para los roles permitidos y rechazarse para los demás. PATCH/DELETE necesitan filtros exactos de filas existentes. No pruebas vacías que parezcan pasar. En prueba permite porRol: {"Nombre exacto": {cuerpo:{},filtros:{}}} cuando cambia el caso por actor.
- Describe entradas y salidas con JSON Schema inline en entrada y salida (type explícito, items en arrays, sin $ref). Describe en descripcion permisos por fila, errores y dependencias.
QUÉ NO QUIERO
- Inventar tablas, columnas, RPC, argumentos, actores, RF ni acciones.
- Clasificar como local una acción que guarda o consulta en el servidor. Si falta operación, propone una edge explícita para Backend.
- Claves de servicio, SQL ejecutable en las pruebas, llamadas externas ni cambiar los ids de acciones.
FORMATO
Solo JSON: {"operaciones":[{"id":"op_1","nombre":"...","tipo":"tabla|rpc|edge|auth|http","recurso":"...","metodo":"GET|POST|PATCH|DELETE","roles":["..."],"requerimientos":["RF01"],"descripcion":"...","entrada":{"type":"object","properties":{}},"salida":{"type":"object"},"prueba":{"filtros":{},"cuerpo":{},"porRol":{}}}],"acciones":[{"id":"p1-a1","tipo":"api|local|navegacion","operaciones":["op_1"],"motivo":"..."}]}`;
  let costo;
  let modelo;
  let ficha;
  let anterior;
  let valido;
  const inicio = Date.now();
  const presupuesto = contexto.presupuestoMs ?? 270_000;
  if (presupuesto < 20_000) throw new Error("La preparación de la base agotó el tiempo disponible. Vuelve a intentar generar el contrato.");
  for (let intento = 0; intento < 2; intento++) {
    let respuesta;
    try {
      respuesta = await generarContenido({ usarClaude: contexto.usarClaude, contents: [{ text: prompt + (intento ? `\nCorrige estos errores: ${JSON.stringify(ficha.errores)}\nRespuesta anterior: ${JSON.stringify(anterior)}` : "") }], config: { responseMimeType: "application/json" }, presupuestoMs: Math.max(1000, presupuesto - (Date.now() - inicio)) });
    } catch (error) { if (!valido) throw error; ficha = valido; ficha.advertencias.push("No se pudo completar el reintento. Se conservó el primer contrato para corregirlo."); break; }
    costo = sumarCosto(costo, respuesta.costoUsd);
    try {
      anterior = leerJson(respuesta.text);
      ficha = validarContrato(anterior, contexto);
      modelo = respuesta.modelVersion;
      valido = ficha;
    } catch (error) {
      if (intento === 1) {
        if (!valido) throw error;
        ficha = valido;
        ficha.advertencias.push("El reintento devolvió un JSON inválido. Se conservó el contrato anterior.");
        break;
      }
      anterior = null;
      ficha = { errores: [error.message] };
    }
    if (!ficha.errores.length || presupuesto - (Date.now() - inicio) < 60_000) break;
  }
  if (!valido) throw new Error("La IA no pudo devolver un contrato JSON válido. Vuelve a intentar.");
  return { ...ficha, inventario: contexto.inventario || null, ...(ficha.tipo === "openapi" ? { openapi: stringify(documentoOpenAPI(ficha, contexto.nombre)) } : {}), modelo_ia: modelo, costo_ia: costo };
}
