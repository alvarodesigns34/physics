/**
 * Superficies de contorno de orbitales hidrogenoides: la superficie |ψ| = constante que encierra una
 * fracción dada de la probabilidad (por convenio, el 90 %). Cálculo sobre una rejilla cúbica.
 */
import { radialProbability, radialWavefunction, realYlm, radialCutoff } from './orbitals';

/** Radio que encierra la fracción `p` de la probabilidad radial ∫P(r)dr. */
export function radialQuantile(n: number, l: number, p: number, Z = 1): number {
  const rmax = radialCutoff(n, Z) * 2.5;
  const steps = 6000;
  const dr = rmax / steps;
  let acc = 0;
  for (let i = 1; i <= steps; i++) {
    const r = i * dr;
    acc += radialProbability(n, l, Z, r - dr / 2) * dr;
    if (acc >= p) return r;
  }
  return rmax;
}

export interface OrbitalGrid {
  /** Tamaño de la rejilla por eje */
  size: number;
  /** Semilado del cubo (a₀) */
  half: number;
  /** ψ en cada nodo, índice x + y·size + z·size² (coordenadas químicas: z arriba) */
  psi: Float32Array;
  /** Valor |ψ| de la superficie que encierra la fracción pedida */
  iso: number;
  /** Probabilidad encerrada realmente en la rejilla con ese umbral */
  enclosed: number;
}

/**
 * Evalúa ψ_{nlm} en una rejilla de `size`³ nodos (la misma convención de MarchingCubes de three.js:
 * coordenada = (i − size/2)/(size/2)·half) y calcula el umbral |ψ| que encierra la fracción `p`.
 */
export function orbitalGrid(n: number, l: number, m: number, size: number, p = 0.9, Z = 1): OrbitalGrid {
  const half = radialQuantile(n, l, 0.998, Z) * 1.04;
  const psi = new Float32Array(size * size * size);
  const hs = size / 2;
  const dx = half / hs;
  const dV = dx * dx * dx;
  const coords = new Float32Array(size);
  for (let i = 0; i < size; i++) coords[i] = ((i - hs) / hs) * half;
  // R(r) tabulado para acelerar (r hasta √3·half)
  const tab = 4096;
  const rTop = Math.sqrt(3) * half;
  const R = new Float32Array(tab + 1);
  for (let i = 0; i <= tab; i++) R[i] = radialWavefunction(n, l, Z, (i / tab) * rTop);
  const dens: number[] = new Array(size * size * size);
  let k = 0;
  for (let z = 0; z < size; z++) {
    const cz = coords[z]!;
    for (let y = 0; y < size; y++) {
      const cy = coords[y]!;
      for (let x = 0; x < size; x++, k++) {
        const cx = coords[x]!;
        const r = Math.sqrt(cx * cx + cy * cy + cz * cz);
        let v: number;
        if (r < 1e-9) v = l === 0 ? R[0]! * realYlm(0, 0, 0, 0, 1) : 0;
        else {
          const t = (r / rTop) * tab;
          const i0 = Math.floor(t);
          const f = t - i0;
          const rr = R[i0]! * (1 - f) + R[Math.min(tab, i0 + 1)]! * f;
          v = rr * realYlm(l, m, cx / r, cy / r, cz / r);
        }
        psi[k] = v;
        dens[k] = v * v;
      }
    }
  }
  const total = dens.reduce((a, b) => a + b, 0) * dV;
  const target = p * Math.min(1, total);
  const sorted = Float64Array.from(dens).sort().reverse();
  let acc = 0;
  let thr = sorted[0]!;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i]! * dV;
    if (acc >= target) {
      thr = sorted[i]!;
      break;
    }
  }
  return { size, half, psi, iso: Math.sqrt(thr), enclosed: acc };
}
