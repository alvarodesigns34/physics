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
  for (const p of ex.parts) for (const node of p.nodeIds ?? []) expect(NODES.some((n) => n.id === node), `${ex.id} · ${p.id}: nodo ${node}`).toBe(true);
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

describe('widget de masa media', () => {
  it('rebalance mantiene la suma en 100 % y respeta el valor fijado', async () => {
    const { rebalance } = await import('../modules/guide/widgets');
    let peaks = [{ abundance: 78.99 }, { abundance: 10 }, { abundance: 11.01 }];
    for (const [i, v] of [[0, 50], [1, 100], [2, 0], [0, 0], [1, 33.3]] as const) {
      peaks = rebalance(peaks, i, v);
      expect(peaks.reduce((a, p) => a + p.abundance, 0)).toBeCloseTo(100, 9);
      expect(peaks[i]!.abundance).toBe(v);
    }
  });
});

describe('corrector: tipos de error', () => {
  const spec = { kind: 'numeric' as const, value: 6.0e14, unit: 'Hz', sigFigs: 3, relTol: 0.01 };
  const kind = (input: string) => checkAnswer(spec, input).errorKind;
  it('distingue unidad ausente, unidad incompatible, potencia de 10, signo, inverso, redondeo y cálculo', () => {
    expect(kind('6,00·10^14')).toBe('unidad-falta');
    expect(kind('6,00·10^14 m')).toBe('unidad-incompatible');
    expect(kind('6,00·10^11 Hz')).toBe('orden-de-magnitud');
    expect(kind('-6,00·10^14 Hz')).toBe('signo');
    expect(kind('1,667·10^-15 Hz')).toBe('inverso');
    expect(kind('6,15·10^14 Hz')).toBe('redondeo');
    expect(kind('4,2·10^14 Hz')).toBe('calculo');
    expect(kind('seis')).toBe('formato');
  });
  it('acepta notaciones equivalentes en español y en otras unidades compatibles', () => {
    for (const ok of ['6,00·10^14 Hz', '6,00e14 Hz', '6,00 · 10¹⁴ Hz', '600 THz', '6,00·10^14 s^-1', '6.00E14 Hz']) {
      const r = checkAnswer(spec, ok);
      expect(r.correct, ok + ' → ' + r.message).toBe(true);
    }
  });
  it('no acepta por accidente respuestas cercanas fuera de la tolerancia', () => {
    for (const no of ['6,2·10^14 Hz', '5,8·10^14 Hz', '6·10^13 Hz', '6,00·10^14 m']) expect(checkAnswer(spec, no).correct, no).toBe(false);
  });
  it('marca cifras significativas inadecuadas sin invalidar la respuesta', () => {
    const r = checkAnswer(spec, '6,0000000·10^14 Hz');
    expect(r.correct).toBe(true);
    expect(r.errorKind).toBe('cifras');
  });
});

describe('evidencia por apartado y competencia', () => {
  it('un error solo de unidades no hunde el apartado de espectros pero sí la competencia «unidades»', async () => {
    const { buildSpectrumExam } = await import('./generators/exam');
    const { buildEvidence } = await import('./evidence');
    const ex = buildSpectrumExam(1, 3, 3, 't');
    const records = ex.parts.map((p) => ({ id: p.id, credit: 1, attempts: 1, revealed: false, errors: [] as { kind: never }[], carried: false, sigFigIssue: false })) as import('./evidence').PartRecord[];
    const w = records.find((r) => r.id === 'w')!;
    w.credit = 0.5;
    w.attempts = 2;
    w.errors = [{ kind: 'idea-erronea', skill: 'unidades' }];
    const ev = buildEvidence(ex, records);
    expect(ev.nodes['3.6']!.y).toBeGreaterThanOrEqual(0.75);
    expect(ev.skills.unidades!.y).toBeLessThan(1);
    expect(ev.skills.formula!.y).toBeGreaterThan(0.8);
  });
  it('arrastre: el paso que usa bien un dato erróneo no se penaliza otra vez', async () => {
    const { buildWaveExercise } = await import('./generators/photon');
    const { buildEvidence } = await import('./evidence');
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const recs = ex.parts.map((p, i) => ({ id: p.id, credit: i === 0 ? 0 : 1, attempts: 1, revealed: false, errors: i === 0 ? [{ kind: 'orden-de-magnitud' as const, skill: 'unidades' as const }] : [], carried: i === 1, sigFigIssue: false }));
    const ev = buildEvidence(ex, recs);
    expect(ev.errors).toHaveLength(1);
    expect(ev.skills.calculo!.y).toBe(1);
  });
  it('el dominio por apartado admite crédito parcial y expresa su incertidumbre', async () => {
    const { updateMasteryY, masteryEstimate, initialMastery } = await import('./mastery');
    let m = initialMastery();
    const e0 = masteryEstimate(m);
    expect(e0.evidence).toBe('sin-datos');
    m = updateMasteryY(m, 2, 0.5, 0, 1);
    const e1 = masteryEstimate(m);
    expect(e1.evidence).toBe('escasa');
    for (let i = 0; i < 20; i++) m = updateMasteryY(m, 2, 1, 0, 1);
    const e2 = masteryEstimate(m);
    expect(e2.high - e2.low).toBeLessThan(e1.high - e1.low);
    expect(e2.demonstrated).toBe(20);
    expect(e2.evidence).toBe('solida');
  });
});

