"use client";

import { useState } from "react";
import { PALETA } from "../../../estilos";
import { useAlert } from "../../../AlertProvider";
import { CAPACIDADES } from "@/lib/capacidades";

// Ficha del paso "Stack técnico": piezas, contenedores, cómo se implementa cada elemento del
// diseño (arquitectura y diagrama de sistemas), librerías y servicios externos.
// Con editable, las librerías se agregan, editan y eliminan, los servicios externos se editan y
// eliminan, y los avisos se descartan. Las piezas y los contenedores no: salen del diseño.
// onGuardar(stack) guarda la ficha completa (la página la revisa y devuelve true si se guardó).

const RESOLUCION = {
  pieza: null, // se muestra el nombre de la pieza
  externo: "Servicio externo",
  dentro_de_app: "Dentro de la app",
  infraestructura: "Infraestructura",
  no_soportado: "Sin pieza en el catálogo",
  sin_resolver: "Sin resolver",
};

const CLASE_INPUT =
  "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900 bg-white";

const comoLista = (texto) =>
  String(texto || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// Sección plegable, como las piezas de la estructura de carpetas. abierta: se abre sola (ej. al
// editar una fila de la sección).
function Seccion({ titulo, detalle, abierta, children }) {
  return (
    <details className="mt-3 border border-gray-300" open={abierta || undefined}>
      <summary className="cursor-pointer px-4 py-2.5 bg-gray-50 text-sm">
        <span className="font-semibold text-gray-900">{titulo}</span>
        {detalle && <span className="text-gray-500"> · {detalle}</span>}
      </summary>
      <div className="p-4">{children}</div>
    </details>
  );
}

function Tabla({ columnas, filas }) {
  return (
    <div className="border border-gray-300 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            {columnas.map((c, i) => (
              <th key={i} className="px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">
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

function BotonTexto({ onClick, color = PALETA.navy, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-semibold whitespace-nowrap hover:underline disabled:opacity-50"
      style={{ color }}
    >
      {children}
    </button>
  );
}

// campos: [{ clave, etiqueta, tipo: "texto" | "lista" | "area" | "select", opciones, requerido }].
// "lista" se escribe separada por comas y se guarda como arreglo.
function FormularioFila({ titulo, campos, inicial, onGuardar, onCancelar, guardando }) {
  const [datos, setDatos] = useState(() =>
    Object.fromEntries(
      campos.map((c) => [
        c.clave,
        c.tipo === "lista" ? (inicial?.[c.clave] || []).join(", ") : inicial?.[c.clave] ?? c.defecto ?? c.opciones?.[0]?.valor ?? "",
      ])
    )
  );
  const valido = campos.every((c) => !c.requerido || String(datos[c.clave]).trim());

  function guardar(e) {
    e.preventDefault();
    if (!valido) return;
    onGuardar(
      Object.fromEntries(campos.map((c) => [c.clave, c.tipo === "lista" ? comoLista(datos[c.clave]) : String(datos[c.clave]).trim()]))
    );
  }

  return (
    <form onSubmit={guardar} className="bg-gray-50 border-2 p-4 space-y-3 mt-2" style={{ borderColor: PALETA.navy }}>
      <p className="text-sm font-bold text-gray-900">{titulo}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {campos.map((c) => (
          <label key={c.clave} className={`block ${c.tipo === "area" ? "sm:col-span-2" : ""}`}>
            <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{c.etiqueta}</span>
            {c.tipo === "select" ? (
              <select value={datos[c.clave]} onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })} className={CLASE_INPUT}>
                {c.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            ) : c.tipo === "area" ? (
              <textarea
                value={datos[c.clave]}
                onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })}
                className={`${CLASE_INPUT} h-16 resize-y`}
              />
            ) : (
              <input
                value={datos[c.clave]}
                placeholder={c.ejemplo}
                onChange={(e) => setDatos({ ...datos, [c.clave]: e.target.value })}
                className={CLASE_INPUT}
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!valido || guardando}
          style={{ backgroundColor: PALETA.navy }}
          className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
        >
          {guardando ? "Revisando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function FichaStack({ stack, editable = false, guardando = false, onGuardar }) {
  const { confirmar } = useAlert();
  const [editando, setEditando] = useState(null); // { tipo: "libreria" | "externo", indice: número | "nueva" }

  const titulo = (pieza) => stack.titulos?.[pieza] || pieza;
  const resolucion = (r, pieza) => {
    if (r === "pieza") return titulo(pieza);
    const texto = RESOLUCION[r] ?? r;
    const alerta = r === "no_soportado" || r === "sin_resolver";
    return alerta ? <span style={{ color: PALETA.carmesi }} className="font-semibold">{texto}</span> : texto;
  };
  const queCapacidad = (clave) => CAPACIDADES.find((c) => c.clave === clave)?.que || "";

  const librerias = stack.librerias || [];
  const externos = stack.externos || [];
  const avisos = stack.avisos || [];
  // Fichas anteriores a guardar la revisión: se muestran al menos los componentes sin resolver.
  const revision =
    stack.revision ??
    (stack.componentes || [])
      .filter((c) => ["sin_resolver", "no_soportado"].includes(c.resolucion))
      .map((c) => `${c.nombre}${c.tecnologia ? ` (${c.tecnologia})` : ""}: sin pieza en el catálogo.`);

  async function guardar(cambios) {
    if (await onGuardar({ ...stack, ...cambios })) setEditando(null);
  }

  async function eliminar(lista, indice, nombre, campo, accion = "Eliminar") {
    const pregunta = `¿${accion} ${nombre}?`;
    if (!(await confirmar("La ficha se revisará de nuevo y el paso perderá su aprobación.", pregunta, accion))) return;
    await guardar({ [campo]: lista.filter((_, i) => i !== indice) });
  }

  const camposLibreria = [
    { clave: "nombre", etiqueta: "Paquete", tipo: "texto", requerido: true, ejemplo: "ej. geolocator" },
    {
      clave: "pieza",
      etiqueta: "Pieza",
      tipo: "select",
      opciones: (stack.piezas || []).map((p) => ({ valor: p.pieza, texto: titulo(p.pieza) })),
    },
    {
      clave: "capacidad",
      etiqueta: "Capacidad",
      tipo: "select",
      defecto: "otra",
      opciones: [...CAPACIDADES.map((c) => ({ valor: c.clave, texto: c.que })), { valor: "otra", texto: "Otra" }],
    },
    { clave: "requerimientos", etiqueta: "Requerimientos", tipo: "lista", ejemplo: "ej. RF06, RF24" },
    { clave: "motivo", etiqueta: "Para qué", tipo: "area", requerido: true },
  ];
  const camposExterno = [
    { clave: "servicio", etiqueta: "Servicio", tipo: "texto", requerido: true },
    { clave: "variable", etiqueta: "Variable de la clave", tipo: "texto", requerido: true, ejemplo: "ej. GOOGLE_MAPS_API_KEY" },
    { clave: "usadoPor", etiqueta: "Lo usa", tipo: "lista", ejemplo: "ej. web, movil, functions" },
    { clave: "requerimientos", etiqueta: "Requerimientos", tipo: "lista" },
    { clave: "nota", etiqueta: "Nota", tipo: "area" },
  ];

  const formulario = (tipo) => {
    if (editando?.tipo !== tipo) return null;
    const esLibreria = tipo === "libreria";
    const lista = esLibreria ? librerias : externos;
    const nueva = editando.indice === "nueva";
    return (
      <FormularioFila
        key={`${tipo}-${editando.indice}`}
        titulo={nueva ? "Agregar librería" : `Editar ${esLibreria ? lista[editando.indice].nombre : lista[editando.indice].servicio}`}
        campos={esLibreria ? camposLibreria : camposExterno}
        inicial={nueva ? null : lista[editando.indice]}
        guardando={guardando}
        onCancelar={() => setEditando(null)}
        onGuardar={(datos) => {
          const fila = esLibreria ? datos : { ...datos, variable: datos.variable.toUpperCase() };
          const nuevaLista = nueva ? [...lista, fila] : lista.map((x, i) => (i === editando.indice ? { ...x, ...fila } : x));
          guardar({ [esLibreria ? "librerias" : "externos"]: nuevaLista });
        }}
      />
    );
  };

  return (
    <div className="mt-4">
      {revision.length > 0 && (
        <div className="border p-3 mb-4" style={{ borderColor: PALETA.carmesi, borderLeftWidth: 4 }}>
          <p className="text-sm font-semibold mb-1" style={{ color: PALETA.carmesi }}>
            Revisar antes de aprobar
          </p>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">
            {revision.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="border p-3 mb-4" style={{ borderColor: PALETA.naranjaOscuro, borderLeftWidth: 4 }}>
          <p className="text-sm font-semibold mb-1" style={{ color: PALETA.naranjaOscuro }}>
            Avisos
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            {avisos.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>{a}</span>
                {editable && (
                  <BotonTexto onClick={() => eliminar(avisos, i, "este aviso", "avisos", "Descartar")} color={PALETA.carmesi} disabled={guardando}>
                    Descartar
                  </BotonTexto>
                )}
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

      {stack.explicacion && <p className="mt-3 mb-4 text-sm text-gray-600 leading-relaxed">{stack.explicacion}</p>}

      <Seccion titulo="Contenedores" detalle={(stack.contenedores || []).length}>
        <Tabla
          columnas={["Servicio", "Qué es"]}
          filas={(stack.contenedores || []).map((c) => [
            <span key="n" className="font-mono">{c.nombre}</span>,
            `${c.descripcion}${c.tarea ? " · se apaga al terminar" : ""}`,
          ])}
        />
      </Seccion>

      {(stack.componentes || []).length > 0 && (
        <Seccion titulo="Diagrama de sistemas: cómo se implementa cada componente" detalle={stack.componentes.length}>
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

      <Seccion titulo="Arquitectura: cómo se implementa cada elemento" detalle={(stack.elementos || []).length}>
        <Tabla
          columnas={["Elemento", "Se implementa con", "Detalle"]}
          filas={(stack.elementos || []).map((e) => [e.elemento, resolucion(e.resolucion, e.pieza), e.detalle])}
        />
      </Seccion>

      <Seccion titulo="Librerías" detalle={librerias.length} abierta={editando?.tipo === "libreria"}>
        {librerias.length > 0 && (
          <Tabla
            columnas={["Paquete", "En", "Capacidad", "Para qué", "Requerimientos", ...(editable ? [""] : [])]}
            filas={librerias.map((l, i) => [
              <span key="p" className="font-mono">{l.nombre}</span>,
              titulo(l.pieza),
              <span key="c" className="text-gray-500">{l.capacidad && l.capacidad !== "otra" ? queCapacidad(l.capacidad) : "—"}</span>,
              l.motivo,
              l.requerimientos.join(", "),
              ...(editable
                ? [
                    <span key="a" className="flex gap-3">
                      <BotonTexto onClick={() => setEditando({ tipo: "libreria", indice: i })} disabled={guardando}>
                        Editar
                      </BotonTexto>
                      {l.base ? (
                        <span className="text-xs text-gray-400" title="La exige la pieza">
                          Base
                        </span>
                      ) : (
                        <BotonTexto onClick={() => eliminar(librerias, i, l.nombre, "librerias")} color={PALETA.carmesi} disabled={guardando}>
                          Eliminar
                        </BotonTexto>
                      )}
                    </span>,
                  ]
                : []),
            ])}
          />
        )}
        {editable && editando?.tipo !== "libreria" && (
          <div className="mt-2">
            <BotonTexto onClick={() => setEditando({ tipo: "libreria", indice: "nueva" })} disabled={guardando}>
              + Agregar librería
            </BotonTexto>
          </div>
        )}
        {formulario("libreria")}
      </Seccion>

      {externos.length > 0 && (
        <Seccion titulo="Servicios externos (necesitan clave propia)" detalle={externos.length} abierta={editando?.tipo === "externo"}>
          <Tabla
            columnas={["Servicio", "Variable", "Lo usa", "Nota", ...(editable ? [""] : [])]}
            filas={externos.map((x, i) => [
              x.servicio,
              <span key="v" className="font-mono">{x.variable}</span>,
              x.usadoPor.join(", "),
              x.nota,
              ...(editable
                ? [
                    <span key="a" className="flex gap-3">
                      <BotonTexto onClick={() => setEditando({ tipo: "externo", indice: i })} disabled={guardando}>
                        Editar
                      </BotonTexto>
                      <BotonTexto onClick={() => eliminar(externos, i, x.servicio, "externos")} color={PALETA.carmesi} disabled={guardando}>
                        Eliminar
                      </BotonTexto>
                    </span>,
                  ]
                : []),
            ])}
          />
          {formulario("externo")}
        </Seccion>
      )}
    </div>
  );
}
