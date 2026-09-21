// Envuelve fetch + response.json() con manejo robusto de respuestas vacías o no-JSON
// (ej. timeout de función serverless en Vercel, que devuelve el cuerpo vacío en vez
// de un JSON de error, y hace que resp.json() explote con "Unexpected end of JSON input").
export async function pedirJson(url, opciones) {
  const resp = await fetch(url, opciones);
  const texto = await resp.text();

  let data = null;
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      // el cuerpo no es JSON válido, seguimos con data = null
    }
  }

  if (data === null) {
    throw new Error(
      resp.ok
        ? "El servidor respondió con un formato inesperado."
        : `El servidor respondió con error ${resp.status}${
            resp.status === 504 || !texto ? " (posible timeout)" : ""
          }.`
    );
  }

  return data;
}
