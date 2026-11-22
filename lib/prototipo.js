// Reglas de diseño y contexto compartidos por los generadores del prototipo (proponer pantallas,
// generar pantalla). Viven aquí para que todas las pantallas salgan con el mismo estilo sin
// importar qué modelo las genere: el CSS base se pide copiar tal cual, en vez de dejar que cada
// modelo invente su paleta y sus radios.

export const RADIO = "2px";

// Los colores se derivan del color de marca de cada proyecto (que la IA elige según su dominio):
// los grises llevan un toque de ese mismo tono y el color de marca se atenúa. Así cada sistema
// tiene su propia identidad sobria y todas sus pantallas, aunque las genere un modelo distinto,
// salen con la misma paleta.
function aHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  const n = parseInt(m ? m[1] : "334155", 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [215, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60), s * 100, l * 100];
}
const hsl = (h, s, l) => `hsl(${h}, ${Math.round(s)}%, ${Math.round(l * 10) / 10}%)`;

// Tipografías por carácter del sistema. Solo pilas del sistema: el prototipo no carga fuentes.
export const TIPOGRAFIAS = {
  moderna: {
    titulos: '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif',
    cuerpo: '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif',
    nota: "sans moderna y neutra",
  },
  humanista: {
    titulos: '"Segoe UI", "Trebuchet MS", Candara, system-ui, sans-serif',
    cuerpo: '"Segoe UI", Candara, system-ui, sans-serif',
    nota: "sans humanista y cálida",
  },
  editorial: {
    titulos: 'Georgia, "Times New Roman", serif',
    cuerpo: '"Inter", "Segoe UI", system-ui, sans-serif',
    nota: "títulos con serif y cuerpo sans, formal",
  },
};
export const NOMBRES_TIPOGRAFIA = Object.keys(TIPOGRAFIAS);

export function variablesCss({ color, oscuro }) {
  const [h, s, l] = aHsl(color);
  // Marca atenuada: saturación y luminosidad acotadas para que nunca sea brillante.
  const marca = hsl(h, Math.min(s, 45), Math.min(Math.max(l, 22), 38));
  const t = Math.min(s, 14); // toque de tono en los grises
  return oscuro
    ? `:root {
  --fondo: ${hsl(h, t, 8)}; --superficie: ${hsl(h, t, 11)}; --borde: ${hsl(h, t, 20)};
  --texto: ${hsl(h, 8, 92)}; --texto-suave: ${hsl(h, 8, 65)};
  --primario: ${hsl(h, Math.min(s, 40), 58)}; --sobre-primario: ${hsl(h, t, 8)};
  --ok: #8fb59c; --ok-fondo: #1e2a23; --alerta: #c9a867; --alerta-fondo: #2b2619;
  --error: #c98a8a; --error-fondo: #2c1f1f; --neutro-fondo: ${hsl(h, t, 15)};
  --radio: ${RADIO};
}`
    : `:root {
  --fondo: ${hsl(h, t, 97.5)}; --superficie: #ffffff; --borde: ${hsl(h, t, 89)};
  --texto: ${hsl(h, Math.min(s, 25), 14)}; --texto-suave: ${hsl(h, 8, 45)};
  --primario: ${marca}; --sobre-primario: #ffffff;
  --ok: #3f6b4f; --ok-fondo: #edf3ef; --alerta: #8a6a2f; --alerta-fondo: #f5f0e4;
  --error: #8f3b3b; --error-fondo: #f6ecec; --neutro-fondo: ${hsl(h, t, 94.5)};
  --radio: ${RADIO};
}`;
}

// Reglas del wireframe, con el mismo radio mínimo.
export function estiloWireframe() {
  return `Genera un WIREFRAME de baja fidelidad:
- Solo escala de grises (blancos, negros y grises), sin colores de marca ni imágenes reales.
- Representa bloques de contenido, botones e inputs como rectángulos simples con bordes (outline) de 1px, con border-radius máximo de ${RADIO}, usando el nombre real del campo cuando sea claro.
- Tipografía neutra (sans-serif del sistema), sin sombras ni degradados.
- El objetivo es mostrar la estructura y disposición de los elementos, no el diseño visual final.`;
}

// Cómo organizar el contenido según lo que hace la pantalla, para que una lista no se diseñe
// como un formulario ni al revés. El menú, el logo y el estilo los pone la aplicación.
export const TIPOS_DE_PANTALLA = `Estructura del contenido según lo que hace la pantalla:
- Lista o consulta: encabezado, filtros en una fila, tabla con las columnas de los datos y acciones por fila.
- Alta o edición: se hace en un modal (ver abajo), con los campos de la clase y los botones "Guardar" y "Cancelar".
- Reservas por fecha y horario: una cuadrícula con las horas en un eje y los días o los recursos reservables en el otro; cada celda se ve libre u ocupada.
- Detalle: los datos de un registro en dos columnas etiqueta/valor, con sus acciones.
- Acceso (inicio de sesión): solo la tarjeta del formulario, con los campos que el sistema pide y un único botón "Entrar". Sin recuperar contraseña ni redes sociales. Solo si un requerimiento pide que los usuarios se registren, una línea al pie para crear una cuenta.
No agregues tarjetas de métricas, gráficos ni paneles de resumen que ningún requerimiento pida.`;

