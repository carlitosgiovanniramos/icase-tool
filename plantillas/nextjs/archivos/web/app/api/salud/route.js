// Lo usan el healthcheck del contenedor y el balanceador.
export function GET() {
  return Response.json({ estado: "ok", instancia: process.env.INSTANCIA || "web" });
}
