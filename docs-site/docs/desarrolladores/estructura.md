---
title: Estructura del repositorio
sidebar_position: 2
---

# Estructura del repositorio

```text
icase-tool/
├── app/                      Next.js (App Router)
│   ├── (app)/                páginas con sesión: proyectos, crear, proyectos/[id]
│   │   └── proyectos/[id]/   página del proyecto: fases, fichas, explorador, pruebas e informe
│   ├── api/                  una ruta por paso (generar-*, modificar-*, implementacion…)
│   ├── login/, registro/     acceso
│   ├── AlertProvider.js      avisos y confirmaciones (modal único)
│   └── InterruptorClaude.js  interruptor de Claude y selector de modelo gratuito
├── lib/                      lógica sin interfaz
│   ├── gemini.js, groq.js, claude.js   llamadas a la IA (generarContenido)
│   ├── stack.js, estructura.js, bd.js  pasos de Implementación (base de datos)
│   ├── contrato.js, backend.js, frontend.js   contrato de API, backend y frontend
│   ├── documentacion.js, documentacionIA.js   documentación del proyecto
│   ├── pruebas.js, pruebasIA.js        fase de Pruebas (casos, trazabilidad, hallazgos)
│   ├── implementacion.js     armador de proyectos (docker-compose, .env, archivos fijos)
│   └── …                     análisis, diagramas, navegación, utilidades
├── plantillas/               catálogo de piezas de Implementación (supabase, nextjs, flutter…)
│   └── <pieza>/              pieza.json, compose.yml, archivos fijos y README.md (guía para la IA)
├── runner/index.mjs          proceso que ejecuta Docker (en la PC o en un servidor, con Caddy)
├── supabase/                 scripts SQL de la base de I-CASE Tool
├── docs-site/                documentación (Docusaurus), con el plan de implementación
├── proxy.js                  exige sesión en toda la app salvo /login, /registro y /docs
└── next.config.mjs           sirve la documentación en /docs
```

## Dónde tocar según el cambio

| Quiero… | Archivo |
|---|---|
| Cambiar el prompt o la validación de un paso de Análisis o Diseño | `app/api/<paso>/route.js` |
| Cambiar un paso de Implementación | `lib/stack.js`, `lib/estructura.js`, `lib/bd.js`, `lib/contrato.js`, `lib/backend.js`, `lib/frontend.js`, `lib/documentacionIA.js` |
| Cambiar la fase de Pruebas | `lib/pruebas.js` (reglas y trazabilidad) y `lib/pruebasIA.js` (casos) |
| Cambiar cómo se levantan los proyectos | `runner/index.mjs` y `lib/implementacion.js` |
| Cambiar la cadena de modelos de IA | `lib/gemini.js` |
| Agregar un paso a la cadena (aprobación y cascada) | `app/(app)/proyectos/[id]/pasos.js` y `page.js` |
| Agregar una tecnología al catálogo | una carpeta nueva en `plantillas/` |
| Editar esta documentación | `docs-site/docs/` y `docs-site/openapi/icase-tool.yaml` |

El estado de cada fase está en [Despliegue y estado del proyecto](./despliegue) y los cambios por versión en [`CHANGELOG.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/CHANGELOG.md).
