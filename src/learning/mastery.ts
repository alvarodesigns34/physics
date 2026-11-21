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
  return { theta: -0.5, attempts: 0, correct: 0, lastSeen: 0 };
}

/**
 * Actualiza θ tras un intento. Las pistas reducen la ganancia (0, 1, 2 o 3 pistas → 100 %, 70 %, 45 %, 25 %).
 * K decrece con el número de intentos para estabilizar la estimación.
 */
export function updateMastery(m: NodeMastery, difficulty: Difficulty, correct: boolean, hintsUsed: number, now: number): NodeMastery {
  const p = pCorrect(m.theta, difficulty);
  const K = Math.max(0.35, 1.2 / Math.sqrt(1 + m.attempts / 3));
  const hintFactor = [1, 0.7, 0.45, 0.25][Math.min(3, hintsUsed)]!;
  const delta = correct ? K * hintFactor * (1 - p) : -K * p;
  return {
    theta: Math.max(-3, Math.min(3, m.theta + delta)),
    attempts: m.attempts + 1,
    correct: m.correct + (correct ? 1 : 0),
    lastSeen: now,
  };
}

/** Dominio mostrado al alumno: probabilidad de acertar un ítem de dificultad media. */
export function masteryPercent(m: NodeMastery | undefined): number {
  if (!m || m.attempts === 0) return 0;
  return Math.round(pCorrect(m.theta, 2) * 100);
}

export type MasteryLevel = 'sin-datos' | 'iniciado' | 'en-progreso' | 'dominado';

export function masteryLevel(m: NodeMastery | undefined): MasteryLevel {
  if (!m || m.attempts === 0) return 'sin-datos';
  const p = masteryPercent(m);
  if (p >= 80 && m.attempts >= 3) return 'dominado';
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
export function updateCard(card: ReviewCard | undefined, nodeId: string, correct: boolean, now: number): ReviewCard {
  if (!correct) return { nodeId, box: 1, due: now + DAY };
  if (!card) return { nodeId, box: 2, due: now + BOX_INTERVAL_DAYS[2] * DAY };
  const box = Math.min(5, card.box + 1) as ReviewCard['box'];
  return { nodeId, box, due: now + BOX_INTERVAL_DAYS[box] * DAY };
}

export function dueCards(cards: Record<string, ReviewCard>, now: number): ReviewCard[] {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.box - b.box || a.due - b.due);
}
