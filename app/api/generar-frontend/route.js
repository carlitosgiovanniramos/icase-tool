import { NextResponse } from "next/server";
import { generarArchivoFrontend } from "@/lib/frontend";

export const maxDuration = 300;

// Paso "Frontend": genera un archivo de la web o de la app por petición; con { error, actual } lo
// corrige con el error de la compilación. La lógica está en lib/frontend.js.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.estructura?.archivos?.length) {
      return NextResponse.json({ error: "Falta la estructura de carpetas aprobada." }, { status: 400 });
    }
    if (!["web", "movil"].includes(cuerpo.plataforma)) {
      return NextResponse.json({ error: "Plataforma no válida." }, { status: 400 });
    }
    return NextResponse.json(await generarArchivoFrontend(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
