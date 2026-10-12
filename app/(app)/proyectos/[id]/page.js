"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  pedirIA,
  claudeActivo,
  costoEstimadoPantalla,
  registrarCostoPantalla,
} from "@/lib/preferenciaClaude";
import { subirArchivoProyecto } from "@/lib/archivos";
import { limpiarMermaid } from "@/lib/mermaid";
import {
  esPlantUML,
  limpiarPlantUML,
  limpiarDiagrama,
  conExplicacion,
  hashCodigo,
} from "@/lib/diagramas";
import { pedirJson } from "@/lib/pedirJson";
import { resumirNavegacion } from "@/lib/html";
import mermaid from "mermaid";
import MockupsGenerator from "./MockupsGenerator";
import ConfigPrototipo from "./ConfigPrototipo";
import AnalisisResultado from "./AnalisisResultado";
import BadgeModelo from "./BadgeModelo";
import ContextoAnalisis from "./ContextoAnalisis";
import DiagramaBox from "./DiagramaBox";
import ArbolNavegacion from "./ArbolNavegacion";
import InformeProyecto from "./InformeProyecto";
import FaseStepper from "./FaseStepper";
import FaseIndice from "./FaseIndice";
import { PASOS, PASO, pasosDespuesDe, listarNombres } from "./pasos";
import { useAlert } from "../../../AlertProvider";
import { PALETA, DEGRADADO_AUTH } from "../../../estilos";

function BotonAprobar({ aprobado, onClick, etiqueta, disabled }) {
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
      disabled={disabled}
      style={{ backgroundColor: PALETA.oliva }}
      className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
    >
      Aprobar {etiqueta}
    </button>
  );
}

function BotonRechazar({ etiqueta, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
      className="border bg-transparent hover:bg-red-50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
    >
      Rechazar {etiqueta}
    </button>
  );
}

// secundario: el paso ya está generado, así que el botón (ahora "Regenerar") se muestra solo
// con borde para no invitar a reemplazar lo que ya existe.
function BotonGenerar({
  onClick,
  disabled,
  cargando,
  color,
  secundario,
  textoCargando = "Generando...",
  children,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={
        secundario && !cargando
          ? { borderColor: color, color }
          : { backgroundColor: color, borderColor: color }
      }
      className={`border px-4 py-2 disabled:opacity-50 ${
        secundario && !cargando ? "bg-white hover:bg-gray-50" : "text-white hover:brightness-125"
      }`}
    >
      {cargando ? textoCargando : children}
    </button>
  );
}

function BotonEliminar({ onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
      className="border bg-transparent hover:bg-red-50 px-3 py-2 text-sm disabled:opacity-50"
    >
      Eliminar
    </button>
  );
}

const CLASE_INPUT =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900";

// Ajustes opcionales de organización o presentación para un paso (ej. "agrupa por módulo").
// Se guardan en proyectos.contexto.indicaciones y se reutilizan al regenerar en cascada.
// Plegado por defecto ("+ Agregar indicaciones") para no llenar la pantalla de campos; si ya
// tiene texto se muestra abierto.
function CampoIndicaciones({ clave, valor, onChange, deshabilitado, ejemplo }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto && !valor) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={deshabilitado}
        className="block mb-3 text-xs font-semibold hover:underline disabled:opacity-50"
        style={{ color: PALETA.navy }}
      >
        + Agregar indicaciones
      </button>
    );
  }

  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Indicaciones (opcional)
      </span>
      <textarea
        value={valor || ""}
        onChange={(e) => onChange(clave, e.target.value)}
        placeholder={ejemplo}
        disabled={deshabilitado}
        autoFocus={abierto && !valor}
        className={`${CLASE_INPUT} h-14 resize-y`}
      />
    </label>
  );
}

// Recuadro "Ampliar con IA" que aparece bajo cada paso ya generado: la IA agrega o cambia lo
// que se le pide sobre el resultado actual, sin generarlo de nuevo.
// onEnviar(instruccion) devuelve true si aplicó el cambio (se limpia el texto).
// extra: controles adicionales sobre el texto (ej. a qué pantalla aplicar el cambio);
// incompleto: a esos controles les falta algo (solo deshabilita el botón).
function AmpliarConIA({
  descripcion,
  ejemplo,
  onEnviar,
  cargando,
  deshabilitado,
  textoBoton = "Aplicar cambios",
  textoCargando = "Aplicando cambios...",
  extra,
  incompleto,
}) {
  const [instruccion, setInstruccion] = useState("");

  async function enviar() {
    if (await onEnviar(instruccion.trim())) setInstruccion("");
  }

  return (
    <div
      className="mt-8 bg-white border border-gray-300 p-4"
      style={{ borderLeft: `4px solid ${PALETA.oliva}` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 shrink-0" style={{ backgroundColor: PALETA.oliva }} />
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          Ampliar con IA
        </h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">{descripcion}</p>
      {extra}
      <textarea
        value={instruccion}
        onChange={(e) => setInstruccion(e.target.value)}
        placeholder={ejemplo}
        disabled={deshabilitado}
        className={`${CLASE_INPUT} h-20 resize-y`}
      />
      <button
        onClick={enviar}
        disabled={deshabilitado || incompleto || !instruccion.trim()}
        style={{ backgroundColor: PALETA.oliva }}
        className="mt-2 text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
      >
        {cargando ? textoCargando : textoBoton}
      </button>
    </div>
  );
}

const NUEVA_PANTALLA = "nueva";

// "Ampliar con IA" del prototipo: cambia una pantalla existente o genera una nueva.
function AmpliarPrototipo({ pantallas, plataformas, onModificar, onAgregar, cargando, deshabilitado }) {
  const [destino, setDestino] = useState("0"); // índice de la pantalla o NUEVA_PANTALLA
  const [nombre, setNombre] = useState("");
  const [elegida, setPlataforma] = useState(null);

  const esNueva = destino === NUEVA_PANTALLA;
  // Si la pantalla elegida ya no existe (se quitó), vuelve a la primera.
  const indice = !esNueva && Number(destino) < pantallas.length ? Number(destino) : 0;
  const plataforma = plataformas.includes(elegida) ? elegida : plataformas[0];

  async function enviar(instruccion) {
    if (!esNueva) return onModificar(indice, instruccion);
    if (!(await onAgregar(nombre.trim(), plataforma, instruccion))) return false;
    setNombre("");
    return true;
  }

  return (
    <AmpliarConIA
      descripcion="Elige la pantalla y describe qué agregar o cambiar, o crea una pantalla nueva."
      ejemplo={
        esNueva
          ? "Ej: listado de proveedores con búsqueda, y un formulario para registrar uno nuevo"
          : "Ej: agrega un filtro por fecha sobre la tabla y un botón Exportar"
      }
      onEnviar={enviar}
      cargando={cargando}
      deshabilitado={deshabilitado}
      incompleto={esNueva && !nombre.trim()}
      textoBoton={esNueva ? "Generar pantalla" : "Aplicar cambios"}
      textoCargando={esNueva ? "Generando pantalla..." : "Aplicando cambios..."}
      extra={
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <select
            value={esNueva ? NUEVA_PANTALLA : String(indice)}
            onChange={(e) => setDestino(e.target.value)}
            disabled={deshabilitado}
            className="h-9 max-w-[340px] border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:outline-none focus:border-gray-900"
          >
            {pantallas.map((p, i) => (
              <option key={i} value={String(i)}>
                {p.nombre}
              </option>
            ))}
            <option value={NUEVA_PANTALLA}>+ Pantalla nueva</option>
          </select>
          {esNueva && (
            <>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de la pantalla"
                disabled={deshabilitado}
                className="h-9 flex-1 min-w-[200px] border border-gray-300 px-3 text-sm focus:outline-none focus:border-gray-900"
              />
              {plataformas.length > 1 && (
                <select
                  value={plataforma}
                  onChange={(e) => setPlataforma(e.target.value)}
                  disabled={deshabilitado}
                  className="h-9 border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:outline-none focus:border-gray-900"
                >
                  {plataformas.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
      }
    />
  );
}

// Ejemplo del recuadro "Ampliar con IA" de cada diagrama.
const EJEMPLO_AMPLIAR = {
  casos_uso: "Ej: agrega el caso de uso Exportar reporte para el Administrador",
  er: "Ej: agrega la entidad PROVEEDOR relacionada con INSUMO",
  arbol: "Ej: mueve Reportes dentro de la sección Administración",
  clases: "Ej: agrega a la clase Pedido la operación calcularTotal",
  arquitectura: "Ej: agrega un servicio de notificaciones push",
  sistema: "Ej: agrega un subsistema de seguridad con respaldos y auditoría",
};

function IconoLapiz() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

// Controles de generación de un paso. Si el paso está aprobado se reemplazan por una barra de
// bloqueo con un botón "Editar"; en modo edición se agrega "Cancelar edición".
// esperando: el paso anterior no está aprobado (ej. se editó); se muestra el resultado actual
// pero no se puede trabajar este paso hasta aprobar el anterior.
function ControlesPaso({
  clave,
  bloqueado,
  enEdicion,
  esperando,
  deshabilitado,
  onEditar,
  onCancelarEdicion,
  children,
}) {
  if (esperando) {
    return <p className="text-xs text-gray-500">Disponible al aprobar el paso anterior.</p>;
  }

  if (bloqueado) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap border border-gray-300 bg-gray-50 px-4 py-2.5">
        <span className="text-sm font-semibold" style={{ color: PALETA.oliva }}>
          Aprobado
        </span>
        <button
          onClick={() => onEditar(clave)}
          disabled={deshabilitado}
          style={{ borderColor: PALETA.naranjaOscuro, color: PALETA.naranjaOscuro }}
          className="border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-orange-50 disabled:opacity-50"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {children}
      {enEdicion && (
        <>
          <button
            onClick={() => onCancelarEdicion(clave)}
            disabled={deshabilitado}
            className="border border-gray-300 text-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar edición
          </button>
        </>
      )}
    </div>
  );
}

const ESTADOS_PASO = {
  revision: { texto: "Actualizado · pendiente de revisión", color: PALETA.naranjaOscuro },
  desactualizado: { texto: "Desactualizado", color: PALETA.carmesi },
};

// onActualizar: si el paso está desactualizado y se puede trabajar, botón para regenerarlo ahí
// mismo con los datos nuevos.
function TituloPaso({ color, estado, modelo, separador = true, onActualizar, deshabilitado, children }) {
  const e = ESTADOS_PASO[estado];
  return (
    <div
      className={`${
        separador ? "mt-8 pt-6 border-t-2 border-gray-200 " : ""
      }flex items-center gap-2 mb-3 flex-wrap`}
    >
      <span className="w-2 h-2 shrink-0" style={{ backgroundColor: color }} />
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {children}
      </h3>
      {e && (
        <span
          className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: e.color }}
        >
          {e.texto}
        </span>
      )}
      {estado === "desactualizado" && onActualizar && (
        <button
          onClick={onActualizar}
          disabled={deshabilitado}
          style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
          className="border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide hover:bg-red-50 disabled:opacity-50"
        >
          Actualizar
        </button>
      )}
      <BadgeModelo modelo={modelo} />
    </div>
  );
}

function BotonDetener({ onClick, deteniendo }) {
  return (
    <button
      onClick={onClick}
      disabled={deteniendo}
      style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
      className="border bg-white hover:bg-red-50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
    >
      {deteniendo ? "Deteniendo tras esta pantalla..." : "Detener"}
    </button>
  );
}

function AvisoCascada({
  progreso,
  desactualizados,
  ocupado,
  onActualizar,
  onConservar,
  onDetener,
  deteniendo,
}) {
  if (progreso) {
    const porcentaje = Math.round((progreso.indice / progreso.total) * 100);
    return (
      <div
        className="mb-6 bg-white border border-gray-300 p-4"
        style={{ borderLeft: `4px solid ${PALETA.naranjaOscuro}` }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">
            Actualizando en cascada ({progreso.indice + 1}/{progreso.total}): {progreso.nombre}...
          </p>
          {progreso.detenible && <BotonDetener onClick={onDetener} deteniendo={deteniendo} />}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Cada paso puede tardar un par de minutos. Las pantallas del prototipo se guardan a medida
          que se generan.
        </p>
        <div className="h-1 bg-gray-200 mt-3">
          <div
            className="h-1 transition-all duration-500"
            style={{ width: `${porcentaje}%`, backgroundColor: PALETA.naranjaOscuro }}
          />
        </div>
      </div>
    );
  }

  if (!desactualizados.length) return null;

  return (
    <div
      className="mb-6 bg-white border border-gray-300 p-4 flex items-center justify-between gap-4 flex-wrap"
      style={{ borderLeft: `4px solid ${PALETA.carmesi}` }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">
          Desactualizado: {listarNombres(desactualizados)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Se generaron con una versión anterior. Puedes actualizarlos ahora o, si el cambio no
          les afecta, conservarlos como están.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onConservar}
          disabled={ocupado}
          className="border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          Conservar como está
        </button>
        <button
          onClick={onActualizar}
          disabled={ocupado}
          style={{ backgroundColor: PALETA.carmesi }}
          className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
        >
          Actualizar todo
        </button>
      </div>
    </div>
  );
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { htmlLabels: true, wrappingWidth: 220 },
});

// PlantUML se dibuja en el servidor con Kroki (ver app/api/renderizar-diagrama/route.js).
async function renderizarPlantUML(codigo) {
  const data = await pedirJson("/api/renderizar-diagrama", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo }),
  });
  if (data.error) throw new Error(data.error);
  // El SVG de PlantUML trae su ancho y alto fijos en style: se quitan para que el zoom de
  // "Expandir" pueda escalarlo (el tamaño real queda en width, height y viewBox).
  return data.svg.replace(/<svg\b[^>]*>/, (etiqueta) =>
    etiqueta.replace(/style="[^"]*"/, (estilo) => estilo.replace(/(?:width|height):[^;"]*;?/g, ""))
  );
}

