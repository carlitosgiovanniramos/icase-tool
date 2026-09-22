"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PALETA, ROTACION_COLORES, DEGRADADO_AUTH } from "../estilos";

const POR_PAGINA = 6;

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [proyectos, setProyectos] = useState(null);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    async function cargarProyectos() {
      const { data, error } = await supabase
        .from("proyectos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      setProyectos(data || []);
    }
    cargarProyectos();
  }, [supabase]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda]);

  const filtrados = useMemo(() => {
    if (!proyectos) return [];
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return proyectos;
    return proyectos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(termino) ||
        p.prompt?.toLowerCase().includes(termino)
    );
  }, [proyectos, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis proyectos</h1>
          {proyectos && (
            <p className="text-sm text-gray-500 mt-1">
              {filtrados.length}{" "}
              {filtrados.length === 1 ? "proyecto" : "proyectos"}
              {busqueda && ` para "${busqueda}"`}
            </p>
          )}
        </div>

        <Link
          href="/crear"
          className={`text-white px-4 py-2 text-sm font-semibold hover:brightness-125 transition-all ${DEGRADADO_AUTH}`}
        >
          + Crear proyecto
        </Link>
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o descripción..."
        className="w-full max-w-md border border-gray-300 px-3 py-2 text-sm mb-6 focus:outline-none focus:border-gray-900"
      />

      {error && (
        <p className="text-sm" style={{ color: PALETA.carmesi }}>
          Error al cargar proyectos: {error}
        </p>
      )}

      {proyectos === null && !error && (
        <p className="text-gray-500 text-sm">Cargando proyectos...</p>
      )}

      {proyectos && proyectos.length === 0 && (
        <div className="border border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            Todavía no has creado ningún proyecto.
          </p>
        </div>
      )}

      {proyectos && proyectos.length > 0 && filtrados.length === 0 && (
        <div className="border border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            No se encontraron proyectos para &quot;{busqueda}&quot;.
          </p>
        </div>
      )}

      {visibles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibles.map((proyecto, i) => {
            const color = ROTACION_COLORES[i % ROTACION_COLORES.length];
            return (
              <Link
                key={proyecto.id}
                href={`/proyectos/${proyecto.id}`}
                className="bg-white border border-gray-300 p-4 block hover:shadow-sm transition-shadow"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <h2 className="font-semibold text-gray-800">
                  {proyecto.nombre}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed mt-1 line-clamp-3">
                  {proyecto.prompt}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            style={{ borderColor: PALETA.navy, color: PALETA.navy }}
            className="border bg-transparent hover:bg-gray-50 px-3 py-1.5 text-sm disabled:opacity-30"
          >
            ← Anterior
          </button>

          <span className="text-sm text-gray-500 px-2">
            Página {paginaActual} de {totalPaginas}
          </span>

          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            style={{ borderColor: PALETA.navy, color: PALETA.navy }}
            className="border bg-transparent hover:bg-gray-50 px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
