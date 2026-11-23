---
title: "Fase 03: Implementación"
sidebar_position: 5
---

# Fase 03: Implementación

La Implementación convierte el diseño aprobado en un **proyecto de código que se puede ejecutar**. La herramienta no cambia las tecnologías del diseño: si la arquitectura dice Next.js, Flutter y Supabase, el proyecto usa exactamente eso.

Tiene siete pasos, en este orden. Cada uno usa los anteriores aprobados.

| Paso | Qué produce | Cómo se comprueba |
|---|---|---|
| 1. Stack técnico | Piezas, contenedores, librerías y servicios externos | El código revisa que cada componente del diseño tenga su pieza |
| 2. Estructura de carpetas | Lista de archivos del proyecto | Cobertura de pantallas, tablas, módulos y requerimientos |
| 3. Base de datos | Migraciones y datos de prueba | Se aplican en contenedores sobre una base vacía |
| 4. Contrato de API | Operaciones, roles y datos de prueba | Validación contra la base real y prueba de permisos por actor |
| 5. Backend | Lógica de negocio (Edge Functions o servidor Express) | Prueba de permisos con las funciones encendidas |
| 6. Frontend | La web y la app móvil | Cada plataforma se compila en Docker |
| 7. Documentación | El sitio de documentación del proyecto | Se compila en su propio contenedor |

Los pasos se ven uno debajo del otro y se **pliegan** desde su título. El encabezado muestra el nombre y el estado. Puedes abrir varios a la vez; inicialmente se abre el primer paso pendiente.

## 1. Stack técnico

Decide con qué **piezas** se construye cada tecnología del diseño y cuántos **contenedores** Docker lleva el proyecto. La ficha muestra:

- **Revisar antes de aprobar**: lo que la validación no pudo resolver. Cada aviso trae una casilla que lo pasa a las indicaciones de los pasos siguientes (Base de datos y Backend).
- Las piezas, los contenedores y cómo se implementa cada componente del diagrama de sistemas y cada elemento de la arquitectura.
- Las **librerías** (se agregan, editan y eliminan a mano) y los **servicios externos** con la variable de su clave (ej. Google Maps).

Las piezas no se editan aquí: salen del diseño. Para cambiarlas se cambia la arquitectura.

## 2. Estructura de carpetas

La lista completa de **archivos** que tendrá el proyecto, antes de escribir código: cada archivo con su tipo, su propósito, los requerimientos que implementa y lo que cubre (una pantalla del prototipo, una tabla, un módulo). Arriba, la **cobertura**: pantallas, tablas, módulos y RF cubiertos (deben estar completos). Exige el archivo de estilos globales y los componentes compartidos.

Se genera **por pieza** (web, móvil, base). Si una pieza falla, las demás se conservan y el botón pasa a **Continuar estructura**, que genera solo lo que falta. Una estructura incompleta no se puede aprobar.

## 3. Base de datos

Genera las **migraciones** (tablas, reglas y permisos) y los **datos de prueba**, archivo por archivo, y los **prueba en contenedores**: la base se crea desde cero en un proyecto aparte y se borra al terminar.

La ficha muestra el estado de la prueba, las tablas del ER creadas, cuáles tienen permisos (RLS) y datos de prueba, y los **usuarios de prueba** (uno por actor, contraseña `Prueba123!`).

- Si un archivo falla, la herramienta lo **corrige sola** con el error y vuelve a probar (hasta 3 veces).
- Si la generación se corta, **Continuar base de datos** sigue desde el archivo que faltaba.
- **Probar de nuevo** vuelve a aplicar todo desde cero.
- Con Claude se avisa el costo antes de generar.

:::warning Requiere Docker y el runner
La prueba de la base, la del backend, la compilación del frontend y el panel de **Ejecución** los hace el **runner**, que ejecuta Docker. Funciona con I-CASE Tool en local (Docker Desktop encendido) o con `RUNNER_URL` apuntando al runner de un servidor. Sin runner, se generan los archivos pero no se prueban.
:::

## 4. Contrato de API

Disponible después de aprobar la base de datos. Relaciona las acciones reales del prototipo (formularios, botones y enlaces) con las operaciones que usarán el backend y los clientes.

