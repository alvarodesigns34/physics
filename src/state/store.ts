/**
 * Estado global persistente (localStorage, esquema versionado). Si el almacenamiento no está
 * disponible (modo privado, bloqueo), la aplicación funciona en memoria.
 */
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Species } from '../science/nucleus';
import { initialMastery, updateCard, updateMastery, updateMasteryY, type NodeMastery, type ReviewCard } from '../learning/mastery';
import type { Difficulty, ErrorKind, Exercise, SkillId } from '../learning/types';
import { buildEvidence, type PartRecord } from '../learning/evidence';
import { parseExport, PROGRESS_VERSION, validateProgress } from './validate';
import type { ConfigOrder } from '../science/configuration';

export type QualitySetting = 'auto' | 'alta' | 'media' | 'baja';
export type MotionSetting = 'sistema' | 'reducido' | 'completo';

export interface Settings {
  alias: string;
  quality: QualitySetting;
  motion: MotionSetting;
  sound: boolean;
  ambient: boolean;
  volume: number;
  seenIntro: boolean;
  textScale: number;
  configOrder: ConfigOrder;
  /** Tema de la interfaz (ATOM 3.0: claro por defecto) */
  theme: ThemeSetting;
}

export type ThemeSetting = 'claro' | 'oscuro' | 'sistema';

export interface Attempt {
  exerciseId: string;
  nodeIds: string[];
  difficulty: Difficulty;
  correct: boolean;
  score: number;
  hintsUsed: number;
  at: number;
  mode: 'practica' | 'examen' | 'campana';
  /** Errores clasificados de este intento (para el diagnóstico por competencias) */
  errors?: { kind: ErrorKind; skill?: SkillId; nodeIds: string[] }[];
  /** Resultado medio 0–1 por competencia en este intento */
  skills?: Partial<Record<SkillId, number>>;
}

export interface MissionProgress {
  status: 'en-curso' | 'completada';
  step: number;
  /** Claves recogidas en pasos de colección */
  collected: string[];
  stars: number;
  hintsUsed: number;
  firstTry: boolean;
}

export interface ExamRecord {
  at: number;
  scope: string[];
  total: number;
  score: number;
  byNode: Record<string, { ok: number; total: number }>;
}

interface PersistedState {
  settings: Settings;
  mastery: Record<string, NodeMastery>;
  /** Dominio por competencia (mismo modelo logístico que los apartados) */
  skills: Partial<Record<SkillId, NodeMastery>>;
  cards: Record<string, ReviewCard>;
  history: Attempt[];
  campaign: Record<string, MissionProgress>;
  exams: ExamRecord[];
  forge: Species;
  activeMission: string | null;
  storageAvailable: boolean;
}

interface Actions {
  setSettings: (patch: Partial<Settings>) => void;
  setForge: (s: Species) => void;
  recordAttempt: (a: Omit<Attempt, 'at'>) => void;
  /** Registra un ejercicio con evidencia por paso: dominio parcial por apartado y por competencia. */
  recordExercise: (ex: Exercise, o: { score: number; correct: boolean; hintsUsed: number; parts?: PartRecord[] }, mode: Attempt['mode']) => void;
  recordExam: (r: Omit<ExamRecord, 'at'>) => void;
  startMission: (id: string) => void;
  setActiveMission: (id: string | null) => void;
  updateMission: (id: string, patch: Partial<MissionProgress>) => void;
  resetProgress: () => void;
  /** Importa un archivo: si no es válido, el progreso actual no cambia. */
  importProgress: (json: string) => { ok: boolean; issues: string[] };
  /** Deshace la última importación (restaura la copia previa). */
  undoImport: () => boolean;
  exportProgress: () => string;
}

export type AppState = PersistedState & Actions;

const DEFAULT_SETTINGS: Settings = { alias: '', quality: 'auto', motion: 'sistema', sound: false, ambient: true, volume: 0.8, seenIntro: false, textScale: 1, configOrder: 'llenado', theme: 'claro' };

function probeStorage(): boolean {
  try {
    const k = '__atom_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const memory = new Map<string, string>();
/** Copia del progreso previa a la última importación (solo en memoria). */
let importBackup: string | null = null;
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      memory.delete(k);
    }
  },
};

