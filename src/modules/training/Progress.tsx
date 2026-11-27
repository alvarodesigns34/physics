/** Vista de progreso: dominio por apartado y por competencia, y calidad de la evidencia. */

import { useStore } from '../../state/store';
import { BLOCKS, NODES, type ModuleId } from '../../learning/syllabus';
import { COVERED_NODES } from '../../learning/registry';
import { EVIDENCE_LABEL, masteryEstimate, masteryLevel } from '../../learning/mastery';
import { ERROR_LABEL, evidenceBreakdown, EVIDENCE_KIND_LABEL, SKILLS, type EvidenceKind } from '../../learning/evidence';
import { weakSkills, explainWeakSkill } from '../../learning/diagnosis';
import type { ErrorKind, SkillId } from '../../learning/types';
import { Feedback } from '../../ui/common';
import { navigate } from '../../app/hooks';
import { ActivityBars, IntervalPlot, MasteryMap } from './ProgressCharts';
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

/** Dominio estimado con su intervalo y la cantidad de evidencia: sin falsa precisión. */
export function MasteryBadge({ m }: { m: Parameters<typeof masteryEstimate>[0] }) {
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

const KIND_ORDER: EvidenceKind[] = ['demostrada', 'posible-azar', 'asistida', 'autoevaluada'];

/** Barra de calidad de la evidencia de un apartado: qué parte de los aciertos demuestra comprensión. */
function EvidenceStrip({ node, history }: { node: string; history: Parameters<typeof evidenceBreakdown>[0] }) {
  const b = evidenceBreakdown(history, node);
  if (!b.total) return null;
  const parts = [...KIND_ORDER.map((k) => ({ k, n: b.successes[k] })), { k: 'fallo' as const, n: b.misses }].filter((x) => x.n > 0);
  const label = `${parts.map((p) => `${p.n} ${p.k === 'fallo' ? 'sin superar' : EVIDENCE_KIND_LABEL[p.k]}`).join(', ')}. ${b.summary}`;
  return (
    <span className="ev-strip" role="img" aria-label={label} title={label}>
      {parts.map((p) => (
        <span key={p.k} className={`ev-strip__seg ev--${p.k}`} style={{ flexGrow: p.n }} />
      ))}
    </span>
  );
}

function EvidenceLegend() {
  return (
    <details className="ev-legend">
      <summary className="small">Qué significa cada color de la barra de evidencia</summary>
      <ul className="small muted">
        <li><span className="ev-dot ev--demostrada" /> <strong>Comprensión demostrada</strong>: respuesta abierta (número, expresión, orden) correcta al primer intento y sin pistas. Es la que más pesa en la estimación del dominio.</li>
        <li><span className="ev-dot ev--posible-azar" /> <strong>Pudo ser casual</strong>: acierto en una pregunta de opciones, donde adivinar tiene una probabilidad apreciable (1 entre el número de opciones). El modelo descuenta esa probabilidad.</li>
        <li><span className="ev-dot ev--asistida" /> <strong>Con ayuda</strong>: acierto tras pistas, varios intentos o pasos vistos resueltos. Cuenta, pero menos.</li>
        <li><span className="ev-dot ev--autoevaluada" /> <strong>Autoevaluación</strong>: preguntas de desarrollo que corriges tú con la rúbrica. Útil para practicar, débil como prueba.</li>
        <li><span className="ev-dot ev--fallo" /> <strong>Sin superar</strong>: intentos con menos del 75 % del apartado bien.</li>
      </ul>
    </details>
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

export function ProgressView() {
  const mastery = useStore((s) => s.mastery);
  const cards = useStore((s) => s.cards);
  const history = useStore((s) => s.history);
  const covered = new Set(COVERED_NODES);
  const levelColor = { 'sin-datos': 'var(--surface-sunken)', iniciado: 'rgb(242 169 59 / 0.18)', 'en-progreso': 'rgb(242 169 59 / 0.45)', dominado: 'var(--accent)' } as const;
  const dominated = NODES.filter((n) => masteryLevel(mastery[n.id]) === 'dominado').length;
  const practiced = NODES.filter((n) => mastery[n.id]?.attempts).length;
  return (
    <div className="stack-24">
      <div className="stat-row">
        <div className="stat">
          <span className="stat__label">Dominados</span>
          <span className="stat__value num">
            {dominated}
            <span className="stat__of">/ {NODES.length}</span>
          </span>
          <span className="stat__meta">≥ 80 % con evidencia suficiente</span>
        </div>
        <div className="stat">
          <span className="stat__label">Apartados practicados</span>
          <span className="stat__value num">
            {practiced}
            <span className="stat__of">/ {NODES.length}</span>
          </span>
          <span className="stat__meta">con al menos un intento</span>
        </div>
        <div className="stat">
          <span className="stat__label">Ejercicios</span>
          <span className="stat__value num">{history.length}</span>
          <span className="stat__meta">{history.length ? `${Math.round((history.filter((h) => h.correct).length / history.length) * 100)} % superados` : 'aún ninguno'}</span>
        </div>
      </div>
      {history.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__title">Todavía no hay datos que mostrar</span>
          <span className="small muted">Resuelve tu primer ejercicio y aquí aparecerá tu mapa del temario, con lo que dominas, lo que no y cuánta evidencia lo respalda.</span>
          <a className="btn btn--primary btn--sm" href="#/entrenamiento?v=practica">
            Empezar a practicar
          </a>
        </div>
      )}
      <MasteryMap mastery={mastery} onPick={(n) => navigate(`/entrenamiento?v=ruta&n=${n}`)} />
      <IntervalPlot mastery={mastery} />
      <ActivityBars history={history} />
      <div className="row row--wrap small muted" style={{ gap: 16 }}>
        {(['sin-datos', 'iniciado', 'en-progreso', 'dominado'] as const).map((l) => (
          <span key={l} className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: levelColor[l], border: '1px solid var(--hairline-strong)' }} />
            {l === 'sin-datos' ? 'Sin datos' : l === 'iniciado' ? 'Iniciado' : l === 'en-progreso' ? 'En progreso' : 'Dominado (≥ 80 %)'}
          </span>
        ))}
      </div>
      <SkillsPanel />
      <EvidenceLegend />
      <details className="detail-list">
        <summary className="h3">Detalle por apartado</summary>
      {BLOCKS.map((b) => (
        <section key={b.id} className="stack-8">
          <span className="h3">
            <span className="nid">{b.id}.</span> {b.title}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {NODES.filter((n) => n.block === b.id).map((n) => {
              const m = mastery[n.id];
              const lvl = masteryLevel(m);
              const has = covered.has(n.id);
              return (
                <div key={n.id} className="card" style={{ padding: '10px 12px', opacity: has ? 1 : 0.55, display: 'flex', gap: 10, alignItems: 'flex-start' }} title={n.sources}>
                  <span style={{ width: 10, height: 10, marginTop: 5, borderRadius: 3, flex: 'none', background: levelColor[lvl], border: '1px solid var(--hairline-strong)' }} aria-hidden="true" />
                  <span className="stack-8" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                    <span className="small">
                      <span className="nid">{n.id}</span> {n.title}
                    </span>
                    <span className="small faint">
                      {has ? (m?.attempts ? `${(() => { const e = masteryEstimate(m); return e.low === e.high ? `${e.mid} %` : `${e.low}–${e.high} %`; })()} · ${m.attempts} intento${m.attempts > 1 ? 's' : ''}${cards[n.id] ? ` · repaso ${new Date(cards[n.id]!.due).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}` : 'Sin practicar') : `Llega con ${n.modules.map((x) => MODULE_LABEL[x]).join(' / ')}`}
                    </span>
                    {has && <EvidenceStrip node={n.id} history={history} />}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      </details>
    </div>
  );
}
