---
title: Plan de implementación
sidebar_position: 6
---

# Plan de trabajo: fase de Implementación

Guía de construcción de la fase de Implementación de icase-tool: cómo se usa lo aprobado en Análisis y Diseño, qué entrega cada etapa y cuándo se da por terminada. Es el documento técnico interno del equipo: decisiones, estado de cada etapa y guía para retomar el trabajo.

## Estado actual (8 de noviembre de 2026)

**Se está preparando la presentación desplegada del 10 de noviembre (ver "Plan de la semana"). Las Etapas 1 a 8 están terminadas: la cadena de Implementación de bomberos se rehízo desde cero (stack, estructura, base, contrato de API y backend), todo probado en contenedores. Lo siguiente es la Etapa 9 (Web), la más importante para la presentación; después, el despliegue en Azure, y la Etapa 10 (Móvil) solo si da el tiempo.** Los cambios están en `develop` (commits `eb68c56` y `1861771`); falta pasarlos a `main` para que Vercel los publique.

- **Bomberos (rehecho desde el 3 de noviembre):**
  - stack técnico aprobado (Next.js, Flutter y Supabase con alta disponibilidad del panel web; `firebase_core` agregado a mano);
  - estructura de carpetas aprobada: 129 archivos (Next.js 50, Flutter 58, Supabase 21), 36/36 pantallas, 22/22 tablas, 14/14 módulos, 29/29 RF. Flutter y Supabase los generó Claude Sonnet 5; la pieza Next.js se cortó por el límite de tokens y la escribió Claude en la conversación, pasó el validador del código sin avisos y se insertó con SQL (ver "Avance del 5 al 8 de noviembre");
  - base de datos generada con Claude Haiku 5.5 (unos 20 centavos), revisada archivo por archivo, con 5 archivos corregidos y probada de nuevo: 22/22 tablas con RLS, políticas y datos, y 3 usuarios. Después se agregaron al seed registros para la prueba de permisos (partes 7 y 8, bitácoras vehiculares 3 a 6, bitácora de guardia 2);
  - contrato de API escrito a mano en la conversación y pegado con "Pegar contrato": 48 operaciones, 728/728 controles, 29/29 RF, 0 errores; prueba de permisos 119 correctas, 0 fallidas, 16 sin verificar (operaciones sin datos de prueba posibles) y 4 pendientes (Auth); aprobado;
  - backend: `crear-usuario` y `notificar-push` generadas con Haiku 5.5; `crear-usuario` corregida a mano (contraseña temporal en vez de invitación por correo) y probada en Docker: Administrador crea la cuenta, Bombero y Jefe de guardia reciben 403.
- **Azure:** máquina, Docker, runner y Caddy con HTTPS funcionando; Vercel conectado. La máquina se apaga cuando no se usa.
- **El taller** no se rehízo; entra solo si sobra tiempo.

| Etapa | Estado |
|---|---|
| 1. Proyecto de referencia hecho a mano | Terminada |
| 2. Base de la fase dentro de icase-tool | Terminada |
| 3. Piezas del catálogo | Terminada |
| 4. Paso "Stack técnico" | Terminada (ficha de bomberos aprobada de nuevo el 6 de noviembre) |
| 5. Paso "Estructura de carpetas" | Terminada (estructura de bomberos aprobada; ahora conserva las piezas que salen bien si otra falla) |
| 6. Paso "Base de datos" | Terminada (base de bomberos rehecha con Haiku 5.5 y probada 22/22) |
| 7. Paso "Contrato / API" | Terminada (contrato de bomberos: 48 operaciones, 728/728 controles, 29/29 RF; permisos 119 correctas y 0 fallidas) |
| 8. Paso "Backend" | Terminada (bomberos: `crear-usuario` y `notificar-push` con Haiku 5.5; prueba de `crear-usuario` 3/3 correctas) |
| **9. Paso "Web"** | **Siguiente** (en la interfaz figura como "Frontend"; se construirá para servir también a la app móvil) |
| 10. Paso "Móvil" | Opcional, si da el tiempo |
| 11. Cierre y publicación | El 10 de noviembre: subir a `main`, Azure, dirección pública por proyecto y ensayo |

Pendientes inmediatos:

1. **Documentación (taller de clase).** Construida y publicada en `/docs`. Faltan cosas del usuario:
   - las **3 capturas restantes** de la aplicación real, en `docs-site/static/img/capturas/`, con los nombres que indican los recuadros "Captura pendiente" (inicio de sesión, página de inicio, creación de proyecto, fases de Análisis y Diseño aprobadas, entrevista con IA, requerimientos, diagrama expandido, prototipo e informe ya incorporadas):
     - `09-explorador`, `11-bomberos-stack` y `12-bomberos-base`;
     - todas `.png`; la 07 y la 12 también aparecen en el README.

     Después se reemplazan los recuadros por las imágenes.
   - pasar `develop` a `main` y hacer push: los enlaces de la documentación a los archivos de GitHub apuntan a `main`;
   - dar acceso al docente si el repositorio es privado;
   - confirmar la licencia (se puso MIT a nombre de CCAJ Software Solutions).
