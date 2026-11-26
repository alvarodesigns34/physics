/**
 * Evidencia de aprendizaje por apartado y por competencia.
 *
 * Un ejercicio compuesto no se resume en un único acierto o fallo: cada paso aporta evidencia sobre los
 * apartados del temario que evalúa y sobre las competencias que pone en juego. Reglas (deterministas y
 * explicables):
 *
 * - Paso correcto al primer intento → evidencia positiva (1) para sus apartados y competencias.
 * - Paso correcto tras fallar → 0,5 para sus apartados; 0 para la competencia del error cometido y 0,5 para el resto.
 * - Paso revelado o no resuelto → 0 para sus apartados y para la competencia del error (o la principal si
 *   el error no se pudo clasificar).
 * - Error exclusivamente de unidades o de cifras significativas → el apartado conserva 0,75: no se
 *   penaliza el conocimiento del tema por una conversión (la competencia «unidades» sí recibe 0).
 * - Arrastre de error: el paso que usa correctamente un resultado previo erróneo cuenta como correcto
 *   (el error solo se penaliza una vez, en su paso de origen).
 */
import type { ErrorKind, Exercise, ExercisePart, SkillId } from './types';

export const SKILLS: Record<SkillId, { label: string; description: string }> = {
  concepto: { label: 'Comprensión conceptual', description: 'Definiciones, modelos e interpretación de fenómenos' },
  formula: { label: 'Elección y despeje de fórmulas', description: 'Saber qué relación usar y despejar la incógnita' },
  unidades: { label: 'Unidades y conversiones', description: 'nm ↔ m, cm⁻¹ ↔ m⁻¹, J ↔ eV, kJ/mol, prefijos' },
  calculo: { label: 'Cálculo numérico', description: 'Operar con potencias de 10, signos y redondeos' },
  cifras: { label: 'Cifras significativas', description: 'Expresar el resultado con la precisión de los datos' },
  notacion: { label: 'Notación y reglas', description: 'Configuraciones, números cuánticos y notación de nucleidos' },
  razonamiento: { label: 'Razonamiento comparativo', description: 'Ordenar y justificar tendencias' },
};

export const ERROR_LABEL: Record<ErrorKind, string> = {
  'unidad-falta': 'falta la unidad',
  'unidad-incompatible': 'unidad de otra magnitud',
  'orden-de-magnitud': 'error de potencia de 10 o de conversión',
  signo: 'error de signo',
  inverso: 'resultado invertido (despeje)',
  'idea-erronea': 'idea errónea típica',
  redondeo: 'redondeo prematuro',
  calculo: 'error de cálculo',
  cifras: 'cifras significativas',
  incompleto: 'respuesta incompleta',
  regla: 'regla incumplida',
  concepto: 'error conceptual',
  formato: 'formato no interpretable',
};

/** Competencias de un paso: las declaradas o las propias de su tipo de respuesta. */
export function partSkills(p: ExercisePart): SkillId[] {
  if (p.skills?.length) return p.skills;
  switch (p.answer.kind) {
    case 'numeric':
      return ['formula', 'calculo', 'unidades'];
    case 'integer':
      return ['concepto', 'calculo'];
    case 'choice':
      return ['concepto'];
    case 'element':
      return ['concepto'];
    case 'config':
    case 'quantum':
      return ['notacion'];
    case 'order':
      return ['razonamiento'];
  }
}

/** Resultado observado en un paso, tal como lo registra el reproductor de ejercicios. */
export interface PartRecord {
  id: string;
  /** Crédito 0–1 (1 al primer intento, 0,5 tras fallar, 0 si se revela o no se resuelve) */
  credit: number;
  attempts: number;
  revealed: boolean;
  /** Errores clasificados en los intentos fallidos */
  errors: { kind: ErrorKind; skill?: SkillId }[];
  /** Se resolvió aplicando bien un resultado previo erróneo */
  carried: boolean;
  /** La respuesta correcta tenía cifras significativas inadecuadas */
  sigFigIssue: boolean;
}

export interface Evidence {
  /** Apartado → resultado medio 0–1 y número de pasos que lo evalúan */
  nodes: Record<string, { y: number; n: number }>;
  /** Competencia → resultado medio 0–1 y número de observaciones */
  skills: Partial<Record<SkillId, { y: number; n: number }>>;
  /** Errores clasificados, con el paso y el apartado en que ocurrieron */
  errors: { kind: ErrorKind; skill?: SkillId; partId: string; nodeIds: string[] }[];
}

const UNIT_LIKE = new Set<ErrorKind>(['unidad-falta', 'unidad-incompatible', 'orden-de-magnitud', 'cifras']);

export function buildEvidence(ex: Exercise, records: PartRecord[]): Evidence {
  const nodes: Evidence['nodes'] = {};
  const skills: Evidence['skills'] = {};
  const errors: Evidence['errors'] = [];
  const addSkill = (k: SkillId, y: number) => {
    const cur = skills[k] ?? { y: 0, n: 0 };
    skills[k] = { y: (cur.y * cur.n + y) / (cur.n + 1), n: cur.n + 1 };
  };
  ex.parts.forEach((part, i) => {
    const r = records.find((x) => x.id === part.id) ?? records[i];
    if (!r) return;
    const partNodes = part.nodeIds?.length ? part.nodeIds : ex.nodeIds;
    const sk = partSkills(part);
    const realErrors = r.errors.filter((e) => e.kind !== 'formato');
    for (const e of realErrors) errors.push({ ...e, partId: part.id, nodeIds: partNodes });
    // Apartados
    let yNode = r.revealed ? 0 : r.credit;
    if (!r.carried && realErrors.length > 0 && realErrors.every((e) => UNIT_LIKE.has(e.kind))) yNode = Math.max(yNode, 0.75);
    for (const n of partNodes) {
      const cur = nodes[n] ?? { y: 0, n: 0 };
      nodes[n] = { y: (cur.y * cur.n + yNode) / (cur.n + 1), n: cur.n + 1 };
    }
    // Competencias
    const failedSkills = new Set<SkillId>(realErrors.map((e) => e.skill).filter((s): s is SkillId => !!s));
    if (r.carried) {
      for (const k of sk) addSkill(k, 1);
    } else if (r.credit >= 1 && !r.revealed) {
      for (const k of sk) addSkill(k, 1);
    } else if (r.credit > 0 && !r.revealed) {
      for (const k of sk) addSkill(k, failedSkills.has(k) ? 0 : 0.5);
      for (const k of failedSkills) if (!sk.includes(k)) addSkill(k, 0);
    } else {
      if (failedSkills.size) for (const k of failedSkills) addSkill(k, 0);
      else addSkill(sk[0]!, 0);
    }
    if (r.sigFigIssue) addSkill('cifras', 0);
  });
  return { nodes, skills, errors };
}
