import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { BLOCKS, NODES, nodeTitle, NODE_BY_ID, type ModuleId } from '../../learning/syllabus';
import { COVERED_NODES, SOURCE_EXERCISES } from '../../learning/registry';
import { buildExam, selectNext, type Selection } from '../../learning/session';
import { dueCards, masteryLevel, masteryPercent } from '../../learning/mastery';
import type { Exercise } from '../../learning/types';
import { ExercisePlayer, type ExerciseOutcome } from '../../ui/ExercisePlayer';
import { Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { navigate, useRoute } from '../../app/hooks';

type View = 'practica' | 'repaso' | 'examen' | 'progreso' | 'fuentes';
const VIEWS: { id: View; label: string }[] = [
  { id: 'practica', label: 'Práctica' },
  { id: 'repaso', label: 'Repaso' },
  { id: 'examen', label: 'Examen' },
  { id: 'progreso', label: 'Progreso' },
  { id: 'fuentes', label: 'Ejercicios del tema' },
];

const MODULE_LABEL: Record<ModuleId, string> = {
  forja: 'Atomic Forge',
  historia: 'Time Machine',
  fotones: 'Photon Lab',
  masas: 'Mass Spectrometry Lab',
  cuantico: 'Quantum Space',
  arquitecto: 'Electron Architect',
  periodico: 'Periodic Universe',
  entrenamiento: 'Entrenamiento',
};

const coveredBlocks = BLOCKS.filter((b) => COVERED_NODES.some((n) => NODE_BY_ID.get(n)?.block === b.id));

function ScopePicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="row row--wrap" style={{ gap: 6 }} role="group" aria-label="Bloques del temario">
      <button type="button" className="btn btn--sm" aria-pressed={value.length === 0} onClick={() => onChange([])} style={value.length === 0 ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
        Todo lo disponible
      </button>
      {coveredBlocks.map((b) => {
        const on = value.includes(b.id);
        return (
          <button key={b.id} type="button" className="btn btn--sm" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== b.id) : [...value, b.id])} style={on ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
            {b.id}. {b.short}
          </button>
        );
      })}
    </div>
  );
}

const scopeNodes = (blocks: number[]) => (blocks.length ? COVERED_NODES.filter((n) => blocks.includes(NODE_BY_ID.get(n)!.block)) : []);

function Practice({ initialScope, fixedExercise, onClearFixed }: { initialScope: string[]; fixedExercise: Exercise | null; onClearFixed: () => void }) {
  const [blocks, setBlocks] = useState<number[]>([]);
  const mastery = useStore((s) => s.mastery);
  const cards = useStore((s) => s.cards);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const recent = useRef<string[]>([]);
  const retry = useRef<Record<string, number>>({});
  const scope = initialScope.length ? initialScope : scopeNodes(blocks);
  const pick = useCallback(() => selectNext({ mastery: useStore.getState().mastery, cards: useStore.getState().cards, recent: recent.current, sessionRetry: retry.current }, scope, Date.now(), Math.floor(Math.random() * 1e9)), [scope]);
  const [sel, setSel] = useState<Selection | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!fixedExercise) setSel(pick());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.join(','), initialScope.join(',')]);

  const exercise = fixedExercise ?? sel?.exercise ?? null;

  const onFinish = useCallback(
    (o: ExerciseOutcome) => {
      if (!exercise) return;
      recordAttempt({ exerciseId: exercise.id, nodeIds: exercise.nodeIds, difficulty: exercise.difficulty, correct: o.correct, score: o.score, hintsUsed: o.hintsUsed, mode: 'practica' });
      recent.current = [...recent.current, exercise.generatorId].slice(-4);
      for (const k of Object.keys(retry.current)) retry.current[k] = retry.current[k]! - 1;
      for (const n of exercise.nodeIds) {
        if (!o.correct) retry.current[n] = 3;
        else if (retry.current[n] !== undefined && retry.current[n]! <= 0) delete retry.current[n];
      }
      setCount((c) => c + 1);
    },
    [exercise, recordAttempt],
  );

  const node = sel?.nodeId;
  return (
    <div className="stack-16">
      {!initialScope.length && !fixedExercise && (
        <div className="stack-8">
          <span className="small muted">Ámbito</span>
          <ScopePicker value={blocks} onChange={setBlocks} />
        </div>
      )}
      {exercise && (
        <div className="card enter" style={{ padding: 24 }} key={exercise.id}>
          {!fixedExercise && sel && (
            <div className="row row--between row--wrap" style={{ marginBottom: 16, gap: 8 }}>
              <span className="small muted">
                {sel.reason === 'repaso' ? 'Repaso programado' : sel.reason === 'reintento' ? 'Vuelves a un apartado que fallaste' : 'Elegido por tu nivel de dominio'}
                {node ? ` · ${node} ${nodeTitle(node)}` : ''}
              </span>
              {node && (
                <span className="row small muted" style={{ gap: 8 }}>
                  Dominio
                  <span className="progress" style={{ width: 80 }}>
                    <span style={{ width: `${masteryPercent(mastery[node])}%` }} />
                  </span>
                  <span className="mono">{masteryPercent(mastery[node])} %</span>
                </span>
              )}
            </div>
          )}
          <ExercisePlayer
            exercise={exercise}
            mode="practica"
            onFinish={onFinish}
            onNext={() => {
              if (fixedExercise) onClearFixed();
              setSel(pick());
            }}
            nextLabel={fixedExercise ? 'Seguir con práctica adaptativa' : 'Siguiente ejercicio'}
          />
        </div>
      )}
      <p className="small faint">
        {count > 0 ? `${count} ejercicio${count > 1 ? 's' : ''} en esta sesión. ` : ''}Cada ejercicio se genera con datos nuevos y su solución se calcula, no se copia. Los repasos pendientes: {dueCards(cards, Date.now()).length}.
      </p>
    </div>
  );
}

