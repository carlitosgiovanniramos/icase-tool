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
| Web | React (Vite + nginx) | Probada en la Etapa 1; hay que separarla como pieza propia |
| Web | Next.js | Por construir |
| Móvil | Flutter | Por construir |
| Backend | Node.js/Express | Probada en la Etapa 1; hay que separarla como pieza propia |
| Backend | Supabase (Auth, API de datos, Realtime, Edge Functions, Storage, Kong) | Por construir |
| Base de datos | PostgreSQL | Probada en la Etapa 1; hay que separarla como pieza propia |

Algunas tecnologías son varios programas. Supabase, por ejemplo, se compone de autenticación (GoTrue), API de datos (PostgREST), Realtime, Edge Functions, Storage y una puerta de entrada (Kong). Cada uno es un contenedor; así lo levanta también la herramienta oficial de Supabase.

## 6. Lo que no es un contenedor

> **Cada tecnología del diseño que funciona como servidor = un contenedor.** Lo que no es un servidor se resuelve de otra forma.

| Qué | Por qué | Cómo se resuelve |
|---|---|---|
| Apps móviles (Flutter, React Native) | Corren en el celular, no en un servidor | El código se genera completo. Un contenedor compila una vista previa web para probarla desde icase-tool. La app real se ejecuta en el celular o el emulador (`flutter run`). Las apps de iPhone necesitan una Mac |
| Almacenamiento local del dispositivo (SQLite) | Vive dentro de la app | Se implementa en el código de la app móvil |
| Servicios de internet (Google Maps, Firebase Cloud Messaging, pagos, correo) | Son de terceros; no se pueden descargar | Se usan los reales. Cada clave va en el `.env` del proyecto. Sin ella el sistema arranca igual y solo esa función responde con un error claro, por ejemplo "Falta GOOGLE_MAPS_API_KEY" |
| Infraestructura de varios servidores (alta disponibilidad, balanceo) | Pensada para varias máquinas físicas | Se representa en contenedores, por ejemplo una base principal y una réplica en espera. Es una versión demostrativa; el cambio automático ante fallas necesita herramientas adicionales (Patroni) y queda como mejora posterior |

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

### Etapa 3. Piezas del catálogo

**Objetivo:** tener una pieza probada en Docker por cada tecnología del catálogo inicial.

**Antes de empezar:** leer el diagrama de arquitectura y el diagrama de sistemas aprobados del proyecto de bomberos, y confirmar con ellos la lista de contenedores de la sección 13.

**Tareas:**

1. Separar `react-express-postgres` en tres piezas: `react`, `express` y `postgres`.
2. Construir la pieza `supabase`:
   - servicios Auth, API de datos, Realtime, Edge Functions, Storage y Kong, con las imágenes oficiales;
   - generar sus claves (JWT, anon y service role) al crear el `.env` del proyecto.
3. Construir la pieza `nextjs`: Dockerfile de producción y conexión con su backend.
4. Construir la pieza `flutter`:
   - contenedor que compila la vista previa web;
   - instrucciones para `flutter run` en el celular o el emulador, apuntando a la IP de la PC.
5. Construir la pieza de réplica en espera de PostgreSQL, para los diseños con alta disponibilidad.
6. Armar el `docker-compose.yml` juntando las piezas.
7. Generalizar los puertos del runner: hoy maneja `FRONTEND_PORT` y `BACKEND_PORT`; debe asignar todas las variables `*_PORT` que declaren las piezas.
8. Probar a mano cada pieza y una combinación completa (la de bomberos), igual que en la Etapa 1.

**Terminado cuando:**

- Cada pieza levanta sola y combinada con las demás.
- Un proyecto mínimo con las piezas de bomberos funciona de punta a punta: inicio de sesión, lectura y escritura de datos, Realtime, una Edge Function, Storage y la vista previa móvil.

---

### Etapa 4. Paso "Stack técnico"

**Objetivo:** decidir las tecnologías, las piezas y los contenedores del proyecto a partir del diseño.

**Entradas:** diagrama de arquitectura, diagrama de sistemas, y tecnologías y plataformas del contexto.

**Tareas:**

1. Leer cada caja de la arquitectura con su tecnología, y cada componente del diagrama de sistemas con la suya.
2. Buscar cada tecnología en el catálogo y producir una ficha con:
   - piezas elegidas y sus versiones;
   - contenedores, indicando de qué caja de cada diagrama sale cada uno;
   - lo que no es contenedor y cómo se resuelve (app móvil, almacenamiento local, servicios externos);
   - librerías que necesita el proyecto, cada una con el requerimiento que la justifica;
   - servicios externos con la variable de entorno de cada clave;
   - avisos: tecnologías sin pieza en el catálogo, o diferencias entre arquitectura, sistemas y contexto.
3. Agregar el paso a `PASOS`, con aprobar, rechazar y cascada.

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

Tecnologías según su diagrama de arquitectura:

| En el diagrama | Implementación | Contenedor |
|---|---|---|
| Panel Web · Next.js | Proyecto Next.js | `web` |
| App Móvil · Flutter | Proyecto Flutter; vista previa web en contenedor y app real con `flutter run` | `movil` |
| Almacenamiento local · SQLite | Dentro de la app Flutter, con sincronización al volver la conexión | — |
| Supabase · Auth | GoTrue | `auth` |
| Supabase · API de datos | PostgREST | `rest` |
| Supabase · Realtime | Realtime | `realtime` |
| Supabase · Edge Functions | Edge Runtime, con las funciones generadas | `functions` |
| Supabase · Storage (firmas y croquis) | Storage | `storage` |
| Puerta de entrada de Supabase | Kong | `kong` |
| PostgreSQL | PostgreSQL de Supabase | `db` |
| Alta disponibilidad Master / Esclavo | Réplica en espera de la base de datos | `db-replica` |
| Google Maps, Firebase Cloud Messaging | Servicios reales con claves en `.env` | — |

**Pendiente:** confirmar esta lista con el diagrama de sistemas antes de construir las piezas.

## 14. Pendientes por decidir

- **Generador de arquitectura:** restringirlo al catálogo de tecnologías, para que todo proyecto nuevo se pueda implementar. Requiere aprobación, porque ese generador ya está aprobado.
- **Cambio automático ante fallas** en los diseños con alta disponibilidad: queda como mejora posterior.