- **Supabase:** lee tablas, vistas, columnas, políticas, permisos y RPC de una base desechable creada con los SQL aprobados. Las operaciones que requieren una Edge Function quedan indicadas como pendientes de Backend.
- **Express:** produce un contrato `openapi.yaml`, con entradas, salidas, roles y requerimientos.
- La ficha muestra cobertura, errores, operaciones por pantalla y sus datos de prueba. **Editar contrato** permite ajustar el JSON y **Validar y guardar** vuelve a comprobarlo sin IA. También puedes usar **Ampliar con IA** o **Pegar contrato** (uno escrito aparte, que se valida igual).
- Los controles iguales de una pantalla se asignan una sola vez, así el contrato cabe en una respuesta aunque el prototipo tenga cientos de controles.
- **Probar permisos** inicia sesión con cada actor de prueba y llama a las tablas y RPC de Supabase. Las escrituras se revierten en el proyecto desechable. Un error de negocio o una respuesta sin filas queda **sin verificar**; una respuesta vacía para un rol prohibido solo demuestra el filtro RLS si la misma petición devuelve filas para un rol permitido.
- **Descargar contrato** entrega JSON para Supabase o YAML OpenAPI para Express. Ambos aparecen también en el explorador de archivos.

Los errores de cobertura y las contradicciones comprobadas de permisos impiden aprobar. Si hay pruebas sin ejecutar, inconclusas o flujos de integración pendientes, se pide reconocerlos antes de aprobar. Aprobar el contrato no equivale a aprobar la seguridad de todo el sistema.

:::info Instalación
Ejecuta una vez `supabase/contrato_implementacion.sql` en el SQL Editor del Supabase de I-CASE Tool.
:::

## 5. Backend

Disponible después de aprobar el contrato. Escribe la **lógica de negocio** que la base de datos no resuelve por sí sola:

- **Supabase:** una **Edge Function** (Deno) por cada operación del contrato que la necesita, un archivo por petición, como la base de datos.
- **Express:** los archivos del servidor.
- Si el contrato se cumple por completo con la API de datos y las funciones de la base, el paso no tiene archivos y se puede aprobar tal cual.

El código revisa cada archivo (ej. que atienda con `Deno.serve`, que lea quién llama antes de actuar y que no lleve claves escritas). **Probar backend** levanta la base con las funciones en Docker y las llama como cada actor del contrato, con la misma prueba de permisos del paso anterior. Si la generación se corta, **Continuar** sigue desde el archivo que falló.

:::info Instalación
Ejecuta una vez `supabase/backend_implementacion.sql`.
:::

## 6. Frontend

Disponible después de aprobar el backend. Genera **cada plataforma por separado**: la web (Next.js o React) y la app móvil (Flutter).

- Se escribe por capas y varios archivos a la vez. Cada página parte de su **pantalla del prototipo aprobado** (HTML y CSS) y de las operaciones del contrato que usan sus controles. La web reutiliza el CSS y el armazón del prototipo, y el código revisa que las páginas no usen clases que no existen.
- **Compilar y corregir** construye la imagen de la plataforma en Docker. Si falla, la herramienta identifica el archivo, lo corrige con el error y vuelve a compilar.
- Si la generación se corta, **Continuar** sigue desde lo que falta. Para aprobar, cada plataforma debe estar completa y **compilar sin errores**.

:::info Instalación
Ejecuta una vez `supabase/frontend_implementacion.sql`.
:::

## 7. Documentación

Disponible después de aprobar el frontend. **Generar documentación** arma el sitio de documentación del proyecto con todo lo aprobado:

- **Manual de usuario:** primeros pasos, una **guía por rol** organizada por tareas (pasos numerados con las pantallas y botones reales), el mapa del sistema (árbol de navegación y casos de uso) y preguntas frecuentes.
- **Desarrolladores:** arquitectura explicada, instalación con Docker, estructura del código, base de datos, requerimientos, backend y frontend.
- **API:** guía de uso (autenticación, roles, errores), acciones por pantalla y **una página por operación** con un ejemplo de código y su JSON de entrada y de salida.

