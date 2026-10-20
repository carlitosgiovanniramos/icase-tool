---
title: Plantilla de prompt
sidebar_position: 2
---

# Plantilla de prompt

Todos los prompts de I-CASE Tool siguen la misma estructura de cuatro bloques. Así la IA sabe siempre qué tiene, qué se espera, qué evitar y en qué forma responder.

```text
Eres <rol experto>. Vas a <tarea> del sistema "<nombre>", cuyo <lo anterior> ya está aprobado.

CONTEXTO
<artefactos aprobados de los pasos anteriores, solo los que este paso necesita:
 actores, requerimientos (con actores, dependencias y prioridad), diagramas, catálogo…>

QUÉ DEBE MOSTRAR
- <lo que el resultado debe contener, verificable>
- …
<Indicaciones del usuario para este paso, si las hay: tienen prioridad sobre las reglas de
organización, pero no sobre los requerimientos>

QUÉ NO QUIERO
- <errores típicos que se quieren evitar: inventar actores, funciones que nadie pidió…>

FORMATO
TAREA: <generar | modificar según la instrucción | corregir este error>
Responde solo con <JSON con esta forma | código Mermaid | PlantUML | HTML | SQL>.
```

## Variantes de la tarea

| Variante | Cuándo | Qué agrega al prompt |
|---|---|---|
| Generar | Botón **Generar** o **Regenerar** | `TAREA: escribe el artefacto completo` |
| Modificar | **Ampliar con IA** | El resultado actual y la instrucción del usuario: *"Conserva lo que la instrucción no cambia"* |
| Corregir | Tras la validación o la prueba | La lista de problemas, o el error de PostgreSQL, y el resultado anterior: *"Corrígela y responde de nuevo con el resultado completo"* |
| Completar | Base de datos con tablas vacías | La lista de tablas sin datos de prueba |

## Ejemplo real: un archivo de la base de datos

Fragmento del prompt de `lib/bd.js` para una migración:

```text
Eres un ingeniero de bases de datos. Vas a escribir el archivo
supabase/migrations/0004_partes_emergencia.sql de la base de datos (Supabase) de un sistema
cuyo diseño, stack técnico y estructura de carpetas ya están aprobados.

CONTEXTO
Sistema: Cuerpo de Bomberos Baños de Agua Santa
Stack aprobado: supabase (auth, realtime, storage, functions), nextjs, flutter
Guía de la pieza (reglas que el código debe cumplir): …
Archivos de la base de datos, en el orden en que se aplican: …
Diagrama entidad-relación aprobado: …
Archivos anteriores, ya aplicados (usa sus tablas, columnas, tipos y funciones; no los repitas): …

QUÉ DEBE MOSTRAR
- Una tabla por cada entidad de "tablas" de este archivo, con el nombre de la entidad en minúsculas…
- La integridad la garantiza la base, no el cliente: códigos secuenciales, bloqueo de lo que ya
  se cerró o firmó y las reglas de los RF que impiden una operación…
- RNF04 pide un resumen criptográfico: lo calcula la base con digest de pgcrypto…
- RLS activado en cada tabla y políticas por actor (Bombero, Jefe de guardia, Administrador)…

QUÉ NO QUIERO
- Tablas que no son entidades del ER, ni las que crean otros archivos.
- Columnas de contraseña ni cifrado de columnas: el cifrado en reposo se resuelve en el disco.
- drop o truncate de tablas…

FORMATO
TAREA: escribe el archivo completo.
Responde solo con el SQL del archivo, sin explicaciones ni bloques de markdown.
```

## Reglas que se aprendieron usándola

- **Dar lo aprobado, no todo:** cada paso recibe solo los artefactos que necesita (ej. el prototipo envía el nombre, la plataforma y los RF de cada pantalla, no su HTML).
- **Nombrar lo prohibido:** decir *"funciones que ningún requerimiento pide (tableros, métricas, chat…)"* evita que la IA las agregue.
- **Guías por tecnología:** las reglas propias de una tecnología, como Supabase o Next.js 16, viven en la guía de su pieza (`plantillas/<pieza>/README.md`) y entran al prompt de esa pieza.
- **Lo crítico, en código:** si una regla importa, la verifica el código, no solo el prompt. Ej.: el rol de un usuario no puede salir de un dato que él mismo puede cambiar.
