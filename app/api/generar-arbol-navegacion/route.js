import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { armarArbol, menuPrincipal } from "@/lib/arbol";

export const maxDuration = 300;

// Árbol de navegación: cómo se llega a cada pantalla del prototipo (raíz → [plataforma] → entrada
// del menú → pantalla → pantallas que se abren desde ella).
//
// Se arma con la navegación REAL del prototipo: el navegador envía, de cada pantalla, las opciones
// de sus menús y sus botones (ver resumirNavegacion en lib/html.js). Sin eso la IA solo conoce los
// nombres de las pantallas y agrupa por intuición, con secciones que no existen en ningún menú.
//
// La IA NO escribe Mermaid: devuelve la estructura como JSON y la aplicación genera el código
// (ver lib/arbol.js). Si alguna pantalla quedó sin ubicar se pide una corrección (un solo
// reintento); lo que siga pendiente se devuelve en "advertencias".

const EJEMPLO = `{
  "plataformas": [
    {
      "plataforma": "Web",
      "nodos": [
        { "tipo": "pantalla", "nombre": "Inicio de sesión" },
        {
          "tipo": "seccion",
          "nombre": "Reservas",
          "roles": ["Administrador"],
          "hijos": [
            {
              "tipo": "pantalla",
              "nombre": "Lista de reservas",
              "hijos": [{ "tipo": "pantalla", "nombre": "Nueva reserva" }]
            },
            { "tipo": "pantalla", "nombre": "Calendario de canchas" }
          ]
        }
      ]
    }
  ],
  "explicacion": "línea 1\\nlínea 2\\nlínea 3"
}`;

const normalizarCodigo = (c) => String(c).replace(/[-\s]/g, "").toUpperCase();
const sumar = (a, b) => (typeof a === "number" || typeof b === "number" ? (a || 0) + (b || 0) : a);

// Extrae el primer objeto JSON completo de la respuesta e ignora cualquier texto antes o después.
function limpiarJson(texto) {
  const s = String(texto || "").trim();
  const inicio = s.indexOf("{");
  if (inicio === -1) throw new Error("La IA no devolvió un JSON.");

  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < s.length; i++) {
    const c = s[i];
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === "{") profundidad++;
    else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return s.slice(inicio, i + 1);
    }
  }
  throw new Error("El JSON de la IA llegó incompleto.");
}

// Acepta la lista de pantallas como objetos { nombre, plataforma, rfs, actores, navegacion } o,
// en proyectos antiguos, como nombres sueltos.
function normalizarPantallas(pantallas = []) {
  return pantallas.map((p) => (typeof p === "string" ? { nombre: p } : p)).filter((p) => p && p.nombre);
}

