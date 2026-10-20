---
title: "Fase 01: Análisis"
sidebar_position: 3
---

# Fase 01: Análisis

El Análisis convierte la descripción del sistema en **requerimientos** y **casos de uso**.

## 1. Contexto del análisis (opcional, recomendado)

Antes de generar los requerimientos puedes completar el **Contexto**. Mejora mucho el resultado, porque la IA deja de adivinar.

| Campo | Para qué sirve | Ejemplo |
|---|---|---|
| Problema actual | Enfoca los requerimientos en lo importante | *El parte se llena a mano y toma 20 minutos* |
| Usuarios y roles | Se usan como actores en lugar de inventarlos | *Bombero, Jefe de guardia, Administrador* |
| Alcance: qué incluye | Módulos que sí deben existir | *Partes de emergencia, geolocalización* |
| Fuera de alcance | Evita que la IA invente módulos | *Facturación, nómina* |
| Reglas de negocio | Una por línea; cada una genera requerimientos | *Un parte firmado no se puede editar* |
| Tecnologías ya decididas | Requerimientos y diagramas las respetan | *Next.js, Supabase, Flutter* |
| Plataformas | Web, Móvil o Escritorio | |
| Atributos de calidad | Seguridad, rendimiento, uso sin conexión... | |

El contexto se guarda solo mientras escribes ("✓ Guardado").

### Entrevista con la IA

Pulsa **Generar preguntas**: la IA lee la descripción, el documento y el contexto, y pregunta lo que falta para no suponer. Cada pregunta trae el **motivo**. Responde las que sepas: las respuestas se usan al generar los requerimientos.

> *Ejemplo real:* "¿La firma electrónica debe ser una firma digital certificada o es suficiente con una firma trazada en la pantalla?"

:::info Captura pendiente
`capturas/05-contexto-entrevista.png`: contexto completado y preguntas de la entrevista.
:::

## 2. Requerimientos

Pulsa **Generar**. El resultado tiene:

- **Actores**, con su descripción.
- **Requerimientos funcionales** (`RF01`, `RF02`...), cada uno con nombre, descripción, actores, prioridad, dependencias, precondiciones, postcondiciones y método de verificación.
- **Requerimientos no funcionales** (`RNF01`...), clasificados según **ISO/IEC 25010** (seguridad, rendimiento, usabilidad...).

Puedes **agregar, editar o eliminar** cada requerimiento a mano, o usar **Ampliar con IA** (ej. *"agrega un requerimiento para exportar el parte a PDF"*). Lo nuevo o modificado queda marcado hasta que apruebas.

:::info Captura pendiente
`capturas/06-requerimientos.png`: lista de requerimientos con un RF abierto.
:::

## 3. Diagrama de casos de uso

Se genera desde los requerimientos aprobados: actores, casos de uso agrupados por módulo y relaciones «include» y «extend». Como todos los diagramas, tiene:

- **Diagrama / Código**: ver el dibujo o editar su código (Mermaid).
- **Expandir**: pantalla completa con zoom.
- **Descargar SVG**.
- **Ver explicación**: por qué se organizó así.

Con requerimientos y casos de uso aprobados, pulsa **Continuar a Diseño**.
