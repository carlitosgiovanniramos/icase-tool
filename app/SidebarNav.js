"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Icono({ d, className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`${className} shrink-0`} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ENLACES = [
  {
    href: "/",
    label: "Proyectos",
    exacto: true,
    icono:
      "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
  },
  { href: "/crear", label: "Crear proyecto", exacto: true, icono: "M12 4.5v15m7.5-7.5h-15" },
];
const ICONO_DOCUMENTACION =
  "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25";

// plegada: solo los iconos, con el nombre en el título. La sección actual va resaltada en un recuadro.
export default function SidebarNav({ plegada = false }) {
  const pathname = usePathname();
  const clase = (activo) =>
    `flex items-center gap-3 py-2.5 border text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
      plegada ? "justify-center px-0" : "px-3"
    } ${activo ? "border-white/25 bg-white/10 text-white" : "border-transparent text-white/60 hover:text-white hover:bg-white/5"}`;

  return (
    <nav className="flex flex-col gap-1.5">
      {ENLACES.map((enlace) => {
        const activo = enlace.exacto
          ? pathname === enlace.href
          : pathname.startsWith(enlace.href);

        return (
          <Link key={enlace.href} href={enlace.href} title={plegada ? enlace.label : undefined} className={clase(activo)}>
            <Icono d={enlace.icono} />
            {!plegada && enlace.label}
          </Link>
        );
      })}
      {/* La documentación es un sitio aparte (Docusaurus) servido en /docs: se abre en otra pestaña. */}
      <a href="/docs" target="_blank" rel="noreferrer" title={plegada ? "Documentación" : undefined} className={clase(false)}>
        <Icono d={ICONO_DOCUMENTACION} />
        {!plegada && "Documentación"}
      </a>
    </nav>
  );
}
