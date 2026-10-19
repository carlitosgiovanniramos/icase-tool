# Plan de trabajo: fase de Implementación

Guía de construcción de la fase de Implementación de icase-tool: cómo se usa lo aprobado en Análisis y Diseño, qué entrega cada etapa y cuándo se da por terminada.

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
| Servicios externos (mapas, notificaciones, correo, pagos) | Los reales, con las claves en el `.env` del proyecto |
| Ejecución de Docker | La hace un servicio aparte, el runner. Next.js nunca ejecuta `docker` directamente |
| Entorno disponible | Docker Desktop 29.7 y Docker Compose v5.5 sobre WSL2. Flutter 3.41.3 y el SDK de Android instalados |

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
- Para que todo proyecto nuevo quede dentro del catálogo, el generador de arquitectura debería elegir solo tecnologías de él. Es un cambio pendiente de aprobación, porque ese generador ya está aprobado.

Catálogo inicial: lo que usa el proyecto de bomberos más lo más común.

| Capa | Tecnologías | Estado |
|---|---|---|
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

Cada pieza tiene un `README.md` con lo que la IA debe generar dentro de ella y las reglas que debe cumplir ese código. Desde la Etapa 4 esos textos se le pasan a la IA.

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
- **Costo de IA:** Gemini queda por defecto. Claude se usa solo con el interruptor "Usar Claude" activado, y antes de generar un lote se avisa el costo estimado.
- **Reglas generales:** prompts, validaciones y piezas deben servir para cualquier sistema, no solo para el proyecto con el que se prueba.
- **Interfaz:** textos mínimos, sin emojis; confirmaciones y avisos con el modal de `app/AlertProvider.js`.
- **Seguridad del código generado:** se ejecuta solo dentro de sus contenedores, con límites de CPU y memoria, sin montar carpetas fuera de su carpeta de trabajo y sin las credenciales de icase-tool.

## 11. Etapas

---

### Etapa 1. Proyecto de referencia hecho a mano · Terminada

