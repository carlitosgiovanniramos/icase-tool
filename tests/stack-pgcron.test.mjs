// pg_cron viene dentro de la pieza Supabase: el componente del diagrama de sistemas se resuelve solo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverComponentes } from "../lib/stack.js";
import { catalogo } from "../lib/implementacion.js";

test("un componente pg_cron se implementa con la pieza supabase", async () => {
  const fichas = await catalogo({ incluirInternas: true });
  const componentes = [
    { nombre: "pg_cron de cancelaciones y vencimientos", tecnologia: "pg_cron", ubicacion: "Subsistema de datos", externo: false },
    { nombre: "Panel Web", tecnologia: "Next.js", ubicacion: "Subsistema de presentación", externo: false },
  ];
  const piezas = [{ pieza: "nextjs" }, { pieza: "supabase", opcionales: ["auth", "functions"] }];
  const [cron, web] = resolverComponentes(componentes, piezas, [], fichas);
  assert.equal(cron.resolucion, "pieza");
  assert.equal(cron.pieza, "supabase");
  assert.equal(web.pieza, "nextjs");
});

test("sin la pieza supabase elegida, pg_cron sigue sin resolver", async () => {
  const fichas = await catalogo({ incluirInternas: true });
  const [cron] = resolverComponentes([{ nombre: "pg_cron", tecnologia: "pg_cron", ubicacion: "Datos", externo: false }], [{ pieza: "nextjs" }], [], fichas);
  assert.equal(cron.resolucion, "sin_resolver");
});
