---
title: Claves y seguridad
sidebar_position: 4
---

# Claves de API y seguridad

## Dónde viven las claves

| Variable | Uso | ¿Llega al navegador? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Conexión a Supabase. Clave publicable: los permisos los aplica RLS | Sí, es pública por diseño |
| `GEMINI_API_KEY` | Google Gemini | No |
| `GEMINI_API_KEYS` | Varias claves de Gemini separadas por coma. Se usa la primera y se pasa a la siguiente solo si se acaba la cuota de la anterior | No |
| `GROQ_API_KEY` | Groq (opcional) | No |
| `KIMI_API_KEY`, `MISTRAL_API_KEY` | Kimi y Mistral Large 4, por NVIDIA (opcionales, gratuitos) | No |
| `GEMINI_MODELOS` | Modelos de Gemini en orden de preferencia, separados por coma | No |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODELO` | Claude (opcional, de pago) y el modelo que se usa si no se elige otro en la barra lateral | No |
| `KROKI_URL` | Servicio que dibuja PlantUML | No |
| `RUNNER_URL`, `RUNNER_TOKEN` | Runner de Docker (en la PC o en un servidor) | No |
| `DIRECCION_PUBLICA`, `CADDY_PROYECTOS`, `CADDY_CONFIG` | Solo en el runner del servidor: nombre DNS y rutas de Caddy para publicar cada proyecto por HTTPS | No (son del runner) |

- **En local:** en `.env.local`, que `.gitignore` excluye (patrón `.env*`). Nunca se sube al repositorio.
- **En Vercel:** en *Settings → Environment Variables* del proyecto. Para ejecutar proyectos desde la versión publicada, incluye `RUNNER_URL` y `RUNNER_TOKEN` apuntando al runner del servidor.
- Solo las variables `NEXT_PUBLIC_*` llegan al navegador. Las claves de IA se usan únicamente en las rutas de API, del lado del servidor.

## Varias claves de Gemini

Con `GEMINI_API_KEYS="clave1,clave2,clave3"` (y/o `GEMINI_API_KEY`) la herramienta usa la primera clave y pasa a la siguiente **solo si Google responde que se acabó su cuota** (o que la clave no sirve), dentro de la misma petición y sin que se vea un error. Una clave agotada se salta hasta que se renueva su cuota; si se agotan todas, se pasa a los demás modelos (Kimi, Mistral y Groq).

- La cuota gratuita de Gemini es **por proyecto de Google** y por modelo: las claves deben ser de **proyectos distintos**, o comparten la misma cuota y no suman.
- Las claves no se escriben en el log: solo aparece su posición ("clave 2 de 3").
- En Vercel la memoria de qué clave está agotada vale solo mientras viva la instancia; otra instancia lo descubre con una llamada que falla y sigue con la siguiente clave.
- Los términos de Google piden no crear proyectos solo para esquivar los límites del plan gratuito.

## Buenas prácticas

- No guardar claves viejas comentadas en `.env.local`: si una clave dejó de usarse, se **revoca** en el panel del proveedor.
- Si una clave se expone (en un commit, una captura o un mensaje), se revoca de inmediato y se genera otra.
- `RUNNER_TOKEN` es una cadena larga y aleatoria. El runner la compara en tiempo constante y rechaza cualquier petición sin ella.
- El runner escucha solo en `127.0.0.1`. Para que la web publicada lo alcance, `RUNNER_URL` debe apuntar a una dirección que lo exponga con el mismo token (por ejemplo detrás de un proxy HTTPS); sin ese token, ninguna petición se acepta.

## Datos de los usuarios

- Cada usuario ve y modifica **solo sus proyectos**: las políticas RLS de Supabase lo exigen en cada tabla (`rls_proyectos.sql`, `archivos_proyecto.sql`).
- Las rutas de generación no guardan nada: devuelven el artefacto y lo guarda el navegador con la sesión del usuario.
- El código generado por la IA se ejecuta **solo dentro de contenedores**, con límites de CPU y memoria, sin acceso a los archivos ni a las claves de I-CASE Tool.

## Costo

Claude es el único servicio de pago. Solo se usa con el interruptor **Usar Claude** activado. Antes de generar un lote (el prototipo o la base de datos), la interfaz avisa el **costo estimado**.
