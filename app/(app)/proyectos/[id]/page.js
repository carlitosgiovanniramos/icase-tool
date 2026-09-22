"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pedirJson } from "@/lib/pedirJson";
import mermaid from "mermaid";
import MockupsGenerator from "./MockupsGenerator";
import AnalisisResultado from "./AnalisisResultado";
import DiagramaBox from "./DiagramaBox";
import FaseStepper from "./FaseStepper";
import FaseIndice from "./FaseIndice";
import { useAlert } from "../../../AlertProvider";
import { PALETA } from "../../../estilos";

function BotonAprobar({ aprobado, onClick, etiqueta }) {
  if (aprobado) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
        style={{ color: PALETA.oliva }}
      >
        ✓ {etiqueta} aprobado
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: PALETA.oliva }}
      className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
    >
      Aprobar {etiqueta}
    </button>
  );
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { htmlLabels: true, wrappingWidth: 220 },
});

export default function WorkspaceProyecto() {
  const [supabase] = useState(() => createClient());
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
  const [fasesAprobadas, setFasesAprobadas] = useState({});
  const [vista, setVista] = useState("resumen"); // "resumen" | "analisis" | "diseno"

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
      if (data?.fases_aprobadas) setFasesAprobadas(data.fases_aprobadas);
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
  }, [id, supabase]);

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

  async function aprobarFase(clave) {
    const actualizado = { ...fasesAprobadas, [clave]: true };
    setFasesAprobadas(actualizado);
    await supabase
      .from("proyectos")
      .update({ fases_aprobadas: actualizado })
      .eq("id", id);
  }

  async function resetearAprobaciones(...claves) {
    const actualizado = { ...fasesAprobadas };
    claves.forEach((c) => {
      actualizado[c] = false;
    });
    setFasesAprobadas(actualizado);
    await supabase
      .from("proyectos")
      .update({ fases_aprobadas: actualizado })
      .eq("id", id);
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
    await resetearAprobaciones(
      "analisis",
      "diseno_er",
      "diseno_prototipo",
      "diseno_arbol",
      "diseno_arquitectura"
    );
  }

  async function eliminarDiagrama() {
    if (!confirm("¿Eliminar el diagrama de casos de uso?")) return;

    setDiagramaSvg(null);
    await supabase
      .from("proyectos")
      .update({ diagrama_casos_uso: null })
      .eq("id", id);
    await resetearAprobaciones("analisis");
  }

  async function eliminarArquitectura() {
    if (!confirm("¿Eliminar el diagrama de arquitectura?")) return;

    setDiagramaArqSvg(null);
    await supabase
      .from("proyectos")
      .update({ diagrama_arquitectura: null })
      .eq("id", id);
    await resetearAprobaciones("diseno_arquitectura");
  }

  async function eliminarDiagramaEr() {
    if (!confirm("¿Eliminar el diagrama entidad-relación?")) return;

    setDiagramaErSvg(null);
    await supabase
      .from("proyectos")
      .update({ diagrama_er: null })
      .eq("id", id);
    await resetearAprobaciones(
      "diseno_er",
      "diseno_prototipo",
      "diseno_arbol",
      "diseno_arquitectura"
    );
  }

  async function eliminarArbol() {
    if (!confirm("¿Eliminar el árbol de navegación?")) return;

    setArbolSvg(null);
    await supabase
      .from("proyectos")
      .update({ arbol_navegacion: null })
      .eq("id", id);
    await resetearAprobaciones("diseno_arbol", "diseno_arquitectura");
  }

  if (!proyecto) return <p>Cargando...</p>;

  const faseActual = !fasesAprobadas.analisis
    ? "analisis"
    : !fasesAprobadas.diseno_arquitectura
    ? "diseno"
    : null;

  return (
    <div>
      {vista === "resumen" && (
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
      )}

      {vista !== "resumen" && (
        <FaseStepper
          fasesAprobadas={fasesAprobadas}
          vista={vista}
          onNavegar={setVista}
        />
      )}

      {vista === "resumen" && (
        <div>
          {!faseActual && (
            <p
              className="mb-4 text-sm font-semibold"
              style={{ color: PALETA.oliva }}
            >
              ✓ Todas las fases completadas
            </p>
          )}

          <FaseIndice fasesAprobadas={fasesAprobadas} onNavegar={setVista} />
        </div>
      )}

      {/* ===================== ANÁLISIS ===================== */}
      {vista === "analisis" && (
      <section className="bg-white border border-gray-300">
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ backgroundColor: PALETA.navy }}
        >
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-bold tracking-widest uppercase text-white/60">
              Fase 01
            </span>
            <h2 className="text-2xl font-bold text-white">Análisis</h2>
          </div>
          <div className="flex items-center gap-4">
            {fasesAprobadas.analisis && (
              <button
                onClick={() => setVista("diseno")}
                className="border border-white text-white px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
              >
                Continuar a Diseño →
              </button>
            )}
            <button
              onClick={() => setVista("resumen")}
              className="text-white/70 hover:text-white text-sm font-semibold"
            >
              ← Volver
            </button>
          </div>
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

        {diagramaSvg && (
          <div className="mt-6 pt-6 border-t-2 border-gray-200 flex items-center gap-3">
            <BotonAprobar
              aprobado={!!fasesAprobadas.analisis}
              onClick={() => aprobarFase("analisis")}
              etiqueta="Análisis"
            />

            {fasesAprobadas.analisis && (
              <button
                onClick={() => setVista("diseno")}
                style={{ backgroundColor: PALETA.navy }}
                className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
              >
                Continuar a Diseño →
              </button>
            )}
          </div>
        )}
        </div>
      </section>
      )}

      {/* ===================== DISEÑO ===================== */}
      {vista === "diseno" && fasesAprobadas.analisis && (
        <section className="bg-white border border-gray-300">
          <div
            className="flex items-center justify-between gap-3 px-6 py-4"
            style={{ backgroundColor: PALETA.naranjaOscuro }}
          >
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-bold tracking-widest uppercase text-white/60">
                Fase 02
              </span>
              <h2 className="text-2xl font-bold text-white">Diseño</h2>
            </div>
            <button
              onClick={() => setVista("resumen")}
              className="text-white/70 hover:text-white text-sm font-semibold"
            >
              ← Volver
            </button>
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

            {diagramaErSvg && (
              <div className="mt-4">
                <BotonAprobar
                  aprobado={!!fasesAprobadas.diseno_er}
                  onClick={() => aprobarFase("diseno_er")}
                  etiqueta="Diagrama entidad-relación"
                />
              </div>
            )}

            {/* --- Prototipo de pantallas --- */}
            {fasesAprobadas.diseno_er && (
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
                  onMockupsChange={(m) => {
                    setMockupsListos(!!m);
                    if (!m) resetearAprobaciones("diseno_prototipo", "diseno_arbol", "diseno_arquitectura");
                  }}
                />

                {mockupsListos && (
                  <div className="mt-4">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_prototipo}
                      onClick={() => aprobarFase("diseno_prototipo")}
                      etiqueta="Prototipo"
                    />
                  </div>
                )}
              </>
            )}

            {/* --- Árbol de navegación --- */}
            {fasesAprobadas.diseno_prototipo && (
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

                {arbolSvg && (
                  <div className="mt-4">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_arbol}
                      onClick={() => aprobarFase("diseno_arbol")}
                      etiqueta="Árbol de navegación"
                    />
                  </div>
                )}
              </>
            )}

            {/* --- Diagrama de arquitectura --- */}
            {fasesAprobadas.diseno_arbol && (
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

                {diagramaArqSvg && (
                  <div className="mt-4 flex items-center gap-3">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_arquitectura}
                      onClick={() => aprobarFase("diseno_arquitectura")}
                      etiqueta="Diagrama de arquitectura"
                    />

                    {fasesAprobadas.diseno_arquitectura && (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: PALETA.oliva }}
                      >
                        ✓ Proyecto completado
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}