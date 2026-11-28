/**
 * ATOM 6.0 · ¿Qué laboratorio retiene su contexto WebGL al salir? Para cada ruta: 4 visitas (ruta → inicio),
 * gc() y recuento de objetos WebGL2RenderingContext y WebGLProgram vivos (Runtime.queryObjects).
 * Uso: npm run build && node tools/ctxprobe.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = Number(process.env.PORT ?? 4221);
const DIST = process.env.DIST ?? 'dist';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--outDir', DIST], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && r()));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'] });
const ROUTES = (process.env.ROUTES ?? '/forja,/historia,/historia?tab=tubo,/historia?tab=geiger,/fotones,/fotones?tab=hidrogeno,/fotones?tab=espectroscopio,/masas,/cuantico,/arquitecto,/periodico,/campana').split(',');
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, quality: 'media' } }, version: 2 })); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/#/`);
  await page.waitForTimeout(2000);
  const cdp = await ctx.newCDPSession(page);
  const count = async (ctor) => {
    await page.evaluate(() => { window.gc?.(); window.gc?.(); });
    // Grupo propio y liberado: el array de queryObjects retendría los contextos contados (artefacto de medida).
    const { result } = await cdp.send('Runtime.evaluate', { expression: `${ctor}.prototype`, objectGroup: 'probe' });
    const q = await cdp.send('Runtime.queryObjects', { prototypeObjectId: result.objectId, objectGroup: 'probe' });
    const { result: n } = await cdp.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function(){return this.length}', returnByValue: true, objectGroup: 'probe' });
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'probe' });
    await page.evaluate(() => { window.gc?.(); window.gc?.(); });
    return n.value;
  };
  for (const r of ROUTES) {
    const before = await count('WebGL2RenderingContext');
    for (let i = 0; i < 4; i++) {
      await page.evaluate((h) => (location.hash = h), `#${r}`);
      await page.waitForTimeout(2500);
      await page.evaluate(() => (location.hash = '#/'));
      await page.waitForTimeout(800);
    }
    const after = await count('WebGL2RenderingContext');
    console.log(`${r.padEnd(30)} contextos vivos ${before} → ${after}  (Δ ${after - before} en 4 visitas)`);
  }
} finally {
  await browser.close();
  server.kill();
}
