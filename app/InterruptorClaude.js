"use client";

import {
  activarClaude,
  reiniciarGastoClaude,
  useClaudeActivo,
  useGastoClaude,
} from "@/lib/preferenciaClaude";

// Interruptor de la barra lateral: con Claude activado, las generaciones usan la API de pago
// de Claude (pruebas reales); apagado, Gemini y Groq.
export default function InterruptorClaude() {
  const activo = useClaudeActivo();
  const gasto = useGastoClaude();

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
        <span
          className={`relative w-9 h-5 shrink-0 transition-colors ${
            activo ? "bg-[#c2410c]" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${
              activo ? "left-[18px]" : "left-0.5"
            }`}
          />
        </span>
      </button>
      <p className="text-[11px] text-white/60 mt-1.5">
        {activo ? "Pruebas reales (de pago)" : "Gemini / Groq (gratis)"}
      </p>
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
