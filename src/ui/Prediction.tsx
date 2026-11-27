/**
 * ATOM 4.0 · Predicción antes del experimento.
 *
 * Primero se predice; luego el laboratorio ejecuta el experimento y se compara. Predecir obliga a usar el
 * modelo mental propio, y el contraste con el resultado es lo que deja huella (aprendizaje por error de
 * predicción). El resultado nunca se muestra antes de comprometerse con una respuesta.
 */
import { useEffect, useState } from 'react';
import { Feedback, announce } from './common';

export interface PredictionProps {
  /** Cambia cuando cambia el experimento (p. ej., otros niveles): reinicia la predicción */
  resetKey: string;
  question: string;
  options: { id: string; label: string }[];
  correct: string;
  /** Por qué es así (se muestra al comprobar) */
  explanation: string;
  /** Ejecuta el experimento en la escena */
  onRun: () => void;
  runLabel?: string;
}

export function Prediction({ resetKey, question, options, correct, explanation, onRun, runLabel = 'Comprobar en la escena' }: PredictionProps) {
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setChoice(null);
    setChecked(false);
  }, [resetKey]);
  const ok = choice === correct;
  const labelId = `pred-${resetKey}`.replace(/[^\w-]/g, '_');
  return (
    <div className="prediction" role="group" aria-labelledby={labelId}>
      <span className="eyebrow eyebrow--accent">Predice antes de ver</span>
      <p id={labelId} className="prediction__q">
        {question}
      </p>
      <div className="segmented" role="radiogroup" aria-labelledby={labelId}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={choice === o.id} disabled={checked} onClick={() => setChoice(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      {!checked ? (
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!choice}
          onClick={() => {
            setChecked(true);
            onRun();
            announce(ok ? 'Predicción correcta.' : 'La predicción no coincide con el resultado.');
          }}
        >
          {runLabel}
        </button>
      ) : (
        <Feedback tone={ok ? 'ok' : 'bad'}>
          <strong>{ok ? 'Predicción correcta.' : `No: era «${options.find((o) => o.id === correct)?.label}».`}</strong> {explanation}
        </Feedback>
      )}
    </div>
  );
}
