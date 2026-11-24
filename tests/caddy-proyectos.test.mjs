// Archivos de Caddy de los proyectos: dos que declaran el mismo sitio impiden arrancar a Caddy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { direccionesDeSitios, archivosEnConflicto } from "../lib/caddyProyectos.js";

const archivo = (id, puertos) =>
  `# Proyecto ${id}: lo escribe el runner al levantarlo.\n` +
  puertos.map((p, i) => `# VAR${i}_PORT\nicase-tool.chilecentral.cloudapp.azure.com:${p + 10000} {\n\treverse_proxy 127.0.0.1:${p}\n}\n`).join("\n");

test("lee las direcciones de sitio y no confunde comentarios ni reverse_proxy", () => {
  assert.deepEqual(direccionesDeSitios(archivo("a", [3000, 8000])), [
    "icase-tool.chilecentral.cloudapp.azure.com:13000",
    "icase-tool.chilecentral.cloudapp.azure.com:18000",
  ]);
  assert.deepEqual(direccionesDeSitios(""), []);
  assert.deepEqual(direccionesDeSitios("# solo un comentario\n"), []);
});

test("detecta el archivo de otro proyecto que declara el mismo puerto público", () => {
  const nuevas = direccionesDeSitios(archivo("nuevo", [3000, 8000]));
  const archivos = [
    { nombre: "bomberos.caddy", contenido: archivo("bomberos", [3000, 8090]) }, // choca en 13000
    { nombre: "reserva.caddy", contenido: archivo("reserva", [3100]) }, // no choca
    { nombre: "vacio.caddy", contenido: "" },
  ];
  assert.deepEqual(archivosEnConflicto(archivos, nuevas), ["bomberos.caddy"]);
});

test("sin choques no quita nada, y distingue mayúsculas del nombre de host", () => {
  const archivos = [{ nombre: "a.caddy", contenido: archivo("a", [4000]) }];
  assert.deepEqual(archivosEnConflicto(archivos, direccionesDeSitios(archivo("n", [3000]))), []);
  assert.deepEqual(archivosEnConflicto(archivos, ["ICASE-TOOL.chilecentral.cloudapp.azure.com:14000"]), ["a.caddy"]);
});
