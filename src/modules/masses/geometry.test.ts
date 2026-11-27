/**
 * Regresión (ATOM 4.0): el arco dibujado, el sector magnético y el movimiento de los iones deben estar en
 * el mismo semiplano. Antes, el imán y el arco ocupaban x ≤ 0 mientras los iones se movían por x ≥ 0.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

const r = 2.3;
/** Movimiento de los iones en MassSpec.tsx: x = r·sen φ, z = −(r − r·cos φ), φ ∈ [0, π]. */
const ion = (phi: number) => new THREE.Vector3(r * Math.sin(phi), 0, -(r - r * Math.cos(phi)));

describe('Espectrómetro de masas: geometría coherente', () => {
  it('el arco dibujado (toro con la rotación de la escena) coincide con la trayectoria de los iones', () => {
    const g = new THREE.TorusGeometry(r, 0.006, 6, 160, Math.PI);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, -r), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    const pos = g.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      expect(v.x).toBeGreaterThan(-0.01); // semiplano del imán
      expect(Math.abs(Math.hypot(v.x, v.z + r) - r)).toBeLessThan(0.01); // circunferencia de la trayectoria
    }
    for (const phi of [0, Math.PI / 4, Math.PI / 2, Math.PI]) expect(ion(phi).x).toBeGreaterThanOrEqual(-1e-9);
    g.dispose();
  });
  it('el semidisco del imán (θ de −π/2 a π/2, rotado al plano horizontal) cubre x ≥ 0', () => {
    const g = new THREE.CircleGeometry(r * 1.35, 96, -Math.PI / 2, Math.PI);
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) expect(pos.getX(i)).toBeGreaterThan(-1e-6);
    g.dispose();
  });
});
