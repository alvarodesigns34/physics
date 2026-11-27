/**
 * Selección adaptativa del siguiente ejercicio y construcción de exámenes.
 */
import { mulberry32 } from '../science/numbers';
import { chooseDifficulty, dueCards, EVIDENCE_LABEL, initialMastery, masteryEstimate, type NodeMastery, type ReviewCard } from './mastery';
import { recommend, type AttemptLike } from './diagnosis';
import { nodeTitle } from './syllabus';
import type { SkillId } from './types';
import { COVERED_NODES, GENERATOR_BY_ID, generatorsForNode, SOURCE_EXERCISES } from './registry';
import type { Difficulty, Exercise } from './types';

export interface SelectionState {
  mastery: Record<string, NodeMastery>;
  cards: Record<string, ReviewCard>;
  /** Ids de generador de los últimos ejercicios (para no repetir) */
  recent: string[];
  /** Nodos fallados en esta sesión pendientes de reintroducir: nodeId → ejercicios restantes de espera */
  sessionRetry: Record<string, number>;
  /** Historial con errores clasificados y dominio por competencia (para el diagnóstico) */
  history?: AttemptLike[];
  skills?: Partial<Record<SkillId, NodeMastery>>;
}

export interface Selection {
  exercise: Exercise;
  nodeId: string;
  reason: 'repaso' | 'reintento' | 'dominio' | 'fuente' | 'competencia' | 'prerrequisito';
  /** Por qué se recomienda esta actividad, con los datos que lo justifican */
  explanation: string;
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
  let explanation = '';

