import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos } from "@/lib/analisis";
import { extraerHtml } from "@/lib/html";

export const maxDuration = 300;

// "Ampliar con IA" de una pantalla del prototipo: aplica el cambio que pide el usuario sobre el
// HTML actual, sin diseñarla de nuevo, para que conserve su estilo y lo editado a mano.
export async function POST(request) {
  try {
    const { nombre, html, analisis, diagramaEr, instruccion, detalle, usarClaude } =
      await request.json();

    const instrucciones = `
Eres un diseñador UI/UX experto. Esta es la pantalla "${nombre}" de un prototipo, como documento HTML:

${html}

Actores del sistema:
${formatearActores(analisis)}

Requerimientos funcionales (referencia para los datos y acciones de la interfaz):
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${diagramaEr ? `\nModelo de datos (Mermaid). Los campos y tablas que agregues deben usar estas entidades y atributos:\n${diagramaEr}\n` : ""}
Cambio que pide el usuario:
${instruccion}

Aplica SOLO ese cambio sobre la pantalla actual:
- Conserva todo lo demás tal como está: estructura, menú de navegación, paleta, tipografía, espaciado y contenido.
- Lo que agregues debe usar los mismos componentes, clases y estilos que ya existen en la pantalla.
- Datos de ejemplo realistas y coherentes con el dominio, nunca "Lorem ipsum".
- Sigue siendo un único documento HTML autocontenido, sin dependencias externas.

Responde ÚNICAMENTE con el documento HTML completo, empezando por <!DOCTYPE html> y terminando en </html>. Sin markdown ni explicaciones.
`;

    const response = await generarContenido({
      usarClaude,
      // Igual que al generar: en detalle "economico" Claude razona poco antes de escribir el HTML.
      esfuerzoClaude: detalle === "detallado" ? undefined : "low",
      contents: instrucciones,
    });

    const nuevo = extraerHtml(response.text);
    if (!nuevo) {
      throw new Error(`La pantalla "${nombre}" llegó incompleta. Intenta de nuevo.`);
    }

    return NextResponse.json({
      html: nuevo,
      modelo_ia: response.modelVersion,
      costo_ia: response.costoUsd,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
