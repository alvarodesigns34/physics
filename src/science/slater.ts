/**
 * Reglas de Slater (1930) para la constante de apantallamiento a y la carga nuclear efectiva Z_ef = Z − a.
 * TEO p.19 da una versión simplificada (core → 1, valencia → < 1); aquí se implementan completas (errata E11).
 */
import type { Configuration, Subshell } from './configuration';
import { subshellLabel } from './configuration';

type GroupKind = 'sp' | 'd' | 'f';

interface SlaterGroup {
  n: number;
  kind: GroupKind;
}

function groupOf(s: Subshell): SlaterGroup {
  return { n: s.n, kind: s.l <= 1 ? 'sp' : s.l === 2 ? 'd' : 'f' };
}

function groupOrder(g: SlaterGroup): number {
  return g.n * 10 + (g.kind === 'sp' ? 0 : g.kind === 'd' ? 1 : 2);
}

function groupKey(g: SlaterGroup): string {
  return `${g.n}${g.kind}`;
}

export interface ShieldingContribution {
  group: string;
  electrons: number;
  factor: number;
}

export interface SlaterResult {
  target: string;
  shielding: number;
  zeff: number;
  contributions: ShieldingContribution[];
}

/** Apantallamiento sobre un electrón del subnivel `target` en un átomo/ion de número atómico z. */
export function slater(z: number, conf: Configuration, target: Subshell): SlaterResult {
  const tg = groupOf(target);
  const counts = new Map<string, { g: SlaterGroup; e: number }>();
  for (const s of conf) {
    const g = groupOf(s);
    const k = groupKey(g);
    const cur = counts.get(k);
    counts.set(k, { g, e: (cur?.e ?? 0) + s.e });
  }
  const contributions: ShieldingContribution[] = [];
  let shielding = 0;
  for (const { g, e } of counts.values()) {
    let electrons = e;
    let factor: number;
    if (groupKey(g) === groupKey(tg)) {
      electrons = e - 1;
      factor = tg.n === 1 ? 0.3 : 0.35;
    } else if (groupOrder(g) > groupOrder(tg)) {
      factor = 0;
    } else if (tg.kind === 'sp') {
      factor = g.n === tg.n - 1 ? 0.85 : g.n <= tg.n - 2 ? 1 : 1;
    } else {
      factor = 1;
    }
    if (electrons > 0 && factor > 0) {
      contributions.push({ group: g.kind === 'sp' ? (g.n === 1 ? '1s' : `${g.n}s,${g.n}p`) : `${g.n}${g.kind}`, electrons, factor });
      shielding += electrons * factor;
    }
  }
  contributions.sort((a, b) => b.factor - a.factor);
  return { target: subshellLabel(target), shielding, zeff: z - shielding, contributions };
}

/** Z_ef del electrón más externo (subnivel de mayor n; a igualdad, mayor l). */
export function outerZeff(z: number, conf: Configuration): SlaterResult {
  const outer = [...conf].sort((a, b) => b.n - a.n || b.l - a.l)[0];
  if (!outer) return { target: '—', shielding: 0, zeff: z, contributions: [] };
  return slater(z, conf, outer);
}
