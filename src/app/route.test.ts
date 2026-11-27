import { describe, expect, it } from 'vitest';
import { parseHash } from './hooks';
import { exerciseFromId } from '../learning/examSession';

describe('ATOM 5.1 · rutas defensivas', () => {
  it('ruta válida con parámetros', () => {
    const r = parseHash('#/entrenamiento?v=ruta&n=3.6');
    expect(r.route).toBe('/entrenamiento');
    expect(r.query.get('n')).toBe('3.6');
  });
  it.each(['#/desconocida', '#javascript:alert(1)', '#//evil', '#/forja/../../x', '#/' + 'a'.repeat(5000), '#%E0%A4%A'])('ruta dañada «%s» → inicio, sin lanzar', (h) => {
    expect(() => parseHash(h)).not.toThrow();
    expect(parseHash(h).route).toBe('/');
  });
  it('descarta parámetros abusivos', () => {
    const r = parseHash(`#/guia?n=${'9'.repeat(500)}&b=2&__proto__=1&n=otro&x=<script>`);
    expect(r.query.get('n')).toBe('otro'); // la de 500 caracteres se descarta; vale la siguiente válida
    expect(r.query.get('b')).toBe('2');
    expect(r.query.has('__proto__')).toBe(false);
    expect(r.query.get('x')).toBeNull();
  });
  it('ids de ejercicio: longitud y semilla acotadas', () => {
    expect(exerciseFromId('onda-lambda:1:99999999999999999999')).toBeNull();
    expect(exerciseFromId('x'.repeat(500))).toBeNull();
    expect(exerciseFromId('onda-lambda:1:7')?.id).toBe('onda-lambda:1:7');
    expect(exerciseFromId(undefined as never)).toBeNull();
  });
});
