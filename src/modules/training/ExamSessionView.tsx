/**
 * ATOM 4.0 · Simulacro profesional: navegación libre, marcar para revisar, guardado automático en el
 * navegador, temporizador, entrega con confirmación e informe detallado (crédito parcial, apartados,
 * competencias, preguntas sin responder y recomendaciones).
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { gradeSession, isValidSession, questionState, exerciseFromId, type ExamReport, type ExamSession, type PartValue } from '../../learning/examSession';
import { buildEvidence } from '../../learning/evidence';
import { SKILLS, ERROR_LABEL } from '../../learning/evidence';
import { nodeTitle } from '../../learning/syllabus';
import { guideAnchor } from '../../learning/guide';
import type { Exercise, SkillId } from '../../learning/types';
import { useStore } from '../../state/store';
import { PartInput } from '../../ui/ExercisePlayer';
import { FigureView, ResolutionView } from '../../ui/Pedagogy';
import { Feedback, Rich } from '../../ui/common';
import { Icon } from '../../ui/Icon';

const KEY = 'atom:simulacro';

export function loadSavedSession(): ExamSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return isValidSession(s) && !s.finishedAt ? s : null;
  } catch {
    return null;
  }
}
export function saveSession(s: ExamSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: el simulacro funciona, pero no se guarda */
  }
}

const fmtTime = (ms: number) => `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor((Math.max(0, ms) % 60000) / 1000)).padStart(2, '0')}`;
const STATE_LABEL = { 'sin-responder': 'Sin responder', parcial: 'A medias', respondida: 'Respondida' } as const;

