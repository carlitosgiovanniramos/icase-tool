"use client";

import { useEffect, useMemo, useState } from "react";
import { extraerExplicacion } from "@/lib/diagramas";
import { plataformasDelArbol, ramaDelArbol } from "@/lib/arbol";
import { textoCategoria } from "@/lib/iso25010";
import { PALETA } from "../../../estilos";
import { nombreLegible } from "./BadgeModelo";

// Informe del proyecto: reúne las fases aprobadas (Análisis y Diseño, y la Implementación cuando también
// está aprobada) en un solo documento,
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
// Los apartados se numeran según los que el proyecto tiene: el diagrama de clases se agregó
// después que los demás pasos y los proyectos anteriores pueden no traerlo.
const APARTADOS_DISENO = [
  { clave: "clases", titulo: "Diagrama de clases", define: "Las clases del dominio, con sus atributos, operaciones y relaciones." },
  { clave: "er", titulo: "Diagrama entidad-relación", define: "Los datos que el sistema guarda y cómo se relacionan." },
  { clave: "prototipo", titulo: "Prototipo de pantallas", define: "La interfaz con la que cada actor usa el sistema." },
  { clave: "arbol", titulo: "Árbol de navegación", define: "Cómo se llega a cada pantalla desde el menú." },
  { clave: "arquitectura", titulo: "Diagrama de arquitectura", define: "Las capas, las tecnologías y cómo se comunican." },
  { clave: "sistema", titulo: "Diagrama de sistemas", define: "Los subsistemas, sus componentes y los requerimientos que cumple cada uno." },
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

// --- Fase de implementación -----------------------------------------------------------------------
// Todo sale de lo que guarda cada paso (stack, estructura, base de datos, contrato, backend y frontend),
// así sirve para cualquier proyecto: las tablas solo aparecen si el paso tiene esos datos.

const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString("es", { dateStyle: "long", timeStyle: "short" }) : "");
const fraccion = (par) => (Array.isArray(par) && par[1] ? `${par[0]} de ${par[1]}` : null);
const NOMBRES_PLATAFORMA = { web: "Aplicación web", movil: "Aplicación móvil" };

