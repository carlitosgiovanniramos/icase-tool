import { NextResponse } from "next/server";
import { generarArchivoBD } from "@/lib/bd";

export const maxDuration = 300;

// Paso "Base de datos": genera un archivo (migración o datos de prueba) por petición. La lógica
// (prompt, validación y reintento) está en lib/bd.js. Con { actual, instruccion } lo modifica y
// con { actual, error } lo corrige con el error de la prueba en contenedores.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.stack?.piezas?.length) {
      return NextResponse.json({ error: "Falta el stack técnico aprobado." }, { status: 400 });
    }
    if (!cuerpo.estructura?.archivos?.length) {
      return NextResponse.json({ error: "Falta la estructura de carpetas aprobada." }, { status: 400 });
    }
    return NextResponse.json(await generarArchivoBD(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
