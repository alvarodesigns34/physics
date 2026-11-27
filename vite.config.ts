import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sin @types/node: lectura mínima del entorno para separar pruebas y banco de rendimiento.
const BENCH = !!(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.ATOM_BENCH;

/** Huella FNV-1a de 32 bits (sin dependencias de Node). */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Archivos de `public/` que forman parte del paquete sin conexión (el service worker no se precachea a sí mismo). */
const PUBLIC_OFFLINE = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/icon.svg'];

/**
 * ATOM 5.1 · Manifiesto del paquete sin conexión: lista de todos los archivos de la compilación con su
 * tamaño, y una versión que cambia si cambia cualquiera de ellos. El service worker lo usa para descargar
 * deliberadamente todo lo necesario, informar del tamaño y del progreso, y detectar actualizaciones.
 */
function offlineManifest() {
  return {
    name: 'atom-offline-manifest',
    enforce: 'post' as const,
    async generateBundle(_o: unknown, bundle: Record<string, { type: 'chunk' | 'asset'; fileName: string; code?: string; source?: string | Uint8Array }>) {
      const files = Object.values(bundle)
        .filter((f) => !f.fileName.endsWith('.map'))
        .map((f) => {
          const body = f.type === 'chunk' ? f.code ?? '' : f.source ?? '';
          const size = typeof body === 'string' ? new TextEncoder().encode(body).length : body.byteLength;
          const sig = f.fileName === 'index.html' ? fnv(typeof body === 'string' ? body : String(size)) : '';
          return { url: f.fileName, size, sig };
        })
        .sort((a, b) => a.url.localeCompare(b.url));
      const version = fnv(files.map((f) => `${f.url}:${f.size}:${f.sig}`).join('|'));
      // Tamaño real de los archivos de public/ (lectura mínima de Node sin depender de sus tipos)
      const fs = (await import('node:' + 'fs')) as { statSync: (p: string) => { size: number } };
      const pub = PUBLIC_OFFLINE.map((url) => {
        try {
          return { url, size: fs.statSync(`public/${url}`).size };
        } catch {
          return { url, size: 0 };
        }
      });
      const out = { app: 'ATOM', version, builtAt: new Date().toISOString(), files: [...files.map(({ url, size }) => ({ url, size })), ...pub] };
      (this as unknown as { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }).emitFile({ type: 'asset', fileName: 'offline-manifest.json', source: JSON.stringify(out) });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineManifest()],
  base: './',
  build: {
    target: 'es2022',
    // El motor 3D (three + R3F + postprocesado) es inevitablemente grande (~300 kB gzip); va en un
    // fragmento propio para que se cachee entre versiones de la aplicación.
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'motor-3d', test: /node_modules[\\/](three|@react-three|postprocessing|three-stdlib|camera-controls|maath|troika|meshline|stats-gl)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: BENCH ? ['src/**/*.bench.ts'] : ['src/**/*.test.ts'],
    testTimeout: BENCH ? 120_000 : 5_000,
    environment: 'node',
    // Las pruebas de contraste leen tokens.css como texto (?raw): hay que procesar ese CSS.
    css: { include: [/tokens\.css/] },
  },
} as never);
