/**
 * Estado físico a 25 °C y 1 bar y elementos sin isótopos estables (como en el póster «Sistema periódico y
 * configuración electrónica»). Fuentes: CRC Handbook (estados estándar) e IUPAC/NUBASE (estabilidad).
 * Para Z ≥ 100 solo se han producido unos pocos átomos: su estado no se ha medido y no se inventa.
 */
export type StandardState = 'solido' | 'liquido' | 'gas' | 'desconocido';

const GASES = new Set([1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86]);
const LIQUIDS = new Set([35, 80]);

export function standardState(z: number): StandardState {
  if (GASES.has(z)) return 'gas';
  if (LIQUIDS.has(z)) return 'liquido';
  if (z >= 100) return 'desconocido';
  return 'solido';
}

export const STATE_LABEL: Record<StandardState, string> = { solido: 'Sólido', liquido: 'Líquido', gas: 'Gas', desconocido: 'No medido (solo se han obtenido unos pocos átomos)' };

/**
 * Sin isótopos estables: Tc (43), Pm (61) y Z ≥ 84. El bismuto-209 se desintegra con un periodo de
 * ≈ 2·10¹⁹ años, así que a efectos prácticos (y en el póster) se considera estable.
 */
export function isRadioactive(z: number): boolean {
  return z === 43 || z === 61 || z >= 84;
}
