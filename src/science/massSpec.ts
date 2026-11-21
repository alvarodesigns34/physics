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
    if (p.abundance < 0 || p.mass <= 0) throw new RangeError('Masa o abundancia no válidas');
    sum += p.abundance;
    weighted += p.mass * p.abundance;
  }
  return {
    value: weighted / 100,
    abundanceSum: sum,
    abundancesInconsistent: Math.abs(sum - 100) > tolerancePct,
    normalizedValue: weighted / sum,
  };
}

/** Para dos isótopos y una masa media conocida: abundancia del primero (%). */
export function twoIsotopeAbundance(m1: number, m2: number, average: number): number {
  return ((average - m2) / (m1 - m2)) * 100;
}
