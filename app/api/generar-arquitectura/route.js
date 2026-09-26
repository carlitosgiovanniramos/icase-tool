import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

export async function POST(request) {
  try {
    const { analisis, diagramaEr, arbolNavegacion, indicaciones, usarClaude } = await request.json();

    const funcionales = formatearRequerimientos(analisis.requerimientos_funcionales);
    const noFuncionales = formatearRequerimientos(analisis.requerimientos_no_funcionales, {
      conCategoria: true,
    });

    let contextoDiseno = "";
    if (diagramaEr) {
      contextoDiseno += `
Modelo de datos aprobado (diagrama entidad-relación en Mermaid):
${diagramaEr}
`;
    }
    if (arbolNavegacion) {
      contextoDiseno += `
Árbol de navegación aprobado (Mermaid):
${arbolNavegacion}
`;
    }
    if (contextoDiseno) {
      contextoDiseno += `
Los módulos del grupo api deben ser coherentes con las entidades del modelo de datos y las secciones del árbol de navegación.
`;
    }

    const instrucciones = `
Eres un arquitecto de software experto. Diseña una arquitectura general en capas para un sistema web, basado en estos requerimientos:

Requerimientos funcionales:
${funcionales}

Requerimientos no funcionales (con prioridad; los de prioridad alta deben notarse en la arquitectura):
${noFuncionales}
${contextoDiseno}${formatearIndicaciones(indicaciones)}
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
    const response = await generarContenido({
      usarClaude,
      contents: instrucciones,
      config: { responseMimeType: "application/json" },
    });

    const resultado = JSON.parse(response.text);

    return NextResponse.json({ ...resultado, modelo_ia: response.modelVersion, costo_ia: response.costoUsd });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}