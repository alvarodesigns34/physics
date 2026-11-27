/**
 * ATOM 5.1 · Fusión segura del progreso de dos dispositivos (ordenador ↔ iPad), sin servidor.
 *
 * Principio: no perder información y no contar dos veces la misma evidencia. Reglas:
 * - historial: unión por (ejercicio, instante); los intentos comunes (de una fusión anterior) no se duplican;
 * - dominio por apartado y por competencia: se parte de la copia actualizada más recientemente y se le
 *   aplican, con el mismo modelo 3PL, solo los intentos que esa copia NO tenía (los del otro dispositivo
 *   dentro de su ventana de historial). Así la evidencia de ambos cuenta una vez. Desde ATOM 5.2 cada intento
 *   guarda su actualización exacta (resultado, peso final con el factor de repetición, y azar), y la fusión la
 *   reproduce idéntica a la del dispositivo de origen;
 * - tarjetas de repaso: la de vencimiento más próximo (si en un dispositivo se falló, se repasa antes);
 * - campaña: por misión, el mayor avance (completada > en curso; estrellas y paso máximos);
 * - simulacros: unión por instante;
 * - cuaderno: unión por (ejercicio, instante); si en cualquiera de las dos copias se superó, queda superado;
 * - ajustes: los del dispositivo actual (calidad, tamaño de texto… son propios de cada pantalla).
 * La fusión es idempotente (fusionar dos veces lo mismo no cambia nada) y no pierde intentos, simulacros
 * ni entradas del cuaderno de ninguna de las dos copias (lo comprueban las pruebas). El dominio no es
 * exactamente conmutativo: los intentos del otro dispositivo se aplican después, no intercalados.
 */
import { initialMastery, updateMasteryY, type NodeMastery, type ReviewCard } from '../learning/mastery';
import { EVIDENCE_WEIGHT } from '../learning/evidence';
import type { NotebookEntry } from '../learning/notebook';
import type { Difficulty, SkillId } from '../learning/types';
import type { Attempt, ExamRecord, MissionProgress } from './store';
import { repetitionInfo } from './repetition';

export interface ProgressData {
  mastery: Record<string, NodeMastery>;
  skills: Partial<Record<SkillId, NodeMastery>>;
  cards: Record<string, ReviewCard>;
  history: Attempt[];
  campaign: Record<string, MissionProgress>;
  exams: ExamRecord[];
  notebook: NotebookEntry[];
}

export interface MergeSummary {
  addedAttempts: number;
  addedExams: number;
  addedNotebook: number;
  resolvedNotebook: number;
  nodesUpdated: number;
  missionsUpdated: number;
}

export const HISTORY_CAP = 400;
const EXAMS_CAP = 30;
const NOTEBOOK_CAP = 200;

const attemptKey = (a: Pick<Attempt, 'exerciseId' | 'at'>) => `${a.exerciseId}|${a.at}`;
const noteKey = (n: Pick<NotebookEntry, 'exerciseId' | 'at'>) => `${n.exerciseId}|${n.at}`;

/** Intentos de `other` que la copia `base` no tiene (respetando la ventana de historial de base). */
function missingAttempts(baseHistory: Attempt[], other: Attempt[]): Attempt[] {
  const have = new Set(baseHistory.map(attemptKey));
  // Si el historial de base está lleno, lo anterior a su intento más antiguo ya estaba recortado: no se
  // sabe si base lo tuvo, así que no se aplica (mejor perder un poco de precisión que contar dos veces).
  const full = baseHistory.length >= HISTORY_CAP;
  const from = full ? Math.min(...baseHistory.map((h) => h.at)) : -Infinity;
  return other.filter((a) => !have.has(attemptKey(a)) && a.at > from).sort((a, b) => a.at - b.at);
}

/**
 * Reproduce sobre `m` los intentos que faltaban. ATOM 5.2: si el intento guarda su actualización exacta
 * (resultado sin redondear, peso final = tipo de evidencia × factor de repetición, y azar), se aplica tal
 * cual: el resultado es idéntico al del dispositivo de origen. Los intentos antiguos (sin esos campos) se
 * reconstruyen: el factor de repetición se recalcula con el historial unido anterior a ese intento, la
 * evidencia repetida deja de contar como demostrada y el azar, que no se guardaba, se toma como 0.
 */
function legacyRepetition(all: Attempt[], a: Attempt): number {
  return repetitionInfo(all.filter((h) => h.at < a.at), a.exerciseId, a.at).factor;
}

function replayNode(m: NodeMastery, node: string, extra: Attempt[], all: Attempt[]): { m: NodeMastery; changed: boolean } {
  let out = m;
  let changed = false;
  for (const a of extra) {
    const ev = a.nodeEvidence?.[node];
    if (!ev && !a.nodeIds.includes(node)) continue;
    const y = ev ? ev.y : a.score;
    let w: number;
    let g = 0;
    if (ev && ev.w !== undefined) {
      w = ev.w;
      g = ev.g ?? 0;
    } else {
      const rep = legacyRepetition(all, a);
      let kind = ev?.kind ?? a.evidence ?? 'asistida';
      if (rep < 1 && (kind === 'demostrada' || kind === 'posible-azar')) kind = 'asistida';
      w = EVIDENCE_WEIGHT[kind] * rep;
    }
    out = updateMasteryY(out, a.difficulty as Difficulty, y, a.hintsUsed, a.at, w, g);
    changed = true;
  }
  return { m: out, changed };
}

