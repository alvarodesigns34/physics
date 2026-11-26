/// <reference lib="webworker" />
/**
 * Web Worker: superficies de contorno de orbitales (rejilla + marching cubes) fuera del hilo principal.
 * Devuelve las mallas como TypedArrays transferibles (sin copias).
 */
import { computeOrbitalSurfaces } from '../science/orbitalSurfaces';
import { serveCompute } from './computeClient';

serveCompute(computeOrbitalSurfaces, (res) => res.meshes.flatMap((m) => [m.positions.buffer, m.normals.buffer]));
