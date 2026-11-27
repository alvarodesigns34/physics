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

describe('P0 (auditoría 4.0): ordenación cuyo orden inicial ya es el correcto', async () => {
  const { gradeQuestion, isAnswered } = await import('./examSession');
  const ex = {
    id: 'x', generatorId: 'x', nodeIds: ['7.7'], difficulty: 2 as const, title: '', statement: '', stepwise: false,
    hints: ['', '', ''] as [string, string, string], solution: [],
    parts: [{ id: 'o', prompt: 'Ordena', canonical: 'a, b', explanation: '', answer: { kind: 'order' as const, items: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOrder: ['a', 'b'] } }],
  };
  it('sin confirmar: sin responder; confirmado: respondida y CORRECTA', () => {
    expect(isAnswered(ex.parts[0]!, undefined)).toBe(false);
    expect(isAnswered(ex.parts[0]!, undefined, true)).toBe(true);
    const g = gradeQuestion(ex, {}, 1, ['o']);
    expect(g.state).toBe('respondida');
    expect(g.score).toBe(1);
    expect(gradeQuestion(ex, {}, 1).state).toBe('sin-responder');
  });
});

describe('Crédito por procedimiento en el simulacro (ATOM 5.0)', async () => {
  const { gradeQuestion, PROCEDURE_CREDIT } = await import('./examSession');
  const { buildWaveExercise } = await import('./generators/photon');
  const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 1, 'onda-lambda:1:1');
  const nu = ex.parts.find((p) => p.prompt.startsWith('Frecuencia'))!;
  it('respuesta mal escrita, pero el procedimiento calcula bien el paso → crédito parcial', () => {
    const g = gradeQuestion(ex, { [nu.id]: '6·10^13 Hz' }, 1, [], 'ν = 3·10^8 / 5·10^-7 = 6·10^14 Hz');
    const p = g.parts.find((x) => x.part.id === nu.id)!;
    expect(p.byProcedure).toBe(true);
    expect(p.credit).toBe(PROCEDURE_CREDIT);
  });
  it('procedimiento con error aritmético → sin crédito y error localizado', () => {
    const g = gradeQuestion(ex, { [nu.id]: '6·10^13 Hz' }, 1, [], 'ν = 3·10^8 / 5·10^-7 = 6·10^13 Hz');
    expect(g.parts.find((x) => x.part.id === nu.id)!.credit).toBe(0);
    expect(g.procedure?.issue).toMatchObject({ kind: 'aritmetica', line: 1 });
  });
  it('sin procedimiento, nada cambia', () => {
    expect(gradeQuestion(ex, { [nu.id]: '6·10^13 Hz' }, 1).parts.find((x) => x.part.id === nu.id)!.credit).toBe(0);
  });
});

describe('Causa probable de las preguntas sin responder (ATOM 5.0)', async () => {
  const { unansweredCauses } = await import('./examSession');
  const st = ['respondida', 'sin-responder', 'parcial', 'sin-responder', 'sin-responder'] as const;
  const t0 = 1_000_000;
  it('cronometrado y agotado: al final → tiempo; intercaladas → omitida', () => {
    expect(unansweredCauses([...st], { minutes: 30, startedAt: t0, endedBy: 'tiempo' })).toEqual({ 1: 'omitida', 3: 'tiempo', 4: 'tiempo' });
    expect(unansweredCauses([...st], { minutes: 30, startedAt: t0, finishedAt: t0 + 29.5 * 60_000 })).toEqual({ 1: 'omitida', 3: 'tiempo', 4: 'tiempo' });
  });
  it('ATOM 5.1: sin límite de tiempo nunca se atribuye a la falta de tiempo', () => {
    expect(unansweredCauses([...st], { minutes: null, startedAt: t0, finishedAt: t0 + 3 * 3_600_000 })).toEqual({ 1: 'omitida', 3: 'sin-terminar', 4: 'sin-terminar' });
  });
  it('ATOM 5.1: entregado con tiempo de sobra tampoco', () => {
    expect(unansweredCauses([...st], { minutes: 30, startedAt: t0, finishedAt: t0 + 10 * 60_000, endedBy: 'entrega' })).toEqual({ 1: 'omitida', 3: 'sin-terminar', 4: 'sin-terminar' });
  });
  it('sin datos del reloj: no se presume nada', () => {
    expect(unansweredCauses(['sin-responder', 'sin-responder'])).toEqual({ 0: 'sin-terminar', 1: 'sin-terminar' });
  });
});

describe('ATOM 5.1 · integración: gradeSession usa el reloj de la sesión', async () => {
  const { gradeSession, newSession, isValidSession } = await import('./examSession');
  const { GENERATORS } = await import('./registry');
  const exs = GENERATORS.slice(0, 3).map((g) => g.create(1, g.difficulties[0]!));
  it('simulacro sin límite entregado: lo final es «sin terminar» y no hay margen', () => {
    const s = { ...newSession('x', exs, [1, 1, 1], null, 1, 0), finishedAt: 600_000 };
    const r = gradeSession(s, exs);
    expect(Object.values(r.unansweredCause)).toEqual(['sin-terminar', 'sin-terminar', 'sin-terminar']);
    expect(r.minutesLeft).toBeNull();
  });
  it('cronometrado y cerrado por el reloj: «tiempo»', () => {
    const s = { ...newSession('x', exs, [1, 1, 1], 20, 1, 0), finishedAt: 20 * 60_000, endedBy: 'tiempo' as const };
    expect(Object.values(gradeSession(s, exs).unansweredCause)).toEqual(['tiempo', 'tiempo', 'tiempo']);
  });
  it('validación: índices, longitudes y campos nuevos', () => {
    const base = newSession('x', exs, [1, 1, 1], 20, 1, 0);
    expect(isValidSession(base)).toBe(true);
    expect(isValidSession({ ...base, current: 7 })).toBe(false);
    expect(isValidSession({ ...base, current: -1 })).toBe(false);
    expect(isValidSession({ ...base, flagged: [9] })).toBe(false);
    expect(isValidSession({ ...base, endedBy: 'otro' })).toBe(false);
    expect(isValidSession({ ...base, answers: { 5: {} } })).toBe(false);
    expect(isValidSession({ ...base, answers: { 0: { a: 'x'.repeat(6000) } } })).toBe(false);
    expect(isValidSession({ ...base, answers: { 0: { a: ['1', '2'] } } })).toBe(true);
    expect(isValidSession({ ...base, finishedAt: Infinity })).toBe(false);
  });
});
