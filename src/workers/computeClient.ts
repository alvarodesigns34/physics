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
  stats(): { entries: number; bytes: number; cancelled: number };
}

export function createComputeClient<Req extends object, Res>(opts: {
  makeWorker: () => Worker;
  compute: (req: Req) => Res;
  key: (req: Req) => string;
  bytes: (res: Res) => number;
  transfer: (res: Res) => Transferable[];
  maxBytes: number;
  /**
   * ATOM 6.0 · Grupo de una petición: dos peticiones del mismo grupo son versiones de lo MISMO (p. ej., la
   * vista previa 32³ y la versión refinada del mismo orbital). La refinada no aborta la vista previa en
   * curso: espera a que termine (antes, en un dispositivo lento, la vista previa se perdía siempre).
   */
  group?: (req: Req) => string;
}): ComputeClient<Req, Res> {
  const cache = new Map<string, Res>();
  let cacheBytes = 0;
  let worker: Worker | null = null;
  let workerFailed = false;
  let nextId = 1;
  let busy = false;
  let pending: { req: Req; resolve: (r: Res | null) => void; reject: (e: unknown) => void } | null = null;
  const inflight = new Map<number, { key: string; group: string; resolve: (r: Res | null) => void; reject: (e: unknown) => void }>();
  const groupOf = (req: Req) => (opts.group ? opts.group(req) : opts.key(req));
  let cancelled = 0;
  /**
   * Cancelación real (ATOM 4.0): si llega una petición distinta mientras el Worker calcula otra, la del
   * Worker ya no interesa (solo importa el último estado de los controles). En lugar de esperar a que
   * termine un cálculo obsoleto, se termina el Worker y se crea otro.
   */
  const abortInflight = () => {
    if (!worker || inflight.size === 0) return;
    worker.terminate();
    worker = null;
    busy = false;
    for (const j of inflight.values()) j.resolve(null);
    cancelled += inflight.size;
    inflight.clear();
  };

  const remember = (key: string, r: Res) => {
    if (cache.has(key)) return;
    const size = opts.bytes(r);
    // ATOM 6.0: una entrada mayor que todo el presupuesto no se guarda (antes se quedaba sola en la caché,
    // por encima del límite, hasta la siguiente).
    if (size > opts.maxBytes) return;
    cache.set(key, r);
    cacheBytes += size;
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
        // ATOM 6.0: un mensaje que no se puede deserializar no debe dejar el cliente «ocupado» para siempre.
        worker.onmessageerror = () => {
          busy = false;
          for (const j of inflight.values()) j.reject(new Error('Mensaje del Worker ilegible'));
          inflight.clear();
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
    inflight.set(id, { key, group: groupOf(job.req), resolve: job.resolve, reject: job.reject });
    try {
      w.postMessage({ id, ...job.req });
    } catch {
      // ATOM 6.0: si postMessage falla (p. ej., DataCloneError), antes el cliente quedaba con busy = true y
      // ninguna petición posterior se atendía. Ahora se libera y se calcula en el hilo principal.
      inflight.delete(id);
      busy = false;
      try {
        const r = opts.compute(job.req);
        remember(key, r);
        job.resolve(r);
      } catch (e) {
        job.reject(e);
      }
      pump();
    }
  };
  return {
    cached,
    request(req) {
      const hit = cached(req);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve, reject) => {
        if (pending) pending.resolve(null);
        pending = { req, resolve, reject };
        const k = opts.key(req);
        const g = groupOf(req);
        if (busy && ![...inflight.values()].some((j) => j.key === k || j.group === g)) abortInflight();
        pump();
      });
    },
    cancel() {
      if (pending) pending.resolve(null);
      pending = null;
      abortInflight();
    },
    stats: () => ({ entries: cache.size, bytes: cacheBytes, cancelled }),
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
