import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearActores, formatearRequerimientos, formatearIndicaciones } from "@/lib/analisis";
import { PLATAFORMAS_SERVICIO } from "@/lib/plataformas";

export const maxDuration = 300;

// Diagrama de ARQUITECTURA en capas: tecnologías reales, protocolos en las flechas y pocas
// conexiones con sentido. El prompt sigue la estructura CONTEXTO / QUÉ DEBE MOSTRAR /
// QUÉ NO QUIERO / FORMATO. Después de generar, se valida el Mermaid y, si incumple las reglas,
// se pide una corrección (un solo reintento).

const MAX_NODOS = 14;
const MAX_FLECHAS = 12;
// El estilo de microservicios necesita más cajas y flechas (gateway, servicios, una base por servicio).
const MAX_NODOS_MICRO = 18;
const MAX_FLECHAS_MICRO = 16;

// Si el cliente también eligió un servidor propio, la plataforma es solo su base de datos o su
// proveedor de autenticación: el backend sigue siendo esa API.
const SERVIDOR_PROPIO = /express|nest\.?js|fastify|django|flask|fastapi|laravel|spring|\.net\b|rails|node\.?js|\bphp\b|golang/i;
// Palabras que identifican a un nodo como servicio de la plataforma (y no como módulo de negocio).
const SERVICIO_DE_PLATAFORMA = /\b(auth\w*|autenticacion|api|postgrest|graphql|realtime|functions?|funciones|messaging|hosting|cron|webhooks?)\b/i;
const ALMACEN_DE_DATOS = /storage|postgres(?!t)|firestore|base de datos/i; // PostgREST es la API, no la base

const sinTildes = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

function detectarPlataformaServicio(tecnologias) {
  const texto = String(tecnologias || "");
  if (SERVIDOR_PROPIO.test(texto)) return null;
  return PLATAFORMAS_SERVICIO.find((p) => p.patron.test(texto)) || null;
}

// Orden de las capas de arriba hacia abajo. Las flechas nunca deben ir de una capa inferior a una superior.
const ORDEN_CAPAS = { CLIENTES: 0, BACKEND: 1, DATOS: 2, EXTERNOS: 2 };

// Tres colores, uno por tipo de capa: clientes (blanco), backend (gris), datos (azul claro). Los
// servicios externos van en blanco con borde punteado, no son un color más.
const ESTILOS = `classDef cliente fill:#ffffff,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef backend fill:#eef2f6,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef datos fill:#dbeafe,stroke:#1e293b,color:#1e293b,stroke-width:1px;
    classDef externo fill:#ffffff,stroke:#1e293b,color:#1e293b,stroke-width:1px,stroke-dasharray:4 3;`;

// Ejemplos de sistemas AJENOS a cualquier proyecto real. Sirven solo para mostrar la sintaxis y el
// patrón de flechas. Los componentes NO deben copiarse.
const EJEMPLO_MONOLITO = `flowchart TD
    subgraph CLIENTES["Clientes"]
        WEB["Panel Web<br/>React"]
        MOVIL["App Móvil<br/>Flutter"]
    end

    subgraph BACKEND["Backend — API REST · Node.js / Express"]
        AUTH["Autenticación y Roles<br/>JWT"]
        RESERVAS["Reservas<br/>Cupos y horarios"]
        PAGOS["Pagos<br/>Cobros y recibos"]
        NOTIF["Notificaciones<br/>WebSocket"]
    end

    subgraph DATOS["Datos"]
        DB[("PostgreSQL")]
        ARCH["Archivos — Comprobantes<br/>Almacenamiento S3"]
    end

    subgraph EXTERNOS["Servicios Externos"]
        PASARELA["Pasarela de pagos<br/>Stripe"]
        CORREO["Correo<br/>SendGrid"]
    end

    WEB -->|"HTTPS/REST · JWT"| BACKEND
    MOVIL -->|"HTTPS/REST · JWT"| BACKEND
    WEB <-.->|"WebSocket"| NOTIF
    PAGOS -->|"confirma pago"| RESERVAS
    RESERVAS -->|"dispara aviso"| NOTIF
    BACKEND -->|"SQL"| DB
    PAGOS -->|"guarda comprobante"| ARCH
    PAGOS -->|"HTTPS"| PASARELA
    NOTIF -->|"SMTP"| CORREO

    ${ESTILOS}
    class WEB,MOVIL cliente
    class AUTH,RESERVAS,PAGOS,NOTIF backend
    class DB,ARCH datos
    class PASARELA,CORREO externo`;

