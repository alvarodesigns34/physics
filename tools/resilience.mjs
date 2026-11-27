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
// Sin conexión: tras una visita con red, las vistas visitadas deben cargar con la red cortada (service worker).
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true } }, version: 2 })));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { timeout: 15000 });
  await page.reload();
  for (const r of ['#/guia?b=3', '#/entrenamiento', '#/fotones?tab=hidrogeno']) {
    await page.goto(`http://localhost:${PORT}/${r}`);
    await page.waitForTimeout(2000);
  }
  await ctx.setOffline(true);
  for (const r of ['#/', '#/guia?b=3', '#/entrenamiento', '#/fotones?tab=hidrogeno']) {
    await page.goto(`http://localhost:${PORT}/${r}`).catch((e) => errs.push(`${r}: ${e.message.slice(0, 80)}`));
    await page.waitForTimeout(1500);
    const t = await page.locator('body').innerText().catch(() => '');
    if (!t.includes('ATOM')) errs.push(`${r}: vacía sin conexión`);
  }
  if (errs.length) failed++;
  console.log(errs.length ? '✗' : '✓', 'sin conexión: inicio, guía, entrenamiento y laboratorio', errs.join(' | ').slice(0, 300));
  await ctx.close();
}
// ATOM 5.1 · Pérdida y recuperación del contexto WebGL (p. ej., la GPU se reinicia o el sistema la reclama).
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, quality: 'auto' } }, version: 2 })));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  for (const r of ['#/forja', '#/periodico', '#/historia?tab=tubo']) {
    await page.goto(`http://localhost:${PORT}/${r}`);
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForTimeout(1500);
    const lost = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const ext = gl?.getExtension('WEBGL_lose_context');
      if (!ext) return 'sin extensión';
      ext.loseContext();
      window.__ext = ext;
      return 'ok';
    });
    if (lost !== 'ok') { errs.push(`${r}: ${lost}`); continue; }
    await page.waitForTimeout(800);
    await page.evaluate(() => window.__ext.restoreContext());
    await page.waitForTimeout(2000);
    // Tras recuperar: el lienzo sigue ahí, la interfaz responde y la escena vuelve a dibujar
    const f0 = await page.evaluate(() => window.__atomFrames ?? 0);
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.mouse.move(520, 420, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const ok = await page.evaluate((f) => ({ canvas: !!document.querySelector('canvas'), frames: (window.__atomFrames ?? 0) - f, lost: document.querySelector('canvas').getContext('webgl2')?.isContextLost?.() }), f0);
    if (!ok.canvas || ok.lost || ok.frames < 1) errs.push(`${r}: tras recuperar ${JSON.stringify(ok)}`);
    if ((await page.locator('main').innerText()).trim().length < 40) errs.push(`${r}: panel vacío`);
  }
  if (errs.length) failed++;
  console.log(errs.length ? '✗' : '✓', 'contexto WebGL perdido y recuperado en Forja, tabla y tubo: la escena vuelve a dibujar', errs.join(' | ').slice(0, 400));
  await ctx.close();
}
// ATOM 5.1 · Cachés ajenas, descarga deliberada y actualización con consentimiento.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true } }, version: 2 })));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  // Antes de que ATOM registre nada: una caché de OTRO proyecto del mismo origen.
  await page.goto(`http://localhost:${PORT}/icons/icon.svg`);
  await page.evaluate(async () => {
    const c = await caches.open('otro-proyecto-v1');
    await c.put('/otro-proyecto/index.html', new Response('ajeno'));
  });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller || true), null, { timeout: 15000 });
  await page.reload();
  await page.waitForTimeout(800);
  // Descarga deliberada desde los ajustes
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: /Descargar todo/ }).click();
  await page.getByText('Todo ATOM está guardado').waitFor({ timeout: 60000 }).catch(() => errs.push('la descarga no terminó'));
  const keys = await page.evaluate(() => caches.keys());
  if (!keys.includes('otro-proyecto-v1')) errs.push('se borró la caché de otro proyecto');
  if (!keys.some((k) => k.startsWith('atom::'))) errs.push('sin cachés con espacio de nombres');
  // Sin red, un laboratorio que NUNCA se ha abierto funciona gracias a la descarga.
  await ctx.setOffline(true);
  for (const r of ['#/masas', '#/cuantico', '#/periodico']) {
    await page.goto(`http://localhost:${PORT}/${r}`).catch((e) => errs.push(`${r}: ${e.message.slice(0, 80)}`));
    await page.waitForTimeout(2500);
    const t = await page.locator('main').innerText().catch(() => '');
    if (t.trim().length < 40) errs.push(`${r}: vacía sin conexión`);
  }
  await ctx.setOffline(false);
  // Versión nueva: se instala, ESPERA y solo se activa al aceptar.
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(800);
  await page.evaluate(() => navigator.serviceWorker.register('./sw.js?v=00000000', { scope: './' }));
  await page.getByRole('button', { name: 'Actualizar', exact: true }).waitFor({ timeout: 20000 }).catch(() => errs.push('no aparece el aviso de versión nueva'));
  const before = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? '');
  if (before.includes('v=00000000')) errs.push('la versión nueva se activó sin permiso');
  await Promise.all([page.waitForEvent('load', { timeout: 20000 }).catch(() => errs.push('no recargó al actualizar')), page.getByRole('button', { name: 'Actualizar', exact: true }).click()]);
  await page.waitForTimeout(1000);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration('./');
    const v = (u) => (u ? new URL(u).searchParams.get('v') : null);
    return { sw: navigator.serviceWorker.controller?.scriptURL ?? '', live: [v(reg?.active?.scriptURL), v(reg?.waiting?.scriptURL), v(reg?.installing?.scriptURL)].filter(Boolean), keys: await caches.keys() };
  });
  if (!after.sw.includes('v=00000000')) errs.push('no se activó la versión aceptada');
  if (!after.keys.includes('otro-proyecto-v1')) errs.push('la actualización borró una caché ajena');
  // Una caché de documento por cada service worker vivo (activo o en espera), ninguna huérfana.
  const shells = after.keys.filter((k) => k.includes('::shell-')).map((k) => k.split('::shell-')[1]);
  if (shells.some((v) => !after.live.includes(v))) errs.push(`caché de documento huérfana: ${shells.join(', ')} (vivos: ${after.live.join(', ')})`);
  if (errs.length) failed++;
  console.log(errs.length ? '✗' : '✓', 'service worker: caché ajena intacta, descarga completa, laboratorio nunca visitado sin red, actualización con consentimiento', errs.join(' | ').slice(0, 400));
  await ctx.close();
}
await browser.close();
server.kill();
if (failed) {
  console.error(`${failed} caso(s) de almacenamiento dañado rompen la aplicación`);
  process.exit(1);
}
