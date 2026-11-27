import { describe, expect, it } from 'vitest';
import { LIVE, sliderToValue, valueToSlider } from './liveFormulas';
import { LESSONS } from './guide';

const exprs = new Set(LESSONS.flatMap((l) => l.sections.flatMap((s) => (s.formulas ?? []).map((f) => f.expr))));
const run = (expr: string, v: Record<string, number>) => LIVE[expr]!.compute(v);
const main = (expr: string, v: Record<string, number>) => run(expr, v).outputs.find((o) => o.main)!.value;

describe('Fórmulas manipulables (ATOM 4.0)', () => {
  it('cada explorador corresponde a una fórmula que existe en la guía', () => {
    expect(Object.keys(LIVE).filter((e) => !exprs.has(e))).toEqual([]);
  });
  it('los valores iniciales están dentro de su rango y producen un resultado', () => {
    for (const [e, lf] of Object.entries(LIVE)) {
      const v = Object.fromEntries(lf.inputs.map((i) => [i.key, i.value]));
      for (const i of lf.inputs) expect(i.value >= i.min && i.value <= i.max, `${e} ${i.key}`).toBe(true);
      expect(lf.compute(v).outputs.some((o) => o.main), e).toBe(true);
    }
  });
  it('resultados de referencia', () => {
    expect(main('A = Z + N', { Z: 11, N: 12 })).toBe('23');
    expect(main('e⁻ = Z − q', { Z: 8, q: -2 })).toBe('10');
    expect(run('e⁻ = Z − q', { Z: 8, q: -2 }).note).toMatch(/^O²⁻/);
    expect(run('e⁻ = Z − q', { Z: 13, q: 3 }).note).toMatch(/^Al³⁺/);
    expect(main('M = (m₁·%₁ + m₂·%₂ + …) / 100', { m1: 34.97, p1: 75.8, m2: 36.97 })).toBe('35,45');
    expect(main('v = λ/T = λ·ν', { l: 500 })).toBe('6,00·10¹⁴');
    expect(run('E = h·ν = h·c/λ', { l: 620 }).outputs[1]!.value).toBe('2,00');
    expect(main('1/λ = R·(1/n₁² − 1/n₂²)', { n1: 2, n2: 3 })).toBe('656,3');
    expect(main('líneas = n·(n − 1)/2', { n: 5 })).toBe('10');
    expect(main('Eₙ = −13,6 eV / n²', { n: 2 })).toBe('−3,40');
    expect(main('orbitales del subnivel = 2l + 1', { l: 2 })).toBe('5');
    expect(main('orbitales del nivel = n² · electrones = 2n²', { n: 3 })).toBe('18');
  });
  it('combinaciones sin sentido físico se explican, no se calculan', () => {
    expect(run('1/λ = R·(1/n₁² − 1/n₂²)', { n1: 3, n2: 3 }).invalid).toMatch(/n₂ debe ser mayor/);
    expect(run('e⁻ = Z − q', { Z: 2, q: 3 }).invalid).toBeTruthy();
  });
  it('deslizador logarítmico: ida y vuelta estable y extremos exactos', () => {
    const inp = LIVE['E = h·ν = h·c/λ']!.inputs[0]!;
    expect(sliderToValue(inp, 0)).toBe(inp.min);
    expect(sliderToValue(inp, 1000)).toBe(inp.max);
    for (const v of [1, 10, 656, 5000, 1e6]) expect(Math.abs(sliderToValue(inp, valueToSlider(inp, v)) - v) / v).toBeLessThan(0.02);
  });
});
