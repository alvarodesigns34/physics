import { mulberry32, formatNumber } from '../../science/numbers';
import type { ChoiceOption, Difficulty, ExercisePart, NumericMisconception, SkillId } from '../types';

export type Rng = () => number;

export function rngFor(generatorId: string, seed: number, difficulty: Difficulty): Rng {
  let h = 2166136261;
  for (const ch of `${generatorId}:${difficulty}:${seed}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return mulberry32(h >>> 0);
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function exId(gen: string, difficulty: Difficulty, seed: number): string {
  return `${gen}:${difficulty}:${seed}`;
}

/** Paso numérico con respuesta canónica formateada. */
export function numericPart(opts: {
  id: string;
  prompt: string;
  value: number;
  unit: string;
  sig?: number;
  explanation: string;
  relTol?: number;
  misconceptions?: NumericMisconception[];
  recompute?: { from: string; fn: (v: number) => number };
  placeholder?: string;
  skills?: SkillId[];
  nodeIds?: string[];
}): ExercisePart {
  const sig = opts.sig ?? 3;
  return {
    id: opts.id,
    prompt: opts.prompt,
    answer: {
      kind: 'numeric',
      value: opts.value,
      unit: opts.unit,
      sigFigs: sig,
      relTol: opts.relTol ?? 0.01,
      misconceptions: opts.misconceptions,
      recompute: opts.recompute,
    },
    canonical: `${formatNumber(opts.value, { sig })}${opts.unit ? ' ' + opts.unit : ''}`,
    explanation: opts.explanation,
    placeholder: opts.placeholder ?? (opts.unit ? `valor y unidad (${opts.unit})` : 'número'),
    ...(opts.skills ? { skills: opts.skills } : {}),
    ...(opts.nodeIds ? { nodeIds: opts.nodeIds } : {}),
  };
}

export function integerPart(id: string, prompt: string, value: number, explanation: string, placeholder = 'número entero'): ExercisePart {
  return { id, prompt, answer: { kind: 'integer', value }, canonical: String(value), explanation, placeholder };
}

export function choicePart(id: string, prompt: string, options: ChoiceOption[], correct: string[], explanation: string, multiple = false): ExercisePart {
  const canonical = options
    .filter((o) => correct.includes(o.id))
    .map((o) => o.text)
    .join(' · ');
  return { id, prompt, answer: { kind: 'choice', options, correct, multiple }, canonical, explanation };
}

/** Formato corto para enunciados. */
export const fmt = (v: number, sig = 4) => formatNumber(v, { sig });
