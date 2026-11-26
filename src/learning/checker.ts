/**
 * Corrector: interpreta la respuesta escrita y devuelve una retroalimentación razonada.
 */
import { parseNumber, relClose, formatNumber } from '../science/numbers';
import { convert, parseUnit, splitValueAndUnit, UNITS, QUANTITY_LABEL } from '../science/units';
import { elementByZ, ELEMENTS } from '../science/elements';
import { diagnoseConfiguration, STATUS_LABEL } from '../science/configuration';
import { validateQuantumSet } from '../science/quantum';
import type { AnswerSpec, CheckResult, ErrorKind, SkillId } from './types';

const ok = (message: string, warnings: string[] = [], numericValue?: number): CheckResult => ({ status: 'correcto', correct: true, message, warnings, numericValue });
const bad = (message: string, warnings: string[] = [], numericValue?: number, errorKind?: ErrorKind, errorSkill?: SkillId): CheckResult => ({ status: 'incorrecto', correct: false, message, warnings, numericValue, errorKind, errorSkill: errorSkill ?? (errorKind ? SKILL_OF_ERROR[errorKind] : undefined) });

/** Competencia que revela cada tipo de error. */
export const SKILL_OF_ERROR: Record<ErrorKind, SkillId | undefined> = {
  'unidad-falta': 'unidades',
  'unidad-incompatible': 'unidades',
  'orden-de-magnitud': 'unidades',
  signo: 'calculo',
  inverso: 'formula',
  'idea-erronea': 'formula',
  redondeo: 'calculo',
  calculo: 'calculo',
  cifras: 'cifras',
  incompleto: 'concepto',
  regla: 'notacion',
  concepto: 'concepto',
  formato: undefined,
};
const format = (message: string): CheckResult => ({ status: 'formato', correct: false, message, warnings: [], errorKind: 'formato' });
const empty: CheckResult = { status: 'vacio', correct: false, message: 'Escribe una respuesta.', warnings: [] };

function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export interface CheckContext {
  /** Valores numéricos que el alumno dio en pasos anteriores (por id de paso), si los falló. */
  previousWrong?: Record<string, number>;
}

export function checkAnswer(spec: AnswerSpec, input: string | string[], ctx: CheckContext = {}): CheckResult {
  switch (spec.kind) {
    case 'numeric':
      return checkNumeric(spec, String(input), ctx);
    case 'integer':
      return checkInteger(spec.value, String(input));
    case 'choice':
      return checkChoice(spec, Array.isArray(input) ? input : [input]);
    case 'element':
      return checkElement(spec.z, String(input));
    case 'config':
      return checkConfig(spec, String(input));
    case 'order':
      return checkOrder(spec, Array.isArray(input) ? input : String(input).split(','));
    case 'quantum':
      return checkQuantum(spec, String(input));
  }
}

type NumericSpec = Extract<AnswerSpec, { kind: 'numeric' }>;

