/** ATOM 5.0 · Integración: el almacén aplica las reglas de evidencia de extremo a extremo. */
import { beforeEach, describe, expect, it } from 'vitest';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
};
const { useStore } = await import('./store');
const { buildWaveExercise } = await import('../learning/generators/photon');

const clean = (ex: ReturnType<typeof buildWaveExercise>, extra = {}) => ({
  correct: true,
  score: 1,
  hintsUsed: 0,
  parts: ex.parts.map((p) => ({ id: p.id, credit: 1, attempts: 1, revealed: false, errors: [], carried: false, sigFigIssue: false, ...extra })),
});

describe('store.recordExercise', () => {
  beforeEach(() => useStore.getState().resetProgress());
  it('con pistas: la evidencia del intento es «asistida» y no suma aciertos demostrados', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 'onda-lambda:2:1');
    useStore.getState().recordExercise(ex, { ...clean(ex, { hinted: true }), hintsUsed: 1 }, 'practica');
    const st = useStore.getState();
    expect(st.history.at(-1)!.evidence).toBe('asistida');
    expect(Object.values(st.mastery).every((m) => (m.demonstrated ?? 0) === 0)).toBe(true);
  });
  it('repetir el mismo enunciado sube θ mucho menos que la primera vez y queda como «asistida»', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 'onda-lambda:2:1');
    const node = ex.nodeIds[0]!;
    useStore.getState().recordExercise(ex, clean(ex), 'practica');
    const t1 = useStore.getState().mastery[node]!.theta;
    useStore.getState().recordExercise(ex, clean(ex), 'practica');
    const t2 = useStore.getState().mastery[node]!.theta;
    expect(useStore.getState().history.at(-1)!.evidence).toBe('asistida');
    const firstGain = t1 - -0.5;
    expect(t2 - t1).toBeLessThan(firstGain * 0.5);
  });
});
