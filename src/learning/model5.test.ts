/**
 * ATOM 5.0 · Verificación INDEPENDIENTE del modelo 3PL: el gradiente y la información de Fisher
 * analíticos se comparan con derivadas numéricas de la log-verosimilitud (diferencias centradas), sin
 * reutilizar las fórmulas que se verifican.
 */
import { describe, expect, it } from 'vitest';
import { fisher3pl, grad3pl, loglik3pl, p3pl, initialMastery, updateMasteryY } from './mastery';

const h = 1e-5;
const d1 = (f: (t: number) => number, t: number) => (f(t + h) - f(t - h)) / (2 * h);
const d2 = (f: (t: number) => number, t: number) => (f(t + h) - 2 * f(t) + f(t - h)) / (h * h);

const grid: [number, number, number][] = [];
for (const theta of [-2.5, -1, -0.3, 0, 0.7, 2]) for (const b of [-1, 0, 1]) for (const c of [0, 0.1, 0.25, 0.5]) grid.push([theta, b, c]);

describe('3PL: gradiente analítico = derivada numérica de la log-verosimilitud', () => {
  it.each(grid)('θ=%f, b=%f, c=%f', (theta, b, c) => {
    for (const y of [0, 0.4, 1]) {
      const num = d1((t) => loglik3pl(t, b, c, y), theta);
      expect(Math.abs(grad3pl(theta, b, c, y) - num)).toBeLessThan(1e-6);
    }
  });
});

describe('3PL: información de Fisher = E[−ℓ″] (calculada numéricamente sobre y ∈ {0, 1})', () => {
  it.each(grid)('θ=%f, b=%f, c=%f', (theta, b, c) => {
    const P = p3pl(theta, b, c);
    const expected = -(P * d2((t) => loglik3pl(t, b, c, 1), theta) + (1 - P) * d2((t) => loglik3pl(t, b, c, 0), theta));
    expect(Math.abs(fisher3pl(theta, b, c) - expected)).toBeLessThan(2e-4);
  });
});

describe('Propiedades del modelo', () => {
  it('con c = 0 se recupera Rasch: gradiente y − s, información s(1 − s)', () => {
    const s = 1 / (1 + Math.exp(-0.4));
    expect(grad3pl(0.4, 0, 0, 1)).toBeCloseTo(1 - s, 12);
    expect(fisher3pl(0.4, 0, 0)).toBeCloseTo(s * (1 - s), 12);
  });
  it('un FALLO baja θ lo mismo con o sin opciones: dℓ/dθ = −s para y = 0 (el azar solo produce aciertos)', () => {
    const m = { ...initialMastery(), theta: 0 };
    expect(updateMasteryY(m, 2, 0, 0, 0, 1, 0.5).theta).toBeCloseTo(updateMasteryY(m, 2, 0, 0, 0, 1, 0).theta, 12);
  });
  it('un acierto adivinable sube θ menos que uno abierto', () => {
    const m = { ...initialMastery(), theta: 0 };
    expect(updateMasteryY(m, 2, 1, 0, 0, 1, 0.5).theta - m.theta).toBeLessThan(updateMasteryY(m, 2, 1, 0, 0, 1, 0).theta - m.theta);
  });
  it('la información acumulada coincide con la de Fisher del ítem', () => {
    const m = { ...initialMastery(), theta: 0.2, info: 1 };
    expect(updateMasteryY(m, 3, 1, 0, 0, 1, 0.25).info).toBeCloseTo(1 + fisher3pl(0.2, 1, 0.25), 12);
  });
});
