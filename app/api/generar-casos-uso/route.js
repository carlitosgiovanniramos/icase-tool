import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { analisis } = await request.json();

    const actores = analisis.actores.map((a) => a.nombre).join(", ");
    const funcionales = analisis.requerimientos_funcionales
      .map((r) => `${r.codigo}: ${r.descripcion}`)
      .join("\n");

    const instrucciones = `
Eres un analista de sistemas experto en UML. Genera un diagrama de casos de uso en sintaxis Mermaid (flowchart), basado en estos actores y requerimientos funcionales:

Actores: ${actores}

Requerimientos funcionales:
${funcionales}

Reglas para el diagrama:
- Usa "flowchart LR"
- Cada actor va como nodo con forma estadio: NombreActor(["Nombre Actor"])
- Todos los casos de uso van dentro de un subgraph llamado SISTEMA["Sistema"]
- Cada caso de uso es un nodo con forma de paréntesis: UC1(Descripción corta)
- Conecta cada actor a sus casos de uso correspondientes con -->
- Si detectas una regla de negocio compartida entre dos o más casos de uso (como una validación), represéntala como un caso de uso aparte conectado con relaciones -.->|"<<include>>"| 
- Agrega al final classDef y class para colorear actores de un color y casos de uso de otro

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "diagrama_mermaid": "código mermaid completo aquí, como un solo string"
}
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