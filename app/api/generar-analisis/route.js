import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { prompt, documentoTexto } = await request.json();

    let contexto = `Idea del usuario: ${prompt}`;

    if (documentoTexto) {
      contexto += `\n\nContexto adicional extraído de un documento adjunto:\n${documentoTexto}`;
    }

    const instrucciones = `
Eres un analista de sistemas experto. Con base en el siguiente contexto, identifica los actores principales del sistema y plantea requerimientos funcionales y no funcionales siguiendo el formato de especificación de requerimientos usado en ingeniería de software (ficha completa por requerimiento: id, nombre, descripción, dependencias, prioridad, actores involucrados, precondiciones y postcondiciones).

${contexto}

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta estructura exacta:
{
  "actores": [
    { "nombre": "string", "descripcion": "string" }
  ],
  "requerimientos_funcionales": [
    {
      "codigo": "RF01",
      "nombre": "string (título corto del requerimiento, 3-6 palabras)",
      "descripcion": "string",
      "dependencias": ["RF03"],
      "prioridad": "alta | media | baja",
      "actores": ["string (nombre de un actor ya listado arriba)"],
      "precondiciones": "string",
      "postcondiciones": "string"
    }
  ],
  "requerimientos_no_funcionales": [
    {
      "codigo": "RNF01",
      "nombre": "string (título corto del requerimiento, 3-6 palabras)",
      "categoria": "string",
      "descripcion": "string",
      "dependencias": ["RF01"],
      "prioridad": "alta | media | baja",
      "actores": ["string (nombre de un actor ya listado arriba)"],
      "precondiciones": "string",
      "postcondiciones": "string"
    }
  ]
}

Reglas:
- "dependencias" es un arreglo con los códigos (RF/RNF) de otros requerimientos de los que depende; usa [] si no depende de ninguno.
- "actores" es un arreglo con nombres de actores que ya definiste en la lista "actores"; usa [] si no aplica un actor humano directo.
- "precondiciones" y "postcondiciones" deben ser concretas y verificables (qué debe cumplirse antes y qué queda garantizado después). Si para un requerimiento no funcional realmente no aplica alguna, usa "No aplica".
- Genera al menos 3 actores, al menos 8 requerimientos funcionales y al menos 5 requerimientos no funcionales.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: instrucciones,
      config: { responseMimeType: "application/json" },
    });

    const resultado = JSON.parse(response.text);

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}