import { describe, expect, it } from 'vitest';
import { arrowLayout } from './arrowLayout';
import { cascadeLines } from '../../science/hydrogen';

describe('ATOM 6.0 · flechas del diagrama de niveles', () => {
  it.each([2, 3, 4, 5, 6, 7])('cascada desde n = %i: todas dentro del diagrama y una columna por serie', (n) => {
    const lines = cascadeLines(n).map((t) => ({ t }));
    const { x, groups } = arrowLayout(lines);
    for (const v of x.values()) {
      expect(v).toBeGreaterThanOrEqual(-1.11);
      expect(v).toBeLessThanOrEqual(1.96);
    }
    expect(groups.length).toBe(n - 1);
    // Series en orden (Lyman a la izquierda) y sin solaparse
    for (let i = 1; i < groups.length; i++) expect(Math.min(...groups[i]!.xs)).toBeGreaterThan(Math.max(...groups[i - 1]!.xs));
  });
});
