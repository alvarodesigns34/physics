/**
 * ATOM 4.0 · Simulacro profesional (lógica pura).
 *
 * - La sesión guarda SOLO identificadores de ejercicio y respuestas: se puede guardar automáticamente en
 *   el navegador y reconstruir exactamente (los ejercicios son deterministas por id).
 * - Navegación libre: las respuestas no se corrigen hasta entregar.
 * - Corrección al final, secuencial dentro de cada ejercicio (arrastre de errores) y con crédito parcial
 *   por apartado.
 * - Las preguntas sin responder se diagnostican aparte: cuentan 0 en la nota, aparecen en el informe por
 *   apartados como «sin responder» y NO se usan como evidencia de dominio (no responder por falta de
 *   tiempo no demuestra no saber; hallazgo de la auditoría de ATOM 3.0).
 */
import { checkAnswer } from './checker';
import { checkProcedure, procedureCheckpoints, type ProcedureReport } from './procedure';
import { buildEvidence, type PartRecord } from './evidence';
import { GENERATOR_BY_ID, SOURCE_EXERCISES } from './registry';
import type { CheckResult, Exercise, ExercisePart } from './types';

export type PartValue = string | string[];

export interface ExamSession {
  version: 1;
  label: string;
  seed: number;
  minutes: number | null;
  startedAt: number;
  exerciseIds: string[];
  points: number[];
  /** exerciseIndex → partId → respuesta */
  answers: Record<number, Record<string, PartValue>>;
  flagged: number[];
  /**
   * Pasos de ordenación cuya respuesta el alumno ha CONFIRMADO (índice de pregunta → ids de paso). Sin
   * esto, un orden inicial que ya coincidiera con el correcto se contaba como «sin responder»
   * (P0 de la auditoría de ATOM 4.0). Mover cualquier elemento también confirma.
   */
  confirmed?: Record<number, string[]>;
  /** Procedimiento escrito por pregunta (opcional): permite crédito parcial y diagnóstico del error */
  procedures?: Record<number, string>;
  current: number;
  finishedAt?: number;
}

let sourceById: Map<string, () => Exercise> | null = null;

/** Reconstruye un ejercicio a partir de su id (generador:dificultad:semilla o id de un ejercicio de los documentos). */
export function exerciseFromId(id: string): Exercise | null {
  const m = id.match(/^([a-z0-9-]+):([123]):(\d+)$/);
  if (m) {
    const g = GENERATOR_BY_ID.get(m[1]!);
    if (g) {
      const d = Number(m[2]) as 1 | 2 | 3;
      if (g.difficulties.includes(d)) {
        const ex = g.create(Number(m[3]), d);
        if (ex.id === id) return ex;
      }
    }
  }
  if (!sourceById) {
    sourceById = new Map();
    for (const s of SOURCE_EXERCISES) sourceById.set(s.build().id, s.build);
  }
  return sourceById.get(id)?.() ?? null;
}

export function newSession(label: string, exercises: Exercise[], points: number[], minutes: number | null, seed: number, now = Date.now()): ExamSession {
  return { version: 1, label, seed, minutes, startedAt: now, exerciseIds: exercises.map((e) => e.id), points, answers: {}, flagged: [], current: 0 };
}

