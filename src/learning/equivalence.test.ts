import { describe, expect, it } from 'vitest';
import { familyVariety, freshSeed, problemKey, problemKeyOfId } from './equivalence';
import { familyReadiness, type AttemptForPrep } from './examPrep';
import { GENERATOR_BY_ID } from './registry';
import { repetitionInfo } from '../state/repetition';
import { registerClean, type NotebookEntry } from './notebook';
import { mulberry32 } from '../science/numbers';

const att = (exerciseId: string, score: number, at: number, evidence: AttemptForPrep['evidence'] = 'demostrada'): AttemptForPrep => ({ exerciseId, score, at, mode: 'practica', evidence, hintsUsed: 0, difficulty: Number(exerciseId.split(':')[1]) });

/** Dos semillas distintas que dan el MISMO problema (y una que da otro distinto). */
function sameAndOther(gen: string, d: 1 | 2 | 3) {
  const g = GENERATOR_BY_ID.get(gen)!;
  const first = new Map<string, number>();
  let pair: [number, number] | null = null;
  let other: number | null = null;
  for (let s = 1; s < 3000 && (!pair || other === null); s++) {
    const k = problemKey(g.create(s, d));
    if (first.has(k) && !pair) pair = [first.get(k)!, s];
    else if (!first.has(k)) first.set(k, s);
    if (pair && other === null && k !== problemKey(g.create(pair[0], d))) other = s;
  }
  return { a: pair![0], b: pair![1], other: other! };
}

describe('clave de problema', () => {
  it('es estable y distingue problemas distintos', () => {
    const g = GENERATOR_BY_ID.get('rydberg')!;
    expect(problemKey(g.create(5, 2))).toBe(problemKey(g.create(5, 2)));
    const { a, b, other } = sameAndOther('rydberg', 2);
    expect(a).not.toBe(b);
    expect(problemKey(g.create(a, 2))).toBe(problemKey(g.create(b, 2)));
    expect(problemKey(g.create(other, 2))).not.toBe(problemKey(g.create(a, 2)));
  });
  it('los mismos datos en otro orden son el mismo problema (absorción: fotones permutados)', () => {
    const g = GENERATOR_BY_ID.get('absorcion-fundamental')!;
    const groups = new Map<string, Set<string>>();
    for (let s = 0; s < 400; s++) {
      const e = g.create(s, 2);
      const k = problemKey(e);
      const set = groups.get(k) ?? new Set<string>();
      set.add(e.statement);
      groups.set(k, set);
    }
    // Hay claves que agrupan enunciados con otro orden de los fotones
    expect([...groups.values()].some((s) => s.size > 1)).toBe(true);
    for (const set of groups.values()) {
      const energies = [...set].map((t) => [...t.matchAll(/(\d+,\d+) eV/g)].map((m) => m[1]).sort().join('|'));
      expect(new Set(energies).size).toBe(1);
    }
  });
  it('la variedad medida es coherente (familias pobres y ricas)', () => {
    expect(familyVariety('grafica-ei', 2)).toBeLessThan(6);
    expect(familyVariety('tendencia-ordenar', 2)).toBeGreaterThan(30);
  });
});

