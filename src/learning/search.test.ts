import { describe, expect, it } from 'vitest';
import { search, normalize } from './search';

describe('búsqueda global de conceptos (G11)', () => {
  it.each([
    ['Rydberg', '3.6', '/fotones'],
    ['Hund', '6.4', '/arquitecto'],
    ['isótopos', '1.3', '/forja'],
    ['energía de ionización', '7.9', '/periodico'],
  ])('«%s» devuelve teoría, laboratorio y práctica', (q, node, lab) => {
    const r = search(q);
    expect(r.some((h) => h.kind === 'teoria'), 'teoría').toBe(true);
    expect(r.some((h) => h.kind === 'laboratorio' && h.href === lab), `laboratorio ${lab}`).toBe(true);
    expect(r.some((h) => h.kind === 'practica' && h.href.includes(node)), `práctica ${node}`).toBe(true);
  });
  it('ignora tildes y mayúsculas, y tolera prefijos', () => {
    expect(normalize('Energía de IONIZACIÓN')).toBe('energia de ionizacion');
    expect(search('isotop').some((h) => h.kind === 'practica')).toBe(true);
    expect(search('MÖLLER').some((h) => h.href.includes('6.3'))).toBe(true);
  });
  it('consultas vacías o de una letra no devuelven nada', () => {
    expect(search('')).toEqual([]);
    expect(search('a')).toEqual([]);
  });
  it('limita y no duplica resultados', () => {
    const r = search('radio', 8);
    expect(r.length).toBeLessThanOrEqual(8);
    expect(new Set(r.map((h) => h.href + h.title)).size).toBe(r.length);
  });
});
