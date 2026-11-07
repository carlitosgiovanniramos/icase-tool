import { NextResponse } from "next/server";
import { modelosGratuitos } from "@/lib/gemini";
import { modeloClaudePredeterminado } from "@/lib/claude";
import { MODELOS_CLAUDE } from "@/lib/modelosClaude";

// Modelos que se pueden elegir en la barra lateral: los gratuitos (Gemini y Groq), con los que
// están en pausa por falta de cuota, y los de Claude con el predeterminado del servidor.
export async function GET() {
  return NextResponse.json({
    modelos: modelosGratuitos(),
    claude: { modelos: MODELOS_CLAUDE, predeterminado: modeloClaudePredeterminado() },
  });
}
