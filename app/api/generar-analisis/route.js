import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { prompt, documentoTexto, imagenUrl } = await request.json();

    let contexto = `Idea del usuario: ${prompt}`;

    if (documentoTexto) {
      contexto += `\n\nContexto adicional extraído de un documento adjunto:\n${documentoTexto}`;
    }

    const instrucciones = `
Eres un analista de requisitos certificado, experto en ingeniería de requerimientos según la norma ISO/IEC/IEEE 29148:2018 (Systems and software engineering — Life cycle processes — Requirements engineering).

Con base en el siguiente contexto (y la imagen adjunta, si existe), identifica los actores principales del sistema y redacta TODOS los requerimientos funcionales y no funcionales necesarios para cubrir por completo el alcance descrito — ni más ni menos de los que el sistema realmente necesita. No hay un número fijo: un sistema simple puede necesitar pocos requerimientos y uno complejo puede necesitar muchos más; tú decides la cantidad según lo que exige el alcance.

${contexto}

Cada requerimiento debe cumplir las características de calidad que exige la norma ISO/IEC/IEEE 29148:2018 para un requisito individual:
- Necesario: se conecta directamente con una necesidad real descrita en el contexto.
- Singular/atómico: expresa UNA sola capacidad o restricción verificable (evita unir varias ideas con "y"/"además" en una misma descripción).
- No ambiguo: una sola interpretación posible.
- Verificable: debe poderse comprobar objetivamente que se cumplió.
- Factible: alcanzable con tecnología y recursos razonables.
- Libre de implementación: describe QUÉ debe hacer el sistema, no CÓMO se construye técnicamente.
- Redactado con lenguaje imperativo tipo "El sistema debe/deberá..." (equivalente al "shall" normativo).

Además, para cada requerimiento indica su método de verificación según la norma (uno de: "Inspección", "Análisis", "Demostración", "Prueba") — cómo se comprobará en la práctica que el requerimiento se cumple.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, con esta estructura exacta:
{
  "actores": [
    { "nombre": "string", "descripcion": "string" }
  ],
  "requerimientos_funcionales": [
    {
      "codigo": "RF01",
      "nombre": "string (título corto del requerimiento, 3-6 palabras)",
      "descripcion": "string (redactado como 'El sistema debe/deberá...', singular y verificable)",
      "dependencias": ["RF03"],
      "prioridad": "alta | media | baja",
      "actores": ["string (nombre de un actor ya listado arriba)"],
      "precondiciones": "string",
      "postcondiciones": "string",
      "metodo_verificacion": "Inspección | Análisis | Demostración | Prueba"
    }
  ],
  "requerimientos_no_funcionales": [
    {
      "codigo": "RNF01",
      "nombre": "string (título corto del requerimiento, 3-6 palabras)",
      "categoria": "string",
      "descripcion": "string (redactado como 'El sistema debe/deberá...', singular y verificable)",
      "dependencias": ["RF01"],
      "prioridad": "alta | media | baja",
      "actores": ["string (nombre de un actor ya listado arriba)"],
      "precondiciones": "string",
      "postcondiciones": "string",
      "metodo_verificacion": "Inspección | Análisis | Demostración | Prueba"
    }
  ]
}

Reglas:
- "dependencias" es un arreglo con los códigos (RF/RNF) de otros requerimientos de los que depende; usa [] si no depende de ninguno.
- "actores" es un arreglo con nombres de actores que ya definiste en la lista "actores"; usa [] si no aplica un actor humano directo.
- "precondiciones" y "postcondiciones" deben ser concretas y verificables (qué debe cumplirse antes y qué queda garantizado después). Si para un requerimiento no funcional realmente no aplica alguna, usa "No aplica".
- El conjunto completo de requerimientos, visto en su totalidad, debe ser consistente (sin contradicciones entre sí) y completo (cubre todo el alcance descrito, sin dejar huecos).
- Genera al menos 3 actores. La cantidad de requerimientos funcionales y no funcionales la defines tú según el alcance real del sistema descrito.
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
