---
title: Plan de implementación
sidebar_position: 6
---

# Plan de trabajo: fase de Implementación

Guía de construcción de la fase de Implementación de icase-tool: cómo se usa lo aprobado en Análisis y Diseño, qué entrega cada etapa y cuándo se da por terminada. Es el documento técnico interno del equipo: decisiones, estado de cada etapa y guía para retomar el trabajo.

## Estado actual (20 de octubre de 2026)

**La Etapa 6 (Base de datos) está terminada. Sigue la Etapa 7: el paso "Contrato / API", que hay que construir.** La Etapa 7 quedó en pausa mientras se hacía la **documentación del proyecto** para el taller de clase (punto 1, "Herramientas de documentación"). La documentación ya está construida: ver "Documentación del proyecto".
- **Bomberos:**
  - estructura aprobada (76 archivos);
  - base generada con Gemini y corregida a mano (`0001`, `0004`, `0006` y `seed.sql`);
  - prueba en contenedores con 22 de 22 tablas, todas con RLS, políticas y datos de prueba, y 3 usuarios;
  - la prueba ya ejecuta las firmas con hash, el cierre de partes y la entrega de bitácoras.
- **El taller** pasó la prueba fuera de la interfaz. Falta generar su base desde la interfaz como segundo proyecto.

| Etapa | Estado |
|---|---|
| 1. Proyecto de referencia hecho a mano | Terminada |
| 2. Base de la fase dentro de icase-tool | Terminada |
| 3. Piezas del catálogo | Terminada |
| 4. Paso "Stack técnico" | Terminada (ficha de bomberos aprobada) |
| 5. Paso "Estructura de carpetas" | Terminada (estructura de bomberos aprobada) |
| 6. Paso "Base de datos" | Terminada (base de bomberos probada 22/22) |
| **7. Paso "Contrato / API"** | **Siguiente: por construir** |
| 8 a 11 | Pendientes |

Pendientes inmediatos:

1. **Documentación (taller de clase).** Construida y publicada en `/docs`. Faltan cosas del usuario:
   - las **12 capturas** de la aplicación real, en `docs-site/static/img/capturas/`, con los nombres que indican los recuadros "Captura pendiente":
     - `01-inicio-sesion`, `02-barra-lateral`, `03-crear-proyecto`, `04-paso-aprobado`;
     - `05-contexto-entrevista`, `06-requerimientos`, `07-diagrama-expandido`, `08-prototipo`;
     - `09-explorador`, `10-informe`, `11-bomberos-stack` y `12-bomberos-base`;
     - todas `.png`; la 07 y la 12 también aparecen en el README.

     Después se reemplazan los recuadros por las imágenes.
   - pasar `develop` a `main` y hacer push: los enlaces de la documentación a los archivos de GitHub apuntan a `main`;
   - dar acceso al docente si el repositorio es privado;
   - confirmar la licencia (se puso MIT a nombre de CCAJ Software Solutions).
2. **Base de bomberos:** aprobarla en la interfaz, si todavía no está aprobada. Al aprobarla se habilita el paso siguiente.
3. **Etapa 7 (Contrato / API):** construir el paso con la receta. Antes, decidir con el usuario lo que propone la sección de la Etapa 7. Se le presentó la propuesta y no respondió todavía, porque pidió hacer la documentación primero.
4. **Taller:** generar y probar su base desde la interfaz, como segundo proyecto, antes de dar por buenas las reglas nuevas para cualquier sistema.
5. **Script del esquema base de Supabase:** la tabla `proyectos` se creó al inicio desde el panel y no hay un script que la cree desde cero. Para armarlo hay que confirmar sus columnas en el panel.
6. **Propuestas sin respuesta del usuario.** **No están aplicadas:** esperar el sí.
   - **Docker apagado:** el panel consulta el estado cada 10 segundos y deja un `POST /api/implementacion 500` por consulta. Se propuso mostrar "Docker Desktop no está encendido" con un botón Reintentar, dejar de consultar hasta entonces y responder 503 en vez de 500.
   - **"Levantar" con Supabase:** `docker compose up --wait` termina con error cuando la tarea `migraciones` sale con código 0. El proyecto queda funcionando, pero el panel muestra "Docker devolvió un error.". Se propuso tratar como éxito la salida 0 de las tareas de un solo uso.
   - **"Levantar" con solo la base generada:** desde la Etapa 6 hay código, así que el botón se habilita, pero la web y la app todavía no tienen archivos y su compilación falla. Se propuso levantar solo los servicios de las piezas que ya tienen código.
   - **En Vercel:** cambiar "Falta RUNNER_TOKEN en .env.local" por "La ejecución en contenedores solo funciona con icase-tool en local" y dejar de consultar el estado (ver "Despliegue en Vercel").
   - **Costo estimado de la base con Claude:** hoy son 10 centavos por archivo, que acierta en bomberos pero duplica el costo real en el taller. Se propuso calcularlo con el tamaño del ER, las clases, los requerimientos y las tablas de cada archivo.

## Guía para retomar el trabajo

### Encender el entorno

1. Abrir **Docker Desktop** y esperar "Engine running". Solo hace falta para levantar contenedores: generar el stack o la estructura no lo usa.
2. En la raíz del repo: `npm run all`. Enciende icase-tool (`[web]`, puerto 3000) y el runner (`[runner]`, puerto 4100) en una terminal. También existen por separado `npm run dev` y `npm run runner`.
3. Abrir http://localhost:3000 e iniciar sesión.
4. **Documentación:**
   - `npm run docs` la abre en http://localhost:3001/docs/ y se recarga al guardar;
   - para verla dentro de la app con `npm run dev` (enlace "Documentación"), hay que generarla una vez con `npm run docs:build`;
   - `npm run build` la genera siempre antes de compilar la app.

### Base de datos de icase-tool (Supabase)

Scripts de `supabase/` que deben estar ejecutados en el SQL Editor, cada uno una sola vez. Todos lo están en el Supabase actual:

| Script | Para qué |
|---|---|
| `rls_proyectos.sql`, `rls_storage.sql`, `contexto_proyecto.sql`, `diagrama_clases.sql`, `diagramas_svg.sql` | Fases de Análisis y Diseño |
| `archivos_proyecto.sql` | Tabla del código generado (Etapa 2) |
| `stack_implementacion.sql` | Columna del paso "Stack técnico" (Etapa 4) |
| `estructura_implementacion.sql` | Columna del paso "Estructura de carpetas" (Etapa 5) |
| `bd_implementacion.sql` | Columna del paso "Base de datos" (Etapa 6) |

Cada paso nuevo de Implementación con columna propia agrega su script aquí. Si Vercel y la PC usan el mismo proyecto de Supabase, cada script se ejecuta una sola vez para los dos.

### Despliegue en Vercel

- **Funciona sin variables nuevas:**
  - todos los pasos con IA, incluida la generación de la base de datos;
  - el selector de modelo gratuito;
  - "Continuar base de datos".

  El build incluye `plantillas/` en las rutas que la leen (comprobado en sus `.nft.json`).
- **Documentación:**
  - el comando de build de Vercel es `npm run build`, que instala las dependencias de `docs-site/`, genera el sitio en `public/docs` y compila la app;
  - `/docs` es pública: `proxy.js` la excluye de la sesión;
  - no hace falta configurar nada más en Vercel.
- **No funciona en Vercel:**
  - el runner y Docker: Levantar, Detener, Ver logs y "Probar de nuevo" de la base;
  - el motivo: el runner corre en la PC del usuario y escucha en `127.0.0.1`, y Vercel no tiene Docker ni llega a esa dirección;
  - lo que se ve: "Falta RUNNER_TOKEN en .env.local".

  Eso se usa en local, con `npm run all`.
- **Para usar contenedores desde la versión desplegada**, haría falta un equipo con Docker y el runner expuesto por HTTPS (por ejemplo, un túnel de Cloudflare), con `RUNNER_URL` y `RUNNER_TOKEN` en Vercel. No se recomienda por ahora: el runner ejecuta Docker y quedaría en internet protegido solo por el token.
- **La marca "sin cuota" del selector puede no ser exacta en Vercel:** cada instancia del servidor recuerda sus propios fallos.
- **`git push origin develop`** sube el trabajo. `.env.local` no se sube: `.gitignore` excluye `.env*`.

### Variables de `.env.local`

- Supabase, Gemini, Groq y Anthropic, como describe el README.
- `RUNNER_URL` y `RUNNER_TOKEN`, que comparten icase-tool y el runner.

**Modelos de IA: solo gratuitos, salvo Claude.**
- Gemini: 3.8 Flash primero, el más nuevo con cuota gratis.
- Groq: `gpt-oss-120b`, `qwen/qwen3.8-27b` y `gpt-oss-20b`.
- Claude es el único de pago y solo responde con el interruptor "Usar Claude".
- Con Claude apagado, el selector "Modelo gratuito" de la barra lateral elige qué modelo responde:
  - "Automático" (Gemini y luego Groq) o un modelo concreto;
  - el modelo elegido responde solo, sin pasar a otros; si falla, el mensaje dice por qué;
  - la lista sale de `/api/modelos-ia` y marca los que están sin cuota;
  - la preferencia viaja en `usarClaude` (`true`, el id del modelo o `false`).
- En el log, "Google cortó la respuesta (saturación)" y "Google está saturado (503)" no son errores de icase-tool: se pasa al siguiente modelo. Groq no sirve de respaldo para los pasos de Implementación, porque sus prompts superan el límite de tokens por minuto del plan gratuito.
- El usuario rechazó usar modelos de pago de Gemini (Gemini 4 Argon, los Pro). Al actualizar modelos, verificar con una llamada real que respondan con la clave gratuita: un 429 `RESOURCE_EXHAUSTED` inmediato significa que no tienen cuota gratis.

