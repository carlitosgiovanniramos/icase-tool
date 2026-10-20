---
title: "Fase 03: Implementación"
sidebar_position: 5
---

# Fase 03: Implementación

La Implementación convierte el diseño aprobado en un **proyecto de código**. La herramienta no cambia las tecnologías del diseño: si la arquitectura dice Next.js, Flutter y Supabase, el proyecto usa exactamente eso.

Los pasos se ven uno debajo del otro y se **pliegan** desde su título: abierto queda el que estás trabajando y los demás muestran un resumen.

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
