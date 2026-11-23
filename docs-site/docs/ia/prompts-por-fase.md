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
| Árbol de navegación | `app/api/generar-arbol-navegacion`, `lib/arbol.js` | Plan de pantallas (sección del menú y desde dónde se abre cada una) | Mermaid `flowchart` | Cada pantalla en el árbol, una rama por actor, una vista por plataforma |
| Pantallas propuestas | `app/api/proponer-pantallas` | Análisis, casos de uso, clases, ER, reglas de negocio, entrevista y plataformas | JSON `pantallas[]` | Nombres únicos, todo RF cubierto por alguna pantalla, plataformas válidas |
| Pantalla del prototipo | `app/api/generar-mockups` | Pantalla, plan completo, análisis, ER y estilo | HTML del contenido de una pantalla (el armazón lo pone el código) | Controles con `data-operacion` y `name`, estados vacíos, mensajes de resultado; revisión con casillas y corrección solo de lo marcado |
| Modificar pantalla | `app/api/modificar-pantalla` | HTML actual e instrucción | HTML | — |
| Arquitectura | `app/api/generar-arquitectura` | Análisis, ER, árbol, plataformas, tecnologías y calidad | Mermaid `flowchart` | Límite de nodos y flechas, flechas de capa superior a inferior, clase en cada nodo, tecnología real en cada caja |
| Sistemas | `app/api/generar-diagrama-sistema` | Análisis, arquitectura y árbol | PlantUML `@startwbs` | Niveles correctos, cada componente con nombre, tecnología concreta y sus RF |
| Modificar diagrama | `app/api/modificar-diagrama` | Código actual e instrucción | JSON `{ codigo }` en el mismo lenguaje | Se dibuja antes de guardar |

## Fase 03: Implementación

| Artefacto | Prompt en | Entrada | Salida | El código comprueba |
|---|---|---|---|---|
| Stack técnico | `lib/stack.js` | Arquitectura, sistemas, requerimientos, tecnologías y catálogo de piezas | JSON: piezas, librerías, servicios externos y resolución de cada elemento | Piezas del catálogo, ninguna tecnología del diseño sin pieza, cada componente del diagrama de sistemas resuelto, librerías que existen y sirven en su entorno, capacidades que piden los RF (firma, PDF, mapas, sin conexión…) |
| Estructura de carpetas | `lib/estructura.js` | Stack, pantallas, árbol, ER, clases, sistemas y la guía de cada pieza | JSON: archivos por pieza | Cobertura de pantallas, tablas, módulos y RF; rutas dentro de su pieza; nada que el diseño no pida |
| Base de datos | `lib/bd.js` | Archivo, estructura, ER, clases, requerimientos, guía de la pieza y archivos anteriores | SQL de un archivo | Tablas del ER, claves foráneas en orden, RLS y políticas, datos en todas las tablas, rol fuera de lo que el usuario edita, correcciones sin borrar datos; y la **prueba real en contenedores** |
| Contrato de API | `lib/contrato.js` | Acciones extraídas del HTML, análisis, clases, sistemas, estructura, inventario real y SQL aprobados | Operaciones por acción, roles, RF, esquemas de entrada/salida y datos de prueba; OpenAPI con Express | Cobertura exacta de controles, roles y RF existentes, tablas y grants reales, RPC y argumentos, rutas HTTP únicas; un reintento con los errores. La semántica de una acción local y los permisos por fila requieren revisión e integración |
| Backend | `lib/backend.js` | Contrato, estructura, base, guía de la pieza y las funciones ya escritas | Código de una Edge Function (Deno) o de un archivo de Express | Atiende con `Deno.serve`, lee quién llama antes de actuar, sin claves escritas en el código; y la **prueba de permisos con las funciones encendidas** |
| Frontend | `lib/frontend.js` | Pantalla del prototipo (HTML y CSS), operaciones del contrato, estructura, fijos de la pieza y la capa anterior | Código de un archivo de la web o de la app | Rutas, importaciones y paquetes válidos, sin clases CSS que no existen; y la **compilación en Docker**, con el error de vuelta a la IA |
| Documentación | `lib/documentacionIA.js`, `lib/documentacion.js` | Solo los datos aprobados del tema de cada página | Markdown de una página de lectura | Lo exacto (endpoints, tablas, diagramas) sale de los datos y no de la IA; cada página se guarda al salir |

## Fase 04: Pruebas

| Artefacto | Prompt en | Entrada | Salida | El código comprueba |
|---|---|---|---|---|
| Plan de pruebas | `lib/pruebasIA.js` | Actores, requerimientos funcionales (con actores, precondiciones y postcondiciones), reglas de negocio y, de cada lote, las pantallas del prototipo aprobado que lo cumplen con sus botones y enlaces; en lotes de 8 | JSON `casos[] { titulo, rfs, actor, tipo, precondiciones, pasos, esperado }` | Todo RF con al menos un caso (un reintento con los que falten), actor con el nombre exacto del análisis, casos numerados CP-01…; los pasos deben usar los nombres reales de las pantallas y botones, o ninguno si el requerimiento no tiene pantalla; la trazabilidad y los hallazgos graves impiden aprobar |

## Guías por tecnología

Las reglas de cada tecnología se pasan a la IA desde la guía de su pieza (`plantillas/<pieza>/README.md`):

| Pieza | Ejemplos de reglas |
|---|---|
| Supabase | RLS siempre; el rol de cada cuenta sale de `raw_app_meta_data`; las funciones `security definer` comprueban quién llama; las firmas se verifican con un trigger; datos de prueba en todas las tablas |
| Next.js | App Router en JavaScript; `proxy.js` (no `middleware.js`) en Next.js 16 |
| Flutter | Vista previa web en Docker; `sqflite` no funciona en la web, así que el almacenamiento local necesita una alternativa para la vista previa; Firebase y Google Maps necesitan su configuración |
| PostgreSQL | Esquema y datos de prueba en `database/init/`, que se aplican al crear la base |