Se construyó a mano un mini sistema de bomberos (gestión de personal) con React, Express y PostgreSQL en tres contenedores, en `C:\icase-workspaces\referencia\`. Comprobó que el enfoque funciona en Docker y dejó los primeros archivos fijos en `plantillas/react-express-postgres/`.

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

### Etapa 4. Paso "Stack técnico" · Construida

**Objetivo:** decidir las tecnologías, las piezas y los contenedores del proyecto a partir del diseño.

**Entradas:** diagrama de arquitectura, diagrama de sistemas, requerimientos, y tecnologías y plataformas del contexto.

**Cómo funciona** (`lib/stack.js`, ruta `/api/generar-stack`):

1. **La IA propone**, con el catálogo de piezas en el prompt (CONTEXTO / QUÉ DEBE MOSTRAR / QUÉ NO QUIERO / FORMATO):
   - las piezas y sus servicios opcionales;
   - si hay alta disponibilidad;
   - cómo se resuelve cada caja de la arquitectura: pieza, externo, dentro de la app, infraestructura o no soportado;
   - las librerías, con el requerimiento que las justifica;
   - los servicios externos, con la variable de su clave;
   - avisos y una explicación.
2. **El código valida** contra el catálogo:
   - las piezas y los opcionales existen;
   - ninguna tecnología del diseño con pieza en el catálogo quedó sin elegir (una pieza puede incluir a otra, como Supabase a PostgreSQL);
   - la alta disponibilidad tiene una pieza web;
   - el diagrama de sistemas se lee directamente (cada componente con su tecnología y sus RF) y cada componente debe quedar implementado;
   - las librerías (ver abajo).
   Un reintento con los problemas; lo que quede se muestra como advertencia antes de aprobar ("Revisar antes de aprobar").

**Librerías.** La revisión de la ficha de bomberos mostró que, solo con el prompt, la IA olvidaba librerías que los requerimientos exigen (firma en pantalla, recepción de notificaciones en la app, modo sin conexión) y proponía librerías que no sirven en el entorno (`firebase-admin` en Deno). Por eso las reglas importantes las aplica el código:

| Regla | Cómo se aplica |
|---|---|
| Librerías base de cada combinación | Las declara la pieza (`librerias` en `pieza.json`) y el código las agrega siempre. Ej.: Flutter con Supabase → `supabase_flutter`; Next.js con Supabase → `@supabase/supabase-js`; Express con PostgreSQL → `pg` |
| Capacidades que piden los requerimientos | `CAPACIDADES` en `lib/stack.js` detecta en los RF y RNF: firma en pantalla, PDF, notificaciones push, almacenamiento sin conexión, detección de conexión, mapas, gráficos, hash, ubicación GPS del dispositivo y adjuntar imágenes (cámara o galería). Cada pieza que implementa esos RF según el diagrama de sistemas debe tener una librería con esa `capacidad`. No se exige lo que el entorno ya trae (la criptografía del navegador y de Deno) |
| Compatibilidad con el entorno | Cada pieza declara su registro (`npm`, `pub` o `deno`) y sus librerías `incompatibles` con el motivo. Ej.: `firebase-admin` no sirve en las Edge Functions (Deno) |
| Que el paquete exista | Se consulta npm, pub.dev o jsr; un nombre que no existe es un problema |

Además, en el prompt:
- la IA debe recorrer cada requerimiento;
- la librería va en cada pieza donde se usa la función;
- los servicios externos incluyen a la app cuando recibe sus notificaciones o muestra sus mapas;
- "avisos" es solo para lo que el usuario debe decidir o no se puede implementar.

La ficha de Supabase aclara que es autoalojado (no el servicio en la nube) y sin alta disponibilidad propia.

**Edición manual de la ficha.** Como en los requerimientos, con botones en cada fila:

| Parte | Edición |
|---|---|
| Librerías | Agregar, editar y eliminar. Las librerías base de una pieza no se eliminan: las exige la pieza |
| Servicios externos | Editar y eliminar |
| Avisos | Descartar |
| Piezas, opcionales, alta disponibilidad | No se editan: salen del diseño aprobado. Para cambiarlas se cambia la arquitectura |
| Contenedores y componentes | No se editan: los calcula el código |

Al guardar, la ficha pasa por las mismas validaciones que la generada, sin IA y sin costo (`/api/revisar-stack`, `revisarStack` en `lib/stack.js`). Como toda edición, el paso pierde su aprobación. Lo que la validación encuentra queda guardado en la ficha (`revision`) y se muestra en "Revisar antes de aprobar" hasta que se resuelve.
3. **Los contenedores salen del armador real**, no de la IA.
4. **Se guarda** en `proyectos.stack_implementacion` (`supabase/stack_implementacion.sql`). De ahí lo toman el armador y el runner. Si las piezas cambian, el runner borra los contenedores, datos e imágenes del stack anterior antes de levantar.
5. **Las claves de los servicios externos** van vacías a `.env.example` y como variables de entorno a los servicios que las usan.

**En la interfaz:** el paso está en `PASOS` (fase `implementacion`), con generar, regenerar, indicaciones, aprobar, rechazar, editar, "Ampliar con IA" y cascada. Los cambios en Implementación solo le quitan la aprobación a Implementación; aprobar la fase de Diseño ofrece actualizar el stack si quedó desactualizado. La ficha muestra:

- piezas;
- contenedores;
- cada componente del diagrama de sistemas y cada elemento de la arquitectura con su implementación;
- librerías;
- servicios externos;
- avisos.

**Probado con IA real:**

- **Bomberos:**
  - Next.js + Flutter + Supabase (Auth, Realtime, Storage, Edge Functions) + alta disponibilidad, 12 servicios;
  - los 17 componentes del diagrama de sistemas resueltos;
  - Firebase con la API HTTP v1 (`FCM_SERVICE_ACCOUNT_JSON`).
- **Taller:** Next.js + Supabase (Auth), 6 servicios.
- **"Ampliar con IA":** agregó una librería de PDF y rechazó cambiar el backend a Django, con un aviso.
- **Librerías en bomberos, con las reglas en el código:**
  - quedaron `supabase_flutter`, `@supabase/supabase-js`, `sqflite`, `connectivity_plus`, `firebase_messaging`, `signature_pad` y librerías de PDF;
  - `firebase-admin` desapareció;
  - lo que el modelo no corrigió en su reintento (firma y mapa en la web, por RF11, RF16, RF17, RF28 y RF06) quedó como advertencia visible.
- **Taller:** sin advertencias falsas.

**Generador de arquitectura** (fase de Diseño): recibe el catálogo implementable. Lo que el cliente no definió se elige solo del catálogo; se valida que los clientes, el backend y la base de datos sean del catálogo. Lo que eligió el cliente fuera del catálogo se respeta y queda como advertencia ("no tiene implementación automática"). El estilo microservicios no tiene piezas.

**Falta:** probarlo desde la interfaz con la sesión del usuario.

**Terminado cuando:** la ficha está aprobada y determina qué piezas, contenedores y pasos lleva el proyecto.

---

### Etapa 5. Paso "Estructura de carpetas"

**Objetivo:** definir el árbol completo de archivos antes de escribir código.

**Entradas:** stack aprobado y todos los artefactos del diseño (ver sección 9).

**Tareas:**

1. Generar la lista de archivos de cada pieza siguiendo la sección 8. Para cada archivo, indicar su propósito, los requerimientos que cubre y el artefacto del que sale.
2. Validar la cobertura:
   - cada pantalla del prototipo tiene su página o pantalla, según su plataforma;
   - cada tabla del ER tiene su migración;
   - cada módulo del diagrama de sistemas tiene su lugar;
   - cada requerimiento funcional queda cubierto por al menos un archivo.
3. Mostrarla en el explorador de archivos, todavía sin contenido.

**Terminado cuando:** la estructura está aprobada. Desde aquí cada paso solo rellena archivos de este árbol.

---

### Etapa 6. Paso "Base de datos"

**Objetivo:** generar la base de datos y comprobar que funciona en su contenedor.

**Entradas:** diagrama ER, diagrama de clases, actores y stack técnico.

**Tareas:**

1. Generar el esquema: tablas, claves, restricciones e índices según el ER.
   - Con Supabase, además: migraciones y políticas RLS por rol.
2. Generar datos de prueba realistas que respeten las claves foráneas.
3. Validar en el contenedor de la base de datos; si hay error, mostrarlo y corregirlo con "Ampliar con IA" o regenerando.

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
| Fin de la Etapa 3 | Las piezas del catálogo y la combinación de bomberos corriendo en contenedores |
| Fin de la Etapa 5 | La estructura de carpetas generada por icase-tool a partir del diseño |
| Fin de la Etapa 10 | El sistema completo generado y funcionando, web y móvil |

## 13. Ejemplo: proyecto de bomberos

Confirmado con su diagrama de arquitectura y su diagrama de sistemas. Las tecnologías de los dos coinciden. La alta disponibilidad solo aparece en la arquitectura ("Servidor Web Master / Esclavo"); se acordó implementarla como servidores web con balanceador.

| En el diseño | Implementación | Contenedor |
|---|---|---|
| Panel Web · Next.js (6 módulos) | Proyecto Next.js | `web-master`, `web-esclavo` |
| Alta disponibilidad · Servidor Web Master / Esclavo | Balanceador nginx con cambio automático al esclavo | `balanceador` |
| App Móvil · Flutter (2 módulos) | Proyecto Flutter; vista previa web en contenedor y app real con `flutter run` | `movil` |
| Almacenamiento local · SQLite | Dentro de la app Flutter, con sincronización al volver la conexión | — |
| Supabase · Auth (RF01, RF02, RNF04, RNF05) | GoTrue | `auth` |
| Supabase · API de datos · PostgREST | PostgREST | `rest` |
| Supabase · Realtime (RF04, RF22, RF23) | Realtime | `realtime` |
| Supabase · Edge Functions · Deno/TypeScript (RF30) | Edge Runtime, con las funciones generadas | `functions` |
| Supabase Storage · firmas y croquis | Storage | `storage` |
| Puerta de entrada de Supabase | Envoy | `api-gw` |
| PostgreSQL | PostgreSQL de Supabase | `db` |
| Tablas del proyecto | Tarea de un solo uso que las aplica y termina | `migraciones` |
| Google Maps, Firebase Cloud Messaging | Servicios reales con claves en `.env` | — |

Por comparación, el taller mecánico (Next.js + Supabase con Auth y API de datos) lleva `web`, `db`, `api-gw`, `rest`, `auth` y `migraciones`.

## 14. Pendientes por decidir

- **Generador de arquitectura:** restringirlo al catálogo de tecnologías, para que todo proyecto nuevo se pueda implementar. Requiere aprobación, porque ese generador ya está aprobado.
- **Réplica de la base de datos** en los diseños con alta disponibilidad: hoy se duplica el servidor web; replicar la base y su cambio automático (Patroni) queda como mejora posterior.
- **Servicios externos en la app móvil:** Firebase y Google Maps necesitan además la configuración del proyecto de Firebase (`google-services.json`), que aporta el usuario.
