/**
 * ATOM 4.0 · Cuaderno inteligente de errores (lógica pura).
 *
 * - Cada ejercicio con algún paso no superado deja una entrada: qué se preguntó, qué tipo de error hubo y
 *   en qué apartados.
 * - Una entrada se da por SUPERADA solo cuando se acierta una VARIANTE NUEVA del mismo tipo al primer
 *   intento y sin ayuda (repetir el mismo enunciado puede ser memoria, no comprensión). Para los
 *   ejercicios de los documentos, que no tienen variantes, vale el mismo enunciado pasados ≥ 2 días.
 * - Dificultades recurrentes: el mismo tipo de error en ≥ 3 entradas abiertas, o en ≥ 2 apartados.
 * - Lagunas conceptuales probables: errores conceptuales («idea errónea», «concepto», «regla») repetidos
 *   en un apartado, o fallos repetidos en apartados que dependen de un prerrequisito débil o sin practicar.
 *   Se formulan como posibilidad, con la evidencia que las sostiene.
 */
import type { ErrorKind, SkillId } from './types';
import { ERROR_LABEL } from './evidence';
import { PREREQUISITES } from './diagnosis';
import { masteryEstimate, type NodeMastery } from './mastery';
import { nodeTitle } from './syllabus';

export interface NotebookEntry {
  /** Id del ejercicio fallado (reconstruible) */
  exerciseId: string;
  generatorId: string;
  title: string;
  nodeIds: string[];
  at: number;
  mode: 'practica' | 'examen' | 'campana';
  /** Pasos fallados con su diagnóstico */
  misses: { prompt: string; kind: ErrorKind | 'revelado'; skill?: SkillId; /** Id del paso (ATOM 5.0) */ partId?: string }[];
  /** Intentos de recuperación (variantes) */
  retries: number;
  resolvedAt?: number;
  /** Cómo se superó: variante nueva o (solo documentos) el mismo enunciado días después */
  resolvedBy?: 'variante' | 'mismo-dias-despues';
}

export const NOTEBOOK_MAX = 200;
const DAY = 86_400_000;

export function isVariantOf(a: NotebookEntry, generatorId: string): boolean {
  return a.generatorId === generatorId && a.generatorId !== 'fuentes';
}

/** Añade (o actualiza) una entrada tras un ejercicio con fallos. */
export function addMiss(list: NotebookEntry[], e: Omit<NotebookEntry, 'retries'>): NotebookEntry[] {
  const existing = list.find((x) => x.exerciseId === e.exerciseId && !x.resolvedAt);
  const rest = list.filter((x) => x !== existing);
  const merged: NotebookEntry = existing ? { ...existing, at: e.at, misses: e.misses, retries: existing.retries + 1 } : { ...e, retries: 0 };
  return [...rest, merged].slice(-NOTEBOOK_MAX);
}

/** Dificultad codificada en el id «generador:d:semilla» (null en los ejercicios de los documentos). */
function difficultyOf(id: string): number | null {
  const m = id.match(/:([123]):\d+$/);
  return m ? Number(m[1]) : null;
}

export interface CleanExercise {
  id: string;
  generatorId: string;
  difficulty?: number;
  /** Pasos RESUELTOS limpiamente en este intento (id y enunciado) */
  steps: { id?: string; prompt: string }[];
}

/** ¿Contiene el ejercicio limpio cada uno de los pasos que se fallaron en la entrada? */
function coversMisses(e: NotebookEntry, ex: CleanExercise): boolean {
  return e.misses.every((m) => ex.steps.some((st) => (m.partId && st.id ? st.id === m.partId : st.prompt === m.prompt)));
}

/**
 * Registra un ejercicio superado al primer intento y sin ayuda: resuelve las entradas abiertas que
 * cumplan la regla de superación (ATOM 5.0, endurecida tras la auditoría de 4.0):
 * - variante nueva del mismo generador, de dificultad igual o mayor, que contenga CADA paso fallado en la
 *   entrada resuelto limpiamente (acertar otro paso distinto del mismo generador no supera el error, y un
 *   examen respondido a medias no puede cerrar los pasos que no se respondieron);
 * - para los ejercicios de los documentos, el mismo enunciado completo pasados ≥ 2 días.
 */
/**
 * Ejercicio de los documentos de clase (enunciado fijo, sin variantes). ATOM 5.1: se reconocen por su id
 * («src:…»); muchos se construyen con un generador y conservan su `generatorId`, así que comprobar solo
 * `generatorId === 'fuentes'` dejaba fuera a la mayoría.
 */
export function isSourceExercise(x: { exerciseId: string; generatorId: string }): boolean {
  return x.generatorId === 'fuentes' || x.exerciseId.startsWith('src:');
}

