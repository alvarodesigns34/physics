/** Repetición del mismo enunciado: módulo sin dependencias para que lo usen el almacén y la fusión. */
/**
 * Peso de un intento según si el MISMO enunciado ya se había resuelto: 1 la primera vez; 0,35 si se repite
 * (0,15 a partir de la tercera); 0,6 si la vez anterior fue hace ≥ 2 días (recuperación espaciada, que sí
 * es aprendizaje, aunque no demuestra transferencia a datos nuevos).
 */
/** Días que deben pasar para que repetir el mismo enunciado sea recuperación espaciada (no memoria inmediata). */
export const SPACED_RETRIEVAL_MS = 2 * 86_400_000;

/**
 * Repetición del mismo enunciado (ATOM 5.1). Una sola fuente de verdad para el peso de la evidencia y para
 * el cuaderno de errores: antes, el cuaderno exigía `factor === 1` y su propia regla «el mismo enunciado
 * pasados 2 días» era inalcanzable, porque ese caso siempre es una repetición (factor 0,6).
 * - primera vez: factor 1;
 * - repetición tras ≥ 2 días: factor 0,6 y `spaced` (recuperación espaciada: puede cerrar el cuaderno);
 * - repetición inmediata: 0,35 la segunda vez y 0,15 después (memoria de la respuesta, no dominio).
 */
export function repetitionInfo(history: { exerciseId: string; at: number }[], id: string, now: number): { factor: number; spaced: boolean } {
  const prev = history.filter((h) => h.exerciseId === id);
  if (!prev.length) return { factor: 1, spaced: false };
  const last = Math.max(...prev.map((h) => h.at));
  if (now - last >= SPACED_RETRIEVAL_MS) return { factor: 0.6, spaced: true };
  return { factor: prev.length === 1 ? 0.35 : 0.15, spaced: false };
}

export function repetitionFactor(history: { exerciseId: string; at: number }[], id: string, now: number): number {
  return repetitionInfo(history, id, now).factor;
}
