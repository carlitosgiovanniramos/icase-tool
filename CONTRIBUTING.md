# Cómo contribuir a I-CASE Tool

Gracias por colaborar. Estas reglas mantienen el repositorio ordenado y el trabajo del equipo predecible.

## Antes de empezar

1. Instala el proyecto siguiendo el [README](README.md).
2. Lee la documentación para desarrolladores (`npm run docs` → *Desarrolladores*).
3. Si el cambio es grande o toca un generador que ya funciona, coméntalo antes con el equipo: un cambio en un prompt afecta a todos los proyectos.

## Ramas

| Rama | Para qué |
|---|---|
| `main` | Lo entregado y desplegado. Solo recibe merges desde `develop` |
| `develop` | Integración del trabajo del equipo |
| `feature/<tema>` | Una funcionalidad nueva. Ej.: `feature/contrato-api` |
| `fix/<tema>` | Una corrección. Ej.: `fix/prueba-bd-fallida` |
| `docs/<tema>` | Solo documentación |

Crea tu rama desde `develop` actualizado:

```bash
git checkout develop
git pull
git checkout -b feature/mi-cambio
```

## Commits

- En **español**, en presente, diciendo qué cambia y para qué. La primera línea tiene como máximo unos 80 caracteres.
- Un commit por cambio lógico: no mezcles una funcionalidad con arreglos ajenos.
- Si hace falta, agrega una línea en blanco y el detalle en viñetas.

```text
Base de datos: continuar una generación cortada

- Cada archivo generado deja la ficha guardada como incompleta.
- "Continuar" sigue desde el archivo que faltaba.
```

Nunca subas claves: `.env.local` y cualquier `.env*` están en `.gitignore`.

## Antes de pedir revisión

- [ ] `npx eslint <archivos cambiados> --rule '{"no-undef":"error"}'` sin errores.
- [ ] `npm run build` sin errores.
- [ ] Si cambiaste un prompt o una validación: lo probaste con **dos proyectos de temas distintos**.
- [ ] Si cambiaste la interfaz: textos mínimos, sin emojis, avisos y confirmaciones con `app/AlertProvider.js`.
- [ ] Actualizaste la documentación (`docs-site/docs/`) si cambió una funcionalidad, y `CHANGELOG.md`.

## Pull requests

1. Abre el pull request **hacia `develop`**.
2. En la descripción incluye:
   - qué cambia y por qué;
   - cómo lo probaste;
   - capturas, si toca la interfaz.
3. Al menos otro integrante del equipo lo revisa antes del merge.
4. Responde los comentarios con cambios o con una explicación. Resuelve cada conversación al cerrarla.

## Estilo de código

- JavaScript (no TypeScript), nombres y comentarios en español.
- Comentarios que explican el **por qué**, no lo obvio.
- La lógica de cada paso vive en `lib/`; las rutas de `app/api/` solo la llaman.
- Lo importante lo valida el código: si una regla importa, agrégala a la validación, no solo al prompt.

## Reportar errores o proponer mejoras

Abre un *issue* en GitHub con: qué hiciste, qué esperabas, qué pasó, capturas y, si aplica, el mensaje de error y el modelo de IA que respondió.

Al participar aceptas el [Código de conducta](CODE_OF_CONDUCT.md).
