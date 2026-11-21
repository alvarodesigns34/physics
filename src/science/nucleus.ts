/**
 * Identidad de átomos e iones (Atomic Forge): Z, A, N, carga, tipo, isoelectrónicos y datos de nucleidos.
 */
import { elementByZ, NOBLE_GASES, type ElementRecord } from './elements';
import { toSubscript, toSuperscript } from './numbers';

export interface Species {
  /** Protones */
  z: number;
  /** Neutrones */
  n: number;
  /** Electrones */
  e: number;
}

export type SpeciesKind = 'neutro' | 'cation' | 'anion';

export interface SpeciesIdentity {
  species: Species;
  element: ElementRecord | undefined;
  massNumber: number;
  charge: number;
  kind: SpeciesKind;
  /** Elemento neutro con el mismo número de electrones (isoelectrónico). */
  isoelectronicWith: ElementRecord | undefined;
  /** true si tiene el mismo número de electrones que un gas noble. */
  nobleGasElectronCount: boolean;
}

export function identify(s: Species): SpeciesIdentity {
  const element = elementByZ(s.z);
  const charge = s.z - s.e;
  return {
    species: s,
    element,
    massNumber: s.z + s.n,
    charge,
    kind: charge === 0 ? 'neutro' : charge > 0 ? 'cation' : 'anion',
    isoelectronicWith: s.e > 0 ? elementByZ(s.e) : undefined,
    nobleGasElectronCount: (NOBLE_GASES as readonly number[]).includes(s.e),
  };
}

/** «2+», «+», «−», «3−» o cadena vacía. */
export function chargeLabel(q: number): string {
  if (q === 0) return '';
  const mag = Math.abs(q) === 1 ? '' : String(Math.abs(q));
  return `${mag}${q > 0 ? '+' : '−'}`;
}

/** Símbolo con carga en superíndice: «Na⁺», «O²⁻». */
export function ionSymbol(symbol: string, charge: number): string {
  return symbol + toSuperscript(chargeLabel(charge).replace('−', '-'));
}

/** Notación nuclear completa en texto plano Unicode: «²³₁₁Na⁺». */
export function nuclearNotation(s: Species): string {
  const el = elementByZ(s.z);
  const sym = el?.symbol ?? '?';
  return `${toSuperscript(s.z + s.n)}${toSubscript(s.z)}${ionSymbol(sym, s.z - s.e)}`;
}

export const KIND_LABEL: Record<SpeciesKind, string> = {
  neutro: 'Átomo neutro',
  cation: 'Catión',
  anion: 'Anión',
};

/** Nombre del ion en castellano para casos simples: «ion sodio(1+)», «ion cloruro». */
export function speciesName(s: Species): string {
  const el = elementByZ(s.z);
  if (!el) return 'Especie sin identificar';
  const q = s.z - s.e;
  if (q === 0) return el.name;
  if (q > 0) return `Catión ${el.name.toLowerCase()} (${chargeLabel(q)})`;
  return `Anión ${el.name.toLowerCase()} (${chargeLabel(q)})`;
}

// ── Nucleidos ──────────────────────────────────────────────────────────────

/** [A, masa (u) | null, abundancia natural (%), semivida (s): −1 estable, null desconocida] */
export type NuclideRow = [number, number | null, number, number | null];
export type NuclideTable = Record<string, NuclideRow[]>;

let nuclidePromise: Promise<NuclideTable> | null = null;

/** Carga diferida de la tabla de nucleidos (≈90 kB). */
export function loadNuclides(): Promise<NuclideTable> {
  nuclidePromise ??= import('./data/isotopes.json').then((m) => (m.default ?? m) as unknown as NuclideTable);
  return nuclidePromise;
}

export type NuclideStatus =
  | { kind: 'estable'; mass: number | null; abundance: number }
  | { kind: 'radiactivo'; mass: number | null; halfLifeS: number | null; abundance: number }
  | { kind: 'no-observado' };

export function nuclideStatus(table: NuclideTable, z: number, a: number): NuclideStatus {
  const row = table[String(z)]?.find((r) => r[0] === a);
  if (!row) return { kind: 'no-observado' };
  const [, mass, abundance, hl] = row;
  if (hl === -1) return { kind: 'estable', mass, abundance };
  return { kind: 'radiactivo', mass, halfLifeS: hl, abundance };
}

export function knownIsotopes(table: NuclideTable, z: number): NuclideRow[] {
  return table[String(z)] ?? [];
}

/** Isótopos con abundancia natural > 0, ordenados por A. */
export function naturalIsotopes(table: NuclideTable, z: number): NuclideRow[] {
  return knownIsotopes(table, z).filter((r) => r[2] > 0);
}

/** Semivida en lenguaje natural: «12,32 años», «5,7 ms». */
export function formatHalfLife(seconds: number | null): string {
  if (seconds === null) return 'semivida no determinada';
  const units: [number, string, string][] = [
    [3.15576e7 * 1e9, 'mil millones de años', 'mil millones de años'],
    [3.15576e7 * 1e6, 'millones de años', 'millón de años'],
    [3.15576e7, 'años', 'año'],
    [86400, 'días', 'día'],
    [3600, 'horas', 'hora'],
    [60, 'minutos', 'minuto'],
    [1, 's', 's'],
    [1e-3, 'ms', 'ms'],
    [1e-6, 'µs', 'µs'],
    [1e-9, 'ns', 'ns'],
  ];
  for (const [f, plural, singular] of units) {
    if (seconds >= f) {
      const v = seconds / f;
      const txt = v >= 100 ? Math.round(v).toLocaleString('es-ES') : v.toLocaleString('es-ES', { maximumSignificantDigits: 3 });
      return `${txt} ${v === 1 ? singular : plural}`;
    }
  }
  return `${seconds.toExponential(2).replace('.', ',')} s`;
}
