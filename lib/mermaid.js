// Corrige defectos habituales en el código Mermaid que devuelven los modelos de IA,
// para que el diagrama se pueda renderizar aunque la IA no siga el formato al pie de la letra.
export function limpiarMermaid(codigo) {
  let c = String(codigo ?? "").trim();

  // Bloque de código markdown: ```mermaid ... ```
  c = c.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/, "");

  // Saltos de línea escapados dos veces dentro del JSON: llegan como el texto "\n" en vez de
  // un salto real, y Mermaid no reconoce el tipo de diagrama ("No diagram type detected").
  if (/\\n/.test(c)) {
    c = c
      .replace(/\\r\\n|\\n/g, "\n")
      .replace(/\\t/g, "  ")
      .replace(/\\"/g, '"');
  }

  return c.trim();
}
