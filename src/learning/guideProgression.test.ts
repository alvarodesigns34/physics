import { describe, expect, it } from 'vitest';
import { PROGRESSION } from './guideProgression';
import { LESSONS } from './guide';
import { parseMath } from '../ui/MathText';
import { CODATA } from '../science/constants';
import { slater } from '../science/slater';
import { groundState } from '../science/configuration';

const keys = LESSONS.flatMap((l) => l.sections.map((s) => s.id ?? s.node));

describe('Progresión didáctica (ATOM 5.0)', () => {
  it('todas las secciones tienen intuición inicial y conexiones', () => {
    expect(keys.filter((k) => !PROGRESSION[k])).toEqual([]);
    for (const k of keys) {
      expect(PROGRESSION[k]!.intuition.length, k).toBeGreaterThan(40);
      expect(PROGRESSION[k]!.connections.length, k).toBeGreaterThan(0);
    }
  });
  it('las conexiones apuntan a secciones que existen (y no a sí mismas)', () => {
    for (const [k, p] of Object.entries(PROGRESSION)) for (const c of p.connections) {
      expect(keys, `${k} → ${c.to}`).toContain(c.to);
      expect(c.to).not.toBe(k);
    }
  });
  it('todas las fórmulas de las deducciones se analizan sin error', () => {
    for (const [k, p] of Object.entries(PROGRESSION)) for (const s of p.derivation?.steps ?? []) if (s.math) expect(() => parseMath(s.math!), `${k}: ${s.math}`).not.toThrow();
  });
});

describe('Las deducciones son numéricamente correctas', () => {
  it('3.6: R = 13,6 eV / (h·c) ≈ 1,097·10⁷ m⁻¹', () => {
    expect((13.6 * CODATA.e) / (CODATA.h * CODATA.c)).toBeCloseTo(1.097e7, -4);
  });
  it('3.4: h·c ≈ 1240 eV·nm', () => {
    expect(((CODATA.h * CODATA.c) / CODATA.e) * 1e9).toBeCloseTo(1239.84, 1);
  });
  it('4.2: a₀ = ħ²/(m·k·e²) ≈ 0,529 Å y ke²/(2a₀) ≈ 13,6 eV', () => {
    const hbar = CODATA.h / (2 * Math.PI);
    const k = 8.9875517923e9;
    const a0 = (hbar * hbar) / (CODATA.me * k * CODATA.e * CODATA.e);
    expect(a0 * 1e10).toBeCloseTo(0.529, 3);
    expect((k * CODATA.e * CODATA.e) / (2 * a0) / CODATA.e).toBeCloseTo(13.6, 1);
  });
  it('5.5: Σ (2l + 1) para l = 0…n − 1 = n²', () => {
    for (let n = 1; n <= 7; n++) expect(Array.from({ length: n }, (_, l) => 2 * l + 1).reduce((a, b) => a + b, 0)).toBe(n * n);
  });
  it('7.6: Z_ef del 3s del Na con Slater = 2,2 (el ejemplo del texto)', () => {
    const conf = groundState(11);
    const outer = conf.find((s) => s.n === 3 && s.l === 0)!;
    expect(slater(11, conf, outer).zeff).toBeCloseTo(2.2, 6);
  });
});
