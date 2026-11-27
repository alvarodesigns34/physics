import { describe, expect, it } from 'vitest';
import { exerciseFromId, gradeQuestion, gradeSession, isAnswered, isValidSession, newSession, questionState } from './examSession';
import { MOCK_PROFILES, buildProfileExam } from './session';
import { SOURCE_EXERCISES } from './registry';
import type { ExercisePart } from './types';

const canon = (p: ExercisePart) => (p.answer.kind === 'choice' ? p.answer.correct : p.answer.kind === 'order' ? p.answer.correctOrder : p.canonical);

describe('simulacro profesional', () => {
  const { exercises, points } = buildProfileExam(MOCK_PROFILES[0]!, 7);
  it('los ejercicios se reconstruyen exactamente desde su id (guardado automático)', () => {
    for (const ex of exercises) expect(exerciseFromId(ex.id)?.statement).toBe(ex.statement);
    const src = SOURCE_EXERCISES[5]!.build();
    expect(exerciseFromId(src.id)?.statement).toBe(src.statement);
    expect(exerciseFromId('inventado:2:1')).toBeNull();
  });
  it('todo correcto → 10; nada respondido → 0 y todo «sin responder»', () => {
    const s = newSession('t', exercises, points, 50, 7, 0);
    exercises.forEach((ex, i) => (s.answers[i] = Object.fromEntries(ex.parts.map((p) => [p.id, canon(p)]))));
    expect(gradeSession(s, exercises).grade).toBeCloseTo(10, 6);
    const empty = gradeSession(newSession('t', exercises, points, 50, 7, 0), exercises);
    expect(empty.grade).toBe(0);
    expect(empty.unanswered).toBe(exercises.length);
    const nodes = Object.values(empty.byNode);
    expect(nodes.every((n) => n.total === 0 && n.unanswered > 0)).toBe(true);
  });
  it('crédito parcial por apartados y preguntas a medio responder', () => {
    const ex = exercises.find((e) => e.parts.length >= 3)!;
    const half = Object.fromEntries(ex.parts.slice(0, 2).map((p) => [p.id, canon(p)]));
    const g = gradeQuestion(ex, half, 2);
    expect(g.state).toBe('parcial');
    expect(g.earned).toBeCloseTo((2 / ex.parts.length) * 2, 6);
    expect(g.records.filter((r) => r.errors.some((e) => e.kind === 'incompleto'))).toHaveLength(ex.parts.length - 2);
  });
  it('un ordenar sin tocar no cuenta como respondido; una lista vacía tampoco', () => {
    const order: ExercisePart = { id: 'o', prompt: '', canonical: '', explanation: '', answer: { kind: 'order', items: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }], correctOrder: ['b', 'a'] } };
    expect(isAnswered(order, ['a', 'b'])).toBe(false);
    expect(isAnswered(order, ['b', 'a'])).toBe(true);
    expect(questionState({ ...exercises[0]!, parts: [order] }, {})).toBe('sin-responder');
  });
  it('validación de sesiones guardadas', () => {
    const s = newSession('t', exercises, points, 50, 7, 0);
    expect(isValidSession(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(isValidSession({ ...s, points: [1] })).toBe(false);
    expect(isValidSession({ ...s, minutes: -3 })).toBe(false);
    expect(isValidSession(null)).toBe(false);
  });
});
