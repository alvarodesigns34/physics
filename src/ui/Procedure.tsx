/**
 * ATOM 5.1 · Panel de procedimiento. El alumno escribe sus cuentas y ATOM marca cada línea:
 * ✓ verificada · ↪ arrastra un error anterior · ? número sin justificar · · afirmación sin operación · ✗ error.
 * Usarlo ANTES de responder un paso es una ayuda y se registra (el acierto pasa a «asistida»).
 */
import { useMemo, useState } from 'react';
import type { Exercise } from '../learning/types';
import { checkProcedure, explainIssue, procedureCheckpoints, type LineStatus, type ProcedureReport } from '../learning/procedure';
import { Feedback } from './common';

const MARK: Record<LineStatus, { glyph: string; sr: string }> = {
  ok: { glyph: '✓', sr: 'línea verificada' },
  arrastre: { glyph: '↪', sr: 'coherente, pero arrastra un error anterior' },
  'sin-justificar': { glyph: '?', sr: 'contiene un número sin justificar' },
  afirmado: { glyph: '·', sr: 'afirmación sin operación' },
  error: { glyph: '✗', sr: 'aquí hay un error' },
};

export function ProcedurePanel({ exercise, onAnalyzed }: { exercise: Exercise; /** Se llama cada vez que el alumno pide revisar: es una ayuda */ onAnalyzed?: (r: ProcedureReport) => void }) {
  const spec = useMemo(() => procedureCheckpoints(exercise), [exercise]);
  const [text, setText] = useState('');
  const [report, setReport] = useState<ProcedureReport | null>(null);
  if (!spec) return null;
  const id = `proc-${exercise.id}`.replace(/[^\w-]/g, '_');
  const unsupported = report ? report.unsupported.filter((u, i, a) => !report.reached.includes(u.label) && a.findIndex((x) => x.label === u.label) === i) : [];
  return (
    <details className="procedure">
      <summary>Escribe tu procedimiento y ATOM te dice dónde se tuerce</summary>
      <div className="procedure__body">
        <label htmlFor={id} className="small muted">
          Una igualdad por línea: <span className="mono">ν = c/λ = 3·10^8 / 5·10^-7 = 6·10^14 Hz</span>. Puedes usar símbolos (h, c, R, λ…), encadenar «=» y cambiar de unidad (<span className="mono">= 656 nm</span>).
        </label>
        <textarea
          id={id}
          className="input mono procedure__input"
          rows={Math.max(3, text.split('\n').length + 1)}
          value={text}
          spellCheck={false}
          maxLength={5000}
          onChange={(e) => {
            setText(e.target.value);
            setReport(null);
          }}
          placeholder={'λ = 250 nm = 2,5·10^-7 m\nν = c/λ = 3·10^8 / 2,5·10^-7 = 1,2·10^15 Hz'}
        />
        <div className="row-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--sm"
            disabled={!text.trim()}
            onClick={() => {
              const r = checkProcedure(text, spec);
              setReport(r);
              onAnalyzed?.(r);
            }}
          >
            Revisar procedimiento
          </button>
          <span className="small faint">Revisarlo antes de responder cuenta como ayuda.</span>
        </div>
        {report && (
          <div className="stack-8" aria-live="polite">
            <ol className="procedure__lines">
              {report.lines.map((l, i) => (
                <li key={i} className={`procedure__line procedure__line--${l.status}`}>
                  <span className="procedure__mark" aria-hidden="true">{MARK[l.status].glyph}</span>
                  <span className="mono">{l.text}</span>
                  {l.checkpoint && <span className="chip small">{l.checkpoint}</span>}
                  {l.note && <span className="procedure__note small">{l.note}</span>}
                  <span className="sr-only">{MARK[l.status].sr}</span>
                </li>
              ))}
            </ol>
            <Feedback tone={report.issue ? 'bad' : 'ok'}>{explainIssue(report.issue)}</Feedback>
            {report.reached.length > 0 && <p className="small muted" style={{ margin: 0 }}>Pasos demostrados: {report.reached.join(' · ')}.</p>}
            {unsupported.length > 0 && (
              <ul className="small muted procedure__unsupported">
                {unsupported.map((u) => (
                  <li key={u.label}>
                    <strong>{u.label}</strong> (línea {u.line}): aparece, pero no cuenta. {u.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