function checkNumeric(spec: NumericSpec, input: string, ctx: CheckContext): CheckResult {
  if (!input.trim()) return empty;
  const { numberText, unitText } = splitValueAndUnit(input);
  const parsed = parseNumber(numberText);
  if (!parsed) return format('No consigo leer el número. Escribe, por ejemplo, 6,0·10^14 o 6,0e14.');
  const expectedUnit = UNITS[spec.unit];
  if (!expectedUnit) throw new Error(`Unidad no registrada: ${spec.unit}`);
  const warnings: string[] = [];
  let value = parsed.value;

  if (unitText === '') {
    if (expectedUnit.quantity !== 'adimensional') {
      const close = relClose(value, spec.value, spec.relTol ?? 0.01);
      return bad(close ? `El número es correcto, pero falta la unidad (${expectedUnit.symbol}). Una magnitud física sin unidad no está completa.` : `Falta la unidad. Se pide una ${QUANTITY_LABEL[expectedUnit.quantity]} en ${expectedUnit.symbol}.`, [], value, 'unidad-falta');
    }
  } else {
    const unit = parseUnit(unitText);
    if (!unit) return format(`No reconozco la unidad «${unitText}». Se espera ${expectedUnit.symbol || 'un número sin unidades'}.`);
    if (unit.quantity !== expectedUnit.quantity) {
      return bad(`«${unit.symbol}» es una unidad de ${QUANTITY_LABEL[unit.quantity]}, pero aquí se pide una ${QUANTITY_LABEL[expectedUnit.quantity]} (en ${expectedUnit.symbol}).`, [], undefined, 'unidad-incompatible');
    }
    value = convert(value, unit, expectedUnit);
    if (unit.symbol !== expectedUnit.symbol) warnings.push(`Has respondido en ${unit.symbol}; es equivalente, pero el enunciado pide ${expectedUnit.symbol}.`);
  }

  const tol = spec.relTol ?? 0.01;
  // Valor esperado, con posible arrastre de error de un paso previo
  let expected = spec.value;
  let carried = false;
  if (spec.recompute && ctx.previousWrong && spec.recompute.from in ctx.previousWrong) {
    const alt = spec.recompute.fn(ctx.previousWrong[spec.recompute.from]!);
    if (Number.isFinite(alt) && relClose(value, alt, tol) && !relClose(value, spec.value, tol)) {
      expected = alt;
      carried = true;
    }
  }

  if (relClose(value, expected, tol)) {
    const before = warnings.length;
    if (spec.sigFigs !== undefined && !parsed.ambiguousSigFigs) {
      if (parsed.sigFigs > spec.sigFigs + 2) warnings.push(`Das ${parsed.sigFigs} cifras significativas; con los datos del enunciado bastan unas ${spec.sigFigs}.`);
      else if (parsed.sigFigs < spec.sigFigs - 1) warnings.push(`Con ${parsed.sigFigs} cifra${parsed.sigFigs === 1 ? '' : 's'} significativa${parsed.sigFigs === 1 ? '' : 's'} pierdes precisión; los datos permiten unas ${spec.sigFigs}.`);
    }
    // Respuesta correcta con cifras significativas inadecuadas: es correcta, pero aporta evidencia negativa sobre «cifras».
    const sigIssue = warnings.length > before ? ({ errorKind: 'cifras', errorSkill: 'cifras' } as const) : {};
    if (carried) {
      return { status: 'correcto-arrastre', correct: true, message: 'El cálculo es correcto con el resultado que obtuviste en el paso anterior, aunque aquel resultado era erróneo.', warnings, numericValue: value, ...sigIssue };
    }
    return { ...ok('Correcto.', warnings, value), ...sigIssue };
  }

  for (const m of spec.misconceptions ?? []) {
    if (m.test(value)) return bad(m.message, warnings, value, 'idea-erronea', m.skill ?? 'formula');
  }
  // Detectores genéricos
  if (value !== 0 && expected !== 0) {
    if (relClose(-value, expected, tol)) return bad('El valor absoluto es correcto, pero el signo no. Revisa qué magnitud es positiva por definición.', warnings, value, 'signo');
    const ratio = value / expected;
    const k = Math.round(Math.log10(Math.abs(ratio)));
    if (k !== 0 && relClose(Math.abs(ratio), Math.pow(10, k), tol)) {
      return bad(`Las cifras son correctas, pero el resultado es 10${k > 0 ? '' : '⁻'}${String(Math.abs(k)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!)} veces ${k > 0 ? 'mayor' : 'menor'}: revisa la conversión de unidades (nm, cm, m…) o el exponente.`, warnings, value, 'orden-de-magnitud');
    }
    if (relClose(value * expected, 1, tol * 2)) return bad('Has obtenido el inverso del resultado: revisa si debes dividir o invertir.', warnings, value, 'inverso');
    // Muy cerca pero fuera de la tolerancia: redondeo prematuro de resultados intermedios o de constantes.
    if (relClose(value, expected, Math.max(0.05, tol * 4))) {
      const pct = (Math.abs(value - expected) / Math.abs(expected)) * 100;
      return bad(`Te acercas (difieres un ${formatNumber(pct, { sig: 2 })} %), pero no basta: suele deberse a redondear demasiado pronto un resultado intermedio o a usar una constante distinta de la del enunciado. Arrastra al menos 4 cifras en los cálculos intermedios.`, warnings, value, 'redondeo');
    }
  }
  return bad(`No es correcto. Tu resultado es ${formatNumber(value, { sig: 4 })} ${expectedUnit.symbol}.`, warnings, value, 'calculo');
}

function checkInteger(expected: number, input: string): CheckResult {
  if (!input.trim()) return empty;
  let t = input.trim().replace(/[−–]/g, '-').replace(',', '.').replace(/\s/g, '');
  const trailing = t.match(/^(\d+)([+-])$/);
  if (trailing) t = `${trailing[2]}${trailing[1]}`;
  const n = Number(t);
  if (!Number.isFinite(n)) return format('Escribe un número entero.');
  if (!Number.isInteger(n)) return bad('Aquí se espera un número entero.');
  return n === expected ? ok('Correcto.') : bad(`No es ${n}.`, [], n, n === -expected ? 'signo' : 'concepto');
}

