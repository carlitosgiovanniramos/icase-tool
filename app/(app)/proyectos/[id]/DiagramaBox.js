"use client";

import { useEffect, useRef, useState } from "react";
import { PALETA } from "../../../estilos";

function extraerDimensiones(svgString) {
  const match = svgString?.match(
    /viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)"/
  );
  if (match) return { width: parseFloat(match[1]), height: parseFloat(match[2]) };
  return { width: 1200, height: 800 };
}

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

function Pestana({ activa, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={activa ? { backgroundColor: PALETA.navy, borderColor: PALETA.navy } : undefined}
      className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
        activa ? "text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

// Vista de código Mermaid con vista previa en vivo. Si el paso no es editable (aprobado o con
// una generación en curso), el código se puede ver pero no modificar.
function EditorCodigo({ codigo, editable, renderizar, onGuardar }) {
  // El borrador guarda contra qué código se empezó a editar: si el diagrama se regenera
  // mientras tanto, el borrador viejo se descarta solo.
  const [borrador, setBorrador] = useState(null); // { base, texto }
  const [vista, setVista] = useState({ svg: null, error: null });
  const [guardando, setGuardando] = useState(false);

  const texto = borrador?.base === codigo ? borrador.texto : codigo;
  const modificado = texto !== codigo;

  // Vista previa: se vuelve a dibujar un momento después de dejar de escribir.
  useEffect(() => {
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      try {
        const svg = await renderizar(texto);
        if (!cancelado) setVista({ svg, error: null });
      } catch (err) {
        if (!cancelado) setVista((v) => ({ svg: v.svg, error: err.message || String(err) }));
      }
    }, 500);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [texto, renderizar]);

  async function guardar() {
    setGuardando(true);
    try {
      // onGuardar devuelve false si no se pudo guardar: el borrador se conserva.
      if ((await onGuardar(texto)) !== false) setBorrador(null);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <textarea
          value={texto}
          onChange={(e) => setBorrador({ base: codigo, texto: e.target.value })}
          readOnly={!editable}
          spellCheck={false}
          className={`w-full h-[480px] border border-gray-300 p-3 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:border-gray-900 ${
            editable ? "bg-white" : "bg-gray-50 text-gray-600"
          }`}
        />
        <div className="border border-gray-300 h-[480px] overflow-auto bg-white flex flex-col">
          {vista.error && (
            <p
              className="text-xs font-mono px-3 py-2 border-b border-gray-200 whitespace-pre-wrap"
              style={{ color: PALETA.carmesi }}
            >
              {vista.error}
            </p>
          )}
          {vista.svg && (
            <div
              className={`flex-1 p-4 flex justify-center [&_svg]:max-w-none ${
                vista.error ? "opacity-40" : ""
              }`}
              dangerouslySetInnerHTML={{ __html: vista.svg }}
            />
          )}
        </div>
      </div>

      {editable ? (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={guardar}
            disabled={!modificado || !!vista.error || guardando}
            style={{ backgroundColor: PALETA.navy }}
            className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          {modificado && (
            <button
              onClick={() => setBorrador(null)}
              disabled={guardando}
              className="border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Descartar
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mt-2">Solo lectura. Pulsa Editar para modificarlo.</p>
      )}
    </div>
  );
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_PASO = 0.25;

const MARGEN_CONTENEDOR = 48; // padding p-6 (24px) en cada lado

// codigo / renderizar / onGuardarCodigo / editable son opcionales: con ellos aparece la
// pestaña "Código" para ver y modificar el Mermaid del diagrama.
export default function DiagramaBox({
  svg,
  titulo,
  nombreArchivo,
  codigo,
  renderizar,
  onGuardarCodigo,
  editable,
}) {
  const [modo, setModo] = useState("diagrama"); // "diagrama" | "codigo"
  const [expandido, setExpandido] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dimAjuste, setDimAjuste] = useState(null); // {width, height} en px, ya ajustado al contenedor
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (!expandido) return;

    setZoom(1);

    // Se mide después de que el modal ya está en el DOM y tiene tamaño real.
    const id = requestAnimationFrame(() => {
      const cont = contenedorRef.current;
      if (!cont) return;
      const { width: vw, height: vh } = extraerDimensiones(svg);
      const disponibleW = cont.clientWidth - MARGEN_CONTENEDOR;
      const disponibleH = cont.clientHeight - MARGEN_CONTENEDOR;
      const escala = Math.min(disponibleW / vw, disponibleH / vh, 1) || 1;
      setDimAjuste({ width: vw * escala, height: vh * escala });
    });

    function alTecla(e) {
      if (e.key === "Escape") setExpandido(false);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_PASO).toFixed(2)));
      if (e.key === "-") setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_PASO).toFixed(2)));
    }
    window.addEventListener("keydown", alTecla);

    // Bloquea el scroll del fondo mientras el modal está abierto, para que
    // la página no se mueva del sitio donde estábamos al cerrarlo.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", alTecla);
      document.body.style.overflow = overflowPrevio;
      setDimAjuste(null);
    };
  }, [expandido]);

  if (!svg) return null;

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1">
            {codigo && renderizar && (
              <>
                <Pestana activa={modo === "diagrama"} onClick={() => setModo("diagrama")}>
                  Diagrama
                </Pestana>
                <Pestana activa={modo === "codigo"} onClick={() => setModo("codigo")}>
                  Código
                </Pestana>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <BotonAccion onClick={() => setExpandido(true)}>Expandir</BotonAccion>
            <BotonAccion onClick={() => descargarComoSvg(svg, nombreArchivo)}>
              Descargar SVG
            </BotonAccion>
          </div>
        </div>

        {modo === "codigo" && codigo && renderizar ? (
          <EditorCodigo
            codigo={codigo}
            editable={editable && !!onGuardarCodigo}
            renderizar={renderizar}
            onGuardar={onGuardarCodigo}
          />
        ) : (
          <div
            onClick={() => setExpandido(true)}
            className="border border-gray-300 p-4 overflow-auto flex justify-center [&_svg]:max-w-none bg-white cursor-zoom-in"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
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
              <div className="flex items-center border" style={{ borderColor: PALETA.navy }}>
                <button
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_PASO).toFixed(2)))}
                  title="Alejar"
                  style={{ color: PALETA.navy }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-lg font-bold"
                >
                  −
                </button>
                <span
                  className="text-xs font-semibold w-14 text-center border-x"
                  style={{ color: PALETA.navy, borderColor: PALETA.navy }}
                >
                  🔍 {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_PASO).toFixed(2)))}
                  title="Acercar"
                  style={{ color: PALETA.navy }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-lg font-bold"
                >
                  +
                </button>
              </div>

              <BotonAccion onClick={() => setZoom(1)}>Ajustar</BotonAccion>
              <BotonAccion onClick={() => descargarComoSvg(svg, nombreArchivo)}>
                Descargar SVG
              </BotonAccion>
              <BotonAccion onClick={() => setExpandido(false)}>
                Cerrar ✕
              </BotonAccion>
            </div>
          </div>
          <div
            ref={contenedorRef}
            className="flex-1 overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              if (!e.ctrlKey) return;
              e.preventDefault();
              setZoom((z) =>
                Math.min(
                  ZOOM_MAX,
                  Math.max(ZOOM_MIN, +(z - Math.sign(e.deltaY) * ZOOM_PASO).toFixed(2))
                )
              );
            }}
          >
            {dimAjuste && (
              <div
                className="[&_svg]:block [&_svg]:w-full [&_svg]:h-full"
                style={{
                  width: dimAjuste.width * zoom,
                  height: dimAjuste.height * zoom,
                  margin: "0 auto",
                  transition: "width 0.12s ease-out, height 0.12s ease-out",
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
