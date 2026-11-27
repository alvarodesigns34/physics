import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CheckResult, ErrorKind, Exercise, ExercisePart, SkillId } from '../learning/types';
import type { PartRecord } from '../learning/evidence';
import { checkAnswer } from '../learning/checker';
import { parseConfigurationText } from '../science/configuration';
import { toSuperscript } from '../science/numbers';
import { lLetter } from '../science/quantum';
import { nodeTitle } from '../learning/syllabus';
import { guideAnchorFor, SECTION_BY_NODE } from '../learning/guide';
import { Feedback, Rich } from './common';
import { Icon } from './Icon';
import { EssayInput, FigureView, ResolutionView } from './Pedagogy';
import { structuredResolution } from '../learning/autoResolution';
import { sfx } from '../app/sound';

export interface ExerciseOutcome {
  correct: boolean;
  /** 0–1: crédito medio por paso (1 al primer intento, 0,5 después, 0 si se revela) */
  score: number;
  hintsUsed: number;
  revealed: number;
  firstTry: boolean;
  /** Resultado por paso (modo examen) */
  partResults: { id: string; correct: boolean }[];
  /** Registro detallado por paso: errores clasificados, arrastre y cifras (para la evidencia por competencias) */
  parts: PartRecord[];
}

type Mode = 'practica' | 'examen' | 'campana';

/**
 * Cómo se acompaña la práctica (ATOM 3.0):
 * - guiado: paso a paso siempre y la primera pista ya visible;
 * - autonomo: el alumno resuelve y pide ayuda cuando la necesita (por defecto);
 * - desafio: todo el problema a la vez; pistas y teoría solo tras dos intentos fallidos;
 * - revision: se ve la resolución completa sin responder (no cuenta para el progreso).
 */
export type Variant = 'guiado' | 'autonomo' | 'desafio' | 'revision';

/** Enlace a la sección de la guía que explica el apartado del ejercicio. */
function TheoryLink({ nodeId, prominent, generatorId }: { nodeId: string | undefined; prominent: boolean; generatorId?: string }) {
  if (!nodeId) return null;
  const anchor = guideAnchorFor(nodeId, generatorId);
  const sec = SECTION_BY_NODE.get(anchor)?.section;
  return (
    <a className={`btn btn--sm ${prominent ? '' : 'btn--ghost'}`} href={`#/guia?n=${anchor}`} style={prominent ? { borderColor: 'var(--accent-line)' } : undefined}>
      <Icon name="info" size={16} /> {prominent ? '¿No lo entiendes? ' : ''}Repasa la teoría{sec ? `: ${sec.title}` : ''}
    </a>
  );
}

interface PartState {
  value: string | string[];
  attempts: number;
  result: CheckResult | null;
  done: boolean;
  revealed: boolean;
  credit: number;
  errors: { kind: ErrorKind; skill?: SkillId; valueCorrect?: boolean }[];
  sigFigsAssessed?: boolean;
  carried: boolean;
  sigFigIssue: boolean;
}

const freshPart = (p: ExercisePart): PartState => ({ value: initialValue(p), attempts: 0, result: null, done: false, revealed: false, credit: 0, errors: [], carried: false, sigFigIssue: false });

function toRecords(ex: Exercise, parts: PartState[]): PartRecord[] {
  return parts.map((p, i) => ({ id: ex.parts[i]!.id, credit: p.credit, attempts: p.attempts, revealed: p.revealed, errors: p.errors, carried: p.carried, sigFigIssue: p.sigFigIssue, sigFigsAssessed: p.sigFigsAssessed }));
}

function initialValue(p: ExercisePart): string | string[] {
  if (p.answer.kind === 'choice') return [];
  if (p.answer.kind === 'order') return p.answer.items.map((i) => i.id);
  if (p.answer.kind === 'essay') return [''];
  return '';
}

