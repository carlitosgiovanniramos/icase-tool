// Armazón fijo de las pantallas del prototipo. El menú, el logo, el pie de sesión y los
// componentes (botones, campos, tablas, insignias, modales) los escribe el código, una sola vez
// por actor, para que todas las pantallas sean idénticas en lo común. La IA solo escribe el
// contenido de la pantalla (lo que va dentro de <main>) usando las clases que se le indican.
//
// Cada enlace del menú lleva data-pantalla con el NOMBRE EXACTO de la pantalla a la que va: el
// visor del prototipo usa ese dato y no el texto del enlace, así "Reservas" del administrador no
// puede caer en "Mis reservas" del estudiante.

import { TIPOGRAFIAS, variablesCss } from "./prototipo.js";

const esc = (t) =>
  String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SVG = (trazos) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos}</svg>`;

// Un icono por tipo de entrada, el mismo en todas las pantallas.
const ICONOS = {
  edificio: SVG('<path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2"/>'),
  calendario: SVG('<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  llave: SVG('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>'),
  cuadricula: SVG('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
  usuarios: SVG('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>'),
  barras: SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  ajustes: SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
  reloj: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  lista: SVG('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  salir: SVG('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
  marca: SVG('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16M13 9h4M13 13h4"/>'),
};

const REGLAS_ICONO = [
  [/sala|edificio|aula|inmueble|espacio/i, "edificio"],
  [/reserva|agenda|calendario|cita|turno/i, "calendario"],
  [/mantenimiento|bloqueo|herramienta|soporte|reparaci/i, "llave"],
  [/disponib|inicio|tablero|panel|resumen/i, "cuadricula"],
  [/usuario|cliente|persona|estudiante|empleado|equipo|miembro/i, "usuarios"],
  [/reporte|informe|estad[ií]stic|gr[aá]fic/i, "barras"],
  [/config|ajuste|parámetro|parametro/i, "ajustes"],
  [/historial|registro|bit[aá]cora/i, "reloj"],
];

export function iconoDe(texto) {
  const regla = REGLAS_ICONO.find(([patron]) => patron.test(texto || ""));
  return ICONOS[regla ? regla[1] : "lista"];
}

// CSS común de todas las pantallas: variables, armazón y componentes.
export function cssBase({ color, tema, tipografia, movil, wireframe }) {
  const fuente = TIPOGRAFIAS[tipografia] || TIPOGRAFIAS.moderna;
  const variables = variablesCss({ color: wireframe ? "#4b5563" : color, oscuro: tema === "oscuro" });
  return `${variables}
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--fondo); color: var(--texto); font: 14px/1.5 ${fuente.cuerpo}; }
h1, h2, h3 { font-family: ${fuente.titulos}; margin: 0; font-weight: 600; }
h1 { font-size: 22px; } h2 { font-size: 16px; } h3 { font-size: 14px; }
p { margin: 0; }
a { color: inherit; text-decoration: none; }
svg { width: 18px; height: 18px; flex: none; }

