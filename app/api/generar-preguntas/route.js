import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearContexto } from "@/lib/contexto";

export const maxDuration = 300;

// Entrevista de elicitación: la IA lee lo que se sabe del proyecto y pregunta lo que falta
// antes de redactar los requerimientos.
export async function POST(request) {
  try {
    const { prompt, documentoTexto, contexto, usarClaude } = await request.json();

    const elicitacion = formatearContexto(contexto);
    const noRepetir = [
      ...(contexto?.entrevista || []).map((p) => p.pregunta),
      ...(contexto?.descartadas || []),
    ];

    const instrucciones = `
Eres un analista de requisitos certificado que realiza una entrevista de elicitación con el cliente, siguiendo la norma ISO/IEC/IEEE 29148:2018, ANTES de redactar los requerimientos de un sistema.

Descripción del sistema dada por el cliente:
${prompt}
${elicitacion ? `\nInformación que el cliente ya proporcionó (NO vuelvas a preguntar nada de esto):\n${elicitacion}\n` : ""}${documentoTexto ? `\nContexto extraído de un documento adjunto:\n${documentoTexto}\n` : ""}${noRepetir.length ? `\nPreguntas que ya se hicieron o que el cliente descartó (NO las repitas ni las reformules):\n${noRepetir.map((p) => `- ${p}`).join("\n")}\n` : ""}
Identifica la información que falta o es ambigua y que cambiaría los requerimientos: reglas de negocio, casos excepcionales, permisos por rol, estados y ciclo de vida de los datos, volúmenes y frecuencia de uso, integraciones con otros sistemas, restricciones legales u operativas.

Genera entre 5 y 8 preguntas:
- Concretas y específicas de ESTE sistema (nada genérico que sirva para cualquier proyecto).
- Que el cliente pueda responder en una o dos líneas.
- Ordenadas de mayor a menor impacto en los requerimientos.
- En "motivo" explica en pocas palabras qué aspecto del sistema aclara la respuesta.

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "preguntas": [
    { "pregunta": "string", "motivo": "string" }
  ]
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
