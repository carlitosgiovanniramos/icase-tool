# Pieza docusaurus

Documentación de cada proyecto generado: manual de usuario, manual de desarrolladores y API (un endpoint
por página, con su JSON de entrada y salida). La agrega el paso "Documentación" de la Implementación
(`lib/documentacion.js` genera `docs/docs/**` y los diagramas en `docs/static/img/diagramas/`); no se elige
en el stack técnico (`"interna": true`).

- Contenedor `docs`: compila el sitio con Docusaurus y lo sirve con nginx en `DOCS_PORT` (3200).
- Con Next.js o Flutter, la web y la app reciben la dirección del sitio (`NEXT_PUBLIC_DOCS_URL`,
  `DOCS_URL`) para mostrar el enlace "Documentación" (ver `compose.docusaurus.yml` de esas piezas).
