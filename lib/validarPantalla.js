// Revisión de una pantalla del prototipo. El front se construye leyendo este HTML, así que un
// botón sin destino, un modal sin su casilla o un formulario sin operación se heredan tal cual.
// Devuelve la lista de problemas ({ id, texto }); vacía si todo está en orden. No necesita un
// DOM: sirve en el navegador y en el servidor.

const sinAcentos = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const textoPlano = (html) =>
  String(html ?? "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function leerAtributos(texto) {
  const atributos = {};
  for (const m of texto.matchAll(/([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    atributos[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return atributos;
}

// Etiquetas de apertura con sus atributos y su posición.
function etiquetas(html) {
  const lista = [];
  for (const m of html.matchAll(/<([a-zA-Z][\w-]*)((?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?)>/g)) {
    lista.push({ nombre: m[1].toLowerCase(), atributos: leerAtributos(m[2] || ""), inicio: m.index, fin: m.index + m[0].length });
  }
  return lista;
}

const contieneClase = (atributos, clase) => (atributos.class || "").split(/\s+/).includes(clase);

// "Clase.operacion" de cada operación del diagrama de clases (Mermaid).
export function operacionesDeClases(codigo) {
  const operaciones = new Set();
  let actual = null;
  for (const cruda of String(codigo || "").split("\n")) {
    const linea = cruda.trim();
    const clase = linea.match(/^class\s+(\w+)\s*\{?$/);
    if (clase) {
      actual = clase[1];
      continue;
    }
    if (actual && linea === "}") {
      actual = null;
      continue;
    }
    const operacion = actual && linea.match(/^[+\-#~]?\s*(\w+)\s*\(/);
    if (operacion) operaciones.add(`${actual}.${operacion[1]}`.toLowerCase());
  }
  return operaciones;
}

// html: la pantalla completa. contexto:
//   operaciones: Set de "Clase.operacion" válidas (vacío: no se comprueba)
//   nombres:     nombres de las pantallas del prototipo
//   acceso:      la pantalla es de inicio de sesión
export function validarPantalla(html, { operaciones = new Set(), nombres = [], acceso = false } = {}) {
  const problemas = [];
  const agregar = (id, texto) => {
    if (!problemas.some((p) => p.id === id)) problemas.push({ id, texto });
  };
  if (!html) return [{ id: "vacia", texto: "La pantalla está vacía." }];

  const cuerpo = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const tags = etiquetas(cuerpo);
  const validas = new Set(nombres.map(sinAcentos));
  const ids = new Set(tags.map((t) => t.atributos.id).filter(Boolean));

  // Rangos de los formularios, para saber qué botones y campos están dentro de uno.
  const formularios = [];
  for (const t of tags.filter((x) => x.nombre === "form")) {
    const cierre = cuerpo.indexOf("</form>", t.fin);
    formularios.push({ ...t, hasta: cierre === -1 ? cuerpo.length : cierre });
  }
  const dentroDeFormulario = (posicion) => formularios.find((f) => posicion > f.inicio && posicion < f.hasta);

  // Texto de un enlace o botón: lo que hay entre su apertura y su cierre.
  const textoDe = (tag, cierre) => {
    const hasta = cuerpo.indexOf(cierre, tag.fin);
    const dentro = cuerpo.slice(tag.fin, hasta === -1 ? tag.fin + 200 : hasta);
    return textoPlano(dentro).slice(0, 40) || "(sin texto)";
  };

  // --- Enlaces: cada uno lleva a una pantalla del prototipo ---
  for (const t of tags.filter((x) => x.nombre === "a")) {
    const nombre = textoDe(t, "</a>");
    const destino = t.atributos["data-pantalla"];
    if (!destino) agregar(`enlace-sin-destino:${nombre}`, `El enlace «${nombre}» no tiene destino: falta data-pantalla con el nombre de una pantalla.`);
    else if (validas.size && !validas.has(sinAcentos(destino))) agregar(`enlace-ajeno:${destino}`, `El enlace «${nombre}» lleva a «${destino}», que no es una pantalla del prototipo.`);
  }

  // --- Botones: abren un modal, envían un formulario o ejecutan una operación ---
  for (const t of tags.filter((x) => x.nombre === "button")) {
    const nombre = textoDe(t, "</button>");
    const tipo = (t.atributos.type || "submit").toLowerCase();
    if ("disabled" in t.atributos) continue;
    if (tipo === "submit") {
      if (!dentroDeFormulario(t.inicio)) agregar(`boton-fuera:${nombre}`, `El botón «${nombre}» envía un formulario, pero no está dentro de uno.`);
    } else if (!t.atributos.onclick && !t.atributos["data-operacion"] && !contieneClase(t.atributos, "orden") && !/anterior|siguiente|ordenar/i.test(nombre)) {
      agregar(`boton-inerte:${nombre}`, `El botón «${nombre}» no hace nada: debe abrir un modal, navegar, enviar un formulario o ejecutar una operación.`);
    }
  }

  // --- Operaciones: las del diagrama de clases ---
  const conOperacion = tags.filter((x) => x.atributos["data-operacion"]);
  for (const t of conOperacion) {
    const operacion = t.atributos["data-operacion"];
    if (operaciones.size && !operaciones.has(operacion.toLowerCase())) {
      agregar(`operacion-ajena:${operacion}`, `La operación «${operacion}» no existe en el diagrama de clases.`);
    }
  }

  // --- Formularios: operación, campos con name y botón de envío ---
  formularios.forEach((f, i) => {
    const etiqueta = acceso ? "de acceso" : `${i + 1}`;
    if (!f.atributos["data-operacion"]) agregar(`form-sin-operacion:${i}`, `El formulario ${etiqueta} no tiene data-operacion con la operación de la clase que ejecuta.`);
    const interior = cuerpo.slice(f.fin, f.hasta);
    if (!/<button[^>]*type\s*=\s*["']?submit/i.test(interior) && !/<input[^>]*type\s*=\s*["']?submit/i.test(interior)) {
      agregar(`form-sin-envio:${i}`, `El formulario ${etiqueta} no tiene un botón de envío (type="submit").`);
    }
  });
  for (const t of tags.filter((x) => ["input", "select", "textarea"].includes(x.nombre))) {
    if (!dentroDeFormulario(t.inicio)) continue;
    const tipo = (t.atributos.type || "").toLowerCase();
    if (["hidden", "submit", "button"].includes(tipo) || contieneClase(t.atributos, "modal-chk") || contieneClase(t.atributos, "toast-chk")) continue;
    if (!t.atributos.name) {
      const referencia = t.atributos.placeholder || t.atributos.id || t.nombre;
      agregar(`campo-sin-name:${referencia}`, `El campo «${referencia}» no tiene name: debe llevar el nombre del atributo de la clase.`);
    }
  }

  // --- Modales y mensajes: la casilla, su ventana y quién los abre ---
  const abren = new Set(tags.filter((x) => x.nombre === "label" && x.atributos.for).map((x) => x.atributos.for));
  for (const t of tags.filter((x) => x.nombre === "input" && (contieneClase(x.atributos, "modal-chk") || contieneClase(x.atributos, "toast-chk")))) {
    const esModal = contieneClase(t.atributos, "modal-chk");
    const siguiente = new RegExp(`^\\s*<div[^>]*class\\s*=\\s*["'][^"']*\\b${esModal ? "modal" : "toast"}\\b`, "i");
    if (!siguiente.test(cuerpo.slice(t.fin, t.fin + 300))) {
      agregar(`sin-ventana:${t.atributos.id}`, `La casilla «${t.atributos.id || "sin id"}» no está seguida de su ${esModal ? "modal" : "mensaje"}.`);
    }
    if (esModal && t.atributos.id && !abren.has(t.atributos.id) && !new RegExp(`getElementById\\(['"]${t.atributos.id}['"]\\)`).test(cuerpo)) {
      agregar(`modal-sin-boton:${t.atributos.id}`, `El modal «${t.atributos.id}» no tiene ningún botón que lo abra.`);
    }
  }
  for (const f of abren) if (!ids.has(f)) agregar(`label-huerfano:${f}`, `Un botón abre «${f}», pero esa casilla no existe en la pantalla.`);
  for (const m of cuerpo.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (!ids.has(m[1])) agregar(`id-inexistente:${m[1]}`, `Un botón usa «${m[1]}», que no existe en la pantalla (modal o mensaje que falta).`);
  }
  const repetidos = tags.map((t) => t.atributos.id).filter(Boolean).filter((id, i, todos) => todos.indexOf(id) !== i);
  for (const id of new Set(repetidos)) agregar(`id-repetido:${id}`, `El id «${id}» está repetido.`);

  // --- Estados vacíos y acceso ---
  if (/<table[\s>]/i.test(cuerpo) && !tags.some((t) => contieneClase(t.atributos, "vacio"))) {
    agregar("tabla-sin-vacio", "La tabla no tiene sus estados vacíos (sin datos y sin resultados), ocultos con hidden.");
  }
  if (acceso) {
    if (!tags.some((t) => contieneClase(t.atributos, "aviso-error") && "hidden" in t.atributos)) {
      agregar("acceso-sin-error", "El formulario de acceso no tiene el aviso oculto de credenciales incorrectas.");
    }
    if (!tags.some((t) => t.nombre === "input" && (t.atributos.type || "").toLowerCase() === "password" && "required" in t.atributos)) {
      agregar("acceso-sin-password", "El formulario de acceso no tiene el campo de contraseña obligatorio.");
    }
  }

  // --- Estilo: colores y radios solo con las variables de la aplicación ---
  const propios = html.split("/* Propios de esta pantalla */")[1]?.split("</style>")[0] || "";
  const enLinea = [...cuerpo.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(";");
  const estilos = `${propios};${enLinea}`;
  const colores = [...new Set([...estilos.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi)].map((m) => m[0]))];
  if (colores.length) agregar("color-propio", `La pantalla define colores propios (${colores.slice(0, 3).join(", ")}): debe usar solo las variables var(--...).`);
  const radios = [...estilos.matchAll(/border-radius\s*:\s*([^;}]+)/gi)].map((m) => m[1].trim()).filter((v) => !/^var\(--radio\)$|^0(px)?$|^50%$/i.test(v));
  if (radios.length) agregar("radio-propio", `La pantalla define bordes redondeados propios (${[...new Set(radios)].slice(0, 3).join(", ")}): debe usar var(--radio).`);
  if (/<script[\s>]/i.test(cuerpo)) agregar("script", "La pantalla incluye un <script>: no se permiten scripts.");

  return problemas;
}
