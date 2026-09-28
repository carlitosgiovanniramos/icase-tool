import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

// Propone la lista de pantallas del prototipo a partir de los requerimientos (con qué RF cubre
// cada una), para que el usuario elija cuáles generar.
export async function POST(request) {
  try {
    const { analisis, diagramaEr, plataformas, indicaciones, usarClaude } = await request.json();

    const listaPlataformas = plataformas?.length ? plataformas : ["Web"];

    const instrucciones = `
Eres un diseñador UX/UI experto. Con base en este análisis aprobado, propone las pantallas que el sistema necesita.

Actores:
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${diagramaEr ? `\nModelo de datos (Mermaid):\n${diagramaEr}\n` : ""}
Plataformas del sistema: ${listaPlataformas.join(", ")}
${formatearIndicaciones(indicaciones)}
Reglas:
- Cada requerimiento funcional debe quedar cubierto por al menos una pantalla. No dupliques pantallas ni crees pantallas que ningún requerimiento justifique.
- Agrupa en una misma pantalla los requerimientos que el usuario resuelve en el mismo lugar (ej. listar, filtrar y buscar partes).
- Incluye una pantalla de inicio de sesión si el sistema tiene autenticación o roles.
- Asigna a cada pantalla la plataforma donde la usa su actor (una de: ${listaPlataformas.join(", ")}).
- Ordénalas según el flujo de uso.
- Sugiere un color primario de marca (hex) coherente con el dominio del sistema.

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "color_primario": "#RRGGBB",
  "pantallas": [
    {
      "nombre": "string (2-5 palabras)",
      "descripcion": "string (una línea: qué muestra y qué permite hacer)",
      "rfs": ["RF01"],
      "actores": ["string"],
      "plataforma": "${listaPlataformas[0]}"
    }
  ]
}
`;

    const response = await generarContenido({
      usarClaude,
      contents: instrucciones,
      config: { responseMimeType: "application/json" },
    });

    const resultado = JSON.parse(response.text);
    return NextResponse.json({
      ...resultado,
      modelo_ia: response.modelVersion,
      costo_ia: response.costoUsd,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
