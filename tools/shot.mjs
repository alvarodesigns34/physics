// Captura rápida de una ruta: node tools/shot.mjs <ruta> <salida.png> [ancho] [alto]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [route = '/', out = 'shot.png', w = '1440', h = '900', wait = '3500'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:4173/#${route}`);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log(errors.slice(0, 15).join('\n') || 'sin errores');
await browser.close();
