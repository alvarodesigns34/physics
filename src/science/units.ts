/**
 * Unidades: análisis de lo que escribe el estudiante y conversión entre unidades de la misma magnitud.
 */
import { CODATA } from './constants';

export type Quantity =
  | 'longitud'
  | 'frecuencia'
  | 'tiempo'
  | 'energia'
  | 'energia-molar'
  | 'numero-ondas'
  | 'masa'
  | 'velocidad'
  | 'carga'
  | 'porcentaje'
  | 'adimensional';

export interface UnitDef {
  symbol: string;
  quantity: Quantity;
  /** Factor a la unidad SI de su magnitud. */
  toSI: number;
}

const U = (symbol: string, quantity: Quantity, toSI: number): UnitDef => ({ symbol, quantity, toSI });

/** Unidades canónicas (símbolo de presentación). */
export const UNITS: Record<string, UnitDef> = {
  m: U('m', 'longitud', 1),
  km: U('km', 'longitud', 1e3),
  cm: U('cm', 'longitud', 1e-2),
  mm: U('mm', 'longitud', 1e-3),
  'µm': U('µm', 'longitud', 1e-6),
  nm: U('nm', 'longitud', 1e-9),
  pm: U('pm', 'longitud', 1e-12),
  fm: U('fm', 'longitud', 1e-15),
  'Å': U('Å', 'longitud', 1e-10),
  Hz: U('Hz', 'frecuencia', 1),
  kHz: U('kHz', 'frecuencia', 1e3),
  MHz: U('MHz', 'frecuencia', 1e6),
  GHz: U('GHz', 'frecuencia', 1e9),
  THz: U('THz', 'frecuencia', 1e12),
  PHz: U('PHz', 'frecuencia', 1e15),
  's⁻¹': U('s⁻¹', 'frecuencia', 1),
  s: U('s', 'tiempo', 1),
  ms: U('ms', 'tiempo', 1e-3),
  'µs': U('µs', 'tiempo', 1e-6),
  ns: U('ns', 'tiempo', 1e-9),
  ps: U('ps', 'tiempo', 1e-12),
  fs: U('fs', 'tiempo', 1e-15),
  J: U('J', 'energia', 1),
  kJ: U('kJ', 'energia', 1e3),
  eV: U('eV', 'energia', CODATA.e),
  keV: U('keV', 'energia', CODATA.e * 1e3),
  MeV: U('MeV', 'energia', CODATA.e * 1e6),
  'J/mol': U('J/mol', 'energia-molar', 1),
  'kJ/mol': U('kJ/mol', 'energia-molar', 1e3),
  'm⁻¹': U('m⁻¹', 'numero-ondas', 1),
  'cm⁻¹': U('cm⁻¹', 'numero-ondas', 100),
  u: U('u', 'masa', CODATA.u),
  kg: U('kg', 'masa', 1),
  g: U('g', 'masa', 1e-3),
  'm/s': U('m/s', 'velocidad', 1),
  C: U('C', 'carga', 1),
  '%': U('%', 'porcentaje', 1),
  '': U('', 'adimensional', 1),
};

const ALIASES: Record<string, string> = {
  um: 'µm', 'μm': 'µm', micras: 'µm', micra: 'µm',
  A: 'Å', 'Å': 'Å', angstrom: 'Å', 'ångström': 'Å', amstrong: 'Å',
  hz: 'Hz', HZ: 'Hz', herzios: 'Hz', hercios: 'Hz', khz: 'kHz', mhz: 'MHz', ghz: 'GHz', thz: 'THz', phz: 'PHz',
  's^-1': 's⁻¹',
  '/s': 's⁻¹',
  '/m': 'm⁻¹',
  '/cm': 'cm⁻¹', 's-1': 's⁻¹', '1/s': 's⁻¹', 'seg^-1': 's⁻¹',
  'm^-1': 'm⁻¹', 'm-1': 'm⁻¹', '1/m': 'm⁻¹',
  'cm^-1': 'cm⁻¹', 'cm-1': 'cm⁻¹', '1/cm': 'cm⁻¹',
  ev: 'eV', EV: 'eV', Ev: 'eV', electronvoltios: 'eV', electronvoltio: 'eV',
  j: 'J', julios: 'J', julio: 'J', kj: 'kJ',
  'kj/mol': 'kJ/mol', 'KJ/mol': 'kJ/mol', 'kJ·mol^-1': 'kJ/mol', 'kJmol^-1': 'kJ/mol', 'kJ mol^-1': 'kJ/mol',
  'j/mol': 'J/mol',
  uma: 'u', 'u.m.a.': 'u', Da: 'u', unas: 'u',
  seg: 's', segundos: 's', segundo: 's',
  metros: 'm', metro: 'm', nanometros: 'nm', 'nanómetros': 'nm', picometros: 'pm', 'picómetros': 'pm',
  'm·s^-1': 'm/s', 'ms^-1': 'm/s', 'm s^-1': 'm/s',
};

