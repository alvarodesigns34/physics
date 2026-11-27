/**
 * Cuaderno inteligente de errores: qué fallaste, el patrón que se repite, la laguna probable y cómo
 * superarlo (con una variante nueva, no repitiendo de memoria).
 */
import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { recurrentDifficulties, conceptualGaps, type NotebookEntry } from '../../learning/notebook';
import { ERROR_LABEL } from '../../learning/evidence';
import { SKILL_PRACTICE_NODES } from '../../learning/diagnosis';
import { nodeTitle } from '../../learning/syllabus';
import { guideAnchor } from '../../learning/guide';
import type { ErrorKind, SkillId } from '../../learning/types';

const SKILL_OF_KIND: Partial<Record<ErrorKind, SkillId>> = {
  'unidad-falta': 'unidades',
  'unidad-incompatible': 'unidades',
  'orden-de-magnitud': 'unidades',
  signo: 'calculo',
  inverso: 'formula',
  'idea-erronea': 'concepto',
  redondeo: 'calculo',
  calculo: 'calculo',
  cifras: 'cifras',
  regla: 'notacion',
  concepto: 'concepto',
};

const kindLabel = (k: NotebookEntry['misses'][number]['kind']) => (k === 'revelado' ? 'paso visto resuelto' : ERROR_LABEL[k]);
const when = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export function NotebookView() {
  const notebook = useStore((s) => s.notebook);
  const mastery = useStore((s) => s.mastery);
  const [showResolved, setShowResolved] = useState(false);
  const open = useMemo(() => [...notebook].filter((x) => !x.resolvedAt).sort((a, b) => b.at - a.at), [notebook]);
  const resolved = useMemo(() => [...notebook].filter((x) => x.resolvedAt).sort((a, b) => b.resolvedAt! - a.resolvedAt!), [notebook]);
  const rec = useMemo(() => recurrentDifficulties(notebook), [notebook]);
  const gaps = useMemo(() => conceptualGaps(notebook, mastery), [notebook, mastery]);
  if (notebook.length === 0) {
    return (
      <div className="panel-card stack-8">
        <span className="h3">Tu cuaderno está vacío</span>
        <p className="small muted" style={{ margin: 0 }}>
          Cada ejercicio en el que falles un paso (o tengas que verlo resuelto) aparecerá aquí con su diagnóstico. Lo darás por superado cuando aciertes una <strong>variante nueva</strong> a la primera.
        </p>
      </div>
    );
  }
  return (
    <div className="stack-24">
      <div className="nb-summary">
        <div>
          <span className="nb-big num">{open.length}</span>
          <span className="small muted">por superar</span>
        </div>
        <div>
          <span className="nb-big num" style={{ color: 'var(--ok)' }}>
            {resolved.length}
          </span>
          <span className="small muted">superados con una variante</span>
        </div>
        <p className="small faint" style={{ margin: 0, maxWidth: '46ch' }}>
          Un error se supera al acertar otra versión del mismo tipo de ejercicio al primer intento y sin pistas: así se comprueba que no es memoria.
        </p>
      </div>

      {(rec.length > 0 || gaps.length > 0) && (
        <section className="nb-insights" aria-label="Patrones detectados">
          {gaps.map((g) => (
            <article key={g.node + g.reason} className="nb-insight nb-insight--gap">
              <span className="eyebrow">{g.reason === 'conceptual' ? 'Posible laguna conceptual' : 'Posible base débil'}</span>
              <p className="small" style={{ margin: 0 }}>
                {g.message}
              </p>
              <div className="row row--wrap" style={{ gap: 6 }}>
                <a className="btn btn--sm btn--primary" href={`#/guia?n=${guideAnchor(g.study)}`}>
                  Releer «{nodeTitle(g.study)}»
                </a>
                <a className="btn btn--sm" href={`#/entrenamiento?v=ruta&n=${g.study}`}>
                  Ruta de estudio
                </a>
              </div>
            </article>
          ))}
          {rec.map((r) => {
            const skill = r.kind === 'revelado' ? undefined : SKILL_OF_KIND[r.kind];
            const drill = skill ? SKILL_PRACTICE_NODES[skill] : r.nodes;
            return (
              <article key={r.kind} className="nb-insight">
                <span className="eyebrow">Error que se repite</span>
                <p className="small" style={{ margin: 0 }}>
                  {r.message}
                </p>
                <a className="btn btn--sm" style={{ alignSelf: 'flex-start' }} href={`#/entrenamiento?v=practica&nodes=${drill.join(',')}`}>
                  Practicar justo eso
                </a>
              </article>
            );
          })}
        </section>
      )}

      <section className="stack-12" aria-label="Ejercicios por superar">
        <span className="h3">Por superar</span>
        {open.length === 0 && <p className="small muted">Todo superado. Buen trabajo.</p>}
        <ul className="nb-list">
          {open.map((e) => (
            <li key={e.exerciseId + e.at} className="nb-item">
              <div className="nb-item__head">
                <span className="nb-item__title">{e.title}</span>
                <span className="small faint">
                  {when(e.at)} · {e.mode === 'examen' ? 'simulacro' : 'práctica'}
                  {e.retries > 0 ? ` · fallado ${e.retries + 1} veces` : ''}
                </span>
              </div>
              <ul className="nb-misses">
                {e.misses.map((m, k) => (
                  <li key={k} className="small">
                    <span className="err-tag">{kindLabel(m.kind)}</span> {m.prompt}
                  </li>
                ))}
              </ul>
              <div className="row row--wrap" style={{ gap: 6 }}>
                {e.generatorId !== 'fuentes' ? (
                  <a className="btn btn--sm btn--primary" href={`#/entrenamiento?gen=${e.generatorId}`}>
                    Probar una variante nueva
                  </a>
                ) : (
                  <a className="btn btn--sm btn--primary" href={`#/entrenamiento?ex=${encodeURIComponent(e.exerciseId)}`}>
                    Repetirlo (cuenta pasados 2 días)
                  </a>
                )}
                <a className="btn btn--ghost btn--sm" href={`#/entrenamiento?ex=${encodeURIComponent(e.exerciseId)}&modo=revision`}>
                  Ver la resolución
                </a>
                <a className="btn btn--ghost btn--sm" href={`#/guia?n=${guideAnchor(e.nodeIds[0] ?? '1.1')}`}>
                  Teoría
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {resolved.length > 0 && (
        <section className="stack-8">
          <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} aria-expanded={showResolved} onClick={() => setShowResolved((x) => !x)}>
            {showResolved ? 'Ocultar' : 'Ver'} los {resolved.length} superados
          </button>
          {showResolved && (
            <ul className="nb-list">
              {resolved.map((e) => (
                <li key={e.exerciseId + e.at} className="nb-item nb-item--done">
                  <span className="nb-item__title">{e.title}</span>
                  <span className="small faint">
                    superado el {when(e.resolvedAt!)} {e.resolvedBy === 'variante' ? 'con una variante nueva' : 'repitiéndolo días después'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
