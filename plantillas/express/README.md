# Pieza: Node.js / Express

API REST con Express 5 en Node 22. Servicio `backend`, publicado en `BACKEND_PORT`.

## Archivos fijos

- `backend/Dockerfile`, `backend/.dockerignore`;
- `backend/src/middlewares/errores.js`: `ErrorHttp` y el manejador de errores;
- con PostgreSQL, además, `backend/src/config/db.js` (pool de `pg` con `DATABASE_URL`).

## Qué genera la IA

| Archivo | Contenido |
|---|---|
| `backend/package.json` | `"type": "module"`, script `start`, dependencias (`express`, `pg`...) |
| `backend/openapi.yaml` | Contrato de la API |
| `backend/src/index.js` | Arranque: registra las rutas de cada módulo y `GET /api/salud` |
| `backend/src/modelos/`, `servicios/`, `controladores/`, `rutas/` | Un archivo por módulo del diagrama de sistemas |

## Reglas para el código generado

- Escucha en el puerto 4000 (`process.env.PORT`). Todas las rutas empiezan con `/api`.
- `GET /api/salud` consulta la base de datos: lo usa el healthcheck.
- Los servicios lanzan `ErrorHttp(estado, mensaje)` para los errores esperados.
- No modificar los archivos fijos.
