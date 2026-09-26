"use client";

import { useState } from "react";
import {
  PALETA,
  ROTACION_COLORES,
  CATEGORIA_COLORES,
  CATEGORIA_COLOR_DEFECTO,
  PRIORIDAD_COLORES,
  PRIORIDAD_COLOR_DEFECTO,
} from "../../../estilos";
import BadgeModelo from "./BadgeModelo";
import FormularioRequisito from "./FormularioRequisito";

function iniciales(nombre) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function comoLista(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  if (typeof valor === "string" && valor.trim()) return [valor.trim()];
  return [];
}

function siguienteCodigo(lista, prefijo) {
  const ultimo = lista.reduce(
    (max, r) => Math.max(max, Number(r.codigo?.match(/\d+/)?.[0]) || 0),
    0
  );
  return `${prefijo}${String(ultimo + 1).padStart(2, "0")}`;
}

function EtiquetaSeccion({ children, extra }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-2 h-2 shrink-0" style={{ backgroundColor: PALETA.navy }} />
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {children}
      </h3>
      {extra}
    </div>
  );
}

// Marca los actores y requerimientos agregados con "Ampliar con IA" hasta que se aprueban.
function EtiquetaNuevo() {
  return (
    <span
      className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: PALETA.oliva }}
    >
      Nuevo
    </span>
  );
}

