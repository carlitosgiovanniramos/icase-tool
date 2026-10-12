"use client";

import { useEffect, useMemo, useState } from "react";
import { extraerExplicacion } from "@/lib/diagramas";
import { plataformasDelArbol, ramaDelArbol } from "@/lib/arbol";
import { textoCategoria } from "@/lib/iso25010";
import { PALETA } from "../../../estilos";

// Informe del proyecto: reúne las fases de Análisis y Diseño ya aprobadas en un solo documento,
// con vista previa en pantalla y exportación a PDF (por el diálogo de impresión del navegador,
// que conserva los diagramas como vectores y no necesita librerías). No genera contenido nuevo:
// todo sale de lo que el proyecto ya tiene guardado.
//
// Las reglas de página (tamaño, hojas horizontales para los diagramas) están en app/globals.css.

// Tamaño al que se dibuja cada pantalla del prototipo y escala con la que entra en la hoja.
const WEB = { ancho: 1280, alto: 820, escala: 0.5 };
const MOVIL = { ancho: 390, alto: 844, escala: 0.45 };

// Resumen que abre la fase de Diseño: sus diagramas van cada uno en una hoja horizontal, así
// que la hoja de introducción lleva esta tabla en vez de quedar casi vacía.
const APARTADOS_DISENO = [
  ["5.1 Diagrama entidad-relación", "Los datos que el sistema guarda y cómo se relacionan."],
  ["5.2 Prototipo de pantallas", "La interfaz con la que cada actor usa el sistema."],
  ["5.3 Árbol de navegación", "Cómo se llega a cada pantalla desde el menú."],
  ["5.4 Diagrama de arquitectura", "Las capas, las tecnologías y cómo se comunican."],
  ["5.5 Diagrama de sistemas", "Los subsistemas, sus componentes y los requerimientos que cumple cada uno."],
];

const esMovil = (pantalla) => /m[oó]vil/i.test(pantalla?.plataforma || "");
const enLista = (valor) => (Array.isArray(valor) ? valor : valor ? [valor] : []).filter(Boolean);
const mayuscula = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "");

function Seccion({ numero, titulo, children, nuevaHoja }) {
  return (
    <section className={nuevaHoja ? "break-before-page" : ""}>
      <h2
        className="text-xl font-bold mt-10 mb-3 pb-1 border-b-2 break-after-avoid"
        style={{ color: PALETA.navy, borderColor: PALETA.navy }}
      >
        {numero}. {titulo}
      </h2>
      {children}
    </section>
  );
}

function Apartado({ numero, titulo, intro }) {
  return (
    <div className="break-after-avoid">
      <h3 className="text-base font-bold text-gray-900 mt-7 mb-2">
        {numero} {titulo}
      </h3>
      {intro && <Parrafo>{intro}</Parrafo>}
    </div>
  );
}

function Parrafo({ children }) {
  return <p className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-line text-justify">{children}</p>;
}

const CELDA = "border border-gray-400 px-3 py-2 align-top text-sm";

