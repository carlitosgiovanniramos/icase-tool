import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nombreBaseDatos } from "@/lib/implementacion";

// Ruta temporal, solo en desarrollo: guarda en respaldos/diseno/ (no se sube a git) el análisis y
// los diagramas de los proyectos del usuario, para revisarlos fuera de la app al construir la fase
// de Implementación. Viaja con la sesión del navegador, así que RLS sigue aplicando.
// Uso: con la sesión iniciada, abrir /api/exportar-diseno (todos) o /api/exportar-diseno?id=<id>.

const COLUMNAS = [
  "id",
  "nombre",
  "prompt",
  "contexto",
  "analisis",
  "diagrama_casos_uso",
  "diagrama_clases",
  "diagrama_er",
  "mockups",
  "arbol_navegacion",
  "diagrama_arquitectura",
  "diagrama_sistema",
  "fases_aprobadas",
].join(", ");

export async function GET(request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  try {
    const supabase = await createClient();
    let consulta = supabase.from("proyectos").select(COLUMNAS);
    const id = request.nextUrl.searchParams.get("id");
    if (id) consulta = consulta.eq("id", id);
    const { data, error } = await consulta;
    if (error) throw error;
    if (!data?.length) {
      return NextResponse.json(
        { error: "No se encontraron proyectos. Revisa que la sesión esté iniciada." },
        { status: 404 }
      );
    }

    const carpeta = path.join(process.cwd(), "respaldos", "diseno");
    await mkdir(carpeta, { recursive: true });
    const guardados = [];
    for (const proyecto of data) {
      const archivo = `${nombreBaseDatos(proyecto.nombre)}-${proyecto.id.slice(0, 8)}.json`;
      await writeFile(path.join(carpeta, archivo), JSON.stringify(proyecto, null, 2));
      guardados.push({ proyecto: proyecto.nombre, archivo: `respaldos/diseno/${archivo}` });
    }
    return NextResponse.json({ ok: true, guardados });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
