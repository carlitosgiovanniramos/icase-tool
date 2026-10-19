# Pieza: PostgreSQL

PostgreSQL 17 para backends propios (por ejemplo Express). Servicio `db`, sin puerto publicado: solo lo ve el backend por la red interna.

## Qué genera la IA

| Archivo | Contenido |
|---|---|
| `database/init/01_esquema.sql` | Tablas, claves, restricciones e índices (del diagrama entidad-relación) |
| `database/init/02_datos.sql` | Datos de prueba que respetan las claves foráneas |

Los scripts de `database/init/` se ejecutan solo la primera vez que se crea el volumen de datos. Para volver a ejecutarlos hay que borrar la base (`docker compose down -v`).
