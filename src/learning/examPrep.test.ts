import { describe, expect, it } from 'vitest';
import { essentials, familyReadiness, itinerary, PREP_FAMILIES, prepItems, prepLinks, questionKey, representativity, SESSION_LENGTHS, type AttemptForPrep } from './examPrep';
import { GENERATOR_BY_ID, SOURCE_EXERCISES } from './registry';
import { NODE_BY_ID } from './syllabus';
import { parseHash } from '../app/hooks';

const att = (exerciseId: string, score: number, at: number, evidence: AttemptForPrep['evidence'] = 'demostrada'): AttemptForPrep => ({ exerciseId, score, at, mode: 'practica', evidence, hintsUsed: evidence === 'asistida' ? 1 : 0, difficulty: 2 });

describe('catálogo del centro de preparación', () => {
  it('cada familia existe, con dificultades válidas y apartados reales', () => {
    for (const f of PREP_FAMILIES) {
      const g = GENERATOR_BY_ID.get(f.generatorId);
      expect(g, f.generatorId).toBeDefined();
      expect(g!.difficulties, f.generatorId).toContain(f.difficulty);
      if (f.hard) expect(g!.difficulties, f.generatorId).toContain(f.hard);
      for (const n of f.core) expect(NODE_BY_ID.has(n), `${f.generatorId}:${n}`).toBe(true);
      expect(f.pitfalls.length, f.generatorId).toBeGreaterThan(0);
      expect(f.minutes).toBeGreaterThan(0);
    }
    expect(new Set(PREP_FAMILIES.map((f) => f.generatorId)).size).toBe(PREP_FAMILIES.length);
  });
  it('cubre los siete bloques, cada uno con al menos una familia esencial y tres en total', () => {
    for (let b = 1; b <= 7; b++) {
      const own = PREP_FAMILIES.filter((f) => f.block === b);
      expect(own.length, `bloque ${b}`).toBeGreaterThanOrEqual(3);
      expect(own.some((f) => f.tier === 'esencial'), `bloque ${b}`).toBe(true);
    }
  });
  it('lo que TEO trata solo cualitativamente (De Broglie, Heisenberg, Slater) se marca como ampliación', () => {
    for (const id of ['de-broglie', 'heisenberg', 'zeff']) expect(PREP_FAMILIES.find((f) => f.generatorId === id)!.scope).toBe('ampliacion');
  });
});

describe('representatividad observada en las fuentes', () => {
  it('los apartados de una misma pregunta cuentan una vez', () => {
    expect(questionKey('AMP 12a')).toBe('AMP 12');
    expect(questionKey('AMP 12d')).toBe('AMP 12');
    expect(questionKey('EBAU-1 (2021) a')).toBe('EBAU-1');
    expect(questionKey('EBAU-1 (2021) b')).toBe('EBAU-1');
    expect(questionKey('EBAU-3 b · Au⁻')).toBe('EBAU-3');
    expect(questionKey('TEO ej. 7 · O²⁻')).toBe('TEO ej. 7');
    expect(questionKey('HOJ 23c')).toBe('HOJ 23');
    expect(questionKey('AMP 3 · Cu')).toBe('AMP 3');
  });
  it('números cuánticos (5.4): AMP 12 cuenta una vez aunque tenga cuatro registros', () => {
    const r = representativity(['5.4']);
    expect(r.keys.filter((k) => k === 'AMP 12')).toHaveLength(1);
    const regs = SOURCE_EXERCISES.filter((s) => s.nodeIds.includes('5.4')).length;
    expect(r.questions).toBeLessThan(regs);
    expect(r.byKind.EBAU).toBeGreaterThan(0);
  });
  it('nunca supera el número total de preguntas distintas', () => {
    const total = new Set(SOURCE_EXERCISES.map((s) => questionKey(s.ref))).size;
    for (const f of PREP_FAMILIES) expect(representativity(f.core).questions).toBeLessThanOrEqual(total);
  });
});

