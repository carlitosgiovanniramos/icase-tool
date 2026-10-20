---
title: Arquitectura y comunicación
sidebar_position: 1
---

# Arquitectura y comunicación

I-CASE Tool es una aplicación **Next.js 16** (App Router). La interfaz y la API viven en el mismo proyecto: cada artefacto se genera llamando a una **ruta de API** propia (`/api/generar-…`), que arma el prompt, llama al modelo de IA, **valida** la respuesta y la devuelve al navegador. El navegador guarda el resultado en **Supabase** con la sesión del usuario.

```mermaid
flowchart LR
    U["Navegador<br/>(React)"] -- "fetch POST /api/…<br/>cookie de sesión" --> P["proxy.js<br/>exige sesión"]
    P --> R["Rutas de API<br/>app/api/*/route.js"]
    R --> L["Lógica<br/>lib/*.js"]
    L --> G["Google Gemini<br/>(gratuito)"]
    L --> Q["Groq<br/>(gratuito, respaldo)"]
    L --> C["Anthropic Claude<br/>(de pago, opcional)"]
    R --> K["Kroki<br/>PlantUML → SVG"]
    U -- "datos del proyecto<br/>(RLS por usuario)" --> S[("Supabase<br/>Auth · PostgreSQL · Storage")]
    R -- "solo /api/implementacion" --> RN["Runner local<br/>runner/index.mjs"]
    RN --> DK["Docker<br/>proyectos generados"]
```

## Componentes

| Componente | Dónde | Qué hace |
|---|---|---|
| Interfaz | `app/(app)/…` | Páginas del proyecto, fases, fichas y explorador de archivos |
| Control de acceso | `proxy.js` | Toda ruta, incluida `/api/*`, exige sesión de Supabase; sin sesión redirige a `/login` (307). `/docs` es pública |
| Rutas de API | `app/api/*/route.js` | Un endpoint por paso. Reciben JSON y devuelven JSON |
| Lógica de IA | `lib/gemini.js`, `lib/groq.js`, `lib/claude.js` | Un punto único (`generarContenido`) decide qué modelo responde |
| Lógica de cada paso | `lib/stack.js`, `lib/estructura.js`, `lib/bd.js`… | Prompts, validación determinista y reintento |
| Persistencia | Supabase | Usuarios (Auth), proyectos y artefactos (PostgreSQL con RLS), archivos (Storage) |
| Runner | `runner/index.mjs` | Proceso local que ejecuta Docker: levanta y prueba los proyectos generados. Escucha solo en `127.0.0.1` y exige un token |

## Flujo de una generación

```mermaid
sequenceDiagram
    participant N as Navegador
    participant A as Ruta /api/generar-…
    participant IA as Modelo de IA
    participant S as Supabase
    N->>A: POST { artefactos aprobados, indicaciones, usarClaude }
    A->>A: arma el prompt (CONTEXTO / QUÉ DEBE MOSTRAR / QUÉ NO QUIERO / FORMATO)
    A->>IA: genera
    IA-->>A: respuesta (JSON, Mermaid, PlantUML, HTML o SQL)
    A->>A: valida contra el diseño y el catálogo
    alt hay problemas
        A->>IA: reintento con la lista de problemas
        IA-->>A: respuesta corregida
    end
    A-->>N: 200 { artefacto, advertencias, modelo_ia, costo_ia }
    N->>S: guarda el artefacto en el proyecto
```

Las rutas **no guardan**: devuelven el artefacto y el navegador lo guarda en `proyectos` (una columna por paso) con la sesión del usuario. Así las políticas RLS de Supabase garantizan que cada usuario solo modifique sus proyectos.

## Tiempos

Las rutas de generación tienen `maxDuration = 300` segundos. La cadena de modelos usa ese presupuesto: si un modelo no empieza a responder en 45 segundos, se pasa al siguiente. Los pasos largos (prototipo y base de datos) se piden **por partes**, una pantalla o un archivo por petición, para no superar ese límite.