function checkChoice(spec: Extract<AnswerSpec, { kind: 'choice' }>, chosen: string[]): CheckResult {
  const sel = chosen.filter(Boolean);
  if (sel.length === 0) return empty;
  const want = new Set(spec.correct);
  const got = new Set(sel);
  const correct = want.size === got.size && [...want].every((x) => got.has(x));
  if (correct) return ok('Correcto.');
  const wrongPick = sel.find((id) => !want.has(id));
  const fb = wrongPick ? spec.options.find((o) => o.id === wrongPick)?.feedback : undefined;
  if (spec.multiple && [...got].every((x) => want.has(x))) return bad('Lo que has marcado es correcto, pero falta alguna opción.', [], undefined, 'incompleto');
  if (fb) return bad(fb, [], undefined, 'concepto');
  return bad('No es correcto.', [], undefined, 'concepto');
}

function checkElement(z: number, input: string): CheckResult {
  if (!input.trim()) return empty;
  const t = normalizeText(input);
  const match = ELEMENTS.find((e) => e.symbol.toLowerCase() === t || normalizeText(e.name) === t);
  const target = elementByZ(z)!;
  if (!match) return format('No reconozco ese elemento. Escribe su símbolo (p. ej. «Na») o su nombre.');
  if (match.z === z) return ok(`Correcto: ${target.name} (${target.symbol}).`);
  return bad(`${match.name} (${match.symbol}) tiene Z = ${match.z}; se busca Z = ${z}.`, [], undefined, 'concepto');
}

function checkConfig(spec: Extract<AnswerSpec, { kind: 'config' }>, input: string): CheckResult {
  if (!input.trim()) return empty;
  const d = diagnoseConfiguration(input, { z: spec.z, expectedElectrons: spec.electrons });
  if (d.status === 'ilegible') return format(d.issues[0]?.message ?? 'No se entiende la configuración.');
  const infos = d.issues.filter((i) => i.severity === 'info').map((i) => i.message);
  if (d.status === 'fundamental' && d.electrons === spec.electrons) return ok('Correcto: es la configuración del estado fundamental.', infos);
  const errors = d.issues.filter((i) => i.severity !== 'info').map((i) => i.message);
  const head = d.electrons !== spec.electrons && d.status !== 'imposible' && d.status !== 'prohibido' ? '' : `${STATUS_LABEL[d.status]}. `;
  return bad(`${head}${errors.join(' ')}`.trim() || `${STATUS_LABEL[d.status]}.`, infos, undefined, 'regla', 'notacion');
}

function checkOrder(spec: Extract<AnswerSpec, { kind: 'order' }>, order: string[]): CheckResult {
  if (order.length !== spec.correctOrder.length) return empty;
  const firstWrong = order.findIndex((id, i) => id !== spec.correctOrder[i]);
  if (firstWrong === -1) return ok('Correcto.');
  const item = spec.items.find((i) => i.id === order[firstWrong]);
  return bad(item?.feedback ?? `La posición ${firstWrong + 1} no es correcta.`, [], undefined, 'concepto', 'razonamiento');
}

/** Lee «(3, 1, −1, +1/2)», «3 1 -1 -½» o «3,1,-1,+0.5» y comprueba que describe un electrón del subnivel pedido. */
export function parseQuantumTuple(input: string): [number, number, number, number] | null {
  const t = input
    .replace(/[()\[\]]/g, ' ')
    .replace(/[−–]/g, '-')
    .replace(/½/g, '1/2')
    .trim();
  const parts = t.split(/\s*[;,]\s*|\s+/).filter(Boolean);
  if (parts.length !== 4) return null;
  const num = (x: string) => {
    if (/^[+-]?\d+\/\d+$/.test(x)) {
      const [a, b] = x.split('/');
      return Number(a) / Number(b);
    }
    const v = Number(x.replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  };
  const vals = parts.map(num);
  if (vals.some((v) => Number.isNaN(v))) return null;
  return vals as [number, number, number, number];
}

function checkQuantum(spec: Extract<AnswerSpec, { kind: 'quantum' }>, input: string): CheckResult {
  if (!input.trim()) return empty;
  const q = parseQuantumTuple(input);
  if (!q) return format('Escribe cuatro números: (n, l, m_l, m_s), por ejemplo (3, 1, −1, +1/2).');
  const [n, l, ml, ms] = q;
  const v = validateQuantumSet({ n, l, ml, ms });
  if (!v.valid) return bad(`Esa combinación no es posible: ${v.errors.map((e) => e.message).join(' ')}`, [], undefined, 'regla', 'notacion');
  if (n !== spec.n || l !== spec.l) return bad(`Es una combinación válida, pero describe un electrón ${v.orbital}, no ${spec.n}${'spdf'[spec.l]}. Para ${spec.n}${'spdf'[spec.l]}: n = ${spec.n} y l = ${spec.l}.`, [], undefined, 'concepto');
  return ok(`Correcto: n = ${n} (nivel), l = ${l} (subnivel ${'spdf'[l]}), m_l = ${ml} (uno de los ${2 * l + 1} orbitales) y m_s = ${ms > 0 ? '+' : '−'}½.`);
}
