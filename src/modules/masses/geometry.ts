/**
 * Geometría del espectrómetro de masas (ATOM 5.0): la ÚNICA fuente de verdad para la escena y para las
 * pruebas. La escena coloca los iones, el arco dibujado y el imán con estas funciones; geometry.test.ts
 * verifica que son coherentes entre sí sin reescribir ninguna fórmula.
 */
import * as THREE from 'three';

/** Longitud del tramo de aceleración (unidades de escena). */
export const ACC_LEN = 2.2;
/** Fracción del recorrido que ocupa la aceleración en línea recta; el resto es la semicircunferencia. */
export const ACC_FRACTION = 0.35;
/** El imán es un semidisco de radio rMedio·MAGNET_SCALE. */
export const MAGNET_SCALE = 1.35;

/** Posición de un ion en el instante normalizado t ∈ [0, 1] para una trayectoria de radio r. */
export function ionPosition(t: number, r: number, out = new THREE.Vector3()): THREE.Vector3 {
  if (t < ACC_FRACTION) return out.set(-ACC_LEN + (t / ACC_FRACTION) * ACC_LEN, 0, 0);
  const ang = ((t - ACC_FRACTION) / (1 - ACC_FRACTION)) * Math.PI;
  return out.set(r * Math.sin(ang), 0, -(r - r * Math.cos(ang)));
}

/** Arco dibujado: toro de media vuelta con esta rotación y posición. */
export const ARC_ROTATION: [number, number, number] = [Math.PI / 2, 0, -Math.PI / 2];
export const arcPosition = (r: number): [number, number, number] => [0, 0, -r];
export const arcArgs = (r: number): [number, number, number, number, number] => [r, 0.006, 6, 160, Math.PI];
export function arcGeometry(r: number): THREE.TorusGeometry {
  return new THREE.TorusGeometry(...arcArgs(r));
}

/** Semidisco del imán: ángulo inicial, extensión y rotación (plano horizontal). */
export const MAGNET_THETA: [number, number] = [-Math.PI / 2, Math.PI];
export const MAGNET_ROTATION_X = -Math.PI / 2;
export function magnetGeometry(rMean: number): THREE.CircleGeometry {
  return new THREE.CircleGeometry(rMean * MAGNET_SCALE, 96, MAGNET_THETA[0], MAGNET_THETA[1]);
}
