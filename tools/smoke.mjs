/**
 * Prueba de humo de extremo a extremo (Playwright + Chromium preinstalado).
 * Arranca `vite preview` sobre dist/, recorre Atrio → Forja (¹²C y misión I-1) → Photon Lab (Hα) →
 * Entrenamiento (AMP 6), comprueba el DOM y la ausencia de errores, y guarda capturas en test-results/.
 * Uso: npm run build && npm run e2e
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const PORT = 4179;
const OUT = 'test-results';
mkdirSync(OUT, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview no arrancó')), 20000);
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && (clearTimeout(t), resolve()));
});

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const base = `http://localhost:${PORT}/`;

  await page.goto(base + '#/');
  await page.waitForTimeout(2500);
  check((await page.locator('.station-label').count()) === 3, 'Atrio: tres estaciones etiquetadas');
  await page.screenshot({ path: `${OUT}/01-atrio.png` });

  await page.click('button:has-text("Empezar")');
  await page.waitForTimeout(1200);
  check(page.url().includes('#/forja'), 'La misión I-1 abre la Forja');
  for (const k of 'ppppppnnnnnneeeeee') await page.keyboard.press(k);
  await page.waitForTimeout(1200);
  const side = await page.locator('aside').innerText();
  check(side.includes('Carbono') && side.includes('Núcleo estable'), 'Forja: ¹²C identificado y estable');
  check(side.includes('Misión completada'), 'Misión I-1 completada');
  await page.screenshot({ path: `${OUT}/02-forja-c12.png` });

  await page.goto(base + '#/fotones?tab=hidrogeno');
  await page.waitForTimeout(1500);
  await page.click('button:has-text("Emitir fotón 3 → 2")');
  await page.waitForTimeout(900);
  const ph = await page.locator('aside').innerText();
  check(ph.includes('656,47') && ph.includes('Balmer'), 'Photon Lab: Hα a 656,47 nm en la serie de Balmer');
  await page.screenshot({ path: `${OUT}/03-fotones-halpha.png` });

  await page.goto(base + '#/entrenamiento?v=fuentes');
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: /^AMP 6/ }).click();
  await page.waitForTimeout(600);
  await page.locator('input.input').first().fill('5,00·10^-7 m');
  await page.click('button:text-is("Comprobar")');
  await page.locator('input.input').nth(1).fill('6,00·10^14 Hz');
  await page.click('button:text-is("Comprobar")');
  await page.waitForTimeout(300);
  check((await page.locator('.feedback--ok').count()) >= 2, 'Entrenamiento: AMP 6 corregido paso a paso');
  await page.screenshot({ path: `${OUT}/04-entrenamiento.png` });

  const stored = await page.evaluate(() => localStorage.getItem('atom:v1'));
  check(!!stored && stored.includes('"I-1"'), 'Progreso persistido en localStorage');
  check(errors.length === 0, `Sin errores en consola${errors.length ? ': ' + errors.join(' | ') : ''}`);

  const m = await browser.newPage({ ...devices['iPhone 13'] });
  const mErrors = [];
  m.on('pageerror', (e) => mErrors.push(e.message));
  await m.goto(base + '#/forja');
  await m.waitForTimeout(2000);
  await m.screenshot({ path: `${OUT}/05-movil-forja.png` });
  check(mErrors.length === 0, 'Móvil: Forja sin errores');
} finally {
  await browser.close();
  server.kill();
}
if (failures.length) {
  console.error(`\n${failures.length} comprobación(es) fallida(s)`);
  process.exit(1);
}
console.log('\nPrueba de humo superada. Capturas en test-results/.');