2. **Etapa 9 (Web):** construir el paso que genera la web archivo por archivo (cada página a partir de su pantalla del prototipo y con las operaciones del contrato), probarla compilando en Docker, generarla con Haiku para bomberos y revisarla en la conversación antes de aprobar. Debe agregar los botones que el prototipo no tiene: asignar rol, suspender cuenta y editar personal y vehículos.
3. **Despliegue (10 de noviembre):** pasar `develop` a `main`; actualizar la copia del runner en Azure (`runner/index.mjs`, `lib/pruebaContrato.js`, `lib/inventarioContrato.js`); dirección pública por proyecto en Caddy (web y puerta de entrada de Supabase); sección "Aplicación"; ensayo completo desde Vercel con la PC apagada.
4. **Taller:** generar y probar su base desde la interfaz, como segundo proyecto, antes de dar por buenas las reglas nuevas para cualquier sistema.
5. **Script del esquema base de Supabase:** la tabla `proyectos` se creó al inicio desde el panel y no hay un script que la cree desde cero. Para armarlo hay que confirmar sus columnas en el panel.
6. **Propuestas sin respuesta del usuario.** **No están aplicadas:** esperar el sí.
   - **Docker apagado:** el panel consulta el estado cada 10 segundos y deja un `POST /api/implementacion 500` por consulta. Se propuso mostrar "Docker Desktop no está encendido" con un botón Reintentar, dejar de consultar hasta entonces y responder 503 en vez de 500.
   - **"Levantar" con Supabase:** `docker compose up --wait` termina con error cuando la tarea `migraciones` sale con código 0. El proyecto queda funcionando, pero el panel muestra "Docker devolvió un error.". Se propuso tratar como éxito la salida 0 de las tareas de un solo uso.
   - **"Levantar" con solo la base generada:** desde la Etapa 6 hay código, así que el botón se habilita, pero la web y la app todavía no tienen archivos y su compilación falla. Se propuso levantar solo los servicios de las piezas que ya tienen código.
   - **En Vercel:** cambiar "Falta RUNNER_TOKEN en .env.local" por "La ejecución en contenedores solo funciona con icase-tool en local" y dejar de consultar el estado (ver "Despliegue en Vercel").
   - **Costo estimado de la base con Claude:** hoy son 10 centavos por archivo, que acierta en bomberos pero duplica el costo real en el taller. Se propuso calcularlo con el tamaño del ER, las clases, los requerimientos y las tablas de cada archivo.

## Plan de la semana: presentación desplegada (3 al 10 de noviembre de 2026)

El ingeniero va a revisar el proyecto **desplegado**, no en local. Se necesita que, desde icase-tool en Vercel, el proyecto de bomberos (y cualquier otro) tenga su aplicación generada funcionando en una dirección pública, como una página normal.

**Cambio de estado (3 de noviembre):** el usuario eliminó toda la implementación de bomberos para repetirla desde cero con el despliegue en mente. Las correcciones a mano de la base (`0001`, `0004`, `0006`, `seed.sql`) ya no existen; las reglas de seguridad quedaron en la guía de Supabase, y la nueva base debe probarse igual.

### Arquitectura de la presentación

```
Vercel (icase-tool)  ──HTTPS + token──▶  Azure: Ubuntu + Docker + runner + Caddy
                                           └─ contenedores de cada proyecto generado
                                              (base Supabase, backend, web)
```

- icase-tool sigue en Vercel y llama al runner con `RUNNER_URL` y `RUNNER_TOKEN`.
- El runner y Docker pasan a una máquina virtual en **Azure for Students** ($100 de crédito, 365 días, verificado el 3 de noviembre; la cuenta es de la hermana del usuario, con su consentimiento).
- Oracle Cloud se descartó: pide tarjeta y la del usuario rechaza pagos internacionales. Vercel no ejecuta contenedores. Render, Railway y Fly.io ya no tienen un nivel gratis que aguante varios contenedores.
- **Respaldo:** el runner en la PC del usuario con un túnel gratis (Cloudflare, ngrok o Tailscale Funnel). Es el mismo código; solo cambia `RUNNER_URL`.

### Máquina en Azure

