# I-CASE Tool

Herramienta **CASE asistida por inteligencia artificial** que genera los artefactos de cada fase del desarrollo de software a partir de la descripción de un sistema: requerimientos, diagramas UML, modelo de datos, prototipo de pantallas, arquitectura y, en la fase de Implementación, el stack técnico, la estructura de carpetas y la base de datos probada en contenedores.

**Documentación completa:** en `/docs` de la aplicación desplegada, o con `npm run docs` en local. Incluye manual de usuario, API, ingeniería de prompts y guía para desarrolladores.

## Objetivo

Acompañar a estudiantes y equipos de ingeniería de software desde la idea hasta el código base, con artefactos **coherentes entre sí**: cada uno se genera a partir de los anteriores ya aprobados. La IA propone; la persona revisa, edita y aprueba; y el código valida las reglas importantes.

## Funcionalidades principales

- Proyectos por usuario, con documento (PDF, Word o Excel) e imagen como contexto.
- **Contexto y entrevista**: la IA pregunta lo que falta antes de generar.
- **Flujo por pasos**: generar, revisar, editar a mano, *Ampliar con IA*, aprobar o rechazar, con actualización en cascada.
- Diagramas en **Mermaid** y **PlantUML**, con edición del código, pantalla completa y descarga SVG.
- **Prototipo de pantallas** web y móvil, pantalla por pantalla.
- **Informe del proyecto** exportable a PDF.
- **Implementación**: catálogo de piezas por tecnología, estructura de archivos con cobertura del diseño y base de datos probada en Docker.
- Elección de modelo: **Gemini** y **Groq** gratuitos (automático o uno elegido) o **Claude** (de pago, con aviso de costo).

## Fases y artefactos

| Fase | Artefactos |
|---|---|
| 01 Análisis | Preguntas de entrevista, actores, requerimientos funcionales y no funcionales (ISO/IEC 25010), diagrama de casos de uso |
| 02 Diseño | Diagrama de clases, entidad-relación, prototipo de pantallas, árbol de navegación, arquitectura, diagrama de sistemas, informe PDF |
| 03 Implementación | Stack técnico, estructura de carpetas, base de datos (migraciones y datos de prueba). *En construcción:* contrato de API, backend, web y móvil |

## Stack

| Capa | Tecnología |
|---|---|
| Aplicación (interfaz y API) | Next.js 16 (App Router, JavaScript), React 19, Tailwind CSS 4 |
| Datos y autenticación | Supabase (Auth, PostgreSQL con RLS, Storage) |
| IA | Google Gemini (`@google/genai`), Groq, Anthropic Claude (`@anthropic-ai/sdk`) |
| Diagramas | Mermaid (navegador) y PlantUML (Kroki) |
| Implementación | Docker y Docker Compose, mediante un runner local |
| Documentación | Docusaurus 3 con Mermaid y OpenAPI (Redocusaurus) |

## Requisitos previos

- Node.js 20 o superior
- Proyecto de Supabase
- Clave de Google AI Studio (Gemini), gratuita
- Opcionales: clave de Groq, clave de Anthropic y Docker Desktop (para la fase de Implementación)

## Instalación

```bash
git clone https://github.com/carlitosgiovanniramos/icase-tool.git
cd icase-tool
npm install
```

## Configuración del entorno

Crea `.env.local` en la raíz (no se sube al repositorio):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publicable>
GEMINI_API_KEY=<clave de Gemini>
KROKI_URL=https://kroki.io

# Opcionales
GROQ_API_KEY=<clave de Groq>
ANTHROPIC_API_KEY=<clave de Anthropic>      # Claude, solo con "Usar Claude" activado
# CLAUDE_MODELO=claude-sonnet-5
# GEMINI_MODELOS=gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3-flash-preview
# GROQ_MODELOS=openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b

# Fase de Implementación (runner de Docker)
RUNNER_URL=http://127.0.0.1:4100
RUNNER_TOKEN=<cadena larga y aleatoria>
# WORKSPACES_DIR=C:\icase-workspaces
```

En Supabase, ejecuta una vez en el SQL Editor cada script de `supabase/`. La lista y el orden están en la documentación (*Desarrolladores → Instalación*).

## Ejecutar

```bash
npm run dev      # I-CASE Tool en http://localhost:3000
npm run runner   # runner de Docker (solo para la Implementación)
npm run all      # los dos a la vez
npm run docs     # documentación en http://localhost:3001/docs/
npm run build    # documentación + aplicación para producción
```

## Estructura del repositorio

```text
app/          interfaz (App Router) y rutas de API (app/api/*)
lib/          lógica: IA, prompts y validación de cada paso, armador de proyectos
plantillas/   catálogo de piezas de Implementación (Supabase, Next.js, Flutter, Express, PostgreSQL…)
runner/       proceso local que ejecuta Docker
supabase/     scripts SQL de la base de I-CASE Tool
docs-site/    documentación (Docusaurus), servida en /docs; incluye el plan de implementación
```

## Capturas

| Proyecto en la fase de Diseño | Implementación: base de datos probada |
|---|---|
| ![Diseño](docs-site/static/img/capturas/07-diagrama-expandido.png) | ![Base de datos](docs-site/static/img/capturas/12-bomberos-base.png) |

## Mantenimiento

- **Modelos de IA:** solo se usan modelos gratuitos de Gemini y Groq; Claude es el único de pago. Al actualizar la lista, comprueba con una llamada real que el modelo responda con la clave gratuita (un 429 inmediato significa que no tiene cuota).
- **Cambios en prompts:** pruébalos con dos proyectos de temas distintos. Las reglas deben servir para cualquier sistema.
- **Lo importante lo valida el código:** si una regla importa, agrégala a la validación del paso, no solo al prompt.
- **Documentación:** al cambiar una funcionalidad, actualiza su página en `docs-site/docs/` en el mismo commit.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) y el [Código de conducta](CODE_OF_CONDUCT.md). Para temas de seguridad, [SECURITY.md](SECURITY.md). Historial de cambios en [CHANGELOG.md](CHANGELOG.md).

## Equipo

Proyecto académico desarrollado por un equipo de 4 integrantes: **CCAJ Software Solutions**.

## Licencia

[MIT](LICENSE).
