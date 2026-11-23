---
title: "Fase 02: Diseño"
sidebar_position: 4
---

# Fase 02: Diseño

El Diseño tiene seis pasos, en este orden. Cada uno usa los anteriores aprobados. El árbol de navegación va **antes** del prototipo: define las pantallas y el prototipo solo las dibuja.

| Paso | Qué define | Se genera a partir de |
|---|---|---|
| Diagrama de clases | Las clases del dominio, con atributos, operaciones y relaciones | Requerimientos y casos de uso |
| Diagrama entidad-relación | Los datos que el sistema guarda y cómo se relacionan | Clases (y tecnologías: con un servicio de autenticación no se guardan contraseñas) |
| Árbol de navegación | Qué pantallas hay, qué ve cada actor y cómo se llega a cada una desde el menú | Plan de pantallas |
| Prototipo de pantallas | La interfaz de cada actor, web y móvil | Árbol de navegación, requerimientos y entidad-relación |
| Diagrama de arquitectura | Capas, tecnologías y cómo se comunican | Todo lo anterior y los atributos de calidad |
| Diagrama de sistemas | Subsistemas, componentes y los requerimientos que cumple cada uno | Arquitectura y árbol de navegación |

## Diagramas

Los diagramas se trabajan igual:

1. **Generar** (con indicaciones opcionales).
2. Revisar el dibujo. **Expandir** abre pantalla completa con zoom (`+`, `-`, Ctrl + rueda); **Esc** cierra.
3. Corregir:
   - en la pestaña **Código**, editando el código Mermaid o PlantUML (se valida antes de guardar), o
   - con **Ampliar con IA** (ej. *"agrega la entidad PROVEEDOR relacionada con INSUMO"*).
4. **Descargar SVG** si lo necesitas fuera de la herramienta.
5. **Aprobar**.

![Diagrama de clases de bomberos expandido, con zoom al 150 %, controles de ajuste y descarga SVG.](/img/capturas/07-diagrama-expandido.png)

## Árbol de navegación

Se arma con el **plan de pantallas**: cada entrada del menú principal de una plataforma es una sección, y los formularios cuelgan de la pantalla que los abre. El código lo construye desde ese plan (una rama por actor), así refleja la navegación real. Como completo es muy ancho, se ve por plataforma (**Web**, **Móvil** o **Completo**).

## Prototipo de pantallas

El prototipo se arma en tres pasos:

1. **Configuración**: plataformas (aplicación web y móvil), color de marca, tema claro u oscuro, logo y capturas de referencia de estilo. De la marca salen la paleta y la tipografía.
2. **Proponer pantallas con IA**: la IA propone la lista de pantallas de cada plataforma con sus actores, requerimientos, la sección del menú a la que pertenecen y desde dónde se abren. Para eso recibe los casos de uso, las clases, el ER, las reglas de negocio y la entrevista. Puedes quitar, agregar o renombrar.
3. **Generar prototipo**: se genera **pantalla por pantalla** y cada una se guarda apenas termina. El menú, el logo y los componentes comunes los escribe el código, y la IA solo escribe el contenido de cada pantalla. **Detener** corta antes de la siguiente; **Agregar faltantes** completa las que no se generaron.

Cada pantalla se ve a tamaño real (la móvil, en el ancho de un celular) y se puede **Expandir**. Cada pantalla pasa una **revisión asistida**: una lista de casillas con lo que no cumple (por ejemplo un formulario sin su operación o un botón que abre un modal que no existe) y **Corregir con IA** actúa solo sobre lo marcado. Para cambiarla: **Ampliar con IA** eligiendo la pantalla, o la pestaña **Código** para editar su HTML con vista previa en vivo. Con Claude activado hay dos niveles de detalle (económico o detallado) y se avisa el **costo estimado** antes de generar.

![Prototipo expandido del inicio de sesión web de bomberos, con selector de pantallas y pestañas Web y Móvil.](/img/capturas/08-prototipo.png)

## Aprobar el Diseño

Con los seis pasos aprobados, pulsa **Continuar a Implementación**. También se habilita el [Informe](./informe-y-exportacion).
