import { NextResponse } from "next/server";
import { generarContenido } from "@/lib/gemini";
import { formatearContexto } from "@/lib/contexto";

export const maxDuration = 300;

function ultimoNumero(lista = []) {
  return lista.reduce((max, r) => Math.max(max, Number(r.codigo?.match(/\d+/)?.[0]) || 0), 0);
}

const conCeros = (n) => String(n).padStart(2, "0");

// Amplía un análisis existente: la IA devuelve SOLO actores y requerimientos nuevos, que se
// agregan a los actuales sin modificarlos.
export async function POST(request) {
  try {
    const { prompt, documentoTexto, contexto, analisis, instruccion, usarClaude } = await request.json();

    const rf = analisis.requerimientos_funcionales || [];
    const rnf = analisis.requerimientos_no_funcionales || [];
    const ultimoRF = ultimoNumero(rf);
    const ultimoRNF = ultimoNumero(rnf);

    const existentes = [
      `Actores: ${(analisis.actores || []).map((a) => a.nombre).join(", ")}`,
      "Requerimientos funcionales:",
      ...rf.map((r) => `${r.codigo} - ${r.nombre}: ${r.descripcion}`),
      "Requerimientos no funcionales:",
      ...rnf.map((r) => `${r.codigo} (${r.categoria}) - ${r.nombre}: ${r.descripcion}`),
    ].join("\n");

    const elicitacion = formatearContexto(contexto);

    const instrucciones = `
Eres un analista de requisitos certificado, experto en la norma ISO/IEC/IEEE 29148:2018. Ya existe un análisis de requerimientos para este sistema y el cliente pide ampliarlo.

Descripción del sistema:
${prompt}
${elicitacion ? `\nInformación de elicitación del cliente:\n${elicitacion}\n` : ""}${documentoTexto ? `\nContexto de un documento adjunto:\n${documentoTexto}\n` : ""}
Análisis actual (NO lo repitas, NO lo reformules, NO lo modifiques):
${existentes}

Lo que el cliente pide agregar:
${instruccion}

Genera SOLO los requerimientos NUEVOS necesarios para cubrir lo que pide el cliente, ni más ni menos. Si algo de lo que pide ya está cubierto por un requerimiento existente, no lo dupliques.
- Los funcionales nuevos continúan la numeración desde RF${conCeros(ultimoRF + 1)}; los no funcionales desde RNF${conCeros(ultimoRNF + 1)}.
- Cada requerimiento debe ser necesario, singular, no ambiguo, verificable, factible y libre de implementación, redactado como "El sistema debe/deberá...".
- En "actores" usa nombres de actores existentes. Solo si hace falta un actor que no existe, agrégalo en "actores_nuevos".
- En "dependencias" puedes referenciar códigos existentes o nuevos.

Responde ÚNICAMENTE con un JSON válido con esta estructura, sin texto adicional:
{
  "actores_nuevos": [ { "nombre": "string", "descripcion": "string" } ],
  "requerimientos_funcionales": [
    {
      "codigo": "RF${conCeros(ultimoRF + 1)}",
      "nombre": "string (3-6 palabras)",
      "descripcion": "string",
      "dependencias": [],
      "prioridad": "alta | media | baja",
      "actores": ["string"],
      "precondiciones": "string",
      "postcondiciones": "string",
      "metodo_verificacion": "Inspección | Análisis | Demostración | Prueba"
    }
  ],
  "requerimientos_no_funcionales": [
    {
      "codigo": "RNF${conCeros(ultimoRNF + 1)}",
      "nombre": "string (3-6 palabras)",
      "categoria": "string",
      "descripcion": "string",
      "dependencias": [],
      "prioridad": "alta | media | baja",
      "actores": ["string"],
      "precondiciones": "string",
      "postcondiciones": "string",
      "metodo_verificacion": "Inspección | Análisis | Demostración | Prueba"
    }
  ]
}
Usa [] en cualquier lista que no necesite elementos nuevos.
`;

    const response = await generarContenido({
      usarClaude,
      contents: instrucciones,
      config: { responseMimeType: "application/json" },
    });
    const resultado = JSON.parse(response.text);

    // La numeración se asegura aquí, aunque la IA se equivoque: los códigos nuevos siguen a los
    // existentes y las dependencias entre requerimientos nuevos se ajustan a los códigos finales.
    const renombres = {};
    const renumerar = (lista = [], prefijo, desde) =>
      lista.map((r, i) => {
        const codigo = `${prefijo}${conCeros(desde + i + 1)}`;
        if (r.codigo) renombres[r.codigo] = codigo;
        return { ...r, codigo };
      });
    const nuevosRF = renumerar(resultado.requerimientos_funcionales, "RF", ultimoRF);
    const nuevosRNF = renumerar(resultado.requerimientos_no_funcionales, "RNF", ultimoRNF);
    const ajustarDependencias = (r) => ({
      ...r,
      dependencias: Array.isArray(r.dependencias)
        ? r.dependencias.map((d) => renombres[d] ?? d)
        : [],
    });

    const nombresActuales = new Set((analisis.actores || []).map((a) => a.nombre.toLowerCase()));
    const actoresNuevos = (resultado.actores_nuevos || []).filter(
      (a) => a.nombre && !nombresActuales.has(a.nombre.toLowerCase())
    );

    return NextResponse.json({
      actores_nuevos: actoresNuevos,
      requerimientos_funcionales: nuevosRF.map(ajustarDependencias),
      requerimientos_no_funcionales: nuevosRNF.map(ajustarDependencias),
      modelo_ia: response.modelVersion,
      costo_ia: response.costoUsd,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
