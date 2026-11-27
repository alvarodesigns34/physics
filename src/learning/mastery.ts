/**
 * Dominio adaptativo (modelo logístico tipo Elo/Rasch) y repaso espaciado (Leitner, 5 cajas).
 */
import type { Difficulty } from './types';

export interface NodeMastery {
  /** Habilidad estimada θ (0 = 50 % de acierto en dificultad media) */
  theta: number;
  attempts: number;
  correct: number;
  lastSeen: number;
  /** Información de Fisher acumulada Σ w·p(1−p): mide cuánta evidencia respalda θ */
  info?: number;
  /** Aciertos «demostrados»: al primer intento, sin pistas y con dificultad ≥ 2 */
  demonstrated?: number;
}

export interface ReviewCard {
  nodeId: string;
  box: 1 | 2 | 3 | 4 | 5;
  due: number;
}

/** Dificultad del ítem en la escala de θ. */
export const ITEM_DIFFICULTY: Record<Difficulty, number> = { 1: -1, 2: 0, 3: 1 };

export function pCorrect(theta: number, difficulty: Difficulty): number {
  return 1 / (1 + Math.exp(-(theta - ITEM_DIFFICULTY[difficulty])));
}

export function initialMastery(): NodeMastery {
  return { theta: THETA_PRIOR, attempts: 0, correct: 0, lastSeen: 0 };
}

/**
 * Actualiza θ tras un intento. Las pistas reducen la ganancia (0, 1, 2 o 3 pistas → 100 %, 70 %, 45 %, 25 %).
 * K decrece con el número de intentos para estabilizar la estimación.
 */
export function updateMastery(m: NodeMastery, difficulty: Difficulty, correct: boolean, hintsUsed: number, now: number): NodeMastery {
  return updateMasteryY(m, difficulty, correct ? 1 : 0, hintsUsed, now);
}

/**
 * Modelo 3PL con discriminación 1: P(θ) = c + (1 − c)·s, con s = σ(θ − b).
 *
 * Derivación (y ∈ [0, 1] como resultado fraccionario de Bernoulli):
 *   ℓ(θ) = y·ln P + (1 − y)·ln(1 − P)
 *   dP/dθ = (1 − c)·s·(1 − s)        y        1 − P = (1 − c)·(1 − s)
 *   dℓ/dθ = (y − P)·(dP/dθ) / [P·(1 − P)] = (y − P)·s / P
 *   I(θ) = (dP/dθ)² / [P·(1 − P)] = (1 − c)·s²·(1 − s) / P
 * Con c = 0 se recupera el modelo de Rasch: dℓ/dθ = y − s, I = s·(1 − s).
 * (Corrección de la auditoría de ATOM 4.0: el gradiente llevaba un factor (1 − c) de más y solo se
 * aplicaba a los aciertos; la información llevaba (1 − c)³.) Verificado numéricamente en model5.test.ts.
 */
export function p3pl(theta: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-(theta - b)));
}
export function loglik3pl(theta: number, b: number, c: number, y: number): number {
  const P = p3pl(theta, b, c);
  return y * Math.log(P) + (1 - y) * Math.log(1 - P);
}
export function grad3pl(theta: number, b: number, c: number, y: number): number {
  const s = 1 / (1 + Math.exp(-(theta - b)));
  const P = c + (1 - c) * s;
  return ((y - P) * s) / P;
}
export function fisher3pl(theta: number, b: number, c: number): number {
  const s = 1 / (1 + Math.exp(-(theta - b)));
  const P = c + (1 - c) * s;
  return ((1 - c) * s * s * (1 - s)) / P;
}

/**
 * Actualización con resultado continuo y ∈ [0, 1] (crédito parcial de un problema compuesto): un paso de
 * ascenso del gradiente de la log-verosimilitud, Δθ = K·w·(y − P)·s/P, con la ganancia reducida por las
 * pistas cuando el resultado es mejor de lo esperado. Acumula la información de Fisher para expresar la
 * incertidumbre de la estimación.
 */
export function updateMasteryY(m: NodeMastery, difficulty: Difficulty, y: number, hintsUsed: number, now: number, weight = 1, guess = 0): NodeMastery {
  const yy = Math.min(1, Math.max(0, Number.isFinite(y) ? y : 0));
  const w = Math.min(1, Math.max(0, Number.isFinite(weight) ? weight : 0));
  const c = Math.min(0.9, Math.max(0, Number.isFinite(guess) ? guess : 0));
  const b = ITEM_DIFFICULTY[difficulty];
  const P = p3pl(m.theta, b, c);
  const K = Math.max(0.35, 1.2 / Math.sqrt(1 + m.attempts / 3));
  const hintFactor = [1, 0.7, 0.45, 0.25][Math.min(3, Math.max(0, hintsUsed))]!;
  const g = grad3pl(m.theta, b, c, yy);
  const delta = K * w * (yy > P ? hintFactor : 1) * g;
  const info = (m.info ?? estimatedInfo(m)) + w * fisher3pl(m.theta, b, c);
  return {
    theta: Math.max(-3, Math.min(3, m.theta + delta)),
    attempts: m.attempts + 1,
    correct: m.correct + (yy >= 0.999 ? 1 : 0),
    lastSeen: now,
    info,
    demonstrated: (m.demonstrated ?? 0) + (yy >= 0.999 && hintsUsed === 0 && difficulty >= 2 && c < 0.2 && w >= 1 ? 1 : 0),
  };
}

