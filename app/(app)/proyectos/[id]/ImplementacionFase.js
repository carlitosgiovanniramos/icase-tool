"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PALETA } from "../../../estilos";
import { useAlert } from "../../../AlertProvider";
import { PASO, PASOS_IMPLEMENTACION } from "./pasos";

// Fase 03: pasos de Implementación, explorador de los archivos del proyecto y panel para
// levantarlo en contenedores con el runner.

async function llamar(proyectoId, accion, extra = {}) {
  const resp = await fetch("/api/implementacion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proyectoId, accion, ...extra }),
  });
  const datos = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(datos.error || `Error ${resp.status}`);
    err.salida = datos.salida;
    throw err;
  }
  return datos;
}

function Subtitulo({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-2 h-2 shrink-0" style={{ backgroundColor: PALETA.marron }} />
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

// --- Explorador de archivos -----------------------------------------------------------------

function armarArbol(archivos) {
  const raiz = { carpetas: {}, archivos: [] };
  for (const archivo of archivos) {
    const partes = archivo.ruta.split("/");
    let nodo = raiz;
    for (const carpeta of partes.slice(0, -1)) {
      nodo.carpetas[carpeta] ??= { carpetas: {}, archivos: [] };
      nodo = nodo.carpetas[carpeta];
    }
    nodo.archivos.push({ ...archivo, nombre: partes.at(-1) });
  }
  return raiz;
}

function NodoCarpeta({ nodo, ruta, nivel, abiertas, alternar, seleccionado, onSeleccionar }) {
  const sangria = { paddingLeft: `${8 + nivel * 14}px` };
  return (
    <>
      {Object.keys(nodo.carpetas)
        .sort()
        .map((nombre) => {
          const rutaCarpeta = ruta ? `${ruta}/${nombre}` : nombre;
          const abierta = abiertas.has(rutaCarpeta);
          return (
            <div key={rutaCarpeta}>
              <button
                onClick={() => alternar(rutaCarpeta)}
                className="w-full text-left py-1 pr-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                style={sangria}
              >
                <span className="inline-block w-3 text-gray-400">{abierta ? "▾" : "▸"}</span>
                {nombre}
              </button>
              {abierta && (
                <NodoCarpeta
                  nodo={nodo.carpetas[nombre]}
                  ruta={rutaCarpeta}
                  nivel={nivel + 1}
                  abiertas={abiertas}
                  alternar={alternar}
                  seleccionado={seleccionado}
                  onSeleccionar={onSeleccionar}
                />
              )}
            </div>
          );
        })}
      {nodo.archivos
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((archivo) => {
          const activo = archivo.ruta === seleccionado;
          return (
            <button
              key={archivo.ruta}
              onClick={() => onSeleccionar(archivo.ruta)}
              className="w-full text-left py-1 pr-2 text-sm truncate hover:bg-gray-100"
              style={{
                ...sangria,
                paddingLeft: `${20 + nivel * 14}px`,
                backgroundColor: activo ? "#e5e7eb" : undefined,
                color: archivo.origen === "generado" ? "#111827" : archivo.origen === "planificado" ? "#9ca3af" : "#6b7280",
                fontStyle: archivo.origen === "planificado" ? "italic" : undefined,
              }}
            >
              {archivo.nombre}
            </button>
          );
        })}
    </>
  );
}

function ExploradorArchivos({ archivos }) {
  const arbol = useMemo(() => armarArbol(archivos), [archivos]);
  const [abiertas, setAbiertas] = useState(() => new Set(Object.keys(arbol.carpetas)));
  const [seleccionado, setSeleccionado] = useState(null);
  const archivo = archivos.find((a) => a.ruta === seleccionado);

  const alternar = useCallback((ruta) => {
    setAbiertas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(ruta)) nuevo.delete(ruta);
      else nuevo.add(ruta);
      return nuevo;
    });
  }, []);

  return (
    <div className="border border-gray-300 flex flex-col md:flex-row min-h-[420px]">
      <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-gray-300 py-2 max-h-[560px] overflow-y-auto bg-gray-50">
        <NodoCarpeta
          nodo={arbol}
          ruta=""
          nivel={0}
          abiertas={abiertas}
          alternar={alternar}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        {archivo ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-300">
              <span className="text-sm font-mono text-gray-800 truncate">{archivo.ruta}</span>
              {archivo.origen === "plantilla" && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 bg-gray-200">
                  Plantilla
                </span>
              )}
              {archivo.origen === "planificado" && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 bg-gray-200">
                  Pendiente
                </span>
              )}
            </div>
            {archivo.origen === "planificado" ? (
              // Todavía sin código: lo que dice la estructura de carpetas sobre el archivo.
              <div className="p-4 text-sm text-gray-700 space-y-2">
                <p>{archivo.proposito}</p>
                <p className="text-xs text-gray-500">Tipo: {archivo.tipo}</p>
                {archivo.requerimientos?.length > 0 && (
                  <p className="text-xs text-gray-500">Requerimientos: {archivo.requerimientos.join(", ")}</p>
                )}
                {archivo.pantallas?.length > 0 && <p className="text-xs text-gray-500">Pantallas: {archivo.pantallas.join(" · ")}</p>}
                {archivo.tablas?.length > 0 && <p className="text-xs text-gray-500">Tablas: {archivo.tablas.join(", ")}</p>}
                {archivo.modulo && <p className="text-xs text-gray-500">Módulo: {archivo.modulo}</p>}
              </div>
            ) : (
            <pre className="flex-1 overflow-auto max-h-[520px] text-xs leading-5 font-mono p-0 m-0">
              <code className="grid" style={{ gridTemplateColumns: "auto 1fr" }}>
                {archivo.contenido.split("\n").map((linea, i) => (
                  <span key={i} className="contents">
                    <span className="select-none text-right text-gray-400 pl-3 pr-3 bg-gray-50">{i + 1}</span>
                    <span className="pr-4 whitespace-pre">{linea || " "}</span>
                  </span>
                ))}
              </code>
            </pre>
            )}
          </>
        ) : (
          <p className="m-auto text-sm text-gray-500">Selecciona un archivo.</p>
        )}
      </div>
    </div>
  );
}

