/**
 * Cifras del proyecto generadas DESDE EL CÓDIGO (no escritas a mano): docs/ESTADISTICAS.md.
 * Uso: npm run stats   (carga los módulos TypeScript con Vite en modo SSR y ejecuta vitest en JSON).
 */
import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const reg = await server.ssrLoadModule('/src/learning/registry.ts');
  const syl = await server.ssrLoadModule('/src/learning/syllabus.ts');
  const camp = await server.ssrLoadModule('/src/learning/campaign.ts');
  const guide = await server.ssrLoadModule('/src/learning/guide.ts');
  const reasoning = await server.ssrLoadModule('/src/learning/generators/reasoning.ts');
  const session = await server.ssrLoadModule('/src/learning/session.ts');

  const sources = reg.SOURCE_EXERCISES;
  const byDoc = {};
  for (const s of sources) {
    const k = s.ref.split(/[ ·-]/)[0];
    byDoc[k] = (byDoc[k] ?? 0) + 1;
  }
  execFileSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', '--outputFile=test-results/vitest.json'], { stdio: 'ignore' });
  const res = JSON.parse(readFileSync('test-results/vitest.json', 'utf8'));
  const smoke = (readFileSync('tools/smoke.mjs', 'utf8').match(/\bcheck\(/g) ?? []).length;
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').length;

  const rows = [
    ['Apartados del temario', syl.NODES.length],
    ['Apartados con ejercicios', reg.COVERED_NODES.length],
    ['Generadores de ejercicios (familias)', reg.GENERATORS.length],
    ['· de ellos, de razonamiento (ATOM 3.0)', reasoning.REASONING_GENERATORS.length],
    ['Preguntas de desarrollo con rúbrica', reasoning.ESSAYS.length],
    ['Ejercicios de los documentos', sources.length],
    ...Object.entries(byDoc).sort().map(([k, v]) => [`· ${k}`, v]),
    ['Perfiles de simulacro', session.MOCK_PROFILES.length + 1],
    ['Misiones de la campaña', camp.MISSIONS.length],
    ['Lecciones de la guía', guide.LESSONS.length],
    ['Secciones de la guía', guide.LESSONS.reduce((a, l) => a + l.sections.length, 0)],
    ['Apartados con trucos', Object.keys(guide.TRICKS).length],
    ['Notas de rigor', guide.RIGOR_NOTES.length],
    ['Pruebas unitarias (vitest)', `${res.numPassedTests} superadas de ${res.numTotalTests}`],
    ['Comprobaciones e2e (tools/smoke.mjs)', smoke],
    ['Archivos versionados', files],
  ];
  const md = `# Estadísticas de ATOM (generadas)\n\n> Generado por \`npm run stats\` el ${new Date().toISOString().slice(0, 10)}. No editar a mano.\n\n| Métrica | Valor |\n|---|---|\n${rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync('docs/ESTADISTICAS.md', md);
  console.log(md);
} finally {
  await server.close();
}
