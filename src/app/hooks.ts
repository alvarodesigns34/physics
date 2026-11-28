import { useEffect, useState, useSyncExternalStore } from 'react';
import { useStore, type QualitySetting } from '../state/store';

// ── Rutas (hash) ──────────────────────────────────────────────────────────

export type Route = '/' | '/forja' | '/fotones' | '/entrenamiento' | '/campana' | '/periodico' | '/cuantico' | '/arquitecto' | '/historia' | '/masas' | '/guia' | '/preparar';
const ROUTES: Route[] = ['/guia', '/', '/forja', '/fotones', '/entrenamiento', '/campana', '/periodico', '/cuantico', '/arquitecto', '/historia', '/masas', '/preparar'];

/**
 * Analiza el hash de forma defensiva (ATOM 5.1): ruta desconocida → inicio; el hash se limita a 2 kB; solo
 * se conservan parámetros con nombre corto y alfanumérico y valor de hasta 200 caracteres sin caracteres de
 * control. Cada vista valida además el SIGNIFICADO de sus parámetros (apartado existente, Z entero…).
 */
export function parseHash(hash: string): { route: Route; query: URLSearchParams } {
  const raw = (hash.replace(/^#/, '') || '/').slice(0, 2048);
  const k = raw.indexOf('?');
  const path = k < 0 ? raw : raw.slice(0, k);
  const qs = k < 0 ? '' : raw.slice(k + 1);
  const route = (ROUTES as string[]).includes(path) ? (path as Route) : '/';
  const query = new URLSearchParams();
  let parsed: URLSearchParams;
  try {
    parsed = new URLSearchParams(qs);
  } catch {
    parsed = new URLSearchParams();
  }
  for (const [key, value] of parsed) {
    if (!/^[a-z]{1,12}$/i.test(key) || value.length > 200 || /[\u0000-\u001f\u007f<>]/.test(value) || query.has(key)) continue;
    query.set(key, value);
  }
  return { route, query };
}

function readRoute(): { route: Route; query: URLSearchParams } {
  return parseHash(window.location.hash);
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => '');
  void hash;
  return readRoute();
}

export function navigate(to: string) {
  if (`#${to}` !== window.location.hash) window.location.hash = to;
}

// ── Movimiento reducido ───────────────────────────────────────────────────

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function useReducedMotion(): boolean {
  const setting = useStore((s) => s.settings.motion);
  const system = useSyncExternalStore(subscribeMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
  return setting === 'reducido' || (setting === 'sistema' && system);
}

// ── Calidad gráfica ───────────────────────────────────────────────────────

import { initialQualityState, qualityStep, noteSceneChange, WINDOW_MS, type QualityState, type Tier } from './quality';
export type { Tier };
export { WINDOW_MS };

export interface QualityProfile {
  tier: Tier;
  dpr: [number, number];
  bloom: boolean;
  antialias: boolean;
  points: number;
}

const PROFILES: Record<Tier, QualityProfile> = {
  alta: { tier: 'alta', dpr: [1, 2], bloom: true, antialias: true, points: 24000 },
  media: { tier: 'media', dpr: [1, 1.5], bloom: true, antialias: true, points: 12000 },
  baja: { tier: 'baja', dpr: [1, 1], bloom: false, antialias: false, points: 5000 },
};

/** Estimación inicial por hardware (núcleos, memoria y pantalla). */
export function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (cores <= 2 || mem <= 2) return 'baja';
  if (cores <= 4 || mem <= 4 || small) return 'media';
  return 'alta';
}

// Nivel automático gobernado por el controlador con histéresis (src/app/quality.ts).
let autoState: QualityState | null = null;
const autoListeners = new Set<() => void>();
function getAutoState(): QualityState {
  if (!autoState) autoState = initialQualityState(detectTier(), performance.now());
  return autoState;
}

/** Entrega una ventana de medida al controlador; notifica si cambia el nivel. */
export function reportFrameWindow(fps: number, longestFrameMs: number, medianFrameMs?: number) {
  const cur = getAutoState();
  const next = qualityStep(cur, { fps, longestFrameMs, medianFrameMs }, performance.now());
  autoState = next;
  if (next.tier !== cur.tier) autoListeners.forEach((l) => l());
}

/** Avisa al controlador de un cambio de escena (las ventanas de carga no cuentan). */
export function notifySceneChange() {
  autoState = noteSceneChange(getAutoState(), performance.now());
}

/** Compatibilidad: fuerza una bajada de nivel (p. ej. ante una pérdida de contexto WebGL). */
export function degradeAutoTier() {
  const cur = getAutoState();
  const idx = (['baja', 'media', 'alta'] as Tier[]).indexOf(cur.tier);
  if (idx > 0) {
    autoState = { ...cur, tier: (['baja', 'media', 'alta'] as Tier[])[idx - 1]!, lastChange: performance.now(), lockedUntil: performance.now() + 120_000 };
    autoListeners.forEach((l) => l());
  }
}

export function useQuality(): QualityProfile {
  const q: QualitySetting = useStore((s) => s.settings.quality);
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    autoListeners.add(l);
    return () => void autoListeners.delete(l);
  }, []);
  if (q === 'auto') return PROFILES[getAutoState().tier];
  return PROFILES[q];
}

// ── Utilidades ────────────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
