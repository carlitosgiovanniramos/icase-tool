"use client";

import { useState } from "react";

export default function FichaContrato({ contrato, editable, deshabilitado, onGuardar, onProbar }) {
  const [borrador, setBorrador] = useState(null);
  const [error, setError] = useState("");
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([contrato.openapi || JSON.stringify({ operaciones: contrato.operaciones, acciones: contrato.acciones }, null, 2)], { type: contrato.openapi ? "application/yaml" : "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = contrato.openapi ? "openapi.yaml" : "contrato-api.json"; a.click(); URL.revokeObjectURL(url);
  };
  async function guardar() {
    let actual;
    try { actual = JSON.parse(borrador); } catch { setError("El JSON no es válido."); return; }
    setError("");
    if (await onGuardar(actual)) setBorrador(null);
  }
  return (
    <div className="mt-4 space-y-4 text-sm">
      <p>{contrato.operaciones.length} operaciones · Acciones {contrato.cobertura.acciones.join("/")} · RF {contrato.cobertura.requerimientos.join("/")}</p>
      {!!contrato.errores?.length && <div className="border border-red-300 bg-red-50 p-3"><strong>Corregir antes de aprobar</strong><ul className="list-disc pl-5">{contrato.errores.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      {!!contrato.advertencias?.length && <div className="border border-amber-300 bg-amber-50 p-3"><strong>Revisar antes de aprobar</strong><ul className="list-disc pl-5">{contrato.advertencias.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
      <div className="flex gap-3 flex-wrap">
        <button onClick={descargar} className="border px-3 py-2">Descargar contrato</button>
        {editable && <button disabled={deshabilitado} onClick={() => setBorrador(JSON.stringify({ operaciones: contrato.operaciones, acciones: contrato.acciones.map(({ id, tipo, operaciones, motivo }) => ({ id, tipo, operaciones, motivo })) }, null, 2))} className="border px-3 py-2 disabled:opacity-50">Editar contrato</button>}
        {editable && contrato.tipo === "supabase" && <button onClick={onProbar} disabled={deshabilitado || !!contrato.errores?.length} className="border px-3 py-2 disabled:opacity-50">Probar permisos</button>}
      </div>
      {borrador !== null && <div>
        <label className="block mb-2" htmlFor="contrato-json">Operaciones y acciones (JSON)</label>
        <textarea id="contrato-json" value={borrador} onChange={(e) => setBorrador(e.target.value)} disabled={deshabilitado || !editable} spellCheck={false} className="w-full h-96 border p-3 font-mono text-xs" />
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex gap-3 mt-2"><button disabled={deshabilitado || !editable} onClick={guardar} className="border px-3 py-2 disabled:opacity-50">Validar y guardar</button><button disabled={deshabilitado} onClick={() => { setBorrador(null); setError(""); }} className="border px-3 py-2">Cancelar</button></div>
      </div>}
      <details><summary className="cursor-pointer font-semibold">Acciones por pantalla</summary>
        <div className="overflow-x-auto"><table className="w-full text-left mt-2"><thead><tr><th className="p-2">Pantalla</th><th className="p-2">Acción</th><th className="p-2">Operaciones / motivo</th></tr></thead><tbody>{contrato.acciones.map((a) => <tr key={a.id} className="border-t"><td className="p-2">{a.pantalla} ({a.plataforma})</td><td className="p-2">{a.nombre}</td><td className="p-2">{a.operaciones.join(", ") || `${a.tipo}: ${a.motivo}`}</td></tr>)}</tbody></table></div>
      </details>
      {contrato.operaciones.map((op) => <details key={op.id} className="border p-3"><summary className="cursor-pointer font-semibold">{op.nombre} · {op.metodo} {op.recurso}</summary><p className="mt-2">{op.descripcion}</p><p className="mt-2">{op.roles.join(", ")} · {op.requerimientos.join(", ")}</p><pre className="overflow-x-auto bg-gray-50 p-2 mt-2 text-xs">{JSON.stringify({ entrada: op.entrada, salida: op.salida, prueba: op.prueba }, null, 2)}</pre></details>)}
      <div className="border p-3"><strong>Prueba de permisos</strong>
        {!contrato.prueba ? <p className="mt-2">Sin probar. Requiere Docker y el runner local. Las Edge Functions se prueban cuando exista el backend.</p> : <>
          <p className="mt-2">{contrato.prueba.correctas} correctas · {contrato.prueba.fallidas} fallidas · {contrato.prueba.inconclusas} sin verificar · {contrato.prueba.pendientes} pendientes de integración</p>
          <details><summary className="cursor-pointer mt-2">Ver resultados por usuario</summary><ul className="space-y-2 mt-2">{contrato.prueba.resultados.map((r, i) => <li key={i}><strong>{r.operacion} {r.rol || ""}: {r.estado}</strong> — {r.detalle}</li>)}</ul></details>
        </>}
      </div>
      {contrato.inventario && <details><summary className="cursor-pointer font-semibold">Inventario de la base probada</summary><pre className="overflow-auto max-h-96 bg-gray-50 p-3 text-xs">{JSON.stringify(contrato.inventario, null, 2)}</pre></details>}
    </div>
  );
}