// Dibuja un diagrama como SVG con el motor que corresponda a su código.
async function renderizar(codigo) {
  if (esPlantUML(codigo)) return renderizarPlantUML(codigo);
  await document.fonts.ready;
  const limpio = limpiarMermaid(codigo);
  // parse valida sin tocar el DOM; render con código inválido deja restos en la página.
  await mermaid.parse(limpio);
  const idUnico = "diagrama-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const { svg } = await mermaid.render(idUnico, limpio);
  return svg;
}

const SIN_ARTEFACTOS = Object.fromEntries(PASOS.map((p) => [p.clave, null]));

// Plataformas por defecto del prototipo: las del contexto del análisis que aplican (Web/Móvil).
function plataformasDePrototipo(contexto) {
  const aplicables = (contexto?.plataformas || []).filter((p) => p === "Web" || p === "Móvil");
  return aplicables.length ? aplicables : ["Web"];
}

// Pantallas del prototipo a generar: las marcadas en la configuración o, en proyectos sin
// lista de pantallas (anteriores a esta opción), las que ya están generadas.
function planPrototipo(config, mockups) {
  if (config?.pantallas?.length) return config.pantallas.filter((p) => p.seleccionada !== false);
  return (mockups || []).map((p) => ({
    nombre: p.nombre,
    descripcion: "",
    rfs: p.rfs || [],
    actores: [],
    plataforma: p.plataforma || "Web",
  }));
}

