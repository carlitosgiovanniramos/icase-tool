"use client";

import { useState } from "react";
import { PALETA } from "../../../estilos";

// Los avisos del stack técnico (lo que dejó por decidir o resolver) no pasan solos a los pasos de
// código. Aquí se muestran en el paso donde se resuelven, con casillas, y se pasan a sus
// indicaciones con un clic. Los que son del despliegue (HTTPS, proxy, dominio...) no se ofrecen:
// no cambian el código.
const DE_DESPLIEGUE = /\b(proxy|tls|https|ssl|certificad\w*|dominio|despliegue|desplegar|balanceador)\b/i;

export const PREFIJO = "Del stack técnico: ";

export default function AvisosDelStack({ avisos, indicaciones, onAgregar, deshabilitado }) {
  const [omitidos, setOmitidos] = useState([]);

  const pertinentes = (Array.isArray(avisos) ? avisos : []).filter((a) => typeof a === "string" && a.trim() && !DE_DESPLIEGUE.test(a));
  if (!pertinentes.length) return null;

  const yaAgregado = (aviso) => String(indicaciones || "").includes(aviso.trim());
  const pendientes = pertinentes.filter((a) => !yaAgregado(a));
  const marcados = pendientes.filter((a) => !omitidos.includes(a));

  return (
    <div className="mb-3 border border-gray-300 p-3" style={{ borderLeft: `4px solid ${PALETA.marron}` }}>
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Avisos del stack técnico</p>
      <ul className="space-y-1">
        {pertinentes.map((aviso) => {
          const agregado = yaAgregado(aviso);
          return (
            <li key={aviso}>
              <label className={`flex items-start gap-3 text-sm ${agregado ? "text-gray-400" : "text-gray-800 cursor-pointer"}`}>
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agregado || !omitidos.includes(aviso)}
                  disabled={agregado || deshabilitado}
                  onChange={() => setOmitidos((o) => (o.includes(aviso) ? o.filter((x) => x !== aviso) : [...o, aviso]))}
                />
                <span>
                  {aviso}
                  {agregado && <span className="ml-2 text-xs font-semibold" style={{ color: PALETA.oliva }}>Ya está en las indicaciones</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {pendientes.length > 0 && (
        <button
          type="button"
          onClick={() => onAgregar(marcados.map((a) => `${PREFIJO}${a.trim()}`))}
          disabled={deshabilitado || !marcados.length}
          style={{ backgroundColor: PALETA.navy }}
          className="mt-3 text-white px-3 py-1.5 text-xs font-semibold hover:brightness-125 disabled:opacity-50"
        >
          Agregar a las indicaciones ({marcados.length})
        </button>
      )}
    </div>
  );
}
