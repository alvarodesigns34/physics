/**
 * Resiliencia ante almacenamiento dañado (ATOM 5.0): inyecta progreso corrupto, de otra versión o
 * malicioso en localStorage y comprueba que cada vista arranca sin errores. Uso: npm run build && npm run resilience
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.cwd() + '/package.json')('playwright');
const PORT = 4183;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && r()));
const browser = await chromium.launch();
const cases = {
  'json roto': { 'atom:v1': '{"state":{"mastery":' },
  'tipos erróneos': { 'atom:v1': JSON.stringify({ state: { settings: { seenIntro: true, theme: 42, textScale: 'x' }, mastery: { '3.6': { theta: 'a', attempts: -1 } }, history: 'no', cards: [1, 2], notebook: [{ x: 1 }], exams: null }, version: 2 }) },
  'versión futura': { 'atom:v1': JSON.stringify({ state: { settings: { seenIntro: true } }, version: 99 }) },
  'NaN e infinitos': { 'atom:v1': '{"state":{"settings":{"seenIntro":true,"volume":1e999},"mastery":{"3.6":{"theta":1e999,"attempts":3,"correct":2,"lastSeen":0}}},"version":2}' },
  'ruta dañada': { 'atom:v1': JSON.stringify({ state: { settings: { seenIntro: true } }, version: 2 }), 'atom:ruta': '{"node":5,"step":"x"}', 'atom:simulacro': '[]', 'atom:en-curso': '{"ruta:3.6:guiado":{"id":1}}' },
  'prototipo': { 'atom:v1': '{"state":{"settings":{"seenIntro":true},"mastery":{"__proto__":{"theta":1,"attempts":1,"correct":1,"lastSeen":1}}},"version":2}' },
};
let failed = 0;
for (const [name, ls] of Object.entries(cases)) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((ls) => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); } }, ls);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  for (const r of ['#/', '#/entrenamiento?v=progreso', '#/entrenamiento?v=ruta&n=3.6', '#/entrenamiento?v=cuaderno', '#/entrenamiento?v=examen']) {
    await page.goto(`http://localhost:${PORT}/${r}`);
    await page.waitForTimeout(700);
    const txt = (await page.locator('body').innerText()).slice(0, 60).replace(/\n/g, ' ');
    if (!txt.trim() || /Algo ha fallado|Error/.test(txt)) errs.push(`${r}: ${txt}`);
  }
  if (errs.length) failed++;
  console.log(errs.length ? '✗' : '✓', name, errs.length ? errs.join(' | ').slice(0, 300) : '');
  await ctx.close();
}
await browser.close();
server.kill();
if (failed) {
  console.error(`${failed} caso(s) de almacenamiento dañado rompen la aplicación`);
  process.exit(1);
}
