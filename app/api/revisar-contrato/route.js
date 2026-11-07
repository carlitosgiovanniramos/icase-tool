import { NextResponse } from "next/server";
import { stringify } from "yaml";
import { createClient } from "@/lib/supabase/server";
import { leerContextoContrato, inspeccionarContrato } from "@/lib/contextoContrato";
import { validarContrato, documentoOpenAPI } from "@/lib/validarContrato";
import { accionesDelPrototipo, agruparAcciones, expandirAsignaciones } from "@/lib/accionesContrato";

export const maxDuration = 300;

// Valida un contrato editado o pegado a mano. Sin un contrato guardado de la base actual (se pega el
// primero, o la base cambió), lee el inventario de nuevo en el proyecto desechable. Las acciones pueden
// venir por grupo de controles iguales, como las genera la IA.
export async function POST(request) {
  try {
    const { proyectoId, actual } = await request.json();
    const contexto = await leerContextoContrato(await createClient(), proyectoId);
    const previo = contexto.proyecto.contrato_implementacion;
    const inventario = previo?.huella === contexto.huella && previo.inventario ? previo.inventario : (await inspeccionarContrato(contexto)).inventario;
    const grupos = agruparAcciones(accionesDelPrototipo(contexto.pantallas));
    const ficha = validarContrato({ ...actual, acciones: expandirAsignaciones(actual?.acciones, grupos) }, { ...contexto, inventario });
    return NextResponse.json({ ...ficha, huella: contexto.huella, inventario, ...(ficha.tipo === "openapi" ? { openapi: stringify(documentoOpenAPI(ficha, contexto.nombre)) } : {}) });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: error.estado || 500 }); }
}
