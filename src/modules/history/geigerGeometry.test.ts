/** Usa las mismas funciones que la escena: los destellos caen en la pantalla y su ángulo es θ. */
import { describe, expect, it } from 'vitest';
import { flashPosition, SCREEN_H, SCREEN_R } from './geigerGeometry';

describe('Geiger–Marsden: los destellos caen sobre la pantalla dibujada, al ángulo θ', () => {
  it('para cualquier θ y φ, el destello está en la banda (radio R en el plano, |z| ≤ H/2)', () => {
    for (let t = 0; t <= Math.PI; t += Math.PI / 37) for (let p = 0; p < 2 * Math.PI; p += 0.37) {
      const v = flashPosition(t, p);
      expect(Math.abs(Math.hypot(v.x, v.y) - SCREEN_R)).toBeLessThan(1e-9);
      expect(Math.abs(v.z)).toBeLessThanOrEqual(SCREEN_H / 2);
      // El ángulo medido en la pantalla desde el haz (+x) es θ
      expect(Math.abs(Math.atan2(Math.abs(v.y), v.x) - t)).toBeLessThan(1e-9);
    }
  });
});