- Ubuntu Server 24.04, x64, **8 GB de RAM** (Supabase y Next.js juntos no caben cómodos en 4), disco de 64 GB o más.
- IP pública **estática** (con IP dinámica cambia al desasignar la máquina y Vercel dejaría de encontrarla).
- Puertos 22, 80 y 443. Llave SSH: el archivo `.pem` se queda en la PC del usuario y no se comparte.
- **Cuidar el crédito:** apagar con "Detener (desasignar)" desde el portal cuando no se use; apagar desde Linux sigue cobrando. Aviso de presupuesto al 50 %.
- HTTPS sin comprar dominio: nombre gratuito de Azure o un servicio como sslip.io. Se confirma al montarlo.

### Calendario

| Día | Usuario | Claude |
|---|---|---|
| 1 (3 nov) | Crear la máquina en Azure y pasar la IP y el usuario | Docker en el servidor y este plan (hecho) |
| 2 (4 nov) | Nombre DNS y variables en Vercel | Runner en Linux, Caddy con HTTPS (hecho) |
| 3 a 5 (5 a 7 nov) | Regenerar stack, estructura y base de bomberos en local | Estructura con "Continuar", pieza Next.js, selector de modelo de Claude, revisión de la base, validador del contrato (hecho) |
| 6 (8 nov) | Pegar contrato, probar permisos y aprobar; generar, probar y aprobar el backend | Contrato escrito a mano, "Pegar contrato", arreglos de la prueba de permisos, paso Backend completo (hecho) |
| 7 (9 nov) | Generar la web de bomberos, revisarla y aprobarla | Paso Web; móvil si da el tiempo |
| 8 (10 nov) | Subir a `main`, encender Azure, ensayo completo desde Vercel con la PC apagada | Runner de Azure al día, dirección pública por proyecto, sección "Aplicación", correcciones, CHANGELOG |

Se trabaja primero en local (más barato y sin el límite de tiempo de Vercel) y al final se despliega: Azure solo se enciende para probar que "Levantar" y la dirección pública funcionan allá.

### Avance del día 1 (3 de noviembre)

- Máquina de Azure creada y probada por SSH: Ubuntu 24.04, x86_64, 2 núcleos, 7,7 GB de RAM, 61 GB de disco, IP pública estática.
- Docker 29.9.3 y Compose 5.7.0 instalados; `azureuser` usa Docker sin `sudo`; carpeta de trabajo `/srv/icase-workspaces`.
- La llave SSH y los datos de conexión están en `azure/` (ignorada por git, incluida la IP). Se usa una copia de la llave en `~/.ssh_icase/key`, fuera del repo.
- **Falta (día 2):**
  1. nombre DNS gratuito para la IP (etiqueta de nombre DNS en Azure);
  2. runner para Linux (carpeta, dirección, token);
  3. Caddy con HTTPS;
  4. `RUNNER_URL` y `RUNNER_TOKEN` en Vercel;
  5. regenerar la cadena de bomberos (stack, estructura, base y contrato; el usuario eliminó todo desde "Stack técnico");
  6. cambios del validador del contrato, a la espera del sí del usuario.

### Avance del día 2 (4 de noviembre)

