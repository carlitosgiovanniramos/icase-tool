export class ErrorRunner extends Error {
  constructor(estado, mensaje, salida) { super(mensaje); this.estado = estado; this.salida = salida; }
}

export async function llamarRunner(metodo, ruta, cuerpo, espera = 110_000) {
  if (!process.env.RUNNER_TOKEN) throw new ErrorRunner(503, "La ejecución en contenedores requiere icase-tool en local y el runner configurado.");
  const url = (process.env.RUNNER_URL || "http://127.0.0.1:4100").replace(/\/+$/, "");
  let respuesta;
  try {
    respuesta = await fetch(`${url}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${process.env.RUNNER_TOKEN}`, "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(espera) });
  } catch { throw new ErrorRunner(503, "El runner no respondió. Enciende Docker Desktop e inicia npm run all."); }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorRunner(respuesta.status, datos.error || `El runner respondió ${respuesta.status}.`, datos.salida);
  return datos;
}