describe('exámenes y selección', () => {
  it('buildExam es reproducible con la misma semilla y no incluye contenido fuera del ámbito', async () => {
    const { NODE_BY_ID } = await import('./syllabus');
    const scope = COVERED_NODES.filter((n) => NODE_BY_ID.get(n)!.block === 6);
    for (let seed = 1; seed < 30; seed++) {
      const a = buildExam(scope, 8, seed);
      const b = buildExam(scope, 8, seed);
      expect(a.map((e) => e.statement)).toEqual(b.map((e) => e.statement));
      expect(a.length).toBe(8);
      for (const e of a) for (const n of e.nodeIds) expect(scope.includes(n), `${e.id}: ${n} fuera del bloque 6`).toBe(true);
      expect(new Set(a.map((e) => `${e.generatorId}|${e.statement}`)).size).toBe(a.length);
    }
  });
  it('shuffle (Fisher–Yates) es uniforme: χ² de las 24 permutaciones de 4 elementos', async () => {
    const { shuffle } = await import('./session');
    const { mulberry32 } = await import('../science/numbers');
    const rng = mulberry32(12345);
    const counts = new Map<string, number>();
    const N = 24000;
    for (let i = 0; i < N; i++) {
      const k = shuffle(rng, [1, 2, 3, 4]).join('');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBe(24);
    const exp = N / 24;
    const chi2 = [...counts.values()].reduce((a, c) => a + (c - exp) ** 2 / exp, 0);
    // χ² con 23 grados de libertad: el percentil 99,9 % es 49,7
    expect(chi2).toBeLessThan(49.7);
  });
  it('diagnóstico: tres errores de unidades recientes llevan a practicar conversiones con una explicación', async () => {
    const { recommend } = await import('./diagnosis');
    const history = [1, 2, 3, 4].map((i) => ({ at: i, nodeIds: ['3.6'], errors: [{ kind: 'orden-de-magnitud' as const, skill: 'unidades' as const, nodeIds: ['3.6'] }], skills: { unidades: 0, formula: 1, calculo: 1 } }));
    const rec = recommend(history, {}, {}, null);
    expect(rec?.reason).toBe('competencia');
    expect(rec?.nodeIds).toContain('3.9');
    expect(rec?.message).toMatch(/4 errores de «unidades y conversiones»/);
    expect(rec?.message).toMatch(/vas bien en/);
  });
  it('diagnóstico: un apartado fallado con un prerrequisito sin practicar recomienda el prerrequisito', async () => {
    const { recommend } = await import('./diagnosis');
    const mastery = { '7.8': { theta: -1.2, attempts: 4, correct: 1, lastSeen: 1 } };
    const history = [{ at: 1, nodeIds: ['7.8'], errors: [{ kind: 'concepto' as const, skill: 'razonamiento' as const, nodeIds: ['7.8'] }] }];
    const rec = recommend(history, mastery, {}, null);
    expect(rec?.reason).toBe('prerrequisito');
    expect(rec?.nodeIds[0]).toBe('7.7');
  });
  it('cada selección explica su motivo', () => {
    for (let seed = 1; seed < 20; seed++) {
      const sel = selectNext({ mastery: {}, cards: {}, recent: [], sessionRetry: {} }, [], Date.now(), seed);
      expect(sel.explanation.length).toBeGreaterThan(20);
    }
  });
});

describe('importación y migración del progreso', () => {
  it('rechaza archivos inválidos sin tocar nada y acepta exportaciones válidas (v1 y v2)', async () => {
    const { parseExport, validateProgress } = await import('../state/validate');
    expect(parseExport('no es json').ok).toBe(false);
    expect(parseExport(JSON.stringify({ app: 'OTRA', version: 1 })).ok).toBe(false);
    expect(parseExport(JSON.stringify({ app: 'ATOM', version: 99 })).ok).toBe(false);
    expect(parseExport('x'.repeat(2_000_001)).ok).toBe(false);
    const good = { app: 'ATOM', version: 1, settings: { sound: true, volume: 0.5 }, mastery: { '3.6': { theta: 0.4, attempts: 3, correct: 2, lastSeen: 1 } }, cards: { '3.6': { nodeId: '3.6', box: 2, due: 5 } }, history: [{ exerciseId: 'a', nodeIds: ['3.6'], difficulty: 2, correct: true, score: 1, hintsUsed: 0, at: 1, mode: 'practica' }], campaign: {}, exams: [] };
    const r = parseExport(JSON.stringify(good));
    expect(r.ok).toBe(true);
    expect(r.data!.mastery['3.6']).toBeDefined();
    // Semántica: θ fuera de rango, nodo inexistente, aciertos > intentos, ajustes fuera de rango
    for (const bad of [
      { ...good, mastery: { '3.6': { theta: 99, attempts: 1, correct: 0, lastSeen: 0 } } },
      { ...good, mastery: { '9.9': { theta: 0, attempts: 1, correct: 0, lastSeen: 0 } } },
      { ...good, mastery: { '3.6': { theta: 0, attempts: 1, correct: 5, lastSeen: 0 } } },
      { ...good, settings: { volume: 7 } },
      { ...good, history: [{ ...good.history[0], score: 2 }] },
      { ...good, history: 'no' },
    ]) expect(parseExport(JSON.stringify(bad)).ok).toBe(false);
    // Modo tolerante (datos del navegador): descarta solo lo dañado
    const t = validateProgress({ ...good, mastery: { '3.6': good.mastery['3.6'], '9.9': { theta: 0 } } }, 'tolerante');
    expect(t.ok).toBe(true);
    expect(Object.keys(t.data!.mastery)).toEqual(['3.6']);
    expect(t.issues.length).toBeGreaterThan(0);
  });
});

describe('calidad adaptativa con histéresis', () => {
  it('baja tras 3 ventanas lentas, sube solo con margen sostenido y se bloquea si oscila', async () => {
    const { initialQualityState, qualityStep } = await import('../app/quality');
    let s = initialQualityState('alta', 0);
    let t = 0;
    const feed = (fps: number, n: number, long = 30) => {
      for (let i = 0; i < n; i++) s = qualityStep(s, fps, long, (t += 2000));
    };
    feed(40, 2);
    expect(s.tier).toBe('alta'); // dos ventanas no bastan
    feed(40, 1);
    expect(s.tier).toBe('media');
    feed(60, 6);
    expect(s.tier).toBe('media'); // aún no han pasado 15 s desde el cambio… (12 s)
    feed(60, 3);
    expect(s.tier).toBe('alta'); // sube con margen sostenido
    feed(40, 3);
    expect(s.tier).toBe('media'); // vuelve a bajar en < 30 s: oscilación → bloqueo
    feed(60, 30);
    expect(s.tier).toBe('media'); // bloqueado 120 s
    feed(60, 40);
    expect(s.tier).toBe('alta');
    // Nunca supera el techo inicial; las pausas largas (cambio de laboratorio) no cuentan
    let b = initialQualityState('media', 0);
    for (let i = 0; i < 50; i++) b = qualityStep(b, 60, 30, i * 2000 + 20000);
    expect(b.tier).toBe('media');
    let c = initialQualityState('alta', 0);
    for (let i = 0; i < 10; i++) c = qualityStep(c, 20, 900, i * 2000);
    expect(c.tier).toBe('alta');
  });
});
