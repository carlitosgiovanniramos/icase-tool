---
title: "Caso de estudio: Cuerpo de Bomberos"
sidebar_position: 8
---

# Caso de estudio: Cuerpo de Bomberos de Baños de Agua Santa

Este proyecto real se usó para construir y probar I-CASE Tool. Muestra el recorrido completo y los números que se obtuvieron.

## La entrada

**Descripción** (resumen): una aplicación web y móvil para el Cuerpo de Bomberos. La parte **web** controla y monitorea: emergencias y sus *partes* de cinco tipos (prehospitalaria, contra incendios, rescates, operativos programados y trabajos varios), bitácoras de guardia, personal, vehículos y usuarios. La parte **móvil** la usan los bomberos en campo, incluso sin conexión.

**Contexto completado:** problema actual (partes en papel), usuarios (Bombero, Jefe de guardia, Administrador), plataformas Web y Móvil, tecnologías ya decididas (Next.js, Flutter y Supabase) y atributos de calidad (seguridad, disponibilidad, uso sin conexión).

**Entrevista:** la IA hizo 6 preguntas. Por ejemplo, si la firma electrónica debía ser certificada o trazada en pantalla.

## Fase 01: Análisis

| Artefacto | Resultado |
|---|---|
| Actores | 3: Bombero, Jefe de guardia, Administrador |
| Requerimientos funcionales | 29 (se descartó uno, el tablero de métricas, durante la revisión) |
| Requerimientos no funcionales | 7, clasificados por ISO/IEC 25010 |
| Casos de uso | 30, en 7 módulos |

Un requerimiento tal como lo genera la herramienta:

```json
{
  "codigo": "RF02",
  "nombre": "Autenticación de usuarios por roles",
  "actores": ["Bombero", "Jefe de guardia", "Administrador"],
  "prioridad": "alta",
  "descripcion": "El sistema debe validar las credenciales de acceso de los actores restringiendo las funciones y vistas operativas según el rol asignado.",
  "dependencias": ["RF01"],
  "precondiciones": "El usuario debe existir en el sistema y encontrarse en estado activo.",
  "postcondiciones": "El sistema otorga acceso al entorno web o móvil con los privilegios correspondientes.",
  "metodo_verificacion": "Prueba"
}
```

## Fase 02: Diseño

| Artefacto | Resultado |
|---|---|
| Diagrama de clases y entidad-relación | 22 entidades |
| Prototipo | 36 pantallas: 23 web y 13 móviles |
| Árbol de navegación | Vista web y vista móvil |
| Arquitectura | Panel web (Next.js) con alta disponibilidad, app móvil (Flutter), Supabase, Google Maps y Firebase Cloud Messaging |
| Diagrama de sistemas | 17 componentes, cada uno con los requerimientos que cumple |

Fragmento real del diagrama entidad-relación:

```mermaid
erDiagram
    PERSONAL ||--o| USUARIO : vinculado_a
    USUARIO ||--o{ PARTE : crea
    PARTE ||--|| PARTE_CRONOLOGIA : tiene
    PARTE ||--o{ PARTE_PERSONAL : asigna
    PERSONAL ||--o{ PARTE_PERSONAL : participa
    PARTE ||--o{ PARTE_VEHICULO : asigna
    VEHICULO ||--o{ PARTE_VEHICULO : es_asignado
    FIRMA ||--o| PARTE : firma_bombero
    FIRMA ||--o| PARTE : firma_jefe
```

Durante la revisión se corrigieron, con **Ampliar con IA** y edición del código, la alta disponibilidad de la arquitectura y la asignación de requerimientos en el diagrama de sistemas.

## Fase 03: Implementación

| Paso | Resultado |
|---|---|
| Stack técnico | Next.js + Flutter + Supabase (Auth, Realtime, Storage, Edge Functions) + alta disponibilidad: **12 contenedores** |
| Estructura de carpetas | **76 archivos** con cobertura completa: 36/36 pantallas, 22/22 tablas, 14/14 módulos, 29/29 RF |
| Base de datos | 7 archivos SQL (6 migraciones y datos de prueba). Prueba en contenedores: **22/22 tablas** con permisos (RLS), políticas y datos de prueba, y 3 usuarios de prueba |
| Contrato de API | **48 operaciones**; cobertura de **728 de 728** controles del prototipo y **29/29** RF. Prueba de permisos por actor: **119 correctas, 0 fallidas**; las demás quedan sin verificar por falta de datos de prueba o porque requieren una función del backend |
| Backend | Dos Edge Functions: crear usuarios y notificar por push. Prueba con las funciones encendidas: la creación de usuarios pasó 3 de 3 |
| Frontend | **Web de 50 archivos** (Next.js) y **app móvil de 58 archivos** (Flutter), con el diseño y las 13 pantallas móviles del prototipo y modo sin conexión. Las dos compilan en Docker sin errores |
| Documentación | Sitio Docusaurus con el manual por rol, la guía de desarrolladores y una página por operación de la API; las páginas de lectura las redactó la IA y corre en su propio contenedor |

En este proyecto el contrato, la web y la app se escribieron a mano y se cargaron con **Pegar contrato** y el explorador de archivos. Pasaron por las mismas validaciones y pruebas que el código generado: cobertura del contrato, prueba de permisos y compilación en Docker.

La revisión de la base mostró por qué hay que leer lo que genera la IA, aunque la prueba pase. Se encontraron y corrigieron:

- un error de sintaxis;
- dos fallas de seguridad: un rol que el propio usuario podía cambiar y una función de firma que no verificaba quién firmaba;
- datos de prueba incompletos.

Esos hallazgos se convirtieron en reglas y validaciones de la herramienta para cualquier proyecto.

### Ejecución en un servidor

El proyecto se levantó con el botón **Levantar** en una máquina virtual de Azure, donde corre el runner de Docker. Cada acceso queda publicado por HTTPS, en el puerto del servicio más 10000:

| Acceso | Puerto público |
|---|---|
| Web | 13000 |
| Móvil (vista web de la app) | 18090 |
| API de Supabase | 18000 |
| Documentación | 13200 |

Del mismo código de la app móvil se compiló un **APK de Android** apuntando a la API pública. Quien usa el sistema solo ve estas direcciones; los contenedores, los archivos y los logs quedan dentro del servidor.

:::info Capturas pendientes
`capturas/11-bomberos-stack.png` (ficha del stack) y `capturas/12-bomberos-base.png` (ficha de la base con la prueba 22/22).
:::
