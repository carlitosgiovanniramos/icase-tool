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
| `GROQ_API_KEY` | Groq (opcional) | No |
| `ANTHROPIC_API_KEY` | Claude (opcional, de pago) | No |
| `KROKI_URL` | Servicio que dibuja PlantUML | No |
| `RUNNER_URL`, `RUNNER_TOKEN` | Runner local de Docker | No |

- **En local:** en `.env.local`, que `.gitignore` excluye (patrón `.env*`). Nunca se sube al repositorio.
- **En Vercel:** en *Settings → Environment Variables* del proyecto.
- Solo las variables `NEXT_PUBLIC_*` llegan al navegador. Las claves de IA se usan únicamente en las rutas de API, del lado del servidor.

## Buenas prácticas

- No guardar claves viejas comentadas en `.env.local`: si una clave dejó de usarse, se **revoca** en el panel del proveedor.
- Si una clave se expone (en un commit, una captura o un mensaje), se revoca de inmediato y se genera otra.
- `RUNNER_TOKEN` es una cadena larga y aleatoria. El runner la compara en tiempo constante y rechaza cualquier petición sin ella.
- El runner escucha solo en `127.0.0.1`: no es accesible desde la red.

## Datos de los usuarios

- Cada usuario ve y modifica **solo sus proyectos**: las políticas RLS de Supabase lo exigen en cada tabla (`rls_proyectos.sql`, `archivos_proyecto.sql`).
- Las rutas de generación no guardan nada: devuelven el artefacto y lo guarda el navegador con la sesión del usuario.
- El código generado por la IA se ejecuta **solo dentro de contenedores**, con límites de CPU y memoria, sin acceso a los archivos ni a las claves de I-CASE Tool.

## Costo

Claude es el único servicio de pago. Solo se usa con el interruptor **Usar Claude** activado. Antes de generar un lote (el prototipo o la base de datos), la interfaz avisa el **costo estimado**.
