/**
 * Diagnóstico explicable: competencias débiles, prerrequisitos y recomendación de la siguiente actividad.
 * Todo es determinista y se justifica con datos concretos del historial del alumno.
 */
import type { ErrorKind, SkillId } from './types';
import { initialMastery, masteryEstimate, type NodeMastery } from './mastery';
import { ERROR_LABEL, SKILLS } from './evidence';
import { nodeTitle } from './syllabus';

/** Grafo de prerrequisitos: apartado → apartados en los que se apoya. */
export const PREREQUISITES: Record<string, string[]> = {
  '1.2': ['1.1'],
  '1.3': ['1.1', '1.2'],
  '1.4': ['1.1'],
  '1.5': ['1.4'],
  '2.3': ['2.2'],
  '2.4': ['2.3'],
  '2.5': ['2.4'],
  '2.6': ['2.5'],
  '3.1': ['1.3'],
  '3.3': ['3.2'],
  '3.4': ['3.2'],
  '3.5': ['3.4'],
  '3.6': ['3.2', '3.9'],
  '3.7': ['3.6'],
  '3.8': ['4.3'],
  '4.1': ['2.6', '3.5'],
  '4.2': ['4.1'],
  '4.3': ['4.1', '3.6'],
  '4.4': ['4.3'],
  '5.3': ['5.2', '4.1'],
  '5.4': ['5.3'],
  '5.5': ['5.4'],
  '5.6': ['5.4'],
  '6.1': ['5.5'],
  '6.2': ['5.4'],
  '6.3': ['6.1', '6.2'],
  '6.4': ['6.3'],
  '6.5': ['6.3'],
  '6.6': ['6.3'],
  '6.7': ['6.3', '6.4'],
  '6.8': ['6.3', '1.4'],
  '6.9': ['6.3'],
  '7.2': ['6.9'],
  '7.3': ['6.3'],
  '7.4': ['7.1'],
  '7.5': ['6.9', '1.4'],
  '7.6': ['6.9'],
  '7.7': ['7.6'],
  '7.8': ['7.7', '1.4'],
  '7.9': ['7.6', '7.7'],
  '7.10': ['7.6'],
  '7.11': ['7.9', '7.10'],
  '7.12': ['7.9'],
  '7.13': ['7.9', '6.4'],
};

/** Apartados con ejercicios que entrenan cada competencia de forma aislada. */
export const SKILL_PRACTICE_NODES: Record<SkillId, string[]> = {
  unidades: ['3.9', '3.2'],
  calculo: ['3.4', '3.6'],
  formula: ['3.2', '3.4', '3.6'],
  cifras: ['3.2', '3.4'],
  notacion: ['6.3', '5.4', '6.8'],
  razonamiento: ['7.7', '7.9', '7.8'],
  concepto: [],
};

export interface AttemptLike {
  at: number;
  nodeIds: string[];
  errors?: { kind: ErrorKind; skill?: SkillId; nodeIds: string[] }[];
  skills?: Partial<Record<SkillId, number>>;
}

export interface WeakSkill {
  skill: SkillId;
  errors: number;
  observations: number;
  /** Tipo de error más frecuente */
  topKind: ErrorKind;
  /** Competencias que, en cambio, van bien (para contextualizar) */
  strengths: SkillId[];
}

export interface Recommendation {
  nodeIds: string[];
  reason: 'competencia' | 'prerrequisito';
  message: string;
}

const WINDOW = 25;

