import { describe, expect, it } from 'vitest';
import { GENERATORS } from './registry';
import { FAMILY_GUIDES, familyResolution } from './familyResolutions';
import { parseMath } from '../ui/MathText';

describe('ATOM 5.1 · resoluciones específicas en todas las familias', () => {
  it('ninguna familia usa ya la plantilla genérica', () => {
    const generic = GENERATORS.filter((g) => g.difficulties.some((d) => !g.create(3, d).resolution)).map((g) => g.id);
    expect(generic).toEqual([]);
  });
  it('cada resolución de familia explica el método, el porqué, la comprobación y los errores', () => {
    for (const g of GENERATORS) {
      if (!FAMILY_GUIDES[g.id]) continue;
      const kinds = familyResolution(g.create(5, g.difficulties[0]!))!.map((s) => s.kind);
      for (const k of ['metodo', 'principio', 'por-que', 'comprobacion', 'errores'] as const) expect(kinds, `${g.id} ${k}`).toContain(k);
    }
  });
  it('todas las fórmulas se analizan sin comandos desconocidos', () => {
    for (const [id, f] of Object.entries(FAMILY_GUIDES)) {
      if (!f.math) continue;
      const nodes = JSON.stringify(parseMath(f.math));
      expect(nodes, id).not.toMatch(/\\\\[a-zA-Z]/);
    }
  });
  it('no queda ninguna guía huérfana (todas corresponden a una familia existente)', () => {
    const ids = new Set(GENERATORS.map((g) => g.id));
    expect(Object.keys(FAMILY_GUIDES).filter((k) => !ids.has(k))).toEqual([]);
  });
});