function TarjetaRequisito({ r, colorBadge, etiquetaBadge, badgeSolido, onEditar, onEliminar }) {
  const [abierto, setAbierto] = useState(false);

  const dependencias = comoLista(r.dependencias);
  const actores = comoLista(r.actores);
  const tieneDetalle =
    dependencias.length > 0 ||
    actores.length > 0 ||
    (r.precondiciones && r.precondiciones !== "No aplica") ||
    (r.postcondiciones && r.postcondiciones !== "No aplica") ||
    !!r.metodo_verificacion;

  const prioridad = r.prioridad?.toLowerCase();
  const colorPrioridad = PRIORIDAD_COLORES[prioridad] || PRIORIDAD_COLOR_DEFECTO;

  return (
    <div
      className="bg-white border p-4"
      style={{ borderColor: r.nuevo ? PALETA.oliva : "#d1d5db" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`shrink-0 h-fit px-2 py-1 border text-xs font-bold ${
              badgeSolido ? "text-white" : ""
            }`}
            style={
              badgeSolido
                ? { backgroundColor: colorBadge, borderColor: colorBadge }
                : { borderColor: colorBadge, color: colorBadge }
            }
          >
            {etiquetaBadge || r.codigo}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm leading-snug">
              {r.nombre || r.codigo}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono text-gray-400">{r.codigo}</span>
              {r.nuevo && <EtiquetaNuevo />}
              {prioridad && (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: colorPrioridad }}
                >
                  Prioridad {prioridad}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {tieneDetalle && (
            <button
              onClick={() => setAbierto((v) => !v)}
              className="text-xs font-semibold whitespace-nowrap"
              style={{ color: PALETA.navy }}
            >
              {abierto ? "Ocultar ▲" : "Detalles ▾"}
            </button>
          )}
          {onEditar && (
            <button
              onClick={onEditar}
              title={`Editar ${r.codigo}`}
              className="text-xs font-semibold whitespace-nowrap hover:underline"
              style={{ color: PALETA.navy }}
            >
              ✎ Editar
            </button>
          )}
          {onEliminar && (
            <button
              onClick={() => onEliminar(r.codigo)}
              title={`Eliminar ${r.codigo}`}
              className="text-xs font-semibold whitespace-nowrap hover:underline"
              style={{ color: PALETA.carmesi }}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mt-3">{r.descripcion}</p>

      {abierto && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs text-gray-600">
          {actores.length > 0 && (
            <div>
              <span className="font-semibold text-gray-700">Actores: </span>
              {actores.join(", ")}
            </div>
          )}
          {r.precondiciones && r.precondiciones !== "No aplica" && (
            <div>
              <span className="font-semibold text-gray-700">Precondiciones: </span>
              {r.precondiciones}
            </div>
          )}
          {r.postcondiciones && r.postcondiciones !== "No aplica" && (
            <div>
              <span className="font-semibold text-gray-700">Postcondiciones: </span>
              {r.postcondiciones}
            </div>
          )}
          {dependencias.length > 0 && (
            <div>
              <span className="font-semibold text-gray-700">Dependencias: </span>
              {dependencias.join(", ")}
            </div>
          )}
          {r.metodo_verificacion && (
            <div>
              <span className="font-semibold text-gray-700">Método de verificación: </span>
              {r.metodo_verificacion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Una sección (funcionales o no funcionales) con sus tarjetas, la edición en el lugar y el
// formulario para agregar un requerimiento a mano al final.
function SeccionRequisitos({
  titulo,
  tipo,
  lista,
  esNoFuncional,
  editando,
  setEditando,
  actoresDisponibles,
  categoriasSugeridas,
  onEliminar,
  onGuardar,
}) {
  const claveNuevo = `nuevo:${tipo}`;
  const codigoNuevo = siguienteCodigo(lista, esNoFuncional ? "RNF" : "RF");

  const formulario = (inicial, codigo) => (
    <FormularioRequisito
      key={codigo}
      codigo={codigo}
      esNoFuncional={esNoFuncional}
      inicial={inicial}
      actoresDisponibles={actoresDisponibles}
      categoriasSugeridas={categoriasSugeridas}
      onCancelar={() => setEditando(null)}
      onGuardar={async (datos) => {
        await onGuardar(tipo, inicial ? codigo : null, datos, codigo);
        setEditando(null);
      }}
    />
  );

  return (
    <div>
      <EtiquetaSeccion>{titulo}</EtiquetaSeccion>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lista.map((r) =>
          editando === r.codigo && onGuardar ? (
            <div key={r.codigo} className="md:col-span-2">
              {formulario(r, r.codigo)}
            </div>
          ) : (
            <TarjetaRequisito
              key={r.codigo}
              r={r}
              colorBadge={
                esNoFuncional
                  ? CATEGORIA_COLORES[r.categoria] || CATEGORIA_COLOR_DEFECTO
                  : PALETA.navy
              }
              etiquetaBadge={esNoFuncional ? r.categoria : undefined}
              badgeSolido={esNoFuncional}
              onEditar={onGuardar && (() => setEditando(r.codigo))}
              onEliminar={onEliminar && ((codigo) => onEliminar(tipo, codigo))}
            />
          )
        )}

        {editando === claveNuevo && onGuardar && (
          <div className="md:col-span-2">{formulario(null, codigoNuevo)}</div>
        )}
      </div>

      {onGuardar && editando !== claveNuevo && (
        <button
          onClick={() => setEditando(claveNuevo)}
          style={{ borderColor: PALETA.navy, color: PALETA.navy }}
          className="mt-3 border border-dashed px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          + Agregar requerimiento {esNoFuncional ? "no funcional" : "funcional"}
        </button>
      )}
    </div>
  );
}

// Los callbacks son opcionales: si no se pasan (ej. mientras hay una generación en curso), las
// tarjetas se muestran sin los botones correspondientes.
//   onEliminarRequerimiento(tipo, codigo)
//   onEliminarActor(nombre)
//   onGuardarRequerimiento(tipo, codigoOriginal | null, datos, codigo) — editar o agregar a mano
export default function AnalisisResultado({
  resultado,
  modelo,
  onEliminarRequerimiento,
  onEliminarActor,
  onGuardarRequerimiento,
}) {
  const [editando, setEditando] = useState(null); // código en edición o "nuevo:<tipo>"

  const {
    actores = [],
    requerimientos_funcionales = [],
    requerimientos_no_funcionales = [],
  } = resultado;

  const actoresDisponibles = actores.map((a) => a.nombre);
  const categoriasSugeridas = [
    ...new Set(requerimientos_no_funcionales.map((r) => r.categoria).filter(Boolean)),
  ];
  const propsComunes = {
    editando,
    setEditando,
    actoresDisponibles,
    categoriasSugeridas,
    onEliminar: onEliminarRequerimiento,
    onGuardar: onGuardarRequerimiento,
  };

  return (
    <div className="mt-6 space-y-8">
      <div>
        <EtiquetaSeccion extra={<BadgeModelo modelo={modelo} />}>Actores</EtiquetaSeccion>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actores.map((actor, i) => {
            const color = ROTACION_COLORES[i % ROTACION_COLORES.length];
            return (
              <div
                key={actor.nombre + i}
                className="bg-white border border-gray-300"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div
                    className="w-9 h-9 flex items-center justify-center text-white font-semibold text-xs shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {iniciales(actor.nombre)}
                  </div>
                  <h4 className="font-semibold text-gray-800 flex-1 min-w-0">
                    {actor.nombre} {actor.nuevo && <EtiquetaNuevo />}
                  </h4>
                  {onEliminarActor && (
                    <button
                      onClick={() => onEliminarActor(actor.nombre)}
                      title={`Quitar el actor ${actor.nombre}`}
                      aria-label={`Quitar el actor ${actor.nombre}`}
                      className="shrink-0 w-6 h-6 flex items-center justify-center text-sm text-gray-400 hover:text-white hover:bg-[#7f1d1d]"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed px-4 pb-4">
                  {actor.descripcion}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <SeccionRequisitos
        titulo="Requerimientos funcionales"
        tipo="requerimientos_funcionales"
        lista={requerimientos_funcionales}
        {...propsComunes}
      />

      <SeccionRequisitos
        titulo="Requerimientos no funcionales"
        tipo="requerimientos_no_funcionales"
        lista={requerimientos_no_funcionales}
        esNoFuncional
        {...propsComunes}
      />
    </div>
  );
}
