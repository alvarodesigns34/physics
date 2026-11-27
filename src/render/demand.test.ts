import { describe, expect, it } from 'vitest';
import { requestFrames, shouldRender, activeHolds, IDLE_MS } from './demand';

describe('renderizado bajo demanda', () => {
  it('dibuja durante la ventana pedida y deja de hacerlo después', () => {
    const t0 = 1_000_000;
    requestFrames(2000, t0);
    expect(shouldRender(t0 + 1000)).toBe(true);
    expect(shouldRender(t0 + 2500)).toBe(false);
    expect(activeHolds()).toBe(0);
  });
  it('la ventana de interacción por defecto es finita', () => {
    expect(IDLE_MS).toBeGreaterThan(1000);
    expect(IDLE_MS).toBeLessThanOrEqual(10_000);
  });
});
