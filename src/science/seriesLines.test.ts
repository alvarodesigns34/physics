import { describe, expect, it } from 'vitest';
import { seriesLines, transition } from './hydrogen';

describe('ATOM 6.0 · líneas de una serie (gráfica sincronizada)', () => {
  it('Balmer: Hα = 656,47 nm (vacío) y límite 364,71 nm; las líneas se acercan al límite', () => {
    const { lines, limitNm } = seriesLines(2, 10);
    expect(lines[0]!.n2).toBe(3);
    expect(lines[0]!.nm).toBeCloseTo(656.47, 1);
    expect(limitNm).toBeCloseTo(364.71, 1);
    for (let i = 1; i < lines.length; i++) expect(lines[i]!.nm).toBeLessThan(lines[i - 1]!.nm);
    expect(lines.at(-1)!.nm).toBeGreaterThan(limitNm);
  });
  it('Lyman: Lyα = 121,57 nm y límite 91,18 nm; coincide con transition()', () => {
    const { lines, limitNm } = seriesLines(1, 5);
    expect(lines[0]!.nm).toBeCloseTo(121.57, 1);
    expect(limitNm).toBeCloseTo(91.18, 1);
    expect(lines[2]!.nm).toBeCloseTo(transition(4, 1).wavelength * 1e9, 6);
  });
});