function Tabla({ columnas, filas, anchos = [], mono = [] }) {
  if (!filas.length) return null;
  return (
    <table className="w-full border-collapse mb-4">
      <thead>
        <tr>
          {columnas.map((c, i) => (
            <th key={c} className={`${CELDA} text-left font-bold bg-gray-100 ${anchos[i] || ""}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i} className="break-inside-avoid">
            {fila.map((celda, j) => (
              <td key={j} className={`${CELDA} ${mono.includes(j) ? "font-mono text-xs break-all" : ""}`}>
                {celda === "" || celda == null ? "—" : celda}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Tabla de dos columnas con los datos clave de un paso.
function Resumen({ filas }) {
  const visibles = filas.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
  if (!visibles.length) return null;
  return (
    <table className="w-full border-collapse mb-4">
      <tbody>
        {visibles.map(([etiqueta, valor]) => (
          <tr key={etiqueta} className="break-inside-avoid">
            <th className={`${CELDA} w-[34%] text-left font-bold bg-gray-100`}>{etiqueta}</th>
            <td className={`${CELDA} whitespace-pre-line`}>{valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const APARTADOS_IMPLEMENTACION = [
  { clave: "impl_stack", titulo: "Stack técnico", define: "Las tecnologías, contenedores, librerías y servicios externos con que se construye el diseño aprobado." },
  { clave: "impl_estructura", titulo: "Estructura de carpetas", define: "Los archivos de cada pieza, su propósito y qué parte del diseño cubre cada uno." },
  { clave: "impl_bd", titulo: "Base de datos", define: "Las migraciones y los datos de prueba, aplicados y probados en contenedores." },
  { clave: "impl_contrato", titulo: "Contrato de API", define: "Las operaciones que expone el sistema, quién puede usarlas y la prueba de permisos." },
  { clave: "impl_backend", titulo: "Backend", define: "La lógica de negocio que cumple el contrato y su prueba." },
  { clave: "impl_frontend", titulo: "Frontend", define: "Las aplicaciones de cada plataforma y su compilación." },
  { clave: "ejecucion", titulo: "Ejecución y despliegue", define: "Los contenedores que levantan el sistema y dónde se publica." },
];

// Cómo se obtuvo y cómo se verificó cada paso (el proceso de icase-tool, igual para cualquier proyecto).
const COMO_SE_HIZO = {
  impl_stack: {
    obtuvo: "A partir de los diagramas de arquitectura y de sistemas aprobados: cada componente y cada tecnología del diseño se resolvió con una pieza del catálogo de icase-tool (plantillas de contenedores ya probadas).",
    verifico: "El código revisa que cada componente del diseño tenga su pieza, que las librerías correspondan a las tecnologías elegidas y que los servicios externos sean solo los del diseño.",
  },
  impl_estructura: {
    obtuvo: "Se generó la lista de archivos de cada pieza, con su propósito, a partir del prototipo, el modelo de datos, los módulos y los requerimientos.",
    verifico: "El código mide la cobertura: que cada pantalla, tabla, módulo y requerimiento funcional tenga al menos un archivo que lo implemente.",
  },
  impl_bd: {
    obtuvo: "Se generaron las migraciones y los datos de prueba, archivo por archivo, desde el diagrama entidad-relación y las reglas de negocio.",
    verifico: "Se aplicaron en contenedores sobre una base vacía y se comprobó tabla por tabla el control de acceso, sus políticas, las filas de prueba y el acceso desde la API.",
  },
  impl_contrato: {
    obtuvo: "Se definió cada operación a partir de la base de datos probada y de las acciones de cada pantalla del prototipo.",
    verifico: "El código valida el contrato contra la base real; la prueba de permisos llama a cada operación como cada rol y compara el resultado con lo permitido.",
  },
  impl_backend: {
    obtuvo: "Se generó la lógica que la base de datos no resuelve por sí sola (funciones del servidor) para cumplir las operaciones del contrato.",
    verifico: "Se levantó junto con la base en contenedores y se llamó a cada función como cada rol del contrato.",
  },
  impl_frontend: {
    obtuvo: "Se construyó cada plataforma por capas a partir del prototipo aprobado, conectando cada acción de pantalla con su operación del contrato.",
    verifico: "El código valida cada archivo (rutas, importaciones y paquetes) y cada plataforma se compila en su imagen de Docker; los errores de compilación se corrigen antes de aprobar.",
  },
};
const herramienta = (modelo) => (modelo ? (modelo === "manual" ? "Editado a mano" : nombreLegible(modelo)) : "—");

function ComoSeHizo({ clave, modelo }) {
  const c = COMO_SE_HIZO[clave];
  if (!c) return null;
  return (
    <Parrafo>
      <span className="font-semibold">Cómo se hizo. </span>
      {`${c.obtuvo} ${c.verifico}${modelo ? ` Herramienta de generación: ${herramienta(modelo)}.` : ""}`}
    </Parrafo>
  );
}

function SeccionImplementacion({ numero, artefactos, modelos = {}, enlaces }) {
  const stack = artefactos.impl_stack || {};
  const estructura = artefactos.impl_estructura || {};
  const bd = artefactos.impl_bd || {};
  const contrato = artefactos.impl_contrato || {};
  const backend = artefactos.impl_backend || {};
  const frontend = artefactos.impl_frontend || {};
  const titulo = (pieza) => stack.titulos?.[pieza] || pieza;
  const apartados = APARTADOS_IMPLEMENTACION.filter((a) => a.clave === "ejecucion" || artefactos[a.clave]);
  const n = (clave) => `${numero}.${apartados.findIndex((a) => a.clave === clave) + 1}`;
  const archivosEstructura = estructura.archivos || [];
  const plataformas = Object.entries(frontend.plataformas || {}).filter(([, d]) => d?.archivos?.length);
  const totalArchivos =
    archivosEstructura.length ||
    (bd.archivos || []).length + (backend.archivos || []).length + plataformas.reduce((t, [, d]) => t + d.archivos.length, 0);
  const prueba = bd.prueba;
  const cobBd = prueba?.cobertura || {};
  const cobEst = estructura.cobertura || {};

  return (
    <Seccion numero={numero} titulo="Fase de implementación" nuevaHoja>
      <Parrafo>
        {`En esta fase se construye el sistema a partir del diseño aprobado. Primero se eligen las tecnologías con que se implementa cada componente de la arquitectura (stack técnico) y se define la estructura de archivos de cada pieza. Después se generan y prueban, en contenedores, la base de datos, el contrato de la API con sus permisos, la lógica del backend y las aplicaciones de cada plataforma. El proyecto quedó con ${totalArchivos} archivos${plataformas.length ? ` y ${plataformas.length === 1 ? "una plataforma" : `${plataformas.length} plataformas`} (${plataformas.map(([c]) => NOMBRES_PLATAFORMA[c] || c).join(", ").toLowerCase()})` : ""}.`}
      </Parrafo>
      <Tabla
        columnas={["Apartado", "Qué define"]}
        anchos={["w-[34%]"]}
        filas={apartados.map((a) => [<span key="t" className="font-semibold">{n(a.clave)} {a.titulo}</span>, a.define])}
      />

      <p className="text-sm font-bold text-gray-900 mt-6 mb-2 break-after-avoid">Metodología</p>
      <Parrafo>
        La implementación se realizó con icase-tool, paso a paso y en orden de dependencia: cada paso se obtiene a partir del diseño aprobado y de los pasos anteriores, el código lo revisa automáticamente, se prueba en contenedores Docker (cada proyecto tiene sus propios contenedores y su propia base de datos) y solo se avanza cuando se aprueba. Si un paso cambia, los siguientes quedan desactualizados hasta revisarlos de nuevo, de modo que lo aprobado siempre corresponde al mismo diseño.
      </Parrafo>
      <Tabla
        columnas={["Paso", "Cómo se verificó", "Herramienta"]}
        anchos={["w-[24%]", "", "w-[20%]"]}
        filas={apartados
          .filter((a) => COMO_SE_HIZO[a.clave])
          .map((a) => [<span key="t" className="font-semibold">{a.titulo}</span>, COMO_SE_HIZO[a.clave].verifico, herramienta(modelos[a.clave])])}
      />

      {artefactos.impl_stack && (
        <>
          <Apartado numero={n("impl_stack")} titulo="Stack técnico" intro={stack.explicacion} />
          <ComoSeHizo clave="impl_stack" modelo={modelos.impl_stack} />
          <Resumen
            filas={[
              ["Piezas", (stack.piezas || []).map((p) => `${titulo(p.pieza)}${p.opcionales?.length ? ` (${p.opcionales.join(", ")})` : ""}`).join("\n")],
              ["Alta disponibilidad", stack.altaDisponibilidad ? "Sí" : "No"],
              ["Contenedores", (stack.contenedores || []).length],
              ["Librerías", (stack.librerias || []).length],
              ["Servicios externos", (stack.externos || []).map((x) => x.servicio).join(", ") || "Ninguno"],
            ]}
          />
          {(stack.componentes || []).length > 0 && (
            <>
              <p className="text-sm font-bold text-gray-900 mt-4 mb-2 break-after-avoid">Cómo se implementa cada componente del diagrama de sistemas</p>
              <Tabla
                columnas={["Componente", "Tecnología", "Se implementa con", "RF"]}
                filas={stack.componentes.map((c) => [c.nombre, c.tecnologia, c.pieza ? titulo(c.pieza) : c.resolucion, (c.requerimientos || []).join(", ")])}
              />
            </>
          )}
          {(stack.librerias || []).length > 0 && (
            <>
              <p className="text-sm font-bold text-gray-900 mt-4 mb-2 break-after-avoid">Librerías</p>
              <Tabla
                columnas={["Paquete", "En", "Para qué", "RF"]}
                mono={[0]}
                filas={stack.librerias.map((l) => [l.nombre, titulo(l.pieza), l.motivo, (l.requerimientos || []).join(", ")])}
              />
            </>
          )}
          {(stack.externos || []).length > 0 && (
            <>
              <p className="text-sm font-bold text-gray-900 mt-4 mb-2 break-after-avoid">Servicios externos</p>
              <Tabla
                columnas={["Servicio", "Variable de configuración", "Lo usa", "Nota"]}
                mono={[1]}
                filas={stack.externos.map((x) => [x.servicio, x.variable, (x.usadoPor || []).join(", "), x.nota])}
              />
            </>
          )}
        </>
      )}

      {artefactos.impl_estructura && (
        <>
          <Apartado
            numero={n("impl_estructura")}
            titulo="Estructura de carpetas"
            intro={`El proyecto se organiza en ${Object.keys(estructura.piezas || {}).length} piezas con ${archivosEstructura.length} archivos. Cada archivo indica para qué sirve y qué parte del diseño cubre.`}
          />
          <ComoSeHizo clave="impl_estructura" modelo={modelos.impl_estructura} />
          <Resumen
            filas={[
              ["Pantallas del prototipo cubiertas", fraccion(cobEst.pantallas)],
              ["Tablas del modelo de datos cubiertas", fraccion(cobEst.tablas)],
              ["Módulos cubiertos", fraccion(cobEst.modulos)],
              ["Requerimientos funcionales cubiertos", fraccion(cobEst.requerimientos)],
            ]}
          />
          {Object.entries(estructura.piezas || {}).map(([pieza, info]) => {
            const suyos = archivosEstructura.filter((a) => a.pieza === pieza);
            return (
              <div key={pieza}>
                <p className="text-sm font-bold text-gray-900 mt-4 mb-1 break-after-avoid">
                  {info.titulo} <span className="font-mono font-normal text-gray-600">· {info.carpeta}/ · {suyos.length} archivos</span>
                </p>
                {info.notas && <Parrafo>{info.notas}</Parrafo>}
                <Tabla
                  columnas={["Archivo", "Para qué", "RF"]}
                  anchos={["w-[38%]", "", "w-[16%]"]}
                  mono={[0]}
                  filas={suyos.map((a) => [a.ruta.slice((info.carpeta || "").length + 1) || a.ruta, a.proposito, (a.requerimientos || []).join(", ")])}
                />
              </div>
            );
          })}
        </>
      )}

      {artefactos.impl_bd && (
        <>
          <Apartado
            numero={n("impl_bd")}
            titulo="Base de datos"
            intro="Las migraciones crean las tablas, sus permisos y reglas, y los datos de prueba permiten usar el sistema desde el primer arranque. Se aplican en orden sobre una base vacía y se prueban en contenedores."
          />
          <ComoSeHizo clave="impl_bd" modelo={modelos.impl_bd} />
          <Resumen
            filas={[
              ["Archivos", (bd.archivos || []).length],
              ["Prueba en contenedores", prueba ? (prueba.ok ? `Correcta · ${fechaCorta(prueba.fecha)}` : prueba.ok === false ? `Falló al aplicar ${prueba.archivo || "la base"}` : "Sin probar") : "Sin probar"],
              ["Tablas del modelo de datos", fraccion(cobBd.tablas)],
              ["Tablas con reglas de acceso", fraccion(cobBd.rls)],
              ["Tablas con datos de prueba", fraccion(cobBd.datos)],
              ["Usuarios de prueba", typeof prueba?.usuarios === "number" ? prueba.usuarios : null],
            ]}
          />
          <Tabla
            columnas={["Archivo", "Líneas", "Tablas"]}
            anchos={["w-[44%]", "w-[10%]"]}
            mono={[0]}
            filas={(bd.archivos || []).map((a) => [a.ruta, a.lineas, (a.tablas || []).join(", ")])}
          />
          {(prueba?.tablas || []).length > 0 && (
            <>
              <p className="text-sm font-bold text-gray-900 mt-4 mb-2 break-after-avoid">Resultado de la prueba por tabla</p>
              <Tabla
                columnas={["Tabla", "Reglas de acceso", "Políticas", "Filas de prueba"]}
                mono={[0]}
                filas={prueba.tablas.map((t) => [t.tabla, t.rls === true ? "Sí" : t.rls === false ? "No" : "", t.politicas, t.filas])}
              />
            </>
          )}
        </>
      )}

      {artefactos.impl_contrato && (
        <>
          <Apartado
            numero={n("impl_contrato")}
            titulo="Contrato de API"
            intro="El contrato define cada operación que la aplicación puede pedir al sistema: qué recurso usa, qué roles la tienen permitida y qué requerimientos cumple. Las pantallas solo usan operaciones del contrato."
          />
          <ComoSeHizo clave="impl_contrato" modelo={modelos.impl_contrato} />
          <Resumen
            filas={[
              ["Operaciones", (contrato.operaciones || []).length],
              ["Acciones del prototipo cubiertas", fraccion(contrato.cobertura?.acciones)],
              ["Requerimientos funcionales cubiertos", fraccion(contrato.cobertura?.requerimientos)],
              [
                "Prueba de permisos",
                contrato.prueba
                  ? `${contrato.prueba.correctas} correctas · ${contrato.prueba.fallidas} fallidas · ${contrato.prueba.inconclusas} sin verificar${contrato.prueba.pendientes ? ` · ${contrato.prueba.pendientes} pendientes` : ""}`
                  : "Sin probar",
              ],
            ]}
          />
          <Tabla
            columnas={["Operación", "Método y recurso", "Roles", "RF"]}
            anchos={["w-[32%]", "w-[26%]"]}
            filas={(contrato.operaciones || []).map((op) => [op.nombre, <span key="m" className="font-mono text-xs">{op.metodo} {op.recurso}</span>, (op.roles || []).join(", "), (op.requerimientos || []).join(", ")])}
          />
        </>
      )}

      {artefactos.impl_backend && (
        <>
          <Apartado
            numero={n("impl_backend")}
            titulo="Backend"
            intro="Lógica de negocio que no resuelve la base de datos por sí sola. Se prueba llamando a cada función como cada rol del contrato."
          />
          <ComoSeHizo clave="impl_backend" modelo={modelos.impl_backend} />
          <Resumen
            filas={[
              ["Archivos", (backend.archivos || []).length],
              ["Prueba", backend.prueba ? `${backend.prueba.correctas} correctas · ${backend.prueba.fallidas} fallidas · ${backend.prueba.inconclusas} sin verificar · ${fechaCorta(backend.prueba.fecha)}` : "Sin probar"],
            ]}
          />
          <Tabla columnas={["Archivo", "Líneas"]} anchos={["", "w-[14%]"]} mono={[0]} filas={(backend.archivos || []).map((a) => [a.ruta, a.lineas])} />
        </>
      )}

      {artefactos.impl_frontend && (
        <>
          <Apartado
            numero={n("impl_frontend")}
            titulo="Frontend"
            intro="Las aplicaciones con que cada actor usa el sistema, construidas sobre el prototipo aprobado y conectadas a las operaciones del contrato. Cada plataforma se compila en su contenedor."
          />
          <ComoSeHizo clave="impl_frontend" modelo={modelos.impl_frontend} />
          <Resumen
            filas={plataformas.map(([clave, d]) => [
              NOMBRES_PLATAFORMA[clave] || clave,
              `${d.archivos.length} archivos · ${d.archivos.reduce((t, a) => t + (a.lineas || 0), 0)} líneas · ${d.compilacion ? (d.compilacion.ok ? "compila" : "no compila") : "sin compilar"}`,
            ])}
          />
          {plataformas.map(([clave, d]) => (
            <div key={clave}>
              <p className="text-sm font-bold text-gray-900 mt-4 mb-2 break-after-avoid">{NOMBRES_PLATAFORMA[clave] || clave}</p>
              <Tabla columnas={["Archivo", "Líneas"]} anchos={["", "w-[14%]"]} mono={[0]} filas={d.archivos.map((a) => [a.ruta, a.lineas])} />
            </div>
          ))}
        </>
      )}

      <Apartado
        numero={n("ejecucion")}
        titulo="Ejecución y despliegue"
        intro="Cada pieza corre en su propio contenedor y todas se levantan juntas con Docker Compose, con su propia base de datos. Al levantarse se aplican las migraciones y los datos de prueba."
      />
      <Parrafo>
        <span className="font-semibold">Cómo se hizo. </span>
        icase-tool envía los archivos aprobados a un servicio que ejecuta Docker en el servidor; ese servicio levanta los contenedores del proyecto y publica por HTTPS una dirección por cada acceso (web, aplicación móvil y API), de modo que el sistema se puede abrir desde cualquier navegador o teléfono.
      </Parrafo>
      <Tabla
        columnas={["Contenedor", "Qué es"]}
        anchos={["w-[30%]"]}
        mono={[0]}
        filas={(stack.contenedores || []).map((c) => [c.nombre, `${c.descripcion}${c.tarea ? " (tarea de un solo uso)" : ""}`])}
      />
      {enlaces.length > 0 && (
        <>
          <p className="text-sm font-bold text-gray-900 mt-4 mb-2 break-after-avoid">Direcciones del sistema en ejecución</p>
          <Tabla columnas={["Acceso", "Dirección"]} anchos={["w-[30%]"]} mono={[1]} filas={enlaces.map((e) => [e.nombre, e.url])} />
        </>
      )}
    </Seccion>
  );
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

export default function InformeProyecto({ proyecto, proyectoId, contexto = {}, artefactos, svgs, renderizar, implementacionAprobada, modelos, onVolver }) {
  const analisis = artefactos.analisis || {};
  const rf = analisis.requerimientos_funcionales || [];
  const rnf = analisis.requerimientos_no_funcionales || [];
  const actores = analisis.actores || [];
  const prototipo = artefactos.prototipo || [];
  const web = prototipo.filter((p) => !esMovil(p));
  const moviles = prototipo.filter(esMovil);
  const ramas = useRamasDelArbol(artefactos.arbol, renderizar);
  const propuesta = datosDePropuesta(contexto, analisis, prototipo);
  const apartados = APARTADOS_DISENO.filter((a) => artefactos[a.clave]);
  const numero = (clave) => `5.${apartados.findIndex((a) => a.clave === clave) + 1}`;
  const [enlaces, setEnlaces] = useState([]);
  // Direcciones del sistema si está levantado (para el apartado de ejecución); sin runner, no se muestran.
  useEffect(() => {
    if (!implementacionAprobada || !proyectoId) return;
    let cancelado = false;
    fetch("/api/implementacion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proyectoId, accion: "estado" }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelado && setEnlaces(d?.enlaces || []))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [implementacionAprobada, proyectoId]);
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
        <div className="flex items-center gap-3 flex-wrap">
          {!implementacionAprobada && (
            <span className="text-xs text-gray-500">La implementación se agrega al aprobar su fase.</span>
          )}
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
            {implementacionAprobada ? "Informe de análisis, diseño e implementación" : "Informe de análisis y diseño"}
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
              <li>5. Fase de diseño: {apartados.map((a) => a.titulo.toLowerCase()).join(", ")}</li>
              {implementacionAprobada && (
                <li>6. Fase de implementación: metodología, stack técnico, estructura, base de datos, contrato de API, backend, frontend y ejecución</li>
              )}
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
            análisis: las clases del dominio, el modelo de datos, el prototipo de las pantallas, la navegación entre ellas, la
            arquitectura técnica y la composición del sistema en subsistemas. Cada apartado parte de
            los anteriores, de modo que todos describen la misma solución desde distintos ángulos.
          </Parrafo>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr>
                <th className={`${CELDA} w-[34%] text-left font-bold bg-gray-100`}>Apartado</th>
                <th className={`${CELDA} text-left font-bold bg-gray-100`}>Qué define</th>
              </tr>
            </thead>
            <tbody>
              {apartados.map((a) => (
                <tr key={a.clave} className="break-inside-avoid">
                  <td className={`${CELDA} font-semibold`}>
                    {numero(a.clave)} {a.titulo}
                  </td>
                  <td className={CELDA}>{a.define}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {artefactos.clases && (
            <Figura
              numero={numero("clases")}
              titulo="Diagrama de clases"
              intro="Muestra las clases del dominio con sus atributos y operaciones, y cómo se relacionan entre sí. De él se deriva el modelo de datos."
              svg={svgs.clases}
              explicacion={extraerExplicacion(artefactos.clases)}
            />
          )}

          <Figura
            numero={numero("er")}
            titulo="Diagrama entidad-relación"
            intro="Muestra los datos que el sistema guarda: las entidades, sus atributos y cómo se relacionan entre sí."
            svg={svgs.er}
            explicacion={extraerExplicacion(artefactos.er)}
          />

          <div className="break-before-page">
            <Apartado
              numero={numero("prototipo")}
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
                numero={i === 0 ? numero("arbol") : ""}
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
              numero={numero("arbol")}
              titulo="Árbol de navegación"
              intro="Muestra cómo se llega a cada pantalla desde el menú. Bajo cada pantalla aparecen los requerimientos que cubre."
              svg={svgs.arbol}
              explicacion={extraerExplicacion(artefactos.arbol)}
            />
          )}

          <Figura
            numero={numero("arquitectura")}
            titulo="Diagrama de arquitectura"
            intro="Muestra las capas del sistema, la tecnología de cada componente y los protocolos con que se comunican."
            svg={svgs.arquitectura}
            explicacion={extraerExplicacion(artefactos.arquitectura)}
          />

          <Figura
            numero={numero("sistema")}
            titulo="Diagrama de sistemas"
            intro="Organiza los componentes en subsistemas e indica, para cada uno, su tecnología y los requerimientos que cumple."
            svg={svgs.sistema}
            explicacion={extraerExplicacion(artefactos.sistema)}
          />
        </Seccion>

        {/* ===================== IMPLEMENTACIÓN ===================== */}
        {implementacionAprobada && <SeccionImplementacion numero="6" artefactos={artefactos} modelos={modelos} enlaces={enlaces} />}
      </article>
    </div>
  );
}
