import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

export async function POST(request) {
  try {
    const { analisis, pantallas, indicaciones, usarClaude } = await request.json();

    const contextoPantallas = pantallas?.length
      ? `
Pantallas ya diseñadas en el prototipo aprobado. El árbol debe incluirlas todas, con estos mismos nombres:
${pantallas.map((p) => `- ${p}`).join("\n")}
`
      : "";

    const instrucciones = `
Eres un arquitecto de información experto. Con base en este análisis aprobado, diseña el árbol de navegación de la aplicación web (qué pantallas existen y cómo se organizan jerárquicamente).

Actores:
${formatearActores(analisis)}

Requerimientos funcionales (con los actores que usan cada función; agrupa las pantallas de forma que cada actor encuentre fácilmente lo suyo):
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${contextoPantallas}${formatearIndicaciones(indicaciones)}
Genera el árbol usando la sintaxis "flowchart TD" de Mermaid (igual estilo de cajas y líneas que un diagrama técnico, NO un mindmap):
- Un único nodo raíz con forma de estadio: RAIZ(["Nombre del sistema"])
- Los hijos directos de la raíz son las secciones principales de navegación, como nodos rectangulares: SEC1[Nombre de la sección]
- Anida sub-pantallas dentro de cada sección donde corresponda, también como nodos rectangulares: SEC1_1[Nombre de la sub-pantalla]
- Conecta raíz -> secciones -> sub-pantallas usando -->
- Al final, define y aplica classDef para tres niveles con estos colores exactos (fill claro, texto oscuro, borde definido, sin colores aleatorios):
  classDef raiz fill:#1e293b,stroke:#1e293b,color:#ffffff,stroke-width:2px;
  classDef seccion fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
  classDef pantalla fill:#ffffff,stroke:#94a3b8,color:#334155,stroke-width:1px;
  Y asigna cada nodo a su clase con "class".

Ejemplo de sintaxis válida:
flowchart TD
    RAIZ(["Sistema de Biblioteca"])
    SEC1[Catálogo]
    SEC1_1[Buscar libro]
    SEC1_2[Detalle de libro]
    SEC2[Préstamos]
    SEC2_1[Registrar préstamo]
    SEC2_2[Registrar devolución]
    SEC3[Reportes]

    RAIZ --> SEC1
    SEC1 --> SEC1_1
    SEC1 --> SEC1_2
    RAIZ --> SEC2
    SEC2 --> SEC2_1
    SEC2 --> SEC2_2
    RAIZ --> SEC3

    classDef raiz fill:#1e293b,stroke:#1e293b,color:#ffffff,stroke-width:2px;
    classDef seccion fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef pantalla fill:#ffffff,stroke:#94a3b8,color:#334155,stroke-width:1px;
    class RAIZ raiz
    class SEC1,SEC2,SEC3 seccion
    class SEC1_1,SEC1_2,SEC2_1,SEC2_2 pantalla

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
