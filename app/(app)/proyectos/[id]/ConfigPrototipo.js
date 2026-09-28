"use client";

import { useState } from "react";
import { useAlert } from "../../../AlertProvider";
import { PALETA } from "../../../estilos";
import BadgeModelo from "./BadgeModelo";

const PLATAFORMAS = ["Web", "Móvil"];
const MAX_REFERENCIAS = 3;
const TIPOS_IMAGEN = "image/png,image/jpeg,image/webp,image/gif";
const TAMANO_MAXIMO = 15 * 1024 * 1024; // tamaño del archivo original; se reduce antes de subir
// Claude rechaza imágenes de más de ~5 MB y reduce internamente las grandes a ~1568 px:
// se suben ya reducidas para que no fallen y cuesten menos tokens.
const LADO_MAXIMO = 1568;

async function reducirImagen(archivo) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP conserva la transparencia de los logos y pesa poco.
  const blob = await new Promise((resolver) => canvas.toBlob(resolver, "image/webp", 0.88));
  if (!blob) return archivo; // el navegador no pudo codificar: se sube el original
  const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], nombre, { type: "image/webp" });
}

const CLASE_INPUT =
  "border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-900 bg-white";

function Titulo({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function Opcion({ activa, onClick, children, deshabilitado }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-pressed={activa}
      style={activa ? { backgroundColor: PALETA.navy, borderColor: PALETA.navy } : undefined}
      className={`border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        activa ? "text-white" : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Miniatura({ url, onQuitar, deshabilitado }) {
  return (
    <div className="relative w-20 h-20 border border-gray-300 bg-gray-50">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen subida por el usuario */}
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onQuitar}
        disabled={deshabilitado}
        aria-label="Quitar imagen"
        className="absolute top-0 right-0 w-5 h-5 text-xs text-white bg-black/60 hover:bg-[#7f1d1d]"
      >
        ✕
      </button>
    </div>
  );
}

// Configuración del prototipo (se guarda en proyectos.contexto.prototipo):
// estilo visual, imágenes de referencia y la lista de pantallas a generar. No hay campo de
// links: la IA no abre páginas, así que la referencia de estilo son capturas de pantalla.
export default function ConfigPrototipo({
  valor,
  onChange,
  plataformasPorDefecto,
  generadas,
  deshabilitado,
  onProponer,
  proponiendo,
  onSubirImagen,
}) {
  const { mostrarError } = useAlert();
  const [subiendo, setSubiendo] = useState(null); // "logo" | "referencias" | null
  const [nuevaPantalla, setNuevaPantalla] = useState("");

  const cambiar = (clave, nuevo) => onChange({ ...valor, [clave]: nuevo });
  const plataformas = valor.plataformas || plataformasPorDefecto;
  const pantallas = valor.pantallas || [];
  const referencias = valor.referencias || [];
  const todasSeleccionadas = pantallas.length > 0 && pantallas.every((p) => p.seleccionada !== false);
  const bloqueado = deshabilitado || !!subiendo;

  async function subir(archivos, tipo) {
    const validos = [...archivos].filter((f) => {
      if (f.size <= TAMANO_MAXIMO) return true;
      mostrarError(`"${f.name}" pesa más de 15 MB.`, "Imagen demasiado grande");
      return false;
    });
    if (!validos.length) return;

    setSubiendo(tipo);
    try {
      const subirReducida = async (archivo) => onSubirImagen(await reducirImagen(archivo));
      if (tipo === "logo") {
        cambiar("logoUrl", await subirReducida(validos[0]));
      } else {
        const espacio = MAX_REFERENCIAS - referencias.length;
        const urls = [];
        for (const archivo of validos.slice(0, espacio)) urls.push(await subirReducida(archivo));
        cambiar("referencias", [...referencias, ...urls]);
      }
    } catch (err) {
      mostrarError(err.message, "No se pudo subir la imagen");
    } finally {
      setSubiendo(null);
    }
  }

  function agregarPantalla() {
    const nombre = nuevaPantalla.trim();
    if (!nombre) return;
    cambiar("pantallas", [
      ...pantallas,
      {
        id: crypto.randomUUID(),
        nombre,
        descripcion: "",
        rfs: [],
        actores: [],
        plataforma: plataformas[0] || "Web",
        seleccionada: true,
        origen: "manual",
      },
    ]);
    setNuevaPantalla("");
  }

  const alternarPantalla = (id) =>
    cambiar(
      "pantallas",
      pantallas.map((p) => (p.id === id ? { ...p, seleccionada: p.seleccionada === false } : p))
    );

  return (
    <div className="border border-gray-300 p-4 mb-4 space-y-6">
      {/* --- Estilo visual --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Titulo>Tipo</Titulo>
          <div className="flex gap-2">
            <Opcion
              activa={(valor.modo || "mockup") === "mockup"}
              onClick={() => cambiar("modo", "mockup")}
              deshabilitado={bloqueado}
            >
              Mockup completo
            </Opcion>
            <Opcion
              activa={valor.modo === "wireframe"}
              onClick={() => cambiar("modo", "wireframe")}
              deshabilitado={bloqueado}
            >
              Wireframe
            </Opcion>
          </div>
        </div>

        <div>
          <Titulo>Detalle con Claude</Titulo>
          <div className="flex gap-2">
            <Opcion
              activa={(valor.detalle || "economico") === "economico"}
              onClick={() => cambiar("detalle", "economico")}
              deshabilitado={bloqueado}
            >
              Económico
            </Opcion>
            <Opcion
              activa={valor.detalle === "detallado"}
              onClick={() => cambiar("detalle", "detallado")}
              deshabilitado={bloqueado}
            >
              Detallado
            </Opcion>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {valor.detalle === "detallado"
              ? "Pantallas más elaboradas; cuesta cerca del doble."
              : "Cerca de la mitad del costo; pantallas algo más sencillas."}
          </p>
        </div>

        <div>
          <Titulo>Plataformas</Titulo>
          <div className="flex gap-2">
            {PLATAFORMAS.map((p) => (
              <Opcion
                key={p}
                activa={plataformas.includes(p)}
                deshabilitado={bloqueado}
                onClick={() =>
                  cambiar(
                    "plataformas",
                    plataformas.includes(p) ? plataformas.filter((x) => x !== p) : [...plataformas, p]
                  )
                }
              >
                {p}
              </Opcion>
            ))}
          </div>
        </div>

        {valor.modo !== "wireframe" && (
          <>
            <div>
              <Titulo>Color de marca</Titulo>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={valor.color || "#1e293b"}
                  onChange={(e) => cambiar("color", e.target.value)}
                  disabled={bloqueado}
                  className="w-10 h-9 border border-gray-300 p-0.5 bg-white"
                />
                <input
                  value={valor.color || ""}
                  onChange={(e) => cambiar("color", e.target.value)}
                  placeholder="Lo sugiere la IA"
                  disabled={bloqueado}
                  className={`${CLASE_INPUT} w-36 font-mono`}
                />
              </div>
            </div>

            <div>
              <Titulo>Tema</Titulo>
              <div className="flex gap-2">
                <Opcion
                  activa={(valor.tema || "claro") === "claro"}
                  onClick={() => cambiar("tema", "claro")}
                  deshabilitado={bloqueado}
                >
                  Claro
                </Opcion>
                <Opcion
                  activa={valor.tema === "oscuro"}
                  onClick={() => cambiar("tema", "oscuro")}
                  deshabilitado={bloqueado}
                >
                  Oscuro
                </Opcion>
              </div>
            </div>

            <div>
              <Titulo>Logo</Titulo>
              {valor.logoUrl ? (
                <Miniatura
                  url={valor.logoUrl}
                  onQuitar={() => cambiar("logoUrl", null)}
                  deshabilitado={bloqueado}
                />
              ) : (
                <label className={`inline-block ${CLASE_INPUT} cursor-pointer hover:bg-gray-50`}>
                  {subiendo === "logo" ? "Subiendo..." : "Subir logo"}
                  <input
                    type="file"
                    accept={TIPOS_IMAGEN}
                    className="hidden"
                    disabled={bloqueado}
                    onChange={(e) => subir(e.target.files, "logo")}
                  />
                </label>
              )}
            </div>

            <div>
              <Titulo>Capturas de referencia</Titulo>
              <div className="flex items-center gap-2 flex-wrap">
                {referencias.map((url) => (
                  <Miniatura
                    key={url}
                    url={url}
                    deshabilitado={bloqueado}
                    onQuitar={() => cambiar("referencias", referencias.filter((r) => r !== url))}
                  />
                ))}
                {referencias.length < MAX_REFERENCIAS && (
                  <label
                    className={`w-20 h-20 border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-500 text-center cursor-pointer hover:bg-gray-50`}
                  >
                    {subiendo === "referencias" ? "Subiendo..." : "+ Subir"}
                    <input
                      type="file"
                      accept={TIPOS_IMAGEN}
                      multiple
                      className="hidden"
                      disabled={bloqueado}
                      onChange={(e) => subir(e.target.files, "referencias")}
                    />
                  </label>
                )}
              </div>
            </div>

          </>
        )}
      </div>

      {/* --- Pantallas --- */}
      <div className="pt-5 border-t border-gray-200">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pantallas
            </p>
            {pantallas.some((p) => p.origen === "ia") && (
              <BadgeModelo modelo={valor.modeloPantallas} />
            )}
          </div>
          <button
            type="button"
            onClick={onProponer}
            disabled={bloqueado || proponiendo}
            style={{ borderColor: PALETA.navy, color: PALETA.navy }}
            className="border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {proponiendo
              ? "Proponiendo..."
              : pantallas.length
              ? "Volver a proponer con IA"
              : "Proponer pantallas con IA"}
          </button>
        </div>

        {pantallas.length > 0 && (
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <input
                type="checkbox"
                checked={todasSeleccionadas}
                disabled={bloqueado}
                onChange={() =>
                  cambiar(
                    "pantallas",
                    pantallas.map((p) => ({ ...p, seleccionada: !todasSeleccionadas }))
                  )
                }
              />
              Boceto completo
            </label>

            <ul className="border border-gray-200 divide-y divide-gray-200">
              {pantallas.map((p) => (
                <li key={p.id} className="flex items-start gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={p.seleccionada !== false}
                    disabled={bloqueado}
                    onChange={() => alternarPantalla(p.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{p.nombre}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 border border-gray-300 px-1.5">
                        {p.plataforma || "Web"}
                      </span>
                      {generadas.includes(p.nombre) && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide text-white px-1.5"
                          style={{ backgroundColor: PALETA.oliva }}
                        >
                          Generada
                        </span>
                      )}
                    </div>
                    {(p.descripcion || p.rfs?.length > 0) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.rfs?.length > 0 && <span className="font-mono">{p.rfs.join(", ")}</span>}
                        {p.rfs?.length > 0 && p.descripcion && " · "}
                        {p.descripcion}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => cambiar("pantallas", pantallas.filter((x) => x.id !== p.id))}
                    disabled={bloqueado}
                    aria-label={`Quitar ${p.nombre}`}
                    className="shrink-0 text-sm text-gray-400 hover:text-[#7f1d1d]"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex gap-2 mt-2">
          <input
            value={nuevaPantalla}
            onChange={(e) => setNuevaPantalla(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarPantalla())}
            placeholder="Agregar pantalla, ej: Mapa de unidades"
            disabled={bloqueado}
            className={`${CLASE_INPUT} flex-1`}
          />
          <Opcion onClick={agregarPantalla} deshabilitado={bloqueado || !nuevaPantalla.trim()}>
            + Agregar
          </Opcion>
        </div>
      </div>
    </div>
  );
}
