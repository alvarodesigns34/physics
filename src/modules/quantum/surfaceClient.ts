/**
 * Clientes de cálculo de Quantum Space (superficies y nubes), cada uno con su Worker y su caché LRU.
 */
import { computeOrbitalSurfaces, surfaceKey, type SurfaceRequest, type SurfaceResult } from '../../science/orbitalSurfaces';
import { computeCloud, cloudKey, type CloudRequest, type CloudResult } from '../../science/orbitalCloud';
import { createComputeClient } from '../../workers/computeClient';

const surfaces = createComputeClient<SurfaceRequest, SurfaceResult>({
  makeWorker: () => new Worker(new URL('../../workers/orbitalSurface.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeOrbitalSurfaces,
  key: surfaceKey,
  bytes: (r) => r.meshes.reduce((a, m) => a + m.positions.byteLength + m.normals.byteLength, 0),
  transfer: (r) => r.meshes.flatMap((m) => [m.positions.buffer, m.normals.buffer]),
  maxBytes: 48 * 1024 * 1024,
});

/** Segundo cliente (con su propio Worker) para el orbital de comparación: así las dos superficies no se descartan entre sí. */
const surfacesB = createComputeClient<SurfaceRequest, SurfaceResult>({
  makeWorker: () => new Worker(new URL('../../workers/orbitalSurface.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeOrbitalSurfaces,
  key: surfaceKey,
  bytes: (r) => r.meshes.reduce((a, m) => a + m.positions.byteLength + m.normals.byteLength, 0),
  transfer: (r) => r.meshes.flatMap((m) => [m.positions.buffer, m.normals.buffer]),
  maxBytes: 24 * 1024 * 1024,
});

const clouds = createComputeClient<CloudRequest, CloudResult>({
  makeWorker: () => new Worker(new URL('../../workers/orbitalCloud.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeCloud,
  key: cloudKey,
  bytes: (r) => r.positions.byteLength + r.tint.byteLength,
  transfer: (r) => [r.positions.buffer, r.tint.buffer],
  maxBytes: 24 * 1024 * 1024,
});

export const requestSurface = surfaces.request;
export const cachedSurface = surfaces.cached;
export const requestSurfaceB = surfacesB.request;
export const cachedSurfaceB = surfacesB.cached;
export const requestCloud = clouds.request;
export const cachedCloud = clouds.cached;
export const cancelCloud = clouds.cancel;
