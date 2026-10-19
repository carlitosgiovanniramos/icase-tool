import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { armarProyecto } from "@/lib/implementacion";

export const maxDuration = 120;

// Fase de Implementación: arma los archivos del proyecto (plantilla + generados) y le pasa las
// órdenes al runner (runner/index.mjs), que es el único que ejecuta Docker. El proyecto se lee
// con la sesión del usuario, así que RLS asegura que solo maneje sus propios proyectos.
//
// POST { proyectoId, accion, servicio?, borrarDatos? }
//   archivos     lista de archivos del proyecto, sin tocar Docker
//   levantar     escribe los archivos en la carpeta de trabajo y levanta los contenedores
//   estado       contenedores, puertos y operación en curso
//   logs         últimas líneas de log (de un servicio o de todos)
//   detener      apaga los contenedores (borrarDatos: también la base de datos)

const RUNNER_URL = (process.env.RUNNER_URL || "http://127.0.0.1:4100").replace(/\/+$/, "");
const ACCIONES = new Set(["archivos", "levantar", "estado", "logs", "detener"]);

class ErrorRunner extends Error {
  constructor(estado, mensaje, salida) {
    super(mensaje);
    this.estado = estado;
    this.salida = salida;
  }
}

async function runner(metodo, ruta, cuerpo) {
  if (!process.env.RUNNER_TOKEN) {
    throw new ErrorRunner(500, "Falta RUNNER_TOKEN en .env.local.");
  }
  let resp;
  try {
    resp = await fetch(`${RUNNER_URL}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${process.env.RUNNER_TOKEN}`, "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(110_000),
    });
  } catch {
    throw new ErrorRunner(503, "El runner no está encendido. Inícialo con: npm run runner");
  }
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new ErrorRunner(resp.status, datos.error || `El runner respondió ${resp.status}.`, datos.salida);
  return datos;
}

async function archivosDelProyecto(supabase, proyecto) {
  const { data, error } = await supabase
    .from("archivos_proyecto")
    .select("ruta, contenido, paso, estado")
    .eq("proyecto_id", proyecto.id);
  if (error) {
    if (error.code === "42P01" || /archivos_proyecto/.test(error.message)) {
      throw new ErrorRunner(500, "Falta la tabla archivos_proyecto: ejecuta supabase/archivos_proyecto.sql en Supabase.");
    }
    throw error;
  }
  return { generados: data.length, archivos: await armarProyecto({ nombre: proyecto.nombre, generados: data }) };
}

export async function POST(request) {
  try {
    const { proyectoId, accion, servicio, borrarDatos } = await request.json();
    if (!ACCIONES.has(accion)) return NextResponse.json({ error: "Acción no válida." }, { status: 400 });

    const supabase = await createClient();
    const { data: proyecto, error } = await supabase
      .from("proyectos")
      .select("id, nombre")
      .eq("id", proyectoId)
      .maybeSingle();
    if (error) throw error;
    if (!proyecto) return NextResponse.json({ error: "No se encontró el proyecto." }, { status: 404 });

    const base = `/proyectos/${proyecto.id}`;

    if (accion === "archivos") {
      return NextResponse.json(await archivosDelProyecto(supabase, proyecto));
    }

    if (accion === "levantar") {
      const { generados, archivos } = await archivosDelProyecto(supabase, proyecto);
      if (!generados) {
        return NextResponse.json({ error: "El proyecto todavía no tiene archivos generados." }, { status: 400 });
      }
      await runner("POST", `${base}/sincronizar`, { archivos: archivos.map(({ ruta, contenido }) => ({ ruta, contenido })) });
      return NextResponse.json(await runner("POST", `${base}/levantar`, {}));
    }

    if (accion === "estado") return NextResponse.json(await runner("GET", `${base}/estado`));

    if (accion === "logs") {
      const consulta = servicio ? `?servicio=${encodeURIComponent(servicio)}` : "";
      return NextResponse.json(await runner("GET", `${base}/logs${consulta}`));
    }

    return NextResponse.json(await runner("POST", `${base}/detener`, { borrarDatos: !!borrarDatos }));
  } catch (err) {
    return NextResponse.json({ error: err.message, salida: err.salida }, { status: err.estado || 500 });
  }
}