function replaySkill(m: NodeMastery, skill: SkillId, extra: Attempt[], all: Attempt[]): NodeMastery {
  let out = m;
  for (const a of extra) {
    const exact = a.skillEvidence?.[skill];
    if (exact) {
      out = updateMasteryY(out, 2, exact.y, a.hintsUsed, a.at, exact.w, exact.g);
      continue;
    }
    const y = a.skills?.[skill];
    if (y === undefined) continue;
    const rep = legacyRepetition(all, a);
    let kind = a.evidence ?? 'asistida';
    if (rep < 1 && (kind === 'demostrada' || kind === 'posible-azar')) kind = 'asistida';
    out = updateMasteryY(out, 2, y, a.hintsUsed, a.at, 0.75 * EVIDENCE_WEIGHT[kind] * rep);
  }
  return out;
}

const later = (a: NodeMastery | undefined, b: NodeMastery | undefined) => (a?.lastSeen ?? -1) >= (b?.lastSeen ?? -1);

export function mergeProgress(local: ProgressData, incoming: ProgressData): { data: ProgressData; summary: MergeSummary } {
  const summary: MergeSummary = { addedAttempts: 0, addedExams: 0, addedNotebook: 0, resolvedNotebook: 0, nodesUpdated: 0, missionsUpdated: 0 };
  // Historial
  const byKey = new Map<string, Attempt>();
  for (const a of local.history) byKey.set(attemptKey(a), a);
  for (const a of incoming.history) if (!byKey.has(attemptKey(a))) {
    byKey.set(attemptKey(a), a);
    summary.addedAttempts++;
  }
  const allHistory = [...byKey.values()].sort((a, b) => a.at - b.at || a.exerciseId.localeCompare(b.exerciseId));
  const history = allHistory.slice(-HISTORY_CAP);

  // Dominio por apartado
  const mastery: Record<string, NodeMastery> = {};
  const nodes = new Set([...Object.keys(local.mastery), ...Object.keys(incoming.mastery)]);
  const missLocal = missingAttempts(local.history, incoming.history);
  const missIncoming = missingAttempts(incoming.history, local.history);
  for (const n of [...nodes].sort()) {
    const a = local.mastery[n];
    const b = incoming.mastery[n];
    const baseIsLocal = later(a, b);
    const base = (baseIsLocal ? a : b) ?? initialMastery();
    const r = replayNode(base, n, baseIsLocal ? missLocal : missIncoming, allHistory);
    mastery[n] = r.m;
    if (!a || r.m !== a) summary.nodesUpdated++;
  }
  // Competencias
  const skills: Partial<Record<SkillId, NodeMastery>> = {};
  for (const k of new Set([...Object.keys(local.skills), ...Object.keys(incoming.skills)]) as Set<SkillId>) {
    const a = local.skills[k];
    const b = incoming.skills[k];
    const baseIsLocal = later(a, b);
    skills[k] = replaySkill((baseIsLocal ? a : b) ?? initialMastery(), k, baseIsLocal ? missLocal : missIncoming, allHistory);
  }
  // Tarjetas de repaso
  const cards: Record<string, ReviewCard> = { ...local.cards };
  for (const [n, c] of Object.entries(incoming.cards)) {
    const cur = cards[n];
    if (!cur || c.due < cur.due || (c.due === cur.due && c.box < cur.box)) cards[n] = c;
  }
  // Campaña
  const campaign: Record<string, MissionProgress> = { ...local.campaign };
  for (const [id, m] of Object.entries(incoming.campaign)) {
    const cur = campaign[id];
    if (!cur) {
      campaign[id] = m;
      summary.missionsUpdated++;
      continue;
    }
    const done = cur.status === 'completada' || m.status === 'completada';
    const merged: MissionProgress = {
      status: done ? 'completada' : 'en-curso',
      step: Math.max(cur.step, m.step),
      collected: [...new Set([...cur.collected, ...m.collected])],
      stars: Math.max(cur.stars, m.stars),
      hintsUsed: Math.max(cur.hintsUsed, m.hintsUsed),
      firstTry: cur.firstTry && m.firstTry,
    };
    if (JSON.stringify(merged) !== JSON.stringify(cur)) summary.missionsUpdated++;
    campaign[id] = merged;
  }
  // Simulacros
  const examAt = new Set(local.exams.map((e) => e.at));
  const newExams = incoming.exams.filter((e) => !examAt.has(e.at));
  summary.addedExams = newExams.length;
  const exams = [...local.exams, ...newExams].sort((a, b) => a.at - b.at).slice(-EXAMS_CAP);
  // Cuaderno
  const notes = new Map<string, NotebookEntry>();
  for (const e of local.notebook) notes.set(noteKey(e), e);
  for (const e of incoming.notebook) {
    const cur = notes.get(noteKey(e));
    if (!cur) {
      notes.set(noteKey(e), e);
      summary.addedNotebook++;
      continue;
    }
    const resolvedAt = cur.resolvedAt !== undefined && e.resolvedAt !== undefined ? Math.min(cur.resolvedAt, e.resolvedAt) : (cur.resolvedAt ?? e.resolvedAt);
    const resolvedBy = resolvedAt === undefined ? undefined : resolvedAt === cur.resolvedAt ? cur.resolvedBy : e.resolvedBy;
    if (cur.resolvedAt === undefined && resolvedAt !== undefined) summary.resolvedNotebook++;
    const merged: NotebookEntry = { ...cur, retries: Math.max(cur.retries, e.retries) };
    if (resolvedAt !== undefined) {
      merged.resolvedAt = resolvedAt;
      if (resolvedBy) merged.resolvedBy = resolvedBy;
    }
    notes.set(noteKey(e), merged);
  }
  const notebook = [...notes.values()].sort((a, b) => a.at - b.at).slice(-NOTEBOOK_CAP);
  return { data: { mastery, skills, cards, history, campaign, exams, notebook }, summary };
}
