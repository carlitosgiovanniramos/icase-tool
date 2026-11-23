// "Editar con IA" en el explorador: el frontend y el backend reciben la instrucción y el código actual, y
// la IA debe conservar lo que la instrucción no cambia. Uso: node --test --experimental-test-module-mocks tests/editar-con-ia.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";

let prompt = "";
let respuesta = "export default function Login() { return null; }\n";
mock.module("../lib/gemini.js", {
  namedExports: {
    generarContenido: async ({ contents }) => {
      prompt = contents[0].text;
      return { text: respuesta, modelVersion: "simulado", costoUsd: 0 };
    },
  },
});
const { generarArchivoFrontend } = await import("../lib/frontend.js");
const { generarArchivoBackend } = await import("../lib/backend.js");

const analisis = { actores: [{ nombre: "Bombero" }], requerimientos_funcionales: [{ codigo: "RF02", nombre: "Autenticación", descripcion: "Ingresa con su cuenta" }] };

test("el frontend agrega la instrucción y el código actual al prompt", async () => {
  const estructura = { archivos: [{ ruta: "web/app/login/page.js", pieza: "nextjs", tipo: "pagina", proposito: "Inicio de sesión", pantallas: ["Login"], requerimientos: ["RF02"] }] };
  await generarArchivoFrontend({
    nombre: "Demo", estructura, plataforma: "web", archivo: "web/app/login/page.js", stack: { piezas: [{ pieza: "nextjs" }] }, analisis,
    contrato: { operaciones: [], acciones: [] }, pantallas: [], anteriores: [],
    actual: "export default function Login() { return <p>viejo</p>; }", instruccion: "agrega un botón Salir",
  });
  assert.match(prompt, /TAREA: modifica el archivo actual según la instrucción del usuario/);
  assert.match(prompt, /agrega un botón Salir/);
  assert.match(prompt, /<p>viejo<\/p>/);
});

test("sin instrucción, el frontend no pide modificar nada", async () => {
  const estructura = { archivos: [{ ruta: "web/app/login/page.js", pieza: "nextjs", tipo: "pagina", proposito: "Inicio de sesión", pantallas: ["Login"], requerimientos: ["RF02"] }] };
  await generarArchivoFrontend({
    nombre: "Demo", estructura, plataforma: "web", archivo: "web/app/login/page.js", stack: { piezas: [{ pieza: "nextjs" }] }, analisis,
    contrato: { operaciones: [], acciones: [] }, pantallas: [], anteriores: [],
  });
  assert.doesNotMatch(prompt, /TAREA: modifica el archivo actual/);
});

test("el backend agrega la instrucción y el código actual al prompt", async () => {
  const estructura = { archivos: [{ ruta: "supabase/functions/crear-usuario/index.ts", pieza: "supabase", tipo: "funcion", proposito: "Crear usuarios", requerimientos: ["RF02"] }] };
  await generarArchivoBackend({
    nombre: "Demo", estructura, archivo: "supabase/functions/crear-usuario/index.ts", analisis, stack: { piezas: [{ pieza: "supabase" }] },
    contrato: { operaciones: [] }, sql: [], anteriores: [],
    actual: "Deno.serve(() => new Response('viejo'));", instruccion: "devuelve 409 si el correo ya existe",
  });
  assert.match(prompt, /TAREA: modifica el archivo actual según la instrucción del usuario/);
  assert.match(prompt, /devuelve 409 si el correo ya existe/);
  assert.match(prompt, /new Response\('viejo'\)/);
});

test("documentación: separar y unir una página redactada no cambia nada, y el anexo de los datos se conserva", async () => {
  const { componerPagina, separarPagina, unirPagina } = await import("../lib/documentacion.js");
  const p = { titulo: "Arquitectura", posicion: 1, slug: "/desarrolladores/arquitectura", anexo: "## Librerías\n\n| Paquete | Para qué |\n|---|---|\n| `next` | Web |" };
  const guardada = componerPagina(p, "## Visión general\n\nTexto de la IA.");
  const partes = separarPagina(guardada, p.anexo);
  assert.equal(partes.texto, "## Visión general\n\nTexto de la IA.");
  assert.match(partes.anexo, /\| `next` \| Web \|/);
  assert.equal(unirPagina(partes, partes.texto), guardada); // ida y vuelta idéntica
  const nueva = unirPagina(partes, "## Visión general\n\nTexto nuevo.");
  assert.match(nueva, /^---\ntitle: "Arquitectura"/); // conserva el encabezado
  assert.match(nueva, /Texto nuevo\./);
  assert.match(nueva, /\| `next` \| Web \|/); // y el anexo, igual

  // Sin anexo encontrado (otro plan de diagramas): todo lo que sigue al encabezado es texto.
  const sin = separarPagina(guardada, "## Otra cosa");
  assert.equal(sin.anexo, "");
  assert.match(sin.texto, /Librerías/);
});

test("documentación: el prompt de edición lleva la instrucción, el texto actual y los datos aprobados", async () => {
  const { modificarPaginaDocumentacion } = await import("../lib/documentacionIA.js");
  respuesta = "## Cómo ingresar\n\nDesde el celular, abra **Iniciar sesión** y pulse **Ingresar**. Desde el computador, el recorrido es el mismo y la sesión se mantiene al recargar la página.";
  const r = await modificarPaginaDocumentacion({
    pagina: { titulo: "Primeros pasos", datos: { nombre: "Demo", pantallas_de_acceso: [{ nombre: "Iniciar sesión" }] } },
    actual: "## Cómo ingresar\n\nTexto viejo",
    instruccion: "explica primero el acceso desde el celular",
  });
  assert.match(prompt, /explica primero el acceso desde el celular/);
  assert.match(prompt, /Texto viejo/);
  assert.match(prompt, /"pantallas_de_acceso"/);
  assert.match(prompt, /Tablas, imágenes o diagramas nuevos/);
  assert.match(r.contenido, /Desde el celular/);

  respuesta = "## Corta";
  await assert.rejects(() => modificarPaginaDocumentacion({ pagina: { titulo: "x", datos: {} }, actual: "a", instruccion: "b" }), /demasiado corta/);
  await assert.rejects(() => modificarPaginaDocumentacion({ pagina: { titulo: "x", datos: {} }, actual: "", instruccion: "a" }), /Falta la página/);
});
