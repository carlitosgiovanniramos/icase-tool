---
title: Cómo escribir buenas entradas
sidebar_position: 8
---

# Cómo escribir buenas entradas para la IA

La calidad de lo que genera I-CASE Tool depende de lo que se le da. Estas recomendaciones vienen de usarla en proyectos reales.

## La descripción del proyecto

| Haz | Evita |
|---|---|
| Decir **quién** usa el sistema y **qué hace cada uno** | "Un sistema para una empresa" |
| Enumerar los módulos o procesos principales | Describir solo la pantalla de inicio |
| Mencionar plataformas (web, móvil) y si debe funcionar sin conexión | Dejar que la IA lo suponga |
| Escribir reglas concretas: *"un parte firmado no se puede editar"* | Reglas vagas: *"debe ser seguro"* |

**Débil:** *"App para bomberos."*

**Buena:** *"Aplicación web y móvil para un cuerpo de bomberos. En la web el administrador gestiona personal, vehículos y usuarios, y consulta los partes de emergencia. En la app el bombero abre y completa el parte en campo, aun sin conexión, y lo firma en pantalla. Cada parte tiene un código único y, una vez firmado, no se puede modificar."*

## El contexto del análisis

- **Fuera de alcance** es tan útil como el alcance: evita que la IA invente módulos (facturación, chat, reportes...).
- **Reglas de negocio**: una por línea. Cada una produce requerimientos.
- **Tecnologías ya decididas**: si las hay, escríbelas. Toda la cadena (requerimientos, modelo de datos, arquitectura, implementación) las respeta.
- Responde la **entrevista**: cada respuesta elimina una suposición.

## Indicaciones de cada paso

**Agregar indicaciones** sirve para pedir una forma concreta de organizar el resultado, sin repetir lo que ya está en el diseño:

- *"Agrupa los casos de uso por módulo del sistema."*
- *"En los datos de prueba usa nombres y direcciones de la ciudad del cliente."*

## Ampliar con IA

Pide **un cambio concreto** por vez y nombra lo que hay que tocar:

| Bien | Mal |
|---|---|
| *"Agrega la entidad PROVEEDOR relacionada con INSUMO (1 a muchos)."* | *"Mejora el diagrama."* |
| *"Mueve Reportes dentro de la sección Administración."* | *"Cambia la navegación."* |
| *"Agrega un filtro por fecha sobre la tabla y un botón Exportar."* | *"Hazlo más completo."* |

## Revisar siempre lo generado

La IA se equivoca, sobre todo en detalles de seguridad y en lo que no está en la descripción. Antes de aprobar:

- Lee "Revisar antes de aprobar" cuando aparezca.
- Comprueba que no haya funciones que nadie pidió (ej. un tablero de métricas que ningún requerimiento menciona).
- En código: quién puede hacer qué. La prueba en contenedores confirma que el código funciona, no que sea seguro.
