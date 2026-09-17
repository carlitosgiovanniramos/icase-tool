import { supabase } from "@/lib/supabaseClient";

export default async function WorkspaceProyecto({ params }) {
  const { id } = await params;

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{proyecto.nombre}</h1>
      <p className="text-gray-500 mb-6">{proyecto.prompt}</p>
      <p className="text-sm text-gray-400">
        Aquí van a aparecer las 5 pestañas de resultados (próximo paso).
      </p>
    </div>
  );
}