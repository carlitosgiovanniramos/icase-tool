"use client";

import { useState } from "react";
import { PALETA } from "../../../estilos";
import { TIPOS_CASO, RESULTADOS, GRAVEDADES, resumenPruebas, trazabilidad, revisarParaAprobar, idHallazgo } from "@/lib/pruebas";

const COLOR_RESULTADO = { pendiente: "#6b7280", aprobado: PALETA.oliva, fallido: PALETA.carmesi };
const CLASE_INPUT = "w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-gray-900";

function Cifra({ etiqueta, valor, color }) {
  return (
    <span className="border border-gray-300 px-3 py-1.5">
      {etiqueta}: <span className="font-semibold" style={color ? { color } : undefined}>{valor}</span>
    </span>
  );
}

function Etiqueta({ children, color }) {
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: color }}>
      {children}
    </span>
  );
}

function Caso({ caso, editable, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} className="flex items-center gap-2 text-left hover:opacity-75">
          <span className="inline-block w-3 text-gray-400 text-xs">{abierto ? "▾" : "▸"}</span>
          <span className="font-mono text-xs text-gray-500">{caso.id}</span>
          <span className="text-sm text-gray-900">{caso.titulo}</span>
        </button>
        <span className="text-xs text-gray-500">{caso.rfs.join(", ")}</span>
        <Etiqueta color={COLOR_RESULTADO[caso.resultado]}>{RESULTADOS[caso.resultado]}</Etiqueta>
      </div>
      {abierto && (
        <div className="mt-2 ml-5 space-y-2 text-sm text-gray-700">
          <p><span className="font-semibold">Actor:</span> {caso.actor || "—"} · {TIPOS_CASO[caso.tipo]}</p>
          {caso.precondiciones && <p><span className="font-semibold">Antes:</span> {caso.precondiciones}</p>}
          <ol className="list-decimal ml-5">
            {caso.pasos.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
          <p><span className="font-semibold">Esperado:</span> {caso.esperado}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(RESULTADOS).map(([clave, texto]) => (
              <button
                key={clave}
                type="button"
                disabled={!editable}
                onClick={() => onCambiar({ ...caso, resultado: clave })}
                style={caso.resultado === clave ? { backgroundColor: COLOR_RESULTADO[clave], borderColor: COLOR_RESULTADO[clave], color: "#fff" } : { borderColor: COLOR_RESULTADO[clave], color: COLOR_RESULTADO[clave] }}
                className="border px-3 py-1 text-xs font-semibold disabled:opacity-50"
              >
                {texto}
              </button>
            ))}
          </div>
          <input
            defaultValue={caso.observacion}
            disabled={!editable}
            onBlur={(e) => e.target.value !== caso.observacion && onCambiar({ ...caso, observacion: e.target.value })}
            placeholder="Observación (opcional)"
            className={CLASE_INPUT}
          />
        </div>
      )}
    </li>
  );
}

function FormularioHallazgo({ casos, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState({ caso: "", titulo: "", gravedad: "media", descripcion: "" });
  const campo = (clave) => (e) => setDatos({ ...datos, [clave]: e.target.value });
  return (
    <div className="border border-gray-300 p-3 space-y-2 bg-gray-50">
      <input value={datos.titulo} onChange={campo("titulo")} placeholder="Qué falló" className={CLASE_INPUT} />
      <div className="flex gap-2 flex-wrap">
        <select value={datos.caso} onChange={campo("caso")} className={`${CLASE_INPUT} sm:w-auto`}>
          <option value="">Sin caso asociado</option>
          {casos.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.titulo.slice(0, 60)}</option>)}
        </select>
        <select value={datos.gravedad} onChange={campo("gravedad")} className={`${CLASE_INPUT} sm:w-auto`}>
          {Object.entries(GRAVEDADES).map(([clave, texto]) => <option key={clave} value={clave}>Gravedad {texto.toLowerCase()}</option>)}
        </select>
      </div>
      <textarea value={datos.descripcion} onChange={campo("descripcion")} placeholder="Descripción (opcional)" rows={2} className={CLASE_INPUT} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!datos.titulo.trim()}
          onClick={() => onGuardar({ ...datos, titulo: datos.titulo.trim(), descripcion: datos.descripcion.trim() })}
          style={{ backgroundColor: PALETA.navy }}
          className="text-white px-3 py-1.5 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
        >
          Registrar
        </button>
        <button type="button" onClick={onCancelar} className="border border-gray-300 text-gray-700 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Ficha del paso "Plan de pruebas": cifras, trazabilidad con los requerimientos, casos (con su resultado) y
