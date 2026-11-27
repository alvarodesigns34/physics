/**
 * Periodic Universe 3.0 · Tendencias: una propiedad a lo largo de un periodo o de un grupo, con las
 * excepciones marcadas y explicadas a partir de los datos (no de una lista fija).
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { ELEMENTS, type ElementRecord } from '../../science/elements';
import { PROPERTIES, compare, type PropertyId } from '../../science/trends';
import { FigureView } from '../../ui/Pedagogy';
import { formatNumber } from '../../science/numbers';

type Series = { kind: 'periodo'; n: number } | { kind: 'grupo'; n: number };
const PROPS: PropertyId[] = ['radio', 'ei1', 'en', 'ae', 'zeff'];
/** Sentido esperado al avanzar en la serie (derecha en un periodo, abajo en un grupo): +1 crece, −1 decrece. */
const EXPECTED: Record<PropertyId, { periodo: 1 | -1; grupo: 1 | -1 } | null> = {
  radio: { periodo: -1, grupo: 1 },
  ei1: { periodo: 1, grupo: -1 },
  en: { periodo: 1, grupo: -1 },
  ae: { periodo: 1, grupo: -1 },
  zeff: { periodo: 1, grupo: 1 },
  masa: null,
};

export function seriesElements(s: Series): ElementRecord[] {
  return s.kind === 'periodo' ? ELEMENTS.filter((e) => e.period === s.n && e.group !== null && (s.n <= 3 || e.group <= 2 || e.group >= 13)) : ELEMENTS.filter((e) => e.group === s.n && e.period <= 6);
}

/** Puntos que rompen la tendencia esperada respecto al anterior de la serie. */
export function anomalies(prop: PropertyId, s: Series, els: ElementRecord[]): { el: ElementRecord; prev: ElementRecord }[] {
  const exp = EXPECTED[prop]?.[s.kind];
  if (!exp) return [];
  const P = PROPERTIES[prop];
  const out: { el: ElementRecord; prev: ElementRecord }[] = [];
  let prev: ElementRecord | null = null;
  for (const e of els) {
    const v = P.get(e);
    if (v === null) continue;
    if (prev) {
      const pv = P.get(prev)!;
      if (Math.sign(v - pv) === -exp) out.push({ el: e, prev });
    }
    prev = e;
  }
  return out;
}

export const useTrends = create<{ prop: PropertyId; series: Series; set: (p: Partial<{ prop: PropertyId; series: Series }>) => void }>((set) => ({ prop: 'ei1', series: { kind: 'periodo', n: 2 }, set: (p) => set(p) }));

function useTrendData() {
  const { prop, series } = useTrends();
  const els = useMemo(() => seriesElements(series), [series]);
  const P = PROPERTIES[prop];
  const pts = els.filter((e) => P.get(e) !== null).map((e) => ({ x: series.kind === 'periodo' ? e.z : e.period, y: Number(P.get(e)!.toFixed(prop === 'en' || prop === 'zeff' ? 2 : 0)), label: e.symbol }));
  const anom = useMemo(() => anomalies(prop, series, els), [prop, series, els]);
  return { prop, series, P, pts, anom };
}

/** Gráfica grande dentro del visor (escritorio e iPad). */
export function TrendsChart() {
  const { series, P, pts, anom } = useTrendData();
  return (
    <div className="trends-chart fade">
      <FigureView fig={{ kind: 'puntos', title: `${P.label}${P.unit ? ` (${P.unit})` : ''} ${series.kind === 'periodo' ? `a lo largo del periodo ${series.n}` : `al bajar por el grupo ${series.n}`}. ${P.note}`, xLabel: series.kind === 'periodo' ? 'Z →' : 'periodo ↓', yLabel: P.short + (P.unit ? ` (${P.unit})` : ''), points: pts, highlight: anom.map((a) => a.el.symbol) }} />
    </div>
  );
}

export function TrendsPanel({ showChart = false }: { showChart?: boolean }) {
  const { prop, series, P, anom } = useTrendData();
  const setT = useTrends((s) => s.set);
  const setProp = (p: PropertyId) => setT({ prop: p });
  const setSeries = (x: Series) => setT({ series: x });
  const els = seriesElements(series);
  void els;
  const exp = EXPECTED[prop]?.[series.kind];
  return (
    <>
      <section className="section">
        <span className="eyebrow">Propiedad</span>
        <div className="row row--wrap" style={{ gap: 6 }} role="radiogroup" aria-label="Propiedad">
          {PROPS.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={prop === p} className="btn btn--sm" style={prop === p ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined} onClick={() => setProp(p)}>
              {PROPERTIES[p].short}
            </button>
          ))}
        </div>
        <span className="eyebrow">Recorrido</span>
        <div className="row row--wrap" style={{ gap: 6 }}>
          {[2, 3, 4].map((n) => (
            <button key={`p${n}`} type="button" className="btn btn--sm" aria-pressed={series.kind === 'periodo' && series.n === n} onClick={() => setSeries({ kind: 'periodo', n })}>
              Periodo {n}
            </button>
          ))}
          {[1, 2, 13, 15, 16, 17].map((n) => (
            <button key={`g${n}`} type="button" className="btn btn--sm" aria-pressed={series.kind === 'grupo' && series.n === n} onClick={() => setSeries({ kind: 'grupo', n })}>
              Grupo {n}
            </button>
          ))}
        </div>
      </section>
      {showChart && <TrendsChart />}
      <section className="section">
        {exp && (
          <p className="small" style={{ margin: 0 }}>
            Tendencia esperada: {P.short} <strong>{exp > 0 ? 'aumenta' : 'disminuye'}</strong> {series.kind === 'periodo' ? 'hacia la derecha' : 'al bajar'}.{' '}
            {anom.length === 0 ? 'En esta serie los datos la cumplen sin excepciones.' : `Excepciones en los datos (puntos rosas): ${anom.map((a) => a.el.symbol).join(', ')}.`}
          </p>
        )}
        {anom.map(({ el, prev }) => {
          const c = compare(prop, prev, el);
          return (
            <details key={el.symbol} className="rigor">
              <summary>
                <span className="rigor__tag">Excepción</span> {el.symbol} frente a {prev.symbol}: {formatNumber(P.get(el)!, { sig: P.digits })} frente a {formatNumber(P.get(prev)!, { sig: P.digits })} {P.unit}
              </summary>
              <p className="small" style={{ margin: '8px 0 0' }}>
                {c.exception ?? 'Los datos no siguen aquí la tendencia simple; la explicación requiere la configuración concreta de ambos elementos (compáralos en la vista de tabla).'}
              </p>
            </details>
          );
        })}
      </section>
    </>
  );
}
