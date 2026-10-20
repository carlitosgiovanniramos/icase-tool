import { NextResponse } from "next/server";
import { revisarStack } from "@/lib/stack";

export const maxDuration = 60;

// Revisa una ficha de "Stack técnico" editada a mano, con las mismas validaciones que la
// generada y sin IA (no tiene costo). Ver revisarStack en lib/stack.js.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    if (!cuerpo.stack) return NextResponse.json({ error: "Falta la ficha a revisar." }, { status: 400 });
    return NextResponse.json(await revisarStack(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
