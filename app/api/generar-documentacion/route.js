import { NextResponse } from "next/server";
import { generarPaginaDocumentacion, modificarPaginaDocumentacion } from "@/lib/documentacionIA";

export const maxDuration = 300;

// Paso "Documentación": redacta con IA una página de lectura de la documentación del proyecto (inicio,
// primeros pasos, guía de un rol, preguntas frecuentes, arquitectura o guía de la API) con los datos
// aprobados que le envía el navegador. La lógica está en lib/documentacionIA.js.
export async function POST(request) {
  try {
    const cuerpo = await request.json();
    // Con { actual, instruccion } modifica una página ya redactada ("Editar con IA" del explorador).
    if (cuerpo.actual && cuerpo.instruccion) return NextResponse.json(await modificarPaginaDocumentacion(cuerpo));
    return NextResponse.json(await generarPaginaDocumentacion(cuerpo));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
