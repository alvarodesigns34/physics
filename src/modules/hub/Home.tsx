/**
 * Inicio de ATOM 3.0: una página para ESTUDIAR, no un escaparate.
 * Responde a «¿qué hago ahora?» con lo que dice el motor adaptativo (recomendación explicable, repasos
 * vencidos, siguiente misión), y deja a un clic los laboratorios, el temario, el examen, las fórmulas,
 * los ejercicios de clase y los errores repetidos.
 */
import { useMemo } from 'react';
import { navigate } from '../../app/hooks';
import { useStore } from '../../state/store';
import { BLOCKS, NODES } from '../../learning/syllabus';
import { masteryEstimate, dueCards } from '../../learning/mastery';
import { recommend } from '../../learning/diagnosis';
import { SKILLS, ERROR_LABEL } from '../../learning/evidence';
import { MISSIONS, missionRoute } from '../../learning/campaign';
import { SOURCE_EXERCISES } from '../../learning/registry';
import type { ErrorKind, SkillId } from '../../learning/types';
import { Icon } from '../../ui/Icon';
import { LabGlyph, LAB_META } from './LabGlyph';
import { SpectrumSignature } from './SpectrumSignature';

const nodeTitle = (id: string) => NODES.find((n) => n.id === id)?.title ?? id;

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function Meter({ value, color, label }: { value: number | null; color: string; label: string }) {
  return (
    <span className="meter" role="img" aria-label={value === null ? `${label}: sin datos` : `${label}: ${value} %`}>
      <span style={{ width: `${value ?? 0}%`, background: color }} />
    </span>
  );
}

