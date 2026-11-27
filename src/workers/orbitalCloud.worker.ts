/// <reference lib="webworker" />
/** Web Worker: nubes de probabilidad de orbitales (hasta 60 000 puntos) fuera del hilo principal. */
import { computeCloud } from '../science/orbitalCloud';
import { serveCompute } from './computeClient';

serveCompute(computeCloud, (r) => [r.positions.buffer, r.tint.buffer]);
