import { PALETA } from "../../../estilos";

// "gemini-3.6-flash" → "Gemini 3.6 Flash"; "claude:claude-sonnet-5" → "Claude Sonnet 5";
// "groq:openai/gpt-oss-120b" → "Groq · gpt-oss-120b"
function nombreLegible(modelo) {
  if (modelo.startsWith("groq:")) return `Groq · ${modelo.slice(5).split("/").pop()}`;
  return modelo
    .replace(/^claude:/, "")
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// Muestra qué modelo de IA generó un artefacto, para poder validar la calidad según el modelo.
export default function BadgeModelo({ modelo }) {
  if (!modelo) return null;
  return (
    <span
      title={`Generado con ${modelo}`}
      className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold text-white whitespace-nowrap"
      style={{ backgroundColor: PALETA.oliva }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
      {nombreLegible(modelo)}
    </span>
  );
}
