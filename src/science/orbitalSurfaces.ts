/**
 * Superficies de contorno de un orbital (o de un subnivel completo): una malla por lóbulo de signo
 * (ψ > 0 y ψ < 0) o, en el modo de subnivel, una malla |ψ| por orbital m. Función pura, apta para Workers.
 */
import { orbitalGrid } from './isosurface';
import { polygonize } from './marching';

export interface SurfaceRequest {
  n: number;
  l: number;
  m: number;
  subshell: boolean;
  /** Puntos de rejilla por eje */
  res: number;
  /** Fracción de probabilidad encerrada (0,5–0,99) */
  p: number;
}

export interface SurfaceMesh {
  /** Signo de ψ (+1, −1) o 0 para |ψ| (modo subnivel) */
  sign: 1 | -1 | 0;
  m: number;
  positions: Float32Array;
  normals: Float32Array;
}

export interface SurfaceResult {
  meshes: SurfaceMesh[];
  /** Semilado de la rejilla (a₀) */
  half: number;
  /** Probabilidad encerrada realmente (media de los orbitales) */
  enclosed: number;
  res: number;
}

export function surfaceKey(r: SurfaceRequest): string {
  return `${r.n}|${r.l}|${r.subshell ? 'S' : r.m}|${r.res}|${r.p.toFixed(3)}`;
}

export function computeOrbitalSurfaces(r: SurfaceRequest): SurfaceResult {
  if (!(r.p > 0 && r.p < 1)) throw new RangeError('La fracción de probabilidad debe estar entre 0 y 1');
  const ms = r.subshell ? Array.from({ length: 2 * r.l + 1 }, (_, i) => i - r.l) : [r.m];
  const meshes: SurfaceMesh[] = [];
  let half = 0;
  let enclosed = 0;
  for (const m of ms) {
    const g = orbitalGrid(r.n, r.l, m, r.res, r.p);
    half = g.half;
    enclosed += g.enclosed / ms.length;
    if (r.subshell) {
      const abs = new Float32Array(g.psi.length);
      for (let i = 0; i < abs.length; i++) abs[i] = Math.abs(g.psi[i]!);
      const poly = polygonize(abs, r.res, g.iso, g.half);
      if (poly.triangles) meshes.push({ sign: 0, m, positions: poly.positions, normals: poly.normals });
    } else {
      for (const sign of [1, -1] as const) {
        const f = sign === 1 ? g.psi : g.psi.map((v) => -v);
        const poly = polygonize(f, r.res, g.iso, g.half);
        if (poly.triangles) meshes.push({ sign, m, positions: poly.positions, normals: poly.normals });
      }
    }
  }
  return { meshes, half, enclosed, res: r.res };
}