// --- Panel de ejecución ---------------------------------------------------------------------

// tarea: servicio de un solo uso (por ejemplo, migraciones), que termina solo.
function describirServicio(s, tarea) {
  if (!s) return { texto: "Sin crear", color: "#9ca3af" };
  if (s.salud === "unhealthy" || (s.estado === "exited" && s.codigoSalida)) return { texto: "Con errores", color: PALETA.carmesi };
  if (tarea && s.estado === "exited") return { texto: "Completada", color: PALETA.oliva };
  if (s.estado === "running" && s.salud === "starting") return { texto: "Iniciando", color: PALETA.naranjaOscuro };
  if (s.estado === "running") return { texto: "Encendido", color: PALETA.oliva };
  if (s.estado === "restarting") return { texto: "Reiniciando", color: PALETA.naranjaOscuro };
  return { texto: "Detenido", color: "#6b7280" };
}

const ultimasLineas = (texto, n = 40) => String(texto || "").trimEnd().split("\n").slice(-n).join("\n");

// servicios: [{ nombre, descripcion, tarea }] del docker-compose.yml del proyecto.
function PanelEjecucion({ proyectoId, hayArchivos, servicios: delProyecto }) {
  const { confirmar, mostrarError } = useAlert();
  const [estado, setEstado] = useState(null);
  const [errorEstado, setErrorEstado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [servicioLogs, setServicioLogs] = useState("");
  const [logs, setLogs] = useState(null);

  const consultar = useCallback(async () => {
    try {
      setEstado(await llamar(proyectoId, "estado"));
      setErrorEstado("");
    } catch (err) {
      setErrorEstado(err.message);
    }
  }, [proyectoId]);

  const operando = !!estado?.operacion;

  // Mientras Docker trabaja se consulta seguido; si no, de vez en cuando.
  useEffect(() => {
    let activo = true;
    const revisar = () =>
      llamar(proyectoId, "estado")
        .then((datos) => {
          if (!activo) return;
          setEstado(datos);
          setErrorEstado("");
        })
        .catch((err) => activo && setErrorEstado(err.message));
    revisar();
    const intervalo = setInterval(revisar, operando ? 2500 : 10000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [proyectoId, operando]);

  const servicios = Object.fromEntries((estado?.servicios || []).map((s) => [s.servicio, s]));
  const encendido = (estado?.servicios || []).some((s) => s.estado === "running");

  async function levantar() {
    setEnviando(true);
    try {
      await llamar(proyectoId, "levantar");
      await consultar();
    } catch (err) {
      mostrarError(err.message, "No se pudo levantar el proyecto");
    } finally {
      setEnviando(false);
    }
  }

  async function detener() {
    const ok = await confirmar("Los datos de la base se conservan.", "¿Detener los contenedores?", "Detener");
    if (!ok) return;
    setEnviando(true);
    try {
      await llamar(proyectoId, "detener");
      await consultar();
    } catch (err) {
      mostrarError(err.message, "No se pudo detener el proyecto");
    } finally {
      setEnviando(false);
    }
  }

  async function verLogs() {
    try {
      const datos = await llamar(proyectoId, "logs", { servicio: servicioLogs || undefined });
      setLogs(datos.logs || "Sin registros.");
    } catch (err) {
      mostrarError(err.message, "No se pudieron leer los logs");
    }
  }

  const ocupado = enviando || operando;

  return (
    <div className="border border-gray-300 p-4">
      {errorEstado && <p className="text-sm mb-3" style={{ color: PALETA.carmesi }}>{errorEstado}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
        {delProyecto.map(({ nombre, descripcion, tarea }) => {
          const d = describirServicio(servicios[nombre], tarea);
          return (
            <div key={nombre} className="border border-gray-200 px-3 py-2 flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-800 font-mono">{nombre}</span>
                <span className="block text-xs text-gray-500 truncate">{descripcion}</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wide shrink-0" style={{ color: d.color }}>
                {d.texto}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={levantar}
          disabled={ocupado || !hayArchivos}
          style={{ backgroundColor: PALETA.navy }}
          className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
        >
          {estado?.operacion === "levantando" ? "Levantando..." : encendido ? "Actualizar y reiniciar" : "Levantar"}
        </button>
        {encendido && (
          <button
            onClick={detener}
            disabled={ocupado}
            className="border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {estado?.operacion === "deteniendo" ? "Deteniendo..." : "Detener"}
          </button>
        )}
        {!operando &&
          (estado?.enlaces || []).map((enlace) => (
            <a
              key={enlace.url}
              href={enlace.url}
              target="_blank"
              rel="noreferrer"
              style={{ borderColor: PALETA.oliva, color: PALETA.oliva }}
              className="border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              {enlace.nombre} · {enlace.url.replace("http://", "")}
            </a>
          ))}
        {!hayArchivos && <span className="text-xs text-gray-500">Sin archivos generados</span>}
      </div>

      {estado?.operacion === "levantando" && (
        <pre className="mt-4 bg-gray-900 text-gray-100 text-xs p-3 max-h-64 overflow-auto whitespace-pre-wrap">
          {ultimasLineas(estado.salida) || "Preparando..."}
        </pre>
      )}

      {estado?.error && !operando && (
        <div className="mt-4">
          <p className="text-sm font-semibold" style={{ color: PALETA.carmesi }}>{estado.error}</p>
          {estado.salida && (
            <pre className="mt-2 bg-gray-900 text-gray-100 text-xs p-3 max-h-64 overflow-auto whitespace-pre-wrap">
              {ultimasLineas(estado.salida)}
            </pre>
          )}
        </div>
      )}

      {estado?.sincronizado && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={servicioLogs}
              onChange={(e) => setServicioLogs(e.target.value)}
              className="border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Todos</option>
              {delProyecto.map((s) => (
                <option key={s.nombre} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
            <button
              onClick={verLogs}
              className="border border-gray-300 text-gray-700 px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
            >
              Ver logs
            </button>
            {logs !== null && (
              <button onClick={() => setLogs(null)} className="text-sm text-gray-500 hover:text-gray-800">
                Ocultar
              </button>
            )}
          </div>
          {logs !== null && (
            <pre className="mt-3 bg-gray-900 text-gray-100 text-xs p-3 max-h-80 overflow-auto whitespace-pre-wrap">
              {logs}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// --- Fase -----------------------------------------------------------------------------------

// children: los pasos de la fase que ya tienen generador (los arma la página del proyecto, con
// sus controles de aprobar, rechazar y cascada). recarga: cambia cuando cambian las piezas del
// stack, y con ellas los archivos fijos y los servicios del proyecto.
export default function ImplementacionFase({ proyectoId, onVolver, recarga, children }) {
  const [archivos, setArchivos] = useState(null);
  const [generados, setGenerados] = useState(0);
  const [servicios, setServicios] = useState([]);
  const [error, setError] = useState("");
  const pendientes = PASOS_IMPLEMENTACION.filter((p) => !PASO[p.clave]);

  useEffect(() => {
    llamar(proyectoId, "archivos")
      .then((datos) => {
        setArchivos(datos.archivos);
        setGenerados(datos.generados);
        setServicios(datos.servicios || []);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [proyectoId, recarga]);

  return (
    <section className="bg-white border border-gray-300">
      <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ backgroundColor: PALETA.marron }}>
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-bold tracking-widest uppercase text-white/60">Fase 03</span>
          <h2 className="text-2xl font-bold text-white">Implementación</h2>
        </div>
        <button onClick={onVolver} className="text-white/70 hover:text-white text-sm font-semibold">
          ← Volver
        </button>
      </div>

      <div className="p-6 space-y-8">
        <div>{children}</div>

        {pendientes.length > 0 && (
          <div>
            <Subtitulo>Próximos pasos</Subtitulo>
            <ol className="border border-gray-300 divide-y divide-gray-200">
              {pendientes.map((paso) => (
                <li key={paso.clave} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-gray-800">
                    <span className="text-gray-400 mr-2">{PASOS_IMPLEMENTACION.indexOf(paso) + 1}.</span>
                    {paso.nombre}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pendiente</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div>
          <Subtitulo>Archivos del proyecto</Subtitulo>
          {error ? (
            <p className="text-sm" style={{ color: PALETA.carmesi }}>{error}</p>
          ) : !archivos ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <>
              {!generados && (
                <p className="text-sm text-gray-500 mb-3">
                  Todavía no hay código generado. Se muestran los archivos fijos de las piezas y, en cursiva, los planificados.
                </p>
              )}
              <ExploradorArchivos key={recarga} archivos={archivos} />
            </>
          )}
        </div>

        <div>
          <Subtitulo>Ejecución</Subtitulo>
          <PanelEjecucion proyectoId={proyectoId} hayArchivos={generados > 0} servicios={servicios} />
        </div>
      </div>
    </section>
  );
}
