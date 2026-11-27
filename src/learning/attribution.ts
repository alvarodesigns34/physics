/**
 * Atribución granular (hallazgo P1.6): qué apartados del temario evalúa CADA paso de un ejercicio.
 *
 * Los generadores más recientes ya anotan `part.nodeIds`; para el resto, esta tabla asigna a cada paso
 * los apartados que realmente pone en juego, en lugar de cargar todos los conceptos del problema sobre
 * cada paso. Reglas:
 * - Solo se usan apartados que el propio ejercicio declara (intersección con `ex.nodeIds`).
 * - Cada entrada es una lista de preferencia: se toma el primer grupo con intersección no vacía.
 * - Si un paso no aparece en la tabla, conserva el comportamiento anterior (todos los apartados) y la
 *   prueba de cobertura lo señala.
 */
import type { Exercise } from './types';

type Rule = Record<string, string[][]>;
const g = (...groups: string[][]) => groups;

const GENERATOR_RULES: Record<string, Rule> = {
  'nucleo-especie': { p: g(['1.1']), z: g(['1.1']), el: g(['1.1']), a: g(['1.2']), n: g(['1.2']), e: g(['1.4'], ['1.1']), q: g(['1.4']), tipo: g(['1.4'], ['1.1']) },
  'onda-lambda': { lm: g(['3.2']), nu: g(['3.2']), E: g(['3.4']), eV: g(['3.9'], ['3.4']), reg: g(['3.3']), 'mas-nu': g(['3.2', '3.3']) },
  rydberg: { w: g(['3.6']), l: g(['3.6']), f: g(['3.2'], ['3.6']), E: g(['3.4']), eV: g(['3.9'], ['3.4']), serie: g(['3.7']), reg: g(['3.3'], ['3.7']), porque: g(['4.3']) },
  'serie-inversa': { w: g(['3.6']), x: g(['3.6']), inv: g(['3.6']), n2sq: g(['3.6']), n2: g(['3.6']), n1: g(['3.6']), ord: g(['3.7']), serie: g(['3.7'], ['3.6']) },
  cascada: { total: g(['3.8']), vis: g(['3.7'], ['4.3']) },
  'nivel-energia': { En: g(['4.2']), ion: g(['4.2']) },
  'orbitales-recuento': { orb: g(['5.5']), e: g(['5.6'], ['5.5']), tipos: g(['5.4']) },
  configuracion: { conf: g(['6.3']), desap: g(['6.4'], ['6.3']), periodo: g(['7.2']), grupo: g(['7.2']) },
  'masa-media': { M: g(['3.1']), cerca: g(['1.3']), x: g(['3.1']), y: g(['3.1']) },
  'posicion-tabla': { periodo: g(['7.2']), grupo: g(['7.2']), bloque: g(['7.3']), familia: g(['7.4']) },
  subnivel: { n: g(['5.4']), l: g(['5.4']), q: g(['5.4']), orb: g(['5.5']), e: g(['5.5']) },
  'asignar-ei': { ei0: g(['7.9']), ei1: g(['7.9']), ei2: g(['7.9']), radio: g(['7.7']) },
  'segunda-ei': { r: g(['7.9']), why: g(['6.9']) },
};

/** Reglas de los ejercicios transcritos de los documentos («fuentes»), por referencia. */
const SOURCE_RULES: [RegExp, Rule][] = [
  [/^AMP 1[79]/, { estado: g(['6.5']), el: g(['6.3']) }],
  [/^AMP 20/, { p0: g(['7.4']), p1: g(['7.4']), p2: g(['7.11']) }],
  [/^HOJ 12$/, { per: g(['7.2']), gr: g(['7.2']), ion: g(['7.5']) }],
  [/^HOJ 13$/, { per: g(['7.1']), gr: g(['7.1']) }],
  [/^HOJ 14$/, { ag: g(['7.2']), bg: g(['7.2']), cg: g(['7.2']), dg: g(['7.2']), ae: g(['7.4']), be: g(['7.4']), ce: g(['7.4']), de: g(['7.4']) }],
  [/^HOJ 15$/, { ca: g(['6.3']), cb: g(['6.3']), cc: g(['6.3']), ga: g(['7.2']), gb: g(['7.2']), gc: g(['7.2']) }],
  [/^HOJ 16$/, { n1: g(['5.6']), n2: g(['5.6']), n3: g(['5.6']) }],
  [/^HOJ 17$/, { c: g(['6.3']), n: g(['6.3']), o: g(['6.3']), f: g(['6.3']), na: g(['6.3']), n3: g(['6.8']), o2: g(['6.8']), f1: g(['6.8']), na1: g(['6.8']), obs: g(['1.5']) }],
  [/^HOJ 18$/, { mg: g(['6.1']), p: g(['6.1']), s: g(['6.1']), umg: g(['6.4']), up: g(['6.4']), us: g(['6.4']) }],
  [/^HOJ 20$/, { ord: g(['7.11']), met: g(['7.12']) }],
  // HOJ 22: cada apartado pide el diagrama de cajas Y razonar con Hund: evalúa ambos a propósito.
  [/^HOJ 22$/, { a: g(['6.1', '6.4']), b: g(['6.1', '6.4']), c: g(['6.1', '6.4']) }],
  [/^HOJ 27$/, { orb: g(['5.5']), e: g(['5.6']) }],
  [/^HOJ 28$/, { mg: g(['6.8']), cl: g(['6.8']), q: g(['5.4']), tam: g(['7.7']), ei: g(['7.9']) }],
  [/^EBAU-1 \(2021\) a/, { en: g(['7.11']), ei: g(['7.9']) }],
  [/^EBAU-1 \(2021\) b/, { val: g(['5.4']), d: g(['5.5']), s: g(['5.5']), p: g(['5.5']) }],
  [/^EBAU-2/, { val: g(['5.4']), b1: g(['5.4']), b2: g(['5.4']), b3: g(['5.4']), c: g(['6.3']) }],
];

function pick(rule: Rule | undefined, partId: string, exNodes: string[]): string[] | undefined {
  const groups = rule?.[partId];
  if (!groups) return undefined;
  for (const grp of groups) {
    const hit = grp.filter((n) => exNodes.includes(n));
    if (hit.length) return hit;
  }
  return undefined;
}

/** Completa `nodeIds` de los pasos sin anotar (no modifica los ya anotados). Devuelve el mismo ejercicio. */
export function annotateParts(ex: Exercise, sourceRef?: string): Exercise {
  if (ex.parts.length < 2 || ex.nodeIds.length < 2) return ex;
  const rule = sourceRef ? SOURCE_RULES.find(([re]) => re.test(sourceRef))?.[1] : GENERATOR_RULES[ex.generatorId];
  const fallback = GENERATOR_RULES[ex.generatorId];
  for (const p of ex.parts) {
    if (p.nodeIds?.length) continue;
    const nodes = pick(rule, p.id, ex.nodeIds) ?? pick(fallback, p.id, ex.nodeIds);
    if (nodes) p.nodeIds = nodes;
  }
  return ex;
}
