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
    (mensaje, titulo = "¿Estás seguro?", textoConfirmar = "Eliminar", textoCancelar = "Cancelar") =>
      new Promise((resolver) => {
        setEstado({ titulo, mensaje, tipo: "confirmar", textoConfirmar, textoCancelar, resolver });
      }),
    []
  );

  // Notificaciones rojas en la esquina superior derecha: no bloquean la pantalla, se cierran
  // solas tras unos segundos y pueden traer acciones ({ texto, onClick }).
  const [notificaciones, setNotificaciones] = useState([]);

  const cerrarNotificacion = useCallback((id) => {
    setNotificaciones((lista) => lista.filter((n) => n.id !== id));
  }, []);

  const notificar = useCallback(
    ({ titulo, mensaje, acciones = [], duracion = 10000 }) => {
      const id = crypto.randomUUID();
      setNotificaciones((lista) => [...lista.slice(-2), { id, titulo, mensaje, acciones }]);
      setTimeout(() => cerrarNotificacion(id), duracion);
      return id;
    },
    [cerrarNotificacion]
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
    <AlertContext.Provider value={{ mostrarError, mostrarInfo, confirmar, notificar }}>
      {children}

      {notificaciones.length > 0 && (
        <div className="fixed top-4 right-4 z-[90] w-[360px] max-w-[calc(100vw-2rem)] flex flex-col gap-2">
          {notificaciones.map((n) => (
            <div
              key={n.id}
              role="alert"
              className="text-white shadow-2xl p-4 animate-[scale-in_150ms_ease-out]"
              style={{ backgroundColor: PALETA.carmesi }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{n.titulo}</p>
                <button
                  onClick={() => cerrarNotificacion(n.id)}
                  aria-label="Cerrar notificación"
                  className="shrink-0 text-white/70 hover:text-white text-sm leading-none"
                >
                  ✕
                </button>
              </div>
              {n.mensaje && <p className="text-xs text-white/90 mt-1 leading-relaxed">{n.mensaje}</p>}
              {n.acciones.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {n.acciones.map((accion) => (
                    <button
                      key={accion.texto}
                      onClick={() => {
                        cerrarNotificacion(n.id);
                        accion.onClick();
                      }}
                      className="border border-white/70 px-3 py-1 text-xs font-semibold hover:bg-white/15"
                    >
                      {accion.texto}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
                  {estado.textoCancelar}
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
