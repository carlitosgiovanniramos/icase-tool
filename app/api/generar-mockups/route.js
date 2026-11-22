import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { estructuraDeNavegacion } from "@/lib/navegacion";
import { estiloWireframe, TIPOS_DE_PANTALLA, COMPONENTES, contextoParaPantallas, contextoClases } from "@/lib/prototipo";
import { armarPantalla, extraerContenido } from "@/lib/shellPrototipo";

export const maxDuration = 300;

// Genera UNA pantalla del prototipo por petición: así un boceto completo de muchas pantallas no
// se corta por el límite de salida, y cada pantalla se puede regenerar por separado.
//
// La IA solo escribe el CONTENIDO de la pantalla. El menú, el logo, el pie de sesión, el CSS y los
// componentes (botones, campos, tablas, modales) los pone el código (lib/shellPrototipo.js), igual
// en todas las pantallas: así lo común es idéntico y cada enlace del menú va a la pantalla correcta.

const MAX_IMAGENES = 3; // capturas de referencia

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

export async function POST(request) {
  try {
    const {
      nombre,
      analisis,
      diagramaEr,
      clases,
      casosUso,
      contexto,
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

    const referencias = await Promise.all((estilo.referencias || []).slice(0, MAX_IMAGENES).map(aParteImagen));
    const capturas = referencias.filter(Boolean);
    const imagenes = capturas;
    const textoImagenes = capturas.length
      ? "Las imágenes adjuntas son REFERENCIAS DE ESTILO: imita su tipo de layout, densidad y sensación visual dentro del contenido (no su contenido). El menú y los componentes ya están resueltos por la aplicación."
      : "";

    // Dónde vive la pantalla: el menú lo arma el código; aquí solo se pasa a la IA lo que afecta al contenido.
    const estructura = estructuraDeNavegacion(pantalla, pantallas);
    const rol = pantalla.actores?.[0] || "Usuario";
    const lineasNavegacion = estructura.acceso
      ? `- Esta pantalla es de acceso: no tiene menú. El formulario valida sus campos y, si son válidos, entra a la primera pantalla: <form onsubmit="event.preventDefault();parent.postMessage({tipo:'mockup-navegar',texto:'${estructura.primera || ""}'},'*')">.`
      : [
          estructura.abre_desde ? `- Esta pantalla no está en el menú: se abre desde "${estructura.abre_desde}". Incluye un enlace "Volver" con data-pantalla="${estructura.abre_desde}".` : "",
          estructura.abre.length ? `- Desde esta pantalla se abren: ${estructura.abre.map((n) => `"${n}"`).join(", ")}. Un botón o enlace para cada una, con data-pantalla igual al nombre exacto.` : "",
          "- El menú lateral, el logo y el pie de sesión los pone la aplicación: NO los dibujes.",
        ].filter(Boolean).join("\n");

    const instrucciones = `
Eres un diseñador UI/UX experto. Diseña el CONTENIDO de UNA pantalla de un sistema, como parte de un prototipo de varias pantallas que deben verse como un solo producto. La información viene en este orden de importancia: primero dónde vive la pantalla, luego qué debe mostrar, luego qué acciones tiene.

1. DÓNDE VIVE LA PANTALLA (árbol de navegación aprobado)
- Pantalla: "${pantalla.nombre}"${pantalla.plataforma ? ` (${pantalla.plataforma})` : ""}
- La usa: ${rol}${pantalla.actores?.length > 1 ? ` (y también ${pantalla.actores.slice(1).join(", ")})` : ""}
${lineasNavegacion}
- Plataforma: ${esMovil
      ? "APP MÓVIL (390px de ancho): contenido a todo el ancho, elementos táctiles grandes, sin dibujar marco de teléfono."
      : "PANEL WEB de escritorio (~1280px de ancho)."}

2. QUÉ DEBE MOSTRAR (actores y requerimientos de esta pantalla)
Actores del sistema:
${formatearActores(analisis)}
${pantalla.descripcion ? `\nQué muestra y qué permite hacer: ${pantalla.descripcion}\n` : ""}
${rfsPantalla.length
      ? `Requerimientos que esta pantalla debe cubrir (cada uno debe verse reflejado en la interfaz):\n${formatearRequerimientos(rfsPantalla)}`
      : pantalla.descripcion
      ? `Requerimientos del sistema (referencia: refleja solo los que correspondan a esta pantalla):\n${formatearRequerimientos(analisis.requerimientos_funcionales)}`
      : `Requerimientos que esta pantalla debe cubrir (cada uno debe verse reflejado en la interfaz):\n${formatearRequerimientos(analisis.requerimientos_funcionales)}`}
${casosUso ? `\nDiagrama de casos de uso aprobado (qué hace cada actor con el sistema; sirve para el orden de los pasos):\n${casosUso}\n` : ""}
3. QUÉ ACCIONES TIENE (diagrama de clases aprobado)
${contextoClases(clases) || "No hay diagrama de clases: deduce las acciones de los requerimientos.\n"}- Las acciones de la pantalla (botones, enlaces, opciones de cada fila) son las OPERACIONES de las clases que sus requerimientos usan, y solo esas. Los datos de tablas, filtros y formularios son los ATRIBUTOS de esas clases.
- Crear, editar y toda acción que pida confirmar o datos (cancelar, eliminar, desactivar) se hacen en un MODAL de esta misma pantalla, no en una pantalla aparte.
${contextoParaPantallas(contexto)}${diagramaEr ? `\nModelo de datos (Mermaid), solo para los tipos y las relaciones de los datos; no dibujes tablas intermedias ni claves foráneas:\n${diagramaEr}\n` : ""}${otrosRF ? `\nResto de los requerimientos del sistema. NO los implementes en esta pantalla: son solo el vocabulario común del prototipo.\n${otrosRF}\n` : ""}
Coherencia con el resto del prototipo (las demás pantallas se generan por separado con estas mismas reglas):
${nombre?.trim() ? `- El sistema se llama "${nombre.trim()}": úsalo tal cual como nombre del producto. No inventes otra marca.\n` : ""}- Usa EXACTAMENTE los estados, roles, tipos y términos que definen los requerimientos (ej. si una orden puede estar "abierta" o "cerrada", no la muestres como "pendiente" o "pagada"). No inventes estados ni categorías.
- No agregues enlaces, botones ni avisos de funciones que ningún requerimiento pide (ej. recuperar contraseña, auditoría, exportaciones).
- Los mismos textos para lo mismo en todas las pantallas: el botón de una acción se llama igual donde aparezca (ej. siempre "Cancelar pedido", nunca "Anular" en otra), y los estados, columnas y etiquetas de un mismo dato se escriben igual.
- Una acción que existe para dos actores (ej. cancelar un pedido) se ve igual para los dos: mismo botón, mismo modal y mismo texto de confirmación.
- No escribas el nombre del usuario ni su rol: el pie de sesión lo pone la aplicación. Los datos de ejemplo (nombres, fechas, horas) son coherentes con los de las otras pantallas.

${TIPOS_DE_PANTALLA}

${COMPONENTES}
${esWireframe ? `\n${estiloWireframe()}\n` : ""}${textoImagenes ? `\n${textoImagenes}\n` : ""}${formatearIndicaciones(indicaciones)}
Responde ÚNICAMENTE con el HTML del contenido: empieza con el encabezado de la pantalla (no incluyas <html>, <head>, <body>, menú, barra lateral ni scripts). Sin markdown ni explicaciones.
`;

    const response = await generarContenido({
      usarClaude,
      // Detalle "economico" (por defecto): Claude razona poco antes de escribir el HTML, lo que
      // cuesta ~la mitad por pantalla a cambio de pantallas algo más sencillas. "detallado" usa
      // el razonamiento normal del modelo.
      esfuerzoClaude: estilo.detalle === "detallado" ? undefined : "low",
      contents: [{ text: instrucciones }, ...imagenes],
    });

    const { contenido, estilos } = extraerContenido(response.text);
    if (contenido.length < 80) {
      throw new Error(`La pantalla "${pantalla.nombre}" llegó incompleta. Intenta regenerarla.`);
    }
    const html = armarPantalla({
      titulo: pantalla.nombre,
      nombreSistema: nombre?.trim() || "Sistema",
      estructura,
      rol,
      logoUrl: estilo.logoUrl,
      contenido,
      estilos,
      estilo,
      movil: esMovil,
      wireframe: esWireframe,
    });

    return NextResponse.json({
      html,
      modelo_ia: response.modelVersion,
      costo_ia: response.costoUsd,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
