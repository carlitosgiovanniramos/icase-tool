import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leerContextoContrato, inspeccionarContrato } from "@/lib/contextoContrato";
import { generarContrato } from "@/lib/contrato";

export const maxDuration = 300;

export async function POST(request) {
  const inicio = Date.now();
  try {
    const { proyectoId, usarClaude, indicaciones, actual, instruccion } = await request.json();
    const contexto = await leerContextoContrato(await createClient(), proyectoId);
    const guardado = contexto.proyecto.contrato_implementacion;
    const inventario = guardado?.huella === contexto.huella && guardado.inventario ? guardado.inventario : (await inspeccionarContrato(contexto)).inventario;
    const resultado = await generarContrato({ ...contexto, proyecto: undefined, inventario, usarClaude, indicaciones, actual: actual ? { operaciones: actual.operaciones, acciones: actual.acciones } : undefined, instruccion, presupuestoMs: 275_000 - (Date.now() - inicio) });
    return NextResponse.json({ ...resultado, huella: contexto.huella });
  } catch (error) {
    return NextResponse.json({ error: error.message, salida: error.salida }, { status: error.estado || 500 });
  }
}
