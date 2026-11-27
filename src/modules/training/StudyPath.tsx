/**
 * Ruta de estudio integrada por concepto (ATOM 3.0, §11):
 * comprender → observar → practicar guiado → aplicar solo → nivel examen → consolidar.
 * Une guía, laboratorio y entrenamiento en una sola experiencia; el paso final se adapta a los errores
 * cometidos en la propia ruta (p. ej., si fallaste unidades, propone un ejercicio de conversiones).
 */
import { useMemo, useState } from 'react';
import { NODES } from '../../learning/syllabus';
import { LESSONS } from '../../learning/guide';
import { generatorsForNode } from '../../learning/registry';
import { REASONING_GENERATORS } from '../../learning/generators/reasoning';
import { SKILLS, ERROR_LABEL } from '../../learning/evidence';
import type { Difficulty, Exercise, ExerciseGenerator, SkillId } from '../../learning/types';
import { useStore } from '../../state/store';
import { ExercisePlayer, type ExerciseOutcome } from '../../ui/ExercisePlayer';
import { Section } from '../guide/Guide';
import { Icon } from '../../ui/Icon';

type StepId = 'comprender' | 'observar' | 'guiado' | 'aplicar' | 'examen' | 'consolidar';
const STEPS: { id: StepId; label: string; help: string }[] = [
  { id: 'comprender', label: 'Comprender', help: 'Lee la explicación y toca los gráficos interactivos.' },
  { id: 'observar', label: 'Observar', help: 'Míralo en el laboratorio: cambia un parámetro y predice qué pasará.' },
  { id: 'guiado', label: 'Practicar guiado', help: 'Un ejercicio paso a paso, con la primera pista visible.' },
  { id: 'aplicar', label: 'Aplicar', help: 'Otro ejercicio, esta vez sin ayudas a la vista.' },
  { id: 'examen', label: 'Nivel examen', help: 'Un problema exigente o inverso del mismo apartado.' },
  { id: 'consolidar', label: 'Consolidar', help: 'Qué te ha costado y cómo reforzarlo.' },
];

/** Práctica de refuerzo por competencia fallada (apartado → ejercicio corto de esa destreza). */
const SKILL_DRILL: Partial<Record<SkillId, string>> = { unidades: '3.9', cifras: '3.9', formula: '3.6', calculo: '3.2', notacion: '6.3', razonamiento: '7.13', concepto: '5.3' };

function pickGen(node: string, want: Difficulty, prefer?: (g: ExerciseGenerator) => boolean): ExerciseGenerator | null {
  const gens = generatorsForNode(node).filter((g) => g.id !== 'desarrollo');
  const pool = (prefer ? gens.filter(prefer) : []).filter((g) => g.difficulties.includes(want));
  return pool[0] ?? gens.find((g) => g.difficulties.includes(want)) ?? gens[0] ?? null;
}

function makeExercise(g: ExerciseGenerator | null, d: Difficulty): Exercise | null {
  if (!g) return null;
  const dd = g.difficulties.includes(d) ? d : g.difficulties[g.difficulties.length - 1]!;
  return g.create(Math.floor(Math.random() * 1e6), dd);
}