function normalizeUnitText(raw: string): string {
  return raw
    .trim()
    .replace(/⁻¹/g, '^-1')
    .replace(/⁻/g, '^-')
    .replace(/¹/g, '1')
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\((.*)\)$/, '$1');
}

/** Devuelve la unidad reconocida o null. La cadena vacía es «sin unidad». */
export function parseUnit(raw: string): UnitDef | null {
  const s = normalizeUnitText(raw);
  if (s === '') return UNITS['']!;
  const direct = UNITS[s] ?? UNITS[s.replace('^-1', '⁻¹')];
  if (direct) return direct;
  const alias = ALIASES[s] ?? ALIASES[s.replace(/\s/g, '')] ?? ALIASES[s.toLowerCase()];
  if (alias) return UNITS[alias] ?? null;
  return null;
}

/** Convierte un valor entre unidades de la misma magnitud. Lanza si no son compatibles. */
export function convert(value: number, from: UnitDef | string, to: UnitDef | string): number {
  const f = typeof from === 'string' ? UNITS[from] : from;
  const t = typeof to === 'string' ? UNITS[to] : to;
  if (!f || !t) throw new Error(`Unidad desconocida: ${String(from)} → ${String(to)}`);
  if (f.quantity !== t.quantity) throw new Error(`Magnitudes incompatibles: ${f.symbol} (${f.quantity}) → ${t.symbol} (${t.quantity})`);
  return (value * f.toSI) / t.toSI;
}

export const QUANTITY_LABEL: Record<Quantity, string> = {
  longitud: 'longitud',
  frecuencia: 'frecuencia',
  tiempo: 'tiempo',
  energia: 'energía',
  'energia-molar': 'energía por mol',
  'numero-ondas': 'número de ondas',
  masa: 'masa',
  velocidad: 'velocidad',
  carga: 'carga',
  porcentaje: 'porcentaje',
  adimensional: 'sin unidades',
};

/**
 * Separa «6,0·10^14 Hz» en número y unidad. Busca la unidad al final de la cadena.
 */
export function splitValueAndUnit(input: string): { numberText: string; unitText: string } {
  // «10^{14}» (estilo LaTeX) → «10^14» antes de separar número y unidad.
  const s = input.trim().replace(/\^\s*\{\s*([+−–-]?\s*\d+)\s*\}/g, '^$1');
  // La unidad empieza en la primera letra (o µ, Å) que no forme parte de «e» exponencial ni de «x10».
  const m = s.match(/^(.*?[\d)⁰¹²³⁴⁵⁶⁷⁸⁹])\s*([a-zA-ZµμÅ/%][^]*)?$/);
  if (!m) return { numberText: s, unitText: '' };
  let numberText = m[1]!;
  let unitText = (m[2] ?? '').trim();
  // Caso «6e-34 J»: la regex ya separa. Caso «6,6 e -34»: unir.
  if (/^[eE]\s*[+-]?\d/.test(unitText)) {
    const exp = unitText.match(/^[eE]\s*[+-]?\d+/)![0];
    numberText += exp.replace(/\s/g, '');
    unitText = unitText.slice(exp.length).trim();
  }
  // Caso «3 x 10^8 m/s»: la mantisa «3» termina en dígito y la unidad empezaría en «x»: unir.
  if (/^[xX]\s*10/.test(unitText)) {
    const pow = unitText.match(/^[xX]\s*10\s*(\^\s*\(?\s*[+-]?\d+\s*\)?|[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+|[+-]\d+)/);
    if (pow) {
      numberText += pow[0].trim();
      unitText = unitText.slice(pow[0].length).trim();
    }
  }
  return { numberText, unitText };
}
