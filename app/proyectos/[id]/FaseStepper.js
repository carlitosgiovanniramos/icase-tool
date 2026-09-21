"use client";

import { useEffect, useRef, useState } from "react";
import { PALETA } from "../../estilos";

export default function FaseStepper({ fasesAprobadas, vista, onNavegar }) {
  const [oculto, setOculto] = useState(false);
  const ultimoScroll = useRef(0);

  useEffect(() => {
    function alScroll() {
      const actual = window.scrollY;
      const bajando = actual > ultimoScroll.current;
      setOculto(bajando && actual > 80);
      ultimoScroll.current = actual;
    }
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  const analisisAprobado = !!fasesAprobadas?.analisis;
  const disenoAprobado = !!fasesAprobadas?.diseno_arquitectura;

  const pasos = [
    {
      clave: "analisis",
      numero: "1",
      nombre: "Análisis",
      completado: analisisAprobado,
      bloqueado: false,
    },
    {
      clave: "diseno",
      numero: "2",
      nombre: "Diseño",
      completado: disenoAprobado,
      bloqueado: !analisisAprobado,
    },
  ];

  return (
    <div
      className="mb-8 flex items-start sticky top-0 z-20 bg-white py-3 transition-transform duration-300 ease-out"
      style={{ transform: oculto ? "translateY(-120%)" : "translateY(0)" }}
    >
      {pasos.map((paso, i) => {
        const activo = vista === paso.clave;
        const color = paso.completado
          ? PALETA.oliva
          : activo
          ? PALETA.navy
          : "#d1d5db";
        const esUltimo = i === pasos.length - 1;

        return (
          <div
            key={paso.clave}
            className="flex items-center"
            style={{ flex: esUltimo ? "0 0 auto" : "1 1 0%" }}
          >
            <button
              onClick={() => !paso.bloqueado && onNavegar(paso.clave)}
              disabled={paso.bloqueado}
              className="flex flex-col items-center gap-1.5 shrink-0 disabled:cursor-not-allowed"
            >
              <span
                className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {paso.completado ? "✓" : paso.numero}
              </span>
              <span
                className="text-xs font-semibold whitespace-nowrap"
                style={{ color: paso.bloqueado ? "#9ca3af" : "#111827" }}
              >
                {paso.nombre}
              </span>
            </button>

            {!esUltimo && (
              <div
                className="flex-1 h-px mx-3 mt-3.5"
                style={{
                  backgroundColor: paso.completado ? PALETA.oliva : "#d1d5db",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
