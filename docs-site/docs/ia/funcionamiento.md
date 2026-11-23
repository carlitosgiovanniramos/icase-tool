---
title: Componente de IA
sidebar_position: 1
---

# Componente de IA

## Principio: la IA propone, el código valida

Cada paso combina IA con **validación determinista**:

1. Un **prompt** con estructura fija le pide a la IA el artefacto y le da solo el contexto que necesita: los artefactos aprobados de los pasos anteriores.
2. El **código revisa** la respuesta contra el diseño. Ejemplos: que cada requerimiento tenga su caso de uso, que cada entidad tenga clave primaria, que cada pantalla del prototipo tenga su página, que cada tabla del ER exista en la base.
3. Si hay problemas, la IA recibe la lista y hace **un reintento**.
4. Lo que quede sin resolver se muestra en **"Revisar antes de aprobar"**. La persona decide.

Así la calidad no depende solo del modelo: las reglas importantes las comprueba el código.

## Modelos y versiones

| Modelo | Proveedor | Versión | Cuándo responde | Costo |
|---|---|---|---|---|
| Gemini 3.8 Flash | Google | `gemini-3.8-flash` | Primero en modo automático | Gratuito |
| Gemini 3.7 / 3.6 / 3.5 Flash, 3 Flash Preview | Google | `gemini-3.7-flash`… | Si el anterior falla o está sin cuota | Gratuito |
| Kimi y Mistral Large 4 | NVIDIA | ids configurables (`KIMI_MODELOS`, `MISTRAL_MODELOS`) | Después de Gemini y antes de Groq, si tienen clave; o si el usuario lo elige | Gratuito |
| GPT-OSS 120B / 20B, Qwen 3.8 27B | Groq | `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b` | Último respaldo; o si el usuario lo elige | Gratuito |
| Claude Haiku 5.5 | Anthropic | `claude-haiku-5-5` | Solo con **Usar Claude** activado | De pago: $0,10 y $0,50 por millón de tokens de entrada y salida |
| Claude Sonnet 5 / 5.5 | Anthropic | `claude-sonnet-5`, `claude-sonnet-5-5` | Solo con **Usar Claude** activado | De pago: $2 y $10 |
| Claude Opus 5.5 | Anthropic | `claude-opus-5-5` | Solo con **Usar Claude** activado | De pago: $4 y $20 |

Los Gemini Pro no se usan: el plan gratuito no tiene cuota para ellos.

## Selección del modelo

```mermaid
flowchart TD
    I["Interruptor 'Usar Claude'"] -->|activado| C["Responde solo el Claude elegido"]
    I -->|apagado| S{"Selector 'Modelo gratuito'"}
    S -->|"Automático"| A["Gemini 3.8 → 3.7 → … → Kimi / Mistral → Groq"]
    S -->|"un modelo"| M["Responde solo ese modelo"]
```

- **Automático:** prueba los modelos en orden. Si uno no empieza a responder en 45 s, falla o está sin cuota, pasa al siguiente. Los que se quedaron sin cuota quedan en pausa el tiempo que indica el proveedor. Kimi y Mistral son lentos por naturaleza, así que tardar en fallar no los deja en pausa.
- **Modelo elegido:** responde solo ese, con más tiempo para empezar. Si falla, el error dice por qué. Conviene usar un solo modelo para todos los archivos de un mismo paso, como la base de datos, para mantener las convenciones.
- **Claude:** con el interruptor activado, la barra lateral muestra **Modelo de Claude** (Haiku 5.5, Sonnet 5, Sonnet 5.5 u Opus 5.5). Responde solo Claude, sin caer en silencio a otro modelo. Se avisa el costo estimado, escalado al precio del modelo elegido, antes de generar los pasos grandes, y la barra lateral lleva la cuenta de lo gastado.

## Generación por partes

Los pasos grandes no se piden de una vez: así no se corta la respuesta y no se pierde lo ya pagado.

- **Prototipo:** una petición por pantalla. Cada una se guarda apenas llega.
- **Estructura de carpetas:** una generación por pieza del stack (web, móvil, base), en paralelo.
- **Base de datos:** un archivo SQL por petición, en orden. Cada uno recibe el código de los anteriores.
- **Backend:** un archivo por petición (una Edge Function por operación).
- **Frontend:** un archivo por petición, por capas y varios a la vez, por plataforma. Si la compilación falla, se pide solo el archivo que falló, con el error.
- **Documentación:** una página por petición, solo con los datos de su tema.
- **Contrato de API:** los controles iguales de una pantalla se asignan una sola vez, para que quepa en una respuesta.
- **Plan de pruebas:** lotes de 8 requerimientos funcionales por petición, y un reintento solo con los que quedaron sin caso.

En todos, lo que ya salió bien se guarda y **Continuar** retoma solo lo que falta.

## Qué modelo generó cada artefacto

Cada paso guarda el modelo que lo generó (`fases_aprobadas.modelos`) y lo muestra junto a su título.
