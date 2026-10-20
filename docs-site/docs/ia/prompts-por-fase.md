---
title: Prompts por fase
sidebar_position: 3
---

# Prompts por fase

Para cada artefacto: dónde está su prompt, qué recibe (entrada), qué devuelve (salida) y qué comprueba el código. Todos usan la [plantilla](./plantilla-de-prompt) y el [modelo elegido](./funcionamiento#selección-del-modelo). La versión exacta queda registrada en cada paso (`modelo_ia`).

## Fase 01: Análisis

| Artefacto | Prompt en | Entrada | Salida | El código comprueba |
|---|---|---|---|---|
| Preguntas de entrevista | `app/api/generar-preguntas` | Descripción, documento, contexto | JSON `preguntas[] { pregunta, motivo }` | — |
| Requerimientos | `app/api/generar-analisis` | Descripción, documento, imagen, contexto y entrevista | JSON: actores, RF y RNF (ISO/IEC 25010) | Códigos únicos, dependencias existentes y sin ciclos, actores conocidos, redacción "El sistema debe…", huecos frente al contexto (revisión en una segunda llamada) |
| Ampliar requerimientos | `app/api/ampliar-analisis` | Análisis actual e instrucción | JSON del análisis | Lo nuevo o cambiado queda marcado |
| Casos de uso | `app/api/generar-casos-uso` | Análisis | Mermaid `flowchart` | Un caso de uso por RF, sin actores inventados, cada actor enlazado a sus casos |

## Fase 02: Diseño

| Artefacto | Prompt en | Entrada | Salida | El código comprueba |
|---|---|---|---|---|
| Clases | `app/api/generar-diagrama-clases` | Análisis y casos de uso | Mermaid `classDiagram` | Clases con atributos, sin accesores triviales, relaciones con multiplicidad, sin clases sueltas |
| Entidad-relación | `app/api/generar-diagrama-er` | Análisis, casos de uso, clases y tecnologías | Mermaid `erDiagram` | Cada entidad con PK, FK en cada relación, relaciones dibujadas para cada FK |
| Pantallas propuestas | `app/api/proponer-pantallas` | Análisis, ER y plataformas | JSON `pantallas[]` | Nombres únicos, todo RF cubierto por alguna pantalla, plataformas válidas |
| Pantalla del prototipo | `app/api/generar-mockups` | Pantalla, plan completo, análisis, ER y estilo | HTML de una pantalla | — (una petición por pantalla) |
| Modificar pantalla | `app/api/modificar-pantalla` | HTML actual e instrucción | HTML | — |
| Árbol de navegación | `app/api/generar-arbol-navegacion`, `lib/arbol.js` | Pantallas con sus menús y botones reales | Mermaid `flowchart` | Cada pantalla en el árbol, una vista por plataforma |
| Arquitectura | `app/api/generar-arquitectura` | Análisis, ER, árbol, plataformas, tecnologías y calidad | Mermaid `flowchart` | Límite de nodos y flechas, flechas de capa superior a inferior, clase en cada nodo, tecnología real en cada caja |
| Sistemas | `app/api/generar-diagrama-sistema` | Análisis, arquitectura y árbol | PlantUML `@startwbs` | Niveles correctos, cada componente con nombre, tecnología concreta y sus RF |
| Modificar diagrama | `app/api/modificar-diagrama` | Código actual e instrucción | JSON `{ codigo }` en el mismo lenguaje | Se dibuja antes de guardar |

## Fase 03: Implementación

| Artefacto | Prompt en | Entrada | Salida | El código comprueba |
|---|---|---|---|---|
| Stack técnico | `lib/stack.js` | Arquitectura, sistemas, requerimientos, tecnologías y catálogo de piezas | JSON: piezas, librerías, servicios externos y resolución de cada elemento | Piezas del catálogo, ninguna tecnología del diseño sin pieza, cada componente del diagrama de sistemas resuelto, librerías que existen y sirven en su entorno, capacidades que piden los RF (firma, PDF, mapas, sin conexión…) |
| Estructura de carpetas | `lib/estructura.js` | Stack, pantallas, árbol, ER, clases, sistemas y la guía de cada pieza | JSON: archivos por pieza | Cobertura de pantallas, tablas, módulos y RF; rutas dentro de su pieza; nada que el diseño no pida |
| Base de datos | `lib/bd.js` | Archivo, estructura, ER, clases, requerimientos, guía de la pieza y archivos anteriores | SQL de un archivo | Tablas del ER, claves foráneas en orden, RLS y políticas, datos en todas las tablas, rol fuera de lo que el usuario edita, correcciones sin borrar datos; y la **prueba real en contenedores** |

## Guías por tecnología

Las reglas de cada tecnología se pasan a la IA desde la guía de su pieza (`plantillas/<pieza>/README.md`):

| Pieza | Ejemplos de reglas |
|---|---|
| Supabase | RLS siempre; el rol de cada cuenta sale de `raw_app_meta_data`; las funciones `security definer` comprueban quién llama; las firmas se verifican con un trigger; datos de prueba en todas las tablas |
| Next.js | App Router en JavaScript; `proxy.js` (no `middleware.js`) en Next.js 16 |
| Flutter | Vista previa web en Docker; `sqflite` no funciona en la web, así que el almacenamiento local necesita una alternativa para la vista previa; Firebase y Google Maps necesitan su configuración |
| PostgreSQL | Esquema y datos de prueba en `database/init/`, que se aplican al crear la base |
