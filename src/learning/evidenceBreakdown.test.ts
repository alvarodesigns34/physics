import { describe, expect, it } from 'vitest';
import { evidenceBreakdown } from './evidence';

const h = (nodeIds: string[], score: number, extra: Record<string, unknown> = {}) => ({ nodeIds, score, hintsUsed: 0, ...extra });

describe('evidenceBreakdown (ATOM 4.0)', () => {
  it('sin intentos: sin evidencia', () => {
    const b = evidenceBreakdown([], '3.2');
    expect(b.total).toBe(0);
    expect(b.summary).toMatch(/Sin evidencia/);
  });
  it('usa el tipo de evidencia DEL APARTADO, no el global del intento', () => {
    const b = evidenceBreakdown([h(['3.2', '3.9'], 0.5, { evidence: 'asistida', nodeEvidence: { '3.2': { y: 1, kind: 'demostrada' }, '3.9': { y: 0, kind: 'asistida' } } })], '3.2');
    expect(b.successes.demostrada).toBe(1);
    expect(b.misses).toBe(0);
  });
  it('aciertos tipo test (posible azar) no cuentan como comprensión demostrada', () => {
    const hist = [1, 2, 3].map(() => h(['4.1'], 1, { nodeEvidence: { '4.1': { y: 1, kind: 'posible-azar' } } }));
    const b = evidenceBreakdown(hist, '4.1');
    expect(b.successes['posible-azar']).toBe(3);
    expect(b.summary).toMatch(/Ningún acierto demostrado/);
  });
  it('intentos antiguos sin tipo: limpios → demostrada; con pistas → asistida', () => {
    const b = evidenceBreakdown([h(['1.1'], 1), h(['1.1'], 1, { hintsUsed: 2 }), h(['1.1'], 0.2)], '1.1');
    expect(b.successes).toMatchObject({ demostrada: 1, asistida: 1 });
    expect(b.misses).toBe(1);
    expect(b.summary).toMatch(/mixta/);
  });
  it('mayoría demostrada → evidencia sólida', () => {
    const b = evidenceBreakdown([h(['2.1'], 1), h(['2.1'], 1), h(['2.1'], 0.9, { evidence: 'autoevaluada' })], '2.1');
    expect(b.summary).toMatch(/sólida: 2 de 3/);
  });
});
