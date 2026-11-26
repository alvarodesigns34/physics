import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Species } from '../science/nucleus';
import { MISSION_BY_ID, MISSIONS, ROMAN, missionRoute, type LabId, type MissionStep } from '../learning/campaign';
import { useStore } from '../state/store';
import { ExercisePlayer, type ExerciseOutcome } from './ExercisePlayer';
import { announce, Stars, toast } from './common';
import { Icon } from './Icon';
import { navigate } from '../app/hooks';
import { sfx } from '../app/sound';

/** Estado del laboratorio que las misiones pueden evaluar. `stamp` distingue eventos repetidos. */
export interface LabSignal {
  periodic?: { prop: string; selected: number | null; compared: [number, number] | null; view: string };
  quantum?: { n: number; l: number; m: number; slice: boolean; bohr: boolean; tab: string; sigmaNm: number };
  architect?: { z: number; e: number; status: string; pauli: boolean; hund: boolean };
  history?: { tab: string; model: string; alphasR: number; alphasT: number; largeR: number; largeT: number; balanced: boolean; collapsed: boolean };
  masas?: { z: number; ions: number; measured: number | null };
  species?: Species;
  lambdaNm?: number;
  transition?: { from: number; to: number; stamp: number };
  cascade?: { n: number; stamp: number };
  spectro?: { symbol: string; stamp: number };
}

function stepSatisfied(step: MissionStep, sig: LabSignal): boolean {
  switch (step.kind) {
    case 'forja':
      return !!sig.species && step.check(sig.species);
    case 'onda':
      return sig.lambdaNm !== undefined && step.check(sig.lambdaNm);
    case 'transicion':
      return !!sig.transition && step.check(sig.transition.from, sig.transition.to);
    case 'cascada':
      return !!sig.cascade && sig.cascade.n === step.n;
    case 'espectro':
      return !!sig.spectro && sig.spectro.symbol === step.answerSymbol;
    case 'lab':
      return step.check(sig);
    default:
      return false;
  }
}

