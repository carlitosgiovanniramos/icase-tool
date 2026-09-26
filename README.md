# I-CASE Tool

Herramienta I-CASE (Computer-Aided Software Engineering asistida por IA) que, a partir de un prompt de texto describiendo una idea de software (ej. "app de citas médicas"), genera automáticamente los productos de análisis y diseño: actores y stakeholder map, requerimientos funcionales y no funcionales, diagrama de casos de uso, diagrama de arquitectura general y un prototipo de pantallas.

Proyecto académico — Primer parcial: fases de **Análisis y Diseño**. La implementación y pruebas (generación de código completo y ejecución en sandbox) quedan planificadas para el segundo parcial.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js (JavaScript, App Router) |
| Estilos | Tailwind CSS |
| Base de datos | Supabase (PostgreSQL) |
| Motor de IA | API de Google Gemini (respaldo opcional: Groq) |
| Renderizado de diagramas | mermaid.js *(pendiente de integrar)* |

## Requisitos previos

- Node.js instalado (v18 o superior)
- Cuenta de Supabase con un proyecto creado
- API key de Google AI Studio (Gemini) — gratuita, sin tarjeta de crédito

## Instalación

```bash
git clone <url-del-repositorio>
cd icase-tool
npm install
```

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto (no se sube al repositorio) con:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=tu_project_url_de_supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key_de_supabase
GEMINI_API_KEY=tu_api_key_de_gemini

# Opcional: respaldo cuando todos los modelos de Gemini están saturados (clave gratuita en console.groq.com)
GROQ_API_KEY=tu_api_key_de_groq

# Opcional: Claude (de pago) para pruebas reales. Solo se usa con el interruptor
# "Usar Claude" de la barra lateral activado. Modelo por defecto: claude-sonnet-5
ANTHROPIC_API_KEY=tu_api_key_de_anthropic
# CLAUDE_MODELO=claude-sonnet-5

# Opcional: orden de modelos a probar (separados por comas)
# GEMINI_MODELOS=gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3-flash-preview
# GROQ_MODELOS=openai/gpt-oss-120b,openai/gpt-oss-20b
```

Cada integrante debe generar sus propias credenciales de desarrollo, o solicitar las del proyecto compartido al equipo.

## Correr el proyecto en local

```bash
npm run dev
```

Luego abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Estructura del proyecto

```text
app/
  layout.js          → Layout base: menú lateral + área de contenido
  page.js             → Pantalla "Mis proyectos" (lista, lee de Supabase)
  crear/page.js        → Formulario de creación de proyecto (guarda en Supabase)
  proyectos/[id]/page.js → Workspace de un proyecto (pendiente: 5 pestañas de resultados)
lib/
  supabaseClient.js    → Cliente de conexión a Supabase
```

## Base de datos

Tabla `proyectos` en Supabase:

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único (autogenerado) |
| `nombre` | text | Nombre del proyecto |
| `prompt` | text | Descripción/idea de software ingresada por el usuario |
| `created_at` | timestamptz | Fecha de creación (autogenerada) |

RLS (Row Level Security) habilitado con política de acceso abierto para desarrollo — pendiente de restringir cuando se agregue autenticación de usuarios.

## Estado actual

- [x] Estructura base del proyecto (Next.js + Tailwind)
- [x] Layout con navegación (menú lateral)
- [x] Conexión con Supabase
- [x] Creación y listado de proyectos
- [x] Ruta dinámica de workspace por proyecto
- [ ] Conexión con la API de Gemini
- [ ] Generación de actores + requerimientos funcionales/no funcionales
- [ ] Generación y renderizado de diagrama de casos de uso
- [ ] Generación y renderizado de diagrama de arquitectura
- [ ] Generación de prototipo de pantallas

## Equipo

Proyecto desarrollado en equipo de 4 integrantes — CCAJ Software Solutions.