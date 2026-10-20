---
title: Errores comunes
sidebar_position: 9
---

# Errores comunes y cómo resolverlos

| Mensaje o síntoma | Causa | Qué hacer |
|---|---|---|
| *"Ningún modelo de Gemini ni de Groq pudo responder"* | Los servicios gratuitos de IA están saturados o sin cuota | Esperar unos minutos y reintentar, o elegir otro modelo en **Modelo gratuito** |
| *"gemini-3.8-flash no pudo responder: Google está saturado (503)"* | Elegiste un modelo concreto y está saturado | Elegir otro modelo o volver a **Automático** |
| *"…sin cuota hasta las 18:40"* en el selector | Se agotó la cuota gratuita del día de ese modelo | Usar otro modelo hasta esa hora |
| *"Request too large"* con un modelo de Groq | El paso es grande para el plan gratuito de Groq | Usar Gemini para los pasos de Diseño e Implementación |
| *"Claude no pudo responder"* | Claude activado, sin saldo o sin clave configurada | Apagar **Usar Claude** o revisar la clave |
| Un paso aparece **Desactualizado** | Cambiaste un paso anterior | **Actualizar** o **Conservar como está** (ver [Flujo de trabajo](./flujo-de-trabajo)) |
| *"Disponible al aprobar el paso anterior"* | El paso depende de uno sin aprobar | Aprobar el paso anterior |
| La generación del prototipo o de la base se cortó | Falló la IA a mitad de camino | Lo generado se conserva: **Agregar faltantes** (prototipo) o **Continuar base de datos** |
| *"La base no se probó: Docker Desktop no está encendido"* | La prueba de la base necesita Docker | Encender Docker Desktop y pulsar **Probar de nuevo** |
| *"El runner no está encendido"* o *"Falta RUNNER_TOKEN"* | La ejecución en contenedores solo funciona en local | Ejecutar I-CASE Tool en local con `npm run all` |
| *"Falló al aplicar …sql"* en la base | Un archivo SQL tiene un error | La herramienta lo corrige sola; si persiste, corregirlo con **Editar** en el explorador o con **Ampliar con IA** |
| *"Con datos de prueba 11/22"* | Hay tablas sin datos de prueba | La corrección automática las completa; revisar el desplegable **Tablas** |
| *"No se pudo dibujar…: Kroki no respondió"* | El servicio que dibuja los diagramas PlantUML no respondió | Recargar la página en un momento: el código está guardado |
| Página en blanco o *"Failed to load chunk"* tras actualizar | La página quedó abierta mientras el servidor se reiniciaba | Recargar con **Ctrl + Shift + R** |
