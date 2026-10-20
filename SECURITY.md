# Seguridad

## Reportar un problema

Si encuentras una vulnerabilidad (por ejemplo, acceso a proyectos ajenos o claves expuestas), **no abras un issue público**. Avisa en privado a un integrante del equipo de **CCAJ Software Solutions** con:

- qué encontraste y cómo reproducirlo;
- qué datos o funciones afecta;
- si sabes, cómo corregirlo.

Respondemos en un plazo de 7 días y, una vez corregido, lo registramos en [CHANGELOG.md](CHANGELOG.md).

## Claves y credenciales

- Las claves viven solo en `.env.local` (local) y en las variables de entorno de Vercel (producción). `.gitignore` excluye `.env*`.
- Solo las variables `NEXT_PUBLIC_*` llegan al navegador. Las claves de IA (Gemini, Groq, Anthropic) se usan únicamente del lado del servidor.
- No dejes claves viejas comentadas en `.env.local`: revócalas en el panel del proveedor.
- Si una clave se expone (en un commit, una captura o un mensaje), revócala de inmediato y genera otra.
- `RUNNER_TOKEN` debe ser una cadena larga y aleatoria. El runner escucha solo en `127.0.0.1`.

## Datos de los usuarios

- Cada usuario ve y modifica solo sus proyectos: políticas RLS de Supabase en `proyectos` y `archivos_proyecto`.
- Toda la aplicación exige sesión (`proxy.js`), salvo el acceso (`/login`, `/registro`) y la documentación (`/docs`).

## Código generado por la IA

- El código que genera I-CASE Tool se ejecuta **solo dentro de contenedores Docker**, con límites de CPU y memoria, sin acceso a los archivos ni a las claves de I-CASE Tool.
- La prueba en contenedores comprueba que el código funciona, **no que sea seguro**. Revisa los permisos, los triggers y las funciones antes de aprobar.
- La guía de cada pieza (`plantillas/<pieza>/README.md`) incluye las reglas de seguridad que la IA debe seguir, y la validación del paso las comprueba.

## Versiones con soporte

Solo la rama `main` recibe correcciones de seguridad.
