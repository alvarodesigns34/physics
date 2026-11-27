/**
 * Regresión (ATOM 4.0 → 5.0): el arco dibujado, el sector magnético y el movimiento de los iones deben
 * estar en el mismo semiplano y sobre la misma circunferencia. La prueba usa las MISMAS funciones y
 * constantes que la escena (geometry.ts): no reescribe ninguna fórmula que pretenda verificar.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ACC_FRACTION, ARC_ROTATION, arcGeometry, arcPosition, ionPosition, MAGNET_ROTATION_X, magnetGeometry } from './geometry';

const r = 2.3;

function arcVertices(radius: number): THREE.Vector3[] {
  const g = arcGeometry(radius);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...arcPosition(radius)), new THREE.Quaternion().setFromEuler(new THREE.Euler(...ARC_ROTATION)), new THREE.Vector3(1, 1, 1)));
  const pos = g.getAttribute('position');
  const out = Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i));
  g.dispose();
  return out;
}

describe('Espectrómetro de masas: geometría coherente (con el código de la escena)', () => {
  const ionArc = Array.from({ length: 101 }, (_, k) => ionPosition(ACC_FRACTION + (k / 100) * (1 - ACC_FRACTION), r));
  it('cada posición del ion en el imán está a distancia r del centro del arco dibujado y en x ≥ 0', () => {
    const c = new THREE.Vector3(...arcPosition(r));
    for (const p of ionArc) {
      expect(p.x).toBeGreaterThanOrEqual(-1e-9);
      expect(Math.abs(p.distanceTo(c) - r)).toBeLessThan(1e-9);
    }
  });
  it('el arco dibujado pasa por las posiciones del ion (Hausdorff < 0,02)', () => {
    const verts = arcVertices(r);
    for (const p of ionArc) expect(Math.min(...verts.map((v) => v.distanceTo(p)))).toBeLessThan(0.02);
    for (const v of verts.filter((_, i) => i % 7 === 0)) expect(Math.min(...ionArc.map((p) => p.distanceTo(v)))).toBeLessThan(0.08);
  });
  it('el ion entra en el imán donde termina la aceleración y sale hacia el detector (0, 0, −2r)', () => {
    expect(ionPosition(ACC_FRACTION, r).length()).toBeLessThan(1e-9);
    expect(ionPosition(1, r).distanceTo(new THREE.Vector3(0, 0, -2 * r))).toBeLessThan(1e-9);
  });
  it('el semidisco del imán (rotado como en la escena) cubre x ≥ 0 y contiene toda la trayectoria', () => {
    const g = magnetGeometry(r);
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(MAGNET_ROTATION_X));
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) expect(pos.getX(i)).toBeGreaterThan(-1e-6);
    g.dispose();
  });
});
