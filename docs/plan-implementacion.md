# Plan de trabajo: fase de Implementación

Guía de construcción de la fase de Implementación de icase-tool. Se escribe antes de empezar para fijar el orden, lo que entrega cada etapa y cuándo se da por terminada.

## 1. Contexto

Con las fases de Análisis y Diseño aprobadas, cada proyecto ya tiene requerimientos, casos de uso, diagrama de clases, diagrama entidad-relación, prototipo de pantallas, árbol de navegación, arquitectura y diagrama de sistemas. La fase de Implementación convierte esos artefactos en código ejecutable.

El código generado es un proyecto dentro de otro proyecto. Por eso no puede vivir dentro del repo ni de la app Next.js de icase-tool:

- **Dependencias:** cada proyecto generado trae su propio stack y sus versiones, que chocarían con las de icase-tool.
- **Puertos:** dos proyectos no pueden usar el mismo puerto a la vez.
- **Seguridad:** el código lo escribe una IA, así que no hay que confiar en él. Debe ejecutarse aislado, sin acceso a los archivos ni a las credenciales de icase-tool.
- **Limpieza:** al borrar o regenerar un proyecto, todo lo suyo debe desaparecer con un solo comando.

La solución acordada es ejecutar cada proyecto generado en **contenedores Docker separados por capa**: frontend, backend y base de datos.

## 2. Decisiones base

| Tema | Decisión |
|---|---|
| Contenedores | Tres por proyecto: `frontend`, `backend` y `db`, orquestados con un `docker-compose.yml` propio |
| Nombre del proyecto en Docker | `icase_<id-proyecto>`: cada proyecto tiene su propia red, sus volúmenes y sus contenedores |
| Stack por defecto | React (Vite) + Node.js/Express + PostgreSQL |
| Base de datos del proyecto generado | PostgreSQL en su propio contenedor. **No usa Supabase** |
| Uso de Supabase | Solo para icase-tool: usuarios, proyectos, diagramas, aprobaciones y la copia de los archivos generados |
| Carpeta de trabajo | `C:\icase-workspaces\<id-proyecto>\`, fuera del repo de icase-tool |
| Dockerfiles y `docker-compose.yml` | Salen de plantillas fijas por stack, no los escribe la IA |
| Ejecución de Docker | La hace un servicio aparte, el runner. Next.js nunca ejecuta `docker` directamente |
| Entorno disponible | Docker Desktop 29.7 y Docker Compose v5.5 sobre WSL2 |

## 3. Estructura estándar de un proyecto generado

Todos los proyectos generados siguen la misma estructura. La IA rellena el contenido; la estructura no cambia de un proyecto a otro.

```text
<nombre-proyecto>/
  docker-compose.yml          orquesta db, backend y frontend
  .env.example                variables necesarias, sin secretos reales
  README.md                   cómo levantar el proyecto
  database/
    init/
      01_esquema.sql          tablas, claves y restricciones (sale del diagrama ER)
      02_datos.sql            datos de prueba coherentes con el dominio
  backend/
    Dockerfile
    package.json
    openapi.yaml              contrato de la API
    src/
      index.js                arranque del servidor
      config/                 conexión a la base de datos y variables
      modelos/                uno por clase del diagrama de clases
      rutas/                  uno por módulo del diagrama de sistemas
      controladores/          reciben la petición y responden
      servicios/              reglas de negocio (requerimientos funcionales)
      middlewares/            autenticación y roles (actores)
  frontend/
    Dockerfile
    nginx.conf                sirve la app y redirige /api al backend
    package.json
    index.html
    src/
      main.jsx
      rutas.jsx               rutas y menú (salen del árbol de navegación)
      paginas/                una por pantalla del prototipo
      componentes/            piezas reutilizadas entre pantallas
      api/                    cliente que consume el contrato
