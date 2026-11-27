/**
 * ATOM 5.1 · Gráficas del progreso (SVG/HTML, sin dependencias).
 * - Mapa del temario: los 54 apartados por bloque; el relleno es el dominio estimado (rampa secuencial de un
 *   solo tono, el acento); sin datos = trama neutra. Cada casilla es enfocable y tiene su descripción.
 * - Estimaciones con incertidumbre: punto (estimación central) e intervalo (±1 error típico), con la línea
 *   del 80 % (umbral de «dominado»). Una sola serie: el título la nombra, sin leyenda.
 * - Actividad: ejercicios por día en las últimas 4 semanas (barras finas con extremo redondeado).
 * Ninguna depende solo del color: cada valor está en la descripción accesible y en la lista de detalle.
 */
import { useMemo, useState } from 'react';
import { BLOCKS, NODES } from '../../learning/syllabus';
import { COVERED_NODES } from '../../learning/registry';
import { EVIDENCE_LABEL, masteryEstimate, type NodeMastery } from '../../learning/mastery';
import type { Attempt } from '../../state/store';

/** 5 pasos de la rampa secuencial (0–20, 20–40, … %): mezcla del acento con la superficie. */
export const RAMP_STEPS = [18, 34, 52, 72, 92];
const rampFill = (pct: number) => `color-mix(in oklab, var(--accent) ${RAMP_STEPS[Math.min(4, Math.floor(pct / 20))]}%, var(--surface-raised))`;

