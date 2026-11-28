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
const PORT = Number(process.env.PORT ?? 4181);
const DIST = process.env.DIST ?? 'dist';
const ONLY = process.env.SHOTS ? process.env.SHOTS.split(',') : null;
const THEME = process.env.THEME ?? 'claro';
const QUALITY = process.env.QUALITY ?? 'auto';

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
  ['tendencias', '#/periodico?tab=tendencias'],
  ['tubo', '#/historia?tab=tubo'],
  ['geiger', '#/historia?tab=geiger'],
  ['hidrogeno', '#/fotones?tab=hidrogeno'],
  ['espectroscopio', '#/fotones?tab=espectroscopio'],
  ['campana', '#/campana'],
  ['progreso', '#/entrenamiento?v=progreso'],
  ['cuaderno', '#/entrenamiento?v=cuaderno'],
  ['preparar', '#/preparar?b=3'],
].filter(([n]) => !ONLY || ONLY.includes(n));
const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  ipad: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false },
  ipadv: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false },
  // ATOM 6.0: escritorio grande y móvil (comprobación secundaria); solo con «all» explícito por nombre.
  wide: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  movil: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true },
};
const TEXT = Number(process.env.TEXT ?? 1);

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--outDir', DIST], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), resolve()));
});
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
try {
  for (const [dev, opts] of Object.entries(DEVICES)) {
    if (which === 'all' ? dev === 'wide' || dev === 'movil' : !which.split(',').includes(dev)) continue;
    const ctx = await browser.newContext(opts);
    // Saltar la bienvenida: marca de visita previa.
    await ctx.addInitScript(([theme, quality, forge, text]) => {
      const state = { settings: { seenIntro: true, theme, quality, textScale: text } };
      if (forge) {
        const [z, n, e] = forge.split(',').map(Number);
        state.forge = { z, n, e };
      }
      try { localStorage.setItem('atom:v1', JSON.stringify({ state, version: 2 })); } catch {}
    }, [THEME, QUALITY, process.env.FORGE ?? '', TEXT]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${dev}: ${e.message}`));
    for (const [name, hash] of VIEWS) {
      await page.goto(`http://localhost:${PORT}/${hash}`);
      await page.waitForTimeout(['cuantico', 'periodico', 'campana', 'tubo'].includes(name) ? 4500 : 2600);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('.intro button')].find((x) => /Cerrar/.test(x.textContent ?? ''));
        b?.click();
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${dev}${THEME === 'oscuro' ? '-oscuro' : ''}${TEXT !== 1 ? `-texto${Math.round(TEXT * 100)}` : ''}.png` });
      console.log(`✓ ${name}-${dev}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) console.log('Errores de página:\n' + errors.join('\n'));
