import { limpiarMermaid } from "./mermaid.js";

// Los diagramas se guardan como código Mermaid o PlantUML. El motor se reconoce por el contenido
// (PlantUML empieza con @startuml, @startwbs...), así los diagramas Mermaid ya guardados siguen
// funcionando aunque su paso ahora se genere en PlantUML.
export function esPlantUML(codigo) {
  return /^\s*@start\w+/m.test(String(codigo ?? ""));
}

// Corrige defectos habituales del PlantUML que devuelven los modelos de IA.
export function limpiarPlantUML(codigo) {
  let c = String(codigo ?? "").trim();

  // Bloque de código markdown: ```plantuml ... ```
  c = c.replace(/^```(?:plantuml|puml|uml)?\s*/i, "").replace(/\s*```$/, "");

  // Todo en una sola línea con "\n" escritos como texto: el JSON llegó escapado dos veces. Solo
  // en ese caso se convierten, porque "\n" dentro de una etiqueta es un salto de línea válido.
  if (!c.includes("\n") && /\\n/.test(c)) {
    c = c.replace(/\\r\\n|\\n/g, "\n").replace(/\\t/g, "  ").replace(/\\"/g, '"');
  }

  // Sin @start / @end, PlantUML no reconoce el diagrama.
  const inicio = c.match(/^\s*@start(\w+)/m);
  if (!inicio) c = `@startuml\n${c}\n@enduml`;
  else if (!new RegExp(`@end${inicio[1]}\\s*$`).test(c)) c = `${c}\n@end${inicio[1]}`;

  return c.trim();
}

export function limpiarDiagrama(codigo) {
  return esPlantUML(codigo) ? limpiarPlantUML(codigo) : limpiarMermaid(codigo);
}

// La explicación de un diagrama se guarda como comentarios al inicio de su código (%% en
// Mermaid, ' en PlantUML): el motor los ignora al dibujar, viaja con el diagrama (ediciones,
// cascada) y no requiere otra columna.
const MARCAS = {
  mermaid: { marca: "%% Explicación:", linea: /^\s*%%(?!\{)\s?(.*)$/, prefijo: "%% " },
  plantuml: { marca: "' Explicación:", linea: /^\s*'\s?(.*)$/, prefijo: "' " },
};

export function conExplicacion(codigo, explicacion) {
  const lineas = String(explicacion ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean); // Mermaid solo descarta comentarios con texto ("%%" vacío rompe el diagrama)
  if (!lineas.length) return codigo;
  const { marca, prefijo } = MARCAS[esPlantUML(codigo) ? "plantuml" : "mermaid"];
  return [marca, ...lineas.map((l) => prefijo + l), codigo].join("\n");
}

// Devuelve el texto de la explicación (o "" si el código no tiene).
export function extraerExplicacion(codigo) {
  const lineas = String(codigo ?? "").split("\n");
  const formato = Object.values(MARCAS).find((m) => lineas[0]?.trim() === m.marca);
  if (!formato) return "";
  const texto = [];
  for (const linea of lineas.slice(1)) {
    const m = linea.match(formato.linea);
    if (!m) break;
    texto.push(m[1]);
  }
  return texto.join("\n").trim();
}

// Huella corta del código (FNV-1a de 32 bits): dice si el SVG guardado de un diagrama se
// dibujó con su código actual.
export function hashCodigo(codigo) {
  let h = 0x811c9dc5;
  const texto = String(codigo ?? "");
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
