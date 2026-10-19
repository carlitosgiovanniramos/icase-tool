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
- **Usuarios:** la tabla de usuarios es `auth.users`. Los datos propios del usuario van en una tabla `public.perfiles` con `id uuid references auth.users(id)`, y los roles del negocio en una columna de esa tabla.
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
