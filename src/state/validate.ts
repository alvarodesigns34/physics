/**
 * Validación estructural y semántica del progreso (importación y migración del almacenamiento local).
 *
 * - Modo estricto (importar un archivo): cualquier error estructural rechaza el archivo completo y el
 *   progreso actual no se toca.
 * - Modo tolerante (datos guardados en este navegador, posiblemente de una versión anterior o dañados):
 *   se conservan las entradas válidas y se descartan las corruptas.
 */
import { NODES } from '../learning/syllabus';
import { MISSION_BY_ID } from '../learning/campaign';

export const PROGRESS_VERSION = 2;
export const MAX_IMPORT_BYTES = 2_000_000;
const MAX_HISTORY = 400;
const MAX_EXAMS = 30;
const NODE_IDS = new Set(NODES.map((n) => n.id));
const SKILL_IDS = new Set(['concepto', 'formula', 'unidades', 'calculo', 'cifras', 'notacion', 'razonamiento']);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const intIn = (v: unknown, lo: number, hi: number): v is number => finite(v) && Number.isInteger(v) && v >= lo && v <= hi;

export interface Sanitized {
  settings: Obj;
  mastery: Obj;
  skills: Obj;
  cards: Obj;
  history: unknown[];
  campaign: Obj;
  exams: unknown[];
  forge?: Obj;
  activeMission?: string | null;
}

export interface ValidationResult {
  ok: boolean;
  data?: Sanitized;
  /** Problemas encontrados (en modo tolerante, entradas descartadas) */
  issues: string[];
}

function masteryEntry(v: unknown): boolean {
  return isObj(v) && finite(v.theta) && v.theta >= -3 && v.theta <= 3 && intIn(v.attempts, 0, 1e6) && intIn(v.correct, 0, 1e6) && (v.correct as number) <= (v.attempts as number) && finite(v.lastSeen) && (v.info === undefined || (finite(v.info) && v.info >= 0)) && (v.demonstrated === undefined || intIn(v.demonstrated, 0, 1e6));
}

function cardEntry(k: string, v: unknown): boolean {
  return isObj(v) && v.nodeId === k && intIn(v.box, 1, 5) && finite(v.due);
}

function attemptEntry(v: unknown): boolean {
  return isObj(v) && typeof v.exerciseId === 'string' && Array.isArray(v.nodeIds) && v.nodeIds.every((n) => typeof n === 'string' && NODE_IDS.has(n)) && intIn(v.difficulty, 1, 3) && typeof v.correct === 'boolean' && finite(v.score) && v.score >= 0 && v.score <= 1 && finite(v.at) && ['practica', 'examen', 'campana'].includes(v.mode as string) && (v.errors === undefined || (Array.isArray(v.errors) && v.errors.length <= 50 && v.errors.every((e) => isObj(e) && typeof e.kind === 'string' && Array.isArray(e.nodeIds) && e.nodeIds.every((n) => typeof n === 'string')))) && (v.skills === undefined || (isObj(v.skills) && Object.entries(v.skills).every(([k, y]) => SKILL_IDS.has(k) && finite(y) && y >= 0 && y <= 1)));
}

function missionEntry(k: string, v: unknown): boolean {
  const m = MISSION_BY_ID.get(k);
  return !!m && isObj(v) && (v.status === 'en-curso' || v.status === 'completada') && intIn(v.step, 0, m.steps.length) && Array.isArray(v.collected) && intIn(v.stars, 0, 3) && intIn(v.hintsUsed, 0, 1e4) && typeof v.firstTry === 'boolean';
}

function examEntry(v: unknown): boolean {
  return isObj(v) && finite(v.at) && Array.isArray(v.scope) && intIn(v.total, 0, 200) && finite(v.score) && v.score >= 0 && v.score <= 1 && isObj(v.byNode);
}

