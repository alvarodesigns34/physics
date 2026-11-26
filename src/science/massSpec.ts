/**
 * Espectrometría de masas: masa atómica media ponderada a partir de masas isotópicas y abundancias.
 */
export interface IsotopePeak {
  label?: string;
  /** Masa isotópica (u) */
  mass: number;
  /** Abundancia relativa (%) */
  abundance: number;
}

export interface AverageMassResult {
  value: number;
  abundanceSum: number;
  /** true si las abundancias no suman 100 % (± tolerancia) — ver errata E1 del ejemplo del cloro. */
  abundancesInconsistent: boolean;
  /** Media normalizada dividiendo por la suma real de abundancias. */
  normalizedValue: number;
}

export function averageAtomicMass(peaks: IsotopePeak[], tolerancePct = 0.05): AverageMassResult {
  if (peaks.length === 0) throw new RangeError('Se necesita al menos un isótopo');
  let sum = 0;
  let weighted = 0;
  for (const p of peaks) {
    if (!Number.isFinite(p.mass) || p.mass <= 0) throw new RangeError(`La masa isotópica debe ser un número positivo (recibido ${p.mass})`);
    if (!Number.isFinite(p.abundance) || p.abundance < 0) throw new RangeError(`La abundancia debe ser un número no negativo (recibido ${p.abundance})`);
    if (p.abundance > 100) throw new RangeError(`Una abundancia no puede superar el 100 % (recibido ${p.abundance})`);
    sum += p.abundance;
    weighted += p.mass * p.abundance;
  }
  if (sum === 0) throw new RangeError('Las abundancias suman 0 %: no hay ningún isótopo con el que promediar');
  return {
    value: weighted / 100,
    abundanceSum: sum,
    abundancesInconsistent: Math.abs(sum - 100) > tolerancePct,
    normalizedValue: weighted / sum,
  };
}

/**
 * Para dos isótopos y una masa media conocida: abundancia del primero (%).
 * La masa media debe estar entre las dos masas isotópicas (si no, ninguna mezcla la produce).
 */
export function twoIsotopeAbundance(m1: number, m2: number, average: number): number {
  for (const [n, v] of [['m₁', m1], ['m₂', m2], ['La masa media', average]] as const) if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${n} debe ser un número positivo (recibido ${v})`);
  if (m1 === m2) throw new RangeError('Las dos masas isotópicas son iguales: la abundancia queda indeterminada');
  const lo = Math.min(m1, m2);
  const hi = Math.max(m1, m2);
  if (average < lo || average > hi) throw new RangeError(`La masa media (${average} u) debe estar entre las masas isotópicas (${lo} u y ${hi} u)`);
  return ((average - m2) / (m1 - m2)) * 100;
}
