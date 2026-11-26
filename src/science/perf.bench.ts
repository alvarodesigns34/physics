/**
 * Banco de rendimiento reproducible de los cálculos científicos más costosos (Node, un hilo).
 * Ejecutar: npm run bench
 */
import { describe, it } from 'vitest';

/** Mediana de n ejecuciones (ms), tras una de calentamiento. */
function bench(name: string, fn: () => void, opts: { iterations?: number; warmupIterations?: number } = {}) {
  it(name, () => {
    for (let i = 0; i < (opts.warmupIterations ?? 1); i++) fn();
    const t: number[] = [];
    for (let i = 0; i < (opts.iterations ?? 5); i++) {
      const t0 = performance.now();
      fn();
      t.push(performance.now() - t0);
    }
    t.sort((a, b) => a - b);
    console.log(`BENCH ${name}: mediana ${t[Math.floor(t.length / 2)]!.toFixed(1)} ms (mín ${t[0]!.toFixed(1)}, máx ${t[t.length - 1]!.toFixed(1)}, n = ${t.length})`);
  });
}
import { orbitalGrid } from './isosurface';
import { atomDensity, sampleOrbital } from './orbitals';
import { groundState } from './configuration';
import { mulberry32 } from './numbers';
import { prismGeometry } from './prism';
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

function polygonize(n: number, l: number, m: number, size: number) {
  const g = orbitalGrid(n, l, m, size, 0.9);
  const mc = new MarchingCubes(size, new THREE.MeshBasicMaterial(), false, false, 90000);
  mc.isolation = g.iso;
  mc.field.set(g.psi);
  mc.update();
  return mc.count;
}

describe('orbitales', () => {
  bench('orbitalGrid 3d, rejilla 72³ (calidad alta)', () => void orbitalGrid(3, 2, 0, 72, 0.9), { iterations: 3, warmupIterations: 1 });
  bench('orbitalGrid 3p, rejilla 56³ (calidad media)', () => void orbitalGrid(3, 1, 0, 56, 0.9), { iterations: 3, warmupIterations: 1 });
  bench('orbitalGrid 4f, rejilla 40³ (calidad baja)', () => void orbitalGrid(4, 3, 0, 40, 0.9), { iterations: 3, warmupIterations: 1 });
  bench('sampleOrbital 3d, 52 800 puntos', () => void sampleOrbital(3, 2, 0, 1, 52800, mulberry32(1)), { iterations: 5 });
  bench('atomDensity Fe, 20 000 puntos', () => void atomDensity(26, groundState(26), 20000, mulberry32(2)), { iterations: 5 });
});

describe('superficie completa (rejilla + marching cubes)', () => {
  bench('3d_z², 72³', () => void polygonize(3, 2, 0, 72), { iterations: 3 });
  bench('subnivel 3d (5 orbitales), 48³', () => {
    for (let m = -2; m <= 2; m++) polygonize(3, 2, m, 48);
  }, { iterations: 3 });
});

describe('óptica', () => {
  bench('prismGeometry + 400 rayos', () => {
    const g = prismGeometry();
    for (let l = 380; l < 780; l++) g.trace(l);
  });
});
