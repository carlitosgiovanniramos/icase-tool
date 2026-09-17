"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CrearProyecto() {
  const [nombre, setNombre] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase
      .from("proyectos")
      .insert([{ nombre, prompt }]);

    setCargando(false);

    if (error) {
      alert("Error al crear el proyecto: " + error.message);
      return;
    }

    router.push("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nuevo proyecto</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div>
          <label className="block mb-1 text-sm text-gray-500">
            Nombre del proyecto
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Sistema de citas médicas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-500">
            Describe tu idea
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: app de citas médicas para una clínica privada, con pacientes, doctores y horarios"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
            required
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {cargando ? "Creando..." : "Crear proyecto"}
        </button>
      </form>
    </div>
  );
}