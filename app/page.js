import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  const { data: proyectos, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis proyectos</h1>

      {error && (
        <p className="text-red-600">
          Error al cargar proyectos: {error.message}
        </p>
      )}

      {!error && proyectos.length === 0 && (
        <p className="text-gray-500">
          Todavía no has creado ningún proyecto.
        </p>
      )}

      <div className="flex flex-col gap-3 max-w-md">
        {proyectos?.map((proyecto) => (
          <Link
            key={proyecto.id}
            href={`/proyectos/${proyecto.id}`}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 block"
          >
            <h2 className="font-semibold">{proyecto.nombre}</h2>
            <p className="text-sm text-gray-500 line-clamp-2">
              {proyecto.prompt}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}