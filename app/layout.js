import "./globals.css";
import SidebarNav from "./SidebarNav";
import AlertProvider from "./AlertProvider";

export const metadata = {
  title: "I-CASE Tool",
  description: "Herramienta de análisis y diseño con IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AlertProvider>
          <div className="flex min-h-screen">
            <aside className="w-64 shrink-0 bg-gray-950 text-white p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                <span className="w-2 h-2 bg-white shrink-0" />
                <h2 className="text-sm font-bold tracking-widest uppercase">
                  I-CASE Tool
                </h2>
              </div>

              <SidebarNav />
            </aside>

            <main className="flex-1 min-w-0 bg-white text-gray-900 p-8">
              {children}
            </main>
          </div>
        </AlertProvider>
      </body>
    </html>
  );
}