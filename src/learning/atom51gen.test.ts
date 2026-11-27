/** ATOM 5.1 · Familias nuevas: corrección propia, respuestas verificadas con el motor y sin ambigüedad. */
import { describe, expect, it } from 'vitest';
import { checkAnswer } from './checker';
import { buildMassSpectrumRead, buildMinIonizationLevel, buildTmIonError, minIonizationLevelGenerator, TF_ITEMS, wrongTmConfig } from './generators/atom51';
import { GENERATOR_BY_ID } from './registry';
import { elementByZ } from '../science/elements';

describe('detectar el error en un catión de transición', () => {
  it.each([
    [26, 2, '[Ar] 3d6', '[Ar] 4s² 3d⁴'],
    [29, 2, '[Ar] 3d9', '[Ar] 4s¹ 3d⁸'],
    [24, 3, '[Ar] 3d3', '[Ar] 4s¹ 3d²'],
    [30, 2, '[Ar] 3d10', '[Ar] 4s² 3d⁸'],
  ])('Z = %i, carga +%i', (z, q, right, wrong) => {
    expect(wrongTmConfig(z, q)).toBe(wrong);
    const ex = buildTmIonError(z, q, 2, 'x');
    expect(checkAnswer(ex.parts[1]!.answer, right).correct).toBe(true);
    expect(checkAnswer(ex.parts[1]!.answer, wrong.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c).toString())).correct).toBe(false);
  });
});

describe('nivel mínimo para ionizar (problema inverso)', () => {
  it('la frontera es correcta: desde n ioniza y desde n − 1 no', () => {
    for (let seed = 1; seed <= 60; seed++) for (const d of [2, 3] as const) {
      const ex = minIonizationLevelGenerator.create(seed, d);
      const eV = (ex.parts[0]!.answer as { value: number }).value;
      const n = (ex.parts[1]!.answer as { value: number }).value;
      expect(13.6 / (n * n)).toBeLessThanOrEqual(eV);
      if (n > 1) expect(13.6 / ((n - 1) * (n - 1))).toBeGreaterThan(eV);
    }
  });
  it('121,5 nm (Lyman α) no ioniza desde n = 1 y sí desde n = 2', () => {
    const ex = buildMinIonizationLevel(121.5, 2, 'x');
    expect((ex.parts[1]!.answer as { value: number }).value).toBe(2);
  });
});

describe('espectro de masas a partir de alturas relativas', () => {
  it.each([0, 1, 2, 3, 4, 5])('caso %i: la masa media reproduce la masa atómica de la tabla (±0,1 %)', (k) => {
    const ex = buildMassSpectrumRead(k, 2, 'x');
    const M = (ex.parts[1]!.answer as { value: number }).value;
    const z = (ex.parts[2]!.answer as { z: number }).z;
    expect(Math.abs(M - elementByZ(z)!.atomicWeight) / elementByZ(z)!.atomicWeight).toBeLessThan(0.001);
  });
  it('usar las alturas como porcentajes es un error detectable (media fuera de rango)', () => {
    const ex = buildMassSpectrumRead(1, 2, 'x'); // Br: alturas 100 y 97,3
    const naive = (78.91834 * 100 + 80.91629 * 97.28) / 100;
    expect(naive).toBeGreaterThan(80.92);
    expect(checkAnswer(ex.parts[1]!.answer, `${naive.toFixed(2)} u`).correct).toBe(false);
  });
});

describe('verdadero o falso', () => {
  it('cada ítem tiene una justificación correcta y dos falsas distintas', () => {
    for (const it of TF_ITEMS) {
      expect(new Set([it.right, ...it.wrong]).size).toBe(3);
      expect(it.nodes.length).toBeGreaterThan(0);
    }
  });
  it('las familias nuevas están registradas', () => {
    for (const id of ['error-ion-transicion', 'ionizacion-nivel-minimo', 'verdadero-falso', 'espectro-masas-lectura']) expect(GENERATOR_BY_ID.has(id)).toBe(true);
  });
});