### Mapa de archivos

| Archivo | Qué es |
|---|---|
| `docs-site/docs/desarrolladores/plan-implementacion.md` | Este plan, publicado también en la documentación (*Desarrolladores → Plan de implementación*). Mantener al día la sección "Estado actual" |
| `plantillas/<pieza>/` | Catálogo de piezas: `pieza.json` (ficha), `compose.yml`, `compose.<otra>.yml`, `archivos/`, `archivos.<otra>/`, `README.md` (guía para la IA) |
| `lib/implementacion.js` | Armador de proyectos: junta las piezas en `docker-compose.yml`, `.env.example` y archivos fijos |
| `lib/stack.js` | Paso "Stack técnico": prompt, validación, lectura del diagrama de sistemas, revisión manual (`revisarStack`) y revisión de la arquitectura contra el catálogo |
| `lib/capacidades.js` | Capacidades que exigen librería (firma, PDF, sin conexión, mapas, ubicación, adjuntos...); se usa también en el navegador |
| `lib/estructura.js` | Paso "Estructura de carpetas": una generación por pieza y la validación de cobertura |
| `lib/bd.js` | Paso "Base de datos": prompt y validación de cada archivo SQL, y revisión de la prueba en contenedores (`revisarPrueba`) |
| `lib/archivosBD.js` | Archivos de la base dentro de la estructura, archivo que falló y error de la prueba; se usa también en el navegador |
| `lib/gemini.js`, `lib/groq.js`, `lib/claude.js` | Llamadas a la IA: Gemini, después Groq; solo Claude con el interruptor; solo el modelo elegido si hay uno (`generarSoloCon`, `modelosGratuitos`) |
| `lib/preferenciaClaude.js`, `app/InterruptorClaude.js`, `app/api/modelos-ia` | Preferencia de IA del navegador ("Usar Claude", modelo gratuito elegido, gasto estimado), el interruptor y el selector de la barra lateral, y la lista de modelos gratuitos |
| `runner/index.mjs` | Runner: el único proceso que ejecuta Docker. `probarbd` prueba la base en un proyecto aparte |
| `app/api/implementacion/route.js` | Puente entre la interfaz y el runner; arma los archivos del proyecto (fijos, generados y planificados); acción `probar-bd` |
| `app/api/generar-stack`, `revisar-stack`, `generar-estructura`, `generar-bd` | Rutas finas de cada paso; la lógica está en `lib/` |
| `app/(app)/proyectos/[id]/pasos.js` | `PASOS` (la cadena con aprobación y cascada) y `PASOS_IMPLEMENTACION` (los pendientes que se listan) |
| `app/(app)/proyectos/[id]/page.js` | Página del proyecto: generación, aprobación, cascada y el bloque de cada paso |
| `ImplementacionFase.js`, `FichaStack.js`, `FichaEstructura.js`, `FichaBD.js` | Fase 03: explorador de archivos (ver, expandir y editar el código generado), panel de ejecución y fichas de cada paso |
| `app/api/exportar-diseno/route.js` | Solo desarrollo: guarda los diagramas de los proyectos en `respaldos/diseno/` |
| `docs-site/` | Documentación (Docusaurus 3): `docs/` (páginas en Markdown por sección), `openapi/icase-tool.yaml` (referencia de la API), `static/img/capturas/`, `docusaurus.config.js` (`baseUrl: /docs/`) y `sidebars.js` |
| `next.config.mjs`, `proxy.js` | Sirven la documentación en `/docs` (cada página `/docs/x` es `/docs/x.html`) y la dejan pública |
| `app/SidebarNav.js` | Barra lateral, con el enlace "Documentación" |
| `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `LICENSE` | Documentación para desarrolladores en GitHub (punto 1D del taller) |

### Probar sin la interfaz

- **Leer los datos de un proyecto:** con sesión iniciada, abrir `/api/exportar-diseno`. Guarda una copia de cada proyecto en `respaldos/diseno/`, carpeta que no se sube a git. **La copia actual de bomberos es anterior a los últimos cambios** (RF22, arquitectura y diagrama de sistemas): exportar de nuevo antes de probar.
- **Probar un paso con IA real:** las rutas usan el alias `@/` y no se pueden importar desde Node, pero la lógica está en `lib/`, con imports relativos. Un script en la carpeta de trabajo importa la función (`generarStack`, `generarEstructura`...) con `pathToFileURL(path.resolve("lib/..."))` y se ejecuta desde la raíz con `node --env-file=.env.local`.
- **Probar contenedores:** un runner aparte con `RUNNER_PORT=4101` evita cortar el que tiene encendido el usuario.
- **Probar la base de datos:** generar cada archivo con `generarArchivoBD` (en orden, pasando los anteriores), armar el proyecto con `armarProyecto` y enviar sus archivos a `POST /proyectos/<id>/probarbd` del runner de prueba, con el `bd` de la ficha de la pieza; el resultado se revisa con `revisarPrueba`.
- **Probar SQL que se ejecutará en Supabase:** primero sobre una copia de los datos en un PostgreSQL local (`docker run postgres:17-alpine`). En Git Bash, usar `MSYS_NO_PATHCONV=1` para que `docker exec` no convierta las rutas del contenedor.
- **Siempre con dos proyectos de temas distintos**, para que las reglas sirvan para cualquier sistema.

### Proyectos de prueba

| Proyecto | Id | Estado |
|---|---|---|
| Cuerpo de Bomberos Baños de Agua Santa | `10784326-7058-4a78-ac13-d0470623a5d5` | Análisis y Diseño aprobados. Stack aprobado (Next.js + Flutter + Supabase con Auth, Realtime, Storage y Edge Functions + alta disponibilidad; 12 servicios). Estructura aprobada (76 archivos). Base de datos corregida y probada: 22/22 tablas con RLS y datos, 3 usuarios de prueba. Cambios de esta fase: se descartó RF22 (tablero de métricas) con una edición directa en Supabase; se corrigieron la arquitectura (alta disponibilidad del Panel Web con balanceador; Realtime solo para la app) y el diagrama de sistemas (RF14, RF15, RF19 y RNF03 a RNF06 bien asignados) |
| Órdenes de servicio de un taller mecánico | `d124d4ec-9560-4055-af05-0fc038ac79b6` | Análisis y Diseño aprobados. Sirve de segundo proyecto: Next.js + Supabase (Auth), 6 servicios, sin móvil |

Carpetas de trabajo en `C:\icase-workspaces\`:
- `referencia/`: Etapa 1, React + Express + PostgreSQL;
- `prueba-supabase/`: Etapa 3, Supabase + Next.js + Flutter armados a mano, apagado;
- una carpeta por id de proyecto, creada por el runner.

### Reglas de trabajo acordadas con el usuario

- **Paso a paso:** el usuario revisa y aprueba cada resultado. Cuando pregunta algo sobre un generador que ya aprobó, se responde y se propone el cambio; se implementa solo después de su sí.
- **Reglas generales:** las reglas, los prompts y las validaciones deben servir para cualquier sistema, no solo para bomberos.
- **Revisar la salida real:** antes de dar algo por bueno, leer lo que generó la IA, no solo las cifras. Así se encontró el tablero de métricas que reapareció en la estructura.
- **Lo importante lo valida el código, no el prompt.** La IA propone; el código comprueba contra el catálogo y el diseño; un reintento con los problemas; lo que quede, en "Revisar antes de aprobar".
- **La prueba en contenedores no ve la seguridad.** Encuentra errores de sintaxis y de datos, pero no permisos mal pensados. Al revisar código generado, leer a mano los triggers y las políticas, por ejemplo de dónde sale el rol de un usuario.
- **El usuario corrige código a mano** en el explorador cuando hace falta. Al proponer una corrección, darle el archivo completo para pegar.
- **Consistencia con lo aprobado:** la implementación no agrega tecnologías, servicios externos ni funciones que el diseño no tenga. Para cambiarlos se cambia el diseño.
- **Interfaz:** textos mínimos, sin emojis, avisos y confirmaciones con `app/AlertProvider.js`.
- **Costo:** avisar el costo antes de generar con Claude. Ningún modelo de pago fuera de Claude.
- **Al cerrar cada etapa:** actualizar "Estado actual" y la sección de la etapa en este plan, y hacer commit.
- **Documentación al día:** si cambia una funcionalidad, se actualiza en el mismo commit:
  - su página en `docs-site/docs/` (manual, API o IA);
  - si es una ruta nueva o cambiada, `docs-site/openapi/icase-tool.yaml`;
  - una línea en `CHANGELOG.md`.

  Ejemplo: la Etapa 7 agregará al manual una página del paso y, a la API, su ruta.

### Receta para construir un paso nuevo de Implementación

Así se hicieron "Stack técnico" y "Estructura de carpetas":

1. **Columna:** script `supabase/<paso>_implementacion.sql` con la columna `jsonb` en `proyectos`.
2. **Lógica en `lib/<paso>.js`:**
   - prompt con la estructura CONTEXTO / QUÉ DEBE MOSTRAR / QUÉ NO QUIERO / FORMATO;
   - validación determinista contra el diseño y el catálogo;
   - un reintento con los problemas;
   - advertencias en el resultado.
   - Si el paso es grande, una generación por pieza en paralelo.
3. **Ruta fina** `app/api/generar-<paso>/route.js` que solo llama a la función de `lib/`.
4. **Agregar el paso a `PASOS`** en `pasos.js` (fase `implementacion`, `aprobacion`, `columna`, `ruta`). Sale solo de la lista de pendientes. Si el paso escribe código, `archivos: true`: el código va en `archivos_proyecto` (un archivo por petición, guardado apenas se genera) y se borra con el paso.
5. **En `page.js`:**
   - `cuerpo<Paso>()` con lo que lee el paso;
   - la entrada en `cuerpos`;
   - la rama en `pedirPaso` que guarda las advertencias en `revision`;
   - `PUEDE_TRABAJARSE` (el paso anterior aprobado);
   - el bloque visible con título, indicaciones, generar, eliminar, ficha, "Ampliar con IA", aprobar y rechazar;
   - la función de ampliar.
6. **Un componente `Ficha<Paso>.js`**, con "Revisar antes de aprobar" arriba.
7. **Probar con IA real** con bomberos y el taller, leer la salida completa, revisar con lint (`--rule '{"no-undef":"error"}'`) y `npm run build`, actualizar este plan y hacer commit.
8. **Documentar:**
   - una página del paso en `docs-site/docs/manual/`;
   - la ruta en `docs-site/openapi/icase-tool.yaml` y en la tabla de `docs-site/docs/api/guia.md`;
   - su fila en `docs-site/docs/ia/prompts-por-fase.md`;
   - una entrada en `CHANGELOG.md`.

## Documentación del proyecto (taller de clase, 20 de octubre de 2026)

El taller "Herramientas de documentación, pruebas y evaluación de software" pidió, en su punto 1, cuatro entregables y al menos una herramienta de documentación justificada. Se cubrió así:

| Entregable | Dónde |
|---|---|
| Herramienta y justificación | **Docusaurus 3**, con Mermaid y OpenAPI (Redocusaurus). Justificación en *Desarrolladores → Por qué Docusaurus* |
| A. Documentación de usuario | *Manual de usuario*, 9 páginas: primeros pasos (roles y acceso), flujo de trabajo, una página por fase, informe y exportación, caso de estudio de bomberos con datos reales, buenas entradas para la IA y errores comunes |
| B. Documentación de la API | *API*, 5 páginas: arquitectura con diagramas, guía con las 23 rutas, códigos y ejemplos, integraciones, claves y seguridad, y formatos. Además, la **referencia OpenAPI** (`/docs/api/referencia`) |
| C. Ingeniería de prompts y componente de IA | *IA y prompts*: modelos y versiones, selección del modelo, plantilla de prompt con un ejemplo real, y una tabla por fase con prompt, entrada, salida y validaciones |
| D. Documentación para desarrolladores en GitHub | `README.md` reescrito, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md` (desde Beta 1.0 hasta Beta 2.3), `LICENSE` (MIT) y la sección *Desarrolladores* |

