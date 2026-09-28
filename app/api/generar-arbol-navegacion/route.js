import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

const ESTILOS = `classDef raiz fill:#1e293b,stroke:#1e293b,color:#ffffff,stroke-width:2px;
    classDef plataforma fill:#475569,stroke:#1e293b,color:#ffffff,stroke-width:1px;
    classDef seccion fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef pantalla fill:#ffffff,stroke:#94a3b8,color:#334155,stroke-width:1px;`;

// Una rama por plataforma (web y app móvil comparten backend, pero cada una tiene su propia
// navegación). Cada pantalla muestra los RF que cubre y cada sección el rol que la usa.
const EJEMPLO_VARIAS_PLATAFORMAS = `flowchart TD
    RAIZ(["Sistema de Bomberos"])
    WEB["Panel Web"]
    MOV["App Móvil"]
    RAIZ --> WEB
    RAIZ --> MOV

    WEB_1["Monitoreo<br/>Comandante"]
    WEB_1_1["Dashboard de métricas<br/>RF08, RF09"]
    WEB_1_2["Historial de partes<br/>RF10"]
    WEB_2["Catálogos<br/>Administrador"]
    WEB_2_1["Vehículos<br/>RF12"]
    WEB --> WEB_1
    WEB_1 --> WEB_1_1
    WEB_1 --> WEB_1_2
    WEB --> WEB_2
    WEB_2 --> WEB_2_1

    MOV_1["Partes<br/>Bombero"]
    MOV_1_1["Registro de emergencia<br/>RF02, RF03"]
    MOV_1_2["Firma del parte<br/>RF06"]
    MOV --> MOV_1
    MOV_1 --> MOV_1_1
    MOV_1 --> MOV_1_2

    ${ESTILOS}
    class RAIZ raiz
    class WEB,MOV plataforma
    class WEB_1,WEB_2,MOV_1 seccion
    class WEB_1_1,WEB_1_2,WEB_2_1,MOV_1_1,MOV_1_2 pantalla`;

const EJEMPLO_UNA_PLATAFORMA = `flowchart TD
    RAIZ(["Sistema de Biblioteca"])
    SEC1["Catálogo<br/>Lector"]
    SEC1_1["Buscar libro<br/>RF01"]
    SEC1_2["Detalle de libro<br/>RF02"]
    SEC2["Préstamos<br/>Bibliotecario"]
    SEC2_1["Registrar préstamo<br/>RF03, RF04"]
    RAIZ --> SEC1
    SEC1 --> SEC1_1
    SEC1 --> SEC1_2
    RAIZ --> SEC2
    SEC2 --> SEC2_1

    ${ESTILOS}
    class RAIZ raiz
    class SEC1,SEC2 seccion
    class SEC1_1,SEC1_2,SEC2_1 pantalla`;

// Acepta la lista de pantallas como objetos { nombre, plataforma, rfs, actores } o, en proyectos
// antiguos, como nombres sueltos.
function normalizarPantallas(pantallas = []) {
  return pantallas.map((p) => (typeof p === "string" ? { nombre: p } : p));
}

export async function POST(request) {
  try {
    const { analisis, pantallas, indicaciones, usarClaude } = await request.json();

    const lista = normalizarPantallas(pantallas);
    const plataformas = [...new Set(lista.map((p) => p.plataforma).filter(Boolean))];
    const variasPlataformas = plataformas.length > 1;

    const contextoPantallas = lista.length
      ? `
Pantallas del prototipo aprobado. El árbol debe incluirlas TODAS, con estos mismos nombres y en la plataforma indicada:
${lista
  .map((p) =>
    [
      `- ${p.nombre}`,
      p.plataforma && `plataforma: ${p.plataforma}`,
      p.actores?.length && `usada por: ${p.actores.join(", ")}`,
      p.rfs?.length && `cubre: ${p.rfs.join(", ")}`,
    ]
      .filter(Boolean)
      .join(" | ")
  )
  .join("\n")}
`
      : "";

    const instrucciones = `
Eres un arquitecto de información experto. Con base en este análisis aprobado, diseña el árbol de navegación del sistema: qué pantallas existen y cómo se organizan jerárquicamente.

Actores:
${formatearActores(analisis)}

Requerimientos funcionales (con los actores que usan cada función):
${formatearRequerimientos(analisis.requerimientos_funcionales)}
${contextoPantallas}${formatearIndicaciones(indicaciones)}
Genera el árbol con la sintaxis "flowchart TD" de Mermaid (cajas y líneas de diagrama técnico, NO un mindmap):
- Un único nodo raíz con forma de estadio: RAIZ(["Nombre del sistema"])
${variasPlataformas
  ? `- El sistema tiene VARIAS aplicaciones (${plataformas.join(", ")}) que comparten el backend pero tienen navegación propia: los hijos directos de la raíz son un nodo por plataforma (ej. WEB["Panel Web"], MOV["App Móvil"]), y cada pantalla va SOLO bajo la rama de su plataforma.
- Bajo cada plataforma, las secciones de navegación y dentro de ellas sus pantallas. Ids con el prefijo de su plataforma (WEB_1, WEB_1_1, MOV_1...).`
  : "- Los hijos directos de la raíz son las secciones principales de navegación, y dentro de cada sección sus pantallas."}
- Organiza las secciones de modo que cada rol encuentre lo suyo: en la segunda línea de cada sección indica el rol o los roles que la usan (ej. "Monitoreo<br/>Comandante").
- En la segunda línea de cada pantalla indica los RF que cubre (ej. "Historial de partes<br/>RF10"). Si una pantalla no cubre ningún RF, deja solo su nombre.
- Todos los textos entre comillas dobles; usa <br/> para el salto de línea.
- Conecta con --> de padre a hijo.
- Al final define EXACTAMENTE estas clases y asigna cada nodo a su nivel:
    ${ESTILOS}

Ejemplo de sintaxis válida:
${variasPlataformas ? EJEMPLO_VARIAS_PLATAFORMAS : EJEMPLO_UNA_PLATAFORMA}

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "diagrama_mermaid": "código mermaid completo aquí, como un solo string"
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
