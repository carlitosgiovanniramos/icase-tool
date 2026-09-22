import SidebarNav from "../SidebarNav";
import AlertProvider from "../AlertProvider";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { DEGRADADO_AUTH } from "../estilos";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AlertProvider>
      <div className="flex min-h-screen">
        <aside
          className={`w-64 shrink-0 ${DEGRADADO_AUTH} text-white p-6 flex flex-col`}
        >
          <div className="flex items-center gap-2 mb-8">
            <span className="w-2 h-2 bg-white shrink-0" />
            <h2 className="text-sm font-bold tracking-widest uppercase">
              I-CASE Tool
            </h2>
          </div>

          <SidebarNav />

          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-4 h-4 text-white/80"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </span>
              <p className="text-xs text-white/80 truncate">{user?.email}</p>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/15 hover:border-white/30 text-white px-3 py-2 text-xs font-semibold transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25"
                  />
                </svg>
                Cerrar sesión
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-white text-gray-900 p-8">
          {children}
        </main>
      </div>
    </AlertProvider>
  );
}
