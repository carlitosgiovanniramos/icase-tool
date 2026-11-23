---
title: Instalación y ejecución
sidebar_position: 1
---

# Instalación y ejecución

## Requisitos previos

| Requisito | Para qué |
|---|---|
| Node.js 20 o superior | Aplicación y documentación |
| Proyecto de Supabase | Usuarios, proyectos y archivos |
| Clave de Google AI Studio (Gemini) | IA, gratuita |
| Claves de Groq, Kimi y Mistral (opcionales) | Respaldos gratuitos de IA (Kimi y Mistral, por NVIDIA) |
| Clave de Anthropic (opcional) | Claude, de pago |
| Docker Desktop (opcional) | Solo para ejecutar los proyectos generados, probar su base y backend y compilar su frontend (fase de Implementación). En un servidor, Docker Engine |

## Instalación

```bash
git clone https://github.com/carlitosgiovanniramos/icase-tool.git
cd icase-tool
npm install
```

## Variables de entorno

Crea `.env.local` en la raíz. No se sube al repositorio.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave publicable>
GEMINI_API_KEY=<clave de Gemini>
KROKI_URL=https://kroki.io

# Opcionales
GROQ_API_KEY=<clave de Groq>
KIMI_API_KEY=<clave de NVIDIA para Kimi>
MISTRAL_API_KEY=<clave de NVIDIA para Mistral>
ANTHROPIC_API_KEY=<clave de Anthropic>
# CLAUDE_MODELO=claude-haiku-5-5      # el que se usa si no se elige otro en la barra lateral
# CLAUDE_MAX_TOKENS=64000
# GEMINI_MODELOS=gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3-flash-preview
# GROQ_MODELOS=openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b

# Fase de Implementación (runner de Docker)
RUNNER_URL=http://127.0.0.1:4100
RUNNER_TOKEN=<cadena larga y aleatoria>
# WORKSPACES_DIR=C:\icase-workspaces
```

### Runner en un servidor

Para ejecutar los proyectos desde la versión publicada, el runner corre en un servidor (por ejemplo una máquina virtual con Docker y Caddy) y `RUNNER_URL` apunta a él. Variables del runner:

| Variable | Qué hace |
|---|---|
| `RUNNER_TOKEN` | Clave compartida con I-CASE Tool (obligatoria) |
| `RUNNER_PORT` | Puerto del runner (4100 por defecto) |
| `WORKSPACES_DIR` | Carpeta de trabajo de los proyectos (`/srv/icase-workspaces` en Linux) |
| `DIRECCION_PUBLICA` | Nombre DNS del servidor. Con él, cada puerto de un proyecto se publica por HTTPS con Caddy en el puerto + 10000 |
| `CADDY_PROYECTOS`, `CADDY_CONFIG` | Carpeta con un sitio de Caddy por proyecto y el Caddyfile que la importa |
| `RUNNER_INACTIVIDAD_MIN` | Minutos sin uso antes de apagar un proyecto (60) |
| `RUNNER_MAX_RESPALDOS` | Respaldos que se conservan por proyecto al borrar sus datos (10) |

Sin `DIRECCION_PUBLICA` (la PC), todo queda en `localhost`.

Más detalle en [Claves y seguridad](../api/claves-y-seguridad).

## Base de datos (Supabase)

En el **SQL Editor** de Supabase, ejecuta una vez cada script de `supabase/`:

| Script | Qué agrega |
|---|---|
| `rls_proyectos.sql` | Dueño de cada proyecto y políticas RLS |
| `rls_storage.sql` | Políticas del bucket de archivos |
| `contexto_proyecto.sql` | Contexto del análisis |
| `diagrama_clases.sql` | Diagrama de clases |
| `diagramas_svg.sql` | SVG guardado de los diagramas PlantUML |
| `archivos_proyecto.sql` | Tabla del código generado |
| `stack_implementacion.sql` | Stack técnico |
| `estructura_implementacion.sql` | Estructura de carpetas |
| `bd_implementacion.sql` | Base de datos |
| `contrato_implementacion.sql` | Contrato de API |
| `backend_implementacion.sql` | Backend |
| `frontend_implementacion.sql` | Frontend |
| `documentacion_implementacion.sql` | Documentación del proyecto |
| `pruebas_implementacion.sql` | Plan de pruebas y informe cerrado |

:::note
La tabla base `proyectos` (nombre, descripción, documentos y las columnas de los artefactos de Análisis y Diseño) se creó al inicio del proyecto desde el panel de Supabase. Un script único con el esquema completo queda como mejora pendiente.
:::

## Ejecutar

```bash
npm run dev      # I-CASE Tool en http://localhost:3000
npm run runner   # runner de Docker (puerto 4100), solo para la Implementación
npm run all      # los dos a la vez
npm run docs     # esta documentación en http://localhost:3001/docs/
```

## Compilar

```bash
npm run build
```

Instala las dependencias de la documentación, la genera en `public/docs` y compila la aplicación. La documentación queda servida en `/docs`.

## Verificar antes de un commit

```bash
npx eslint <archivos cambiados> --rule '{"no-undef":"error"}'
npm run build
```
