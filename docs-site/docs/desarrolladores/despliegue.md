---
title: Despliegue y estado del proyecto
sidebar_position: 3
---

# Despliegue y estado del proyecto

## Vercel

La aplicación se publica en **Vercel** desde el repositorio de GitHub.

1. Importar el repositorio en Vercel (framework: Next.js).
2. Cargar las variables de entorno en *Settings → Environment Variables*: las mismas de `.env.local`, salvo las del runner.
3. Comando de build: `npm run build`, que ya genera la documentación en `/docs`.

| Funciona en la versión publicada | Solo en local |
|---|---|
| Todas las fases y artefactos, el informe en PDF, la documentación en `/docs` | Ejecutar los proyectos generados y probar su base: requieren Docker y el runner, que corren en la PC |

## Estado

| Fase | Paso | Estado |
|---|---|---|
| Análisis | Contexto, entrevista, requerimientos, casos de uso | Terminado |
| Diseño | Clases, entidad-relación, prototipo, árbol de navegación, arquitectura, sistemas, informe | Terminado |
| Implementación | Stack técnico, estructura de carpetas, base de datos (con prueba en Docker) | Terminado |
| Implementación | Contrato / API | Siguiente |
| Implementación | Backend, Web, Móvil, cierre (descarga del proyecto) | Pendiente |
| Pruebas | — | Planificado |

El detalle de cada etapa está en `docs/plan-implementacion.md`. Los cambios por versión, en [`CHANGELOG.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/CHANGELOG.md).
