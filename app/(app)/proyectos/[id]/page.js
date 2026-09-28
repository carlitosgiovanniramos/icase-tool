"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pedirIA } from "@/lib/preferenciaClaude";
import { subirArchivoProyecto } from "@/lib/archivos";
import { limpiarMermaid } from "@/lib/mermaid";
import mermaid from "mermaid";
import MockupsGenerator from "./MockupsGenerator";
import ConfigPrototipo from "./ConfigPrototipo";
import AnalisisResultado from "./AnalisisResultado";
import BadgeModelo from "./BadgeModelo";
import ContextoAnalisis from "./ContextoAnalisis";
import DiagramaBox from "./DiagramaBox";
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

function BotonGenerar({ onClick, disabled, cargando, color, textoCargando = "Generando...", children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ backgroundColor: color }}
      className="text-white px-4 py-2 disabled:opacity-50 hover:brightness-125"
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
function CampoIndicaciones({ clave, valor, onChange, deshabilitado, ejemplo }) {
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
        className={`${CLASE_INPUT} h-14 resize-y`}
      />
    </label>
  );
}

function AmpliarAnalisis({ onAmpliar, cargando, deshabilitado }) {
  const [instruccion, setInstruccion] = useState("");

  async function ampliar() {
    if (await onAmpliar(instruccion.trim())) setInstruccion("");
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
      <p className="text-sm text-gray-600 mb-3">
        Describe qué le falta al análisis. La IA agrega solo los requerimientos nuevos, sin tocar
        los existentes, y aparecen marcados como NUEVO para que los revises.
      </p>
      <textarea
        value={instruccion}
        onChange={(e) => setInstruccion(e.target.value)}
        placeholder="Ej: faltan requerimientos para el inventario de bodega: entradas, salidas de insumos y alertas de stock mínimo"
        disabled={deshabilitado}
        className={`${CLASE_INPUT} h-20 resize-y`}
      />
      <button
        onClick={ampliar}
        disabled={deshabilitado || !instruccion.trim()}
        style={{ backgroundColor: PALETA.oliva }}
        className="mt-2 text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
      >
        {cargando ? "Agregando requerimientos..." : "Agregar requerimientos"}
      </button>
    </div>
  );
}

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
function ControlesPaso({
  clave,
  bloqueado,
  enEdicion,
  deshabilitado,
  onEditar,
  onCancelarEdicion,
  children,
}) {
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

function TituloPaso({ color, estado, modelo, separador = true, children }) {
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
      <BadgeModelo modelo={modelo} />
    </div>
  );
}

function AvisoCascada({ progreso, desactualizados, ocupado, onActualizar }) {
  if (progreso) {
    const porcentaje = Math.round((progreso.indice / progreso.total) * 100);
    return (
      <div
        className="mb-6 bg-white border border-gray-300 p-4"
        style={{ borderLeft: `4px solid ${PALETA.naranjaOscuro}` }}
      >
        <p className="text-sm font-semibold text-gray-800">
          Actualizando en cascada ({progreso.indice + 1}/{progreso.total}): {progreso.nombre}...
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Cada paso puede tardar un par de minutos. No cierres esta página.
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
          Se generaron con una versión anterior. Se actualizarán automáticamente al aprobar el
          paso que cambió, o puedes actualizarlos ahora.
        </p>
      </div>
      <button
        onClick={onActualizar}
        disabled={ocupado}
        style={{ backgroundColor: PALETA.carmesi }}
        className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
      >
        Actualizar ahora
      </button>
    </div>
  );
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { htmlLabels: true, wrappingWidth: 220 },
});

async function renderizar(codigo) {
  await document.fonts.ready;
  const limpio = limpiarMermaid(codigo);
  // parse valida sin tocar el DOM; render con código inválido deja restos en la página.
  await mermaid.parse(limpio);
  const idUnico = "diagrama-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const { svg } = await mermaid.render(idUnico, limpio);
  return svg;
}

const SIN_ARTEFACTOS = Object.fromEntries(PASOS.map((p) => [p.clave, null]));

