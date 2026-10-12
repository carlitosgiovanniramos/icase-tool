import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { leerJson, sumarCosto } from "@/lib/jsonIA";

export const maxDuration = 300;

// Diagrama entidad-relación en Mermaid (erDiagram). Es cómo se guardan las clases del diagrama
// de clases aprobado, que es el paso anterior: cada clase tiene su entidad. Después de generar se
// valida la estructura (claves, relaciones, entidades sueltas, una entidad por clase) y, si
// incumple, se pide una corrección (un solo reintento). Lo que quede pendiente se devuelve en
// "advertencias".

const TEMA = `%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffffff", "primaryBorderColor": "#1e293b", "primaryTextColor": "#1e293b", "lineColor": "#1e293b", "tertiaryColor": "#f1f5f9", "fontFamily": "trebuchet ms, verdana, arial, sans-serif"}}}%%`;

// Servicios que guardan ellos mismos las credenciales: con ellos el modelo no lleva contraseña.
const AUTENTICACION_EXTERNA = /supabase|firebase|auth0|cognito|clerk|keycloak|appwrite|okta|azure ad|entra id/i;
const CAMPO_CONTRASENA = /contrase|password|passwd|clave_hash|hash_clave/i;

// Ejemplo de un sistema AJENO: muestra la sintaxis, una relación N:M con su tabla intermedia, un
// dato repetido como entidad propia y un detalle opcional 1 a 1.
const EJEMPLO = `${TEMA}
erDiagram
    ESTUDIANTE {
        int id PK
        string nombre
        string correo
    }
    LIBRO {
        int id PK
        string titulo
        string portada_url
    }
    PRESTAMO {
        int id PK
        int estudiante_id FK
        date fecha
        string estado
    }
    PRESTAMO_LIBRO {
        int prestamo_id PK, FK
        int libro_id PK, FK
    }
    MULTA {
        int prestamo_id PK, FK
        float monto
    }
    ESTUDIANTE ||--o{ PRESTAMO : realiza
    PRESTAMO ||--o{ PRESTAMO_LIBRO : incluye
    LIBRO ||--o{ PRESTAMO_LIBRO : prestado_en
    PRESTAMO ||--o| MULTA : genera`;

