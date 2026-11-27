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
