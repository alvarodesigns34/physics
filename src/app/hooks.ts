import { useEffect, useState, useSyncExternalStore } from 'react';
import { useStore, type QualitySetting } from '../state/store';

// ── Rutas (hash) ──────────────────────────────────────────────────────────

export type Route = '/' | '/forja' | '/fotones' | '/entrenamiento' | '/campana';
const ROUTES: Route[] = ['/', '/forja', '/fotones', '/entrenamiento', '/campana'];

function readRoute(): { route: Route; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const route = (ROUTES as string[]).includes(path ?? '') ? (path as Route) : '/';
  return { route, query: new URLSearchParams(qs ?? '') };
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

export type Tier = 'alta' | 'media' | 'baja';

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

let autoTier: Tier | null = null;
const autoListeners = new Set<() => void>();
export function degradeAutoTier() {
  const cur = autoTier ?? detectTier();
  const next: Tier = cur === 'alta' ? 'media' : 'baja';
  if (next !== cur) {
    autoTier = next;
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
  if (q === 'auto') return PROFILES[autoTier ?? detectTier()];
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
