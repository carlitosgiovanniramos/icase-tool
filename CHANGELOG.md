# Registro de cambios

Los cambios importantes de I-CASE Tool, de la versión más reciente a la más antigua. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar] - 2026-11-22

### Agregado
- **Fase de Pruebas** (fase 4, entre Implementación e Informe) con el paso **Plan de pruebas**: la IA redacta los casos de cada requerimiento funcional (flujo normal, validación y permisos) en lotes de 8, y el código pide solo los requerimientos que queden sin caso. Cada caso se marca como aprobó, falló o sin ejecutar, y los fallos se registran como **hallazgos** con gravedad.
- Los casos de prueba se redactan con las precondiciones y postcondiciones de cada requerimiento y las pantallas reales del prototipo (con sus botones y enlaces), para que los pasos no inventen nombres.
- **Editar con IA** en el explorador de archivos: elegido un archivo de la base de datos, el backend, la web o la app, se describe el cambio y la IA modifica solo ese archivo con su contexto original. También en las páginas de lectura de la documentación (las tablas y diagramas que salen de los datos se conservan). Queda como edición a mano (el paso pierde la aprobación).
- **Trazabilidad** requerimiento-casos: no se aprueba el plan con requerimientos sin caso ni con hallazgos graves abiertos; los casos sin ejecutar o fallidos se reconocen al aprobar. Al regenerar se conservan los resultados y hallazgos de los casos que se repiten.
- El informe agrega **7. Fase de pruebas** (resumen, trazabilidad, casos, hallazgos) cuando la fase está aprobada.
- **Cerrar proyecto**: guarda una copia fija del informe; cualquier cambio posterior en un paso la descarta. Requiere ejecutar `supabase/pruebas_implementacion.sql` (columnas `pruebas_plan` e `informe_cerrado`).

### Corregido
- **Stack técnico:** la capacidad "firma" se activaba con "confirmación … en pantalla" ("con*firma*ción" contiene "firma") y exigía una librería de firma que ningún requerimiento pedía. Ahora "firma" debe ser una palabra aparte.
- **Runner en servidor:** los archivos de Caddy de proyectos detenidos ya no se acumulan. Al detener un proyecto se quita su archivo, y al levantar otro se quitan los de proyectos detenidos que declaren las mismas direcciones. Antes, dos archivos con el mismo puerto (`ambiguous site definition`) impedían que Caddy arrancara y la web publicada dejaba de alcanzar el runner. **Hay que actualizar la copia del runner en la máquina virtual.**
- **Prueba de permisos del contrato:** un actor con palabras de más ("Encargado del taller") ahora encuentra su usuario cuando el rol de la base es el comienzo de su nombre (`encargado`), y con varios usuarios del mismo rol usa el primero por correo en vez de dejar toda la prueba sin verificar.
- `pg_cron` pasa a ser reconocido por la pieza Supabase en el catálogo (antes quedaba "sin resolver" en el stack).
- La guía de la pieza Supabase indica que la imagen incluye `pg_cron` (verificado en contenedor) y cómo programar tareas con `cron.schedule`, para que el stack resuelva los procesos automáticos sin Edge Functions.

### Cambiado
- **Varias claves de Gemini** (`GEMINI_API_KEYS`): se usa la primera y se pasa a la siguiente solo si se acaba su cuota, dentro de la misma petición. `GEMINI_API_KEY` sigue funcionando.
- La barra del informe pone **Cerrar proyecto** / **Reabrir** en una franja propia, debajo de Volver y Exportar PDF.
- El informe pasa a ser la fase 5 y sigue sin aprobarse: es el documento con las fases aprobadas.
- **Documentación al día**: manual de Implementación con sus siete pasos (contrato, backend, frontend y ejecución en servidor), página nueva de Pruebas, informe con cierre, caso de estudio ampliado, componente de IA con Kimi, Mistral y los modelos de Claude, prompts por fase, instalación con el runner del servidor, API (rutas nuevas en el OpenAPI) y estado del despliegue. Se quitan los enlaces al plan de implementación.

## [Sin publicar] - 2026-11-21

### Agregado
- Modelos gratuitos **Kimi** y **Mistral Large 4** (por NVIDIA) como respaldo y elegibles a mano. Sin el límite de 45 s de Gemini: tope de 280 s.
- **Árbol de navegación antes del prototipo**, construido por código desde el plan de pantallas (una rama por actor); la propuesta de pantallas recibe casos de uso, clases, ER, reglas de negocio y entrevista.
- **Armazón fijo del prototipo**: menú, logo, pie de sesión y componentes los escribe el código y la IA solo escribe el contenido; paleta y tipografía derivadas del color de marca; validación de campos, mensajes de resultado, estados vacíos, y `data-operacion` y `name` en cada control.
- **Revisión asistida de pantallas** con casillas y «Corregir con IA» solo sobre lo marcado.
- **Avisos del stack técnico** en Base de datos y Backend, con casillas que los pasan a las indicaciones.
- Paso **Backend sin Edge Functions**: se guarda vacío y se puede aprobar.
- El **frontend toma el CSS y el armazón del prototipo**: `globals.css` lo copia el código del prototipo y se revisa que las páginas no usen clases inexistentes.
- Visores: diagramas completos con zoom y arrastre; el prototipo hasta 1280 px.

### Cambiado
- El análisis se genera en dos llamadas (actores y requerimientos) con reglas de contención; «Ampliar con IA» usa las mismas.
- Estructura de carpetas: exige el archivo de estilos globales y componentes compartidos.
- Contrato de API: acepta las rutas REST de Auth, los parámetros de PostgREST, los recursos relacionados y los nombres de Edge Function escritos como ruta; quita un rol no autorizado con aviso; el inventario de la base indica los permisos por columna y lleva una versión, así que uno guardado de una versión anterior se vuelve a sacar.

## [Sin publicar] - 2026-10-24

### Agregado
- Pasos desplegables en Análisis y Diseño, con nombre y estado visibles; encabezados sin resúmenes en las tres fases. Actores y requerimientos se consultan por secciones conservando su aprobación conjunta.
- Capturas reales de inicio de sesión, página de inicio y creación de proyecto en el manual de primeros pasos.
- Capturas reales de Análisis aprobado en su manual y de Diseño aprobado en «Aprobación de fases».
- Captura real de la entrevista con IA, con preguntas y respuestas opcionales, en el manual de Análisis.
- Captura real de actores y requerimientos funcionales y no funcionales en el manual de Análisis.
- Captura real del diagrama de clases expandido en el manual de Diseño y el README.
- Captura real del prototipo expandido de inicio de sesión web de bomberos en el manual de Diseño.
- Captura real de la vista previa del informe de bomberos en el manual de Informe y exportación.
- Etapa 7, **Contrato de API**: inventario de la base probada, operaciones por acción del prototipo, validación determinista, edición, ampliación con IA, aprobación y cascada; exportación JSON/OpenAPI y matriz de permisos de Supabase con escrituras revertidas en un proyecto desechable.
- Migración `supabase/contrato_implementacion.sql`; rutas de generación, revisión y prueba, y pruebas automatizadas del contrato.

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