function Review({ onStart }: { onStart: (nodes: string[]) => void }) {
  const cards = useStore((s) => s.cards);
  const now = Date.now();
  const due = dueCards(cards, now);
  const upcoming = Object.values(cards)
    .filter((c) => c.due > now)
    .sort((a, b) => a.due - b.due)
    .slice(0, 8);
  return (
    <div className="stack-16">
      <p className="lead">Los apartados que fallas vuelven a aparecer al día siguiente; los que aciertas, cada vez más espaciados (1, 2, 4, 8 y 16 días).</p>
      {due.length ? (
        <div className="card stack-12">
          <span className="h3">{due.length} apartado{due.length > 1 ? 's' : ''} para repasar hoy</span>
          <ul className="stack-8 small" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {due.map((c) => (
              <li key={c.nodeId} className="row row--between">
                <span>
                  <span className="mono faint">{c.nodeId}</span> {nodeTitle(c.nodeId)}
                </span>
                <span className="faint">caja {c.box}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={() => onStart(due.map((c) => c.nodeId))}>
            Repasar ahora
          </button>
        </div>
      ) : (
        <Feedback tone="info">No tienes repasos pendientes. {Object.keys(cards).length ? 'Vuelve cuando se cumpla el próximo intervalo.' : 'Practica primero: los repasos se programan según tus resultados.'}</Feedback>
      )}
      {upcoming.length > 0 && (
        <div className="stack-8">
          <span className="small muted">Próximos repasos</span>
          {upcoming.map((c) => (
            <div key={c.nodeId} className="row row--between small">
              <span>
                <span className="mono faint">{c.nodeId}</span> {nodeTitle(c.nodeId)}
              </span>
              <span className="faint">{new Date(c.due).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ExamRun {
  exercises: Exercise[];
  index: number;
  results: { exercise: Exercise; outcome: ExerciseOutcome }[];
  startedAt: number;
  minutes: number | null;
  scope: string[];
}

function ExamView() {
  const [blocks, setBlocks] = useState<number[]>([]);
  const [count, setCount] = useState(8);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [run, setRun] = useState<ExamRun | null>(null);
  const [answered, setAnswered] = useState(false);
  const [now, setNow] = useState(Date.now());
  const recordAttempt = useStore((s) => s.recordAttempt);
  const recordExam = useStore((s) => s.recordExam);
  const exams = useStore((s) => s.exams);

  useEffect(() => {
    if (!run?.minutes) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [run?.minutes]);

  const finished = run && run.index >= run.exercises.length;
  const timeLeft = run?.minutes ? run.minutes * 60_000 - (now - run.startedAt) : null;
  const timeUp = timeLeft !== null && timeLeft <= 0;

  const finalize = useCallback(
    (r: ExamRun) => {
      const byNode: Record<string, { ok: number; total: number }> = {};
      for (const { exercise, outcome } of r.results) {
        for (const n of exercise.nodeIds) {
          byNode[n] ??= { ok: 0, total: 0 };
          byNode[n].total += 1;
          byNode[n].ok += outcome.score;
        }
      }
      const score = r.results.reduce((a, x) => a + x.outcome.score, 0) / Math.max(1, r.exercises.length);
      recordExam({ scope: r.scope, total: r.exercises.length, score, byNode });
    },
    [recordExam],
  );

  useEffect(() => {
    if (run && timeUp && !finished) {
      const r = { ...run, index: run.exercises.length };
      setRun(r);
      finalize(r);
    }
  }, [timeUp, run, finished, finalize]);

  if (!run) {
    return (
      <div className="stack-16">
        <p className="lead">Sin pistas ni correcciones durante la prueba. Al terminar verás la nota, el resultado por apartados y todas las resoluciones.</p>
        <div className="stack-8">
          <span className="small muted">Bloques</span>
          <ScopePicker value={blocks} onChange={setBlocks} />
        </div>
        <div className="row row--wrap" style={{ gap: 24 }}>
          <div className="stack-8">
            <span className="small muted">Preguntas</span>
            <div className="segmented">
              {[5, 8, 12].map((n) => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="stack-8">
            <span className="small muted">Tiempo</span>
            <div className="segmented">
              {[null, 20, 40].map((m) => (
                <button key={String(m)} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  {m ? `${m} min` : 'Libre'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => {
            const scope = scopeNodes(blocks);
            setRun({ exercises: buildExam(scope, count, Math.floor(Math.random() * 1e9)), index: 0, results: [], startedAt: Date.now(), minutes, scope });
            setAnswered(false);
            setNow(Date.now());
          }}
        >
          Empezar examen
        </button>
        {exams.length > 0 && (
          <div className="stack-8">
            <span className="small muted">Exámenes anteriores</span>
            {[...exams]
              .reverse()
              .slice(0, 5)
              .map((e) => (
                <div key={e.at} className="row row--between small">
                  <span className="faint">{new Date(e.at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span className="mono">{(e.score * 10).toLocaleString('es-ES', { maximumFractionDigits: 1 })} / 10</span>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  if (finished) {
    const score = run.results.reduce((a, x) => a + x.outcome.score, 0) / run.exercises.length;
    const byNode = new Map<string, { ok: number; total: number }>();
    run.results.forEach(({ exercise, outcome }) =>
      exercise.nodeIds.forEach((n) => {
        const cur = byNode.get(n) ?? { ok: 0, total: 0 };
        byNode.set(n, { ok: cur.ok + outcome.score, total: cur.total + 1 });
      }),
    );
    return (
      <div className="stack-16 enter">
        <div className="row row--between" style={{ alignItems: 'flex-end' }}>
          <div className="stack-8">
            <span className="eyebrow">Resultado</span>
            <span className="display" style={{ fontSize: '4rem' }}>
              {(score * 10).toLocaleString('es-ES', { maximumFractionDigits: 1 })}
              <span className="faint" style={{ fontSize: '1.5rem' }}>
                {' '}
                / 10
              </span>
            </span>
          </div>
          <button type="button" className="btn" onClick={() => setRun(null)}>
            Nuevo examen
          </button>
        </div>
        {run.results.length < run.exercises.length && <Feedback tone="warn">Se acabó el tiempo: {run.exercises.length - run.results.length} pregunta(s) sin responder cuentan como 0.</Feedback>}
        <div className="stack-8">
          <span className="small muted">Por apartados</span>
          {[...byNode.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))
            .map(([n, v]) => (
              <div key={n} className="row row--between small">
                <span>
                  <span className="mono faint">{n}</span> {nodeTitle(n)}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="progress" style={{ width: 90 }}>
                    <span style={{ width: `${(v.ok / v.total) * 100}%`, background: v.ok / v.total >= 0.7 ? 'var(--ok)' : v.ok / v.total >= 0.4 ? 'var(--warn)' : 'var(--bad)' }} />
                  </span>
                  <span className="mono" style={{ width: 36, textAlign: 'right' }}>
                    {Math.round((v.ok / v.total) * 100)}%
                  </span>
                </span>
              </div>
            ))}
        </div>
        <div className="stack-12">
          <span className="small muted">Revisión</span>
          {run.results.map(({ exercise, outcome }, i) => (
            <details key={exercise.id + i} className="card">
              <summary className="row row--between" style={{ cursor: 'pointer', listStyle: 'none' }}>
                <span>
                  <span className="mono faint">{i + 1}.</span> {exercise.title}
                </span>
                <span className="mono" style={{ color: outcome.score >= 0.7 ? 'var(--ok)' : 'var(--bad)' }}>
                  {Math.round(outcome.score * 100)} %
                </span>
              </summary>
              <div className="stack-8 small" style={{ marginTop: 12, color: 'var(--ink-muted)' }}>
                {exercise.parts.map((p, k) => (
                  <div key={p.id}>
                    <span style={{ color: outcome.partResults[k]?.correct ? 'var(--ok)' : 'var(--bad)' }}>{outcome.partResults[k]?.correct ? '✓' : '✗'}</span> <b style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.prompt}:</b> <span className="mono">{p.canonical}</span>. {p.explanation}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  }

  const ex = run.exercises[run.index]!;
  return (
    <div className="stack-16">
      <div className="row row--between">
        <span className="small muted">
          Pregunta <span className="mono">{run.index + 1}</span> de <span className="mono">{run.exercises.length}</span>
        </span>
        {timeLeft !== null && (
          <span className="mono" style={{ color: timeLeft < 60_000 ? 'var(--bad)' : 'var(--ink-muted)' }} aria-live="off">
            {Math.max(0, Math.floor(timeLeft / 60000))}:{String(Math.max(0, Math.floor((timeLeft % 60000) / 1000))).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className="progress">
        <span style={{ width: `${(run.index / run.exercises.length) * 100}%` }} />
      </div>
      <div className="card" style={{ padding: 24 }} key={ex.id + run.index}>
        <ExercisePlayer
          exercise={ex}
          mode="examen"
          showMeta={false}
          onFinish={(o) => {
            setAnswered(true);
            recordAttempt({ exerciseId: ex.id, nodeIds: ex.nodeIds, difficulty: ex.difficulty, correct: o.correct, score: o.score, hintsUsed: 0, mode: 'examen' });
            setRun((r) => (r ? { ...r, results: [...r.results, { exercise: ex, outcome: o }] } : r));
          }}
          onNext={
            answered
              ? () => {
                  setAnswered(false);
                  setRun((r) => {
                    if (!r) return r;
                    const next = { ...r, index: r.index + 1 };
                    if (next.index >= next.exercises.length) finalize(next);
                    return next;
                  });
                }
              : undefined
          }
          nextLabel={run.index + 1 >= run.exercises.length ? 'Ver resultado' : 'Siguiente pregunta'}
        />
      </div>
    </div>
  );
}

function ProgressView() {
  const mastery = useStore((s) => s.mastery);
  const cards = useStore((s) => s.cards);
  const history = useStore((s) => s.history);
  const covered = new Set(COVERED_NODES);
  const levelColor = { 'sin-datos': 'var(--surface-sunken)', iniciado: 'rgb(242 169 59 / 0.18)', 'en-progreso': 'rgb(242 169 59 / 0.45)', dominado: 'var(--accent)' } as const;
  const dominated = NODES.filter((n) => masteryLevel(mastery[n.id]) === 'dominado').length;
  return (
    <div className="stack-16">
      <div className="row row--wrap" style={{ gap: 24 }}>
        <div className="stack-8">
          <span className="eyebrow">Dominados</span>
          <span className="h2 num">
            {dominated} <span className="faint" style={{ fontSize: '1.25rem' }}>/ {NODES.length}</span>
          </span>
        </div>
        <div className="stack-8">
          <span className="eyebrow">Ejercicios resueltos</span>
          <span className="h2 num">{history.length}</span>
        </div>
        <div className="stack-8">
          <span className="eyebrow">Acierto</span>
          <span className="h2 num">{history.length ? Math.round((history.filter((h) => h.correct).length / history.length) * 100) : 0} %</span>
        </div>
      </div>
      <div className="row row--wrap small muted" style={{ gap: 16 }}>
        {(['sin-datos', 'iniciado', 'en-progreso', 'dominado'] as const).map((l) => (
          <span key={l} className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: levelColor[l], border: '1px solid var(--hairline-strong)' }} />
            {l === 'sin-datos' ? 'Sin datos' : l === 'iniciado' ? 'Iniciado' : l === 'en-progreso' ? 'En progreso' : 'Dominado (≥ 80 %)'}
          </span>
        ))}
      </div>
      {BLOCKS.map((b) => (
        <section key={b.id} className="stack-8">
          <span className="h3">
            <span className="mono faint">{b.id}.</span> {b.title}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {NODES.filter((n) => n.block === b.id).map((n) => {
              const m = mastery[n.id];
              const lvl = masteryLevel(m);
              const has = covered.has(n.id);
              return (
                <div key={n.id} className="card" style={{ padding: '10px 12px', opacity: has ? 1 : 0.55, display: 'flex', gap: 10, alignItems: 'flex-start' }} title={n.sources}>
                  <span style={{ width: 10, height: 10, marginTop: 5, borderRadius: 3, flex: 'none', background: levelColor[lvl], border: '1px solid var(--hairline-strong)' }} aria-hidden="true" />
                  <span className="stack-8" style={{ gap: 2, minWidth: 0 }}>
                    <span className="small">
                      <span className="mono faint">{n.id}</span> {n.title}
                    </span>
                    <span className="small faint">
                      {has ? (m?.attempts ? `${masteryPercent(m)} % · ${m.attempts} intento${m.attempts > 1 ? 's' : ''}${cards[n.id] ? ` · repaso ${new Date(cards[n.id]!.due).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}` : 'Sin practicar') : `Llega con ${n.modules.map((x) => MODULE_LABEL[x]).join(' / ')}`}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Sources({ onPick }: { onPick: (e: Exercise) => void }) {
  const groups = [
    { title: 'Ejercicios de ampliación y repaso', items: SOURCE_EXERCISES.filter((s) => s.ref.startsWith('AMP')) },
    { title: 'Ejemplos resueltos de la teoría', items: SOURCE_EXERCISES.filter((s) => s.ref.startsWith('TEO')) },
  ];
  return (
    <div className="stack-16">
      <p className="lead">Los ejercicios de tus apuntes, con sus datos originales, corrección razonada y pistas. Los que corresponden a módulos aún no construidos se incorporarán en fases posteriores.</p>
      {groups.map((g) => (
        <section key={g.title} className="stack-8">
          <span className="h3">{g.title}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {g.items.map((s) => (
              <button key={s.ref} type="button" className="btn" style={{ justifyContent: 'space-between' }} onClick={() => onPick(s.build())}>
                <span className="mono">{s.ref}</span>
                <span className="faint small">{s.nodeIds[0]}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TrainingOverlay() {
  const { query } = useRoute();
  const view = (VIEWS.find((v) => v.id === query.get('v'))?.id ?? 'practica') as View;
  const [practiceScope, setPracticeScope] = useState<string[]>([]);
  const [fixed, setFixed] = useState<Exercise | null>(null);
  const go = (v: View) => navigate(`/entrenamiento?v=${v}`);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [view, fixed]);
  const dueCount = dueCards(useStore((s) => s.cards), Date.now()).length;
  const scopeKey = useMemo(() => practiceScope.join(','), [practiceScope]);
  return (
    <div className="workspace workspace--full" style={{ minHeight: 0 }}>
      <div ref={scroller} className="interactive" style={{ overflowY: 'auto', minHeight: 0, padding: '8px var(--gutter) 64px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <header className="stack-12 enter">
            <span className="eyebrow eyebrow--accent">Centro de entrenamiento</span>
            <h1 className="display" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}>
              Practica lo que te falta.
            </h1>
            <div className="segmented" role="tablist" aria-label="Modo" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => { setFixed(null); setPracticeScope([]); go(v.id); }}>
                  {v.label}
                  {v.id === 'repaso' && dueCount > 0 && <span className="mono" style={{ color: 'var(--accent)', marginLeft: 6 }}>{dueCount}</span>}
                </button>
              ))}
            </div>
          </header>
          {view === 'practica' && <Practice key={scopeKey} initialScope={practiceScope} fixedExercise={fixed} onClearFixed={() => setFixed(null)} />}
          {view === 'repaso' && (
            <Review
              onStart={(nodes) => {
                setPracticeScope(nodes);
                go('practica');
              }}
            />
          )}
          {view === 'examen' && <ExamView />}
          {view === 'progreso' && <ProgressView />}
          {view === 'fuentes' && (
            <Sources
              onPick={(e) => {
                setFixed(e);
                go('practica');
              }}
            />
          )}
          <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
            <Icon name="arrow-left" size={16} /> Volver al Atrio
          </button>
        </div>
      </div>
    </div>
  );
}
