import { NextResponse } from "next/server";

// Dibuja un diagrama PlantUML como SVG con Kroki (KROKI_URL: el servicio público
// https://kroki.io o uno propio, sin cambiar código). Se hace desde el servidor para poder
// cambiar de Kroki sin tocar el navegador y evitar bloqueos CORS.
const ESPERA_MS = 20_000;

export async function POST(request) {
  try {
    const { codigo } = await request.json();
    const base = process.env.KROKI_URL?.replace(/\/+$/, "");
    if (!base) {
      return NextResponse.json(
        { error: "Falta KROKI_URL en las variables de entorno (ej. KROKI_URL=https://kroki.io)." },
        { status: 500 }
      );
    }

    let resp;
    try {
      resp = await fetch(`${base}/plantuml/svg`, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: codigo,
        signal: AbortSignal.timeout(ESPERA_MS),
      });
    } catch {
      return NextResponse.json(
        { error: "No se pudo conectar con Kroki para dibujar el diagrama. Intenta de nuevo en un momento." },
        { status: 502 }
      );
    }

    const texto = await resp.text();
    if (resp.status === 400) {
      // Error de sintaxis del diagrama, ej. "Syntax Error? (line: 12)".
      return NextResponse.json(
        { error: texto.replace(/^Error 400:\s*/i, "").trim() || "Error de sintaxis en el diagrama." },
        { status: 400 }
      );
    }
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Kroki respondió con error ${resp.status}. Intenta de nuevo en un momento.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ svg: texto });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
