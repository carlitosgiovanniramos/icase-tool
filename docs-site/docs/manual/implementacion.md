---
title: "Fase 03: Implementación"
sidebar_position: 5
---

# Fase 03: Implementación

La Implementación convierte el diseño aprobado en un **proyecto de código**. La herramienta no cambia las tecnologías del diseño: si la arquitectura dice Next.js, Flutter y Supabase, el proyecto usa exactamente eso.

Los pasos se ven uno debajo del otro y se **pliegan** desde su título. El encabezado muestra el nombre y el estado, sin resúmenes ni cantidades. Puedes abrir varios a la vez; inicialmente se abre el primer paso pendiente.

## 1. Stack técnico

Decide con qué **piezas** se construye cada tecnología del diseño y cuántos **contenedores** Docker lleva el proyecto. La ficha muestra:

- **Revisar antes de aprobar**: lo que la validación no pudo resolver.
- Las piezas, los contenedores y cómo se implementa cada componente del diagrama de sistemas y cada elemento de la arquitectura.
- Las **librerías** (se agregan, editan y eliminan a mano) y los **servicios externos** con la variable de su clave (ej. Google Maps).

Las piezas no se editan aquí: salen del diseño. Para cambiarlas se cambia la arquitectura.

## 2. Estructura de carpetas

La lista completa de **archivos** que tendrá el proyecto, antes de escribir código: cada archivo con su tipo, su propósito, los requerimientos que implementa y lo que cubre (una pantalla del prototipo, una tabla, un módulo). Arriba, la **cobertura**: pantallas, tablas, módulos y RF cubiertos (deben estar completos).

## 3. Base de datos

Genera las **migraciones** (tablas, reglas y permisos) y los **datos de prueba**, archivo por archivo, y los **prueba en contenedores**: la base se crea desde cero en un proyecto aparte y se borra al terminar.

La ficha muestra el estado de la prueba, las tablas del ER creadas, cuáles tienen permisos (RLS) y datos de prueba, y los **usuarios de prueba** (uno por actor, contraseña `Prueba123!`).

- Si un archivo falla, la herramienta lo **corrige sola** con el error y vuelve a probar (hasta 3 veces).
- Si la generación se corta, **Continuar base de datos** sigue desde el archivo que faltaba.
- **Probar de nuevo** vuelve a aplicar todo desde cero.

:::warning Requiere Docker
La prueba de la base y el panel de **Ejecución** necesitan **Docker Desktop** encendido y I-CASE Tool ejecutándose en local. En la versión publicada se generan los archivos, pero no se prueban.
:::

## 4. Contrato de API

Disponible después de aprobar la base de datos. Relaciona las acciones reales del prototipo (formularios, botones y enlaces) con las operaciones que usarán el backend y los clientes.

- **Supabase:** lee tablas, vistas, columnas, políticas, permisos y RPC de una base desechable creada con los SQL aprobados. Las operaciones que requieren una Edge Function quedan indicadas como pendientes de Backend.
- **Express:** produce un contrato `openapi.yaml`, con entradas, salidas, roles y requerimientos. Su ejecución se comprobará al construir el backend.
- La ficha muestra cobertura, errores, operaciones por pantalla y sus datos de prueba. **Editar contrato** permite ajustar el JSON y **Validar y guardar** vuelve a comprobarlo sin IA. También puedes usar **Ampliar con IA**.
- **Probar permisos** inicia sesión con cada actor de prueba y llama a las tablas y RPC de Supabase. Las escrituras se revierten en el servidor PostgREST del proyecto desechable. Un error de negocio o una respuesta sin filas queda **sin verificar**; una respuesta vacía para un rol prohibido solo demuestra el filtro RLS si la misma petición devuelve filas para un rol permitido.
- **Descargar contrato** entrega JSON para Supabase o YAML OpenAPI para Express. Ambos aparecen también en el explorador de archivos.

Los errores de cobertura y las contradicciones comprobadas de permisos impiden aprobar. Si hay pruebas sin ejecutar, inconclusas o flujos de integración pendientes, se pide reconocerlos antes de aprobar. Aprobar el contrato no equivale a aprobar la seguridad de todo el sistema.

:::info Instalación
Ejecuta una vez `supabase/contrato_implementacion.sql` en el SQL Editor del Supabase de I-CASE Tool. Para generar un inventario nuevo y probar permisos necesitas Docker y el runner local. Una versión desplegada puede regenerar el mapa con un inventario previamente guardado si los SQL y el stack no cambiaron.
:::

## Archivos del proyecto

Debajo de los pasos está el **explorador de archivos**: el árbol del proyecto y el código de cada archivo.

- En gris, los archivos fijos de las piezas (*Plantilla*). En cursiva, los planificados que todavía no tienen código (*Pendiente*).
- **Editar**: corrige el código en el mismo recuadro (Tab inserta espacios, **Ctrl + S** guarda). Al guardar, el archivo queda como *Editado* y el paso pierde la aprobación hasta probarlo y aprobarlo otra vez.
- **Expandir**: el explorador entero a pantalla completa. **Esc** vuelve.

:::info Captura pendiente
`capturas/09-explorador.png`: explorador de archivos con un archivo abierto en edición.
:::

## Ejecución

El panel **Ejecución** levanta el proyecto generado en contenedores, muestra el estado de cada servicio, sus logs y los enlaces para abrirlo.
