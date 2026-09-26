// Convierte el contexto de elicitación del proyecto (proyectos.contexto) en texto para el prompt.
// Solo incluye lo que el usuario completó; devuelve "" si no hay nada.
export function formatearContexto(contexto) {
  if (!contexto) return "";
  const lineas = [];
  const agregar = (titulo, valor) => {
    const texto = Array.isArray(valor) ? valor.join(", ") : valor?.trim();
    if (texto) lineas.push(`- ${titulo}:\n${texto}`);
  };

  agregar("Problema o situación actual que el sistema debe resolver", contexto.problema);
  agregar("Alcance: lo que el sistema SÍ incluye", contexto.incluye);
  agregar(
    "Fuera de alcance: lo que el sistema NO incluye (no generes requerimientos para esto)",
    contexto.no_incluye
  );
  agregar("Usuarios y roles conocidos (úsalos como actores)", contexto.usuarios);
  agregar("Plataformas", contexto.plataformas);
  agregar(
    "Reglas de negocio (cada una debe quedar cubierta por al menos un requerimiento)",
    contexto.reglas
  );
  agregar(
    "Atributos de calidad prioritarios (genera requerimientos no funcionales medibles para cada uno)",
    contexto.calidad
  );

  const respondidas = (contexto.entrevista || []).filter((p) => p.respuesta?.trim());
  if (respondidas.length) {
    lineas.push(
      "- Entrevista de elicitación con el cliente:\n" +
        respondidas.map((p) => `P: ${p.pregunta}\nR: ${p.respuesta.trim()}`).join("\n")
    );
  }

  return lineas.join("\n\n");
}