// Lo que el prototipo muestra en cada pantalla, agrupado por plataforma. El menú principal (el
// que comparten sus pantallas) se escribe una sola vez y no se repite en cada pantalla.
function describirPantallas(lista, plataformas) {
  const grupos = plataformas.length ? plataformas : [""];
  return grupos
    .map((plataforma) => {
      const suyas = lista.filter((p) => !plataforma || (p.plataforma || plataformas[0]) === plataforma);
      if (!suyas.length) return "";
      const principal = menuPrincipal(suyas);
      const clavePrincipal = principal?.join(" · ");

      const pantallas = suyas.map((p) => {
        const datos = [
          `  - ${p.nombre}`,
          p.actores?.length && `usada por: ${p.actores.join(", ")}`,
          p.rfs?.length && `cubre: ${p.rfs.join(", ")}`,
        ].filter(Boolean);
        const lineas = [datos.join(" | ")];

        const menus = (p.navegacion?.menus || []).map((m) => m.join(" · "));
        if (clavePrincipal) lineas.push(`      menú principal: ${menus.includes(clavePrincipal) ? "sí" : "no lo muestra"}`);
        const otros = menus.filter((m) => m !== clavePrincipal);
        if (otros.length) lineas.push(`      otros menús: ${otros.map((m) => `[${m}]`).join(" ")}`);
        if (p.navegacion?.acciones?.length) lineas.push(`      botones y enlaces: ${p.navegacion.acciones.join(" · ")}`);
        return lineas.join("\n");
      });

      return [
        plataforma && `Plataforma ${plataforma}`,
        principal
          ? `  Menú principal: ${principal.join(" · ")}`
          : "  Menú principal: no se detectó; dedúcelo de los menús y botones de sus pantallas.",
        ...pantallas,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

async function generar(contents, usarClaude) {
  const response = await generarContenido({
    usarClaude,
    contents,
    config: { responseMimeType: "application/json" },
  });
  return { response, resultado: JSON.parse(limpiarJson(response.text)) };
}

export async function POST(request) {
  try {
    const {
      nombre,
      descripcion,
      analisis,
      pantallas,
      plataformas: plataformasProyecto,
      indicaciones,
      usarClaude,
    } = await request.json();

    const a = analisis || {};
    const lista = normalizarPantallas(pantallas);
    const plataformasPantallas = [...new Set(lista.map((p) => p.plataforma).filter(Boolean))];
    const plataformas = plataformasPantallas.length ? plataformasPantallas : plataformasProyecto || [];
    const nombreSistema = nombre?.trim() || "Sistema";

    const textoRF = formatearRequerimientos(a.requerimientos_funcionales);
    const codigosRF = new Set((String(textoRF).match(/\bRF-?\s?\d+\b/gi) || []).map(normalizarCodigo));

    const contextoPantallas = lista.length
      ? `- Pantallas del prototipo aprobado, con la navegación que cada una muestra (opciones de sus menús, botones y enlaces):
${describirPantallas(lista, plataformas)}
`
      : `- No hay prototipo aprobado: deriva las pantallas de los requerimientos funcionales (una por cada función que el usuario opera) y agrega a cada pantalla "rfs" con los códigos que cubre. Cada requerimiento funcional debe quedar en al menos una pantalla.
`;

    const instrucciones = `
Eres un arquitecto de información experto. Arma el ÁRBOL DE NAVEGACIÓN de "${nombreSistema}": por dónde se llega a cada pantalla, tal como lo muestra el prototipo.

CONTEXTO
- Qué hace el sistema: ${descripcion?.trim() || "ver los requerimientos funcionales"}
- Actores:
${formatearActores(a)}
- Plataformas: ${plataformas.length ? plataformas.join(", ") : "una sola"}
- Requerimientos funcionales (con los actores que usan cada función):
${textoRF}
${contextoPantallas}${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
- PLATAFORMAS: una entrada por plataforma${plataformas.length ? ` (${plataformas.join(", ")}, con ese mismo nombre)` : ""}. Cada pantalla va SOLO en su plataforma.
- SECCIONES ("tipo": "seccion"): son las entradas del MENÚ PRINCIPAL de la plataforma, con el mismo texto que tienen en el prototipo y en el mismo orden. En "roles", los actores que usan esa sección (según "usada por" de sus pantallas y los requerimientos); si no se sabe, déjalo vacío.
- PANTALLAS ("tipo": "pantalla"): con el nombre EXACTO de la lista. Bajo cada sección van las pantallas a las que lleva esa entrada del menú (incluidas las de sus submenús u "otros menús").
- PANTALLAS HIJAS: una pantalla que se abre desde otra con un botón o enlace (ej. el formulario que abre el botón "Nuevo" de un listado, o el detalle de un elemento) va en "hijos" de esa pantalla, no al lado.
- Las pantallas de acceso (inicio de sesión, registro) van primero, directamente bajo la plataforma, sin sección.
- Si una entrada del menú lleva a una sola pantalla y de ella no cuelga ninguna otra, pon la pantalla directamente bajo la plataforma, sin sección.
- Una pantalla sin menú principal (formularios a pantalla completa, pasos de un flujo) cuelga de la pantalla desde la que se abre; dedúcelo de los botones de las otras pantallas y de su nombre.

QUÉ NO QUIERO
- No inventes secciones que no estén en el menú del prototipo ni agrupes por "área del negocio": la organización es la del menú real.
- No agregues pantallas que no estén en la lista, ni repitas una pantalla en dos lugares.
- No cambies, acortes ni traduzcas los nombres de las pantallas.
- No escribas los RF de las pantallas ni código de diagrama: la aplicación los agrega.
- No copies los nombres del ejemplo; es de otro sistema y sirve solo para mostrar la estructura.

FORMATO
- Cada nodo es { "tipo", "nombre", "hijos" }; las secciones llevan además "roles". "hijos" se omite si está vacío.
- En "explicacion", de 3 a 5 líneas cortas (una idea por línea, separadas con \\n) sobre cómo se organiza la navegación de cada plataforma y qué sección usa cada rol. Solo afirma lo que el árbol muestra: sin adjetivos de calidad (intuitivo, fluido, robusto) ni menciones al proceso de generación ni al prototipo.

VERIFICACIÓN ANTES DE RESPONDER
1. Están TODAS las pantallas de la lista, una sola vez, con su nombre exacto y en su plataforma.
2. Las secciones coinciden con las entradas del menú principal del prototipo.
3. Los formularios y detalles cuelgan de la pantalla que los abre.

Ejemplo de estructura (sistema ajeno, no copiar sus nombres):
${EJEMPLO}

Responde ÚNICAMENTE con un JSON válido con esa estructura, sin texto adicional ni bloques de código.
`;

    const armar = (respuesta) =>
      armarArbol({ nombre: nombreSistema, plataformas, pantallas: lista, codigosRF, respuesta });

    const inicial = await generar(instrucciones, usarClaude);
    let resultado = inicial.resultado;
    let response = inicial.response;
    let arbol = armar(resultado);
    let costo = response.costoUsd;

    // Un solo reintento: se le dice a la IA qué pantallas no quedaron ubicadas.
    if (arbol.sinUbicar.length) {
      try {
        const reintento = await generar(
          `${instrucciones}

TU RESPUESTA ANTERIOR NO UBICÓ ESTAS PANTALLAS (faltaban, estaban repetidas, con otro nombre o en otra plataforma):
${arbol.sinUbicar.map((p) => `- ${p}`).join("\n")}

Respuesta anterior:
${JSON.stringify(resultado)}

Corrígela y responde de nuevo con el mismo JSON, completo.`,
          usarClaude
        );
        const arbolNuevo = armar(reintento.resultado);
        costo = sumar(costo, reintento.response.costoUsd);
        if (arbolNuevo.sinUbicar.length < arbol.sinUbicar.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          arbol = arbolNuevo;
        }
      } catch {
        // Si el reintento falla, se conserva el primer resultado.
      }
    }

    const advertencias = nombre?.trim()
      ? arbol.advertencias
      : ["No se recibió el nombre del sistema: la raíz quedó con un nombre genérico.", ...arbol.advertencias];

    return NextResponse.json({
      diagrama_mermaid: arbol.codigo,
      explicacion: resultado.explicacion,
      advertencias,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
