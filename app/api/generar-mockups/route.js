import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

// El HTML no va dentro de JSON: los modelos se equivocan al escapar tanto HTML/CSS y la
// respuesta queda inválida. Cada pantalla va precedida de un marcador y se separan aquí.
const MARCADOR_PANTALLA = "=== PANTALLA:";
const MARCADOR_FIN = "=== FIN ===";

function extraerPantallas(texto) {
  const cuerpo = texto.split(MARCADOR_FIN)[0];
  return cuerpo
    .split(MARCADOR_PANTALLA)
    .slice(1)
    .map((bloque) => {
      const salto = bloque.indexOf("\n");
      const nombre = bloque.slice(0, salto).replace(/=+\s*$/, "").trim();
      const html = bloque
        .slice(salto + 1)
        .trim()
        .replace(/^```(?:html)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      return { nombre, html };
    })
    // Si la respuesta se cortó por el límite de tokens, la última pantalla queda incompleta.
    .filter((p) => p.nombre && /<\/(html|body)>\s*$/i.test(p.html));
}

export async function POST(request) {
  try {
    const { analisis, diagramaEr, cantidad, modo, indicaciones, usarClaude } = await request.json();

    const cantidadPantallas = Math.min(Math.max(Number(cantidad) || 4, 1), 10);
    const esWireframe = modo === "wireframe";

    const funcionales = formatearRequerimientos(analisis.requerimientos_funcionales);
    const actores = formatearActores(analisis);

    const contextoEr = diagramaEr
      ? `
Modelo de datos aprobado (diagrama entidad-relación en Mermaid). Los formularios, tablas y detalles de las pantallas deben usar estas entidades y sus atributos:
${diagramaEr}
`
      : "";

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

Actores:
${actores}

Requerimientos funcionales (con los actores que usan cada función; prioriza las pantallas de los requerimientos de prioridad alta):
${funcionales}
${contextoEr}
${estiloInstrucciones}
${formatearIndicaciones(indicaciones)}

Para cada pantalla, genera código HTML autocontenido (con CSS embebido en una etiqueta <style> dentro del mismo documento, sin dependencias externas).

Formato de respuesta (obligatorio): NO uses JSON ni bloques de código markdown. Escribe cada pantalla precedida por una línea marcador con su nombre, seguida del documento HTML completo tal cual, y termina con ${MARCADOR_FIN}:

${MARCADOR_PANTALLA} Nombre de la primera pantalla ===
<!DOCTYPE html>
<html>...documento completo...</html>
${MARCADOR_PANTALLA} Nombre de la segunda pantalla ===
<!DOCTYPE html>
<html>...documento completo...</html>
${MARCADOR_FIN}

No escribas ningún otro texto antes, entre ni después de las pantallas.
`;

    const response = await generarContenido({ usarClaude, contents: instrucciones });

    const pantallas = extraerPantallas(response.text);
    if (!pantallas.length) {
      throw new Error("La IA no devolvió las pantallas en el formato esperado. Intenta generarlas de nuevo.");
    }

    return NextResponse.json({ pantallas, modelo_ia: response.modelVersion, costo_ia: response.costoUsd });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
