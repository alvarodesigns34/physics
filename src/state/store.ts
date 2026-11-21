/**
 * Estado global persistente (localStorage, esquema versionado). Si el almacenamiento no está
 * disponible (modo privado, bloqueo), la aplicación funciona en memoria.
 */
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { Species } from '../science/nucleus';
import { initialMastery, updateCard, updateMastery, type NodeMastery, type ReviewCard } from '../learning/mastery';
import type { Difficulty } from '../learning/types';
import type { ConfigOrder } from '../science/configuration';

export type QualitySetting = 'auto' | 'alta' | 'media' | 'baja';
export type MotionSetting = 'sistema' | 'reducido' | 'completo';

export interface Settings {
  alias: string;
  quality: QualitySetting;
  motion: MotionSetting;
  sound: boolean;
  textScale: number;
  configOrder: ConfigOrder;
}

export interface Attempt {
  exerciseId: string;
  nodeIds: string[];
  difficulty: Difficulty;
  correct: boolean;
  score: number;
  hintsUsed: number;
  at: number;
  mode: 'practica' | 'examen' | 'campana';
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
  recordExam: (r: Omit<ExamRecord, 'at'>) => void;
  startMission: (id: string) => void;
  setActiveMission: (id: string | null) => void;
  updateMission: (id: string, patch: Partial<MissionProgress>) => void;
  resetProgress: () => void;
  importProgress: (json: string) => boolean;
  exportProgress: () => string;
}

export type AppState = PersistedState & Actions;

const DEFAULT_SETTINGS: Settings = { alias: '', quality: 'auto', motion: 'sistema', sound: false, textScale: 1, configOrder: 'llenado' };

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
      recordExam: (r) => set((s) => ({ exams: [...s.exams, { ...r, at: Date.now() }].slice(-30) })),
      startMission: (id) =>
        set((s) => ({
          activeMission: id,
          campaign: s.campaign[id]?.status === 'en-curso' ? s.campaign : { ...s.campaign, [id]: { status: 'en-curso', step: 0, collected: [], stars: s.campaign[id]?.stars ?? 0, hintsUsed: 0, firstTry: true } },
        })),
      setActiveMission: (id) => set({ activeMission: id }),
      updateMission: (id, patch) => set((s) => ({ campaign: { ...s.campaign, [id]: { ...(s.campaign[id] ?? { status: 'en-curso', step: 0, collected: [], stars: 0, hintsUsed: 0, firstTry: true }), ...patch } } })),
      resetProgress: () => set({ mastery: {}, cards: {}, history: [], campaign: {}, exams: [], activeMission: null }),
      exportProgress: () => {
        const { settings, mastery, cards, history, campaign, exams } = get();
        return JSON.stringify({ app: 'ATOM', version: 1, exportedAt: new Date().toISOString(), settings, mastery, cards, history, campaign, exams }, null, 2);
      },
      importProgress: (json) => {
        try {
          const d = JSON.parse(json);
          if (d.app !== 'ATOM' || d.version !== 1) return false;
          set({ settings: { ...DEFAULT_SETTINGS, ...d.settings }, mastery: d.mastery ?? {}, cards: d.cards ?? {}, history: d.history ?? [], campaign: d.campaign ?? {}, exams: d.exams ?? [] });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'atom:v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ settings: s.settings, mastery: s.mastery, cards: s.cards, history: s.history, campaign: s.campaign, exams: s.exams, forge: s.forge, activeMission: s.activeMission }),
      migrate: (persisted) => persisted as PersistedState,
    },
  ),
);
