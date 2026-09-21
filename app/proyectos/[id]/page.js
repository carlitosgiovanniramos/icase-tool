"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { pedirJson } from "@/lib/pedirJson";
import mermaid from "mermaid";
import MockupsGenerator from "./MockupsGenerator";
import AnalisisResultado from "./AnalisisResultado";
import DiagramaBox from "./DiagramaBox";
import { useAlert } from "../../AlertProvider";
import { PALETA } from "../../estilos";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { htmlLabels: true, wrappingWidth: 220 },
});

export default function WorkspaceProyecto() {
  const { id } = useParams();
  const { mostrarError } = useAlert();
  const [proyecto, setProyecto] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [diagramaSvg, setDiagramaSvg] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoDiagrama, setCargandoDiagrama] = useState(false);
  const [diagramaArqSvg, setDiagramaArqSvg] = useState(null);
  const [cargandoArquitectura, setCargandoArquitectura] = useState(false);
  const [diagramaErSvg, setDiagramaErSvg] = useState(null);
  const [cargandoEr, setCargandoEr] = useState(false);
  const [arbolSvg, setArbolSvg] = useState(null);
  const [cargandoArbol, setCargandoArbol] = useState(false);
  const [mockupsListos, setMockupsListos] = useState(false);

  useEffect(() => {
    async function cargarProyecto() {
      const { data } = await supabase
        .from("proyectos")
        .select("*")
        .eq("id", id)
        .single();
      setProyecto(data);
      if (data?.analisis) setResultado(data.analisis);
      if (data?.mockups) setMockupsListos(true);
      if (data?.diagrama_casos_uso) {
        renderizarDiagrama(data.diagrama_casos_uso);
      }
      if (data?.diagrama_arquitectura) {
        const svgArq = await renderizarComoImagen(data.diagrama_arquitectura);
        setDiagramaArqSvg(svgArq);
      }
      if (data?.diagrama_er) {
        const svgEr = await renderizarComoImagen(data.diagrama_er);
        setDiagramaErSvg(svgEr);
      }
      if (data?.arbol_navegacion) {
        const svgArbol = await renderizarComoImagen(data.arbol_navegacion);
        setArbolSvg(svgArbol);
      }
    }
    cargarProyecto();
  }, [id]);

  async function renderizarDiagrama(codigo) {
    try {
      await document.fonts.ready;
      const { svg } = await mermaid.render(
        "diagrama-" + Date.now(),
        codigo
      );
      setDiagramaSvg(svg);
    } catch (err) {
      console.error("Error renderizando diagrama:", err);
    }
  }

  async function renderizarComoImagen(codigo) {
    await document.fonts.ready;
    const { svg } = await mermaid.render("diagrama-arq-" + Date.now(), codigo);
    return svg;
  }

  async function generarAnalisis() {
    setCargando(true);
    try {
      const data = await pedirJson("/api/generar-analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: proyecto.prompt,
          documentoTexto: proyecto.documento_texto,
          imagenUrl: proyecto.imagen_url,
        }),
      });

      if (data.error) {
        mostrarError(data.error, "Error al generar el análisis");
        return;
      }

      setResultado(data);
      await supabase.from("proyectos").update({ analisis: data }).eq("id", id);
    } catch (err) {
      mostrarError(err.message, "Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  async function generarCasosUso() {
    setCargandoDiagrama(true);
    try {
      const data = await pedirJson("/api/generar-casos-uso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analisis: resultado }),
      });

      if (data.error) {
        mostrarError(data.error, "Error al generar el diagrama de casos de uso");
        return;
      }

      await renderizarDiagrama(data.diagrama_mermaid);
      await supabase
        .from("proyectos")
        .update({ diagrama_casos_uso: data.diagrama_mermaid })
        .eq("id", id);
    } catch (err) {
      mostrarError(err.message, "Error de conexión");
    } finally {
      setCargandoDiagrama(false);
    }
  }

  async function generarArquitectura() {
    setCargandoArquitectura(true);
    try {
      const data = await pedirJson("/api/generar-arquitectura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analisis: resultado }),
      });

      if (data.error) {
        mostrarError(data.error, "Error al generar el diagrama de arquitectura");
        return;
      }

      const svg = await renderizarComoImagen(data.diagrama_mermaid);
      setDiagramaArqSvg(svg);

      await supabase
        .from("proyectos")
        .update({ diagrama_arquitectura: data.diagrama_mermaid })
        .eq("id", id);
    } catch (err) {
      mostrarError(err.message, "Error de conexión");
    } finally {
      setCargandoArquitectura(false);
    }
  }

  async function generarDiagramaEr() {
    setCargandoEr(true);
    try {
      const data = await pedirJson("/api/generar-diagrama-er", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analisis: resultado }),
      });

      if (data.error) {
        mostrarError(data.error, "Error al generar el diagrama entidad-relación");
        return;
      }

      const svg = await renderizarComoImagen(data.diagrama_mermaid);
      setDiagramaErSvg(svg);

      await supabase
        .from("proyectos")
        .update({ diagrama_er: data.diagrama_mermaid })
        .eq("id", id);
    } catch (err) {
      mostrarError(err.message, "Error de conexión");
    } finally {
      setCargandoEr(false);
    }
  }

  async function generarArbol() {
    setCargandoArbol(true);
    try {
      const data = await pedirJson("/api/generar-arbol-navegacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analisis: resultado }),
      });

      if (data.error) {
        mostrarError(data.error, "Error al generar el árbol de navegación");
        return;
      }

      const svg = await renderizarComoImagen(data.diagrama_mermaid);
      setArbolSvg(svg);

      await supabase
        .from("proyectos")
        .update({ arbol_navegacion: data.diagrama_mermaid })
        .eq("id", id);
    } catch (err) {
      mostrarError(err.message, "Error de conexión");
    } finally {
      setCargandoArbol(false);
    }
  }

  async function eliminarAnalisis() {
    if (!confirm("¿Eliminar los actores y requerimientos generados? También se eliminará el diagrama de casos de uso.")) return;

    setResultado(null);
    setDiagramaSvg(null);
    await supabase
      .from("proyectos")
      .update({ analisis: null, diagrama_casos_uso: null })
      .eq("id", id);
  }

  async function eliminarDiagrama() {
    if (!confirm("¿Eliminar el diagrama de casos de uso?")) return;

    setDiagramaSvg(null);
    await supabase
      .from("proyectos")
      .update({ diagrama_casos_uso: null })
      .eq("id", id);
  }

  async function eliminarArquitectura() {
    if (!confirm("¿Eliminar el diagrama de arquitectura?")) return;

    setDiagramaArqSvg(null);
    await supabase
      .from("proyectos")
      .update({ diagrama_arquitectura: null })
      .eq("id", id);
  }

  async function eliminarDiagramaEr() {
    if (!confirm("¿Eliminar el diagrama entidad-relación?")) return;

    setDiagramaErSvg(null);
    await supabase
      .from("proyectos")
      .update({ diagrama_er: null })
      .eq("id", id);
  }

  async function eliminarArbol() {
    if (!confirm("¿Eliminar el árbol de navegación?")) return;

    setArbolSvg(null);
    await supabase
      .from("proyectos")
      .update({ arbol_navegacion: null })
      .eq("id", id);
  }

  if (!proyecto) return <p>Cargando...</p>;

  return (
    <div>
      <header
        className="mb-8 bg-white border border-gray-300 p-6"
        style={{ borderLeft: `4px solid ${PALETA.negro}` }}
      >
        <span
          className="inline-block text-xs font-bold tracking-widest uppercase px-2 py-1 mb-3 text-white"
          style={{ backgroundColor: PALETA.negro }}
        >
          Proyecto
        </span>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {proyecto.nombre}
        </h1>
        <p className="text-gray-600 leading-relaxed">
          {proyecto.prompt}
        </p>
      </header>

      {/* ===================== ANÁLISIS ===================== */}
      <section className="bg-white border border-gray-300">
        <div
          className="flex items-baseline gap-3 px-6 py-4"
          style={{ backgroundColor: PALETA.navy }}
        >
          <span className="text-xs font-bold tracking-widest uppercase text-white/60">
            Fase 01
          </span>
          <h2 className="text-2xl font-bold text-white">Análisis</h2>
        </div>

        <div className="p-6">
        <div className="flex items-center gap-2">
          <button
            onClick={generarAnalisis}
            disabled={cargando}
            style={{ backgroundColor: PALETA.navy }}
            className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
          >
            {cargando ? "Generando..." : "Generar actores y requerimientos"}
          </button>

          {resultado && (
            <button
              onClick={eliminarAnalisis}
              title="Eliminar actores y requerimientos"
              style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
              className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
            >
              Eliminar
            </button>
          )}
        </div>

        {resultado && (
          <>
            <AnalisisResultado resultado={resultado} />

            <div className="mt-8 pt-6 border-t-2 border-gray-200 flex items-center gap-2">
              <span
                className="w-2 h-2 shrink-0"
                style={{ backgroundColor: PALETA.navy }}
              />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Diagrama de casos de uso
              </h3>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={generarCasosUso}
                disabled={cargandoDiagrama}
                style={{ backgroundColor: PALETA.negro }}
                className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
              >
                {cargandoDiagrama ? "Generando diagrama..." : "Generar diagrama de casos de uso"}
              </button>

              {diagramaSvg && (
                <button
                  onClick={eliminarDiagrama}
                  title="Eliminar diagrama de casos de uso"
                  style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
                  className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
                >
                  Eliminar
                </button>
              )}
            </div>
          </>
        )}

        <DiagramaBox
          svg={diagramaSvg}
          titulo="Diagrama de casos de uso"
          nombreArchivo="diagrama-casos-de-uso"
        />
        </div>
      </section>

      {/* ===================== DISEÑO ===================== */}
      {diagramaSvg && (
        <section className="mt-8 bg-white border border-gray-300">
          <div
            className="flex items-baseline gap-3 px-6 py-4"
            style={{ backgroundColor: PALETA.naranjaOscuro }}
          >
            <span className="text-xs font-bold tracking-widest uppercase text-white/60">
              Fase 02
            </span>
            <h2 className="text-2xl font-bold text-white">Diseño</h2>
          </div>

          <div className="p-6">
            {/* --- Diagrama entidad-relación --- */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 shrink-0"
                style={{ backgroundColor: PALETA.naranjaOscuro }}
              />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Diagrama entidad-relación
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={generarDiagramaEr}
                disabled={cargandoEr}
                style={{ backgroundColor: PALETA.naranjaOscuro }}
                className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
              >
                {cargandoEr ? "Generando..." : "Generar diagrama entidad-relación"}
              </button>

              {diagramaErSvg && (
                <button
                  onClick={eliminarDiagramaEr}
                  title="Eliminar diagrama entidad-relación"
                  style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
                  className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
                >
                  Eliminar
                </button>
              )}
            </div>

            <DiagramaBox
              svg={diagramaErSvg}
              titulo="Diagrama entidad-relación"
              nombreArchivo="diagrama-entidad-relacion"
            />

            {/* --- Prototipo de pantallas --- */}
            {diagramaErSvg && (
              <>
                <div className="mt-8 pt-6 border-t-2 border-gray-200 flex items-center gap-2 mb-3">
                  <span
                    className="w-2 h-2 shrink-0"
                    style={{ backgroundColor: PALETA.naranjaOscuro }}
                  />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prototipo de pantallas
                  </h3>
                </div>

                <MockupsGenerator
                  proyectoId={id}
                  analisis={resultado}
                  mockupsIniciales={proyecto?.mockups}
                  onMockupsChange={(m) => setMockupsListos(!!m)}
                />
              </>
            )}

            {/* --- Árbol de navegación --- */}
            {mockupsListos && (
              <>
                <div className="mt-8 pt-6 border-t-2 border-gray-200 flex items-center gap-2 mb-3">
                  <span
                    className="w-2 h-2 shrink-0"
                    style={{ backgroundColor: PALETA.naranjaOscuro }}
                  />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Árbol de navegación
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={generarArbol}
                    disabled={cargandoArbol}
                    style={{ backgroundColor: PALETA.naranjaOscuro }}
                    className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
                  >
                    {cargandoArbol ? "Generando..." : "Generar árbol de navegación"}
                  </button>

                  {arbolSvg && (
                    <button
                      onClick={eliminarArbol}
                      title="Eliminar árbol de navegación"
                      style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
                      className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <DiagramaBox
                  svg={arbolSvg}
                  titulo="Árbol de navegación"
                  nombreArchivo="arbol-de-navegacion"
                />
              </>
            )}

            {/* --- Diagrama de arquitectura --- */}
            {arbolSvg && (
              <>
                <div className="mt-8 pt-6 border-t-2 border-gray-200 flex items-center gap-2 mb-3">
                  <span
                    className="w-2 h-2 shrink-0"
                    style={{ backgroundColor: PALETA.naranjaOscuro }}
                  />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Diagrama de arquitectura
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={generarArquitectura}
                    disabled={cargandoArquitectura}
                    style={{ backgroundColor: PALETA.naranjaOscuro }}
                    className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
                  >
                    {cargandoArquitectura ? "Generando..." : "Generar diagrama de arquitectura"}
                  </button>

                  {diagramaArqSvg && (
                    <button
                      onClick={eliminarArquitectura}
                      title="Eliminar diagrama de arquitectura"
                      style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
                      className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <DiagramaBox
                  svg={diagramaArqSvg}
                  titulo="Diagrama de arquitectura"
                  nombreArchivo="diagrama-arquitectura"
                />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}