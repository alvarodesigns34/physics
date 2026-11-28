/**
 * ATOM 6.0 · Capturas de laboratorios EN USO (tras interactuar), para comparar escenas con datos y no
 * solo vacías. Uso: npm run build && node tools/labshots.mjs <etiqueta> [desktop|ipad|ipadv]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const label = process.argv[2] ?? 'labs';
const dev = process.argv[3] ?? 'desktop';
const OUT = `docs/capturas/${label}`;
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4182);
const DEV = { desktop: { width: 1440, height: 900 }, ipad: { width: 1180, height: 820 }, ipadv: { width: 820, height: 1180 } }[dev];
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && r()));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const ONLY = process.env.SHOTS ? process.env.SHOTS.split(',') : null;
const STEPS = [
  ['hidrogeno-cascada', '#/fotones?tab=hidrogeno', async (p) => { await p.selectOption('#casc', '5'); await p.click('button:has-text("Lanzar")'); await p.waitForTimeout(4200); await p.click('.preset:has-text("Hβ")'); await p.waitForTimeout(2400); }],
  ['ondas-comparar', '#/fotones?tab=ondas', async (p) => { await p.click('.preset:has-text("UV-C")'); await p.click('button:has-text("Fijar esta para comparar")'); await p.click('.preset:has-text("Hα")'); await p.waitForTimeout(1500); }],
  ['forja-caso', '#/forja', async (p) => { await p.click('.preset:has-text("²⁷Al³⁺")'); await p.waitForTimeout(3000); }],
  ['tubo-caso', '#/historia?tab=tubo', async (p) => { const b = p.locator('.preset').nth(2); if (await b.count()) await b.click(); await p.waitForTimeout(3000); }],
  ['geiger-nuclear', '#/historia?tab=geiger', async (p) => { await p.click('[role=radio]:has-text("Átomo nuclear"), [role=tab]:has-text("Átomo nuclear"), button:has-text("Átomo nuclear")'); await p.waitForTimeout(6000); }],
  ['cuantico-3d', '#/cuantico', async (p) => { await p.click('[role=radio]:text-is("3")'); await p.waitForTimeout(800); await p.click('[role=radio]:text-is("2 · d")'); await p.waitForTimeout(5000); }],
  ['arquitecto-fe', '#/arquitecto', async (p) => { await p.fill('input[placeholder^="Elemento"]', 'Fe'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500); }],
  ['masas-cobre', '#/masas', async (p) => { await p.click('button:text-is("Cu")'); await p.waitForTimeout(6000); }],
].filter(([n]) => !ONLY || ONLY.includes(n));
try {
  const ctx = await browser.newContext({ viewport: DEV, deviceScaleFactor: 1, hasTouch: dev !== 'desktop' });
  await ctx.addInitScript(() => { try { localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, quality: 'auto' } }, version: 2 })); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [name, hash, act] of STEPS) {
    await page.goto(`http://localhost:${PORT}/${hash}`);
    await page.waitForTimeout(3000);
    try { await act(page); } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); }
    await page.screenshot({ path: `${OUT}/${name}-${dev}.png` });
    console.log(`✓ ${name}-${dev}`);
  }
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) console.log('Errores:\n' + errors.join('\n'));
