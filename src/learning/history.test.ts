import { describe, expect, it } from 'vitest';
import { STORIES, PHENOMENA, STEP_TITLE } from './history';
// Mismos identificadores que la línea temporal de History.tsx (se comprueba también en la e2e).
const MODELS = ['dalton', 'thomson', 'rutherford', 'bohr', 'chadwick', 'actual'].map((id) => ({ id }));

describe('Time Machine 3.0: recorrido de cada modelo', () => {
  it('cada modelo de la línea temporal tiene sus 7 pasos en orden y una predicción válida', () => {
    for (const m of MODELS) {
      const st = STORIES.find((s) => s.model === m.id);
      expect(st, m.id).toBeDefined();
      expect(st!.steps.map((s) => s.key)).toEqual(Object.keys(STEP_TITLE));
      expect(st!.predict.options.some((o) => o.id === st!.predict.correct)).toBe(true);
      for (const s of st!.steps) expect(s.text.length, `${m.id}/${s.key}`).toBeGreaterThan(40);
    }
  });
  it('la matriz cubre todos los modelos y es coherente con los «límites» de cada uno', () => {
    for (const p of PHENOMENA) for (const m of MODELS) expect(p.verdicts[m.id as keyof typeof p.verdicts], `${p.id}/${m.id}`).toBeDefined();
    const v = (id: string, m: string) => PHENOMENA.find((p) => p.id === id)!.verdicts[m as 'bohr'];
    expect(v('rebotes', 'thomson')).toBe('no');
    expect(v('estabilidad', 'rutherford')).toBe('no');
    expect(v('lineas-h', 'bohr')).toBe('si');
    expect(v('multi', 'bohr')).toBe('no');
    expect(v('electron', 'dalton')).toBe('no');
  });
});
