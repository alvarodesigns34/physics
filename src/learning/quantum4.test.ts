import { describe, expect, it } from 'vitest';
import { deBroglieGenerator, heisenbergGenerator, hundBoxes, pauliHundGenerator } from './generators/quantum4';
import { checkAnswer } from './checker';

describe('Familias nuevas ATOM 4.0', () => {
  it('De Broglie: electrón acelerado por 100 V → λ ≈ 1,23·10⁻¹⁰ m (valor de libro)', () => {
    for (let s = 1; s < 200; s++) {
      const ex = deBroglieGenerator.create(s, 2);
      if (!ex.statement.includes('**100 V**')) continue;
      const l = ex.parts.find((p) => p.id === 'l')!;
      expect(l.answer.kind === 'numeric' && l.answer.value).toBeCloseTo(1.227e-10, 12);
      return;
    }
    throw new Error('sin caso de 100 V');
  });
  it('acepta las formas habituales de escribir kg·m/s y diagnostica la masa en gramos', () => {
    const ex = deBroglieGenerator.create(5, 1);
    const p = ex.parts[0]!;
    const v = p.answer.kind === 'numeric' ? p.answer.value : 0;
    for (const u of ['kg·m/s', 'kg*m/s', 'kg m/s', 'N·s', 'kg·m·s^-1']) expect(checkAnswer(p.answer, `${v.toExponential(3).replace('.', ',')} ${u}`).correct, u).toBe(true);
    const r = checkAnswer(p.answer, `${(v * 1000).toExponential(3).replace('.', ',')} kg·m/s`);
    expect(r.correct).toBe(false);
    expect(r.message).toMatch(/gramos/);
  });
  it('Heisenberg: Δx = 1·10⁻¹⁰ m → Δv ≈ 5,79·10⁵ m/s; olvidar 4π se diagnostica', () => {
    for (let s = 1; s < 200; s++) {
      const ex = heisenbergGenerator.create(s, 2);
      if (!ex.statement.includes('1,0·10⁻¹⁰')) continue;
      const dv = ex.parts.find((p) => p.id === 'dv')!;
      expect(dv.answer.kind === 'numeric' && dv.answer.value).toBeCloseTo(5.789e5, -2);
      const dp = ex.parts.find((p) => p.id === 'dp')!;
      const r = checkAnswer(dp.answer, '6,626e-24 kg·m/s');
      expect(r.message).toMatch(/4π/);
      return;
    }
    throw new Error('sin caso de 1·10⁻¹⁰ m');
  });
  it('Hund: fundamental correcto y número de desapareados', () => {
    expect(hundBoxes(4, 3)).toEqual(['↑↓', '↑', '↑']);
    expect(hundBoxes(3, 3)).toEqual(['↑', '↑', '↑']);
    expect(hundBoxes(6, 5)).toEqual(['↑↓', '↑', '↑', '↑', '↑']);
    expect(hundBoxes(8, 5)).toEqual(['↑↓', '↑↓', '↑↓', '↑', '↑']);
  });
  it('Pauli-Hund: cuatro opciones distintas, una sola correcta, en todas las semillas', () => {
    for (const d of pauliHundGenerator.difficulties) for (let s = 1; s < 60; s++) {
      const ex = pauliHundGenerator.create(s, d);
      const a = ex.parts[0]!.answer;
      if (a.kind !== 'choice') throw new Error();
      expect(new Set(a.options.map((o) => o.text)).size).toBe(4);
      expect(a.correct).toEqual(['ok']);
    }
  });
});
