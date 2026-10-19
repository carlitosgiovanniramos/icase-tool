"use client";

import { PALETA } from "../../../estilos";

// Ficha del paso "Estructura de carpetas": la cobertura del diseño (pantallas, tablas, módulos y
// RF) y, por pieza, cada archivo con su tipo, propósito, requerimientos y lo que cubre.

function Cobertura({ etiqueta, valor }) {
  if (!valor || !valor[1]) return null;
  const completa = valor[0] === valor[1];
  return (
    <span className="border px-3 py-1.5 text-sm" style={{ borderColor: completa ? PALETA.oliva : PALETA.carmesi }}>
      <span className="text-gray-600">{etiqueta} </span>
      <span className="font-semibold" style={{ color: completa ? PALETA.oliva : PALETA.carmesi }}>
        {valor[0]}/{valor[1]}
      </span>
    </span>
  );
}

function queCubre(a) {
  if (a.pantallas?.length) return a.pantallas.join(" · ");
  if (a.tablas?.length) return a.tablas.join(", ");
  return "";
}

export default function FichaEstructura({ estructura }) {
  const archivos = estructura.archivos || [];
  const revision = estructura.revision || [];
  const c = estructura.cobertura || {};

  return (
    <div className="mt-4">
      {revision.length > 0 && (
        <div className="border p-3 mb-4" style={{ borderColor: PALETA.carmesi, borderLeftWidth: 4 }}>
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

      <div className="flex flex-wrap gap-2">
        <span className="border border-gray-300 px-3 py-1.5 text-sm">
          <span className="font-semibold">{archivos.length}</span> archivos
        </span>
        <Cobertura etiqueta="Pantallas" valor={c.pantallas} />
        <Cobertura etiqueta="Tablas" valor={c.tablas} />
        <Cobertura etiqueta="Módulos" valor={c.modulos} />
        <Cobertura etiqueta="RF" valor={c.requerimientos} />
      </div>

      {Object.entries(estructura.piezas || {}).map(([pieza, info]) => {
        const suyos = archivos.filter((a) => a.pieza === pieza);
        return (
          <details key={pieza} className="mt-4 border border-gray-300">
            <summary className="cursor-pointer px-4 py-2.5 bg-gray-50 text-sm">
              <span className="font-semibold text-gray-900">{info.titulo}</span>
              <span className="text-gray-500">
                {" "}
                · {info.carpeta}/ · {suyos.length} archivos
              </span>
            </summary>
            {info.notas && <p className="px-4 pt-3 text-sm text-gray-600 leading-relaxed">{info.notas}</p>}
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr>
                    {["Archivo", "Tipo", "Para qué", "RF", "Cubre"].map((t) => (
                      <th key={t} className="px-2 py-1.5 text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suyos.map((a) => (
                    <tr key={a.ruta}>
                      <td className="px-2 py-1.5 align-top font-mono text-xs text-gray-800 whitespace-nowrap">{a.ruta.slice(info.carpeta.length + 1)}</td>
                      <td className="px-2 py-1.5 align-top text-gray-500 whitespace-nowrap">{a.tipo}</td>
                      <td className="px-2 py-1.5 align-top text-gray-800">{a.proposito}</td>
                      <td className="px-2 py-1.5 align-top text-gray-500 whitespace-nowrap" title={a.requerimientos.join(", ")}>
                        {a.requerimientos.length || ""}
                      </td>
                      <td className="px-2 py-1.5 align-top text-gray-500 text-xs">{queCubre(a)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
