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

describe('P1.4 — umbral de probabilidad con densidades repetidas', async () => {
  const { thresholdForFraction } = await import('../science/isosurface');
  const enclosedBy = (d: Float32Array, thr: number, dV: number) => d.reduce((a, x) => (x >= thr ? a + x : a), 0) * dV;
  it('meseta: todos los puntos con la densidad del umbral cuentan', () => {
    const d = new Float32Array(100).fill(0.01); // total 1 con dV = 1
    const r = thresholdForFraction(d, 1, 0.5);
    expect(r.threshold).toBeCloseTo(0.01, 6);
    expect(r.enclosed).toBeCloseTo(enclosedBy(d, r.threshold, 1), 6);
    expect(r.enclosed).toBeCloseTo(1, 5); // la meseta entera: el conjunto {ρ ≥ u} no puede partirse
  });
  it('distribución simétrica con empates en el umbral', () => {
    const d = new Float32Array([0.4, 0.2, 0.2, 0.1, 0.1]);
    const r = thresholdForFraction(d, 1, 0.5);
    expect(r.threshold).toBeCloseTo(0.2, 6);
    expect(r.enclosed).toBeCloseTo(0.8, 6);
    expect(r.enclosed).toBeCloseTo(enclosedBy(d, r.threshold, 1), 6);
  });
  it('degenerados: densidad nula y fracción 1', () => {
    expect(thresholdForFraction(new Float32Array(10), 1, 0.9)).toEqual({ threshold: 0, enclosed: 0 });
    const d = new Float32Array([0.5, 0.25, 0.25]);
    const r = thresholdForFraction(d, 1, 1);
    expect(r.enclosed).toBeCloseTo(1, 6);
  });
  it('aleatoria: encerrado = suma exacta sobre {ρ ≥ u} y ≥ p', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const d = new Float32Array(5000).map(() => Math.round(rnd() * 20) / 20000); // muchos empates
    const dV = 1 / d.reduce((a, x) => a + x, 0);
    for (const p of [0.5, 0.9, 0.95]) {
      const r = thresholdForFraction(d, dV, p);
      expect(r.enclosed).toBeCloseTo(enclosedBy(d, r.threshold, dV), 4);
      expect(r.enclosed).toBeGreaterThanOrEqual(p - 1e-6);
    }
  });
});

describe('P1.5 — exámenes completos o limitación explicada', async () => {
  const { buildExamDetailed } = await import('./session');
  const { NODES } = await import('./syllabus');
  const { COVERED_NODES } = await import('./registry');
  it('cada apartado cubierto, solo, con 5 preguntas: completo o con explicación', () => {
    for (const n of COVERED_NODES) {
      let r;
      try {
        r = buildExamDetailed([n], 5, 11);
      } catch {
        continue; // ámbito sin ejercicios puros: error explícito, no examen vacío
      }
      if (r.exercises.length < 5) expect(r.limitation, n).toMatch(/solo admite/);
      else expect(r.limitation).toBeUndefined();
      for (const ex of r.exercises) for (const id of ex.nodeIds) expect(id).toBe(n);
    }
  });
  it('bloques completos alcanzan 10 preguntas con varias semillas', () => {
    for (const b of ['1', '3', '5', '6', '7']) {
      const scope = NODES.filter((x) => x.id.startsWith(`${b}.`)).map((x) => x.id);
      for (const seed of [1, 2, 3, 99]) {
        const r = buildExamDetailed(scope, 10, seed);
        expect(r.exercises.length, `bloque ${b} semilla ${seed}`).toBe(10);
        expect(new Set(r.exercises.map((e) => e.statement + e.parts.map((p) => p.prompt).join())).size).toBe(10);
      }
    }
  });
  it('es reproducible con la misma semilla', () => {
    const a = buildExamDetailed([], 8, 1234).exercises.map((e) => e.id);
    const b = buildExamDetailed([], 8, 1234).exercises.map((e) => e.id);
    expect(a).toEqual(b);
  });
});