// hallazgos. editable: se puede anotar resultados y hallazgos (el paso no está aprobado/bloqueado).
export default function FichaPruebas({ ficha, analisis, editable, onGuardar }) {
  const [nuevoHallazgo, setNuevoHallazgo] = useState(false);
  if (!ficha) return null;
  const casos = ficha.casos || [];
  const hallazgos = ficha.hallazgos || [];
  const r = resumenPruebas(ficha);
  const t = trazabilidad(analisis, casos);
  const { errores } = revisarParaAprobar(ficha, analisis);

  const cambiarCaso = (nuevo) => onGuardar({ ...ficha, casos: casos.map((c) => (c.id === nuevo.id ? nuevo : c)) });
  const cambiarHallazgo = (nuevo) => onGuardar({ ...ficha, hallazgos: hallazgos.map((h) => (h.id === nuevo.id ? nuevo : h)) });
  const quitarHallazgo = (id) => onGuardar({ ...ficha, hallazgos: hallazgos.filter((h) => h.id !== id) });
  const agregarHallazgo = (datos) => {
    setNuevoHallazgo(false);
    onGuardar({ ...ficha, hallazgos: [...hallazgos, { id: idHallazgo(hallazgos), estado: "abierto", ...datos }] });
  };

  return (
    <div className="mt-4 space-y-5 text-sm">
      <div className="flex flex-wrap gap-2">
        <Cifra etiqueta="Casos" valor={r.total} />
        <Cifra etiqueta="Aprobaron" valor={r.aprobados} color={PALETA.oliva} />
        <Cifra etiqueta="Fallaron" valor={r.fallidos} color={r.fallidos ? PALETA.carmesi : undefined} />
        <Cifra etiqueta="Sin ejecutar" valor={r.pendientes} />
        <Cifra etiqueta="Requerimientos cubiertos" valor={`${t.filas.length - t.sinCubrir.length} de ${t.filas.length}`} color={t.sinCubrir.length ? PALETA.carmesi : PALETA.oliva} />
        <Cifra etiqueta="Hallazgos abiertos" valor={r.abiertos} color={r.abiertos ? PALETA.naranjaOscuro : undefined} />
      </div>

      {errores.length > 0 && (
        <ul className="list-disc ml-5" style={{ color: PALETA.carmesi }}>
          {errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <details>
        <summary className="cursor-pointer text-gray-600">Trazabilidad con los requerimientos · {t.filas.length}</summary>
        <table className="w-full border-collapse mt-2 text-xs">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border border-gray-300 px-2 py-1">Requerimiento</th>
              <th className="border border-gray-300 px-2 py-1">Casos</th>
              <th className="border border-gray-300 px-2 py-1">Aprobaron</th>
              <th className="border border-gray-300 px-2 py-1">Fallaron</th>
              <th className="border border-gray-300 px-2 py-1">Sin ejecutar</th>
            </tr>
          </thead>
          <tbody>
            {t.filas.map((f) => (
              <tr key={f.codigo}>
                <td className="border border-gray-300 px-2 py-1">{f.codigo}{f.nombre ? ` · ${f.nombre}` : ""}</td>
                <td className="border border-gray-300 px-2 py-1" style={f.casos.length ? undefined : { color: PALETA.carmesi }}>{f.casos.join(", ") || "Sin caso"}</td>
                <td className="border border-gray-300 px-2 py-1">{f.aprobados}</td>
                <td className="border border-gray-300 px-2 py-1">{f.fallidos}</td>
                <td className="border border-gray-300 px-2 py-1">{f.pendientes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Casos de prueba</p>
        <p className="text-gray-600 mb-2">
          Ejecuta cada caso en el sistema levantado y marca si aprobó o falló. Un caso fallido se registra como hallazgo.
        </p>
        <ul className="divide-y divide-gray-200 border border-gray-300 px-3">
          {casos.map((c) => <Caso key={c.id} caso={c} editable={editable} onCambiar={cambiarCaso} />)}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hallazgos · {hallazgos.length}</p>
          {editable && !nuevoHallazgo && (
            <button type="button" onClick={() => setNuevoHallazgo(true)} style={{ borderColor: PALETA.navy, color: PALETA.navy }} className="border bg-white px-3 py-1 text-xs font-semibold hover:bg-gray-50">
              Registrar hallazgo
            </button>
          )}
        </div>
        {nuevoHallazgo && <FormularioHallazgo casos={casos} onGuardar={agregarHallazgo} onCancelar={() => setNuevoHallazgo(false)} />}
        {hallazgos.length === 0 && !nuevoHallazgo && <p className="text-gray-500">Sin hallazgos registrados.</p>}
        {hallazgos.length > 0 && (
          <ul className="divide-y divide-gray-200 border border-gray-300 px-3">
            {hallazgos.map((h) => (
              <li key={h.id} className="py-2 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-gray-900">
                    <span className="font-mono text-xs text-gray-500 mr-2">{h.id}</span>
                    {h.titulo}
                    {h.caso && <span className="text-xs text-gray-500"> · {h.caso}</span>}
                  </p>
                  {h.descripcion && <p className="text-gray-600 text-xs mt-0.5">{h.descripcion}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Etiqueta color={h.gravedad === "alta" ? PALETA.carmesi : h.gravedad === "media" ? PALETA.naranjaOscuro : "#6b7280"}>{GRAVEDADES[h.gravedad] || h.gravedad}</Etiqueta>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => cambiarHallazgo({ ...h, estado: h.estado === "corregido" ? "abierto" : "corregido" })}
                    style={{ borderColor: h.estado === "corregido" ? PALETA.oliva : "#9ca3af", color: h.estado === "corregido" ? PALETA.oliva : "#4b5563" }}
                    className="border bg-white px-2 py-0.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {h.estado === "corregido" ? "Corregido" : "Marcar corregido"}
                  </button>
                  {editable && (
                    <button type="button" onClick={() => quitarHallazgo(h.id)} className="text-xs text-gray-500 hover:text-gray-900">
                      Quitar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