export function HomeOverlay() {
  const s = useStore();
  const alias = s.settings.alias;
  const now = Date.now();
  const due = useMemo(() => dueCards(s.cards, now), [s.cards, now]);
  const rec = useMemo(() => recommend(s.history, s.mastery, s.skills, null), [s.history, s.mastery, s.skills]);
  const nextMission = MISSIONS.find((m) => s.campaign[m.id]?.status !== 'completada');
  const missionsDone = MISSIONS.filter((m) => s.campaign[m.id]?.status === 'completada').length;
  const practiced = Object.keys(s.mastery).length;

  const blocks = BLOCKS.map((b) => {
    const nodes = NODES.filter((n) => n.block === b.id);
    const ests = nodes.map((n) => masteryEstimate(s.mastery[n.id])).filter((e) => e.evidence !== 'sin-datos');
    const pct = ests.length ? Math.round(ests.reduce((a, e) => a + e.mid, 0) / ests.length) : null;
    return { b, pct, seen: ests.length, total: nodes.length };
  });

  const skills = (Object.keys(SKILLS) as SkillId[]).map((k) => {
    const e = masteryEstimate(s.skills[k]);
    return { k, e };
  });

  const errorCounts = useMemo(() => {
    const c = new Map<ErrorKind, number>();
    for (const a of s.history.slice(-60)) for (const e of a.errors ?? []) if (e.kind !== 'formato' && e.kind !== 'incompleto') c.set(e.kind, (c.get(e.kind) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [s.history]);

  // Acción principal: recomendación del motor → repaso vencido → misión → primera práctica.
  const primary = rec
    ? { eyebrow: rec.reason === 'competencia' ? 'Refuerza una competencia' : 'Asegura un prerrequisito', title: rec.nodeIds.slice(0, 2).map(nodeTitle).join(' · '), body: rec.message, cta: 'Practicar ahora', go: () => navigate(`/entrenamiento?nodes=${rec.nodeIds.join(',')}`) }
    : due.length
      ? { eyebrow: 'Repaso espaciado', title: `${due.length} apartado${due.length === 1 ? '' : 's'} para repasar hoy`, body: due.slice(0, 3).map((c) => nodeTitle(c.nodeId)).join(' · '), cta: 'Empezar el repaso', go: () => navigate('/entrenamiento?v=repaso') }
      : practiced === 0
        ? { eyebrow: 'Primer paso', title: 'Empieza por la identidad del átomo', body: 'Z, A, isótopos e iones: la base de todo el tema. Lee la lección (5 min) y practica con ejercicios guiados.', cta: 'Abrir la lección', go: () => navigate('/guia?b=1') }
        : { eyebrow: 'Práctica adaptativa', title: 'Sigue donde lo dejaste', body: 'ATOM elige el siguiente ejercicio según tu dominio estimado y los repasos pendientes.', cta: 'Continuar', go: () => navigate('/entrenamiento') };

  return (
    <div className="home" id="inicio">
      <div className="home__inner">
        <header className="home__head home__head--split enter">
          <div className="stack-8">
            <p className="eyebrow">Estructura atómica · Sistema periódico · 1.º Bachillerato</p>
            <h1 className="home__title">
              {greeting()}
              {alias ? `, ${alias}` : ''}. <span className="home__title-soft">¿Qué estudiamos hoy?</span>
            </h1>
          </div>
          <SpectrumSignature />
        </header>

        <section className="home__primary enter" aria-label="Qué hacer ahora" style={{ animationDelay: '40ms' }}>
          <button type="button" className="hcard hcard--hero" onClick={primary.go}>
            <span className="eyebrow eyebrow--accent">{primary.eyebrow}</span>
            <span className="hcard__title">{primary.title}</span>
            <span className="hcard__body">{primary.body}</span>
            <span className="hcard__cta">
              {primary.cta} <Icon name="arrow-right" size={16} />
            </span>
          </button>
          <a className="hcard" href="#/entrenamiento?v=examen">
            <span className="hcard__icon" style={{ color: 'var(--b4)' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
                <path d="M9 8h6M9 12h6M9 16h3" />
              </svg>
            </span>
            <span className="hcard__title hcard__title--sm">Simulacro de examen</span>
            <span className="hcard__body">8 preguntas · 10 puntos · 50 min. Corrección por apartados e informe.</span>
          </a>
          <a className="hcard" href="#/entrenamiento?v=repaso">
            <span className="hcard__icon" style={{ color: 'var(--b5)' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                <path d="M20 4v4h-4" />
              </svg>
            </span>
            <span className="hcard__title hcard__title--sm">Repaso</span>
            <span className="hcard__body">{due.length ? `${due.length} pendiente${due.length === 1 ? '' : 's'} hoy, según tus fallos y aciertos.` : 'Nada vencido hoy. Los repasos aparecen cuando practicas.'}</span>
          </a>
        </section>

        <section className="home__section enter" aria-labelledby="h-labs" style={{ animationDelay: '80ms' }}>
          <div className="home__section-head">
            <h2 id="h-labs" className="home__h2">Laboratorios</h2>
            <span className="small faint">Simulaciones con cálculo real. Cada una declara qué es cálculo y qué es esquema.</span>
          </div>
          <ol className="lab-index">
            {LAB_META.map((l) => (
              <li key={l.route}>
                <a className="lab-row" href={`#${l.route}`} style={{ ['--lab' as string]: l.color }}>
                  <LabGlyph route={l.route} />
                  <span className="lab-row__text">
                    <span className="lab-row__name">{l.label}</span>
                    <span className="lab-row__blurb">{l.blurb}</span>
                  </span>
                  <span className="lab-row__topics">{l.topics}</span>
                  <Icon name="arrow-right" size={18} className="lab-row__go" />
                </a>
              </li>
            ))}
            <li>
              <a className="lab-row lab-row--campaign" href="#/campana" style={{ ['--lab' as string]: 'var(--accent)' }}>
                <svg className="lab-glyph" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <circle cx="28" cy="28" r="20" opacity=".3" />
                  <path d="M28 8a20 20 0 0 1 20 20" />
                  <circle cx="28" cy="28" r="3" fill="currentColor" stroke="none" />
                  <path d="M28 28 40 16" />
                </svg>
                <span className="lab-row__text">
                  <span className="lab-row__name">Campaña</span>
                  <span className="lab-row__blurb">{MISSIONS.length} misiones guiadas por los siete laboratorios, en el atrio 3D.</span>
                </span>
                <span className="lab-row__topics">
                  {missionsDone}/{MISSIONS.length} completadas
                </span>
                <Icon name="arrow-right" size={18} className="lab-row__go" />
              </a>
            </li>
          </ol>
        </section>

        <div className="home__cols">
          <section className="home__section panel-card enter" aria-labelledby="h-blocks" style={{ animationDelay: '120ms' }}>
            <div className="home__section-head">
              <h2 id="h-blocks" className="home__h2">Temario</h2>
              <a className="small link" href="#/guia">
                Guía completa
              </a>
            </div>
            <ol className="block-list">
              {blocks.map(({ b, pct, seen, total }) => (
                <li key={b.id}>
                  <a href={`#/guia?b=${b.id}`} className="block-row" style={{ ['--bc' as string]: `var(--b${b.id})` }}>
                    <span className="block-row__num">{b.id}</span>
                    <span className="block-row__title">{b.title}</span>
                    <Meter value={pct} color={`var(--b${b.id})`} label={b.title} />
                    <span className="block-row__pct num">{pct === null ? '—' : `${pct} %`}</span>
                    <span className="block-row__seen small faint num">
                      {seen}/{total}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="small faint" style={{ margin: 0 }}>
              Dominio estimado (orientativo, no es una nota): media de los apartados practicados. «{'x/y'}» = apartados con datos.
            </p>
          </section>

          <section className="home__section panel-card enter" aria-labelledby="h-skills" style={{ animationDelay: '160ms' }}>
            <div className="home__section-head">
              <h2 id="h-skills" className="home__h2">Competencias</h2>
              <a className="small link" href="#/entrenamiento?v=progreso">
                Diagnóstico
              </a>
            </div>
            <ul className="skill-list">
              {skills.map(({ k, e }) => (
                <li key={k} className="skill-row">
                  <span className="skill-row__name">{SKILLS[k].label}</span>
                  <Meter value={e.evidence === 'sin-datos' ? null : e.mid} color={e.evidence === 'sin-datos' ? 'var(--hairline-strong)' : e.mid >= 70 ? 'var(--ok)' : e.mid >= 45 ? 'var(--warn)' : 'var(--bad)'} label={SKILLS[k].label} />
                  <span className="small faint num skill-row__v">{e.evidence === 'sin-datos' ? 'sin datos' : `${e.low}–${e.high} %`}</span>
                </li>
              ))}
            </ul>
            <div className="stack-8">
              <span className="eyebrow">Errores que repites</span>
              {errorCounts.length ? (
                <div className="row row--wrap" style={{ gap: 6 }}>
                  {errorCounts.map(([k, n]) => (
                    <span key={k} className="err-tag">
                      {ERROR_LABEL[k]} <span className="num faint">×{n}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="small faint">Aún no hay errores registrados. Aparecerán aquí al practicar.</span>
              )}
            </div>
          </section>
        </div>

        <section className="home__section enter" aria-label="Accesos directos" style={{ animationDelay: '200ms' }}>
          <div className="quick-grid">
            <a className="quick" href="#/guia?v=formulario">
              <span className="quick__k">∑</span>
              <span>
                <strong>Formulario</strong>
                <span className="small muted">Todas las fórmulas con sus unidades</span>
              </span>
            </a>
            <a className="quick" href="#/guia?v=trucos">
              <span className="quick__k">✦</span>
              <span>
                <strong>Trucos de examen</strong>
                <span className="small muted">Reglas para memorizar y estrategia</span>
              </span>
            </a>
            <a className="quick" href="#/entrenamiento?v=fuentes">
              <span className="quick__k">§</span>
              <span>
                <strong>Ejercicios de clase</strong>
                <span className="small muted">{SOURCE_EXERCISES.length} de las hojas, ampliación y EBAU</span>
              </span>
            </a>
            {nextMission ? (
              <button
                type="button"
                className="quick"
                onClick={() => {
                  s.startMission(nextMission.id);
                  navigate(missionRoute(nextMission));
                }}
              >
                <span className="quick__k">◎</span>
                <span>
                  <strong>Misión {nextMission.code}</strong>
                  <span className="small muted">
                    {nextMission.title} · {missionsDone}/{MISSIONS.length} completadas
                  </span>
                </span>
              </button>
            ) : (
              <span className="quick">
                <span className="quick__k">◎</span>
                <span>
                  <strong>Campaña completada</strong>
                  <span className="small muted">{MISSIONS.length} misiones</span>
                </span>
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