export function StudyPath({ node }: { node: string }) {
  const nd = NODES.find((n) => n.id === node);
  const lesson = LESSONS.find((l) => l.block === nd?.block);
  const sections = lesson?.sections.filter((s) => s.node === node) ?? [];
  const recordExercise = useStore((s) => s.recordExercise);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<{ kind: string; skill?: SkillId }[]>([]);
  const [done, setDone] = useState<Set<StepId>>(new Set());
  const reasoningIds = useMemo(() => new Set(REASONING_GENERATORS.map((g) => g.id)), []);
  const exercises = useMemo(
    () => ({
      guiado: makeExercise(pickGen(node, 1), 1),
      aplicar: makeExercise(pickGen(node, 2), 2),
      examen: makeExercise(pickGen(node, 3, (g) => reasoningIds.has(g.id) || g.id.startsWith('examen-')), 3),
    }),
    [node, reasoningIds],
  );
  if (!nd || !lesson) return <p className="small muted">Apartado desconocido.</p>;
  const s = STEPS[step]!;
  const finish = (id: StepId) => (o: ExerciseOutcome) => {
    const ex = exercises[id as 'guiado' | 'aplicar' | 'examen'];
    if (ex) recordExercise(ex, o, 'practica');
    setErrors((e) => [...e, ...o.parts.flatMap((p) => p.errors)]);
    setDone((d) => new Set(d).add(id));
  };
  const skillCounts = new Map<SkillId, number>();
  for (const e of errors) if (e.skill) skillCounts.set(e.skill, (skillCounts.get(e.skill) ?? 0) + 1);
  const weakest = [...skillCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const drillNode = weakest ? SKILL_DRILL[weakest[0]] : undefined;
  return (
    <div className="stack-16">
      <header className="stack-8">
        <span className="eyebrow eyebrow--accent">Ruta de estudio · {nd.id}</span>
        <h2 className="h2" style={{ fontSize: '1.9rem' }}>
          {nd.title}
        </h2>
      </header>
      <ol className="path-steps" aria-label="Pasos de la ruta">
        {STEPS.map((st, i) => (
          <li key={st.id}>
            <button type="button" aria-current={i === step ? 'step' : undefined} className={done.has(st.id) ? 'done' : undefined} onClick={() => setStep(i)}>
              <span className="path-steps__n">{done.has(st.id) ? '✓' : i + 1}</span>
              <span>{st.label}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="small muted" style={{ margin: 0 }}>
        {s.help}
      </p>
      <div className="card" style={{ padding: 24 }} key={s.id}>
        {s.id === 'comprender' && (sections.length ? sections.map((sec) => <Section key={sec.id ?? sec.node} s={sec} labRoute={lesson.lab.route} />) : <p className="small">Este apartado se explica dentro de la lección «{lesson.title}». <a className="link" href={`#/guia?b=${lesson.block}`}>Abrir la lección</a></p>)}
        {s.id === 'observar' && (
          <div className="stack-12">
            <p style={{ margin: 0 }}>
              Abre <strong>{lesson.lab.label}</strong>. Antes de tocar nada, <strong>predice</strong>: ¿qué cambiará al modificar un parámetro relacionado con «{nd.title.toLowerCase()}»? Después compruébalo.
            </p>
            <a className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }} href={`#${lesson.lab.route}`} onClick={() => setDone((d) => new Set(d).add('observar'))}>
              Abrir {lesson.lab.label} <Icon name="arrow-right" size={16} />
            </a>
            <p className="small faint" style={{ margin: 0 }}>
              Vuelve a esta ruta con el botón Atrás del navegador o desde la guía.
            </p>
          </div>
        )}
        {(s.id === 'guiado' || s.id === 'aplicar' || s.id === 'examen') &&
          (exercises[s.id] ? (
            <ExercisePlayer exercise={exercises[s.id]!} mode="practica" variant={s.id === 'guiado' ? 'guiado' : s.id === 'examen' ? 'desafio' : 'autonomo'} onFinish={finish(s.id)} onNext={() => setStep((x) => Math.min(STEPS.length - 1, x + 1))} nextLabel="Siguiente paso de la ruta" />
          ) : (
            <p className="small muted">No hay ejercicios generados para este apartado.</p>
          ))}
        {s.id === 'consolidar' && (
          <div className="stack-12">
            {errors.length === 0 ? (
              <p style={{ margin: 0 }}>{done.size >= 3 ? 'Sin errores en la ruta. Programa un repaso dentro de unos días para fijarlo.' : 'Completa los ejercicios de la ruta para ver aquí tu diagnóstico.'}</p>
            ) : (
              <>
                <p style={{ margin: 0 }}>
                  En esta ruta has cometido {errors.length} error{errors.length === 1 ? '' : 'es'}:{' '}
                  {[...new Set(errors.map((e) => ERROR_LABEL[e.kind as keyof typeof ERROR_LABEL] ?? e.kind))].join(', ')}.
                </p>
                {weakest && (
                  <p style={{ margin: 0 }}>
                    La competencia que más te ha costado parece ser <strong>{SKILLS[weakest[0]].label.toLowerCase()}</strong> ({weakest[1]} error{weakest[1] === 1 ? '' : 'es'}). Es una posibilidad, no un veredicto: con pocos ejercicios la evidencia es escasa.
                  </p>
                )}
              </>
            )}
            <div className="row row--wrap" style={{ gap: 8 }}>
              {drillNode && drillNode !== node && (
                <a className="btn btn--primary btn--sm" href={`#/entrenamiento?nodes=${drillNode}`}>
                  Reforzar {SKILLS[weakest![0]].label.toLowerCase()}
                </a>
              )}
              <a className="btn btn--sm" href={`#/entrenamiento?nodes=${node}`}>
                Más práctica de este apartado
              </a>
              <a className="btn btn--ghost btn--sm" href="#/entrenamiento?v=repaso">
                Ir al repaso espaciado
              </a>
            </div>
          </div>
        )}
      </div>
      <div className="row row--between">
        <button type="button" className="btn btn--ghost btn--sm" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>
          <Icon name="arrow-left" size={16} /> Anterior
        </button>
        <button type="button" className="btn btn--sm" disabled={step === STEPS.length - 1} onClick={() => setStep((x) => x + 1)}>
          Siguiente <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </div>
  );
}