  const retry = Object.entries(state.sessionRetry).find(([n, wait]) => wait <= 0 && nodes.includes(n));
  if (retry) {
    nodeId = retry[0];
    reason = 'reintento';
    explanation = `Fallaste «${nodeTitle(nodeId)}» hace unos ejercicios: vuelve con datos nuevos para comprobar que ya lo dominas.`;
  }
  if (!nodeId) {
    const due = dueCards(state.cards, now).find((c) => nodes.includes(c.nodeId));
    if (due) {
      nodeId = due.nodeId;
      reason = 'repaso';
      const days = Math.max(1, Math.round((now - (state.mastery[due.nodeId]?.lastSeen ?? now)) / 86_400_000));
      explanation = `Repaso programado de «${nodeTitle(nodeId)}»: lo practicaste hace ${days} día${days === 1 ? '' : 's'} (caja ${due.box} de 5). Recuperarlo de memoria ahora lo consolida.`;
    }
  }
  if (!nodeId && state.history?.length) {
    const rec = recommend(state.history, state.mastery, state.skills ?? {}, scope.length ? nodes : null);
    const target = rec?.nodeIds.find((n) => nodes.includes(n) && generatorsForNode(n).length > 0);
    // Práctica intercalada: la recomendación se sigue en ~2 de cada 3 ejercicios, no en todos.
    if (rec && target && rng() < 0.65) {
      nodeId = target;
      reason = rec.reason;
      explanation = rec.message;
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
    const est = masteryEstimate(state.mastery[nodeId]);
    explanation =
      est.evidence === 'sin-datos'
        ? `Aún no has practicado «${nodeTitle(nodeId)}»: es el siguiente apartado sin evidencia de tu ámbito.`
        : `«${nodeTitle(nodeId)}» es el apartado con menor dominio estimado de tu ámbito (${est.low}–${est.high} %, ${EVIDENCE_LABEL[est.evidence]}).`;
  }

  const gens = generatorsForNode(nodeId);
  const fresh = gens.filter((g) => !state.recent.slice(-2).includes(g.id));
  const gen = (fresh.length ? fresh : gens)[Math.floor(rng() * (fresh.length ? fresh.length : gens.length))]!;
  const theta = (state.mastery[nodeId] ?? initialMastery()).theta;
  const difficulty: Difficulty = chooseDifficulty(theta, gen.difficulties);
  return { exercise: gen.create(randomSeed(rng), difficulty), nodeId, reason, explanation };
}

/**
 * ¿Pertenece un ejercicio (o generador) al ámbito? Todos sus apartados deben estar en el ámbito, para no
 * colar contenido ajeno en un examen por bloques.
 */
function within(nodeIds: string[], scope: Set<string>): boolean {
  return nodeIds.length > 0 && nodeIds.every((n) => scope.has(n));
}

/**
 * Examen reproducible (misma semilla → mismo examen): reparte `count` ejercicios entre los apartados del
 * ámbito en orden barajado (Fisher–Yates), equilibra los generadores y mezcla ejercicios de los apuntes.
 * Solo incluye ejercicios cuyos apartados pertenecen por completo al ámbito.
 */
export interface ExamBuild {
  exercises: Exercise[];
  requested: number;
  /** Explicación cuando no se alcanza el número pedido (ámbito con pocos ejercicios distintos) */
  limitation?: string;
}

/**
 * Examen de un ámbito: solo ejercicios cuyos apartados están TODOS dentro del ámbito. Mezcla ejercicios de
 * los documentos (≈30 %) y generadores, rota entre generadores y no repite enunciados. Si el ámbito no
 * permite llegar al número pedido, lo dice en `limitation` en lugar de devolver menos preguntas en silencio.
 */
export function buildExamDetailed(scope: string[], count: number, seed: number): ExamBuild {
  const rng = mulberry32(seed);
  const scopeSet = new Set(scope.length ? scope : COVERED_NODES);
  // Las preguntas de desarrollo se autoevalúan después de verlas resueltas: no encajan en un examen cronometrado.
  const gens = [...new Map([...scopeSet].flatMap((n) => generatorsForNode(n)).filter((g) => g.id !== 'desarrollo' && within(g.nodeIds, scopeSet)).map((g) => [g.id, g])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const sources = SOURCE_EXERCISES.filter((s) => within(s.nodeIds, scopeSet));
  if (gens.length === 0 && sources.length === 0) throw new Error('No hay ejercicios para el ámbito elegido');
  const out: Exercise[] = [];
  const seen = new Set<string>();
  const usedGen = new Map<string, number>();
  const usedSrc = new Set<string>();
  const push = (ex: Exercise) => {
    const key = `${ex.generatorId}|${ex.statement}|${ex.parts.map((p) => p.prompt).join('|')}`;
    if (seen.has(key) || !within(ex.nodeIds, scopeSet)) return false;
    seen.add(key);
    out.push(ex);
    return true;
  };
  // Orden de generadores barajado (reproducible) y rotación por uso.
  const genOrder = shuffle(rng, gens);
  const srcOrder = shuffle(rng, sources);
  let attempts = 0;
  const MAX = Math.max(200, count * 40);
  while (out.length < count && attempts < MAX) {
    attempts++;
    const freeSrc = srcOrder.filter((s) => !usedSrc.has(s.ref));
    const useSource = freeSrc.length > 0 && (gens.length === 0 || rng() < 0.3);
    if (useSource) {
      const s = freeSrc[0]!;
      usedSrc.add(s.ref);
      push(s.build());
      continue;
    }
    if (!gens.length) break;
    const gen = genOrder.slice().sort((a, b) => (usedGen.get(a.id) ?? 0) - (usedGen.get(b.id) ?? 0))[0]!;
    usedGen.set(gen.id, (usedGen.get(gen.id) ?? 0) + 1);
    const diffs = gen.difficulties;
    const base: Difficulty = diffs.includes(2) ? 2 : diffs[diffs.length - 1]!;
    const difficulty: Difficulty = rng() < 0.25 && diffs.includes(3) ? 3 : base;
    push(gen.create(randomSeed(rng), difficulty));
  }
  const exercises = out.slice(0, count);
  const limitation =
    exercises.length < count
      ? `El ámbito elegido solo admite ${exercises.length} ejercicio${exercises.length === 1 ? '' : 's'} distinto${exercises.length === 1 ? '' : 's'} (de ${count} pedidos): amplía los apartados o reduce el número de preguntas.`
      : undefined;
  return { exercises, requested: count, limitation };
}

/** Compatibilidad: solo los ejercicios. Usa buildExamDetailed para conocer limitaciones. */
export function buildExam(scope: string[], count: number, seed: number): Exercise[] {
  return buildExamDetailed(scope, count, seed).exercises;
}

/** Barajado de Fisher–Yates con un generador pseudoaleatorio reproducible (distribución uniforme). */
export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [a[k], a[j]] = [a[j]!, a[k]!];
  }
  return a;
}

/**
 * Examen tipo: la estructura habitual de una prueba de 1.º de Bachillerato sobre el tema.
 * Cinco problemas compuestos (uno por gran bloque) y tres cuestiones teóricas.
 */
export const MOCK_EXAM_PLAN: { generator: string; difficulty: Difficulty; points: number }[] = [
  { generator: 'examen-masa-iones', difficulty: 2, points: 1.5 },
  { generator: 'historia', difficulty: 1, points: 1 },
  { generator: 'examen-ondas', difficulty: 2, points: 1.5 },
  { generator: 'examen-espectro', difficulty: 3, points: 2 },
  { generator: 'cuantica-conceptos', difficulty: 1, points: 0.5 },
  { generator: 'examen-cuantico', difficulty: 2, points: 1.5 },
  { generator: 'examen-elementos', difficulty: 3, points: 1.5 },
  { generator: 'conceptos-varios', difficulty: 1, points: 0.5 },
];

export function buildMockExam(seed: number): Exercise[] {
  const rng = mulberry32(seed);
  return MOCK_EXAM_PLAN.map(({ generator, difficulty }) => {
    const gen = GENERATOR_BY_ID.get(generator);
    if (!gen) throw new Error(`Generador desconocido: ${generator}`);
    const d = gen.difficulties.includes(difficulty) ? difficulty : gen.difficulties[gen.difficulties.length - 1]!;
    return gen.create(randomSeed(rng), d);
  });
}
