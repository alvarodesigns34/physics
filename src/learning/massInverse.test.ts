import { describe, expect, it } from 'vitest';
import { abundanceFromMean, identifyByMean, checkAbundance, UNKNOWN_POOL } from './massInverse';
import { elementByZ } from '../science/elements';

describe('espectrometría de masas: problemas inversos', () => {
  it('abundancia a partir de la media (cloro: 75,8 % de Cl-35)', () => {
    expect(abundanceFromMean(34.96885, 36.96590, 35.453) * 100).toBeCloseTo(75.78, 1);
  });
  it('la media identifica al elemento de cada muestra desconocida sin ambigüedad', () => {
    for (const z of UNKNOWN_POOL) {
      const el = elementByZ(z)!;
      const r = identifyByMean(el.atomicWeight);
      expect(r.z, el.symbol).toBe(z);
      expect(r.margin, el.symbol).toBeGreaterThan(0.05);
    }
  });
  it('con ruido estadístico se acepta la abundancia calculada con la media MEDIDA, no la de tabla', () => {
    const measured = 35.46; // un poco desviada de 35,453 por estadística
    const r = checkAbundance(abundanceFromMean(34.96885, 36.96590, measured) * 100, 34.96885, 36.96590, measured);
    expect(r.ok).toBe(true);
    expect(checkAbundance(50, 34.96885, 36.96590, measured).ok).toBe(false);
  });
  it('masas iguales: error explícito', () => {
    expect(() => abundanceFromMean(10, 10, 10)).toThrow();
  });
});
