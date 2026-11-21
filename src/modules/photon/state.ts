import { create } from 'zustand';
import { transition, cascadeLines, type Transition } from '../../science/hydrogen';
import { SIM_CONSTANTS } from '../../science/constants';

export type PhotonTab = 'ondas' | 'hidrogeno' | 'espectroscopio';

export interface DetectedLine {
  t: Transition;
  stamp: number;
}

export interface Flight {
  t: Transition;
  stamp: number;
  /** Retardo antes de salir (s) — para las cascadas */
  delay: number;
  /** performance.now() en el momento de crearse */
  createdAt: number;
}

interface PhotonState {
  tab: PhotonTab;
  lambdaNm: number;
  level: number;
  mode: 'emision' | 'absorcion';
  from: number;
  to: number;
  detected: DetectedLine[];
  flights: Flight[];
  lastTransition: { from: number; to: number; stamp: number } | undefined;
  cascade: { n: number; stamp: number } | undefined;
  spectroElement: string;
  spectroMode: 'emision' | 'absorcion';
  spectroGuess: { symbol: string; stamp: number } | undefined;
  setTab: (t: PhotonTab) => void;
  setLambda: (nm: number) => void;
  setMode: (m: 'emision' | 'absorcion') => void;
  setFrom: (n: number) => void;
  setTo: (n: number) => void;
  fire: () => Transition | null;
  runCascade: (n: number) => void;
  clearDetector: () => void;
  setSpectro: (patch: Partial<Pick<PhotonState, 'spectroElement' | 'spectroMode'>>) => void;
  guess: (symbol: string) => void;
}

let stampCounter = 0;
const nextStamp = () => ++stampCounter;

export const usePhoton = create<PhotonState>((set, get) => ({
  tab: 'hidrogeno',
  lambdaNm: 700,
  level: 1,
  mode: 'emision',
  from: 3,
  to: 2,
  detected: [],
  flights: [],
  lastTransition: undefined,
  cascade: undefined,
  spectroElement: 'H',
  spectroMode: 'emision',
  spectroGuess: undefined,
  setTab: (tab) => set({ tab }),
  setLambda: (lambdaNm) => set({ lambdaNm }),
  setMode: (mode) =>
    set((s) => {
      // En absorción el nivel inicial es el inferior.
      const lo = Math.min(s.from, s.to);
      const hi = Math.max(s.from, s.to);
      return mode === 'emision' ? { mode, from: hi, to: lo } : { mode, from: lo, to: hi };
    }),
  setFrom: (from) => set({ from }),
  setTo: (to) => set({ to }),
  fire: () => {
    const { from, to } = get();
    if (from === to) return null;
    const t = transition(from, to, SIM_CONSTANTS);
    const stamp = nextStamp();
    set((s) => ({
      level: to,
      detected: [...s.detected.filter((d) => !(d.t.from === t.from && d.t.to === t.to) && !(d.t.n1 === t.n1 && d.t.n2 === t.n2 && d.t.type === t.type)), { t, stamp }].slice(-40),
      flights: [...s.flights, { t, stamp, delay: 0, createdAt: performance.now() }].slice(-24),
      lastTransition: { from, to, stamp },
    }));
    return t;
  },
  runCascade: (n) => {
    const lines = cascadeLines(n, SIM_CONSTANTS);
    const base = nextStamp();
    set({
      level: 1,
      detected: lines.map((t, i) => ({ t, stamp: base + i / 100 })),
      flights: lines.map((t, i) => ({ t, stamp: base + i / 100, delay: i * 0.28, createdAt: performance.now() })),
      cascade: { n, stamp: base },
    });
  },
  clearDetector: () => set({ detected: [], flights: [] }),
  setSpectro: (patch) => set(patch),
  guess: (symbol) => set({ spectroGuess: { symbol, stamp: nextStamp() } }),
}));
