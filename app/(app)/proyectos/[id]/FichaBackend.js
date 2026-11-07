"use client";

import { PALETA } from "../../../estilos";

// Ficha del paso "Backend": los archivos generados con sus avisos y la prueba de las Edge Functions
// (la prueba de permisos del contrato con el backend encendido).
export default function FichaBackend({ backend, onProbar, probando, deshabilitado }) {
  const archivos = backend.archivos || [];
  const prueba = backend.prueba;
  const revision = backend.revision || [];
  // Solo los resultados de las operaciones que cumple el backend (las edge del contrato).
  const funciones = (prueba?.resultados || []).filter((r) => (backend.operacionesEdge || []).includes(r.operacion));

  return (
    <div className="mt-4 space-y-4 text-sm">
      {revision.length > 0 && (
        <div className="border p-3" style={{ borderColor: PALETA.carmesi, borderLeftWidth: 4 }}>
          <p className="font-semibold mb-1" style={{ color: PALETA.carmesi }}>Revisar antes de aprobar</p>
          <ul className="list-disc pl-5 space-y-0.5 text-gray-700">{revision.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="border border-gray-300 px-3 py-1.5"><span className="font-semibold">{archivos.length}</span> archivos</span>
        {prueba && (
          <span className="border px-3 py-1.5" style={{ borderColor: prueba.fallidas ? PALETA.carmesi : PALETA.oliva }}>
            Prueba: {prueba.correctas} correctas · {prueba.fallidas} fallidas · {prueba.inconclusas} sin verificar
          </span>
        )}
      </div>

      <ul className="border border-gray-300 divide-y divide-gray-200">
        {archivos.map((a) => (
          <li key={a.ruta} className="px-3 py-2">
            <span className="font-mono text-xs">{a.ruta}</span>
            <span className="text-gray-500"> · {a.lineas} líneas{a.editado ? " · editado" : ""}</span>
            {a.advertencias?.length > 0 && <ul className="list-disc pl-5 text-xs text-gray-600 mt-1">{a.advertencias.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          </li>
        ))}
      </ul>

      <div className="border p-3">
        <strong>Prueba de las funciones</strong>
        {!prueba ? (
          <p className="mt-2">Sin probar. Levanta la base con las funciones en Docker y llama a cada una como cada actor del contrato.</p>
        ) : (
          <>
            <p className="mt-2">{new Date(prueba.fecha).toLocaleString("es")}</p>
            {funciones.length > 0 && (
              <ul className="mt-2 space-y-1">{funciones.map((r, i) => <li key={i}><strong>{r.operacion} {r.rol || ""}: {r.estado}</strong> — {r.detalle}</li>)}</ul>
            )}
            {funciones.length === 0 && <p className="mt-2">El contrato no tiene operaciones de Edge Functions con datos de prueba.</p>}
          </>
        )}
        {onProbar && (
          <button onClick={onProbar} disabled={deshabilitado} className="mt-3 border px-3 py-2 disabled:opacity-50">
            {probando ? "Probando (varios minutos)..." : "Probar backend"}
          </button>
        )}
      </div>
    </div>
  );
}
