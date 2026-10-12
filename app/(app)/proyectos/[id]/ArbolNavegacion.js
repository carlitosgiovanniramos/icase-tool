"use client";

import { useEffect, useMemo, useState } from "react";
import { plataformasDelArbol, ramaDelArbol } from "@/lib/arbol";
import DiagramaBox, { Pestana } from "./DiagramaBox";

const COMPLETO = "completo";

const paraArchivo = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Árbol de navegación con una vista por plataforma: con web y móvil juntas el árbol completo
// queda demasiado ancho para leerlo. El código guardado sigue siendo uno solo (el completo, que
// es el que se edita y el que reciben los pasos siguientes); cada vista dibuja solo su rama.
export default function ArbolNavegacion({ svg, codigo, renderizar, titulo, nombreArchivo, ...resto }) {
  const plataformas = useMemo(() => plataformasDelArbol(codigo), [codigo]);
  const [elegida, setElegida] = useState(null);
  const [rama, setRama] = useState(null); // { codigo, vista, svg } de la última rama dibujada

  const vista =
    elegida === COMPLETO || plataformas.some((p) => p.id === elegida) ? elegida : plataformas[0]?.id;
  const plataforma = plataformas.find((p) => p.id === vista);

  useEffect(() => {
    if (!plataforma || !svg) return;
    let cancelado = false;
    renderizar(ramaDelArbol(codigo, plataforma.id))
      .then((dibujo) => {
        if (!cancelado) setRama({ codigo, vista: plataforma.id, svg: dibujo });
      })
      .catch((err) => console.error("Error dibujando la rama del árbol:", err));
    return () => {
      cancelado = true;
    };
  }, [codigo, plataforma, svg, renderizar]);

  // Mientras la rama se dibuja (o si no se pudo) se muestra el árbol completo.
  const ramaLista = plataforma && rama?.codigo === codigo && rama.vista === plataforma.id;

  return (
    <DiagramaBox
      {...resto}
      svg={ramaLista ? rama.svg : svg}
      codigo={codigo}
      renderizar={renderizar}
      titulo={ramaLista ? `${titulo} · ${plataforma.nombre}` : titulo}
      nombreArchivo={ramaLista ? `${nombreArchivo}-${paraArchivo(plataforma.nombre)}` : nombreArchivo}
      controles={
        plataformas.length > 0 && (
          <div className="flex items-center gap-1 ml-3">
            {plataformas.map((p) => (
              <Pestana key={p.id} activa={vista === p.id} onClick={() => setElegida(p.id)}>
                {p.nombre}
              </Pestana>
            ))}
            <Pestana activa={vista === COMPLETO} onClick={() => setElegida(COMPLETO)}>
              Completo
            </Pestana>
          </div>
        )
      }
    />
  );
}
