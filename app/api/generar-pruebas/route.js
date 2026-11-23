import { NextResponse } from "next/server";
import { generarPruebas } from "@/lib/pruebasIA";

export const maxDuration = 300;

// Paso "Plan de pruebas": casos de prueba de cada requerimiento funcional del análisis aprobado. La lógica
// (lotes, cobertura y numeración) está en lib/pruebasIA.js.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.analisis?.requerimientos_funcionales?.length) {
      return NextResponse.json({ error: "Falta el análisis aprobado con sus requerimientos funcionales." }, { status: 400 });
    }
    return NextResponse.json(await generarPruebas(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
