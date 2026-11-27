import { describe, expect, it } from 'vitest';
import { anomalies, seriesElements } from '../modules/periodic/Trends';

describe('Periodic Universe 3.0: tendencias y excepciones desde los datos', () => {
  it('EI₁: B y O en el periodo 2; Al y S en el periodo 3', () => {
    expect(anomalies('ei1', { kind: 'periodo', n: 2 }, seriesElements({ kind: 'periodo', n: 2 })).map((a) => a.el.symbol)).toEqual(['B', 'O']);
    expect(anomalies('ei1', { kind: 'periodo', n: 3 }, seriesElements({ kind: 'periodo', n: 3 })).map((a) => a.el.symbol)).toEqual(['Al', 'S']);
  });
  it('radio en el grupo 1: crece al bajar sin excepciones', () => {
    expect(anomalies('radio', { kind: 'grupo', n: 1 }, seriesElements({ kind: 'grupo', n: 1 }))).toEqual([]);
  });
  it('el periodo 4 muestra solo los grupos principales (s y p)', () => {
    const els = seriesElements({ kind: 'periodo', n: 4 });
    expect(els.every((e) => e.block === 's' || e.block === 'p')).toBe(true);
    expect(els.map((e) => e.symbol)).toContain('Ga');
  });
});

describe('datos ausentes ≠ cero (auditoría de ATOM 3.0)', async () => {
  const { affinityStatus, elementByZ } = await import('./elements');
  const { PROPERTIES, propertyText } = await import('./trends');
  it('anión no ligado → 0; sin datos → null', () => {
    for (const z of [7, 10, 12, 30, 80]) {
      expect(affinityStatus(elementByZ(z)!)).toBe('no-ligado');
      expect(PROPERTIES.ae.get(elementByZ(z)!)).toBe(0);
    }
    for (const z of [61, 62, 90, 92, 95]) {
      expect(affinityStatus(elementByZ(z)!), String(z)).toBe('sin-datos');
      expect(PROPERTIES.ae.get(elementByZ(z)!)).toBeNull();
      expect(propertyText('ae', elementByZ(z)!)).toBe('sin datos');
    }
    expect(propertyText('ae', elementByZ(7)!)).toMatch(/no estable/);
    expect(affinityStatus(elementByZ(17)!)).toBe('medida');
  });
  it('las tendencias no fabrican excepciones con datos ausentes', () => {
    const els = seriesElements({ kind: 'periodo', n: 4 });
    for (const a of anomalies('ae', { kind: 'periodo', n: 4 }, els)) expect(PROPERTIES.ae.get(a.el)).not.toBeNull();
  });
});