const EJEMPLO_MICRO = `flowchart TD
    subgraph CLIENTES["Clientes"]
        WEB["Portal Web<br/>Vue"]
    end

    subgraph BACKEND["Backend — Microservicios"]
        GATEWAY["API Gateway<br/>JWT"]
        PRESTAMOS["Préstamos<br/>Go"]
        CATALOGO["Catálogo<br/>Node.js"]
        AVISOS["Avisos<br/>WebSocket"]
        BROKER["Broker de mensajes<br/>RabbitMQ"]
    end

    subgraph DATOS["Datos"]
        DB_PRE[("PostgreSQL<br/>Préstamos")]
        DB_CAT[("MongoDB<br/>Catálogo")]
    end

    WEB -->|"HTTPS/REST · JWT"| GATEWAY
    WEB <-.->|"WebSocket"| AVISOS
    GATEWAY -->|"HTTPS"| PRESTAMOS
    GATEWAY -->|"HTTPS"| CATALOGO
    PRESTAMOS -->|"Eventos"| BROKER
    BROKER -->|"Eventos"| AVISOS
    PRESTAMOS -->|"SQL"| DB_PRE
    CATALOGO -->|"API de documentos"| DB_CAT

    ${ESTILOS}
    class WEB cliente
    class GATEWAY,PRESTAMOS,CATALOGO,AVISOS,BROKER backend
    class DB_PRE,DB_CAT datos`;

const EJEMPLO_PLATAFORMA = `flowchart TD
    subgraph CLIENTES["Clientes"]
        WEB["Panel Web<br/>React"]
        MOVIL["App Móvil<br/>Flutter"]
    end

    subgraph BACKEND["Backend — Supabase"]
        AUTH["Auth<br/>JWT y roles"]
        API["API de datos<br/>PostgREST · políticas de acceso"]
        REALTIME["Realtime<br/>WebSocket"]
        FUNCIONES["Edge Functions<br/>Recordatorios de reserva"]
    end

    subgraph DATOS["Datos"]
        DB[("PostgreSQL")]
        ARCH["Archivos — Comprobantes<br/>Supabase Storage"]
    end

    subgraph EXTERNOS["Servicios Externos"]
        CORREO["Correo<br/>SendGrid"]
    end

    WEB -->|"HTTPS/REST · JWT"| BACKEND
    MOVIL -->|"HTTPS/REST · JWT"| BACKEND
    WEB <-.->|"WebSocket"| REALTIME
    API -->|"cambios en reservas"| REALTIME
    BACKEND -->|"SQL"| DB
    BACKEND -->|"guarda comprobantes"| ARCH
    FUNCIONES -->|"HTTPS"| CORREO

    ${ESTILOS}
    class WEB,MOVIL cliente
    class AUTH,API,REALTIME,FUNCIONES backend
    class DB,ARCH datos
    class CORREO externo`;

// Extrae el primer objeto JSON completo de la respuesta e ignora cualquier texto antes o después.
function limpiarJson(texto) {
  const s = String(texto || "").trim();
  const inicio = s.indexOf("{");
  if (inicio === -1) throw new Error("La IA no devolvió un JSON.");

  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < s.length; i++) {
    const c = s[i];
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === "{") profundidad++;
    else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return s.slice(inicio, i + 1);
    }
  }
  throw new Error("El JSON de la IA llegó incompleto.");
}