const initialPersisted = (): PersistedState => ({
  settings: DEFAULT_SETTINGS,
  mastery: {},
  skills: {},
  cards: {},
  history: [],
  campaign: {},
  exams: [],
  forge: { z: 0, n: 0, e: 0 },
  activeMission: null,
  storageAvailable: typeof window !== 'undefined' ? probeStorage() : false,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialPersisted(),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setForge: (forge) => set({ forge }),
      recordAttempt: (a) =>
        set((s) => {
          const now = Date.now();
          const mastery = { ...s.mastery };
          const cards = { ...s.cards };
          for (const node of a.nodeIds) {
            mastery[node] = updateMastery(mastery[node] ?? initialMastery(), a.difficulty, a.correct, a.hintsUsed, now);
            if (a.mode !== 'examen' || !a.correct) cards[node] = updateCard(cards[node], node, a.correct, now);
          }
          return { mastery, cards, history: [...s.history, { ...a, at: now }].slice(-300) };
        }),
      recordExercise: (ex, o, mode) =>
        set((s) => {
          if (!o.parts || o.parts.length === 0) {
            // Sin detalle por paso: comportamiento anterior (un resultado global).
            const now = Date.now();
            const mastery = { ...s.mastery };
            const cards = { ...s.cards };
            for (const node of ex.nodeIds) {
              mastery[node] = updateMastery(mastery[node] ?? initialMastery(), ex.difficulty, o.correct, o.hintsUsed, now);
              if (mode !== 'examen' || !o.correct) cards[node] = updateCard(cards[node], node, o.correct, now);
            }
            return { mastery, cards, history: [...s.history, { exerciseId: ex.id, nodeIds: ex.nodeIds, difficulty: ex.difficulty, correct: o.correct, score: o.score, hintsUsed: o.hintsUsed, mode, at: now }].slice(-400) };
          }
          const now = Date.now();
          const ev = buildEvidence(ex, o.parts);
          const mastery = { ...s.mastery };
          const cards = { ...s.cards };
          for (const [node, { y }] of Object.entries(ev.nodes)) {
            mastery[node] = updateMasteryY(mastery[node] ?? initialMastery(), ex.difficulty, y, o.hintsUsed, now);
            const ok = y >= 0.75;
            if (mode !== 'examen' || !ok) cards[node] = updateCard(cards[node], node, ok, now);
          }
          const skills = { ...s.skills };
          const skillY: Partial<Record<SkillId, number>> = {};
          for (const [k, v] of Object.entries(ev.skills) as [SkillId, { y: number; n: number }][]) {
            skills[k] = updateMasteryY(skills[k] ?? initialMastery(), 2, v.y, o.hintsUsed, now, Math.min(1, 0.5 + v.n * 0.25));
            skillY[k] = Math.round(v.y * 100) / 100;
          }
          const attempt: Attempt = {
            exerciseId: ex.id,
            nodeIds: Object.keys(ev.nodes),
            difficulty: ex.difficulty,
            correct: o.correct,
            score: o.score,
            hintsUsed: o.hintsUsed,
            mode,
            at: now,
            errors: ev.errors.map(({ kind, skill, nodeIds }) => ({ kind, skill, nodeIds })),
            skills: skillY,
          };
          return { mastery, skills, cards, history: [...s.history, attempt].slice(-400) };
        }),
      recordExam: (r) => set((s) => ({ exams: [...s.exams, { ...r, at: Date.now() }].slice(-30) })),
      startMission: (id) =>
        set((s) => ({
          activeMission: id,
          campaign: s.campaign[id]?.status === 'en-curso' ? s.campaign : { ...s.campaign, [id]: { status: 'en-curso', step: 0, collected: [], stars: s.campaign[id]?.stars ?? 0, hintsUsed: 0, firstTry: true } },
        })),
      setActiveMission: (id) => set({ activeMission: id }),
      updateMission: (id, patch) => set((s) => ({ campaign: { ...s.campaign, [id]: { ...(s.campaign[id] ?? { status: 'en-curso', step: 0, collected: [], stars: 0, hintsUsed: 0, firstTry: true }), ...patch } } })),
      resetProgress: () => set({ mastery: {}, skills: {}, cards: {}, history: [], campaign: {}, exams: [], activeMission: null }),
      exportProgress: () => {
        const { settings, mastery, skills, cards, history, campaign, exams } = get();
        return JSON.stringify({ app: 'ATOM', version: PROGRESS_VERSION, exportedAt: new Date().toISOString(), settings, mastery, skills, cards, history, campaign, exams }, null, 2);
      },
      importProgress: (json) => {
        const res = parseExport(json);
        if (!res.ok || !res.data) return { ok: false, issues: res.issues };
        const cur = get();
        importBackup = JSON.stringify({ settings: cur.settings, mastery: cur.mastery, skills: cur.skills, cards: cur.cards, history: cur.history, campaign: cur.campaign, exams: cur.exams });
        const d = res.data;
        set({ settings: { ...DEFAULT_SETTINGS, ...d.settings } as Settings, mastery: d.mastery as AppState['mastery'], skills: d.skills as AppState['skills'], cards: d.cards as AppState['cards'], history: d.history as Attempt[], campaign: d.campaign as AppState['campaign'], exams: d.exams as ExamRecord[], activeMission: null });
        return { ok: true, issues: res.issues };
      },
      undoImport: () => {
        if (!importBackup) return false;
        const b = JSON.parse(importBackup) as Partial<PersistedState>;
        importBackup = null;
        set({ ...b, activeMission: null });
        return true;
      },
    }),
    {
      name: 'atom:v1',
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ settings: s.settings, mastery: s.mastery, skills: s.skills, cards: s.cards, history: s.history, campaign: s.campaign, exams: s.exams, forge: s.forge, activeMission: s.activeMission }),
      // v1 → v2: se añade el dominio por competencias (vacío) y se sanean las entradas. Los datos dañados
      // se descartan entrada a entrada, sin perder el resto del progreso.
      migrate: (persisted) => persisted as PersistedState,
      merge: (persisted, current) => {
        const v = validateProgress(persisted ?? {}, 'tolerante');
        if (!v.ok || !v.data) return current;
        if (v.issues.length) console.warn('ATOM: progreso guardado parcialmente dañado; se han descartado entradas no válidas.', v.issues.slice(0, 5));
        const d = v.data;
        return {
          ...current,
          settings: { ...DEFAULT_SETTINGS, ...d.settings } as Settings,
          mastery: d.mastery as AppState['mastery'],
          skills: d.skills as AppState['skills'],
          cards: d.cards as AppState['cards'],
          history: d.history as Attempt[],
          campaign: d.campaign as AppState['campaign'],
          exams: d.exams as ExamRecord[],
          forge: (d.forge as unknown as Species) ?? current.forge,
          activeMission: d.activeMission ?? null,
        };
      },
    },
  ),
);