describe('P1.3 — validación estricta y tolerante de estructuras anidadas', async () => {
  const { parseExport, validateProgress } = await import('../state/validate');
  const T = 1.75e12;
  const base = {
    app: 'ATOM', version: 2, settings: { sound: true },
    mastery: { '3.6': { theta: 0.2, attempts: 2, correct: 1, lastSeen: T, info: 1.2, demonstrated: 1 } },
    skills: { unidades: { theta: 0, attempts: 1, correct: 1, lastSeen: T } },
    cards: { '3.6': { nodeId: '3.6', box: 2, due: T + 1e8 } },
    history: [{ exerciseId: 'gen:2:1', nodeIds: ['3.6'], difficulty: 2, correct: false, score: 0.5, hintsUsed: 0, at: T, mode: 'examen', errors: [{ kind: 'calculo', skill: 'calculo', nodeIds: ['3.6'] }], skills: { calculo: 0 } }],
    campaign: {},
    exams: [{ at: T, scope: ['3.6'], total: 4, score: 0.5, byNode: { '3.6': { ok: 2, total: 4 } } }],
  };
  it('acepta una exportación v2 completa y coherente', () => {
    expect(parseExport(JSON.stringify(base)).issues).toEqual([]);
  });
  const mutations: [string, (b: typeof base) => unknown][] = [
    ['byNode con ok > total', (b) => ({ ...b, exams: [{ ...b.exams[0], byNode: { '3.6': { ok: 9, total: 4 } } }] })],
    ['byNode con apartado inexistente', (b) => ({ ...b, exams: [{ ...b.exams[0], byNode: { '9.9': { ok: 1, total: 1 } } }] })],
    ['byNode con valores no numéricos', (b) => ({ ...b, exams: [{ ...b.exams[0], byNode: { '3.6': { ok: 'x', total: 1 } } }] })],
    ['examen con ámbito inválido', (b) => ({ ...b, exams: [{ ...b.exams[0], scope: ['zz'] }] })],
    ['examen sin preguntas', (b) => ({ ...b, exams: [{ ...b.exams[0], total: 0 }] })],
    ['tipo de error desconocido', (b) => ({ ...b, history: [{ ...b.history[0], errors: [{ kind: 'inventado', nodeIds: ['3.6'] }] }] })],
    ['competencia desconocida en un error', (b) => ({ ...b, history: [{ ...b.history[0], errors: [{ kind: 'calculo', skill: 'magia', nodeIds: ['3.6'] }] }] })],
    ['intento correcto con puntuación 0', (b) => ({ ...b, history: [{ ...b.history[0], correct: true, score: 0 }] })],
    ['marca de tiempo absurda', (b) => ({ ...b, history: [{ ...b.history[0], at: 1e15 }] })],
    ['identificador vacío', (b) => ({ ...b, history: [{ ...b.history[0], exerciseId: '' }] })],
    ['demostrados > intentos', (b) => ({ ...b, mastery: { '3.6': { ...b.mastery['3.6'], demonstrated: 9 } } })],
    ['competencia inexistente', (b) => ({ ...b, skills: { telepatia: b.skills.unidades } })],
    ['ajuste desconocido', (b) => ({ ...b, settings: { hack: true } })],
    ['forja corrupta', (b) => ({ ...b, forge: { z: 'seis' } })],
    ['misión activa inexistente', (b) => ({ ...b, activeMission: 'Z-99' })],
  ];
  it.each(mutations)('estricto rechaza: %s', (_n, f) => {
    expect(parseExport(JSON.stringify(f(base))).ok).toBe(false);
  });
  it('tolerante conserva solo lo válido', () => {
    const r = validateProgress({ ...base, exams: [base.exams[0], { ...base.exams[0], byNode: { '3.6': { ok: 9, total: 1 } } }], forge: { z: 'x' } }, 'tolerante');
    expect(r.ok).toBe(true);
    expect(r.data!.exams).toHaveLength(1);
    expect(r.data!.forge).toBeUndefined();
    expect(r.data!.mastery['3.6']).toBeDefined();
    expect(r.issues.length).toBeGreaterThanOrEqual(2);
  });
  it('tolerante descarta repasos huérfanos', () => {
    const r = validateProgress({ ...base, mastery: {}, history: [], cards: { '5.1': { nodeId: '5.1', box: 1, due: T } } }, 'tolerante');
    expect(r.data!.cards).toEqual({});
  });
});

