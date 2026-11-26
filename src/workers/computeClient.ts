/**
 * Cliente genérico de cálculo en Web Worker: caché LRU acotada por memoria, descarte de peticiones
 * obsoletas (solo se atiende la última pendiente: el resto se resuelve con `null`), cancelación del
 * trabajo en curso cuando dejó de interesar, y alternativa síncrona si no hay Workers.
 */
export interface ComputeClient<Req, Res> {
  request(req: Req): Promise<Res | null>;
  cached(req: Req): Res | undefined;
  /** Descarta la petición pendiente (p. ej., al desmontar la vista) */
  cancel(): void;
  stats(): { entries: number; bytes: number };
}

export function createComputeClient<Req extends object, Res>(opts: {
  makeWorker: () => Worker;
  compute: (req: Req) => Res;
  key: (req: Req) => string;
  bytes: (res: Res) => number;
  transfer: (res: Res) => Transferable[];
  maxBytes: number;
}): ComputeClient<Req, Res> {
  const cache = new Map<string, Res>();
  let cacheBytes = 0;
  let worker: Worker | null = null;
  let workerFailed = false;
  let nextId = 1;
  let busy = false;
  let pending: { req: Req; resolve: (r: Res | null) => void; reject: (e: unknown) => void } | null = null;
  const inflight = new Map<number, { key: string; resolve: (r: Res | null) => void; reject: (e: unknown) => void }>();

  const remember = (key: string, r: Res) => {
    if (cache.has(key)) return;
    cache.set(key, r);
    cacheBytes += opts.bytes(r);
    while (cacheBytes > opts.maxBytes && cache.size > 1) {
      const oldest = cache.keys().next().value!;
      cacheBytes -= opts.bytes(cache.get(oldest)!);
      cache.delete(oldest);
    }
  };
  const cached = (req: Req) => {
    const k = opts.key(req);
    const hit = cache.get(k);
    if (hit) {
      cache.delete(k);
      cache.set(k, hit);
    }
    return hit;
  };
  const getWorker = (): Worker | null => {
    if (workerFailed || typeof Worker === 'undefined') return null;
    if (!worker) {
      try {
        worker = opts.makeWorker();
        worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; res?: Res; error?: string }>) => {
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
  };
  const pump = () => {
    if (busy || !pending) return;
    const job = pending;
    pending = null;
    const key = opts.key(job.req);
    const hit = cache.get(key);
    if (hit) {
      job.resolve(hit);
      pump();
      return;
    }
    const w = getWorker();
    if (!w) {
      try {
        const r = opts.compute(job.req);
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
  };
  return {
    cached,
    request(req) {
      const hit = cached(req);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve, reject) => {
        if (pending) pending.resolve(null);
        pending = { req, resolve, reject };
        pump();
      });
    },
    cancel() {
      if (pending) pending.resolve(null);
      pending = null;
    },
    stats: () => ({ entries: cache.size, bytes: cacheBytes }),
  };
}

/** Cuerpo estándar de un Worker de cálculo puro. */
export function serveCompute<Req, Res>(compute: (req: Req) => Res, transfer: (res: Res) => Transferable[]) {
  self.onmessage = (e: MessageEvent<Req & { id: number }>) => {
    const { id, ...req } = e.data as Req & { id: number };
    try {
      const res = compute(req as Req);
      (self as unknown as Worker).postMessage({ id, ok: true, res }, transfer(res));
    } catch (err) {
      (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) });
    }
  };
}
