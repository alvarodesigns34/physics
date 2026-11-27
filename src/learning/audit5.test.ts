/** ATOM 5.0 · Hallazgos de la auditoría externa de ATOM 4.0 (modelo y evidencia). */
import { describe, expect, it } from 'vitest';
import { buildEvidence, type PartRecord } from './evidence';
import { buildWaveExercise } from './generators/photon';
import { repetitionFactor } from '../state/store';

const rec = (id: string, extra: Partial<PartRecord> = {}): PartRecord => ({ id, credit: 1, attempts: 1, revealed: false, errors: [], carried: false, sigFigIssue: false, ...extra });

describe('Pistas: un acierto tras consultar pistas NO es comprensión demostrada', () => {
  const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
  it('el paso con pistas a la vista hereda «asistida» en apartados y competencias', () => {
    const ev = buildEvidence(ex, ex.parts.map((p, i) => rec(p.id, i === 1 ? { hinted: true } : {})));
    for (const v of Object.values(ev.nodes)) expect(v.kind).toBe('asistida');
    expect(Object.values(ev.skills).some((v) => v?.kind === 'asistida')).toBe(true);
  });
  it('sin pistas, primer intento y respuesta abierta → demostrada', () => {
    const ev = buildEvidence({ ...ex, parts: [ex.parts[0]!] }, [rec(ex.parts[0]!.id)]);
    expect(Object.values(ev.nodes).every((v) => v.kind === 'demostrada')).toBe(true);
    expect(Object.values(ev.skills).every((v) => v?.kind === 'demostrada')).toBe(true);
  });
});

describe('Competencias: el azar se trata igual que en los apartados', () => {
  it('un paso de opciones transmite su probabilidad de acierto al azar a la competencia', () => {
    const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
    const choice = ex.parts.find((p) => p.answer.kind === 'choice');
    if (!choice) return;
    const ev = buildEvidence({ ...ex, parts: [choice] }, [rec(choice.id)]);
    const v = Object.values(ev.skills)[0]!;
    expect(v.guess).toBeGreaterThan(0);
  });
});

describe('Repetir el mismo enunciado no infla el dominio', () => {
  const now = 10 * 86_400_000;
  it('primera vez peso 1; repetida 0,35 y luego 0,15; tras ≥ 2 días 0,6', () => {
    expect(repetitionFactor([], 'a:2:1', now)).toBe(1);
    expect(repetitionFactor([{ exerciseId: 'a:2:1', at: now - 1000 }], 'a:2:1', now)).toBe(0.35);
    expect(repetitionFactor([{ exerciseId: 'a:2:1', at: now - 2000 }, { exerciseId: 'a:2:1', at: now - 1000 }], 'a:2:1', now)).toBe(0.15);
    expect(repetitionFactor([{ exerciseId: 'a:2:1', at: now - 3 * 86_400_000 }], 'a:2:1', now)).toBe(0.6);
    expect(repetitionFactor([{ exerciseId: 'a:2:2', at: now - 1000 }], 'a:2:1', now)).toBe(1);
  });
});
