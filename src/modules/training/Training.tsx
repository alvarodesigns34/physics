import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidingTabs } from '../../ui/SlidingTabs';
import { useStore } from '../../state/store';
import { BLOCKS, NODES, nodeTitle } from '../../learning/syllabus';
import { COVERED_NODES, GENERATORS } from '../../learning/registry';
import { selectNext, type Selection } from '../../learning/session';
import { dueCards, masteryEstimate } from '../../learning/mastery';
import { buildEvidence } from '../../learning/evidence';
import type { Exercise } from '../../learning/types';
import { ExercisePlayer, type ExerciseOutcome, type Variant } from '../../ui/ExercisePlayer';
import { exerciseFromId } from '../../learning/examSession';
import { NotebookView } from './Notebook';
import { StudyPath } from './StudyPath';
import { Icon } from '../../ui/Icon';
import { navigate, useRoute } from '../../app/hooks';
import { ScopePicker, scopeNodes } from './Scope';
import { ExamView } from './ExamView';
import { MasteryBadge, ProgressView } from './Progress';
import { Review } from './Review';
import { Sources } from './Sources';
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
                  <span className="nid">{n.id}</span> {n.title}
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
    return selectNext({ mastery: st.mastery, cards: st.cards, recent: recent.current, sessionRetry: retry.current, history: st.history, skills: st.skills, notebook: st.notebook }, scope, Date.now(), Math.floor(Math.random() * 1e9));
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
                <span className="why-label">{sel.reason === 'repaso' ? 'Repaso' : sel.reason === 'reintento' ? 'Reintento' : sel.reason === 'cuaderno' ? 'Cuaderno de errores' : sel.reason === 'competencia' ? 'Refuerzo de competencia' : sel.reason === 'prerrequisito' ? 'Prerrequisito' : 'Dominio'}</span> {sel.explanation}
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

const VIEW_TITLE: Record<View, string> = {
  practica: 'Practica lo que te falta.',
  ruta: 'Un concepto, de principio a fin.',
  repaso: 'Vuelve antes de olvidar.',
  examen: 'Simulacro con nota.',
  cuaderno: 'Tus errores, con nombre.',
  progreso: 'Lo que ya dominas.',
  fuentes: 'Los ejercicios de clase.',
};

const MODE_HELP: Record<View, string> = {
  practica: 'Ejercicios nuevos elegidos por tu nivel: cada uno te dice por qué te toca. Si fallas, tienes pistas graduadas y un enlace a la teoría.',
  ruta: 'Un concepto de principio a fin: comprender, observarlo en el laboratorio, practicar guiado, aplicar solo, nivel examen y consolidar según tus errores.',
  repaso: 'Lo que ya practicaste vuelve justo antes de que lo olvides (repetición espaciada). Cinco minutos al día bastan.',
  examen: 'Sin pistas ni correcciones hasta el final. Al terminar, verás la nota y exactamente qué estudiar para mejorarla.',
  cuaderno: 'Lo que has fallado, los errores que repites y las posibles lagunas, con la forma de superarlos.',
  progreso: 'Tu dominio por apartado y por competencia, con su margen de incertidumbre.',
  fuentes: 'Los ejercicios de tus hojas, con los mismos datos que en clase. Empieza por los básicos y sube a los de examen.',
};

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
  const openNotes = useStore((s) => s.notebook.filter((e) => !e.resolvedAt).length);
  const scopeKey = useMemo(() => practiceScope.join(','), [practiceScope]);
  return (
    <div className="workspace workspace--full" style={{ minHeight: 0 }}>
      <div ref={scroller} className="interactive" style={{ overflowY: 'auto', minHeight: 0, padding: '8px var(--gutter) 64px' }}>
        <div className="training-col" style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <nav className="training-nav training-head" aria-label="Centro de entrenamiento">
            <SlidingTabs
              label="Modo de entrenamiento"
              value={view}
              onChange={(v) => {
                setFixed(null);
                setPracticeScope([]);
                go(v);
              }}
              items={VIEWS.map((v) => ({ id: v.id, label: v.label, badge: v.id === 'repaso' ? dueCount : v.id === 'cuaderno' ? openNotes : undefined }))}
            />
          </nav>
          <header className="training-hero training-head" key={view}>
            <span className="eyebrow eyebrow--accent">Centro de entrenamiento</span>
            <h1 className="training-hero__title">{VIEW_TITLE[view]}</h1>
            <p className="training-hero__lead">{MODE_HELP[view]}</p>
          </header>
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
