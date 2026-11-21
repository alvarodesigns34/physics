/**
 * Selección adaptativa del siguiente ejercicio y construcción de exámenes.
 */
import { mulberry32 } from '../science/numbers';
import { chooseDifficulty, dueCards, initialMastery, type NodeMastery, type ReviewCard } from './mastery';
import { COVERED_NODES, generatorsForNode, SOURCE_EXERCISES } from './registry';
import type { Difficulty, Exercise } from './types';

export interface SelectionState {
  mastery: Record<string, NodeMastery>;
  cards: Record<string, ReviewCard>;
  /** Ids de generador de los últimos ejercicios (para no repetir) */
  recent: string[];
  /** Nodos fallados en esta sesión pendientes de reintroducir: nodeId → ejercicios restantes de espera */
  sessionRetry: Record<string, number>;
}

export interface Selection {
  exercise: Exercise;
  nodeId: string;
  reason: 'repaso' | 'reintento' | 'dominio' | 'fuente';
}

function randomSeed(rng: () => number): number {
  return Math.floor(rng() * 1e9);
}

/**
 * Elige el siguiente ejercicio dentro de `scope` (ids de nodo; vacío = todos los cubiertos).
 * Prioridad: reintento en sesión → repaso vencido → nodo con menor dominio.
 */
export function selectNext(state: SelectionState, scope: string[], now: number, seed = Date.now()): Selection {
  const rng = mulberry32(seed);
  const nodes = (scope.length ? scope : COVERED_NODES).filter((n) => generatorsForNode(n).length > 0);
  if (nodes.length === 0) throw new Error('No hay ejercicios para el ámbito elegido');

  let nodeId: string | undefined;
  let reason: Selection['reason'] = 'dominio';

  const retry = Object.entries(state.sessionRetry).find(([n, wait]) => wait <= 0 && nodes.includes(n));
  if (retry) {
    nodeId = retry[0];
    reason = 'reintento';
  }
  if (!nodeId) {
    const due = dueCards(state.cards, now).find((c) => nodes.includes(c.nodeId));
    if (due) {
      nodeId = due.nodeId;
      reason = 'repaso';
    }
  }
  if (!nodeId) {
    // Menor θ; desempate aleatorio y penalización por haberlo visto hace poco.
    const scored = nodes.map((n) => {
      const m = state.mastery[n] ?? initialMastery();
      const recency = m.lastSeen ? Math.max(0, 1 - (now - m.lastSeen) / 120_000) : 0;
      return { n, score: m.theta + recency * 0.8 + rng() * 0.3 };
    });
    scored.sort((a, b) => a.score - b.score);
    nodeId = scored[0]!.n;
  }

  const gens = generatorsForNode(nodeId);
  const fresh = gens.filter((g) => !state.recent.slice(-2).includes(g.id));
  const gen = (fresh.length ? fresh : gens)[Math.floor(rng() * (fresh.length ? fresh.length : gens.length))]!;
  const theta = (state.mastery[nodeId] ?? initialMastery()).theta;
  const difficulty: Difficulty = chooseDifficulty(theta, gen.difficulties);
  return { exercise: gen.create(randomSeed(rng), difficulty), nodeId, reason };
}

/** Examen: reparte `count` ejercicios entre los nodos del ámbito, mezclando ejercicios de las fuentes. */
export function buildExam(scope: string[], count: number, seed: number): Exercise[] {
  const rng = mulberry32(seed);
  const nodes = (scope.length ? scope : COVERED_NODES).filter((n) => generatorsForNode(n).length > 0);
  const out: Exercise[] = [];
  const usedGen = new Map<string, number>();
  const sources = SOURCE_EXERCISES.filter((s) => s.nodeIds.some((n) => nodes.includes(n)));
  const shuffledNodes = [...nodes].sort(() => rng() - 0.5);
  let i = 0;
  while (out.length < count && i < count * 4) {
    if (sources.length && rng() < 0.3) {
      const s = sources[Math.floor(rng() * sources.length)]!;
      const ex = s.build();
      if (!out.some((e) => e.id === ex.id)) out.push(ex);
    } else {
      const node = shuffledNodes[i % shuffledNodes.length]!;
      const gens = generatorsForNode(node).sort((a, b) => (usedGen.get(a.id) ?? 0) - (usedGen.get(b.id) ?? 0));
      const gen = gens[0]!;
      usedGen.set(gen.id, (usedGen.get(gen.id) ?? 0) + 1);
      const diffs = gen.difficulties;
      const difficulty = diffs.includes(2) ? 2 : diffs[diffs.length - 1]!;
      out.push(gen.create(randomSeed(rng), rng() < 0.25 && diffs.includes(3) ? 3 : difficulty));
    }
    i++;
  }
  return out.slice(0, count);
}
