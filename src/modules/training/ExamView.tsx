/** Vista de examen: configuración del simulacro, sesión profesional e informe. */
import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { GENERATOR_BY_ID } from '../../learning/registry';
import { buildExamDetailed, buildProfileExam, MOCK_PROFILES, weakProfile, type MockProfile } from '../../learning/session';
import type { Exercise } from '../../learning/types';
import { ScopePicker, scopeNodes } from './Scope';
import { ExamRunner, ExamReportView, loadSavedSession, saveSession, useFinishExam } from './ExamSessionView';
import { newSession, type ExamReport, type ExamSession } from '../../learning/examSession';
import { Feedback } from '../../ui/common';
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

function parseSeed(t: string): number | null {
  const n = Number(t);
  return t && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function ExamView() {
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
