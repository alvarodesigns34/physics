/**
 * Números cuánticos (n, l, m_l, m_s): valores permitidos, validación razonada y recuentos.
 */

export const L_LETTERS = ['s', 'p', 'd', 'f', 'g', 'h', 'i', 'k'] as const;

export function lLetter(l: number): string {
  return L_LETTERS[l] ?? `l=${l}`;
}

export function lFromLetter(letter: string): number {
  return L_LETTERS.indexOf(letter.toLowerCase() as (typeof L_LETTERS)[number]);
}

export interface QuantumSet {
  n: number;
  l: number;
  ml: number;
  ms: number;
}

export type QuantumErrorCode = 'n-invalido' | 'l-fuera-de-rango' | 'ml-fuera-de-rango' | 'ms-invalido';

export interface QuantumError {
  code: QuantumErrorCode;
  message: string;
}

export interface QuantumValidation {
  valid: boolean;
  errors: QuantumError[];
  /** Orbital descrito, p. ej. «4d», si n y l son válidos. */
  orbital: string | null;
  /** Observación adicional (p. ej. subnivel válido pero no ocupado en ningún estado fundamental). */
  note: string | null;
}

export function validateQuantumSet(q: QuantumSet): QuantumValidation {
  const errors: QuantumError[] = [];
  if (!Number.isInteger(q.n) || q.n < 1) {
    errors.push({ code: 'n-invalido', message: `n debe ser un número entero positivo (1, 2, 3, …); ${q.n} no lo es.` });
  }
  const nOk = errors.length === 0;
  if (!Number.isInteger(q.l) || q.l < 0 || (nOk && q.l > q.n - 1)) {
    errors.push({
      code: 'l-fuera-de-rango',
      message: nOk
        ? `l solo puede valer de 0 a n − 1 = ${q.n - 1}; con n = ${q.n}, l = ${q.l} no es posible.`
        : `l debe ser un entero entre 0 y n − 1.`,
    });
  }
  const lOk = Number.isInteger(q.l) && q.l >= 0;
  if (!Number.isInteger(q.ml) || (lOk && Math.abs(q.ml) > q.l)) {
    errors.push({
      code: 'ml-fuera-de-rango',
      message: lOk
        ? `m_l va de −l a +l; con l = ${q.l} solo puede ser ${rangeText(-q.l, q.l)}, no ${q.ml}.`
        : `m_l debe ser un entero entre −l y +l.`,
    });
  }
  if (q.ms !== 0.5 && q.ms !== -0.5) {
    errors.push({ code: 'ms-invalido', message: `m_s solo puede valer +½ o −½; ${q.ms} no es posible.` });
  }
  const orbital = nOk && lOk && q.l <= q.n - 1 ? `${q.n}${lLetter(q.l)}` : null;
  let note: string | null = null;
  if (errors.length === 0 && q.l >= 4) {
    note = `Combinación permitida: describe un orbital ${orbital}. Ningún átomo conocido ocupa orbitales ${lLetter(q.l)} en su estado fundamental, pero la combinación es válida.`;
  }
  return { valid: errors.length === 0, errors, orbital, note };
}

function rangeText(a: number, b: number): string {
  const vals: string[] = [];
  for (let i = a; i <= b; i++) vals.push(i > 0 ? `+${i}` : String(i));
  return vals.join(', ');
}

/** Número de orbitales en un subnivel: 2l + 1. */
export function orbitalsInSubshell(l: number): number {
  return 2 * l + 1;
}

/** Electrones máximos en un subnivel: 2(2l + 1). */
export function subshellCapacity(l: number): number {
  return 2 * (2 * l + 1);
}

/** Orbitales en el nivel n: n². */
export function orbitalsInShell(n: number): number {
  return n * n;
}

/** Electrones máximos en el nivel n: 2n². */
export function shellCapacity(n: number): number {
  return 2 * n * n;
}

/** Lista de orbitales (n, l, m_l) de un nivel. */
export function orbitalsOfShell(n: number): { n: number; l: number; ml: number }[] {
  const out: { n: number; l: number; ml: number }[] = [];
  for (let l = 0; l < n; l++) for (let ml = -l; ml <= l; ml++) out.push({ n, l, ml });
  return out;
}

/** Todos los estados cuánticos (n, l, m_l, m_s) de un nivel: 2n². */
export function quantumStatesOfShell(n: number): QuantumSet[] {
  return orbitalsOfShell(n).flatMap((o) => [
    { ...o, ms: 0.5 },
    { ...o, ms: -0.5 },
  ]);
}