export default function WorkspaceProyecto() {
  const [supabase] = useState(() => createClient());
  const { id } = useParams();
  const { mostrarError, mostrarInfo, confirmar, notificar } = useAlert();
  const [proyecto, setProyecto] = useState(null);
  const [artefactos, setArtefactos] = useState(SIN_ARTEFACTOS);
  const [svgs, setSvgs] = useState({});
  const [fasesAprobadas, setFasesAprobadas] = useState({});
  const [cargando, setCargando] = useState(null); // { paso, modo } generación manual en curso
  const [progreso, setProgreso] = useState(null); // { indice, total, nombre } cascada en curso
  const [vista, setVista] = useState("resumen"); // "resumen" | "analisis" | "diseno" | "informe"

  const [borrador, setBorrador] = useState(null); // { nombre, prompt } mientras se edita el proyecto
  const [guardandoProyecto, setGuardandoProyecto] = useState(false);
  const [desbloqueados, setDesbloqueados] = useState([]); // pasos aprobados abiertos para editar
  const [deteniendo, setDeteniendo] = useState(false); // se pidió detener la generación de pantallas
  const [contexto, setContexto] = useState({}); // contexto de elicitación (proyectos.contexto)
  const [estadoContexto, setEstadoContexto] = useState(null); // pendiente | guardando | guardado | error

  // Copias con el último valor: la cascada encadena varias operaciones async y no puede
  // leer el estado capturado en el render en el que empezó.
  const proyectoRef = useRef(null);
  const artefactosRef = useRef(SIN_ARTEFACTOS);
  const fasesRef = useRef({});
  const detenerRef = useRef(false); // la generación de pantallas lo revisa antes de cada una
  const enCascadaRef = useRef(false); // durante la cascada no se muestran avisos de cambio
  const contextoRef = useRef({});
  const avisoColumnaContexto = useRef(false);
  // SVG ya dibujado de cada diagrama PlantUML (proyectos.diagramas_svg): { clave: { hash, svg } }.
  const svgsGuardadosRef = useRef({});

  // Guarda (o quita, con svg = null) el SVG de un diagrama PlantUML junto con la huella de su
  // código. Es solo una copia para no depender de Kroki al abrir el proyecto: si falla, el
  // diagrama se vuelve a dibujar la próxima vez.
  async function guardarSvgDiagrama(clave, codigo, svg) {
    const actuales = { ...svgsGuardadosRef.current };
    if (svg) actuales[clave] = { hash: hashCodigo(codigo), svg };
    else if (actuales[clave]) delete actuales[clave];
    else return;
    svgsGuardadosRef.current = actuales;
    const { error } = await supabase.from("proyectos").update({ diagramas_svg: actuales }).eq("id", id);
    if (error) console.warn("No se pudo guardar el SVG del diagrama:", error.message);
  }

  useEffect(() => {
    async function cargarProyecto() {
      const { data } = await supabase
        .from("proyectos")
        .select("*")
        .eq("id", id)
        .single();
      proyectoRef.current = data;
      setProyecto(data);
      if (!data) return;

      const cargados = Object.fromEntries(
        PASOS.map((p) => [p.clave, data[p.columna] ?? null])
      );
      artefactosRef.current = cargados;
      setArtefactos(cargados);
      fasesRef.current = data.fases_aprobadas || {};
      setFasesAprobadas(fasesRef.current);
      contextoRef.current = data.contexto || {};
      setContexto(contextoRef.current);
      svgsGuardadosRef.current = data.diagramas_svg || {};

      const renderizados = {};
      const sinDibujar = [];
      for (const p of PASOS) {
        const codigo = cargados[p.clave];
        if (!p.diagrama || !codigo) continue;
        // PlantUML: se usa el SVG guardado si se dibujó con este mismo código; si no (o no hay),
        // se dibuja con Kroki y se guarda.
        const guardado = svgsGuardadosRef.current[p.clave];
        if (esPlantUML(codigo) && guardado?.hash === hashCodigo(codigo)) {
          renderizados[p.clave] = guardado.svg;
          continue;
        }
        try {
          renderizados[p.clave] = await renderizar(codigo);
          if (esPlantUML(codigo)) await guardarSvgDiagrama(p.clave, codigo, renderizados[p.clave]);
        } catch (err) {
          console.error(`Error renderizando ${p.nombre}:`, err);
          if (esPlantUML(codigo)) sinDibujar.push(p.nombre);
        }
      }
      setSvgs(renderizados);

      if (sinDibujar.length) {
        mostrarError(
          `No se pudo dibujar: ${sinDibujar.join(", ")}. El código está guardado; recarga la página en un momento para reintentar.`,
          "Kroki no respondió"
        );
      }
    }
    cargarProyecto();
    // guardarSvgDiagrama solo usa refs, supabase e id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabase, mostrarError]);

  // El contexto se guarda solo, un momento después de que el usuario deja de escribir.
  useEffect(() => {
    if (estadoContexto !== "pendiente") return;
    const temporizador = setTimeout(async () => {
      setEstadoContexto("guardando");
      const { error } = await supabase
        .from("proyectos")
        .update({ contexto: contextoRef.current })
        .eq("id", id);
      setEstadoContexto(error ? "error" : "guardado");

      if (error && !avisoColumnaContexto.current) {
        avisoColumnaContexto.current = true;
        const faltaColumna = /contexto/i.test(error.message) && /column|schema/i.test(error.message);
        mostrarError(
          faltaColumna
            ? "Falta la columna 'contexto' en la base de datos. Ejecuta el archivo supabase/contexto_proyecto.sql en el SQL Editor de Supabase. Mientras tanto, el contexto sí se usa al generar, pero no se guarda."
            : error.message,
          "No se pudo guardar el contexto"
        );
      }
    }, 800);
    return () => clearTimeout(temporizador);
  }, [contexto, estadoContexto, supabase, id, mostrarError]);

  function cambiarContexto(nuevo) {
    contextoRef.current = nuevo;
    setContexto(nuevo);
    setEstadoContexto("pendiente");
  }

  function cambiarIndicaciones(clave, texto) {
    cambiarContexto({
      ...contextoRef.current,
      indicaciones: { ...contextoRef.current.indicaciones, [clave]: texto },
    });
  }

  // ---------- Persistencia ----------

  async function guardarFases(cambiar) {
    const nuevo = cambiar({
      ...fasesRef.current,
      pendientes: { ...fasesRef.current.pendientes },
      modelos: { ...fasesRef.current.modelos }, // qué modelo de IA generó cada paso
    });
    fasesRef.current = nuevo;
    setFasesAprobadas(nuevo);
    await supabase.from("proyectos").update({ fases_aprobadas: nuevo }).eq("id", id);
  }

  async function guardarArtefacto(clave, valor) {
    const paso = PASO[clave];
    // Se renderiza antes de guardar: si la IA devolvió un diagrama inválido, falla sin tocar nada.
    const svg = paso.diagrama && valor ? await renderizar(valor) : null;

    artefactosRef.current = { ...artefactosRef.current, [clave]: valor };
    setArtefactos(artefactosRef.current);
    if (paso.diagrama) setSvgs((s) => ({ ...s, [clave]: svg }));

    const { error } = await supabase.from("proyectos").update({ [paso.columna]: valor }).eq("id", id);
    // Sin esto, un paso cuya columna aún no existe en la base se vería generado pero se perdería
    // al recargar (ej. un paso nuevo antes de ejecutar su archivo de supabase/).
    if (error) {
      throw new Error(
        `"${paso.nombre}" se generó pero no se pudo guardar: ${error.message}` +
          (error.message.includes(paso.columna)
            ? `\n\nFalta crear la columna "${paso.columna}": ejecuta el archivo correspondiente de la carpeta supabase/ en el SQL Editor.`
            : "")
      );
    }
    if (paso.diagrama) await guardarSvgDiagrama(clave, valor, esPlantUML(valor) ? svg : null);
  }

  // ---------- Generación ----------

  // Cada paso recibe los artefactos de los pasos anteriores, para que un cambio se propague.
  // opciones.onProgreso(i, total, nombre): avance del prototipo, que se genera pantalla a pantalla.
  async function pedirPaso(clave, opciones = {}) {
    if (clave === "prototipo") {
      const plan = planPrototipo(contextoRef.current.prototipo, artefactosRef.current.prototipo);
      if (!plan.length) throw new Error("Primero propone o agrega las pantallas a generar.");
      // Cada pantalla se guarda apenas se genera (ver generarPantallas), así detener o cerrar
      // la pestaña no pierde lo que ya se pagó.
      const { generadas, fallidas, detenido } = await generarPantallas(plan, opciones.onProgreso);
      if (!generadas.length) {
        throw new Error(detenido ? "Generación detenida." : fallidas.join("\n"));
      }
      // Completo: queda en el orden del plan y sin las pantallas que ya no están en él (si una
      // falló, se conserva su versión anterior). Detenido: queda como se guardó.
      const guardadas = artefactosRef.current.prototipo || [];
      const valor = detenido
        ? guardadas
        : plan.map((p) => guardadas.find((g) => g.nombre === p.nombre)).filter(Boolean);
      return { valor, modelo: generadas.at(-1).modelo, fallidas, detenido };
    }

    const a = artefactosRef.current;
    const proyectoActual = proyectoRef.current;
    const indicaciones = contextoRef.current.indicaciones?.[clave];
    const plataformasDelSistema =
      contextoRef.current.prototipo?.plataformas || plataformasDePrototipo(contextoRef.current);
    const cuerpos = {
      analisis: {
        prompt: proyectoActual.prompt,
        documentoTexto: proyectoActual.documento_texto,
        imagenUrl: proyectoActual.imagen_url,
        contexto: contextoRef.current,
      },
      casos_uso: { analisis: a.analisis },
      // Las clases salen de los requerimientos y los casos de uso. En un proyecto que ya tenía su
      // entidad-relación antes de existir este paso, se le pasa para que no lo contradigan.
      clases: { nombre: proyectoActual.nombre, analisis: a.analisis, casosUso: a.casos_uso, diagramaEr: a.er },
      // El entidad-relación es cómo se guardan las clases aprobadas. Las tecnologías dicen qué no va
      // en el modelo (ej. contraseñas, si hay un servicio de autenticación).
      er: {
        analisis: a.analisis,
        casosUso: a.casos_uso,
        diagramaClases: a.clases,
        tecnologias: contextoRef.current.tecnologias,
      },
      arbol: {
        nombre: proyectoActual.nombre,
        descripcion: proyectoActual.prompt,
        analisis: a.analisis,
        // Plataformas del sistema: las usa la ruta si todavía no hay pantallas generadas.
        plataformas: plataformasDelSistema,
        // Las pantallas generadas, con la plataforma, actores y RF de su plan (el plan tiene los
        // actores; la pantalla guardada, la plataforma y los RF con que se generó).
        pantallas: (a.prototipo || []).map((p) => {
          const delPlan = planPrototipo(contextoRef.current.prototipo, a.prototipo).find(
            (x) => x.nombre === p.nombre
          );
          return {
            nombre: p.nombre,
            plataforma: p.plataforma || delPlan?.plataforma || "Web",
            rfs: p.rfs?.length ? p.rfs : delPlan?.rfs || [],
            actores: delPlan?.actores || [],
            // Menús y botones de la pantalla: el árbol se arma con la navegación real.
            navegacion: resumirNavegacion(p.html),
          };
        }),
      },
      arquitectura: {
        nombre: proyectoActual.nombre,
        descripcion: proyectoActual.prompt,
        analisis: a.analisis,
        diagramaEr: a.er,
        arbolNavegacion: a.arbol,
        plataformas: plataformasDelSistema,
        tecnologias: contextoRef.current.tecnologias,
        calidad: contextoRef.current.calidad,
      },
      sistema: {
        nombre: proyectoActual.nombre,
        descripcion: proyectoActual.prompt,
        analisis: a.analisis,
        plataformas: plataformasDelSistema,
        tecnologias: contextoRef.current.tecnologias,
        diagramaArquitectura: a.arquitectura,
        // Las áreas de presentación salen de las pantallas reales de cada plataforma.
        arbolNavegacion: a.arbol,
      },
    };

    const data = await pedirIA(PASO[clave].ruta, { ...cuerpos[clave], indicaciones });
    if (data.error) throw new Error(data.error);

    const { modelo_ia: modelo, ...resto } = data;
    if (clave === "analisis") {
      // Las advertencias de la revisión se muestran, pero no forman parte del análisis guardado.
      const { advertencias = [], ...analisis } = resto;
      return { valor: analisis, modelo, advertencias };
    }
    // Se guarda ya limpio, para que los pasos siguientes reciban código válido. Cada ruta devuelve
    // diagrama_plantuml o diagrama_mermaid según el motor del paso. Si la IA devolvió una
    // explicación, va como comentarios al inicio del código. advertencias: lo que la ruta validó y
    // no pudo corregir en su reintento.
    const codigo = resto.diagrama_plantuml
      ? limpiarPlantUML(resto.diagrama_plantuml)
      : limpiarMermaid(resto.diagrama_mermaid);
    return {
      valor: conExplicacion(codigo, resto.explicacion),
      modelo,
      advertencias: resto.advertencias || [],
    };
  }

  // Texto corto con las advertencias de una generación (las 3 primeras y cuántas más hay).
  function textoAdvertencias(advertencias) {
    const visibles = advertencias.slice(0, 3).map((a) => `- ${a}`);
    const resto = advertencias.length - visibles.length;
    return visibles.join("\n") + (resto > 0 ? `\n- y ${resto} más.` : "");
  }

  // Inserta o reemplaza (por nombre) una pantalla en el prototipo guardado. La primera pantalla
  // de una generación marca el cambio del paso (pierde la aprobación, cascada, etc.).
  async function guardarPantalla(nueva, esPrimera) {
    const actuales = artefactosRef.current.prototipo || [];
    const indice = actuales.findIndex((p) => p.nombre === nueva.nombre);
    await guardarArtefacto(
      "prototipo",
      indice === -1 ? [...actuales, nueva] : actuales.map((p, i) => (i === indice ? nueva : p))
    );
    if (esPrimera) await marcarCambio("prototipo", {}, nueva.modelo);
  }

  // Genera las pantallas indicadas, una petición por pantalla, con el mismo estilo para todas.
  // Cada una se guarda apenas termina. Las que fallan no detienen a las demás: se devuelven en
  // "fallidas" para reintentarlas. "Detener" corta antes de empezar la siguiente pantalla (la
  // que está en curso termina: su costo ya se está pagando).
  async function generarPantallas(lista, onProgreso) {
    detenerRef.current = false;
    const a = artefactosRef.current;
    const config = contextoRef.current.prototipo || {};
    const estilo = {
      modo: config.modo || "mockup",
      color: config.color,
      tema: config.tema || "claro",
      logoUrl: config.logoUrl,
      referencias: config.referencias || [],
      detalle: config.detalle || "economico",
    };
    const todas = planPrototipo(config, a.prototipo);

    const generadas = [];
    const fallidas = [];
    let detenido = false;
    try {
      for (const [i, pantalla] of lista.entries()) {
        if (detenerRef.current) {
          detenido = true;
          break;
        }
        onProgreso?.(i, lista.length, pantalla.nombre);
        try {
          const data = await pedirIA(
            "/api/generar-mockups",
            {
              // El nombre del proyecto es el del producto en todas las pantallas.
              nombre: proyectoRef.current?.nombre,
              analisis: a.analisis,
              diagramaEr: a.er,
              pantalla,
              pantallas: todas,
              estilo,
              indicaciones: contextoRef.current.indicaciones?.prototipo,
            },
            { alCosto: (costo) => registrarCostoPantalla(costo, estilo.detalle) }
          );
          if (data.error) throw new Error(data.error);
          const nueva = {
            nombre: pantalla.nombre,
            html: data.html,
            plataforma: pantalla.plataforma || "Web",
            rfs: pantalla.rfs || [],
            modelo: data.modelo_ia,
          };
          await guardarPantalla(nueva, generadas.length === 0);
          generadas.push(nueva);
        } catch (err) {
          fallidas.push(`${pantalla.nombre}: ${err.message}`);
        }
      }
    } finally {
      detenerRef.current = false;
      setDeteniendo(false);
    }
    return { generadas, fallidas, detenido };
  }

  function detenerGeneracion() {
    detenerRef.current = true;
    setDeteniendo(true);
  }

  // Con Claude activado, confirma el costo estimado antes de generar varias pantallas.
  async function confirmarCostoPantallas(cantidad) {
    if (!claudeActivo() || cantidad < 2) return true;
    const porPantalla = costoEstimadoPantalla(contextoRef.current.prototipo?.detalle);
    return confirmar(
      `Vas a generar ${cantidad} pantallas con Claude. Costo estimado: ~$${(cantidad * porPantalla).toFixed(2)} ` +
        `(~$${porPantalla.toFixed(2)} por pantalla).\n\n` +
        `Puedes detener la generación en cualquier momento: las pantallas ya generadas se guardan.`,
      "¿Generar con Claude?",
      "Generar"
    );
  }

  // lote: generación de varias pantallas (muestra el botón "Detener").
  const progresoPantallas = (clave, extra) => (i, total, nombre) =>
    setCargando({
      paso: clave,
      lote: true,
      ...extra,
      detalle: `Generando ${i + 1}/${total}: ${nombre}...`,
    });

  async function proponerPantallas() {
    setCargando({ paso: "proponer" });
    try {
      const a = artefactosRef.current;
      const inicial = contextoRef.current.prototipo || {};
      const data = await pedirIA("/api/proponer-pantallas", {
        analisis: a.analisis,
        diagramaEr: a.er,
        plataformas: inicial.plataformas || plataformasDePrototipo(contextoRef.current),
        indicaciones: contextoRef.current.indicaciones?.prototipo,
      });
      if (data.error) throw new Error(data.error);
      if (data.advertencias?.length) {
        mostrarInfo(textoAdvertencias(data.advertencias), "Pantallas propuestas: revisa antes de generar");
      }

      // Se relee la configuración: puede haber cambiado mientras la IA respondía.
      const config = contextoRef.current.prototipo || {};
      const manuales = (config.pantallas || []).filter((p) => p.origen === "manual");
      const propuestas = (data.pantallas || []).map((p) => ({
        ...p,
        id: crypto.randomUUID(),
        seleccionada: true,
        origen: "ia",
      }));
      cambiarConfigPrototipo({
        ...config,
        pantallas: [...propuestas, ...manuales],
        color: config.color || data.color_primario,
        modeloPantallas: data.modelo_ia,
      });
    } catch (err) {
      mostrarError(err.message, "No se pudieron proponer las pantallas");
    } finally {
      setCargando(null);
    }
  }

  // Genera solo las pantallas marcadas que todavía no existen y las agrega al prototipo.
  async function agregarPantallasFaltantes() {
    const actuales = artefactosRef.current.prototipo || [];
    const existentes = new Set(actuales.map((p) => p.nombre));
    const faltan = planPrototipo(contextoRef.current.prototipo, actuales).filter(
      (p) => !existentes.has(p.nombre)
    );
    if (!faltan.length) return;
    if (!(await confirmarCostoPantallas(faltan.length))) return;

    setCargando({ paso: "prototipo", lote: true });
    try {
      // Cada pantalla se guarda apenas se genera (dentro de generarPantallas).
      const { fallidas } = await generarPantallas(faltan, progresoPantallas("prototipo"));
      if (fallidas.length) {
        mostrarError(fallidas.join("\n"), "No se pudieron generar algunas pantallas");
      }
    } catch (err) {
      mostrarError(err.message, "No se pudieron generar las pantallas");
    } finally {
      setCargando(null);
    }
  }

  async function regenerarPantalla(indice) {
    const actuales = artefactosRef.current.prototipo;
    const actual = actuales[indice];
    const especificacion = planPrototipo(contextoRef.current.prototipo, actuales).find(
      (p) => p.nombre === actual.nombre
    ) || {
      nombre: actual.nombre,
      descripcion: "",
      rfs: actual.rfs || [],
      actores: [],
      plataforma: actual.plataforma || "Web",
    };

    setCargando({ paso: "prototipo", indice, detalle: `Regenerando: ${actual.nombre}...` });
    try {
      // Se guarda en su lugar (por nombre) dentro de generarPantallas.
      const { generadas, fallidas } = await generarPantallas([especificacion]);
      if (!generadas.length) throw new Error(fallidas.join("\n"));
    } catch (err) {
      mostrarError(err.message, "No se pudo regenerar la pantalla");
    } finally {
      setCargando(null);
    }
  }

  // Guarda el HTML editado a mano de una pantalla. Cuenta como un cambio del prototipo (pierde
  // la aprobación y los pasos siguientes quedan desactualizados). Devuelve false si falla.
  async function guardarHtmlPantalla(indice, html) {
    const actuales = artefactosRef.current.prototipo;
    try {
      await guardarArtefacto(
        "prototipo",
        actuales.map((p, i) => (i === indice ? { ...p, html, modelo: "manual" } : p))
      );
      await marcarCambio("prototipo");
      return true;
    } catch (err) {
      mostrarError(err.message, "No se pudo guardar la pantalla");
      return false;
    }
  }

  async function quitarPantalla(indice) {
    const actuales = artefactosRef.current.prototipo;
    if (
      !(await confirmar(
        "Se quitará del prototipo.",
        `¿Quitar la pantalla "${actuales[indice].nombre}"?`,
        "Quitar"
      ))
    ) {
      return;
    }
    const restantes = actuales.filter((_, i) => i !== indice);
    try {
      await guardarArtefacto("prototipo", restantes.length ? restantes : null);
      await marcarCambio("prototipo");
    } catch (err) {
      mostrarError(err.message, "No se pudo quitar la pantalla");
    }
  }

  function cambiarConfigPrototipo(nuevo) {
    cambiarContexto({ ...contextoRef.current, prototipo: nuevo });
  }

  function subirImagenEstilo(archivo) {
    return subirArchivoProyecto(supabase, archivo, "estilo");
  }

  // Un paso cambió (se generó, se editó o se eliminó): pierde su aprobación junto con todos
  // los siguientes, y los siguientes que ya existían quedan desactualizados.
  // Con clave = null cambió la descripción del proyecto, de la que dependen todos los pasos.
  // modelo: el que generó la nueva versión del paso (undefined si se editó o eliminó a mano).
  // silencioso: no avisar con la notificación de esquina (ej. cuando la cascada sigue enseguida).
  async function marcarCambio(clave, extra = {}, modelo, { silencioso = false } = {}) {
    const nuevosDesactualizados = [];
    await guardarFases((f) => {
      Object.assign(f, extra);
      if (clave) {
        f[PASO[clave].aprobacion] = false;
        delete f.pendientes[clave];
        if (modelo) f.modelos[clave] = modelo;
      }
      // Se recuerda cómo estaban las fases y los pasos antes de marcarlos, para que "Conservar
      // como está" pueda devolverles la aprobación. Si ya había pasos desactualizados, vale lo
      // de antes del primer cambio; si no, empieza un registro nuevo.
      if (!Object.values(f.pendientes).includes("desactualizado")) {
        delete f.fasesPrevias;
        delete f.aprobacionesPrevias;
      }
      f.fasesPrevias ??= { analisis: !!f.analisis, diseno: !!f.diseno };
      // Un cambio en una subfase quita también la aprobación general de su fase. El Diseño
      // depende de todo lo anterior, así que cualquier cambio le quita la aprobación.
      if (!clave || PASO[clave].fase === "analisis") f.analisis = false;
      f.diseno = false;
      for (const p of clave ? pasosDespuesDe(clave) : PASOS) {
        if (artefactosRef.current[p.clave] && f.pendientes[p.clave] !== "desactualizado") {
          // Sin valor registrado: en el Análisis cuenta la fase (proyectos anteriores a las
          // subfases); en el Diseño, un paso nunca aprobado sigue sin aprobar.
          const aprobado = f[p.aprobacion] ?? (p.fase === "analisis" && f.fasesPrevias.analisis);
          f.aprobacionesPrevias = { ...f.aprobacionesPrevias, [p.clave]: aprobado };
          nuevosDesactualizados.push(p);
        }
        f[p.aprobacion] = false;
        if (artefactosRef.current[p.clave]) f.pendientes[p.clave] = "desactualizado";
      }
      return f;
    });

    // Aviso en la esquina superior derecha, solo si este cambio dejó pasos NUEVOS desactualizados
    // (no en cada edición repetida) y no durante una cascada, que ya los está actualizando.
    if (!silencioso && !enCascadaRef.current && nuevosDesactualizados.length) {
      notificar({
        titulo: clave ? `Cambió: ${PASO[clave].nombre}` : "Cambió la descripción del proyecto",
        mensaje: `Quedaron desactualizados: ${listarNombres(nuevosDesactualizados)}.`,
        acciones: [
          { texto: "Actualizar todo", onClick: () => actualizarTodo() },
          { texto: "Conservar como está", onClick: () => conservarDesactualizados() },
        ],
      });
    }
  }

  function desactualizados(pasos = PASOS) {
    return pasos.filter(
      (p) =>
        fasesRef.current.pendientes?.[p.clave] === "desactualizado" &&
        artefactosRef.current[p.clave]
    );
  }

  // Si el paso ya está generado, regenerarlo reemplaza su versión actual (con los cambios hechos a
  // mano): se pide confirmación, con los pasos que quedarán desactualizados y, si es el prototipo
  // con Claude, el costo estimado.
  async function regenerarPaso(clave) {
    if (!artefactosRef.current[clave]) return generarPaso(clave);

    const nombre = PASO[clave].nombre.toLowerCase();
    const afectados = pasosDespuesDe(clave).filter((p) => artefactosRef.current[p.clave]);
    const partes = [`Se reemplazará la versión actual (${nombre}), incluidos los cambios hechos a mano.`];
    if (afectados.length) partes.push(`Quedarán desactualizados: ${listarNombres(afectados)}.`);
    if (clave === "prototipo" && claudeActivo()) {
      const cantidad = planPrototipo(contextoRef.current.prototipo, artefactosRef.current.prototipo)
        .length;
      const porPantalla = costoEstimadoPantalla(contextoRef.current.prototipo?.detalle);
      partes.push(
        `\n\nCosto estimado con Claude: ~$${(cantidad * porPantalla).toFixed(2)} (${cantidad} pantallas).`
      );
    }

    if (!(await confirmar(partes.join(" "), `¿Regenerar ${nombre}?`, "Regenerar"))) return;
    return generarPaso(clave, { costoConfirmado: true });
  }

  async function generarPaso(clave, { costoConfirmado } = {}) {
    if (clave === "prototipo" && !costoConfirmado) {
      const cantidad = planPrototipo(contextoRef.current.prototipo, artefactosRef.current.prototipo)
        .length;
      if (!(await confirmarCostoPantallas(cantidad))) return;
    }

    setCargando({ paso: clave });
    try {
      const { valor, modelo, fallidas, detenido, advertencias } = await pedirPaso(clave, {
        onProgreso: progresoPantallas(clave),
      });
      await guardarArtefacto(clave, valor);
      await marcarCambio(clave, {}, modelo);
      if (advertencias?.length) {
        mostrarInfo(textoAdvertencias(advertencias), `${PASO[clave].nombre}: revisa antes de aprobar`);
      } else if (detenido) {
        mostrarInfo(
          `Se guardaron las pantallas generadas hasta ese momento. Puedes completar el resto con "Agregar faltantes".`,
          "Generación detenida"
        );
      } else if (fallidas?.length) {
        mostrarInfo(
          `No se pudieron generar:\n${fallidas.join("\n")}\n\nPuedes generarlas con "Agregar faltantes".`,
          "Prototipo generado con errores"
        );
      }
    } catch (err) {
      mostrarError(err.message, `No se pudo generar: ${PASO[clave].nombre}`);
    } finally {
      setCargando(null);
    }
  }

  // Regenera en orden los pasos indicados. Si uno falla se detiene: ese y los siguientes
  // siguen marcados como desactualizados y se pueden reintentar con "Actualizar todo".
  async function ejecutarCascada(pasos) {
    enCascadaRef.current = true;
    try {
      for (let i = 0; i < pasos.length; i++) {
        const p = pasos[i];
        setProgreso({ indice: i, total: pasos.length, nombre: p.nombre });
        try {
          const { valor, modelo, detenido, advertencias } = await pedirPaso(p.clave, {
            onProgreso: (j, total, pantalla) =>
              setProgreso({
                indice: i,
                total: pasos.length,
                nombre: `${p.nombre} (pantalla ${j + 1}/${total}: ${pantalla})`,
                detenible: true,
              }),
          });
          await guardarArtefacto(p.clave, valor);
          await guardarFases((f) => {
            f[p.aprobacion] = false;
            if (p.fase === "analisis") f.analisis = false;
            f.diseno = false;
            f.pendientes[p.clave] = "revision";
            if (modelo) f.modelos[p.clave] = modelo;
            return f;
          });
          // En la cascada no se interrumpe con una ventana: aviso en la esquina, más tiempo visible.
          if (advertencias?.length) {
            notificar({
              titulo: `${p.nombre}: revisa antes de aprobar`,
              mensaje: textoAdvertencias(advertencias),
              duracion: 20000,
            });
          }
          // Detener el prototipo corta también la cascada: los pasos siguientes siguen
          // desactualizados y se retoman con "Actualizar todo".
          if (detenido) {
            const restantes = pasos.slice(i + 1);
            mostrarInfo(
              `Se guardaron las pantallas ya generadas; completa el resto con "Agregar faltantes".` +
                (restantes.length
                  ? `\n\nQuedan desactualizados: ${listarNombres(restantes)}. Puedes retomarlos con "Actualizar todo".`
                  : ""),
              "Generación detenida"
            );
            return;
          }
        } catch (err) {
          mostrarError(
            `${err.message}\n\nQuedan desactualizados: ${listarNombres(pasos.slice(i))}. ` +
              `Puedes reintentar con "Actualizar todo".`,
            `No se pudo actualizar: ${p.nombre}`
          );
          return;
        }
      }
    } finally {
      enCascadaRef.current = false;
      setProgreso(null);
    }
  }

  // Un paso aprobado queda bloqueado. Desbloquearlo no quita la aprobación: solo habilita los
  // controles. La aprobación se pierde (y se aplica la cascada) solo si de verdad se cambia algo.
  async function desbloquearPaso(clave) {
    const siguientes = pasosDespuesDe(clave).filter((p) => artefactosRef.current[p.clave]);
    const continuar = await confirmar(
      siguientes.length
        ? `Si cambias algo, perderá su aprobación y afectará a: ${listarNombres(siguientes)}.`
        : "Si cambias algo, perderá su aprobación.",
      `¿Editar ${PASO[clave].nombre.toLowerCase()}?`,
      "Editar"
    );
    if (continuar) setDesbloqueados((d) => [...d, clave]);
  }

  const cancelarEdicion = (clave) => setDesbloqueados((d) => d.filter((c) => c !== clave));

  // Aprobar un paso que cambió propaga el cambio: se regeneran automáticamente los pasos
  // siguientes que quedaron desactualizados, y cada uno queda pendiente de revisión.
  async function aprobarPaso(clave) {
    cancelarEdicion(clave); // aprobado de nuevo: vuelve a quedar bloqueado

    // Al aprobar los requerimientos, los agregados o cambiados con "Ampliar con IA" dejan de
    // estar marcados.
    const analisis = artefactosRef.current.analisis;
    const quitarMarca = (lista = []) => lista.map(({ nuevo, modificado, ...resto }) => resto);
    const tieneNuevos = (lista = []) => lista.some((x) => x.nuevo || x.modificado);
    if (
      clave === "analisis" &&
      (tieneNuevos(analisis.actores) ||
        tieneNuevos(analisis.requerimientos_funcionales) ||
        tieneNuevos(analisis.requerimientos_no_funcionales))
    ) {
      await guardarArtefacto("analisis", {
        ...analisis,
        actores: quitarMarca(analisis.actores),
        requerimientos_funcionales: quitarMarca(analisis.requerimientos_funcionales),
        requerimientos_no_funcionales: quitarMarca(analisis.requerimientos_no_funcionales),
      });
    }

    await guardarFases((f) => {
      f[PASO[clave].aprobacion] = true;
      delete f.pendientes[clave];
      return f;
    });

    // La cascada no cruza de fase: el Diseño se actualiza al aprobar la fase de Análisis.
    const fase = PASO[clave].fase;
    await actualizarEnCascada(pasosDespuesDe(clave).filter((p) => p.fase === fase));
  }

  // Botón "Actualizar" junto a la etiqueta de un paso desactualizado: regenera solo ese paso
  // con los datos nuevos (queda pendiente de revisión). El prototipo con Claude confirma el costo.
  async function actualizarPaso(clave) {
    if (clave === "prototipo" && claudeActivo()) {
      const pantallas = planPrototipo(
        contextoRef.current.prototipo,
        artefactosRef.current.prototipo
      ).length;
      const costo = pantallas * costoEstimadoPantalla(contextoRef.current.prototipo?.detalle);
      const continuar = await confirmar(
        `Costo estimado con Claude: ~$${costo.toFixed(2)} (${pantallas} pantallas).`,
        "¿Actualizar prototipo de pantallas?",
        "Actualizar"
      );
      if (!continuar) return;
    }
    await ejecutarCascada([PASO[clave]]);
  }

  // "Actualizar todo": regenera de una vez toda la cadena desactualizada. Si incluye el prototipo
  // con Claude, se confirma antes el costo.
  async function actualizarTodo() {
    const pasos = desactualizados();
    if (!pasos.length) return;
    if (pasos.some((p) => p.clave === "prototipo") && claudeActivo()) {
      const pantallas = planPrototipo(
        contextoRef.current.prototipo,
        artefactosRef.current.prototipo
      ).length;
      const costo = pantallas * costoEstimadoPantalla(contextoRef.current.prototipo?.detalle);
      const continuar = await confirmar(
        `Se regenerarán: ${listarNombres(pasos)}.\n\nCosto estimado del prototipo con Claude: ~$${costo.toFixed(2)} (${pantallas} pantallas).`,
        "¿Actualizar todo?",
        "Actualizar todo"
      );
      if (!continuar) return;
    }
    await ejecutarCascada(pasos);
  }

  // Actualización paso a paso: al aprobar un paso que cambió se ofrece solo el SIGUIENTE paso
  // desactualizado. Si se actualiza, queda pendiente de revisión y, al aprobarlo (ya con las
  // correcciones que hagan falta), se ofrece el que sigue: así nada se regenera dos veces. Si
  // se conserva, queda aprobado tal cual y se ofrece de inmediato el siguiente.
  // Para regenerar toda la cadena de una vez está "Actualizar todo" en el aviso de arriba.
  async function actualizarEnCascada(pasos) {
    const [siguiente] = desactualizados(pasos);
    if (!siguiente) return;

    // Regenerar el prototipo con Claude es lo más caro: se avisa el costo.
    const pantallas =
      siguiente.clave === "prototipo"
        ? planPrototipo(contextoRef.current.prototipo, artefactosRef.current.prototipo).length
        : 0;
    const avisoCosto =
      claudeActivo() && pantallas
        ? `\n\nCosto estimado con Claude: ~$${(
            pantallas * costoEstimadoPantalla(contextoRef.current.prototipo?.detalle)
          ).toFixed(2)} (${pantallas} pantallas).`
        : "";

    // Editar no es eliminar: se elige entre regenerar o conservar. Cerrar la ventana (null) no
    // decide: queda desactualizado para después.
    const respuesta = await confirmar(
      `Se generó con la versión anterior del paso que cambiaste.` + avisoCosto,
      `¿Actualizar ${siguiente.nombre.toLowerCase()}?`,
      "Actualizar",
      "Conservar como está"
    );
    if (respuesta === true) {
      await ejecutarCascada([siguiente]);
    } else if (respuesta === false) {
      await conservarDesactualizados([siguiente], { preguntar: false });
      await actualizarEnCascada(pasos);
    }
  }

  // Aprobación general de la fase de Análisis: requiere sus dos subfases aprobadas y habilita
  // el Diseño (actualizándolo en cascada si quedó desactualizado).
  async function aprobarFaseAnalisis() {
    await guardarFases((f) => {
      f.analisis = true;
      return f;
    });
    await actualizarEnCascada(PASOS.filter((p) => p.fase === "diseno"));
  }

  // Aprobación general de la fase de Diseño: requiere todas sus subfases aprobadas.
  async function aprobarFaseDiseno() {
    await guardarFases((f) => {
      f.diseno = true;
      return f;
    });
  }

  // ---------- Datos del proyecto ----------

  async function guardarProyecto() {
    const nombre = borrador.nombre.trim();
    const prompt = borrador.prompt.trim();
    if (!nombre || !prompt) {
      mostrarError("El nombre y la descripción no pueden quedar vacíos.", "Faltan datos");
      return;
    }

    // Cambios solo de espacios o saltos de línea no cuentan: no cambian lo que la IA entiende.
    const sinEspacios = (texto) => (texto || "").replace(/\s+/g, " ").trim();
    const cambioDescripcion = sinEspacios(prompt) !== sinEspacios(proyectoRef.current.prompt);
    setGuardandoProyecto(true);
    try {
      const { error } = await supabase.from("proyectos").update({ nombre, prompt }).eq("id", id);
      if (error) throw error;
      proyectoRef.current = { ...proyectoRef.current, nombre, prompt };
      setProyecto(proyectoRef.current);
      setBorrador(null);
    } catch (err) {
      mostrarError(err.message, "No se pudo guardar el proyecto");
      return;
    } finally {
      setGuardandoProyecto(false);
    }

    const afectados = PASOS.filter((p) => artefactosRef.current[p.clave]);
    if (!cambioDescripcion || !afectados.length) return;

    // Todo se generó a partir de la descripción anterior: se pregunta ANTES de marcar nada, para
    // poder conservar lo actual si el cambio no lo amerita.
    const actualizar = await confirmar(
      `Todo lo generado (${listarNombres(afectados)}) se basa en la descripción anterior.\n\n` +
        `Actualizar todo: se regenera en cascada, empezando por los requerimientos (se perderán los cambios hechos a mano). ` +
        `Cada paso quedará pendiente de tu revisión y aprobación.\n\n` +
        `Conservar lo actual: se guarda la nueva descripción sin tocar nada de lo generado.`,
      "Cambiaste la descripción",
      "Actualizar todo",
      "Conservar lo actual"
    );
    if (!actualizar) return;

    await marcarCambio(null, {}, undefined, { silencioso: true });
    await ejecutarCascada(afectados);
  }

  // "Conservar como está": quita las marcas de desactualizado sin regenerar nada y devuelve a
  // esos pasos la aprobación que tenían antes del cambio (si no se registró, se dan por
  // aprobados: el usuario decide conservarlos tal como están).
  // pasos: cuáles conservar (por defecto, todos los desactualizados); preguntar: false cuando
  // el usuario ya lo eligió en otra ventana (ej. la de "¿Actualizar en cascada?").
  async function conservarDesactualizados(pasos = desactualizados(), { preguntar = true } = {}) {
    if (!pasos.length) return;
    if (
      preguntar &&
      !(await confirmar(
        `Se conservarán tal como están, sin regenerarlos: ${listarNombres(pasos)}. Recuperarán su aprobación.`,
        "¿Conservar como está?",
        "Conservar"
      ))
    ) {
      return;
    }

    await guardarFases((f) => {
      for (const p of pasos) {
        delete f.pendientes[p.clave];
        f[p.aprobacion] = f.aprobacionesPrevias?.[p.clave] ?? true;
      }
      // Las fases vuelven a quedar aprobadas si lo estaban y todas sus subfases lo están. En el
      // Análisis, una aprobación sin registrar cuenta como aprobada (proyectos anteriores a las
      // subfases); en el Diseño debe ser explícita, o un paso nunca generado lo completaría.
      const faseCompleta = (fase) =>
        PASOS.filter((p) => p.fase === fase).every((p) =>
          fase === "analisis" ? f[p.aprobacion] !== false : f[p.aprobacion] === true
        );
      f.analisis = (f.fasesPrevias?.analisis ?? true) && faseCompleta("analisis");
      f.diseno = (f.fasesPrevias?.diseno ?? true) && faseCompleta("diseno");
      delete f.aprobacionesPrevias;
      delete f.fasesPrevias;
      return f;
    });
  }

  // ---------- Eliminación ----------

  // tambien: otros pasos que se eliminan junto con este; introduccion: texto al inicio del
  // mensaje de confirmación; textoConfirmar: etiqueta del botón que confirma.
  //
  // Eliminar no es editar: lo que viene después se construyó sobre este paso, así que se
  // elimina siempre en cascada (editar, en cambio, deja los siguientes desactualizados).
  async function eliminarPaso(clave, titulo, { tambien = [], introduccion, textoConfirmar } = {}) {
    const borrar = [clave, ...tambien];
    const siguientes = pasosDespuesDe(borrar[borrar.length - 1]).filter(
      (p) => artefactosRef.current[p.clave]
    );

    const partes = introduccion ? [introduccion] : [];
    const tambienSeBorran = [...tambien.map((c) => PASO[c]), ...siguientes];
    if (tambienSeBorran.length) {
      partes.push(`También se eliminará: ${listarNombres(tambienSeBorran)}.`);
    }
    if (!(await confirmar(partes.join(" ") || "Tendrás que generarlo de nuevo.", titulo, textoConfirmar))) {
      return;
    }

    borrar.push(...siguientes.map((p) => p.clave));
    for (const c of borrar) await guardarArtefacto(c, null);

    // Lo borrado deja de tener modelo, estado y aprobación; ya no queda nada que marcar como
    // desactualizado, así que no hay aviso.
    await guardarFases((f) => {
      for (const c of borrar) {
        delete f.modelos[c];
        delete f.pendientes[c];
        f[PASO[c].aprobacion] = false;
      }
      return f;
    });
    await marcarCambio(clave, {}, undefined, { silencioso: true });
  }

  // Rechazar un paso generado: se descarta para ajustar las indicaciones y generarlo de nuevo.
  function rechazarPaso(clave, titulo) {
    return eliminarPaso(clave, titulo, {
      introduccion: "Se descartará para que ajustes las indicaciones y lo generes de nuevo.",
      textoConfirmar: "Rechazar",
    });
  }

  async function eliminarActor(nombre) {
    const analisis = artefactosRef.current.analisis;
    const tieneActor = (r) =>
      Array.isArray(r.actores) ? r.actores.includes(nombre) : r.actores === nombre;
    const quitarActor = (lista = []) =>
      lista.map((r) =>
        tieneActor(r)
          ? { ...r, actores: Array.isArray(r.actores) ? r.actores.filter((a) => a !== nombre) : [] }
          : r
      );

    const usan = [
      ...(analisis.requerimientos_funcionales || []),
      ...(analisis.requerimientos_no_funcionales || []),
    ]
      .filter(tieneActor)
      .map((r) => r.codigo);
    const afectados = pasosDespuesDe("analisis").filter((p) => artefactosRef.current[p.clave]);

    let mensaje = usan.length
      ? `Se quitará también de los requerimientos que lo tienen asignado (${usan.join(", ")}). ` +
        `Si alguna descripción lo menciona por nombre, regenera los requerimientos para que desaparezca del todo.`
      : "Ningún requerimiento lo tiene asignado.";
    if (afectados.length) {
      mensaje += ` Al volver a aprobar los requerimientos se actualizarán automáticamente: ${listarNombres(afectados)}.`;
    }
    if (!(await confirmar(mensaje, `¿Quitar el actor ${nombre}?`, "Quitar"))) return;

    const actualizado = {
      ...analisis,
      actores: (analisis.actores || []).filter((a) => a.nombre !== nombre),
      requerimientos_funcionales: quitarActor(analisis.requerimientos_funcionales),
      requerimientos_no_funcionales: quitarActor(analisis.requerimientos_no_funcionales),
    };

    try {
      await guardarArtefacto("analisis", actualizado);
      await marcarCambio("analisis");
    } catch (err) {
      mostrarError(err.message, "No se pudo quitar el actor");
    }
  }

  // Guardar el código (Mermaid o PlantUML) editado a mano: cuenta como un cambio del paso (pierde
  // la aprobación y los pasos siguientes quedan desactualizados). Devuelve false si falla.
  async function guardarCodigoDiagrama(clave, codigo) {
    try {
      await guardarArtefacto(clave, limpiarDiagrama(codigo));
      await marcarCambio(clave, {}, "manual");
      return true;
    } catch (err) {
      mostrarError(err.message, "No se pudo guardar el código");
      return false;
    }
  }

  // Editar un requerimiento existente (codigoOriginal) o agregar uno escrito a mano (null).
  async function guardarRequerimiento(tipo, codigoOriginal, datos, codigo) {
    const analisis = artefactosRef.current.analisis;
    const lista = analisis[tipo] || [];
    const nuevaLista = codigoOriginal
      ? lista.map((r) => (r.codigo === codigoOriginal ? { ...r, ...datos } : r))
      : [...lista, { codigo, dependencias: [], ...datos }];

    try {
      await guardarArtefacto("analisis", { ...analisis, [tipo]: nuevaLista });
      await marcarCambio("analisis");
    } catch (err) {
      mostrarError(err.message, "No se pudo guardar el requerimiento");
    }
  }

  // Pide a la IA solo los actores y requerimientos que faltan, y los existentes que el usuario
  // pidió cambiar. Los nuevos se agregan y los cambiados se reemplazan en su lugar, marcados
  // (NUEVO / MODIFICADO) hasta que se aprueben. Devuelve true si cambió algo.
  async function ampliarAnalisis(instruccion) {
    setCargando({ paso: "ampliar:analisis" });
    try {
      const analisis = artefactosRef.current.analisis;
      const data = await pedirIA("/api/ampliar-analisis", {
        prompt: proyectoRef.current.prompt,
        documentoTexto: proyectoRef.current.documento_texto,
        contexto: contextoRef.current,
        analisis,
        instruccion,
      });
      if (data.error) throw new Error(data.error);

      const actores = data.actores_nuevos || [];
      const rf = data.requerimientos_funcionales || [];
      const rnf = data.requerimientos_no_funcionales || [];
      const modRF = data.modificados_funcionales || [];
      const modRNF = data.modificados_no_funcionales || [];
      if (!actores.length && !rf.length && !rnf.length && !modRF.length && !modRNF.length) {
        mostrarInfo(
          "La IA consideró que lo que pides ya está cubierto por los requerimientos actuales. Prueba a describirlo con más detalle.",
          "No se cambió nada"
        );
        return false;
      }

      const marcarNuevo = (lista) => lista.map((x) => ({ ...x, nuevo: true }));
      // Un requerimiento que ya era nuevo (aún sin aprobar) sigue marcado como nuevo.
      const aplicarCambios = (lista = [], cambios) =>
        lista.map((r) => {
          const cambio = cambios.find((c) => c.codigo === r.codigo);
          if (!cambio) return r;
          return r.nuevo ? { ...r, ...cambio } : { ...r, ...cambio, modificado: true };
        });
      await guardarArtefacto("analisis", {
        ...analisis,
        actores: [...(analisis.actores || []), ...marcarNuevo(actores)],
        requerimientos_funcionales: [
          ...aplicarCambios(analisis.requerimientos_funcionales, modRF),
          ...marcarNuevo(rf),
        ],
        requerimientos_no_funcionales: [
          ...aplicarCambios(analisis.requerimientos_no_funcionales, modRNF),
          ...marcarNuevo(rnf),
        ],
      });
      await marcarCambio("analisis");

      const resumen = [
        rf.length && `${rf.length} requerimiento(s) funcional(es) nuevo(s)`,
        rnf.length && `${rnf.length} no funcional(es) nuevo(s)`,
        actores.length && `${actores.length} actor(es) nuevo(s)`,
        modRF.length + modRNF.length &&
          `${modRF.length + modRNF.length} modificado(s): ${[...modRF, ...modRNF]
            .map((r) => r.codigo)
            .join(", ")}`,
      ].filter(Boolean);
      mostrarInfo(
        `${resumen.join(". ")}. Aparecen marcados para que los revises.`,
        `Análisis actualizado con ${data.modelo_ia}`
      );
      return true;
    } catch (err) {
      mostrarError(err.message, "No se pudo ampliar el análisis");
      return false;
    } finally {
      setCargando(null);
    }
  }

  // "Ampliar con IA" de un diagrama: la IA aplica el cambio sobre el código actual. Cuenta como
  // un cambio del paso (pierde la aprobación y los siguientes quedan desactualizados).
  async function ampliarDiagrama(clave, instruccion) {
    setCargando({ paso: `ampliar:${clave}` });
    try {
      const actual = artefactosRef.current[clave];
      const data = await pedirIA("/api/modificar-diagrama", {
        nombre: PASO[clave].nombre,
        codigo: actual,
        analisis: artefactosRef.current.analisis,
        instruccion,
      });
      if (data.error) throw new Error(data.error);

      // Se responde en el mismo lenguaje del diagrama actual (Mermaid o PlantUML).
      const codigo = esPlantUML(actual) ? limpiarPlantUML(data.codigo) : limpiarMermaid(data.codigo);
      if (codigo === actual) {
        mostrarInfo(
          "La IA consideró que el diagrama ya refleja lo que pides. Prueba a describirlo con más detalle.",
          "No se cambió nada"
        );
        return false;
      }
      // Si la IA devolvió un diagrama inválido, guardarArtefacto falla sin tocar nada.
      await guardarArtefacto(clave, codigo);
      await marcarCambio(clave, {}, data.modelo_ia);
      return true;
    } catch (err) {
      mostrarError(err.message, `No se pudo modificar: ${PASO[clave].nombre}`);
      return false;
    } finally {
      setCargando(null);
    }
  }

  // "Ampliar con IA" de una pantalla del prototipo: la IA aplica el cambio sobre su HTML actual.
  async function ampliarPantalla(indice, instruccion) {
    const pantalla = artefactosRef.current.prototipo[indice];
    setCargando({ paso: "ampliar:prototipo" });
    try {
      const data = await pedirIA("/api/modificar-pantalla", {
        nombre: pantalla.nombre,
        html: pantalla.html,
        analisis: artefactosRef.current.analisis,
        diagramaEr: artefactosRef.current.er,
        detalle: contextoRef.current.prototipo?.detalle,
        instruccion,
      });
      if (data.error) throw new Error(data.error);

      // Se busca por nombre: la lista pudo cambiar mientras la IA respondía.
      await guardarArtefacto(
        "prototipo",
        artefactosRef.current.prototipo.map((p) =>
          p.nombre === pantalla.nombre ? { ...p, html: data.html, modelo: data.modelo_ia } : p
        )
      );
      await marcarCambio("prototipo", {}, data.modelo_ia);
      return true;
    } catch (err) {
      mostrarError(err.message, `No se pudo modificar la pantalla "${pantalla.nombre}"`);
      return false;
    } finally {
      setCargando(null);
    }
  }

  // "Ampliar con IA" con una pantalla nueva: se agrega a la lista de pantallas del prototipo
  // (con la descripción escrita) y se genera con el mismo estilo que las demás.
  async function agregarPantallaConIA(nombre, plataforma, descripcion) {
    const actuales = artefactosRef.current.prototipo || [];
    if (actuales.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      mostrarError(`Ya existe una pantalla llamada "${nombre}".`, "Nombre repetido");
      return false;
    }

    const config = contextoRef.current.prototipo || {};
    const nueva = {
      id: crypto.randomUUID(),
      nombre,
      descripcion,
      rfs: [],
      actores: [],
      plataforma,
      seleccionada: true,
      origen: "manual",
    };
    // Proyectos sin lista de pantallas: se parte del plan actual para no perder las generadas.
    const lista = config.pantallas?.length
      ? config.pantallas
      : planPrototipo(config, actuales).map((p) => ({
          ...p,
          id: crypto.randomUUID(),
          seleccionada: true,
          origen: "manual",
        }));
    cambiarConfigPrototipo({ ...config, pantallas: [...lista, nueva] });

    setCargando({ paso: "ampliar:prototipo" });
    try {
      // Se guarda dentro de generarPantallas (y cuenta como un cambio del prototipo).
      const { generadas, fallidas } = await generarPantallas([nueva]);
      if (!generadas.length) throw new Error(fallidas.join("\n"));
      return true;
    } catch (err) {
      mostrarError(
        `${err.message}\n\nQuedó en la lista de pantallas: puedes generarla con "Agregar faltantes".`,
        "No se pudo generar la pantalla"
      );
      return false;
    } finally {
      setCargando(null);
    }
  }

  async function eliminarRequerimiento(tipo, codigo) {
    const afectados = pasosDespuesDe("analisis").filter((p) => artefactosRef.current[p.clave]);
    let mensaje = "Se quitará también de las dependencias de los demás requerimientos.";
    if (afectados.length) {
      mensaje += ` Al volver a aprobar los requerimientos se actualizarán automáticamente: ${listarNombres(afectados)}.`;
    }
    if (!(await confirmar(mensaje, `¿Eliminar el requerimiento ${codigo}?`))) return;

    const analisis = artefactosRef.current.analisis;
    // Se quita también de las dependencias de los demás para no dejar referencias rotas.
    const limpiarDependencias = (lista = []) =>
      lista.map((r) =>
        Array.isArray(r.dependencias)
          ? { ...r, dependencias: r.dependencias.filter((d) => d !== codigo) }
          : r
      );

    const actualizado = {
      ...analisis,
      requerimientos_funcionales: limpiarDependencias(analisis.requerimientos_funcionales),
      requerimientos_no_funcionales: limpiarDependencias(analisis.requerimientos_no_funcionales),
    };
    actualizado[tipo] = actualizado[tipo].filter((r) => r.codigo !== codigo);

    try {
      await guardarArtefacto("analisis", actualizado);
      await marcarCambio("analisis");
    } catch (err) {
      mostrarError(err.message, "No se pudo eliminar el requerimiento");
    }
  }

  if (!proyecto) return <p>Cargando...</p>;

  const resultado = artefactos.analisis;
  const pendientes = fasesAprobadas.pendientes || {};
  const modelos = fasesAprobadas.modelos || {};
  const ocupado = !!cargando || !!progreso;
  const generando = (clave) => cargando?.paso === clave;

  // Proyectos anteriores a la aprobación de requerimientos: cuentan como aprobados si ya se avanzó.
  const requerimientosAprobados =
    fasesAprobadas.requerimientos === undefined
      ? !!(fasesAprobadas.analisis || artefactos.casos_uso)
      : !!fasesAprobadas.requerimientos;

  // Proyectos anteriores a la subfase "casos de uso": estaba aprobada si la fase lo estaba.
  const casosUsoAprobados =
    fasesAprobadas.casos_uso === undefined
      ? !!fasesAprobadas.analisis
      : !!fasesAprobadas.casos_uso;

  const aprobado = (clave) =>
    clave === "analisis"
      ? requerimientosAprobados
      : clave === "casos_uso"
      ? casosUsoAprobados
      : !!fasesAprobadas[PASO[clave].aprobacion];
  const bloqueado = (clave) => aprobado(clave) && !desbloqueados.includes(clave);
  const enEdicion = (clave) => aprobado(clave) && desbloqueados.includes(clave);

  // Un paso se puede trabajar (generar, editar, aprobar) cuando el anterior está aprobado. Si ya
  // estaba generado, se sigue viendo aunque el anterior haya perdido la aprobación por una
  // edición: aparece con su estado (ej. desactualizado) pero sin controles hasta entonces.
  const PUEDE_TRABAJARSE = {
    casos_uso: requerimientosAprobados,
    clases: !!fasesAprobadas.analisis,
    er: !!fasesAprobadas.diseno_clases,
    prototipo: !!fasesAprobadas.diseno_er,
    arbol: !!fasesAprobadas.diseno_prototipo,
    arquitectura: !!fasesAprobadas.diseno_arbol,
    sistema: !!fasesAprobadas.diseno_arquitectura,
  };
  const trabajable = (clave) => PUEDE_TRABAJARSE[clave];
  const visible = (clave) => trabajable(clave) || !!artefactos[clave];
  const hayDiseno = PASOS.some((p) => p.fase === "diseno" && artefactos[p.clave]);

  const configPrototipo = contexto.prototipo || {};
  const planActual = planPrototipo(configPrototipo, artefactos.prototipo);
  const nombresGenerados = (artefactos.prototipo || []).map((p) => p.nombre);
  const faltantes = planActual.filter((p) => !nombresGenerados.includes(p.nombre));
  const analisisEditable = !ocupado && !bloqueado("analisis");

  // Proyectos anteriores a la aprobación general del Diseño: contaba la arquitectura.
  const disenoAprobado =
    fasesAprobadas.diseno === undefined
      ? !!fasesAprobadas.diseno_arquitectura
      : !!fasesAprobadas.diseno;

  const faseActual = !fasesAprobadas.analisis ? "analisis" : !disenoAprobado ? "diseno" : null;

  // Recuadro "Ampliar con IA" bajo un diagrama ya generado que se puede trabajar.
  const recuadroAmpliar = (clave) =>
    svgs[clave] &&
    trabajable(clave) &&
    !bloqueado(clave) && (
      <AmpliarConIA
        descripcion="Describe qué agregar o cambiar. La IA ajusta el diagrama actual sin generarlo de nuevo."
        ejemplo={EJEMPLO_AMPLIAR[clave]}
        onEnviar={(instruccion) => ampliarDiagrama(clave, instruccion)}
        cargando={generando(`ampliar:${clave}`)}
        deshabilitado={ocupado}
      />
    );

  const aviso = (
    <AvisoCascada
      progreso={progreso}
      desactualizados={PASOS.filter(
        (p) => pendientes[p.clave] === "desactualizado" && artefactos[p.clave]
      )}
      ocupado={ocupado}
      onDetener={detenerGeneracion}
      deteniendo={deteniendo}
      onActualizar={() => actualizarTodo()}
      onConservar={() => conservarDesactualizados()}
    />
  );

  return (
    <div>
      {vista === "resumen" && (
        <header
          className="mb-8 bg-white border border-gray-300 p-6"
          style={{ borderLeft: `4px solid ${PALETA.navy}` }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <span
              className={`inline-block text-xs font-bold tracking-widest uppercase px-2 py-1 text-white ${DEGRADADO_AUTH}`}
            >
              Proyecto
            </span>
            {!borrador && (
              <button
                onClick={() => setBorrador({ nombre: proyecto.nombre, prompt: proyecto.prompt })}
                disabled={ocupado}
                title="Editar nombre y descripción"
                aria-label="Editar nombre y descripción"
                style={{ borderColor: PALETA.navy, color: PALETA.navy }}
                className="shrink-0 border p-2 hover:bg-gray-50 disabled:opacity-50"
              >
                <IconoLapiz />
              </button>
            )}
          </div>

          {borrador ? (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nombre del proyecto
                </span>
                <input
                  type="text"
                  value={borrador.nombre}
                  onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                  className={CLASE_INPUT}
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Descripción
                </span>
                <textarea
                  value={borrador.prompt}
                  onChange={(e) => setBorrador({ ...borrador, prompt: e.target.value })}
                  className={`${CLASE_INPUT} h-48 resize-y leading-relaxed`}
                />
              </label>
              {resultado && borrador.prompt.trim() !== proyecto.prompt && (
                <p className="text-xs text-gray-500">
                  Al cambiar la descripción, el análisis y los pasos siguientes se podrán
                  actualizar automáticamente con la nueva información.
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={guardarProyecto}
                  disabled={guardandoProyecto}
                  style={{ backgroundColor: PALETA.navy }}
                  className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
                >
                  {guardandoProyecto ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  onClick={() => setBorrador(null)}
                  disabled={guardandoProyecto}
                  className="border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {proyecto.nombre}
              </h1>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {proyecto.prompt}
              </p>
            </>
          )}
        </header>
      )}

      {vista !== "resumen" && (
        <FaseStepper
          fasesAprobadas={fasesAprobadas}
          hayDiseno={hayDiseno}
          vista={vista}
          onNavegar={setVista}
        />
      )}

      <div className="print:hidden">{aviso}</div>

      {/* ===================== INFORME ===================== */}
      {vista === "informe" &&
        (fasesAprobadas.analisis && disenoAprobado ? (
          <InformeProyecto
            proyecto={proyecto}
            contexto={contexto}
            artefactos={artefactos}
            svgs={svgs}
            renderizar={renderizar}
            onVolver={() => setVista("resumen")}
          />
        ) : (
          <p className="text-sm text-gray-600">
            El informe se habilita cuando las fases de Análisis y Diseño están aprobadas.
          </p>
        ))}

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

          <FaseIndice fasesAprobadas={fasesAprobadas} hayDiseno={hayDiseno} onNavegar={setVista} />
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
        <ContextoAnalisis
          // Se remonta al aparecer/desaparecer el análisis: abierto si no hay requerimientos
          // (ej. tras rechazarlos, para ajustar el contexto), cerrado si ya los hay.
          key={resultado ? "con-analisis" : "sin-analisis"}
          valor={contexto}
          onChange={cambiarContexto}
          estadoGuardado={estadoContexto}
          proyecto={proyecto}
          hayResultado={!!resultado}
          deshabilitado={!analisisEditable}
        />

        <ControlesPaso
          clave="analisis"
          bloqueado={bloqueado("analisis")}
          enEdicion={enEdicion("analisis")}
          deshabilitado={ocupado}
          onEditar={desbloquearPaso}
          onCancelarEdicion={cancelarEdicion}
        >
          <BotonGenerar
            onClick={() => regenerarPaso("analisis")}
            secundario={!!artefactos.analisis}
            disabled={ocupado}
            cargando={generando("analisis")}
            color={PALETA.navy}
          >
            {resultado ? "Regenerar" : "Generar"} actores y requerimientos
          </BotonGenerar>

          {resultado && (
            <BotonEliminar
              onClick={() =>
                eliminarPaso("analisis", "¿Eliminar el análisis?", { tambien: ["casos_uso"] })
              }
              disabled={ocupado}
              title="Eliminar actores y requerimientos"
            />
          )}
        </ControlesPaso>

        {resultado && (
          <>
            <AnalisisResultado
              resultado={resultado}
              modelo={modelos.analisis}
              onEliminarRequerimiento={analisisEditable ? eliminarRequerimiento : undefined}
              onEliminarActor={analisisEditable ? eliminarActor : undefined}
              onGuardarRequerimiento={analisisEditable ? guardarRequerimiento : undefined}
            />

            {!bloqueado("analisis") && (
              <AmpliarConIA
                descripcion="Describe qué agregar o cambiar. Lo nuevo y lo modificado aparece marcado para que lo revises."
                ejemplo="Ej: faltan requerimientos para el inventario de bodega; en RF03 la prioridad debe ser alta"
                onEnviar={ampliarAnalisis}
                cargando={generando("ampliar:analisis")}
                deshabilitado={ocupado}
              />
            )}

            <div className="mt-6 pt-6 border-t-2 border-gray-200 flex items-center gap-3 flex-wrap">
              <BotonAprobar
                aprobado={requerimientosAprobados}
                onClick={() => aprobarPaso("analisis")}
                etiqueta="Requerimientos"
                disabled={ocupado}
              />
              {!requerimientosAprobados && (
                <BotonRechazar
                  etiqueta="Requerimientos"
                  disabled={ocupado}
                  onClick={() =>
                    eliminarPaso("analisis", "¿Rechazar los requerimientos?", {
                      tambien: ["casos_uso"],
                      introduccion:
                        "Se descartarán los actores y requerimientos generados para que ajustes el contexto del análisis y los generes de nuevo.",
                      textoConfirmar: "Rechazar",
                    })
                  }
                />
              )}
            </div>
          </>
        )}

        {resultado && visible("casos_uso") && (
          <>
            <TituloPaso
              color={PALETA.navy}
              estado={pendientes.casos_uso}
              modelo={modelos.casos_uso}
              onActualizar={trabajable("casos_uso") ? () => actualizarPaso("casos_uso") : undefined}
              deshabilitado={ocupado}
            >
              Diagrama de casos de uso
            </TituloPaso>

            {trabajable("casos_uso") && !bloqueado("casos_uso") && (
              <CampoIndicaciones
                clave="casos_uso"
                valor={contexto.indicaciones?.casos_uso}
                onChange={cambiarIndicaciones}
                deshabilitado={ocupado}
                ejemplo="Ej: agrupa los casos de uso por módulo; no muestres el actor Sistema"
              />
            )}

            <ControlesPaso
              clave="casos_uso"
              esperando={!trabajable("casos_uso")}
              bloqueado={bloqueado("casos_uso")}
              enEdicion={enEdicion("casos_uso")}
              deshabilitado={ocupado}
              onEditar={desbloquearPaso}
              onCancelarEdicion={cancelarEdicion}
            >
              <BotonGenerar
                onClick={() => regenerarPaso("casos_uso")}
                secundario={!!artefactos.casos_uso}
                disabled={ocupado}
                cargando={generando("casos_uso")}
                color={PALETA.negro}
                textoCargando="Generando diagrama..."
              >
                {artefactos.casos_uso ? "Regenerar" : "Generar"} diagrama de casos de uso
              </BotonGenerar>

              {svgs.casos_uso && (
                <BotonEliminar
                  onClick={() => eliminarPaso("casos_uso", "¿Eliminar el diagrama de casos de uso?")}
                  disabled={ocupado}
                  title="Eliminar diagrama de casos de uso"
                />
              )}
            </ControlesPaso>

            <DiagramaBox
              svg={svgs.casos_uso}
              titulo="Diagrama de casos de uso"
              nombreArchivo="diagrama-casos-de-uso"
              codigo={artefactos.casos_uso}
              renderizar={renderizar}
              editable={!ocupado && trabajable("casos_uso") && !bloqueado("casos_uso")}
              onGuardarCodigo={(codigo) => guardarCodigoDiagrama("casos_uso", codigo)}
            />

            {recuadroAmpliar("casos_uso")}

            {svgs.casos_uso && trabajable("casos_uso") && (
              <div className="mt-6 pt-6 border-t-2 border-gray-200 flex items-center gap-3 flex-wrap">
                <BotonAprobar
                  aprobado={casosUsoAprobados}
                  onClick={() => aprobarPaso("casos_uso")}
                  etiqueta="Casos de uso"
                  disabled={ocupado}
                />
                {!casosUsoAprobados && (
                  <BotonRechazar
                    etiqueta="Casos de uso"
                    disabled={ocupado}
                    onClick={() =>
                      rechazarPaso("casos_uso", "¿Rechazar el diagrama de casos de uso?")
                    }
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* --- Aprobación general de la fase: requiere las dos subfases aprobadas --- */}
        {requerimientosAprobados && casosUsoAprobados && svgs.casos_uso && (
          <div
            className="mt-8 border-2 p-4 flex items-center justify-between gap-3 flex-wrap"
            style={{ borderColor: fasesAprobadas.analisis ? PALETA.oliva : PALETA.navy }}
          >
            <div>
              <p className="text-sm font-bold text-gray-900">Fase de Análisis</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fasesAprobadas.analisis
                  ? "Aprobada. Ya puedes continuar con el Diseño."
                  : "Requerimientos y casos de uso aprobados."}
              </p>
            </div>
            {fasesAprobadas.analisis ? (
              <button
                onClick={() => setVista("diseno")}
                style={{ backgroundColor: PALETA.navy }}
                className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
              >
                Continuar a Diseño →
              </button>
            ) : (
              <button
                onClick={aprobarFaseAnalisis}
                disabled={ocupado}
                style={{ backgroundColor: PALETA.oliva }}
                className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
              >
                Aprobar fase de Análisis
              </button>
            )}
          </div>
        )}
        </div>
      </section>
      )}

      {/* ===================== DISEÑO ===================== */}
      {vista === "diseno" && (fasesAprobadas.analisis || hayDiseno) && (
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
            <div className="flex items-center gap-4">
              {fasesAprobadas.analisis && disenoAprobado && (
                <button
                  onClick={() => setVista("informe")}
                  className="border border-white text-white px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
                >
                  Continuar al Informe →
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
            {/* --- Diagrama de clases --- */}
            {visible("clases") && (
              <>
                <TituloPaso
                  color={PALETA.naranjaOscuro}
                  estado={pendientes.clases}
                  modelo={modelos.clases}
                  onActualizar={trabajable("clases") ? () => actualizarPaso("clases") : undefined}
                  deshabilitado={ocupado}
                  separador={false}
                >
                  Diagrama de clases
                </TituloPaso>

                {trabajable("clases") && !bloqueado("clases") && (
                  <CampoIndicaciones
                    clave="clases"
                    valor={contexto.indicaciones?.clases}
                    onChange={cambiarIndicaciones}
                    deshabilitado={ocupado}
                    ejemplo="Ej: usa herencia para los tipos de parte"
                  />
                )}

                <ControlesPaso
                  clave="clases"
                  esperando={!trabajable("clases")}
                  bloqueado={bloqueado("clases")}
                  enEdicion={enEdicion("clases")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => regenerarPaso("clases")}
                    secundario={!!artefactos.clases}
                    disabled={ocupado}
                    cargando={generando("clases")}
                    color={PALETA.naranjaOscuro}
                  >
                    {artefactos.clases ? "Regenerar" : "Generar"} diagrama de clases
                  </BotonGenerar>

                  {svgs.clases && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("clases", "¿Eliminar el diagrama de clases?")}
                      disabled={ocupado}
                      title="Eliminar diagrama de clases"
                    />
                  )}
                </ControlesPaso>

                <DiagramaBox
                  svg={svgs.clases}
                  titulo="Diagrama de clases"
                  nombreArchivo="diagrama-de-clases"
                  codigo={artefactos.clases}
                  renderizar={renderizar}
                  editable={!ocupado && trabajable("clases") && !bloqueado("clases")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("clases", codigo)}
                />

                {recuadroAmpliar("clases")}

                {svgs.clases && trabajable("clases") && (
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_clases}
                      onClick={() => aprobarPaso("clases")}
                      etiqueta="Diagrama de clases"
                      disabled={ocupado}
                    />
                    {!fasesAprobadas.diseno_clases && (
                      <BotonRechazar
                        etiqueta="Diagrama de clases"
                        disabled={ocupado}
                        onClick={() => rechazarPaso("clases", "¿Rechazar el diagrama de clases?")}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- Diagrama entidad-relación --- */}
            <TituloPaso
              color={PALETA.naranjaOscuro}
              estado={pendientes.er}
              modelo={modelos.er}
              onActualizar={trabajable("er") ? () => actualizarPaso("er") : undefined}
              deshabilitado={ocupado}
              separador={visible("clases")}
            >
              Diagrama entidad-relación
            </TituloPaso>

            {trabajable("er") && !bloqueado("er") && (
              <CampoIndicaciones
                clave="er"
                valor={contexto.indicaciones?.er}
                onChange={cambiarIndicaciones}
                deshabilitado={ocupado}
                ejemplo="Ej: incluye una tabla de auditoría; nombres de entidades en singular"
              />
            )}

            <ControlesPaso
              clave="er"
              esperando={!trabajable("er")}
              bloqueado={bloqueado("er")}
              enEdicion={enEdicion("er")}
              deshabilitado={ocupado}
              onEditar={desbloquearPaso}
              onCancelarEdicion={cancelarEdicion}
            >
              <BotonGenerar
                onClick={() => regenerarPaso("er")}
                secundario={!!artefactos.er}
                disabled={ocupado}
                cargando={generando("er")}
                color={PALETA.naranjaOscuro}
              >
                {artefactos.er ? "Regenerar" : "Generar"} diagrama entidad-relación
              </BotonGenerar>

              {svgs.er && (
                <BotonEliminar
                  onClick={() => eliminarPaso("er", "¿Eliminar el diagrama entidad-relación?")}
                  disabled={ocupado}
                  title="Eliminar diagrama entidad-relación"
                />
              )}
            </ControlesPaso>

            <DiagramaBox
              svg={svgs.er}
              titulo="Diagrama entidad-relación"
              nombreArchivo="diagrama-entidad-relacion"
              codigo={artefactos.er}
              renderizar={renderizar}
              editable={!ocupado && trabajable("er") && !bloqueado("er")}
              onGuardarCodigo={(codigo) => guardarCodigoDiagrama("er", codigo)}
            />

            {recuadroAmpliar("er")}

            {svgs.er && trabajable("er") && (
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <BotonAprobar
                  aprobado={!!fasesAprobadas.diseno_er}
                  onClick={() => aprobarPaso("er")}
                  etiqueta="Diagrama entidad-relación"
                  disabled={ocupado}
                />
                {!fasesAprobadas.diseno_er && (
                  <BotonRechazar
                    etiqueta="Diagrama entidad-relación"
                    disabled={ocupado}
                    onClick={() => rechazarPaso("er", "¿Rechazar el diagrama entidad-relación?")}
                  />
                )}
              </div>
            )}

            {/* --- Prototipo de pantallas --- */}
            {visible("prototipo") && (
              <>
                <TituloPaso
                  color={PALETA.naranjaOscuro}
                  estado={pendientes.prototipo}
                  modelo={modelos.prototipo}
                  onActualizar={trabajable("prototipo") ? () => actualizarPaso("prototipo") : undefined}
                  deshabilitado={ocupado}
                >
                  Prototipo de pantallas
                </TituloPaso>

                {trabajable("prototipo") && !bloqueado("prototipo") && (
                  <>
                    <ConfigPrototipo
                      valor={configPrototipo}
                      onChange={cambiarConfigPrototipo}
                      plataformasPorDefecto={plataformasDePrototipo(contexto)}
                      generadas={nombresGenerados}
                      deshabilitado={ocupado}
                      onProponer={proponerPantallas}
                      proponiendo={generando("proponer")}
                      onSubirImagen={subirImagenEstilo}
                    />
                    <CampoIndicaciones
                      clave="prototipo"
                      valor={contexto.indicaciones?.prototipo}
                      onChange={cambiarIndicaciones}
                      deshabilitado={ocupado}
                      ejemplo="Ej: el dashboard debe tener un mapa con las unidades"
                    />
                  </>
                )}

                <ControlesPaso
                  clave="prototipo"
                  esperando={!trabajable("prototipo")}
                  bloqueado={bloqueado("prototipo")}
                  enEdicion={enEdicion("prototipo")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => regenerarPaso("prototipo")}
                    secundario={!!artefactos.prototipo}
                    disabled={ocupado || !planActual.length}
                    cargando={generando("prototipo")}
                    textoCargando={cargando?.detalle || "Generando..."}
                    color={PALETA.naranjaOscuro}
                  >
                    {artefactos.prototipo ? "Regenerar prototipo" : "Generar prototipo"} (
                    {planActual.length} {planActual.length === 1 ? "pantalla" : "pantallas"})
                  </BotonGenerar>

                  {generando("prototipo") && cargando.lote && (
                    <BotonDetener onClick={detenerGeneracion} deteniendo={deteniendo} />
                  )}

                  {!ocupado && artefactos.prototipo && faltantes.length > 0 && (
                    <button
                      onClick={agregarPantallasFaltantes}
                      disabled={ocupado}
                      style={{ borderColor: PALETA.naranjaOscuro, color: PALETA.naranjaOscuro }}
                      className="border bg-transparent hover:bg-orange-50 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Agregar faltantes ({faltantes.length})
                    </button>
                  )}

                  {artefactos.prototipo && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("prototipo", "¿Eliminar el prototipo?")}
                      disabled={ocupado}
                      title="Eliminar todas las pantallas"
                    />
                  )}
                </ControlesPaso>

                <MockupsGenerator
                  mockups={artefactos.prototipo}
                  deshabilitado={ocupado}
                  bloqueado={bloqueado("prototipo") || !trabajable("prototipo")}
                  regenerando={generando("prototipo") ? cargando.indice ?? null : null}
                  onRegenerar={regenerarPantalla}
                  onQuitar={quitarPantalla}
                  onGuardarHtml={guardarHtmlPantalla}
                />

                {artefactos.prototipo?.length > 0 &&
                  trabajable("prototipo") &&
                  !bloqueado("prototipo") && (
                    <AmpliarPrototipo
                      pantallas={artefactos.prototipo}
                      plataformas={
                        configPrototipo.plataformas?.length
                          ? configPrototipo.plataformas
                          : plataformasDePrototipo(contexto)
                      }
                      onModificar={ampliarPantalla}
                      onAgregar={agregarPantallaConIA}
                      cargando={generando("ampliar:prototipo")}
                      deshabilitado={ocupado}
                    />
                  )}

                {artefactos.prototipo && trabajable("prototipo") && (
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_prototipo}
                      onClick={() => aprobarPaso("prototipo")}
                      etiqueta="Prototipo"
                      disabled={ocupado}
                    />
                    {!fasesAprobadas.diseno_prototipo && (
                      <BotonRechazar
                        etiqueta="Prototipo"
                        disabled={ocupado}
                        onClick={() => rechazarPaso("prototipo", "¿Rechazar el prototipo?")}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- Árbol de navegación --- */}
            {visible("arbol") && (
              <>
                <TituloPaso
                  color={PALETA.naranjaOscuro}
                  estado={pendientes.arbol}
                  modelo={modelos.arbol}
                  onActualizar={trabajable("arbol") ? () => actualizarPaso("arbol") : undefined}
                  deshabilitado={ocupado}
                >
                  Árbol de navegación
                </TituloPaso>

                {trabajable("arbol") && !bloqueado("arbol") && (
                  <CampoIndicaciones
                    clave="arbol"
                    valor={contexto.indicaciones?.arbol}
                    onChange={cambiarIndicaciones}
                    deshabilitado={ocupado}
                    ejemplo="Ej: separa la navegación por rol"
                  />
                )}

                <ControlesPaso
                  clave="arbol"
                  esperando={!trabajable("arbol")}
                  bloqueado={bloqueado("arbol")}
                  enEdicion={enEdicion("arbol")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => regenerarPaso("arbol")}
                    secundario={!!artefactos.arbol}
                    disabled={ocupado}
                    cargando={generando("arbol")}
                    color={PALETA.naranjaOscuro}
                  >
                    {artefactos.arbol ? "Regenerar" : "Generar"} árbol de navegación
                  </BotonGenerar>

                  {svgs.arbol && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("arbol", "¿Eliminar el árbol de navegación?")}
                      disabled={ocupado}
                      title="Eliminar árbol de navegación"
                    />
                  )}
                </ControlesPaso>

                <ArbolNavegacion
                  svg={svgs.arbol}
                  titulo="Árbol de navegación"
                  nombreArchivo="arbol-de-navegacion"
                  codigo={artefactos.arbol}
                  renderizar={renderizar}
                  editable={!ocupado && trabajable("arbol") && !bloqueado("arbol")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("arbol", codigo)}
                />

                {recuadroAmpliar("arbol")}

                {svgs.arbol && trabajable("arbol") && (
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_arbol}
                      onClick={() => aprobarPaso("arbol")}
                      etiqueta="Árbol de navegación"
                      disabled={ocupado}
                    />
                    {!fasesAprobadas.diseno_arbol && (
                      <BotonRechazar
                        etiqueta="Árbol de navegación"
                        disabled={ocupado}
                        onClick={() => rechazarPaso("arbol", "¿Rechazar el árbol de navegación?")}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- Diagrama de arquitectura --- */}
            {visible("arquitectura") && (
              <>
                <TituloPaso
                  color={PALETA.naranjaOscuro}
                  estado={pendientes.arquitectura}
                  modelo={modelos.arquitectura}
                  onActualizar={trabajable("arquitectura") ? () => actualizarPaso("arquitectura") : undefined}
                  deshabilitado={ocupado}
                >
                  Diagrama de arquitectura
                </TituloPaso>

                {trabajable("arquitectura") && !bloqueado("arquitectura") && (
                  <>
                    <label className="block mb-3">
                      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Tecnologías preferidas (opcional)
                      </span>
                      <input
                        value={contexto.tecnologias || ""}
                        onChange={(e) =>
                          cambiarContexto({ ...contextoRef.current, tecnologias: e.target.value })
                        }
                        placeholder="Ej: Next.js, Supabase, Flutter para la app móvil"
                        disabled={ocupado}
                        className={CLASE_INPUT}
                      />
                    </label>
                    <CampoIndicaciones
                      clave="arquitectura"
                      valor={contexto.indicaciones?.arquitectura}
                      onChange={cambiarIndicaciones}
                      deshabilitado={ocupado}
                      ejemplo="Ej: incluye un servicio de notificaciones push"
                    />
                  </>
                )}

                <ControlesPaso
                  clave="arquitectura"
                  esperando={!trabajable("arquitectura")}
                  bloqueado={bloqueado("arquitectura")}
                  enEdicion={enEdicion("arquitectura")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => regenerarPaso("arquitectura")}
                    secundario={!!artefactos.arquitectura}
                    disabled={ocupado}
                    cargando={generando("arquitectura")}
                    color={PALETA.naranjaOscuro}
                  >
                    {artefactos.arquitectura ? "Regenerar" : "Generar"} diagrama de arquitectura
                  </BotonGenerar>

                  {svgs.arquitectura && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("arquitectura", "¿Eliminar el diagrama de arquitectura?")}
                      disabled={ocupado}
                      title="Eliminar diagrama de arquitectura"
                    />
                  )}
                </ControlesPaso>

                <DiagramaBox
                  svg={svgs.arquitectura}
                  titulo="Diagrama de arquitectura"
                  nombreArchivo="diagrama-arquitectura"
                  codigo={artefactos.arquitectura}
                  renderizar={renderizar}
                  editable={!ocupado && trabajable("arquitectura") && !bloqueado("arquitectura")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("arquitectura", codigo)}
                />

                {recuadroAmpliar("arquitectura")}

                {svgs.arquitectura && trabajable("arquitectura") && (
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_arquitectura}
                      onClick={() => aprobarPaso("arquitectura")}
                      etiqueta="Diagrama de arquitectura"
                      disabled={ocupado}
                    />
                    {!fasesAprobadas.diseno_arquitectura && (
                      <BotonRechazar
                        etiqueta="Diagrama de arquitectura"
                        disabled={ocupado}
                        onClick={() =>
                          rechazarPaso("arquitectura", "¿Rechazar el diagrama de arquitectura?")
                        }
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- Diagrama de sistemas --- */}
            {visible("sistema") && (
              <>
                <TituloPaso
                  color={PALETA.naranjaOscuro}
                  estado={pendientes.sistema}
                  modelo={modelos.sistema}
                  onActualizar={trabajable("sistema") ? () => actualizarPaso("sistema") : undefined}
                  deshabilitado={ocupado}
                >
                  Diagrama de sistemas
                </TituloPaso>

                {trabajable("sistema") && !bloqueado("sistema") && (
                  <CampoIndicaciones
                    clave="sistema"
                    valor={contexto.indicaciones?.sistema}
                    onChange={cambiarIndicaciones}
                    deshabilitado={ocupado}
                    ejemplo="Ej: separa la App Móvil como subsistema secundario; incluye la integración con el ECU-911"
                  />
                )}

                <ControlesPaso
                  clave="sistema"
                  esperando={!trabajable("sistema")}
                  bloqueado={bloqueado("sistema")}
                  enEdicion={enEdicion("sistema")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => regenerarPaso("sistema")}
                    secundario={!!artefactos.sistema}
                    disabled={ocupado}
                    cargando={generando("sistema")}
                    color={PALETA.naranjaOscuro}
                  >
                    {artefactos.sistema ? "Regenerar" : "Generar"} diagrama de sistemas
                  </BotonGenerar>

                  {svgs.sistema && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("sistema", "¿Eliminar el diagrama de sistemas?")}
                      disabled={ocupado}
                      title="Eliminar diagrama de sistemas"
                    />
                  )}
                </ControlesPaso>

                <DiagramaBox
                  svg={svgs.sistema}
                  titulo="Diagrama de sistemas"
                  nombreArchivo="diagrama-de-sistemas"
                  codigo={artefactos.sistema}
                  renderizar={renderizar}
                  editable={!ocupado && trabajable("sistema") && !bloqueado("sistema")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("sistema", codigo)}
                />

                {recuadroAmpliar("sistema")}

                {svgs.sistema && trabajable("sistema") && (
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_sistema}
                      onClick={() => aprobarPaso("sistema")}
                      etiqueta="Diagrama de sistemas"
                      disabled={ocupado}
                    />
                    {!fasesAprobadas.diseno_sistema && (
                      <BotonRechazar
                        etiqueta="Diagrama de sistemas"
                        disabled={ocupado}
                        onClick={() => rechazarPaso("sistema", "¿Rechazar el diagrama de sistemas?")}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- Aprobación general de la fase: requiere las seis subfases aprobadas --- */}
            {fasesAprobadas.diseno_clases &&
              fasesAprobadas.diseno_er &&
              fasesAprobadas.diseno_prototipo &&
              fasesAprobadas.diseno_arbol &&
              fasesAprobadas.diseno_arquitectura &&
              fasesAprobadas.diseno_sistema && (
                <div
                  className="mt-8 border-2 p-4 flex items-center justify-between gap-3 flex-wrap"
                  style={{ borderColor: disenoAprobado ? PALETA.oliva : PALETA.naranjaOscuro }}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">Fase de Diseño</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {disenoAprobado
                        ? "Aprobada. Proyecto completado."
                        : "Clases, entidad-relación, prototipo, árbol, arquitectura y sistema aprobados."}
                    </p>
                  </div>
                  {disenoAprobado ? (
                    <button
                      onClick={() => setVista("informe")}
                      style={{ backgroundColor: PALETA.navy }}
                      className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
                    >
                      Continuar al Informe →
                    </button>
                  ) : (
                    <button
                      onClick={aprobarFaseDiseno}
                      disabled={ocupado}
                      style={{ backgroundColor: PALETA.oliva }}
                      className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
                    >
                      Aprobar fase de Diseño
                    </button>
                  )}
                </div>
              )}
          </div>
        </section>
      )}
    </div>
  );
}
