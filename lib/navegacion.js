// Navegación de una pantalla del prototipo, a partir del plan de pantallas: qué entradas tiene
// el menú principal, cuál está activa, qué submenú muestra y desde dónde se abre o qué abre.
//
// Cada pantalla del plan dice dónde vive: "seccion" (entrada del menú principal; las pantallas
// de una misma sección forman su submenú) o "abre_desde" (no está en el menú: se abre con un
// botón desde otra pantalla). Los planes anteriores no traen esos campos: su menú lista todas
// las pantallas, como antes.

const dePlataforma = (p) => p.plataforma || "Web";
const lista = (nombres) => nombres.map((n) => `"${n}"`).join(", ");

// Texto para el prompt que genera la pantalla.
export function describirNavegacion(pantalla, pantallas = []) {
  const mismas = pantallas.filter((p) => dePlataforma(p) === dePlataforma(pantalla));

  if (!mismas.some((p) => p.seccion || p.abre_desde)) {
    const nombres = mismas.map((p) => p.nombre);
    return nombres.length > 1
      ? `el menú debe incluir exactamente estas secciones, con estos mismos nombres, como enlaces <a href="#">: ${nombres.join(", ")}. Marca "${pantalla.nombre}" como la activa.`
      : "incluye la navegación que corresponda a esta pantalla.";
  }

  const esMovil = /m[oó]vil/i.test(dePlataforma(pantalla));
  const menu = esMovil ? "la barra de navegación inferior" : "la barra lateral";
  const enMenu = mismas.filter((p) => p.seccion);
  const entradas = [...new Set(enMenu.map((p) => p.seccion))];
  const primera = enMenu[0]?.nombre;

  // Pantalla de acceso: no está en el menú ni se abre desde otra.
  if (!pantalla.seccion && !pantalla.abre_desde) {
    return `esta pantalla es de acceso y NO muestra el menú principal.${primera ? ` Su botón principal es un enlace <a href="#"> que lleva a "${primera}".` : ""}`;
  }

  // La sección activa es la suya o la de la pantalla desde la que se abre.
  const seccionDe = (p, vistas = new Set()) => {
    if (p.seccion) return p.seccion;
    if (!p.abre_desde || vistas.has(p.nombre)) return null;
    vistas.add(p.nombre);
    const origen = mismas.find((x) => x.nombre === p.abre_desde);
    return origen ? seccionDe(origen, vistas) : null;
  };
  const activa = seccionDe(pantalla);
  const hermanas = enMenu.filter((p) => p.seccion === activa).map((p) => p.nombre);
  const abre = mismas.filter((p) => p.abre_desde === pantalla.nombre).map((p) => p.nombre);

  const lineas = [
    `el menú principal es ${menu}, va dentro de un elemento <nav> y tiene EXACTAMENTE estas entradas, con estos mismos nombres y en este orden, como enlaces <a href="#">: ${lista(entradas)}.${activa ? ` Marca "${activa}" como la entrada activa.` : ""} No pongas en el menú ninguna otra pantalla.`,
  ];
  if (hermanas.length > 1) {
    lineas.push(
      `- Dentro de "${activa}" hay un submenú (pestañas o lista secundaria, dentro de otro <nav>) con estas pantallas como enlaces <a href="#">: ${lista(hermanas)}.${pantalla.seccion ? ` Marca "${pantalla.nombre}" como la activa.` : ""}`
    );
  }
  if (pantalla.abre_desde) {
    lineas.push(`- Esta pantalla no está en el menú: se abre desde "${pantalla.abre_desde}". Incluye un enlace <a href="#"> visible para volver a "${pantalla.abre_desde}".`);
  }
  if (abre.length) {
    lineas.push(`- Desde esta pantalla se abren estas otras: ${lista(abre)}. Incluye para cada una un botón o enlace hecho con <a href="#"> cuyo texto sea el nombre de esa pantalla o lo contenga.`);
  }
  return lineas.join("\n");
}
