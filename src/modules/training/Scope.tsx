/** Selector de bloques del temario (compartido por práctica y examen). */

import { BLOCKS, NODE_BY_ID } from '../../learning/syllabus';
import { COVERED_NODES } from '../../learning/registry';
export const coveredBlocks = BLOCKS.filter((b) => COVERED_NODES.some((n) => NODE_BY_ID.get(n)?.block === b.id));

export function ScopePicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="scope-chips" role="group" aria-label="Bloques del temario">
      <button type="button" className="scope-chip" aria-pressed={value.length === 0} onClick={() => onChange([])}>
        Todo
      </button>
      {coveredBlocks.map((b) => {
        const on = value.includes(b.id);
        return (
          <button key={b.id} type="button" className="scope-chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== b.id) : [...value, b.id])} style={{ ['--bc' as string]: `var(--b${b.id})` }}>
            <span className="scope-chip__dot" aria-hidden="true" />
            {b.short}
          </button>
        );
      })}
    </div>
  );
}

export const scopeNodes = (blocks: number[]) => (blocks.length ? COVERED_NODES.filter((n) => blocks.includes(NODE_BY_ID.get(n)!.block)) : []);
