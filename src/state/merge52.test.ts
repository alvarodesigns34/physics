/**
 * ATOM 5.2 · Fusión EXACTA: los intentos de otro dispositivo se reproducen con su factor de repetición,
 * su azar y su peso de evidencia originales. Escenario de extremo a extremo con el almacén real.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
};
const { useStore } = await import('./store');
const { mergeProgress } = await import('./merge');
const { buildWaveExercise } = await import('../learning/generators/photon');
const { trueFalseGenerator } = await import('../learning/generators/atom51');
type Ex = ReturnType<typeof buildWaveExercise>;

const outcome = (ex: Ex, credit = 1, extra = {}) => ({
  correct: credit >= 1,
  score: credit,
  hintsUsed: 0,
  parts: ex.parts.map((p) => ({ id: p.id, credit, attempts: 1, revealed: false, errors: [], carried: false, sigFigIssue: false, ...extra })),
});
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 10);
vi.useFakeTimers();
afterAll(() => vi.useRealTimers());

const snapshot = () => {
  const s = useStore.getState();
  return structuredClone({ mastery: s.mastery, skills: s.skills, cards: s.cards, history: s.history, campaign: s.campaign, exams: s.exams, notebook: s.notebook });
};
const at = (t: number) => vi.setSystemTime(t);

// Copia común: un ejercicio hecho en ambos dispositivos antes de separarse.
useStore.getState().resetProgress();
const wave = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 'onda-lambda:2:1');
at(T0);
useStore.getState().recordExercise(wave, outcome(wave), 'practica');
const common = snapshot();

// Dispositivo B: repite el MISMO enunciado (factor 0,35 y luego 0,15), uno espaciado (0,6) y un verdadero/falso (azar 0,5).
at(T0 + 1000);
useStore.getState().recordExercise(wave, outcome(wave), 'practica');
at(T0 + 2000);
useStore.getState().recordExercise(wave, outcome(wave, 0.5), 'practica');
at(T0 + 3 * DAY);
useStore.getState().recordExercise(wave, outcome(wave), 'practica');
const tf = trueFalseGenerator.create(3, 1) as unknown as Ex;
at(T0 + 3 * DAY + 5000);
useStore.getState().recordExercise(tf, outcome(tf), 'practica');
const deviceB = snapshot();

describe('ATOM 5.2 · fusión exacta del progreso', () => {
  it('cada intento guarda su peso final y su azar', () => {
    const h = deviceB.history;
    const w = h.filter((a) => a.exerciseId === wave.id).map((a) => Object.values(a.nodeEvidence!)[0]!.w);
    expect(w).toEqual([1, 0.35, 0.15, 0.6].map((f, i) => (i === 0 ? 1 : f * 0.6))); // repetida ⇒ «asistida» (0,6) × factor
    const tfEv = Object.values(h.at(-1)!.nodeEvidence!)[0]!;
    expect(tfEv.g).toBeGreaterThan(0);
  });

  it('reproducir los intentos de B sobre la copia común da EXACTAMENTE el dominio de B (θ, información, aciertos demostrados)', () => {
    // La copia común se marca como «más reciente» para obligar a que la fusión reproduzca los intentos de B.
    const base = structuredClone(common);
    for (const m of Object.values(base.mastery)) m.lastSeen = T0 + 100 * DAY;
    for (const m of Object.values(base.skills)) if (m) m.lastSeen = T0 + 100 * DAY;
    const { data } = mergeProgress(base, deviceB);
    for (const [n, m] of Object.entries(deviceB.mastery)) expect(data.mastery[n], n).toEqual(m);
    for (const [k, m] of Object.entries(deviceB.skills)) expect(data.skills[k as keyof typeof data.skills], k).toEqual(m);
  });

  it('idempotente, estable e íntegra con el almacén real (importar «fusionar» dos veces)', () => {
    // Dispositivo A: parte de la copia común y hace un ejercicio distinto, más tarde.
    useStore.setState(structuredClone(common));
    at(T0 + 4 * DAY);
    const other = buildWaveExercise({ value: 650, unit: 'nm' }, 2, 'onda-lambda:2:7');
    useStore.getState().recordExercise(other, outcome(other), 'practica');
    const fileB = JSON.stringify({ app: 'ATOM', version: 2, exportedAt: new Date(T0 + 4 * DAY).toISOString(), settings: useStore.getState().settings, ...deviceB });
    const r1 = useStore.getState().importProgress(fileB, 'fusionar');
    expect(r1.ok).toBe(true);
    const once = snapshot();
    const r2 = useStore.getState().importProgress(fileB, 'fusionar');
    expect(r2.ok).toBe(true);
    expect(snapshot()).toEqual(once);
    // Ningún intento perdido ni duplicado; todos válidos.
    const keys = once.history.map((a) => `${a.exerciseId}|${a.at}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(deviceB.history.length + 1);
    for (const v of Object.values(once.mastery)) expect(Number.isFinite(v.theta) && v.theta >= -3 && v.theta <= 3).toBe(true);
  });

  it('intentos antiguos (sin peso guardado): el factor de repetición se reconstruye con el historial unido', () => {
    const legacy = structuredClone(deviceB);
    for (const a of legacy.history) for (const e of Object.values(a.nodeEvidence ?? {})) { delete e.w; delete e.g; }
    for (const a of legacy.history) delete a.skillEvidence;
    const base = structuredClone(common);
    for (const m of Object.values(base.mastery)) m.lastSeen = T0 + 100 * DAY;
    const { data } = mergeProgress(base, legacy);
    const node = wave.nodeIds[0]!;
    // Sin azar guardado (los intentos antiguos no lo tenían) no puede ser idéntico, pero el factor de
    // repetición reconstruido lo deja muy cerca; sin él (peso 0,6 en cada repetición) se alejaría mucho más.
    const exact = deviceB.mastery[node]!;
    const got = data.mastery[node]!;
    expect(got.attempts).toBe(exact.attempts);
    expect(Math.abs(got.theta - exact.theta)).toBeLessThan(0.03);
    expect(Math.abs(got.info! - exact.info!)).toBeLessThan(0.05);
  });
});
