/**
 * Capturas de inspección visual (escritorio 1440×900 e iPad horizontal 1180×820).
 * Uso: npm run build && node tools/shots.mjs <etiqueta> [desktop|ipad|all]
 * Guarda en docs/capturas/<etiqueta>/<vista>-<dispositivo>.png
 * Render en SwiftShader: sirve para composición y legibilidad, no para medir FPS.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const label = process.argv[2] ?? 'actual';
const which = process.argv[3] ?? 'all';
const OUT = `docs/capturas/${label}`;
mkdirSync(OUT, { recursive: true });
const PORT = 4181;

const VIEWS = [
  ['inicio', '#/'],
  ['guia', '#/guia?b=3&n=3.7'],
  ['entrenamiento', '#/entrenamiento'],
  ['examen', '#/entrenamiento?v=examen'],
  ['ruta', '#/entrenamiento?v=ruta&n=3.6'],
  ['forja', '#/forja'],
  ['historia', '#/historia'],
  ['fotones', '#/fotones'],
  ['masas', '#/masas'],
  ['cuantico', '#/cuantico'],
  ['arquitecto', '#/arquitecto'],
  ['periodico', '#/periodico'],
];
const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  ipad: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false },
  ipadv: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false },
};

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), resolve()));
});
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
try {
  for (const [dev, opts] of Object.entries(DEVICES)) {
    if (which !== 'all' && which !== dev) continue;
    const ctx = await browser.newContext(opts);
    // Saltar la bienvenida: marca de visita previa.
    await ctx.addInitScript(() => {
      try { localStorage.setItem('atom:intro-seen', '1'); } catch {}
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${dev}: ${e.message}`));
    for (const [name, hash] of VIEWS) {
      await page.goto(`http://localhost:${PORT}/${hash}`);
      await page.waitForTimeout(name === 'cuantico' || name === 'periodico' ? 3500 : 2200);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('.intro button')].find((x) => /Cerrar/.test(x.textContent ?? ''));
        b?.click();
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${dev}.png` });
      console.log(`✓ ${name}-${dev}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) console.log('Errores de página:\n' + errors.join('\n'));
