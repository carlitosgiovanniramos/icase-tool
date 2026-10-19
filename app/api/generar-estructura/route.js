import { NextResponse } from "next/server";
import { generarEstructura } from "@/lib/estructura";

export const maxDuration = 300;

// Paso "Estructura de carpetas". La lógica (una generación por pieza y la validación de cobertura)
// está en lib/estructura.js. Con { actual, instruccion } modifica la estructura actual.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.stack?.piezas?.length) {
      return NextResponse.json({ error: "Falta el stack técnico aprobado." }, { status: 400 });
    }
    return NextResponse.json(await generarEstructura(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
