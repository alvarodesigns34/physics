import { describe, expect, it } from 'vitest';
import { checkAnswer } from './checker';
import { GENERATORS, SOURCE_EXERCISES, COVERED_NODES } from './registry';
import { NODES } from './syllabus';
import type { Exercise, ExercisePart } from './types';
import { updateMastery, initialMastery, masteryPercent, chooseDifficulty, updateCard } from './mastery';
import { buildExam, selectNext } from './session';
import { buildRydbergExercise, buildWaveExercise } from './generators/photon';

function canonicalInput(p: ExercisePart): string | string[] {
  switch (p.answer.kind) {
    case 'choice':
      return p.answer.correct;
    case 'order':
      return p.answer.correctOrder;
    default:
      return p.canonical;
  }
}

function assertSelfConsistent(ex: Exercise) {
  expect(ex.parts.length).toBeGreaterThan(0);
  expect(ex.hints).toHaveLength(3);
  expect(ex.solution.length).toBeGreaterThan(0);
  for (const node of ex.nodeIds) expect(NODES.some((n) => n.id === node), `nodo ${node}`).toBe(true);
  for (const p of ex.parts) {
    const r = checkAnswer(p.answer, canonicalInput(p));
    expect(r.correct, `${ex.id} · ${p.id}: «${String(p.canonical)}» → ${r.message}`).toBe(true);
    if (p.answer.kind === 'choice') {
      const ids = new Set(p.answer.options.map((o) => o.id));
      expect(ids.size, `${ex.id}: opciones duplicadas`).toBe(p.answer.options.length);
      p.answer.correct.forEach((c) => expect(ids.has(c)).toBe(true));
    }
  }
}

describe('autoconsistencia de todos los generadores', () => {
  for (const g of GENERATORS) {
    for (const d of g.difficulties) {
      it(`${g.id} · dificultad ${d}`, () => {
        for (let seed = 1; seed <= 60; seed++) {
          const ex = g.create(seed, d);
          expect(ex.difficulty).toBe(d);
          assertSelfConsistent(ex);
          // Determinismo
          expect(JSON.stringify(g.create(seed, d).statement)).toBe(JSON.stringify(ex.statement));
        }
      });
    }
  }
  it('ejercicios de las fuentes', () => {
    for (const s of SOURCE_EXERCISES) assertSelfConsistent(s.build());
  });
});

describe('soluciones de las fuentes', () => {
  const part = (ref: string, id: string) => SOURCE_EXERCISES.find((s) => s.ref === ref)!.build().parts.find((p) => p.id === id)!;
  it('AMP 6: ν = 6,00·10¹⁴ Hz; E = 3,98·10⁻¹⁹ J', () => {
    expect(checkAnswer(part('AMP 6', 'nu').answer, '6·10^14 Hz').correct).toBe(true);
    expect(checkAnswer(part('AMP 6', 'E').answer, '3,98e-19 J').correct).toBe(true);
    expect(checkAnswer(part('AMP 6', 'reg').answer, ['visible']).correct).toBe(true);
  });
  it('AMP 7: λ = 1,025·10⁻⁷ m; E = 12,1 eV', () => {
    expect(checkAnswer(part('AMP 7', 'l').answer, '1,025·10^-7 m').correct).toBe(true);
    expect(checkAnswer(part('AMP 7', 'l').answer, '102,5 nm').correct).toBe(true);
    expect(checkAnswer(part('AMP 7', 'eV').answer, '12,1 eV').correct).toBe(true);
    expect(checkAnswer(part('AMP 7', 'reg').answer, ['uv']).correct).toBe(true);
    expect(checkAnswer(part('AMP 7', 'serie').answer, ['lyman']).correct).toBe(true);
  });
  it('AMP 9: segunda línea de Paschen (n₂ = 5)', () => {
    expect(checkAnswer(part('AMP 9', 'n2').answer, '5').correct).toBe(true);
    expect(checkAnswer(part('AMP 9', 'ord').answer, ['2']).correct).toBe(true);
  });
  it('AMP 10: 6 líneas', () => expect(checkAnswer(part('AMP 10', 'total').answer, '6').correct).toBe(true));
  it('AMP 12d es posible (orbital 7h)', () => expect(checkAnswer(part('AMP 12d', 'valida').answer, ['valida']).correct).toBe(true));
  it('AMP 17 y 19', () => {
    expect(checkAnswer(part('AMP 17b', 'estado').answer, ['imposible']).correct).toBe(true);
    expect(checkAnswer(part('AMP 17c', 'estado').answer, ['excitado']).correct).toBe(true);
    expect(checkAnswer(part('AMP 17c', 'el').answer, 'Mg').correct).toBe(true);
    expect(checkAnswer(part('AMP 17d', 'el').answer, 'arsénico').correct).toBe(true);
    expect(checkAnswer(part('AMP 19d', 'el').answer, 'Te').correct).toBe(true);
  });
  it('AMP 15: azufre', () => {
    expect(checkAnswer(part('AMP 15', 'conf').answer, '1s2 2s2 2p6 3s2 3p4').correct).toBe(true);
    expect(checkAnswer(part('AMP 15', 'conf').answer, '[Ne] 3s² 3p⁴').correct).toBe(true);
    expect(checkAnswer(part('AMP 15', 'grupo').answer, '16').correct).toBe(true);
  });
});

