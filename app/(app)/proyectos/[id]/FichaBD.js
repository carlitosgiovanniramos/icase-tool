"use client";

import { PALETA } from "../../../estilos";
import { CONTRASENA_PRUEBA } from "@/lib/archivosBD";
import { Cobertura } from "./FichaEstructura";

// Ficha del paso "Base de datos": el resultado de la prueba en contenedores (cada tabla con su RLS,
// políticas, filas de prueba y acceso desde la API) y los archivos SQL generados.
// onProbar: vuelve a aplicar los archivos desde cero (solo si el paso se puede trabajar).

const fechaLocal = (iso) => (iso ? new Date(iso).toLocaleString("es", { dateStyle: "short", timeStyle: "short" }) : "");
const si = (valor) => (valor === true ? "Sí" : valor === false ? "No" : "—");

function EstadoPrueba({ prueba, onProbar, probando, deshabilitado }) {
  const texto = !prueba
    ? { titulo: "Sin probar", color: "#6b7280" }
    : prueba.ok
    ? { titulo: `Probada en contenedores · ${fechaLocal(prueba.fecha)}`, color: PALETA.oliva }
    : prueba.ok === false
    ? { titulo: `Falló al aplicar ${prueba.archivo || "la base"}`, color: PALETA.carmesi }
    : { titulo: `Sin probar: ${prueba.error}`, color: PALETA.naranjaOscuro };

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap border border-gray-300 px-4 py-2.5">
      <span className="text-sm font-semibold" style={{ color: texto.color }}>
        {texto.titulo}
      </span>
      {onProbar && (
        <button
          onClick={onProbar}
          disabled={deshabilitado}
          style={{ borderColor: PALETA.navy, color: PALETA.navy }}
          className="border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {probando ? "Probando..." : "Probar de nuevo"}
        </button>
      )}
    </div>
  );
}

export default function FichaBD({ bd, onProbar, probando, deshabilitado }) {
  const archivos = bd.archivos || [];
  const revision = bd.revision || [];
  const prueba = bd.prueba;
  const tablas = prueba?.tablas || [];
  const c = prueba?.cobertura || {};

  return (
    <div className="mt-4 space-y-4">
      {revision.length > 0 && (
        <div className="border p-3" style={{ borderColor: PALETA.carmesi, borderLeftWidth: 4 }}>
          <p className="text-sm font-semibold mb-1" style={{ color: PALETA.carmesi }}>
            Revisar antes de aprobar
          </p>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">
            {revision.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <EstadoPrueba prueba={prueba} onProbar={onProbar} probando={probando} deshabilitado={deshabilitado} />

      {prueba?.ok === false && prueba.error && (
        <pre className="bg-gray-900 text-gray-100 text-xs p-3 max-h-64 overflow-auto whitespace-pre-wrap">{prueba.error}</pre>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="border border-gray-300 px-3 py-1.5 text-sm">
          <span className="font-semibold">{archivos.length}</span> archivos
        </span>
        <Cobertura etiqueta="Tablas del ER" valor={c.tablas} />
        <Cobertura etiqueta="Con RLS y políticas" valor={c.rls} />
        <Cobertura etiqueta="Con datos de prueba" valor={c.datos} />
        {typeof prueba?.usuarios === "number" && (
          <span className="border border-gray-300 px-3 py-1.5 text-sm">
            <span className="font-semibold">{prueba.usuarios}</span> usuarios de prueba
            <span className="text-gray-500"> · contraseña {CONTRASENA_PRUEBA}</span>
          </span>
        )}
      </div>

      {tablas.length > 0 && (
        <details className="border border-gray-300">
          <summary className="cursor-pointer px-4 py-2.5 bg-gray-50 text-sm">
            <span className="font-semibold text-gray-900">Tablas</span>
            <span className="text-gray-500"> · {tablas.length}</span>
          </summary>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr>
                  {["Tabla", "RLS", "Políticas", "Filas", "API"].map((t) => (
                    <th key={t} className="px-2 py-1.5 text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tablas.map((t) => (
                  <tr key={t.tabla}>
                    <td className="px-2 py-1.5 font-mono text-xs text-gray-800">{t.tabla}</td>
                    <td className="px-2 py-1.5 text-gray-600">{si(t.rls)}</td>
                    <td className="px-2 py-1.5 text-gray-600">{t.politicas}</td>
                    <td className="px-2 py-1.5 text-gray-600">{t.filas}</td>
                    <td className="px-2 py-1.5 text-gray-600">{si(t.api)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(prueba.buckets?.length > 0 || prueba.realtime?.length > 0) && (
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                {prueba.buckets?.length > 0 && <p>Buckets de Storage: {prueba.buckets.join(", ")}</p>}
                {prueba.realtime?.length > 0 && <p>Tablas en Realtime: {prueba.realtime.join(", ")}</p>}
              </div>
            )}
          </div>
        </details>
      )}

      <details className="border border-gray-300">
        <summary className="cursor-pointer px-4 py-2.5 bg-gray-50 text-sm">
          <span className="font-semibold text-gray-900">Archivos</span>
          <span className="text-gray-500"> · se aplican en este orden</span>
        </summary>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                {["Archivo", "Líneas", "Tablas", "Advertencias"].map((t) => (
                  <th key={t} className="px-2 py-1.5 text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {archivos.map((a) => (
                <tr key={a.ruta}>
                  <td className="px-2 py-1.5 align-top font-mono text-xs text-gray-800 whitespace-nowrap">
                    {a.ruta}
                    {a.corregido && <span className="ml-2 text-[10px] font-bold uppercase text-gray-500">corregido</span>}
                  </td>
                  <td className="px-2 py-1.5 align-top text-gray-500">{a.lineas}</td>
                  <td className="px-2 py-1.5 align-top text-gray-500 text-xs">{(a.tablas || []).join(", ")}</td>
                  <td className="px-2 py-1.5 align-top text-gray-500">{a.advertencias?.length || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">El código de cada archivo está en el explorador de archivos del proyecto.</p>
        </div>
      </details>
    </div>
  );
}
