"use client";

import { useMemo, useState } from "react";
import { PALETA } from "../../../estilos";
import { validarPantalla } from "@/lib/validarPantalla";

// Revisión asistida de una pantalla del prototipo: lista lo que le falta para que el front pueda
// construirla (botones sin destino, formularios sin operación, modales rotos, estilos propios...)
// y deja elegir con casillas qué corregir. "Corregir con IA" aplica solo lo marcado, sin tocar
// lo demás. Se vuelve a revisar sola después de cada cambio.
export default function RevisionPantalla({ pantalla, indice, validacion, onCorregir, deshabilitado, bloqueado }) {
  const [omitidos, setOmitidos] = useState([]); // ids desmarcados
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [abierta, setAbierta] = useState(true);

  const problemas = useMemo(
    () =>
      validarPantalla(pantalla.html, {
        operaciones: new Set(validacion?.operaciones || []),
        nombres: validacion?.nombres || [],
        acceso: (validacion?.accesos || []).includes(pantalla.nombre),
      }),
    [pantalla.html, pantalla.nombre, validacion]
  );

  const marcados = problemas.filter((p) => !omitidos.includes(p.id));
  const bloqueo = deshabilitado || bloqueado || corrigiendo;

  const alternar = (id) => setOmitidos((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  async function corregir() {
    const operaciones = validacion?.operaciones || [];
    const instruccion = [
      "Corrige SOLO estos problemas de la pantalla, sin cambiar nada más (ni el menú, ni el estilo, ni el resto del contenido):",
      ...marcados.map((p) => `- ${p.texto}`),
      "",
      "Reglas: cada botón o enlace hace una cosa (abre un modal con <label for>, navega con data-pantalla, envía un formulario con type=\"submit\" dentro de un <form data-operacion>, o ejecuta una operación). Los campos llevan name con el atributo de la clase. Todo modal y mensaje que se abre existe en esta pantalla con su casilla (<input type=\"checkbox\" class=\"modal-chk\"> o \"toast-chk\") JUSTO antes de su ventana. Colores y radios solo con var(--...).",
      operaciones.length ? `Operaciones válidas para data-operacion: ${operaciones.join(", ")}.` : "",
      validacion?.nombres?.length ? `Pantallas válidas para data-pantalla: ${validacion.nombres.join(", ")}.` : "",
    ]
      .filter((l) => l !== null)
      .join("\n");

    setCorrigiendo(true);
    try {
      await onCorregir(indice, instruccion);
    } finally {
      setCorrigiendo(false);
    }
  }

  return (
    <div className="mt-3 border border-gray-300 p-4" style={{ borderLeft: `4px solid ${problemas.length ? PALETA.carmesi : PALETA.oliva}` }}>
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Revisión de la pantalla
          <span className="ml-2 normal-case tracking-normal font-normal text-gray-500">
            {problemas.length ? `${problemas.length} ${problemas.length === 1 ? "observación" : "observaciones"}` : "sin observaciones"}
          </span>
        </span>
        <span className="text-xs text-gray-500">{abierta ? "Ocultar" : "Ver"}</span>
      </button>

      {abierta && problemas.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-gray-200 border border-gray-200">
            {problemas.map((p) => (
              <li key={p.id}>
                <label className="flex items-start gap-3 px-3 py-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!omitidos.includes(p.id)}
                    disabled={bloqueo}
                    onChange={() => alternar(p.id)}
                  />
                  <span>{p.texto}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={corregir}
              disabled={bloqueo || !marcados.length}
              style={{ backgroundColor: PALETA.navy }}
              className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
            >
              {corrigiendo ? "Corrigiendo..." : `Corregir con IA (${marcados.length})`}
            </button>
            <button
              type="button"
              onClick={() => setOmitidos(marcados.length ? problemas.map((p) => p.id) : [])}
              disabled={bloqueo}
              className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50"
            >
              {marcados.length ? "Desmarcar todas" : "Marcar todas"}
            </button>
            {bloqueado && <span className="text-xs text-gray-500">Prototipo aprobado: edítalo para corregir.</span>}
          </div>
        </>
      )}
    </div>
  );
}
