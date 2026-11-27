/**
 * Auditoría de accesibilidad automática (axe-core) de las vistas principales, en escritorio.
 * Uso: npm run build && node tools/a11y.mjs [--strict]
 * Falla (código 1) si hay infracciones «serious» o «critical». axe no sustituye una revisión manual.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 4186;
const VIEWS = ['#/', '#/guia?b=3', '#/entrenamiento', '#/entrenamiento?v=examen', '#/entrenamiento?gen=desarrollo', '#/entrenamiento?v=ruta&n=3.6', '#/entrenamiento?v=cuaderno', '#/forja', '#/arquitecto', '#/periodico?tab=tendencias', '#/historia'];

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), resolve()));
});
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
let serious = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true } }, version: 2 })));
  const page = await ctx.newPage();
  for (const v of VIEWS) {
    await page.goto(`http://localhost:${PORT}/${v}`);
    await page.waitForTimeout(1800);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => {
      // El lienzo WebGL es decorativo (aria-hidden) y las etiquetas de escena se describen en el panel.
      const r = await window.axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: true } } });
      return r.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.length, sample: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    });
    const bad = res.filter((x) => x.impact === 'serious' || x.impact === 'critical');
    serious += bad.length;
    report.push({ view: v, violations: res });
    console.log(`${bad.length ? '✗' : '✓'} ${v}: ${res.length} infracciones (${bad.length} graves)`);
    for (const x of res) console.log(`   [${x.impact}] ${x.id} ×${x.nodes}: ${x.help} → ${x.sample.join(' | ')}`);
  }
} finally {
  await browser.close();
  server.kill();
}
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/a11y.json', JSON.stringify(report, null, 2));
if (process.argv.includes('--strict') && serious > 0) process.exit(1);
