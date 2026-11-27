/** Ejercicios de los documentos de clase, por documento y nivel. */
import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { BLOCKS } from '../../learning/syllabus';
import { SOURCE_EXERCISES, sourceLevel } from '../../learning/registry';
import type { Exercise } from '../../learning/types';
const LEVEL_LABEL = { 1: 'Básico', 2: 'Examen', 3: 'Avanzado' } as const;
const DOCS: { id: string; title: string; blurb: string; test: (ref: string) => boolean }[] = [
  { id: 'ebau', title: 'EBAU (La Rioja)', blurb: 'Cuestiones reales de selectividad: el nivel de examen más alto.', test: (r) => r.startsWith('EBAU') },
  { id: 'hoj', title: 'Hoja de ejercicios del tema', blurb: 'Ejercicios 1–28 de la hoja de clase, con sus datos.', test: (r) => r.startsWith('HOJ') },
  { id: 'amp', title: 'Ejercicios de ampliación y repaso', blurb: 'Los 31 ejercicios de ampliación (las tablas, fila a fila).', test: (r) => r.startsWith('AMP') },
  { id: 'teo', title: 'Ejemplos resueltos de la teoría', blurb: 'Los ejemplos y ejercicios que aparecen en los apuntes.', test: (r) => r.startsWith('TEO') },
];

export function Sources({ onPick }: { onPick: (e: Exercise) => void }) {
  const history = useStore((s) => s.history);
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0);
  const done = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const h of history) if (h.exerciseId.startsWith('src:')) m.set(h.exerciseId, (m.get(h.exerciseId) ?? false) || h.correct);
    return m;
  }, [history]);
  const items = useMemo(() => SOURCE_EXERCISES.map((s) => {
    const ex = s.build();
    return { s, id: ex.id, title: ex.title, level: sourceLevel(s), block: Number((s.nodeIds[0] ?? '1').split('.')[0]) };
  }), []);
  return (
    <div className="stack-16">
      <p className="lead" style={{ margin: 0 }}>
        Los ejercicios de tus apuntes, con sus datos originales, corrección paso a paso y pistas. Donde el enunciado tiene una errata, se indica y se explica.
      </p>
      <div className="row row--wrap" style={{ gap: 8 }}>
        <span className="small muted">Nivel</span>
        <div className="segmented" role="radiogroup" aria-label="Nivel">
          {([0, 1, 2, 3] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)}>
              {l === 0 ? 'Todos' : LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <span className="small faint">
          {items.filter((i) => done.get(i.id)).length} de {items.length} resueltos
        </span>
      </div>
      {DOCS.map((d) => {
        const list = items.filter((i) => d.test(i.s.ref) && (level === 0 || i.level === level));
        if (!list.length) return null;
        const blocks = [...new Set(list.map((i) => i.block))].sort((a, b) => a - b);
        return (
          <section key={d.id} className="stack-12 source-doc">
            <header className="stack-8" style={{ gap: 2 }}>
              <span className="h3">{d.title}</span>
              <span className="small muted">{d.blurb}</span>
            </header>
            {blocks.map((b) => (
              <div key={b} className="stack-8">
                <span className="small faint">
                  {b}. {BLOCKS.find((x) => x.id === b)?.title}
                </span>
                <div className="source-grid">
                  {list
                    .filter((i) => i.block === b)
                    .map((i) => {
                      const st = done.get(i.id);
                      return (
                        <button key={i.s.ref} type="button" className="source-card" data-level={i.level} data-done={st === true ? 'ok' : st === false ? 'tried' : 'no'} onClick={() => onPick(i.s.build())}>
                          <span className="row row--between" style={{ gap: 6 }}>
                            <span className="mono small">{i.s.ref}</span>
                            <span className={`level-chip level-chip--${i.level}`}>{LEVEL_LABEL[i.level]}</span>
                          </span>
                          <span className="small source-card__title">{i.title}</span>
                          <span className="small faint">
                            {st === true ? '✓ Resuelto' : st === false ? 'Intentado' : i.s.nodeIds.slice(0, 2).join(' · ')}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