describe('P1.2 — nube cuántica fuera del hilo principal', async () => {
  const { computeCloud, radius90 } = await import('../science/orbitalCloud');
  it('la escala analítica (r al 90 %) coincide con la de la nube muestreada', () => {
    for (const [n, l, m] of [[1, 0, 0], [2, 1, 0], [3, 2, 1]] as const) {
      const c = computeCloud({ n, l, m, subshell: false, count: 20000 });
      const r = [];
      for (let i = 0; i < c.count; i++) r.push(Math.hypot(c.positions[i * 3]!, c.positions[i * 3 + 1]!, c.positions[i * 3 + 2]!));
      r.sort((a, b) => a - b);
      expect(r[Math.floor(r.length * 0.9)]! / radius90(n, l)).toBeCloseTo(1, 1);
    }
  });
  it('es determinista y del tamaño pedido (subnivel completo: múltiplo de 2l+1)', () => {
    const a = computeCloud({ n: 3, l: 2, m: 0, subshell: true, count: 10000 });
    const b = computeCloud({ n: 3, l: 2, m: 0, subshell: true, count: 10000 });
    expect(a.count).toBe(2000 * 5);
    expect(a.positions).toEqual(b.positions);
    expect(a.tint.length).toBe(a.count * 3);
  });
  it('el código de la escena ya no muestrea la nube en el hilo principal', async () => {
    const src = (await import('../modules/quantum/Quantum.tsx?raw')).default;
    expect(src).not.toMatch(/sampleOrbital\(/);
    expect(src).toMatch(/requestCloud/);
  });
});

describe('P1.6 — atribución granular en todos los pasos', async () => {
  const { GENERATORS, SOURCE_EXERCISES } = await import('./registry');
  const all = [
    ...GENERATORS.flatMap((g) => g.difficulties.flatMap((d) => [1, 3, 9, 22, 51].map((seed) => [`${g.id}:${d}:${seed}`, g.create(seed, d)] as const))),
    ...SOURCE_EXERCISES.map((s) => [s.ref, s.build()] as const),
  ];
  it('cada paso de un ejercicio multiapartado declara sus apartados, y solo apartados del ejercicio', () => {
    const missing: string[] = [];
    for (const [ref, ex] of all) {
      if (ex.parts.length < 2 || ex.nodeIds.length < 2) continue;
      for (const p of ex.parts) {
        if (!p.nodeIds?.length) missing.push(`${ref}/${p.id}`);
        else for (const n of p.nodeIds) expect(ex.nodeIds, `${ref}/${p.id}`).toContain(n);
      }
    }
    expect(missing).toEqual([]);
  });
  it('ningún paso hereda todos los apartados de un ejercicio con ≥ 3 apartados (salvo excepción documentada)', () => {
    const whole: string[] = [];
    for (const [ref, ex] of all) {
      if (ex.nodeIds.length < 3 || ex.parts.length < 2) continue;
      for (const p of ex.parts) if (p.nodeIds && p.nodeIds.length === ex.nodeIds.length) whole.push(`${ref}/${p.id}`);
    }
    expect(whole).toEqual([]);
  });
});

describe('P1.6 — coherencia de los apartados declarados', async () => {
  const { GENERATORS } = await import('./registry');
  it('los apartados estáticos de cada generador cubren los de sus ejercicios (pureza de ámbito en exámenes)', () => {
    const out: string[] = [];
    for (const g of GENERATORS) for (const d of g.difficulties) for (const s of [1, 3, 9, 22, 51, 77]) for (const n of g.create(s, d).nodeIds) if (!g.nodeIds.includes(n)) out.push(`${g.id}:${n}`);
    expect([...new Set(out)]).toEqual([]);
  });
});

describe('8.3 — la primera pista orienta sin revelar', async () => {
  const { GENERATORS, SOURCE_EXERCISES } = await import('./registry');
  const { formatNumber } = await import('../science/numbers');
  const all = [...GENERATORS.flatMap((g) => g.difficulties.flatMap((d) => [1, 5, 9].map((s) => g.create(s, d)))), ...SOURCE_EXERCISES.map((s) => s.build())];
  it('no contiene el resultado numérico, la opción correcta (salvo definiciones de todas) ni datos sustituidos', () => {
    const leaks: string[] = [];
    for (const ex of all) {
      const h = ex.hints[0];
      if (/=\s*[−-]?\d[\d,.]*\s*(·|×)\s*10/.test(h)) leaks.push(`${ex.id}: fórmula sustituida`);
      for (const p of ex.parts) {
        if (p.answer.kind === 'numeric') {
          const m = formatNumber(p.answer.value, { sig: 3 }).split(/[·×]/)[0]!.trim();
          if (m.replace(/\D/g, '').replace(/0+$/, '').length >= 2 && h.includes(m)) leaks.push(`${ex.id}/${p.id}: ${m}`);
        } else if (p.answer.kind === 'choice' && !p.answer.multiple) {
          const texts = p.answer.options.map((o) => o.text);
          const right = p.answer.options.find((o) => o.id === p.answer.correct[0])!.text;
          const definesAll = texts.filter((t) => h.includes(t)).length >= 2;
          if (right.length > 3 && h.includes(right) && !definesAll) leaks.push(`${ex.id}/${p.id}: «${right}»`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});