/** Competencias con al menos 3 errores en los últimos intentos y rendimiento medio < 60 %. */
export function weakSkills(history: AttemptLike[], skills: Partial<Record<SkillId, NodeMastery>>): WeakSkill[] {
  const recent = history.slice(-WINDOW);
  const errCount = new Map<SkillId, Map<ErrorKind, number>>();
  const obs = new Map<SkillId, { sum: number; n: number }>();
  for (const a of recent) {
    for (const e of a.errors ?? []) {
      if (!e.skill) continue;
      const m = errCount.get(e.skill) ?? new Map();
      m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
      errCount.set(e.skill, m);
    }
    for (const [k, y] of Object.entries(a.skills ?? {}) as [SkillId, number][]) {
      const o = obs.get(k) ?? { sum: 0, n: 0 };
      obs.set(k, { sum: o.sum + y, n: o.n + 1 });
    }
  }
  const strengths = (Object.keys(SKILLS) as SkillId[]).filter((k) => {
    const o = obs.get(k);
    return o && o.n >= 3 && o.sum / o.n >= 0.8;
  });
  const out: WeakSkill[] = [];
  for (const [skill, kinds] of errCount) {
    const errors = [...kinds.values()].reduce((a, b) => a + b, 0);
    const o = obs.get(skill);
    const avg = o && o.n ? o.sum / o.n : 0;
    const theta = (skills[skill] ?? initialMastery()).theta;
    if (errors >= 3 && avg < 0.6 && theta < 0.3) {
      const topKind = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0]![0];
      out.push({ skill, errors, observations: o?.n ?? 0, topKind, strengths: strengths.filter((s) => s !== skill) });
    }
  }
  return out.sort((a, b) => b.errors - a.errors);
}

/** Mensaje en lenguaje natural, con los datos que lo justifican. */
export function explainWeakSkill(w: WeakSkill): string {
  const strong = w.strengths.length ? ` En cambio, vas bien en ${w.strengths.slice(0, 2).map((s) => `«${SKILLS[s].label.toLowerCase()}»`).join(' y ')}.` : '';
  return `En tus últimos ejercicios has cometido ${w.errors} errores de «${SKILLS[w.skill].label.toLowerCase()}» (sobre todo: ${ERROR_LABEL[w.topKind]}).${strong} Vamos a reforzar solo esa competencia.`;
}

/**
 * Prerrequisito débil: el apartado se ha fallado varias veces y alguno de sus prerrequisitos tiene
 * menos dominio (o no se ha practicado).
 */
export function weakPrerequisite(nodeId: string, mastery: Record<string, NodeMastery>): string | null {
  const m = mastery[nodeId];
  if (!m || m.attempts < 2 || m.attempts - m.correct < 2) return null;
  const pre = PREREQUISITES[nodeId] ?? [];
  const theta = m.theta;
  const candidates = pre
    .map((p) => ({ p, m: mastery[p] }))
    .filter(({ m: pm }) => !pm || pm.attempts === 0 || pm.theta < Math.min(0, theta + 0.2))
    .sort((a, b) => (a.m?.theta ?? -1) - (b.m?.theta ?? -1));
  return candidates[0]?.p ?? null;
}

export function recommend(history: AttemptLike[], mastery: Record<string, NodeMastery>, skills: Partial<Record<SkillId, NodeMastery>>, scope: string[] | null): Recommendation | null {
  const inScope = (n: string) => !scope || scope.length === 0 || scope.includes(n);
  const ws = weakSkills(history, skills).find((w) => SKILL_PRACTICE_NODES[w.skill].some(inScope));
  if (ws) {
    return { nodeIds: SKILL_PRACTICE_NODES[ws.skill].filter(inScope), reason: 'competencia', message: explainWeakSkill(ws) };
  }
  // Apartados fallados recientemente → ¿falla un prerrequisito?
  const recentNodes = [...new Set(history.slice(-10).flatMap((a) => (a.errors ?? []).flatMap((e) => e.nodeIds)))];
  for (const n of recentNodes) {
    const pre = weakPrerequisite(n, mastery);
    if (pre && inScope(pre)) {
      const est = masteryEstimate(mastery[pre]);
      return {
        nodeIds: [pre],
        reason: 'prerrequisito',
        message: `Has fallado varias veces «${nodeTitle(n)}». Se apoya en «${nodeTitle(pre)}»${est.evidence === 'sin-datos' ? ', que aún no has practicado' : `, donde tu dominio estimado es ${est.low}–${est.high} %`}: conviene asegurarlo primero.`,
      };
    }
  }
  return null;
}
