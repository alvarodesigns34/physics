/**
 * ATOM 6.0 · Preparar examen.
 *
 * Responde a «¿qué tengo que saber resolver antes del examen?» por bloques, con el motivo de cada familia,
 * su dificultad y tiempo, los errores habituales y tu preparación según TU evidencia (sin porcentajes).
 * La lógica vive en learning/examPrep.ts (probada); aquí solo se presenta.
 */
import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { BLOCKS } from '../../learning/syllabus';
import {
  essentials,
  itinerary,
  prepItems,
  prepLinks,
  READINESS_LABEL,
  REP_LABEL,
  SCOPE_LABEL,
  SESSION_LENGTHS,
  TIER_LABEL,
  type ItineraryStep,
  type PrepItem,
  type Tier,
} from '../../learning/examPrep';
import { navigate, useRoute } from '../../app/hooks';
import { Icon } from '../../ui/Icon';

const MODE_LABEL: Record<ItineraryStep['mode'], string> = { guiado: 'Guiado', autonomo: 'Sin ayuda', desafio: 'Exigente' };
const TIERS: Tier[] = ['esencial', 'examen', 'exigente'];

function readStored(): number {
  try {
    const v = Number(localStorage.getItem('atom:prep-min'));
    return (SESSION_LENGTHS as readonly number[]).includes(v) ? v : 30;
  } catch {
    return 30;
  }
}

function Dots({ n, label }: { n: number; label: string }) {
  return (
    <span className="prep-dots" role="img" aria-label={label} title={label}>
      {[1, 2, 3].map((i) => (
        <span key={i} data-on={i <= n} />
      ))}
    </span>
  );
}

function ReadinessPill({ it }: { it: PrepItem }) {
  return (
    <span className={`prep-ready prep-ready--${it.readiness.level}`} title={it.readiness.text}>
      {READINESS_LABEL[it.readiness.level]}
    </span>
  );
}

function stepHref(s: ItineraryStep) {
  return `#/entrenamiento?gen=${s.family.generatorId}&d=${s.difficulty}&modo=${s.mode}`;
}

function Session({ items }: { items: PrepItem[] }) {
  const [minutes, setMinutes] = useState(readStored);
  const steps = useMemo(() => itinerary(items, minutes), [items, minutes]);
  const total = steps.reduce((a, s) => a + s.minutes, 0);
  const choose = (m: number) => {
    setMinutes(m);
    try {
      localStorage.setItem('atom:prep-min', String(m));
    } catch {
      /* sin almacenamiento: solo en esta sesión */
    }
  };
  return (
    <section className="prep-section" aria-labelledby="prep-session">
      <div className="prep-section__head">
        <div className="stack-4">
          <h2 id="prep-session" className="prep-h2">
            Sesión de hoy
          </h2>
          <p className="small muted" style={{ margin: 0 }}>
            Orientativa: combina lo esencial, lo presente en tus fuentes y lo que tu evidencia dice que falta. Varía de bloque antes de repetir.
          </p>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Duración de la sesión">
          {SESSION_LENGTHS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={minutes === m} onClick={() => choose(m)}>
              {m} min
            </button>
          ))}
        </div>
      </div>
      <ol className="prep-steps">
        {steps.map((s, i) => (
          <li key={s.family.generatorId}>
            <a className="prep-step" href={stepHref(s)} style={{ ['--bc' as string]: `var(--b${s.family.block})` }}>
              <span className="prep-step__n num">{i + 1}</span>
              <span className="prep-step__body">
                <span className="prep-step__title">{s.family.title}</span>
                <span className="small muted">
                  {BLOCKS[s.family.block - 1]!.short} · {s.reason}
                </span>
              </span>
              <span className={`prep-mode prep-mode--${s.mode}`}>{MODE_LABEL[s.mode]}</span>
              <span className="prep-step__min num small">{s.minutes} min</span>
              <Icon name="arrow-right" size={16} className="prep-step__go" />
            </a>
          </li>
        ))}
      </ol>
      <p className="small faint" style={{ margin: 0 }}>
        {steps.length} ejercicios · unos {total} min. Los tiempos son estimaciones; un paso guiado incluye leer la resolución.
      </p>
    </section>
  );
}