export function MissionPanel({ lab, signal }: { lab: LabId; signal: LabSignal }) {
  const activeId = useStore((s) => s.activeMission);
  const progress = useStore((s) => (activeId ? s.campaign[activeId] : undefined));
  const updateMission = useStore((s) => s.updateMission);
  const setActive = useStore((s) => s.setActiveMission);
  const startMission = useStore((s) => s.startMission);
  const recordExercise = useStore((s) => s.recordExercise);
  const mission = activeId ? MISSION_BY_ID.get(activeId) : undefined;
  const onThisLab = mission?.lab === lab;
  const stepIdx = progress?.step ?? 0;
  const step = mission?.steps[stepIdx];
  const exercise = useMemo(() => (step?.kind === 'ejercicio' ? step.build() : null), [step]);

  const finishMission = useCallback(
    (hintsUsed: number, firstTry: boolean) => {
      if (!mission) return;
      const stars = 1 + (hintsUsed === 0 ? 1 : 0) + (firstTry ? 1 : 0);
      const prevStars = useStore.getState().campaign[mission.id]?.stars ?? 0;
      updateMission(mission.id, { status: 'completada', step: mission.steps.length, stars: Math.max(stars, prevStars), hintsUsed, firstTry });
      sfx.complete();
      toast(`Misión ${mission.code} completada`);
      announce(`Misión ${mission.code}, ${mission.title}, completada.`);
    },
    [mission, updateMission],
  );

  const advance = useCallback(
    (extra?: { hints?: number; firstTry?: boolean }) => {
      if (!mission || !progress) return;
      const hintsUsed = progress.hintsUsed + (extra?.hints ?? 0);
      const firstTry = progress.firstTry && (extra?.firstTry ?? true);
      const next = stepIdx + 1;
      if (next >= mission.steps.length) finishMission(hintsUsed, firstTry);
      else {
        updateMission(mission.id, { step: next, collected: [], hintsUsed, firstTry });
        announce(`Objetivo cumplido. Siguiente: ${mission.steps[next]!.text}`);
        sfx.success();
      }
    },
    [mission, progress, stepIdx, updateMission, finishMission],
  );

  // Un objetivo solo se cumple con una acción posterior a su activación (evita completar por un
  // estado previo del laboratorio).
  const signalKey = JSON.stringify([signal.species, signal.lambdaNm, signal.transition?.stamp, signal.cascade?.stamp, signal.spectro?.stamp, signal.periodic, signal.quantum, signal.architect, signal.history, signal.masas]);
  const armed = useRef<{ key: string; at: string }>({ key: '', at: '' });
  const armKey = `${activeId}:${stepIdx}:${progress?.status}`;
  if (armed.current.at !== armKey) armed.current = { key: signalKey, at: armKey };

  // Evalúa los objetivos experimentales con cada cambio de estado del laboratorio.
  useEffect(() => {
    if (!mission || !onThisLab || !progress || progress.status === 'completada' || !step) return;
    if (signalKey === armed.current.key) return;
    if (step.kind === 'forja-coleccion') {
      if (!signal.species || !step.check(signal.species)) return;
      const key = step.key(signal.species);
      if (progress.collected.includes(key)) return;
      const collected = [...progress.collected, key];
      if (collected.length >= step.count) advance();
      else {
        updateMission(mission.id, { collected });
        announce(`Conseguido ${collected.length} de ${step.count}.`);
        sfx.success();
      }
      return;
    }
    if (step.kind !== 'ejercicio' && stepSatisfied(step, signal)) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalKey, stepIdx, activeId]);

  const lastOutcome = useRef<ExerciseOutcome | null>(null);
  const onExercise = useCallback(
    (o: ExerciseOutcome) => {
      if (!exercise) return;
      lastOutcome.current = o;
      recordExercise(exercise, o, 'campana');
    },
    [exercise, recordExercise],
  );

  if (!mission || !onThisLab || !progress) return null;
  const done = progress.status === 'completada';
  const nextMission = MISSIONS[MISSIONS.findIndex((m) => m.id === mission.id) + 1];

  return (
    <section className="section" aria-label={`Misión ${mission.code}`}>
      <div className="row row--between">
        <span className="eyebrow eyebrow--accent">
          Misión {mission.code} · Capítulo {ROMAN[mission.chapter]}
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActive(null)} aria-label="Cerrar misión">
          <Icon name="x" size={14} /> Salir
        </button>
      </div>
      <h2 className="h2" style={{ fontSize: '1.875rem' }}>
        {mission.title}
      </h2>
      <p className="small muted">{mission.brief}</p>
      <ol className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {mission.steps.map((s, i) => {
          const state = done || i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'todo';
          return (
            <li key={i} className="row" style={{ alignItems: 'flex-start', gap: 10, opacity: state === 'todo' ? 0.5 : 1 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 20,
                  height: 20,
                  flex: 'none',
                  borderRadius: 999,
                  marginTop: 1,
                  display: 'grid',
                  placeItems: 'center',
                  border: `1.5px solid ${state === 'done' ? 'var(--ok)' : state === 'current' ? 'var(--accent)' : 'var(--hairline-strong)'}`,
                  color: 'var(--ok)',
                }}
              >
                {state === 'done' && <Icon name="check" size={12} />}
              </span>
              <span className="small" style={{ color: state === 'current' ? 'var(--ink)' : 'var(--ink-muted)' }}>
                {s.text}
                {state === 'current' && s.kind === 'forja-coleccion' && (
                  <span className="mono" style={{ color: 'var(--accent)', marginLeft: 8 }}>
                    {progress.collected.length}/{s.count}
                  </span>
                )}
                <span className="sr-only">{state === 'done' ? ' (completado)' : state === 'current' ? ' (objetivo actual)' : ''}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {!done && exercise && (
        <div className="card" style={{ background: 'var(--surface-sunken)' }}>
          <ExercisePlayer key={exercise.id} exercise={exercise} mode="campana" onFinish={onExercise} onNext={() => advance({ hints: lastOutcome.current?.hintsUsed ?? 0, firstTry: lastOutcome.current?.firstTry ?? false })} nextLabel="Continuar" />
        </div>
      )}
      {done && (
        <div className="card stack-12" style={{ borderColor: 'var(--accent-line)' }}>
          <div className="row row--between">
            <span className="h3">Misión completada</span>
            <Stars n={progress.stars} />
          </div>
          <p className="small muted">Marcas: completar · sin pistas · todos los pasos al primer intento.</p>
          <div className="row row--wrap">
            {nextMission && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  startMission(nextMission.id);
                  if (nextMission.lab !== lab || nextMission.tab !== mission.tab) navigate(missionRoute(nextMission));
                }}
              >
                Siguiente: {nextMission.code} {nextMission.title} <Icon name="arrow-right" size={16} />
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setActive(null)}>
              Experimentar libremente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
