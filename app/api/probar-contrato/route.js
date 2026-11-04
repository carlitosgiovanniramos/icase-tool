import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leerContextoContrato, inspeccionarContrato } from "@/lib/contextoContrato";
import { validarContrato } from "@/lib/validarContrato";

export const maxDuration = 300;

export async function POST(request) {
  try {
    const { proyectoId } = await request.json();
    const contexto = await leerContextoContrato(await createClient(), proyectoId);
    const contrato = contexto.proyecto.contrato_implementacion;
    if (!contrato || contrato.huella !== contexto.huella) return NextResponse.json({ error: "Genera el contrato con la base actual antes de probarlo." }, { status: 409 });
    const validado = validarContrato(contrato, { ...contexto, inventario: contrato.inventario });
    if (validado.errores.length) return NextResponse.json({ error: "Corrige los errores del contrato antes de probarlo." }, { status: 422 });
    if (validado.tipo !== "supabase") return NextResponse.json({ error: "Las pruebas HTTP de Express estarán disponibles cuando se construya el backend (etapa 8)." }, { status: 409 });
    const resultado = await inspeccionarContrato(contexto, validado);
    return NextResponse.json({ prueba: resultado.pruebaContrato });
  } catch (error) { return NextResponse.json({ error: error.message, salida: error.salida }, { status: error.estado || 500 }); }
}
