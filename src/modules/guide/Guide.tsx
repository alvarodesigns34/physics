import { useEffect, useMemo, useRef, useState } from 'react';
import { EXAM_STRATEGY, LESSONS, RIGOR_NOTES, TRICKS, type Formula, type GuideSection, type Lesson, type WorkedExample } from '../../learning/guide';
import { COVERED_NODES } from '../../learning/registry';
import { NODES } from '../../learning/syllabus';
import { masteryPercent } from '../../learning/mastery';
import { useStore } from '../../state/store';
import { navigate, useRoute } from '../../app/hooks';
import { Rich } from '../../ui/common';
import { formatNumber } from '../../science/numbers';
import { Icon } from '../../ui/Icon';
import { GuideWidget } from './widgets';
import { DEPTH } from '../../learning/guideDepth';
import { LIVE, sliderToValue, valueToSlider, type LiveFormula } from '../../learning/liveFormulas';

const covered = new Set(COVERED_NODES);

function practiceUrl(nodes: string[]) {
  return `/entrenamiento?v=practica&nodes=${nodes.filter((n) => covered.has(n)).join(',')}`;
}

/** Explorador de una fórmula: deslizadores para las entradas y el resultado recalculado al instante. */
const showVal = (i: LiveFormula['inputs'][number], v: number) => (!i.log && Number.isInteger(i.step) ? String(v).replace('-', '−') : formatNumber(v, { sig: i.log ? 3 : 4 })) + (i.unit ? ` ${i.unit}` : '');

