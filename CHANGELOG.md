# Registro de cambios

Los cambios importantes de I-CASE Tool, de la versión más reciente a la más antigua. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Beta 2.3] - 2026-10-20

Primera parte de la **fase de Implementación** y documentación del proyecto.

### Agregado
- **Documentación** con Docusaurus en `/docs`: manual de usuario, API (con referencia OpenAPI), ingeniería de prompts y guía para desarrolladores. Enlace **Documentación** en la barra lateral.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md` y `LICENSE`.
- **Runner de Docker** (`npm run runner`) y `npm run all`: levanta, detiene y muestra los logs de los proyectos generados.
- **Catálogo de piezas** por tecnología (`plantillas/`): React, Next.js, Flutter, Express, PostgreSQL, Supabase y alta disponibilidad.
- Paso **Stack técnico**: piezas y contenedores a partir del diseño aprobado, reglas de librerías aplicadas por el código y edición manual.
- Paso **Estructura de carpetas**: archivos de cada pieza con su cobertura del diseño.
- Paso **Base de datos**:
  - migraciones y datos de prueba, generados archivo por archivo;
  - prueba en contenedores desde cero;
  - corrección automática con el error de PostgreSQL;
  - "Continuar" una generación cortada.
- **Explorador de archivos** con edición del código y vista a pantalla completa.
- **Selector de modelo gratuito** en la barra lateral.
- Pasos de Implementación y secciones del stack **plegables**.

### Cambiado
- Una sola carpeta de documentación: el plan de implementación pasó de `docs/` a `docs-site/docs/desarrolladores/` y se publica en `/docs`.
- El generador de arquitectura elige tecnologías del catálogo implementable.
- Log de IA más claro: "Google cortó la respuesta (saturación)" y "Google está saturado (503)".
- Guía de Supabase con reglas de seguridad:
  - el rol de cada cuenta sale de `raw_app_meta_data`;
  - las funciones `security definer` comprueban quién llama;
  - las firmas se verifican con un trigger;
  - hay datos de prueba en todas las tablas.

### Corregido
- Una prueba de la base que fallaba se tomaba como "no probada" y no lanzaba la corrección automática.
- Error al abrir un proyecto tras agregar los pasos plegables.

## [Beta 2.2] - 2026-10-12
### Agregado
- **Diagrama de clases** como primer paso del Diseño. El entidad-relación se genera a partir de él.

## [Beta 2.1] - 2026-10-12
### Agregado
- **Informe del proyecto** con exportación a PDF.

## [Beta 2.0] - 2026-10-11
### Agregado
- **Ampliar con IA** para los requerimientos.
- Árbol de navegación con vista por plataforma.
- Índice y avance por fases.

## [Beta 1.6 a 1.9] - 2026-09-26 a 2026-09-27
### Agregado
- **Contexto del análisis** y **entrevista** con la IA.
- Edición manual de requerimientos.
- Interruptor **Usar Claude** y etiqueta del modelo que generó cada paso.
- Cadena de pasos con aprobación y actualización en cascada.
- Configuración del prototipo (plataformas, color, tema, logo, referencias).
- **Diagrama de sistemas** (PlantUML).

## [Beta 1.0 a 1.5] - 2026-09-20 a 2026-09-22
### Agregado
- Fases de **Análisis** y **Diseño**:
  - requerimientos;
  - casos de uso;
  - entidad-relación;
  - prototipo de pantallas;
  - árbol de navegación;
  - arquitectura.
- Avisos y confirmaciones en un modal único.
- **Inicio de sesión y registro**, con proyectos por usuario.
- Despliegue en Vercel.

## [0.1.0] - 2026-09-17
### Agregado
- Proyecto base con Next.js, Tailwind CSS y Supabase.
