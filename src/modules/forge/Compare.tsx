/**
 * Comparación átomo neutro ↔ ion: electrones, configuración y tamaño con datos reales
 * (radio covalente para el átomo y radio iónico de Shannon, NC = 6, para el ion).
 */
import { useState } from 'react';
import { relations, variantsOf, RELATION_LABEL } from '../../science/speciesRelations';
import { elementByZ, NOBLE_GASES } from '../../science/elements';
import { formatConfiguration, speciesConfiguration } from '../../science/configuration';
import { commonIon } from '../../science/trends';
import { ionSymbol, nuclearNotation, type Species } from '../../science/nucleus';
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

/**
 * Atomic Forge 3.0 · Comparar especies a la vez (hasta tres): qué cambia y qué se conserva.
 * Las celdas que difieren de la primera especie se resaltan; debajo, la relación de cada pareja.
 */
export function SpeciesCompare({ sp, onPick }: { sp: Species; onPick: (s: Species) => void }) {
  const [others, setOthers] = useState<Species[]>([]);
  if (sp.z === 0) return null;
  const list = [sp, ...others];
  const row = (s: Species) => {
    const el = elementByZ(s.z);
    const q = s.z - s.e;
    return {
      Elemento: el?.name ?? '—',
      Notación: nuclearNotation(s),
      Z: String(s.z),
      A: String(s.z + s.n),
      N: String(s.n),
      'e⁻': String(s.e),
      Carga: q === 0 ? '0' : `${q > 0 ? '+' : '−'}${Math.abs(q)}`,
      Configuración: s.e > 0 ? (nobleLabel(s.e) ?? formatConfiguration(speciesConfiguration(s.z, s.e), { abbreviate: true })) : '—',
    };
  };
  const rows = list.map(row);
  const keys = Object.keys(rows[0]!) as (keyof ReturnType<typeof row>)[];
  return (
    <section className="section" aria-label="Comparar especies">
      <div className="row row--between">
        <span className="eyebrow">Comparar especies</span>
        {others.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOthers([])}>
            Limpiar
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Añade variantes de la especie de la Forja y observa qué cambia (resaltado) y qué se conserva.
      </p>
      <div className="row row--wrap" style={{ gap: 6 }}>
        {variantsOf(sp).map((v) => (
          <button key={v.label} type="button" className="btn btn--sm" disabled={others.length >= 2} onClick={() => setOthers((o) => [...o, v.sp].slice(-2))}>
            + {v.label}
          </button>
        ))}
      </div>
      {others.length > 0 && (
        <>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla comparativa de especies">
            <table className="data-table species-table">
              <tbody>
                {keys.map((k) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    {rows.map((r, i) => (
                      <td key={i} className={i > 0 && r[k] !== rows[0]![k] ? 'is-diff' : undefined}>
                        {r[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {others.map((o, i) => (
            <p key={i} className="small" style={{ margin: 0 }}>
              {nuclearNotation(sp)} y {nuclearNotation(o)}: <strong>{relations(sp, o).map((r) => RELATION_LABEL[r]).join(' y ') || 'sin una relación con nombre propio'}</strong>.{' '}
              <button type="button" className="link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => onPick(o)}>
                Construirla en la Forja
              </button>
            </p>
          ))}
        </>
      )}
    </section>
  );
}
