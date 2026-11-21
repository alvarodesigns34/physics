import { RAW_ELEMENTS } from './data/elements.raw';
import { EV_TO_KJ_PER_MOL } from './constants';

export type Block = 's' | 'p' | 'd' | 'f';
export type Category =
  | 'alcalino'
  | 'alcalinoterreo'
  | 'transicion'
  | 'lantanido'
  | 'actinido'
  | 'otro-metal'
  | 'semimetal'
  | 'no-metal'
  | 'halogeno'
  | 'gas-noble';

export interface ElementRecord {
  z: number;
  symbol: string;
  name: string;
  /** Masa atómica estándar (u) o, si no existe, masa del isótopo más estable. */
  atomicWeight: number;
  /** true si IUPAC/CIAAW publica un peso atómico estándar. */
  hasStandardWeight: boolean;
  period: number;
  /** Grupo IUPAC 1–18; null para lantánidos y actínidos de las filas f. */
  group: number | null;
  block: Block;
  category: Category;
  /** Configuración fundamental de referencia, p. ej. «[Ar] 3d5 4s1». */
  groundConfigText: string;
  /** Configuración predicha (no medida) para Z > 103. */
  configPredicted: boolean;
  electronegativity: number | null;
  /** 1.ª energía de ionización (eV). */
  ie1: number | null;
  /** 2.ª energía de ionización (eV). */
  ie2: number | null;
  /** Afinidad electrónica (eV); null si el anión no es estable (AE ≤ 0). */
  electronAffinity: number | null;
  /** Radio covalente de enlace simple (pm), Pyykkö y Atsumi (2009). */
  covalentRadius: number | null;
  layout: { row: number; col: number };
  /** Radios cristalinos de Shannon, NC = 6: [carga, pm]. */
  ionicRadii: ReadonlyArray<readonly [number, number]>;
}

export const ELEMENTS: readonly ElementRecord[] = RAW_ELEMENTS.map((r) => ({
  z: r[0],
  symbol: r[1],
  name: r[2],
  atomicWeight: r[3],
  hasStandardWeight: r[4],
  period: r[5],
  group: r[6],
  block: r[7],
  category: r[8] as Category,
  groundConfigText: r[9],
  configPredicted: r[10],
  electronegativity: r[11],
  ie1: r[12],
  ie2: r[13],
  electronAffinity: r[14],
  covalentRadius: r[15],
  layout: { row: r[16], col: r[17] },
  ionicRadii: r[18],
}));

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol.toLowerCase(), e]));

export function elementByZ(z: number): ElementRecord | undefined {
  return ELEMENTS[z - 1];
}

export function elementBySymbol(symbol: string): ElementRecord | undefined {
  return BY_SYMBOL.get(symbol.trim().toLowerCase());
}

export function requireElement(z: number): ElementRecord {
  const e = elementByZ(z);
  if (!e) throw new Error(`No existe el elemento Z = ${z}`);
  return e;
}

export const MAX_Z = ELEMENTS.length;

export const CATEGORY_LABEL: Record<Category, string> = {
  alcalino: 'Metal alcalino',
  alcalinoterreo: 'Metal alcalinotérreo',
  transicion: 'Metal de transición',
  lantanido: 'Lantánido',
  actinido: 'Actínido',
  'otro-metal': 'Otro metal',
  semimetal: 'Semimetal',
  'no-metal': 'No metal',
  halogeno: 'Halógeno',
  'gas-noble': 'Gas noble',
};

const GROUP_FAMILY: Record<number, string> = {
  1: 'Alcalinos',
  2: 'Alcalinotérreos',
  13: 'Térreos (boroideos)',
  14: 'Carbonoideos',
  15: 'Nitrogenoideos',
  16: 'Anfígenos (calcógenos)',
  17: 'Halógenos',
  18: 'Gases nobles',
};

/** Nombre de la familia del grupo. El hidrógeno está en el grupo 1 pero no es un metal alcalino. */
export function familyName(el: ElementRecord): string {
  if (el.z === 1) return 'Hidrógeno (grupo 1, no metal)';
  if (el.group === null) return el.category === 'lantanido' ? 'Lantánidos' : 'Actínidos';
  if (el.group >= 3 && el.group <= 12) return 'Metales de transición';
  return GROUP_FAMILY[el.group] ?? '';
}

export function ieKJPerMol(eV: number): number {
  return eV * EV_TO_KJ_PER_MOL;
}

export const NOBLE_GASES = [2, 10, 18, 36, 54, 86, 118] as const;

/** Masa atómica para mostrar: estándar con 4 decimales significativos o [A] si no tiene peso estándar. */
export function displayWeight(el: ElementRecord): string {
  if (!el.hasStandardWeight) return `[${Math.round(el.atomicWeight)}]`;
  return el.atomicWeight.toLocaleString('es-ES', { maximumFractionDigits: 3 });
}
