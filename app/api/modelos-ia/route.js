import { NextResponse } from "next/server";
import { modelosGratuitos } from "@/lib/gemini";

// Modelos gratuitos (Gemini y Groq) que se pueden elegir en la barra lateral, con los que están
// en pausa por falta de cuota.
export async function GET() {
  return NextResponse.json({ modelos: modelosGratuitos() });
}
