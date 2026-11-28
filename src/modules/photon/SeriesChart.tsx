/**
 * ATOM 6.0 · Gráfica sincronizada: la línea elegida dentro de SU serie. Muestra cómo las líneas de una serie
 * se acumulan hacia el límite (n₂ → ∞), dónde cae la banda visible y qué línea es (α, β, γ…). Todo sale de
 * `seriesLines` (Rydberg con R_H); la escala es lineal en λ dentro de la serie.
 */
import { seriesFor, seriesLines } from '../../science/hydrogen';
import { isVisible, wavelengthToCss } from '../../science/photon';
import { formatNumber } from '../../science/numbers';

const GREEK = ['α', 'β', 'γ', 'δ', 'ε'];
const fmt = (v: number, sig = 4) => formatNumber(v, { sig });

export function SeriesChart({ n1, n2 }: { n1: number; n2: number }) {
  const s = seriesFor(n1);
  const { lines, limitNm } = seriesLines(n1, 12);
  const first = lines[0]!.nm;
  const lo = limitNm - (first - limitNm) * 0.06;
  const hi = first + (first - limitNm) * 0.08;
  const W = 320;
  const H = 96;
  const x = (nm: number) => ((nm - lo) / (hi - lo)) * W;
  const sel = lines.find((l) => l.n2 === n2);
  const visLo = Math.max(lo, 380);
  const visHi = Math.min(hi, 750);
  const ticks = niceTicks(lo, hi, 4);
  return (
    <figure className="series-chart" aria-label={`Serie de ${s?.name ?? '—'}: líneas desde ${fmt(first)} nm hasta el límite ${fmt(limitNm)} nm${sel ? `; seleccionada ${n2} → ${n1}, ${fmt(sel.nm)} nm` : ''}`}>
      <figcaption className="series-chart__cap">
        <span>
          Serie de <b>{s?.name ?? '—'}</b> (n₁ = {n1})
        </span>
        <span className="faint num">λ∞ = {fmt(limitNm)} nm</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        {visHi > visLo && (
          <g>
            <defs>
              <linearGradient id={`vis-${n1}`} x1="0" x2="1">
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const nm = visLo + (visHi - visLo) * f;
                  return <stop key={f} offset={f} stopColor={wavelengthToCss(nm)} stopOpacity={0.22} />;
                })}
              </linearGradient>
            </defs>
            <rect x={x(visLo)} y={8} width={x(visHi) - x(visLo)} height={H - 34} fill={`url(#vis-${n1})`} />
          </g>
        )}
        <line x1={0} x2={W} y1={H - 26} y2={H - 26} className="series-chart__axis" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={H - 26} y2={H - 22} className="series-chart__axis" />
            <text x={x(t)} y={H - 10} className="series-chart__tick" textAnchor="middle">
              {formatNumber(t, { sig: 3 })}
            </text>
          </g>
        ))}
        <line x1={x(limitNm)} x2={x(limitNm)} y1={6} y2={H - 26} className="series-chart__limit" />
        <text x={x(limitNm) + 3} y={14} className="series-chart__tick">∞</text>
        {lines.map((l, i) => {
          const on = l.n2 === n2;
          const col = isVisible(l.nm) ? wavelengthToCss(l.nm) : 'currentColor';
          return (
            <g key={l.n2}>
              <line x1={x(l.nm)} x2={x(l.nm)} y1={on ? 6 : 22} y2={H - 26} stroke={col} strokeWidth={on ? 2.6 : 1.1} opacity={on ? 1 : Math.max(0.25, 0.8 - i * 0.06)} />
              {i < 4 && (
                <text x={x(l.nm)} y={on ? 4 : 18} dy={on ? -1 : 0} textAnchor="middle" className={on ? 'series-chart__sel' : 'series-chart__tick'}>
                  {GREEK[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="series-chart__note small faint">
        {sel ? `${n2} → ${n1}: ${fmt(sel.nm)} nm, ${GREEK[n2 - n1 - 1] ? `línea ${GREEK[n2 - n1 - 1]}` : `${n2 - n1}.ª línea`}. ` : ''}
        Al subir n₂ las líneas se juntan: las energías de los niveles altos están cada vez más próximas.
      </p>
    </figure>
  );
}

function niceTicks(lo: number, hi: number, n: number): number[] {
  const raw = (hi - lo) / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(Math.round(t * 1e6) / 1e6);
  return out;
}
