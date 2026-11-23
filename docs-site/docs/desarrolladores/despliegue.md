---
title: Despliegue y estado del proyecto
sidebar_position: 3
---

# Despliegue y estado del proyecto

## Dónde corre cada cosa

| Parte | Dónde | Qué hace |
|---|---|---|
| I-CASE Tool (interfaz y rutas de API) | **Vercel**, desde el repositorio de GitHub | Todas las fases, los artefactos, el informe y la documentación en `/docs` |
| Usuarios, proyectos y artefactos | **Supabase** | Auth, PostgreSQL con RLS y Storage |
| Runner de Docker | La PC o un **servidor** (máquina virtual con Docker y Caddy) | Levanta, prueba y compila los proyectos generados |
| Proyectos generados | Contenedores del runner | Cada proyecto con su web, su API, su base y su documentación |

## Vercel

1. Importar el repositorio en Vercel (framework: Next.js).
2. Cargar las variables de entorno en *Settings → Environment Variables*: las mismas de `.env.local`. Para ejecutar proyectos desde la versión publicada, `RUNNER_URL` y `RUNNER_TOKEN` deben apuntar al runner del servidor; sin ellos, Vercel busca el runner en `127.0.0.1` y falla con "El runner no está encendido".
3. Comando de build: `npm run build`, que ya genera la documentación en `/docs`.

## Qué pasa al pulsar "Levantar"

Vercel **no aloja los proyectos generados**: solo la propia I-CASE Tool.

1. El navegador llama a `/api/implementacion` con la acción `levantar`.
2. La ruta lee de Supabase los archivos generados del proyecto, los junta con la plantilla de su stack y los envía al runner (`sincronizar` y `levantar`).
3. El runner escribe los archivos en la carpeta del proyecto (`/srv/icase-workspaces/<id>`), asigna puertos libres y ejecuta `docker compose -p icase_<id> up`.
4. En el servidor escribe un sitio de Caddy por proyecto y publica cada acceso por HTTPS en el puerto + 10000 (web, móvil, API de Supabase y documentación).
5. El panel de **Ejecución** muestra solo los enlaces. Los archivos, los contenedores y los logs quedan dentro del servidor.

El runner no tiene nada específico de un proyecto: un proyecto nuevo se levanta igual que cualquier otro, sin configurar nada aparte. Cada uno tiene sus propios contenedores, red y base de datos, y se apaga solo tras 60 minutos sin uso.

## Servidor

- **Máquina virtual en Azure** con Docker, Caddy y el runner (`runner/index.mjs`). El nombre DNS y la IP públicos no deben borrarse; la máquina se **detiene (desasigna)** cuando no se usa, para no gastar crédito.
- Para presentar: encender la máquina, **Levantar** el proyecto (o **Actualizar y reiniciar**), comprobar sus enlaces y apagarla al terminar.
- Al actualizar el runner (`runner/index.mjs`) en la máquina, se guarda una copia del archivo anterior.

## Estado

| Fase | Paso | Estado |
|---|---|---|
| Análisis | Contexto, entrevista, requerimientos, casos de uso | Terminado |
| Diseño | Árbol de navegación, clases, entidad-relación, prototipo, arquitectura, sistemas | Terminado |
| Implementación | Stack técnico, estructura de carpetas, base de datos (con prueba en Docker) | Terminado |
| Implementación | Contrato de API (con prueba de permisos por actor) | Terminado |
| Implementación | Backend (Edge Functions probadas en Docker) | Terminado |
| Implementación | Frontend (web y móvil, compiladas en Docker) | Terminado |
| Implementación | Documentación del proyecto (sitio en su propio contenedor) | Terminado |
| Implementación | Ejecución y despliegue en servidor | Terminado |
| Pruebas | Plan de pruebas (casos, trazabilidad, hallazgos) y cierre del informe | Hecha, por probar |
| Pruebas | Ejecución automática de los casos y pruebas de carga | Pendiente |

Los cambios por versión están en [`CHANGELOG.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/CHANGELOG.md).