function Essentials({ items }: { items: PrepItem[] }) {
  const list = useMemo(() => essentials(items), [items]);
  const evidence = items.some((i) => i.readiness.level !== 'sin-evidencia');
  return (
    <section className="prep-section" aria-labelledby="prep-ess">
      <div className="prep-section__head">
        <div className="stack-4">
          <h2 id="prep-ess" className="prep-h2">
            Imprescindibles antes del examen
          </h2>
          <p className="small muted" style={{ margin: 0 }}>
            {evidence ? 'Lo esencial y lo más presente en tus fuentes, priorizando lo que aún no has demostrado sin ayuda.' : 'Aún no hay evidencia tuya: la selección se basa en la importancia curricular y en tus fuentes.'}
          </p>
        </div>
      </div>
      <ul className="prep-ess">
        {list.map((it) => (
          <li key={it.family.generatorId}>
            <a className="prep-ess__row" href={`#${prepLinks(it.family).practice}`} style={{ ['--bc' as string]: `var(--b${it.family.block})` }}>
              <span className="prep-ess__block num">{it.family.block}</span>
              <span className="prep-ess__title">{it.family.title}</span>
              <ReadinessPill it={it} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FamilyCard({ it }: { it: PrepItem }) {
  const f = it.family;
  const l = prepLinks(f);
  const rep = it.rep;
  const repDetail = rep.questions ? (Object.entries(rep.byKind) as [string, number][]).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(' · ') : '';
  return (
    <article className="prep-card" aria-labelledby={`pf-${f.generatorId}`}>
      <header className="prep-card__head">
        <h4 id={`pf-${f.generatorId}`} className="prep-card__title">
          {f.title}
        </h4>
        <ReadinessPill it={it} />
      </header>
      <p className="prep-card__comp">{f.competence}</p>
      <dl className="prep-meta">
        <div>
          <dt>Dificultad</dt>
          <dd>
            <Dots n={f.hard ?? f.difficulty} label={`Dificultad ${f.difficulty}${f.hard ? ` (hasta ${f.hard})` : ''} de 3`} />
          </dd>
        </div>
        <div>
          <dt>Tiempo</dt>
          <dd className="num">≈ {f.minutes} min</dd>
        </div>
        <div>
          <dt>Alcance</dt>
          <dd>{SCOPE_LABEL[f.scope]}</dd>
        </div>
        <div>
          <dt>Fuentes</dt>
          <dd title={rep.keys.join(', ')}>
            {REP_LABEL[rep.level]}
            {rep.questions ? <span className="faint num"> · {rep.questions} preg. ({repDetail})</span> : null}
          </dd>
        </div>
      </dl>
      <p className="prep-card__why">
        <span className="eyebrow">Por qué</span> {f.why}
      </p>
      <details className="prep-pitfalls">
        <summary>Errores habituales</summary>
        <ul>
          {f.pitfalls.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </details>
      <p className="small muted prep-card__ev">{it.readiness.text}</p>
      <div className="prep-actions">
        <a className="btn btn--sm btn--primary" href={`#${l.guided}`}>
          Ejemplo guiado
        </a>
        <a className="btn btn--sm" href={`#${l.practice}`}>
          Sin ayuda
        </a>
        {l.hard && (
          <a className="btn btn--sm" href={`#${l.hard}`}>
            Más exigente
          </a>
        )}
        <a className="btn btn--ghost btn--sm" href={`#${l.example}`}>
          Ver resolución
        </a>
        <a className="btn btn--ghost btn--sm" href={`#${l.theory}`}>
          Teoría
        </a>
        {f.lab && (
          <a className="btn btn--ghost btn--sm" href={`#${f.lab.route}`}>
            {f.lab.label}
          </a>
        )}
        {it.readiness.openErrors > 0 && (
          <a className="btn btn--ghost btn--sm" href={`#${l.errors}`}>
            Mis errores ({it.readiness.openErrors})
          </a>
        )}
      </div>
    </article>
  );
}

function BlockView({ items, block }: { items: PrepItem[]; block: number }) {
  const own = items.filter((i) => i.family.block === block);
  const b = BLOCKS[block - 1]!;
  return (
    <section className="prep-block" aria-labelledby="prep-block-title" style={{ ['--bc' as string]: `var(--b${block})` }}>
      <h3 id="prep-block-title" className="prep-block__title">
        <span className="num">{block}.</span> {b.title}
      </h3>
      {TIERS.map((t) => {
        const list = own.filter((i) => i.family.tier === t);
        if (!list.length) return null;
        return (
          <div key={t} className="stack-12">
            <h4 className="prep-tier">
              {TIER_LABEL[t]} <span className="faint num">· {list.length}</span>
            </h4>
            <div className="prep-grid">
              {list.map((it) => (
                <FamilyCard key={it.family.generatorId} it={it} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function PrepOverlay() {
  const history = useStore((s) => s.history);
  const notebook = useStore((s) => s.notebook);
  const { query } = useRoute();
  const qb = Number(query.get('b'));
  const block = qb >= 1 && qb <= 7 ? qb : 1;
  const items = useMemo(() => prepItems(history, notebook), [history, notebook]);
  const counts = BLOCKS.map((b) => items.filter((i) => i.family.block === b.id));
  return (
    <div className="workspace workspace--full" style={{ minHeight: 0 }}>
      <div className="interactive prep-scroll">
        <div className="prep-col">
          <header className="training-hero">
            <span className="eyebrow eyebrow--accent">Preparar examen</span>
            <h1 className="training-hero__title">Lo que tienes que saber resolver.</h1>
            <p className="training-hero__lead">
              {items.length} familias de problemas en los siete bloques, cada una con su motivo, sus errores habituales y tu estado según lo que has demostrado. ATOM no sabe qué preguntará tu profesor: distingue lo esencial, lo que más aparece en tus fuentes y lo que más te cuesta.
            </p>
          </header>

          <div className="prep-top">
            <Session items={items} />
            <Essentials items={items} />
          </div>

          <nav className="prep-blocks" aria-label="Bloques del temario">
            {BLOCKS.map((b, i) => (
              <button key={b.id} type="button" className="prep-blocks__btn" aria-pressed={block === b.id} style={{ ['--bc' as string]: `var(--b${b.id})` }} onClick={() => navigate(`/preparar?b=${b.id}`)}>
                <span className="num">{b.id}</span>
                <span className="prep-blocks__name">{b.short}</span>
                <span className="prep-blocks__count num faint">{counts[i]!.length}</span>
              </button>
            ))}
          </nav>

          <BlockView items={items} block={block} />

          <details className="prep-method small">
            <summary>Cómo se decide la prioridad</summary>
            <ul>
              <li>
                <strong>Importancia curricular</strong>: esencial (lo que todo lo demás presupone), tipo examen o exigente (multiconcepto o inverso). Ampliación = la teoría del curso solo lo trata cualitativamente.
              </li>
              <li>
                <strong>Presencia en tus fuentes</strong>: preguntas distintas de la teoría, la hoja de ampliación, la hoja del tema y las cuestiones EBAU de La Rioja que tocan sus apartados centrales. Los apartados de una misma pregunta cuentan una vez. No es una probabilidad de que caiga.
              </li>
              <li>
                <strong>Tu preparación</strong>: «Sólida» exige acertar sin ayuda al menos dos enunciados distintos (repetir el mismo puede ser memoria). Con menos de dos intentos sin ayuda se indica «Poca evidencia».
              </li>
              <li>La dificultad y el tiempo son propiedades del problema, no de su frecuencia.</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
