/**
 * Time Machine 3.0: recorrido de 7 pasos por modelo (con predicción antes de la observación) y matriz de
 * qué explica cada modelo. Los textos están en src/learning/history.ts.
 */
import { useEffect, useState } from 'react';
import { STORIES, PHENOMENA, type ModelKey, type Verdict } from '../../learning/history';
import { Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';

const MODEL_SHORT: Record<ModelKey, string> = { dalton: 'Dalton', thomson: 'Thomson', rutherford: 'Rutherford', bohr: 'Bohr', chadwick: 'Chadwick', actual: 'Cuántico' };

export function ModelStoryView({ model }: { model: ModelKey }) {
  const story = STORIES.find((s) => s.model === model)!;
  const [step, setStep] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  useEffect(() => {
    setStep(0);
    setGuess(null);
  }, [model]);
  const s = story.steps[step]!;
  // No se puede saltar más allá de la observación sin haber hecho antes la predicción.
  const obsIndex = story.steps.findIndex((x) => x.key === 'observacion');
  const needsPrediction = s.key === 'observacion' && guess === null;
  return (
    <section className="story" aria-label="Recorrido del modelo">
      <ol className="story__dots" aria-label="Pasos">
        {story.steps.map((st, i) => (
          <li key={st.key}>
            <button type="button" aria-current={i === step ? 'step' : undefined} aria-label={`${i + 1}. ${st.title}`} className={i < step ? 'done' : undefined} onClick={() => setStep(guess === null ? Math.min(i, obsIndex) : i)}>
              {i + 1}
            </button>
          </li>
        ))}
      </ol>
      <div className="story__card fade" key={`${model}-${step}-${needsPrediction}`}>
        <span className="eyebrow">
          {step + 1}/7 · {s.title}
        </span>
        {needsPrediction ? (
          <div className="stack-8">
            <p className="story__text">
              <strong>Antes de verlo, predice.</strong> {story.predict.question}
            </p>
            <div className="stack-8" role="radiogroup" aria-label="Tu predicción">
              {story.predict.options.map((o) => (
                <button key={o.id} type="button" className="btn" style={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', fontWeight: 450 }} onClick={() => setGuess(o.id)}>
                  {o.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {s.key === 'observacion' && guess !== null && (
              <Feedback tone={guess === story.predict.correct ? 'ok' : 'warn'}>
                {guess === story.predict.correct ? 'Tu predicción coincide con la del modelo. ' : 'No es lo que predice el modelo. '}
                {story.predict.explain}
              </Feedback>
            )}
            <p className="story__text">{s.text}</p>
          </>
        )}
      </div>
      <div className="row row--between">
        <button type="button" className="btn btn--ghost btn--sm" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>
          <Icon name="arrow-left" size={16} /> Anterior
        </button>
        {story.lab && step >= 3 && (
          <a className="small link" href={story.lab.href}>
            Reprodúcelo: {story.lab.label}
          </a>
        )}
        <button type="button" className="btn btn--sm btn--primary" disabled={step === 6 || needsPrediction} onClick={() => setStep((x) => x + 1)}>
          Siguiente <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </section>
  );
}

const VERDICT: Record<Verdict, { sym: string; label: string; cls: string }> = {
  si: { sym: '✓', label: 'lo explica', cls: 'v-si' },
  no: { sym: '✗', label: 'no lo explica o lo contradice', cls: 'v-no' },
  na: { sym: '—', label: 'fuera de su alcance', cls: 'v-na' },
};

export function ModelMatrix({ current }: { current: ModelKey }) {
  const [open, setOpen] = useState<string | null>(null);
  const models = Object.keys(MODEL_SHORT) as ModelKey[];
  return (
    <section className="section" aria-label="Qué explica cada modelo">
      <span className="eyebrow">Qué explica cada modelo</span>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col">Fenómeno</th>
              {models.map((m) => (
                <th key={m} scope="col" className={m === current ? 'is-current' : undefined}>
                  {MODEL_SHORT[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PHENOMENA.map((p) => (
              <tr key={p.id} onClick={() => setOpen(open === p.id ? null : p.id)} className={open === p.id ? 'is-open' : undefined}>
                <th scope="row">{p.label}</th>
                {models.map((m) => {
                  const v = VERDICT[p.verdicts[m]];
                  return (
                    <td key={m} className={`${v.cls}${m === current ? ' is-current' : ''}`} title={`${MODEL_SHORT[m]}: ${v.label}`}>
                      <span aria-label={v.label}>{v.sym}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <p className="small muted" style={{ margin: 0 }}>{PHENOMENA.find((p) => p.id === open)!.note}</p>}
      <span className="small faint">✓ lo explica · ✗ no lo explica o lo contradice · — fuera de su alcance. Toca una fila para ver por qué.</span>
    </section>
  );
}
