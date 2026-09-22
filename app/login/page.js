"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";
import { PALETA, DEGRADADO_AUTH } from "../estilos";

const claseInput =
  "w-full border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-gray-900";

function AvisoRegistro() {
  const recienRegistrado = useSearchParams().get("registrado") === "1";
  if (!recienRegistrado) return null;

  return (
    <p
      className="text-sm mb-4 px-3 py-2 border"
      style={{ borderColor: PALETA.oliva, color: PALETA.oliva }}
    >
      Cuenta creada. Revisá tu email si hace falta confirmarla, y después
      iniciá sesión.
    </p>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div
      className={`min-h-screen ${DEGRADADO_AUTH} flex items-center justify-center px-4 py-12`}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-2 h-2 bg-white shrink-0" />
          <span className="text-xs font-bold tracking-widest uppercase text-white/60">
            I-CASE Tool
          </span>
        </div>

        <div
          className="bg-white/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-8"
          style={{ borderTop: `4px solid ${PALETA.navy}` }}
        >
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase px-2 py-1 mb-4 text-white"
            style={{ backgroundColor: PALETA.negro }}
          >
            Acceso
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Entrá con tu cuenta de I-CASE Tool.
          </p>

          <Suspense fallback={null}>
            <AvisoRegistro />
          </Suspense>

          <form action={action} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className={claseInput}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                required
                className={claseInput}
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="text-sm" style={{ color: PALETA.carmesi }}>
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{ backgroundColor: PALETA.navy }}
              className="text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 hover:brightness-125 transition-all mt-2"
            >
              {pending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100 text-center">
            ¿No tenés cuenta?{" "}
            <Link
              href="/registro"
              className="font-semibold"
              style={{ color: PALETA.navy }}
            >
              Creá una
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
