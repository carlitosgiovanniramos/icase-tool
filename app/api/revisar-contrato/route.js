import { NextResponse } from "next/server";
import { stringify } from "yaml";
import { createClient } from "@/lib/supabase/server";
import { leerContextoContrato } from "@/lib/contextoContrato";
import { validarContrato, documentoOpenAPI } from "@/lib/validarContrato";

export async function POST(request) {
  try {
    const { proyectoId, actual } = await request.json();
    const contexto = await leerContextoContrato(await createClient(), proyectoId);
    const previo = contexto.proyecto.contrato_implementacion;
    if (!previo || previo.huella !== contexto.huella) return NextResponse.json({ error: "La base cambió. Regenera el contrato para actualizar el inventario." }, { status: 409 });
    const ficha = validarContrato(actual, { ...contexto, inventario: previo.inventario });
    return NextResponse.json({ ...ficha, huella: contexto.huella, inventario: previo.inventario, ...(ficha.tipo === "openapi" ? { openapi: stringify(documentoOpenAPI(ficha, contexto.nombre)) } : {}) });
  } catch (error) { return NextResponse.json({ error: error.message }, { status: error.estado || 500 }); }
}