export function ExamRunner({ session, onChange, onFinish }: { session: ExamSession; onChange: (s: ExamSession) => void; onFinish: (s: ExamSession, exercises: Exercise[]) => void }) {
  const exercises = useMemo(() => session.exerciseIds.map((id) => exerciseFromId(id)).filter((e): e is Exercise => !!e), [session.exerciseIds]);
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const baseId = useId();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Guardado automático en cada cambio.
  useEffect(() => saveSession(session), [session]);
  const timeLeft = session.minutes ? session.minutes * 60_000 - (now - session.startedAt) : null;
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0) onFinish(session, exercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null && timeLeft <= 0]);
  if (exercises.length !== session.exerciseIds.length) {
    return <Feedback tone="bad">No se ha podido reconstruir este simulacro (versión distinta de los ejercicios). Empieza uno nuevo.</Feedback>;
  }
  const i = Math.min(session.current, exercises.length - 1);
  const ex = exercises[i]!;
  const states = exercises.map((e, k) => questionState(e, session.answers[k]));
  const setAnswer = (partId: string, v: PartValue) => onChange({ ...session, answers: { ...session.answers, [i]: { ...(session.answers[i] ?? {}), [partId]: v } } });
  const go = (k: number) => onChange({ ...session, current: Math.max(0, Math.min(exercises.length - 1, k)) });
  const flagged = session.flagged.includes(i);
  const pending = states.filter((s) => s !== 'respondida').length;
  return (
    <div className="exam-shell">
      <aside className="exam-nav" aria-label="Preguntas del simulacro">
        <div className="exam-nav__head">
          <span className="eyebrow">{session.label}</span>
          {timeLeft !== null && (
            <span className={`exam-timer${timeLeft < 5 * 60_000 ? ' is-low' : ''}`} role="timer" aria-live="off">
              {fmtTime(timeLeft)}
            </span>
          )}
        </div>
        <ol className="exam-grid">
          {exercises.map((e, k) => (
            <li key={e.id + k}>
              <button type="button" className={`exam-q exam-q--${states[k]}${k === i ? ' is-current' : ''}${session.flagged.includes(k) ? ' is-flagged' : ''}`} onClick={() => go(k)} aria-current={k === i ? 'step' : undefined} aria-label={`Pregunta ${k + 1}: ${STATE_LABEL[states[k]!]}${session.flagged.includes(k) ? ', marcada para revisar' : ''}`}>
                {k + 1}
              </button>
            </li>
          ))}
        </ol>
        <div className="exam-legend small faint">
          <span>
            <i className="dot dot--respondida" /> respondida
          </span>
          <span>
            <i className="dot dot--parcial" /> a medias
          </span>
          <span>
            <i className="dot dot--flag" /> para revisar
          </span>
        </div>
        <p className="small faint" style={{ margin: 0 }}>
          Se guarda solo: puedes cerrar la pestaña y continuar después. No hay corrección hasta que entregues.
        </p>
        <button type="button" className="btn btn--primary btn--block" onClick={() => setConfirm(true)}>
          Entregar
        </button>
      </aside>
      <section className="exam-main" aria-label={`Pregunta ${i + 1} de ${exercises.length}`}>
        <header className="stack-8">
          <div className="row row--between">
            <span className="small muted">
              Pregunta <span className="num">{i + 1}</span> de <span className="num">{exercises.length}</span> · <span className="num">{(session.points[i] ?? 1).toLocaleString('es-ES')}</span> p
            </span>
            <button type="button" className={`btn btn--ghost btn--sm${flagged ? ' is-on' : ''}`} aria-pressed={flagged} onClick={() => onChange({ ...session, flagged: flagged ? session.flagged.filter((k) => k !== i) : [...session.flagged, i] })}>
              {flagged ? 'Marcada para revisar' : 'Marcar para revisar'}
            </button>
          </div>
          <h2 className="h3">{ex.title}</h2>
          <p style={{ lineHeight: 1.6, margin: 0 }}>
            <Rich text={ex.statement} />
          </p>
          {ex.figure && <FigureView fig={ex.figure} />}
          {ex.data && (
            <div className="row row--wrap" style={{ gap: 6 }} aria-label="Datos">
              {ex.data.map((d) => (
                <span key={d.label} className="chip mono" style={{ color: 'var(--ink)' }}>
                  {d.label} = {d.value}
                </span>
              ))}
            </div>
          )}
        </header>
        <ol className="stack-16" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ex.parts.map((p, k) => {
            const labelId = `${baseId}-${i}-${k}`;
            const v = session.answers[i]?.[p.id] ?? (p.answer.kind === 'choice' ? [] : p.answer.kind === 'order' ? p.answer.items.map((x) => x.id) : '');
            return (
              <li key={p.id} className="stack-8">
                <span id={labelId} className="small" style={{ fontWeight: 600 }}>
                  {ex.parts.length > 1 && <span className="mono faint" style={{ marginRight: 8 }}>{String.fromCharCode(97 + k)})</span>}
                  {p.prompt}
                </span>
                <PartInput part={p} value={v} onChange={(nv) => setAnswer(p.id, nv)} onSubmit={() => {}} disabled={false} labelId={labelId} />
              </li>
            );
          })}
        </ol>
        <div className="row row--between">
          <button type="button" className="btn btn--sm" disabled={i === 0} onClick={() => go(i - 1)}>
            <Icon name="arrow-left" size={16} /> Anterior
          </button>
          <button type="button" className="btn btn--sm" disabled={i === exercises.length - 1} onClick={() => go(i + 1)}>
            Siguiente <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </section>
      {confirm &&
        createPortal(
        <div className="palette-scrim" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setConfirm(false)}>
          <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-t">
            <span id="confirm-t" className="h3">
              ¿Entregar el simulacro?
            </span>
            <p className="small" style={{ margin: 0 }}>
              {pending === 0 ? 'Has respondido todas las preguntas.' : `Quedan ${pending} pregunta${pending === 1 ? '' : 's'} sin responder del todo: contarán 0 en lo que falte.`}
              {session.flagged.length > 0 && ` Tienes ${session.flagged.length} marcada${session.flagged.length === 1 ? '' : 's'} para revisar.`}
            </p>
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--sm" onClick={() => setConfirm(false)} autoFocus>
                Seguir respondiendo
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => onFinish(session, exercises)}>
                Entregar y corregir
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}

function Bar({ value, total }: { value: number; total: number }) {
  const f = total ? value / total : 0;
  return (
    <span className="meter" style={{ width: 120 }} aria-hidden="true">
      <span style={{ width: `${f * 100}%`, background: f >= 0.7 ? 'var(--ok)' : f >= 0.4 ? 'var(--warn)' : 'var(--bad)' }} />
    </span>
  );
}

const displayValue = (v: PartValue | undefined, ex: Exercise, partId: string) => {
  const p = ex.parts.find((x) => x.id === partId)!;
  if (v === undefined) return '—';
  if (p.answer.kind === 'choice') {
    const a = p.answer;
    return (v as string[]).map((id) => a.options.find((o) => o.id === id)?.text ?? id).join(' · ') || '—';
  }
  if (p.answer.kind === 'order') {
    const a = p.answer;
    return (v as string[]).map((id) => a.items.find((o) => o.id === id)?.text ?? id).join(' → ');
  }
  if (Array.isArray(v)) return v[0] ?? '—';
  return v || '—';
};

