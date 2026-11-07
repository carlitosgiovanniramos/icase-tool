import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leerContextoContrato, inspeccionarContrato } from "@/lib/contextoContrato";
import { validarContrato } from "@/lib/validarContrato";

export const maxDuration = 300;

// Prueba del paso "Backend": la prueba de permisos del contrato con las Edge Functions generadas
// encendidas. Las operaciones edge dejan de estar "pendientes" y se llaman como cada actor.
export async function POST(request) {
  try {
    const { proyectoId } = await request.json();
    const contexto = await leerContextoContrato(await createClient(), proyectoId);
    const contrato = contexto.proyecto.contrato_implementacion;
    if (!contrato || contrato.huella !== contexto.huella) return NextResponse.json({ error: "El contrato no corresponde a la base actual. Valídalo de nuevo antes de probar el backend." }, { status: 409 });
    if (!contexto.backend.length) return NextResponse.json({ error: "Genera el backend antes de probarlo." }, { status: 409 });
    const validado = validarContrato(contrato, { ...contexto, inventario: contrato.inventario });
    if (validado.tipo !== "supabase") return NextResponse.json({ error: "La prueba del backend con Express estará disponible más adelante." }, { status: 409 });
    const resultado = await inspeccionarContrato(contexto, validado, { funciones: true });
    return NextResponse.json({ prueba: resultado.pruebaContrato });
  } catch (error) { return NextResponse.json({ error: error.message, salida: error.salida }, { status: error.estado || 500 }); }
}
