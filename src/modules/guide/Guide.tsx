import { useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS, type Formula, type GuideSection, type Lesson, type WorkedExample } from '../../learning/guide';
import { COVERED_NODES } from '../../learning/registry';
import { NODES } from '../../learning/syllabus';
import { masteryPercent } from '../../learning/mastery';
import { useStore } from '../../state/store';
import { navigate, useRoute } from '../../app/hooks';
import { Rich } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { GuideWidget } from './widgets';

const covered = new Set(COVERED_NODES);

function practiceUrl(nodes: string[]) {
  return `/entrenamiento?v=practica&nodes=${nodes.filter((n) => covered.has(n)).join(',')}`;
}

function FormulaCard({ f }: { f: Formula }) {
  return (
    <div className="formula">
      <div className="formula__expr">{f.expr}</div>
      <table className="formula__vars">
        <tbody>
          {f.vars.map(([sym, meaning, unit]) => (
            <tr key={sym + meaning}>
              <th scope="row" className="mono">
                {sym}
              </th>
              <td>{meaning}</td>
              <td className="mono faint">{unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {f.note && <p className="small muted" style={{ margin: 0 }}>{f.note}</p>}
    </div>
  );
}

function Worked({ w }: { w: WorkedExample }) {
  const [shown, setShown] = useState(0);
  const all = shown >= w.steps.length;
  return (
    <article className="worked">
      <header className="stack-8">
        <span className="eyebrow">
          Ejercicio resuelto{w.source ? ` · ${w.source}` : ''}
        </span>
        <h3 className="h3">{w.title}</h3>
        <p className="worked__statement">{w.statement}</p>
      </header>
      <p className="small muted" style={{ margin: 0 }}>
        Intenta cada paso en tu cuaderno antes de mostrarlo.
      </p>
      <ol className="worked__steps">
        {w.steps.map((s, i) =>
          i < shown ? (
            <li key={i} className="worked__step enter">
              <span className="worked__label">{s.label}</span>
              <span className="worked__work mono">{s.work}</span>
              <span className="worked__why">{s.why}</span>
            </li>
          ) : (
            <li key={i} className="worked__step worked__step--hidden" aria-hidden={i > shown}>
              <span className="worked__label">{s.label}</span>
              <span className="worked__blur" />
            </li>
          ),
        )}
      </ol>
      <div className="row row--wrap">
        {!all ? (
          <>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setShown((x) => x + 1)}>
              Mostrar paso {shown + 1} de {w.steps.length}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShown(w.steps.length)}>
              Ver la solución completa
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShown(0)}>
            <Icon name="reset" size={14} /> Ocultar y repetir
          </button>
        )}
      </div>
    </article>
  );
}

function Section({ s, labRoute }: { s: GuideSection; labRoute: string }) {
  const node = NODES.find((n) => n.id === s.node);
  const mastery = useStore((st) => st.mastery[s.node]);
  return (
    <section id={`sec-${s.node}`} className="guide-sec" aria-labelledby={`h-${s.node}`}>
      <header className="guide-sec__head">
        <span className="mono guide-sec__num">{s.node}</span>
        <h2 id={`h-${s.node}`} className="h2 guide-sec__title">
          {s.title}
        </h2>
        {mastery?.attempts ? (
          <span className="small muted mono" title="Tu dominio de este apartado">
            {masteryPercent(mastery)} %
          </span>
        ) : null}
      </header>
      <div className="guide-sec__body">
        {s.body.map((p, i) => (
          <p key={i}>
            <Rich text={p} />
          </p>
        ))}
      </div>
      {s.formulas && (
        <div className="formula-grid">
          {s.formulas.map((f) => (
            <FormulaCard key={f.expr} f={f} />
          ))}
        </div>
      )}
      {s.widget && <GuideWidget id={s.widget} />}
      {(s.mistakes || s.tip) && (
        <div className="guide-callouts">
          {s.mistakes && (
            <div className="callout callout--bad">
              <span className="callout__title">Errores típicos de examen</span>
              <ul>
                {s.mistakes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {s.tip && (
            <div className="callout callout--tip">
              <span className="callout__title">En el examen</span>
              <p>{s.tip}</p>
            </div>
          )}
        </div>
      )}
      <div className="row row--wrap" style={{ gap: 8 }}>
        {covered.has(s.node) && (
          <a className="btn btn--sm" href={`#${practiceUrl([s.node])}`}>
            <Icon name="target" size={14} /> Practicar este apartado
          </a>
        )}
        {node && node.modules.length > 0 && node.modules[0] !== 'entrenamiento' && (
          <a className="btn btn--ghost btn--sm" href={`#${labRoute}`}>
            <Icon name="flask" size={14} /> Verlo en el laboratorio
          </a>
        )}
      </div>
    </section>
  );
}

function blockMastery(lesson: Lesson, mastery: ReturnType<typeof useStore.getState>['mastery']) {
  const nodes = NODES.filter((n) => n.block === lesson.block);
  const tried = nodes.filter((n) => mastery[n.id]?.attempts);
  if (!tried.length) return null;
  return Math.round(nodes.reduce((a, n) => a + masteryPercent(mastery[n.id]), 0) / nodes.length);
}

function FormulaSheet() {
  return (
    <div className="stack-16">
      <p className="lead" style={{ margin: 0 }}>
        Todas las fórmulas del tema en una página, con el significado y la unidad de cada símbolo. Imprímela o repásala justo antes del examen.
      </p>
      {LESSONS.filter((l) => l.sections.some((s) => s.formulas)).map((l) => (
        <section key={l.block} className="stack-12">
          <span className="h3">
            <span className="mono faint">{l.block}.</span> {l.title}
          </span>
          <div className="formula-grid">
            {l.sections.flatMap((s) => (s.formulas ?? []).map((f) => <FormulaCard key={s.node + f.expr} f={f} />))}
          </div>
        </section>
      ))}
      <section className="stack-12">
        <span className="h3">Constantes y conversiones</span>
        <div className="formula-grid">
          <FormulaCard f={{ expr: 'c = 3·10⁸ m/s', vars: [['c', 'velocidad de la luz en el vacío', 'm/s']] }} />
          <FormulaCard f={{ expr: 'h = 6,626·10⁻³⁴ J·s', vars: [['h', 'constante de Planck', 'J·s']] }} />
          <FormulaCard f={{ expr: 'R = 1,097·10⁷ m⁻¹', vars: [['R', 'constante de Rydberg', 'm⁻¹']], note: '= 109 740 cm⁻¹. Si te la dan en cm⁻¹, multiplica por 100.' }} />
          <FormulaCard f={{ expr: '1 nm = 10⁻⁹ m · 1 Å = 10⁻¹⁰ m', vars: [['nm', 'nanómetro', 'm'], ['Å', 'ångström', 'm']] }} />
          <FormulaCard f={{ expr: '1 eV = 1,602·10⁻¹⁹ J', vars: [['eV', 'electronvoltio', 'J']] }} />
          <FormulaCard f={{ expr: '1 kJ/mol ↔ eV/átomo: × 96,485', vars: [['NA', '6,022·10²³', 'mol⁻¹']], note: '1 eV por átomo = 96,485 kJ/mol.' }} />
        </div>
      </section>
    </div>
  );
}

export function GuideOverlay() {
  const { query } = useRoute();
  const sheet = query.get('v') === 'formulario';
  const anchor = query.get('n');
  const blockParam = Number(query.get('b') ?? (anchor ? anchor.split('.')[0] : 1));
  const lesson = LESSONS.find((l) => l.block === blockParam) ?? LESSONS[0]!;
  const idx = LESSONS.indexOf(lesson);
  const mastery = useStore((s) => s.mastery);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = anchor ? document.getElementById(`sec-${anchor}`) : null;
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    } else {
      scroller.current?.scrollTo({ top: 0 });
    }
  }, [lesson.block, anchor, sheet]);
  const lessonNodes = useMemo(() => lesson.sections.map((s) => s.node), [lesson]);

  return (
    <div className="workspace workspace--full" style={{ minHeight: 0 }}>
      <div ref={scroller} className="interactive guide-scroll">
        <div className="guide">
          <nav className="guide-nav" aria-label="Lecciones">
            <span className="eyebrow eyebrow--accent">Guía de estudio</span>
            <ol>
              {LESSONS.map((l) => {
                const pct = blockMastery(l, mastery);
                const on = !sheet && l.block === lesson.block;
                return (
                  <li key={l.block}>
                    <a href={`#/guia?b=${l.block}`} aria-current={on ? 'page' : undefined}>
                      <span className="mono faint">{l.block}</span>
                      <span>{l.title}</span>
                      {pct !== null && <span className="guide-nav__pct mono">{pct} %</span>}
                    </a>
                  </li>
                );
              })}
              <li>
                <a href="#/guia?v=formulario" aria-current={sheet ? 'page' : undefined}>
                  <span className="mono faint">∑</span>
                  <span>Formulario completo</span>
                </a>
              </li>
            </ol>
          </nav>
          <article className="guide-main" key={sheet ? 'sheet' : lesson.block}>
            {sheet ? (
              <>
                <header className="stack-12 enter">
                  <span className="eyebrow eyebrow--accent">Formulario</span>
                  <h1 className="display guide-title">Todo lo que hay que saber calcular.</h1>
                </header>
                <FormulaSheet />
              </>
            ) : (
              <>
                <header className="stack-16 enter">
                  <span className="eyebrow eyebrow--accent">Bloque {lesson.block} de {LESSONS.length}</span>
                  <h1 className="display guide-title">{lesson.title}</h1>
                  <p className="lead" style={{ margin: 0 }}>
                    {lesson.summary}
                  </p>
                  <div className="exam-focus">
                    <span className="callout__title">Lo que suele caer en el examen</span>
                    <ul>
                      {lesson.examFocus.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="row row--wrap">
                    <a className="btn btn--primary btn--sm" href={`#${practiceUrl(lessonNodes)}`}>
                      <Icon name="target" size={16} /> Practicar el bloque
                    </a>
                    <a className="btn btn--sm" href={`#${lesson.lab.route}`}>
                      <Icon name="flask" size={16} /> Abrir {lesson.lab.label}
                    </a>
                  </div>
                  <nav className="guide-toc" aria-label="Apartados">
                    {lesson.sections.map((s) => (
                      <a
                        key={s.node}
                        href={`#/guia?b=${lesson.block}&n=${s.node}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`sec-${s.node}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        <span className="mono faint">{s.node}</span> {s.title}
                      </a>
                    ))}
                  </nav>
                </header>
                {lesson.sections.map((s) => (
                  <Section key={s.node} s={s} labRoute={lesson.lab.route} />
                ))}
                {lesson.worked.length > 0 && (
                  <section className="stack-16" aria-label="Ejercicios resueltos">
                    {lesson.worked.map((w) => (
                      <Worked key={w.title} w={w} />
                    ))}
                  </section>
                )}
                <footer className="guide-pager">
                  {idx > 0 ? (
                    <button type="button" className="btn btn--ghost" onClick={() => navigate(`/guia?b=${LESSONS[idx - 1]!.block}`)}>
                      <Icon name="arrow-left" size={16} /> {LESSONS[idx - 1]!.title}
                    </button>
                  ) : (
                    <span />
                  )}
                  {idx < LESSONS.length - 1 ? (
                    <button type="button" className="btn" onClick={() => navigate(`/guia?b=${LESSONS[idx + 1]!.block}`)}>
                      {LESSONS[idx + 1]!.title} <Icon name="arrow-right" size={16} />
                    </button>
                  ) : (
                    <a className="btn btn--primary" href="#/entrenamiento?v=examen">
                      Hacer un examen tipo <Icon name="arrow-right" size={16} />
                    </a>
                  )}
                </footer>
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
