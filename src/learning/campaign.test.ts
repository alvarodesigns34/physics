import { describe, expect, it } from 'vitest';
import { MISSIONS, CHAPTERS } from './campaign';
import { checkAnswer } from './checker';
import type { ExercisePart } from './types';

const input = (p: ExercisePart) => (p.answer.kind === 'choice' ? p.answer.correct : p.answer.kind === 'order' ? p.answer.correctOrder : p.canonical);

describe('campaña (§23)', () => {
  it('cada misión tiene pasos, su capítulo existe y están ordenadas por capítulo', () => {
    let prev = 0;
    for (const m of MISSIONS) {
      expect(m.steps.length, m.code).toBeGreaterThan(0);
      expect(CHAPTERS.some((c) => c.id === m.chapter)).toBe(true);
      expect(m.chapter).toBeGreaterThanOrEqual(prev);
      prev = m.chapter;
    }
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });
  it.each(MISSIONS.map((m) => [m.code, m] as const))('%s: sus ejercicios se construyen y aceptan su propia solución', (_c, m) => {
    for (const st of m.steps) {
      if (st.kind !== 'ejercicio') continue;
      const ex = st.build();
      for (const p of ex.parts) expect(checkAnswer(p.answer, input(p)).correct, `${m.code} · ${p.id}`).toBe(true);
    }
  });
  it('las misiones que eran «pulsar un control» empiezan ahora con una predicción o un razonamiento', () => {
    for (const code of ['III-4', 'V-2', 'VII-1']) expect(MISSIONS.find((m) => m.code === code)!.steps[0]!.kind, code).toBe('ejercicio');
  });
});
