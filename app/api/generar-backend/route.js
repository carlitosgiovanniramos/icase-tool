import { NextResponse } from "next/server";
import { generarArchivoBackend } from "@/lib/backend";

export const maxDuration = 300;

// Paso "Backend": genera un archivo por petición. La lógica (prompt, validación y reintento) está
// en lib/backend.js.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.estructura?.archivos?.length) {
      return NextResponse.json({ error: "Falta la estructura de carpetas aprobada." }, { status: 400 });
    }
    return NextResponse.json(await generarArchivoBackend(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
