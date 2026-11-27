import { describe, expect, it } from 'vitest';
import { addMiss, registerClean, recurrentDifficulties, conceptualGaps, type NotebookEntry } from './notebook';

const DAY = 86_400_000;
const miss = (id: string, gen: string, nodes: string[], kind: NotebookEntry['misses'][number]['kind'], at = 0): Omit<NotebookEntry, 'retries'> => ({ exerciseId: id, generatorId: gen, title: id, nodeIds: nodes, at, mode: 'practica', misses: [{ prompt: 'p', kind }] });

describe('cuaderno de errores', () => {
  it('un mismo ejercicio fallado dos veces no duplica la entrada', () => {
    let l = addMiss([], miss('rydberg:2:1', 'rydberg', ['3.6'], 'calculo'));
    l = addMiss(l, miss('rydberg:2:1', 'rydberg', ['3.6'], 'inverso'));
    expect(l).toHaveLength(1);
    expect(l[0]!.retries).toBe(1);
    expect(l[0]!.misses[0]!.kind).toBe('inverso');
  });
  it('se supera con una VARIANTE nueva, no repitiendo el mismo enunciado', () => {
    const l = addMiss([], miss('rydberg:2:1', 'rydberg', ['3.6'], 'calculo'));
    expect(registerClean(l, { id: 'rydberg:2:1', generatorId: 'rydberg' }, 10).resolved).toBe(0);
    const r = registerClean(l, { id: 'rydberg:2:99', generatorId: 'rydberg' }, 10);
    expect(r.resolved).toBe(1);
    expect(r.list[0]!.resolvedBy).toBe('variante');
  });
  it('los ejercicios de los documentos (sin variantes) se superan repitiéndolos días después', () => {
    const l = addMiss([], miss('src:HOJ 12', 'fuentes', ['7.2'], 'concepto', 0));
    expect(registerClean(l, { id: 'src:HOJ 12', generatorId: 'fuentes' }, DAY).resolved).toBe(0);
    expect(registerClean(l, { id: 'src:HOJ 12', generatorId: 'fuentes' }, 3 * DAY).list[0]!.resolvedBy).toBe('mismo-dias-despues');
  });
  it('dificultades recurrentes: el mismo error en varios ejercicios abiertos', () => {
    let l: NotebookEntry[] = [];
    l = addMiss(l, miss('a:2:1', 'a', ['3.2'], 'orden-de-magnitud'));
    l = addMiss(l, miss('b:2:1', 'b', ['3.6'], 'orden-de-magnitud'));
    l = addMiss(l, miss('c:2:1', 'c', ['3.1'], 'calculo'));
    const rec = recurrentDifficulties(l);
    expect(rec).toHaveLength(1);
    expect(rec[0]!.kind).toBe('orden-de-magnitud');
    expect(rec[0]!.nodes).toEqual(['3.2', '3.6']);
  });
  it('lagunas: errores conceptuales repetidos, o fallos repetidos sobre un prerrequisito sin practicar', () => {
    let l: NotebookEntry[] = [];
    l = addMiss(l, miss('a:2:1', 'a', ['6.4'], 'regla'));
    l = addMiss(l, miss('b:2:1', 'b', ['6.4'], 'idea-erronea'));
    l = addMiss(l, miss('c:2:1', 'c', ['3.7'], 'calculo'));
    l = addMiss(l, miss('d:2:1', 'd', ['3.7'], 'calculo'));
    const g = conceptualGaps(l, {});
    expect(g.find((x) => x.node === '6.4')?.reason).toBe('conceptual');
    expect(g.find((x) => x.node === '3.7')).toMatchObject({ reason: 'prerrequisito', study: '3.6' });
  });
});
