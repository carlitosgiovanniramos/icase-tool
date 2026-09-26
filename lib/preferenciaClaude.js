"use client";

import { useSyncExternalStore } from "react";
import { pedirJson } from "./pedirJson";

// Preferencia "Usar Claude" (API de pago, para pruebas reales) y gasto estimado acumulado.
// Se guardan en este navegador; el saldo real está en la consola de Anthropic.

const CLAVE_ACTIVO = "icase:usar-claude";
const CLAVE_GASTO = "icase:gasto-claude";
const oyentes = new Set();

function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // almacenamiento no disponible (modo privado): la preferencia dura solo esta sesión
  }
  oyentes.forEach((avisar) => avisar());
}

function suscribir(avisar) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar); // cambios desde otra pestaña
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

export const claudeActivo = () => leer(CLAVE_ACTIVO) === "1";
export const gastoClaude = () => Number(leer(CLAVE_GASTO)) || 0;

export const activarClaude = (activo) => escribir(CLAVE_ACTIVO, activo ? "1" : "0");
export const reiniciarGastoClaude = () => escribir(CLAVE_GASTO, "0");

export function useClaudeActivo() {
  return useSyncExternalStore(suscribir, claudeActivo, () => false);
}

export function useGastoClaude() {
  return useSyncExternalStore(suscribir, gastoClaude, () => 0);
}

// Llama a una ruta de IA enviando la preferencia actual y suma lo gastado si respondió Claude.
// El costo se quita de la respuesta para que no termine guardado dentro de los artefactos.
export async function pedirIA(url, cuerpo) {
  const { costo_ia: costo, ...data } = await pedirJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...cuerpo, usarClaude: claudeActivo() }),
  });
  if (costo) escribir(CLAVE_GASTO, String(gastoClaude() + costo));
  return data;
}
