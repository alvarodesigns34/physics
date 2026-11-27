/**
 * Medición de rendimiento en navegador (ATOM 5.0, metodología revisada).
 *
 * Por cada ruta mide por separado:
 * - rafHz: frecuencia de requestAnimationFrame (lo que medía la herramienta antigua). NO es la frecuencia
 *   de la escena: con renderizado bajo demanda, rAF sigue a 60 Hz aunque la escena no se dibuje.
 * - idleFrames: fotogramas 3D realmente dibujados en 3 s de reposo (window.__atomFrames).
 * - dragFps / dragP95Ms: fotogramas dibujados por segundo y percentil 95 del intervalo entre fotogramas
 *   dibujados mientras se arrastra la cámara (interacción real).
 * - calls / triangles / programs: llamadas de dibujo, triángulos y programas de sombreado del último fotograma.
 * - heapMB: memoria JS tras forzar la recolección de basura (gc()); sin gc la lectura depende del azar.
 * - geometries / textures: recursos de GPU vivos (three.js).
 * Además, una prueba de estabilidad recorre todos los laboratorios varias veces y comprueba que la memoria
 * JS y los recursos de GPU no crecen de ciclo en ciclo.
 *
 * AVISO: Chromium usa aquí SwiftShader (GPU por software). Las cifras comparan versiones en la misma
 * máquina; no estiman el rendimiento en una GPU real, en Safari ni en iPadOS (no disponibles aquí).
 * Uso: npm run build && node tools/perf.mjs [salida.json] [--ciclos=N]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4181;
const out = process.argv.slice(2).find((a) => !a.startsWith('--'));
const CYCLES = process.env.PERF_ROUTES ? 0 : Number(process.argv.find((a) => a.startsWith('--ciclos='))?.split('=')[1] ?? 4);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), res()));
});

const LABS = ['/campana', '/forja', '/historia', '/historia?tab=geiger', '/fotones', '/fotones?tab=hidrogeno', '/fotones?tab=espectroscopio', '/masas', '/cuantico', '/arquitecto', '/periodico'];
const ROUTES = process.env.PERF_ROUTES ? process.env.PERF_ROUTES.split(',') : ['/', ...LABS, '/guia?b=3', '/entrenamiento'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const results = [];
const stability = [];
const gcHeap = (page) => page.evaluate(() => { window.gc?.(); window.gc?.(); return performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null; });
const gpu = (page) => page.evaluate(() => window.__atomGL ?? null);
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, quality: 'media' } }, version: 2 }));
    } catch {}
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: true });
  });
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    const t0 = Date.now();
    await page.goto(`http://localhost:${PORT}/#${r}`);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('canvas') || document.querySelector('.guide, .workspace--full, .home .lab-card, main'), null, { timeout: 30000 });
    const readyMs = Date.now() - t0;
    await page.waitForTimeout(6500); // pasa la ventana de interacción (5 s) tras la carga
    const m = await page.evaluate(async () => {
      window.__long = [];
      const f0 = window.__atomFrames ?? 0;
      let ticks = 0;
      const t0 = performance.now();
      await new Promise((res) => {
        const tick = (t) => {
          ticks++;
          if (t - t0 < 3000) requestAnimationFrame(tick);
          else res();
        };
        requestAnimationFrame(tick);
      });
      return { rafHz: +((ticks * 1000) / (performance.now() - t0)).toFixed(1), idleFrames: (window.__atomFrames ?? 0) - f0 };
    });
    let drag = {};
    const canvas = await page.$('canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      const cx = box.x + box.width * 0.4;
      const cy = box.y + box.height * 0.5;
      await page.evaluate(() => {
        window.__drawn = [];
        let last = window.__atomFrames ?? 0;
        const loop = (t) => {
          const f = window.__atomFrames ?? 0;
          if (f !== last) window.__drawn.push(t);
          last = f;
          if (window.__drawn.length < 5000 && !window.__stop) requestAnimationFrame(loop);
        };
        window.__stop = false;
        requestAnimationFrame(loop);
      });
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let k = 0; k < 30; k++) {
        await page.mouse.move(cx + Math.sin(k / 5) * 120, cy + Math.cos(k / 7) * 40);
        await page.waitForTimeout(50);
      }
      await page.mouse.up();
      drag = await page.evaluate(() => {
        window.__stop = true;
        const t = window.__drawn;
        const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
        const span = t.length > 1 ? t[t.length - 1] - t[0] : 0;
        return { dragFps: span ? +(((t.length - 1) * 1000) / span).toFixed(1) : 0, dragP95Ms: d.length ? +d[Math.floor(d.length * 0.95)].toFixed(1) : null, longTasks: window.__long.length, longMaxMs: Math.round(Math.max(0, ...window.__long)) };
      });
    }
    const g = await gpu(page);
    const rec = { route: r, readyMs, ...m, ...drag, calls: g?.calls ?? null, triangles: g?.triangles ?? null, programs: g?.programs ?? null, geometries: g?.geometries ?? null, textures: g?.textures ?? null, heapMB: await gcHeap(page) };
    results.push(rec);
    console.log(r.padEnd(30), JSON.stringify(rec));
  }
  // Estabilidad: recorrer todos los laboratorios varias veces (como haría un alumno) y comparar el estado
  // tras cada ciclo. Una fuga aparece como crecimiento sostenido ciclo a ciclo.
  await page.goto(`http://localhost:${PORT}/#/`);
  for (let c = 0; c < CYCLES; c++) {
    for (const r of LABS) {
      await page.evaluate((h) => (location.hash = h), `#${r}`);
      await page.waitForTimeout(1200);
    }
    await page.evaluate(() => (location.hash = '#/forja'));
    await page.waitForTimeout(1500);
    const s = { ciclo: c + 1, heapMB: await gcHeap(page), gpu: await gpu(page), canvases: await page.evaluate(() => document.querySelectorAll('canvas').length) };
    stability.push(s);
    console.log('estabilidad', JSON.stringify(s));
  }
  // Interacción: cambio de orbital en Quantum Space
  await page.goto(`http://localhost:${PORT}/#/cuantico`);
  await page.waitForTimeout(3000);
  for (const [label, sel] of [['n=3', '[role=radio]:text-is("3")'], ['l=2', '[role=radio]:text-is("2 · d")'], ['subnivel', 'button:has-text("Subnivel completo")']]) {
    await page.evaluate(() => (window.__long = []));
    const t0 = Date.now();
    await page.click(sel);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const lat = Date.now() - t0;
    await page.waitForTimeout(800);
    const lt = await page.evaluate(() => window.__long.slice());
    const rec = { route: `cuantico:${label}`, interactionMs: lat, longTasks: lt.length, longMaxMs: Math.round(Math.max(0, ...lt)) };
    results.push(rec);
    console.log(rec.route.padEnd(30), JSON.stringify(rec));
  }
} finally {
  await browser.close();
  server.kill();
}
if (out) writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), renderer: 'SwiftShader (software)', method: 'ATOM 5.0: fotogramas dibujados, no rAF; heap tras gc()', results, stability }, null, 2));
