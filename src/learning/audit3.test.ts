/**
 * Regresiones de la auditoría externa de ATOM 2.0 (tercera generación).
 * Cada bloque cita el hallazgo (P0.x / P1.x) que reproduce.
 */
import { describe, expect, it } from 'vitest';
import { checkAnswer } from './checker';
import { buildEvidence, type PartRecord } from './evidence';
import { buildWaveExercise } from './generators/photon';
import type { AnswerSpec } from './types';

const nm500: AnswerSpec = { kind: 'numeric', value: 500, unit: 'nm', relTol: 0.01, sigFigs: 3 };

const rec = (id: string, over: Partial<PartRecord> = {}): PartRecord => ({ id, credit: 1, attempts: 1, revealed: false, errors: [], carried: false, sigFigIssue: false, ...over });

describe('P0.1 — falta de unidad separada de la corrección numérica', () => {
  it('«27» frente a 500 nm: el error es numérico, no «unidad-falta»', () => {
    const r = checkAnswer(nm500, '27');
    expect(r.correct).toBe(false);
    expect(r.errorKind).not.toBe('unidad-falta');
    expect(r.valueCorrect).toBe(false);
    expect(r.secondary?.some((e) => e.kind === 'unidad-falta')).toBe(true);
    expect(r.message).toMatch(/falta la unidad/);
  });
  it('«500» sin unidad: número correcto, solo falta la unidad', () => {
    const r = checkAnswer(nm500, '500');
    expect(r.errorKind).toBe('unidad-falta');
    expect(r.valueCorrect).toBe(true);
  });
  it('«5000» sin unidad: se diagnostica la potencia de 10 y además la unidad', () => {
    const r = checkAnswer(nm500, '5000');
    expect(r.errorKind).toBe('orden-de-magnitud');
    expect(r.secondary?.[0]?.kind).toBe('unidad-falta');
  });
  it('un valor sin unidad y erróneo no concede evidencia conceptual mínima', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const first = ex.parts[0]!;
    const r = checkAnswer(first.answer, '27');
    const recs = ex.parts.map((p, i) =>
      i === 0
        ? rec(p.id, { credit: 0, revealed: true, attempts: 2, errors: [{ kind: r.errorKind!, skill: r.errorSkill, valueCorrect: r.valueCorrect }, ...(r.secondary ?? [])] })
        : rec(p.id),
    );
    const ev = buildEvidence(ex, recs);
    const nodes = first.nodeIds?.length ? first.nodeIds : ex.nodeIds;
    // El primer paso aporta 0 a sus apartados (antes se forzaba ≥ 0,75 solo por faltar la unidad).
    const only = buildEvidence({ ...ex, parts: [first] }, [recs[0]!]);
    for (const n of nodes) expect(only.nodes[n]!.y).toBe(0);
    expect(ev.skills.unidades!.y).toBeLessThan(1);
  });
  it('unidad olvidada con el número correcto y resuelto después: el apartado conserva 0,75', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const first = ex.parts[0]!;
    const only = buildEvidence({ ...ex, parts: [first] }, [rec(first.id, { credit: 0.5, attempts: 2, errors: [{ kind: 'unidad-falta', skill: 'unidades', valueCorrect: true }] })]);
    for (const y of Object.values(only.nodes)) expect(y.y).toBe(0.75);
    expect(only.skills.unidades!.y).toBe(0);
  });
  it('unidad incompatible: sin suelo conceptual', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const first = ex.parts[0]!;
    const only = buildEvidence({ ...ex, parts: [first] }, [rec(first.id, { credit: 0.5, attempts: 2, errors: [{ kind: 'unidad-incompatible', skill: 'unidades' }] })]);
    for (const y of Object.values(only.nodes)) expect(y.y).toBe(0.5);
  });
  it('un paso revelado no recibe suelo aunque el error fuera de unidades', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const first = ex.parts[0]!;
    const only = buildEvidence({ ...ex, parts: [first] }, [rec(first.id, { credit: 0, revealed: true, attempts: 2, errors: [{ kind: 'unidad-falta', skill: 'unidades', valueCorrect: true }] })]);
    for (const y of Object.values(only.nodes)) expect(y.y).toBe(0);
  });
});

describe('P0.4 — cifras significativas con evidencia simétrica', () => {
  it('respuesta correcta con cifras adecuadas → evaluable y positiva', () => {
    const r = checkAnswer(nm500, '500 nm');
    expect(r.correct).toBe(true);
    // «500» es ambiguo (ceros finales): no permite evaluar cifras.
    expect(r.sigFigsAssessed).toBe(false);
    const r2 = checkAnswer(nm500, '5,00·10^2 nm');
    expect(r2.sigFigsAssessed).toBe(true);
    expect(r2.errorKind).toBeUndefined();
  });
  it('la competencia «cifras» sube con aciertos evaluables y baja con fallos', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const p = ex.parts[0]!;
    const good = buildEvidence({ ...ex, parts: [p] }, [rec(p.id, { sigFigsAssessed: true })]);
    expect(good.skills.cifras).toEqual({ y: 1, n: 1 });
    const badEv = buildEvidence({ ...ex, parts: [p] }, [rec(p.id, { sigFigIssue: true, sigFigsAssessed: true })]);
    expect(badEv.skills.cifras).toEqual({ y: 0, n: 1 });
  });
  it('sin criterio de cifras o con número ambiguo no hay evidencia sobre «cifras»', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const p = ex.parts[0]!;
    const none = buildEvidence({ ...ex, parts: [p] }, [rec(p.id, { sigFigsAssessed: false })]);
    expect(none.skills.cifras).toBeUndefined();
    const noSpec = checkAnswer({ kind: 'numeric', value: 2, unit: 'nm' }, '2,00 nm');
    expect(noSpec.sigFigsAssessed).toBe(false);
  });
});

