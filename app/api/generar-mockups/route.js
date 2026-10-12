import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { extraerHtml } from "@/lib/html";
import { describirNavegacion } from "@/lib/navegacion";

export const maxDuration = 300;

// Genera UNA pantalla del prototipo por petición: así un boceto completo de muchas pantallas no
// se corta por el límite de salida, y cada pantalla se puede regenerar por separado. La
// coherencia visual entre pantallas la dan el mismo estilo, color, logo y referencias.

const MAX_IMAGENES = 4; // logo + hasta 3 capturas de referencia

async function aParteImagen(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const mimeType = resp.headers.get("content-type") || "image/png";
    if (!mimeType.startsWith("image/")) return null;
    const data = Buffer.from(await resp.arrayBuffer()).toString("base64");
    return { inlineData: { mimeType, data } };
  } catch {
    return null; // una referencia que no carga no debe impedir generar la pantalla
  }
}

function instruccionesDeEstilo({ esWireframe, color, tema }) {
  if (esWireframe) {
    return `Genera un WIREFRAME de baja fidelidad:
- Solo escala de grises (blancos, negros y grises), sin colores de marca ni imágenes reales.
- Representa bloques de contenido, botones e inputs como rectángulos simples con bordes (outline), usando el nombre real del campo cuando sea claro.
- Tipografía neutra (sans-serif del sistema), sin sombras, gradientes ni bordes redondeados decorativos.
- El objetivo es mostrar la estructura y disposición de los elementos, no el diseño visual final.`;
  }

  const oscuro = tema === "oscuro";
  return `Genera un MOCKUP de alta fidelidad, con el nivel de detalle de un producto SaaS real (piensa en Linear, Notion, Stripe Dashboard o Vercel), NO una plantilla genérica de admin panel. Sistema de diseño obligatorio:

1. Identidad y paleta:
   - Color primario de marca: ${color || "elige uno coherente con el dominio (no azul genérico salvo que encaje)"}. Úsalo en botones primarios, elementos activos y acentos; define 1-2 colores de acento que combinen.
   - Tema ${oscuro ? "OSCURO: fondo #0f172a / #111827, superficies un poco más claras, texto claro" : "CLARO: fondo neutro (blanco o gris muy claro, ej. #f8fafc), nunca fondos saturados ocupando toda la pantalla"}.

2. Tipografía: pila del sistema (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif). Escala clara: títulos ~24-28px bold, subtítulos ~16-18px semibold, cuerpo ~14px, secundario ~12-13px.

3. Espaciado y layout: escala de 4px (4, 8, 12, 16, 24, 32, 48). Tarjetas con borde sutil O sombra suave, border-radius consistente (8-12px).

4. Componentes: botones primarios con el color de marca y buen padding; secundarios con borde. Tablas con encabezado diferenciado y estados (badges) con color semántico en fondo claro. Inputs con borde sutil y foco visible. Iconos SVG inline estilo línea (Lucide/Feather), no emojis.

5. Datos de ejemplo realistas y coherentes con el dominio, nunca "Lorem ipsum".

Prohibido: look de plantilla Bootstrap por defecto, formularios centrados sin contexto de producto, componentes sin padding ni alineación cuidada.`;
}

