// Error con código HTTP, para que los servicios indiquen qué respuesta corresponde.
export class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Manejador final: convierte cualquier error en una respuesta JSON { error }.
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorHttp) return res.status(err.estado).json({ error: err.message });
  if (err.code === "23505") return res.status(409).json({ error: "Ya existe un registro con ese dato único." });
  if (err.code === "22P02") return res.status(400).json({ error: "Identificador no válido." });

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
}
