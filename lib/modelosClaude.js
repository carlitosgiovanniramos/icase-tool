// Modelos de Claude que se pueden elegir en la barra lateral, con su precio en USD por millón de
// tokens [entrada, salida]. Lo usan el servidor (qué modelo llamar) y el navegador (selector y
// costos estimados), por eso no importa nada del servidor.
export const MODELOS_CLAUDE = [
  { id: "claude-haiku-5-5", nombre: "Haiku 5.5", precio: [0.1, 0.5] },
  { id: "claude-sonnet-5", nombre: "Sonnet 5", precio: [2, 10] },
  { id: "claude-sonnet-5-5", nombre: "Sonnet 5.5", precio: [2, 10] },
  { id: "claude-opus-5-5", nombre: "Opus 5.5", precio: [4, 20] },
];

export const esModeloClaude = (id) => MODELOS_CLAUDE.some((m) => m.id === id);

// Los costos estimados de la app (archivo de la base, contrato, pantalla) se midieron con Sonnet 5;
// para otro modelo se escalan por su precio de salida, que es lo que más pesa.
export const factorCostoClaude = (id) => (MODELOS_CLAUDE.find((m) => m.id === id)?.precio[1] ?? 10) / 10;
