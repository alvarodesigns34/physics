/**
 * Radiación electromagnética: relaciones λ–ν–T–E, regiones del espectro y color de una longitud de onda.
 */
import { SIM_CONSTANTS, type ConstantSet } from './constants';

export interface PhotonProperties {
  /** m */
  wavelength: number;
  /** Hz */
  frequency: number;
  /** s */
  period: number;
  /** J */
  energyJ: number;
  /** eV */
  energyEV: number;
  /** m⁻¹ */
  wavenumber: number;
  region: EMRegion;
}

export function fromWavelength(lambda: number, k: ConstantSet = SIM_CONSTANTS): PhotonProperties {
  if (!(lambda > 0)) throw new RangeError('La longitud de onda debe ser positiva');
  const frequency = k.c / lambda;
  const energyJ = k.h * frequency;
  return {
    wavelength: lambda,
    frequency,
    period: 1 / frequency,
    energyJ,
    energyEV: energyJ / k.eV,
    wavenumber: 1 / lambda,
    region: emRegion(lambda),
  };
}

export function fromFrequency(nu: number, k: ConstantSet = SIM_CONSTANTS): PhotonProperties {
  return fromWavelength(k.c / nu, k);
}

export function fromEnergyJ(E: number, k: ConstantSet = SIM_CONSTANTS): PhotonProperties {
  return fromWavelength((k.h * k.c) / E, k);
}

export type EMRegionId = 'gamma' | 'x' | 'uv' | 'visible' | 'ir' | 'microondas' | 'radio';

export interface EMRegion {
  id: EMRegionId;
  name: string;
  /** Límites en metros [mín, máx) */
  min: number;
  max: number;
}

/** Límites convencionales (aproximados; las fronteras reales son difusas). */
export const EM_REGIONS: readonly EMRegion[] = [
  { id: 'gamma', name: 'Rayos γ', min: 0, max: 1e-11 },
  { id: 'x', name: 'Rayos X', min: 1e-11, max: 1e-8 },
  { id: 'uv', name: 'Ultravioleta', min: 1e-8, max: 380e-9 },
  { id: 'visible', name: 'Visible', min: 380e-9, max: 780e-9 },
  { id: 'ir', name: 'Infrarrojo', min: 780e-9, max: 1e-3 },
  { id: 'microondas', name: 'Microondas', min: 1e-3, max: 1 },
  { id: 'radio', name: 'Ondas de radio', min: 1, max: Infinity },
];

export function emRegion(lambda: number): EMRegion {
  return EM_REGIONS.find((r) => lambda >= r.min && lambda < r.max) ?? EM_REGIONS[EM_REGIONS.length - 1]!;
}

export function isVisible(lambdaNm: number): boolean {
  return lambdaNm >= 380 && lambdaNm <= 780;
}

const COLOR_BANDS: [number, string][] = [
  [450, 'violeta'],
  [485, 'azul'],
  [500, 'cian (azul verdoso)'],
  [565, 'verde'],
  [590, 'amarillo'],
  [625, 'naranja'],
  [781, 'rojo'],
];

/** Nombre aproximado del color percibido (límites orientativos). */
export function colorName(lambdaNm: number): string | null {
  if (!isVisible(lambdaNm)) return null;
  for (const [max, name] of COLOR_BANDS) if (lambdaNm < max) return name;
  return 'rojo';
}

// ── Color espectral: CIE 1931 (aproximación de Wyman, Sloan y Shirley, 2013) ──

function g(x: number, mu: number, s1: number, s2: number): number {
  const s = x < mu ? s1 : s2;
  const t = (x - mu) / s;
  return Math.exp(-0.5 * t * t);
}

export function cieXYZ(lambdaNm: number): [number, number, number] {
  const L = lambdaNm;
  const x = 1.056 * g(L, 599.8, 37.9, 31.0) + 0.362 * g(L, 442.0, 16.0, 26.7) - 0.065 * g(L, 501.1, 20.4, 26.2);
  const y = 0.821 * g(L, 568.8, 46.9, 40.5) + 0.286 * g(L, 530.9, 16.3, 31.1);
  const z = 1.217 * g(L, 437.0, 11.8, 36.0) + 0.681 * g(L, 459.0, 26.0, 13.8);
  return [x, y, z];
}

/**
 * Color sRGB LINEAL (0–1) de una línea espectral. Fuera de gama: se desatura añadiendo blanco
 * y se normaliza al máximo. La luminosidad decae hacia los extremos del visible siguiendo ȳ(λ)
 * de forma suavizada, para que las líneas violeta y rojo profundo se vean tenues como en la realidad.
 */
export function wavelengthToLinearRGB(lambdaNm: number): [number, number, number] {
  if (lambdaNm < 370 || lambdaNm > 790) return [0, 0, 0];
  const [X, Y, Z] = cieXYZ(lambdaNm);
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  const mn = Math.min(r, gg, b);
  if (mn < 0) {
    r -= mn;
    gg -= mn;
    b -= mn;
  }
  const mx = Math.max(r, gg, b);
  if (mx <= 0) return [0, 0, 0];
  const brightness = Math.min(1, 0.25 + 0.75 * Math.pow(Math.min(1, Y / 0.15), 0.5));
  return [(r / mx) * brightness, (gg / mx) * brightness, (b / mx) * brightness];
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Color CSS (sRGB codificado) de una longitud de onda visible. */
export function wavelengthToCss(lambdaNm: number): string {
  const [r, g2, b] = wavelengthToLinearRGB(lambdaNm).map(linearToSrgb) as [number, number, number];
  return `rgb(${Math.round(r * 255)} ${Math.round(g2 * 255)} ${Math.round(b * 255)})`;
}

/** Color de representación para λ no visibles (UV/IR): se muestran en gris neutro, etiquetados. */
export const INVISIBLE_LINE_CSS = 'rgb(168 160 150)';
