---
title: Documentación de I-CASE Tool
slug: /
sidebar_label: Inicio
sidebar_position: 0
---

# Documentación de I-CASE Tool

**I-CASE Tool** es una herramienta CASE (*Computer-Aided Software Engineering*) que usa inteligencia artificial para generar los artefactos de cada fase del desarrollo de software. A partir de la descripción de un sistema, produce y deja revisar los requerimientos, los diagramas UML, el modelo de datos, el prototipo de pantallas y la arquitectura. En la fase de Implementación genera el proyecto completo (base de datos, contrato de API, backend, web, app móvil y su propia documentación), lo prueba en contenedores y lo levanta con un botón. Después genera el plan de pruebas y arma el informe final.

La IA propone y la persona decide: cada artefacto se revisa, se edita y se aprueba antes de pasar al siguiente.

## Por dónde empezar

| Necesito… | Página |
|---|---|
| Usar la herramienta por primera vez | [Primeros pasos](./manual/primeros-pasos) |
| Entender cómo avanza un proyecto de fase en fase | [Flujo de trabajo](./manual/flujo-de-trabajo) |
| Ver un proyecto real de principio a fin | [Caso de estudio: Cuerpo de Bomberos](./manual/caso-de-estudio) |
| Escribir mejores descripciones e instrucciones para la IA | [Cómo escribir buenas entradas](./manual/buenas-entradas) |
| Resolver un problema | [Errores comunes](./manual/errores-comunes) |
| Integrar o revisar la API | [Arquitectura y comunicación](./api/arquitectura) y [Referencia OpenAPI](/api/referencia) |
| Conocer los modelos de IA y los prompts | [Componente de IA](./ia/funcionamiento) |
| Probar el sistema generado | [Fase de Pruebas](./manual/pruebas) |
| Instalar, ejecutar o contribuir | [Instalación](./desarrolladores/instalacion) |

## Fases y artefactos

```mermaid
flowchart LR
    D["Descripción del sistema<br/>+ documento e imagen opcionales"] --> A
    subgraph A["01 · Análisis"]
        A1["Contexto y entrevista"] --> A2["Requerimientos"] --> A3["Casos de uso"]
    end
    subgraph B["02 · Diseño"]
        B1["Clases"] --> B2["Entidad-relación"] --> B3["Árbol de navegación"] --> B4["Prototipo"] --> B5["Arquitectura"] --> B6["Sistemas"]
    end
    subgraph C["03 · Implementación"]
        C1["Stack técnico"] --> C2["Estructura de carpetas"] --> C3["Base de datos"] --> C4["Contrato de API"] --> C5["Backend"] --> C6["Frontend"] --> C7["Documentación"]
    end
    subgraph D["04 · Pruebas"]
        D1["Plan de pruebas"]
    end
    A --> B --> C --> D
    D --> I["Informe del proyecto (PDF)"]
```

| Fase | Artefacto | Formato |
|---|---|---|
| Análisis | Preguntas de entrevista | Texto |
| Análisis | Requerimientos funcionales y no funcionales (ISO/IEC 25010), actores | JSON, mostrado como fichas |
| Análisis | Diagrama de casos de uso | Mermaid |
| Diseño | Diagrama de clases | Mermaid |
| Diseño | Diagrama entidad-relación | Mermaid |
| Diseño | Árbol de navegación | Mermaid |
| Diseño | Prototipo de pantallas (web y móvil) | HTML |
| Diseño | Diagrama de arquitectura | Mermaid |
| Diseño | Diagrama de sistemas | PlantUML (WBS) |
| Implementación | Stack técnico (piezas, contenedores, librerías) | JSON, mostrado como ficha |
| Implementación | Estructura de carpetas (archivos planificados) | JSON, mostrado como ficha |
| Implementación | Base de datos (migraciones y datos de prueba) | SQL, probado en Docker |
| Implementación | Contrato de API (operaciones, roles, prueba de permisos) | JSON; YAML OpenAPI con Express |
| Implementación | Backend (Edge Functions o servidor Express) | Código, probado en Docker |
| Implementación | Frontend (web y app móvil) | Código, compilado en Docker |
| Implementación | Documentación del proyecto | Markdown (sitio Docusaurus) |
| Pruebas | Plan de pruebas: casos, trazabilidad, resultados y hallazgos | JSON, mostrado como ficha |
| Informe | Informe del proyecto, con las fases aprobadas | PDF (desde el navegador) |

## Estado y alcance

- **Implementado y probado:**
  - las fases de **Análisis**, **Diseño** e **Implementación** completas: la base, los permisos, el backend y las compilaciones de la web y la app se prueban en contenedores Docker;
  - el botón **Levantar**, que envía el proyecto a un servidor y lo publica por HTTPS (probado con el proyecto del Cuerpo de Bomberos, con web, app móvil y documentación);
  - la fase de **Pruebas** (plan de pruebas, trazabilidad y hallazgos) y el informe con su cierre.
- **Pendiente:** ejecutar los casos de prueba de forma automática y las pruebas de carga (ver [Despliegue y estado del proyecto](./desarrolladores/despliegue)).
- **Requisito de la fase de Implementación:** la ejecución en contenedores la hace el runner, con Docker. Corre en la PC (Docker Desktop) o en un servidor al que apunte `RUNNER_URL`; sin runner, la herramienta genera los artefactos pero no los prueba ni los levanta.

## Correspondencia con el punto 1 del taller

| Entregable pedido | Dónde está |
|---|---|
| Herramienta de documentación y su justificación | [Por qué Docusaurus](./desarrolladores/herramienta-de-documentacion) |
| **Documentación de usuario**: propósito, roles, acceso, funcionalidades, flujo por fases, generar/revisar/editar/exportar, capturas, caso de estudio, buenas entradas, errores comunes | Sección **Manual de usuario** |
| **Documentación de API**: endpoints, método, parámetros, respuestas, códigos, ejemplos, autenticación, claves, límites, errores, integraciones externas | Sección **API** y [Referencia OpenAPI](/api/referencia) |
| **Ingeniería de prompts y componente de IA**: por fase, artefacto, modelo y versión, plantilla de prompt, entrada y salida | Sección **IA y prompts** |
| **Documentación para desarrolladores en GitHub**: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md` y la carpeta de documentación técnica (`docs-site/`) | Repositorio y sección **Desarrolladores** |

## Evidencias

Las capturas de pantalla de este manual son de la aplicación real. Donde todavía falta una, la página lo indica con un recuadro **"Captura pendiente"** y el nombre del archivo que la reemplazará. No se usan capturas simuladas.
