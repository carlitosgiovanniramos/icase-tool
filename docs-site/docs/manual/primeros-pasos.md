---
title: Primeros pasos
sidebar_position: 1
---

# Primeros pasos

## Para qué sirve

I-CASE Tool acompaña a quien diseña un sistema de software desde la idea hasta el código base. Se escribe qué sistema se necesita y la herramienta genera, fase por fase, los documentos y diagramas que un equipo de desarrollo normalmente hace a mano: requerimientos, casos de uso, diagramas UML, modelo de datos, prototipo de pantallas, arquitectura y, finalmente, la estructura del proyecto y su base de datos.

Está pensada para estudiantes y equipos de ingeniería de software que quieren obtener un primer borrador completo y coherente, y revisarlo con criterio propio.

## Quién la usa (roles)

I-CASE Tool tiene **un tipo de usuario**: la persona que crea una cuenta y es dueña de sus proyectos. Cada usuario ve y modifica solo sus propios proyectos.

| Rol | Qué hace |
|---|---|
| Usuario registrado | Crea proyectos, genera los artefactos de cada fase, los revisa, edita, aprueba o rechaza, y exporta el informe |

Dentro de cada proyecto, los **actores** (por ejemplo "Bombero" o "Administrador") son los roles del sistema que se está diseñando, no roles de I-CASE Tool.

## Acceso

1. Abre la aplicación y elige **Registrarse**. Escribe tu correo y una contraseña.
2. Con la cuenta creada, entra desde **Iniciar sesión**.
3. Al terminar, usa **Cerrar sesión** en la parte inferior de la barra lateral.

:::info Captura pendiente
`capturas/01-inicio-sesion.png`: pantalla de inicio de sesión.
:::

## La pantalla principal

La **barra lateral izquierda** tiene:

| Elemento | Para qué |
|---|---|
| **Proyectos** | Lista de tus proyectos |
| **+ Crear proyecto** | Empieza un proyecto nuevo |
| **Documentación** | Abre este manual en otra pestaña |
| **Usar Claude** | Con el interruptor activado responde Claude, un modelo de pago y más preciso. Apagado, responden los modelos gratuitos |
| **Modelo gratuito** | Con Claude apagado, elige qué modelo responde: *Automático* (Gemini y, si falla, Groq) o uno en particular |
| **Gastado** | Lo que llevas gastado con Claude, estimado. Se puede reiniciar |

:::info Captura pendiente
`capturas/02-barra-lateral.png`: barra lateral con el interruptor de Claude y el selector de modelo.
:::

## Crear un proyecto

En **+ Crear proyecto** completa:

| Campo | Obligatorio | Consejo |
|---|---|---|
| **Nombre** | Sí | Corto y claro. Ej.: *Sistema de citas médicas* |
| **Descripción** | Sí | Qué sistema necesitas, para quién y qué debe hacer. Ver [Cómo escribir buenas entradas](./buenas-entradas) |
| **Documento** | No | PDF, Word o Excel con información del negocio (formularios, reglamentos, procesos). La IA lo usa como contexto |
| **Imagen** | No | Un formulario en papel, un boceto o una pantalla existente |

Pulsa **Crear proyecto**. Se abre la página del proyecto en la fase de **Análisis**.

:::info Captura pendiente
`capturas/03-crear-proyecto.png`: formulario de creación de proyecto.
:::

## La página de un proyecto

Arriba se ven las tres fases (**01 Análisis**, **02 Diseño**, **03 Implementación**) y el **Informe**. Cada fase se habilita cuando la anterior está aprobada. El nombre y la descripción del proyecto se cambian con **Editar nombre y descripción**.

Sigue con el [flujo de trabajo](./flujo-de-trabajo) para entender cómo se avanza.
