import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";

export const maxDuration = 300;

// Diagrama del sistema: vista complementaria a la arquitectura (que muestra el interior del
// backend). El tipo lo elige el usuario; por defecto, contexto.
const ESTILOS = `classDef sistema fill:#1e293b,stroke:#1e293b,color:#ffffff,stroke-width:2px;
    classDef actor fill:#eef2f6,stroke:#1e293b,color:#1e293b;
    classDef externo fill:#ffffff,stroke:#94a3b8,color:#334155,stroke-dasharray:4 3;`;

const TIPOS = {
  contexto: {
    nombre: "diagrama de contexto del sistema (nivel 1 del modelo C4)",
    reglas: `- El sistema es UN solo nodo central (no muestres su interior): SIS["Nombre del sistema"]
- Alrededor, cada actor humano como nodo y cada sistema externo con el que se integra (mapas, notificaciones, firma electrónica, sistemas de otras instituciones como el ECU-911, correo, etc.), solo si los requerimientos lo justifican
- Cada flecha lleva una etiqueta corta con QUÉ intercambian (ej. "Registra partes", "Envía ubicación", "Notifica alerta")
- Aplica las clases: sistema al nodo central, actor a los actores, externo a los sistemas externos`,
    ejemplo: `flowchart LR
    BOM["Bombero"]
    COM["Comandante"]
    SIS["Sistema de Gestión de Emergencias"]
    MAP["Servicio de Mapas"]
    ECU["ECU-911"]
    BOM -->|"Registra partes y firma"| SIS
    SIS -->|"Métricas en tiempo real"| COM
    SIS -->|"Consulta ubicación"| MAP
    ECU -->|"Envía avisos de emergencia"| SIS
    ${ESTILOS}
    class SIS sistema
    class BOM,COM actor
    class MAP,ECU externo`,
  },
  despliegue: {
    nombre: "diagrama de despliegue (dónde se ejecuta cada parte)",
    reglas: `- Un subgraph por cada nodo físico o de nube: dispositivos de los usuarios (celular, navegador), servidor o nube de la aplicación, base de datos y almacenamiento, servicios externos
- Dentro de cada subgraph, los componentes que corren ahí
- Cada flecha lleva el protocolo o medio de comunicación (ej. "HTTPS", "WebSocket", "SQL", "Push")
- Aplica las clases: sistema a los componentes propios, actor a los dispositivos de usuario, externo a los servicios externos`,
    ejemplo: `flowchart LR
    subgraph CEL["Celular del bombero"]
        APP["App móvil"]
    end
    subgraph NUBE["Nube"]
        API["Backend"]
    end
    subgraph DATOS["Datos"]
        DB[("Base de datos")]
    end
    APP -->|"HTTPS"| API
    API -->|"SQL"| DB
    ${ESTILOS}
    class API,DB sistema
    class APP actor`,
  },
  flujo: {
    nombre: "diagrama de flujo del proceso principal del sistema, de punta a punta",
    reglas: `- Identifica el proceso principal que el sistema automatiza y muéstralo de inicio a fin
- Inicio y fin con forma de estadio: INI(["Inicio"]); acciones como rectángulos; decisiones como rombos: D1{"¿Condición?"}
- Las salidas de cada decisión llevan etiqueta ("Sí" / "No")
- Si participan varios actores, agrupa sus pasos en un subgraph por actor
- Aplica las clases: sistema a los pasos que hace el sistema automáticamente, actor a los pasos que hace una persona`,
    ejemplo: `flowchart TD
    INI(["Llega un aviso"])
    A["Crear parte de emergencia"]
    D1{"¿Requiere rescate?"}
    B["Registrar datos del rescate"]
    C["Firmar y cerrar el parte"]
    FIN(["Parte archivado"])
    INI --> A --> D1
    D1 -->|"Sí"| B --> C
    D1 -->|"No"| C
    C --> FIN
    ${ESTILOS}
    class A,B,C actor
    class FIN sistema`,
  },
  componentes: {
    nombre: "diagrama de componentes (módulos internos del sistema y sus dependencias)",
    reglas: `- Un nodo por cada módulo funcional del sistema, agrupados en subgraph por capa si ayuda a leerlo
- Flechas de dependencia con etiqueta corta de lo que usa un módulo del otro (ej. "valida sesión", "consulta vehículos")
- Incluye los servicios externos que usa algún módulo
- Aplica las clases: sistema a los módulos propios, externo a los servicios externos`,
    ejemplo: `flowchart LR
    AUTH["Autenticación"]
    PARTES["Partes de emergencia"]
    CAT["Catálogos"]
    NOT["Notificaciones"]
    PARTES -->|"valida sesión"| AUTH
    PARTES -->|"consulta vehículos"| CAT
    PARTES -->|"envía alertas"| NOT
    ${ESTILOS}
    class AUTH,PARTES,CAT,NOT sistema`,
  },
};

export async function POST(request) {
  try {
    const {
      analisis,
      tipo,
      plataformas,
      tecnologias,
      diagramaArquitectura,
      indicaciones,
      usarClaude,
    } = await request.json();

    const definicion = TIPOS[tipo] || TIPOS.contexto;

    const instrucciones = `
Eres un arquitecto de software experto. Genera el ${definicion.nombre}, en sintaxis Mermaid (flowchart). Debe ser una vista distinta y complementaria al diagrama de arquitectura: no repitas su estructura interna de capas.

Actores:
${formatearActores(analisis)}

Requerimientos funcionales:
${formatearRequerimientos(analisis.requerimientos_funcionales)}

Requerimientos no funcionales:
${formatearRequerimientos(analisis.requerimientos_no_funcionales, { conCategoria: true })}
${plataformas?.length ? `\nPlataformas: ${plataformas.join(", ")}\n` : ""}${tecnologias?.trim() ? `Tecnologías elegidas: ${tecnologias.trim()}\n` : ""}${diagramaArquitectura ? `\nDiagrama de arquitectura aprobado (referencia para ser coherente, no para copiarlo):\n${diagramaArquitectura}\n` : ""}${formatearIndicaciones(indicaciones)}
Reglas para el diagrama:
${definicion.reglas}
- Usa comillas dobles en todos los textos de nodos y etiquetas
- Define al final estas clases exactamente así y aplícalas:
    ${ESTILOS}

Ejemplo de sintaxis válida:
${definicion.ejemplo}

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
    return NextResponse.json({
      ...resultado,
      modelo_ia: response.modelVersion,
      costo_ia: response.costoUsd,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
