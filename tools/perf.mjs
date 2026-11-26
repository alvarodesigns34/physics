/**
 * Medición de rendimiento en navegador (Playwright + Chromium). Por cada ruta: tiempo hasta el primer
 * canvas, fotogramas por segundo medidos con requestAnimationFrame, tareas largas (> 50 ms) y memoria JS.
 * AVISO: en este entorno Chromium usa SwiftShader (GPU por software); las cifras sirven para comparar
 * versiones en la misma máquina, no para estimar el rendimiento en una GPU real.
 * Uso: npm run build && node tools/perf.mjs [salida.json]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4181;
const out = process.argv[2];
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), res()));
});

const ROUTES = ['/', '/forja', '/historia', '/fotones', '/fotones?tab=hidrogeno', '/fotones?tab=espectroscopio', '/masas', '/cuantico', '/arquitecto', '/periodico', '/guia?b=3', '/entrenamiento'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const results = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, quality: 'media' } }, version: 1 }));
    } catch {}
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: true });
  });
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    const t0 = Date.now();
    await page.goto(`http://localhost:${PORT}/#${r}`);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('canvas') || document.querySelector('.guide, .workspace--full'), null, { timeout: 30000 });
    const ready = Date.now() - t0;
    await page.waitForTimeout(1500);
    const m = await page.evaluate(async () => {
      window.__long = [];
      const frames = [];
      let last = performance.now();
      await new Promise((res) => {
        const end = last + 3000;
        const tick = (t) => {
          frames.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(tick);
          else res();
        };
        requestAnimationFrame(tick);
      });
      frames.sort((a, b) => a - b);
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      return { fps: +(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)).toFixed(1), p95FrameMs: +frames[Math.floor(frames.length * 0.95)].toFixed(1), longTasks: window.__long.length, longMaxMs: Math.round(Math.max(0, ...window.__long)), heapMB: mem };
    });
    results.push({ route: r, readyMs: ready, ...m });
    console.log(r.padEnd(28), JSON.stringify({ readyMs: ready, ...m }));
  }
  // Interacción: cambio de orbital en Quantum Space (latencia hasta el siguiente fotograma y tareas largas)
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
    console.log(rec.route.padEnd(28), JSON.stringify(rec));
  }
} finally {
  await browser.close();
  server.kill();
}
if (out) writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), renderer: 'SwiftShader (software)', results }, null, 2));
