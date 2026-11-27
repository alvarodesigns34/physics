import { describe, expect, it } from 'vitest';
import { turningRadius } from './PotentialWell';
import { levelEnergyEV } from '../../science/hydrogen';

describe('pozo de potencial: los anillos están donde Eₙ = V(r)', () => {
  it.each([1, 2, 3, 4, 5, 6, 7])('n = %i', (n) => {
    const r = turningRadius(n); // en radios de Bohr
    const V = -27.2114 / r; // eV (energía de Hartree / r)
    expect(V).toBeCloseTo(levelEnergyEV(n), 1);
  });
});