// Tipos del diagrama del sistema (las instrucciones de cada uno están en
// app/api/generar-diagrama-sistema/route.js).
const TIPOS_DIAGRAMA_SISTEMA = [
  {
    clave: "contexto",
    nombre: "Contexto",
    descripcion: "El sistema como una caja, rodeado de sus actores y sistemas externos, y qué intercambian.",
  },
  {
    clave: "despliegue",
    nombre: "Despliegue",
    descripcion: "Dónde se ejecuta cada parte (celulares, navegador, nube, base de datos) y cómo se comunican.",
  },
  {
    clave: "flujo",
    nombre: "Flujo",
    descripcion: "El proceso principal del sistema de punta a punta, con sus decisiones.",
  },
  {
    clave: "componentes",
    nombre: "Componentes",
    descripcion: "Los módulos internos del sistema y las dependencias entre ellos.",
  },
];

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
  const { mostrarError, mostrarInfo, confirmar } = useAlert();
  const [proyecto, setProyecto] = useState(null);
  const [artefactos, setArtefactos] = useState(SIN_ARTEFACTOS);
  const [svgs, setSvgs] = useState({});
  const [fasesAprobadas, setFasesAprobadas] = useState({});
  const [cargando, setCargando] = useState(null); // { paso, modo } generación manual en curso
  const [progreso, setProgreso] = useState(null); // { indice, total, nombre } cascada en curso
  const [vista, setVista] = useState("resumen"); // "resumen" | "analisis" | "diseno"

  const [borrador, setBorrador] = useState(null); // { nombre, prompt } mientras se edita el proyecto
  const [guardandoProyecto, setGuardandoProyecto] = useState(false);
  const [desbloqueados, setDesbloqueados] = useState([]); // pasos aprobados abiertos para editar
  const [contexto, setContexto] = useState({}); // contexto de elicitación (proyectos.contexto)
  const [estadoContexto, setEstadoContexto] = useState(null); // pendiente | guardando | guardado | error

  // Copias con el último valor: la cascada encadena varias operaciones async y no puede
  // leer el estado capturado en el render en el que empezó.
  const proyectoRef = useRef(null);
  const artefactosRef = useRef(SIN_ARTEFACTOS);
  const fasesRef = useRef({});
  const contextoRef = useRef({});
  const avisoColumnaContexto = useRef(false);

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

      const renderizados = {};
      for (const p of PASOS) {
        if (!p.diagrama || !cargados[p.clave]) continue;
        try {
          renderizados[p.clave] = await renderizar(cargados[p.clave]);
        } catch (err) {
          console.error(`Error renderizando ${p.nombre}:`, err);
        }
      }
      setSvgs(renderizados);
    }
    cargarProyecto();
  }, [id, supabase]);

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
    // Se renderiza antes de guardar: si la IA devolvió Mermaid inválido, falla sin tocar nada.
    const svg = paso.diagrama && valor ? await renderizar(valor) : null;

    artefactosRef.current = { ...artefactosRef.current, [clave]: valor };
    setArtefactos(artefactosRef.current);
    if (paso.diagrama) setSvgs((s) => ({ ...s, [clave]: svg }));

    await supabase.from("proyectos").update({ [paso.columna]: valor }).eq("id", id);
  }

  // ---------- Generación ----------

  // Cada paso recibe los artefactos de los pasos anteriores, para que un cambio se propague.
  // opciones.onProgreso(i, total, nombre): avance del prototipo, que se genera pantalla a pantalla.
  async function pedirPaso(clave, opciones = {}) {
    if (clave === "prototipo") {
      const plan = planPrototipo(contextoRef.current.prototipo, artefactosRef.current.prototipo);
      if (!plan.length) throw new Error("Primero propone o agrega las pantallas a generar.");
      const { generadas, fallidas } = await generarPantallas(plan, opciones.onProgreso);
      if (!generadas.length) throw new Error(fallidas.join("\n"));
      return { valor: generadas, modelo: generadas.at(-1).modelo, fallidas };
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
      er: { analisis: a.analisis, casosUso: a.casos_uso },
      arbol: {
        analisis: a.analisis,
        pantallas: (a.prototipo || []).map((p) => p.nombre),
      },
      arquitectura: {
        analisis: a.analisis,
        diagramaEr: a.er,
        arbolNavegacion: a.arbol,
        plataformas: plataformasDelSistema,
        tecnologias: contextoRef.current.tecnologias,
        calidad: contextoRef.current.calidad,
      },
      sistema: {
        analisis: a.analisis,
        tipo: contextoRef.current.tipoSistema || "contexto",
        plataformas: plataformasDelSistema,
        tecnologias: contextoRef.current.tecnologias,
        diagramaArquitectura: a.arquitectura,
      },
    };

    const data = await pedirIA(PASO[clave].ruta, { ...cuerpos[clave], indicaciones });
    if (data.error) throw new Error(data.error);

    const { modelo_ia: modelo, ...resto } = data;
    if (clave === "analisis") return { valor: resto, modelo };
    // Se guarda ya limpio, para que los pasos siguientes reciban código Mermaid válido.
    return { valor: limpiarMermaid(resto.diagrama_mermaid), modelo };
  }

  // Genera las pantallas indicadas, una petición por pantalla, con el mismo estilo para todas.
  // Las que fallan no detienen a las demás: se devuelven en "fallidas" para reintentarlas.
  async function generarPantallas(lista, onProgreso) {
    const a = artefactosRef.current;
    const config = contextoRef.current.prototipo || {};
    const estilo = {
      modo: config.modo || "mockup",
      color: config.color,
      tema: config.tema || "claro",
      logoUrl: config.logoUrl,
      referencias: config.referencias || [],
    };
    const todas = planPrototipo(config, a.prototipo);

    const generadas = [];
    const fallidas = [];
    for (const [i, pantalla] of lista.entries()) {
      onProgreso?.(i, lista.length, pantalla.nombre);
      try {
        const data = await pedirIA("/api/generar-mockups", {
          analisis: a.analisis,
          diagramaEr: a.er,
          pantalla,
          pantallas: todas,
          estilo,
          indicaciones: contextoRef.current.indicaciones?.prototipo,
        });
        if (data.error) throw new Error(data.error);
        generadas.push({
          nombre: pantalla.nombre,
          html: data.html,
          plataforma: pantalla.plataforma || "Web",
          rfs: pantalla.rfs || [],
          modelo: data.modelo_ia,
        });
      } catch (err) {
        fallidas.push(`${pantalla.nombre}: ${err.message}`);
      }
    }
    return { generadas, fallidas };
  }

  const progresoPantallas = (clave, extra) => (i, total, nombre) =>
    setCargando({ paso: clave, ...extra, detalle: `Generando ${i + 1}/${total}: ${nombre}...` });

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

    setCargando({ paso: "prototipo" });
    try {
      const { generadas, fallidas } = await generarPantallas(faltan, progresoPantallas("prototipo"));
      if (generadas.length) {
        await guardarArtefacto("prototipo", [...actuales, ...generadas]);
        await marcarCambio("prototipo", {}, generadas.at(-1).modelo);
      }
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
      const { generadas, fallidas } = await generarPantallas([especificacion]);
      if (!generadas.length) throw new Error(fallidas.join("\n"));
      await guardarArtefacto(
        "prototipo",
        actuales.map((p, i) => (i === indice ? generadas[0] : p))
      );
      await marcarCambio("prototipo", {}, generadas[0].modelo);
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
  async function marcarCambio(clave, extra = {}, modelo) {
    await guardarFases((f) => {
      Object.assign(f, extra);
      if (clave) {
        f[PASO[clave].aprobacion] = false;
        delete f.pendientes[clave];
        if (modelo) f.modelos[clave] = modelo;
      }
      // Un cambio en una subfase quita también la aprobación general de su fase. El Diseño
      // depende de todo lo anterior, así que cualquier cambio le quita la aprobación.
      if (!clave || PASO[clave].fase === "analisis") f.analisis = false;
      f.diseno = false;
      for (const p of clave ? pasosDespuesDe(clave) : PASOS) {
        f[p.aprobacion] = false;
        if (artefactosRef.current[p.clave]) f.pendientes[p.clave] = "desactualizado";
      }
      return f;
    });
  }

  function desactualizados(pasos = PASOS) {
    return pasos.filter(
      (p) =>
        fasesRef.current.pendientes?.[p.clave] === "desactualizado" &&
        artefactosRef.current[p.clave]
    );
  }

  async function generarPaso(clave) {
    setCargando({ paso: clave });
    try {
      const { valor, modelo, fallidas } = await pedirPaso(clave, {
        onProgreso: progresoPantallas(clave),
      });
      await guardarArtefacto(clave, valor);
      await marcarCambio(clave, {}, modelo);
      if (fallidas?.length) {
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
  // siguen marcados como desactualizados y se pueden reintentar con "Actualizar ahora".
  async function ejecutarCascada(pasos) {
    try {
      for (let i = 0; i < pasos.length; i++) {
        const p = pasos[i];
        setProgreso({ indice: i, total: pasos.length, nombre: p.nombre });
        try {
          const { valor, modelo } = await pedirPaso(p.clave, {
            onProgreso: (j, total, pantalla) =>
              setProgreso({
                indice: i,
                total: pasos.length,
                nombre: `${p.nombre} (pantalla ${j + 1}/${total}: ${pantalla})`,
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
        } catch (err) {
          mostrarError(
            `${err.message}\n\nQuedan desactualizados: ${listarNombres(pasos.slice(i))}. ` +
              `Puedes reintentar con "Actualizar ahora".`,
            `No se pudo actualizar: ${p.nombre}`
          );
          return;
        }
      }
    } finally {
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

    // Al aprobar los requerimientos, los agregados con "Ampliar con IA" dejan de ser "nuevos".
    const analisis = artefactosRef.current.analisis;
    const quitarMarca = (lista = []) => lista.map(({ nuevo, ...resto }) => resto);
    const tieneNuevos = (lista = []) => lista.some((x) => x.nuevo);
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

  async function actualizarEnCascada(pasos) {
    const aActualizar = desactualizados(pasos);
    if (!aActualizar.length) return;

    const continuar = await confirmar(
      `Este cambio afecta a pasos que ya habías generado. Se actualizarán automáticamente: ` +
        `${listarNombres(aActualizar)}.\n\nCada uno quedará pendiente de tu revisión y aprobación.`,
      "¿Actualizar en cascada?",
      "Actualizar"
    );
    if (continuar) await ejecutarCascada(aActualizar);
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

  // Aprobación general de la fase de Diseño: requiere sus cuatro subfases aprobadas.
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

    const cambioDescripcion = prompt !== proyectoRef.current.prompt;
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

    // Todo el análisis se generó a partir de la descripción anterior.
    await marcarCambio(null);
    const continuar = await confirmar(
      `Cambiaste la descripción, así que lo generado a partir de ella quedó desactualizado. ` +
        `Se actualizarán automáticamente: ${listarNombres(afectados)}.\n\n` +
        `Los requerimientos se generarán de nuevo, por lo que se perderán los que hayas eliminado a mano. ` +
        `Cada paso quedará pendiente de tu revisión y aprobación.`,
      "¿Actualizar en cascada?",
      "Actualizar"
    );
    if (continuar) await ejecutarCascada(afectados);
  }

  // ---------- Eliminación ----------

  // tambien: otros pasos que se eliminan junto con este; introduccion: texto al inicio del
  // mensaje de confirmación; textoConfirmar: etiqueta del botón que confirma.
  async function eliminarPaso(clave, titulo, { tambien = [], introduccion, textoConfirmar } = {}) {
    const borrar = [clave, ...tambien];
    const afectados = pasosDespuesDe(borrar[borrar.length - 1]).filter(
      (p) => artefactosRef.current[p.clave]
    );

    const partes = introduccion ? [introduccion] : [];
    if (tambien.length) partes.push(`También se eliminará: ${listarNombres(tambien.map((c) => PASO[c]))}.`);
    partes.push(
      afectados.length
        ? `Quedarán desactualizados: ${listarNombres(afectados)}. Se actualizarán automáticamente cuando lo vuelvas a generar y aprobar.`
        : "Tendrás que generarlo de nuevo."
    );
    if (!(await confirmar(partes.join(" "), titulo, textoConfirmar))) return;

    for (const c of borrar) await guardarArtefacto(c, null);
    await marcarCambio(clave, {
      modelos: Object.fromEntries(
        Object.entries(fasesRef.current.modelos || {}).filter(([c]) => !borrar.includes(c))
      ),
    });
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

  // Guardar el código Mermaid editado a mano: cuenta como un cambio del paso (pierde la
  // aprobación y los pasos siguientes quedan desactualizados). Devuelve false si falla.
  async function guardarCodigoDiagrama(clave, codigo) {
    try {
      await guardarArtefacto(clave, limpiarMermaid(codigo));
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

  // Pide a la IA solo los actores y requerimientos que faltan y los agrega a los existentes,
  // marcados como nuevos hasta que se aprueben. Devuelve true si agregó algo.
  async function ampliarAnalisis(instruccion) {
    setCargando({ paso: "ampliar" });
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
      if (!actores.length && !rf.length && !rnf.length) {
        mostrarInfo(
          "La IA consideró que lo que pides ya está cubierto por los requerimientos actuales. Prueba a describirlo con más detalle.",
          "No se agregó nada"
        );
        return false;
      }

      const marcarNuevo = (lista) => lista.map((x) => ({ ...x, nuevo: true }));
      await guardarArtefacto("analisis", {
        ...analisis,
        actores: [...(analisis.actores || []), ...marcarNuevo(actores)],
        requerimientos_funcionales: [...(analisis.requerimientos_funcionales || []), ...marcarNuevo(rf)],
        requerimientos_no_funcionales: [
          ...(analisis.requerimientos_no_funcionales || []),
          ...marcarNuevo(rnf),
        ],
      });
      await marcarCambio("analisis");

      const resumen = [
        rf.length && `${rf.length} requerimiento(s) funcional(es)`,
        rnf.length && `${rnf.length} no funcional(es)`,
        actores.length && `${actores.length} actor(es)`,
      ].filter(Boolean);
      mostrarInfo(
        `Se agregó: ${resumen.join(", ")}. Aparecen marcados como NUEVO para que los revises.`,
        `Análisis ampliado con ${data.modelo_ia}`
      );
      return true;
    } catch (err) {
      mostrarError(err.message, "No se pudo ampliar el análisis");
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

  const aviso = (
    <AvisoCascada
      progreso={progreso}
      desactualizados={PASOS.filter(
        (p) => pendientes[p.clave] === "desactualizado" && artefactos[p.clave]
      )}
      ocupado={ocupado}
      onActualizar={() => ejecutarCascada(desactualizados())}
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
          vista={vista}
          onNavegar={setVista}
        />
      )}

      {aviso}

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
            onClick={() => generarPaso("analisis")}
            disabled={ocupado}
            cargando={generando("analisis")}
            color={PALETA.navy}
          >
            Generar actores y requerimientos
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
              <AmpliarAnalisis
                onAmpliar={ampliarAnalisis}
                cargando={generando("ampliar")}
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

        {resultado && requerimientosAprobados && (
          <>
            <TituloPaso color={PALETA.navy} estado={pendientes.casos_uso} modelo={modelos.casos_uso}>
              Diagrama de casos de uso
            </TituloPaso>

            {!bloqueado("casos_uso") && (
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
              bloqueado={bloqueado("casos_uso")}
              enEdicion={enEdicion("casos_uso")}
              deshabilitado={ocupado}
              onEditar={desbloquearPaso}
              onCancelarEdicion={cancelarEdicion}
            >
              <BotonGenerar
                onClick={() => generarPaso("casos_uso")}
                disabled={ocupado}
                cargando={generando("casos_uso")}
                color={PALETA.negro}
                textoCargando="Generando diagrama..."
              >
                Generar diagrama de casos de uso
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
              editable={!ocupado && !bloqueado("casos_uso")}
              onGuardarCodigo={(codigo) => guardarCodigoDiagrama("casos_uso", codigo)}
            />

            {svgs.casos_uso && (
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
            <TituloPaso color={PALETA.naranjaOscuro} estado={pendientes.er} modelo={modelos.er} separador={false}>
              Diagrama entidad-relación
            </TituloPaso>

            {!bloqueado("er") && (
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
              bloqueado={bloqueado("er")}
              enEdicion={enEdicion("er")}
              deshabilitado={ocupado}
              onEditar={desbloquearPaso}
              onCancelarEdicion={cancelarEdicion}
            >
              <BotonGenerar
                onClick={() => generarPaso("er")}
                disabled={ocupado}
                cargando={generando("er")}
                color={PALETA.naranjaOscuro}
              >
                Generar diagrama entidad-relación
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
              editable={!ocupado && !bloqueado("er")}
              onGuardarCodigo={(codigo) => guardarCodigoDiagrama("er", codigo)}
            />

            {svgs.er && (
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
            {fasesAprobadas.diseno_er && (
              <>
                <TituloPaso color={PALETA.naranjaOscuro} estado={pendientes.prototipo} modelo={modelos.prototipo}>
                  Prototipo de pantallas
                </TituloPaso>

                {!bloqueado("prototipo") && (
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
                  bloqueado={bloqueado("prototipo")}
                  enEdicion={enEdicion("prototipo")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => generarPaso("prototipo")}
                    disabled={ocupado || !planActual.length}
                    cargando={generando("prototipo")}
                    textoCargando={cargando?.detalle || "Generando..."}
                    color={PALETA.naranjaOscuro}
                  >
                    {artefactos.prototipo ? "Regenerar prototipo" : "Generar prototipo"} (
                    {planActual.length} {planActual.length === 1 ? "pantalla" : "pantallas"})
                  </BotonGenerar>

                  {artefactos.prototipo && faltantes.length > 0 && (
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
                  bloqueado={bloqueado("prototipo")}
                  regenerando={generando("prototipo") ? cargando.indice ?? null : null}
                  onRegenerar={regenerarPantalla}
                  onQuitar={quitarPantalla}
                  onGuardarHtml={guardarHtmlPantalla}
                />

                {artefactos.prototipo && (
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
            {fasesAprobadas.diseno_prototipo && (
              <>
                <TituloPaso color={PALETA.naranjaOscuro} estado={pendientes.arbol} modelo={modelos.arbol}>
                  Árbol de navegación
                </TituloPaso>

                {!bloqueado("arbol") && (
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
                  bloqueado={bloqueado("arbol")}
                  enEdicion={enEdicion("arbol")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => generarPaso("arbol")}
                    disabled={ocupado}
                    cargando={generando("arbol")}
                    color={PALETA.naranjaOscuro}
                  >
                    Generar árbol de navegación
                  </BotonGenerar>

                  {svgs.arbol && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("arbol", "¿Eliminar el árbol de navegación?")}
                      disabled={ocupado}
                      title="Eliminar árbol de navegación"
                    />
                  )}
                </ControlesPaso>

                <DiagramaBox
                  svg={svgs.arbol}
                  titulo="Árbol de navegación"
                  nombreArchivo="arbol-de-navegacion"
                  codigo={artefactos.arbol}
                  renderizar={renderizar}
                  editable={!ocupado && !bloqueado("arbol")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("arbol", codigo)}
                />

                {svgs.arbol && (
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
            {fasesAprobadas.diseno_arbol && (
              <>
                <TituloPaso color={PALETA.naranjaOscuro} estado={pendientes.arquitectura} modelo={modelos.arquitectura}>
                  Diagrama de arquitectura
                </TituloPaso>

                {!bloqueado("arquitectura") && (
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
                  bloqueado={bloqueado("arquitectura")}
                  enEdicion={enEdicion("arquitectura")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => generarPaso("arquitectura")}
                    disabled={ocupado}
                    cargando={generando("arquitectura")}
                    color={PALETA.naranjaOscuro}
                  >
                    Generar diagrama de arquitectura
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
                  editable={!ocupado && !bloqueado("arquitectura")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("arquitectura", codigo)}
                />

                {svgs.arquitectura && (
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

            {/* --- Diagrama del sistema --- */}
            {fasesAprobadas.diseno_arquitectura && (
              <>
                <TituloPaso color={PALETA.naranjaOscuro} estado={pendientes.sistema} modelo={modelos.sistema}>
                  Diagrama del sistema
                </TituloPaso>

                {!bloqueado("sistema") && (
                  <>
                    <div className="mb-3">
                      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Tipo
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {TIPOS_DIAGRAMA_SISTEMA.map((t) => {
                          const activo = (contexto.tipoSistema || "contexto") === t.clave;
                          return (
                            <button
                              key={t.clave}
                              type="button"
                              title={t.descripcion}
                              onClick={() =>
                                cambiarContexto({ ...contextoRef.current, tipoSistema: t.clave })
                              }
                              disabled={ocupado}
                              aria-pressed={activo}
                              style={
                                activo
                                  ? { backgroundColor: PALETA.navy, borderColor: PALETA.navy }
                                  : undefined
                              }
                              className={`border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                                activo ? "text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {t.nombre}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {
                          TIPOS_DIAGRAMA_SISTEMA.find(
                            (t) => t.clave === (contexto.tipoSistema || "contexto")
                          ).descripcion
                        }
                      </p>
                    </div>
                    <CampoIndicaciones
                      clave="sistema"
                      valor={contexto.indicaciones?.sistema}
                      onChange={cambiarIndicaciones}
                      deshabilitado={ocupado}
                      ejemplo="Ej: incluye la integración con el ECU-911"
                    />
                  </>
                )}

                <ControlesPaso
                  clave="sistema"
                  bloqueado={bloqueado("sistema")}
                  enEdicion={enEdicion("sistema")}
                  deshabilitado={ocupado}
                  onEditar={desbloquearPaso}
                  onCancelarEdicion={cancelarEdicion}
                >
                  <BotonGenerar
                    onClick={() => generarPaso("sistema")}
                    disabled={ocupado}
                    cargando={generando("sistema")}
                    color={PALETA.naranjaOscuro}
                  >
                    Generar diagrama del sistema
                  </BotonGenerar>

                  {svgs.sistema && (
                    <BotonEliminar
                      onClick={() => eliminarPaso("sistema", "¿Eliminar el diagrama del sistema?")}
                      disabled={ocupado}
                      title="Eliminar diagrama del sistema"
                    />
                  )}
                </ControlesPaso>

                <DiagramaBox
                  svg={svgs.sistema}
                  titulo="Diagrama del sistema"
                  nombreArchivo="diagrama-del-sistema"
                  codigo={artefactos.sistema}
                  renderizar={renderizar}
                  editable={!ocupado && !bloqueado("sistema")}
                  onGuardarCodigo={(codigo) => guardarCodigoDiagrama("sistema", codigo)}
                />

                {svgs.sistema && (
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <BotonAprobar
                      aprobado={!!fasesAprobadas.diseno_sistema}
                      onClick={() => aprobarPaso("sistema")}
                      etiqueta="Diagrama del sistema"
                      disabled={ocupado}
                    />
                    {!fasesAprobadas.diseno_sistema && (
                      <BotonRechazar
                        etiqueta="Diagrama del sistema"
                        disabled={ocupado}
                        onClick={() => rechazarPaso("sistema", "¿Rechazar el diagrama del sistema?")}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* --- Aprobación general de la fase: requiere las cinco subfases aprobadas --- */}
            {fasesAprobadas.diseno_er &&
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
                        : "Entidad-relación, prototipo, árbol, arquitectura y sistema aprobados."}
                    </p>
                  </div>
                  {disenoAprobado ? (
                    <span className="text-sm font-semibold" style={{ color: PALETA.oliva }}>
                      ✓ Proyecto completado
                    </span>
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
