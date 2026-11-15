"use client";

// Ficha del paso "Documentación": cuántas páginas tiene cada sección del sitio del proyecto (manual de
// usuario, desarrolladores y API) y sus archivos. El sitio corre en su propio contenedor al levantar el
// proyecto; el enlace aparece en el panel de ejecución ("Documentación").
export default function FichaDocumentacion({ ficha }) {
  if (!ficha) return null;
  const archivos = ficha.archivos || [];
  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <span className="border border-gray-300 px-3 py-1.5">Manual de usuario: <span className="font-semibold">{ficha.manual}</span> páginas</span>
        <span className="border border-gray-300 px-3 py-1.5">Desarrolladores: <span className="font-semibold">{ficha.desarrolladores}</span> páginas</span>
        <span className="border border-gray-300 px-3 py-1.5">API: <span className="font-semibold">{ficha.api}</span> páginas</span>
        <span className="border border-gray-300 px-3 py-1.5">Diagramas: <span className="font-semibold">{ficha.diagramas}</span></span>
      </div>
      <p className="text-gray-600">
        Se arma con todo lo aprobado del proyecto, sin IA. Al levantar el proyecto se publica en su propio
        contenedor y la aplicación muestra el enlace &quot;Documentación&quot;.
      </p>
      {archivos.length > 0 && (
        <details>
          <summary className="cursor-pointer text-gray-600">Archivos · {archivos.length}</summary>
          <ul className="mt-2 divide-y divide-gray-200">
            {archivos.map((a) => (
              <li key={a.ruta} className="py-1">
                <span className="font-mono text-xs">{a.ruta}</span>
                <span className="text-gray-500"> · {a.lineas} líneas{a.editado ? " · editado" : ""}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
