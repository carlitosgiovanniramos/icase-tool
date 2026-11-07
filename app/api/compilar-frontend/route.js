import { NextResponse } from "next/server";
import { parse } from "yaml";
import { createClient } from "@/lib/supabase/server";
import { armarProyecto } from "@/lib/implementacion";
import { llamarRunner } from "@/lib/runner";
import { archivoQueFalloCompilacion, archivosDeFrontend } from "@/lib/archivosFrontend";

export const maxDuration = 300;

// Compila en Docker la web o la app del proyecto (sus imágenes, sin levantarlas) con todo lo generado
// hasta ahora, y dice qué archivo falló para corregirlo con el error.
export async function POST(request) {
  try {
    const { proyectoId, plataforma } = await request.json();
    if (!["web", "movil"].includes(plataforma)) return NextResponse.json({ error: "Plataforma no válida." }, { status: 400 });
    const supabase = await createClient();
    const { data: proyecto, error } = await supabase.from("proyectos").select("id, nombre, stack_implementacion, estructura_implementacion").eq("id", proyectoId).maybeSingle();
    if (error) throw error;
    if (!proyecto?.stack_implementacion) return NextResponse.json({ error: "Falta el stack técnico aprobado." }, { status: 409 });
    const { data: generados, error: errorArchivos } = await supabase.from("archivos_proyecto").select("ruta, contenido").eq("proyecto_id", proyectoId);
    if (errorArchivos) throw errorArchivos;
    const stack = proyecto.stack_implementacion;
    const { archivos } = await armarProyecto({ nombre: proyecto.nombre, generados, piezas: stack.piezas, altaDisponibilidad: !!stack.altaDisponibilidad, externos: stack.externos || [] });

    // Servicios que se construyen desde la carpeta de la plataforma (con alta disponibilidad, web-master
    // y web-esclavo comparten imagen: basta uno).
    const plan = archivosDeFrontend(proyecto.estructura_implementacion, plataforma);
    const carpeta = plan[0]?.ruta.split("/")[0];
    if (!carpeta) return NextResponse.json({ error: "La estructura no tiene archivos de esta plataforma." }, { status: 409 });
    const compose = parse(archivos.find((a) => a.ruta === "docker-compose.yml")?.contenido || "") || {};
    const servicio = Object.entries(compose.services || {}).find(([, s]) => String(s.build?.context ?? s.build ?? "").replace(/^\.\//, "") === carpeta)?.[0];
    if (!servicio) return NextResponse.json({ error: `No hay un servicio que se construya desde ${carpeta}/.` }, { status: 409 });

    const resultado = await llamarRunner("POST", `/proyectos/${proyectoId}/compilar`, { archivos: archivos.map(({ ruta, contenido }) => ({ ruta, contenido })), servicios: [servicio] }, 16 * 60_000);
    return NextResponse.json({ ...resultado, servicio, archivo: resultado.ok ? null : archivoQueFalloCompilacion(resultado.salida, plan), fecha: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error.message, salida: error.salida }, { status: error.estado || 500 });
  }
}
