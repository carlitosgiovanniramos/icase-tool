---
title: Informe y exportación
sidebar_position: 7
---

# Informe y exportación

## Informe del proyecto (PDF)

Con las fases de Análisis y Diseño aprobadas, la vista **Informe** arma un documento con todo el proyecto. El informe **no se aprueba**: es la suma de las fases ya aprobadas, y cada fase se agrega cuando se aprueba.

1. Datos del proyecto y descripción.
2. Contexto del análisis.
3. Actores y requerimientos funcionales y no funcionales.
4. Diagrama de casos de uso.
5. Fase de diseño: clases, entidad-relación, prototipo de pantallas, árbol de navegación, arquitectura y sistemas, cada uno con su explicación.
6. **Fase de implementación** (al aprobarla): la metodología (cómo trabaja la herramienta paso a paso y cómo se verificó cada uno) y un apartado por paso: stack técnico, estructura de carpetas, base de datos, contrato de API, backend, frontend, documentación y ejecución, con las direcciones del sistema si está levantado.
7. **Fase de pruebas** (al aprobarla): resumen, trazabilidad con los requerimientos, casos de prueba con su resultado y hallazgos.

Pulsa **Exportar PDF** y, en el diálogo de impresión del navegador, elige **Guardar como PDF**. El nombre del archivo lo propone la herramienta.

![Vista previa del informe de análisis y diseño de bomberos, con portada, contenido y botón Exportar PDF.](/img/capturas/10-informe.png)

## Cerrar proyecto

Con la fase de Pruebas aprobada aparece **Cerrar proyecto**. Guarda una **copia fija** del informe, tal como se ve, para entregarla sin que cambie: el informe muestra "Versión cerrada el…" y esa copia es la que se exporta a PDF.

- Con el proyecto cerrado, el **Informe** queda marcado con el visto verde en el indicador de fases, igual que las demás fases.
- **Reabrir** descarta la copia y el informe vuelve a armarse con lo aprobado.
- Si después cambias cualquier paso, la copia se descarta sola, porque ya no corresponde a lo aprobado.

## Otras formas de exportar

| Qué | Cómo |
|---|---|
| Un diagrama como imagen | **Descargar SVG** sobre el diagrama |
| El código de un diagrama | Pestaña **Código**, copiar el texto (Mermaid o PlantUML) |
| Una pantalla del prototipo | Pestaña **Código** de la pantalla: su HTML, con vista previa en vivo (se copia o se edita) |
| El código generado en Implementación | Explorador de archivos, cada archivo |
