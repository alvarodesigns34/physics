/**
 * ATOM 5.1 · Funcionamiento sin conexión desde la página: registro versionado del service worker, aviso de
 * versión nueva (con actualización solo si el alumno la acepta), descarga deliberada de todo el contenido
 * con progreso, estado del paquete y almacenamiento persistente.
 */
import { create } from 'zustand';

export interface OfflineStatus {
  supported: boolean;
  /** Versión del service worker que controla la página */
  version?: string;
  builtAt?: string;
  files?: number;
  have?: number;
  /** Bytes del paquete completo y bytes ya guardados */
  total?: number;
  haveBytes?: number;
  /** Hay una versión nueva instalada esperando */
  updateReady: boolean;
  /** Progreso de una descarga en curso (0–1) o null */
  progress: number | null;
  error?: string;
  /** El navegador garantiza no borrar los datos (StorageManager.persist) */
  persisted?: boolean;
  /** Espacio usado y disponible según el navegador */
  usage?: number;
  quota?: number;
}

export const useOffline = create<OfflineStatus>(() => ({ supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator, updateReady: false, progress: null }));

let registration: ServiceWorkerRegistration | null = null;

/** Pregunta algo al service worker activo por un canal propio y espera respuestas hasta `until`. */
function ask(type: string, onMessage: (d: Record<string, unknown>) => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const sw = navigator.serviceWorker.controller ?? registration?.active;
    if (!sw) return reject(new Error('Sin service worker activo (recarga la página con conexión).'));
    const ch = new MessageChannel();
    const t = setTimeout(() => reject(new Error('El service worker no responde.')), 120_000);
    ch.port1.onmessage = (e) => {
      if (onMessage(e.data as Record<string, unknown>)) {
        clearTimeout(t);
        ch.port1.close();
        resolve();
      }
    };
    sw.postMessage({ type }, [ch.port2]);
  });
}

function applyStatus(d: Record<string, unknown>) {
  useOffline.setState({
    version: d.version as string | undefined,
    builtAt: d.builtAt as string | undefined,
    files: d.files as number | undefined,
    have: d.have as number | undefined,
    total: d.total as number | undefined,
    haveBytes: d.haveBytes as number | undefined,
  });
}

export async function refreshOfflineStatus(): Promise<void> {
  if (!useOffline.getState().supported) return;
  try {
    await ask('status', (d) => {
      if (d.type === 'status') applyStatus(d);
      return true;
    });
  } catch (e) {
    useOffline.setState({ error: (e as Error).message });
  }
  try {
    const est = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    useOffline.setState({ usage: est?.usage, quota: est?.quota, persisted });
  } catch {
    /* StorageManager no disponible */
  }
}

/** Descarga TODO el contenido de esta versión para estudiar sin conexión. */
export async function downloadForOffline(): Promise<void> {
  useOffline.setState({ progress: 0, error: undefined });
  try {
    // Pedir almacenamiento persistente: sin él, el navegador puede vaciar la caché si le falta espacio.
    try {
      useOffline.setState({ persisted: await navigator.storage?.persist?.() });
    } catch {
      /* opcional */
    }
    await ask('download', (d) => {
      if (d.type === 'progress') useOffline.setState({ progress: Number(d.total) ? Number(d.bytes) / Number(d.total) : Number(d.done) / Number(d.files) });
      if (d.type === 'status') applyStatus(d);
      if (d.type === 'error') useOffline.setState({ error: String(d.message) });
      return d.type === 'done' || d.type === 'error';
    });
  } catch (e) {
    useOffline.setState({ error: (e as Error).message });
  } finally {
    useOffline.setState({ progress: null });
    void refreshOfflineStatus();
  }
}

export async function removeOfflineCopy(): Promise<void> {
  await ask('remove', (d) => {
    if (d.type === 'status') applyStatus(d);
    return true;
  }).catch((e: Error) => useOffline.setState({ error: e.message }));
}

/** Activa la versión nueva que espera y recarga cuando tome el control. */
export function applyUpdate(): void {
  const w = registration?.waiting;
  if (!w) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  w.postMessage({ type: 'skip-waiting' });
}

function watch(reg: ServiceWorkerRegistration) {
  registration = reg;
  const mark = () => useOffline.setState({ updateReady: !!reg.waiting && !!navigator.serviceWorker.controller });
  mark();
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    nw?.addEventListener('statechange', () => {
      if (nw.state === 'installed') mark();
      if (nw.state === 'activated') void refreshOfflineStatus();
    });
  });
}

/**
 * Registra el service worker con la versión del manifiesto en la URL. Así cada compilación es un service
 * worker distinto (antes sw.js no cambiaba y el navegador no instalaba nunca la versión nueva).
 */
export async function registerOffline(): Promise<void> {
  if (!useOffline.getState().supported) return;
  try {
    const existing = await navigator.serviceWorker.getRegistration('./');
    let version: string | null = null;
    try {
      const r = await fetch('./offline-manifest.json', { cache: 'no-store' });
      if (r.ok) {
        const m = (await r.json()) as { app?: string; version?: unknown };
        if (m.app === 'ATOM' && typeof m.version === 'string' && /^[0-9a-f]{8}$/.test(m.version)) version = m.version;
      }
    } catch {
      /* sin conexión: se mantiene el registro existente */
    }
    if (version) watch(await navigator.serviceWorker.register(`./sw.js?v=${version}`, { scope: './' }));
    else if (existing) watch(existing);
    void refreshOfflineStatus();
  } catch {
    /* sin service worker la aplicación funciona igual, solo que no sin conexión */
  }
}

export function formatBytes(b: number | undefined): string {
  if (b === undefined) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toLocaleString('es-ES', { maximumFractionDigits: 0 })} kB`;
  return `${(b / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
}