describe('preparación según la evidencia del alumno', () => {
  it('sin intentos → sin evidencia', () => {
    expect(familyReadiness('rydberg', []).level).toBe('sin-evidencia');
  });
  it('solo intentos asistidos → poca evidencia, aunque hayan salido bien', () => {
    const h = [att('rydberg:2:1', 1, 1, 'asistida'), att('rydberg:2:2', 1, 2, 'asistida'), att('rydberg:2:3', 1, 3, 'asistida')];
    expect(familyReadiness('rydberg', h).level).toBe('poca-evidencia');
  });
  it('memorizar: el MISMO enunciado acertado muchas veces no da «sólida»', () => {
    const h = Array.from({ length: 6 }, (_, i) => att('rydberg:2:7', 1, i));
    const r = familyReadiness('rydberg', h);
    expect(r.level).not.toBe('solida');
    expect(r.distinctSolved).toBe(1);
  });
  it('dos enunciados distintos bien resueltos sin ayuda → sólida', () => {
    const h = [att('rydberg:2:1', 1, 1), att('rydberg:2:2', 0.9, 2), att('rydberg:3:5', 1, 3)];
    expect(familyReadiness('rydberg', h).level).toBe('solida');
  });
  it('fallos recientes sin ayuda o errores abiertos → a reforzar', () => {
    const h = [att('rydberg:2:1', 0.2, 1), att('rydberg:2:2', 0.3, 2)];
    expect(familyReadiness('rydberg', h).level).toBe('a-reforzar');
    const ok = [att('rydberg:2:1', 1, 1), att('rydberg:2:2', 1, 2)];
    expect(familyReadiness('rydberg', ok, [{ generatorId: 'rydberg' }]).level).toBe('a-reforzar');
    expect(familyReadiness('rydberg', ok, [{ generatorId: 'rydberg', resolvedAt: 5 }]).level).toBe('solida');
  });
  it('la evidencia de otra familia no cuenta (sin atribución cruzada)', () => {
    const h = [att('serie-inversa:2:1', 1, 1), att('serie-inversa:2:2', 1, 2)];
    expect(familyReadiness('rydberg', h).level).toBe('sin-evidencia');
  });
  it('no usa porcentajes en sus textos', () => {
    for (const f of PREP_FAMILIES) expect(familyReadiness(f.generatorId, [att(`${f.generatorId}:2:1`, 0.7, 1)]).text).not.toMatch(/%/);
  });
});

describe('itinerarios e imprescindibles', () => {
  const items = prepItems([]);
  it('cada itinerario cabe en su tiempo, sin repetir familia y es determinista', () => {
    for (const m of SESSION_LENGTHS) {
      const st = itinerary(items, m);
      expect(st.length, `${m}`).toBeGreaterThan(0);
      expect(st.reduce((a, s) => a + s.minutes, 0)).toBeLessThanOrEqual(m);
      expect(new Set(st.map((s) => s.family.generatorId)).size).toBe(st.length);
      expect(itinerary(items, m)).toEqual(st);
    }
  });
  it('varía de bloque antes de repetir', () => {
    const st = itinerary(items, 60);
    const firstBlocks = st.slice(0, Math.min(7, st.length)).map((s) => s.family.block);
    expect(new Set(firstBlocks).size).toBe(firstBlocks.length);
  });
  it('sin evidencia, se empieza en modo guiado; con evidencia sólida, nivel exigente', () => {
    expect(itinerary(items, 30).every((s) => s.mode === 'guiado')).toBe(true);
    const h = [att('rydberg:2:1', 1, 1), att('rydberg:2:2', 1, 2)];
    const st = itinerary(prepItems(h), 90);
    const r = st.find((s) => s.family.generatorId === 'rydberg');
    if (r) expect(r.mode).toBe('desafio');
  });
  it('lo ya sólido baja en la prioridad', () => {
    const h = [att('nucleo-especie:2:1', 1, 1), att('nucleo-especie:2:2', 1, 2)];
    const a = prepItems([]).find((i) => i.family.generatorId === 'nucleo-especie')!.priority;
    const b = prepItems(h).find((i) => i.family.generatorId === 'nucleo-especie')!.priority;
    expect(b).toBeLessThan(a);
  });
  it('imprescindibles: examinables, como mucho dos por bloque', () => {
    const e = essentials(items);
    expect(e.length).toBeGreaterThan(5);
    expect(e.every((i) => i.family.scope === 'examinable')).toBe(true);
    for (let b = 1; b <= 7; b++) {
      expect(e.filter((i) => i.family.block === b).length).toBeLessThanOrEqual(2);
      expect(e.some((i) => i.family.block === b), `bloque ${b}`).toBe(true);
    }
  });
  it('los enlaces llevan a rutas válidas', () => {
    for (const f of PREP_FAMILIES) {
      const l = prepLinks(f);
      for (const href of [l.guided, l.practice, l.example, l.theory, l.hard, l.lab].filter(Boolean) as string[]) {
        const { route, query } = parseHash(`#${href}`);
        expect(route, href).toBe(href.split('?')[0]);
        if (query.get('gen')) expect(query.get('gen')).toBe(f.generatorId);
      }
    }
  });
});
