# Pieza: Next.js

Panel web en Next.js 16 (App Router), compilado con `output: "standalone"` y ejecutado con Node 22.

## Servicio

`web`, publicado en `WEB_PORT`. Con alta disponibilidad pasa a `web-master` y `web-esclavo`, detrás del balanceador.

## Archivos fijos

- `web/Dockerfile`, `web/.dockerignore`, `web/next.config.mjs`;
- `web/app/api/salud/route.js`: lo usan el healthcheck y el balanceador;
- con Supabase, además, `web/lib/supabase/navegador.js` y `web/lib/supabase/servidor.js`.

## Qué genera la IA

| Archivo | Contenido |
|---|---|
| `web/package.json` | Scripts `dev`, `build` y `start`; dependencias `next`, `react`, `react-dom` y las del stack (por ejemplo `@supabase/supabase-js`) |
| `web/app/layout.js` | Estructura común y menú principal (del árbol de navegación, vista Web) |
| `web/app/<ruta>/page.js` | Una página por pantalla Web del prototipo |
| `web/app/**/<Componente>.js` | Componentes de cliente (`"use client"`) y piezas compartidas |

## Reglas para el código generado

- JavaScript (no TypeScript), App Router, sin carpeta `src/`.
- **Supabase desde el navegador:** `supabaseNavegador()` de `web/lib/supabase/navegador.js`.
- **Supabase desde el servidor:** `supabaseServidor(accessToken)` de `web/lib/supabase/servidor.js`. Usa la red interna; `localhost` dentro del contenedor no es la PC.
- Las páginas que consultan datos en cada petición llaman a `await connection()` (de `next/server`) antes de leer.
- Solo las variables `NEXT_PUBLIC_*` llegan al navegador, y quedan fijas al compilar.
- No modificar los archivos fijos.
