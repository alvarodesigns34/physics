import { describe, expect, it } from 'vitest';
import { structuredResolution } from './autoResolution';
import { GENERATORS } from './registry';

describe('Resolución estructurada (ATOM 4.0)', () => {
  it('toda familia sin resolución a medida obtiene una con los bloques básicos y el resultado de cada paso', () => {
    for (const g of GENERATORS) {
      for (const d of g.difficulties) {
        const ex = g.create(4242, d);
        if (ex.resolution) continue;
        const r = structuredResolution(ex);
        const kinds = r.map((s) => s.kind);
        expect(kinds[0], g.id).toBe('pregunta');
        expect(kinds, g.id).toContain('resultado');
        expect(r.filter((s) => s.kind === 'calculo').length, g.id).toBe(ex.parts.length);
        const res = r.find((s) => s.kind === 'resultado')!.text;
        for (const p of ex.parts) expect(res, `${g.id} ${p.id}`).toContain(p.canonical);
        for (const s of r) expect(s.text, g.id).not.toMatch(/undefined|NaN/);
      }
    }
  });
  it('incluye el principio de la guía cuando el apartado tiene fórmulas', () => {
    const g = GENERATORS.find((x) => x.id === 'masa-media')!;
    const r = structuredResolution(g.create(1, g.difficulties[0]!));
    expect(r.find((s) => s.kind === 'principio')?.text).toMatch(/M = /);
    expect(r.some((s) => s.kind === 'por-que')).toBe(true);
  });
});

describe('Ningún ejercicio menciona subniveles imposibles (regresión: «1s,1p» en Slater)', () => {
  it('ni enunciados, ni explicaciones, ni soluciones contienen 1p, 1d, 2d, 1f, 2f o 3f', () => {
    const bad = /(?<![\w·])(1p|1d|2d|1f|2f|3f)(?![\w])/;
    for (const g of GENERATORS) for (const d of g.difficulties) for (const seed of [1, 99, 4242, 77777]) {
      const ex = g.create(seed, d);
      const text = [ex.statement, ...ex.parts.flatMap((p) => [p.explanation, p.canonical]), ...ex.solution].join(' ');
      // Las preguntas de validez de números cuánticos pueden citar «2d» precisamente para descartarlo.
      if (g.id === 'cuanticos-validez' || g.id === 'estado-configuracion' || g.id === 'subnivel') continue;
      expect(text.match(bad)?.[0], `${g.id}:${d}:${seed}`).toBeUndefined();
    }
  });
});
