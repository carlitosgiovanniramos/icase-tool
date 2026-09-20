"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CrearProyecto() {
  const [nombre, setNombre] = useState("");
  const [prompt, setPrompt] = useState("");
  const [documento, setDocumento] = useState(null);
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(false);

  const router = useRouter();

  async function subirArchivo(file, carpeta) {
    const nombreArchivo = `${carpeta}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("archivos-proyecto")
      .upload(nombreArchivo, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from("archivos-proyecto")
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);

    try {
      let documentoUrl = null;
      let documentoTexto = null;
      let imagenUrl = null;

      if (documento) {
        documentoUrl = await subirArchivo(documento, "documentos");

        const resp = await fetch("/api/procesar-documento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: documentoUrl }),
        });
        const data = await resp.json();
        documentoTexto = data.texto || null;
      }

      if (imagen) {
        imagenUrl = await subirArchivo(imagen, "imagenes");
      }

      const { error } = await supabase.from("proyectos").insert([
        {
          nombre,
          prompt,
          documento_url: documentoUrl,
          documento_texto: documentoTexto,
          imagen_url: imagenUrl,
        },
      ]);

      if (error) throw error;

      router.push("/");
    } catch (err) {
      alert("Error al crear el proyecto: " + err.message);
    } finally {
      setCargando(false);
    }
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

        <div>
          <label className="block mb-1 text-sm text-gray-500">
            Documento (opcional — PDF, Word o Excel)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xlsx"
            onChange={(e) => setDocumento(e.target.files[0])}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm text-gray-500">
            Imagen de referencia (opcional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagen(e.target.files[0])}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
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