---
title: "Fase 04: Pruebas"
sidebar_position: 6
---

# Fase 04: Pruebas

La fase de Pruebas comprueba que el sistema levantado cumple lo definido en el análisis. Se habilita al aprobar la fase de [Implementación](./implementacion). Tiene un paso, el **Plan de pruebas**.

## Cómo se trabaja

1. **Generar casos de prueba.** La IA redacta, con los requerimientos y los actores aprobados, de uno a tres casos por requerimiento funcional: el flujo normal y, cuando corresponde, un caso de **validación** (datos inválidos o incompletos) y uno de **permisos** (un actor que no debe poder hacerlo). Cada caso trae su actor, las precondiciones, los pasos y el resultado esperado. La IA parte de los **requerimientos** (con sus precondiciones y postcondiciones), los **actores**, las **reglas de negocio** y las **pantallas reales del prototipo** con sus botones, para que los pasos usen los nombres verdaderos y no inventados. Aun así es un borrador: al ejecutar cada caso, corrige lo que no coincida con tu sistema.
2. **Ejecutar.** Abre el sistema levantado (panel de **Ejecución**) y haz cada caso a mano. Luego, en la lista, abre el caso y márcalo como **Aprobó** o **Falló**; puedes agregar una observación.
3. **Registrar hallazgos.** Un caso fallido se registra con **Registrar hallazgo**: qué falló, el caso asociado, la gravedad (alta, media o baja) y una descripción. Cuando se corrige, se marca **Corregido**.
4. **Aprobar el plan** y luego **Aprobar fase de Pruebas**.

Todos los casos nacen **Sin ejecutar**. No es un error: significa que todavía no los has corrido.

## La ficha del plan

Arriba, las cifras: casos, cuántos aprobaron, fallaron o siguen sin ejecutar, requerimientos cubiertos y hallazgos abiertos. Debajo:

- **Trazabilidad con los requerimientos:** una tabla que dice, para cada requerimiento funcional, qué casos lo prueban y cómo van.
- **Casos de prueba:** la lista con su resultado.
- **Hallazgos:** los problemas encontrados, con su gravedad y su estado.

## Qué impide aprobar

| Situación | Efecto |
|---|---|
| Un requerimiento funcional sin ningún caso | Impide aprobar |
| Hallazgos de gravedad **alta** sin corregir | Impiden aprobar |
| Casos fallidos o sin ejecutar, o hallazgos abiertos de gravedad media o baja | Se piden reconocer antes de aprobar y quedan escritos en el informe |

Los casos que falten por cubrir se completan a mano o con **Regenerar**.

## Regenerar y cambios

- **Regenerar** pide confirmación. Los casos que se repiten (mismo título) **conservan su resultado, su observación y sus hallazgos**, aunque cambie su número.
- Si cambias algo de la Implementación o del Análisis, el plan queda **Desactualizado** como cualquier otro paso (ver [Flujo de trabajo](./flujo-de-trabajo)).
- Aprobado el plan, queda bloqueado. Para anotar más resultados pulsa **Editar**, y el plan pierde la aprobación hasta que lo apruebes de nuevo.

## Aprobar la fase

Con el plan aprobado aparece **Aprobar fase de Pruebas**. Al aprobarla, el [informe](./informe-y-exportacion) agrega el capítulo **Fase de pruebas** (resumen, trazabilidad, casos y hallazgos) y se habilita **Cerrar proyecto**.

:::info Instalación
Ejecuta una vez `supabase/pruebas_implementacion.sql` en el SQL Editor del Supabase de I-CASE Tool. Agrega las columnas del plan de pruebas y del informe cerrado.
:::
