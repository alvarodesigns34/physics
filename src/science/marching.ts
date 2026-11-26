/**
 * Marching cubes (Lorensen y Cline, 1987; tablas de P. Bourke, las mismas que usa three.js) sobre un
 * campo escalar en una rejilla cúbica. Función pura, sin dependencias de renderizado, para poder
 * ejecutarse en un Web Worker y transferir los TypedArrays resultantes sin copias.
 *
 * Convención de la rejilla (la misma que orbitalGrid): coordenada = (i − size/2)/(size/2)·half,
 * índice = x + y·size + z·size². La superficie es {f = iso}; el interior es f > iso.
 */
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';

export interface Polygonized {
  positions: Float32Array;
  normals: Float32Array;
  /** Número de triángulos */
  triangles: number;
}

// Vértices del cubo (desplazamientos x, y, z) y aristas (pares de vértices), orden de Bourke.
const CORNER = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
] as const;
const EDGE = [
  [0, 1], [1, 2], [3, 2], [0, 3],
  [4, 5], [5, 6], [7, 6], [4, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
] as const;

export function polygonize(field: Float32Array, size: number, iso: number, half: number, maxTriangles = 400_000): Polygonized {
  if (!Number.isInteger(size) || size < 3 || field.length !== size * size * size) throw new RangeError('Rejilla no válida');
  if (!Number.isFinite(iso)) throw new RangeError('Isovalor no válido');
  const s2 = size * size;
  const hs = size / 2;
  const step = half / hs;
  const last = size - 1;
  let cap = 1 << 16;
  let pos = new Float32Array(cap);
  let nor = new Float32Array(cap);
  let n = 0;
  const grow = () => {
    cap *= 2;
    const p2 = new Float32Array(cap);
    p2.set(pos);
    pos = p2;
    const n2 = new Float32Array(cap);
    n2.set(nor);
    nor = n2;
  };
  const vert = new Float64Array(36);
  const vnor = new Float64Array(36);
  const cg = new Float64Array(24);
  const cv = new Float64Array(8);
  const ci = new Int32Array(24); // coordenadas enteras de los 8 vértices
  let tris = 0;
  for (let z = 0; z < last; z++) {
    for (let y = 0; y < last; y++) {
      for (let x = 0; x < last; x++) {
        let idx = 0;
        for (let c = 0; c < 8; c++) {
          const cx = x + CORNER[c]![0];
          const cy = y + CORNER[c]![1];
          const cz = z + CORNER[c]![2];
          ci[c * 3] = cx;
          ci[c * 3 + 1] = cy;
          ci[c * 3 + 2] = cz;
          const v = field[cx + cy * size + cz * s2]!;
          cv[c] = v;
          if (v < iso) idx |= 1 << c;
        }
        const bits = edgeTable[idx]!;
        if (bits === 0) continue;
        for (let c = 0; c < 8; c++) {
          const cx = ci[c * 3]!;
          const cy = ci[c * 3 + 1]!;
          const cz = ci[c * 3 + 2]!;
          const xp = cx < last ? cx + 1 : cx;
          const xm = cx > 0 ? cx - 1 : cx;
          const yp = cy < last ? cy + 1 : cy;
          const ym = cy > 0 ? cy - 1 : cy;
          const zp = cz < last ? cz + 1 : cz;
          const zm = cz > 0 ? cz - 1 : cz;
          const row = cy * size + cz * s2;
          cg[c * 3] = field[xm + row]! - field[xp + row]!;
          cg[c * 3 + 1] = field[cx + ym * size + cz * s2]! - field[cx + yp * size + cz * s2]!;
          cg[c * 3 + 2] = field[cx + cy * size + zm * s2]! - field[cx + cy * size + zp * s2]!;
        }
        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const a = EDGE[e]![0];
          const b = EDGE[e]![1];
          const va = cv[a]!;
          const vb = cv[b]!;
          const t = vb === va ? 0.5 : (iso - va) / (vb - va);
          for (let k = 0; k < 3; k++) {
            const pa = ci[a * 3 + k]!;
            const pb = ci[b * 3 + k]!;
            vert[e * 3 + k] = (pa + t * (pb - pa) - hs) * step;
            vnor[e * 3 + k] = cg[a * 3 + k]! + t * (cg[b * 3 + k]! - cg[a * 3 + k]!);
          }
        }
        const base = idx * 16;
        for (let i = 0; triTable[base + i]! !== -1; i += 3) {
          if (tris >= maxTriangles) break;
          if (n + 9 > cap) grow();
          for (let j = 0; j < 3; j++) {
            const e = triTable[base + i + j]! * 3;
            const nx = vnor[e]!;
            const ny = vnor[e + 1]!;
            const nz = vnor[e + 2]!;
            const l = Math.hypot(nx, ny, nz) || 1;
            pos[n] = vert[e]!;
            pos[n + 1] = vert[e + 1]!;
            pos[n + 2] = vert[e + 2]!;
            nor[n] = nx / l;
            nor[n + 1] = ny / l;
            nor[n + 2] = nz / l;
            n += 3;
          }
          tris++;
        }
      }
    }
  }
  return { positions: pos.slice(0, n), normals: nor.slice(0, n), triangles: tris };
}

/** Área total de una malla de triángulos (para pruebas de convergencia). */
export function meshArea(positions: Float32Array): number {
  let a = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const ux = positions[i + 3]! - positions[i]!;
    const uy = positions[i + 4]! - positions[i + 1]!;
    const uz = positions[i + 5]! - positions[i + 2]!;
    const vx = positions[i + 6]! - positions[i]!;
    const vy = positions[i + 7]! - positions[i + 1]!;
    const vz = positions[i + 8]! - positions[i + 2]!;
    a += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }
  return a;
}