describe('retroalimentación específica', () => {
  const ex = buildRydbergExercise({ from: 3, to: 1, difficulty: 2, seedId: 't', rUnit: 'cm' });
  const w = ex.parts.find((p) => p.id === 'w')!;
  it('detecta R en cm⁻¹ sin convertir', () => {
    const r = checkAnswer(w.answer, '97 547 m^-1');
    expect(r.correct).toBe(false);
    expect(r.message).toMatch(/cm⁻¹/);
  });
  it('detecta los niveles sin elevar al cuadrado', () => {
    const r = checkAnswer(w.answer, '7,316·10^6 m^-1');
    expect(r.message).toMatch(/cuadrado/);
  });
  it('detecta el signo cambiado (n₁ y n₂ intercambiados)', () => {
    expect(checkAnswer(w.answer, '-9,755·10^6 m^-1').message).toMatch(/signo/);
  });
  it('falta de unidad y magnitud equivocada', () => {
    expect(checkAnswer(w.answer, '9,755·10^6').message).toMatch(/falta la unidad/);
    expect(checkAnswer(w.answer, '9,755·10^6 Hz').message).toMatch(/frecuencia/);
  });
  it('acepta unidades equivalentes con aviso', () => {
    const r = checkAnswer(w.answer, '97 547 cm^-1');
    expect(r.correct).toBe(true);
    expect(r.warnings.length).toBe(1);
  });
  it('avisa del exceso de cifras significativas', () => {
    const r = checkAnswer(w.answer, '9754666,667 m^-1');
    expect(r.correct).toBe(true);
    expect(r.warnings[0]).toMatch(/cifras significativas/);
  });
  it('arrastre de error en la resolución paso a paso', () => {
    const wave = buildWaveExercise({ value: 500, unit: 'nm' }, 1, 'w');
    const nu = wave.parts.find((p) => p.id === 'nu')!;
    // El alumno puso λ = 5·10⁻⁶ m (mal); su ν coherente sería 6·10¹³ Hz
    const r = checkAnswer(nu.answer, '6·10^13 Hz', { previousWrong: { lm: 5e-6 } });
    expect(r.status).toBe('correcto-arrastre');
    // Sin arrastre es un error de potencia de 10
    expect(checkAnswer(nu.answer, '6·10^13 Hz').message).toMatch(/10⁻¹/);
  });
  it('configuraciones: diagnóstico razonado', () => {
    const conf = { kind: 'config' as const, electrons: 24, z: 24 };
    expect(checkAnswer(conf, '[Ar] 4s2 3d4').message).toMatch(/excepción/);
    expect(checkAnswer(conf, '[Ar] 3d5 4s1').correct).toBe(true);
    expect(checkAnswer(conf, '1s2 2s2 2p6 3s2 3p6 4s2 3d5').message).toMatch(/25 electrones/);
  });
});

