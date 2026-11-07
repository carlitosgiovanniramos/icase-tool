"use client";

import { PALETA } from "../../../estilos";

const NOMBRES = { web: "Web", movil: "Móvil" };

// Ficha del paso "Frontend": por plataforma, su avance (archivos generados), los botones para generar,
// continuar o compilar, y el resultado de la última compilación en Docker.
// plataformas: [{ clave: "web", total: 50 }]; ocupado: lo que se está haciendo ("generar:web", "compilar:web").
export default function FichaFrontend({ ficha, plataformas, editable, deshabilitado, ocupado, detalle, onGenerar, onCompilar }) {
  const revision = ficha?.revision || [];
  return (
    <div className="mt-4 space-y-4 text-sm">
      {plataformas.map(({ clave, total }) => {
        const datos = ficha?.plataformas?.[clave];
        const hechos = datos?.archivos?.length || 0;
        const completa = !!datos && !datos.incompleto && hechos > 0;
        const compilacion = datos?.compilacion;
        const generando = ocupado === `generar:${clave}`;
        const compilando = ocupado === `compilar:${clave}`;
        return (
          <div key={clave} className="border border-gray-300 p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p>
                <strong>{NOMBRES[clave]}</strong> · {hechos}/{total} archivos
                {compilacion && (
                  <span className="ml-2 font-semibold" style={{ color: compilacion.ok ? PALETA.oliva : PALETA.carmesi }}>
                    · {compilacion.ok ? "compila" : "no compila"}
                  </span>
                )}
              </p>
              {editable && (
                <div className="flex gap-2 flex-wrap">
                  <button disabled={deshabilitado} onClick={() => onGenerar(clave, datos?.incompleto)} className="border px-3 py-1.5 disabled:opacity-50" style={{ borderColor: PALETA.marron }}>
                    {generando ? detalle || "Generando..." : datos?.incompleto ? `Continuar ${NOMBRES[clave].toLowerCase()}` : completa ? `Regenerar ${NOMBRES[clave].toLowerCase()}` : `Generar ${NOMBRES[clave].toLowerCase()}`}
                  </button>
                  {completa && (
                    <button disabled={deshabilitado} onClick={() => onCompilar(clave)} className="border px-3 py-1.5 disabled:opacity-50">
                      {compilando ? detalle || "Compilando (varios minutos)..." : "Compilar y corregir"}
                    </button>
                  )}
                </div>
              )}
            </div>
            {compilacion && !compilacion.ok && (
              <details className="mt-2">
                <summary className="cursor-pointer" style={{ color: PALETA.carmesi }}>
                  Error de compilación{compilacion.archivo ? ` en ${compilacion.archivo}` : ""}
                </summary>
                <pre className="overflow-auto max-h-72 bg-gray-50 p-2 mt-2 text-xs whitespace-pre-wrap">{compilacion.salida}</pre>
              </details>
            )}
            {hechos > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-600">Archivos</summary>
                <ul className="mt-2 divide-y divide-gray-200">
                  {datos.archivos.map((a) => (
                    <li key={a.ruta} className="py-1">
                      <span className="font-mono text-xs">{a.ruta}</span>
                      <span className="text-gray-500"> · {a.lineas} líneas{a.corregido ? " · corregido" : ""}{a.editado ? " · editado" : ""}</span>
                      {a.advertencias?.length > 0 && <ul className="list-disc pl-5 text-xs text-gray-600">{a.advertencias.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })}
      {revision.length > 0 && (
        <div className="border p-3" style={{ borderColor: PALETA.carmesi, borderLeftWidth: 4 }}>
          <p className="font-semibold mb-1" style={{ color: PALETA.carmesi }}>Revisar antes de aprobar</p>
          <ul className="list-disc pl-5 space-y-0.5 text-gray-700">{revision.slice(0, 30).map((r, i) => <li key={i}>{r}</li>)}</ul>
          {revision.length > 30 && <p className="mt-1 text-gray-600">y {revision.length - 30} más en la lista de archivos.</p>}
        </div>
      )}
    </div>
  );
}
