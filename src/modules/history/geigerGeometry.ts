/**
 * Geometría de la escena de Geiger–Marsden (ATOM 5.0): fuente única para la escena y para su prueba.
 *
 * La pantalla de ZnS es una banda cilíndrica de eje z (perpendicular al plano del dibujo) y radio
 * SCREEN_R, centrada en la lámina. Cada partícula desviada un ángulo θ deja su destello EN la banda, a un
 * ángulo θ medido en el plano xy desde la dirección del haz (+x): así el ángulo de desviación se lee
 * directamente sobre la pantalla graduada. La coordenada z del destello solo lo reparte por la altura de
 * la banda (el azimut φ real se proyecta: no cambia θ).
 */
import * as THREE from 'three';

export const SCREEN_R = 2.6;
export const SCREEN_H = 1.2;
/** Ángulos marcados en la pantalla (grados) */
export const SCREEN_TICKS = [0, 30, 60, 90, 120, 150, 180];

/**
 * Posición del destello de una partícula desviada θ (rad) con azimut φ (rad). El signo de cos φ decide
 * a qué lado del haz aparece; sin φ el destello se reparte por la altura de la banda.
 */
export function flashPosition(theta: number, phi: number, out = new THREE.Vector3()): THREE.Vector3 {
  const side = Math.cos(phi) >= 0 ? 1 : -1;
  const z = Math.sin(phi) * SCREEN_H * 0.45;
  return out.set(SCREEN_R * Math.cos(theta), side * SCREEN_R * Math.sin(theta), z);
}

/** Punto de la pantalla para una marca de ángulo (grados), en el plano del haz. */
export function tickPosition(deg: number, side = 1): [number, number, number] {
  const t = (deg * Math.PI) / 180;
  return [SCREEN_R * Math.cos(t), side * SCREEN_R * Math.sin(t), 0];
}
