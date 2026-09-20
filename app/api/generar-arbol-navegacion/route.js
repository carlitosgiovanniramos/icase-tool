import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { analisis } = await request.json();

    const funcionales = analisis.requerimientos_funcionales
      .map((r) => r.descripcion)
      .join("\n");

    const instrucciones = `
Eres un arquitecto de información experto. Con base en estos requerimientos funcionales, diseña el árbol de navegación de la aplicación web (qué pantallas existen y cómo se organizan jerárquicamente).

Requerimientos funcionales:
${funcionales}

Genera el árbol usando la sintaxis "mindmap" de Mermaid:
- El nodo raíz debe ser el nombre general del sistema, con forma circular usando dobles paréntesis
- Los hijos directos de la raíz son las secciones principales de navegación
- Anida sub-pantallas dentro de cada sección donde corresponda

Ejemplo de sintaxis válida:
mindmap
  root((Sistema de Biblioteca))
    Inicio de sesión
    Catálogo
      Buscar libro
      Detalle de libro
    Préstamos
      Registrar préstamo
      Registrar devolución
    Reportes

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