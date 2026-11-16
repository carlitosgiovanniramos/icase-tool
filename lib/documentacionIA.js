// Redacción con IA de las páginas de lectura de la documentación del proyecto (paso "Documentación"):
// inicio, primeros pasos, guía de cada rol, preguntas frecuentes, arquitectura y guía de la API. Cada
// página recibe solo los datos aprobados de su tema (los arma lib/documentacion.js en el navegador) y
// la IA solo los redacta: no agrega funciones, pantallas ni botones. Solo se usa en el servidor.

import { generarContenido } from "./gemini.js";

const TIPOS = {
  inicio: {
    que: `Una presentación clara del sistema para cualquier lector:
- Qué es el sistema y para quién es (2 párrafos breves).
- "## Qué problema resuelve": el problema actual y cómo lo resuelve el sistema.
- "## Qué se puede hacer": las funciones agrupadas en 4 a 7 módulos, cada módulo con una línea que lo explique.
- "## Quién lo usa": una tabla Rol | Qué hace.
- "## Dónde se usa": las plataformas.`,
  },
  primeros_pasos: {
    que: `Una guía para empezar a usar el sistema:
- Un párrafo de bienvenida.
- "## Cómo ingresar": pasos numerados con las pantallas y botones de acceso de los datos (en negrita).
- "## Qué ve cada rol": por rol, en qué plataforma trabaja y qué encuentra al entrar (una o dos líneas).
- "## Recomendaciones": consejos prácticos sacados de las reglas de negocio y de los atributos de calidad (por ejemplo, trabajo sin conexión o firmas), con un aviso :::tip o :::info donde ayude.`,
  },
  guia_rol: {
    que: `La guía de uso de un rol, organizada por tareas:
- Un párrafo: qué hace este rol en el sistema y en qué plataformas.
- Las funciones agrupadas por módulo: "## <Módulo>" y, dentro, "### <Tarea>" con pasos numerados que usan los nombres reales de las pantallas y de las acciones de los datos, en negrita (por ejemplo: 1. Abra **Mis Partes**. 2. Pulse **Generar Parte**.).
- En cada tarea, si los datos lo dicen: qué debe cumplirse antes (precondiciones) y qué queda al terminar (postcondiciones), en una línea cada uno.
- Usa el árbol de navegación para indicar desde qué menú se llega a cada pantalla.
- Avisos :::warning para lo que no se puede deshacer o bloquea el registro (según las reglas de negocio), y :::tip para atajos útiles.`,
  },
  preguntas: {
    que: `Preguntas frecuentes y problemas comunes de los usuarios:
- "## Preguntas frecuentes": entre 10 y 15 preguntas como "### ¿...?" con su respuesta breve, sacadas de las funciones, las reglas de negocio y las precondiciones.
- "## Problemas comunes": "### <síntoma>" con la causa y qué hacer (por ejemplo, una opción que no aparece porque el rol no la tiene, o un registro que ya no se puede editar).`,
  },
  arquitectura: {
    que: `La explicación de la arquitectura para un desarrollador que llega al proyecto:
- "## Visión general": cómo está construido el sistema y por qué (2 o 3 párrafos).
- "## Componentes": qué hace cada pieza y cómo se comunican.
- "## Cómo viaja una petición": desde la aplicación hasta la base de datos y de vuelta, en pasos numerados.
- "## Seguridad": cómo se controla quién puede hacer qué.
- "## Contenedores y despliegue": qué contenedores hay y para qué; alta disponibilidad y servicios externos si los datos los tienen.
Sin tablas ni diagramas: se agregan debajo de tu texto.`,
  },
  api: {
    que: `La guía para usar la API:
- Un párrafo: qué ofrece la API y a quién va dirigida.
- "## Cómo autenticarse": pasos numerados para iniciar sesión y usar el token, con un ejemplo de código basado en las operaciones de sesión de los datos.
- "## Roles y permisos": qué significa que una operación indique sus roles, y qué pasa si un rol no tiene permiso.
- "## Cómo leer la página de una operación": ruta, ejemplo, entrada y salida.
- "## Errores comunes": sesión vencida, permiso negado, datos inválidos, y cómo resolverlos.
Sin la lista de operaciones: se agrega debajo de tu texto.`,
  },
};

export function armarPromptDocumentacion({ tipo, titulo, datos, indicaciones }) {
  const t = TIPOS[tipo];
  if (!t) throw new Error(`Tipo de página no válido: ${tipo}`);
  return `Eres un redactor técnico. Escribe la página "${titulo}" de la documentación del sistema "${datos?.nombre || ""}", en español claro y directo, para que la entienda alguien que nunca lo usó.

CONTEXTO
Datos aprobados del proyecto para esta página (JSON):
${JSON.stringify(datos, null, 1)}
${indicaciones ? `\nIndicaciones del usuario: ${indicaciones}\n` : ""}
QUÉ DEBE MOSTRAR
${t.que}

QUÉ NO QUIERO
- Funciones, pantallas, botones, campos, roles, rutas o tecnologías que no estén en los datos.
- Repetir la misma idea en varias secciones, relleno o frases de marketing.
- HTML, emojis ni el título de la página (ya lo pone el sitio).

FORMATO
Solo Markdown (CommonMark): secciones con "##" y "###", listas, tablas simples y, si hace falta, bloques de código con su lenguaje. Avisos con la sintaxis de Docusaurus (:::tip, :::info o :::warning en una línea, el texto y ::: en otra). Sin encabezado YAML, sin explicaciones fuera de la página y sin envolverla en un bloque de código.`;
}

// Quita lo que la IA agrega alrededor de la página: bloque de código envolvente, encabezado YAML y título.
export function limpiarPagina(texto) {
  let t = String(texto || "").trim();
  const envuelto = t.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (envuelto) t = envuelto[1].trim();
  t = t.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  t = t.replace(/^#\s+.+\n+/, "").trim();
  return t;
}

export async function generarPaginaDocumentacion({ pagina, indicaciones, usarClaude }) {
  if (!pagina?.tipo || !pagina?.datos) throw new Error("Falta la página a redactar.");
  const respuesta = await generarContenido({ usarClaude, contents: [{ text: armarPromptDocumentacion({ ...pagina, indicaciones }) }] });
  const contenido = limpiarPagina(respuesta.text);
  if (contenido.length < 200) throw new Error(`La IA devolvió una página demasiado corta: ${pagina.titulo}.`);
  return { contenido, modelo_ia: respuesta.modelVersion, costo_ia: respuesta.costoUsd };
}
