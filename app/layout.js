import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "I-CASE Tool",
  description: "Herramienta de análisis y diseño con IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <aside className="w-64 shrink-0 bg-gray-950 text-white p-6 flex flex-col">
            <h2 className="text-lg font-bold mb-8">I-CASE Tool</h2>

            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                Proyectos
              </Link>
              <Link
                href="/crear"
                className="px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                + Crear proyecto
              </Link>
            </nav>
          </aside>

          <main className="flex-1 min-w-0 bg-white text-gray-900 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}