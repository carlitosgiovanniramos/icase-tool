---
title: Contribuir
sidebar_position: 4
---

# Contribuir

Las reglas completas están en el repositorio:

| Documento | Contenido |
|---|---|
| [`README.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/README.md) | Descripción, instalación, ejecución y estructura |
| [`CONTRIBUTING.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/CONTRIBUTING.md) | Ramas, commits, pull requests y revisión |
| [`CODE_OF_CONDUCT.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/CODE_OF_CONDUCT.md) | Normas de comportamiento y colaboración del equipo |
| [`SECURITY.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/SECURITY.md) | Manejo de claves y cómo reportar un problema de seguridad |
| [`CHANGELOG.md`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/CHANGELOG.md) | Cambios de cada versión |
| [`LICENSE`](https://github.com/carlitosgiovanniramos/icase-tool/blob/main/LICENSE) | Licencia |

## En resumen

- **Ramas:** `main` es lo entregado; `develop` integra el trabajo; cada cambio va en una rama `feature/…` o `fix/…` desde `develop`.
- **Commits:** en español, en presente y describiendo el cambio. Ej.: *"Base de datos: continuar una generación cortada"*.
- **Pull request:** hacia `develop`, con qué cambia, cómo se probó y capturas si toca la interfaz.
- **Antes de pedir revisión:** lint y `npm run build` sin errores. Si cambias un prompt, pruébalo con **dos proyectos de temas distintos**: las reglas deben servir para cualquier sistema.
