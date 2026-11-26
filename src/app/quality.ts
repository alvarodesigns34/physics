/**
 * Controlador de calidad gráfica adaptativa con histéresis (lógica pura, sin dependencias de React).
 *
 * - Mide los fotogramas por ventanas de 2 s.
 * - Baja un nivel si 3 ventanas seguidas están por debajo de 45 fps.
 * - Sube un nivel solo si 6 ventanas seguidas superan 57 fps, han pasado al menos 15 s desde el último
 *   cambio y no se supera el nivel inicial estimado por hardware.
 * - Si tras subir vuelve a bajar en menos de 30 s (oscilación), se bloquea la subida durante 120 s.
 * - Clasificación de cada ventana (ATOM 3.0, hallazgo P1.1 de la auditoría):
 *   · pestaña oculta → el monitor no entrega ventana;
 *   · cambio de escena → ventanas descartadas durante SCENE_GRACE_MS (carga de geometría y shaders);
 *   · bloqueo puntual: algún fotograma > 250 ms pero la MEDIANA es fluida → se descarta;
 *   · rendimiento persistentemente insuficiente: la mediana del fotograma es lenta → cuenta como ventana
 *     baja aunque haya fotogramas > 250 ms (antes se descartaba y la calidad nunca bajaba);
 *   · rendimiento extremo (< SEVERE_FPS) → bastan 2 ventanas para bajar.
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
  /** Hasta este instante se ignoran las ventanas (cambio de escena reciente) */
  graceUntil: number;
}

export interface FrameSample {
  fps: number;
  longestFrameMs: number;
  /** Mediana de la duración de los fotogramas de la ventana (ms). Si falta, se estima como 1000/fps. */
  medianFrameMs?: number;
}

export type WindowKind = 'invalida' | 'gracia' | 'pico-aislado' | 'baja' | 'muy-baja' | 'alta' | 'normal';

/** Clasifica una ventana de medida (función pura, probada aparte). */
export function classifyWindow(s: QualityState, w: FrameSample, now: number): WindowKind {
  if (!Number.isFinite(w.fps) || w.fps <= 0) return 'invalida';
  if (now < s.graceUntil) return 'gracia';
  const median = w.medianFrameMs ?? 1000 / w.fps;
  const medianSlow = median > 1000 / LOW_FPS;
  if (w.longestFrameMs > SPIKE_MS && !medianSlow) return 'pico-aislado';
  // Con picos, los fps medios se hunden aunque la mayoría de fotogramas sean fluidos: decide la mediana.
  const effFps = w.longestFrameMs > SPIKE_MS ? 1000 / median : w.fps;
  if (effFps < SEVERE_FPS) return 'muy-baja';
  if (effFps < LOW_FPS) return 'baja';
  if (effFps > HIGH_FPS) return 'alta';
  return 'normal';
}

/** Marca un cambio de escena: las siguientes ventanas no cuentan durante SCENE_GRACE_MS. */
export function noteSceneChange(s: QualityState, now: number): QualityState {
  return { ...s, graceUntil: now + SCENE_GRACE_MS, lowStreak: 0, highStreak: 0 };
}

export const LOW_FPS = 45;
export const HIGH_FPS = 57;
export const WINDOW_MS = 2000;
export const SEVERE_FPS = 20;
export const SCENE_GRACE_MS = 3000;
const SPIKE_MS = 250;

export function initialQualityState(tier: Tier, now: number): QualityState {
  return { tier, ceiling: tier, lowStreak: 0, highStreak: 0, lastChange: now, lastUpgrade: -Infinity, lockedUntil: -Infinity, graceUntil: -Infinity };
}

/**
 * Procesa una ventana de medida y devuelve el nuevo estado. Acepta la firma antigua
 * (fps, fotograma más largo) o una muestra completa con la mediana.
 */
export function qualityStep(s: QualityState, sample: FrameSample | number, longestOrNow: number, maybeNow?: number): QualityState {
  const w: FrameSample = typeof sample === 'number' ? { fps: sample, longestFrameMs: longestOrNow } : sample;
  const now = typeof sample === 'number' ? maybeNow! : longestOrNow;
  const kind = classifyWindow(s, w, now);
  const idx = ORDER.indexOf(s.tier);
  switch (kind) {
    case 'invalida':
    case 'gracia':
    case 'pico-aislado':
      return { ...s, lowStreak: 0, highStreak: 0 };
    case 'baja':
    case 'muy-baja': {
      const lowStreak = s.lowStreak + 1;
      const needed = kind === 'muy-baja' ? 2 : 3;
      if (lowStreak >= needed && idx > 0) {
        const oscillating = now - s.lastUpgrade < 30_000;
        return { ...s, tier: ORDER[idx - 1]!, lowStreak: 0, highStreak: 0, lastChange: now, lockedUntil: oscillating ? now + 120_000 : s.lockedUntil };
      }
      return { ...s, lowStreak, highStreak: 0 };
    }
    case 'alta': {
      const highStreak = s.highStreak + 1;
      const canUp = idx < ORDER.indexOf(s.ceiling) && now - s.lastChange >= 15_000 && now >= s.lockedUntil;
      if (highStreak >= 6 && canUp) return { ...s, tier: ORDER[idx + 1]!, lowStreak: 0, highStreak: 0, lastChange: now, lastUpgrade: now };
      return { ...s, highStreak, lowStreak: 0 };
    }
    default:
      return { ...s, lowStreak: 0, highStreak: 0 };
  }
}