describe('dominio adaptativo y repaso', () => {
  it('aciertos suben θ, fallos la bajan y las pistas reducen la ganancia', () => {
    const m0 = initialMastery();
    const up = updateMastery(m0, 2, true, 0, 1);
    const upHints = updateMastery(m0, 2, true, 3, 1);
    const down = updateMastery(m0, 2, false, 0, 1);
    expect(up.theta).toBeGreaterThan(m0.theta);
    expect(upHints.theta - m0.theta).toBeLessThan(up.theta - m0.theta);
    expect(down.theta).toBeLessThan(m0.theta);
    let m = m0;
    for (let i = 0; i < 10; i++) m = updateMastery(m, 3, true, 0, i);
    expect(masteryPercent(m)).toBeGreaterThan(80);
  });
  it('elige la dificultad en la zona de desafío', () => {
    expect(chooseDifficulty(-2, [1, 2, 3])).toBe(1);
    expect(chooseDifficulty(2, [1, 2, 3])).toBe(3);
  });
  it('Leitner: fallo → caja 1; acierto → sube', () => {
    expect(updateCard(undefined, '3.6', false, 0).box).toBe(1);
    expect(updateCard({ nodeId: '3.6', box: 2, due: 0 }, '3.6', true, 0).box).toBe(3);
  });
  it('prioriza repasos vencidos y reintentos', () => {
    const now = 10 * 86_400_000;
    const s = selectNext({ mastery: {}, cards: { '3.8': { nodeId: '3.8', box: 1, due: now - 1 } }, recent: [], sessionRetry: {} }, [], now, 42);
    expect(s.nodeId).toBe('3.8');
    expect(s.reason).toBe('repaso');
    const r = selectNext({ mastery: {}, cards: {}, recent: [], sessionRetry: { '5.4': 0 } }, [], now, 42);
    expect(r.nodeId).toBe('5.4');
  });
  it('examen con el número pedido de ejercicios del ámbito', () => {
    const exam = buildExam(['3.6', '3.7'], 5, 7);
    expect(exam).toHaveLength(5);
    exam.forEach((e) => expect(e.nodeIds.some((n) => ['3.6', '3.7', '3.4', '4.3', '3.9'].includes(n))).toBe(true));
  });
  it('cobertura: nodos con ejercicios', () => {
    expect(COVERED_NODES.length).toBeGreaterThanOrEqual(25);
  });
});

describe('problemas de nivel examen', () => {
  it('las ternas de elementos siguen la tendencia con datos reales', async () => {
    const { ELEMENT_TRIPLES } = await import('./generators/exam');
    const { compare } = await import('../science/trends');
    const { elementByZ } = await import('../science/elements');
    for (const t of ELEMENT_TRIPLES)
      for (const prop of ['radio', 'ei1', 'en'] as const)
        for (let i = 0; i < 3; i++)
          for (let j = i + 1; j < 3; j++) {
            const c = compare(prop, elementByZ(t[i]!)!, elementByZ(t[j]!)!);
            expect(c.actual, `${t.join('-')} ${prop}`).not.toBeNull();
            if (c.predicted) expect(c.predicted.z, `${t.join('-')} ${prop}`).toBe(c.actual!.z);
          }
  });
  it('espectro 3 → 1: λ = 102,5 nm, Lyman, UV', async () => {
    const { buildSpectrumExam } = await import('./generators/exam');
    const ex = buildSpectrumExam(1, 3, 2, 't');
    const get = (id: string) => ex.parts.find((p) => p.id === id)!;
    expect(checkAnswer(get('lineas').answer, '3').correct).toBe(true);
    expect(checkAnswer(get('lnm').answer, '102,5 nm').correct).toBe(true);
    expect(checkAnswer(get('eV').answer, '12,1 eV').correct).toBe(true);
    expect(checkAnswer(get('serie').answer, ['lyman']).correct).toBe(true);
    expect(checkAnswer(get('reg').answer, ['uv']).correct).toBe(true);
  });
  it('ondas: FM de 98,5 MHz → λ ≈ 3,05 m, radio', async () => {
    const { buildWaveExam } = await import('./generators/exam');
    const ex = buildWaveExam({ kind: 'nu', value: 98.5, unit: 'MHz', label: 'Una emisora emite a' }, 3, 't');
    const get = (id: string) => ex.parts.find((p) => p.id === id)!;
    expect(checkAnswer(get('l').answer, '3,05 m').correct).toBe(true);
    expect(checkAnswer(get('T').answer, '1,02e-8 s').correct).toBe(true);
    expect(checkAnswer(get('reg').answer, ['radio']).correct).toBe(true);
    expect(checkAnswer(get('mol').answer, '3,93e-5 kJ/mol').correct).toBe(true);
  });
  it('el examen tipo tiene 8 preguntas que suman 10 puntos', async () => {
    const { buildMockExam, MOCK_EXAM_PLAN } = await import('./session');
    expect(MOCK_EXAM_PLAN.reduce((a, q) => a + q.points, 0)).toBe(10);
    for (let seed = 1; seed < 20; seed++) {
      const ex = buildMockExam(seed);
      expect(ex).toHaveLength(8);
      ex.forEach(assertSelfConsistent);
    }
  });
});
