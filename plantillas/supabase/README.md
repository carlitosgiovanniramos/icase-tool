# Pieza: Supabase

Supabase local con la configuración oficial (github.com/supabase/supabase, carpeta `docker`, 2026-10-19), reducida a los servicios que pide el diseño.

## Servicios

| Servicio | Siempre | Qué es |
|---|---|---|
| `db` | Sí | PostgreSQL de Supabase (`supabase/postgres:17`) |
| `api-gw` | Sí | Puerta de entrada (Envoy): publica todo en `SUPABASE_PORT` |
| `rest` | Sí | API de datos (PostgREST) |
| `migraciones` | Sí | Tarea de un solo uso: aplica las tablas del proyecto y termina |
| `auth` | Opcional | Autenticación (GoTrue) |
| `realtime` | Opcional | Cambios en vivo por WebSocket |
| `storage` | Opcional | Archivos (buckets) |
| `functions` | Opcional | Edge Functions (Deno / TypeScript) |

Los opcionales se incluyen solo si el diagrama de arquitectura o el de sistemas los tiene.

## Qué genera la IA

| Archivo | Contenido |
|---|---|
| `supabase/migrations/NNNN_<nombre>.sql` | Tablas, relaciones, índices, políticas RLS, publicación Realtime y buckets de Storage. Se aplican en orden de nombre, una sola vez cada uno |
| `supabase/seed.sql` | Datos de prueba (opcional) |
| `supabase/functions/<nombre>/index.ts` | Una carpeta por Edge Function, con `Deno.serve(...)` |

## Reglas para el código generado

- **RLS siempre:** toda tabla de `public` lleva `enable row level security` y políticas por rol (`anon`, `authenticated`). Los permisos por actor se resuelven con políticas, no en el cliente.
- **Permisos explícitos:** dar `grant` a `authenticated` (y a `anon` solo si una tabla es pública) sobre lo que la API debe exponer.
- **Usuarios:** las cuentas viven en `auth.users`. La entidad de usuarios del ER se crea con su nombre (en minúsculas, ej. `public.usuario`) y `id uuid primary key references auth.users(id) on delete cascade`; los roles del negocio van en una columna de esa tabla. Sin columna de contraseña: la maneja Auth.
- **Rol en las políticas:** se lee con una función `security definer` y `set search_path = ''` (ej. `public.rol_actual()`), no con una subconsulta a la tabla de usuarios dentro de su propia política (recursión infinita).
- **Extensiones:** `pgcrypto` y `pg_net` están en el esquema `extensions`: `extensions.digest(...)`, `extensions.crypt(...)`, `extensions.gen_salt('bf')`.
- **Migraciones:** cada archivo se aplica dentro de una transacción: sin `begin`/`commit` ni `create index concurrently`.
- **Usuarios de prueba (`seed.sql`):** uno por actor en `auth.users`, con su fila en `auth.identities` (`provider` `email`, `provider_id` y `user_id` iguales al id del usuario, `identity_data` con `sub` y `email`). `instance_id` `00000000-0000-0000-0000-000000000000`, `aud` y `role` `authenticated`, `email_confirmed_at` `now()`, contraseña con `extensions.crypt('<contraseña>', extensions.gen_salt('bf'))`, y `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, `phone_change`, `phone_change_token` y `reauthentication_token` en `''`: con `NULL`, Auth no puede iniciar sesión. Si una migración crea la fila de la tabla de usuarios con un trigger sobre `auth.users`, los datos de prueba no la insertan de nuevo.
- **Realtime:** para que una tabla emita cambios, agregarla con `alter publication supabase_realtime add table ...`.
- **Storage:** crear los buckets con `insert into storage.buckets (id, name, public) ...` y sus políticas sobre `storage.objects`.
- **Edge Functions:** variables disponibles: `SUPABASE_URL` (interna), `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_DB_URL`. Las claves de servicios externos llegan como variables de entorno; si falta una, la función responde 503 con el nombre de la variable que falta. Se llaman en `/functions/v1/<nombre>` con la clave de API, y el JWT se verifica.
- **No tocar** `supabase/docker/` ni `supabase/functions/main/`: son archivos fijos de la pieza.

## Direcciones

- Desde el navegador o el celular: `http://localhost:<SUPABASE_PORT>`, con `ANON_KEY` como clave pública.
- Desde otro contenedor: `http://api-gw:8000`.

## A tener en cuenta

- La primera suscripción a Realtime después de levantar el proyecto puede perder el primer aviso, porque Realtime crea su canal de replicación al recibir la primera conexión. Desde la segunda funciona normalmente.
- Sin servidor de correo configurado (`SMTP_HOST`), las cuentas quedan confirmadas al registrarse.
- La dirección administrativa de Realtime (`/realtime/v1/api/tenants`) está bloqueada a propósito por la puerta de entrada.
