import { describe, expect, it } from 'vitest';
import { separateLabels, type LabelBox } from './labels';

const box = (x: number, y: number, align: LabelBox['align'] = 'left', w = 50, h = 16): LabelBox => ({ x, y, w, h, align });

describe('separateLabels', () => {
  it('no mueve etiquetas que no se tocan', () => {
    expect(separateLabels([box(0, 0), box(0, 40), box(200, 5)])).toEqual([0, 40, 5]);
  });
  it('separa dos etiquetas casi superpuestas (Cl-35 / Cl-37)', () => {
    const ys = separateLabels([box(300, 100), box(302, 104)]);
    expect(ys[0]).toBe(100);
    expect(ys[1]! - ys[0]!).toBeGreaterThanOrEqual(18);
  });
  it('una columna de muchas etiquetas acaba sin solapes, en el mismo orden vertical', () => {
    const boxes = Array.from({ length: 10 }, (_, i) => box(300 + i, 100 + i * 3));
    const ys = separateLabels(boxes);
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(18);
  });
  it('tiene en cuenta la alineación: «right» se extiende hacia la izquierda', () => {
    // a la derecha del ancla 100 (left) y a la izquierda del ancla 95 (right): no se tocan
    expect(separateLabels([box(100, 0, 'left'), box(95, 2, 'right')])).toEqual([0, 2]);
  });
});
