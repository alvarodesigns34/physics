/**
 * Mass Spectrometry 3.0 · Problemas inversos con datos SIMULADOS del propio instrumento.
 * Muestra desconocida → identificar el elemento por su masa media medida y deducir abundancias a partir
 * de la media y de las masas de los picos. Se distingue la abundancia natural (tablas IUPAC), la
 * abundancia medida (conteo de iones, con ruido estadístico) y la intensidad ideal del dibujo.
 */
import { ELEMENTS } from '../science/elements';

/** Elementos con exactamente dos isótopos naturales estables: el inverso tiene solución única. */
export const UNKNOWN_POOL = [3, 5, 17, 29, 31, 35, 47];

/** Fracción del isótopo de masa m1 en una mezcla de dos isótopos con masa media M. */
export function abundanceFromMean(m1: number, m2: number, M: number): number {
  if (m1 === m2) throw new RangeError('Las dos masas isotópicas son iguales');
  return (M - m2) / (m1 - m2);
}

/** Elemento cuya masa atómica estándar está más cerca de M (y la distancia al segundo, para valorar la ambigüedad). */
export function identifyByMean(M: number): { z: number; delta: number; margin: number } {
  const ranked = ELEMENTS.filter((e) => e.hasStandardWeight && e.z <= 83)
    .map((e) => ({ z: e.z, delta: Math.abs(e.atomicWeight - M) }))
    .sort((a, b) => a.delta - b.delta);
  return { z: ranked[0]!.z, delta: ranked[0]!.delta, margin: ranked[1]!.delta - ranked[0]!.delta };
}

/** Corrige la abundancia (%) que da el alumno para el isótopo ligero con la media que él mismo midió. */
export function checkAbundance(answerPct: number, m1: number, m2: number, measuredMean: number): { ok: boolean; expectedPct: number } {
  const expectedPct = abundanceFromMean(m1, m2, measuredMean) * 100;
  return { ok: Math.abs(answerPct - expectedPct) <= 0.6, expectedPct };
}