function LivePanel({ lf, label }: { lf: LiveFormula; label: string }) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(lf.inputs.map((i) => [i.key, i.value])));
  const r = lf.compute(vals);
  return (
    <div className="live" role="group" aria-label={`Explorar ${label}`}>
      <div className="live__inputs">
        {lf.inputs.map((i) => {
          const id = `live-${label}-${i.key}`.replace(/[^\w-]/g, '_');
          return (
            <label key={i.key} className="live__in" htmlFor={id}>
              <span className="live__lab">
                <span className="mono live__sym">{i.sym}</span> {i.label}
                <output className="mono live__val" htmlFor={id}>
                  {showVal(i, vals[i.key]!)}
                </output>
              </span>
              <input
                id={id}
                type="range"
                min={i.log ? 0 : i.min}
                max={i.log ? 1000 : i.max}
                step={i.log ? 1 : i.step}
                value={i.log ? valueToSlider(i, vals[i.key]!) : vals[i.key]!}
                aria-valuetext={showVal(i, vals[i.key]!)}
                onChange={(e) => setVals((v) => ({ ...v, [i.key]: i.log ? sliderToValue(i, Number(e.target.value)) : Number(e.target.value) }))}
              />
            </label>
          );
        })}
      </div>
      <div className="live__out" aria-live="polite">
        {r.invalid ? (
          <p className="live__invalid">{r.invalid}</p>
        ) : (
          <>
            <dl className="live__results">
              {r.outputs.map((o, k) => (
                <div key={o.sym + k} className={o.main ? 'is-main' : undefined}>
                  <dt className="mono">{o.sym}</dt>
                  <dd className="mono">
                    {o.value}
                    {o.unit ? <span className="live__unit"> {o.unit}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            {r.note && <p className="small muted live__note">{r.note}</p>}
          </>
        )}
        <p className="small live__observe">
          <strong>Observa:</strong> {lf.observe}
        </p>
      </div>
    </div>
  );
}

function FormulaCard({ f }: { f: Formula }) {
  const lf = LIVE[f.expr];
  const [open, setOpen] = useState(false);
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
      {lf && (
        <>
          <button type="button" className="btn btn--ghost btn--sm live__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Ocultar el explorador' : 'Explorar la fórmula'}
            <span className="live__tag">cálculo</span>
          </button>
          {open && <LivePanel lf={lf} label={f.expr} />}
        </>
      )}
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

export function Section({ s, labRoute }: { s: GuideSection; labRoute: string }) {
  const node = NODES.find((n) => n.id === s.node);
  const mastery = useStore((st) => st.mastery[s.node]);
  const depth = DEPTH[s.id ?? s.node];
  return (
    <section id={`sec-${s.id ?? s.node}`} className="guide-sec" aria-labelledby={`h-${s.id ?? s.node}`} data-block={s.node.split('.')[0]}>
      <header className="guide-sec__head">
        <span className="guide-sec__num num">{s.node}</span>
        <h2 id={`h-${s.id ?? s.node}`} className="h2 guide-sec__title">
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
        {depth && (
          <p className="guide-why">
            <span className="guide-why__tag">Por qué</span>
            <Rich text={depth.why} />
          </p>
        )}
      </div>
      {s.formulas && (
        <div className="formula-grid">
          {s.formulas.map((f) => (
            <FormulaCard key={f.expr} f={f} />
          ))}
        </div>
      )}
      {s.widget && <GuideWidget id={s.widget} />}
      {(depth?.analogy || depth?.counter) && (
        <div className="guide-callouts">
          {depth.analogy && (
            <div className="callout callout--analogy">
              <span className="callout__title">Analogía</span>
              <p>{depth.analogy.text}</p>
              <p className="callout__limit">
                <strong>Dónde falla:</strong> {depth.analogy.limit}
              </p>
            </div>
          )}
          {depth.counter && (
            <div className="callout callout--counter">
              <span className="callout__title">Contraejemplo</span>
              <p>{depth.counter}</p>
            </div>
          )}
        </div>
      )}
      {(s.mistakes || s.tip || TRICKS[s.id ?? s.node] || depth?.exam.length) && (
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
          {TRICKS[s.id ?? s.node] && (
            <div className="callout callout--trick">
              <span className="callout__title">Trucos</span>
              <ul>
                {TRICKS[s.id ?? s.node]!.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {(s.tip || depth?.exam.length) && (
            <div className="callout callout--tip">
              <span className="callout__title">En el examen</span>
              {s.tip && <p>{s.tip}</p>}
              {depth?.exam.length ? (
                <>
                  <span className="callout__sub">Cómo lo preguntan</span>
                  <ul>
                    {depth.exam.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
      {depth?.doubts.length ? (
        <div className="doubts">
          <span className="doubts__title">Dudas frecuentes</span>
          {depth.doubts.map((d) => (
            <details key={d.q} className="doubt">
              <summary>{d.q}</summary>
              <p>{d.a}</p>
            </details>
          ))}
        </div>
      ) : null}
      {RIGOR_NOTES.filter((r) => r.node === s.node && !s.id).map((r) => (
        <details key={r.id} className="rigor">
          <summary>
            <span className="rigor__tag">Nota de rigor</span> {r.title}
          </summary>
          <dl className="rigor__levels">
            <div>
              <dt>En los apuntes</dt>
              <dd>{r.clase}</dd>
            </div>
            <div>
              <dt>En el examen</dt>
              <dd>{r.examen}</dd>
            </div>
            <div>
              <dt>Con rigor</dt>
              <dd>{r.rigor}</dd>
            </div>
          </dl>
        </details>
      ))}
      <div className="row row--wrap" style={{ gap: 8 }}>
        {covered.has(s.node) && (
          <a className="btn btn--sm" href={`#${practiceUrl([s.node])}`}>
            <Icon name="target" size={14} /> Practicar este apartado
          </a>
        )}
        {covered.has(s.node) && !s.id && (
          <a className="btn btn--sm btn--primary" href={`#/entrenamiento?v=ruta&n=${s.node}`}>
            Ruta de estudio completa
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

function TricksPage() {
  return (
    <div className="stack-16">
      <section className="strategy">
        <span className="callout__title">Estrategia para cualquier problema</span>
        <ol>
          {EXAM_STRATEGY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </section>
      {LESSONS.map((l) => {
        const items = l.sections.filter((s) => TRICKS[s.id ?? s.node]);
        if (!items.length) return null;
        return (
          <section key={l.block} className="stack-8">
            <span className="h3">
              <span className="block-num" data-block={l.block}>{l.block}</span> {l.title}
            </span>
            <div className="tricks-grid">
              {items.flatMap((s) =>
                TRICKS[s.id ?? s.node]!.map((t) => (
                  <a key={t} className="trick-card" href={`#/guia?b=${l.block}&n=${s.id ?? s.node}`}>
                    <span className="small faint">{s.title}</span>
                    <span>{t}</span>
                  </a>
                )),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
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
            <span className="nid">{l.block}.</span> {l.title}
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
  const tricks = query.get('v') === 'trucos';
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
  }, [lesson.block, anchor, sheet, tricks]);
  const lessonNodes = useMemo(() => [...new Set(lesson.sections.map((s) => s.node))], [lesson]);

  return (
    <div className="workspace workspace--full" style={{ minHeight: 0 }}>
      <div ref={scroller} className="interactive guide-scroll">
        <div className="guide">
          <nav className="guide-nav" aria-label="Lecciones">
            <span className="eyebrow eyebrow--accent">Guía de estudio</span>
            <ol>
              {LESSONS.map((l) => {
                const pct = blockMastery(l, mastery);
                const on = !sheet && !tricks && l.block === lesson.block;
                return (
                  <li key={l.block}>
                    <a href={`#/guia?b=${l.block}`} aria-current={on ? 'page' : undefined} data-block={l.block}>
                      <span className="mono faint">{l.block}</span>
                      <span>{l.title}</span>
                      {pct !== null && <span className="guide-nav__pct mono">{pct} %</span>}
                    </a>
                  </li>
                );
              })}
              <li>
                <a href="#/guia?v=trucos" aria-current={tricks ? 'page' : undefined}>
                  <span className="mono faint">★</span>
                  <span>Trucos de examen</span>
                </a>
              </li>
              <li>
                <a href="#/guia?v=formulario" aria-current={sheet ? 'page' : undefined}>
                  <span className="mono faint">∑</span>
                  <span>Formulario completo</span>
                </a>
              </li>
            </ol>
          </nav>
          <article className="guide-main" key={tricks ? 'tricks' : sheet ? 'sheet' : lesson.block}>
            {tricks ? (
              <>
                <header className="stack-12 enter">
                  <span className="eyebrow eyebrow--accent">Trucos de examen</span>
                  <h1 className="display guide-title">Atajos que ahorran puntos.</h1>
                  <p className="lead" style={{ margin: 0 }}>Reglas para recordar, comprobaciones rápidas y los despistes que más penalizan. Toca un truco para ver la teoría.</p>
                </header>
                <TricksPage />
              </>
            ) : sheet ? (
              <>
                <header className="stack-12 enter">
                  <span className="eyebrow eyebrow--accent">Formulario</span>
                  <h1 className="display guide-title">Todo lo que hay que saber calcular.</h1>
                </header>
                <FormulaSheet />
              </>
            ) : (
              <>
                <header className="stack-16 enter" data-block={lesson.block}>
                  <div className="lesson-hero stack-12">
                    <span className="lesson-hero__num" aria-hidden="true">{lesson.block}</span>
                    <span className="eyebrow">Bloque {lesson.block} de {LESSONS.length}</span>
                    <h1 className="display guide-title" style={{ position: 'relative' }}>{lesson.title}</h1>
                    <p className="lead" style={{ margin: 0, position: 'relative', maxWidth: '58ch' }}>
                      {lesson.summary}
                    </p>
                  </div>
                  <ol className="study-path" aria-label="Cómo estudiar este bloque">
                    {[
                      ['Lee', 'lo esencial de cada apartado'],
                      ['Toca', 'los gráficos interactivos'],
                      ['Repasa', 'los ejemplos resueltos paso a paso'],
                      ['Practica', 'con ejercicios nuevos y de clase'],
                      ['Examínate', 'con un examen del bloque'],
                    ].map(([v, t], i) => (
                      <li key={v}>
                        <span className="study-path__n">{i + 1}</span>
                        <span>
                          <b>{v}</b> {t}
                        </span>
                      </li>
                    ))}
                  </ol>
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
                        key={s.id ?? s.node}
                        href={`#/guia?b=${lesson.block}&n=${s.id ?? s.node}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(`sec-${s.id ?? s.node}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        <span className="nid">{s.node}</span> {s.title}
                      </a>
                    ))}
                  </nav>
                </header>
                {lesson.sections.map((s) => (
                  <Section key={s.id ?? s.node} s={s} labRoute={lesson.lab.route} />
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
