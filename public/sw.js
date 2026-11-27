/*
 * ATOM · Service worker (ATOM 5.1).
 *
 * Corrige dos defectos de 5.0:
 * 1. Borraba TODAS las cachés del origen distintas de la suya, incluidas las de otros proyectos publicados
 *    en el mismo dominio (p. ej. usuario.github.io/otro-proyecto). Ahora cada caché lleva el prefijo
 *    «atom::<ámbito>::» y solo se borran las de ESTE ámbito y de versiones anteriores.
 * 2. La versión era una constante escrita a mano: como sw.js no cambiaba entre compilaciones, el navegador
 *    no instalaba nunca una versión nueva, y la activación inmediata (skipWaiting) podía dejar una pestaña
 *    abierta pidiendo fragmentos que ya no existían. Ahora la página registra sw.js?v=<versión> (la de
 *    offline-manifest.json, generado en la compilación) y una versión nueva espera a que el alumno acepte.
 *
 * Estrategias:
 * - Documento: red primero (con límite de espera) y copia de la versión instalada sin red.
 * - Recursos con huella (assets/…-hash.*): caché primero; son inmutables.
 * - Descarga deliberada (mensaje «download»): todos los archivos del manifiesto, con progreso.
 * Solo peticiones GET del mismo origen. Nada se envía a terceros.
 */
const SCOPE = new URL(self.registration.scope).pathname;
const PREFIX = `atom::${SCOPE}::`;
/** Versión de ESTE service worker: la página lo registra como sw.js?v=<versión del manifiesto>. */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './offline-manifest.json'];
const ASSETS = `${PREFIX}assets`;
const SHELL = `${PREFIX}shell-${VERSION}`;

const abs = (u) => new URL(u, self.registration.scope).href;

/** Manifiesto de ESTA versión (guardado al instalar) o, si se pide, el último publicado. */
async function loadManifest(fromNetwork = false) {
  try {
    const r = fromNetwork ? await fetch(abs('./offline-manifest.json'), { cache: 'no-store' }) : await (await caches.open(SHELL)).match(abs('./offline-manifest.json'));
    if (!r || !r.ok) return null;
    const m = await r.json();
    return m && m.app === 'ATOM' && typeof m.version === 'string' && Array.isArray(m.files) ? m : null;
  } catch {
    return null;
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(SHELL);
      await c.addAll(SHELL_FILES.map((u) => new Request(abs(u), { cache: 'reload' })));
      // Primera instalación: no hay versión anterior que proteger, se activa ya. Si la hay, la nueva
      // espera a que el alumno acepte actualizar (así ninguna pestaña abierta se queda sin sus archivos).
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // SOLO cachés de este ámbito: nunca se tocan las de otros proyectos del mismo origen.
      const oldShells = keys.filter((k) => k.startsWith(`${PREFIX}shell-`) && k !== SHELL);
      await Promise.all(oldShells.map((k) => caches.delete(k)));
      // Caché heredada de ATOM 5.0 («atom-v5», sin prefijo): se borra solo si TODAS sus entradas son de
      // este ámbito; si alguna es de otra ruta del origen, pertenece a otro despliegue y no se toca.
      for (const k of keys.filter((x) => /^atom-v\d+$/.test(x))) {
        const reqs = await (await caches.open(k)).keys();
        if (reqs.every((r) => r.url.startsWith(self.registration.scope))) await caches.delete(k);
      }
      // Los recursos con huella que ya no figuran en el manifiesto de esta versión se podan.
      const m = await loadManifest();
      if (m) {
        const valid = new Set(m.files.map((f) => abs(f.url)));
        const a = await caches.open(ASSETS);
        for (const req of await a.keys()) if (!valid.has(req.url)) await a.delete(req);
      }
      await self.clients.claim();
    })(),
  );
});

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (r) => (clearTimeout(t), resolve(r)),
      (err) => (clearTimeout(t), reject(err)),
    );
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname.endsWith('/sw.js')) return;
  if (url.pathname.endsWith('/offline-manifest.json')) return; // siempre de la red (detección de versiones)
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      (async () => {
        try {
          return await withTimeout(fetch(req), 4000);
        } catch {
          const c = await caches.open(SHELL);
          return (await c.match(abs('./index.html'))) || (await c.match(abs('./'))) || new Response('Sin conexión y sin copia guardada de ATOM.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
        }
      })(),
    );
    return;
  }
  e.respondWith(
    (async () => {
      const hit = (await (await caches.open(ASSETS)).match(req)) || (await (await caches.open(SHELL)).match(req));
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic' && /\/assets\//.test(url.pathname)) {
        const copy = res.clone();
        caches.open(ASSETS).then((c) => c.put(req, copy));
      }
      return res;
    })(),
  );
});

/** Estado del paquete sin conexión: qué parte del manifiesto de esta versión está guardada. */
async function status() {
  const m = await loadManifest();
  const waiting = !!self.registration.waiting;
  if (!m) return { type: 'status', manifest: false, version: VERSION, waiting };
  const a = await caches.open(ASSETS);
  const shell = await caches.open(SHELL);
  let have = 0;
  let haveBytes = 0;
  for (const f of m.files) {
    const u = abs(f.url);
    if ((await a.match(u)) || (await shell.match(u))) {
      have++;
      haveBytes += f.size;
    }
  }
  const total = m.files.reduce((s, f) => s + f.size, 0);
  return { type: 'status', manifest: true, version: VERSION, builtAt: m.builtAt, files: m.files.length, have, total, haveBytes, waiting };
}

let downloading = false;
async function downloadAll(port) {
  if (downloading) return port.postMessage({ type: 'error', message: 'Ya hay una descarga en curso.' });
  downloading = true;
  try {
    const m = await loadManifest();
    if (!m) throw new Error('No se ha podido leer la lista de archivos de esta versión.');
    const a = await caches.open(ASSETS);
    const total = m.files.reduce((s, f) => s + f.size, 0);
    let done = 0;
    let bytes = 0;
    for (const f of m.files) {
      const u = abs(f.url);
      if (!(await a.match(u))) {
        const r = await fetch(u, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`No se ha podido descargar ${f.url} (${r.status}).`);
        await a.put(u, r);
      }
      done++;
      bytes += f.size;
      port.postMessage({ type: 'progress', done, files: m.files.length, bytes, total });
    }
    port.postMessage(await status());
    port.postMessage({ type: 'done' });
  } catch (err) {
    port.postMessage({ type: 'error', message: String((err && err.message) || err) });
  } finally {
    downloading = false;
  }
}

self.addEventListener('message', (e) => {
  const data = e.data || {};
  const port = e.ports && e.ports[0];
  if (data.type === 'skip-waiting') self.skipWaiting();
  else if (data.type === 'status' && port) status().then((s) => port.postMessage(s));
  else if (data.type === 'download' && port) downloadAll(port);
  else if (data.type === 'remove' && port)
    (async () => {
      const keys = (await caches.keys()).filter((k) => k === ASSETS);
      await Promise.all(keys.map((k) => caches.delete(k)));
      port.postMessage(await status());
    })();
});
