import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

export async function POST(request) {
  try {
    const { analisis, casosUso, indicaciones, usarClaude } = await request.json();

    const contextoCasosUso = casosUso
      ? `
Diagrama de casos de uso aprobado (Mermaid), úsalo para identificar qué información manipula cada caso de uso:
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
${contextoCasosUso}${formatearIndicaciones(indicaciones)}
Genera el diagrama usando la sintaxis "erDiagram" de Mermaid, con esta estructura:
- Empieza SIEMPRE con esta directiva de tema para que todas las entidades se vean uniformes (blanco con borde y texto navy), en vez de que Mermaid les asigne un color distinto y aleatorio a cada una:
  %%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffffff", "primaryBorderColor": "#1e293b", "primaryTextColor": "#1e293b", "lineColor": "#1e293b", "tertiaryColor": "#f1f5f9", "fontFamily": "trebuchet ms, verdana, arial, sans-serif"}}}%%
- Luego, en una nueva línea, "erDiagram"
- Declara cada entidad con sus atributos principales usando bloques { tipo nombre }
- Marca la clave primaria de cada entidad con "PK" y las claves foráneas con "FK"
- Declara las relaciones entre entidades usando notación de pata de gallo (ej: ||--o{ para uno a muchos)
- Añade una etiqueta corta a cada relación describiendo su significado

Ejemplo de sintaxis válida:
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffffff", "primaryBorderColor": "#1e293b", "primaryTextColor": "#1e293b", "lineColor": "#1e293b", "tertiaryColor": "#f1f5f9", "fontFamily": "trebuchet ms, verdana, arial, sans-serif"}}}%%
erDiagram
    ESTUDIANTE {
        int id PK
        string nombre
        string correo
    }
    PRESTAMO {
        int id PK
        int estudiante_id FK
        date fecha
    }
    ESTUDIANTE ||--o{ PRESTAMO : realiza

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