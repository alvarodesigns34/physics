import { describe, expect, it } from 'vitest';
import { buildIEGraph, buildSuccessiveIE, buildUnknownLine, SUCCESSIVE_IE, ESSAYS, buildCluesExercise, buildRydbergErrorExercise, buildMysteryIon } from './generators/reasoning';
import { elementByZ } from '../science/elements';
import { checkAnswer, suggestCriteria } from './checker';
import { parseMath } from '../ui/MathText';
import { mulberry32 } from '../science/numbers';

describe('familias de razonamiento: validez científica', () => {
  it('gráfica de EI: las anomalías salen de los datos (B y O; Al y S)', () => {
    const p2 = buildIEGraph(2, 2, 't');
    const p3 = buildIEGraph(3, 2, 't');
    expect(p2.parts[0]!.answer.kind === 'choice' && p2.parts[0]!.answer.correct.sort()).toEqual(['B', 'O']);
    expect(p3.parts[0]!.answer.kind === 'choice' && p3.parts[0]!.answer.correct.sort()).toEqual(['Al', 'S']);
  });
  it('EI sucesivas: el mayor salto coincide con los electrones de valencia del grupo', () => {
    for (const z of Object.keys(SUCCESSIVE_IE).map(Number)) {
      const ex = buildSuccessiveIE(z, 2, 't');
      const g = elementByZ(z)!.group!;
      const val = ex.parts.find((p) => p.id === 'val')!;
      expect(val.answer.kind === 'integer' && val.answer.value).toBe(g <= 2 ? g : g - 10);
      // Las EI sucesivas siempre crecen
      const ie = SUCCESSIVE_IE[z]!;
      ie.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(ie[i]!));
      // La primera coincide (±2 %) con la EI₁ de la base de datos de elementos (NIST)
      expect(Math.abs(ie[0]! / ((elementByZ(z)!.ie1! * 96.485)) - 1)).toBeLessThan(0.02);
    }
  });
  it('línea desconocida: con la λ redondeada, solo el n₁ correcto da un n₂ entero', () => {
    for (const [n1, n2] of [[1, 2], [1, 4], [2, 3], [2, 6], [3, 4], [3, 6]] as const) {
      const ex = buildUnknownLine(n1, n2, 3, 't');
      const b = ex.methods![0]!.steps.filter((s) => s.text.includes('✓'));
      expect(b, `${n1}→${n2}`).toHaveLength(1);
      expect(b[0]!.text).toContain(`n₁ = ${n1}`);
    }
  });
  it('pistas: el conjunto elegido identifica un único elemento', () => {
    for (const z of [6, 8, 16, 24, 26, 35]) {
      const rng = mulberry32(z);
      const ex = buildCluesExercise(z, 2, 't', rng);
      expect(ex.parts[0]!.answer.kind === 'element' && ex.parts[0]!.answer.z).toBe(z);
    }
  });
  it('error de Rydberg: la λ corregida es la de la transición y la línea errónea existe', () => {
    for (const err of ['cuadrados', 'suma', 'inversa', 'nm'] as const) {
      const ex = buildRydbergErrorExercise(2, 3, err, 2, 't');
      const lam = ex.parts[2]!;
      expect(lam.answer.kind === 'numeric' && lam.answer.value).toBeCloseTo(656.1, 0);
      const fig = ex.figure!;
      const line = ex.parts[0]!.answer.kind === 'choice' ? Number(ex.parts[0]!.answer.correct[0]) : 0;
      expect(fig.kind === 'resolucion' && fig.lines.length).toBeGreaterThanOrEqual(line);
    }
  });
  it('ion misterioso: los cationes de transición pierden primero 4s', () => {
    const ex = buildMysteryIon(26, 2, 56, 3, 't');
    expect(ex.statement).toMatch(/3d(6|⁶)/);
    expect(ex.statement).not.toMatch(/4s/);
  });
});

