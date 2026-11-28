/**
 * Clientes de cálculo de Quantum Space (superficies y nubes), cada uno con su Worker y su caché LRU.
 */
import { computeOrbitalSurfaces, surfaceKey, type SurfaceRequest, type SurfaceResult } from '../../science/orbitalSurfaces';
import { computeCloud, cloudKey, type CloudRequest, type CloudResult } from '../../science/orbitalCloud';
import { createComputeClient } from '../../workers/computeClient';

/**
 * Presupuestos (ATOM 6.0, medidos con computeOrbitalSurfaces): un orbital a 56³ ocupa ≈ 1 MiB y un subnivel
 * completo a 48³, 3–5 MiB; una nube, ≈ 1–2 MiB. Los 96 MiB nominales de 5.2 (48 + 24 + 24) eran excesivos para
 * un iPad (además de la copia que conserva la GPU): 32 + 16 + 16 = 64 MiB siguen guardando decenas de
 * orbitales recientes. La vista previa y la refinada de un mismo orbital comparten grupo (no se abortan).
 */
const surfaceGroup = (r: SurfaceRequest) => `${r.n}|${r.l}|${r.m}|${r.subshell ? 1 : 0}|${r.p}`;
const surfaces = createComputeClient<SurfaceRequest, SurfaceResult>({
  makeWorker: () => new Worker(new URL('../../workers/orbitalSurface.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeOrbitalSurfaces,
  key: surfaceKey,
  bytes: (r) => r.meshes.reduce((a, m) => a + m.positions.byteLength + m.normals.byteLength, 0),
  transfer: (r) => r.meshes.flatMap((m) => [m.positions.buffer, m.normals.buffer]),
  maxBytes: 32 * 1024 * 1024,
  group: surfaceGroup,
});

/** Segundo cliente (con su propio Worker) para el orbital de comparación: así las dos superficies no se descartan entre sí. */
const surfacesB = createComputeClient<SurfaceRequest, SurfaceResult>({
  makeWorker: () => new Worker(new URL('../../workers/orbitalSurface.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeOrbitalSurfaces,
  key: surfaceKey,
  bytes: (r) => r.meshes.reduce((a, m) => a + m.positions.byteLength + m.normals.byteLength, 0),
  transfer: (r) => r.meshes.flatMap((m) => [m.positions.buffer, m.normals.buffer]),
  maxBytes: 16 * 1024 * 1024,
  group: surfaceGroup,
});

const clouds = createComputeClient<CloudRequest, CloudResult>({
  makeWorker: () => new Worker(new URL('../../workers/orbitalCloud.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeCloud,
  key: cloudKey,
  bytes: (r) => r.positions.byteLength + r.tint.byteLength,
  transfer: (r) => [r.positions.buffer, r.tint.buffer],
  maxBytes: 16 * 1024 * 1024,
  group: (r) => `${r.n}|${r.l}|${r.m}|${r.subshell ? 1 : 0}`,
});

export const requestSurface = surfaces.request;
export const cachedSurface = surfaces.cached;
export const requestSurfaceB = surfacesB.request;
export const cachedSurfaceB = surfacesB.cached;
export const requestCloud = clouds.request;
export const cachedCloud = clouds.cached;
export const cancelCloud = clouds.cancel;
