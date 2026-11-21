/**
 * Orbitales hidrogenoides y muestreo de densidad de probabilidad.
 * Distancias en unidades del radio de Bohr a₀. Para átomos multielectrónicos se usa la aproximación
 * de electrones independientes con Z_ef de Slater (cálculo aproximado, cualitativamente correcto).
 */
import type { Configuration } from './configuration';
import { subshellLabel } from './configuration';
import { slater } from './slater';

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Polinomio asociado de Laguerre generalizado L_k^α(x) (recurrencia estable). */
export function laguerre(k: number, alpha: number, x: number): number {
  if (k === 0) return 1;
  let prev = 1;
  let cur = 1 + alpha - x;
  for (let i = 1; i < k; i++) {
    const next = ((2 * i + 1 + alpha - x) * cur - (i + alpha) * prev) / (i + 1);
    prev = cur;
    cur = next;
  }
  return cur;
}

/** Función radial normalizada R_nl(r) para carga nuclear Z (r en a₀). ∫ r² R² dr = 1. */
export function radialWavefunction(n: number, l: number, Z: number, r: number): number {
  const rho = (2 * Z * r) / n;
  const norm = Math.sqrt(Math.pow((2 * Z) / n, 3) * (factorial(n - l - 1) / (2 * n * factorial(n + l))));
  return norm * Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho);
}

/** Distribución radial de probabilidad P(r) = r²·R²(r). */
export function radialProbability(n: number, l: number, Z: number, r: number): number {
  const R = radialWavefunction(n, l, Z, r);
  return r * r * R * R;
}

/** ⟨r⟩ = [3n² − l(l+1)] / (2Z), en a₀. */
export function meanRadius(n: number, l: number, Z: number): number {
  return (3 * n * n - l * (l + 1)) / (2 * Z);
}

/** Radio máximo de la malla de muestreo (la probabilidad más allá es < 10⁻⁵). */
export function radialCutoff(n: number, Z: number): number {
  return (2.5 * n * n + 8 * n) / Z;
}

const cdfCache = new Map<string, { r: Float64Array; cdf: Float64Array }>();

function radialCdf(n: number, l: number, Z: number) {
  const key = `${n},${l},${Z.toFixed(3)}`;
  const hit = cdfCache.get(key);
  if (hit) return hit;
  const N = 2048;
  const rmax = radialCutoff(n, Z);
  const r = new Float64Array(N);
  const cdf = new Float64Array(N);
  let acc = 0;
  let prevP = 0;
  for (let i = 0; i < N; i++) {
    const ri = (rmax * i) / (N - 1);
    const p = radialProbability(n, l, Z, ri);
    if (i > 0) acc += 0.5 * (p + prevP) * (rmax / (N - 1));
    r[i] = ri;
    cdf[i] = acc;
    prevP = p;
  }
  for (let i = 0; i < N; i++) cdf[i]! /= acc;
  const res = { r, cdf };
  cdfCache.set(key, res);
  return res;
}

/** Muestra un radio según P(r) por inversión de la función de distribución acumulada. */
export function sampleRadius(n: number, l: number, Z: number, u: number): number {
  const { r, cdf } = radialCdf(n, l, Z);
  let lo = 0;
  let hi = cdf.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid]! < u) lo = mid;
    else hi = mid;
  }
  const c0 = cdf[lo]!;
  const c1 = cdf[hi]!;
  const t = c1 > c0 ? (u - c0) / (c1 - c0) : 0;
  return r[lo]! + t * (r[hi]! - r[lo]!);
}

/**
 * Armónicos esféricos REALES (normalizados) para l ≤ 3, evaluados sobre un vector unitario (x, y, z).
 * Convención: m < 0 → combinaciones con seno (y), m > 0 → con coseno (x).
 */
export function realYlm(l: number, m: number, x: number, y: number, z: number): number {
  const PI = Math.PI;
  switch (l) {
    case 0:
      return 0.5 * Math.sqrt(1 / PI);
    case 1: {
      const c = Math.sqrt(3 / (4 * PI));
      return c * (m === -1 ? y : m === 0 ? z : x);
    }
    case 2:
      switch (m) {
        case -2: return 0.5 * Math.sqrt(15 / PI) * x * y;
        case -1: return 0.5 * Math.sqrt(15 / PI) * y * z;
        case 0: return 0.25 * Math.sqrt(5 / PI) * (3 * z * z - 1);
        case 1: return 0.5 * Math.sqrt(15 / PI) * x * z;
        default: return 0.25 * Math.sqrt(15 / PI) * (x * x - y * y);
      }
    case 3:
      switch (m) {
        case -3: return 0.25 * Math.sqrt(35 / (2 * PI)) * y * (3 * x * x - y * y);
        case -2: return 0.5 * Math.sqrt(105 / PI) * x * y * z;
        case -1: return 0.25 * Math.sqrt(21 / (2 * PI)) * y * (5 * z * z - 1);
        case 0: return 0.25 * Math.sqrt(7 / PI) * z * (5 * z * z - 3);
        case 1: return 0.25 * Math.sqrt(21 / (2 * PI)) * x * (5 * z * z - 1);
        case 2: return 0.25 * Math.sqrt(105 / PI) * z * (x * x - y * y);
        default: return 0.25 * Math.sqrt(35 / (2 * PI)) * x * (x * x - 3 * y * y);
      }
    default:
      throw new RangeError('Solo se implementan l ≤ 3');
  }
}

