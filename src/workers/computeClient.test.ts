import { describe, expect, it } from 'vitest';
import { createComputeClient } from './computeClient';

/** Worker simulado: guarda los mensajes y responde cuando la prueba lo indica. */
class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  posted: { id: number; n: number }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: { id: number; n: number }) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  reply(k = 0) {
    const m = this.posted[k]!;
    this.onmessage?.({ data: { id: m.id, ok: true, res: { v: m.n * 10 } } } as MessageEvent);
  }
}

const client = () =>
  createComputeClient<{ n: number }, { v: number }>({
    makeWorker: () => new FakeWorker() as unknown as Worker,
    compute: (r) => ({ v: r.n * 10 }),
    key: (r) => String(r.n),
    bytes: () => 8,
    transfer: () => [],
    maxBytes: 1e6,
  });

describe('cliente de Worker: cancelación real de cálculos obsoletos', () => {
  it('una petición distinta termina el Worker que calcula la anterior y resuelve esta con null', async () => {
    (globalThis as { Worker?: unknown }).Worker ??= FakeWorker;
    FakeWorker.all = [];
    const c = client();
    const a = c.request({ n: 1 });
    const b = c.request({ n: 2 });
    expect(await a).toBeNull();
    expect(FakeWorker.all[0]!.terminated).toBe(true);
    expect(FakeWorker.all).toHaveLength(2);
    FakeWorker.all[1]!.reply(0);
    expect(await b).toEqual({ v: 20 });
    expect(c.stats().cancelled).toBe(1);
  });
  it('la misma petición repetida no cancela el cálculo en curso', async () => {
    FakeWorker.all = [];
    const c = client();
    const a = c.request({ n: 3 });
    const b = c.request({ n: 3 });
    expect(FakeWorker.all[0]!.terminated).toBe(false);
    FakeWorker.all[0]!.reply(0);
    expect(await a).toEqual({ v: 30 });
    expect(await b).toEqual({ v: 30 });
  });
  it('cancel() al desmontar también detiene el cálculo en curso', async () => {
    FakeWorker.all = [];
    const c = client();
    const a = c.request({ n: 4 });
    c.cancel();
    expect(await a).toBeNull();
    expect(FakeWorker.all[0]!.terminated).toBe(true);
  });
});

describe('ATOM 6.0 · refinamiento, fallos de postMessage y entradas grandes', () => {
  const grouped = (over: Partial<Parameters<typeof createComputeClient<{ n: number; res: number }, { v: number }>>[0]> = {}) =>
    createComputeClient<{ n: number; res: number }, { v: number }>({
      makeWorker: () => new FakeWorker() as unknown as Worker,
      compute: (r) => ({ v: r.n * 10 + r.res }),
      key: (r) => `${r.n}:${r.res}`,
      group: (r) => String(r.n),
      bytes: () => 8,
      transfer: () => [],
      maxBytes: 1e6,
      ...over,
    });
  it('la versión refinada del MISMO orbital no aborta la vista previa en curso: espera y se calcula después', async () => {
    (globalThis as { Worker?: unknown }).Worker ??= FakeWorker;
    FakeWorker.all = [];
    const c = grouped();
    const preview = c.request({ n: 1, res: 32 });
    const full = c.request({ n: 1, res: 56 });
    const w = FakeWorker.all[0]!;
    expect(w.terminated).toBe(false);
    w.onmessage?.({ data: { id: w.posted[0]!.id, ok: true, res: { v: 42 } } } as MessageEvent);
    expect(await preview).toEqual({ v: 42 });
    expect(w.posted).toHaveLength(2);
    w.onmessage?.({ data: { id: w.posted[1]!.id, ok: true, res: { v: 66 } } } as MessageEvent);
    expect(await full).toEqual({ v: 66 });
    expect(c.stats().cancelled).toBe(0);
  });
  it('un orbital DISTINTO sí aborta el cálculo obsoleto', async () => {
    FakeWorker.all = [];
    const c = grouped();
    const a = c.request({ n: 1, res: 32 });
    c.request({ n: 2, res: 32 });
    expect(await a).toBeNull();
    expect(FakeWorker.all[0]!.terminated).toBe(true);
  });
  it('si postMessage lanza una excepción, se calcula en el hilo principal y el cliente sigue atendiendo', async () => {
    FakeWorker.all = [];
    class Throwing extends FakeWorker {
      override postMessage() {
        throw new DOMException('no clonable', 'DataCloneError');
      }
    }
    const c = grouped({ makeWorker: () => new Throwing() as unknown as Worker });
    expect(await c.request({ n: 3, res: 32 })).toEqual({ v: 62 });
    expect(await c.request({ n: 4, res: 32 })).toEqual({ v: 72 });
  });
  it('un mensaje ilegible del Worker rechaza la petición y libera el cliente', async () => {
    FakeWorker.all = [];
    const c = grouped();
    const a = c.request({ n: 5, res: 32 });
    const w = FakeWorker.all[0]! as unknown as { onmessageerror: (() => void) | null };
    w.onmessageerror?.();
    await expect(a).rejects.toThrow();
    const b = c.request({ n: 6, res: 32 });
    const w2 = FakeWorker.all[0]!;
    w2.onmessage?.({ data: { id: w2.posted.at(-1)!.id, ok: true, res: { v: 1 } } } as MessageEvent);
    expect(await b).toEqual({ v: 1 });
  });
  it('una entrada mayor que todo el presupuesto se entrega pero no se guarda en caché', async () => {
    FakeWorker.all = [];
    const c = grouped({ bytes: () => 2e6 });
    const a = c.request({ n: 7, res: 32 });
    const w = FakeWorker.all[0]!;
    w.onmessage?.({ data: { id: w.posted[0]!.id, ok: true, res: { v: 9 } } } as MessageEvent);
    expect(await a).toEqual({ v: 9 });
    expect(c.stats().entries).toBe(0);
    expect(c.cached({ n: 7, res: 32 })).toBeUndefined();
  });
});
