import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { BLOCKS, NODES, nodeTitle, NODE_BY_ID, type ModuleId } from '../../learning/syllabus';
import { COVERED_NODES, GENERATORS, GENERATOR_BY_ID, SOURCE_EXERCISES, sourceLevel } from '../../learning/registry';
import { buildExamDetailed, buildProfileExam, MOCK_PROFILES, weakProfile, selectNext, type MockProfile, type Selection } from '../../learning/session';
import { dueCards, EVIDENCE_LABEL, masteryEstimate, masteryLevel } from '../../learning/mastery';
import { SKILLS, ERROR_LABEL, buildEvidence } from '../../learning/evidence';
import { weakSkills, explainWeakSkill } from '../../learning/diagnosis';
import type { ErrorKind, SkillId } from '../../learning/types';
import type { Exercise } from '../../learning/types';
import { ExercisePlayer, type ExerciseOutcome, type Variant } from '../../ui/ExercisePlayer';
import { ExamRunner, ExamReportView, loadSavedSession, saveSession, useFinishExam } from './ExamSessionView';
import { exerciseFromId, newSession, type ExamReport, type ExamSession } from '../../learning/examSession';
import { NotebookView } from './Notebook';
import { StudyPath } from './StudyPath';
import { Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { navigate, useRoute } from '../../app/hooks';

type View = 'practica' | 'ruta' | 'repaso' | 'examen' | 'cuaderno' | 'progreso' | 'fuentes';
const VIEWS: { id: View; label: string }[] = [
  { id: 'practica', label: 'Práctica' },
  { id: 'ruta', label: 'Ruta de estudio' },
  { id: 'repaso', label: 'Repaso' },
  { id: 'examen', label: 'Examen' },
  { id: 'cuaderno', label: 'Cuaderno de errores' },
  { id: 'progreso', label: 'Progreso' },
  { id: 'fuentes', label: 'Ejercicios de clase' },
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

const GEN_LABEL: Record<string, string> = {
  'examen-masa-iones': 'Isótopos, iones y masa atómica',
  historia: 'Cuestión: modelos atómicos',
  'examen-ondas': 'Ondas: caracteriza una radiación',
  'examen-espectro': 'Espectro del hidrógeno (Rydberg)',
  'cuantica-conceptos': 'Cuestión: modelo mecanocuántico',
  'examen-cuantico': 'Configuración y números cuánticos',
  'examen-elementos': 'Tres elementos: posición y propiedades',
  'conceptos-varios': 'Cuestión: espectros y notación',
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

/** Enlace directo a una familia de ejercicios: #/entrenamiento?gen=<id> (desde la guía o la búsqueda). */
function exerciseForGenerator(id: string | null): Exercise | null {
  const g = id ? GENERATORS.find((x) => x.id === id) : undefined;
  if (!g) return null;
  const d = g.difficulties.includes(2) ? 2 : g.difficulties[g.difficulties.length - 1]!;
  return g.create(Math.floor(Math.random() * 1e6), d);
}

/** Elegir el apartado para la ruta de estudio. */
function RoutePicker() {
  const mastery = useStore((st) => st.mastery);
  return (
    <div className="route-picker">
      {BLOCKS.map((b) => (
        <section key={b.id} className="stack-8">
          <span className="eyebrow" style={{ color: `var(--b${b.id})` }}>
            {b.id}. {b.title}
          </span>
          <div className="row row--wrap" style={{ gap: 6 }}>
            {NODES.filter((n) => n.block === b.id && COVERED_NODES.includes(n.id)).map((n) => {
              const e = masteryEstimate(mastery[n.id]);
              return (
                <a key={n.id} className="challenge-chip" href={`#/entrenamiento?v=ruta&n=${n.id}`} title={e.evidence === 'sin-datos' ? 'Sin practicar' : `Dominio estimado ${e.low}–${e.high} %`}>
                  <span className="mono faint">{n.id}</span> {n.title}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const VARIANTS: { id: Variant; label: string; help: string }[] = [
  { id: 'guiado', label: 'Guiado', help: 'Paso a paso, con la primera pista ya visible. Ideal para un tema nuevo.' },
  { id: 'autonomo', label: 'Autónomo', help: 'Resuelves tú y pides pistas cuando las necesites.' },
  { id: 'desafio', label: 'Desafío', help: 'Todo el problema a la vez; pistas y teoría solo tras dos intentos fallidos.' },
  { id: 'revision', label: 'Revisión', help: 'Ves la resolución completa explicada sin responder. No cuenta para tu progreso.' },
];

function Practice({ initialScope, fixedExercise, onClearFixed, forceVariant }: { initialScope: string[]; fixedExercise: Exercise | null; onClearFixed: () => void; forceVariant?: Variant }) {
  const [blocks, setBlocks] = useState<number[]>([]);
  const [variant, setVariant] = useState<Variant>(() => {
    try {
      const v = localStorage.getItem('atom:variant');
      return VARIANTS.some((x) => x.id === v) ? (v as Variant) : 'autonomo';
    } catch {
      return 'autonomo';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('atom:variant', variant);
    } catch {
      /* sin almacenamiento: solo dura la sesión */
    }
  }, [variant]);
  const mastery = useStore((s) => s.mastery);
  const cards = useStore((s) => s.cards);
  const recordExercise = useStore((s) => s.recordExercise);
  const recent = useRef<string[]>([]);
  const retry = useRef<Record<string, number>>({});
  const scope = initialScope.length ? initialScope : scopeNodes(blocks);
  const pick = useCallback(() => {
    const st = useStore.getState();
    return selectNext({ mastery: st.mastery, cards: st.cards, recent: recent.current, sessionRetry: retry.current, history: st.history, skills: st.skills }, scope, Date.now(), Math.floor(Math.random() * 1e9));
  }, [scope]);
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
      recordExercise(exercise, o, 'practica');
      recent.current = [...recent.current, exercise.generatorId].slice(-4);
      for (const k of Object.keys(retry.current)) retry.current[k] = retry.current[k]! - 1;
      // Reintento por apartado según la evidencia granular de cada paso (no todo el ejercicio a la vez).
      for (const [n, v] of Object.entries(buildEvidence(exercise, o.parts).nodes)) {
        if (v.y < 0.7) retry.current[n] = 3;
        else if (retry.current[n] !== undefined && retry.current[n]! <= 0) delete retry.current[n];
      }
      setCount((c) => c + 1);
    },
    [exercise, recordExercise],
  );

  const node = sel?.nodeId;
  return (
    <div className="stack-16">
      <div className="row row--wrap" style={{ gap: 24, alignItems: 'flex-end' }}>
        {!initialScope.length && !fixedExercise && (
          <div className="stack-8">
            <span className="small muted">Ámbito</span>
            <ScopePicker value={blocks} onChange={setBlocks} />
          </div>
        )}
        <div className="stack-8">
          <span className="small muted" id="variant-label">
            Cómo quieres resolver
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="variant-label">
            {VARIANTS.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={variant === v.id} onClick={() => setVariant(v.id)} title={v.help}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="small faint" style={{ margin: '-8px 0 0' }}>
        {VARIANTS.find((v) => v.id === variant)!.help}
      </p>
      {exercise && (
        <div className="card enter" style={{ padding: 24 }} key={exercise.id}>
          {!fixedExercise && sel && (
            <div className="row row--between row--wrap" style={{ marginBottom: 16, gap: 8 }}>
              <span className="small muted">
                <span className="why-label">{sel.reason === 'repaso' ? 'Repaso' : sel.reason === 'reintento' ? 'Reintento' : sel.reason === 'competencia' ? 'Refuerzo de competencia' : sel.reason === 'prerrequisito' ? 'Prerrequisito' : 'Dominio'}</span> {sel.explanation}
              </span>
              {node && (
                <MasteryBadge m={mastery[node]} />
              )}
            </div>
          )}
          <ExercisePlayer
            exercise={exercise}
            mode="practica"
            variant={fixedExercise && forceVariant ? forceVariant : variant}
            onFinish={(fixedExercise && forceVariant ? forceVariant : variant) === 'revision' ? undefined : onFinish}
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

/** Dominio estimado con su intervalo y la cantidad de evidencia: sin falsa precisión. */
function MasteryBadge({ m }: { m: Parameters<typeof masteryEstimate>[0] }) {
  const e = masteryEstimate(m);
  if (e.evidence === 'sin-datos') return <span className="small faint">Sin datos todavía</span>;
  return (
    <span className="row small muted" style={{ gap: 8 }} title={`Dominio estimado ${e.low}–${e.high} % (${EVIDENCE_LABEL[e.evidence]}); ${e.demonstrated} acierto(s) demostrado(s) sin pistas`}>
      <span className="range-bar" aria-hidden="true">
        <span style={{ left: `${e.low}%`, width: `${Math.max(2, e.high - e.low)}%` }} />
        <i style={{ left: `${e.mid}%` }} />
      </span>
      <span className="mono">
        {e.low === e.high ? `${e.mid} %` : `${e.low}–${e.high} %`}
      </span>
      <span className="faint">{EVIDENCE_LABEL[e.evidence]}</span>
    </span>
  );
}

/** Diagnóstico por competencias: dominio estimado de cada una y debilidades con sus pruebas. */
function SkillsPanel() {
  const skills = useStore((s) => s.skills);
  const history = useStore((s) => s.history);
  const weak = weakSkills(history, skills);
  const errorCounts = new Map<ErrorKind, number>();
  for (const a of history.slice(-40)) for (const e of a.errors ?? []) errorCounts.set(e.kind, (errorCounts.get(e.kind) ?? 0) + 1);
  const topErrors = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <section className="stack-12" aria-label="Competencias">
      <span className="h3">Competencias</span>
      <p className="small muted" style={{ margin: 0 }}>
        Cada apartado de un ejercicio aporta evidencia sobre competencias distintas: un error de conversión de unidades no se cuenta como un fallo de espectros. Los intervalos reflejan cuánta evidencia hay.
      </p>
      <div className="skills-grid">
        {(Object.keys(SKILLS) as SkillId[]).map((k) => (
          <div key={k} className="card skill-card">
            <span className="small" style={{ fontWeight: 600 }}>{SKILLS[k].label}</span>
            <span className="small faint">{SKILLS[k].description}</span>
            <MasteryBadge m={skills[k]} />
          </div>
        ))}
      </div>
      {weak.length > 0 && (
        <div className="stack-8">
          {weak.map((w) => (
            <Feedback key={w.skill} tone="warn">
              {explainWeakSkill(w)}
            </Feedback>
          ))}
        </div>
      )}
      {topErrors.length > 0 && (
        <div className="stack-8">
          <span className="small muted">Errores más frecuentes en tus últimos 40 ejercicios</span>
          <div className="row row--wrap" style={{ gap: 6 }}>
            {topErrors.map(([k, n]) => (
              <span key={k} className="chip">
                {ERROR_LABEL[k]} <span className="mono" style={{ color: 'var(--accent)' }}>{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
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


function parseSeed(t: string): number | null {
  const n = Number(t);
  return t && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function ExamView() {
  const [blocks, setBlocks] = useState<number[]>([]);
  const [profileId, setProfileId] = useState<MockProfile['id']>('equilibrado');
  const masteryAll = useStore((st) => st.mastery);
  const profilePreview = useMemo(() => (profileId === 'debiles' ? weakProfile(masteryAll, 1) : { profile: MOCK_PROFILES.find((p) => p.id === profileId)!, limitation: undefined as string | undefined }), [profileId, masteryAll]);
  const [count, setCount] = useState(8);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [seedText, setSeedText] = useState('');
  const exams = useStore((s) => s.exams);
  const [session, setSession] = useState<ExamSession | null>(() => loadSavedSession());
  const [done, setDone] = useState<{ report: ExamReport; session: ExamSession } | null>(null);
  const [limitation, setLimitation] = useState<string | undefined>();
  const finish = useFinishExam();
  const start = (label: string, exercises: Exercise[], points: number[], mins: number | null, seed: number, lim?: string) => {
    setDone(null);
    setLimitation(lim);
    setSession(newSession(label, exercises, points, mins, seed));
  };

  if (done) {
    return <ExamReportView report={done.report} session={done.session} onNew={() => setDone(null)} />;
  }
  if (session) {
    return (
      <div className="stack-12">
        {limitation && <Feedback tone="warn">{limitation}</Feedback>}
        <ExamRunner
          session={session}
          onChange={setSession}
          onFinish={(s, exs) => {
            const report = finish({ ...s, finishedAt: Date.now() }, exs);
            setSession(null);
            setDone({ report, session: s });
          }}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => {
            if (window.confirm('¿Abandonar el simulacro? Se perderán las respuestas.')) {
              saveSession(null);
              setSession(null);
            }
          }}
        >
          Abandonar el simulacro
        </button>
      </div>
    );
  }

  {
    return (
      <div className="stack-16">
        <div className="card mock-exam">
          <div className="stack-8">
            <span className="eyebrow eyebrow--accent">Simulacros completos · sobre 10</span>
            <span className="h2" style={{ fontSize: '1.9rem' }}>
              Elige el tipo de examen
            </span>
            <p className="small muted" style={{ margin: 0, maxWidth: '64ch' }}>
              Composiciones y ponderaciones <strong>propuestas</strong> a partir de los apuntes, la hoja del tema y las cuestiones EBAU: no son los criterios oficiales de tu profesor. Sin pistas durante la prueba; al terminar, nota, informe por apartados y resoluciones.
            </p>
          </div>
          <div className="profile-grid" role="radiogroup" aria-label="Tipo de simulacro">
            {[...MOCK_PROFILES, { id: 'debiles' as const, label: 'Mis puntos débiles', description: 'Los apartados donde tu dominio estimado es más bajo.', minutes: 50, plan: [] }].map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={profileId === p.id} className="profile-card" onClick={() => setProfileId(p.id)}>
                <span className="profile-card__label">{p.label}</span>
                <span className="small muted">{p.description}</span>
                <span className="small faint num">{p.minutes} min</span>
              </button>
            ))}
          </div>
          {profilePreview.limitation && <Feedback tone="info">{profilePreview.limitation}</Feedback>}
          <ol className="mock-exam__plan">
            {profilePreview.profile.plan.map((q, i) => (
              <li key={i}>
                <span className="mono faint">{i + 1}</span>
                <span>{q.source ? `${q.source} (documento)` : (GEN_LABEL[q.generator!] ?? GENERATOR_BY_ID.get(q.generator!)?.title ?? q.generator)}</span>
                <span className="mono">{q.points.toLocaleString('es-ES')} p</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn--primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              const seed = parseSeed(seedText) ?? Math.floor(Math.random() * 1e6);
              const prof = profileId === 'debiles' ? weakProfile(masteryAll, seed).profile : profilePreview.profile;
              const { exercises, points } = buildProfileExam(prof, seed);
              start(`Simulacro ${prof.label.toLowerCase()}`, exercises, points, prof.minutes, seed, profileId === 'debiles' ? weakProfile(masteryAll, seed).limitation : undefined);
            }}
          >
            Empezar el simulacro {profilePreview.profile.label.toLowerCase()}
          </button>
        </div>
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="exam-seed">Repetir un simulacro concreto (semilla, opcional)</label>
          <input id="exam-seed" className="input" inputMode="numeric" placeholder="p. ej. 482915" value={seedText} onChange={(e) => setSeedText(e.target.value.replace(/\D/g, '').slice(0, 9))} />
          <span className="small faint">Con la misma semilla y los mismos ajustes se genera exactamente el mismo examen: útil para repetirlo o compartirlo.</span>
        </div>
        <hr className="divider" />
        <span className="h3">Examen a medida</span>
        <p className="small muted" style={{ margin: 0 }}>Sin pistas ni correcciones durante la prueba. Al terminar verás la nota, el resultado por apartados y todas las resoluciones.</p>
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
            const seed = parseSeed(seedText) ?? Math.floor(Math.random() * 1e6);
            const built = buildExamDetailed(scope, count, seed);
            start('Examen a medida', built.exercises, built.exercises.map(() => 1), minutes, seed, built.limitation);
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
      <SkillsPanel />
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
                      {has ? (m?.attempts ? `${(() => { const e = masteryEstimate(m); return e.low === e.high ? `${e.mid} %` : `${e.low}–${e.high} %`; })()} · ${m.attempts} intento${m.attempts > 1 ? 's' : ''}${cards[n.id] ? ` · repaso ${new Date(cards[n.id]!.due).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}` : 'Sin practicar') : `Llega con ${n.modules.map((x) => MODULE_LABEL[x]).join(' / ')}`}
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

const MODE_HELP: Record<View, string> = {
  practica: 'Ejercicios nuevos elegidos por tu nivel: cada uno te dice por qué te toca. Si fallas, tienes pistas graduadas y un enlace a la teoría.',
  ruta: 'Un concepto de principio a fin: comprender, observarlo en el laboratorio, practicar guiado, aplicar solo, nivel examen y consolidar según tus errores.',
  repaso: 'Lo que ya practicaste vuelve justo antes de que lo olvides (repetición espaciada). Cinco minutos al día bastan.',
  examen: 'Sin pistas ni correcciones hasta el final. Al terminar, verás la nota y exactamente qué estudiar para mejorarla.',
  cuaderno: 'Lo que has fallado, los errores que repites y las posibles lagunas, con la forma de superarlos.',
  progreso: 'Tu dominio por apartado y por competencia, con su margen de incertidumbre.',
  fuentes: 'Los ejercicios de tus hojas, con los mismos datos que en clase. Empieza por los básicos y sube a los de examen.',
};

const LEVEL_LABEL = { 1: 'Básico', 2: 'Examen', 3: 'Avanzado' } as const;
const DOCS: { id: string; title: string; blurb: string; test: (ref: string) => boolean }[] = [
  { id: 'ebau', title: 'EBAU (La Rioja)', blurb: 'Cuestiones reales de selectividad: el nivel de examen más alto.', test: (r) => r.startsWith('EBAU') },
  { id: 'hoj', title: 'Hoja de ejercicios del tema', blurb: 'Ejercicios 1–28 de la hoja de clase, con sus datos.', test: (r) => r.startsWith('HOJ') },
  { id: 'amp', title: 'Ejercicios de ampliación y repaso', blurb: 'Los 31 ejercicios de ampliación (las tablas, fila a fila).', test: (r) => r.startsWith('AMP') },
  { id: 'teo', title: 'Ejemplos resueltos de la teoría', blurb: 'Los ejemplos y ejercicios que aparecen en los apuntes.', test: (r) => r.startsWith('TEO') },
];

function Sources({ onPick }: { onPick: (e: Exercise) => void }) {
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

export function TrainingOverlay() {
  const { query } = useRoute();
  const view = (VIEWS.find((v) => v.id === query.get('v'))?.id ?? 'practica') as View;
  const nodesParam = query.get('nodes');
  const [practiceScope, setPracticeScope] = useState<string[]>(() => (nodesParam ? nodesParam.split(',').filter((n) => COVERED_NODES.includes(n)) : []));
  useEffect(() => {
    if (nodesParam) setPracticeScope(nodesParam.split(',').filter((n) => COVERED_NODES.includes(n)));
  }, [nodesParam]);
  const genParam = query.get('gen');
  const exParam = query.get('ex');
  const [fixed, setFixed] = useState<Exercise | null>(() => (exParam ? exerciseFromId(exParam) : exerciseForGenerator(genParam)));
  useEffect(() => {
    if (exParam) setFixed(exerciseFromId(exParam));
    else if (genParam) setFixed(exerciseForGenerator(genParam));
  }, [genParam, exParam]);
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
        <div className="training-col" style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <header className="stack-12 enter training-head">
            <span className="eyebrow eyebrow--accent">Centro de entrenamiento</span>
            <h1 className="display training-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}>
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
          <p className="small muted mode-help training-head">{MODE_HELP[view]}</p>
          {view === 'practica' && practiceScope.length > 0 && !fixed && (
            <div className="card row row--between row--wrap" style={{ gap: 12, padding: '12px 16px' }}>
              <span className="small">
                Practicando: {practiceScope.map((n) => `${n} ${nodeTitle(n)}`).join(' · ')}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <a className="btn btn--ghost btn--sm" href={`#/guia?n=${practiceScope[0]}`}>
                  Repasar la teoría
                </a>
                <button type="button" className="btn btn--sm" onClick={() => { setPracticeScope([]); navigate('/entrenamiento?v=practica'); }}>
                  Todo el temario
                </button>
              </span>
            </div>
          )}
          {view === 'practica' && <Practice key={scopeKey} initialScope={practiceScope} fixedExercise={fixed} onClearFixed={() => setFixed(null)} forceVariant={query.get('modo') === 'revision' ? 'revision' : undefined} />}
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
          {view === 'cuaderno' && <NotebookView />}
          {view === 'ruta' && (query.get('n') && COVERED_NODES.includes(query.get('n')!) ? <StudyPath key={query.get('n')} node={query.get('n')!} /> : <RoutePicker />)}
          {view === 'fuentes' && (
            <Sources
              onPick={(e) => {
                setFixed(e);
                go('practica');
              }}
            />
          )}
          <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
            <Icon name="arrow-left" size={16} /> Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