describe('P0.2 — ningún enunciado revela la solución', async () => {
  const { SOURCE_EXERCISES, GENERATORS } = await import('./registry');
  const { formatNumber } = await import('../science/numbers');
  const LEAK = /\bSol\.|\bSoluci[oó]n\s*:|\bRespuesta\s*:|\bResultado\s*:/i;
  const all = [
    ...SOURCE_EXERCISES.map((s) => ({ ref: s.ref, ex: s.build() })),
    ...GENERATORS.flatMap((g) => g.difficulties.flatMap((d) => [1, 7, 42].map((seed) => ({ ref: `${g.id}:${d}:${seed}`, ex: g.create(seed, d) })))),
  ];
  it.each(all.map((a) => [a.ref, a.ex] as const))('%s', (_ref, ex) => {
    const text = [ex.statement, ...ex.parts.map((p) => p.prompt)].join('\n');
    expect(text).not.toMatch(LEAK);
    // Resultados numéricos con ≥ 4 cifras no deben aparecer literalmente en el enunciado.
    for (const p of ex.parts) {
      if (p.answer.kind !== 'numeric') continue;
      const m = formatNumber(p.answer.value, { sig: 4 }).split(/[·×]/)[0]!.trim();
      // Mantisas «redondas» (3,000…) coinciden con constantes del enunciado (c = 3,00·10⁸): no son fuga.
      if (m.replace(/[^\d]/g, '').replace(/0+$/, '').length < 3) continue;
      expect(ex.statement.includes(m) && !(ex.data ?? []).some((d) => d.value.includes(m)), `${m} en el enunciado`).toBe(false);
    }
  });
});

describe('P0.3 — informe de examen con evidencia granular', () => {
  it('un fallo en un paso no rebaja los apartados de los demás pasos', async () => {
    const { buildSpectrumExam } = await import('./generators/exam');
    const { aggregateNodeEvidence } = await import('./evidence');
    const ex = buildSpectrumExam(1, 3, 3, 't');
    // Falla solo el último paso.
    const last = ex.parts[ex.parts.length - 1]!;
    const parts = ex.parts.map((p) => rec(p.id, p === last ? { credit: 0, revealed: true, errors: [{ kind: 'calculo', skill: 'calculo' }] } : {}));
    const rep = aggregateNodeEvidence([{ exercise: ex, parts }]);
    const lastNodes = new Set(last.nodeIds ?? []);
    const untouched = Object.entries(rep).filter(([n]) => !lastNodes.has(n));
    expect(untouched.length).toBeGreaterThan(0);
    for (const [, v] of untouched) expect(v.ok / v.total).toBe(1);
    // Y es coherente con buildEvidence (misma fuente para diagnóstico e informe).
    const ev = buildEvidence(ex, parts);
    for (const [n, v] of Object.entries(ev.nodes)) expect(rep[n]!.ok / rep[n]!.total).toBeCloseTo(v.y, 10);
  });
});

describe('P1.1 — calidad adaptativa ante rendimiento extremo', async () => {
  const { initialQualityState, qualityStep, classifyWindow, noteSceneChange } = await import('../app/quality');
  it('rendimiento persistentemente muy bajo (todos los fotogramas > 250 ms) degrada la calidad', () => {
    let s = initialQualityState('alta', 0);
    for (let i = 1; i <= 2; i++) s = qualityStep(s, { fps: 3, longestFrameMs: 400, medianFrameMs: 330 }, i * 2000);
    expect(s.tier).toBe('media');
    for (let i = 3; i <= 4; i++) s = qualityStep(s, { fps: 3, longestFrameMs: 400, medianFrameMs: 330 }, i * 2000);
    expect(s.tier).toBe('baja');
  });
  it('un bloqueo aislado con mediana fluida se descarta', () => {
    const s = initialQualityState('alta', 0);
    expect(classifyWindow(s, { fps: 40, longestFrameMs: 600, medianFrameMs: 16.7 }, 5000)).toBe('pico-aislado');
  });
  it('durante la gracia de un cambio de escena no se cuentan ventanas', () => {
    let s = noteSceneChange(initialQualityState('alta', 0), 10_000);
    expect(classifyWindow(s, { fps: 5, longestFrameMs: 300, medianFrameMs: 200 }, 12_000)).toBe('gracia');
    for (let i = 0; i < 5; i++) s = qualityStep(s, { fps: 5, longestFrameMs: 300, medianFrameMs: 200 }, 10_500 + i * 500);
    expect(s.tier).toBe('alta');
    expect(classifyWindow(s, { fps: 5, longestFrameMs: 300, medianFrameMs: 200 }, 13_500)).toBe('muy-baja');
  });
  it('GPU potente: nunca baja con 60 fps estables y picos esporádicos', () => {
    let s = initialQualityState('alta', 0);
    for (let i = 1; i <= 100; i++) s = qualityStep(s, { fps: 60, longestFrameMs: i % 10 === 0 ? 300 : 20, medianFrameMs: 16.6 }, i * 2000);
    expect(s.tier).toBe('alta');
  });
  it('rendimiento moderadamente bajo sigue necesitando 3 ventanas (sin degradaciones nerviosas)', () => {
    let s = initialQualityState('alta', 0);
    s = qualityStep(s, { fps: 38, longestFrameMs: 40, medianFrameMs: 26 }, 2000);
    s = qualityStep(s, { fps: 38, longestFrameMs: 40, medianFrameMs: 26 }, 4000);
    expect(s.tier).toBe('alta');
    s = qualityStep(s, { fps: 38, longestFrameMs: 40, medianFrameMs: 26 }, 6000);
    expect(s.tier).toBe('media');
  });
});
