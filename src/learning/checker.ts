/**
 * Corrector: interpreta la respuesta escrita y devuelve una retroalimentación razonada.
 */
import { parseNumber, relClose, formatNumber } from '../science/numbers';
import { convert, parseUnit, splitValueAndUnit, UNITS, QUANTITY_LABEL } from '../science/units';
import { elementByZ, ELEMENTS } from '../science/elements';
import { diagnoseConfiguration, STATUS_LABEL } from '../science/configuration';
import type { AnswerSpec, CheckResult } from './types';

const ok = (message: string, warnings: string[] = [], numericValue?: number): CheckResult => ({ status: 'correcto', correct: true, message, warnings, numericValue });
const bad = (message: string, warnings: string[] = [], numericValue?: number): CheckResult => ({ status: 'incorrecto', correct: false, message, warnings, numericValue });
const format = (message: string): CheckResult => ({ status: 'formato', correct: false, message, warnings: [] });
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
      return bad(close ? `El número es correcto, pero falta la unidad (${expectedUnit.symbol}). Una magnitud física sin unidad no está completa.` : `Falta la unidad. Se pide una ${QUANTITY_LABEL[expectedUnit.quantity]} en ${expectedUnit.symbol}.`);
    }
  } else {
    const unit = parseUnit(unitText);
    if (!unit) return format(`No reconozco la unidad «${unitText}». Se espera ${expectedUnit.symbol || 'un número sin unidades'}.`);
    if (unit.quantity !== expectedUnit.quantity) {
      return bad(`«${unit.symbol}» es una unidad de ${QUANTITY_LABEL[unit.quantity]}, pero aquí se pide una ${QUANTITY_LABEL[expectedUnit.quantity]} (en ${expectedUnit.symbol}).`);
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
    if (spec.sigFigs !== undefined && !parsed.ambiguousSigFigs) {
      if (parsed.sigFigs > spec.sigFigs + 2) warnings.push(`Das ${parsed.sigFigs} cifras significativas; con los datos del enunciado bastan unas ${spec.sigFigs}.`);
      else if (parsed.sigFigs < spec.sigFigs - 1) warnings.push(`Con ${parsed.sigFigs} cifra${parsed.sigFigs === 1 ? '' : 's'} significativa${parsed.sigFigs === 1 ? '' : 's'} pierdes precisión; los datos permiten unas ${spec.sigFigs}.`);
    }
    if (carried) {
      return { status: 'correcto-arrastre', correct: true, message: 'El cálculo es correcto con el resultado que obtuviste en el paso anterior, aunque aquel resultado era erróneo.', warnings, numericValue: value };
    }
    return ok('Correcto.', warnings, value);
  }

  for (const m of spec.misconceptions ?? []) {
    if (m.test(value)) return bad(m.message, warnings, value);
  }
  // Detectores genéricos
  if (value !== 0 && expected !== 0) {
    if (relClose(-value, expected, tol)) return bad('El valor absoluto es correcto, pero el signo no. Revisa qué magnitud es positiva por definición.', warnings, value);
    const ratio = value / expected;
    const k = Math.round(Math.log10(Math.abs(ratio)));
    if (k !== 0 && relClose(Math.abs(ratio), Math.pow(10, k), tol)) {
      return bad(`Las cifras son correctas, pero el resultado es 10${k > 0 ? '' : '⁻'}${String(Math.abs(k)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]!)} veces ${k > 0 ? 'mayor' : 'menor'}: revisa la conversión de unidades (nm, cm, m…) o el exponente.`, warnings, value);
    }
    if (relClose(value * expected, 1, tol * 2)) return bad('Has obtenido el inverso del resultado: revisa si debes dividir o invertir.', warnings, value);
  }
  return bad(`No es correcto. Tu resultado es ${formatNumber(value, { sig: 4 })} ${expectedUnit.symbol}.`, warnings, value);
}

function checkInteger(expected: number, input: string): CheckResult {
  if (!input.trim()) return empty;
  let t = input.trim().replace(/[−–]/g, '-').replace(',', '.').replace(/\s/g, '');
  const trailing = t.match(/^(\d+)([+-])$/);
  if (trailing) t = `${trailing[2]}${trailing[1]}`;
  const n = Number(t);
  if (!Number.isFinite(n)) return format('Escribe un número entero.');
  if (!Number.isInteger(n)) return bad('Aquí se espera un número entero.');
  return n === expected ? ok('Correcto.') : bad(`No es ${n}.`);
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
  if (fb) return bad(fb);
  if (spec.multiple && [...got].every((x) => want.has(x))) return bad('Lo que has marcado es correcto, pero falta alguna opción.');
  return bad('No es correcto.');
}

function checkElement(z: number, input: string): CheckResult {
  if (!input.trim()) return empty;
  const t = normalizeText(input);
  const match = ELEMENTS.find((e) => e.symbol.toLowerCase() === t || normalizeText(e.name) === t);
  const target = elementByZ(z)!;
  if (!match) return format('No reconozco ese elemento. Escribe su símbolo (p. ej. «Na») o su nombre.');
  if (match.z === z) return ok(`Correcto: ${target.name} (${target.symbol}).`);
  return bad(`${match.name} (${match.symbol}) tiene Z = ${match.z}; se busca Z = ${z}.`);
}

function checkConfig(spec: Extract<AnswerSpec, { kind: 'config' }>, input: string): CheckResult {
  if (!input.trim()) return empty;
  const d = diagnoseConfiguration(input, { z: spec.z, expectedElectrons: spec.electrons });
  if (d.status === 'ilegible') return format(d.issues[0]?.message ?? 'No se entiende la configuración.');
  const infos = d.issues.filter((i) => i.severity === 'info').map((i) => i.message);
  if (d.status === 'fundamental' && d.electrons === spec.electrons) return ok('Correcto: es la configuración del estado fundamental.', infos);
  const errors = d.issues.filter((i) => i.severity !== 'info').map((i) => i.message);
  const head = d.electrons !== spec.electrons && d.status !== 'imposible' && d.status !== 'prohibido' ? '' : `${STATUS_LABEL[d.status]}. `;
  return bad(`${head}${errors.join(' ')}`.trim() || `${STATUS_LABEL[d.status]}.`, infos);
}

function checkOrder(spec: Extract<AnswerSpec, { kind: 'order' }>, order: string[]): CheckResult {
  if (order.length !== spec.correctOrder.length) return empty;
  const firstWrong = order.findIndex((id, i) => id !== spec.correctOrder[i]);
  if (firstWrong === -1) return ok('Correcto.');
  const item = spec.items.find((i) => i.id === order[firstWrong]);
  return bad(item?.feedback ?? `La posición ${firstWrong + 1} no es correcta.`);
}