export async function POST(request) {
  try {
    const {
      nombre,
      analisis,
      diagramaEr,
      pantalla,
      pantallas = [],
      estilo = {},
      indicaciones,
      usarClaude,
    } = await request.json();

    const esWireframe = estilo.modo === "wireframe";
    const esMovil = /m[oó]vil/i.test(pantalla.plataforma || "");

    const rfsDePantalla = new Set(pantalla.rfs || []);
    const rfsPantalla = analisis.requerimientos_funcionales.filter((r) => rfsDePantalla.has(r.codigo));

    // Cada pantalla se genera por separado: sin el resto de los requerimientos no conoce los
    // estados, roles y términos que definen, y los inventa distintos en cada una. Van resumidos
    // (sin actores ni dependencias) porque solo sirven de vocabulario.
    const otrosRF = rfsPantalla.length
      ? analisis.requerimientos_funcionales
          .filter((r) => !rfsDePantalla.has(r.codigo))
          .map((r) => `${r.codigo}${r.nombre ? ` - ${r.nombre}` : ""}: ${r.descripcion}`)
          .join("\n")
      : "";

    const [logo, ...referencias] = await Promise.all([
      estilo.logoUrl ? aParteImagen(estilo.logoUrl) : null,
      ...(estilo.referencias || []).slice(0, MAX_IMAGENES - 1).map(aParteImagen),
    ]);
    const capturas = referencias.filter(Boolean);
    const imagenes = [logo, ...capturas].filter(Boolean);

    const textoImagenes = [
      logo &&
        "La primera imagen adjunta es el LOGO del sistema: inclúyelo en la interfaz recreándolo con SVG o texto estilizado, sin enlazar archivos externos.",
      capturas.length &&
        `${logo ? "Las demás imágenes" : "Las imágenes adjuntas"} son REFERENCIAS DE ESTILO: imita su tipo de layout, densidad, componentes y sensación visual (no su contenido).`,
    ]
      .filter(Boolean)
      .join("\n");

    const instrucciones = `
Eres un diseñador UI/UX experto. Diseña UNA pantalla de un sistema, como parte de un prototipo de varias pantallas que deben verse como un solo producto.

Actores del sistema:
${formatearActores(analisis)}

PANTALLA A DISEÑAR: "${pantalla.nombre}"
${pantalla.descripcion ? `Qué muestra y qué permite hacer: ${pantalla.descripcion}\n` : ""}${pantalla.actores?.length ? `Usada por: ${pantalla.actores.join(", ")}\n` : ""}
${rfsPantalla.length
      ? `Requerimientos que esta pantalla debe cubrir (cada uno debe verse reflejado en la interfaz):\n${formatearRequerimientos(rfsPantalla)}`
      : pantalla.descripcion
      ? `Requerimientos del sistema (referencia: refleja solo los que correspondan a esta pantalla):\n${formatearRequerimientos(analisis.requerimientos_funcionales)}`
      : `Requerimientos que esta pantalla debe cubrir (cada uno debe verse reflejado en la interfaz):\n${formatearRequerimientos(analisis.requerimientos_funcionales)}`}
${otrosRF ? `\nResto de los requerimientos del sistema. NO los implementes en esta pantalla: son solo el vocabulario común del prototipo.\n${otrosRF}\n` : ""}${diagramaEr ? `\nModelo de datos (Mermaid). Los formularios, tablas y detalles deben usar estas entidades y atributos:\n${diagramaEr}\n` : ""}
Coherencia con el resto del prototipo (las demás pantallas se generan por separado con estas mismas reglas):
${nombre?.trim() ? `- El sistema se llama "${nombre.trim()}": usa ese nombre, tal cual, como nombre del producto (encabezado, título de la página). No inventes otra marca.\n` : ""}- Usa EXACTAMENTE los estados, roles, tipos y términos que definen los requerimientos (ej. si una orden puede estar "abierta" o "cerrada", no la muestres como "pendiente" o "pagada"). No inventes estados ni categorías.
- No agregues enlaces, botones ni avisos de funciones que ningún requerimiento pide (ej. recuperar contraseña, auditoría, exportaciones).
- A la persona en sesión identifícala por su rol, uno de los actores del sistema.

Plataforma: ${esMovil
      ? "APP MÓVIL. La pantalla se mostrará dentro de un marco de teléfono con un viewport de 390x844px: diseña a pantalla completa para ese tamaño (el contenido ocupa el 100% del ancho, sin dibujar un marco de teléfono ni un fondo alrededor, y sin desbordar horizontalmente). Incluye barra superior y barra de navegación inferior fija. Elementos táctiles grandes (mínimo 44px)."
      : "PANEL WEB de escritorio (~1280px de ancho), con barra lateral de navegación y encabezado con contexto."}

Navegación: ${describirNavegacion(pantalla, pantallas)}

${instruccionesDeEstilo({ esWireframe, color: estilo.color, tema: estilo.tema })}
${textoImagenes ? `\n${textoImagenes}\n` : ""}${formatearIndicaciones(indicaciones)}
Genera un único documento HTML autocontenido, con el CSS en una etiqueta <style> y sin dependencias externas (ni fuentes, ni imágenes, ni scripts de otros dominios).

Responde ÚNICAMENTE con el documento HTML completo, empezando por <!DOCTYPE html> y terminando en </html>. Sin markdown ni explicaciones.
`;

    const response = await generarContenido({
      usarClaude,
      // Detalle "economico" (por defecto): Claude razona poco antes de escribir el HTML, lo que
      // cuesta ~la mitad por pantalla a cambio de pantallas algo más sencillas. "detallado" usa
      // el razonamiento normal del modelo.
      esfuerzoClaude: estilo.detalle === "detallado" ? undefined : "low",
      contents: [{ text: instrucciones }, ...imagenes],
    });

    const html = extraerHtml(response.text);
    if (!html) {
      throw new Error(`La pantalla "${pantalla.nombre}" llegó incompleta. Intenta regenerarla.`);
    }

    return NextResponse.json({
      html,
      modelo_ia: response.modelVersion,
      costo_ia: response.costoUsd,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