- **Publicación:** en `/docs` de la misma aplicación. Así hay un solo despliegue y una sola URL, y el enlace "Documentación" de la barra lateral la abre. La portada tiene la tabla de correspondencia con el punto 1, siguiendo un ejemplo de otro grupo que el usuario mostró (`app-secure.github.io/icase`, hecho con MkDocs).
- **Capturas:** no se usan capturas simuladas. Cada página indica con un recuadro "Captura pendiente" el nombre del archivo que la reemplazará. Faltan las 12 capturas (ver "Pendientes inmediatos").
- **Comprobado:**
  - el sitio compila sin enlaces rotos (`onBrokenLinks: "throw"`);
  - `npm run build` genera la documentación y la app;
  - con `next start`, `/docs` y sus páginas responden 200 sin sesión y la app sigue exigiendo login.

## 1. Contexto

Con las fases de Análisis y Diseño aprobadas, cada proyecto ya tiene requerimientos, casos de uso, diagrama de clases, diagrama entidad-relación, prototipo de pantallas, árbol de navegación, arquitectura y diagrama de sistemas. La fase de Implementación convierte esos artefactos en código ejecutable.

El código generado es un proyecto dentro de otro proyecto. Por eso no puede vivir dentro del repo ni de la app Next.js de icase-tool:

- **Dependencias:** cada proyecto generado trae su propio stack y sus versiones, que chocarían con las de icase-tool.
- **Puertos:** dos proyectos no pueden usar el mismo puerto a la vez.
- **Seguridad:** el código lo escribe una IA, así que no hay que confiar en él. Debe ejecutarse aislado, sin acceso a los archivos ni a las credenciales de icase-tool.
- **Limpieza:** al borrar o regenerar un proyecto, todo lo suyo debe desaparecer con un solo comando.

La solución es ejecutar cada proyecto generado en **contenedores Docker**, orquestados con un `docker-compose.yml` propio.

## 2. Regla central

**La implementación sigue siempre las tecnologías del diseño aprobado. No se sustituye nada.**

- Si la arquitectura dice Flutter, se genera una app Flutter, no una página web adaptada al celular.
- Si dice Next.js, se genera Next.js.
- Si dice Supabase, se levanta Supabase en contenedores; no se traduce a otra tecnología.
- La cantidad y el tipo de contenedores salen del diseño: **los que sean necesarios**, sin recortar ni agregar de más. Un proyecto puede tener 3 y otro 10.

## 3. Decisiones base

| Tema | Decisión |
|---|---|
| Tecnologías | Las del diagrama de arquitectura y el diagrama de sistemas aprobados |
| Contenedores | Uno por cada tecnología del diseño que funciona como servidor, en un `docker-compose.yml` por proyecto |
| Nombre del proyecto en Docker | `icase_<id-proyecto>`: cada proyecto tiene su propia red, sus volúmenes y sus contenedores |
| Base de datos del proyecto generado | La del diseño, en su propio contenedor. Nunca el Supabase de icase-tool |
| Uso del Supabase de icase-tool | Solo para icase-tool: usuarios, proyectos, diagramas, aprobaciones y la copia de los archivos generados |
| Carpeta de trabajo | `C:\icase-workspaces\<id-proyecto>\`, fuera del repo de icase-tool |
| Dockerfiles y configuración de contenedores | Salen de las piezas del catálogo, probadas a mano. No los escribe la IA |
| Servicios externos (mapas, notificaciones, correo, pagos) | Solo los del diseño aprobado (cajas punteadas de la arquitectura y componentes `<<externo>>` del diagrama de sistemas). Se usan los reales, con las claves en el `.env` del proyecto. En Implementación no se agregan servicios nuevos: para sumar uno se cambia la arquitectura |
| Ejecución de Docker | La hace un servicio aparte, el runner. Next.js nunca ejecuta `docker` directamente |
| Entorno disponible | Docker Desktop 29.7 y Docker Compose v5.5 sobre WSL2. Flutter 3.41.3 y el SDK de Android instalados |
| Modelos de IA | Solo gratuitos en Gemini (3.8 Flash primero) y Groq (gpt-oss-120b, qwen3.8-27b, gpt-oss-20b). Claude es el único de pago, con el interruptor "Usar Claude". Un modelo sin cuota queda en pausa el tiempo que indica Google |

## 4. Cómo se conocen las tecnologías de un proyecto

Se leen de los diagramas aprobados en Diseño. El usuario no tiene que indicarlas de nuevo.

- **Diagrama de arquitectura:** qué tecnologías hay y cómo se conectan. El generador obliga a escribir la tecnología real en cada caja, por ejemplo `WEB["Panel Web<br/>Next.js"]` o `subgraph BACKEND["Backend — Supabase"]`. Las cajas con borde punteado son servicios externos.
- **Diagrama de sistemas:** qué hace cada parte, con los subsistemas, sus componentes, la tecnología de cada componente y los requerimientos que cumple. Puede mostrar piezas que la arquitectura no detalla, como reportes, tareas programadas o sincronización.
- **Contexto del Análisis:** las tecnologías y plataformas que escribió el usuario, para confirmar que coincidan.

```text
Arquitectura + Sistemas aprobados (Fase de Diseño)
        |
        v
Paso "Stack técnico" lee cada caja y su tecnología
        |
        v
Busca cada tecnología en el catálogo
   ├─ está       → usa su pieza (sus contenedores y su configuración)
   └─ no está    → avisa "<tecnología> aún no está soportada"; no la cambia por otra
        |
        v