// Componentes ya definidos en el CSS de la aplicación: la IA debe usarlos tal cual, para que
// botones, campos, tablas y modales sean idénticos en todas las pantallas.
export const COMPONENTES = `COMPONENTES (ya existen en el CSS: úsalos con estas clases y NO los redefinas; así todas las pantallas son idénticas):
- Encabezado de la pantalla: <div class="pagina-encabezado"><div><h1>Título</h1><p>Apoyo opcional</p></div><div class="acciones">botones principales</div></div>
- Botones: class="btn" (secundario), "btn btn-primario" (la acción principal, uno por pantalla), "btn btn-peligro" (eliminar o cancelar algo existente), "btn-pequeno" en acciones de fila. Con icono: un <svg> de trazo fino antes del texto.
- Campos: <div class="campo"><label>Etiqueta</label><input|select|textarea></div>. Filtros: <div class="filtros"> con varios .campo.
- Aviso dentro de un modal o pantalla: <div class="aviso aviso-error|aviso-alerta|aviso-ok">Texto</div>.
- Tabla: <table class="tabla"><thead><tr><th>..</th></tr></thead><tbody>..</tbody></table>. Estados: <span class="insignia insignia-ok|insignia-alerta|insignia-error">Texto</span> o "insignia" sola para neutro.
- Tarjeta: <div class="tarjeta">.
- Listas: toda tabla o lista lleva debajo sus dos estados vacíos, ocultos por defecto con el atributo hidden: <div class="vacio" hidden>No hay clientes registrados. Registra el primero.</div> (no hay datos) y <div class="vacio" hidden>No se encontraron pedidos con esos filtros.</div> (los filtros no devuelven nada). Los textos nombran lo que lista la tabla.
- Orden y paginación: en las listas que pueden crecer (pedidos, movimientos, registros), los encabezados que se pueden ordenar son <th><button type="button" class="orden">Fecha ▾</button></th> y debajo de la tabla va <div class="paginacion"><span>Mostrando 1–10 de 48</span><div class="acciones"><button type="button" class="btn btn-pequeno" disabled>Anterior</button><button type="button" class="btn btn-pequeno">Siguiente</button></div></div>. Los catálogos pequeños no la necesitan.
- Modal (sin JavaScript para abrirlo): <input type="checkbox" class="modal-chk" id="m-ACCION"> y, JUSTO DESPUÉS, <div class="modal"><div class="modal-caja"><h2>Título</h2> contenido <div class="modal-pie">botones</div></div></div>. El botón que lo abre es <label for="m-ACCION" class="btn ...">; "Cancelar" y ✕ son <label for="m-ACCION" class="btn">. Un modal por acción, con un id distinto cada uno.
- Modal con formulario (crear, editar): dentro de modal-caja va <form onsubmit="event.preventDefault();document.getElementById('m-ACCION').checked=false;document.getElementById('t-ACCION').checked=true"> con los .campo y el pie <div class="modal-pie"><label for="m-ACCION" class="btn">Cancelar</label><button type="submit" class="btn btn-primario">Guardar</button></div>. Así el navegador valida los campos al guardar y el modal solo se cierra si todo es válido. Un modal de solo confirmar (cancelar un pedido, desactivar un registro) no lleva formulario: un texto de confirmación y los botones "Cancelar" (label for="m-ACCION") y la acción: <button type="button" class="btn btn-peligro" onclick="document.getElementById('m-ACCION').checked=false;document.getElementById('t-ACCION').checked=true">Cancelar pedido</button>.
- Mensaje de resultado (uno por acción que guarda, elimina, cancela o desactiva): <input type="checkbox" class="toast-chk" id="t-ACCION"> y, JUSTO DESPUÉS, <div class="toast aviso aviso-ok"><span>Cliente registrado</span><label for="t-ACCION">✕</label></div>. Aparece al terminar la acción, con el nombre del registro cuando aplique.
- Enlace a otra pantalla: <a href="#" data-pantalla="Nombre EXACTO de la pantalla" class="btn">Texto</a>. Usa siempre data-pantalla con el nombre exacto.
- Disposición: <div class="rejilla"> para tarjetas en columnas; en tablas, <td class="derecha"> para números e importes y <div class="acciones-fila"> para los botones de cada fila (alineados a la derecha).
- Si necesitas algo que no está arriba (una cuadrícula, una columna lateral), escríbelo en un <style> corto usando solo las variables var(--...) y var(--radio); no definas colores ni radios propios.

VALIDACIÓN DE DATOS (todo formulario, incluido el de inicio de sesión):
- Cada campo valida con atributos HTML5 según el atributo de la clase: String → required, maxlength razonable y pattern si el formato es evidente (ej. un identificador); int → type="number" step="1" min="1" (y max si hay un límite); Date → type="date"; Time → type="time"; bool → checkbox o select; datos que el usuario escoge de una lista → <select required>.
- Los límites salen de las reglas de negocio y los requerimientos (ej. si el negocio atiende de 08:00 a 20:00, los campos de hora llevan min="08:00" max="20:00" y step="3600"; si un servicio dura de 1 a 2 horas, la duración solo ofrece esas opciones). No inventes límites que nadie definió.
- Junto a cada campo con restricción, una ayuda corta con la regla: <span class="campo-ayuda">Entre 1 y 20 personas</span> y el mensaje de error: <span class="campo-error">Escribe una cantidad entre 1 y 20</span> (se muestra solo cuando el valor es inválido). Los mensajes dicen qué hacer, en pocas palabras.
- Las reglas de negocio que se comprueban al guardar (ej. un dato que ya existe, un registro con dependencias pendientes, un conflicto con otro registro) se muestran como un aviso fijo dentro del modal: <div class="aviso aviso-error">Texto de la regla</div>, solo en los modales donde ese requerimiento aplica.
- Inicio de sesión: el formulario lleva, oculto con hidden, <div class="aviso aviso-error" hidden>Identificador o contraseña incorrectos</div> encima del botón.
- Los campos obligatorios llevan "required" y su etiqueta termina en " *". El botón "Guardar" o "Entrar" es siempre type="submit" dentro del <form>.

CADA ELEMENTO DEBE FUNCIONAR (el front se construye leyendo este HTML: un botón sin destino rompe la pantalla):
- Ningún botón ni enlace decorativo. Cada uno hace exactamente una cosa: abre un modal (label for), navega a otra pantalla (data-pantalla con el nombre exacto), envía un formulario (type="submit") o ejecuta una acción de confirmación (modal de confirmar). Los demás botones, como los de orden y paginación, son type="button".
- Cada botón de acción lleva data-operacion="Clase.operacion" con la operación de la clase que ejecuta (ej. data-operacion="Pedido.cancelar"), y cada formulario data-operacion igual (ej. data-operacion="Cliente.registrar"). Solo operaciones que existan en el diagrama de clases.
- Todo modal que se abre existe en esta misma pantalla con su mismo id, y todo mensaje de resultado y estado vacío que se menciona existe en el HTML.
- Los campos llevan name con el nombre del atributo de la clase (ej. name="cantidadMaxima"), para que el front los conecte con los datos.

ESPACIADO Y ALINEACIÓN (la aplicación ya centra el contenido en un contenedor y separa cada bloque 20px):
- NO pongas max-width, márgenes automáticos, un contenedor centrado ni márgenes verticales entre bloques: los bloques (encabezado, filtros, tabla, tarjetas) ocupan todo el ancho del contenedor y quedan alineados al mismo borde izquierdo y derecho.
- El título va a la izquierda y la acción principal a la derecha del encabezado. Los textos a la izquierda; números, horas e importes a la derecha en tablas; los botones de cada fila y los de los modales, a la derecha.
- Separaciones solo con la escala de 8, 12, 16 y 24px (gap o padding), nunca valores sueltos. Las etiquetas y su campo van juntos; los campos de un mismo formulario tienen el mismo ancho.
- Si una cuadrícula o tabla es más ancha que la pantalla, que se desplace dentro de su propio recuadro (overflow-x: auto) y no estire la página.`;

