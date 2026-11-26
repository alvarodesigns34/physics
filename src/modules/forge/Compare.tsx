/**
 * Comparación átomo neutro ↔ ion: electrones, configuración y tamaño con datos reales
 * (radio covalente para el átomo y radio iónico de Shannon, NC = 6, para el ion).
 */
import { elementByZ, NOBLE_GASES } from '../../science/elements';
import { formatConfiguration, speciesConfiguration } from '../../science/configuration';
import { commonIon } from '../../science/trends';
import { ionSymbol, type Species } from '../../science/nucleus';
import { EpiTag } from '../../ui/common';

/** Si el número de electrones es el de un gas noble, su configuración es la de ese gas: «1s² 2s² 2p⁶ = [Ne]». */
function nobleLabel(e: number): string | null {
  if (!(NOBLE_GASES as readonly number[]).includes(e)) return null;
  const g = elementByZ(e)!;
  return `${formatConfiguration(speciesConfiguration(e, e), { abbreviate: e > 10 })} = [${g.symbol}]`;
}

export function NeutralIonCompare({ sp, onPick }: { sp: Species; onPick: (s: Species) => void }) {
  const el = elementByZ(sp.z);
  if (!el || sp.z === 0) return null;
  const q0 = sp.z - sp.e;
  const q = q0 !== 0 ? q0 : commonIon(el).charge;
  if (q === null || q === undefined) return null;
  const ionE = sp.z - q;
  const rAtom = el.covalentRadius;
  const rIon = el.ionicRadii.find(([c]) => c === q)?.[1] ?? null;
  const maxR = Math.max(rAtom ?? 0, rIon ?? 0, 1);
  const cols = [
    { label: el.symbol, sub: 'átomo neutro', e: sp.z, conf: formatConfiguration(speciesConfiguration(sp.z, sp.z), { abbreviate: true }), r: rAtom, rKind: 'covalente' },
    { label: ionSymbol(el.symbol, q), sub: q > 0 ? 'catión' : 'anión', e: ionE, conf: nobleLabel(ionE) ?? formatConfiguration(speciesConfiguration(sp.z, ionE), { abbreviate: true }), r: rIon, rKind: 'cristalino del ion (Shannon)' },
  ];
  return (
    <section className="section" aria-label="Neutro frente a ion">
      <span className="eyebrow">Neutro frente a ion</span>
      <div className="compare-grid">
        {cols.map((c) => (
          <div key={c.label} className="compare-col">
            <span className="compare-col__sym">{c.label}</span>
            <span className="small faint">{c.sub}</span>
            <span className="compare-circle" aria-hidden="true" style={{ width: `${((c.r ?? 0) / maxR) * 88}px`, height: `${((c.r ?? 0) / maxR) * 88}px` }} />
            <span className="mono small">{c.r ? `${c.r} pm` : 'sin dato'}</span>
            <span className="small faint">radio {c.rKind}</span>
            <span className="small">{c.e} e⁻</span>
            <span className="mono small" style={{ wordBreak: 'break-word', textAlign: 'center' }}>{c.conf}</span>
          </div>
        ))}
      </div>
      <p className="note">
        {q > 0
          ? `Al perder ${q} electrón(es), el ${el.name.toLowerCase()} se queda con menos repulsión entre electrones${sp.z <= 56 && el.block === 's' ? ' y pierde su capa externa' : ''}: el catión es más pequeño.`
          : `Al ganar ${-q} electrón(es), aumenta la repulsión entre electrones con la misma carga nuclear: el anión es más grande.`}{' '}
        Matiz: el radio covalente y el iónico se miden de forma distinta; la comparación es orientativa.
      </p>
      <div className="row row--wrap" style={{ gap: 6 }}>
        <button type="button" className="btn btn--sm" onClick={() => onPick({ ...sp, e: sp.z })}>Ver el neutro</button>
        <button type="button" className="btn btn--sm" onClick={() => onPick({ ...sp, e: ionE })}>Ver el ion {ionSymbol(el.symbol, q)}</button>
      </div>
      <EpiTag kind="calculo">Radios: covalente (Pyykkö) y cristalino del ion (Shannon, NC 6)</EpiTag>
    </section>
  );
}