function limpiarMermaid(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

const listar = (items, max = 6) => items.slice(0, max).join(", ") + (items.length > max ? ` y ${items.length - max} más` : "");
const sinGuiones = (t) => String(t || "").replace(/[_\s]/g, "").toLowerCase();

// Nombres de las clases declaradas en el diagrama de clases aprobado.
function clasesDelDiagrama(diagramaClases) {
  return [...String(diagramaClases || "").matchAll(/^\s*class\s+(\w+)/gm)].map((m) => m[1]);
}

// Revisa el diagrama y devuelve la lista de problemas (vacía si todo está bien).
function validarDiagrama(codigo, { autenticacionExterna, clases = [] } = {}) {
  if (!/\berDiagram\b/.test(codigo)) return ['El diagrama no empieza con "erDiagram".'];

  const entidades = new Map(); // nombre → [{ nombre, claves }]
  const relaciones = [];
  let actual = null;
  for (const cruda of codigo.split("\n")) {
    const linea = cruda.trim();
    if (!linea || linea.startsWith("%%")) continue;

    if (actual) {
      if (linea === "}") actual = null;
      else {
        const atributo = linea.match(/^(\S+)\s+(\w+)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?/);
        if (atributo) entidades.get(actual).push({ nombre: atributo[2], claves: (atributo[3] || "").split(/\s*,\s*/).filter(Boolean) });
      }
      continue;
    }

    const entidad = linea.match(/^(\w+)\s*\{$/);
    if (entidad) {
      actual = entidad[1];
      if (!entidades.has(actual)) entidades.set(actual, []);
      continue;
    }
    const relacion = linea.match(/^(\w+)\s+([|o}{]{2})(?:--|\.\.)([|o}{]{2})\s+(\w+)\s*:/);
    if (relacion) relaciones.push({ a: relacion[1], izquierda: relacion[2], derecha: relacion[3], b: relacion[4] });
  }

  if (!entidades.size) return ["No hay ninguna entidad."];

  const problemas = [];
  const tieneClave = (nombre, clave) => (entidades.get(nombre) || []).some((x) => x.claves.includes(clave));

  const sinPK = [...entidades.keys()].filter((e) => !tieneClave(e, "PK"));
  if (sinPK.length) problemas.push(`Entidades sin clave primaria (PK): ${listar(sinPK)}.`);

  const noDefinidas = [...new Set(relaciones.flatMap((r) => [r.a, r.b]).filter((e) => !entidades.has(e)))];
  if (noDefinidas.length) problemas.push(`Hay relaciones con entidades que no están definidas: ${listar(noDefinidas)}.`);

  const conRelacion = new Set(relaciones.flatMap((r) => [r.a, r.b]));
  const sueltas = [...entidades.keys()].filter((e) => !conRelacion.has(e));
  if (sueltas.length && entidades.size > 1) problemas.push(`Entidades sin ninguna relación: ${listar(sueltas)}. Relaciónalas o elimínalas.`);

  // Toda relación se sostiene en una clave foránea de alguno de sus dos lados.
  const sinFK = relaciones
    .filter((r) => entidades.has(r.a) && entidades.has(r.b) && !tieneClave(r.a, "FK") && !tieneClave(r.b, "FK"))
    .map((r) => `${r.a} – ${r.b}`);
  if (sinFK.length) {
    problemas.push(`Relaciones sin clave foránea en ninguno de sus lados: ${listar(sinFK)}. Agrega la FK o, si es de muchos a muchos, una tabla intermedia.`);
  }

  // Una entidad con claves foráneas debe tener al menos tantas relaciones como entidades referencia.
  for (const [nombre, atributos] of entidades) {
    const foraneas = atributos.filter((x) => x.claves.includes("FK")).length;
    const suyas = relaciones.filter((r) => r.a === nombre || r.b === nombre).length;
    if (foraneas > suyas) {
      problemas.push(`${nombre} tiene ${foraneas} claves foráneas y solo ${suyas} relación(es) dibujada(s): falta dibujar la relación de alguna FK.`);
    }
  }

  // Muchos a muchos directo: en un modelo relacional necesita tabla intermedia.
  const muchosAMuchos = relaciones.filter((r) => /[{}]/.test(r.izquierda) && /[{}]/.test(r.derecha)).map((r) => `${r.a} – ${r.b}`);
  if (muchosAMuchos.length) problemas.push(`Relaciones de muchos a muchos sin tabla intermedia: ${listar(muchosAMuchos)}.`);

  // Cada clase del diagrama de clases aprobado se guarda en una entidad con su mismo nombre.
  const nombres = new Set([...entidades.keys()].map(sinGuiones));
  const sinEntidad = clases.filter((c) => !nombres.has(sinGuiones(c)));
  if (sinEntidad.length) {
    problemas.push(`Estas clases del diagrama de clases no tienen su entidad (con el mismo nombre, en mayúsculas y con guion bajo): ${listar(sinEntidad, 10)}.`);
  }

  if (autenticacionExterna) {
    const conContrasena = [...entidades]
      .filter(([, atributos]) => atributos.some((x) => CAMPO_CONTRASENA.test(x.nombre)))
      .map(([nombre]) => nombre);
    if (conContrasena.length) {
      problemas.push(`${listar(conContrasena)} guarda la contraseña, pero la autenticación la maneja un servicio externo: quita ese campo.`);
    }
  }

  return problemas;
}

async function generar(contents, usarClaude) {
  const response = await generarContenido({
    usarClaude,
    contents,
    config: { responseMimeType: "application/json" },
  });
  return { response, resultado: leerJson(response.text) };
}

export async function POST(request) {
  try {
    const { analisis, casosUso, diagramaClases, tecnologias, indicaciones, usarClaude } = await request.json();

    const autenticacionExterna = AUTENTICACION_EXTERNA.test(String(tecnologias || ""));
    const clases = clasesDelDiagrama(diagramaClases);
    const contextoClases = diagramaClases
      ? `
Diagrama de clases aprobado. El modelo de datos es cómo se GUARDAN estas clases: cada clase es una entidad con su mismo nombre (en MAYÚSCULAS y con guion bajo: OrdenServicio → ORDEN_SERVICIO) y sus mismos atributos; cada relación entre clases se convierte en una clave foránea o, si es de muchos a muchos, en una tabla intermedia. No agregues entidades que no vengan de una clase, salvo esas tablas intermedias, y no copies las operaciones: en el modelo de datos solo van datos.
${diagramaClases}
`
      : "";

    const contextoCasosUso = casosUso
      ? `
Diagrama de casos de uso aprobado (código del diagrama), úsalo para identificar qué información manipula cada caso de uso:
${casosUso}
`
      : "";

    const instrucciones = `
Eres un diseñador de bases de datos experto. Con base en este análisis aprobado, identifica las entidades del dominio y modela un diagrama entidad-relación.

Actores (usuarios del sistema; modela sus roles y datos si el sistema los gestiona):
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis.requerimientos_funcionales)}

Requerimientos no funcionales (tenlos en cuenta si implican datos, ej. auditoría, trazabilidad o historial):
${formatearRequerimientos(analisis.requerimientos_no_funcionales, { conCategoria: true })}
${tecnologias?.trim() ? `\nTecnologías elegidas por el cliente (condicionan qué se guarda en el modelo): ${tecnologias.trim()}\n` : ""}${contextoClases}${contextoCasosUso}${formatearIndicaciones(indicaciones)}
REGLAS DE MODELADO
- Cobertura: todo dato que un requerimiento dice que se registra, se guarda, se consulta o queda almacenado debe tener una entidad y un atributo donde vivir. Recorre los requerimientos uno por uno antes de responder.
- Datos que se repiten: si de algo puede haber varios por registro (varios ítems por pedido, varias personas atendidas por caso, varias líneas por documento), es una entidad propia con relación de uno a muchos. Nunca lo guardes como un texto dentro de otra entidad.
- Muchos a muchos: siempre con una tabla intermedia que tenga las dos claves foráneas.
- Catálogos y personas: lo que el sistema administra como lista propia (productos, vehículos, personal) es una entidad aparte de quienes inician sesión, salvo que los requerimientos digan que son lo mismo.
- Archivos (fotos, firmas, documentos, croquis): se guarda la URL o ruta del archivo en un atributo, no el contenido.
- Quién y cuándo: si un requerimiento pide registrar quién hizo algo (firmar, aprobar, cerrar), guarda la referencia a esa persona y la fecha y hora, no solo un sí/no.
- Estados (borrador, cerrado, pendiente...): un atributo de estado en la entidad a la que pertenecen.
${autenticacionExterna
  ? "- Autenticación: las tecnologías elegidas incluyen un servicio que guarda las credenciales. NO pongas contraseñas ni hashes en el modelo; la entidad de usuarios solo lleva los datos propios del sistema (rol, estado...)."
  : "- Autenticación: si alguna tecnología elegida maneja las credenciales (un servicio de autenticación externo), no pongas contraseñas en el modelo."}
- Cada clave foránea debe tener su relación dibujada, y cada relación su clave foránea en el lado "muchos" (o en el detalle, si es de uno a uno).
- Cardinalidad: usa ||--|| solo si los dos lados existen siempre; un detalle que puede no existir todavía es ||--o| y un conjunto que puede estar vacío es ||--o{.

FORMATO
Genera el diagrama usando la sintaxis "erDiagram" de Mermaid, con esta estructura:
- Empieza SIEMPRE con esta directiva de tema para que todas las entidades se vean uniformes (blanco con borde y texto navy), en vez de que Mermaid les asigne un color distinto y aleatorio a cada una:
  ${TEMA}
- Luego, en una nueva línea, "erDiagram"
- Declara cada entidad con sus atributos principales usando bloques { tipo nombre }
- Marca la clave primaria de cada entidad con "PK" y las claves foráneas con "FK" (una clave que es las dos cosas: "PK, FK")
- Declara las relaciones entre entidades usando notación de pata de gallo (ej: ||--o{ para uno a muchos)
- Añade una etiqueta corta a cada relación describiendo su significado (una sola palabra o varias unidas con guion bajo)

Ejemplo de sintaxis válida (sistema ajeno, no copiar sus entidades):
${EJEMPLO}

En "explicacion", de 3 a 5 líneas cortas (una idea por línea, separadas con \\n) sobre lo que muestra el diagrama: cuáles son las entidades centrales del dominio y cómo se relacionan.

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "diagrama_mermaid": "código mermaid completo aquí, como un solo string",
  "explicacion": "línea 1\\nlínea 2\\nlínea 3"
}
`;

    const inicial = await generar(instrucciones, usarClaude);
    let resultado = inicial.resultado;
    let response = inicial.response;
    let diagrama = limpiarMermaid(resultado.diagrama_mermaid);
    const criterios = { autenticacionExterna, clases };
    let problemas = validarDiagrama(diagrama, criterios);
    let costo = response.costoUsd;

    // Un solo reintento: se le muestran a la IA los problemas concretos y su diagrama anterior.
    if (problemas.length) {
      try {
        const reintento = await generar(
          `${instrucciones}

TU RESPUESTA ANTERIOR NO CUMPLIÓ ESTAS REGLAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Diagrama anterior:
${diagrama}

Corrígelo cumpliendo TODAS las reglas y responde de nuevo con el mismo JSON.`,
          usarClaude
        );
        const diagramaNuevo = limpiarMermaid(reintento.resultado.diagrama_mermaid);
        const problemasNuevos = validarDiagrama(diagramaNuevo, criterios);
        costo = sumarCosto(costo, reintento.response.costoUsd);
        if (problemasNuevos.length <= problemas.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          diagrama = diagramaNuevo;
          problemas = problemasNuevos;
        }
      } catch {
        // Si el reintento falla, se conserva el primer resultado.
      }
    }

    return NextResponse.json({
      ...resultado,
      diagrama_mermaid: diagrama,
      advertencias: problemas,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