/* Armazón */
.app { display: flex; min-height: 100vh; }
.barra { width: 232px; flex: none; background: var(--superficie); border-right: 1px solid var(--borde); display: flex; flex-direction: column; justify-content: space-between; padding: 20px 12px; position: sticky; top: 0; height: 100vh; }
.marca { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; font-weight: 600; line-height: 1.3; }
.marca-logo { width: 28px; height: 28px; flex: none; display: flex; align-items: center; justify-content: center; border: 1px solid var(--borde); border-radius: var(--radio); color: var(--primario); overflow: hidden; }
.marca-logo img { max-width: 100%; max-height: 100%; display: block; }
.menu a { display: flex; align-items: center; gap: 10px; padding: 9px 10px; margin-bottom: 2px; border-radius: var(--radio); color: var(--texto-suave); }
.menu a:hover { background: var(--neutro-fondo); color: var(--texto); }
.menu a.activo { background: var(--neutro-fondo); color: var(--primario); font-weight: 600; box-shadow: inset 2px 0 0 var(--primario); }
.submenu { margin: 0 0 6px 20px; border-left: 1px solid var(--borde); }
.submenu a { padding: 6px 10px; font-size: 13px; }
.sesion { border-top: 1px solid var(--borde); padding: 14px 8px 0; }
.sesion-rol { font-weight: 600; }
.sesion-detalle { font-size: 12px; color: var(--texto-suave); margin-bottom: 10px; }
.sesion a { display: flex; align-items: center; gap: 8px; color: var(--texto-suave); font-size: 13px; }
.sesion a:hover { color: var(--texto); }
.contenido { flex: 1; min-width: 0; padding: 32px 40px; }
.contenido-interno { width: 100%; max-width: 1120px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

/* Componentes */
.pagina-encabezado { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pagina-encabezado p { margin-top: 4px; color: var(--texto-suave); font-size: 13px; }
.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 14px; font: 600 13px/1.2 ${fuente.cuerpo}; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); border-radius: var(--radio); cursor: pointer; }
.btn:hover { background: var(--neutro-fondo); }
.btn svg { width: 16px; height: 16px; }
.btn-primario { background: var(--primario); border-color: var(--primario); color: var(--sobre-primario); }
.btn-primario:hover { background: var(--primario); filter: brightness(1.12); }
.btn-peligro { color: var(--error); border-color: var(--error); }
.btn-pequeno { padding: 5px 10px; font-size: 12px; }
.btn[disabled], .btn.deshabilitado { opacity: .5; cursor: not-allowed; }
.tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); padding: 20px; }
.filtros { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
.campo { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.filtros .campo { margin: 0; }
.campo label, .etiqueta { font-size: 12px; font-weight: 600; color: var(--texto-suave); text-transform: uppercase; letter-spacing: .04em; }
.campo input, .campo select, .campo textarea, .input { padding: 8px 10px; border: 1px solid var(--borde); border-radius: var(--radio); background: var(--superficie); color: var(--texto); font: inherit; width: 100%; }
.campo input:focus, .campo select:focus, .campo textarea:focus, .input:focus { outline: none; border-color: var(--primario); }
.tabla { width: 100%; border-collapse: collapse; background: var(--superficie); border: 1px solid var(--borde); }
.tabla th { background: var(--neutro-fondo); text-align: left; font-size: 12px; font-weight: 600; color: var(--texto-suave); padding: 10px 14px; text-transform: uppercase; letter-spacing: .04em; }
.tabla td { padding: 12px 14px; border-top: 1px solid var(--borde); vertical-align: middle; }
.insignia { display: inline-block; padding: 2px 8px; font-size: 12px; font-weight: 600; border-radius: var(--radio); background: var(--neutro-fondo); color: var(--texto-suave); }
.insignia-ok { background: var(--ok-fondo); color: var(--ok); }
.insignia-alerta { background: var(--alerta-fondo); color: var(--alerta); }
.insignia-error { background: var(--error-fondo); color: var(--error); }
.vacio { padding: 32px; text-align: center; color: var(--texto-suave); }
.campo-ayuda { font-size: 12px; color: var(--texto-suave); }
.campo-error { display: none; font-size: 12px; color: var(--error); }
.campo input:user-invalid, .campo select:user-invalid, .campo textarea:user-invalid { border-color: var(--error); }
.campo input:user-invalid ~ .campo-error, .campo select:user-invalid ~ .campo-error, .campo textarea:user-invalid ~ .campo-error { display: block; }
.campo input:user-invalid ~ .campo-ayuda, .campo select:user-invalid ~ .campo-ayuda, .campo textarea:user-invalid ~ .campo-ayuda { display: none; }
.aviso { padding: 10px 14px; border: 1px solid var(--borde); border-radius: var(--radio); font-size: 13px; background: var(--neutro-fondo); }
.aviso-ok { background: var(--ok-fondo); color: var(--ok); border-color: var(--ok); }
.aviso-alerta { background: var(--alerta-fondo); color: var(--alerta); border-color: var(--alerta); }
.aviso-error { background: var(--error-fondo); color: var(--error); border-color: var(--error); }
.aviso[hidden], .vacio[hidden] { display: none; }
.toast-chk { display: none; }
.toast { display: none; position: fixed; top: 16px; right: 16px; z-index: 60; align-items: center; gap: 12px; box-shadow: 0 1px 2px rgba(0, 0, 0, .08); }
.toast-chk:checked + .toast { display: flex; }
.toast label { cursor: pointer; }
.orden { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
.paginacion { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--texto-suave); font-size: 13px; }
.rejilla { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.acciones-fila { display: flex; gap: 6px; justify-content: flex-end; }
.derecha { text-align: right; }
.modal-chk { display: none; }
.modal { display: none; position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, .4); align-items: center; justify-content: center; padding: 16px; }
.modal-chk:checked + .modal { display: flex; }
.modal-caja { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); width: 100%; max-width: 480px; max-height: 90vh; overflow: auto; padding: 24px; }
.modal-caja h2 { margin-bottom: 16px; }
.modal-pie { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

/* Acceso */
.acceso { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.acceso-caja { width: 100%; max-width: 380px; }
.acceso-caja .marca { justify-content: center; padding-bottom: 20px; }
.acceso-caja .btn { width: 100%; }
${wireframe ? ".insignia-ok, .insignia-alerta, .insignia-error { background: var(--neutro-fondo); color: var(--texto); border: 1px solid var(--borde); }\n.btn-primario { background: #374151; border-color: #374151; }" : ""}
${
  movil
    ? `
/* Móvil: barra superior y navegación inferior */
.app { flex-direction: column; }
.superior { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px; background: var(--superficie); border-bottom: 1px solid var(--borde); position: sticky; top: 0; z-index: 10; }
.superior .marca { padding: 0; font-size: 14px; }
.superior .sesion-rol { font-size: 12px; color: var(--texto-suave); font-weight: 600; }
.inferior { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--superficie); border-top: 1px solid var(--borde); z-index: 10; }
.inferior a { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; font-size: 11px; color: var(--texto-suave); min-height: 52px; }
.inferior a.activo { color: var(--primario); font-weight: 600; }
.contenido { padding: 16px 16px 76px; }
.modal { align-items: flex-end; padding: 0; }
.modal-caja { max-width: none; border-radius: 0; }
.btn { min-height: 44px; }`
    : ""
}`;
}

const enlace = (texto, destino, activo) =>
  `<a href="#" data-pantalla="${esc(destino)}"${activo ? ' class="activo" aria-current="page"' : ""}>${iconoDe(texto)}<span>${esc(texto)}</span></a>`;

// estructura: { acceso, entradas: [{ texto, destino, activa, sub: [{ texto, destino, activa }] }] }
// rol: nombre del actor que usa la pantalla.
function marcaDe({ nombreSistema, logoUrl }) {
  const logo = logoUrl
    ? `<span class="marca-logo"><img src="${esc(logoUrl)}" alt=""></span>`
    : `<span class="marca-logo">${ICONOS.marca}</span>`;
  return `<div class="marca">${logo}<span>${esc(nombreSistema)}</span></div>`;
}

export function shellHtml({ nombreSistema, estructura, rol, logoUrl, movil }) {
  const marca = marcaDe({ nombreSistema, logoUrl });
  const entradas = estructura.entradas || [];

  if (movil) {
    return `<header class="superior">${marca}<div class="sesion-rol">${esc(rol)}</div></header>
<nav class="inferior" aria-label="Menú principal">${entradas.map((e) => enlace(e.texto, e.destino, e.activa)).join("")}</nav>`;
  }

  const menu = entradas
    .map((e) => {
      const principal = enlace(e.texto, e.destino, e.activa && !e.sub?.some((s) => s.activa));
      if (!e.sub?.length) return principal;
      return `${principal}<div class="submenu">${e.sub
        .map((s) => `<a href="#" data-pantalla="${esc(s.destino)}"${s.activa ? ' class="activo" aria-current="page"' : ""}><span>${esc(s.texto)}</span></a>`)
        .join("")}</div>`;
    })
    .join("");

  return `<aside class="barra">
<div>${marca}<nav class="menu" aria-label="Menú principal">${menu}</nav></div>
<div class="sesion"><div class="sesion-rol">${esc(rol)}</div><div class="sesion-detalle">Sesión activa</div><a href="#" data-pantalla="${esc(estructura.salir || "Cerrar sesión")}">${ICONOS.salir}<span>Cerrar sesión</span></a></div>
</aside>`;
}

// Saca del texto de la IA lo que sirve: el contenido y sus estilos propios. Acepta que la IA
// devuelva un documento completo o un fragmento, con o sin bloque de código.
export function extraerContenido(texto) {
  let t = String(texto || "").trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  const estilos = [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1].trim()).filter(Boolean);
  const cuerpo = t.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  t = cuerpo ? cuerpo[1] : t.replace(/<!DOCTYPE[^>]*>/i, "").replace(/<\/?(html|head)[^>]*>/gi, "");
  t = t
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .trim();
  // Si la IA dibujó su propio menú, se quita: el armazón lo pone la aplicación.
  t = t.replace(/<aside[\s\S]*?<\/aside>/gi, "");
  return { contenido: t, estilos };
}

export function armarPantalla({ titulo, nombreSistema, estructura, rol, logoUrl, contenido, estilos = [], estilo = {}, movil, wireframe }) {
  const acceso = !!estructura.acceso;
  const css = cssBase({ color: estilo.color, tema: estilo.tema, tipografia: estilo.tipografia, movil, wireframe });
  const propios = estilos.length ? `\n/* Propios de esta pantalla */\n${estilos.join("\n")}` : "";
  const cuerpo = acceso
    ? `<main class="acceso"><div class="acceso-caja">${marcaDe({ nombreSistema, logoUrl })}${contenido}</div></main>`
    : `<div class="app">${shellHtml({ nombreSistema, estructura, rol, logoUrl, movil })}<main class="contenido"><div class="contenido-interno">${contenido}</div></main></div>`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>
${css}${propios}
</style>
</head>
<body>
${cuerpo}
</body>
</html>`;
}
