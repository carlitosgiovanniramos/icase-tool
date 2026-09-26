"use client";

import { useState } from "react";
import { pedirIA } from "@/lib/preferenciaClaude";
import { useAlert } from "../../../AlertProvider";
import { PALETA } from "../../../estilos";
import BadgeModelo from "./BadgeModelo";

const PLATAFORMAS = ["Web", "Móvil", "Escritorio"];

const ATRIBUTOS_CALIDAD = [
  "Seguridad",
  "Rendimiento",
  "Disponibilidad",
  "Usabilidad",
  "Uso sin conexión",
  "Escalabilidad",
  "Accesibilidad",
  "Cumplimiento normativo",
];

const CAMPOS_TEXTO = [
  {
    clave: "problema",
    etiqueta: "Problema actual",
    ayuda: "Qué se hace hoy y qué duele. Enfoca los requerimientos en lo importante.",
    ejemplo: "Ej: el parte se llena a mano en papel y toma unos 20 minutos",
  },
  {
    clave: "usuarios",
    etiqueta: "Usuarios y roles",
    ayuda: "Quién usará el sistema. Se usan como actores en lugar de inventarlos.",
    ejemplo: "Ej: Bombero, Jefe de guardia, Comandante, Administrador",
  },
  {
    clave: "incluye",
    etiqueta: "Alcance: qué incluye",
    ayuda: "Módulos o funciones que sí deben existir.",
    ejemplo: "Ej: partes de emergencia, geolocalización, chat, dashboard",
  },
  {
    clave: "no_incluye",
    etiqueta: "Fuera de alcance",
    ayuda: "Lo que NO debe hacer. Evita que la IA invente módulos.",
    ejemplo: "Ej: facturación, nómina, gestión de turnos",
  },
  {
    clave: "reglas",
    etiqueta: "Reglas de negocio",
    ayuda: "Políticas y validaciones, una por línea. Cada una generará requerimientos.",
    ejemplo: "Ej: cada emergencia tiene un número único\nUn parte firmado no se puede editar",
    ancho: true,
  },
];

const CLASE_INPUT =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900";

function Etiqueta({ children, ayuda }) {
  return (
    <div className="mb-1.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {children}
      </span>
      {ayuda && <p className="text-xs text-gray-400 mt-0.5">{ayuda}</p>}
    </div>
  );
}

function Chips({ opciones, seleccion = [], onChange, deshabilitado }) {
  const alternar = (opcion) =>
    onChange(
      seleccion.includes(opcion) ? seleccion.filter((o) => o !== opcion) : [...seleccion, opcion]
    );
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((opcion) => {
        const activo = seleccion.includes(opcion);
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => alternar(opcion)}
            disabled={deshabilitado}
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
            {activo ? "✓ " : ""}
            {opcion}
          </button>
        );
      })}
    </div>
  );
}

const TEXTO_GUARDADO = {
  pendiente: "Cambios sin guardar...",
  guardando: "Guardando...",
  guardado: "✓ Guardado",
  error: "No se pudo guardar",
};