Contenedores del proyecto  →  docker-compose.yml
```

## 5. Catálogo de tecnologías y piezas

Ninguna herramienta funciona con todas las tecnologías del mundo. Lo viable es un **catálogo de tecnologías soportadas que crece con el tiempo**, con una **pieza** probada en Docker por cada tecnología.

Una pieza, en `plantillas/<tecnología>/`, contiene:

- su Dockerfile o la imagen oficial que usa;
- su parte del `docker-compose.yml`: servicios, volúmenes, healthchecks y puertos;
- sus archivos fijos de configuración;
- sus variables de `.env.example`;
- un README con lo que la IA debe generar dentro y el contrato que ese código debe cumplir.

El `docker-compose.yml` de cada proyecto se arma juntando las piezas elegidas.

Reglas del catálogo:

- Si la arquitectura usa tecnologías del catálogo, la implementación es automática y completa.
- Si usa una que no está, icase-tool lo dice claramente en vez de construir algo distinto o roto.
- Para que todo proyecto nuevo quede dentro del catálogo, el generador de arquitectura (fase de Diseño) recibe el catálogo y elige solo tecnologías de él para lo que el cliente no definió. Lo que el cliente eligió fuera del catálogo se respeta y queda como advertencia: "no tiene implementación automática". El estilo microservicios no tiene piezas.

Catálogo inicial: lo que usa el proyecto de bomberos más lo más común.

| Capa | Pieza | Estado |
|---|---|---|
| Web | `react` (Vite + nginx) | Probada |
| Web | `nextjs` (Next.js 16, standalone) | Probada |
| Móvil | `flutter` (Flutter 3.41) | Probada (vista previa web en Docker) |
| Backend | `express` (Node.js/Express) | Probada |
| Backend | `supabase` (base, API de datos, puerta de entrada; opcionales: Auth, Realtime, Storage, Edge Functions) | Probada |
| Base de datos | `postgres` (PostgreSQL 17) | Probada |
| Infraestructura | `alta-disponibilidad` (web master y esclavo con balanceador nginx) | Probada |

Algunas tecnologías son varios programas. Supabase, por ejemplo, se compone de autenticación (GoTrue), API de datos (PostgREST), Realtime, Edge Functions, Storage y una puerta de entrada (Envoy, la opción por defecto de la configuración oficial). Cada uno es un contenedor; así lo levanta también la herramienta oficial de Supabase.

Cada pieza tiene un `README.md` con lo que la IA debe generar dentro de ella y las reglas que debe cumplir ese código. Desde la Etapa 5 esos textos se le pasan a la IA al generar la estructura y el código.

Cada `pieza.json` declara además lo que usa el paso "Stack técnico": las palabras con que se reconoce en el diseño (`reconoce`), lo que ya incluye (`incluye`, como Supabase a PostgreSQL), sus servicios opcionales, su registro de paquetes (`registro`), sus librerías base y las librerías que no sirven en su entorno (`incompatibles`).

## 6. Lo que no es un contenedor

> **Cada tecnología del diseño que funciona como servidor = un contenedor.** Lo que no es un servidor se resuelve de otra forma.

| Qué | Por qué | Cómo se resuelve |
|---|---|---|
| Apps móviles (Flutter, React Native) | Corren en el celular, no en un servidor | El código se genera completo. Un contenedor compila una vista previa web para probarla desde icase-tool. La app real se ejecuta en el celular o el emulador (`flutter run`). Las apps de iPhone necesitan una Mac |
| Almacenamiento local del dispositivo (SQLite) | Vive dentro de la app | Se implementa en el código de la app móvil |
| Servicios de internet (Google Maps, Firebase Cloud Messaging, pagos, correo) | Son de terceros; no se pueden descargar | Se usan los reales. Cada clave va en el `.env` del proyecto. Sin ella el sistema arranca igual y solo esa función responde con un error claro, por ejemplo "Falta GOOGLE_MAPS_API_KEY" |
| Infraestructura de varios servidores (alta disponibilidad, balanceo) | Pensada para varias máquinas físicas | Se representa en contenedores con la pieza `alta-disponibilidad`: servidor web master y esclavo detrás de un balanceador, con cambio automático. Es una versión demostrativa en una sola PC; replicar la base de datos queda como mejora posterior |

## 7. Contenedores frente a granularidad

- **Los contenedores** (cuántos y de qué tecnología) dependen solo de **qué tecnologías** hay: arquitectura y sistemas.
- **La granularidad** (cuántas pantallas, tablas, módulos y archivos) depende del resto de los diagramas y define lo que va **dentro** de cada contenedor.

Un proyecto con 5 pantallas o con 50 tiene los mismos contenedores. Lo que cambia es cuántos archivos van dentro del contenedor web.

## 8. Estructura de un proyecto generado

La raíz siempre tiene lo mismo; las carpetas dependen de las piezas del proyecto.

```text
<proyecto>/
  docker-compose.yml     armado con las piezas elegidas
  .env.example           variables de todas las piezas y claves de servicios externos
  README.md              cómo levantar el proyecto y la app móvil
  <una carpeta por pieza>
```

Ejemplo con React + Express + PostgreSQL (3 contenedores):

```text
  database/init/    esquema y datos de prueba (del diagrama ER)
  backend/src/      config, modelos, servicios, controladores, rutas, middlewares
  frontend/src/     rutas (del árbol de navegación), páginas (del prototipo), componentes, api
```

Ejemplo con Next.js + Flutter + Supabase:

```text
  supabase/migrations/   tablas y políticas de acceso RLS (del diagrama ER y los actores)
  supabase/seed.sql      datos de prueba
  supabase/functions/    Edge Functions (de los requerimientos y el diagrama de sistemas)
  web/                   Next.js: app/ con una página por pantalla Web del prototipo
  movil/                 Flutter: lib/ con una pantalla por pantalla Móvil del prototipo
