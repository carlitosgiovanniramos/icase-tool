"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { pedirJson } from "@/lib/pedirJson";
import { useAlert } from "../AlertProvider";
import { PALETA } from "../estilos";

function Campo({ etiqueta, opcional, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {etiqueta}
        </span>
        {opcional && (
          <span className="text-xs text-gray-400">(opcional)</span>
        )}
      </label>
      {children}
    </div>
  );
}

const claseInput =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900";

export default function CrearProyecto() {
  const [nombre, setNombre] = useState("");
  const [prompt, setPrompt] = useState("");
  const [documento, setDocumento] = useState(null);
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(false);

  const router = useRouter();
  const { mostrarError } = useAlert();

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

        const data = await pedirJson("/api/procesar-documento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: documentoUrl }),
        });
        if (data.error) throw new Error(data.error);
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
      mostrarError(err.message, "Error al crear el proyecto");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <header
        className="mb-8 bg-white border border-gray-300 p-6"
        style={{ borderLeft: `4px solid ${PALETA.negro}` }}
      >
        <span
          className="inline-block text-xs font-bold tracking-widest uppercase px-2 py-1 mb-3 text-white"
          style={{ backgroundColor: PALETA.negro }}
        >
          Nuevo proyecto
        </span>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cuéntanos tu idea
        </h1>
        <p className="text-gray-600 leading-relaxed">
          Con el nombre y una descripción bastan para arrancar el análisis;
          el documento y la imagen son solo contexto adicional para la IA.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-300 p-6 flex flex-col gap-6 max-w-2xl"
      >
        <Campo etiqueta="Nombre del proyecto">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Sistema de citas médicas"
            className={claseInput}
            required
          />
        </Campo>

        <Campo etiqueta="Describe tu idea">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: app de citas médicas para una clínica privada, con pacientes, doctores y horarios"
            className={`${claseInput} h-32 resize-none`}
            required
          />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Campo etiqueta="Documento" opcional>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx"
              onChange={(e) => setDocumento(e.target.files[0])}
              className={`${claseInput} file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-gray-700`}
            />
            <p className="text-xs text-gray-400 mt-1">PDF, Word o Excel</p>
          </Campo>

          <Campo etiqueta="Imagen de referencia" opcional>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImagen(e.target.files[0])}
              className={`${claseInput} file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-gray-700`}
            />
          </Campo>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={cargando}
            style={{ backgroundColor: PALETA.navy }}
            className="text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50 hover:brightness-125"
          >
            {cargando ? "Creando..." : "Crear proyecto"}
          </button>

          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2.5"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