export function ExamReportView({ report, session, onNew }: { report: ExamReport; session: ExamSession; onNew: () => void }) {
  const skillAgg = new Map<SkillId, { sum: number; n: number }>();
  const errorCount = new Map<string, number>();
  for (const q of report.questions) {
    const answered = q.parts.map((p, k) => (p.answered ? k : -1)).filter((k) => k >= 0);
    if (!answered.length) continue;
    const ev = buildEvidence({ ...q.exercise, parts: answered.map((k) => q.exercise.parts[k]!) }, answered.map((k) => q.records[k]!));
    for (const [k, v] of Object.entries(ev.skills) as [SkillId, { y: number; n: number }][]) {
      const cur = skillAgg.get(k) ?? { sum: 0, n: 0 };
      skillAgg.set(k, { sum: cur.sum + v.y * v.n, n: cur.n + v.n });
    }
    for (const e of ev.errors) errorCount.set(e.kind, (errorCount.get(e.kind) ?? 0) + 1);
  }
  const nodes = Object.entries(report.byNode).sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }));
  const weak = nodes.filter(([, v]) => v.total > 0 && v.ok / v.total < 0.6).map(([n]) => n);
  const unansweredNodes = nodes.filter(([, v]) => v.unanswered > 0 && v.total === 0).map(([n]) => n);
  return (
    <div className="stack-24 enter exam-report">
      <header className="exam-report__head">
        <div>
          <span className="eyebrow">{session.label}</span>
          <div className="exam-grade">
            <span className="num">{report.grade.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
            <span className="exam-grade__of">/ 10</span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {report.answered} respondidas · {report.partial} a medias · {report.unanswered} sin responder · {report.earnedPoints.toLocaleString('es-ES', { maximumFractionDigits: 2 })} de {report.totalPoints.toLocaleString('es-ES')} puntos (crédito parcial por apartado). Ponderación propuesta, no oficial.
          </p>
        </div>
        <div className="stack-8" style={{ alignItems: 'flex-end' }}>
          <button type="button" className="btn btn--primary" onClick={onNew}>
            Nuevo simulacro
          </button>
          <span className="small faint num">semilla {session.seed}</span>
        </div>
      </header>

      <section className="exam-report__grid">
        <div className="panel-card stack-12">
          <span className="h3">Por apartados</span>
          {nodes.map(([n, v]) => (
            <div key={n} className="exam-node">
              <span className="small">
                <span className="nid">{n}</span> {nodeTitle(n)}
              </span>
              {v.total > 0 ? <Bar value={v.ok} total={v.total} /> : <span className="small faint">sin evidencia</span>}
              <span className="small num" style={{ width: 44, textAlign: 'right' }}>
                {v.total > 0 ? `${Math.round((v.ok / v.total) * 100)} %` : '—'}
              </span>
              <span className="small faint" style={{ width: 96 }}>
                {v.unanswered > 0 ? `${v.unanswered} sin responder` : ''}
              </span>
            </div>
          ))}
          <p className="small faint" style={{ margin: 0 }}>
            Lo no respondido no se usa como evidencia de que no lo sabes (pudo faltar tiempo): se señala aparte.
          </p>
        </div>
        <div className="panel-card stack-12">
          <span className="h3">Competencias</span>
          {[...skillAgg.entries()]
            .sort((a, b) => a[1].sum / a[1].n - b[1].sum / b[1].n)
            .map(([k, v]) => (
              <div key={k} className="exam-node">
                <span className="small">{SKILLS[k].label}</span>
                <Bar value={v.sum} total={v.n} />
                <span className="small num" style={{ width: 44, textAlign: 'right' }}>
                  {Math.round((v.sum / v.n) * 100)} %
                </span>
              </div>
            ))}
          {errorCount.size > 0 && (
            <>
              <span className="eyebrow">Errores más frecuentes</span>
              <div className="row row--wrap" style={{ gap: 6 }}>
                {[...errorCount.entries()]
                  .filter(([k]) => k !== 'incompleto')
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, n]) => (
                    <span key={k} className="err-tag">
                      {ERROR_LABEL[k as keyof typeof ERROR_LABEL]} ×{n}
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel-card stack-12">
        <span className="h3">Qué hacer ahora</span>
        <ul className="study-list">
          {weak.length > 0 && (
            <li>
              <span className="small">
                <b>Refuerza {weak.length} apartado{weak.length === 1 ? '' : 's'} con menos del 60 %</b>: {weak.slice(0, 4).map(nodeTitle).join(', ')}{weak.length > 4 ? '…' : ''}.
              </span>
              <a className="btn btn--primary btn--sm" href={`#/entrenamiento?v=practica&nodes=${weak.join(',')}`}>
                Practicar esos apartados
              </a>
            </li>
          )}
          {weak.slice(0, 3).map((n) => (
            <li key={n}>
              <span className="small">
                Ruta completa de <b>{nodeTitle(n)}</b>: teoría, laboratorio y ejercicios de dificultad creciente.
              </span>
              <a className="btn btn--sm" href={`#/entrenamiento?v=ruta&n=${n}`}>
                Abrir la ruta
              </a>
            </li>
          ))}
          {unansweredNodes.length > 0 && (
            <li>
              <span className="small">
                Sin responder (sin evidencia aún): {unansweredNodes.slice(0, 5).map(nodeTitle).join(', ')}. Si fue por tiempo, entrena el ritmo con un simulacro cronometrado; si fue por no saber cómo empezar, abre la guía.
              </span>
              <a className="btn btn--ghost btn--sm" href={`#/guia?n=${guideAnchor(unansweredNodes[0]!)}`}>
                Ir a la guía
              </a>
            </li>
          )}
          {weak.length === 0 && unansweredNodes.length === 0 && <li className="small">Sin apartados débiles en este simulacro. El repaso espaciado programará cuándo volver a verlos.</li>}
        </ul>
      </section>

      <section className="stack-12" aria-label="Revisión pregunta a pregunta">
        <span className="h3">Revisión pregunta a pregunta</span>
        {report.questions.map((q, i) => (
          <details key={q.exercise.id + i} className="card exam-review">
            <summary>
              <span className="mono faint">{i + 1}.</span> <span>{q.exercise.title}</span>
              <span className={`exam-review__state exam-review__state--${q.state}`}>{STATE_LABEL[q.state]}</span>
              <span className="mono" style={{ marginLeft: 'auto', color: q.score >= 0.7 ? 'var(--ok)' : q.score > 0 ? 'var(--warn)' : 'var(--bad)' }}>
                {q.earned.toLocaleString('es-ES', { maximumFractionDigits: 2 })} / {q.points.toLocaleString('es-ES')} p
              </span>
            </summary>
            <div className="stack-12" style={{ marginTop: 12 }}>
              <p className="small" style={{ margin: 0 }}>
                <Rich text={q.exercise.statement} />
              </p>
              <table className="data-table exam-answers">
                <thead>
                  <tr>
                    <th>Apartado</th>
                    <th>Tu respuesta</th>
                    <th>Correcta</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {q.parts.map((p) => (
                    <tr key={p.part.id}>
                      <td>{p.part.prompt}</td>
                      <td className="mono">{p.answered ? displayValue(p.value, q.exercise, p.part.id) : <span className="faint">sin responder</span>}</td>
                      <td className="mono">{p.part.canonical}</td>
                      <td style={{ color: p.credit >= 1 ? 'var(--ok)' : p.answered ? 'var(--bad)' : 'var(--ink-faint)' }}>{p.credit >= 1 ? '✓' : p.answered ? '✗' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {q.parts
                .filter((p) => p.answered && p.credit < 1)
                .map((p) => (
                  <Feedback key={p.part.id} tone="bad">
                    <b>{p.part.prompt}.</b> {p.result.message}
                  </Feedback>
                ))}
              {q.exercise.resolution ? (
                <ResolutionView steps={q.exercise.resolution} methods={q.exercise.methods} />
              ) : (
                <ol className="stack-8 small" style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-muted)' }}>
                  {q.exercise.solution.map((s, k) => (
                    <li key={k}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

/** Corrige, registra la evidencia (solo de lo respondido) y devuelve el informe. */
export function useFinishExam() {
  const recordExercise = useStore((s) => s.recordExercise);
  const recordExam = useStore((s) => s.recordExam);
  return (session: ExamSession, exercises: Exercise[]): ExamReport => {
    const report = gradeSession(session, exercises);
    for (const q of report.questions) {
      const idx = q.parts.map((p, k) => (p.answered ? k : -1)).filter((k) => k >= 0);
      if (!idx.length) continue;
      const sub: Exercise = { ...q.exercise, parts: idx.map((k) => q.exercise.parts[k]!) };
      const recs = idx.map((k) => q.records[k]!);
      recordExercise(sub, { correct: recs.every((r) => r.credit >= 1), score: recs.reduce((a, r) => a + r.credit, 0) / recs.length, hintsUsed: 0, parts: recs }, 'examen');
    }
    const byNode: Record<string, { ok: number; total: number }> = {};
    for (const [n, v] of Object.entries(report.byNode)) {
      // En el historial de exámenes se conserva el formato validado (ok ≤ total > 0): lo no respondido cuenta 0.
      const total = v.total + v.unanswered;
      if (total > 0) byNode[n] = { ok: v.ok, total };
    }
    recordExam({ scope: [], total: report.questions.length, score: report.grade / 10, byNode });
    saveSession(null);
    return report;
  };
}