// Reglas de negocio y respuestas de la entrevista: lo que fija datos de la interfaz (horarios,
// duraciones, qué ve cada rol). Se omite el resto del contexto, que ya está en el análisis.
export function contextoParaPantallas(contexto) {
  if (!contexto) return "";
  const partes = [];
  const reglas = Array.isArray(contexto.reglas) ? contexto.reglas.join("\n") : String(contexto.reglas || "").trim();
  if (reglas) partes.push(`Reglas de negocio (la interfaz debe respetarlas: horarios, duraciones, límites):\n${reglas}`);
  const respondidas = (contexto.entrevista || []).filter((p) => p.respuesta?.trim());
  if (respondidas.length) {
    partes.push(
      "Respuestas de la entrevista con el cliente (decisiones ya tomadas, respétalas):\n" +
        respondidas.map((p) => `P: ${p.pregunta}\nR: ${p.respuesta.trim()}`).join("\n")
    );
  }
  return partes.length ? `\n${partes.join("\n\n")}\n` : "";
}

// Diagrama de clases aprobado para el prompt: sin la directiva de tema ni los comentarios de la
// explicación, que no aportan. Las operaciones de cada clase son las acciones de la interfaz.
export function contextoClases(clases) {
  const codigo = String(clases || "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("%%"))
    .join("\n")
    .trim();
  return codigo
    ? `\nDiagrama de clases aprobado (dónde vive cada entidad). Los atributos son los datos de los formularios y tablas, y las operaciones de cada clase son las acciones (botones) que la interfaz debe ofrecer:\n${codigo}\n`
    : "";
}