export function registerClean(list: NotebookEntry[], ex: CleanExercise, now: number): { list: NotebookEntry[]; resolved: number } {
  let resolved = 0;
  const out = list.map((x) => {
    if (x.resolvedAt || !coversMisses(x, ex)) return x;
    const dEntry = difficultyOf(x.exerciseId);
    const hardEnough = dEntry === null || (ex.difficulty ?? difficultyOf(ex.id) ?? 0) >= dEntry;
    if (x.exerciseId !== ex.id && isVariantOf(x, ex.generatorId) && hardEnough) {
      resolved++;
      return { ...x, resolvedAt: now, resolvedBy: 'variante' as const };
    }
    if (x.exerciseId === ex.id && isSourceExercise(x) && now - x.at >= 2 * DAY) {
      resolved++;
      return { ...x, resolvedAt: now, resolvedBy: 'mismo-dias-despues' as const };
    }
    return x;
  });
  return { list: out, resolved };
}

export interface Recurrence {
  kind: ErrorKind | 'revelado';
  count: number;
  nodes: string[];
  message: string;
}

/** Tipos de error que se repiten en las entradas abiertas. */
export function recurrentDifficulties(list: NotebookEntry[]): Recurrence[] {
  const open = list.filter((x) => !x.resolvedAt);
  const by = new Map<string, { count: number; nodes: Set<string> }>();
  for (const e of open) for (const m of e.misses) {
    if (m.kind === 'incompleto' || m.kind === 'formato') continue;
    const cur = by.get(m.kind) ?? { count: 0, nodes: new Set<string>() };
    cur.count++;
    e.nodeIds.forEach((n) => cur.nodes.add(n));
    by.set(m.kind, cur);
  }
  return [...by.entries()]
    .filter(([, v]) => v.count >= 3 || (v.count >= 2 && v.nodes.size >= 2))
    .sort((a, b) => b[1].count - a[1].count)
    .map(([kind, v]) => {
      const nodes = [...v.nodes].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      const label = kind === 'revelado' ? 'pasos que tuviste que ver resueltos' : ERROR_LABEL[kind as ErrorKind];
      return { kind: kind as Recurrence['kind'], count: v.count, nodes, message: `«${label}» aparece ${v.count} veces en ejercicios aún no superados (${nodes.slice(0, 3).map(nodeTitle).join(', ')}${nodes.length > 3 ? '…' : ''}). Es un patrón, no un despiste aislado.` };
    });
}

export interface Gap {
  node: string;
  reason: 'conceptual' | 'prerrequisito';
  message: string;
  /** Apartado que conviene repasar primero */
  study: string;
}

const CONCEPTUAL: (ErrorKind | 'revelado')[] = ['idea-erronea', 'concepto', 'regla'];

/** Lagunas conceptuales probables (formuladas como posibilidad, con su evidencia). */
export function conceptualGaps(list: NotebookEntry[], mastery: Record<string, NodeMastery>): Gap[] {
  const open = list.filter((x) => !x.resolvedAt);
  const byNode = new Map<string, { conceptual: number; total: number }>();
  for (const e of open) for (const n of e.nodeIds) {
    const cur = byNode.get(n) ?? { conceptual: 0, total: 0 };
    cur.total++;
    if (e.misses.some((m) => CONCEPTUAL.includes(m.kind))) cur.conceptual++;
    byNode.set(n, cur);
  }
  const gaps: Gap[] = [];
  for (const [n, v] of byNode) {
    if (v.conceptual >= 2) {
      gaps.push({ node: n, reason: 'conceptual', study: n, message: `En «${nodeTitle(n)}» hay ${v.conceptual} ejercicios con errores de concepto o de regla (no de cálculo). Puede que la idea de fondo no esté clara: conviene releer la teoría antes de seguir practicando.` });
      continue;
    }
    if (v.total >= 2) {
      const pre = (PREREQUISITES[n] ?? []).find((p) => {
        const e = masteryEstimate(mastery[p]);
        return e.evidence === 'sin-datos' || e.high < 60;
      });
      if (pre) {
        const e = masteryEstimate(mastery[pre]);
        gaps.push({ node: n, reason: 'prerrequisito', study: pre, message: `Fallos repetidos en «${nodeTitle(n)}», que se apoya en «${nodeTitle(pre)}»${e.evidence === 'sin-datos' ? ', aún sin practicar' : `, con dominio estimado ${e.low}–${e.high} %`}. Es posible que el problema esté en la base.` });
      }
    }
  }
  return gaps.sort((a, b) => (a.reason === b.reason ? a.node.localeCompare(b.node, 'es', { numeric: true }) : a.reason === 'conceptual' ? -1 : 1));
}
