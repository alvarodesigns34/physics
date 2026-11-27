import { describe, expect, it } from 'vitest';
import { validInProgress } from './ExercisePlayer';
import { buildWaveExercise } from '../learning/generators/photon';

const ex = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 'onda-lambda:2:1');
const part = { value: '1', attempts: 1, result: null, done: false, revealed: false, credit: 0, errors: [], carried: false, sigFigIssue: false };
const ok = { id: ex.id, hints: 1, finished: false, parts: ex.parts.map(() => part) };

describe('Ejercicio en curso guardado: validación ante estados dañados', () => {
  it('acepta un estado coherente', () => expect(validInProgress(ok, ex)).toBe(true));
  it.each([
    ['otro ejercicio', { ...ok, id: 'onda-lambda:2:2' }],
    ['número de pasos distinto', { ...ok, parts: ok.parts.slice(1) }],
    ['pistas fuera de rango', { ...ok, hints: 9 }],
    ['crédito imposible', { ...ok, parts: ok.parts.map((p) => ({ ...p, credit: 3 })) }],
    ['valor de tipo erróneo', { ...ok, parts: ok.parts.map((p) => ({ ...p, value: 42 })) }],
    ['null', null],
    ['texto', 'basura'],
  ])('rechaza: %s', (_, v) => expect(validInProgress(v, ex)).toBe(false));
});
