import { describe, expect, it } from 'vitest';
import { BOX_INTERVAL_DAYS, updateCard } from './mastery';
import { selectNext } from './session';

const DAY = 86_400_000;

describe('Repetición espaciada graduada por evidencia (ATOM 4.0)', () => {
  it('acierto demostrado sube de caja', () => {
    expect(updateCard({ nodeId: '3.6', box: 2, due: 0 }, '3.6', true, 0, 'demostrada').box).toBe(3);
  });
  it.each(['asistida', 'autoevaluada', 'posible-azar'] as const)('acierto %s mantiene la caja y su intervalo', (k) => {
    const c = updateCard({ nodeId: '3.6', box: 3, due: 0 }, '3.6', true, 1000, k);
    expect(c.box).toBe(3);
    expect(c.due).toBe(1000 + BOX_INTERVAL_DAYS[3] * DAY);
  });
  it('primer acierto con ayuda empieza en caja 1, no en 2', () => {
    expect(updateCard(undefined, '3.6', true, 0, 'asistida').box).toBe(1);
    expect(updateCard(undefined, '3.6', true, 0).box).toBe(2);
  });
  it('un fallo siempre vuelve a caja 1', () => {
    expect(updateCard({ nodeId: '3.6', box: 5, due: 0 }, '3.6', false, 0, 'demostrada').box).toBe(1);
  });
});

describe('Selección: el cuaderno de errores reintroduce variantes nuevas', () => {
  const now = 1_800_000_000_000;
  const entry = { generatorId: 'onda-lambda', nodeIds: ['3.2'], title: 'Una radiación', at: now - 3_600_000 };
  const base = { mastery: {}, cards: {}, recent: [], sessionRetry: {} };
  const picks = (notebook: (typeof entry & { resolvedAt?: number })[], scope: string[] = []) =>
    Array.from({ length: 60 }, (_, s) => selectNext({ ...base, notebook }, scope, now, s + 1));

  it('una entrada abierta vuelve como variante del mismo generador en parte de los ejercicios', () => {
    const sel = picks([entry]).filter((x) => x.reason === 'cuaderno');
    expect(sel.length).toBeGreaterThan(8);
    expect(sel.length).toBeLessThan(40);
    for (const x of sel) {
      expect(x.exercise.generatorId).toBe('onda-lambda');
      expect(x.explanation).toMatch(/cuaderno de errores/);
    }
  });
  it('no reintroduce lo recién fallado (< 10 min), lo ya superado ni lo que está fuera del ámbito', () => {
    expect(picks([{ ...entry, at: now - 60_000 }]).some((x) => x.reason === 'cuaderno')).toBe(false);
    expect(picks([{ ...entry, resolvedAt: now - 1 }]).some((x) => x.reason === 'cuaderno')).toBe(false);
    expect(picks([entry], ['1.1']).some((x) => x.reason === 'cuaderno')).toBe(false);
  });
  it('el repaso vencido tiene prioridad sobre el cuaderno', () => {
    const s = selectNext({ ...base, cards: { '3.8': { nodeId: '3.8', box: 1, due: now - 1 } }, notebook: [entry] }, [], now, 3);
    expect(s.reason).toBe('repaso');
  });
});
