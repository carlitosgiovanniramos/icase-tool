"use client";

import { useState } from "react";
import { PALETA } from "../../../estilos";

const PRIORIDADES = ["alta", "media", "baja"];
const METODOS_VERIFICACION = ["Inspección", "Análisis", "Demostración", "Prueba"];

const CLASE_INPUT =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900 bg-white";

function Campo({ etiqueta, children, ancho }) {
  return (
    <label className={`block ${ancho ? "sm:col-span-2" : ""}`}>
      <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

// Formulario para editar un requerimiento existente (inicial) o crear uno nuevo a mano.
// Los campos que no muestra (ej. dependencias) se conservan tal cual al editar.
export default function FormularioRequisito({
  codigo,
  esNoFuncional,
  inicial,
  actoresDisponibles,
  categoriasSugeridas = [],
  onGuardar,
  onCancelar,
}) {
  const [datos, setDatos] = useState(() => ({
    nombre: inicial?.nombre || "",
    descripcion: inicial?.descripcion || "El sistema debe ",
    prioridad: inicial?.prioridad?.toLowerCase() || "media",
    categoria: inicial?.categoria || "",
    actores: Array.isArray(inicial?.actores) ? inicial.actores : [],
    metodo_verificacion: inicial?.metodo_verificacion || "Prueba",
    precondiciones: inicial?.precondiciones || "",
    postcondiciones: inicial?.postcondiciones || "",
  }));

  const cambiar = (clave, valor) => setDatos((d) => ({ ...d, [clave]: valor }));
  const alternarActor = (nombre) =>
    cambiar(
      "actores",
      datos.actores.includes(nombre)
        ? datos.actores.filter((a) => a !== nombre)
        : [...datos.actores, nombre]
    );

  const valido =
    datos.nombre.trim() &&
    datos.descripcion.trim().length > "El sistema debe".length &&
    (!esNoFuncional || datos.categoria.trim());

  function guardar(e) {
    e.preventDefault();
    if (!valido) return;
    const limpio = {
      ...datos,
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion.trim(),
      categoria: datos.categoria.trim(),
      precondiciones: datos.precondiciones.trim() || "No aplica",
      postcondiciones: datos.postcondiciones.trim() || "No aplica",
    };
    if (!esNoFuncional) delete limpio.categoria;
    onGuardar(limpio);
  }

  return (
    <form
      onSubmit={guardar}
      className="bg-gray-50 border-2 p-4 space-y-3"
      style={{ borderColor: PALETA.navy }}
    >
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: PALETA.navy }}
        >
          {codigo}
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {inicial ? "Editando requerimiento" : "Nuevo requerimiento"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo etiqueta="Nombre (3-6 palabras)" ancho={!esNoFuncional}>
          <input
            value={datos.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            className={CLASE_INPUT}
            autoFocus
          />
        </Campo>
        {esNoFuncional && (
          <Campo etiqueta="Categoría">
            <input
              value={datos.categoria}
              onChange={(e) => cambiar("categoria", e.target.value)}
              list={`categorias-${codigo}`}
              placeholder="Ej: Seguridad"
              className={CLASE_INPUT}
            />
            <datalist id={`categorias-${codigo}`}>
              {categoriasSugeridas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Campo>
        )}
        <Campo etiqueta="Descripción" ancho>
          <textarea
            value={datos.descripcion}
            onChange={(e) => cambiar("descripcion", e.target.value)}
            className={`${CLASE_INPUT} h-20 resize-y`}
          />
        </Campo>
        <Campo etiqueta="Prioridad">
          <select
            value={datos.prioridad}
            onChange={(e) => cambiar("prioridad", e.target.value)}
            className={CLASE_INPUT}
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Método de verificación">
          <select
            value={datos.metodo_verificacion}
            onChange={(e) => cambiar("metodo_verificacion", e.target.value)}
            className={CLASE_INPUT}
          >
            {METODOS_VERIFICACION.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Precondiciones (opcional)">
          <textarea
            value={datos.precondiciones === "No aplica" ? "" : datos.precondiciones}
            onChange={(e) => cambiar("precondiciones", e.target.value)}
            className={`${CLASE_INPUT} h-16 resize-y`}
          />
        </Campo>
        <Campo etiqueta="Postcondiciones (opcional)">
          <textarea
            value={datos.postcondiciones === "No aplica" ? "" : datos.postcondiciones}
            onChange={(e) => cambiar("postcondiciones", e.target.value)}
            className={`${CLASE_INPUT} h-16 resize-y`}
          />
        </Campo>
      </div>

      {actoresDisponibles.length > 0 && (
        <div>
          <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Actores
          </span>
          <div className="flex flex-wrap gap-2">
            {actoresDisponibles.map((nombre) => {
              const activo = datos.actores.includes(nombre);
              return (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => alternarActor(nombre)}
                  aria-pressed={activo}
                  style={activo ? { backgroundColor: PALETA.navy, borderColor: PALETA.navy } : undefined}
                  className={`border px-2.5 py-1 text-xs font-semibold ${
                    activo ? "text-white" : "border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
                  }`}
                >
                  {activo ? "✓ " : ""}
                  {nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!valido}
          style={{ backgroundColor: PALETA.navy }}
          className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
        >
          {inicial ? "Guardar cambios" : "Agregar requerimiento"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Cancelar
        </button>
        {!valido && (
          <span className="text-xs text-gray-500">
            Completa el nombre, la descripción{esNoFuncional ? " y la categoría" : ""}.
          </span>
        )}
      </div>
    </form>
  );
}