function limpiarMermaid(codigo) {
  return String(codigo || "")
    .trim()
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

const sumar = (a, b) => (typeof a === "number" || typeof b === "number" ? (a || 0) + (b || 0) : a);

// Los clientes salen de las plataformas elegidas. Si no hay ninguna reconocible, se asume un panel web.
function detectarClientes(plataformas) {
  const lista = (plataformas || []).map((p) => String(p).toLowerCase());
  const clientes = [];
  if (lista.some((p) => /web/.test(p))) clientes.push({ id: "WEB", nombre: "Panel Web" });
  if (lista.some((p) => /m[oó]vil|mobile|android|\bios\b/.test(p))) clientes.push({ id: "MOVIL", nombre: "App Móvil" });
  if (lista.some((p) => /escritorio|desktop/.test(p))) clientes.push({ id: "ESCRITORIO", nombre: "Aplicación de Escritorio" });
  if (!clientes.length) clientes.push({ id: "WEB", nombre: "Panel Web" });
  return clientes;
}

// Revisa el Mermaid generado (y su explicación) y devuelve la lista de problemas (vacía si todo está bien).
function validarDiagrama(codigo, { maxNodos, maxFlechas }, explicacion = "") {
  const problemas = [];
  if (!codigo) return ["El diagrama está vacío."];

  const lineas = codigo.split("\n").filter((l) => !l.trim().startsWith("%%"));
  const capaDe = {};
  const titulos = {};
  const etiquetas = {};
  const nodos = [];
  const conClase = new Set();
  const flechas = [];
  const pila = [];
  const reFlecha = /^([A-Za-z_]\w*)\s*(<?-{1,2}>|<?-\.+->|<?={2,}>)\s*(?:\|[^|]*\|\s*)?([A-Za-z_]\w*)/;

  for (const linea of lineas) {
    const t = linea.trim();

    const sub = t.match(/^subgraph\s+([A-Za-z_]\w*)(?:\s*\["([^"]*)"\])?/);
    if (sub) {
      const id = sub[1].toUpperCase();
      capaDe[sub[1]] = id;
      titulos[id] = sub[2] || "";
      pila.push(id);
      continue;
    }
    if (t === "end") {
      pila.pop();
      continue;
    }

    const cls = t.match(/^class\s+([\w,]+)\s+\w+/);
    if (cls) {
      cls[1].split(",").forEach((id) => conClase.add(id.trim()));
      continue;
    }

    const nodo = t.match(/^([A-Za-z_]\w*)\s*[\[\(\{]+"?([^"\]\)]*)/);
    if (nodo) {
      nodos.push(nodo[1]);
      etiquetas[nodo[1]] = nodo[2];
      if (pila.length) capaDe[nodo[1]] = pila[pila.length - 1];
      continue;
    }

    const f = t.match(reFlecha);
    if (f) flechas.push({ origen: f[1], op: f[2], destino: f[3] });
  }

  if (nodos.length > maxNodos) problemas.push(`Tiene ${nodos.length} nodos y el máximo es ${maxNodos}: agrupa módulos afines.`);
  if (flechas.length > maxFlechas) problemas.push(`Tiene ${flechas.length} flechas y el máximo es ${maxFlechas}: elimina las que no sean esenciales.`);

  for (const f of flechas) {
    const co = ORDEN_CAPAS[capaDe[f.origen]];
    const cd = ORDEN_CAPAS[capaDe[f.destino]];
    if (co !== undefined && cd !== undefined && co > cd && !f.op.startsWith("<")) {
      problemas.push(`La flecha ${f.origen} → ${f.destino} va de una capa inferior a una superior; invierte su dirección.`);
    }
  }

  // El almacenamiento local es una base de datos en el dispositivo: no llama a nadie. Quien
  // sincroniza con el backend es la app.
  const esLocal = (id) => capaDe[id] === "CLIENTES" && (id === "LOCAL" || /sqlite|almacenamiento local/i.test(etiquetas[id] || ""));
  for (const f of flechas.filter((x) => esLocal(x.origen) && capaDe[x.destino] !== "CLIENTES")) {
    problemas.push(`El almacenamiento local ${f.origen} no puede tener una flecha hacia ${f.destino}: es una base de datos en el dispositivo y no hace llamadas. Quita esa flecha y agrega "sincroniza" a la etiqueta de la flecha de la app hacia el backend.`);
  }

  const sinClase = nodos.filter((id) => !conClase.has(id));
  if (sinClase.length) problemas.push(`Nodos sin clase asignada: ${sinClase.join(", ")}.`);

  const texto = lineas.join("\n");
  if (/\bRN?F\s?-?\d+\b/i.test(texto)) problemas.push("Hay códigos de requerimientos (RF/RNF) dentro del diagrama; elimínalos.");
  if (/(Framework Web|REST API|Servicio Auth|Base de datos relacional|Servidor de aplicaciones)/i.test(texto)) {
    problemas.push("Hay categorías genéricas usadas como tecnología; usa nombres propios (React, Node.js, PostgreSQL...).");
  }
  if (/\d+\s?ms\b/i.test(texto)) problemas.push("Hay métricas de rendimiento en las etiquetas; las etiquetas solo describen protocolo o acción.");

  // Todo módulo de tiempo real debe recibir una flecha de otro módulo del backend (qué evento lo dispara).
  const tiempoReal = nodos.filter((id) => /websocket|tiempo real/i.test(etiquetas[id] || ""));
  for (const id of tiempoReal) {
    const alimentado = flechas.some((f) => f.destino === id && capaDe[f.origen] === "BACKEND");
    if (!alimentado) {
      problemas.push(`El módulo de tiempo real ${id} no recibe ninguna flecha de otro módulo: indica qué evento lo dispara (ej. INVENTARIO → ${id}, etiqueta "stock bajo").`);
    }
  }

  // Backend como servicio (Supabase, Firebase...): dentro de BACKEND solo van servicios de la
  // plataforma. Se reconoce por el título del subgraph, así vale también si la IA propuso el stack.
  const plataforma = PLATAFORMAS_SERVICIO.find((p) => p.patron.test(titulos.BACKEND || ""));
  if (plataforma && !/microservicios/i.test(titulos.BACKEND)) {
    const etiqueta = (id) => sinTildes(etiquetas[id]);
    const nombreDe = (id) => `"${(etiquetas[id] || id).split(/<br\s*\/?>/i)[0].trim()}"`;
    const delBackend = nodos.filter((id) => capaDe[id] === "BACKEND");

    if (/[(,]/.test(titulos.BACKEND) || ALMACEN_DE_DATOS.test(titulos.BACKEND)) {
      problemas.push(`El título de BACKEND debe ser solo "Backend — ${plataforma.nombre}": sin enumerar sus servicios ni repetir la base de datos o el almacenamiento, que van en la capa Datos.`);
    }

    const repetidos = delBackend.filter((id) => ALMACEN_DE_DATOS.test(etiqueta(id)));
    if (repetidos.length) {
      problemas.push(`${repetidos.map(nombreDe).join(", ")}: la base de datos y el almacenamiento de archivos van una sola vez, en la capa Datos, no como nodos de BACKEND.`);
    }

    const deNegocio = delBackend.filter((id) => !repetidos.includes(id) && !SERVICIO_DE_PLATAFORMA.test(etiqueta(id)));
    if (deNegocio.length) {
      problemas.push(`${deNegocio.map(nombreDe).join(", ")}: ${deNegocio.length > 1 ? "son módulos" : "es un módulo"} de negocio, no ${deNegocio.length > 1 ? "servicios" : "un servicio"} de ${plataforma.nombre}. Con ${plataforma.nombre} no hay servidor propio: dentro de BACKEND deja solo los servicios de la plataforma (${plataforma.servicios}), con su nombre real.`);
    }

    // Un servicio externo solo puede llamarlo quien ejecuta código: un cliente o un servicio de funciones.
    for (const f of flechas.filter((x) => capaDe[x.destino] === "EXTERNOS")) {
      const desdeCliente = capaDe[f.origen] === "CLIENTES";
      const desdeFunciones = capaDe[f.origen] === "BACKEND" && /\b(functions?|funciones)\b/i.test(etiqueta(f.origen));
      if (!desdeCliente && !desdeFunciones) {
        problemas.push(`El servicio externo ${nombreDe(f.destino)} se conecta desde ${f.origen}, que no ejecuta código: conéctalo desde el cliente que usa su SDK (ej. mapas) o desde el servicio de funciones que lo llama.`);
      }
    }
  }

  // La explicación no puede usar adjetivos de calidad ni cifras que el diagrama no muestra.
  if (/(ultrarr[aá]pid|escalab|robust|mantenib|\d+\s?ms\b)/i.test(String(explicacion || ""))) {
    problemas.push('La explicación usa adjetivos de calidad o cifras (ultrarrápido, escalable, robusto, "500 ms"...); describe solo qué hace cada componente y cómo se comunican.');
  }

  return problemas;
}

async function generar(contents, usarClaude) {
  const response = await generarContenido({
    usarClaude,
    contents,
    config: { responseMimeType: "application/json" },
  });
  const resultado = JSON.parse(limpiarJson(response.text));
  return { response, resultado };
}

export async function POST(request) {
  try {
    const {
      nombre,
      descripcion,
      analisis,
      diagramaEr,
      arbolNavegacion,
      plataformas,
      tecnologias,
      calidad,
      indicaciones,
      estilo, // opcional: "monolito" (por defecto) o "microservicios"
      usarClaude,
    } = await request.json();

    const a = analisis || {};
    const micro = estilo === "microservicios";
    const plataforma = micro ? null : detectarPlataformaServicio(tecnologias);
    const maxNodos = micro ? MAX_NODOS_MICRO : MAX_NODOS;
    const maxFlechas = micro ? MAX_FLECHAS_MICRO : MAX_FLECHAS;

    const clientes = detectarClientes(plataformas);
    const conMovil = clientes.some((c) => c.id === "MOVIL");
    const clientesContexto =
      clientes.length > 1
        ? `${clientes.map((c) => c.nombre.toUpperCase()).join(" y ")} (son clientes distintos)`
        : clientes[0].nombre.toUpperCase();
    const clientesCapa = clientes.map((c) => `${c.id} (${c.nombre})`).join(", ");

    const bloqueBackend = plataforma
      ? `2. BACKEND["Backend — ${plataforma.nombre}"]: el backend ES la plataforma ${plataforma.nombre}; no existe un servidor propio. Un nodo por cada SERVICIO de la plataforma que este sistema usa, con su nombre real (${plataforma.servicios}) y, como subtítulo, el mecanismo o para qué lo usa este sistema (ej. "Auth<br/>JWT y roles", "Realtime<br/>WebSocket"). Solo los servicios que los requerimientos justifican. El título del subgraph lleva solo el nombre de la plataforma.
   PROHIBIDO poner módulos de negocio dentro de BACKEND (ej. "Ventas", "Inventario", "Firma de documentos"): con ${plataforma.nombre} esa lógica vive en los clientes, en las reglas de acceso de la base de datos o en un servicio de funciones.`
      : micro
      ? `2. BACKEND["Backend — Microservicios"]: un nodo GATEWAY ("API Gateway") y un nodo por microservicio de negocio (máximo 6; agrupa servicios afines). Si los servicios se comunican por eventos, agrega un nodo BROKER. Agrega servicios transversales SOLO si los requerimientos los justifican: Tiempo Real, Notificaciones, Auditoría, Reportes/PDF, Sincronización.`
      : `2. BACKEND["Backend — <tipo de API> · <tecnología del servidor>"]: UN solo subgraph que representa la API, con un nodo por módulo de negocio relevante (agrupa módulos afines con un guion largo, ej. "Inventario — Catálogo y Stock"). Agrega componentes transversales SOLO si los requerimientos los justifican: Tiempo Real, Notificaciones, Auditoría, Reportes/PDF, Sincronización.`;

    const reglaCobertura = plataforma
      ? `   Las funciones del negocio NO se dibujan como módulos (se ven en el árbol de navegación y en el diagrama de sistemas): aquí solo se muestra con qué servicios se construye.`
      : `   Cobertura: cada requerimiento funcional debe quedar cubierto por algún módulo. Si un módulo agrupa varios, su título nombra cada proceso (ej. "Inventario y Transferencias", "Ventas, Caja y Promociones"); un proceso importante como transferencias, devoluciones o reportes no se oculta dentro de otro módulo sin nombrarlo. Tienes hasta ${maxNodos} nodos: no omitas funciones por brevedad.`;

    const bloqueDatos = plataforma
      ? `3. DATOS["Datos"]: la base de datos y el almacenamiento de archivos de la plataforma (${plataforma.datos}), solo los que el sistema usa y cada uno UNA sola vez: no los repitas como nodo de BACKEND ni en su título.`
      : micro
      ? `3. DATOS["Datos"]: una base de datos por cada servicio que persiste información (nómbrala con el servicio, ej. "PostgreSQL<br/>Préstamos"); archivos si se guardan fotos, firmas o documentos; respaldos si hay copias de seguridad.`
      : `3. DATOS["Datos"]: la base de datos; archivos si se guardan fotos, firmas o documentos; caché solo si los requerimientos de rendimiento lo justifican; respaldos si hay copias de seguridad.`;

    const reglasEspecificas = plataforma
      ? `- Cada cliente tiene UNA sola flecha hacia el subgraph BACKEND (no una por servicio), con el protocolo y la seguridad en la etiqueta, ej. "HTTPS/REST · JWT".
- BACKEND tiene UNA sola flecha hacia la base de datos, con el protocolo según el motor ("SQL" si es relacional; "API de documentos" o equivalente si no), y UNA hacia los archivos si existen, con lo que se guarda (ej. "guarda comprobantes").
- Entre servicios de la plataforma: SOLO relaciones reales, máximo 3, con un verbo corto (ej. API -->|"cambios en reservas"| REALTIME). No dibujes dependencias de negocio entre ellos.
- Un servicio externo se conecta desde quien de verdad lo llama: desde el CLIENTE si es un SDK que corre en la app (mapas, cámara, pagos en la app) o desde el servicio de funciones si se llama desde el servidor (enviar correo o notificaciones push). Nunca desde un servicio que no ejecuta código (Auth, API de datos, Realtime).`
      : micro
      ? `- Cada cliente tiene UNA sola flecha hacia GATEWAY, con el protocolo y la seguridad en la etiqueta, ej. "HTTPS/REST · JWT".
- GATEWAY tiene una flecha "HTTPS" hacia cada servicio que expone.
- Cada servicio que persiste datos tiene UNA flecha hacia su propia base en DATOS, con el protocolo según el motor ("SQL" si es relacional; "API de documentos" o equivalente si no).
- Entre servicios: máximo 4 comunicaciones reales, con "HTTPS" (llamada directa) o "Eventos" (a través del broker, si existe). Nunca conectes todos con todos.`
      : `- Cada cliente tiene UNA sola flecha hacia el subgraph BACKEND (no una por módulo), con el protocolo y la seguridad en la etiqueta, ej. "HTTPS/REST · JWT".
- BACKEND tiene UNA sola flecha hacia la base de datos, con el protocolo según el motor ("SQL" si es relacional; "API de documentos" o equivalente si no). Nunca una flecha por módulo.
- Entre módulos del backend: SOLO dependencias reales de negocio (ej. ventas → inventario), máximo 4, con un verbo corto como etiqueta (ej. "descuenta stock").
- Caché (solo si existe): el módulo que la lee y el módulo que modifica los datos se conectan a ella, con las etiquetas "consulta" y "actualiza". Una caché que nadie actualiza no es válida.`;

    const instrucciones = `
Genera un DIAGRAMA DE ARQUITECTURA en capas para "${nombre || "el sistema"}".

Un diagrama de arquitectura muestra CÓMO está construido el sistema: sus capas, las tecnologías REALES de cada componente y los protocolos con que se comunican. No es un árbol de módulos ni un mapa de funciones. Debe leerse en 10 segundos: pocas cajas, pocas flechas, todas con sentido.

CONTEXTO
- Qué hace el sistema: ${descripcion?.trim() || "ver los requerimientos funcionales"}
- Actores:
${formatearActores(a)}
- Clientes del sistema: ${clientesContexto}
- Estilo de arquitectura: ${plataforma ? `BACKEND COMO SERVICIO (${plataforma.nombre}): no hay servidor propio; los clientes usan directamente los servicios de la plataforma` : micro ? "MICROSERVICIOS (gateway, servicios independientes, una base por servicio)" : "API única por capas (los módulos viven dentro de un solo backend)"}
- Tecnologías elegidas por el cliente: ${tecnologias?.trim() || "no definidas"}
${calidad?.length ? `- Atributos de calidad prioritarios para el cliente: ${calidad.join(", ")}\n` : ""}- Requerimientos funcionales (úsalos para decidir los módulos; NO los escribas en el diagrama):
${formatearRequerimientos(a.requerimientos_funcionales)}
- Requerimientos no funcionales (los de prioridad alta deben notarse en la arquitectura, ver "CÓMO SE REFLEJAN LOS REQUERIMIENTOS NO FUNCIONALES"):
${formatearRequerimientos(a.requerimientos_no_funcionales, { conCategoria: true })}
${diagramaEr ? `- Modelo de datos aprobado (los módulos del backend deben ser coherentes con sus entidades):\n${diagramaEr}\n` : ""}${arbolNavegacion ? `- Árbol de navegación aprobado (los módulos deben ser coherentes con sus secciones):\n${arbolNavegacion}\n` : ""}${formatearIndicaciones(indicaciones)}
QUÉ DEBE MOSTRAR
Cuatro capas de arriba hacia abajo, cada una como subgraph:
1. CLIENTES["Clientes"]: ${clientesCapa}${conMovil ? " y, si hay uso sin conexión, LOCAL (Almacenamiento Local)" : ""}.
${bloqueBackend}
${reglaCobertura}
${bloqueDatos}
4. EXTERNOS["Servicios Externos"], solo si los requerimientos los piden de forma explícita (mapas, notificaciones push, correo o SMS, firma electrónica, sistemas de otras instituciones). "Pagos" o "caja" NO implican una pasarela de pagos: inclúyela solo si piden cobro en línea o integración con un proveedor de pagos. Si hay duda, no lo incluyas.

TECNOLOGÍAS
${tecnologias?.trim()
  ? `- Usa EXACTAMENTE las tecnologías elegidas por el cliente (${tecnologias.trim()}). Si una capa no tiene tecnología definida, completa con la opción más común y compatible con el resto, y en la ÚLTIMA línea de "explicacion" escribe: "Tecnologías sugeridas (no definidas por el cliente): ..." con solo las que completaste.`
  : `- El cliente no definió tecnologías: propón un stack común y coherente con las plataformas, con nombres reales de productos (un framework web concreto, un servidor o runtime concreto, un motor de base de datos concreto). En la ÚLTIMA línea de "explicacion" escribe: "Tecnologías sugeridas (no definidas por el cliente): ...".`}
- PROHIBIDO usar categorías como si fueran tecnologías: "Framework Web", "REST API", "Servicio Auth", "Base de datos relacional", "Servidor de aplicaciones". Cada subtítulo debe ser un nombre propio (React, Node.js / Express, PostgreSQL...) o un mecanismo concreto (JWT, WebSocket).
- Si todo el backend usa la misma tecnología, ponla UNA sola vez en el título del subgraph BACKEND. En cada módulo pon como subtítulo solo lo que lo distingue (JWT, WebSocket, Edge Functions) o un alcance corto (ej. "Cupos y horarios"), sin repetir la tecnología del servidor.
- Si el backend es una plataforma como servicio (Supabase, Firebase, Appwrite), NO hay servidor propio: dentro de BACKEND van solo los servicios de la plataforma con su nombre real (Auth, API de datos, Realtime, funciones), nunca módulos de negocio; su base de datos y su almacenamiento de archivos van una sola vez, en DATOS; y el título es solo "Backend — <plataforma>".

REGLAS DE FLECHAS (son lo más importante)
${reglasEspecificas}
- Todas las flechas entre capas apuntan HACIA ABAJO (Clientes → Backend → Datos y Externos). Nunca dibujes una flecha de una capa inferior hacia una superior: rompe el orden vertical del diagrama.
- Tiempo real (alertas, chat, ubicación en vivo): UNA flecha PUNTEADA y bidireccional (<-.->) con el CLIENTE como origen y el módulo del servidor como destino, con la etiqueta "WebSocket". Ejemplo: WEB <-.->|"WebSocket"| NOTIF. El cliente abre la conexión y ambos lados envían mensajes.
- Todo módulo de tiempo real recibe además al menos UNA flecha del módulo que genera el evento, con un verbo corto (ej. INVENTARIO -->|"stock bajo"| ALERTAS). Un módulo de alertas sin origen es inválido.
${conMovil ? `- LOCAL (almacenamiento local) solo recibe UNA flecha desde su app (ej. MOVIL -->|"guarda sin conexión"| LOCAL) y nunca es origen de una flecha: es una base de datos en el dispositivo y no llama al backend. La sincronización la hace la app, por su propia flecha.\n` : ""}- Cada servicio externo se conecta desde el módulo que lo usa; los archivos, desde el módulo que los genera o lee.
- Las etiquetas de las flechas describen el protocolo o la acción ("HTTPS/REST", "SQL", "consulta", "actualiza stock"), nunca métricas, versiones ni requisitos.
- Máximo ${maxFlechas} flechas en total. No dibujes flechas de ida y vuelta duplicadas (la única excepción es el WebSocket) ni conectes todo con todo.

CÓMO SE REFLEJAN LOS REQUERIMIENTOS NO FUNCIONALES
- Seguridad: JWT y roles en la etiqueta de la flecha del cliente y en el módulo de autenticación.
- Tiempo real: ${plataforma ? "servicio de tiempo real de la plataforma" : "módulo"} con WebSocket y flecha bidireccional punteada desde el cliente.
- Rendimiento (búsquedas o lecturas rápidas): nodo de caché en Datos, conectado como indica la regla de caché. La métrica NO se escribe.
${plataforma
  ? `- Uso sin conexión: LOCAL en Clientes; la app sincroniza al reconectarse (agrega "sincroniza" a la etiqueta de su flecha hacia BACKEND). Un nodo de sincronización solo si la hace un servicio de funciones.
- Trazabilidad o bitácora: se guarda en la base de datos; no se dibuja como módulo.`
  : `- Uso sin conexión: LOCAL en Clientes y un módulo de Sincronización.
- Trazabilidad o bitácora: módulo de Auditoría.`}
- Respaldos: nodo en la capa de Datos con una flecha desde la base de datos (etiqueta "respaldo").
- Si un atributo no se puede dibujar con un componente concreto (ej. "alta disponibilidad" sin réplicas ni balanceador), NO lo afirmes en el diagrama ni en la explicación.

QUÉ NO QUIERO
- No pongas códigos de requerimientos (RF/RNF) en ningún nodo, ni detalles de código, tablas o endpoints.
- No inventes componentes, servicios externos ni conexiones que el contexto no justifique.
- No inventes versiones ni parámetros (TLS 1.3, tiempos en ms, nombres de planes): usa solo "HTTPS", "SQL", etc.
- No copies los componentes del ejemplo; es de otro sistema y sirve solo para mostrar la sintaxis y el patrón de flechas.

FORMATO
- Mermaid "flowchart TD" (vertical).
- Máximo ${maxNodos} nodos (sin contar los subgraph): agrupa módulos afines si hacen falta más.
- Ids en MAYÚSCULAS sin espacios ni tildes (WEB, MOVIL, AUTH, DB...; se permite el guion bajo: DB_PAGOS). Textos entre comillas dobles, cortos, sin párrafos; <br/> para el salto de línea. La base de datos con forma de cilindro: DB[("Nombre")].
- Los ids de los subgraph son exactamente CLIENTES, BACKEND, DATOS y EXTERNOS.
- Máximo 3 colores, uno por tipo de capa. Define al final EXACTAMENTE estas clases y asigna cada nodo a la de su capa (externo: mismo blanco, borde punteado):
    ${ESTILOS}
- En "explicacion", de 3 a 5 líneas cortas (una idea por línea, separadas con \\n) sobre lo que muestra el diagrama: cómo se reparten las responsabilidades y qué decisiones técnicas responden a los requerimientos no funcionales. Solo afirma lo que el diagrama muestra y no menciones componentes que no dibujaste. No uses adjetivos de calidad (ultrarrápido, escalable, robusto, mantenible) ni cifras o tiempos (ej. "500 ms"): describe qué componente hace qué y cómo se comunican.

VERIFICACIÓN ANTES DE RESPONDER
1. No hay más de ${maxNodos} nodos ni más de ${maxFlechas} flechas.
2. Ningún nodo contiene códigos RF/RNF, categorías genéricas como tecnología ni métricas.
3. Cada cliente llega al backend con una sola flecha${micro ? " (al GATEWAY)" : ""} y no hay flechas por módulo hacia la base de datos.
4. Todos los ids usados en "class" existen y cada nodo tiene su clase.
5. La flecha de tiempo real es punteada, bidireccional y tiene al cliente como origen.
6. Ninguna flecha va de una capa inferior a una superior.
7. Todo servicio externo y toda caché están justificados por los requerimientos.
8. Cada módulo de tiempo real recibe una flecha de otro módulo del backend.
9. ${plataforma ? `Dentro de BACKEND solo hay servicios de ${plataforma.nombre}, ningún módulo de negocio, y la base de datos y los archivos aparecen una sola vez.` : "Cada grupo de requerimientos funcionales está cubierto por el título de algún módulo."}

Ejemplo de sintaxis y patrón de flechas válidos (sistema ajeno, no copiar sus componentes):
${plataforma ? EJEMPLO_PLATAFORMA : micro ? EJEMPLO_MICRO : EJEMPLO_MONOLITO}

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional ni bloques de código:
{
  "diagrama_mermaid": "código mermaid completo aquí, como un solo string",
  "explicacion": "línea 1\\nlínea 2\\nlínea 3"
}
`;

    const limites = { maxNodos, maxFlechas };

    const inicial = await generar(instrucciones, usarClaude);
    let resultado = inicial.resultado;
    let response = inicial.response;
    let diagrama = limpiarMermaid(resultado.diagrama_mermaid);
    let problemas = validarDiagrama(diagrama, limites, resultado.explicacion);
    let costo = response.costoUsd;

    // Un solo reintento: se le muestran a la IA los problemas concretos y su diagrama anterior.
    if (problemas.length) {
      try {
        const reintento = await generar(
          `${instrucciones}

TU RESPUESTA ANTERIOR NO CUMPLIÓ ESTAS REGLAS:
${problemas.map((p) => `- ${p}`).join("\n")}

Diagrama anterior:
${diagrama}

Corrígelo cumpliendo TODAS las reglas y responde de nuevo con el mismo JSON.`,
          usarClaude
        );
        const diagramaNuevo = limpiarMermaid(reintento.resultado.diagrama_mermaid);
        const problemasNuevos = validarDiagrama(diagramaNuevo, limites, reintento.resultado.explicacion);
        costo = sumar(costo, reintento.response.costoUsd);
        if (problemasNuevos.length <= problemas.length) {
          resultado = reintento.resultado;
          response = reintento.response;
          diagrama = diagramaNuevo;
          problemas = problemasNuevos;
        }
      } catch {
        // Si el reintento falla, se conserva el primer resultado.
      }
    }

    return NextResponse.json({
      ...resultado,
      diagrama_mermaid: diagrama,
      advertencias: problemas,
      modelo_ia: response.modelVersion,
      costo_ia: costo,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}