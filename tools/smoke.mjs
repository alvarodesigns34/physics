/**
 * Prueba de humo de extremo a extremo (Playwright + Chromium preinstalado).
 * Arranca `vite preview` sobre dist/, recorre Inicio (búsqueda) → Campaña → Forja (¹²C y misión I-1) → Photon Lab (Hα) →
 * Entrenamiento (AMP 6), comprueba el DOM y la ausencia de errores, y guarda capturas en test-results/.
 * Uso: npm run build && npm run e2e
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const PORT = 4179;
const OUT = 'test-results';
const T = 30_000; // tiempo máximo de espera de cada estado observable
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
  await page.waitForSelector('.intro', { timeout: T });
  check(await page.locator('.intro').isVisible(), 'Bienvenida visible en la primera visita');
  await page.click('.intro button:text-is("Cerrar")');
  // ATOM 3.0: el inicio es una página de estudio (sin escena 3D) con los laboratorios a un clic.
  await page.waitForSelector('.lab-card', { timeout: T });
  check((await page.locator('.lab-card').count()) === 8, 'Inicio: siete laboratorios y la campaña a un clic');
  check((await page.locator('.rail__item').count()) === 10, 'Raíl lateral: inicio, guía, práctica y siete laboratorios');
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.palette input', { timeout: T });
  await page.fill('.palette input', 'Rydberg');
  await page.waitForSelector('.palette__hit', { timeout: T });
  const kinds = await page.locator('.palette__kind').allInnerTexts();
  check(kinds.some((k) => /teor/i.test(k)) && kinds.some((k) => /laborat/i.test(k)) && kinds.some((k) => /pr[aá]ctica/i.test(k)), 'Búsqueda «Rydberg»: teoría, laboratorio y práctica');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${OUT}/01-inicio.png` });
  await page.goto(base + '#/campana');
  await page.waitForFunction(() => document.querySelectorAll('.station-label').length >= 9, null, { timeout: T });
  check((await page.locator('.station-label').count()) === 9, 'Campaña: atrio con nueve estaciones etiquetadas');
  await page.click('button:has-text("Empezar")');
  await page.waitForURL(/#\/forja/, { timeout: T });
  check(page.url().includes('#/forja'), 'La misión I-1 abre la Forja');
  await page.waitForSelector('canvas', { timeout: T });
  // Los atajos de teclado se registran al montar el panel: esperar a sus controles antes de pulsar.
  await page.waitForSelector('[aria-label="Añadir un proton"]', { timeout: 60_000 });
  for (const k of 'ppppppnnnnnneeeeee') await page.keyboard.press(k);
  await page.waitForFunction(() => /Misión completada/.test(document.querySelector('aside')?.textContent ?? ''), null, { timeout: T }).catch(() => {});
  const side = await page.locator('aside').innerText();
  check(side.includes('Carbono') && side.includes('Núcleo estable'), 'Forja: ¹²C identificado y estable');
  check(side.includes('Misión completada'), 'Misión I-1 completada');
  await page.screenshot({ path: `${OUT}/02-forja-c12.png` });

  await page.goto(base + '#/guia?b=3&n=3.2');
  await page.waitForSelector('canvas.wave-canvas', { timeout: T });
  check((await page.locator('.guide-sec').count()) >= 8 && (await page.locator('canvas.wave-canvas').count()) === 1, 'Guía: bloque 3 con la anatomía de una onda');
  await page.locator('#sec-3\\.2 .widget').scrollIntoViewIfNeeded();
  check((await page.locator('#sec-3\\.2 .formula-live').innerText()).includes('m/s'), 'Guía: v = λ·ν calculada en vivo');
  await page.screenshot({ path: `${OUT}/11-guia-ondas.png` });
  // ATOM 4.0: capas didácticas y fórmula manipulable (Rydberg: 3 → 2 y, con una pulsación, 4 → 2).
  check((await page.locator('#sec-3\\.6 .guide-why').count()) === 1 && (await page.locator('#sec-3\\.6 .doubt').count()) >= 1, 'Guía: «por qué» y dudas frecuentes en la sección de Rydberg');
  await page.locator('#sec-3\\.6 button:has-text("Explorar la fórmula")').first().click();
  const live = page.locator('#sec-3\\.6 .live').first();
  check((await live.innerText()).includes('656,3'), 'Fórmula manipulable: Hα a 656,3 nm');
  await live.locator('input[type=range]').nth(1).focus();
  await page.keyboard.press('ArrowRight');
  check((await live.innerText()).includes('486,2'), 'Fórmula manipulable: al subir n₂ a 4 sale Hβ (486,2 nm)');

  await page.goto(base + '#/fotones');
  await page.waitForSelector('aside [role=tab][aria-selected=true]', { timeout: T });
  check((await page.locator('aside [role=tab][aria-selected=true]').first().innerText()).includes('Ondas'), 'Photon Lab abre en la pestaña Ondas');
  await page.goto(base + '#/fotones?tab=espectroscopio');
  await page.waitForSelector('summary:has-text("Medidas del prisma")', { timeout: T });
  await page.click('summary:has-text("Medidas del prisma")');
  check((await page.locator('aside').innerText()).includes('1,7'), 'Espectroscopio: índices del SF11 calculados');
  await page.screenshot({ path: `${OUT}/12-espectroscopio.png` });

  await page.goto(base + '#/fotones?tab=hidrogeno');
  await page.waitForSelector('button:has-text("Emitir fotón 3 → 2")', { timeout: T });
  await page.click('button:has-text("Emitir fotón 3 → 2")');
  await page.waitForFunction(() => /656,47/.test(document.querySelector('aside')?.textContent ?? ''), null, { timeout: T }).catch(() => {});
  const ph = await page.locator('aside').innerText();
  check(ph.includes('656,47') && ph.includes('Balmer'), 'Photon Lab: Hα a 656,47 nm en la serie de Balmer');
  await page.screenshot({ path: `${OUT}/03-fotones-halpha.png` });
  // ATOM 4.0: predicción antes del experimento (el cálculo se oculta hasta comprobar).
  await page.check('text=Predecir antes de ver');
  check(!(await page.locator('aside').innerText()).includes('656,47'), 'Predicción: el resultado no se muestra antes de comprometerse');
  await page.click('.prediction [role=radio]:text-is("Visible")');
  await page.click('.prediction button:has-text("comprobar")');
  check((await page.locator('aside').innerText()).includes('Predicción correcta'), 'Predicción: Hα en el visible, comprobada en la escena');

  await page.goto(base + '#/entrenamiento?v=fuentes');
  await page.waitForSelector('.source-card', { timeout: T });
  await page.locator('.source-card', { hasText: /^AMP 6Examen|^AMP 6/ }).first().click();
  await page.waitForSelector('input.input', { timeout: T });
  await page.locator('input.input').first().fill('5,00·10^-7 m');
  await page.click('button:text-is("Comprobar")');
  await page.locator('input.input').nth(1).fill('6,00·10^14 Hz');
  await page.click('button:text-is("Comprobar")');
  await page.waitForFunction(() => document.querySelectorAll('.feedback--ok').length >= 2, null, { timeout: T }).catch(() => {});
  check((await page.locator('.feedback--ok').count()) >= 2, 'Entrenamiento: AMP 6 corregido paso a paso');
  await page.screenshot({ path: `${OUT}/04-entrenamiento.png` });

  // Cuaderno de errores: el fallo de AMP 6 (primer intento erróneo abajo) o el simulacro dejan entradas.
  await page.goto(base + '#/entrenamiento?gen=onda-lambda');
  await page.waitForSelector('input.input', { timeout: T });
  // Completa el ejercicio fallando cada paso y viéndolo resuelto (solo se registra al terminar).
  for (let k = 0; k < 8 && !(await page.locator('text=Completado').count()); k++) {
    const inp = page.locator('article input.input:not([disabled])').last();
    const opts = page.locator('article li:last-child [role=radio]:not([disabled]), article li:last-child [role=checkbox]:not([disabled])');
    if (await inp.count()) {
      await inp.fill('27');
      await page.click('button:text-is("Comprobar")');
      await inp.fill('28');
      await page.click('button:text-is("Comprobar")');
    } else if (await opts.count()) {
      // Paso de elección: dos opciones distintas, ambas comprobadas (al menos una será errónea).
      for (const j of [0, 1]) {
        await opts.nth(j).click();
        if (await page.locator('button:has-text("Ver este paso")').count()) break;
        await page.click('button:text-is("Comprobar")');
      }
    } else break;
    if (await page.locator('button:has-text("Ver este paso")').count()) await page.click('button:has-text("Ver este paso")');
  }
  await page.goto(base + '#/entrenamiento?v=cuaderno');
  await page.waitForSelector('.nb-item, .panel-card', { timeout: T });
  check((await page.locator('.nb-item').count()) >= 1, 'Cuaderno de errores: el paso fallado aparece con su diagnóstico');
  await page.goto(base + '#/entrenamiento?v=ruta&n=3.6');
  await page.waitForSelector('.path-steps', { timeout: T });
  await page.click('.path-steps button:has-text("Practicar guiado")');
  await page.waitForSelector('article', { timeout: T });
  check((await page.locator('.path-steps button').count()) === 6 && (await page.locator('article').count()) === 1, 'Ruta de estudio 3.6: seis pasos y ejercicio guiado');
  await page.click('.path-steps button:has-text("Observar")');
  await page.click('a:has-text("Abrir Photon Lab")');
  await page.waitForSelector('.path-return', { timeout: T });
  check((await page.locator('.path-return').innerText()).includes('paso 2/6'), 'Ruta de estudio: desde el laboratorio se ve «volver a la ruta» con el paso');
  await page.click('.path-return__link');
  await page.waitForSelector('.path-steps', { timeout: T });
  check((await page.locator('.path-steps button[aria-current=step]').innerText()).includes('Observar') && (await page.locator('.path-steps button.done').count()) >= 1, 'Ruta de estudio: al volver, el paso y lo hecho se conservan');
  await page.goto(base + '#/entrenamiento?v=examen');
  await page.waitForSelector('button:has-text("Empezar el simulacro equilibrado")', { timeout: T });
  await page.click('button:has-text("Empezar el simulacro equilibrado")');
  await page.waitForFunction(() => /de 8/.test(document.querySelector('main')?.textContent ?? ''), null, { timeout: T }).catch(() => {});
  check((await page.locator('.exam-q').count()) === 8, 'Simulacro equilibrado: 8 preguntas con navegación libre');
  // Responder algo en la 1, saltar a la 3, recargar: el simulacro se recupera (guardado automático).
  const firstInput = page.locator('.exam-main input.input').first();
  if (await firstInput.count()) await firstInput.fill('1');
  else await page.locator('.exam-main [role=radio], .exam-main [role=checkbox]').first().click();
  await page.click('.exam-q >> nth=2');
  await page.reload();
  await page.waitForSelector('.exam-q', { timeout: T });
  check((await page.locator('.exam-main').innerText()).includes('Pregunta 3 de 8') && (await page.locator('.exam-q--respondida, .exam-q--parcial').count()) >= 1, 'Simulacro: se recupera tras recargar (pregunta actual y respuestas)');
  await page.click('.exam-nav button:has-text("Entregar")');
  await page.click('button:has-text("Entregar y corregir")');
  await page.waitForSelector('.exam-grade', { timeout: T });
  const rep = await page.locator('.exam-report').innerText();
  check(/sin responder/.test(rep) && /\/ 10/.test(rep), 'Simulacro: informe con nota, apartados y preguntas sin responder');

  // Laboratorios de las fases 2–4
  await page.goto(base + '#/periodico');
  await page.waitForSelector('button[role=radio]:text-is("EI₁")', { timeout: T });
  await page.click('button[role=radio]:text-is("EI₁")');
  await page.waitForFunction(() => document.querySelectorAll('.label-layer span').length >= 118, null, { timeout: T }).catch(() => {});
  check((await page.locator('.label-layer span').count()) >= 118, 'Periodic Universe: 118 elementos etiquetados');
  await page.screenshot({ path: `${OUT}/06-periodico.png` });

  await page.goto(base + '#/cuantico');
  await page.waitForSelector('aside [role=radio]:text-is("3")', { timeout: T });
  await page.click('[role=radio]:text-is("3")');
  await page.click('[role=radio]:text-is("2 · d")');
  await page.waitForFunction(() => /Encierra realmente/.test(document.querySelector('aside')?.textContent ?? ''), null, { timeout: T }).catch(() => {});
  check((await page.locator('aside').innerText()).includes('Encierra realmente'), 'Quantum Space: superficie calculada en el Worker');
  check((await page.locator('aside').innerText()).includes('nodos angulares'), 'Quantum Space: orbital 3d con sus nodos');
  await page.screenshot({ path: `${OUT}/07-cuantico.png` });
  await page.check('text=Predecir los nodos antes de verlos');
  await page.click('.prediction [role=radio]:text-is("2")');
  await page.click('.prediction button:has-text("comprobar")');
  check((await page.locator('aside').innerText()).includes('Predicción correcta'), 'Predicción: el 3d tiene 2 nodos (n − 1)');

  await page.goto(base + '#/arquitecto?z=8');
  await page.waitForSelector('button:has-text("Estado fundamental real")', { timeout: T });
  await page.click('button:has-text("Estado fundamental real")');
  await page.waitForFunction(() => /Estado fundamental/.test(document.querySelector('aside')?.textContent ?? ''), null, { timeout: T }).catch(() => {});
  check((await page.locator('aside').innerText()).includes('Estado fundamental'), 'Electron Architect: oxígeno en estado fundamental');
  await page.screenshot({ path: `${OUT}/08-arquitecto.png` });
  await page.click('button.challenge-chip:has-text("Repara: nitrógeno")');
  await page.waitForSelector('.challenge-card', { timeout: T });
  check(!(await page.locator('aside').innerText()).includes('objetivo:'), 'Desafío: el objetivo queda oculto mientras se resuelve');
  await page.click('.challenge-card button:has-text("Regla de Hund")');
  check((await page.locator('.challenge-card').innerText()).includes('Correcto: incumple'), 'Desafío «Repara: nitrógeno»: regla de Hund identificada');

  await page.goto(base + '#/historia?tab=geiger');
  await page.waitForSelector('[role=radio]:has-text("Átomo nuclear")', { timeout: T });
  await page.click('[role=radio]:has-text("Átomo nuclear")');
  await page.waitForFunction(() => Number((document.querySelector('.kv dd')?.textContent ?? '').replace(/\D/g, '')) > 1000, null, { timeout: 60000 }).catch(() => {});
  const alphas = await page.locator('.kv dd').first().innerText();
  check(Number(alphas.replace(/\D/g, '')) > 1000, `Time Machine: Monte Carlo de Geiger–Marsden en marcha (${alphas} α)`);
  await page.screenshot({ path: `${OUT}/09-historia.png` });

  await page.goto(base + '#/masas');
  await page.waitForFunction(() => /\d+,\d+ u/.test(document.querySelector('aside')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
  check(/\d+,\d+ u/.test(await page.locator('aside').innerText()), 'Mass Spectrometry: masa media medida');
  await page.screenshot({ path: `${OUT}/10-masas.png` });
  await page.click('.prediction [role=radio]:text-is("Se reduce a la mitad")');
  await page.click('.prediction button:has-text("comprobar")');
  const msPred = await page.locator('aside').innerText();
  check(msPred.includes('Predicción correcta') && msPred.includes('0,600 T'), 'Predicción: duplicar B reduce el radio a la mitad (B pasa a 0,600 T)');
  await page.click('button:has-text("Analizar una muestra desconocida")');
  await page.waitForSelector('text=Muestra desconocida X', { timeout: T });
  const massSide = await page.locator('aside').innerText();
  check(massSide.includes('X-') && massSide.includes('oculto'), 'Mass Spectrometry: muestra desconocida con nombre y tabla ocultos');

  const stored = await page.evaluate(() => localStorage.getItem('atom:v1'));
  check(!!stored && stored.includes('"I-1"'), 'Progreso persistido en localStorage');
  check(errors.length === 0, `Sin errores en consola${errors.length ? ': ' + errors.join(' | ') : ''}`);

  const m = await browser.newPage({ ...devices['iPhone 13'] });
  const mErrors = [];
  m.on('pageerror', (e) => mErrors.push(e.message));
  await m.goto(base + '#/guia?b=6');
  await m.waitForSelector('.intro button:text-is("Cerrar")', { timeout: T });
  await m.click('.intro button:text-is("Cerrar")');
  await m.waitForSelector('.mobile-nav', { timeout: T });
  check(await m.evaluate(() => document.querySelector('.guide-scroll').scrollWidth <= document.querySelector('.guide-scroll').clientWidth + 1), 'Móvil: la guía no desborda en horizontal');
  check(await m.locator('.mobile-nav').isVisible(), 'Móvil: barra de navegación inferior visible');
  await m.screenshot({ path: `${OUT}/13-movil-guia.png` });
  await m.goto(base + '#/forja');
  await m.waitForSelector('canvas', { timeout: T });
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