function settingsClean(v: unknown, issues: string[]): Obj {
  if (!isObj(v)) return {};
  const out: Obj = {};
  const pick = <T,>(k: string, ok: (x: unknown) => x is T) => {
    if (v[k] === undefined) return;
    if (ok(v[k])) out[k] = v[k];
    else issues.push(`Ajuste «${k}» no válido: se usa el valor por defecto.`);
  };
  pick('alias', (x): x is string => typeof x === 'string' && x.length <= 24);
  pick('quality', (x): x is string => ['auto', 'alta', 'media', 'baja'].includes(x as string));
  pick('motion', (x): x is string => ['sistema', 'reducido', 'completo'].includes(x as string));
  pick('sound', (x): x is boolean => typeof x === 'boolean');
  pick('ambient', (x): x is boolean => typeof x === 'boolean');
  pick('volume', (x): x is number => finite(x) && x >= 0 && x <= 1);
  pick('seenIntro', (x): x is boolean => typeof x === 'boolean');
  pick('textScale', (x): x is number => finite(x) && x >= 0.8 && x <= 1.5);
  pick('configOrder', (x): x is string => x === 'llenado' || x === 'capas');
  return out;
}

function recordClean(v: unknown, ok: (k: string, x: unknown) => boolean, label: string, issues: string[]): Obj {
  if (v === undefined) return {};
  if (!isObj(v)) {
    issues.push(`«${label}» no tiene el formato esperado.`);
    return {};
  }
  const out: Obj = {};
  for (const [k, x] of Object.entries(v)) {
    if (ok(k, x)) out[k] = x;
    else issues.push(`Entrada de «${label}» no válida: ${k}.`);
  }
  return out;
}

function listClean(v: unknown, ok: (x: unknown) => boolean, max: number, label: string, issues: string[]): unknown[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    issues.push(`«${label}» no es una lista.`);
    return [];
  }
  const good = v.filter(ok);
  if (good.length < v.length) issues.push(`${v.length - good.length} entrada(s) de «${label}» no válidas.`);
  return good.slice(-max);
}

/** Valida y sanea un objeto de progreso (exportado o persistido). */
export function validateProgress(raw: unknown, mode: 'estricto' | 'tolerante'): ValidationResult {
  const issues: string[] = [];
  if (!isObj(raw)) return { ok: false, issues: ['El archivo no contiene un objeto de progreso.'] };
  const data: Sanitized = {
    settings: settingsClean(raw.settings, issues),
    mastery: recordClean(raw.mastery, (k, x) => NODE_IDS.has(k) && masteryEntry(x), 'dominio', issues),
    skills: recordClean(raw.skills, (k, x) => SKILL_IDS.has(k) && masteryEntry(x), 'competencias', issues),
    cards: recordClean(raw.cards, (k, x) => NODE_IDS.has(k) && cardEntry(k, x), 'repasos', issues),
    history: listClean(raw.history, attemptEntry, MAX_HISTORY, 'historial', issues),
    campaign: recordClean(raw.campaign, missionEntry, 'campaña', issues),
    exams: listClean(raw.exams, examEntry, MAX_EXAMS, 'exámenes', issues),
  };
  if (isObj(raw.forge) && intIn(raw.forge.z, 0, 118) && intIn(raw.forge.n, 0, 177) && intIn(raw.forge.e, 0, 130)) data.forge = raw.forge;
  if (raw.activeMission === null || (typeof raw.activeMission === 'string' && MISSION_BY_ID.has(raw.activeMission))) data.activeMission = raw.activeMission as string | null;
  if (mode === 'estricto' && issues.length > 0) return { ok: false, issues };
  return { ok: true, data, issues };
}

/** Lee un archivo exportado (texto JSON) en modo estricto, con límite de tamaño. */
export function parseExport(json: string): ValidationResult {
  if (json.length > MAX_IMPORT_BYTES) return { ok: false, issues: [`El archivo es demasiado grande (${Math.round(json.length / 1000)} kB; máximo ${MAX_IMPORT_BYTES / 1000} kB).`] };
  let d: unknown;
  try {
    d = JSON.parse(json);
  } catch {
    return { ok: false, issues: ['El archivo no es JSON válido.'] };
  }
  if (!isObj(d) || d.app !== 'ATOM') return { ok: false, issues: ['El archivo no es un progreso de ATOM.'] };
  if (!intIn(d.version, 1, PROGRESS_VERSION)) return { ok: false, issues: [`Versión de progreso no compatible (${String(d.version)}).`] };
  return validateProgress(d, 'estricto');
}