/** Nombre del orbital real: «2pz», «3dxy», «4fz³». */
export const REAL_ORBITAL_NAMES: Record<number, Record<number, string>> = {
  0: { 0: '' },
  1: { [-1]: 'y', 0: 'z', 1: 'x' },
  2: { [-2]: 'xy', [-1]: 'yz', 0: 'z²', 1: 'xz', 2: 'x²−y²' },
  3: { [-3]: 'y(3x²−y²)', [-2]: 'xyz', [-1]: 'yz²', 0: 'z³', 1: 'xz²', 2: 'z(x²−y²)', 3: 'x(x²−3y²)' },
};

const yMaxCache = new Map<string, number>();
function maxY2(l: number, m: number): number {
  const key = `${l},${m}`;
  const hit = yMaxCache.get(key);
  if (hit !== undefined) return hit;
  let max = 0;
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;
    for (let j = 0; j < 2 * N; j++) {
      const ph = (Math.PI * j) / N;
      const v = realYlm(l, m, Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th));
      max = Math.max(max, v * v);
    }
  }
  max *= 1.05; // margen por la discretización
  yMaxCache.set(key, max);
  return max;
}

function randomDirection(rng: () => number): [number, number, number] {
  const z = 2 * rng() - 1;
  const phi = 2 * Math.PI * rng();
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}

/** Muestrea `count` posiciones (x,y,z en a₀) de |ψ_nlm|² con armónicos reales. */
export function sampleOrbital(n: number, l: number, m: number, Z: number, count: number, rng: () => number): Float32Array {
  const out = new Float32Array(count * 3);
  const ymax = maxY2(l, m);
  for (let i = 0; i < count; i++) {
    let dir: [number, number, number];
    for (;;) {
      dir = randomDirection(rng);
      const y = realYlm(l, m, dir[0], dir[1], dir[2]);
      if (rng() * ymax <= y * y) break;
    }
    const r = sampleRadius(n, l, Z, rng());
    out[i * 3] = dir[0] * r;
    out[i * 3 + 1] = dir[1] * r;
    out[i * 3 + 2] = dir[2] * r;
  }
  return out;
}

export interface DensitySubshell {
  label: string;
  n: number;
  l: number;
  electrons: number;
  zeff: number;
  meanRadius: number;
  count: number;
}

export interface AtomDensity {
  positions: Float32Array;
  /** Índice del subnivel de cada punto (en `subshells`). */
  subshellIndex: Uint8Array;
  subshells: DensitySubshell[];
}

/**
 * Nube de densidad electrónica total de un átomo o ion: cada subnivel contribuye con puntos
 * proporcionales a sus electrones, con distribución radial hidrogenoide de Z_ef (Slater) y
 * distribución angular promediada esféricamente (la suma sobre los orbitales de un subnivel
 * lleno es esférica; para subniveles parciales se representa el promedio esférico).
 */
export function atomDensity(z: number, conf: Configuration, totalPoints: number, rng: () => number): AtomDensity {
  const electrons = conf.reduce((a, s) => a + s.e, 0);
  const subshells: DensitySubshell[] = conf.map((s) => {
    const zeff = Math.max(0.5, slater(z, conf, s).zeff);
    return { label: subshellLabel(s), n: s.n, l: s.l, electrons: s.e, zeff, meanRadius: meanRadius(s.n, s.l, zeff), count: 0 };
  });
  if (electrons === 0) return { positions: new Float32Array(0), subshellIndex: new Uint8Array(0), subshells };
  let assigned = 0;
  subshells.forEach((s, i) => {
    s.count = i === subshells.length - 1 ? totalPoints - assigned : Math.round((totalPoints * s.electrons) / electrons);
    assigned += s.count;
  });
  const positions = new Float32Array(totalPoints * 3);
  const subshellIndex = new Uint8Array(totalPoints);
  let k = 0;
  subshells.forEach((s, idx) => {
    for (let i = 0; i < s.count; i++, k++) {
      const r = sampleRadius(s.n, s.l, s.zeff, rng());
      const [x, y, zz] = randomDirection(rng);
      positions[k * 3] = x * r;
      positions[k * 3 + 1] = y * r;
      positions[k * 3 + 2] = zz * r;
      subshellIndex[k] = idx;
    }
  });
  return { positions, subshellIndex, subshells };
}