/** Información aproximada para registros antiguos (sin campo info). */
export function estimatedInfo(m: NodeMastery): number {
  return m.attempts * 0.2;
}

export type EvidenceLevel = 'sin-datos' | 'escasa' | 'moderada' | 'solida';

export interface MasteryEstimate {
  /** Probabilidad estimada de acertar un ítem de dificultad media (%) */
  mid: number;
  /** Intervalo aproximado (±1 error típico), en % redondeado a 5 */
  low: number;
  high: number;
  evidence: EvidenceLevel;
  demonstrated: number;
}

/**
 * Estimación con su incertidumbre. Error típico de θ ≈ 1/√(I + I₀), con I₀ = 0,6 como información a priori.
 * Se redondea a múltiplos de 5 para no transmitir una precisión que el modelo no tiene.
 */
/** θ a priori (antes de cualquier evidencia). */
export const THETA_PRIOR = -0.5;
/** Información a priori I₀: cuánto «pesa» el punto de partida frente a la evidencia acumulada. */
export const PRIOR_INFO = 0.6;

/**
 * θ que se MUESTRA: contracción hacia el a priori según la evidencia, θ̂ = θ₀ + (θ − θ₀)·I/(I + I₀).
 * Con un solo acierto difícil no se muestra un dominio alto (hallazgo de la auditoría de ATOM 3.0:
 * inflación de las estimaciones con poca evidencia).
 */
export function displayTheta(m: NodeMastery): number {
  const info = m.info ?? estimatedInfo(m);
  return THETA_PRIOR + (m.theta - THETA_PRIOR) * (info / (info + PRIOR_INFO));
}

export function masteryEstimate(m: NodeMastery | undefined): MasteryEstimate {
  if (!m || m.attempts === 0) return { mid: 0, low: 0, high: 0, evidence: 'sin-datos', demonstrated: 0 };
  const info = m.info ?? estimatedInfo(m);
  const se = 1 / Math.sqrt(info + PRIOR_INFO);
  const t = displayTheta(m);
  const r5 = (x: number) => Math.round(x * 20) * 5;
  const evidence: EvidenceLevel = m.attempts < 3 || se > 1 ? 'escasa' : se > 0.6 ? 'moderada' : 'solida';
  return { mid: r5(pCorrect(t, 2)), low: r5(pCorrect(t - se, 2)), high: r5(pCorrect(t + se, 2)), evidence, demonstrated: m.demonstrated ?? 0 };
}

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = { 'sin-datos': 'sin datos', escasa: 'evidencia escasa', moderada: 'evidencia moderada', solida: 'evidencia sólida' };

/** Dominio mostrado al alumno: probabilidad de acertar un ítem de dificultad media. */
export function masteryPercent(m: NodeMastery | undefined): number {
  if (!m || m.attempts === 0) return 0;
  return Math.round(pCorrect(displayTheta(m), 2) * 100);
}

export type MasteryLevel = 'sin-datos' | 'iniciado' | 'en-progreso' | 'dominado';

export function masteryLevel(m: NodeMastery | undefined): MasteryLevel {
  if (!m || m.attempts === 0) return 'sin-datos';
  const p = masteryPercent(m);
  // «Dominado» exige además algún acierto demostrado (primer intento, sin pistas, dificultad ≥ 2) en registros nuevos.
  if (p >= 80 && m.attempts >= 3 && (m.demonstrated === undefined || m.demonstrated >= 1)) return 'dominado';
  if (p >= 50) return 'en-progreso';
  return 'iniciado';
}

/** Elige la dificultad cuya probabilidad de acierto esté más cerca de 0,7 (zona de desafío). */
export function chooseDifficulty(theta: number, available: Difficulty[]): Difficulty {
  let best = available[0]!;
  let bestGap = Infinity;
  for (const d of available) {
    const gap = Math.abs(pCorrect(theta, d) - 0.7);
    if (gap < bestGap) {
      best = d;
      bestGap = gap;
    }
  }
  return best;
}

const DAY = 86_400_000;
export const BOX_INTERVAL_DAYS: Record<ReviewCard['box'], number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

/** Actualiza una tarjeta de repaso: acierto → sube de caja; fallo → vuelve a la caja 1. */
/**
 * Repetición espaciada (cajas de Leitner) graduada por la CALIDAD de la evidencia (ATOM 4.0):
 * - fallo → caja 1 (mañana);
 * - acierto demostrado (respuesta abierta, primer intento, sin ayuda) → sube una caja;
 * - acierto con ayuda, autoevaluado o que pudo ser casual → se mantiene la caja y se reprograma con su
 *   intervalo: no se ha demostrado recuerdo autónomo, así que no se alarga el intervalo; tampoco se
 *   castiga como un fallo.
 */
export function updateCard(card: ReviewCard | undefined, nodeId: string, correct: boolean, now: number, kind: 'demostrada' | 'posible-azar' | 'asistida' | 'autoevaluada' = 'demostrada'): ReviewCard {
  if (!correct) return { nodeId, box: 1, due: now + DAY };
  const promote = kind === 'demostrada';
  if (!card) {
    const box = promote ? 2 : 1;
    return { nodeId, box, due: now + BOX_INTERVAL_DAYS[box] * DAY };
  }
  const box = (promote ? Math.min(5, card.box + 1) : card.box) as ReviewCard['box'];
  return { nodeId, box, due: now + BOX_INTERVAL_DAYS[box] * DAY };
}

export function dueCards(cards: Record<string, ReviewCard>, now: number): ReviewCard[] {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due);
}