// Ficha formal de un requerimiento: una tabla de dos columnas por requerimiento.
function FichaRequerimiento({ requerimiento: r, conCategoria }) {
  const filas = [
    ["Nombre del requerimiento", r.nombre],
    conCategoria && ["Categoría (ISO/IEC 25010)", textoCategoria(r)],
    ["Descripción", r.descripcion],
    ["Dependencias", enLista(r.dependencias).join(", ") || "Ninguna"],
    ["Prioridad", mayuscula(r.prioridad)],
    ["Actores", enLista(r.actores).join(", ") || "No aplica"],
    ["Precondiciones", r.precondiciones],
    ["Postcondiciones", r.postcondiciones],
  ].filter(Boolean);

  return (
    <table className="w-full border-collapse mb-5 break-inside-avoid">
      <tbody>
        <tr>
          <th className={`${CELDA} w-[36%] text-left font-bold bg-gray-100`}>ID del requerimiento</th>
          <td className={`${CELDA} font-bold bg-gray-100`}>{r.codigo}</td>
        </tr>
        {filas.map(([etiqueta, valor]) => (
          <tr key={etiqueta}>
            <th className={`${CELDA} text-left font-normal text-gray-700`}>{etiqueta}</th>
            <td className={`${CELDA} text-gray-900 whitespace-pre-line`}>{valor || "No aplica"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Un diagrama en su propia hoja horizontal, con la explicación que lo acompaña.
function Figura({ numero, titulo, intro, svg, pie = titulo, explicacion }) {
  return (
    <div className="informe-horizontal">
      <div className="break-inside-avoid">
        {titulo && (
          <h3 className="text-base font-bold text-gray-900 mt-7 mb-2">
            {numero} {titulo}
          </h3>
        )}
        {intro && <Parrafo>{intro}</Parrafo>}
        {svg ? (
          <figure>
            <div
              className="informe-diagrama border border-gray-300 bg-white p-3"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <figcaption className="text-xs text-gray-500 text-center mt-1.5">{pie}</figcaption>
          </figure>
        ) : (
          <p className="text-sm text-gray-500">Este diagrama no está disponible.</p>
        )}
      </div>
      {explicacion && (
        <div className="mt-3">
          <Parrafo>{explicacion}</Parrafo>
        </div>
      )}
    </div>
  );
}

// Al imprimir, cada pantalla incrustada se dibuja también en modo impresión: sus propias reglas
// "@media print" (algunas ocultan todo menos una hoja interna) la dejarían en blanco, las de
// "@media screen" dejarían de aplicarse y los fondos no saldrían. Para el informe la pantalla
// debe verse igual que en el navegador.
const ESTILO_CAPTURA =
  "<style>*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}</style>";

function htmlParaInforme(html) {
  const fiel = String(html || "")
    .replace(/@media\s+print\b/gi, "@media not all")
    .replace(/@media\s+(only\s+)?screen\b/gi, "@media all");
  return /<\/head>/i.test(fiel) ? fiel.replace(/<\/head>/i, `${ESTILO_CAPTURA}</head>`) : ESTILO_CAPTURA + fiel;
}

// Una pantalla del prototipo, reducida para que entre en la hoja. No es interactiva: es la
// vista inicial de la pantalla, como una captura.
function Captura({ pantalla, numero }) {
  const { ancho, alto, escala } = esMovil(pantalla) ? MOVIL : WEB;
  return (
    <figure className="break-inside-avoid mb-5">
      <div
        className="border border-gray-400 overflow-hidden bg-white"
        style={{ width: ancho * escala, height: alto * escala }}
      >
        <iframe
          srcDoc={htmlParaInforme(pantalla.html)}
          title={pantalla.nombre}
          sandbox="allow-scripts"
          scrolling="no"
          tabIndex={-1}
          style={{
            width: ancho,
            height: alto,
            border: 0,
            transform: `scale(${escala})`,
            transformOrigin: "0 0",
            pointerEvents: "none",
          }}
        />
      </div>
      <figcaption className="text-xs text-gray-600 mt-1.5" style={{ maxWidth: ancho * escala }}>
        <span className="font-semibold text-gray-900">
          Pantalla {numero}. {pantalla.nombre}
        </span>
        {pantalla.rfs?.length > 0 && <span className="font-mono"> · {pantalla.rfs.join(", ")}</span>}
      </figcaption>
    </figure>
  );
}

// Árbol de navegación: con varias plataformas se dibuja una rama por hoja, porque completo queda
// demasiado ancho para leerse impreso.
function useRamasDelArbol(codigo, renderizar) {
  const plataformas = useMemo(() => plataformasDelArbol(codigo), [codigo]);
  const [ramas, setRamas] = useState(null); // { codigo, svgs: { idPlataforma: svg } }

  useEffect(() => {
    if (!plataformas.length) return;
    let cancelado = false;
    (async () => {
      const svgs = {};
      for (const p of plataformas) {
        try {
          svgs[p.id] = await renderizar(ramaDelArbol(codigo, p.id));
        } catch (err) {
          console.error("Error dibujando la rama del árbol:", err);
        }
      }
      if (!cancelado) setRamas({ codigo, svgs });
    })();
    return () => {
      cancelado = true;
    };
  }, [codigo, plataformas, renderizar]);

  const listas = ramas?.codigo === codigo && plataformas.every((p) => ramas.svgs[p.id]);
  return listas ? plataformas.map((p) => ({ ...p, svg: ramas.svgs[p.id] })) : [];
}

// Lo que el proyecto propone, armado con el contexto y los resultados ya aprobados.
function datosDePropuesta(contexto, analisis, prototipo) {
  const plataformas = enLista(contexto.plataformas).length
    ? enLista(contexto.plataformas)
    : [...new Set((prototipo || []).map((p) => p.plataforma).filter(Boolean))];
  return [
    ["Alcance", contexto.incluye],
    ["Fuera de alcance", contexto.no_incluye],
    ["Usuarios", (analisis.actores || []).map((a) => a.nombre).join(", ")],
    ["Plataformas", plataformas.join(", ")],
    ["Tecnologías", contexto.tecnologias],
    ["Reglas de negocio", contexto.reglas],
    ["Atributos de calidad prioritarios", enLista(contexto.calidad).join(", ")],
  ].filter(([, valor]) => String(valor || "").trim());
}

export default function InformeProyecto({ proyecto, contexto = {}, artefactos, svgs, renderizar, onVolver }) {
  const analisis = artefactos.analisis || {};
  const rf = analisis.requerimientos_funcionales || [];
  const rnf = analisis.requerimientos_no_funcionales || [];
  const actores = analisis.actores || [];
  const prototipo = artefactos.prototipo || [];
  const web = prototipo.filter((p) => !esMovil(p));
  const moviles = prototipo.filter(esMovil);
  const ramas = useRamasDelArbol(artefactos.arbol, renderizar);
  const propuesta = datosDePropuesta(contexto, analisis, prototipo);
  const [fecha] = useState(() =>
    new Date().toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })
  );

  function exportar() {
    // El título de la página es el nombre que el navegador propone para el archivo PDF.
    const tituloPrevio = document.title;
    document.title = `Informe - ${proyecto.nombre}`;
    window.addEventListener("afterprint", () => (document.title = tituloPrevio), { once: true });
    window.print();
  }

  return (
    <div>
      <div className="print:hidden mb-4 flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onVolver} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
          ← Volver
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">En el diálogo, elige &quot;Guardar como PDF&quot;.</span>
          <button
            onClick={exportar}
            style={{ backgroundColor: PALETA.navy }}
            className="text-white px-4 py-2 text-sm font-semibold hover:brightness-125"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <article className="informe mx-auto max-w-[190mm] bg-white border border-gray-300 shadow-sm px-12 py-12 print:max-w-none print:border-0 print:shadow-none print:p-0">
        {/* --- Portada --- */}
        <header className="break-after-page min-h-[230mm] flex flex-col justify-center">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4">
            Informe de análisis y diseño
          </p>
          <h1 className="text-4xl font-bold leading-tight mb-6" style={{ color: PALETA.navy }}>
            {proyecto.nombre}
          </h1>
          <div className="w-16 h-1 mb-6" style={{ backgroundColor: PALETA.navy }} />
          <p className="text-sm text-gray-600">{mayuscula(fecha)}</p>

          <div className="mt-16 text-sm text-gray-700">
            <p className="font-bold text-gray-900 mb-2">Contenido</p>
            <ol className="space-y-1">
              <li>1. Descripción del proyecto</li>
              <li>2. Problema actual</li>
              <li>3. Propuesta de solución</li>
              <li>4. Fase de análisis: actores, requerimientos y casos de uso</li>
              <li>
                5. Fase de diseño: entidad-relación, prototipo, árbol de navegación, arquitectura y
                diagrama de sistemas
              </li>
            </ol>
          </div>
        </header>

        <Seccion numero="1" titulo="Descripción del proyecto">
          <Parrafo>{proyecto.prompt}</Parrafo>
        </Seccion>

        <Seccion numero="2" titulo="Problema actual">
          <Parrafo>
            {contexto.problema?.trim() || "No se registró el problema actual en el contexto del proyecto."}
          </Parrafo>
        </Seccion>

        <Seccion numero="3" titulo="Propuesta de solución">
          <Parrafo>
            {`Se propone "${proyecto.nombre}", un sistema definido por ${rf.length} requerimientos funcionales y ${rnf.length} no funcionales${
              prototipo.length ? `, con un prototipo de ${prototipo.length} pantallas` : ""
            }. La siguiente tabla resume lo que la solución abarca.`}
          </Parrafo>
          {propuesta.length > 0 && (
            <table className="w-full border-collapse mb-4">
              <tbody>
                {propuesta.map(([etiqueta, valor]) => (
                  <tr key={etiqueta} className="break-inside-avoid">
                    <th className={`${CELDA} w-[30%] text-left font-bold bg-gray-100`}>{etiqueta}</th>
                    <td className={`${CELDA} whitespace-pre-line`}>{valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seccion>

        {/* ===================== ANÁLISIS ===================== */}
        <Seccion numero="4" titulo="Fase de análisis" nuevaHoja>
          <Parrafo>
            {`En esta fase se define qué debe hacer el sistema y quién lo usa. Se identifican los actores, se redactan los requerimientos funcionales y no funcionales siguiendo la norma ISO/IEC/IEEE 29148, se clasifican los no funcionales con el modelo de calidad ISO/IEC 25010 y se relaciona a cada actor con las funciones que utiliza en el diagrama de casos de uso. El análisis de este proyecto resultó en ${actores.length} actores, ${rf.length} requerimientos funcionales y ${rnf.length} no funcionales.`}
          </Parrafo>

          <Apartado numero="4.1" titulo="Actores" intro="Personas o roles que interactúan con el sistema." />
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr>
                <th className={`${CELDA} w-[30%] text-left font-bold bg-gray-100`}>Actor</th>
                <th className={`${CELDA} text-left font-bold bg-gray-100`}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {actores.map((a) => (
                <tr key={a.nombre} className="break-inside-avoid">
                  <td className={`${CELDA} font-semibold`}>{a.nombre}</td>
                  <td className={CELDA}>{a.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Apartado
            numero="4.2"
            titulo="Requerimientos funcionales"
            intro="Funciones que el sistema debe ofrecer. Cada ficha indica su prioridad, los actores que la usan, de qué otros requerimientos depende y qué debe cumplirse antes y después de ejecutarla."
          />
          {rf.map((r) => (
            <FichaRequerimiento key={r.codigo} requerimiento={r} />
          ))}

          <Apartado
            numero="4.3"
            titulo="Requerimientos no funcionales"
            intro="Condiciones de calidad que el sistema debe cumplir, clasificadas según las características del modelo ISO/IEC 25010."
          />
          {rnf.map((r) => (
            <FichaRequerimiento key={r.codigo} requerimiento={r} conCategoria />
          ))}

          <Figura
            numero="4.4"
            titulo="Diagrama de casos de uso"
            intro="Muestra qué funciones del sistema usa cada actor. Una relación «include» indica que un caso ejecuta siempre a otro como parte de su flujo; «extend», que lo amplía de forma opcional."
            svg={svgs.casos_uso}
            explicacion={extraerExplicacion(artefactos.casos_uso)}
          />
        </Seccion>

        {/* ===================== DISEÑO ===================== */}
        <Seccion numero="5" titulo="Fase de diseño" nuevaHoja>
          <Parrafo>
            En esta fase se define cómo se construirá el sistema para cumplir los requerimientos del
            análisis: el modelo de datos, el prototipo de las pantallas, la navegación entre ellas, la
            arquitectura técnica y la composición del sistema en subsistemas. Cada apartado parte de
            los anteriores, de modo que los cinco describen la misma solución desde distintos ángulos.
          </Parrafo>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr>
                <th className={`${CELDA} w-[34%] text-left font-bold bg-gray-100`}>Apartado</th>
                <th className={`${CELDA} text-left font-bold bg-gray-100`}>Qué define</th>
              </tr>
            </thead>
            <tbody>
              {APARTADOS_DISENO.map(([apartado, define]) => (
                <tr key={apartado} className="break-inside-avoid">
                  <td className={`${CELDA} font-semibold`}>{apartado}</td>
                  <td className={CELDA}>{define}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Figura
            numero="5.1"
            titulo="Diagrama entidad-relación"
            intro="Muestra los datos que el sistema guarda: las entidades, sus atributos y cómo se relacionan entre sí."
            svg={svgs.er}
            explicacion={extraerExplicacion(artefactos.er)}
          />

          <div className="break-before-page">
            <Apartado
              numero="5.2"
              titulo="Prototipo de pantallas"
              intro={`Vista inicial de las ${prototipo.length} pantallas del sistema. Bajo cada una se indican los requerimientos funcionales que cubre.`}
            />
            {web.length > 0 && moviles.length > 0 && (
              <p className="text-sm font-bold text-gray-900 mt-4 mb-2">Aplicación web</p>
            )}
            {web.map((p, i) => (
              <Captura key={p.nombre} pantalla={p} numero={i + 1} />
            ))}
            {moviles.length > 0 && (
              <>
                {web.length > 0 && (
                  <p className="text-sm font-bold text-gray-900 mt-6 mb-2 break-after-avoid">Aplicación móvil</p>
                )}
                <div className="flex flex-wrap gap-x-6">
                  {moviles.map((p, i) => (
                    <Captura key={p.nombre} pantalla={p} numero={web.length + i + 1} />
                  ))}
                </div>
              </>
            )}
          </div>

          {ramas.length > 0 ? (
            ramas.map((rama, i) => (
              <Figura
                key={rama.id}
                numero={i === 0 ? "5.3" : ""}
                titulo={i === 0 ? "Árbol de navegación" : ""}
                intro={
                  i === 0
                    ? "Muestra cómo se llega a cada pantalla desde el menú de cada plataforma. Bajo cada pantalla aparecen los requerimientos que cubre."
                    : undefined
                }
                svg={rama.svg}
                pie={`Árbol de navegación · ${rama.nombre}`}
                explicacion={i === ramas.length - 1 ? extraerExplicacion(artefactos.arbol) : undefined}
              />
            ))
          ) : (
            <Figura
              numero="5.3"
              titulo="Árbol de navegación"
              intro="Muestra cómo se llega a cada pantalla desde el menú. Bajo cada pantalla aparecen los requerimientos que cubre."
              svg={svgs.arbol}
              explicacion={extraerExplicacion(artefactos.arbol)}
            />
          )}

          <Figura
            numero="5.4"
            titulo="Diagrama de arquitectura"
            intro="Muestra las capas del sistema, la tecnología de cada componente y los protocolos con que se comunican."
            svg={svgs.arquitectura}
            explicacion={extraerExplicacion(artefactos.arquitectura)}
          />

          <Figura
            numero="5.5"
            titulo="Diagrama de sistemas"
            intro="Organiza los componentes en subsistemas e indica, para cada uno, su tecnología y los requerimientos que cumple."
            svg={svgs.sistema}
            explicacion={extraerExplicacion(artefactos.sistema)}
          />
        </Seccion>
      </article>
    </div>
  );
}
