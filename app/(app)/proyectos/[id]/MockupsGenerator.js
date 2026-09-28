"use client";

import { useEffect, useState } from "react";
import { useBloqueoModal } from "../../../useBloqueoModal";
import { PALETA } from "../../../estilos";
import BadgeModelo from "./BadgeModelo";

const SCRIPT_INTERCEPTAR_NAVEGACION = `
<script>
document.addEventListener("click", function (e) {
  const link = e.target.closest("a");
  if (!link) return;
  e.preventDefault();
  const texto = (link.innerText || link.textContent || "").trim();
  try {
    window.parent.postMessage({ tipo: "mockup-navegar", texto }, "*");
  } catch (err) {}
}, true);
</script>`;

function conNavegacionInterceptada(html) {
  if (!html) return html;
  return html.includes("</body>")
    ? html.replace("</body>", SCRIPT_INTERCEPTAR_NAVEGACION + "</body>")
    : html + SCRIPT_INTERCEPTAR_NAVEGACION;
}

function limpiarTexto(txt) {
  return (txt || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim();
}


// Busca la pantalla a la que lleva un enlace del menú: primero por nombre exacto y luego por
// palabras, dando preferencia a las pantallas de la misma plataforma que la actual.
function pantallaQueCoincide(candidatas, textoLink) {
  const texto = limpiarTexto(textoLink);
  const exacta = candidatas.find(({ p }) => limpiarTexto(p.nombre) === texto);
  if (exacta) return exacta.i;

  const palabras = texto.split(/\s+/).filter((w) => w.length > 3);
  if (!palabras.length) return -1;
  const parecida = candidatas.find(({ p }) =>
    palabras.some((w) => limpiarTexto(p.nombre).includes(w))
  );
  return parecida ? parecida.i : -1;
}

const plataformaDe = (pantalla) => pantalla?.plataforma || "Web";

function Segmento({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={activo ? { backgroundColor: PALETA.navy, borderColor: PALETA.navy } : undefined}
      className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
        activo ? "text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

const esMovil = (pantalla) => /m[oó]vil/i.test(plataformaDe(pantalla));

// Marco del prototipo: un lienzo gris separa la pantalla del resto de la app. Las pantallas web
// van dentro de una ventana de navegador simulada; las móviles, dentro de un teléfono dibujado
// por el visor, con el iframe al ancho real de un celular (390px) para que el HTML se comporte
// como en un teléfono (así no depende de que la IA dibuje su propio marco).
// alto: clase de altura del área de la pantalla web.
function MarcoPantalla({ html, titulo, movil, alto = "h-[860px]" }) {
  const iframe = (clases) => (
    <iframe
      srcDoc={conNavegacionInterceptada(html)}
      className={`block bg-white ${clases}`}
      title={titulo}
      sandbox="allow-scripts allow-forms allow-modals allow-popups"
    />
  );

  return (
    <div className="bg-slate-200 border border-slate-300 p-4 sm:p-6">
      {movil ? (
        <div className="flex justify-center overflow-x-auto">
          <div className="relative shrink-0 rounded-[48px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-700">
            {/* Muesca de la cámara */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 rounded-b-2xl bg-slate-900 z-10" />
            <div className="rounded-[36px] overflow-hidden">{iframe("w-[390px] h-[844px]")}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden shadow-xl ring-1 ring-slate-400 bg-white">
          <div className="flex items-center gap-3 h-9 px-3 bg-slate-100 border-b border-slate-300">
            <div className="flex gap-1.5 shrink-0" aria-hidden="true">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 min-w-0 max-w-xl mx-auto h-6 rounded bg-white border border-slate-300 px-3 flex items-center">
              <span className="text-xs text-slate-500 truncate">{titulo}</span>
            </div>
          </div>
          {iframe(`w-full ${alto}`)}
        </div>
      )}
    </div>
  );
}

// Código HTML de una pantalla con vista previa en vivo. Si el prototipo está bloqueado (o hay
// una generación en curso) el código se puede ver pero no modificar.
function EditorHtml({ pantalla, editable, onGuardar }) {
  // El borrador guarda contra qué HTML se empezó a editar: si la pantalla se regenera
  // mientras tanto, el borrador viejo se descarta solo.
  const [borrador, setBorrador] = useState(null); // { base, texto }
  const [vistaPrevia, setVistaPrevia] = useState(pantalla.html);
  const [guardando, setGuardando] = useState(false);

  const texto = borrador?.base === pantalla.html ? borrador.texto : pantalla.html;
  const modificado = texto !== pantalla.html;

  // La vista previa se actualiza un momento después de dejar de escribir.
  useEffect(() => {
    const temporizador = setTimeout(() => setVistaPrevia(texto), 400);
    return () => clearTimeout(temporizador);
  }, [texto]);

  async function guardar() {
    setGuardando(true);
    try {
      // onGuardar devuelve false si no se pudo guardar: el borrador se conserva.
      if ((await onGuardar(texto)) !== false) setBorrador(null);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <textarea
          value={texto}
          onChange={(e) => setBorrador({ base: pantalla.html, texto: e.target.value })}
          readOnly={!editable}
          spellCheck={false}
          className={`w-full h-[944px] border border-gray-300 p-3 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:border-gray-900 ${
            editable ? "bg-white" : "bg-gray-50 text-gray-600"
          }`}
        />
        <MarcoPantalla html={vistaPrevia} titulo={pantalla.nombre} movil={esMovil(pantalla)} />
      </div>

      {editable ? (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={guardar}
            disabled={!modificado || guardando}
            style={{ backgroundColor: PALETA.navy }}
            className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          {modificado && (
            <button
              onClick={() => setBorrador(null)}
              disabled={guardando}
              className="border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Descartar
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mt-2">Solo lectura. Pulsa Editar para modificarlo.</p>
      )}
    </div>
  );
}

function BotonFlecha({ onClick, disabled, children, etiqueta }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      style={{ borderColor: PALETA.navy, color: PALETA.navy }}
      className="w-8 h-9 border bg-white hover:bg-gray-50 disabled:opacity-30 text-lg leading-none"
    >
      {children}
    </button>
  );
}

// Selector compacto de pantalla: un desplegable numerado con flechas de anterior/siguiente, en
// lugar de una fila de pestañas que satura cuando hay muchas pantallas.
function SelectorPantalla({ visibles, activa, onElegir }) {
  const posicion = visibles.findIndex(({ i }) => i === activa);
  return (
    <div className="flex items-center gap-1 min-w-0">
      <BotonFlecha
        etiqueta="Pantalla anterior"
        disabled={posicion <= 0}
        onClick={() => onElegir(visibles[posicion - 1].i)}
      >
        ‹
      </BotonFlecha>
      <select
        value={activa}
        onChange={(e) => onElegir(Number(e.target.value))}
        className="h-9 min-w-0 max-w-[340px] border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-900"
      >
        {visibles.map(({ p, i }, n) => (
          <option key={i} value={i}>
            {n + 1}. {p.nombre}
          </option>
        ))}
      </select>
      <BotonFlecha
        etiqueta="Pantalla siguiente"
        disabled={posicion >= visibles.length - 1}
        onClick={() => onElegir(visibles[posicion + 1].i)}
      >
        ›
      </BotonFlecha>
      <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
        {posicion + 1}/{visibles.length}
      </span>
    </div>
  );
}

// Visor de las pantallas generadas, separadas por plataforma (Web / Móvil). Cada pantalla se
// puede ver o editar como HTML. La generación y el guardado viven en la página (para que la
// cascada pueda regenerar el prototipo); si no está bloqueado, aquí se puede además regenerar
// o quitar una pantalla suelta.
export default function MockupsGenerator({
  mockups,
  deshabilitado,
  bloqueado, // prototipo aprobado: solo se pueden ver las pantallas
  regenerando, // índice de la pantalla que se está regenerando, o null
  onRegenerar,
  onQuitar,
  onGuardarHtml, // (indice, html) => Promise<boolean>
}) {
  const [elegida, setElegida] = useState(0); // índice en mockups
  const [plataformaElegida, setPlataformaElegida] = useState(null);
  const [modo, setModo] = useState("vista"); // "vista" | "codigo"
  const [expandido, setExpandido] = useState(false);

  useBloqueoModal(expandido, () => setExpandido(false));

  const lista = mockups || [];
  const plataformas = [...new Set(lista.map(plataformaDe))];
  const plataforma = plataformas.includes(plataformaElegida) ? plataformaElegida : plataformas[0];
  const visibles = lista.map((p, i) => ({ p, i })).filter(({ p }) => plataformaDe(p) === plataforma);
  // Si la pantalla elegida no es de esta plataforma (o ya no existe), se muestra la primera.
  const activa = visibles.some(({ i }) => i === elegida) ? elegida : visibles[0]?.i;

  function elegir(indice) {
    setElegida(indice);
    setPlataformaElegida(plataformaDe(lista[indice]));
  }

  useEffect(() => {
    if (!mockups) return;

    function alRecibirMensaje(event) {
      if (event.data?.tipo !== "mockup-navegar") return;
      const todas = mockups.map((p, i) => ({ p, i }));
      const actual = plataformaDe(mockups[activa]);
      // Primero entre las pantallas de la misma plataforma, luego en todas.
      const mismas = todas.filter(({ p }) => plataformaDe(p) === actual);
      const destino = pantallaQueCoincide(mismas, event.data.texto);
      const indice = destino !== -1 ? destino : pantallaQueCoincide(todas, event.data.texto);
      if (indice !== -1) {
        setElegida(indice);
        setPlataformaElegida(plataformaDe(mockups[indice]));
      }
    }

    window.addEventListener("message", alRecibirMensaje);
    return () => window.removeEventListener("message", alRecibirMensaje);
  }, [mockups, activa]);

  if (!lista.length || activa === undefined) return null;
  const pantalla = lista[activa];
  const editable = !bloqueado && !deshabilitado && !!onGuardarHtml;

  return (
    <div className="mt-6">
      {/* --- Barra única: plataforma, pantalla, modelo | modo y acciones --- */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          {plataformas.length > 1 && (
            <div className="flex items-center gap-1">
              {plataformas.map((pl) => (
                <Segmento
                  key={pl}
                  activo={pl === plataforma}
                  onClick={() => setPlataformaElegida(pl)}
                >
                  {pl} ({lista.filter((p) => plataformaDe(p) === pl).length})
                </Segmento>
              ))}
            </div>
          )}
          <SelectorPantalla visibles={visibles} activa={activa} onElegir={elegir} />
          <BadgeModelo modelo={pantalla.modelo} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Segmento activo={modo === "vista"} onClick={() => setModo("vista")}>
              Vista
            </Segmento>
            <Segmento activo={modo === "codigo"} onClick={() => setModo("codigo")}>
              Código
            </Segmento>
          </div>
          {!bloqueado && (
            <>
              <button
                onClick={() => onRegenerar(activa)}
                disabled={deshabilitado}
                style={{ borderColor: PALETA.navy, color: PALETA.navy }}
                className="border bg-transparent hover:bg-gray-50 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {regenerando === activa ? "Regenerando..." : "Regenerar"}
              </button>
              <button
                onClick={() => onQuitar(activa)}
                disabled={deshabilitado}
                style={{ borderColor: PALETA.carmesi, color: PALETA.carmesi }}
                className="border bg-transparent hover:bg-red-50 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Quitar
              </button>
            </>
          )}
          <button
            onClick={() => setExpandido(true)}
            style={{ borderColor: PALETA.navy, color: PALETA.navy }}
            className="border bg-transparent hover:bg-gray-50 px-3 py-1.5 text-sm"
          >
            Expandir
          </button>
        </div>
      </div>

      {modo === "codigo" ? (
        <EditorHtml
          key={activa}
          pantalla={pantalla}
          editable={editable}
          onGuardar={(html) => onGuardarHtml(activa, html)}
        />
      ) : (
        <MarcoPantalla html={pantalla.html} titulo={pantalla.nombre} movil={esMovil(pantalla)} />
      )}

      {expandido && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col" onClick={() => setExpandido(false)}>
          <div
            className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              {plataformas.length > 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  {plataformas.map((pl) => (
                    <Segmento
                      key={pl}
                      activo={pl === plataforma}
                      onClick={() => setPlataformaElegida(pl)}
                    >
                      {pl}
                    </Segmento>
                  ))}
                </div>
              )}
              <SelectorPantalla visibles={visibles} activa={activa} onElegir={elegir} />
            </div>

            <button
              onClick={() => setExpandido(false)}
              style={{ borderColor: PALETA.navy, color: PALETA.navy }}
              className="shrink-0 border bg-transparent hover:bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="flex-1 overflow-auto" onClick={(e) => e.stopPropagation()}>
            <MarcoPantalla
              html={pantalla.html}
              titulo={pantalla.nombre}
              movil={esMovil(pantalla)}
              alto="h-[calc(100vh-150px)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
