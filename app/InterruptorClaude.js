"use client";

import { useEffect, useState } from "react";
import {
  activarClaude,
  elegirModeloClaude,
  elegirModeloGratuito,
  reiniciarGastoClaude,
  useClaudeActivo,
  useGastoClaude,
  useModeloClaude,
  useModeloGratuito,
} from "@/lib/preferenciaClaude";

const precio = ([entrada, salida]) => `$${entrada} / $${salida}`;

const hora = (ms) => new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

// Interruptor de la barra lateral: con Claude activado, las generaciones usan solo la API de
// pago de Claude (pruebas reales), con el modelo de Claude elegido; apagado, los modelos
// gratuitos: automático (Gemini y luego Groq) o el que elija el usuario.
// compacto: solo el interruptor, para la barra lateral plegada.
export default function InterruptorClaude({ compacto = false }) {
  const activo = useClaudeActivo();
  const gasto = useGastoClaude();
  const modelo = useModeloGratuito();
  const modeloDeClaude = useModeloClaude();
  const [modelos, setModelos] = useState(null);
  const [claude, setClaude] = useState(null);

  // La lista trae los modelos en pausa por falta de cuota: se pide de nuevo al abrir el selector.
  function cargarModelos() {
    fetch("/api/modelos-ia")
      .then((r) => r.json())
      .then((d) => {
        setModelos(d.modelos || []);
        setClaude(d.claude || null);
      })
      .catch(() => {});
  }
  useEffect(cargarModelos, []);

  // Un modelo elegido que ya no está en la lista (se cambió la configuración) vuelve a automático.
  useEffect(() => {
    if (modelos && modelo && !modelos.some((m) => m.id === modelo)) elegirModeloGratuito("");
  }, [modelos, modelo]);

  // Sin elección (o con un modelo que ya no está), queda el predeterminado del servidor: así los
  // costos estimados usan siempre el precio del modelo que de verdad responde.
  useEffect(() => {
    if (claude && !claude.modelos.some((m) => m.id === modeloDeClaude)) elegirModeloClaude(claude.predeterminado);
  }, [claude, modeloDeClaude]);

  const grupos = ["Gemini", "Groq"].map((p) => [p, (modelos || []).filter((m) => m.proveedor === p)]);

  const deslizador = (
    <span className={`relative w-9 h-5 shrink-0 transition-colors ${activo ? "bg-[#c2410c]" : "bg-white/20"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
    </span>
  );

  if (compacto) {
    return (
      <div className="flex justify-center mb-4">
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label="Usar Claude"
          title={activo ? "Claude activado" : "Usar Claude"}
          onClick={() => activarClaude(!activo)}
        >
          {deslizador}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-white/15 bg-white/5 p-3 mb-4">
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => activarClaude(!activo)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-semibold text-white">Usar Claude</span>
        {deslizador}
      </button>
      {activo ? (
        <label className="block mt-2">
          <span className="block text-[11px] text-white/60 mb-1">Modelo de Claude · USD por millón (entrada / salida)</span>
          <select
            value={modeloDeClaude}
            onChange={(e) => elegirModeloClaude(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white text-[11px] px-1.5 py-1 focus:outline-none focus:border-white/50"
          >
            {(claude?.modelos || []).map((m) => (
              <option key={m.id} value={m.id} className="text-gray-900">
                {m.nombre} · {precio(m.precio)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block mt-2">
          <span className="block text-[11px] text-white/60 mb-1">Modelo gratuito</span>
          <select
            value={modelo}
            onChange={(e) => elegirModeloGratuito(e.target.value)}
            onFocus={cargarModelos}
            className="w-full bg-white/10 border border-white/20 text-white text-[11px] px-1.5 py-1 focus:outline-none focus:border-white/50"
          >
            <option value="" className="text-gray-900">Automático (Gemini, luego Groq)</option>
            {grupos.map(
              ([proveedor, lista]) =>
                lista.length > 0 && (
                  <optgroup key={proveedor} label={proveedor} className="text-gray-900">
                    {lista.map((m) => (
                      <option key={m.id} value={m.id} className="text-gray-900">
                        {m.nombre}
                        {m.pausaHasta ? ` · sin cuota hasta ${hora(m.pausaHasta)}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )
            )}
          </select>
        </label>
      )}
      {gasto > 0 && (
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-white/60">
          <span>Gastado: ~${gasto.toFixed(2)}</span>
          <button
            type="button"
            onClick={reiniciarGastoClaude}
            className="underline hover:text-white"
          >
            reiniciar
          </button>
        </div>
      )}
    </div>
  );
}
