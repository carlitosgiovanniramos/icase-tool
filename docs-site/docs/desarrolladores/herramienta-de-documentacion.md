---
title: Por qué Docusaurus
sidebar_position: 5
---

# Herramienta de documentación: Docusaurus

Esta documentación se escribe en **Markdown** y se genera con **Docusaurus 3**, con dos complementos:

- `@docusaurus/theme-mermaid`, para dibujar diagramas;
- `redocusaurus`, para la referencia de la API a partir de la especificación **OpenAPI**.

## Por qué

| Criterio | Docusaurus |
|---|---|
| Mismo ecosistema | JavaScript y React, como I-CASE Tool. No suma lenguajes ni herramientas al equipo |
| Diagramas | Dibuja **Mermaid**, el mismo formato de la mayoría de los artefactos de I-CASE Tool. Los ejemplos del manual son diagramas reales, no imágenes |
| API | Con Redocusaurus, la referencia se genera desde `openapi/icase-tool.yaml` (OpenAPI 3) |
| Escritura | Markdown versionado en el mismo repositorio que el código: un cambio de la herramienta y su documentación van en el mismo commit |
| Publicación | Sitio estático servido por la propia aplicación en `/docs`: una sola URL y un solo despliegue |
| Lectura | Buscador, barra lateral por sección y modo claro u oscuro |

**Alternativas evaluadas:**

- **MkDocs**: más simple, pero requiere Python, que no está en el proyecto.
- **GitHub Wiki**: no admite Mermaid con el mismo alcance ni una referencia OpenAPI navegable, y queda separada del código.

## Cómo se edita

```text
docs-site/
├── docs/                 páginas en Markdown (manual, api, ia, desarrolladores)
├── openapi/icase-tool.yaml   especificación de la API
├── static/img/capturas/  capturas de pantalla
├── docusaurus.config.js  configuración (baseUrl /docs/)
└── sidebars.js           barras laterales
```

- `npm run docs` abre la documentación en http://localhost:3001/docs/ y se recarga al guardar.
- `npm run docs:build` la genera en `public/docs`; `npm run build` lo hace automáticamente.
- Para agregar una captura, guarda la imagen en `docs-site/static/img/capturas/` y reemplaza el recuadro "Captura pendiente" por `![Descripción](/img/capturas/archivo.png)`.
