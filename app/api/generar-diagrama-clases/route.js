import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { leerJson, sumarCosto } from "@/lib/jsonIA";

export const maxDuration = 300;

// Diagrama de clases del dominio en Mermaid (classDiagram). Es el primer paso del Diseño: sale
// de los requerimientos y los casos de uso, y el entidad-relación se deriva después de él. El
// prompt sigue la estructura CONTEXTO / QUÉ DEBE MOSTRAR / QUÉ NO QUIERO / FORMATO.
//
// Un proyecto que ya tenía su entidad-relación antes de existir este paso lo envía, y entonces
// las clases deben corresponder a sus entidades, para no contradecir lo ya aprobado.
//
// Después de generar se valida el diagrama (clases con atributos, operaciones, relaciones con
// multiplicidad y, si hay entidad-relación, correspondencia con él) y, si incumple, se pide una
// corrección (un solo reintento). Lo que quede pendiente se devuelve en "advertencias".

const TEMA = `%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffffff", "primaryBorderColor": "#1e293b", "primaryTextColor": "#1e293b", "lineColor": "#1e293b", "tertiaryColor": "#f1f5f9", "fontFamily": "trebuchet ms, verdana, arial, sans-serif"}}}%%`;

// Ejemplo de un sistema AJENO: muestra la sintaxis, una composición (las líneas no existen sin
// su préstamo), una asociación de muchos a muchos sin clase intermedia y operaciones tomadas de
// lo que el sistema debe hacer.
const EJEMPLO = `${TEMA}
classDiagram
    class Estudiante {
        +int id
        +String nombre
        +String correo
        +tieneMultasPendientes() bool
    }
    class Libro {
        +int id
        +String titulo
        +bool disponible
        +marcarPrestado() void
    }
    class Prestamo {
        +int id
        +Date fecha
        +String estado
        +registrar() void
        +devolver() void
    }
    class Multa {
        +float monto
        +bool pagada
        +pagar() void
    }
    Estudiante "1" --> "0..*" Prestamo : realiza
    Prestamo "0..*" --> "1..*" Libro : incluye
    Prestamo "1" *-- "0..1" Multa : genera`;

