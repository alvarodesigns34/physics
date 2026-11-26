/**
 * Cliente del Worker de superficies: caché LRU acotada por memoria, descarte de peticiones obsoletas
 * (solo se envía la última pendiente) y alternativa síncrona si no hay Workers.
 */
import { computeOrbitalSurfaces, surfaceKey, type SurfaceRequest, type SurfaceResult } from '../../science/orbitalSurfaces';

const MAX_CACHE_BYTES = 48 * 1024 * 1024;
const cache = new Map<string, SurfaceResult>();
let cacheBytes = 0;

function bytesOf(r: SurfaceResult) {
  return r.meshes.reduce((a, m) => a + m.positions.byteLength + m.normals.byteLength, 0);
}

function remember(key: string, r: SurfaceResult) {
  if (cache.has(key)) return;
  cache.set(key, r);
  cacheBytes += bytesOf(r);
  while (cacheBytes > MAX_CACHE_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value!;
    cacheBytes -= bytesOf(cache.get(oldest)!);
    cache.delete(oldest);
  }
}

export function cachedSurface(req: SurfaceRequest): SurfaceResult | undefined {
  const k = surfaceKey(req);
  const hit = cache.get(k);
  if (hit) {
    // LRU: renovar la posición
    cache.delete(k);
    cache.set(k, hit);
  }
  return hit;
}

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;
let busy = false;
let pending: { req: SurfaceRequest; resolve: (r: SurfaceResult) => void; reject: (e: unknown) => void } | null = null;
const inflight = new Map<number, { key: string; resolve: (r: SurfaceResult) => void; reject: (e: unknown) => void }>();

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('../../workers/orbitalSurface.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; res?: SurfaceResult; error?: string }>) => {
        const job = inflight.get(e.data.id);
        inflight.delete(e.data.id);
        busy = false;
        if (job) {
          if (e.data.ok && e.data.res) {
            remember(job.key, e.data.res);
            job.resolve(e.data.res);
          } else job.reject(new Error(e.data.error));
        }
        pump();
      };
      worker.onerror = () => {
        workerFailed = true;
        worker = null;
        busy = false;
        for (const j of inflight.values()) j.reject(new Error('Worker no disponible'));
        inflight.clear();
        pump();
      };
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return worker;
}

function pump() {
  if (busy || !pending) return;
  const job = pending;
  pending = null;
  const key = surfaceKey(job.req);
  const hit = cache.get(key);
  if (hit) {
    job.resolve(hit);
    pump();
    return;
  }
  const w = getWorker();
  if (!w) {
    try {
      const r = computeOrbitalSurfaces(job.req);
      remember(key, r);
      job.resolve(r);
    } catch (e) {
      job.reject(e);
    }
    return;
  }
  const id = nextId++;
  busy = true;
  inflight.set(id, { key, resolve: job.resolve, reject: job.reject });
  w.postMessage({ id, ...job.req });
}

/**
 * Pide una superficie. Si llega otra petición antes de que el Worker quede libre, la anterior pendiente
 * se descarta (se resuelve con `null`): solo interesa el último estado de los controles.
 */
export function requestSurface(req: SurfaceRequest): Promise<SurfaceResult | null> {
  const hit = cachedSurface(req);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    if (pending) pending.resolve(null as unknown as SurfaceResult);
    pending = { req, resolve: resolve as (r: SurfaceResult) => void, reject };
    pump();
  });
}
