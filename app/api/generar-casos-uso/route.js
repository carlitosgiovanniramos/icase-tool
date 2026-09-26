import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

export async function POST(request) {
  try {
    const { analisis, indicaciones, usarClaude } = await request.json();

    const instrucciones = `
Eres un analista de sistemas experto en UML. Genera un diagrama de casos de uso en sintaxis Mermaid (flowchart), basado en este análisis aprobado:

Actores:
${formatearActores(analisis)}

Requerimientos funcionales (con sus actores asignados, dependencias y prioridad):
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${formatearIndicaciones(indicaciones)}
Reglas para el diagrama:
- Usa "flowchart LR"
- Cada actor va como nodo con forma estadio: NombreActor(["Nombre Actor"])
- Todos los casos de uso van dentro de un subgraph llamado SISTEMA["Sistema"]
- Cada caso de uso es un nodo con forma de paréntesis: UC1(Descripción corta)
- Conecta cada actor SOLO con los casos de uso de los requerimientos que lo tienen asignado en "actores", usando -->. No inventes conexiones que el análisis no indica.
- Usa las dependencias entre requerimientos para las relaciones entre casos de uso: si un caso de uso siempre necesita a otro para completarse, usa -.->|"<<include>>"|; si solo lo amplía de forma opcional o condicional, usa -.->|"<<extend>>"|.
- Si la descripción de un actor indica que es un tipo más específico de otro (hereda sus capacidades), representa la generalización con una flecha del actor específico al general: ActorEspecifico --->|"hereda"| ActorGeneral
- Agrega al final classDef y class para colorear actores de un color y casos de uso de otro

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