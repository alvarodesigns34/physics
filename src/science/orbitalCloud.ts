/**
 * Nube de probabilidad de un orbital hidrogenoide (Z = 1): muestreo exacto de |ψ|² y color por fase
 * (signo de ψ) o por m (subnivel completo). Función pura, utilizable en el hilo principal o en un Worker.
 */
import { mulberry32 } from './numbers';
import { sampleOrbital, radialWavefunction, realYlm, sampleRadius } from './orbitals';

export interface CloudRequest {
  n: number;
  l: number;
  m: number;
  subshell: boolean;
  count: number;
}

export interface CloudResult {
  positions: Float32Array;
  tint: Float32Array;
  count: number;
}

const rgb = (hex: string): [number, number, number] => {
  const v = parseInt(hex.slice(1), 16);
  // sRGB → lineal (como THREE.Color con gestión de color).
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [lin(((v >> 16) & 255) / 255), lin(((v >> 8) & 255) / 255), lin((v & 255) / 255)];
};

export const CLOUD_PHASE_POS = '#e0702b';
export const CLOUD_PHASE_NEG = '#2f7fd8';
export const CLOUD_M_COLORS = ['#e0702b', '#2f7fd8', '#c2410c', '#2f9e6b', '#8b5cf6', '#c99a10', '#0e8fa8'];

export function cloudKey(r: CloudRequest) {
  return `${r.n}|${r.l}|${r.m}|${r.subshell ? 1 : 0}|${r.count}`;
}

/** Radio que encierra el 90 % de la probabilidad radial (en a₀). No depende de m: la parte angular está normalizada. */
export function radius90(n: number, l: number): number {
  return sampleRadius(n, l, 1, 0.9);
}

export function computeCloud(req: CloudRequest): CloudResult {
  const { n, l, m, subshell, count } = req;
  const rng = mulberry32(n * 100 + l * 10 + m + (subshell ? 7 : 0));
  const ms = subshell ? Array.from({ length: 2 * l + 1 }, (_, i) => i - l) : [m];
  const per = Math.floor(count / ms.length);
  const positions = new Float32Array(per * ms.length * 3);
  const tint = new Float32Array(per * ms.length * 3);
  const pos = rgb(CLOUD_PHASE_POS);
  const neg = rgb(CLOUD_PHASE_NEG);
  const mcol = CLOUD_M_COLORS.map(rgb);
  ms.forEach((mm, k) => {
    const pts = sampleOrbital(n, l, mm, 1, per, rng);
    positions.set(pts, k * per * 3);
    for (let i = 0; i < per; i++) {
      const x = pts[i * 3]!;
      const y = pts[i * 3 + 1]!;
      const z = pts[i * 3 + 2]!;
      const r = Math.hypot(x, y, z) || 1e-9;
      const c = subshell ? mcol[k % mcol.length]! : radialWavefunction(n, l, 1, r) * realYlm(l, mm, x / r, y / r, z / r) >= 0 ? pos : neg;
      const o = (k * per + i) * 3;
      tint[o] = c[0];
      tint[o + 1] = c[1];
      tint[o + 2] = c[2];
    }
  });
  return { positions, tint, count: per * ms.length };
}
