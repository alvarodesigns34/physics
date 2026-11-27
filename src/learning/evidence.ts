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
 * - Error exclusivamente de unidades con el número correcto, o de cifras → el apartado conserva 0,75
 *   (0,5 si es de potencia de 10); sin valor correcto no hay suelo (véase nodeFloor). Solo aplica si el
 *   paso acabó resolviéndose: un paso revelado o sin resolver no demuestra comprensión.
 * - Cifras significativas: evidencia positiva y negativa simétricas, solo si la respuesta permitía evaluarlas.
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
    case 'essay':
      return ['razonamiento', 'concepto'];
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
  errors: { kind: ErrorKind; skill?: SkillId; valueCorrect?: boolean }[];
  /** Se resolvió aplicando bien un resultado previo erróneo */
  carried: boolean;
  /** La respuesta correcta tenía cifras significativas inadecuadas */
  sigFigIssue: boolean;
  /**
   * Las cifras significativas se pudieron evaluar en la respuesta correcta (criterio definido y número no
   * ambiguo). Solo entonces hay evidencia —positiva o negativa— sobre la competencia «cifras».
   */
  sigFigsAssessed?: boolean;
}

/** Cómo se obtuvo la evidencia de un apartado (ATOM 4.0): no todo acierto demuestra lo mismo. */
export type EvidenceKind = 'demostrada' | 'posible-azar' | 'asistida' | 'autoevaluada';

export interface NodeEvidence {
  /** Resultado medio 0–1 */
  y: number;
  /** Pasos que lo evalúan */
  n: number;
  /** Probabilidad media de acertar adivinando (1/opciones en preguntas cerradas; 0 en respuestas abiertas) */
  guess: number;
  /** Tipo de evidencia dominante del apartado en este ejercicio */
  kind: EvidenceKind;
}

/** Peso de cada tipo de evidencia en el modelo de dominio (documentado en docs/09). */
export const EVIDENCE_WEIGHT: Record<EvidenceKind, number> = { demostrada: 1, 'posible-azar': 1, asistida: 0.6, autoevaluada: 0.4 };

export const EVIDENCE_KIND_LABEL: Record<EvidenceKind, string> = {
  demostrada: 'comprensión demostrada',
  'posible-azar': 'acierto que pudo ser casual',
  asistida: 'respuesta con ayuda',
  autoevaluada: 'autoevaluación',
};

/** Probabilidad de acertar un paso al azar. */
export function guessChance(p: ExercisePart): number {
  const a = p.answer;
  if (a.kind === 'choice') {
    const k = a.options.length;
    if (!a.multiple) return k > 0 ? 1 / k : 0;
    // Marcar exactamente el subconjunto correcto entre 2^k posibles.
    return k > 0 ? 1 / Math.pow(2, k) : 0;
  }
  if (a.kind === 'order') {
    let f = 1;
    for (let i = 2; i <= a.items.length; i++) f *= i;
    return 1 / f;
  }
  return 0;
}

export interface Evidence {
  /** Apartado → resultado medio 0–1 y número de pasos que lo evalúan */
  nodes: Record<string, NodeEvidence>;
  /** Competencia → resultado medio 0–1 y número de observaciones */
  skills: Partial<Record<SkillId, { y: number; n: number }>>;
  /** Errores clasificados, con el paso y el apartado en que ocurrieron */
  errors: { kind: ErrorKind; skill?: SkillId; partId: string; nodeIds: string[] }[];
}

/**
 * Suelo de evidencia sobre el apartado cuando TODOS los errores del paso son de este tipo. Solo se concede
 * cuando el error deja intacta la prueba de comprensión del tema:
 * - «unidad-falta» con el número correcto en la unidad pedida → 0,75 (sin el valor correcto no hay suelo);
 * - «orden-de-magnitud»: cifras correctas, potencia de 10 errónea; lo más probable es una conversión,
 *   pero también podría ser una fórmula equivocada → 0,5;
 * - «cifras» → 0,75 (el valor es correcto).
 * «unidad-incompatible» no aporta información sobre el valor → sin suelo.
 */
function nodeFloor(e: { kind: ErrorKind; valueCorrect?: boolean }): number {
  switch (e.kind) {
    case 'unidad-falta':
      return e.valueCorrect ? 0.75 : 0;
    case 'orden-de-magnitud':
      return 0.5;
    case 'cifras':
      return 0.75;
    default:
      return 0;
  }
}

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
    if (!r.carried && !r.revealed && r.credit > 0 && realErrors.length > 0) yNode = Math.max(yNode, Math.min(...realErrors.map(nodeFloor)));
    const g = guessChance(part);
    const partKind: EvidenceKind = part.answer.kind === 'essay' ? 'autoevaluada' : r.revealed || r.attempts > 1 || r.carried ? 'asistida' : g >= 0.2 ? 'posible-azar' : 'demostrada';
    const rank: Record<EvidenceKind, number> = { autoevaluada: 3, asistida: 2, 'posible-azar': 1, demostrada: 0 };
    for (const n of partNodes) {
      const cur = nodes[n] ?? { y: 0, n: 0, guess: 0, kind: 'demostrada' as EvidenceKind };
      nodes[n] = {
        y: (cur.y * cur.n + yNode) / (cur.n + 1),
        n: cur.n + 1,
        guess: (cur.guess * cur.n + g) / (cur.n + 1),
        // El apartado hereda el tipo de evidencia más débil de sus pasos.
        kind: rank[partKind] > rank[cur.kind] ? partKind : cur.kind,
      };
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
    // Cifras significativas: evidencia simétrica, solo cuando la respuesta permitía evaluarlas.
    if (r.sigFigIssue) addSkill('cifras', 0);
    else if (r.sigFigsAssessed && r.credit > 0 && !r.revealed) addSkill('cifras', 1);
  });
  return { nodes, skills, errors };
}

/**
 * Informe por apartados de un conjunto de ejercicios (examen) a partir de la MISMA evidencia granular que
 * alimenta el diagnóstico adaptativo: cada paso puntúa solo en sus apartados, de modo que un fallo en el
 * paso de unidades no rebaja el apartado de configuración del mismo problema. `ok/total` son sumas de
 * evidencia por paso (no de ejercicios completos).
 */
export function aggregateNodeEvidence(results: { exercise: Exercise; parts: PartRecord[] }[]): Record<string, { ok: number; total: number }> {
  const out: Record<string, { ok: number; total: number }> = {};
  for (const { exercise, parts } of results) {
    const ev = buildEvidence(exercise, parts);
    for (const [n, v] of Object.entries(ev.nodes)) {
      const cur = out[n] ?? { ok: 0, total: 0 };
      out[n] = { ok: cur.ok + v.y * v.n, total: cur.total + v.n };
    }
  }
  return out;
}
