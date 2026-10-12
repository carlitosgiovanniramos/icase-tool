import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ruta temporal, solo en desarrollo: carga respaldos/prototipo.json en proyectos.mockups (la
// carpeta respaldos no se sube a git). Existe porque el editor SQL de Supabase rechaza consultas tan grandes;
// aquí el contenido viaja por la API con la sesión del navegador, así que RLS sigue aplicando.
// Uso: con la sesión iniciada, abrir /api/importar-prototipo?id=<id del proyecto>.
export async function GET(request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Falta el id del proyecto (?id=...)." }, { status: 400 });
    }

    const raiz = path.join(process.cwd(), "respaldos");
    const pantallas = JSON.parse(await readFile(path.join(raiz, "prototipo.json"), "utf8"));
    if (!Array.isArray(pantallas) || pantallas.some((p) => !p?.nombre || !p?.html)) {
      return NextResponse.json(
        { error: "prototipo.json debe ser una lista de pantallas con nombre y html." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: proyecto, error: errorLectura } = await supabase
      .from("proyectos")
      .select("nombre, mockups")
      .eq("id", id)
      .maybeSingle();
    if (errorLectura) throw errorLectura;
    if (!proyecto) {
      return NextResponse.json(
        { error: "No se encontró el proyecto. Revisa el id y que la sesión esté iniciada." },
        { status: 404 }
      );
    }

    // Lo que había antes se guarda en un archivo para poder volver atrás.
    let respaldo = null;
    if (proyecto.mockups) {
      respaldo = `prototipo.respaldo-${Date.now()}.json`;
      await writeFile(path.join(raiz, respaldo), JSON.stringify(proyecto.mockups, null, 2));
    }

    // El select confirma que la fila se actualizó: con RLS un update sin permiso no da error,
    // simplemente no toca ninguna fila.
    const { data: actualizadas, error } = await supabase
      .from("proyectos")
      .update({ mockups: pantallas })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    if (!actualizadas?.length) {
      return NextResponse.json({ error: "No se actualizó ninguna fila." }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      proyecto: proyecto.nombre,
      pantallas: pantallas.length,
      respaldo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
