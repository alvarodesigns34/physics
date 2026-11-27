import { describe, expect, it } from 'vitest';
import { relations, variantsOf } from './speciesRelations';

const sp = (z: number, a: number, q = 0) => ({ z, n: a - z, e: z - q });
describe('relaciones entre especies', () => {
  it('isótopos, iones, isóbaros, isótonos e isoelectrónicos', () => {
    expect(relations(sp(17, 35), sp(17, 37))).toEqual(['isotopos']);
    expect(relations(sp(11, 23), sp(11, 23, 1))).toEqual(['iones']);
    expect(relations(sp(6, 14), sp(7, 14))).toEqual(['isobaros']);
    expect(relations(sp(6, 13), sp(7, 14))).toEqual(['isotonos']);
    expect(relations(sp(8, 16, -2), sp(11, 23, 1))).toEqual(['isoelectronicas']);
    expect(relations(sp(9, 19, -1), sp(10, 20))).toEqual(['isotonos', 'isoelectronicas']);
  });
  it('cada variante didáctica tiene la relación que anuncia', () => {
    const c = sp(6, 12);
    const v = variantsOf(c);
    const rel = (label: string) => relations(c, v.find((x) => x.label.startsWith(label))!.sp);
    expect(rel('Isótopo (+1')).toContain('isotopos');
    expect(rel('Catión')).toContain('iones');
    expect(rel('Isoelectrónico')).toContain('isoelectronicas');
    expect(rel('Isóbaro')).toContain('isobaros');
  });
});
