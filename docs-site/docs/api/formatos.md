---
title: Formatos de los artefactos
sidebar_position: 5
---

# Formatos de los artefactos

| Artefacto | Formato | Dónde se guarda (`proyectos`) |
|---|---|---|
| Contexto y entrevista | JSON | `contexto` |
| Análisis (actores y requerimientos) | JSON | `analisis` |
| Casos de uso, clases, entidad-relación, árbol, arquitectura | Mermaid | `diagrama_casos_uso`, `diagrama_clases`, `diagrama_er`, `arbol_navegacion`, `diagrama_arquitectura` |
| Diagrama de sistemas | PlantUML (`@startwbs`) | `diagrama_sistema` |
| Prototipo | Lista de pantallas con su HTML | `mockups` |
| Aprobaciones y modelo de cada paso | JSON | `fases_aprobadas` |
| Stack técnico | JSON | `stack_implementacion` |
| Estructura de carpetas | JSON | `estructura_implementacion` |
| Base de datos | Ficha JSON; el SQL va en `archivos_proyecto` | `bd_implementacion` |
| Contrato de API | JSON (operaciones, acciones, cobertura, prueba de permisos) | `contrato_implementacion` |
| Backend | Ficha JSON; el código va en `archivos_proyecto` | `backend_implementacion` |
| Frontend | Ficha JSON por plataforma (`web`, `movil`); el código va en `archivos_proyecto` | `frontend_implementacion` |
| Documentación | Ficha JSON; las páginas Markdown van en `archivos_proyecto` | `documentacion_implementacion` |
| Plan de pruebas | JSON (casos, resultados y hallazgos) | `pruebas_plan` |
| Informe cerrado | JSON `{ fecha, html }` con la copia fija del informe | `informe_cerrado` |

## Análisis

```json
{
  "actores": [{ "nombre": "Bombero", "descripcion": "…" }],
  "requerimientos_funcionales": [{
    "codigo": "RF02", "nombre": "…", "descripcion": "El sistema debe…",
    "actores": ["Bombero"], "prioridad": "alta", "dependencias": ["RF01"],
    "precondiciones": "…", "postcondiciones": "…", "metodo_verificacion": "Prueba"
  }],
  "requerimientos_no_funcionales": [{
    "codigo": "RNF04", "categoria": "Seguridad", "subcategoria": "No repudio",
    "nombre": "…", "descripcion": "…", "prioridad": "alta"
  }]
}
```

## Diagramas

El código de cada diagrama empieza con su **explicación** como comentarios (`%% Explicación:` en Mermaid, `' Explicación:` en PlantUML), que la interfaz muestra en "Ver explicación":

```text
%% Explicación:
%% El modelo gira en torno a la entidad PARTE, que guarda los campos comunes…
erDiagram
    PARTE ||--|| PARTE_CRONOLOGIA : tiene
```

El motor se reconoce por el contenido: el código que empieza con `@start…` es PlantUML y se dibuja con Kroki; el resto es Mermaid y lo dibuja el navegador.

## Prototipo

```json
[{ "nombre": "Mis Partes Móvil", "plataforma": "Móvil", "rfs": ["RF04", "RF20"], "html": "<!doctype html>…", "modelo": "gemini-3.8-flash" }]
```

## Implementación

- **Stack:** piezas del catálogo (`plantillas/`), servicios opcionales, alta disponibilidad, contenedores, librerías y servicios externos, más la resolución de cada elemento del diseño.
- **Estructura:** lista de archivos con `ruta`, `tipo`, `proposito`, `requerimientos`, `pantallas`, `tablas` y `modulo`, más la cobertura.
- **Base de datos:** SQL de PostgreSQL. La ficha guarda los archivos, la última prueba (tablas con RLS, políticas, filas y acceso desde la API) y lo que hay que revisar.
- **Contrato:** una operación por cada acción del prototipo, con su recurso, roles, requerimientos, esquemas de entrada y salida y datos de prueba; la prueba de permisos guarda un resultado por operación y rol (`correcta`, `fallida`, `inconclusa` o `pendiente`). Con Express incluye un `openapi.yaml`.
- **Backend y frontend:** cada archivo con su ruta, líneas y avisos. El frontend guarda además la última compilación de cada plataforma.
- **Documentación:** el sitio Docusaurus del proyecto en `docs/`, con páginas de manual, desarrolladores y API.

## Pruebas

```json
{
  "casos": [{
    "id": "CP-01", "titulo": "Inicio de sesión con credenciales válidas", "rfs": ["RF01"],
    "actor": "Estudiante", "tipo": "funcional", "precondiciones": "Cuenta activa",
    "pasos": ["Abrir la pantalla de acceso", "Escribir correo y contraseña", "Pulsar Ingresar"],
    "esperado": "Se muestran solo las funciones del Estudiante",
    "resultado": "pendiente", "observacion": ""
  }],
  "hallazgos": [{ "id": "H-01", "caso": "CP-01", "titulo": "…", "gravedad": "alta", "estado": "abierto", "descripcion": "…" }],
  "modelo": "gemini-3.8-flash"
}
```

`tipo` es `funcional`, `validacion` o `permisos`; `resultado`, `pendiente`, `aprobado` o `fallido`; `gravedad`, `alta`, `media` o `baja`; `estado`, `abierto` o `corregido`.
