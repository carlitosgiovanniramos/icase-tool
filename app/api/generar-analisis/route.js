import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { prompt, documentoTexto, imagenUrl, cantidadRF, cantidadRNF } =
      await request.json();

    const numRF = Math.min(Math.max(Number(cantidadRF) || 8, 1), 25);
    const numRNF = Math.min(Math.max(Number(cantidadRNF) || 5, 1), 25);

    let contexto = `Idea del usuario: ${prompt}`;

    if (documentoTexto) {
      contexto += `\n\nContexto adicional extraído de un documento adjunto:\n${documentoTexto}`;
    }

    const instrucciones = `
Eres un analista de sistemas experto. Con base en el siguiente contexto (y la imagen adjunta, si existe), identifica los actores principales del sistema y plantea requerimientos funcionales y no funcionales siguiendo el formato de especificación de requerimientos usado en ingeniería de software (ficha completa por requerimiento: id, nombre, descripción, dependencias, prioridad, actores involucrados, precondiciones y postcondiciones).

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
- Genera al menos 3 actores, exactamente ${numRF} requerimientos funcionales y exactamente ${numRNF} requerimientos no funcionales.
`;

    const parts = [{ text: instrucciones }];

    if (imagenUrl) {
      const respImg = await fetch(imagenUrl);
      const bufferImg = await respImg.arrayBuffer();
      const base64Img = Buffer.from(bufferImg).toString("base64");
      const mimeType = respImg.headers.get("content-type") || "image/png";

      parts.push({ inlineData: { mimeType, data: base64Img } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: parts,
      config: { responseMimeType: "application/json" },
    });

    const resultado = JSON.parse(response.text);

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}