```

### Trazabilidad con el diseño

| Artefacto aprobado | Se convierte en |
|---|---|
| Diagrama de arquitectura | Piezas, contenedores y `docker-compose.yml` |
| Diagrama de sistemas | Piezas que la arquitectura no detalla; módulos y funciones del backend |
| Diagrama entidad-relación | Esquema de la base de datos |
| Diagrama de clases | Modelos del dominio |
| Requerimientos funcionales | Operaciones de la API y lógica del backend |
| Actores y casos de uso | Roles y permisos |
| Prototipo de pantallas | Páginas web y pantallas móviles |
| Árbol de navegación | Rutas y menús de cada plataforma |

## 9. Qué diagrama usa cada paso

Los pasos también salen del diseño: un proyecto sin app móvil no tiene el paso "Móvil", y uno con backend Supabase no tiene un backend Express que escribir.

| Paso de Implementación | Qué decide | Qué lee |
|---|---|---|
| 1. Stack técnico | Tecnologías, piezas y contenedores | Arquitectura + sistemas + tecnologías y plataformas del contexto |
| 2. Estructura de carpetas | Todos los archivos del proyecto | Todos: árbol de navegación (rutas y menú), prototipo (una página por pantalla), clases y entidad-relación (modelos y tablas), sistemas (módulos), requerimientos (qué cubre cada archivo) |
| 3. Base de datos | Tablas, relaciones y políticas de acceso | Entidad-relación + clases + actores (permisos) |
| 4. Contrato / API | Qué operaciones existen | Requerimientos, casos de uso, clases, sistemas |
| 5. Backend | Lógica de negocio | Requerimientos, sistemas, clases |
| 6. Web (si la arquitectura la tiene) | Pantallas web | Prototipo (pantallas Web) + árbol de navegación (vista Web) |
| 7. Móvil (si la arquitectura la tiene) | Pantallas de la app | Prototipo (pantallas Móvil) + árbol de navegación (vista Móvil) |

El backend se adapta al stack:

- **Con Supabase**, el backend son las tablas, las políticas de acceso (RLS) y las Edge Functions. La API la genera PostgREST desde las tablas, así que el contrato se deriva de ellas.
- **Con Express**, el backend son modelos, servicios, controladores y rutas, y el contrato es un `openapi.yaml`.

## 10. Reglas que aplican a todas las etapas

- **Flujo de fases:** los pasos de Implementación se comportan como los de Análisis y Diseño. Tienen aprobar y rechazar; un paso aprobado queda bloqueado; un paso ya generado se regenera solo después de confirmar; al editar, los pasos siguientes quedan desactualizados; al rechazar o eliminar, se borra en cascada lo posterior; y hay "Ampliar con IA" para modificar el resultado sin regenerarlo.
- **Validación inmediata:** cada capa se prueba en su contenedor apenas se genera, para que los errores no se acumulen al final.
- **Generación por partes:** el código se genera archivo por archivo, igual que el prototipo pantalla por pantalla. Así no se corta por el límite de salida y se puede regenerar un archivo suelto con el error como contexto.
- **Contexto acotado:** cada archivo se genera con el stack, la estructura y solo la parte de los diagramas que le corresponde.
- **Costo de IA:** Gemini queda por defecto, con Groq de respaldo, solo con modelos gratuitos. Claude se usa solo con el interruptor "Usar Claude" activado, y antes de generar un lote se avisa el costo estimado. Referencia: el stack técnico cuesta unos 5 a 10 centavos con Claude Sonnet 5; la estructura de carpetas, unos 20 a 40 (tres generaciones grandes); la base de datos, unos 10 por archivo (estimación; ajustarla con el costo real).
- **Reglas generales:** prompts, validaciones y piezas deben servir para cualquier sistema, no solo para el proyecto con el que se prueba.
- **Interfaz:** textos mínimos, sin emojis; confirmaciones y avisos con el modal de `app/AlertProvider.js`.
- **Seguridad del código generado:** se ejecuta solo dentro de sus contenedores, con límites de CPU y memoria, sin montar carpetas fuera de su carpeta de trabajo y sin las credenciales de icase-tool.

## 11. Etapas

---

### Etapa 1. Proyecto de referencia hecho a mano · Terminada

Se construyó a mano un mini sistema de bomberos (gestión de personal) con React, Express y PostgreSQL en tres contenedores, en `C:\icase-workspaces\referencia\`. Comprobó que el enfoque funciona en Docker y dejó los primeros archivos fijos en `plantillas/react-express-postgres/`, que en la Etapa 3 se separaron en las piezas `react`, `express` y `postgres`.

Se verificó:

- arranque en orden con healthchecks;
- lectura y escritura de datos;
- validaciones del backend;
- base de datos sin acceso desde fuera;
- datos que sobreviven a reinicios;
- limpieza total con `docker compose down -v`.

---

### Etapa 2. Base de la fase dentro de icase-tool · Terminada

- **Tabla `archivos_proyecto`** (`supabase/archivos_proyecto.sql`) con RLS, para el código generado de cada proyecto.
- **Runner** (`runner/index.mjs`, se enciende con `npm run runner`). Es el único proceso que ejecuta Docker:
  - escribe la carpeta de trabajo y levanta el proyecto con `docker compose`;
  - asigna puertos libres y consulta estado y logs;
  - detiene y elimina proyectos, y los apaga por inactividad;
  - escucha solo en `127.0.0.1` y exige `RUNNER_TOKEN`.
- **Ruta `/api/implementacion`:** comprueba con la sesión del usuario que el proyecto sea suyo, junta las piezas con los archivos generados (`lib/implementacion.js`) y le pasa las órdenes al runner.
- **Fase 03 "Implementación"** en el proyecto: lista de pasos, explorador de archivos y panel de ejecución. Se habilita con Diseño aprobado.
- **`npm run all`:** enciende icase-tool y el runner en una sola terminal.
- **Ruta solo de desarrollo `/api/exportar-diseno`:** guarda los diagramas de los proyectos en `respaldos/diseno/` para revisarlos al construir las piezas.

Los pasos se listan en `PASOS_IMPLEMENTACION` de `pasos.js`. Cada uno pasa a `PASOS`, con su ruta, su aprobación y la cascada, en la etapa en que se construye su generador; si se agregaran antes, la cascada intentaría generarlos sin tener con qué.

Se verificó:

- el proyecto se levantó desde la interfaz;
- dos proyectos encendidos a la vez, con puertos distintos;
- rechazo de peticiones sin clave y de rutas fuera de la carpeta;
- limpieza total al eliminar.

---

### Etapa 3. Piezas del catálogo · Terminada

Se leyeron la arquitectura y el diagrama de sistemas de bomberos y del taller mecánico. Se construyeron y probaron las piezas de la sección 5:

- **Supabase:** a partir de la configuración oficial, sin Studio, pooler, analytics ni imgproxy.
  - Auth, Realtime, Storage y Edge Functions son opcionales: se incluyen solo si el diseño los tiene.
  - La tarea `migraciones` aplica `supabase/migrations/*.sql` y `supabase/seed.sql` cuando Supabase ya creó sus esquemas, y termina.
- **Next.js:** con integración Supabase. El navegador usa `localhost:<SUPABASE_PORT>` y el servidor de Next.js usa la red interna.
- **Flutter:** vista previa web compilada con la imagen oficial; la app real se ejecuta con `flutter run`.
- **Alta disponibilidad:** web master y esclavo con un balanceador nginx que cambia al esclavo si el master no responde.
- **React, Express y PostgreSQL:** la plantilla de la Etapa 1, separada en tres piezas.

Cómo se arma un proyecto:

- **`lib/implementacion.js`** junta las piezas elegidas:
  - une sus partes del `docker-compose.yml` y aplica sus integraciones (por ejemplo, Next.js con Supabase);
  - quita los servicios opcionales que el diseño no tiene y las dependencias hacia ellos;
  - aplica la alta disponibilidad;
  - arma `.env.example` con las variables de todas las piezas.
- **El runner:**
  - genera las claves que piden las piezas (`{{secreto:hex:N}}`, `{{secreto:base64:N}}`, y `{{jwt:<rol>}}` firmado con `JWT_SECRET`);
  - conserva las existentes y asigna un puerto libre a cada variable `*_PORT`.
- **La interfaz** muestra los servicios reales de cada proyecto y un botón "Abrir" por cada puerto con nombre (Web, Móvil, API de Supabase...).
- **`.gitattributes`** obliga saltos de línea LF en `plantillas/`: con `core.autocrlf` en Windows, los `.sh` dejarían de funcionar dentro de los contenedores.

Se verificó con un proyecto armado solo por piezas (bomberos, 12 servicios), levantado con el runner:

- **Auth:** registro e inicio de sesión.
- **API con RLS:** sin sesión no ve datos y no se puede crear a nombre de otro.
- **Realtime:** el aviso de un nuevo parte llega por WebSocket.
- **Storage:** solo en la carpeta propia.
- **Edge Function:** con verificación de JWT, y responde con un error claro si falta la clave de Firebase.
- **Web:** consulta Supabase por la red interna.
- **Alta disponibilidad:** con el master apagado responde el esclavo.
- **Vista previa móvil:** compilada y apuntando al Supabase del proyecto.

También:

- el taller arma 6 servicios y la referencia de la Etapa 1, 3; la referencia sigue funcionando;
- al eliminar no queda ningún contenedor, volumen ni carpeta.

Comportamientos conocidos:

- La primera suscripción a Realtime después de levantar puede perder su primer aviso, mientras Realtime crea su canal de replicación.
- La imagen de Flutter pesa unos 7 GB: la primera compilación de un proyecto con móvil tarda varios minutos.

---

### Etapa 4. Paso "Stack técnico" · Terminada

**Objetivo:** decidir las tecnologías, las piezas y los contenedores del proyecto a partir del diseño aprobado.

**Entradas:** diagrama de arquitectura, diagrama de sistemas, requerimientos, y tecnologías y plataformas del contexto.

**Resultado:** una ficha guardada en `proyectos.stack_implementacion` (`supabase/stack_implementacion.sql`). De ahí la toman el armador de proyectos y el runner.

#### Cómo se genera

Lógica en `lib/stack.js`, ruta `/api/generar-stack`.

1. **La IA propone**, con el catálogo de piezas en el prompt (CONTEXTO / QUÉ DEBE MOSTRAR / QUÉ NO QUIERO / FORMATO):
   - las piezas y sus servicios opcionales, y si hay alta disponibilidad;
   - cómo se resuelve cada caja de la arquitectura: pieza, externo, dentro de la app, infraestructura o no soportado;
   - las librerías, con su capacidad y los requerimientos que las piden;
   - los servicios externos del diseño, con la variable de su clave y quién los usa;
   - avisos (solo lo que el usuario debe decidir o lo que no se puede implementar) y una explicación.
2. **El código valida** y, si encuentra problemas, le pide a la IA una corrección (un reintento):
   - las piezas y los opcionales existen en el catálogo;
   - ninguna tecnología del diseño con pieza en el catálogo quedó sin elegir (una pieza puede incluir a otra, como Supabase a PostgreSQL);
   - la alta disponibilidad tiene una pieza web;
   - el diagrama de sistemas se lee directamente (cada componente con su tecnología y sus RF) y cada componente debe quedar implementado;
   - las librerías cumplen las reglas de la tabla siguiente.
3. **Los contenedores no los decide la IA:** salen del armador real (`lib/implementacion.js`) con las piezas elegidas.
4. **Lo que la validación no pudo corregir queda guardado en la ficha** (`revision`) y se muestra en "Revisar antes de aprobar" hasta que se resuelve.

#### Reglas de librerías (las aplica el código)

La revisión de la ficha de bomberos mostró que, solo con el prompt, la IA olvidaba librerías que los requerimientos exigen (firma en pantalla, notificaciones en la app, modo sin conexión) y proponía librerías que no sirven en el entorno (`firebase-admin` en Deno). Por eso estas reglas no dependen del modelo:

| Regla | Cómo se aplica |
|---|---|
| Librerías base de cada combinación | Las declara la pieza (`librerias` en `pieza.json`) y se agregan siempre. Ej.: Flutter con Supabase → `supabase_flutter`; Next.js con Supabase → `@supabase/supabase-js`; Express con PostgreSQL → `pg` |
| Capacidades que piden los requerimientos | `lib/capacidades.js` detecta en los RF y RNF: firma en pantalla, PDF, notificaciones push, almacenamiento sin conexión, detección de conexión, mapas, gráficos, hash, ubicación GPS del dispositivo y adjuntar imágenes (cámara o galería). Cada pieza que implementa esos RF según el diagrama de sistemas debe tener una librería con esa capacidad. No se exige lo que el entorno ya trae (por ejemplo, la criptografía, la ubicación y el selector de archivos del navegador) |
| Compatibilidad con el entorno | Cada pieza declara su registro (`npm`, `pub` o `deno`) y sus librerías `incompatibles` con el motivo. Ej.: `firebase-admin` no sirve en las Edge Functions (Deno) |
| Que el paquete exista | Se consulta npm, pub.dev o jsr; un nombre que no existe es un problema |

#### Edición manual

Como en los requerimientos, con botones en cada fila. Lo que sale del diseño aprobado no se edita, para mantener la consistencia:

| Parte de la ficha | Edición |
|---|---|
| Librerías | Agregar, editar y eliminar. Las librerías base de una pieza no se eliminan: las exige la pieza |
| Servicios externos | Editar y eliminar. **No se agregan**: deben coincidir con el diseño aprobado. Para sumar uno se cambia la arquitectura |
| Avisos | Descartar |
| Piezas, servicios opcionales, alta disponibilidad | No se editan: salen del diseño. Para cambiarlos se cambia la arquitectura |
| Contenedores y componentes | No se editan: los calcula el código |

Al guardar, la ficha pasa por las mismas validaciones que la generada, sin IA y sin costo (`/api/revisar-stack`, `revisarStack` en `lib/stack.js`). Como toda edición, el paso pierde su aprobación.

#### En la interfaz

- El paso está en `PASOS` (fase `implementacion`), con generar, regenerar, indicaciones, aprobar, rechazar, editar, "Ampliar con IA" y cascada.
- Los cambios en Implementación solo le quitan la aprobación a Implementación. Aprobar la fase de Diseño ofrece actualizar el stack si quedó desactualizado.
- La ficha muestra:
  - "Revisar antes de aprobar" y avisos;
  - piezas, contenedores, cada componente del diagrama de sistemas y cada elemento de la arquitectura con su implementación;
  - librerías y servicios externos.

#### Al armar el proyecto

- **Cambio de piezas:** si las piezas cambian, el runner borra los contenedores, datos e imágenes del stack anterior antes de levantar.
- **Claves de servicios externos:** van vacías a `.env.example` y como variables de entorno a los servicios que las usan.

#### Probado con IA real

- **Bomberos:**
  - Next.js + Flutter + Supabase (Auth, Realtime, Storage, Edge Functions) + alta disponibilidad, 12 servicios;
  - los 17 componentes del diagrama de sistemas resueltos;
  - Firebase con la API HTTP v1 (`FCM_SERVICE_ACCOUNT_JSON`), sin `firebase-admin`.
- **Taller:** Next.js + Supabase (Auth), 6 servicios, sin advertencias falsas.
- **"Ampliar con IA":** agregó una librería de PDF y rechazó cambiar el backend a Django, con un aviso.
- **Revisión de librerías:**
  - detectó la firma en pantalla del panel web por RF11 y RF28, que la IA había omitido;
  - en la edición manual, con las librerías que faltaban agregadas, solo quedó marcado un paquete inexistente de prueba.

#### Decisiones tomadas en esta etapa

- **Bomberos:** se descartó el tablero de métricas en tiempo real (RF22). Se quitó del Análisis, de los casos de uso, del diagrama de sistemas y de la explicación de la arquitectura con una edición directa, sin cascada. RNF06 quedó solo para la consulta histórica de partes.
- **Servicios externos:** solo los del diseño aprobado; no se agregan en Implementación.

**Terminado cuando:** la ficha está aprobada y determina qué piezas, contenedores y pasos lleva el proyecto. Cumplido con bomberos: la ficha final quedó sin advertencias y aprobada. Antes se corrigieron la arquitectura (alta disponibilidad del Panel Web con balanceador; Realtime solo para la app) y la asignación de requerimientos del diagrama de sistemas (RF14, RF15, RF19, RNF03 a RNF06).

---

### Etapa 5. Paso "Estructura de carpetas" · Terminada

**Objetivo:** definir el árbol completo de archivos antes de escribir código.

**Entradas:**
- el stack aprobado, incluidas sus decisiones por elemento (por ejemplo, qué cliente usa Realtime);
- los requerimientos y los actores;
- el prototipo (nombre, plataforma y RF de cada pantalla, no su HTML);
- el árbol de navegación, el ER, las clases y el diagrama de sistemas;
- la guía (`README.md`) y los archivos fijos de cada pieza.

**Resultado:** una ficha guardada en `proyectos.estructura_implementacion` (`supabase/estructura_implementacion.sql`).

#### Cómo se genera

Lógica en `lib/estructura.js`, ruta `/api/generar-estructura`.

1. **Una generación por pieza con código propio, en paralelo.** Cada pieza recibe solo lo que le corresponde:
   - la web, sus pantallas Web;
   - la app, sus pantallas Móvil;
   - Supabase o PostgreSQL, el ER y las clases completos.
   Así cada respuesta es más chica y no se corta. La alta disponibilidad no genera archivos.
2. **Por cada archivo, la IA indica:**
   - ruta, tipo y propósito;
   - los RF y RNF que implementa y el artefacto del diseño del que sale;
   - lo que cubre: las pantallas del prototipo (una página puede cubrir varias, por ejemplo con una ruta dinámica `[tipo]`), las tablas del ER (migraciones) o el módulo del diagrama de sistemas.
3. **El código valida** y, si encuentra problemas, le pide a la pieza una corrección (un reintento por pieza):
   - **cobertura:** cada pantalla de la plataforma tiene su página, cada entidad del ER su migración, cada componente del diagrama de sistemas con RF tiene archivos, y cada RF queda cubierto por algún archivo de alguna pieza;
   - **rutas:** cada archivo está en la carpeta de su pieza (`carpeta` en `pieza.json`), no repite un archivo fijo y es una ruta válida;
   - **trazabilidad:** no se citan requerimientos inexistentes (por ejemplo, uno descartado), y ningún componente, servicio o función queda sin requerimiento, para evitar funciones que el diseño no pide.
4. **Lo que no se pudo corregir queda en la ficha** (`revision`) y se muestra en "Revisar antes de aprobar".

#### En la interfaz

- El paso está en `PASOS` (fase `implementacion`), después del stack técnico. Se habilita con el stack aprobado y tiene generar, regenerar, indicaciones, aprobar, rechazar, editar, "Ampliar con IA" (cada pieza aplica la instrucción a su lista) y cascada.
- La ficha muestra la cobertura (archivos, pantallas, tablas, módulos y RF) y, por pieza, cada archivo con su tipo, propósito, requerimientos y lo que cubre.
- El explorador de archivos muestra los archivos planificados en cursiva, marcados como "Pendiente", con su propósito, requerimientos y cobertura. Nunca se envían al runner: vacíos romperían la compilación.

#### Probado con IA real

- **Bomberos (Next.js + Flutter + Supabase):**
  - 91 archivos: 38 de la web, 45 de la app y 8 de Supabase;
  - cobertura completa: 36 de 36 pantallas, 22 de 22 tablas, 14 de 14 módulos y 29 de 29 RF;
  - ninguna advertencia;
  - Supabase en 6 migraciones ordenadas (usuarios, vehículos y bitácoras, partes, permisos RLS, Realtime, Storage), la Edge Function de notificaciones y los datos de prueba.
- **Taller (Next.js + Supabase):**
  - 18 archivos, sin pieza móvil;
  - 9 de 9 pantallas, 7 de 7 tablas, 6 de 6 módulos y 16 de 16 RF;
  - ninguna advertencia.
- **Lo que mostró la primera prueba:** con una ficha de stack vieja que incluía `chart.js`, volvió a aparecer el tablero de métricas descartado. Por eso el prompt recibe ahora las decisiones del stack, prohíbe funciones que ningún requerimiento pide, y el código marca componentes y servicios sin requerimiento. Con la ficha aprobada, el tablero no aparece.

**Revisión de la estructura de bomberos generada en la interfaz** (76 archivos, cobertura completa):
- `web/middleware.js` estaba mal nombrado: en Next.js 16 es `web/proxy.js`. Se corrigió con "Ampliar con IA" y la regla quedó en el README de la pieza `nextjs`, para cualquier proyecto.
- Con la misma instrucción se agregaron los catálogos locales de personal y vehículos (para crear partes sin conexión) y el registro del token FCM en DISPOSITIVO. Quedaron 78 archivos.
- Por la decisión de la Etapa 6 (la integridad la calcula la base), sobran `web/lib/seguridad/hashParte.js` y `movil/lib/servicios/cripto_servicio.dart`: quitarlos con "Ampliar con IA" antes de aprobar.

**Pendiente para después:** edición manual de la estructura (agregar, editar o quitar archivos con botones, como en la ficha del stack). Hoy se ajusta con "Ampliar con IA" o regenerando.

**Terminado cuando:** la estructura está aprobada. Desde aquí cada paso solo rellena archivos de este árbol.

---

### Etapa 6. Paso "Base de datos" · Terminada

**Objetivo:** generar la base de datos y comprobar que funciona en su contenedor.

**Entradas:** los archivos de la base en la estructura aprobada (migraciones y datos de prueba, con sus tablas y RF), el ER, las clases, los actores, los requerimientos, el stack y la guía de la pieza.

**Resultado:** el código de cada archivo en `archivos_proyecto` (paso `impl_bd`) y una ficha en `proyectos.bd_implementacion` (`supabase/bd_implementacion.sql`) con los archivos, la última prueba y lo que hay que revisar.

#### Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Cifrado en reposo (RNF05 de bomberos, AES-256) | En el disco del servidor (BitLocker o LUKS), como Supabase y las nubes. No se cifran columnas. El README del proyecto generado debe documentarlo (Etapa 11) |
| Integridad: hash de firmas, códigos secuenciales, bloqueo tras cierre, reglas que impiden operaciones | La calcula la base con funciones y triggers, no el cliente |
| Tabla de usuarios con Supabase | Con el nombre de la entidad del ER (ej. `usuario`), con `id` que referencia `auth.users`. Cambió la regla `public.perfiles` del README de la pieza |

#### Cómo se genera

Lógica en `lib/bd.js`, ruta `/api/generar-bd`.

1. **Un archivo por petición, en el orden en que se aplican** (migraciones por nombre y después los datos de prueba). La interfaz los pide uno a uno, como las pantallas del prototipo, y guarda cada uno apenas llega. Cada archivo recibe el código de los anteriores.
2. **El código revisa cada archivo** y, si encuentra problemas, le pide una corrección (un reintento):
   - crea las tablas que le asignó la estructura (entidad en minúsculas) y ninguna de otro archivo ni fuera del ER;
   - cada clave foránea apunta a una tabla que ya existe en ese punto;
   - con Supabase: RLS activado y políticas en cada tabla;
   - los datos de prueba insertan solo en tablas existentes y crean los usuarios en `auth.users`;
   - sin `drop table`, `truncate`, `begin`/`commit` ni comandos de psql.
3. **Prueba en contenedores** (`probarbd` del runner, acción `probar-bd` de `/api/implementacion`):
   - se arma un proyecto aparte, `icase_<id>-bd`, con su carpeta y sus volúmenes;
   - aplica todo desde cero: con Supabase, la tarea `migraciones`; con PostgreSQL, sus scripts de inicio;
   - lee cada tabla con su RLS, sus políticas, sus filas y si la API puede leerla, además de los buckets, las tablas en Realtime y los usuarios;
   - al terminar se borra. No toca el proyecto del usuario ni sus puertos. Tarda de 20 a 50 segundos.

   Cómo se prueba lo declara cada pieza en `bd` de su `pieza.json`.
4. **Corrección automática**, hasta 3 intentos en total:
   - si un archivo falla, se identifica en la salida, se regenera con el error de PostgreSQL y se prueba de nuevo;
   - si todo se aplica pero quedan tablas sin datos de prueba, se completa `seed.sql` con la lista de las vacías;
   - una corrección no puede quitar datos para que el error desaparezca: el código compara las filas de `seed.sql` antes y después, y si bajan lo marca como problema y pide otra corrección;
   - si completar datos deja una base que ya no se aplica, se vuelve a la última versión que sí se aplicaba.
5. **Revisión del resultado** (`revisarPrueba`):
   - entidades del ER sin tabla y tablas fuera del ER;
   - tablas sin RLS, sin políticas o sin acceso desde la API;
   - tablas sin datos de prueba (cada tabla debe tener al menos una fila) y menos usuarios que actores;
   - usuarios de prueba con `instance_id` distinto de ceros (no podrán iniciar sesión) o con el rol en `raw_user_meta_data`. Lo consulta el runner en `auth.users`;
   - un requerimiento que pide un resumen criptográfico sin `digest` en la base.

   Al validar cada archivo, el código también marca el rol tomado de `raw_user_meta_data` (`->> 'rol'`), que es una escalada de privilegios.

   Lo que queda va a "Revisar antes de aprobar".
6. **Usuarios de prueba:** uno por actor, `<actor>@prueba.local` con la contraseña `Prueba123!` (`CONTRASENA_PRUEBA` en `lib/archivosBD.js`). Se verificó que inician sesión en Auth y leen su fila por la API con RLS.

#### En la interfaz

- El paso está en `PASOS` con `archivos: true`. Se habilita con la estructura aprobada. Tiene generar, regenerar, indicaciones, aprobar, rechazar, editar y cascada. Al eliminarlo o rechazarlo, también se borra su código.
- **Si la generación se corta** (la IA no responde o se cierra la pestaña):
  - el avance queda guardado después de cada archivo, en la ficha marcada `incompleto` y con su `total`;
  - el botón pasa a "Continuar base de datos (n/total)" y sigue desde el archivo que faltaba, sin repetir ni volver a pagar los anteriores;
  - "Empezar de cero" regenera todo;
  - si el paso quedó desactualizado por un cambio anterior, empieza de cero.
- "Ampliar con IA" elige un archivo, aplica la instrucción y prueba de nuevo.
- "Probar de nuevo" vuelve a aplicar todo desde cero. Si tuvo que corregir algo, el paso pierde la aprobación.
- Con Claude se avisa el costo antes de generar: unos 10 centavos por archivo, más las correcciones.
- La ficha (`FichaBD.js`) muestra:
  - el estado de la prueba;
  - la cobertura: tablas del ER, RLS y políticas, datos de prueba, usuarios y la contraseña de prueba;
  - cada tabla y cada archivo, marcado como corregido o editado.
- **El código se ve y se edita en el explorador de archivos** ("Archivos del proyecto"):
  - "Expandir" lo abre a pantalla completa; se cierra con Esc.
  - "Editar" lo vuelve un editor con números de línea: Tab, Ctrl+S, Guardar y Cancelar.
  - Al guardar, el archivo queda como `editado` en `archivos_proyecto`, el paso pierde la aprobación y la prueba queda en "Hay cambios hechos a mano sin probar".
  - Solo se edita el código generado de un paso que se puede trabajar. Los archivos de plantilla no se editan, y los de un paso aprobado se bloquean hasta pulsar "Editar" en el paso.
- **Los pasos de la fase se pliegan** desde su título:
  - abierto por defecto, solo el que se está trabajando (el primero sin aprobar);
  - los plegados muestran un resumen (aprobado, piezas, archivos, estado de la prueba, lo que falta revisar);
  - en la ficha del stack, cada sección es desplegable, con su cantidad.

#### Costo con Claude (Sonnet 5, $2 y $10 por millón de tokens de entrada y salida)

Estimado con el tamaño real de lo que generó Gemini:
- **Bomberos:** unos $0,65 a $0,80. Son ~150.000 tokens de entrada, porque cada archivo lleva el diseño (~13.000 tokens) y el código de los anteriores, y ~26.000 de salida, más el razonamiento.
- **Taller:** unos $0,15 a $0,20.
- **Cada corrección tras la prueba:** unos $0,10.

El aviso de la interfaz (10 centavos por archivo) acierta en bomberos y exagera en el taller.

#### Probado con IA real (Gemini 3.8 Flash, fuera de la interfaz)

- **Bomberos:**
  - 7 archivos, unas 2.600 líneas, en unos 3 minutos;
  - la primera vez falló `seed.sql` por `provider_id` en `auth.identities`; la corrección con el error lo arregló y la regla quedó en el README de Supabase;
  - con el README corregido, pasó al primer intento: 22 de 22 tablas con RLS y políticas, 3 usuarios, los buckets `firmas` y `croquis`, y Realtime solo en `parte`;
  - las reglas quedaron en la base: código secuencial del parte, vehículo en mantenimiento (RF10), cierre con recursos y firmas (RF18), bloqueo tras el cierre (RF19), numeración de bitácoras y el SHA-256 del parte con `extensions.digest` (RNF04).
- **Taller:**
  - 4 archivos, al primer intento;
  - 7 de 7 tablas con RLS y datos, 2 usuarios;
  - orden sin trabajos no se termina (RF10), orden cerrada no se modifica (RF12) y el cobro es solo del Recepcionista.
- **Lo que mostró la primera prueba:** solo con la regla general en el prompt, la IA dejó el hash como columna que valida el formato pero lo recibe del cliente. Por eso el prompt nombra los RF que piden un hash y la revisión exige `digest`. En la segunda generación, la base calcula el hash y rechaza una firma cuyo hash no coincide. Todavía lo compara con el que manda el cliente en vez de escribirlo ella misma: revisarlo al aprobar.

#### Generada desde la interfaz (bomberos, Gemini, 20 de octubre)

- **Google saturado:** respondieron 503 y respuestas cortadas, pero la cadena de respaldo terminó cada archivo. Por eso se agregaron:
  - "Continuar base de datos";
  - el log claro ("Google cortó la respuesta (saturación)");
  - el selector de modelo gratuito.
- **Error de la interfaz, corregido:** una prueba fallida también trae `error`, y la interfaz la tomaba como "no se pudo probar", así que no lanzaba la corrección automática. Ahora se distingue por `ok`.
- **`0001`:** sintaxis (`end if;` en lugar de `end;`) y una escalada de privilegios: el rol se tomaba de `raw_user_meta_data`. La prueba solo detecta la primera.
- **`seed.sql`:** `setval` sobre una secuencia, firmas repetidas en varios registros y roles de firmante que no son actores.
- Las versiones corregidas de los dos archivos se le entregaron al usuario para pegarlas en el editor (ver "Estado actual").

**Revisión completa de los 7 archivos de bomberos (20 de octubre).** Además de lo anterior, se encontraron:
- `firmar_parte()` sin comprobar quién firma (es `security definer` y se salta la RLS);
- firmas de la bitácora vehicular enlazables a mano sin verificación;
- bitácora de guardia que se podía entregar sin firma;
- `jsonb_agg` sin `order by` en el contenido que se firma;
- notificaciones editables por su dueño;
- un seed sin partes, con lo que ninguna regla de `0004` se ejecutaba en la prueba.

Se entregaron completos los archivos corregidos `0001`, `0004`, `0006` y `seed.sql` (5 partes, firmas y cierres hechos con las funciones de la base, bitácoras firmadas y entregadas, notificaciones por trigger).

**Por qué pasó y qué se cambió, para cualquier proyecto:**
- **Guía de `supabase`,** cinco reglas nuevas:
  - el rol sale de `raw_app_meta_data` y el trigger sobre `auth.users` es solo de inserción;
  - toda función `security definer` comprueba quién la llama;
  - toda firma enlazada se verifica con un trigger;
  - el contenido firmado va ordenado;
  - hay datos de prueba en todas las tablas, con las funciones ejecutadas como cada usuario mediante `request.jwt.claims`.
- **Prompt de `lib/bd.js`:** pide al menos una fila en cada tabla del ER y ejecutar los flujos con las funciones de la base. Al corregir, prohíbe quitar inserciones.
- **Código:**
  - la validación marca el rol tomado de `raw_user_meta_data` y las correcciones que quitan filas;
  - la revisión de la prueba lista las tablas vacías y revisa los usuarios de prueba;
  - la corrección automática completa las tablas vacías.
- **Mezcla de modelos:** la saturación de Google hizo que modelos distintos generaran archivos distintos, con convenciones distintas. Conviene elegir un solo modelo en el selector antes de generar la base.

**Resultado final de bomberos:** con los cuatro archivos corregidos, la prueba dio 22 de 22 tablas, todas con RLS, políticas y datos de prueba, y 3 usuarios. Los 7 archivos se ven en la ficha y en el explorador; `0005` (Realtime) y `seed.sql` no crean tablas, y está bien.

**Funciones de la base que usarán los pasos siguientes** (las RPC del contrato):
- `firmar_parte(parte, rol, archivo)`;
- `firmar_bitacora_vehicular(bitacora, tipo, archivo)`;
- `cerrar_y_entregar_bitacora_guardia(bitacora, archivo)`;
- `registrar_firma(...)`, `verificar_integridad_firma(...)` y las `obtener_contenido_*_json(...)`;
- `rol_actual()`.

El cierre de un parte es un `update` de `estado_cierre`, que valida la base.

**Queda para la Etapa 8:**
- los disparadores que llaman a la Edge Function de notificaciones (asignación, cierre);
- la tarea programada (`pg_cron`) de los partes pendientes de completar o firmar.

Necesitan la función ya escrita.

**Terminado cuando:** la base arranca con todas las tablas del ER, sus permisos y los datos de prueba, sin errores en los logs.

---

### Etapa 7. Paso "Contrato / API"

**Objetivo:** definir las operaciones antes de generar el backend y los clientes, para que encajen aunque se generen por separado.

**Entradas:** requerimientos, casos de uso, diagrama de clases, sistemas y el esquema aprobado.

**Tareas:**

1. Generar el contrato según el stack:
   - con Express, un `openapi.yaml`;
   - con Supabase, el mapa de tablas y vistas expuestas por PostgREST, las funciones RPC y las Edge Functions, con sus permisos.
2. Para cada operación, indicar los roles que pueden usarla y el requerimiento que cumple.
3. Validar que cada acción de las pantallas del prototipo tenga su operación.

#### Propuesta para construirlo (por decidir con el usuario)

1. **Inventario de la base sin IA.** Con Supabase, el contrato parte de lo que existe de verdad. El runner lo lee de la base probada, igual que la prueba de la Etapa 6:
   - las tablas expuestas por la API, con sus columnas;
   - las políticas por operación (`select`, `insert`, `update`, `delete`) y los permisos;
   - las funciones RPC con sus argumentos: `firmar_parte`, `firmar_bitacora_vehicular`, `cerrar_y_entregar_bitacora_guardia`...

   Así el contrato no inventa operaciones que la base no tiene.
2. **La IA hace el mapa.** Para cada pantalla del prototipo, toma sus acciones (botones y formularios, de su HTML) y sus RF, y le asigna la operación que la cumple: tabla y operación, una RPC o una Edge Function. Con Express, genera el `openapi.yaml`.
3. **Lo que falta se detecta, no se inventa.** Una acción sin operación queda marcada. Ejemplo en bomberos: crear cuentas de usuario (RF01) no se puede hacer desde el navegador, porque exige la clave de servicio de Auth, y necesita una Edge Function. Lo que falta se anota para la Etapa 8.
4. **Prueba de permisos real.** En el proyecto de prueba, el runner llama a la API como cada usuario de prueba (Administrador, Jefe de guardia, Bombero) y comprueba que cada operación se permite o se rechaza según el contrato. Por ejemplo, el Bombero no puede avalar un parte ni crear vehículos. Es la parte de seguridad que la prueba de la Etapa 6 no veía.
5. **Resultado:** una ficha en `proyectos.contrato_implementacion` con las operaciones por pantalla, sus roles y RF, lo que falta, y el resultado de la prueba de permisos.

**Terminado cuando:** el contrato está aprobado y cubre todas las acciones del prototipo.

---

### Etapa 8. Paso "Backend"

**Objetivo:** generar la lógica de negocio que cumple el contrato.

**Entradas:** estructura, contrato, esquema, requerimientos, sistemas y clases.

**Tareas:**

1. Generar los archivos uno por uno, según el stack:
   - con Express: config, modelos, middlewares, servicios, controladores y rutas;
   - con Supabase: Edge Functions y funciones de base de datos.
2. Integrar los servicios externos reales, leyendo sus claves del `.env` y respondiendo con un error claro si falta alguna.
3. Validar en contenedores: el backend arranca y las operaciones del contrato responden contra la base real.
4. Si un archivo falla, regenerar solo ese archivo con el error como contexto.

**Terminado cuando:** las operaciones del contrato responden con datos de la base.

---

### Etapa 9. Paso "Web"

**Objetivo:** convertir las pantallas Web del prototipo en la aplicación web de la tecnología del diseño (Next.js, React...).

**Entradas:** pantallas Web del prototipo, árbol de navegación (vista Web), contrato y estructura.

**Tareas:**

1. Generar el cliente de la API a partir del contrato.
2. Generar las rutas y el menú a partir del árbol de navegación.
3. Convertir cada pantalla en su página, una por petición: mantener el diseño aprobado y reemplazar los datos de ejemplo por datos reales.
4. Validar en contenedores: la aplicación compila y abre.

**Terminado cuando:** la web funciona en el navegador, con la navegación del árbol aprobado y datos reales.

---

### Etapa 10. Paso "Móvil" (solo si la arquitectura tiene app móvil)

**Objetivo:** convertir las pantallas Móvil del prototipo en la app de la tecnología del diseño (Flutter...).

**Entradas:** pantallas Móvil del prototipo, árbol de navegación (vista Móvil), contrato, estructura y requerimientos de uso sin conexión.

**Tareas:**

1. Generar la navegación y cada pantalla de la app, una por petición.
2. Conectar con el backend y, si el diseño lo pide, el almacenamiento local y la sincronización.
3. Validar: la vista previa compila en su contenedor.

**Terminado cuando:**

- La vista previa abre desde icase-tool.
- La app corre en el celular o el emulador con `flutter run`.

---

### Etapa 11. Cierre de la implementación

**Tareas:**

1. **Claves de servicios externos:** lugar en el panel de ejecución para escribirlas. El runner las guarda en el `.env` del proyecto y nunca en Supabase.
2. **"Descargar proyecto":** ZIP con todo el código, el `docker-compose.yml`, `.env.example` y el README.
3. **Eliminar un proyecto:** al borrarlo de icase-tool, el runner borra sus contenedores, sus volúmenes, sus imágenes y su carpeta de trabajo.
4. **Aprobación general de la fase** (`fases_aprobadas.implementacion`).

**Terminado cuando:**

- El ZIP se levanta en otra PC con Docker con un solo comando.
- Desde icase-tool se levanta, se abre y se detiene cualquier proyecto.

Después de esta etapa sigue la fase de **Pruebas**, que se ejecuta sobre estos mismos contenedores.

## 12. Revisiones con el ingeniero

| Momento | Qué se muestra |
|---|---|
| Fin de la Etapa 3 | Las piezas del catálogo y la combinación de bomberos corriendo en contenedores (lista) |
| Fin de la Etapa 4 | La ficha de stack técnico de bomberos generada desde el diseño y aprobada |
| Fin de la Etapa 5 | La estructura de carpetas generada por icase-tool a partir del diseño |
| Fin de la Etapa 10 | El sistema completo generado y funcionando, web y móvil |

## 13. Ejemplo: proyecto de bomberos

Confirmado con su diagrama de arquitectura y su diagrama de sistemas. Las tecnologías de los dos coinciden. El tablero de métricas en tiempo real (RF22) se descartó. La alta disponibilidad solo aparece en la arquitectura ("Servidor Web Master / Esclavo"); se acordó implementarla como servidores web con balanceador.

| En el diseño | Implementación | Contenedor |
|---|---|---|
| Panel Web · Next.js (6 módulos) | Proyecto Next.js | `web-master`, `web-esclavo` |
| Alta disponibilidad · Servidor Web Master / Esclavo | Balanceador nginx con cambio automático al esclavo | `balanceador` |
| App Móvil · Flutter (2 módulos) | Proyecto Flutter; vista previa web en contenedor y app real con `flutter run` | `movil` |
| Almacenamiento local · SQLite | Dentro de la app Flutter, con sincronización al volver la conexión | — |
| Supabase · Auth (RF01, RF02, RNF04, RNF05) | GoTrue | `auth` |
| Supabase · API de datos · PostgREST | PostgREST | `rest` |
| Supabase · Realtime (RF04, RF23) | Realtime | `realtime` |
| Supabase · Edge Functions · Deno/TypeScript (RF30) | Edge Runtime, con las funciones generadas | `functions` |
| Supabase Storage · firmas y croquis | Storage | `storage` |
| Puerta de entrada de Supabase | Envoy | `api-gw` |
| PostgreSQL | PostgreSQL de Supabase | `db` |
| Tablas del proyecto | Tarea de un solo uso que las aplica y termina | `migraciones` |
| Google Maps, Firebase Cloud Messaging | Servicios reales con claves en `.env` | — |

Por comparación, el taller mecánico (Next.js + Supabase con Auth y API de datos) lleva `web`, `db`, `api-gw`, `rest`, `auth` y `migraciones`.

## 14. Pendientes por decidir

- **Propuestas sin respuesta del usuario** (detalle en "Estado actual"):
  - el panel de Ejecución: Docker apagado, la salida 0 de `migraciones` con `--wait` y levantar solo las piezas con código;
  - el aviso claro en Vercel;
  - el costo estimado de la base según el tamaño del diseño.
- **Documentación del taller:** capturas, licencia definitiva y el paso a `main` (ver "Estado actual").
- **Script del esquema base de Supabase** (`proyectos` desde cero), para que una instalación nueva no dependa del panel.
- **README del proyecto generado (Etapa 11):** cómo levantarlo, usuarios de prueba y que el cifrado en reposo se resuelve en el disco del servidor.
- **Edición manual de la estructura de carpetas:** como en la ficha del stack.
- **Réplica de la base de datos** en los diseños con alta disponibilidad: hoy se duplica el servidor web; replicar la base y su cambio automático (Patroni) queda como mejora posterior.
- **Servicios externos en la app móvil:** Firebase y Google Maps necesitan además la configuración del proyecto de Firebase (`google-services.json`), que aporta el usuario.