Las páginas de lectura las **redacta la IA** (el modelo elegido en la barra lateral), una por petición y solo con los datos aprobados de su tema; lo que debe ser exacto (endpoints, tablas y diagramas) sale directo de los datos. Cada página se guarda apenas sale: si la generación se corta, **Continuar documentación** redacta solo las que faltan. Las **indicaciones** del paso se le pasan a la IA.

El sitio usa Docusaurus y corre en su **propio contenedor** (`docs`) al levantar el proyecto: aparece en el panel de **Ejecución** como "Documentación" y la web y la app del proyecto muestran su enlace. Las páginas se pueden corregir a mano en el explorador de archivos.

:::info Instalación
Ejecuta una vez `supabase/documentacion_implementacion.sql`.
:::

## Aprobar la fase

Con los siete pasos aprobados aparece **Aprobar fase de Implementación**. Al aprobarla, el informe incluye el capítulo de la implementación y se habilita la fase de [Pruebas](./pruebas) con **Continuar a Pruebas**.

## Archivos del proyecto

Debajo de los pasos está el **explorador de archivos**: el árbol del proyecto y el código de cada archivo.

- En gris, los archivos fijos de las piezas (*Plantilla*). En cursiva, los planificados que todavía no tienen código (*Pendiente*).
- **Editar**: corrige el código en el mismo recuadro (Tab inserta espacios, **Ctrl + S** guarda). Al guardar, el archivo queda como *Editado* y el paso pierde la aprobación hasta probarlo y aprobarlo otra vez.
- **Editar con IA** (en los archivos de la base de datos, el backend, la web y la app, y en las páginas de lectura de la documentación): escribes qué cambiar (ej. *"agrega la columna telefono a la tabla personal"*, *"devuelve 409 si el correo ya existe"* o *"agrega un botón Exportar junto a Guardar"*) y la IA modifica **solo ese archivo**, con el mismo contexto con que se generó y conservando lo que no pediste. Sirve para arreglar un detalle sin regenerar el paso. El cambio queda como *Editado*: el paso pierde la aprobación y hay que volver a **Probar** la base, **Probar backend** o **Compilar y corregir**. En la documentación solo se pueden modificar las páginas que redactó la IA (inicio, primeros pasos, guías por rol, preguntas frecuentes, arquitectura y guía de la API), con los mismos datos aprobados con que se escribieron; las tablas, los diagramas y las listas de operaciones que salen de los datos se conservan intactos. Si luego regeneras la documentación, esas páginas se redactan de nuevo.
- **Expandir**: el explorador entero a pantalla completa. **Esc** vuelve.

:::info Captura pendiente
`capturas/09-explorador.png`: explorador de archivos con un archivo abierto en edición.
:::

## Ejecución

El panel **Ejecución** levanta el proyecto generado en contenedores, separados por servicio (web, API, base de datos, documentación…), y muestra su estado.

| Botón | Qué hace |
|---|---|
| **Levantar** | Envía los archivos del proyecto al runner y levanta los contenedores. La primera vez construye las imágenes y puede tardar varios minutos |
| **Actualizar y reiniciar** | Con el proyecto encendido, vuelve a enviar los archivos y reinicia |
| **Detener** | Apaga los contenedores y conserva los datos |
| **Borrar datos** | Apaga y borra la base de datos y los archivos del proyecto, tras hacer un respaldo. Úsalo para volver a empezar desde el seed |
| **Ver logs** | Las últimas líneas de todos los servicios o de uno elegido |

- **Direcciones del sistema:** con el proyecto encendido aparece un enlace por acceso (Web, Móvil, API, Documentación). En el servidor son direcciones HTTPS públicas (el puerto del servicio más 10000); en local, `localhost`.
- Cada proyecto tiene sus **propios contenedores, red y base de datos**, y el runner asigna puertos libres: puedes tener varios proyectos encendidos a la vez sin que choquen.
- Un proyecto sin uso se **apaga solo** a los 60 minutos.
- Si cambias el stack, la próxima vez que levantes se recrean los contenedores y la base, porque una base PostgreSQL no sirve para Supabase.
- Quien usa el sistema solo ve las direcciones: no ve los archivos ni los contenedores.
