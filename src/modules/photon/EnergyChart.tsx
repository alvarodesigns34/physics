/**
 * ATOM 6.0 · E frente a λ (escala log–log) sincronizada con el banco de ondas: la recta de pendiente −1 es
 * E = h·c/λ. Con una radiación fijada para comparar, se marcan las dos y su cociente de energías.
 */
import { fromWavelength } from '../../science/photon';
import { SIM_CONSTANTS } from '../../science/constants';
import { formatNumber } from '../../science/numbers';

// Mismo rango que el deslizador del banco de ondas (log10(λ/m) de −14 a 4): el punto nunca sale de la gráfica.
const LMIN = -14;
const LMAX = 4;
const W = 320;
const H = 150;
const PAD = { l: 34, r: 8, t: 8, b: 22 };

export function EnergyChart({ lambdaM, pinnedM }: { lambdaM: number; pinnedM: number | null }) {
  const E = (lm: number) => fromWavelength(lm, SIM_CONSTANTS).energyEV;
  const eMin = Math.log10(E(10 ** LMAX));
  const eMax = Math.log10(E(10 ** LMIN));
  const x = (lm: number) => PAD.l + ((Math.min(LMAX, Math.max(LMIN, Math.log10(lm))) - LMIN) / (LMAX - LMIN)) * (W - PAD.l - PAD.r);
  const y = (ev: number) => PAD.t + ((eMax - Math.log10(ev)) / (eMax - eMin)) * (H - PAD.t - PAD.b);
  const ratio = pinnedM ? pinnedM / lambdaM : null;
  const regions: [string, number, number][] = [
    ['γ', 1e-14, 1e-11],
    ['X', 1e-11, 1e-8],
    ['UV', 1e-8, 3.8e-7],
    ['Vis', 3.8e-7, 7.5e-7],
    ['IR', 7.5e-7, 1e-3],
    ['Radio', 1e-3, 1e4],
  ];
  return (
    <figure className="energy-chart" aria-label={`Energía del fotón frente a la longitud de onda: ${formatNumber(E(lambdaM), { sig: 3 })} eV${ratio ? `; cociente de energías respecto a la radiación fijada: ${formatNumber(ratio, { sig: 3 })}` : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
        {regions.map(([n, a, b], i) => (
          <g key={n}>
            <rect x={x(a)} y={PAD.t} width={x(b) - x(a)} height={H - PAD.t - PAD.b} className={i % 2 ? 'energy-chart__band' : 'energy-chart__band energy-chart__band--alt'} />
            <text x={(x(a) + x(b)) / 2} y={H - 8} textAnchor="middle" className="energy-chart__tick">
              {n}
            </text>
          </g>
        ))}
        <line x1={x(10 ** LMIN)} y1={y(E(10 ** LMIN))} x2={x(10 ** LMAX)} y2={y(E(10 ** LMAX))} className="energy-chart__curve" />
        {[1e8, 1e4, 1, 1e-4, 1e-8].map((ev) => (
          <text key={ev} x={PAD.l - 4} y={y(ev) + 3} textAnchor="end" className="energy-chart__tick">
            {ev === 1 ? '1' : `10${{ 1e8: '⁸', 1e4: '⁴', 1e-4: '⁻⁴', 1e-8: '⁻⁸' }[ev]}`}
          </text>
        ))}
        <text x={4} y={PAD.t + 6} className="energy-chart__tick">eV</text>
        {pinnedM && <circle cx={x(pinnedM)} cy={y(E(pinnedM))} r={4.5} className="energy-chart__pin" />}
        <circle cx={x(lambdaM)} cy={y(E(lambdaM))} r={5} className="energy-chart__dot" />
      </svg>
      <figcaption className="small faint">
        Recta de pendiente −1 en escala log–log: E = h·c/λ. Diez veces menos λ, diez veces más energía.
        {ratio && (
          <>
            {' '}
            <b className="energy-chart__ratio">
              E/E<sub>fijada</sub> = λ<sub>fijada</sub>/λ = {formatNumber(ratio, { sig: 3 })}
            </b>
          </>
        )}
      </figcaption>
    </figure>
  );
}
