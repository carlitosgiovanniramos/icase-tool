"use client";

import { useEffect, useState } from "react";
import { useBloqueoModal } from "../../../useBloqueoModal";
import { PALETA } from "../../../estilos";

const SCRIPT_INTERCEPTAR_NAVEGACION = `
<script>
document.addEventListener("click", function (e) {
  const link = e.target.closest("a");
  if (!link) return;
  e.preventDefault();
  const texto = (link.innerText || link.textContent || "").trim();
  try {
    window.parent.postMessage({ tipo: "mockup-navegar", texto }, "*");
  } catch (err) {}
}, true);
</script>`;

function conNavegacionInterceptada(html) {
  if (!html) return html;
  return html.includes("</body>")
    ? html.replace("</body>", SCRIPT_INTERCEPTAR_NAVEGACION + "</body>")
    : html + SCRIPT_INTERCEPTAR_NAVEGACION;
}

function limpiarTexto(txt) {
  return (txt || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim();
}

function pantallaQueCoincide(mockups, textoLink) {
  const palabras = limpiarTexto(textoLink)
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (!palabras.length) return -1;

  return mockups.findIndex((p) => {
    const nombre = limpiarTexto(p.nombre);
    return palabras.some((w) => nombre.includes(w));
  });
}

// La generación y el guardado viven en la página (para que la cascada pueda regenerar el
// prototipo); este componente solo muestra las pantallas y avisa con onGenerar / onEliminar.
export default function MockupsGenerator({
  mockups,
  cargando, // "wireframe" | "mockup" | null
  deshabilitado,
  bloqueado, // prototipo aprobado: solo se pueden ver las pantallas
  onGenerar,
  onEliminar,
}) {
  const [cantidad, setCantidad] = useState(mockups?.length || 4);
  const [pestañaElegida, setPestañaActiva] = useState(0);
  const [expandido, setExpandido] = useState(false);

  useBloqueoModal(expandido, () => setExpandido(false));

  // Al regenerarse (a mano o en cascada) puede haber menos pantallas que la pestaña elegida.
  const pestañaActiva = Math.min(pestañaElegida, Math.max((mockups?.length ?? 1) - 1, 0));

  useEffect(() => {
    if (!mockups) return;

    function alRecibirMensaje(event) {
      if (event.data?.tipo !== "mockup-navegar") return;
      const idx = pantallaQueCoincide(mockups, event.data.texto);
      if (idx !== -1) setPestañaActiva(idx);
    }

    window.addEventListener("message", alRecibirMensaje);
    return () => window.removeEventListener("message", alRecibirMensaje);
  }, [mockups]);

  const generar = (modo) => onGenerar(modo, Number(cantidad) || 4);

  return (
    <div className="mt-6">
      {!bloqueado && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <label className="text-sm text-gray-500">
            Cantidad de pantallas principales
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-20 border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`flex items-center gap-2 flex-wrap ${bloqueado ? "hidden" : ""}`}>
          <button
            onClick={() => generar("wireframe")}
            disabled={deshabilitado}
            style={{ backgroundColor: PALETA.oliva }}
            className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
          >
            {cargando === "wireframe" ? "Generando wireframe..." : "Generar wireframe"}
          </button>

          <button
            onClick={() => generar("mockup")}
            disabled={deshabilitado}
            style={{ backgroundColor: PALETA.carmesi }}
            className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
          >
            {cargando === "mockup" ? "Generando mockup..." : "Generar mockup completo"}
          </button>

          {mockups && (
            <button
              onClick={onEliminar}
              disabled={deshabilitado}
              title="Eliminar mockups"
              style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
              className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
            >
              Eliminar
            </button>
          )}
        </div>

        {mockups && (
          <button
            onClick={() => setExpandido(true)}
            title="Expandir"
            style={{ borderColor: PALETA.navy, color: PALETA.navy }}
            className="border bg-transparent hover:bg-gray-50 px-3 py-2 text-sm"
          >
            Expandir
          </button>
        )}
      </div>

      {mockups && (
        <div className="mt-4">
          <div className="flex gap-2 border-b border-gray-300 mb-4 overflow-x-auto">
            {mockups.map((pantalla, i) => (
              <button
                key={i}
                onClick={() => setPestañaActiva(i)}
                style={
                  pestañaActiva === i
                    ? { borderColor: PALETA.navy, color: PALETA.navy }
                    : undefined
                }
                className={`px-4 py-2 whitespace-nowrap border-b-2 ${
                  pestañaActiva === i
                    ? "font-semibold"
                    : "text-gray-500 border-transparent"
                }`}
              >
                {pantalla.nombre}
              </button>
            ))}
          </div>

          <iframe
            srcDoc={conNavegacionInterceptada(mockups[pestañaActiva]?.html)}
            className="w-full h-[600px] border border-gray-300"
            title="Mockup"
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
          />
        </div>
      )}

      {expandido && mockups && (
        <div
          className="fixed inset-0 bg-white z-50 flex flex-col"
          onClick={() => setExpandido(false)}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
            <div
              className="flex gap-2 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {mockups.map((pantalla, i) => (
                <button
                  key={i}
                  onClick={() => setPestañaActiva(i)}
                  style={
                    pestañaActiva === i
                      ? { borderColor: PALETA.navy, color: PALETA.navy }
                      : undefined
                  }
                  className={`px-3 py-1.5 text-sm whitespace-nowrap border-b-2 ${
                    pestañaActiva === i
                      ? "font-semibold"
                      : "text-gray-500 border-transparent"
                  }`}
                >
                  {pantalla.nombre}
                </button>
              ))}
            </div>

            <button
              onClick={() => setExpandido(false)}
              style={{ borderColor: PALETA.navy, color: PALETA.navy }}
              className="shrink-0 border bg-transparent hover:bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              Cerrar ✕
            </button>
          </div>

          <div
            className="flex-1 p-6 bg-gray-50"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              srcDoc={conNavegacionInterceptada(mockups[pestañaActiva]?.html)}
              className="w-full h-full border border-gray-300 bg-white"
              title="Mockup expandido"
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
}