- Nombre DNS de la máquina: `icase-tool.chilecentral.cloudapp.azure.com` (región Chile Central, tamaño Standard B2as v2: 2 vCPU y 8 GiB).
- En el servidor: Node 22, Caddy con HTTPS (certificado real, reenvía a `127.0.0.1:4100`) y el runner como servicio `icase-runner` (en `~/icase-runner`, token en `~/icase-runner.env`, proyectos en `/srv/icase-workspaces`). Los dos arrancan solos.
- Comprobado desde internet: sin token o con token malo, 401; con el token correcto, 200.
- El runner usa por defecto `/srv/icase-workspaces` en Linux (`runner/index.mjs`); en Windows no cambia.
- Vercel (rama `main`, merge del PR #17 desde `develop`) tiene `RUNNER_URL` y `RUNNER_TOKEN`; el panel de ejecución de un proyecto muestra los servicios en "sin crear" y sin error, o sea, conecta.
- El token del servidor está en `azure/runner.env` (ignorada por git). El de `.env.local` es otro: es el del runner de la PC.
- **Falta:** probar la base de datos en el servidor (la primera prueba real), cambios del validador del contrato (a la espera del sí), dirección pública por proyecto en Caddy, sección "Aplicación", Etapas 8 y 9.
- **La máquina quedó apagada (desasignada) al cierre del 4 de noviembre**, para cuidar el crédito. Al retomar: portal de Azure, máquina `icase`, Iniciar. No borrar la IP ni el nombre DNS.

### Avance del 5 al 8 de noviembre

Cambios de icase-tool (en `develop`, sin confirmar todavía):

- **Estructura de carpetas: lo que sale bien no se pierde** (`lib/estructura.js`, `page.js`). Las piezas se generan en paralelo; antes, si una fallaba (corte por límite de tokens o saturación), se descartaban todas aunque ya estuvieran pagadas. Ahora se guardan las que salieron, la ficha queda `incompleto` con `faltan`, el botón pasa a "Continuar estructura (falta X)" y genera solo esas piezas; "Empezar de cero" sigue disponible. No se puede aprobar una estructura incompleta. En "Ampliar con IA", la pieza que falla conserva su lista. Pruebas: `tests/estructura-parcial.test.mjs` (3).
- **Pieza Next.js escrita a mano e insertada por SQL:** Claude Sonnet 5 se cortó en la pieza más grande. Se escribió en la conversación, se pasó por `validarPieza` con los datos reales del diseño (23/23 pantallas web, 6/6 módulos, sin avisos) y se insertó con `respaldos/estructura-bomberos/completar-estructura.sql` en el SQL Editor de Supabase. Ese SQL guarda antes una copia en el esquema `respaldos` (con RLS), solo actúa si la estructura sigue incompleta y corrige 5 propósitos (firma sin hash en la app, adjuntos detrás de la interfaz local, orden de las políticas `0002`/`0003`, push opcional en `0016`) y agrega la Edge Function `crear-usuario` (RF01).
- **Elegir el modelo de Claude** (`lib/modelosClaude.js`, nuevo): al activar "Usar Claude", la barra lateral muestra "Modelo de Claude" con Haiku 5.5 ($0,10/$0,50 por millón), Sonnet 5, Sonnet 5.5 y Opus 5.5. La preferencia viaja como `usarClaude: "claude:<id>"`; sin elección se usa `CLAUDE_MODELO` (en `.env.local`: `claude-haiku-5-5`, con `CLAUDE_MAX_TOKENS=64000`). Los avisos de costo se escalan al precio del modelo elegido y el gasto se calcula con su precio real (Haiku cobra más con entradas de más de 100.000 tokens). La etiqueta del paso muestra "Claude Haiku 5.5". Prueba: `tests/modelo-claude.test.mjs`.
- **Lección:** Haiku 5.5 es 20 veces más barato que Sonnet 5. La base de bomberos costó 20 centavos con Haiku y estaba bien hecha; con Sonnet se habían gastado unos 15 dólares en intentos. Para generar, usar Haiku y revisar con Claude en la conversación; Sonnet u Opus solo para un paso que no salga.
- **Navegación entre fases:** Diseño tiene "← Volver a Análisis" e Implementación "← Volver a Diseño" en la barra de color; Análisis conserva "Continuar a Diseño". El antiguo "← Volver" pasó a ser "← Resumen", un enlace encima del encabezado de cada fase.
- **Validador del contrato corregido** (`lib/validarContrato.js`), con el sí del usuario. En la primera generación con Gemini, unos 23 de 37 errores eran de las reglas, no del modelo. Reglas generales:
  - acepta los nombres del SDK de Supabase para Auth (`auth.signInWithPassword` es login, `signOut` logout, `getSession` sesion…) y los normaliza;
  - acepta guiones en los nombres de Edge Functions (`admin-crear-usuario`);
  - cerrar sesión (operaciones solo de Auth) no tiene que cubrir un RF de la pantalla;
  - una operación sin botón (consulta al cargar, token push) es una advertencia, no un error;
  - el error de roles dice qué rol sobra y en qué RF, y compara nombres sin mayúsculas ni tildes.

  Pruebas: `tests/contrato.test.mjs` pasa de 18 a 23.
- **Contrato que no cabe en una respuesta** (`lib/contrato.js`, `lib/accionesContrato.js`), con el sí del usuario. El primer contrato de bomberos con Haiku se cortó a los 64.000 tokens y costó 30 centavos: el prototipo tiene 728 controles (460 distintos por pantalla) y el prompt llevaba la lista completa (138.000 caracteres) y las 19 migraciones, lo que subía la entrada a la tarifa alta de Haiku. Ahora los controles iguales de una pantalla forman un grupo que la IA asigna una vez (`agruparAcciones`, `expandirAsignaciones`; el id del grupo es el del primer control), la lista va compacta por pantalla (31.000 caracteres) y del SQL solo va el `seed.sql`. El validador sigue revisando los 728 controles. Pruebas: 24.
- **Cambio menor en el runner:** carpeta de trabajo por defecto `/srv/icase-workspaces` en Linux.
- **Contrato de bomberos escrito a mano** (8 de noviembre): con el agrupado, Haiku y Gemini se siguieron cortando en una sola respuesta, y el usuario prefirió no dividir la generación ni gastar más. Claude lo escribió en la conversación (48 operaciones con las tablas, funciones y datos del seed reales; 460 grupos de controles asignados por reglas) y lo validó con `validarContrato`: 728/728 controles, 29/29 RF, 0 errores. Archivo: `respaldos/contrato-bomberos/contrato.json`. Para meterlo, el paso tiene ahora **"Pegar contrato"** cuando aún no hay contrato: `revisar-contrato` lee el inventario en el proyecto desechable si no hay uno guardado y expande las asignaciones por grupo. El inventario cuenta también los permisos por columna (`notificacion` solo permite actualizar `leida`).
- **Prueba de permisos del contrato:** la primera corrida dio 7 fallidas y 45 inconclusas, ninguna de seguridad. (1) `lib/pruebaContrato.js` no relacionaba el actor "Jefe de guardia" con el rol `jefe_guardia`: ahora ignora artículos y preposiciones (prueba nueva; 25 en total). (2) El seed no tenía registros en el estado que cada operación necesita, y la base usa `42501` también para reglas de negocio ("ya fue entregada"), así que se veían como permisos negados: se agregaron al seed el parte 7 (firmado, listo para cerrar), el parte 8 (incendio editable), las bitácoras vehiculares 3 a 6 y la bitácora de guardia 2 abierta (`respaldos/bd-bomberos/seed-agregar-al-final.sql`), y el contrato apunta a ellos. Resultado: 119 correctas, 0 fallidas.
- Huecos del prototipo encontrados al escribir el contrato: no hay botones para asignar rol ni suspender cuentas (RF01), y "Subir Foto Evidencia" (Parte en Curso Móvil) no tiene dónde guardarse en el diseño. Quedan como advertencias para la Etapa 9.

### Base de bomberos regenerada con Claude Haiku 5.5 (7 de noviembre)

- Generada con Claude Haiku 5.5 por unos 20 centavos (con Sonnet se habían gastado unos 15 dólares en intentos anteriores): 22/22 tablas con RLS, políticas y datos, sin advertencias.
- Revisión archivo por archivo con Claude. Los corregidos están en `respaldos/bd-bomberos/` (no se sube a git) para pegarlos en el explorador y probar una sola vez:
  - `0002` y `0003`: el Bombero no veía el personal activo y no podía asignarlo a un parte (RF08).
  - `0005`: `registrar_firma` se podía llamar desde la API con un contenido inventado; ahora solo la usan las funciones de negocio.
  - `0007`: el hash de la firma del parte no cubría el detalle por tipo ni los pacientes; se reemplaza `parte_contenido_firma` al final del archivo.
  - `0012` y `0014`: `null not in (...)` dejaba a un usuario suspendido leer el contenido de cualquier parte o bitácora vehicular.
- Con las correcciones pegadas, la prueba en contenedores volvió a pasar (7 de noviembre, 13:02): 22/22 tablas con RLS, políticas y datos, y 3 usuarios.
- Decisión del usuario: un Jefe de guardia puede avalar un parte que él mismo atendió y firmó.
- **Pendiente para la Etapa 8:** el aviso de RF30 "parte pendiente de completar o firmar" necesita una tarea programada (`pg_cron`), no un trigger. El tipo `parte_pendiente` ya existe en `notificacion`.

### Cambios al plan por el tiempo

- Un solo proyecto completo para la demo: bomberos. El taller entra solo si sobra tiempo.
- **Etapa 8 (Backend)** se achica: con Supabase el backend es la base con sus permisos. Solo la Edge Function de crear usuario. Notificaciones push (Firebase) quedan anotadas como pendiente.
- **Etapa 9 (Web)** es la prioridad: es lo que el ingeniero abre y usa.
- **Etapa 10 (Móvil)** pasa a opcional. Si no hay tiempo, se presenta el código generado, o Flutter compilado para web dentro de un marco de celular.
- Nueva etapa de **Publicación de los proyectos generados**: sección "Aplicación" en Implementación con estado, Levantar, "Abrir aplicación" (otra pestaña) y usuarios de prueba. La vista previa dentro de icase-tool es opcional: iniciar sesión dentro de un recuadro de otro dominio puede fallar por las cookies.
- Un proyecto de Supabase propio usa 2 a 3 GB: se levanta al abrirlo y se apaga si nadie lo usa.

### Cambios de código que lleva

1. ~~**Validador del contrato**~~: hecho el 7 de noviembre (ver "Avance del 5 al 8 de noviembre").
2. ~~**Runner** para Linux~~: hecho el 4 de noviembre. Escucha en `127.0.0.1` detrás de Caddy, siempre con token.
3. **Caddy** con una dirección pública por proyecto. Con Supabase, **dos**: la de la web y la de su puerta de entrada (`api-gw`). La web se compila con `NEXT_PUBLIC_SUPABASE_URL` fijo; hoy es `localhost` con un puerto, lo que funciona en la PC pero no en el navegador del ingeniero. El runner debe compilar la web (y la vista web de Flutter, `SUPABASE_URL`) con la dirección pública de la puerta de entrada.
4. **Sección "Aplicación"** en `ImplementacionFase.js`.
5. **Rutas largas:** confirmar que `maxDuration = 300` cabe en el plan de Vercel. Como todo se genera en local, en Vercel solo hace falta para "Levantar" y "Probar".
6. **Runner de Azure al día:** es una copia de `runner/index.mjs` y de los tres archivos de `lib` que usa; desde el 4 de noviembre cambiaron la prueba de permisos (Jefe de guardia, Edge Functions), el inventario (permisos por columna) y el runner (contenedor `functions` en la prueba).
7. ~~Etapa 8 (Backend)~~: hecha el 8 de noviembre (ver la sección de la Etapa 8).

### Pendientes de decisión

- Preguntar al ingeniero si le basta que la aplicación se abra por una dirección pública con el motor de contenedores en un servidor propio.
- Pasar `develop` a `main` para que Vercel publique lo de esta semana (selector de modelo de Claude, estructura con "Continuar", contrato, barra lateral, paso Backend). En `develop` ya está todo confirmado.
- Antes de desplegar, ejecutar `supabase/backend_implementacion.sql` también en el Supabase que usa Vercel, si es otro.
- La pantalla "Subir Foto Evidencia" (Parte en Curso, móvil) no tiene dónde guardarse en el diseño: decidir si se agrega o se quita del prototipo.
- El aviso de costo de la base usa 10 centavos por archivo medidos con Sonnet; ya se escala por modelo, pero sigue siendo una estimación fija por archivo.

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

Scripts de `supabase/` que deben estar ejecutados en el SQL Editor, cada uno una sola vez. Los anteriores a la etapa 7 ya están aplicados; la migración nueva del contrato sigue pendiente:

| Script | Para qué |
|---|---|
| `rls_proyectos.sql`, `rls_storage.sql`, `contexto_proyecto.sql`, `diagrama_clases.sql`, `diagramas_svg.sql` | Fases de Análisis y Diseño |
| `archivos_proyecto.sql` | Tabla del código generado (Etapa 2) |
| `stack_implementacion.sql` | Columna del paso "Stack técnico" (Etapa 4) |
| `estructura_implementacion.sql` | Columna del paso "Estructura de carpetas" (Etapa 5) |
| `bd_implementacion.sql` | Columna del paso "Base de datos" (Etapa 6) |
| `contrato_implementacion.sql` | Columna del paso "Contrato de API" (Etapa 7; aplicada) |

Cada paso nuevo de Implementación con columna propia agrega su script aquí. Si Vercel y la PC usan el mismo proyecto de Supabase, cada script se ejecuta una sola vez para los dos.

### Despliegue en Vercel

- **Funciona sin variables nuevas:**
  - todos los pasos con IA, incluida la generación de la base de datos;
  - el selector de modelo gratuito;
  - "Continuar base de datos".
  - regenerar el contrato con un inventario guardado, si la huella SQL/stack sigue vigente.

  El build incluye `plantillas/` en las rutas que la leen (comprobado en sus `.nft.json`).
- **Documentación:**
  - el comando de build de Vercel es `npm run build`, que instala las dependencias de `docs-site/`, genera el sitio en `public/docs` y compila la app;
  - `/docs` es pública: `proxy.js` la excluye de la sesión;
  - no hace falta configurar nada más en Vercel.
- **No funciona en Vercel:**
  - el runner y Docker: Levantar, Detener, Ver logs y "Probar de nuevo" de la base;
  - generar un inventario nuevo del contrato y "Probar permisos";
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
| `lib/contrato.js`, `lib/validarContrato.js`, `lib/accionesContrato.js` | Generación del contrato, validación determinista y extracción de controles del prototipo |
| `lib/contextoContrato.js`, `lib/inventarioContrato.js`, `lib/pruebaContrato.js`, `lib/runner.js` | Lectura autenticada del proyecto y SQL, inventario de PostgreSQL, pruebas HTTP por actor y comunicación con el runner |
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
- **Capturas:** no se usan capturas simuladas. Cada página indica con un recuadro "Captura pendiente" el nombre del archivo que la reemplazará. Faltan 3 capturas: `09-explorador`, `11-bomberos-stack` y `12-bomberos-base` (ver "Pendientes inmediatos").
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
  - los plegados muestran solo el nombre y el estado; este comportamiento también se aplica a Análisis y Diseño;
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

### Etapa 7. Paso "Contrato / API" · Implementada, pendiente validación real

**Objetivo:** definir las operaciones antes de generar el backend y los clientes, para que encajen aunque se generen por separado.

**Entradas:** requerimientos, casos de uso, diagrama de clases, sistemas y el esquema aprobado.

**Tareas:**

1. Generar el contrato según el stack:
   - con Express, un `openapi.yaml`;
   - con Supabase, el mapa de tablas y vistas expuestas por PostgREST, las funciones RPC y las Edge Functions, con sus permisos.
2. Para cada operación, indicar los roles que pueden usarla y el requerimiento que cumple.
3. Validar que cada acción de las pantallas del prototipo tenga su operación.

#### Implementación (autorizada el 24 de octubre)

1. **Inventario de la base sin IA.** Con Supabase, el contrato parte de lo que existe de verdad. El runner lo lee de la base probada, igual que la prueba de la Etapa 6:
   - las tablas expuestas por la API, con sus columnas;
   - las políticas por operación (`select`, `insert`, `update`, `delete`) y los permisos;
   - las funciones RPC con sus argumentos: `firmar_parte`, `firmar_bitacora_vehicular`, `cerrar_y_entregar_bitacora_guardia`...

   Así el contrato no inventa operaciones que la base no tiene.
2. **La IA hace el mapa.** Para cada pantalla del prototipo, toma sus acciones (botones y formularios, de su HTML) y sus RF, y le asigna la operación que la cumple: tabla y operación, una RPC o una Edge Function. Con Express, genera el `openapi.yaml`.
3. **Lo que falta se detecta, no se inventa.** Una acción sin operación queda marcada. Ejemplo en bomberos: crear cuentas de usuario (RF01) no se puede hacer desde el navegador, porque exige la clave de servicio de Auth, y necesita una Edge Function. Lo que falta se anota para la Etapa 8.
4. **Prueba de permisos real.** En el proyecto de prueba, el runner llama a la API como cada usuario de prueba (Administrador, Jefe de guardia, Bombero) y comprueba que cada operación se permite o se rechaza según el contrato. Por ejemplo, el Bombero no puede avalar un parte ni crear vehículos. Es la parte de seguridad que la prueba de la Etapa 6 no veía.
5. **Resultado:** una ficha en `proyectos.contrato_implementacion` con las operaciones por pantalla, sus roles y RF, lo que falta, y el resultado de la prueba de permisos.

Archivos principales: `lib/accionesContrato.js`, `lib/inventarioContrato.js`, `lib/validarContrato.js`, `lib/contrato.js`, `lib/contextoContrato.js`, `lib/pruebaContrato.js`, las rutas `generar-contrato`, `revisar-contrato`, `probar-contrato`, y `FichaContrato.js`. El paso está en `PASOS`, con aprobación, edición, rechazo, eliminación y cascada.

- El runner aplica los SQL en un proyecto separado con sufijo `-contrato` y consulta el catálogo de PostgreSQL. No se hace introspección del Supabase de I-CASE Tool ni se modifica el proyecto generado del usuario.
- La ficha conserva el inventario y una huella de SQL/stack. Si cambia la base, no se permite reutilizarlo para editar o probar. La generación vuelve a inspeccionar.
- El código extrae formularios, botones, enlaces e inputs submit/button del HTML; exige una asignación para cada control (API, local o navegación) y una justificación para las dos últimas. Una pantalla sin controles recibe una acción de consulta. La cobertura mide estos controles; no demuestra por sí sola la corrección funcional de la pantalla.
- La IA tiene un reintento. El validador comprueba roles/RF, tablas/vistas, grants, RPC y argumentos; no permite administrar Auth desde el navegador. Las Edge Functions quedan explícitamente para la etapa 8.
- La prueba inicia sesión por Auth y llama a PostgREST como cada actor, sin usar service role. Solo en ese contenedor se configura `PGRST_DB_TX_END=rollback`: las escrituras HTTP no se confirman. [Configuración oficial de PostgREST](https://docs.postgrest.org/en/v14/references/configuration.html#db-tx-end).
- Las respuestas vacías y errores de negocio se marcan inconclusos. Excepción: una respuesta vacía para un rol prohibido demuestra el filtro RLS si la misma petición sí devolvió filas para un rol permitido, sobre los mismos datos con rollback. Una operación que devuelve datos para un rol prohibido se marca fallida. No reemplaza una auditoría de todos los permisos por fila, ni una prueba de las Edge Functions y servicios externos. Efectos externos de una RPC no se revierten con una transacción: deben integrarse y probarse en la etapa 8.
- Los contratos se exportan a `contrato/api.json` y, con Express, `openapi.yaml` en `archivos_proyecto`. La ficha permite descargarlos, editar JSON con revalidación y ampliar con IA. Editarlos invalida la aprobación y la prueba anterior.
- La cascada espera a que la base regenerada vuelva a aprobarse antes de inspeccionarla. Errores de estructura/cobertura y permisos fallidos bloquean aprobar; las pruebas pendientes requieren reconocimiento explícito en la interfaz.
- Validación técnica del 24 de octubre: 18 pruebas automatizadas; lint de los archivos modificados; compilación de Next.js y Docusaurus. Integración real con Supabase desechable: inventario, login de dos actores, CRUD, RPC con restricción de rol y rollback (16 comprobaciones). Segundo stack: inventario de órdenes de taller con PostgreSQL sin Supabase. Generación con IA gratuita probada para Supabase y Express (2 operaciones por caso, cobertura completa). Esto no sustituye la validación de bomberos y taller con sus datos actuales.
- Revisión del 1 de noviembre: la columna `contrato_implementacion` existe en el Supabase de icase-tool y las 18 pruebas pasan. No se comprobó si ya hay contratos de bomberos o del taller generados o aprobados: Docker estaba apagado y la base de icase-tool solo muestra los proyectos con la sesión del usuario.
- Validador corregido el 7 de noviembre tras la primera generación real con bomberos (Gemini 3.8 Flash, 37 errores, unos 23 de las reglas): nombres de Auth del SDK de Supabase, guiones en Edge Functions, cerrar sesión sin RF de pantalla, operaciones sin botón como advertencia y error de roles con el rol y el RF. 23 pruebas.
- Comandos: `node --test tests/contrato.test.mjs`; `node tests/contrato-docker.mjs` para Docker. Para incluir generación con modelos gratuitos: establecer `PROBAR_IA=1` y ejecutar `node --env-file=.env.local tests/contrato-docker.mjs`. La prueba crea sus propios proyectos temporales y usuarios, y no usa datos de los proyectos reales.

**Terminado cuando:** el contrato está aprobado y cubre todas las acciones del prototipo, después de revisar los resultados de permisos y sus pendientes de integración.

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

#### Implementación (8 de noviembre)

- Paso `impl_backend` en `PASOS`, columna `backend_implementacion` (`supabase/backend_implementacion.sql`, hay que ejecutarla en el SQL Editor), archivos en `archivos_proyecto` con `paso = 'impl_backend'`.
- `lib/archivosBackend.js`: los archivos del backend salen de la estructura aprobada. Con Supabase, cada Edge Function (`supabase/functions/<nombre>/`) salvo el enrutador fijo `main`; con Express, los archivos de su pieza.
- `lib/backend.js` y `/api/generar-backend`: un archivo por petición, como la base. El prompt lleva las operaciones edge del contrato que cumple la función (roles, entrada, salida), sus RF, los servicios externos, la guía de la pieza, los archivos ya escritos y las migraciones aprobadas. Revisión determinista con un reintento: `Deno.serve`, sin claves escritas, la clave de servicio por `Deno.env.get`, lee `Authorization` y responde 403 a los roles que el contrato no permite.
- La página genera archivo por archivo y guarda el avance (`incompleto`, "Continuar backend", no se aprueba a medias); la cascada no lo genera sola si el contrato no está aprobado; sus archivos se editan en el explorador.
- Prueba (`/api/probar-backend`): la prueba de permisos del contrato con el contenedor `functions` encendido. `lib/pruebaContrato.js` llama a las operaciones edge en `/functions/v1/<nombre>` como cada actor (con `conFunciones`; 30 s por llamada por el primer arranque de Deno), y el runner enciende `functions` cuando se pide. El backend no entra en la huella de la base, así que generarlo no invalida el contrato.
- Para probar `crear-usuario`, el contrato de bomberos tiene ahora datos de prueba en esa operación.
- Pruebas: `tests/contrato.test.mjs` pasa a 27 (Edge Function probada como cada actor; archivos del backend).
- **Pendiente para el despliegue:** el runner de Azure es una copia: hay que actualizarlo (`runner/index.mjs` y `lib/pruebaContrato.js`).
- **Bomberos (8 de noviembre):** Haiku 5.5 generó las dos funciones sin avisos. Revisadas en la conversación: `notificar-push` bien (relee la notificación de la base en vez de confiar en el cuerpo; menor: revisa la configuración de Firebase antes que la sesión). `crear-usuario` tenía la seguridad bien (401, `rol_actual()`, 403, clave de servicio después) pero creaba la cuenta y luego la invitaba por correo: Supabase no invita a un correo ya registrado y el Docker no tiene servidor de correo, así que siempre fallaba y borraba la cuenta. Corregida a mano (`respaldos/backend-bomberos/crear-usuario/index.ts`): contraseña temporal (la de "Generar otra" en el prototipo, o una generada que se devuelve una vez al administrador) y correo confirmado. Prueba en Docker: Administrador crea la cuenta; Bombero y Jefe de guardia, 403.
- **Lección para la guía de Supabase:** sin servidor de correo, una función no debe depender de invitaciones ni de correos de confirmación.

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
