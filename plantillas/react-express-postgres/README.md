# Plantilla react-express-postgres

Archivos fijos del stack React (Vite) + Node.js/Express + PostgreSQL. Salen del proyecto de referencia de la Etapa 1, probado con Docker. icase-tool los copia tal cual en cada proyecto generado: la IA no los escribe.

## Archivos fijos (esta carpeta)

| Archivo | Qué hace |
|---|---|
| `docker-compose.yml` | Tres contenedores (db, backend, frontend), red interna, volumen de datos, healthchecks, orden de arranque y límites de CPU y memoria |
| `.env.example` | Variables del proyecto. `{{nombre_bd}}` se reemplaza por el nombre de la base de cada proyecto |
| `backend/Dockerfile` | Imagen de Node 22 que instala dependencias y ejecuta la API sin root |
| `backend/src/config/db.js` | Conexión a PostgreSQL con `DATABASE_URL` |
| `backend/src/middlewares/errores.js` | `ErrorHttp` y el manejador que convierte errores en respuestas JSON |
| `frontend/Dockerfile` | Compila React con Node y sirve el resultado con nginx |
| `frontend/nginx.conf` | Sirve la aplicación y redirige `/api` al backend |
| `frontend/vite.config.js` | Configuración de Vite |

## Archivos que genera icase-tool en cada proyecto

| Archivo | Sale de |
|---|---|
| `database/init/01_esquema.sql` | Diagrama entidad-relación |
| `database/init/02_datos.sql` | Diagrama entidad-relación y dominio del proyecto |
| `backend/package.json` | Stack técnico |
| `backend/openapi.yaml` | Requerimientos, casos de uso y diagrama de clases |
| `backend/src/index.js` | Registra las rutas de cada módulo y `GET /api/salud` |
| `backend/src/modelos/` | Diagrama de clases y esquema SQL |
| `backend/src/servicios/` | Requerimientos funcionales y reglas de negocio |
| `backend/src/controladores/` y `rutas/` | Contrato de API y diagrama de sistemas |
| `frontend/package.json`, `index.html`, `src/main.jsx` | Stack técnico y nombre del proyecto |
| `frontend/src/rutas.jsx` y `componentes/` | Árbol de navegación |
| `frontend/src/paginas/` | Prototipo de pantallas |
| `frontend/src/api/` | Contrato de API |
| `README.md` | Nombre y descripción del proyecto |

## Contrato que deben cumplir los archivos generados

- El backend escucha en el puerto 4000 y expone `GET /api/salud`, que consulta la base. El healthcheck depende de él.
- Todas las rutas de la API empiezan con `/api`; nginx solo redirige esas.
- El frontend llama a la API con rutas relativas (`/api/...`), nunca con `localhost`.
- `package.json` del frontend tiene el script `build` y Vite deja el resultado en `dist/`.
- Los servicios lanzan `ErrorHttp(estado, mensaje)` para los errores esperados.
