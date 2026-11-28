/**
 * ATOM 6.0 · Recorrido prolongado de memoria CON INTERACCIONES REALES.
 *
 * Cada ciclo usa los once laboratorios y las páginas de estudio como un alumno: casos predefinidos, botones
 * de partículas, deslizadores, cambios de orbital (incluido el subnivel completo), arrastres
 * de cámara, tabla periódica, centro de preparación, entrenamiento y guía… Tras cada ciclo vuelve a la misma vista (Forja vacía), fuerza la
 * recolección de basura y anota: memoria JS, recursos de GPU (three.js), lienzos y nodos DOM. Toma
 * instantáneas del montón (heap) en el ciclo 2 y en el último, y compara el número de objetos y su tamaño
 * propio por constructor, para ver QUÉ crece si algo crece.
 *
 * Uso: npm run build && node tools/memlong.mjs salida.json [--ciclos=N]
 * AVISO: Chromium con SwiftShader. No equivale a Safari ni a un iPad.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'memlong.json';
const CYCLES = Number(process.argv.find((a) => a.startsWith('--ciclos='))?.split('=')[1] ?? 20);
const PORT = Number(process.env.PORT ?? 4195);
const DIST = process.env.DIST ?? 'dist';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--outDir', DIST], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && r()));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const base = `http://localhost:${PORT}/`;

const errors = [];
let step = 'inicio';
const go = async (p, hash, wait = 1800) => {
  step = hash;
  await p.evaluate((h) => (location.hash = h), hash);
  await p.waitForTimeout(wait);
};
const tryClick = async (p, sel, wait = 400) => {
  step = `${step.split(' » ')[0]} » ${sel}`;
  const l = p.locator(sel).first();
  if (await l.count()) {
    await l.click({ timeout: 4000 }).catch((e) => errors.push(`${sel}: ${e.message.split('\n')[0]}`));
    await p.waitForTimeout(wait);
  } else errors.push(`no encontrado: ${sel}`);
};
const drag = async (p) => {
  const c = p.locator('canvas').first();
  const b = await c.boundingBox().catch(() => null);
  if (!b) return;
  await p.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await p.mouse.down();
  for (let i = 0; i < 12; i++) await p.mouse.move(b.x + b.width * (0.5 + i * 0.02), b.y + b.height * (0.5 - i * 0.01));
  await p.mouse.up();
  await p.waitForTimeout(300);
};

/** Un ciclo de uso realista. */
async function cycle(p) {
  await go(p, '#/forja');
  for (const c of ['¹²C', '¹⁶O²⁻', '⁵⁶Fe³⁺']) await tryClick(p, `.preset:has-text("${c}")`, 500);
  for (let i = 0; i < 3; i++) await tryClick(p, 'button[aria-label^="Añadir"]', 150);
  await drag(p);
  await go(p, '#/historia?tab=tubo');
  for (const id of ['2 · Solo E', '3 · Solo B', '4 · E y B']) await tryClick(p, `.preset:has-text("${id}")`, 600);
  await go(p, '#/historia?tab=geiger', 2500);
  await tryClick(p, 'button:has-text("Átomo nuclear")', 2000);
  await go(p, '#/historia');
  await drag(p);
  await go(p, '#/fotones?tab=ondas');
  for (const c of ['UV-C', 'Hα', 'Microondas']) await tryClick(p, `.preset:has-text("${c}")`, 300);
  await go(p, '#/fotones?tab=hidrogeno');
  for (const c of ['Hα', 'Hβ', 'Paschen α']) await tryClick(p, `.preset:has-text("${c}")`, 900);
  await p.selectOption('#casc', '5').catch(() => {});
  await tryClick(p, 'button:has-text("Lanzar")', 2500);
  await go(p, '#/fotones?tab=espectroscopio', 2500);
  for (const el of ['Helio', 'Sodio', 'Neón']) await tryClick(p, `button:text-is("${el}")`, 700);
  await go(p, '#/masas', 2500);
  for (const el of ['Cu', 'Br', 'Hg']) await tryClick(p, `button:text-is("${el}")`, 900);
  await go(p, '#/cuantico', 3000);
  for (const [sel, w] of [['[role=radio]:text-is("3")', 1500], ['[role=radio]:text-is("2 · d")', 2500], ['button:has-text("Subnivel completo")', 3000], ['[role=radio]:text-is("4")', 2500], ['[role=radio]:text-is("1")', 1500]]) await tryClick(p, sel, w);
  await drag(p);
  await go(p, '#/arquitecto', 2000);
  for (const el of ['Fe', 'Cr', 'Cu']) {
    await p.fill('input[placeholder^="Elemento"]', el).catch(() => {});
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
  }
  await go(p, '#/periodico', 3000);
  for (const pr of ['Radio', 'EI₁', 'χ']) await tryClick(p, `button:text-is("${pr}")`, 900);
  await drag(p);
  await go(p, '#/preparar?b=3', 1500);
  await go(p, '#/entrenamiento?gen=rydberg&d=2&modo=autonomo', 1500);
  await go(p, '#/guia?b=3', 1200);
  // Vuelta a la vista de referencia: Forja vacía, vaciada desde la interfaz (Mayús + P/N/E quita partículas).
  await go(p, '#/forja', 1500);
  for (const k of ['E', 'N', 'P']) for (let i = 0; i < 45; i++) await p.keyboard.press(`Shift+${k}`);
  await go(p, '#/forja', 2500);
}

