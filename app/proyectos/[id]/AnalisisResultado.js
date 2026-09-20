"use client";

import { useState } from "react";
import {
  PALETA,
  ROTACION_COLORES,
  CATEGORIA_COLORES,
  CATEGORIA_COLOR_DEFECTO,
  PRIORIDAD_COLORES,
  PRIORIDAD_COLOR_DEFECTO,
} from "./estilos";

function iniciales(nombre) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function comoLista(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  if (typeof valor === "string" && valor.trim()) return [valor.trim()];
  return [];
}

function EtiquetaSeccion({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-2 h-2 shrink-0" style={{ backgroundColor: PALETA.navy }} />
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {children}
      </h3>
    </div>
  );
}

function TarjetaRequisito({ r, colorBadge, etiquetaBadge, badgeSolido }) {
  const [abierto, setAbierto] = useState(false);

  const dependencias = comoLista(r.dependencias);
  const actores = comoLista(r.actores);
  const tieneDetalle =
    dependencias.length > 0 ||
    actores.length > 0 ||
    (r.precondiciones && r.precondiciones !== "No aplica") ||
    (r.postcondiciones && r.postcondiciones !== "No aplica");

  const prioridad = r.prioridad?.toLowerCase();
  const colorPrioridad = PRIORIDAD_COLORES[prioridad] || PRIORIDAD_COLOR_DEFECTO;

  return (
    <div className="bg-white border border-gray-300 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`shrink-0 h-fit px-2 py-1 border text-xs font-bold ${
              badgeSolido ? "text-white" : ""
            }`}
            style={
              badgeSolido
                ? { backgroundColor: colorBadge, borderColor: colorBadge }
                : { borderColor: colorBadge, color: colorBadge }
            }
          >
            {etiquetaBadge || r.codigo}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm leading-snug">
              {r.nombre || r.codigo}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400">{r.codigo}</span>
              {prioridad && (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: colorPrioridad }}
                >
                  Prioridad {prioridad}
                </span>
              )}
            </div>
          </div>
        </div>

        {tieneDetalle && (
          <button
            onClick={() => setAbierto((v) => !v)}
            className="shrink-0 text-xs font-semibold whitespace-nowrap"
            style={{ color: PALETA.navy }}
          >
            {abierto ? "Ocultar ▲" : "Detalles ▾"}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mt-3">{r.descripcion}</p>

      {abierto && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs text-gray-600">
          {actores.length > 0 && (
            <div>
              <span className="font-semibold text-gray-700">Actores: </span>
              {actores.join(", ")}
            </div>
          )}
          {r.precondiciones && r.precondiciones !== "No aplica" && (
            <div>
              <span className="font-semibold text-gray-700">Precondiciones: </span>
              {r.precondiciones}
            </div>
          )}
          {r.postcondiciones && r.postcondiciones !== "No aplica" && (
            <div>
              <span className="font-semibold text-gray-700">Postcondiciones: </span>
              {r.postcondiciones}
            </div>
          )}
          {dependencias.length > 0 && (
            <div>
              <span className="font-semibold text-gray-700">Dependencias: </span>
              {dependencias.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalisisResultado({ resultado }) {
  const {
    actores = [],
    requerimientos_funcionales = [],
    requerimientos_no_funcionales = [],
  } = resultado;

  return (
    <div className="mt-6 space-y-8">
      <div>
        <EtiquetaSeccion>Actores</EtiquetaSeccion>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actores.map((actor, i) => {
            const color = ROTACION_COLORES[i % ROTACION_COLORES.length];
            return (
              <div
                key={actor.nombre + i}
                className="bg-white border border-gray-300"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div
                    className="w-9 h-9 flex items-center justify-center text-white font-semibold text-xs shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {iniciales(actor.nombre)}
                  </div>
                  <h4 className="font-semibold text-gray-800">{actor.nombre}</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed px-4 pb-4">
                  {actor.descripcion}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <EtiquetaSeccion>Requerimientos funcionales</EtiquetaSeccion>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requerimientos_funcionales.map((r) => (
            <TarjetaRequisito key={r.codigo} r={r} colorBadge={PALETA.navy} />
          ))}
        </div>
      </div>

      <div>
        <EtiquetaSeccion>Requerimientos no funcionales</EtiquetaSeccion>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requerimientos_no_funcionales.map((r) => {
            const color = CATEGORIA_COLORES[r.categoria] || CATEGORIA_COLOR_DEFECTO;
            return (
              <TarjetaRequisito
                key={r.codigo}
                r={r}
                colorBadge={color}
                etiquetaBadge={r.categoria}
                badgeSolido
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
