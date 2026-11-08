// Partes deterministas del paso "Frontend": orden por capas, revisión de cada archivo y archivo que
// falló en una compilación. Uso: node --test tests/frontend.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { archivosDeFrontend, plataformasDeFrontend, archivoQueFalloCompilacion } from "../lib/archivosFrontend.js";
import { validarFrontend } from "../lib/frontend.js";

const estructura = { archivos: [
  { ruta: "web/app/(panel)/page.js", pieza: "nextjs", tipo: "pagina" },
  { ruta: "web/app/componentes/Menu.js", pieza: "nextjs", tipo: "componente" },
  { ruta: "web/lib/datos/partes.js", pieza: "nextjs", tipo: "servicio" },
  { ruta: "web/package.json", pieza: "nextjs", tipo: "configuracion" },
  { ruta: "web/app/globals.css", pieza: "nextjs", tipo: "estilo" },
  { ruta: "movil/lib/main.dart", pieza: "flutter", tipo: "navegacion" },
  { ruta: "movil/pubspec.yaml", pieza: "flutter", tipo: "configuracion" },
  { ruta: "supabase/seed.sql", pieza: "supabase", tipo: "datos" },
] };

const ctx = (ruta, anteriores = []) => ({
  archivo: estructura.archivos.find((a) => a.ruta === ruta),
  carpeta: ruta.split("/")[0],
  anteriores,
  existentes: new Set([...estructura.archivos.map((a) => a.ruta), "web/lib/supabase/navegador.js"]),
});

test("los archivos de cada plataforma van por capas: configuración, estilo, servicios, componentes, páginas", () => {
  assert.deepEqual(archivosDeFrontend(estructura, "web").map((a) => a.ruta), ["web/package.json", "web/app/globals.css", "web/lib/datos/partes.js", "web/app/componentes/Menu.js", "web/app/(panel)/page.js"]);
  assert.deepEqual(plataformasDeFrontend(estructura), ["web", "movil"]);
});

test("una importación relativa debe existir en la estructura o en los archivos fijos", () => {
  const bueno = 'import Menu from "../componentes/Menu";\nimport { supabaseNavegador } from "../../lib/supabase/navegador";\nexport default function P() { return null; }';
  assert.deepEqual(validarFrontend(bueno, ctx("web/app/(panel)/page.js")), []);
  const malo = 'import X from "../componentes/Inventado";\nexport default function P() { return null; }';
  assert.match(validarFrontend(malo, ctx("web/app/(panel)/page.js")).join(" "), /Inventado/);
});

test("un componente con estado necesita \"use client\" y una página, export default", () => {
  const sinCliente = 'import { useState } from "react";\nexport default function Menu() { const [a] = useState(0); return a; }';
  assert.match(validarFrontend(sinCliente, ctx("web/app/componentes/Menu.js")).join(" "), /use client/);
  assert.deepEqual(validarFrontend(`"use client";\n${sinCliente}`, ctx("web/app/componentes/Menu.js")), []);
  assert.match(validarFrontend("function P() { return null; }", ctx("web/app/(panel)/page.js")).join(" "), /export default/);
});

test("un paquete importado debe estar en package.json", () => {
  const paquete = { ruta: "web/package.json", contenido: JSON.stringify({ dependencies: { next: "16", react: "19", "react-dom": "19" }, scripts: { build: "next build" } }) };
  const codigo = '"use client";\nimport SignatureCanvas from "react-signature-canvas";\nexport default function F() { return null; }';
  assert.match(validarFrontend(codigo, ctx("web/app/componentes/Menu.js", [paquete])).join(" "), /react-signature-canvas/);
  assert.deepEqual(validarFrontend(paquete.contenido, ctx("web/package.json")), []);
});

test("Flutter: las importaciones de la app deben existir y los paquetes estar en pubspec", () => {
  const pubspec = { ruta: "movil/pubspec.yaml", contenido: "name: bomberos_app\nenvironment:\n  sdk: \">=3.11.0 <4.0.0\"\ndependencies:\n  flutter:\n    sdk: flutter\n  supabase_flutter: ^2.0.0\n" };
  assert.deepEqual(validarFrontend(pubspec.contenido, ctx("movil/pubspec.yaml")), []);
  const codigo = "import 'package:flutter/material.dart';\nimport 'package:supabase_flutter/supabase_flutter.dart';\nimport 'package:bomberos_app/pantallas/no_existe.dart';\nimport 'package:geolocator/geolocator.dart';\nvoid main() {}";
  const problemas = validarFrontend(codigo, ctx("movil/lib/main.dart", [pubspec])).join(" ");
  assert.match(problemas, /no_existe\.dart/);
  assert.match(problemas, /geolocator/);
  assert.doesNotMatch(problemas, /supabase_flutter/);
});

test("de la salida de una compilación se saca el archivo que falló", () => {
  const plan = archivosDeFrontend(estructura, "web");
  const salida = "Creating an optimized production build...\nCompiled ./app/globals.css\nFailed to compile.\n./app/(panel)/page.js\nModule not found: Can't resolve '../componentes/Inventado'";
  assert.equal(archivoQueFalloCompilacion(salida, plan), "web/app/(panel)/page.js");
  assert.equal(archivoQueFalloCompilacion("lib/main.dart:12:5: Error: Undefined name 'x'.", archivosDeFrontend(estructura, "movil")), "movil/lib/main.dart");
  assert.equal(archivoQueFalloCompilacion("sin errores reconocibles", plan), null);
});
