import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

export async function POST(request) {
  try {
    const {
      analisis,
      diagramaEr,
      arbolNavegacion,
      plataformas,
      tecnologias,
      calidad,
      indicaciones,
      usarClaude,
    } = await request.json();

    const conMovil = (plataformas || []).some((p) => /m[oó]vil/i.test(p));

    const funcionales = formatearRequerimientos(analisis.requerimientos_funcionales);
    const noFuncionales = formatearRequerimientos(analisis.requerimientos_no_funcionales, {
      conCategoria: true,
    });

    let contextoDiseno = "";
    if (diagramaEr) {
      contextoDiseno += `
Modelo de datos aprobado (diagrama entidad-relación en Mermaid):
${diagramaEr}
`;
    }
    if (arbolNavegacion) {
      contextoDiseno += `
Árbol de navegación aprobado (Mermaid):
${arbolNavegacion}
`;
    }
    if (contextoDiseno) {
      contextoDiseno += `
Los módulos del backend deben ser coherentes con las entidades del modelo de datos y las secciones del árbol de navegación.
`;
    }

    const instrucciones = `
Eres un arquitecto de software experto. Diseña la arquitectura general en capas del sistema, basada en estos requerimientos:

Requerimientos funcionales:
${funcionales}

Requerimientos no funcionales (con prioridad; los de prioridad alta deben notarse en la arquitectura):
${noFuncionales}
${contextoDiseno}
Clientes del sistema: ${conMovil ? "un PANEL WEB y una APP MÓVIL (son dos clientes distintos)" : "un PANEL WEB"}.
${tecnologias?.trim() ? `Tecnologías elegidas por el cliente (úsalas en las etiquetas de los componentes que correspondan): ${tecnologias.trim()}` : "No hay tecnologías definidas: no inventes marcas ni productos concretos, usa nombres genéricos."}
${formatearIndicaciones(indicaciones)}
${calidad?.length ? `Atributos de calidad prioritarios para el cliente: ${calidad.join(", ")}.\n` : ""}
Genera el diagrama con la sintaxis "flowchart TD" de Mermaid, organizado en capas de arriba hacia abajo. Cada capa es un subgraph:

1. subgraph CLIENTES["Clientes"]: WEB["Panel Web"]${conMovil ? ' y MOVIL["App Móvil"]' : ""}.${conMovil ? ' Si hay uso sin conexión, agrega LOCAL["Almacenamiento Local"] conectado desde MOVIL.' : ""}
2. subgraph BACKEND["Backend"] (usa como título la tecnología del backend si está definida): un nodo por cada módulo funcional relevante. Puedes agrupar módulos afines en un solo nodo con un guion largo (ej. "API de Datos — Partes / Catálogos / Bitácora"). Agrega componentes transversales SOLO si los requerimientos o atributos de calidad los justifican:
   - Tiempo Real, si hay chat, alertas o ubicación en vivo
   - Notificaciones, si hay avisos o alertas a usuarios
   - Auditoría, si hay trazabilidad, bitácora o registros que no se pueden alterar
   - Reportes o PDF, si hay exportación de informes
   - Sincronización, si la app trabaja sin conexión
3. subgraph DATOS["Datos"]: DB["Base de Datos"]; ARCH["Archivos"] si se guardan fotos, firmas o documentos; un nodo de respaldos si hay copias de seguridad.
4. subgraph EXTERNOS["Servicios Externos"], solo si los requerimientos los implican: un nodo por cada uno (mapas o geolocalización, notificaciones push, correo o SMS, firma electrónica, biometría, sistemas de otras instituciones). No inventes servicios externos que los requerimientos no justifiquen.

Conexiones:
- Cada cliente con los módulos del backend que usa; cada módulo con los datos que lee o escribe; cada servicio externo desde el componente que lo usa.
- Flechas simples --> sin etiquetas. No conectes todo con todo: solo las dependencias reales.

Reglas de sintaxis:
- Ids en MAYÚSCULAS sin espacios ni tildes (WEB, MOVIL, AUTH, DB...). Todos los textos entre comillas dobles; pueden llevar tildes, paréntesis y guiones.
- Si hay tecnologías definidas, ponlas entre paréntesis en la etiqueta (ej. "App Móvil (Flutter)").
- Al final define EXACTAMENTE estas clases y asigna cada nodo a la de su capa:
    classDef cliente fill:#ffffff,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef backend fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef datos fill:#dbeafe,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef externo fill:#fff7ed,stroke:#c2410c,color:#7c2d12,stroke-width:1px;

Ejemplo de sintaxis válida:
flowchart TD
    subgraph CLIENTES["Clientes"]
        WEB["Panel Web (Next.js)"]
        MOVIL["App Móvil (Flutter)"]
        LOCAL["Almacenamiento Local (SQLite)"]
    end

    subgraph BACKEND["Supabase"]
        AUTH["Autenticación"]
        API["API de Datos — Partes / Catálogos / Bitácora"]
        REALTIME["Tiempo Real — Chat y Ubicación"]
        FUNC["Funciones — PDF / Sincronización / Notificaciones / Auditoría"]
    end

    subgraph DATOS["Datos"]
        DB["Base de Datos PostgreSQL"]
        ARCH["Archivos — Fotos, Firmas y PDFs"]
    end

    subgraph EXTERNOS["Servicios Externos"]
        MAPS["Google Maps"]
        FCM["Firebase Cloud Messaging"]
    end

    WEB --> AUTH
    WEB --> API
    WEB --> REALTIME
    MOVIL --> AUTH
    MOVIL --> API
    MOVIL --> LOCAL
    MOVIL --> MAPS
    LOCAL --> FUNC

    AUTH --> DB
    API --> DB
    API --> ARCH
    REALTIME --> DB
    FUNC --> DB
    FUNC --> ARCH
    FUNC --> FCM

    classDef cliente fill:#ffffff,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef backend fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef datos fill:#dbeafe,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef externo fill:#fff7ed,stroke:#c2410c,color:#7c2d12,stroke-width:1px;

    class WEB,MOVIL,LOCAL cliente;
    class AUTH,API,REALTIME,FUNC backend;
    class DB,ARCH datos;
    class MAPS,FCM externo;

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