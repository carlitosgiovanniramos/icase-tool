"use client";

import { useEffect, useState } from "react";
import { PALETA } from "./estilos";

// Los diagramas usan <foreignObject> (HTML dentro del SVG) para que el texto
// no se corte. Eso hace que cualquier <canvas> dibujado a partir de la imagen
// quede "tainted" (bloqueado por seguridad del navegador) y no se pueda
// exportar a PNG, sin excepción. Por eso se descarga el SVG directamente.
function descargarComoSvg(svgString, nombreArchivo) {
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(svgBlob);
  enlace.download = `${nombreArchivo}.svg`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function BotonAccion({ onClick, children, invertido }) {
  return (
    <button
      onClick={onClick}
      style={
        invertido
          ? { borderColor: "white", color: "white" }
          : { borderColor: PALETA.navy, color: PALETA.navy }
      }
      className={`border bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
        invertido ? "hover:bg-white/10" : "hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function DiagramaBox({ svg, titulo, nombreArchivo }) {
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (!expandido) return;
    function alTecla(e) {
      if (e.key === "Escape") setExpandido(false);
    }
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [expandido]);

  if (!svg) return null;

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-end gap-2 mb-2">
          <BotonAccion onClick={() => setExpandido(true)}>Expandir</BotonAccion>
          <BotonAccion onClick={() => descargarComoSvg(svg, nombreArchivo)}>
            Descargar SVG
          </BotonAccion>
        </div>

        <div
          onClick={() => setExpandido(true)}
          className="border border-gray-300 p-4 overflow-auto flex justify-center [&_svg]:max-w-none bg-white cursor-zoom-in"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {expandido && (
        <div
          className="fixed inset-0 bg-white z-50 flex flex-col"
          onClick={() => setExpandido(false)}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <h3 className="text-gray-900 font-semibold">{titulo}</h3>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <BotonAccion onClick={() => descargarComoSvg(svg, nombreArchivo)}>
                Descargar SVG
              </BotonAccion>
              <BotonAccion onClick={() => setExpandido(false)}>
                Cerrar ✕
              </BotonAccion>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-6 [&_svg]:max-w-none"
            onClick={(e) => e.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </>
  );
}
