import type { Transition } from '../../science/hydrogen';

/**
 * ATOM 6.0 · Flechas agrupadas por serie (como el diagrama de TEO p.10): cada serie ocupa su columna, con un
 * hueco entre series, y se rotula bajo su nivel de llegada.
 */
export interface SeriesGroup {
  n1: number;
  name: string;
  xs: number[];
  labelX: number;
}
export function arrowLayout(lines: { t: Transition }[]): { x: Map<string, number>; groups: SeriesGroup[] } {
  const sorted = [...lines].sort((a, b) => a.t.n1 - b.t.n1 || a.t.n2 - b.t.n2);
  const x = new Map<string, number>();
  const groups: SeriesGroup[] = [];
  // Paso escalado para que todas las flechas quepan entre −1,1 y 1,95 (los niveles miden ±2,1 y las etiquetas
  // empiezan en 2,2): con una cascada desde n = 7 (21 líneas, 6 series) antes llegaban a x ≈ 2,65.
  const nSeries = new Set(sorted.map((d) => d.t.n1)).size;
  const natural = Math.max(0, sorted.length - 1) * 0.13 + Math.max(0, nSeries - 1) * 0.22;
  const k = natural > 3.05 ? 3.05 / natural : 1;
  const ARROW = 0.13 * k;
  const GAP = 0.22 * k;
  let cur = -1.1;
  let last = -1;
  for (const d of sorted) {
    if (d.t.n1 !== last) {
      if (last !== -1) cur += GAP;
      groups.push({ n1: d.t.n1, name: d.t.series?.name ?? `n = ${d.t.n1}`, xs: [], labelX: 0 });
      last = d.t.n1;
    }
    x.set(`${d.t.from}-${d.t.to}`, cur);
    groups[groups.length - 1]!.xs.push(cur);
    cur += ARROW;
  }
  for (const g of groups) g.labelX = (g.xs[0]! + g.xs[g.xs.length - 1]!) / 2;
  return { x, groups };
}

