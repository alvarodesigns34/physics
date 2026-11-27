/** Selector de bloques del temario (compartido por práctica y examen). */

import { BLOCKS, NODE_BY_ID } from '../../learning/syllabus';
import { COVERED_NODES } from '../../learning/registry';
export const coveredBlocks = BLOCKS.filter((b) => COVERED_NODES.some((n) => NODE_BY_ID.get(n)?.block === b.id));

export function ScopePicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="row row--wrap" style={{ gap: 6 }} role="group" aria-label="Bloques del temario">
      <button type="button" className="btn btn--sm" aria-pressed={value.length === 0} onClick={() => onChange([])} style={value.length === 0 ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
        Todo lo disponible
      </button>
      {coveredBlocks.map((b) => {
        const on = value.includes(b.id);
        return (
          <button key={b.id} type="button" className="btn btn--sm" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== b.id) : [...value, b.id])} style={on ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
            {b.id}. {b.short}
          </button>
        );
      })}
    </div>
  );
}

export const scopeNodes = (blocks: number[]) => (blocks.length ? COVERED_NODES.filter((n) => blocks.includes(NODE_BY_ID.get(n)!.block)) : []);
