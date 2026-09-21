"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", label: "Proyectos", exacto: true },
  { href: "/crear", label: "+ Crear proyecto", exacto: true },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ENLACES.map((enlace) => {
        const activo = enlace.exacto
          ? pathname === enlace.href
          : pathname.startsWith(enlace.href);

        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            className="px-3 py-2 text-sm font-medium border-l-2 transition-colors"
            style={
              activo
                ? {
                    borderColor: "#ffffff",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    color: "#ffffff",
                  }
                : {
                    borderColor: "transparent",
                    color: "#94a3b8",
                  }
            }
          >
            {enlace.label}
          </Link>
        );
      })}
    </nav>
  );
}
