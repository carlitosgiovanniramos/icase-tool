"use client";

import { useEffect } from "react";

// Bloquea el scroll del fondo y cierra con Escape mientras un modal está abierto.
export function useBloqueoModal(activo, alCerrar) {
  useEffect(() => {
    if (!activo) return;

    function alTecla(e) {
      if (e.key === "Escape") alCerrar();
    }
    window.addEventListener("keydown", alTecla);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", alTecla);
      document.body.style.overflow = overflowPrevio;
    };
  }, [activo, alCerrar]);
}
