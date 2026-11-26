/**
 * Controlador de calidad gráfica adaptativa con histéresis (lógica pura, sin dependencias de React).
 *
 * - Mide los fotogramas por ventanas de 2 s.
 * - Baja un nivel si 3 ventanas seguidas están por debajo de 45 fps.
 * - Sube un nivel solo si 6 ventanas seguidas superan 57 fps, han pasado al menos 15 s desde el último
 *   cambio y no se supera el nivel inicial estimado por hardware.
 * - Si tras subir vuelve a bajar en menos de 30 s (oscilación), se bloquea la subida durante 120 s.
 * - Las ventanas con la pestaña oculta o con pausas largas (> 250 ms, p. ej. cambios de laboratorio) se
 *   descartan para no confundir una carga puntual con falta de rendimiento.
 */
export type Tier = 'alta' | 'media' | 'baja';
const ORDER: Tier[] = ['baja', 'media', 'alta'];

export interface QualityState {
  tier: Tier;
  ceiling: Tier;
  lowStreak: number;
  highStreak: number;
  lastChange: number;
  lastUpgrade: number;
  lockedUntil: number;
}

export const LOW_FPS = 45;
export const HIGH_FPS = 57;
export const WINDOW_MS = 2000;

export function initialQualityState(tier: Tier, now: number): QualityState {
  return { tier, ceiling: tier, lowStreak: 0, highStreak: 0, lastChange: now, lastUpgrade: -Infinity, lockedUntil: -Infinity };
}

/** Procesa una ventana de medida: fps medios y fotograma más largo (ms). Devuelve el nuevo estado. */
export function qualityStep(s: QualityState, fps: number, longestFrameMs: number, now: number): QualityState {
  if (!Number.isFinite(fps) || longestFrameMs > 250) return { ...s, lowStreak: 0, highStreak: 0 };
  const idx = ORDER.indexOf(s.tier);
  if (fps < LOW_FPS) {
    const lowStreak = s.lowStreak + 1;
    if (lowStreak >= 3 && idx > 0) {
      const oscillating = now - s.lastUpgrade < 30_000;
      return { ...s, tier: ORDER[idx - 1]!, lowStreak: 0, highStreak: 0, lastChange: now, lockedUntil: oscillating ? now + 120_000 : s.lockedUntil };
    }
    return { ...s, lowStreak, highStreak: 0 };
  }
  if (fps > HIGH_FPS) {
    const highStreak = s.highStreak + 1;
    const canUp = idx < ORDER.indexOf(s.ceiling) && now - s.lastChange >= 15_000 && now >= s.lockedUntil;
    if (highStreak >= 6 && canUp) return { ...s, tier: ORDER[idx + 1]!, lowStreak: 0, highStreak: 0, lastChange: now, lastUpgrade: now };
    return { ...s, highStreak, lowStreak: 0 };
  }
  return { ...s, lowStreak: 0, highStreak: 0 };
}