const RELACION = /^(\w+)\s+(?:"([^"]*)"\s+)?(<\|--|--\|>|\*--|--\*|o--|--o|<-->|-->|<--|--|\.\.>|<\.\.|\.\.\|>|<\|\.\.|\.\.)\s+(?:"([^"]*)"\s+)?(\w+)/;
const sinGuiones = (t) => String(t || "").replace(/[_\s]/g, "").toLowerCase();
const listar = (items, max = 6) => items.slice(0, max).join(", ") + (items.length > max ? ` y ${items.length - max} más` : "");

function limpiarMermaid(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// El tema lo pone la aplicación, para que el diagrama se vea igual que el entidad-relación.
function conTema(codigo) {
  const sinTema = codigo.replace(/^\s*%%\{init:[\s\S]*?\}%%\s*/m, "");
  return `${TEMA}\n${sinTema}`;
}

// Entidades del modelo de datos que representan un concepto del dominio. Las tablas que solo
// unen a otras dos (todas sus columnas son claves) no son clases: son una relación.
function entidadesDelDominio(diagramaEr) {
  const entidades = [];
  let actual = null;
  for (const cruda of String(diagramaEr || "").split("\n")) {
    const linea = cruda.trim();
    if (actual) {
      if (linea === "}") {
        const propios = actual.atributos.filter((claves) => !/\bFK\b/.test(claves));
        if (propios.length > 1 || actual.atributos.filter((claves) => /\bFK\b/.test(claves)).length < 2) entidades.push(actual.nombre);
        actual = null;
      } else if (linea) actual.atributos.push(linea.split(/\s+/).slice(2).join(" "));
      continue;
    }
    const entidad = linea.match(/^(\w+)\s*\{$/);
    if (entidad) actual = { nombre: entidad[1], atributos: [] };
  }
  return entidades;
}

// Revisa el diagrama y devuelve la lista de problemas (vacía si todo está bien).
function validarDiagrama(codigo, entidades = []) {
  if (!/\bclassDiagram\b/.test(codigo)) return ['El diagrama no empieza con "classDiagram".'];

  const clases = new Map(); // nombre → { atributos, operaciones }
  const relaciones = [];
  const clase = (nombre) => {
    if (!clases.has(nombre)) clases.set(nombre, { atributos: 0, operaciones: [], declarada: false });
    return clases.get(nombre);
  };
  const miembro = (nombre, texto) => {
    if (!texto) return;
    if (texto.includes("(")) clase(nombre).operaciones.push(texto);
    else clase(nombre).atributos++;
  };

  let actual = null;
  for (const cruda of codigo.split("\n")) {
    const linea = cruda.trim();
    if (!linea || linea.startsWith("%%") || linea === "classDiagram") continue;

    if (actual) {
      if (linea === "}") actual = null;
      else miembro(actual, linea);
      continue;
    }
    const bloque = linea.match(/^class\s+(\w+)(?:\s*\{)?$/);
    if (bloque) {
      clase(bloque[1]).declarada = true;
      if (linea.endsWith("{")) actual = bloque[1];
      continue;
    }
    const relacion = linea.match(RELACION);
    if (relacion) {
      relaciones.push({ a: relacion[1], multA: relacion[2], tipo: relacion[3], multB: relacion[4], b: relacion[5] });
      continue;
    }
    const suelto = linea.match(/^(\w+)\s*:\s*(.+)$/);
    if (suelto) miembro(suelto[1], suelto[2]);
  }

  const declaradas = [...clases].filter(([, c]) => c.declarada).map(([nombre]) => nombre);
  if (!declaradas.length) return ["No hay ninguna clase."];

  const problemas = [];

  const sinAtributos = declaradas.filter((n) => !clases.get(n).atributos);
  if (sinAtributos.length) problemas.push(`Clases sin atributos: ${listar(sinAtributos)}.`);

  const operaciones = declaradas.flatMap((n) => clases.get(n).operaciones);
  if (!operaciones.length) {
    problemas.push("Ninguna clase tiene operaciones: agrega a cada clase central las acciones que los requerimientos piden sobre ella (ej. +cerrar() void).");
  }
  const accesores = operaciones.filter((o) => /\b(get|set|obtener|establecer)[A-ZÁÉÍÓÚ]\w*\s*\(/.test(o));
  if (accesores.length) problemas.push(`Hay operaciones que solo leen o escriben un atributo (${listar(accesores, 3)}): quítalas y deja las acciones del negocio.`);

  const noDeclaradas = [...new Set(relaciones.flatMap((r) => [r.a, r.b]).filter((n) => !clases.get(n)?.declarada))];
  if (noDeclaradas.length) problemas.push(`Hay relaciones con clases que no están definidas: ${listar(noDeclaradas)}.`);

  const relacionadas = new Set(relaciones.flatMap((r) => [r.a, r.b]));
  const sueltas = declaradas.filter((n) => !relacionadas.has(n));
  if (sueltas.length && declaradas.length > 1) problemas.push(`Clases sin ninguna relación: ${listar(sueltas)}. Relaciónalas o elimínalas.`);

  // La herencia y la realización no llevan multiplicidad; las demás, en los dos extremos.
  const sinMultiplicidad = relaciones
    .filter((r) => !/<\||\|>/.test(r.tipo) && (!r.multA || !r.multB))
    .map((r) => `${r.a} – ${r.b}`);
  if (sinMultiplicidad.length) problemas.push(`Relaciones sin multiplicidad en los dos extremos: ${listar(sinMultiplicidad)}.`);

  if (/\bRN?F-?\s?\d+\b/i.test(codigo)) problemas.push("Hay códigos de requerimientos (RF/RNF) dentro del diagrama; elimínalos.");

  // Cada entidad del modelo de datos tiene su clase, con el mismo nombre.
  const nombres = new Set(declaradas.map(sinGuiones));
  const sinClase = entidades.filter((e) => !nombres.has(sinGuiones(e)));
  if (sinClase.length) {
    problemas.push(`Estas entidades del modelo de datos no tienen su clase (con el mismo nombre, sin guiones): ${listar(sinClase, 10)}.`);
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
    const { nombre, analisis, casosUso, diagramaEr, indicaciones, usarClaude } = await request.json();

    const a = analisis || {};
    const entidades = entidadesDelDominio(diagramaEr);

    const instrucciones = `
Genera un DIAGRAMA DE CLASES del dominio de "${nombre || "el sistema"}", en Mermaid (classDiagram).

Un diagrama de clases muestra las clases del dominio (las cosas que el sistema maneja) con sus atributos y sus operaciones, y cómo se relacionan entre sí. Cada clase dice qué datos tiene y QUÉ SABE HACER: sus operaciones salen de lo que los requerimientos piden sobre ella. De este diagrama se derivará después el modelo de datos.

CONTEXTO
- Actores:
${formatearActores(a)}
- Requerimientos funcionales (de aquí salen las clases, sus datos y sus operaciones):
${formatearRequerimientos(a.requerimientos_funcionales)}
${casosUso ? `- Diagrama de casos de uso aprobado (qué hace cada actor con el sistema):\n${casosUso}\n` : ""}${diagramaEr
  ? `- Modelo de datos que el proyecto ya tiene aprobado (entidad-relación). Las clases deben corresponder a sus entidades y usar sus mismos atributos:
${diagramaEr}
`
  : ""}${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
${diagramaEr
  ? `- CLASES: una por cada entidad del modelo de datos que representa un concepto del dominio, con el mismo nombre escrito en singular y sin guiones (ORDEN_SERVICIO → OrdenServicio).${entidades.length ? ` Son estas: ${entidades.join(", ")}.` : ""}
- Las tablas que solo unen a otras dos (sus únicas columnas son claves foráneas) NO son clases: se dibujan como una relación de muchos a muchos entre las dos clases que unen.
- ATRIBUTOS: los de la entidad, sin las claves foráneas (la relación ya las expresa), con visibilidad y tipo: "+String nombre".`
  : `- CLASES: una por cada concepto del dominio que el sistema registra, consulta o administra según los requerimientos (personas, cosas, documentos, eventos), con un nombre en singular y sin espacios (OrdenServicio). Recorre los requerimientos uno por uno: todo lo que se registra o se guarda debe tener su clase.
- Lo que se repite dentro de otra cosa (varios ítems por pedido, varias líneas por documento) es una clase propia, relacionada con la que la contiene; nunca un atributo de texto.
- Quienes inician sesión son una clase; lo que el sistema administra como lista propia (un catálogo, la nómina) es otra, salvo que los requerimientos digan que son lo mismo.
- ATRIBUTOS: los datos que los requerimientos mencionan para esa clase, con visibilidad y tipo: "+String nombre". No pongas como atributo la referencia a otra clase: eso lo expresa la relación.`}
- OPERACIONES: las acciones que los requerimientos piden sobre esa clase, con un verbo y paréntesis: "+cerrar() void". Incluye las validaciones y reglas como operaciones de la clase que las aplica (ej. "+tieneTrabajos() bool"). Las clases centrales deben tener operaciones; una clase que solo guarda datos puede no tener.
- RELACIONES, con la multiplicidad en los dos extremos y un verbo corto: Cliente "1" --> "0..*" Vehiculo : posee.
  - Asociación (-->) por defecto.
  - Composición (*--) cuando la parte no existe sin el todo (ej. las líneas de un documento).
  - Herencia (<|--) SOLO si los requerimientos describen tipos de una misma cosa que comparten datos y agregan los suyos.

QUÉ NO QUIERO
- No incluyas clases de interfaz, controladores, servicios ni de acceso a datos: solo las del dominio.
- No pongas operaciones que solo leen o escriben un atributo (getNombre, setEstado) ni constructores.
- No inventes clases, atributos ni operaciones que el contexto no justifique.
- No escribas códigos de requerimientos (RF/RNF) en el diagrama.
- No copies las clases del ejemplo; es de otro sistema y sirve solo para mostrar la sintaxis.

FORMATO
- Mermaid "classDiagram". Cada clase en un bloque: class Nombre { ... }.
- Nombres de clase sin espacios, tildes ni guiones. Etiquetas de relación de una palabra o varias unidas con guion bajo.
- No escribas la directiva de tema ni colores: la aplicación los agrega.
- En "explicacion", de 3 a 5 líneas cortas (una idea por línea, separadas con \\n) sobre cuáles son las clases centrales, qué operaciones concentran y cómo se relacionan. Solo afirma lo que el diagrama muestra.

Ejemplo de sintaxis válida (sistema ajeno, no copiar sus clases):
${EJEMPLO}

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
    let problemas = validarDiagrama(diagrama, entidades);
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
        const problemasNuevos = validarDiagrama(diagramaNuevo, entidades);
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
      diagrama_mermaid: conTema(diagrama),
      advertencias: problemas,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