```

### Trazabilidad con el diseño

Cada parte del código sale de un artefacto ya aprobado:

| Artefacto aprobado | Se convierte en |
|---|---|
| Diagrama entidad-relación | `database/init/01_esquema.sql` |
| Diagrama de clases | `backend/src/modelos/` |
| Diagrama de sistemas | Módulos de `backend/src/rutas/` y `backend/src/servicios/` |
| Requerimientos funcionales | Endpoints del contrato y lógica de `servicios/` |
| Actores y casos de uso | Roles en `backend/src/middlewares/` |
| Prototipo de pantallas | `frontend/src/paginas/` |
| Árbol de navegación | `frontend/src/rutas.jsx` y el menú principal |
| Diagrama de arquitectura | Servicios y conexiones del `docker-compose.yml` |

### Comunicación entre contenedores

```text
navegador ──> frontend (nginx, puerto publicado)
                 │  /api/*
                 v
              backend (Express, red interna; puerto publicado solo para pruebas)
                 │  SQL
                 v
              db (PostgreSQL, solo red interna, sin puerto publicado)
```

- El frontend redirige `/api` al backend dentro de la red de Docker, así el navegador no tiene problemas de CORS.
- La base de datos solo es visible para el backend.
- Los datos se guardan en un volumen, así sobreviven a reinicios y a reconstrucciones del backend o del frontend.

## 4. Reglas que aplican a todas las etapas

- **Flujo de fases:** los pasos de Implementación se comportan como los de Análisis y Diseño. Tienen aprobar y rechazar; un paso aprobado queda bloqueado; un paso ya generado se regenera solo después de confirmar; al editar, los pasos siguientes quedan desactualizados; al rechazar o eliminar, se borra en cascada lo posterior; y hay "Ampliar con IA" para modificar el resultado sin regenerarlo.
- **Generación por partes:** el backend y el frontend se generan archivo por archivo, igual que el prototipo se genera pantalla por pantalla. Así no se corta por el límite de salida y se puede regenerar un archivo suelto.
- **Contexto acotado:** cada archivo se genera con el stack, la estructura, el contrato y solo la parte de los diagramas que le corresponde, no con todos los artefactos completos.
- **Costo de IA:** Gemini queda por defecto. Claude se usa solo con el interruptor "Usar Claude" activado, y antes de generar un lote se avisa el costo estimado.
- **Reglas generales:** prompts, validaciones y plantillas deben servir para cualquier sistema, no solo para el proyecto con el que se prueba. Cada etapa se prueba con el proyecto real y con un segundo sistema de otro tema.
- **Interfaz:** textos mínimos, sin emojis; confirmaciones y avisos con el modal de `app/AlertProvider.js`.
- **Seguridad del código generado:** se ejecuta solo dentro de sus contenedores, con límites de CPU y memoria, sin montar carpetas fuera de su carpeta de trabajo y sin las credenciales de icase-tool.

## 5. Etapas

Las etapas van en orden de dependencia. Cada capa se valida en su contenedor apenas se genera, para que los errores no se acumulen al final.

---

### Etapa 1. Proyecto de referencia hecho a mano

**Objetivo:** construir a mano, sin icase-tool, una versión mínima del proyecto de bomberos con la estructura de la sección 3 y levantarla en tres contenedores. Así queda fijado qué debe producir la IA y de aquí salen las plantillas.

**Tareas:**

1. Crear `C:\icase-workspaces\referencia\` con la estructura de la sección 3.
2. En `database/init/`, escribir el SQL de 2 o 3 tablas del diagrama ER, con datos de prueba.
3. En `backend/`, hacer una API Express con un CRUD completo de una entidad, conectada a PostgreSQL mediante la variable `DATABASE_URL`, y un endpoint `GET /api/salud` que confirme la conexión a la base.
4. En `frontend/`, hacer una app React (Vite) con una pantalla de listado y una de formulario de esa entidad, que consuman la API mediante `/api`.
5. Escribir los dos `Dockerfile`:
   - **Backend:** imagen de Node y `npm ci`.
   - **Frontend:** construcción en dos etapas; la primera compila con Node y la segunda sirve los archivos con nginx.
6. Escribir el `docker-compose.yml`. Debe tener:
   - un volumen para los datos de PostgreSQL;
   - `database/init` montado en `/docker-entrypoint-initdb.d`;
   - un healthcheck con `pg_isready`;
   - el backend esperando a que la base esté sana (`depends_on` con `condition: service_healthy`);
   - los puertos tomados de variables con valor por defecto (`${FRONTEND_PORT:-8080}`).
7. Escribir `.env.example` y el README.
8. Copiar los Dockerfile, el compose y `nginx.conf` como plantillas en `plantillas/react-express-postgres/` dentro del repo de icase-tool.

**Terminado cuando:**

- `docker compose -p icase_referencia up -d --build` levanta los tres contenedores sin errores.
- En el navegador, la pantalla de listado muestra los datos de prueba, y crear un registro desde el formulario lo guarda en PostgreSQL.
- Después de `docker compose down` y un nuevo `up`, los datos siguen ahí.
- Después de `docker compose down -v`, no queda nada del proyecto.

---

### Etapa 2. Base de la fase dentro de icase-tool

**Objetivo:** preparar en icase-tool todo lo que usan las etapas siguientes: dónde se guardan los archivos, cómo se ven y cómo se ejecutan.

**Tareas:**

1. **Tabla `archivos_proyecto` en Supabase**, en el script `supabase/archivos_proyecto.sql`.
   - Columnas: proyecto, ruta del archivo, contenido, paso que lo generó, estado y hash del contenido.
   - Políticas RLS iguales a las de `proyectos`: cada usuario ve solo los archivos de sus proyectos.
2. **Fase "Implementación" en `app/(app)/proyectos/[id]/pasos.js`**, con sus pasos:
   - stack técnico, estructura de carpetas, base de datos, contrato de API, backend y frontend;
   - aprobación general de la fase, como Análisis y Diseño;
   - la fase se habilita solo con Diseño aprobado.
3. **Explorador de archivos:** árbol de carpetas a la izquierda y visor de código a la derecha, con el estado de cada archivo.
4. **Runner mínimo** en `runner/`: un servicio Node propio, con su `package.json`, que icase-tool llama desde sus rutas API del servidor con un token compartido (`RUNNER_TOKEN`). Operaciones:

   | Operación | Qué hace |
   |---|---|
   | `POST /proyectos/:id/sincronizar` | Escribe los archivos del proyecto en su carpeta de trabajo |
   | `POST /proyectos/:id/levantar` | Ejecuta `docker compose up -d --build`, para todos los servicios o solo los indicados |
   | `GET /proyectos/:id/estado` | Devuelve los contenedores, su salud y los puertos asignados |
   | `GET /proyectos/:id/logs` | Devuelve las últimas líneas de log de cada servicio |
   | `POST /proyectos/:id/detener` | Ejecuta `docker compose down`, con `-v` cuando el proyecto se elimina |

   - **Puertos:** el runner elige puertos libres y los pasa como variables al compose.
   - **Límites:** CPU y memoria por contenedor.
   - **Apagado automático:** detiene el proyecto tras un tiempo sin uso.

**Terminado cuando:**

- La fase aparece en el stepper, bloqueada hasta que Diseño esté aprobado.
- Al cargar a mano los archivos del proyecto de referencia en `archivos_proyecto`, el explorador los muestra.
- El runner sincroniza, levanta, informa el estado, muestra los logs y detiene ese proyecto.

---

### Etapa 3. Paso "Stack técnico"

**Objetivo:** fijar las decisiones técnicas de las que dependen todos los pasos siguientes.

**Entradas:** diagrama de arquitectura, diagrama de sistemas y las tecnologías del contexto del proyecto (`contexto.tecnologias`).

**Tareas:**

1. Generar un JSON pequeño con:
   - plantilla elegida (por defecto `react-express-postgres`);
   - versiones de Node y PostgreSQL;
   - nombre de la base de datos;
   - librerías principales (por ejemplo, autenticación JWT y validación);
   - puertos internos.
2. **Si la arquitectura usa una plataforma como servicio** (Supabase, Firebase o Appwrite; ver `lib/plataformas.js`), traducirla a la plantilla de contenedores: su base de datos pasa a PostgreSQL y sus servicios pasan a módulos del backend.
3. Mostrarlo como una ficha legible, editable y aprobable.

**Terminado cuando:** el stack está aprobado y determina qué plantilla se usa.

---

### Etapa 4. Paso "Estructura de carpetas"

**Objetivo:** definir el árbol completo de archivos del proyecto antes de escribir código. Es lo primero que pidió el ingeniero.

**Entradas:** stack aprobado, diagrama de clases, diagrama ER, diagrama de sistemas, prototipo, árbol de navegación y requerimientos.

**Tareas:**

1. Generar la lista de archivos de `database/`, `backend/` y `frontend/`, siguiendo la sección 3. Para cada archivo, indicar:
   - su propósito;
   - los requerimientos funcionales que cubre;
   - el artefacto de diseño del que sale.
2. Validar la estructura:
   - cada pantalla del prototipo tiene su página;
   - cada clase del dominio tiene su modelo;
   - cada módulo del diagrama de sistemas tiene sus rutas;
   - cada requerimiento funcional queda cubierto por al menos un archivo.
3. Mostrarla en el explorador de archivos, todavía sin contenido.

**Terminado cuando:** la estructura está aprobada. A partir de aquí, cada paso solo rellena archivos de este árbol.

---

### Etapa 5. Paso "Base de datos" (contenedor `db`)

**Objetivo:** generar la base de datos del proyecto y comprobar que funciona.

**Entradas:** diagrama ER aprobado y stack técnico.

**Tareas:**

1. Generar `database/init/01_esquema.sql`: tablas, claves primarias y foráneas, restricciones e índices, todo según el diagrama ER.
2. Generar `database/init/02_datos.sql` con datos de prueba realistas del dominio, que respeten las claves foráneas.
3. **Validar en el contenedor:** el runner levanta solo `db` y revisa los logs de inicialización.
4. **Si hay error:** mostrarlo en la interfaz y permitir corregirlo con "Ampliar con IA" o regenerando.

**Terminado cuando:** el contenedor `db` arranca con todas las tablas del diagrama ER creadas y los datos de prueba cargados, sin errores en los logs.

---

### Etapa 6. Paso "Contrato de API"

**Objetivo:** definir los endpoints antes de generar el backend y el frontend, para que los dos encajen aunque se generen por separado.

**Entradas:** requerimientos funcionales, casos de uso, diagrama de clases, esquema SQL aprobado y prototipo.

**Tareas:**

1. Generar `backend/openapi.yaml` con, para cada endpoint:
   - método y ruta;
   - parámetros, cuerpo y respuestas;
   - roles que pueden usarlo;
   - requerimiento funcional que cumple.
2. Validar:
   - el YAML es un OpenAPI válido;
   - cada acción de las pantallas del prototipo tiene un endpoint;
   - los campos coinciden con las columnas del esquema SQL.
3. Mostrar los endpoints agrupados por módulo.

**Terminado cuando:** el contrato está aprobado y cubre todas las acciones del prototipo.

---

### Etapa 7. Paso "Backend" (contenedor `backend`)

**Objetivo:** generar la API que cumple el contrato y funciona contra la base de datos real.

**Entradas:** estructura de carpetas, contrato de API, esquema SQL, diagrama de clases, diagrama de sistemas, actores y requerimientos.

**Tareas:**

1. Generar los archivos de `backend/` uno por uno, en este orden: `config/`, `modelos/`, `middlewares/`, `servicios/`, `controladores/`, `rutas/` e `index.js`. Cada archivo recibe solo el contexto que le corresponde.
2. `package.json` con las dependencias del stack técnico; el Dockerfile sale de la plantilla.
3. **Validar en contenedores:** el runner levanta `db` y `backend`, revisa que el servidor arranque y llama a `GET /api/salud` y a los endpoints de lectura del contrato.
4. **Si un archivo falla:** se regenera solo ese archivo, con el error como contexto.

**Terminado cuando:** el backend arranca sin errores y los endpoints del contrato responden con datos de la base.

---

### Etapa 8. Paso "Frontend" (contenedor `frontend`)

**Objetivo:** convertir el prototipo aprobado en una aplicación React que funciona contra la API.

**Entradas:** pantallas del prototipo (HTML), árbol de navegación, contrato de API y estructura de carpetas.

**Tareas:**

1. Generar `frontend/src/api/` a partir del contrato.
2. Generar `rutas.jsx` y el menú principal a partir del árbol de navegación.
3. Convertir cada pantalla del prototipo en su página de `paginas/`, una por petición:
   - mantener el diseño aprobado;
   - reemplazar los datos de ejemplo por llamadas a la API.
4. Extraer a `componentes/` las piezas que se repiten entre pantallas.
5. **Validar en contenedores:** el runner levanta los tres servicios y revisa que la compilación del frontend no falle.

**Terminado cuando:**

- El sistema completo se abre en el navegador.
- La navegación coincide con el árbol aprobado.
- Las pantallas muestran y guardan datos reales.

---

### Etapa 9. Cierre de la implementación

**Objetivo:** que el proyecto generado se pueda usar desde icase-tool y también fuera de él.

**Tareas:**

1. **Botón "Descargar proyecto":** genera un ZIP con todos los archivos, el `docker-compose.yml`, `.env.example` y un README con los pasos para levantarlo.
2. **Panel de ejecución en icase-tool:**
   - estado de cada contenedor;
   - logs;
   - acciones "Levantar", "Detener" y "Abrir".
3. **Al eliminar un proyecto:** el runner ejecuta `docker compose down -v` y borra su carpeta de trabajo.

**Terminado cuando:**

- El ZIP descargado se levanta en otra PC con Docker con un solo comando.
- Desde icase-tool se levanta, se abre y se detiene el proyecto.

Después de esta etapa sigue la fase de **Pruebas**, que se ejecuta sobre estos mismos contenedores.

## 6. Revisiones con el ingeniero

| Momento | Qué se muestra |
|---|---|
| Fin de la Etapa 1 | El proyecto de referencia corriendo en tres contenedores: prueba de que el enfoque funciona |
| Fin de la Etapa 4 | La estructura de carpetas generada por icase-tool a partir del diseño |
| Fin de la Etapa 8 | El sistema completo generado y funcionando |

## 7. Pendientes por decidir

No bloquean las etapas 1 a 5:

- **App móvil:** generar el código y ejecutarlo fuera de Docker (emulador o Expo), o generar solo la versión web en esta fase.
- **Otros stacks:** si además de `react-express-postgres` se agrega una segunda plantilla, por ejemplo con un backend en Python.