/** ¿Se ha escrito algo en este apartado? */
export function isAnswered(p: ExercisePart, v: PartValue | undefined, confirmed = false): boolean {
  if (p.answer.kind === 'order') return confirmed || (Array.isArray(v) && v.length > 0 && (v as string[]).join() !== p.answer.items.map((i) => i.id).join());
  if (v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0 && v.some((x) => String(x).trim() !== '');
  return v.trim() !== '';
}

export type QuestionState = 'sin-responder' | 'parcial' | 'respondida';

export function questionState(ex: Exercise, answers: Record<string, PartValue> | undefined, confirmed: string[] = []): QuestionState {
  const n = ex.parts.filter((p) => isAnswered(p, answers?.[p.id], confirmed.includes(p.id))).length;
  return n === 0 ? 'sin-responder' : n < ex.parts.length ? 'parcial' : 'respondida';
}

export interface GradedPart {
  part: ExercisePart;
  value: PartValue | undefined;
  answered: boolean;
  result: CheckResult;
  credit: number;
  /** Crédito concedido por el procedimiento escrito (el paso estaba mal o en blanco) */
  byProcedure?: boolean;
}

export interface GradedQuestion {
  exercise: Exercise;
  points: number;
  earned: number;
  /** 0–1, media del crédito de los apartados */
  score: number;
  state: QuestionState;
  parts: GradedPart[];
  records: PartRecord[];
  procedure?: ProcedureReport;
}

/** Corrige un ejercicio: secuencial (arrastre de errores), crédito 1 o 0 por apartado, sin pistas. */
/** Crédito de un paso numérico mal escrito (o en blanco) cuyo valor correcto SÍ aparece en el procedimiento. */
export const PROCEDURE_CREDIT = 0.75;

export function gradeQuestion(ex: Exercise, answers: Record<string, PartValue> | undefined, points: number, confirmed: string[] = [], procedureText = ''): GradedQuestion {
  const prev: Record<string, number> = {};
  const spec = procedureText.trim() ? procedureCheckpoints(ex) : null;
  const procedure = spec ? checkProcedure(procedureText, spec.checkpoints, spec.final) : undefined;
  const parts: GradedPart[] = ex.parts.map((p) => {
    const value = answers?.[p.id] ?? (p.answer.kind === 'order' && confirmed.includes(p.id) ? p.answer.items.map((x) => x.id) : undefined);
    const answered = isAnswered(p, value, confirmed.includes(p.id));
    const input = value ?? (p.answer.kind === 'choice' ? [] : '');
    const result = answered ? checkAnswer(p.answer, input, { previousWrong: { ...prev } }) : ({ status: 'vacio', correct: false, message: 'Sin responder.', warnings: [] } as CheckResult);
    if (answered && (!result.correct || result.status === 'correcto-arrastre') && result.numericValue !== undefined) prev[p.id] = result.numericValue;
    // Desarrollo en examen: no se autoevalúa durante la prueba → sin crédito automático (se excluye de los simulacros).
    let credit = result.credit ?? (result.correct ? 1 : 0);
    // Crédito por procedimiento: el alumno calculó bien el valor del paso en su procedimiento, pero lo
    // trasladó mal (o no lo escribió) en la respuesta. Es un error de transcripción, no de comprensión.
    const byProcedure = !result.correct && p.answer.kind === 'numeric' && !!procedure?.reached.includes(p.prompt);
    if (byProcedure) credit = Math.max(credit, PROCEDURE_CREDIT);
    return { part: p, value, answered: answered || byProcedure, result, credit, byProcedure };
  });
  const score = parts.reduce((a, x) => a + x.credit, 0) / Math.max(1, parts.length);
  const records: PartRecord[] = parts.map((g) => ({
    id: g.part.id,
    credit: g.credit,
    attempts: g.answered ? 1 : 0,
    revealed: false,
    errors: g.answered && !g.result.correct && g.result.errorKind ? [{ kind: g.result.errorKind, skill: g.result.errorSkill, valueCorrect: g.result.valueCorrect }, ...(g.result.secondary ?? [])] : g.answered ? [] : [{ kind: 'incompleto' as const }],
    carried: g.result.status === 'correcto-arrastre',
    sigFigIssue: g.result.correct && g.result.errorKind === 'cifras',
    sigFigsAssessed: g.result.correct ? g.result.sigFigsAssessed : undefined,
  }));
  return { exercise: ex, points, earned: score * points, score, state: questionState(ex, answers, confirmed), parts, records, procedure };
}

export interface ExamReport {
  questions: GradedQuestion[];
  /** Nota sobre 10 */
  grade: number;
  totalPoints: number;
  earnedPoints: number;
  answered: number;
  partial: number;
  unanswered: number;
  /** Apartado → evidencia de lo RESPONDIDO (ok/total) y número de pasos sin responder */
  byNode: Record<string, { ok: number; total: number; unanswered: number }>;
  /**
   * Causa probable de cada pregunta sin responder (ATOM 5.0), según su posición:
   * - 'tiempo': está después de la última pregunta con respuesta, el patrón de quedarse sin tiempo;
   * - 'omitida': hay preguntas respondidas después, así que se saltó (posible desconocimiento o bloqueo).
   * Es una inferencia por posición, no una certeza, y así se presenta.
   */
  unansweredCause: Record<number, 'tiempo' | 'omitida'>;
}

export function unansweredCauses(states: QuestionState[]): Record<number, 'tiempo' | 'omitida'> {
  const lastAnswered = states.reduce((a, st, i) => (st !== 'sin-responder' ? i : a), -1);
  const out: Record<number, 'tiempo' | 'omitida'> = {};
  states.forEach((st, i) => {
    if (st === 'sin-responder') out[i] = i > lastAnswered ? 'tiempo' : 'omitida';
  });
  return out;
}

export function gradeSession(session: ExamSession, exercises: Exercise[]): ExamReport {
  const questions = exercises.map((ex, i) => gradeQuestion(ex, session.answers[i], session.points[i] ?? 1, session.confirmed?.[i] ?? [], session.procedures?.[i] ?? ''));
  const totalPoints = questions.reduce((a, q) => a + q.points, 0);
  const earnedPoints = questions.reduce((a, q) => a + q.earned, 0);
  const byNode: ExamReport['byNode'] = {};
  for (const q of questions) {
    // Pasos respondidos → evidencia granular; pasos sin responder → recuento aparte.
    const answeredIdx = q.parts.map((p, k) => (p.answered ? k : -1)).filter((k) => k >= 0);
    if (answeredIdx.length) {
      const sub: Exercise = { ...q.exercise, parts: answeredIdx.map((k) => q.exercise.parts[k]!) };
      const ev = buildEvidence(sub, answeredIdx.map((k) => q.records[k]!));
      for (const [n, v] of Object.entries(ev.nodes)) {
        const cur = byNode[n] ?? { ok: 0, total: 0, unanswered: 0 };
        byNode[n] = { ...cur, ok: cur.ok + v.y * v.n, total: cur.total + v.n };
      }
    }
    q.parts.forEach((p) => {
      if (p.answered) return;
      for (const n of p.part.nodeIds?.length ? p.part.nodeIds : q.exercise.nodeIds) {
        const cur = byNode[n] ?? { ok: 0, total: 0, unanswered: 0 };
        byNode[n] = { ...cur, unanswered: cur.unanswered + 1 };
      }
    });
  }
  return {
    questions,
    grade: totalPoints ? (earnedPoints / totalPoints) * 10 : 0,
    totalPoints,
    earnedPoints,
    answered: questions.filter((q) => q.state === 'respondida').length,
    partial: questions.filter((q) => q.state === 'parcial').length,
    unanswered: questions.filter((q) => q.state === 'sin-responder').length,
    byNode,
    unansweredCause: unansweredCauses(questions.map((q) => q.state)),
  };
}

/** Validación de una sesión guardada (localStorage puede estar dañado o ser de otra versión). */
export function isValidSession(v: unknown): v is ExamSession {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Partial<ExamSession>;
  return (
    s.version === 1 &&
    typeof s.label === 'string' &&
    Number.isFinite(s.seed) &&
    (s.minutes === null || (typeof s.minutes === 'number' && s.minutes > 0 && s.minutes <= 300)) &&
    Number.isFinite(s.startedAt) &&
    Array.isArray(s.exerciseIds) && s.exerciseIds.length > 0 && s.exerciseIds.length <= 40 && s.exerciseIds.every((x) => typeof x === 'string') &&
    Array.isArray(s.points) && s.points.length === s.exerciseIds.length && s.points.every((x) => typeof x === 'number' && x >= 0) &&
    typeof s.answers === 'object' && s.answers !== null &&
    Array.isArray(s.flagged) &&
    (s.procedures === undefined || (typeof s.procedures === 'object' && s.procedures !== null && !Array.isArray(s.procedures) && Object.values(s.procedures).every((x) => typeof x === 'string' && x.length <= 5000))) &&
    (s.confirmed === undefined || (typeof s.confirmed === 'object' && s.confirmed !== null && !Array.isArray(s.confirmed) && Object.values(s.confirmed).every((x) => Array.isArray(x) && x.every((y) => typeof y === 'string')))) &&
    Number.isInteger(s.current)
  );
}
