/**
 * Números tal como los escribe un estudiante español: coma decimal, notación científica con
 * «·10^n», «x10^n», «×10⁻³⁴» o «e-34», espacios como separador de miles.
 * También recuento de cifras significativas y formato de salida en notación española.
 */

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+',
};

export interface ParsedNumber {
  value: number;
  /** Cifras significativas de la mantisa tal como se escribió. */
  sigFigs: number;
  /** true si hay ceros finales en un entero sin coma decimal (p. ej. «500»): su significación es ambigua. */
  ambiguousSigFigs: boolean;
}

function normalizeSuperscripts(s: string): string {
  let out = '';
  let inSup = false;
  for (const ch of s) {
    const sup = SUPERSCRIPTS[ch];
    if (sup !== undefined) {
      if (!inSup) out += '^';
      out += sup;
      inSup = true;
    } else {
      out += ch;
      inSup = false;
    }
  }
  return out;
}

/** Normaliza la mantisa: decide qué separador es decimal. Devuelve la mantisa con «.» decimal. */
function normalizeMantissa(m: string): string | null {
  let s = m.replace(/[\s   ']/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // El último separador es el decimal; el otro, de miles.
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    if ((s.match(/,/g) ?? []).length > 1) return null;
    s = s.replace(',', '.');
  } else if (hasDot) {
    if ((s.match(/\./g) ?? []).length > 1) return null;
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return s;
}

function countMantissaSigFigs(mantissa: string): { sig: number; ambiguous: boolean } {
  const unsigned = mantissa.replace(/^[+-]/, '');
  const hasPoint = unsigned.includes('.');
  const digits = unsigned.replace('.', '');
  const firstNonZero = digits.search(/[1-9]/);
  if (firstNonZero === -1) {
    // Cero: «0», «0,0», «0,00» → se cuentan los ceros tras la coma (convención habitual), mínimo 1.
    const decimals = hasPoint ? unsigned.split('.')[1]!.length : 0;
    return { sig: Math.max(1, decimals), ambiguous: false };
  }
  const significant = digits.slice(firstNonZero);
  if (hasPoint) return { sig: significant.length, ambiguous: false };
  const trimmed = significant.replace(/0+$/, '');
  return { sig: significant.length, ambiguous: trimmed.length !== significant.length };
}

/**
 * Interpreta un número escrito libremente. Devuelve null si no es un número válido.
 * Ejemplos válidos: «6,626·10^-34», «6.626e-34», «6,626 x 10-34», «3·10⁸», «1,0284·10⁷», «-13,6», «109 740».
 */
export function parseNumber(input: string): ParsedNumber | null {
  if (!input) return null;
  let s = normalizeSuperscripts(input.trim());
  s = s.replace(/[−–]/g, '-').replace(/\s*([·×xX*])\s*/g, '$1');
  // Notación «mantisa · 10^exp» con múltiples variantes
  const tenPow = s.match(/^(.+?)[·×xX*]10\s*(?:\^\s*\(?\s*([+-]?\d+)\s*\)?|([+-]\d+))$/);
  // Potencia pura de 10: «10^8», «10⁻⁹»
  const pureTen = s.match(/^([+-]?)10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?$/);
  let mantissaRaw: string;
  let exponent = 0;
  if (tenPow) {
    mantissaRaw = tenPow[1]!;
    exponent = parseInt(tenPow[2] ?? tenPow[3]!, 10);
  } else if (pureTen) {
    mantissaRaw = `${pureTen[1]}1`;
    exponent = parseInt(pureTen[2]!, 10);
  } else {
    const eNot = s.match(/^(.+?)[eE]\s*([+-]?\d+)$/);
    if (eNot) {
      mantissaRaw = eNot[1]!;
      exponent = parseInt(eNot[2]!, 10);
    } else {
      mantissaRaw = s;
    }
  }
  const mantissa = normalizeMantissa(mantissaRaw);
  if (mantissa === null) return null;
  const value = parseFloat(mantissa) * Math.pow(10, exponent);
  if (!Number.isFinite(value)) return null;
  const { sig, ambiguous } = countMantissaSigFigs(mantissa);
  // Una potencia pura de 10 («10^8») se considera exacta en la mantisa: 1 c.s.
  return { value, sigFigs: pureTen ? 1 : sig, ambiguousSigFigs: pureTen ? false : ambiguous };
}

/** Redondea a n cifras significativas. */
export function roundSig(value: number, sig: number): number {
  if (value === 0 || !Number.isFinite(value)) return value;
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, sig - 1 - exp);
  return Math.round(value * factor) / factor;
}

export interface SciParts {
  mantissa: string;
  exponent: number;
  negative: boolean;
}

/** Descompone un número en mantisa (con coma decimal) y exponente, con n cifras significativas. */
export function sciParts(value: number, sig = 4): SciParts {
  if (value === 0) return { mantissa: (0).toFixed(Math.max(0, sig - 1)).replace('.', ','), exponent: 0, negative: false };
  const negative = value < 0;
  const abs = Math.abs(value);
  let exp = Math.floor(Math.log10(abs));
  let m = abs / Math.pow(10, exp);
  let fixed = m.toFixed(Math.max(0, sig - 1));
  if (parseFloat(fixed) >= 10) {
    exp += 1;
    m = abs / Math.pow(10, exp);
    fixed = m.toFixed(Math.max(0, sig - 1));
  }
  return { mantissa: fixed.replace('.', ','), exponent: exp, negative };
}

const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export function toSuperscript(n: number | string): string {
  return String(n)
    .split('')
    .map((ch) => (ch === '-' ? '⁻' : ch === '+' ? '⁺' : /\d/.test(ch) ? SUP_DIGITS[Number(ch)]! : ch))
    .join('');
}
const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
export function toSubscript(n: number | string): string {
  return String(n)
    .split('')
    .map((ch) => (/\d/.test(ch) ? SUB_DIGITS[Number(ch)]! : ch))
    .join('');
}

/** Agrupa la parte entera en miles con espacio fino (norma española/SI). */
function groupThousands(intPart: string): string {
  if (intPart.length <= 4) return intPart; // la RAE/SI no agrupan números de 4 cifras
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export interface FormatOptions {
  sig?: number;
  /** Fuerza notación científica. Por defecto se usa si el exponente está fuera de [-3, 5]. */
  sci?: boolean;
}

/** Formatea en notación española: «6,00·10¹⁴», «656,5», «−13,6». */
export function formatNumber(value: number, opts: FormatOptions = {}): string {
  const sig = opts.sig ?? 4;
  if (!Number.isFinite(value)) return '—';
  const { mantissa, exponent, negative } = sciParts(value, sig);
  const useSci = opts.sci ?? (exponent < -3 || exponent > 5);
  const sign = negative ? '−' : '';
  if (useSci) return `${sign}${mantissa}·10${toSuperscript(exponent)}`;
  const rounded = Math.abs(roundSig(value, sig));
  const decimals = Math.max(0, sig - 1 - exponent);
  const [i, d] = rounded.toFixed(decimals).split('.');
  return `${sign}${groupThousands(i!)}${d ? ',' + d : ''}`;
}

/** Igualdad relativa con tolerancia. */
export function relClose(a: number, b: number, relTol: number): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale === 0) return true;
  return Math.abs(a - b) / scale <= relTol;
}

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
