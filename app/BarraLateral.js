"use client";

import { useSyncExternalStore } from "react";
import SidebarNav, { Icono } from "./SidebarNav";
import InterruptorClaude from "./InterruptorClaude";
import { logout } from "./(app)/actions";
import { DEGRADADO_AUTH } from "./estilos";

const CLAVE_PLEGADA = "icase:barra-plegada";
const ICONO_PLEGAR = "M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5";
const ICONO_DESPLEGAR = "M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5";
const ICONO_USUARIO =
  "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z";
const ICONO_SALIR =
  "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25";

// La preferencia se recuerda en este navegador; sin almacenamiento (modo privado), dura solo esta visita.
const oyentes = new Set();
let plegadaEnMemoria = false;
function leerPlegada() {
  try {
    return localStorage.getItem(CLAVE_PLEGADA) === "1";
  } catch {
    return plegadaEnMemoria;
  }
}
function guardarPlegada(valor) {
  plegadaEnMemoria = valor;
  try {
    localStorage.setItem(CLAVE_PLEGADA, valor ? "1" : "0");
  } catch {
    // almacenamiento no disponible
  }
  oyentes.forEach((avisar) => avisar());
}
function suscribir(avisar) {
  oyentes.add(avisar);
  return () => oyentes.delete(avisar);
}

// Barra lateral fija a la altura de la pantalla: el interruptor de Claude y la cuenta quedan siempre a la
// vista, sin bajar. Se pliega a solo iconos.
export default function BarraLateral({ email }) {
  const plegada = useSyncExternalStore(suscribir, leerPlegada, () => false);
  const alternar = () => guardarPlegada(!plegada);

  return (
    <aside
      className={`${plegada ? "w-16 px-2" : "w-64 px-6"} sticky top-0 h-screen self-start shrink-0 ${DEGRADADO_AUTH} text-white py-6 flex flex-col print:hidden transition-[width] duration-200`}
    >
      <div className={`flex items-center mb-8 ${plegada ? "flex-col gap-4" : "justify-between gap-2"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 bg-white shrink-0" />
          {!plegada && <h2 className="text-sm font-bold tracking-widest uppercase truncate">I-CASE Tool</h2>}
        </div>
        <button
          type="button"
          onClick={alternar}
          title={plegada ? "Mostrar menú" : "Ocultar menú"}
          aria-label={plegada ? "Mostrar menú" : "Ocultar menú"}
          className="p-1.5 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 shrink-0"
        >
          <Icono d={plegada ? ICONO_DESPLEGAR : ICONO_PLEGAR} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <SidebarNav plegada={plegada} />
      </div>

      <div className="mt-4">
        <InterruptorClaude compacto={plegada} />
      </div>

      <div className="pt-4 border-t border-white/10">
        <div className={`flex items-center gap-2 mb-3 ${plegada ? "justify-center" : ""}`} title={email}>
          <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Icono d={ICONO_USUARIO} className="w-4 h-4 text-white/80" />
          </span>
          {!plegada && <p className="text-xs text-white/80 truncate">{email}</p>}
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="w-full flex items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/15 hover:border-white/30 text-white px-3 py-2 text-xs font-semibold transition-colors"
          >
            <Icono d={ICONO_SALIR} />
            {!plegada && "Cerrar sesión"}
          </button>
        </form>
      </div>
    </aside>
  );
}