describe('desarrollo: rúbrica y autoevaluación', () => {
  const q = ESSAYS.find((e) => e.key === 'radio-cation')!;
  const spec = { kind: 'essay' as const, criteria: q.criteria, model: q.model, minWords: 25 };
  it('el crédito es la fracción ponderada de criterios marcados', () => {
    const text = 'El sodio pierde el electrón 3s y desaparece la capa n = 3; el núcleo con los mismos protones atrae más a los electrones porque hay menos repulsión.';
    expect(checkAnswer(spec, [text, 'capa', 'protones', 'zef']).credit).toBe(1);
    const r = checkAnswer(spec, [text, 'capa']);
    expect(r.credit).toBeCloseTo(1 / 3, 5);
    expect(r.correct).toBe(false);
  });
  it('respuestas demasiado cortas piden desarrollo; vacías no cuentan', () => {
    expect(checkAnswer(spec, ['Porque sí']).status).toBe('formato');
    expect(checkAnswer(spec, ['']).status).toBe('vacio');
  });
  it('las sugerencias de criterios se basan en palabras clave (sin tildes) y no fingen comprensión', () => {
    const s = suggestCriteria(spec, 'Al perder el electrón desaparece una CAPA y la carga nuclear EFECTIVA aumenta; el núcleo tiene los mismos protones');
    expect(s.sort()).toEqual(['capa', 'protones', 'zef']);
    expect(suggestCriteria(spec, 'No lo sé')).toEqual([]);
  });
  it('las respuestas modelo cumplen sus propios criterios (coherencia de la rúbrica)', () => {
    for (const e of ESSAYS) {
      const sug = suggestCriteria({ kind: 'essay', criteria: e.criteria, model: e.model }, e.model.replace(/\*\*/g, ''));
      expect(sug.length, e.key).toBeGreaterThanOrEqual(Math.ceil(e.criteria.length * 0.75));
    }
  });
});

describe('renderizador de fórmulas', () => {
  it('fracciones, potencias, subíndices y símbolos', () => {
    const n = parseMath('\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)');
    expect(n[0]!.t).toBe('frac');
    expect(JSON.stringify(n)).toContain('"v":"λ"');
    expect(JSON.stringify(n)).toContain('"t":"sub"');
    const p = parseMath('6,0\\cdot 10^{14}\;\\text{Hz}');
    expect(p.some((x) => x.t === 'sup')).toBe(true);
    expect(p.some((x) => x.t === 'word' && x.v === 'Hz')).toBe(true);
  });
  it('rechaza expresiones mal formadas sin ejecutar nada', () => {
    expect(() => parseMath('\\frac{1}{2')).toThrow();
    expect(() => parseMath('\\desconocido')).toThrow();
    expect(() => parseMath('a}')).toThrow();
  });
});

describe('espectro problema: la identificación es unívoca', async () => {
  const { buildSpectrumID } = await import('./generators/reasoning');
  const { VISIBLE_SPECTRA } = await import('../science/data/spectralLines');
  const syms = VISIBLE_SPECTRA.map((s) => s.symbol);
  const pairs = syms.flatMap((a, i) => syms.slice(i + 1).map((b) => [a, b]));
  it.each([...syms.map((s) => [s]), ...pairs])('muestra %s %s', (...sample) => {
    const ex = buildSpectrumID(sample.filter(Boolean) as string[], 2, 't', mulberry32(1));
    const fig = ex.figure!;
    if (fig.kind !== 'espectros') throw new Error('figura');
    const present = fig.rows[0]!.lines.map((l) => l.nm);
    for (const ref of fig.rows.slice(1)) {
      const all = ref.lines.every((l) => present.some((p) => Math.abs(p - l.nm) < 0.6));
      const inSample = sample.includes(VISIBLE_SPECTRA.find((x) => x.name === ref.label)!.symbol);
      expect(all, `${ref.label}`).toBe(inSample);
    }
  });
});

describe('resoluciones estructuradas de los generadores clásicos', async () => {
  const { GENERATOR_BY_ID } = await import('./registry');
  const { parseMath } = await import('../ui/MathText');
  it.each(['rydberg', 'onda-lambda', ...['error-rydberg', 'linea-desconocida', 'luz-ionizante', 'bohr-proporciones']])('%s: resolución con fórmulas bien formadas', (id) => {
    const g = GENERATOR_BY_ID.get(id)!;
    for (const d of g.difficulties) for (const seed of [1, 2, 3, 4]) {
      const ex = g.create(seed, d);
      expect(ex.resolution?.length, id).toBeGreaterThan(3);
      for (const st of ex.resolution!) if (st.math) expect(() => parseMath(st.math!), `${id}: ${st.math}`).not.toThrow();
      expect(ex.resolution!.some((s) => s.kind === 'comprobacion' || s.kind === 'errores')).toBe(true);
    }
  });
});

describe('las fórmulas no pierden sus espacios ni muestran «^» en texto', async () => {
  const { GENERATORS } = await import('./registry');
  it('ningún bloque de texto de resolución contiene «^» y ninguna fórmula contiene «;\\text» sin barra', () => {
    for (const g of GENERATORS) for (const d of g.difficulties) {
      const ex = g.create(2, d);
      for (const st of ex.resolution ?? []) {
        expect(st.text, `${g.id}: ${st.text}`).not.toMatch(/\^/);
        if (st.math) expect(st.math, `${g.id}: ${st.math}`).not.toMatch(/(^|[^\\]);\\text/);
      }
    }
  });
});
