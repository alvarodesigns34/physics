/**
 * Estado de la ruta de estudio activa (ATOM 4.0): sobrevive a la navegación hacia los laboratorios y a
 * las recargas (localStorage), para que el alumno pueda volver exactamente al paso en que estaba.
 * Los ejercicios se guardan por id: se reconstruyen idénticos (deterministas).
 */
import { create } from 'zustand';

export interface ActivePath {
  node: string;
  step: number;
  done: string[];
  errors: { kind: string; skill?: string }[];
  exerciseIds: Record<string, string | null>;
  updatedAt: number;
}

const KEY = 'atom:ruta';

function load(): ActivePath | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && typeof v.node === 'string' && Number.isInteger(v.step) && Array.isArray(v.done) && Array.isArray(v.errors) && typeof v.exerciseIds === 'object') return v as ActivePath;
  } catch {
    /* almacenamiento no disponible o dañado */
  }
  return null;
}

export const useStudyPath = create<{ path: ActivePath | null; set: (p: ActivePath | null) => void; patch: (p: Partial<ActivePath>) => void }>((set, get) => ({
  path: typeof localStorage === 'undefined' ? null : load(),
  set: (p) => {
    set({ path: p });
    try {
      if (p) localStorage.setItem(KEY, JSON.stringify(p));
      else localStorage.removeItem(KEY);
    } catch {
      /* sin almacenamiento: dura la sesión */
    }
  },
  patch: (p) => {
    const cur = get().path;
    if (!cur) return;
    get().set({ ...cur, ...p, updatedAt: Date.now() });
  },
}));
