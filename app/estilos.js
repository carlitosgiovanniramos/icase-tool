// Paleta de colores apagados/"editorial" compartida por las páginas de proyecto.
// Nada de azules eléctricos ni tonos pastel de IA: tonos oscuros, opacos, sin degradados.
export const PALETA = {
  navy: "#1e293b",
  carmesi: "#7f1d1d",
  oliva: "#4d5b28",
  naranjaOscuro: "#7c2d12",
  negro: "#111827",
  marron: "#5c4425",
};

// Única excepción deliberada a "sin degradados": el fondo de login/registro.
export const DEGRADADO_AUTH =
  "bg-gradient-to-br from-[#111827] via-[#1e293b] to-[#3f5750]";

export const ROTACION_COLORES = [
  PALETA.navy,
  PALETA.carmesi,
  PALETA.oliva,
  PALETA.naranjaOscuro,
  PALETA.negro,
  PALETA.marron,
];

export const CATEGORIA_COLORES = {
  Usabilidad: PALETA.navy,
  Rendimiento: PALETA.naranjaOscuro,
  Seguridad: PALETA.carmesi,
  Disponibilidad: PALETA.oliva,
  Mantenibilidad: PALETA.marron,
};
export const CATEGORIA_COLOR_DEFECTO = PALETA.negro;

export const PRIORIDAD_COLORES = {
  alta: PALETA.carmesi,
  media: PALETA.naranjaOscuro,
  baja: PALETA.oliva,
};
export const PRIORIDAD_COLOR_DEFECTO = PALETA.negro;
