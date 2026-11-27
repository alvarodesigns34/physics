/**
 * Renderizado bajo demanda (ATOM 4.0). La escena 3D solo se dibuja cuando algo puede cambiar:
 * - durante la interacción y IDLE_MS después (para que terminen transiciones y amortiguaciones);
 * - mientras una simulación continua lo pide (`useContinuousRender`: Monte Carlo, conteo de iones…);
 * - durante una animación con duración conocida (`requestFrames(ms)`: fotones en vuelo, cascadas…).
 * En reposo no se dibuja ningún fotograma: menos batería y temperatura en iPad y portátiles.
 */
import { useEffect } from 'react';

export const IDLE_MS = 5000;
let until = 0;
const holds = new Set<symbol>();
const listeners = new Set<() => void>();

const wake = () => listeners.forEach((l) => l());

/** Mantiene el dibujo activo al menos `ms` milisegundos desde ahora. */
export function requestFrames(ms: number, now = performance.now()) {
  until = Math.max(until, now + ms);
  wake();
}

export function markInteraction() {
  requestFrames(IDLE_MS);
}

/** ¿Estamos dentro de la ventana de interacción (sin contar simulaciones continuas)? */
export function inInteractionWindow(now = performance.now()): boolean {
  return now < until;
}

/** ¿Hay que dibujar el siguiente fotograma? (pura respecto al estado del módulo; probada aparte). */
export function shouldRender(now = performance.now()): boolean {
  return holds.size > 0 || now < until;
}

/** Una simulación declara que avanza sola mientras `active` sea verdadero. */
export function useContinuousRender(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const id = Symbol('continuo');
    holds.add(id);
    wake();
    return () => {
      holds.delete(id);
    };
  }, [active]);
}

/** El controlador del lienzo se suscribe para reanudar el bucle cuando vuelve a haber trabajo. */
export function onWake(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function activeHolds(): number {
  return holds.size;
}

let installed = false;
/** Cualquier interacción del usuario (también en los paneles) puede cambiar la escena. */
export function installInteractionWatch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart', 'input', 'change'] as const) {
    window.addEventListener(ev, markInteraction, { passive: true, capture: true });
  }
}
