---
title: "Fase 02: Diseño"
sidebar_position: 4
---

# Fase 02: Diseño

El Diseño tiene seis pasos, en este orden. Cada uno usa los anteriores aprobados.

| Paso | Qué define | Se genera a partir de |
|---|---|---|
| Diagrama de clases | Las clases del dominio, con atributos, operaciones y relaciones | Requerimientos y casos de uso |
| Diagrama entidad-relación | Los datos que el sistema guarda y cómo se relacionan | Clases (y tecnologías: con un servicio de autenticación no se guardan contraseñas) |
| Prototipo de pantallas | La interfaz de cada actor, web y móvil | Requerimientos y entidad-relación |
| Árbol de navegación | Cómo se llega a cada pantalla desde el menú | Pantallas del prototipo |
| Diagrama de arquitectura | Capas, tecnologías y cómo se comunican | Todo lo anterior y los atributos de calidad |
| Diagrama de sistemas | Subsistemas, componentes y los requerimientos que cumple cada uno | Arquitectura y árbol de navegación |

## Diagramas

Los cinco diagramas se trabajan igual:

1. **Generar** (con indicaciones opcionales).
2. Revisar el dibujo. **Expandir** abre pantalla completa con zoom (`+`, `-`, Ctrl + rueda); **Esc** cierra.
3. Corregir:
   - en la pestaña **Código**, editando el código Mermaid o PlantUML (se valida antes de guardar), o
   - con **Ampliar con IA** (ej. *"agrega la entidad PROVEEDOR relacionada con INSUMO"*).
4. **Descargar SVG** si lo necesitas fuera de la herramienta.
5. **Aprobar**.

:::info Captura pendiente
`capturas/07-diagrama-expandido.png`: un diagrama expandido con zoom.
:::

## Prototipo de pantallas

El prototipo se arma en tres pasos:

1. **Configuración**: plataformas (aplicación web y móvil), color de marca, tema claro u oscuro, logo y capturas de referencia de estilo.
2. **Proponer pantallas con IA**: la IA propone la lista de pantallas de cada plataforma con sus actores y requerimientos. Puedes quitar, agregar o renombrar.
3. **Generar prototipo**: se genera **pantalla por pantalla** y cada una se guarda apenas termina. **Detener** corta antes de la siguiente; **Agregar faltantes** completa las que no se generaron.

Cada pantalla se ve a tamaño real (la móvil, en el ancho de un celular) y se puede **Expandir**. Para cambiarla: **Ampliar con IA** eligiendo la pantalla, o la pestaña **Código** para editar su HTML con vista previa en vivo. Con Claude activado hay dos niveles de detalle (económico o detallado) y se avisa el **costo estimado** antes de generar.

:::info Captura pendiente
`capturas/08-prototipo.png`: grilla del prototipo con pantallas web y móvil.
:::

## Aprobar el Diseño

Con los seis pasos aprobados, pulsa **Continuar a Implementación**. También se habilita el [Informe](./informe-y-exportacion).
