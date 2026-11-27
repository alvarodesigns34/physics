/**
 * Regresión visual (G14) de las vistas sin WebGL, que son deterministas: hora fija, Math.random con
 * semilla y animaciones desactivadas. Compara píxel a píxel en el navegador (canvas), sin dependencias.
 *   node tools/visual.mjs --update   → guarda las referencias en docs/capturas/referencia/
 *   node tools/visual.mjs            → compara; falla si alguna vista difiere más del 0,5 % de píxeles
 * Las escenas 3D (SwiftShader, animadas) se revisan con tools/shots.mjs, no aquí.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const UPDATE = process.argv.includes('--update');
const REF = 'docs/capturas/referencia';
const OUT = 'test-results/visual';
mkdirSync(REF, { recursive: true });
mkdirSync(OUT, { recursive: true });
const PORT = 4187;
const VIEWS = [
  ['inicio', '#/'],
  ['guia-espectros', '#/guia?b=3'],
  ['guia-trucos', '#/guia?v=trucos'],
  ['examen', '#/entrenamiento?v=examen'],
  ['ruta', '#/entrenamiento?v=ruta'],
  ['progreso', '#/entrenamiento?v=progreso'],
];
const DEVICES = { escritorio: { width: 1440, height: 900 }, ipad: { width: 1180, height: 820 } };
const MAX_DIFF = 0.005;

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), resolve()));
});
const browser = await chromium.launch();
const failures = [];
try {
  for (const [dev, viewport] of Object.entries(DEVICES)) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => {
      localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, motion: 'reducido' } }, version: 2 }));
      let s = 42;
      Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-11-27T10:00:00'));
    for (const [name, hash] of VIEWS) {
      await page.goto(`http://localhost:${PORT}/${hash}`);
      await page.waitForTimeout(700);
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
      const file = `${name}-${dev}.png`;
      const shot = await page.screenshot();
      if (UPDATE || !existsSync(`${REF}/${file}`)) {
        writeFileSync(`${REF}/${file}`, shot);
        console.log(`↻ referencia ${file}`);
        continue;
      }
      writeFileSync(`${OUT}/${file}`, shot);
      const ref = readFileSync(`${REF}/${file}`).toString('base64');
      const cur = shot.toString('base64');
      const ratio = await page.evaluate(async ([a, b]) => {
        const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = `data:image/png;base64,${src}`; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return 1;
        const c = document.createElement('canvas');
        c.width = ia.width; c.height = ia.height;
        const g = c.getContext('2d');
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
        let diff = 0;
        for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - db[k]) + Math.abs(da[k + 1] - db[k + 1]) + Math.abs(da[k + 2] - db[k + 2]) > 48) diff++;
        return diff / (da.length / 4);
      }, [ref, cur]);
      const ok = ratio <= MAX_DIFF;
      if (!ok) failures.push(`${file}: ${(ratio * 100).toFixed(2)} %`);
      console.log(`${ok ? '✓' : '✗'} ${file}: ${(ratio * 100).toFixed(3)} % de píxeles distintos`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (failures.length) {
  console.log('\nDiferencias por encima del umbral (revisa test-results/visual/ y, si el cambio es intencionado, ejecuta --update):\n' + failures.join('\n'));
  process.exit(1);
}
