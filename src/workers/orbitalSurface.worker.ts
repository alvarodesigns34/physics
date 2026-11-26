/// <reference lib="webworker" />
/**
 * Web Worker: superficies de contorno de orbitales (rejilla + marching cubes) fuera del hilo principal.
 * Devuelve las mallas como TypedArrays transferibles (sin copias).
 */
import { computeOrbitalSurfaces, type SurfaceRequest } from '../science/orbitalSurfaces';

self.onmessage = (e: MessageEvent<SurfaceRequest & { id: number }>) => {
  const { id, ...req } = e.data;
  try {
    const res = computeOrbitalSurfaces(req);
    const transfer = res.meshes.flatMap((m) => [m.positions.buffer, m.normals.buffer]);
    (self as unknown as Worker).postMessage({ id, ok: true, res }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) });
  }
};