async function heapCounts(cdp) {
  const chunks = [];
  const onChunk = (e) => chunks.push(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
  const snap = JSON.parse(chunks.join(''));
  const f = snap.snapshot.meta.node_fields;
  const types = snap.snapshot.meta.node_types[0];
  const iType = f.indexOf('type');
  const iName = f.indexOf('name');
  const iSize = f.indexOf('self_size');
  const n = f.length;
  const by = new Map();
  for (let i = 0; i < snap.nodes.length; i += n) {
    const t = types[snap.nodes[i + iType]];
    if (t !== 'object' && t !== 'native' && t !== 'closure' && t !== 'array' && t !== 'code') continue;
    const name = t === 'object' || t === 'native' ? snap.strings[snap.nodes[i + iName]] : `(${t})`;
    const cur = by.get(name) ?? { count: 0, size: 0 };
    cur.count++;
    cur.size += snap.nodes[i + iSize];
    by.set(name, cur);
  }
  return by;
}

const stability = [];
let diff = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('memlong-init')) {
      sessionStorage.setItem('memlong-init', '1');
      try {
        localStorage.setItem('atom:v1', JSON.stringify({ state: { settings: { seenIntro: true, quality: 'media' } }, version: 2 }));
      } catch {}
    }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror en «${step}»: ${e.message} | ${(e.stack ?? '').split('\n').slice(1, 4).join(' ‹ ')}`));
  await page.goto(base + '#/forja');
  await page.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  let snapA = null;
  for (let c = 1; c <= CYCLES; c++) {
    const t0 = Date.now();
    await cycle(page);
    const s = await page.evaluate(() => {
      window.gc?.();
      window.gc?.();
      return {
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(2) : null,
        gpu: window.__atomGL ?? null,
        canvases: document.querySelectorAll('canvas').length,
        domNodes: document.getElementsByTagName('*').length,
        canvasOwners: [...document.querySelectorAll('canvas')].map((c) => (c.closest('[class]')?.className ?? '?').toString().slice(0, 40)),
      };
    });
    const rec = { ciclo: c, segundos: Math.round((Date.now() - t0) / 1000), ...s };
    stability.push(rec);
    console.log('ciclo', JSON.stringify(rec));
    if (c === 2) snapA = await heapCounts(cdp);
    if (c === CYCLES && snapA) {
      const snapB = await heapCounts(cdp);
      const names = new Set([...snapA.keys(), ...snapB.keys()]);
      diff = [...names]
        .map((k) => ({ name: k, dCount: (snapB.get(k)?.count ?? 0) - (snapA.get(k)?.count ?? 0), dSizeKB: +(((snapB.get(k)?.size ?? 0) - (snapA.get(k)?.size ?? 0)) / 1024).toFixed(1) }))
        .filter((x) => x.dCount !== 0 || Math.abs(x.dSizeKB) > 1)
        .sort((a, b) => b.dSizeKB - a.dSizeKB)
        .slice(0, 40);
      console.log('diferencia de montón (ciclo 2 → último), mayores crecimientos:');
      for (const d of diff.slice(0, 20)) console.log(`  ${String(d.dSizeKB).padStart(9)} KB  ${String(d.dCount).padStart(7)} obj  ${d.name}`);
    }
  }
} finally {
  await browser.close();
  server.kill();
}
writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), renderer: 'SwiftShader (software), 1440x900, calidad media', method: 'tools/memlong.mjs: ciclos con interacciones reales en los 11 laboratorios, preparación, entrenamiento y guía; gc() antes de cada lectura; instantáneas del montón en el ciclo 2 y en el último', cycles: CYCLES, stability, heapDiff: diff, interactionWarningsTotal: errors.length, errors: [...new Set(errors)].slice(0, 50) }, null, 2));
if (errors.length) console.log(`Avisos (${new Set(errors).size} distintos):`, [...new Set(errors)].slice(0, 12).join(' | '));
