/**
 * ATOM 4.0 · Resolución estructurada para los ejercicios que no tienen una escrita a medida.
 *
 * Se construye SOLO con contenido ya verificado: los pasos y explicaciones del propio ejercicio (generados
 * con sus mismos números), la fórmula y el «por qué» de la guía del apartado, y sus errores típicos.
 * No inventa cálculos: reorganiza la solución en los bloques de siempre (qué piden → datos → principio →
 * pasos → resultado → errores a evitar).
 */
import type { Exercise, ResolutionStep } from './types';
import { LESSONS, type GuideSection } from './guide';
import { DEPTH } from './guideDepth';

function sectionFor(node: string): GuideSection | undefined {
  for (const l of LESSONS) for (const s of l.sections) if (s.node === node && !s.id) return s;
  return undefined;
}

const letter = (i: number, n: number) => (n > 1 ? `${String.fromCharCode(97 + i)}) ` : '');

export function structuredResolution(ex: Exercise): ResolutionStep[] {
  const n = ex.parts.length;
  const steps: ResolutionStep[] = [{ kind: 'pregunta', text: n === 1 ? ex.statement.split('\n')[0]! : ex.parts.map((p, i) => `${letter(i, n)}${p.prompt}`).join(' · ') }];
  if (ex.data?.length) steps.push({ kind: 'datos', text: ex.data.map((d) => `${d.label} = ${d.value}`).join(' · ') });
  const sec = sectionFor(ex.nodeIds[0] ?? '');
  const depth = DEPTH[ex.nodeIds[0] ?? ''];
  if (sec?.formulas?.length) steps.push({ kind: 'principio', text: `${sec.title}: ${sec.formulas.map((f) => f.expr).join(' · ')}` });
  else if (sec) steps.push({ kind: 'principio', text: `${sec.title}. ${sec.body[0] ?? ''}` });
  if (depth) steps.push({ kind: 'por-que', text: depth.why });
  ex.parts.forEach((p, i) => steps.push({ kind: 'calculo', text: `**${letter(i, n)}${p.prompt}** → ${p.canonical}. ${p.explanation}` }));
  steps.push({ kind: 'resultado', text: ex.parts.map((p, i) => `${letter(i, n)}${p.canonical}`).join(' · ') });
  const mistakes = sec?.mistakes?.slice(0, 2);
  if (mistakes?.length) steps.push({ kind: 'errores', text: mistakes.join(' ') });
  return steps;
}
