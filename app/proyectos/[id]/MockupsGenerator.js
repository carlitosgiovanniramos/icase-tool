"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { pedirJson } from "@/lib/pedirJson";
import { useAlert } from "../../AlertProvider";
import { PALETA } from "../../estilos";

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

export default function MockupsGenerator({
  proyectoId,
  analisis,
  mockupsIniciales,
  onMockupsChange,
}) {
  const [cantidad, setCantidad] = useState(4);
  const [mockups, setMockups] = useState(null);
  const [pestañaActiva, setPestañaActiva] = useState(0);
  const [cargando, setCargando] = useState(null); // "wireframe" | "mockup" | null
  const { mostrarError } = useAlert();

  useEffect(() => {
    if (mockupsIniciales) setMockups(mockupsIniciales);
  }, [mockupsIniciales]);

  useEffect(() => {
    onMockupsChange?.(mockups);
  }, [mockups]);

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

  async function generar(modo) {
    setCargando(modo);
    try {
      const data = await pedirJson("/api/generar-mockups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analisis,
          cantidad: Number(cantidad) || 4,
          modo,
        }),
      });

      if (data.error) {
        mostrarError(data.error, "Error al generar el prototipo");
        return;
      }

      setMockups(data.pantallas);
      setPestañaActiva(0);
      await supabase
        .from("proyectos")
        .update({ mockups: data.pantallas })
        .eq("id", proyectoId);
    } catch (err) {
      mostrarError(err.message, "Error de conexión");
    } finally {
      setCargando(null);
    }
  }

  async function eliminarMockups() {
    if (!confirm("¿Eliminar los mockups generados?")) return;

    setMockups(null);
    await supabase
      .from("proyectos")
      .update({ mockups: null })
      .eq("id", proyectoId);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 flex-wrap">
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

      <div className="flex items-center gap-2 flex-wrap mt-3">
        <button
          onClick={() => generar("wireframe")}
          disabled={!!cargando}
          style={{ backgroundColor: PALETA.oliva }}
          className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
        >
          {cargando === "wireframe" ? "Generando wireframe..." : "Generar wireframe"}
        </button>

        <button
          onClick={() => generar("mockup")}
          disabled={!!cargando}
          style={{ backgroundColor: PALETA.carmesi }}
          className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
        >
          {cargando === "mockup" ? "Generando mockup..." : "Generar mockup completo"}
        </button>

        {mockups && (
          <button
            onClick={eliminarMockups}
            title="Eliminar mockups"
            style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
            className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
          >
            Eliminar
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
    </div>
  );
}
