/**
 * Firma visual de ATOM (5.0): la serie de Balmer del hidrógeno, CALCULADA con el mismo modelo que el
 * laboratorio (Rydberg con masa reducida), cada línea en su longitud de onda y con su color. Es el único
 * elemento saturado de la página: el concepto de diseño de ATOM es que el color lo pone la física.
 */
import { transition } from '../../science/hydrogen';
import { wavelengthToCss } from '../../science/photon';
import { formatNumber } from '../../science/numbers';

const L0 = 380;
const L1 = 720;
const LINES = [3, 4, 5, 6, 7].map((n) => {
  const t = transition(n, 2);
  return { n, nm: t.wavelength * 1e9 };
});
const NAMES = ['Hα', 'Hβ', 'Hγ', 'Hδ', 'Hε'];

export function SpectrumSignature() {
  const W = 400;
  const H = 72;
  const x = (nm: number) => ((nm - L0) / (L1 - L0)) * W;
  return (
    <figure className="signature" aria-label={`Serie de Balmer del hidrógeno, calculada: ${LINES.map((l, i) => `${NAMES[i]} ${formatNumber(l.nm, { sig: 4 })} nanómetros`).join(', ')}`}>
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-hidden="true">
        <rect x="0" y="0" width={W} height={H} rx="10" className="signature__bg" />
        {LINES.map((l, i) => (
          <g key={l.n} className="signature__line" style={{ animationDelay: `${180 + i * 70}ms` }}>
            <rect x={x(l.nm) - 6} y="0" width="12" height={H} fill={wavelengthToCss(l.nm)} opacity="0.22" />
            <rect x={x(l.nm) - 1.25} y="0" width="2.5" height={H} fill={wavelengthToCss(l.nm)} />
            {i < 3 && (
              <text x={x(l.nm)} y={H + 16} textAnchor="middle" className="signature__label">
                {NAMES[i]} {formatNumber(l.nm, { sig: 3 })}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="signature__cap">
        <span className="epi-dot" aria-hidden="true" /> Serie de Balmer del hidrógeno · calculada con la ecuación de Rydberg · nm
      </figcaption>
    </figure>
  );
}
