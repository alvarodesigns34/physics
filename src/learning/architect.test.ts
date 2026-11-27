import { describe, expect, it } from 'vitest';
import { CHALLENGES, checkChallenge } from './architectChallenges';
import { diagnoseBoxes } from '../science/boxes';

describe('Electron Architect 3.0: desafíos', () => {
  it.each(CHALLENGES.map((c) => [c.id, c] as const))('%s: la solución de referencia cumple el objetivo', (_id, c) => {
    expect(checkChallenge(c, c.solution()).ok).toBe(true);
  });
  it.each(CHALLENGES.filter((c) => c.preset).map((c) => [c.id, c] as const))('%s: el punto de partida está realmente roto por la regla declarada', (_id, c) => {
    const d = diagnoseBoxes(c.preset!, c.z, c.z - c.charge);
    expect(d.electrons).toBe(c.z - c.charge);
    expect(checkChallenge(c, c.preset!).ok).toBe(false);
    expect(d.issues.some((i) => i.rule === c.brokenRule)).toBe(true);
  });
  it('el estado fundamental no vale cuando se pide un estado excitado', () => {
    const c = CHALLENGES.find((x) => x.id === 'c-exc4')!;
    expect(checkChallenge(c, CHALLENGES.find((x) => x.id === 'n-fund')!.solution()).ok).toBe(false);
  });
});