function ConfigPreview({ text }: { text: string }) {
  const parsed = useMemo(() => parseConfigurationText(text), [text]);
  if (!text.trim()) return null;
  if (!parsed.ok) return <span className="small faint">{parsed.error}</span>;
  const total = parsed.tokens.reduce((a, t) => a + t.e, 0) + (parsed.core ? parsed.core.z : 0);
  return (
    <span className="small muted mono" aria-live="off">
      {parsed.core ? `[${parsed.core.symbol}] ` : ''}
      {parsed.tokens.map((t) => `${t.n}${lLetter(t.l)}${toSuperscript(t.e)}`).join(' ')}
      <span className="faint"> · {total} e⁻</span>
    </span>
  );
}

export function PartInput({ part, value, onChange, onSubmit, disabled, labelId }: { part: ExercisePart; value: string | string[]; onChange: (v: string | string[]) => void; onSubmit: () => void; disabled: boolean; labelId: string }) {
  const a = part.answer;
  if (a.kind === 'essay') {
    return <EssayInput spec={a} value={value as string[]} onChange={onChange} onSubmit={onSubmit} disabled={disabled} labelId={labelId} />;
  }
  if (a.kind === 'choice') {
    const sel = value as string[];
    return (
      <div className="stack-8" role={a.multiple ? 'group' : 'radiogroup'} aria-labelledby={labelId}>
        {a.options.map((o) => {
          const on = sel.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className="btn"
              role={a.multiple ? 'checkbox' : 'radio'}
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(a.multiple ? (on ? sel.filter((x) => x !== o.id) : [...sel, o.id]) : [o.id])}
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                whiteSpace: 'normal',
                minHeight: 44,
                padding: '10px 14px',
                lineHeight: 1.4,
                fontWeight: 450,
                borderColor: on ? 'var(--accent-line)' : undefined,
                background: on ? 'var(--accent-quiet)' : undefined,
              }}
            >
              <span aria-hidden="true" style={{ width: 16, height: 16, flex: 'none', borderRadius: a.multiple ? 4 : 999, border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--hairline-strong)'), background: on ? 'var(--accent)' : 'transparent', boxShadow: on ? 'inset 0 0 0 3px var(--surface-raised)' : 'none' }} />
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
    );
  }
  if (a.kind === 'order') {
    const order = value as string[];
    const move = (i: number, d: number) => {
      const j = i + d;
      if (j < 0 || j >= order.length) return;
      const next = [...order];
      [next[i], next[j]] = [next[j]!, next[i]!];
      onChange(next);
    };
    return (
      <ol className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-labelledby={labelId}>
        {order.map((id, i) => {
          const item = a.items.find((x) => x.id === id)!;
          return (
            <li key={id} className="card row row--between" style={{ padding: '8px 8px 8px 14px' }}>
              <span className="row" style={{ gap: 12 }}>
                <span className="mono faint">{i + 1}</span>
                <span>{item.text}</span>
              </span>
              <span className="row" style={{ gap: 4 }}>
                <button type="button" className="btn btn--ghost btn--sm btn--icon" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Subir ${item.text}`}>
                  <Icon name="chevron-up" size={16} />
                </button>
                <button type="button" className="btn btn--ghost btn--sm btn--icon" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar ${item.text}`}>
                  <Icon name="chevron-down" size={16} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <div className="stack-8">
      <input
        className="input"
        aria-labelledby={labelId}
        value={value as string}
        disabled={disabled}
        placeholder={part.placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode={a.kind === 'integer' ? 'text' : 'text'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />
      {a.kind === 'config' && <ConfigPreview text={value as string} />}
      {a.kind === 'numeric' && <span className="small faint">Coma decimal. Potencias: 6,0·10^14 o 6,0e14. Incluye la unidad.</span>}
      {a.kind === 'quantum' && <span className="small faint">Formato: (n, l, m_l, m_s), por ejemplo (2, 1, 0, −1/2).</span>}
    </div>
  );
}

export function ExercisePlayer({ exercise, mode, onFinish, onNext, nextLabel = 'Siguiente', showMeta = true, variant = 'autonomo' }: { exercise: Exercise; mode: Mode; onFinish?: (o: ExerciseOutcome) => void; onNext?: () => void; nextLabel?: string; showMeta?: boolean; variant?: Variant }) {
  const review = variant === 'revision' && mode !== 'examen';
  const startParts = () => exercise.parts.map((p) => (review ? { ...freshPart(p), done: true, revealed: true } : freshPart(p)));
  const [parts, setParts] = useState<PartState[]>(startParts);
  const [hints, setHints] = useState(variant === 'guiado' ? 1 : 0);
  const [showSolution, setShowSolution] = useState(review);
  const [submittedExam, setSubmittedExam] = useState(false);
  const finished = useRef(false);
  const baseId = useId();
  const exam = mode === 'examen';

  useEffect(() => {
    setParts(startParts());
    setHints(variant === 'guiado' ? 1 : 0);
    setShowSolution(review);
    setSubmittedExam(false);
    finished.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, variant]);

  const previousWrong = useMemo(() => {
    const out: Record<string, number> = {};
    exercise.parts.forEach((p, i) => {
      const st = parts[i]!;
      if (st.result && !st.result.correct && st.result.numericValue !== undefined) out[p.id] = st.result.numericValue;
      if (st.result?.status === 'correcto-arrastre' && st.result.numericValue !== undefined) out[p.id] = st.result.numericValue;
    });
    return out;
  }, [parts, exercise]);

  const allDone = parts.every((p) => p.done);

  useEffect(() => {
    if (exam || review || !allDone || finished.current) return;
    finished.current = true;
    const score = parts.reduce((a, p) => a + p.credit, 0) / parts.length;
    const revealed = parts.filter((p) => p.revealed).length;
    const outcome: ExerciseOutcome = { correct: score >= 0.7 && revealed === 0, score, hintsUsed: hints, revealed, firstTry: parts.every((p) => p.attempts === 1 && !p.revealed), partResults: parts.map((p, i) => ({ id: exercise.parts[i]!.id, correct: p.credit > 0 })), parts: toRecords(exercise, parts) };
    if (outcome.correct) sfx.success();
    onFinish?.(outcome);
  }, [allDone, exam, parts, hints, onFinish, exercise]);

  const update = (i: number, patch: Partial<PartState>) => setParts((ps) => ps.map((p, k) => (k === i ? { ...p, ...patch } : p)));

  const check = (i: number) => {
    const p = exercise.parts[i]!;
    const st = parts[i]!;
    const result = checkAnswer(p.answer, st.value, { previousWrong });
    if (result.status === 'vacio' || result.status === 'formato') {
      update(i, { result });
      return;
    }
    const attempts = st.attempts + 1;
    if (p.answer.kind === 'essay') {
      // Desarrollo: un único envío autoevaluado; el crédito es la fracción de la rúbrica marcada.
      (result.correct ? sfx.success : sfx.error)();
      update(i, { result, attempts, done: true, credit: result.credit ?? (result.correct ? 1 : 0), errors: result.errorKind ? [{ kind: result.errorKind, skill: result.errorSkill }] : [] });
      return;
    }
    if (result.correct) {
      sfx.success();
      update(i, { result, attempts, done: true, credit: attempts === 1 ? 1 : 0.5, carried: result.status === 'correcto-arrastre', sigFigIssue: result.errorKind === 'cifras', sigFigsAssessed: result.sigFigsAssessed });
    } else {
      sfx.error();
      update(i, { result, attempts, errors: result.errorKind ? [...st.errors, { kind: result.errorKind, skill: result.errorSkill, valueCorrect: result.valueCorrect }, ...(result.secondary ?? [])] : st.errors });
    }
  };

  const reveal = (i: number) => update(i, { revealed: true, done: true, credit: 0 });

  const submitExam = () => {
    // Corrección secuencial: un paso que aplica bien un resultado previo erróneo se acepta (arrastre) y el
    // error solo se penaliza una vez, en su paso de origen.
    const prev: Record<string, number> = {};
    const results = exercise.parts.map((p, i) => {
      const r = checkAnswer(p.answer, parts[i]!.value, { previousWrong: { ...prev } });
      if ((!r.correct || r.status === 'correcto-arrastre') && r.numericValue !== undefined) prev[p.id] = r.numericValue;
      return r;
    });
    const next = parts.map((p, i) => {
      const r = results[i]!;
      const answered = r.status !== 'vacio';
      return { ...p, result: r, attempts: 1, done: true, credit: r.correct ? 1 : 0, errors: !r.correct && r.errorKind ? [{ kind: r.errorKind, skill: r.errorSkill, valueCorrect: r.valueCorrect }, ...(r.secondary ?? [])] : !answered ? [{ kind: 'incompleto' as const }] : [], carried: r.status === 'correcto-arrastre', sigFigIssue: r.correct && r.errorKind === 'cifras', sigFigsAssessed: r.correct ? r.sigFigsAssessed : undefined };
    });
    setParts(next);
    setSubmittedExam(true);
    const score = results.filter((r) => r.correct).length / results.length;
    onFinish?.({ correct: score >= 0.7, score, hintsUsed: 0, revealed: 0, firstTry: score === 1, partResults: results.map((r, i) => ({ id: exercise.parts[i]!.id, correct: r.correct })), parts: toRecords(exercise, next) });
  };

  // En modo paso a paso, solo se muestran los pasos hasta el primero sin terminar.
  const firstOpen = parts.findIndex((p) => !p.done);
  const stepwise = variant === 'guiado' ? exercise.parts.length > 1 : variant === 'desafio' ? false : exercise.stepwise;
  const maxAttempts = Math.max(0, ...parts.map((p) => p.attempts));
  const helpUnlocked = variant !== 'desafio' || maxAttempts >= 2;
  const visibleCount = exam || !stepwise ? parts.length : firstOpen === -1 ? parts.length : firstOpen + 1;

  return (
    <article className="stack-16" aria-label={exercise.title}>
      <header className="stack-8">
        {showMeta && (
          <div className="row row--wrap" style={{ gap: 6 }}>
            {exercise.source && <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent-line)' }}>{exercise.source}</span>}
            {exercise.nodeIds.slice(0, 2).map((n) => (
              <span key={n} className="chip">
                {n} · {nodeTitle(n)}
              </span>
            ))}
            <span className={`level-chip level-chip--${exercise.difficulty}`} style={{ alignSelf: 'center' }}>
              {exercise.difficulty === 1 ? 'Básico' : exercise.difficulty === 2 ? 'Nivel examen' : 'Avanzado'}
            </span>
          </div>
        )}
        <h2 className="h3">{exercise.title}</h2>
        <p style={{ lineHeight: 1.6 }}>
          <Rich text={exercise.statement} />
        </p>
        {exercise.figure && <FigureView fig={exercise.figure} />}
        {exercise.data && (
          <div className="row row--wrap" style={{ gap: 6 }} aria-label="Datos">
            {exercise.data.map((d) => (
              <span key={d.label} className="chip mono" style={{ color: 'var(--ink)' }}>
                {d.label} = {d.value}
              </span>
            ))}
          </div>
        )}
      </header>

      <ol className="stack-16" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {exercise.parts.slice(0, visibleCount).map((p, i) => {
          const st = parts[i]!;
          const labelId = `${baseId}-p${i}`;
          const showFeedback = st.result && (!exam || submittedExam);
          return (
            <li key={p.id} className="stack-8 fade">
              <div className="row row--between" style={{ alignItems: 'baseline' }}>
                <span id={labelId} className="small" style={{ fontWeight: 600 }}>
                  {exercise.parts.length > 1 && <span className="mono faint" style={{ marginRight: 8 }}>{String.fromCharCode(97 + i)})</span>}
                  {p.prompt}
                </span>
                {st.done && !exam && (st.revealed ? <span className="small faint">revelado</span> : <Icon name="check" size={16} className="ok" />)}
              </div>
              <PartInput part={p} value={st.value} onChange={(v) => update(i, { value: v, result: st.result?.status === 'formato' || st.result?.status === 'vacio' ? null : st.result })} onSubmit={() => !exam && !st.done && check(i)} disabled={st.done || (exam && submittedExam)} labelId={labelId} />
              {!exam && !st.done && (
                <div className="row row--wrap">
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => check(i)}>
                    Comprobar
                  </button>
                  {st.attempts >= 2 && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => reveal(i)}>
                      Ver este paso
                    </button>
                  )}
                </div>
              )}
              {showFeedback && st.result && (
                <Feedback tone={st.result.correct ? 'ok' : st.result.status === 'formato' || st.result.status === 'vacio' ? 'info' : 'bad'}>
                  <span>{st.result.message}</span>
                  {st.result.warnings.map((w) => (
                    <span key={w} className="small" style={{ display: 'block', color: 'var(--warn)', marginTop: 4 }}>
                      {w}
                    </span>
                  ))}
                </Feedback>
              )}
              {(st.revealed || (st.done && !exam) || (exam && submittedExam)) && (
                <div className="note">
                  {(st.revealed || (exam && !st.result?.correct)) && (
                    <span className="mono" style={{ display: 'block', color: 'var(--ink)', marginBottom: 4 }}>
                      {p.canonical}
                    </span>
                  )}
                  {p.explanation}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!exam && !allDone && !helpUnlocked && (
        <p className="small faint" style={{ margin: 0 }}>
          Modo desafío: las pistas y la teoría se desbloquean tras dos intentos fallidos.
        </p>
      )}
      {!exam && !allDone && helpUnlocked && (
        <section className="stack-8" aria-label="Pistas">
          {exercise.hints.slice(0, hints).map((h, i) => (
            <Feedback key={i} tone="warn">
              <span className="small">
                <b style={{ fontWeight: 600 }}>Pista {i + 1}. </b>
                {h}
              </span>
            </Feedback>
          ))}
          <div className="row row--wrap" style={{ gap: 6 }}>
            {hints < 3 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setHints((h) => h + 1)}>
                <Icon name="bulb" size={16} /> Pista {hints + 1} de 3
              </button>
            )}
            <TheoryLink nodeId={exercise.nodeIds[0]} generatorId={exercise.generatorId} prominent={parts.some((p) => p.attempts > 0 && !p.done)} />
          </div>
        </section>
      )}

      {exam && !submittedExam && (
        <button type="button" className="btn btn--primary" onClick={submitExam}>
          Entregar respuesta
        </button>
      )}

      {(allDone || submittedExam) && (
        <section className="stack-12 fade">
          {!exam && !review && (
            <Feedback tone={parts.every((p) => p.credit === 1) ? 'ok' : 'info'}>
              {parts.every((p) => p.credit === 1) ? 'Todo correcto al primer intento.' : `Completado. ${parts.filter((p) => p.credit === 1).length} de ${parts.length} pasos al primer intento.`}
            </Feedback>
          )}
          <div className="row row--wrap">
            <button type="button" className="btn btn--sm" onClick={() => setShowSolution((s) => !s)} aria-expanded={showSolution}>
              <Icon name="eye" size={16} /> {showSolution ? 'Ocultar' : 'Ver'} resolución completa
            </button>
            {exam && submittedExam && <TheoryLink nodeId={exercise.nodeIds[0]} generatorId={exercise.generatorId} prominent={false} />}
            {onNext && (
              <button type="button" className="btn btn--primary btn--sm" onClick={onNext}>
                {nextLabel} <Icon name="arrow-right" size={16} />
              </button>
            )}
          </div>
          {showSolution && <ResolutionView steps={exercise.resolution ?? structuredResolution(exercise)} methods={exercise.methods} />}
          {showSolution && exercise.originalSolution && (
            <p className="small" style={{ margin: 0 }}>
              <strong>Solución del documento original:</strong> {exercise.originalSolution}
            </p>
          )}
        </section>
      )}
    </article>
  );
}