// Información de elicitación opcional que se envía a la IA al generar los requerimientos:
// campos de contexto + una entrevista en la que la IA pregunta lo que falta.
export default function ContextoAnalisis({
  valor,
  onChange,
  estadoGuardado,
  proyecto,
  hayResultado,
  deshabilitado,
}) {
  const { mostrarError, confirmar } = useAlert();
  const [abierto, setAbierto] = useState(!hayResultado);
  const [preguntando, setPreguntando] = useState(false);
  const [modeloPreguntas, setModeloPreguntas] = useState(null);

  const entrevista = valor.entrevista || [];
  const respondidas = entrevista.filter((p) => p.respuesta?.trim()).length;
  const completados =
    CAMPOS_TEXTO.filter((c) => valor[c.clave]?.trim()).length +
    (valor.plataformas?.length ? 1 : 0) +
    (valor.calidad?.length ? 1 : 0);
  const totalCampos = CAMPOS_TEXTO.length + 2;

  const cambiar = (clave, nuevo) => onChange({ ...valor, [clave]: nuevo });

  function responder(indice, respuesta) {
    cambiar(
      "entrevista",
      entrevista.map((p, i) => (i === indice ? { ...p, respuesta } : p))
    );
  }

  async function quitarPregunta(indice) {
    const pregunta = entrevista[indice];
    if (
      pregunta.respuesta?.trim() &&
      !(await confirmar("Ya tiene una respuesta, que también se perderá.", "¿Quitar esta pregunta?", "Quitar"))
    ) {
      return;
    }
    // Se recuerda para que "Hacer más preguntas" no la vuelva a proponer.
    onChange({
      ...valor,
      entrevista: entrevista.filter((_, i) => i !== indice),
      descartadas: [...(valor.descartadas || []), pregunta.pregunta],
    });
  }

  async function hacerPreguntas() {
    setPreguntando(true);
    try {
      const data = await pedirIA("/api/generar-preguntas", {
        prompt: proyecto.prompt,
        documentoTexto: proyecto.documento_texto,
        contexto: valor,
      });
      if (data.error) throw new Error(data.error);

      // Las preguntas existentes se conservan (se quitan a mano); las nuevas se agregan debajo.
      const nuevas = (data.preguntas || []).map((p) => ({ ...p, respuesta: "" }));
      cambiar("entrevista", [...entrevista, ...nuevas]);
      setModeloPreguntas(data.modelo_ia);
    } catch (err) {
      mostrarError(err.message, "No se pudieron generar las preguntas");
    } finally {
      setPreguntando(false);
    }
  }

  return (
    <div className="border border-gray-300 mb-6">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 shrink-0" style={{ backgroundColor: PALETA.navy }} />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Contexto del análisis
          </span>
          <span className="text-xs text-gray-500">
            {completados}/{totalCampos} campos · {respondidas} respuestas de la entrevista
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {estadoGuardado && (
            <span
              className="text-xs font-semibold"
              style={{
                color:
                  estadoGuardado === "error"
                    ? PALETA.carmesi
                    : estadoGuardado === "guardado"
                    ? PALETA.oliva
                    : "#6b7280",
              }}
            >
              {TEXTO_GUARDADO[estadoGuardado]}
            </span>
          )}
          <span className="text-xs font-semibold" style={{ color: PALETA.navy }}>
            {abierto ? "Ocultar ▲" : "Completar ▾"}
          </span>
        </div>
      </button>

      {abierto && (
        <div className="p-4 space-y-6">
          <p className="text-sm text-gray-600">
            Todo es opcional. Cuanta más información des, más precisos serán los requerimientos:
            la IA la usa en lugar de suponer.
            {hayResultado &&
              " Si cambias algo, vuelve a generar los requerimientos para aplicarlo."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAMPOS_TEXTO.map((campo) => (
              <label key={campo.clave} className={campo.ancho ? "md:col-span-2" : ""}>
                <Etiqueta ayuda={campo.ayuda}>{campo.etiqueta}</Etiqueta>
                <textarea
                  value={valor[campo.clave] || ""}
                  onChange={(e) => cambiar(campo.clave, e.target.value)}
                  placeholder={campo.ejemplo}
                  disabled={deshabilitado}
                  className={`${CLASE_INPUT} h-20 resize-y`}
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Etiqueta ayuda="Dónde se usará el sistema.">Plataformas</Etiqueta>
              <Chips
                opciones={PLATAFORMAS}
                seleccion={valor.plataformas}
                onChange={(v) => cambiar("plataformas", v)}
                deshabilitado={deshabilitado}
              />
            </div>
            <div>
              <Etiqueta ayuda="Cada uno generará requerimientos no funcionales medibles.">
                Atributos de calidad prioritarios
              </Etiqueta>
              <Chips
                opciones={ATRIBUTOS_CALIDAD}
                seleccion={valor.calidad}
                onChange={(v) => cambiar("calidad", v)}
                deshabilitado={deshabilitado}
              />
            </div>
          </div>

          {/* --- Entrevista con IA --- */}
          <div className="pt-5 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Entrevista con IA
              </span>
              <BadgeModelo modelo={modeloPreguntas} />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              La IA lee tu descripción y el contexto, y te pregunta lo que falta, como haría un
              analista en una entrevista de elicitación. Responde las que quieras; las que dejes en
              blanco se ignoran.
            </p>

            <button
              type="button"
              onClick={hacerPreguntas}
              disabled={preguntando || deshabilitado}
              style={{ borderColor: PALETA.navy, color: PALETA.navy }}
              className="border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {preguntando
                ? "Pensando preguntas..."
                : entrevista.length
                ? "Hacer más preguntas"
                : "Iniciar entrevista"}
            </button>

            {entrevista.length > 0 && (
              <ol className="mt-4 space-y-4">
                {entrevista.map((p, i) => (
                  <li key={i} className="border-l-2 pl-3" style={{ borderColor: PALETA.navy }}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-800">
                        {i + 1}. {p.pregunta}
                      </p>
                      <button
                        type="button"
                        onClick={() => quitarPregunta(i)}
                        disabled={deshabilitado}
                        title="Quitar esta pregunta"
                        className="shrink-0 text-xs font-semibold whitespace-nowrap hover:underline disabled:opacity-50"
                        style={{ color: PALETA.carmesi }}
                      >
                        Quitar ✕
                      </button>
                    </div>
                    {p.motivo && <p className="text-xs text-gray-400 mt-0.5">{p.motivo}</p>}
                    <textarea
                      value={p.respuesta || ""}
                      onChange={(e) => responder(i, e.target.value)}
                      placeholder="Tu respuesta (opcional)"
                      disabled={deshabilitado}
                      className={`${CLASE_INPUT} h-16 resize-y mt-2`}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
