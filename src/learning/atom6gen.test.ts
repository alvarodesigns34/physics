/**
 * ATOM 6.0 · Familias nuevas: comprobación independiente con muchas semillas.
 * Las respuestas se recalculan aquí sin usar el generador (tabla de saltos y configuración por Madelung
 * con las excepciones reales), y se exige que el enunciado no sea ambiguo.
 */
import { describe, expect, it } from 'vitest';
import { absorptionCase, buildAbsorption, buildQuantumCount } from './generators/atom6';
import { GENERATOR_BY_ID } from './registry';
import { checkAnswer } from './checker';
import { groundState } from '../science/configuration';
import type { Exercise } from './types';

const SEEDS = Array.from({ length: 600 }, (_, i) => i * 7919 + 3);

function answerAll(ex: Exercise) {
  for (const p of ex.parts) {
    const v = p.answer.kind === 'choice' ? p.answer.correct : p.canonical;
    const r = checkAnswer(p.answer, v as string & string[]);
    expect(r.correct, `${ex.id}/${p.id}: ${p.canonical}`).toBe(true);
  }
}

describe('absorcion-fundamental', () => {
  const jumps = [2, 3, 4, 5, 6, 7, 8].map((n) => 13.6 * (1 - 1 / (n * n)));
  it('cada semilla y dificultad: datos sin ambigüedad y respuestas recalculadas de forma independiente', () => {
    for (const d of [2, 3] as const)
      for (const seed of SEEDS) {
        const c = absorptionCase(seed, d);
        // Energías distintas entre sí
        expect(new Set(c.photons).size, `${seed}`).toBe(c.photons.length);
        // Absorbido ⇔ coincide (a 0,01 eV) con un salto desde n = 1 o ioniza
        const absorbed = c.photons.map((e, i) => (e >= 13.6 || jumps.some((j) => Math.abs(j - e) < 0.011) ? i : -1)).filter((i) => i >= 0);
        expect(absorbed).toEqual(c.absorbed);
        // Ningún fotón no absorbido está a menos de 0,1 eV de un salto (no hay «casi» engañosos por redondeo)
        c.photons.forEach((e, i) => {
          if (!c.absorbed.includes(i)) for (const j of jumps) expect(Math.abs(j - e), `${seed}:${e}`).toBeGreaterThan(0.1);
        });
        // Exactamente un fotón ionizante
        expect(c.photons.filter((e) => e >= 13.6).length).toBe(1);
        expect(c.photons[c.ionizing]! - 13.6).toBeGreaterThan(0.3);
        // Con dificultad 3 hay dos saltos resonantes
        expect(c.absorbed.length).toBe(d === 3 ? 3 : 2);
        const ex = buildAbsorption(seed, d);
        answerAll(ex);
        const lines = ex.parts.find((p) => p.id === 'lineas')!;
        expect(lines.canonical).toBe(String((c.nMax * (c.nMax - 1)) / 2));
      }
  });
  it('el error típico (no restar 13,6 eV) se diagnostica', () => {
    const ex = buildAbsorption(5, 2);
    const c = absorptionCase(5, 2);
    const p = ex.parts.find((x) => x.id === 'ek')!;
    const r = checkAnswer(p.answer, `${c.photons[c.ionizing]!.toFixed(2).replace('.', ',')} eV`);
    expect(r.correct).toBe(false);
    expect(r.message).toMatch(/13,6/);
  });
  it('el fotón de Balmer nunca se considera absorbido', () => {
    for (const seed of SEEDS) {
      const c = absorptionCase(seed, 2);
      for (const b of [13.6 * (1 / 4 - 1 / 9), 13.6 * (1 / 4 - 1 / 16)]) {
        const i = c.photons.findIndex((e) => Math.abs(e - b) < 0.01);
        if (i >= 0) expect(c.absorbed).not.toContain(i);
      }
    }
  });
  it('es reproducible por semilla y está registrada', () => {
    const g = GENERATOR_BY_ID.get('absorcion-fundamental')!;
    expect(g.create(42, 3).statement).toBe(g.create(42, 3).statement);
    expect(g.create(42, 3).id).toBe('absorcion-fundamental:3:42');
  });
});

describe('electrones-por-numeros', () => {
  it('los recuentos cuadran con la configuración real (incluidas las excepciones Cr y Cu)', () => {
    for (const d of [2, 3] as const)
      for (const seed of SEEDS.slice(0, 200)) {
        const ex = GENERATOR_BY_ID.get('electrones-por-numeros')!.create(seed, d);
        answerAll(ex);
        const z = Number(ex.statement.match(/Z = (\d+)/)![1]);
        const conf = groundState(z);
        const byL = [0, 1, 2, 3].map((l) => conf.filter((s) => s.l === l).reduce((a, s) => a + s.e, 0));
        expect(byL.reduce((a, b) => a + b, 0)).toBe(z);
        expect(ex.parts.find((p) => p.id === 'lp')!.canonical).toBe(String(byL[1]));
        expect(ex.parts.find((p) => p.id === 's')!.canonical).toBe(String(byL[0]));
      }
  });
  it('Cr (Z = 24): 3d⁵ 4s¹ → 6 desapareados y 13 electrones con n = 3', () => {
    const ex = buildQuantumCount(24, 2, 'electrones-por-numeros:2:0');
    expect(ex.parts.find((p) => p.id === 'unp')!.canonical).toBe('6');
    expect(ex.parts.find((p) => p.id === 'n3')!.canonical).toBe('13');
  });
  it('no pregunta por m_l ni m_s (dependen de una convención en subniveles incompletos)', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const ex = GENERATOR_BY_ID.get('electrones-por-numeros')!.create(seed, 3);
      for (const p of ex.parts) expect(p.prompt).not.toMatch(/m_l|m_s|mₗ|mₛ/);
    }
  });
});
