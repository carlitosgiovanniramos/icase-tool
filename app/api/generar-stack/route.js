import { NextResponse } from "next/server";
import { generarStack } from "@/lib/stack";

export const maxDuration = 300;

// Paso "Stack técnico". La lógica (prompt, validación contra el catálogo y contenedores) está en
// lib/stack.js. Con { actual, instruccion } modifica la ficha actual ("Ampliar con IA").
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.diagramaArquitectura && !cuerpo.diagramaSistema) {
      return NextResponse.json({ error: "Falta el diseño aprobado: arquitectura y diagrama de sistemas." }, { status: 400 });
    }
    return NextResponse.json(await generarStack(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
