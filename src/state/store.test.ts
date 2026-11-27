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

describe('ATOM 5.1 · repetición y cuaderno: una sola regla', () => {
  beforeEach(() => useStore.getState().resetProgress());
  it('un ejercicio de los documentos fallado se supera repitiéndolo limpio pasados 2 días (antes era inalcanzable)', async () => {
    const { SOURCE_EXERCISES } = await import('../learning/registry');
    const src = SOURCE_EXERCISES.find((s) => s.build().parts.length >= 1)!;
    const ex = src.build();
    const real = Date.now;
    const t0 = real();
    try {
      Date.now = () => t0;
      const fail = { correct: false, score: 0, hintsUsed: 0, parts: ex.parts.map((p) => ({ id: p.id, credit: 0, attempts: 2, revealed: false, errors: [{ kind: 'calculo' as const }], carried: false, sigFigIssue: false })) };
      useStore.getState().recordExercise(ex, fail, 'practica');
      expect(useStore.getState().notebook.filter((e) => !e.resolvedAt)).toHaveLength(1);
      // Al día siguiente: repetición inmediata, no cierra la entrada
      Date.now = () => t0 + 86_400_000;
      useStore.getState().recordExercise(ex, clean(ex as never), 'practica');
      expect(useStore.getState().notebook.filter((e) => !e.resolvedAt)).toHaveLength(1);
      // Tres días después de la última vez: recuperación espaciada, la cierra
      Date.now = () => t0 + 4 * 86_400_000;
      useStore.getState().recordExercise(ex, clean(ex as never), 'practica');
      const nb = useStore.getState().notebook;
      expect(nb.filter((e) => !e.resolvedAt)).toHaveLength(0);
      expect(nb[0]!.resolvedBy).toBe('mismo-dias-despues');
      // y aun así la evidencia de esa repetición no es «demostrada»
      expect(useStore.getState().history.at(-1)!.evidence).toBe('asistida');
    } finally {
      Date.now = real;
    }
  });
  it('con ayuda del analizador de procedimientos no se cierra el cuaderno', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 'onda-lambda:2:1');
    const fail = { correct: false, score: 0, hintsUsed: 0, parts: ex.parts.map((p) => ({ id: p.id, credit: 0, attempts: 2, revealed: false, errors: [{ kind: 'calculo' as const }], carried: false, sigFigIssue: false })) };
    useStore.getState().recordExercise(ex, fail, 'practica');
    const variant = buildWaveExercise({ value: 600, unit: 'nm' }, 2, 'onda-lambda:2:2');
    useStore.getState().recordExercise(variant, clean(variant, { procedureAssisted: true }), 'practica');
    expect(useStore.getState().notebook.filter((e) => !e.resolvedAt)).toHaveLength(1);
    useStore.getState().recordExercise(buildWaveExercise({ value: 700, unit: 'nm' }, 2, 'onda-lambda:2:3'), clean(buildWaveExercise({ value: 700, unit: 'nm' }, 2, 'onda-lambda:2:3')), 'practica');
    expect(useStore.getState().notebook.filter((e) => !e.resolvedAt)).toHaveLength(0);
  });
});