describe('familyReadiness: memorizar no lleva a «Sólida»', () => {
  it('dos ids distintos del MISMO problema cuentan como uno solo', () => {
    const { a, b } = sameAndOther('rydberg', 2);
    const h = [att(`rydberg:2:${a}`, 1, 1), att(`rydberg:2:${b}`, 1, 2), att(`rydberg:2:${a}`, 1, 3)];
    const r = familyReadiness('rydberg', h);
    expect(r.distinctSolved).toBe(1);
    expect(r.level).not.toBe('solida');
  });
  it('dos problemas realmente distintos sin ayuda → sólida', () => {
    const { a, other } = sameAndOther('rydberg', 2);
    expect(familyReadiness('rydberg', [att(`rydberg:2:${a}`, 1, 1), att(`rydberg:2:${other}`, 1, 2)]).level).toBe('solida');
  });
  it('los aciertos que pudieron ser azar no cuentan como problemas demostrados', () => {
    const g = GENERATOR_BY_ID.get('cuanticos-validez')!;
    const seeds: number[] = [];
    const keys = new Set<string>();
    for (let s = 1; seeds.length < 3; s++) {
      const k = problemKey(g.create(s, 2));
      if (!keys.has(k)) (keys.add(k), seeds.push(s));
    }
    const h = seeds.map((s, i) => att(`cuanticos-validez:2:${s}`, 1, i, 'posible-azar'));
    const r = familyReadiness('cuanticos-validez', h);
    expect(r.distinctSolved).toBe(0);
    expect(r.level).toBe('en-progreso');
    expect(r.text).toMatch(/azar/);
  });
  it('familia con pocas variantes: vistas todas, hace falta acertar el nivel exigente', () => {
    const g = GENERATOR_BY_ID.get('grafica-ei')!;
    const v = familyVariety('grafica-ei', 2);
    const seeds: number[] = [];
    const keys = new Set<string>();
    for (let s = 1; seeds.length < v; s++) {
      const k = problemKey(g.create(s, 2));
      if (!keys.has(k)) (keys.add(k), seeds.push(s));
    }
    const h = seeds.map((s, i) => att(`grafica-ei:2:${s}`, 1, i));
    const r = familyReadiness('grafica-ei', h);
    expect(r.level).toBe('en-progreso');
    expect(r.text).toMatch(/exigente/);
    expect(familyReadiness('grafica-ei', [...h, att('grafica-ei:3:77', 1, 99)]).level).toBe('solida');
  });
});

describe('peso de la repetición y cuaderno de errores, por problema', () => {
  it('otra semilla con los mismos datos se pondera como repetición', () => {
    const { a, b } = sameAndOther('rydberg', 2);
    const hist = [{ exerciseId: `rydberg:2:${a}`, at: 0 }];
    expect(repetitionInfo(hist, `rydberg:2:${b}`, 1000).factor).toBe(1); // por id (fusión de intentos antiguos)
    expect(repetitionInfo(hist, `rydberg:2:${b}`, 1000, problemKeyOfId).factor).toBe(0.35);
  });
  it('acertar el MISMO problema con otra semilla no cierra un error del cuaderno como «variante»', () => {
    const { a, b, other } = sameAndOther('rydberg', 2);
    const entry: NotebookEntry = { exerciseId: `rydberg:2:${a}`, generatorId: 'rydberg', title: 't', nodeIds: ['3.6'], at: 0, mode: 'practica', misses: [{ prompt: 'p', kind: 'calculo' }], retries: 0 };
    const same = (x: string, y: string) => problemKeyOfId(x) === problemKeyOfId(y);
    expect(registerClean([entry], { id: `rydberg:2:${b}`, generatorId: 'rydberg', difficulty: 2, steps: [{ prompt: 'p' }], sameProblem: same }, 1000).resolved).toBe(0);
    expect(registerClean([entry], { id: `rydberg:2:${other}`, generatorId: 'rydberg', difficulty: 2, steps: [{ prompt: 'p' }], sameProblem: same }, 1000).resolved).toBe(1);
  });
  it('«otro equivalente» elige un problema no visto mientras queden variantes', () => {
    const g = GENERATOR_BY_ID.get('nivel-energia')!;
    const seen = new Set<string>();
    const rand = mulberry32(7);
    const v = familyVariety('nivel-energia', 2);
    for (let i = 0; i < v; i++) {
      const { seed, exhausted } = freshSeed('nivel-energia', 2, seen, rand);
      const k = problemKey(g.create(seed, 2));
      if (!exhausted) expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    expect(freshSeed('nivel-energia', 2, seen, rand).exhausted).toBe(true);
  });
});
