/**
 * Paquete de ondas gaussiano: el caso de incertidumbre mínima, σx·σp = ħ/2.
 * Ilustra cuantitativamente el principio de Heisenberg (TEO p.11) sin salir del temario.
 */
export const HBAR = 1.054571817e-34;

export function momentumSpread(sigmaX: number): number {
  return HBAR / (2 * sigmaX);
}

/** Densidad de probabilidad de una gaussiana normalizada de anchura σ, centrada en 0. */
export function gaussian(x: number, sigma: number): number {
  return Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Parte real de la función de onda de un paquete con número de onda central k₀. */
export function packetReal(x: number, sigma: number, k0: number): number {
  return Math.exp(-(x * x) / (4 * sigma * sigma)) * Math.cos(k0 * x);
}
