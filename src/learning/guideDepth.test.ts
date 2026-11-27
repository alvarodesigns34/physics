import { describe, expect, it } from 'vitest';
import { DEPTH } from './guideDepth';
import { LESSONS } from './guide';

const keys = LESSONS.flatMap((l) => l.sections.map((s) => s.id ?? s.node));

describe('Profundidad didáctica de la guía (ATOM 4.0)', () => {
  it('cada sección de la guía tiene su «por qué», cómo se pregunta y al menos una duda', () => {
    const missing = keys.filter((k) => !DEPTH[k]);
    expect(missing).toEqual([]);
    for (const k of keys) {
      const d = DEPTH[k]!;
      expect(d.why.length, k).toBeGreaterThan(60);
      expect(d.exam.length, k).toBeGreaterThan(0);
      expect(d.doubts.length, k).toBeGreaterThan(0);
    }
  });
  it('no hay entradas huérfanas (claves que no existen en la guía)', () => {
    expect(Object.keys(DEPTH).filter((k) => !keys.includes(k))).toEqual([]);
  });
  it('toda analogía declara dónde deja de funcionar', () => {
    for (const [k, d] of Object.entries(DEPTH)) if (d.analogy) expect(d.analogy.limit.length, k).toBeGreaterThan(30);
  });
  it('las dudas son preguntas y tienen respuesta', () => {
    for (const [k, d] of Object.entries(DEPTH)) for (const q of d.doubts) {
      expect(q.q, k).toMatch(/¿[^?]+\?$/);
      expect(q.a.length, k).toBeGreaterThan(30);
    }
  });
});
