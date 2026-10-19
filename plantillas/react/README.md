# Pieza: React

Aplicación React (Vite) compilada y servida por nginx. Servicio `frontend`, publicado en `FRONTEND_PORT`.

## Archivos fijos

- `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/vite.config.js`;
- `frontend/nginx.conf`: sirve la app. Con Express, además redirige `/api` al backend.

## Qué genera la IA

| Archivo | Contenido |
|---|---|
| `frontend/package.json` | Script `build` (Vite deja el resultado en `dist/`), dependencias (`react`, `react-dom`, `react-router`) |
| `frontend/index.html`, `frontend/src/main.jsx` | Entrada de la app |
| `frontend/src/rutas.jsx` | Rutas y menú (del árbol de navegación) |
| `frontend/src/paginas/` | Una página por pantalla Web del prototipo |
| `frontend/src/componentes/`, `frontend/src/api/` | Piezas compartidas y cliente de la API |

## Reglas para el código generado

- Con Express, la API se llama con rutas relativas (`/api/...`), nunca con `localhost`.
- No modificar los archivos fijos.
