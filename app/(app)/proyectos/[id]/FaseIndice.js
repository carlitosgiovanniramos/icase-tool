"use client";

import { PALETA } from "../../../estilos";

export default function FaseIndice({ fasesAprobadas, onNavegar }) {
  const analisisAprobado = !!fasesAprobadas?.analisis;
  const disenoAprobado = !!fasesAprobadas?.diseno_arquitectura;

  const fases = [
    {
      clave: "analisis",
      numero: "01",
      nombre: "Análisis",
      descripcion: "Actores, requerimientos y diagrama de casos de uso",
      completado: analisisAprobado,
      bloqueado: false,
    },
    {
      clave: "diseno",
      numero: "02",
      nombre: "Diseño",
      descripcion: "Entidad-relación, prototipo, árbol de navegación y arquitectura",
      completado: disenoAprobado,
      bloqueado: !analisisAprobado,
    },
  ];

  return (
    <div className="border border-gray-300 divide-y divide-gray-200 bg-white">
      {fases.map((fase) => {
        const color = fase.completado
          ? PALETA.oliva
          : fase.bloqueado
          ? "#d1d5db"
          : PALETA.navy;

        return (
          <button
            key={fase.clave}
            onClick={() => !fase.bloqueado && onNavegar(fase.clave)}
            disabled={fase.bloqueado}
            className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors"
          >
            <span
              className="w-10 h-10 shrink-0 flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {fase.completado ? "✓" : fase.numero}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{fase.nombre}</h3>
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color }}
                >
                  {fase.completado
                    ? "Completado"
                    : fase.bloqueado
                    ? "Bloqueado"
                    : "Disponible"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{fase.descripcion}</p>
            </div>

            {!fase.bloqueado && (
              <span className="text-xl text-gray-300 shrink-0">→</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
