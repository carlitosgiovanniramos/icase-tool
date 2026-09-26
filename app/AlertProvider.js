"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { PALETA } from "./estilos";

const AlertContext = createContext(null);

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert debe usarse dentro de <AlertProvider>");
  }
  return ctx;
}

const ETIQUETAS = { error: "Error", info: "Aviso", confirmar: "Confirmar" };

export default function AlertProvider({ children }) {
  const [estado, setEstado] = useState(null); // { titulo, mensaje, tipo, textoConfirmar?, resolver? }

  const mostrarError = useCallback((mensaje, titulo = "Ocurrió un error") => {
    setEstado({ titulo, mensaje, tipo: "error" });
  }, []);

  const mostrarInfo = useCallback((mensaje, titulo = "Aviso") => {
    setEstado({ titulo, mensaje, tipo: "info" });
  }, []);

  // Reemplazo de window.confirm: devuelve una promesa que se resuelve en true/false.
  const confirmar = useCallback(
    (mensaje, titulo = "¿Estás seguro?", textoConfirmar = "Eliminar") =>
      new Promise((resolver) => {
        setEstado({ titulo, mensaje, tipo: "confirmar", textoConfirmar, resolver });
      }),
    []
  );

  const cerrar = useCallback((respuesta = false) => {
    setEstado((actual) => {
      actual?.resolver?.(respuesta);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!estado) return;
    function alTecla(e) {
      if (e.key === "Escape") cerrar(false);
    }
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [estado, cerrar]);

  const colorAcento = estado?.tipo === "info" ? PALETA.navy : PALETA.carmesi;
  const esConfirmacion = estado?.tipo === "confirmar";

  return (
    <AlertContext.Provider value={{ mostrarError, mostrarInfo, confirmar }}>
      {children}

      {estado && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-[fade-in_150ms_ease-out]"
          onClick={() => cerrar(false)}
        >
          <div
            className="bg-white border border-gray-300 max-w-md w-full animate-[scale-in_150ms_ease-out]"
            style={{ borderTop: `4px solid ${colorAcento}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <span
                className="inline-block text-xs font-bold tracking-widest uppercase px-2 py-1 mb-3 text-white"
                style={{ backgroundColor: colorAcento }}
              >
                {ETIQUETAS[estado.tipo]}
              </span>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {estado.titulo}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                {estado.mensaje}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              {esConfirmacion && (
                <button
                  onClick={() => cerrar(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => cerrar(true)}
                style={{ backgroundColor: colorAcento }}
                className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
              >
                {esConfirmacion ? estado.textoConfirmar : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
