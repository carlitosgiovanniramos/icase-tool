"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { PALETA } from "./estilos";

const AlertContext = createContext(null);

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert debe usarse dentro de <AlertProvider>");
  }
  return ctx;
}

export default function AlertProvider({ children }) {
  const [estado, setEstado] = useState(null); // { titulo, mensaje, tipo }

  function mostrarError(mensaje, titulo = "Ocurrió un error") {
    setEstado({ titulo, mensaje, tipo: "error" });
  }

  function mostrarInfo(mensaje, titulo = "Aviso") {
    setEstado({ titulo, mensaje, tipo: "info" });
  }

  function cerrar() {
    setEstado(null);
  }

  useEffect(() => {
    if (!estado) return;
    function alTecla(e) {
      if (e.key === "Escape") cerrar();
    }
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [estado]);

  const colorAcento = estado?.tipo === "error" ? PALETA.carmesi : PALETA.navy;

  return (
    <AlertContext.Provider value={{ mostrarError, mostrarInfo }}>
      {children}

      {estado && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={cerrar}
        >
          <div
            className="bg-white border border-gray-300 max-w-md w-full"
            style={{ borderTop: `4px solid ${colorAcento}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <span
                className="inline-block text-xs font-bold tracking-widest uppercase px-2 py-1 mb-3 text-white"
                style={{ backgroundColor: colorAcento }}
              >
                {estado.tipo === "error" ? "Error" : "Aviso"}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {estado.titulo}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                {estado.mensaje}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={cerrar}
                style={{ backgroundColor: colorAcento }}
                className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
