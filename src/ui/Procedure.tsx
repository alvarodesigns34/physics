/**
 * ATOM 5.0 · Panel de procedimiento: el alumno escribe sus cuentas y ATOM señala la primera línea en la
 * que algo deja de cuadrar. Los puntos de control son los valores de los pasos numéricos del propio
 * ejercicio (en el SI), así que funciona con cualquier familia sin datos adicionales.
 */
import { useMemo, useState } from 'react';
import type { Exercise } from '../learning/types';
import { checkProcedure, explainIssue, procedureCheckpoints, type ProcedureReport } from '../learning/procedure';
import { Feedback } from './common';

export function ProcedurePanel({ exercise }: { exercise: Exercise }) {
  const spec = useMemo(() => procedureCheckpoints(exercise), [exercise]);
  const [text, setText] = useState('');
  const [report, setReport] = useState<ProcedureReport | null>(null);
  if (!spec) return null;
  const id = `proc-${exercise.id}`.replace(/[^\w-]/g, '_');
  return (
    <details className="procedure">
      <summary>Escribe tu procedimiento y ATOM te dice dónde se tuerce</summary>
      <div className="procedure__body">
        <label htmlFor={id} className="small muted">
          Una igualdad por línea, por ejemplo: <span className="mono">ν = 3·10^8 / 5·10^-7 = 6·10^14 Hz</span>. Puedes encadenar «=» y cambiar de unidad (<span className="mono">= 656 nm</span>).
        </label>
        <textarea
          id={id}
          className="input mono procedure__input"
          rows={Math.max(3, text.split('\n').length + 1)}
          value={text}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setReport(null);
          }}
          placeholder={'λ = 250 nm = 2,5·10^-7 m\nν = 3·10^8 / 2,5·10^-7 = 1,2·10^15 Hz'}
        />
        <button type="button" className="btn btn--sm" disabled={!text.trim()} onClick={() => setReport(checkProcedure(text, spec.checkpoints, spec.final))}>
          Revisar procedimiento
        </button>
        {report && (
          <div className="stack-8" aria-live="polite">
            <ol className="procedure__lines">
              {report.lines.map((l, i) => (
                <li key={i} className={l.ok ? 'ok' : 'bad'}>
                  <span className="procedure__mark" aria-hidden="true">{l.ok ? '✓' : '✗'}</span>
                  <span className="mono">{l.text}</span>
                  {l.checkpoint && <span className="chip small">{l.checkpoint}</span>}
                  <span className="sr-only">{l.ok ? 'línea correcta' : 'aquí hay un error'}</span>
                </li>
              ))}
            </ol>
            <Feedback tone={report.issue ? 'bad' : 'ok'}>{explainIssue(report.issue)}</Feedback>
            {report.reached.length > 0 && <p className="small muted" style={{ margin: 0 }}>Resultados intermedios correctos: {report.reached.join(' · ')}.</p>}
          </div>
        )}
      </div>
    </details>
  );
}
