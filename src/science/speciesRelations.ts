/**
 * Relaciones entre dos especies (temario 1.1–1.5): qué tienen en común y qué cambia.
 */
import type { Species } from './nucleus';

export type RelationId = 'misma' | 'isotopos' | 'iones' | 'isobaros' | 'isotonos' | 'isoelectronicas';

export const RELATION_LABEL: Record<RelationId, string> = {
  misma: 'la misma especie',
  isotopos: 'isótopos (mismo Z, distinto N)',
  iones: 'el mismo núclido con distinta carga (átomo e ion)',
  isobaros: 'isóbaros (mismo A, distinto Z)',
  isotonos: 'isótonos (mismo N, distinto Z)',
  isoelectronicas: 'isoelectrónicas (mismos electrones, distinto Z)',
};

/** Todas las relaciones que se cumplen entre a y b (puede haber varias, p. ej. isóbaros e isoelectrónicos). */
export function relations(a: Species, b: Species): RelationId[] {
  const A = (s: Species) => s.z + s.n;
  if (a.z === b.z && a.n === b.n && a.e === b.e) return ['misma'];
  const out: RelationId[] = [];
  if (a.z === b.z && a.n !== b.n) out.push('isotopos');
  if (a.z === b.z && a.n === b.n && a.e !== b.e) out.push('iones');
  if (a.z !== b.z && A(a) === A(b)) out.push('isobaros');
  if (a.z !== b.z && a.n === b.n) out.push('isotonos');
  if (a.z !== b.z && a.e === b.e) out.push('isoelectronicas');
  return out;
}

/** Variantes didácticas de una especie para compararlas con ella. */
export function variantsOf(s: Species): { label: string; sp: Species }[] {
  const out: { label: string; sp: Species }[] = [];
  if (s.z < 1) return out;
  out.push({ label: 'Isótopo (+1 neutrón)', sp: { ...s, n: s.n + 1 } });
  if (s.n > 0) out.push({ label: 'Isótopo (−1 neutrón)', sp: { ...s, n: s.n - 1 } });
  out.push({ label: 'Catión (−1 electrón)', sp: { ...s, e: Math.max(0, s.e - 1) } });
  out.push({ label: 'Anión (+1 electrón)', sp: { ...s, e: s.e + 1 } });
  out.push({ label: 'Isoelectrónico (Z + 1)', sp: { z: s.z + 1, n: s.n, e: s.e } });
  if (s.n > 0) out.push({ label: 'Isóbaro (un neutrón pasa a protón)', sp: { z: s.z + 1, n: s.n - 1, e: s.e + 1 } });
  return out;
}
