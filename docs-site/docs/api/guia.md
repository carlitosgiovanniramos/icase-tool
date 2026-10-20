---
title: Guía de la API
sidebar_position: 2
---

# Guía de la API

La especificación completa, con cada parámetro y respuesta, está en la **[Referencia OpenAPI](/api/referencia)**. El archivo fuente es `docs-site/openapi/icase-tool.yaml`. Esta página resume las convenciones.

## Convenciones

- **Base:** la misma URL de la aplicación (`http://localhost:3000` en local).
- **Formato:** peticiones y respuestas en JSON (`Content-Type: application/json`).
- **Autenticación:** cookie de sesión de Supabase, la que deja el inicio de sesión. Sin sesión, `proxy.js` responde **307** hacia `/login`. No hay claves de API para clientes externos: la API la consume la propia interfaz.
- **Preferencia de modelo:** todas las rutas de generación aceptan `usarClaude`:
  - `true`: responde solo Claude;
  - `"gemini-3.8-flash"`, `"groq:openai/gpt-oss-120b"`…: solo ese modelo gratuito;
  - `false` u omitido: automático, primero Gemini y luego Groq.
- **Campos comunes de respuesta:**
  - `modelo_ia`: el modelo que respondió (ej. `gemini-3.8-flash`, `claude:claude-sonnet-5`).
  - `costo_ia`: costo estimado en dólares, solo si respondió Claude.
  - `advertencias`: lo que la validación no pudo corregir; se muestra en "Revisar antes de aprobar".
- **Errores:** `{ "error": "mensaje legible" }` con su código de estado.

## Endpoints

| Método | Ruta | Fase | Qué hace | Salida principal |
|---|---|---|---|---|
| POST | `/api/procesar-documento` | Análisis | Extrae el texto de un PDF, Word o Excel subido a Storage | `texto` |
| POST | `/api/generar-preguntas` | Análisis | Preguntas de la entrevista | `preguntas[]` |
| POST | `/api/generar-analisis` | Análisis | Actores y requerimientos | JSON de análisis |
| POST | `/api/ampliar-analisis` | Análisis | Modifica el análisis según una instrucción | JSON de análisis |
| POST | `/api/generar-casos-uso` | Análisis | Diagrama de casos de uso | `diagrama_mermaid` |
| POST | `/api/generar-diagrama-clases` | Diseño | Diagrama de clases | `diagrama_mermaid` |
| POST | `/api/generar-diagrama-er` | Diseño | Diagrama entidad-relación | `diagrama_mermaid` |
| POST | `/api/proponer-pantallas` | Diseño | Lista de pantallas del prototipo | `pantallas[]` |
| POST | `/api/generar-mockups` | Diseño | Una pantalla del prototipo | `html` |
| POST | `/api/modificar-pantalla` | Diseño | Cambia una pantalla según una instrucción | `html` |
| POST | `/api/generar-arbol-navegacion` | Diseño | Árbol de navegación | `diagrama_mermaid` |
| POST | `/api/generar-arquitectura` | Diseño | Diagrama de arquitectura | `diagrama_mermaid` |
| POST | `/api/generar-diagrama-sistema` | Diseño | Diagrama de sistemas | `diagrama_plantuml` |
| POST | `/api/modificar-diagrama` | Diseño | Cambia cualquier diagrama según una instrucción | `codigo` |
| POST | `/api/renderizar-diagrama` | Diseño | Dibuja PlantUML con Kroki | `svg` |
| POST | `/api/generar-stack` | Implementación | Stack técnico | Ficha del stack |
| POST | `/api/revisar-stack` | Implementación | Revalida una ficha editada a mano (sin IA) | Ficha del stack |
| POST | `/api/generar-estructura` | Implementación | Estructura de carpetas | Ficha de la estructura |
| POST | `/api/generar-bd` | Implementación | Un archivo SQL (migración o datos de prueba) | `contenido` |
| POST | `/api/implementacion` | Implementación | Archivos del proyecto, ejecución y prueba de la base (vía runner) | Según la acción |
| GET | `/api/modelos-ia` | General | Modelos gratuitos disponibles y en pausa | `modelos[]` |
| GET | `/api/exportar-diseno` | Solo desarrollo | Respaldo local de los diseños | `guardados` |
| GET | `/api/importar-prototipo` | Solo desarrollo | Restaura un prototipo desde un respaldo | — |

## Códigos de estado

| Código | Significado en I-CASE Tool |
|---|---|
| 200 | Generado o ejecutado. Puede traer `advertencias` |
| 307 | Sin sesión: redirección a `/login` |
| 400 | Faltan datos (ej. *"Falta el stack técnico aprobado."*) o la acción no es válida |
| 403 | No se pudo modificar el proyecto (no es tuyo) |
| 404 | Proyecto inexistente, o ruta solo de desarrollo en producción |
| 500 | Falló la IA, el runner o Supabase. El mensaje explica el motivo (ej. *"Ningún modelo de Gemini ni de Groq pudo responder…"*) |
| 502 | Kroki no pudo dibujar el diagrama |
| 503 | El runner no está encendido |

## Ejemplo: generar el diagrama de clases

```http
POST /api/generar-diagrama-clases
Content-Type: application/json
Cookie: sb-…-auth-token=…

{
  "nombre": "Sistema de citas médicas",
  "analisis": { "actores": [ … ], "requerimientos_funcionales": [ … ], "requerimientos_no_funcionales": [ … ] },
  "casosUso": "flowchart LR …",
  "indicaciones": "Agrupa las clases por módulo",
  "usarClaude": false
}
```

```json
{
  "diagrama_mermaid": "classDiagram\n    class Paciente {\n      +int id\n      +string nombre\n    }\n    …",
  "explicacion": "Las clases se agrupan en tres módulos…",
  "advertencias": [],
  "modelo_ia": "gemini-3.8-flash"
}
```

## Ejemplo: probar la base de datos

```http
POST /api/implementacion
Content-Type: application/json

{ "proyectoId": "10784326-7058-4a78-ac13-d0470623a5d5", "accion": "probar-bd" }
```

```json
{
  "ok": true,
  "tablas": [ { "tabla": "parte", "rls": true, "politicas": 4, "filas": 5, "api": true } ],
  "usuarios": 3,
  "vacias": [],
  "cobertura": { "tablas": [22, 22], "rls": [22, 22], "datos": [22, 22] },
  "advertencias": []
}
```

## Límites de uso

| Límite | Valor |
|---|---|
| Duración de una ruta de generación | 300 s (`maxDuration`) |
| Espera para que un modelo de Gemini empiece a responder | 45 s, luego pasa al siguiente |
| Salida máxima con Claude | 32 000 tokens (`CLAUDE_MAX_TOKENS`) |
| Salida máxima con Groq | 6 000 tokens (`GROQ_MAX_TOKENS_SALIDA`) |
| Cuota de Gemini y Groq | La de sus planes gratuitos. Un modelo sin cuota queda en pausa el tiempo que indica Google |
| Cuerpo de una petición al runner | 20 MB |
