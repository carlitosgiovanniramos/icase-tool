import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { analisis } = await request.json();

    const funcionales = analisis.requerimientos_funcionales
      .map((r) => `${r.codigo}: ${r.descripcion}`)
      .join("\n");

    const noFuncionales = analisis.requerimientos_no_funcionales
      .map((r) => `${r.codigo} (${r.categoria}): ${r.descripcion}`)
      .join("\n");

    const instrucciones = `
Eres un arquitecto de software experto. Diseña una arquitectura general en capas para un sistema web, basado en estos requerimientos:

Requerimientos funcionales:
${funcionales}

Requerimientos no funcionales:
${noFuncionales}

Genera el diagrama usando la sintaxis "architecture-beta" de Mermaid, con esta estructura:
- Empieza con "architecture-beta"
- Un service llamado "frontend" con icono (internet) y label [Frontend Web]
- Un group llamado "api" con icono (cloud) y label [API REST], que contenga varios services (uno por cada módulo funcional relevante), cada uno con icono (server)
- Un service llamado "db" con icono (database) y label [Base de Datos]
- Conecta frontend con cada service dentro del grupo api usando edges (ej: frontend:R --> L:modulo1)
- Conecta el grupo api completo con db usando el modificador {group}, en vez de conectar cada módulo individualmente a la base de datos (ej: modulo1{group}:R --> L:db)

Ejemplo de sintaxis válida:
architecture-beta
    service frontend(internet)[Frontend Web]
    group api(cloud)[API REST]
    service auth(server)[Autenticacion] in api
    service db(database)[Base de Datos]
    frontend:R --> L:auth
    auth{group}:R --> L:db

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