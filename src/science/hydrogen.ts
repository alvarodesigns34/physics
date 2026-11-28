/**
 * Átomo de hidrógeno: niveles de energía (Bohr) y transiciones (ecuación de Rydberg).
 * Ámbito de validez: SOLO hidrógeno; no relativista; sin estructura fina; λ en el vacío.
 */
import { CODATA, SIM_CONSTANTS, type ConstantSet } from './constants';
import { emRegion, type EMRegion } from './photon';

export type SeriesId = 'lyman' | 'balmer' | 'paschen' | 'brackett' | 'pfund' | 'humphreys';

export interface SeriesInfo {
  id: SeriesId;
  name: string;
  n1: number;
  /** true si la serie aparece en el temario (TEO p.10). */
  inSyllabus: boolean;
}

export const SERIES: readonly SeriesInfo[] = [
  { id: 'lyman', name: 'Lyman', n1: 1, inSyllabus: true },
  { id: 'balmer', name: 'Balmer', n1: 2, inSyllabus: true },
  { id: 'paschen', name: 'Paschen', n1: 3, inSyllabus: true },
  { id: 'brackett', name: 'Brackett', n1: 4, inSyllabus: true },
  { id: 'pfund', name: 'Pfund', n1: 5, inSyllabus: true },
  { id: 'humphreys', name: 'Humphreys', n1: 6, inSyllabus: false },
];

export function seriesFor(n1: number): SeriesInfo | undefined {
  return SERIES.find((s) => s.n1 === n1);
}

function assertLevel(n: number): void {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`n debe ser un entero ≥ 1 (recibido ${n})`);
}

/** Energía del nivel n en julios: Eₙ = −R·h·c / n². */
export function levelEnergyJ(n: number, k: ConstantSet = SIM_CONSTANTS): number {
  assertLevel(n);
  return (-k.R * k.h * k.c) / (n * n);
}

export function levelEnergyEV(n: number, k: ConstantSet = SIM_CONSTANTS): number {
  return levelEnergyJ(n, k) / k.eV;
}

/** Radio de la órbita n en el modelo de Bohr (histórico): rₙ = n²·a₀ (m). */
export function bohrRadius(n: number): number {
  assertLevel(n);
  return n * n * CODATA.a0;
}

export type TransitionType = 'emision' | 'absorcion';

export interface Transition {
  from: number;
  to: number;
  type: TransitionType;
  /** Nivel inferior */
  n1: number;
  /** Nivel superior */
  n2: number;
  /** Número de ondas 1/λ (m⁻¹) */
  wavenumber: number;
  /** m (en el vacío) */
  wavelength: number;
  /** Hz */
  frequency: number;
  /** Energía del fotón (J), siempre positiva */
  energyJ: number;
  energyEV: number;
  /** ΔE = E_final − E_inicial (J): positivo si se absorbe, negativo si se emite */
  deltaEJ: number;
  series: SeriesInfo | undefined;
  /** 1 = primera línea de la serie (n2 = n1 + 1) */
  lineIndex: number;
  region: EMRegion;
}

export function transition(from: number, to: number, k: ConstantSet = SIM_CONSTANTS): Transition {
  assertLevel(from);
  assertLevel(to);
  if (from === to) throw new RangeError('El nivel inicial y el final deben ser distintos');
  const n1 = Math.min(from, to);
  const n2 = Math.max(from, to);
  const wavenumber = k.R * (1 / (n1 * n1) - 1 / (n2 * n2));
  const wavelength = 1 / wavenumber;
  const frequency = k.c / wavelength;
  const energyJ = k.h * frequency;
  const type: TransitionType = from > to ? 'emision' : 'absorcion';
  return {
    from,
    to,
    type,
    n1,
    n2,
    wavenumber,
    wavelength,
    frequency,
    energyJ,
    energyEV: energyJ / k.eV,
    deltaEJ: type === 'absorcion' ? energyJ : -energyJ,
    series: seriesFor(n1),
    lineIndex: n2 - n1,
    region: emRegion(wavelength),
  };
}

/** Límite de la serie (n₂ → ∞): λ∞ = n₁² / R. */
export function seriesLimitWavelength(n1: number, k: ConstantSet = SIM_CONSTANTS): number {
  assertLevel(n1);
  return (n1 * n1) / k.R;
}

/** Todas las líneas de emisión posibles al desexcitarse desde el nivel n: n(n−1)/2. */
export function cascadeLines(n: number, k: ConstantSet = SIM_CONSTANTS): Transition[] {
  assertLevel(n);
  const out: Transition[] = [];
  for (let hi = 2; hi <= n; hi++) for (let lo = 1; lo < hi; lo++) out.push(transition(hi, lo, k));
  return out;
}

export function cascadeLineCount(n: number): number {
  return (n * (n - 1)) / 2;
}

/**
 * Problema inverso: dado n₁ y una frecuencia, ¿qué n₂? Devuelve el valor real y el entero más cercano.
 * 1/n₂² = 1/n₁² − ν/(c·R)
 */
export function upperLevelFromFrequency(n1: number, frequency: number, k: ConstantSet = SIM_CONSTANTS): { exact: number; nearest: number | null } {
  const inv = 1 / (n1 * n1) - frequency / (k.c * k.R);
  if (inv <= 0) return { exact: Infinity, nearest: null };
  const exact = Math.sqrt(1 / inv);
  const nearest = Math.round(exact);
  return { exact, nearest: nearest > n1 && Math.abs(exact - nearest) < 0.05 ? nearest : null };
}

/**
 * ATOM 6.0 · Líneas de una serie (n₁ fijo) para la gráfica sincronizada del laboratorio: n₂ = n₁ + 1 … n₁ + k
 * y el límite de la serie (n₂ → ∞). Longitudes de onda en el vacío, en nm, con R_H (masa reducida).
 */
export function seriesLines(n1: number, count = 10, k: ConstantSet = SIM_CONSTANTS): { lines: { n2: number; nm: number }[]; limitNm: number } {
  assertLevel(n1);
  const lines = Array.from({ length: count }, (_, i) => n1 + 1 + i).map((n2) => ({ n2, nm: transition(n2, n1, k).wavelength * 1e9 }));
  return { lines, limitNm: seriesLimitWavelength(n1, k) * 1e9 };
}
