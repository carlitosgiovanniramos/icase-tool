import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { analisis, cantidad, modo } = await request.json();

    const cantidadPantallas = Math.min(Math.max(Number(cantidad) || 4, 1), 10);
    const esWireframe = modo === "wireframe";

    const funcionales = analisis.requerimientos_funcionales
      .map((r) => `${r.codigo}: ${r.descripcion}`)
      .join("\n");

    const actores = analisis.actores.map((a) => a.nombre).join(", ");

    const estiloInstrucciones = esWireframe
      ? `Genera un WIREFRAME de baja fidelidad para cada pantalla:
- Solo escala de grises (blancos, negros y grises), sin colores de marca ni imágenes reales.
- Representa bloques de contenido, botones e inputs como rectángulos simples con bordes (outline), usando texto tipo "Botón", "Imagen", "Texto" o el nombre real del campo cuando sea claro.
- Tipografía neutra (sans-serif del sistema), sin sombras, gradientes ni bordes redondeados decorativos.
- El objetivo es mostrar la estructura y disposición de los elementos, no el diseño visual final.`
      : `Genera un MOCKUP de alta fidelidad para cada pantalla, con el nivel de detalle de un producto SaaS real (piensa en Linear, Notion, Stripe Dashboard o Vercel), NO en una plantilla genérica de admin panel gratuito. Sigue este sistema de diseño en TODAS las pantallas, sin excepción:

1. Identidad y paleta:
   - Antes de generar nada, define un color primario de marca y 1-2 colores de acento que tengan sentido para el dominio del proyecto (no uses azul genérico por defecto salvo que encaje).
   - Usa esa MISMA paleta, MISMA tipografía y MISMO estilo de componentes en las ${cantidadPantallas} pantallas, como si fueran capturas de un solo producto real.
   - Fondo neutro (blanco o gris muy claro, ej. #f8fafc), nunca fondos de color saturado ocupando toda la pantalla.

2. Tipografía:
   - Usa la pila del sistema: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif. NO uses Times New Roman, Comic Sans ni la fuente serif por defecto del navegador.
   - Define una escala clara: títulos de página ~24-28px/bold, subtítulos ~16-18px/semibold, cuerpo ~14px/regular, texto secundario ~12-13px/gris medio. Usa letter-spacing negativo sutil en títulos grandes.

3. Espaciado y layout:
   - Usa una escala de espaciado consistente en múltiplos de 4px (4, 8, 12, 16, 24, 32, 48). Nunca amontones elementos ni dejes márgenes al azar.
   - Estructura tipo producto real: barra lateral de navegación (si aplica) + header con contexto (nombre de usuario, breadcrumb o título de sección) + contenido principal en un grid ordenado.
   - Las tarjetas/paneles usan borde sutil (1px, color gris muy claro) O sombra sutil (box-shadow suave), nunca ambos exagerados a la vez. border-radius consistente (8-12px) en todos los contenedores.

4. Componentes:
   - Botones primarios con el color de marca, texto blanco, buen padding (no botones diminutos ni gigantes); botones secundarios con borde y fondo transparente.
   - Tablas con encabezado diferenciado (fondo gris claro o texto en mayúsculas pequeñas), filas con separación clara, estados (badges/pills) con color semántico (verde=éxito, rojo=alerta, ámbar=pendiente) en fondo claro con texto del mismo tono oscuro, nunca colores saturados planos.
   - Inputs con borde sutil, buen padding interno y estado de foco visible.
   - Iconografía: usa SVG inline simples (stroke, estilo "line icons" tipo Lucide/Feather) para navegación y acciones. Emojis solo como excepción puntual, nunca como reemplazo sistemático de iconos reales.

5. Datos de ejemplo:
   - Usa datos de muestra realistas y coherentes con el dominio del proyecto (nombres, cifras, estados), nunca "Lorem ipsum" ni "Texto de ejemplo".

Prohibido explícitamente: look de plantilla Bootstrap por defecto, formularios centrados sin contexto de producto, combinaciones de colores al azar entre pantallas, tipografía inconsistente entre pantallas, componentes sin padding/alineación cuidada.`;

    const instrucciones = `
Eres un diseñador UI/UX experto. Con base en estos actores y requerimientos funcionales, diseña exactamente ${cantidadPantallas} pantallas principales de un sistema web.

Actores: ${actores}

Requerimientos funcionales:
${funcionales}

${estiloInstrucciones}

Para cada pantalla, genera código HTML autocontenido (con CSS embebido en una etiqueta <style> dentro del mismo documento, sin dependencias externas).

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "pantallas": [
    { "nombre": "Nombre de la pantalla", "html": "<html>documento completo aquí</html>" }
  ]
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
