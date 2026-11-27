/**
 * Selección adaptativa del siguiente ejercicio y construcción de exámenes.
 */
import { mulberry32 } from '../science/numbers';
import { chooseDifficulty, displayTheta, dueCards, estimatedInfo, EVIDENCE_LABEL, initialMastery, masteryEstimate, PRIOR_INFO, type NodeMastery, type ReviewCard } from './mastery';
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
  /** Entradas del cuaderno de errores (ATOM 4.0): las abiertas se reintroducen con variantes nuevas */
  notebook?: { generatorId: string; nodeIds: string[]; title: string; at: number; resolvedAt?: number }[];
}

export interface Selection {
  exercise: Exercise;
  nodeId: string;
  reason: 'repaso' | 'reintento' | 'cuaderno' | 'dominio' | 'fuente' | 'competencia' | 'prerrequisito';
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
  // Cuaderno de errores: una entrada abierta (fallada hace ≥ 10 min, para no repetir en caliente) vuelve
  // como VARIANTE NUEVA del mismo tipo en ~1 de cada 3 ejercicios. Acertarla limpia la supera.
  let notebookGen: string | undefined;
  if (!nodeId && state.notebook?.length) {
    const open = state.notebook
      .filter((e) => !e.resolvedAt && now - e.at >= 10 * 60_000 && GENERATOR_BY_ID.has(e.generatorId) && !state.recent.slice(-2).includes(e.generatorId))
      .filter((e) => e.nodeIds.some((n) => nodes.includes(n)))
      .sort((a, b) => a.at - b.at);
    const e = open[0];
    if (e && rng() < 0.35) {
      nodeId = e.nodeIds.find((n) => nodes.includes(n))!;
      notebookGen = e.generatorId;
      reason = 'cuaderno';
      const mins = Math.round((now - e.at) / 60_000);
      const ago = mins < 60 ? `hace ${mins} min` : mins < 2880 ? `hace ${Math.round(mins / 60)} h` : `hace ${Math.round(mins / 1440)} días`;
      explanation = `En tu cuaderno de errores sigue abierto «${e.title}» (fallado ${ago}). Esta es una variante nueva: si la resuelves al primer intento y sin ayuda, queda superado.`;
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
      // θ mostrado (encogido hacia el prior si hay poca evidencia) y una prima de exploración para los
      // apartados con poca información: un 2/2 en un apartado no debe ocultarlo frente a uno muy medido.
      const info = m.attempts ? (m.info ?? estimatedInfo(m)) : 0;
      const explore = 0.3 * (PRIOR_INFO / (info + PRIOR_INFO));
      return { n, score: (m.attempts ? displayTheta(m) : m.theta) - explore + recency * 0.8 + rng() * 0.3 };
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
  const gen = (notebookGen ? GENERATOR_BY_ID.get(notebookGen) : undefined) ?? (fresh.length ? fresh : gens)[Math.floor(rng() * (fresh.length ? fresh.length : gens.length))]!;
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

// ── Simulacros por perfil (ATOM 3.0) ─────────────────────────────────────
//
// PROPUESTAS de composición basadas en los tipos de ejercicio de los apuntes, la hoja del tema y las
// cuestiones EBAU de La Rioja. No son los criterios oficiales de ningún profesor: la interfaz lo dice.

export interface MockItem {
  /** Generador (ejercicio nuevo) o referencia de un ejercicio de los documentos */
  generator?: string;
  source?: string;
  difficulty: Difficulty;
  points: number;
}

export interface MockProfile {
  id: 'equilibrado' | 'numerico' | 'razonamiento' | 'exigente' | 'ebau' | 'debiles';
  label: string;
  description: string;
  minutes: number;
  plan: MockItem[];
}

export const MOCK_PROFILES: MockProfile[] = [
  { id: 'equilibrado', label: 'Equilibrado', description: 'La estructura más habitual: cinco problemas con apartados (uno por gran bloque) y tres cuestiones teóricas.', minutes: 50, plan: MOCK_EXAM_PLAN },
  {
    id: 'numerico', label: 'Numérico', description: 'Cálculo con unidades de principio a fin: masa atómica, ondas, Rydberg directo e inverso, Bohr y energía de ionización.', minutes: 55,
    plan: [
      { generator: 'examen-masa-iones', difficulty: 2, points: 1.5 },
      { generator: 'examen-ondas', difficulty: 2, points: 1.5 },
      { generator: 'examen-espectro', difficulty: 3, points: 2 },
      { generator: 'serie-inversa', difficulty: 3, points: 1.5 },
      { generator: 'luz-ionizante', difficulty: 2, points: 1.5 },
      { generator: 'nivel-energia', difficulty: 2, points: 1 },
      { generator: 'bohr-proporciones', difficulty: 2, points: 1 },
    ],
  },
  {
    id: 'razonamiento', label: 'Razonamiento', description: 'Interpretar gráficas y datos, deducir elementos, encontrar errores y predecir con los modelos.', minutes: 50,
    plan: [
      { generator: 'grafica-ei', difficulty: 2, points: 1.5 },
      { generator: 'ei-sucesivas', difficulty: 2, points: 1.5 },
      { generator: 'pistas-elemento', difficulty: 2, points: 1.5 },
      { generator: 'error-rydberg', difficulty: 2, points: 1.5 },
      { generator: 'prediccion-modelos', difficulty: 2, points: 1 },
      { generator: 'examen-elementos', difficulty: 3, points: 1.5 },
      { generator: 'estado-configuracion', difficulty: 2, points: 1.5 },
    ],
  },
  {
    id: 'exigente', label: 'Exigente', description: 'Problemas compuestos y multibloque de nivel alto: líneas sin serie, iones misteriosos y luz ionizante.', minutes: 60,
    plan: [
      { generator: 'examen-espectro', difficulty: 3, points: 2 },
      { generator: 'linea-desconocida', difficulty: 3, points: 2 },
      { generator: 'ion-misterioso', difficulty: 3, points: 2 },
      { generator: 'luz-ionizante', difficulty: 3, points: 1.5 },
      { generator: 'ei-sucesivas', difficulty: 3, points: 1.5 },
      { generator: 'examen-elementos', difficulty: 3, points: 1 },
    ],
  },
  {
    id: 'ebau', label: 'Estilo EBAU', description: 'Las cuestiones EBAU de La Rioja del tema (2021 y 2025) y dos problemas del mismo estilo.', minutes: 45,
    plan: [
      { source: 'EBAU-1 (2021) a', difficulty: 2, points: 2 },
      { source: 'EBAU-1 (2021) b', difficulty: 2, points: 1.5 },
      { source: 'EBAU-2 (2025)', difficulty: 2, points: 2 },
      { source: 'EBAU-3 a', difficulty: 2, points: 1.5 },
      { generator: 'examen-cuantico', difficulty: 2, points: 1.5 },
      { generator: 'examen-elementos', difficulty: 3, points: 1.5 },
    ],
  },
];

/** Generador apto para examen que cubre un apartado (prefiere los compuestos, nunca desarrollo). */
function examGeneratorFor(node: string, rng: () => number): string | null {
  const gens = generatorsForNode(node).filter((g) => g.id !== 'desarrollo');
  if (!gens.length) return null;
  const composite = gens.filter((g) => g.id.startsWith('examen-') || g.nodeIds.length >= 2);
  const pool = composite.length ? composite : gens;
  return pool[Math.floor(rng() * pool.length)]!.id;
}

/**
 * Simulacro centrado en los puntos débiles: los apartados con menor dominio estimado (entre los practicados
 * con evidencia). Si hay menos de 3 apartados practicados, no hay base para personalizar: se dice así.
 */
export function weakProfile(mastery: Record<string, NodeMastery>, seed: number): { profile: MockProfile; limitation?: string } {
  const rng = mulberry32(seed ^ 0x5eed);
  const practiced = COVERED_NODES.map((n) => ({ n, e: masteryEstimate(mastery[n]) })).filter((x) => x.e.evidence !== 'sin-datos');
  const limitation = practiced.length < 3 ? 'Aún hay poca evidencia (menos de 3 apartados practicados): este simulacro combina tus apartados débiles con los aún no practicados.' : undefined;
  const ranked = practiced.sort((a, b) => a.e.mid - b.e.mid).map((x) => x.n);
  const unseen = shuffle(rng, COVERED_NODES.filter((n) => !ranked.includes(n)));
  const targets = [...ranked, ...unseen];
  const plan: MockItem[] = [];
  const used = new Set<string>();
  for (const n of targets) {
    if (plan.length >= 6) break;
    const g = examGeneratorFor(n, rng);
    if (g && !used.has(g)) {
      used.add(g);
      plan.push({ generator: g, difficulty: 2, points: 0 });
    }
  }
  // 10 puntos repartidos en partes iguales (redondeadas a 0,25 y ajustadas para sumar 10).
  const base = Math.floor((10 / plan.length) * 4) / 4;
  plan.forEach((p) => (p.points = base));
  plan[plan.length - 1]!.points = Math.round((10 - base * (plan.length - 1)) * 100) / 100;
  return { profile: { id: 'debiles', label: 'Mis puntos débiles', description: 'Los apartados donde tu dominio estimado es más bajo.', minutes: 50, plan }, limitation };
}

export function buildProfileExam(profile: MockProfile, seed: number): { exercises: Exercise[]; points: number[] } {
  const rng = mulberry32(seed);
  const exercises = profile.plan.map((item) => {
    if (item.source) {
      const s = SOURCE_EXERCISES.find((x) => x.ref === item.source);
      if (!s) throw new Error(`Ejercicio de documento desconocido: ${item.source}`);
      return s.build();
    }
    const gen = GENERATOR_BY_ID.get(item.generator!);
    if (!gen) throw new Error(`Generador desconocido: ${item.generator}`);
    const d = gen.difficulties.includes(item.difficulty) ? item.difficulty : gen.difficulties[gen.difficulties.length - 1]!;
    return gen.create(randomSeed(rng), d);
  });
  return { exercises, points: profile.plan.map((p) => p.points) };
}
