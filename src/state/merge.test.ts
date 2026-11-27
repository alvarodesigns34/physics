/** ATOM 5.1 · Fusión del progreso entre dispositivos. */
import { describe, expect, it } from 'vitest';
import { mergeProgress, type ProgressData } from './merge';
import { initialMastery, updateMasteryY } from '../learning/mastery';
import type { Attempt } from './store';

const att = (id: string, at: number, node: string, y = 1): Attempt => ({ exerciseId: id, nodeIds: [node], difficulty: 2, correct: y >= 0.7, score: y, hintsUsed: 0, at, mode: 'practica', evidence: 'demostrada', nodeEvidence: { [node]: { y, kind: 'demostrada' } }, skills: { calculo: y } });

/** Construye el estado de un dispositivo aplicando sus intentos con el modelo real. */
function device(attempts: Attempt[], extra: Partial<ProgressData> = {}): ProgressData {
  const mastery: ProgressData['mastery'] = {};
  for (const a of attempts) for (const n of a.nodeIds) mastery[n] = updateMasteryY(mastery[n] ?? initialMastery(), 2, a.nodeEvidence![n]!.y, 0, a.at, 1);
  return { mastery, skills: {}, cards: {}, history: attempts, campaign: {}, exams: [], notebook: [], ...extra };
}

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);
const common = [att('a:2:1', (T0 + 1 * DAY), '3.2')];
const pc = device([...common, att('a:2:2', (T0 + 2 * DAY), '3.2'), att('b:2:1', (T0 + 3 * DAY), '7.7', 0)]);
const ipad = device([...common, att('a:2:3', (T0 + 2.5 * DAY), '3.2'), att('c:2:1', (T0 + 4 * DAY), '6.3')]);

describe('mergeProgress', () => {
  const { data, summary } = mergeProgress(pc, ipad);
  it('no pierde ningún intento y no duplica los comunes', () => {
    expect(data.history).toHaveLength(5);
    expect(summary.addedAttempts).toBe(2);
    expect(new Set(data.history.map((h) => `${h.exerciseId}|${h.at}`)).size).toBe(5);
  });
  it('el dominio de cada apartado cuenta la evidencia de ambos dispositivos una sola vez', () => {
    expect(data.mastery['3.2']!.attempts).toBe(3); // común + uno del PC + uno del iPad
    expect(data.mastery['7.7']!.attempts).toBe(1);
    expect(data.mastery['6.3']!.attempts).toBe(1);
  });
  it('es idempotente: fusionar otra vez lo mismo no cambia nada', () => {
    const again = mergeProgress(data, ipad).data;
    expect(again).toEqual(data);
    expect(mergeProgress(data, pc).data).toEqual(data);
  });
  it('fusionar consigo mismo no cambia nada', () => {
    expect(mergeProgress(pc, pc).data.mastery).toEqual(pc.mastery);
    expect(mergeProgress(pc, pc).summary.addedAttempts).toBe(0);
  });
  it('tarjetas: gana el vencimiento más próximo', () => {
    const r = mergeProgress({ ...pc, cards: { '3.2': { nodeId: '3.2', box: 4, due: (T0 + 20 * DAY) } } }, { ...ipad, cards: { '3.2': { nodeId: '3.2', box: 1, due: (T0 + 5 * DAY) } } }).data;
    expect(r.cards['3.2']).toEqual({ nodeId: '3.2', box: 1, due: (T0 + 5 * DAY) });
  });
  it('cuaderno: unión, y superado en cualquiera de las dos copias queda superado', () => {
    const e = { exerciseId: 'b:2:1', generatorId: 'b', title: 'x', nodeIds: ['7.7'], at: (T0 + 3 * DAY), mode: 'practica' as const, misses: [{ prompt: 'p', kind: 'calculo' as const }], retries: 0 };
    const r = mergeProgress({ ...pc, notebook: [e] }, { ...ipad, notebook: [{ ...e, retries: 2, resolvedAt: (T0 + 6 * DAY), resolvedBy: 'variante' as const }, { ...e, exerciseId: 'c:2:1', at: (T0 + 4 * DAY) }] });
    expect(r.data.notebook).toHaveLength(2);
    expect(r.data.notebook.find((x) => x.exerciseId === 'b:2:1')).toMatchObject({ resolvedAt: (T0 + 6 * DAY), retries: 2, resolvedBy: 'variante' });
    expect(r.summary.resolvedNotebook).toBe(1);
    expect(r.summary.addedNotebook).toBe(1);
  });
  it('campaña: el mayor avance de cada misión', () => {
    const r = mergeProgress(
      { ...pc, campaign: { m1: { status: 'completada', step: 3, collected: ['a'], stars: 2, hintsUsed: 0, firstTry: true } } },
      { ...ipad, campaign: { m1: { status: 'en-curso', step: 1, collected: ['b'], stars: 3, hintsUsed: 1, firstTry: false }, m2: { status: 'en-curso', step: 0, collected: [], stars: 0, hintsUsed: 0, firstTry: true } } },
    ).data;
    expect(r.campaign.m1).toEqual({ status: 'completada', step: 3, collected: ['a', 'b'], stars: 3, hintsUsed: 1, firstTry: false });
    expect(r.campaign.m2).toBeDefined();
  });
  it('simulacros: unión por instante', () => {
    const ex = (at: number) => ({ at, scope: ['3.2'], total: 10, score: 5, byNode: {} });
    expect(mergeProgress({ ...pc, exams: [ex(1), ex(2)] }, { ...ipad, exams: [ex(2), ex(3)] }).data.exams.map((e) => e.at)).toEqual([1, 2, 3]);
  });
  it('historial lleno: no aplica lo anterior a su ventana (evita contar dos veces lo recortado)', () => {
    const full = device(Array.from({ length: 400 }, (_, i) => att(`z:2:${i}`, T0 + (10 + i) * DAY, '1.1')));
    const old = device([att('old:2:1', (T0 + 1 * DAY), '1.1')]);
    const r = mergeProgress(full, old).data;
    expect(r.mastery['1.1']!.attempts).toBe(400);
  });
});

describe('integración con el almacén: importar fusionando', async () => {
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 };
  const { useStore } = await import('./store');
  it('fusionar un archivo exportado de otro dispositivo conserva lo local y añade lo ajeno; deshacer lo revierte', () => {
    const st = useStore.getState();
    st.resetProgress();
    useStore.setState({ history: pc.history, mastery: pc.mastery });
    const other = JSON.stringify({ app: 'ATOM', version: 2, exportedAt: new Date().toISOString(), settings: {}, mastery: ipad.mastery, skills: {}, cards: {}, history: ipad.history, campaign: {}, exams: [], notebook: [] });
    const res = useStore.getState().importProgress(other, 'fusionar');
    expect(res.ok).toBe(true);
    expect(res.summary?.addedAttempts).toBe(2);
    expect(useStore.getState().history).toHaveLength(5);
    expect(useStore.getState().mastery['3.2']!.attempts).toBe(3);
    expect(useStore.getState().undoImport()).toBe(true);
    expect(useStore.getState().history).toHaveLength(3);
  });
});