export function MasteryMap({ mastery, onPick }: { mastery: Record<string, NodeMastery>; onPick?: (node: string) => void }) {
  const covered = useMemo(() => new Set(COVERED_NODES), []);
  const [focus, setFocus] = useState<string | null>(null);
  const info = focus ? NODES.find((n) => n.id === focus) : null;
  const est = focus ? masteryEstimate(mastery[focus]) : null;
  return (
    <figure className="pchart">
      <figcaption className="pchart__head">
        <span className="pchart__title">Mapa del temario</span>
        <span className="pchart__legend" aria-hidden="true">
          <span className="pchart__swatch pchart__swatch--empty" /> sin datos
          {RAMP_STEPS.map((_, i) => (
            <span key={i} className="pchart__swatch" style={{ background: rampFill(i * 20 + 1) }} />
          ))}
          0 → 100 %
        </span>
      </figcaption>
      <div className="mmap" role="list">
        {BLOCKS.map((b) => (
          <div key={b.id} className="mmap__row" role="listitem">
            <span className="mmap__label">
              <span className="mono">{b.id}</span> {b.short}
            </span>
            <div className="mmap__cells">
              {NODES.filter((n) => n.block === b.id).map((n) => {
                const m = mastery[n.id];
                const e = masteryEstimate(m);
                const has = e.evidence !== 'sin-datos';
                const desc = `${n.id} ${n.title}: ${has ? `${e.mid} % (entre ${e.low} y ${e.high} %, ${EVIDENCE_LABEL[e.evidence]})` : covered.has(n.id) ? 'sin practicar' : 'sin ejercicios'}`;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`mmap__cell ${has ? '' : 'mmap__cell--empty'} ${e.evidence === 'escasa' ? 'mmap__cell--weak' : ''}`}
                    style={has ? { background: rampFill(e.mid) } : undefined}
                    aria-label={desc}
                    title={desc}
                    onMouseEnter={() => setFocus(n.id)}
                    onFocus={() => setFocus(n.id)}
                    onMouseLeave={() => setFocus(null)}
                    onClick={() => onPick?.(n.id)}
                  >
                    <span className="mmap__id">{n.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="pchart__readout small" aria-live="polite">
        {info && est ? (
          <>
            <b>
              {info.id} · {info.title}
            </b>{' '}
            — {est.evidence === 'sin-datos' ? 'sin datos todavía' : `${est.mid} % (${est.low}–${est.high} %), ${EVIDENCE_LABEL[est.evidence]}`}
          </>
        ) : (
          <span className="faint">Pasa por una casilla para ver su estimación; tócala para abrir su ruta de estudio. Borde discontinuo: evidencia escasa.</span>
        )}
      </p>
    </figure>
  );
}

export function IntervalPlot({ mastery }: { mastery: Record<string, NodeMastery> }) {
  const rows = NODES.map((n) => ({ n, e: masteryEstimate(mastery[n.id]) })).filter((r) => r.e.evidence !== 'sin-datos');
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return null;
  const W = 900;
  const L = 200;
  const R = 16;
  const RH = 24;
  const H = rows.length * RH + 34;
  const x = (p: number) => L + (p / 100) * (W - L - R);
  return (
    <figure className="pchart">
      <figcaption className="pchart__head">
        <span className="pchart__title">Estimación de dominio con su incertidumbre</span>
        <span className="small faint">punto: estimación · barra: ±1 error típico · línea: 80 % (dominado)</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="ichart" role="img" aria-label={`Dominio estimado de ${rows.length} apartados con su intervalo`}>
        {[0, 20, 40, 60, 80, 100].map((p) => (
          <g key={p}>
            <line x1={x(p)} x2={x(p)} y1={8} y2={H - 22} className={p === 80 ? 'ichart__ref' : 'ichart__grid'} />
            <text x={x(p)} y={H - 6} className="ichart__tick" textAnchor="middle">
              {p} %
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = 18 + i * RH;
          const on = hover === i;
          return (
            <g key={r.n.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={0} y={y - RH / 2} width={W} height={RH} fill={on ? 'var(--accent-quiet)' : 'transparent'} />
              <text x={L - 10} y={y + 4} textAnchor="end" className="ichart__label">
                {r.n.id} {r.n.title.length > 28 ? `${r.n.title.slice(0, 27)}…` : r.n.title}
              </text>
              <line x1={x(r.e.low)} x2={x(Math.max(r.e.high, r.e.low + 0.5))} y1={y} y2={y} className="ichart__ci" strokeLinecap="round" />
              <circle cx={x(r.e.mid)} cy={y} r={on ? 6 : 5} className="ichart__dot" />
              {on && (
                <text x={Math.min(x(r.e.high) + 10, W - 120)} y={y + 4} className="ichart__val">
                  {r.e.mid} % ({r.e.low}–{r.e.high})
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function ActivityBars({ history, now = Date.now() }: { history: Attempt[]; now?: number }) {
  const DAY = 86_400_000;
  const days = 28;
  const start = Math.floor(now / DAY) - days + 1;
  const counts = new Array(days).fill(0) as number[];
  for (const h of history) {
    const d = Math.floor(h.at / DAY) - start;
    if (d >= 0 && d < days) counts[d]!++;
  }
  const max = Math.max(1, ...counts);
  const [hover, setHover] = useState<number | null>(null);
  const W = 900;
  const H = 72;
  const bw = (W - 8) / days;
  return (
    <figure className="pchart">
      <figcaption className="pchart__head">
        <span className="pchart__title">Ejercicios por día · últimas 4 semanas</span>
        <span className="small faint num">{counts.reduce((a, b) => a + b, 0)} en total</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="ichart" role="img" aria-label={`Ejercicios por día en las últimas cuatro semanas: ${counts.join(', ')}`}>
        <line x1={0} x2={W} y1={H} y2={H} className="ichart__grid" />
        {counts.map((c, i) => {
          const h = c ? Math.max(4, (c / max) * (H - 10)) : 0;
          const x0 = 4 + i * bw + 2;
          const w = bw - 4;
          const date = new Date((start + i) * DAY);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x0 - 2} y={0} width={bw} height={H} fill={hover === i ? 'var(--accent-quiet)' : 'transparent'} />
              {c > 0 && <path d={`M${x0},${H} v${-(h - 4)} q0,-4 4,-4 h${w - 8} q4,0 4,4 v${h - 4} z`} className="ichart__bar" />}
              {(i % 7 === 0 || i === days - 1) && (
                <text x={x0 + w / 2} y={H + 14} className="ichart__tick" textAnchor="middle">
                  {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </text>
              )}
              {hover === i && (
                <text x={Math.min(Math.max(x0 + w / 2, 40), W - 40)} y={12} className="ichart__val" textAnchor="middle">
                  {c} · {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
