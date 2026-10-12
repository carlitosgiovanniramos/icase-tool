import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos } from "@/lib/analisis";
import { esPlantUML } from "@/lib/diagramas";

export const maxDuration = 300;

// "Ampliar con IA" de un diagrama: aplica el cambio que pide el usuario sobre el código actual
// (Mermaid o PlantUML), sin generarlo de nuevo, para conservar lo que ya se revisó o se editó a mano.
export async function POST(request) {
  try {
    const { nombre, codigo, analisis, instruccion, usarClaude } = await request.json();

    const lenguaje = esPlantUML(codigo) ? "PlantUML" : "Mermaid";
    const conservar =
      lenguaje === "PlantUML"
        ? "las líneas @start/@end, los skinparam y el bloque <style>, los estereotipos (<<...>>), los alias e ids"
        : "la directiva %%{init...}%% si existe, los classDef y las asignaciones de clase";

    const instrucciones = `
Eres un experto en modelado de software con ${lenguaje}. Este es el ${nombre.toLowerCase()} actual de un sistema, en ${lenguaje}:

${codigo}

Actores del sistema:
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis.requerimientos_funcionales)}

Requerimientos no funcionales:
${formatearRequerimientos(analisis.requerimientos_no_funcionales, { conCategoria: true })}

Cambio que pide el usuario:
${instruccion}

Aplica SOLO ese cambio sobre el diagrama actual:
- Responde en ${lenguaje}, el mismo lenguaje del diagrama actual.
- Conserva todo lo demás tal como está: elementos, textos, relaciones, orden, ${conservar}.
- Lo que agregues debe seguir el mismo tipo de diagrama y el mismo estilo que lo existente.
- Si el código empieza con comentarios "Explicación:", consérvalos en el mismo formato (una línea por comentario, cada una con texto) y actualízalos solo si el cambio altera lo que explican.
- Si el cambio ya está reflejado o no aplica a este diagrama, devuelve el código sin cambios.

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "codigo": "código ${lenguaje} completo aquí, como un solo string"
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
