"use client";

import { PALETA } from "../../../estilos";

// Ficha del paso "Stack técnico": piezas, contenedores, cómo se implementa cada elemento del
// diseño (arquitectura y diagrama de sistemas), librerías y servicios externos.

const RESOLUCION = {
  pieza: null, // se muestra el nombre de la pieza
  externo: "Servicio externo",
  dentro_de_app: "Dentro de la app",
  infraestructura: "Infraestructura",
  no_soportado: "Sin pieza en el catálogo",
  sin_resolver: "Sin resolver",
};

function Seccion({ titulo, children }) {
  return (
    <div className="mt-6">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{titulo}</h4>
      {children}
    </div>
  );
}

function Tabla({ columnas, filas }) {
  return (
    <div className="border border-gray-300 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            {columnas.map((c) => (
              <th key={c} className="px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filas.map((fila, i) => (
            <tr key={i}>
              {fila.map((celda, j) => (
                <td key={j} className="px-3 py-2 align-top text-gray-800">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FichaStack({ stack }) {
  const titulo = (pieza) => stack.titulos?.[pieza] || pieza;
  const resolucion = (r, pieza) => {
    if (r === "pieza") return titulo(pieza);
    const texto = RESOLUCION[r] ?? r;
    const alerta = r === "no_soportado" || r === "sin_resolver";
    return alerta ? <span style={{ color: PALETA.carmesi }} className="font-semibold">{texto}</span> : texto;
  };
  const avisos = stack.avisos || [];
  const sinResolver = (stack.componentes || []).filter((c) => ["sin_resolver", "no_soportado"].includes(c.resolucion));

  return (
    <div className="mt-4">
      {(avisos.length > 0 || sinResolver.length > 0) && (
        <div className="border p-3 mb-4" style={{ borderColor: PALETA.carmesi, borderLeftWidth: 4 }}>
          <p className="text-sm font-semibold mb-1" style={{ color: PALETA.carmesi }}>
            Revisar antes de aprobar
          </p>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">
            {avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
            {sinResolver.map((c) => (
              <li key={c.nombre}>
                {c.nombre}
                {c.tecnologia ? ` (${c.tecnologia})` : ""}: sin pieza en el catálogo.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(stack.piezas || []).map((p) => (
          <span key={p.pieza} className="border border-gray-300 px-3 py-1.5 text-sm">
            <span className="font-semibold">{titulo(p.pieza)}</span>
            {p.opcionales?.length > 0 && <span className="text-gray-500"> · {p.opcionales.join(", ")}</span>}
          </span>
        ))}
        {stack.altaDisponibilidad && (
          <span className="border border-gray-300 px-3 py-1.5 text-sm font-semibold">Alta disponibilidad</span>
        )}
      </div>

      {stack.explicacion && <p className="mt-3 text-sm text-gray-600 leading-relaxed">{stack.explicacion}</p>}

      <Seccion titulo={`Contenedores (${(stack.contenedores || []).length})`}>
        <Tabla
          columnas={["Servicio", "Qué es"]}
          filas={(stack.contenedores || []).map((c) => [
            <span key="n" className="font-mono">{c.nombre}</span>,
            `${c.descripcion}${c.tarea ? " · se apaga al terminar" : ""}`,
          ])}
        />
      </Seccion>

      {(stack.componentes || []).length > 0 && (
        <Seccion titulo="Diagrama de sistemas: cómo se implementa cada componente">
          <Tabla
            columnas={["Componente", "Ubicación", "Tecnología", "RF", "Se implementa con"]}
            filas={stack.componentes.map((c) => [
              c.nombre,
              <span key="u" className="text-gray-500">{c.ubicacion}</span>,
              c.tecnologia,
              <span key="r" className="text-gray-500">{c.requerimientos.length}</span>,
              resolucion(c.resolucion, c.pieza),
            ])}
          />
        </Seccion>
      )}

      <Seccion titulo="Arquitectura: cómo se implementa cada elemento">
        <Tabla
          columnas={["Elemento", "Se implementa con", "Detalle"]}
          filas={(stack.elementos || []).map((e) => [e.elemento, resolucion(e.resolucion, e.pieza), e.detalle])}
        />
      </Seccion>

      {(stack.librerias || []).length > 0 && (
        <Seccion titulo="Librerías">
          <Tabla
            columnas={["Paquete", "En", "Para qué", "Requerimientos"]}
            filas={stack.librerias.map((l) => [
              <span key="p" className="font-mono">{l.nombre}</span>,
              titulo(l.pieza),
              l.motivo,
              l.requerimientos.join(", "),
            ])}
          />
        </Seccion>
      )}

      {(stack.externos || []).length > 0 && (
        <Seccion titulo="Servicios externos (necesitan clave propia)">
          <Tabla
            columnas={["Servicio", "Variable", "Lo usa", "Nota"]}
            filas={stack.externos.map((x) => [
              x.servicio,
              <span key="v" className="font-mono">{x.variable}</span>,
              x.usadoPor.join(", "),
              x.nota,
            ])}
          />
        </Seccion>
      )}
    </div>
  );
}
