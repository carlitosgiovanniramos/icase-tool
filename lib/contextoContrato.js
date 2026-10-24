import crypto from "node:crypto";
import { armarProyecto, catalogo } from "./implementacion.js";
import { piezaDeBaseDatos } from "./bd.js";
import { llamarRunner, ErrorRunner } from "./runner.js";

export async function leerContextoContrato(supabase, id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) throw new ErrorRunner(400, "Proyecto no válido.");
  const { data: proyecto, error } = await supabase.from("proyectos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!proyecto) throw new ErrorRunner(404, "No se encontró el proyecto.");
  if (!Object.hasOwn(proyecto, "contrato_implementacion")) throw new ErrorRunner(409, "Falta instalar el paso Contrato de API: ejecuta supabase/contrato_implementacion.sql en el SQL Editor de Supabase.");
  if (!proyecto.fases_aprobadas?.impl_bd || proyecto.fases_aprobadas?.pendientes?.impl_bd || proyecto.bd_implementacion?.incompleto) throw new ErrorRunner(409, "Primero prueba y aprueba la base de datos actual.");
  const { data: sql, error: errorArchivos } = await supabase.from("archivos_proyecto").select("ruta, contenido").eq("proyecto_id", id).eq("paso", "impl_bd").order("ruta");
  if (errorArchivos) throw errorArchivos;
  if (!sql?.length) throw new ErrorRunner(409, "La base no tiene archivos SQL guardados.");
  const huella = crypto.createHash("sha256").update(JSON.stringify({ sql, stack: proyecto.stack_implementacion })).digest("hex");
  return { proyecto, huella, sql, nombre: proyecto.nombre, analisis: proyecto.analisis, casosUso: proyecto.diagrama_casos_uso, diagramaClases: proyecto.diagrama_clases, diagramaSistema: proyecto.diagrama_sistema, stack: proyecto.stack_implementacion, estructura: proyecto.estructura_implementacion, pantallas: proyecto.mockups || [] };
}

export async function inspeccionarContrato(contexto, contrato) {
  const ficha = piezaDeBaseDatos(contexto.stack, await catalogo());
  if (!ficha) throw new ErrorRunner(400, "Falta la pieza de base de datos.");
  const { archivos } = await armarProyecto({ nombre: contexto.nombre, generados: contexto.sql, piezas: contexto.stack.piezas, altaDisponibilidad: !!contexto.stack.altaDisponibilidad, externos: contexto.stack.externos || [] });
  const resultado = await llamarRunner("POST", `/proyectos/${contexto.proyecto.id}/probarbd`, { archivos: archivos.map(({ ruta, contenido }) => ({ ruta, contenido })), ...ficha.bd, inventario: true, ...(contrato ? { contrato, actores: contexto.analisis?.actores || [] } : {}) }, 290_000);
  if (!resultado.ok) throw new ErrorRunner(422, "La base no pudo aplicarse. Revisa y prueba la etapa 6 antes de generar el contrato.", resultado.salida);
  return resultado;
}
