/**
 * ATOM 5.0 · Procedimiento escrito: el alumno escribe sus pasos y ATOM localiza el PRIMER punto en que el
 * cálculo deja de ser correcto (operación mal hecha, conversión de unidades errónea o valor intermedio
 * distinto del esperado).
 *
 * Seguridad: nunca se evalúa código del usuario. Las expresiones se analizan con un analizador
 * descendente recursivo propio que solo admite números, + − × · * / ÷ ^, potencias de 10, superíndices,
 * paréntesis, √/sqrt, π y unidades al final de cada miembro.
 *
 * Formato admitido (una igualdad o cadena de igualdades por línea):
 *   1/λ = 1,097·10^7·(1/4 − 1/9) = 1,524·10^6 m⁻¹
 *   λ = 1/1,524e6 = 6,562·10^-7 m = 656,2 nm
 * Un miembro que empieza por letras sin números («1/λ», «λ», «E») es una etiqueta, no se evalúa.
 */
import { parseUnit, type UnitDef } from '../science/units';
import type { Exercise } from './types';
import { formatNumber } from '../science/numbers';

// ── Expresiones ─────────────────────────────────────────────────────────────

const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };

/** Normaliza la notación habitual de clase a una forma única. */
export function normalizeExpr(raw: string): string {
  let s = raw.trim();
  // Superíndices → ^(…)
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) => `^(${[...m].map((c) => SUP[c]).join('')})`);
  s = s.replace(/[×·∙•]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/\*\*/g, '^');
  s = s.replace(/√/g, 'sqrt').replace(/\bπ\b|π/g, 'pi');
  // Coma decimal entre dígitos → punto (la coma no se usa como separador de argumentos aquí)
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  // Espacios dentro de números agrupados («109 677») → sin espacio
  s = s.replace(/(\d) (?=\d{3}\b)/g, '$1');
  // «mantisa·10^n» es UN número en la notación de clase: 1/1,524·10^6 = 1/(1,524·10⁶), no (1/1,524)·10⁶.
  s = s.replace(/(\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?/g, '($1e$2)');
  return s;
}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'id'; v: string };

function tokenize(s: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === ' ') {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
    if (num) {
      out.push({ t: 'num', v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    const id = /^[a-zA-Z]+/.exec(s.slice(i));
    if (id) {
      out.push({ t: 'id', v: id[0] });
      i += id[0].length;
      continue;
    }
    return null;
  }
  return out;
}

/** Evalúa una expresión aritmética; null si no es una expresión numérica válida. */
export function evalExpr(raw: string): number | null {
  const toks = tokenize(normalizeExpr(raw));
  if (!toks || !toks.length) return null;
  let p = 0;
  const peek = () => toks[p];
  const eat = (v: string) => (peek()?.t === 'op' && peek()!.v === v ? (p++, true) : false);
  // Gramática: expr = term (('+'|'-') term)* ; term = unary (('*'|'/'|implícito) unary)* ;
  // unary = ('-'|'+') unary | power ; power = atom ('^' unary)? ; atom = num | pi | sqrt( expr ) | ( expr )
  const expr = (): number | null => {
    let v = term();
    while (v !== null && (peek()?.v === '+' || peek()?.v === '-') && peek()?.t === 'op') {
      const op = toks[p++]!.v;
      const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = (): number | null => {
    let v = unary();
    for (;;) {
      if (v === null) return null;
      if (eat('*')) {
        const r = unary();
        if (r === null) return null;
        v *= r;
      } else if (eat('/')) {
        const r = unary();
        if (r === null) return null;
        v /= r;
      } else if (peek() && (peek()!.t === 'num' || peek()!.t === 'id' || peek()!.v === '(')) {
        // Multiplicación implícita: 2(3) o 2pi
        const r = unary();
        if (r === null) return null;
        v *= r;
      } else return v;
    }
  };
  const unary = (): number | null => {
    if (eat('-')) {
      const v = unary();
      return v === null ? null : -v;
    }
    if (eat('+')) return unary();
    return power();
  };
  const power = (): number | null => {
    const b = atom();
    if (b === null) return null;
    if (eat('^')) {
      const e = unary();
      return e === null ? null : Math.pow(b, e);
    }
    return b;
  };
  const atom = (): number | null => {
    const t = peek();
    if (!t) return null;
    if (t.t === 'num') {
      p++;
      return t.v;
    }
    if (t.t === 'id') {
      p++;
      if (t.v === 'pi') return Math.PI;
      if (t.v === 'sqrt' || t.v === 'raiz') {
        if (!eat('(')) return null;
        const v = expr();
        if (v === null || !eat(')')) return null;
        return Math.sqrt(v);
      }
      return null;
    }
    if (eat('(')) {
      const v = expr();
      if (v === null || !eat(')')) return null;
      return v;
    }
    return null;
  };
  const v = expr();
  if (v === null || p !== toks.length || !Number.isFinite(v)) return null;
  return v;
}

// ── Miembros con unidad ─────────────────────────────────────────────────────

export interface Member {
  text: string;
  /** Etiqueta no evaluable («λ», «1/λ», «E(J)») */
  label: boolean;
  value?: number;
  unit?: UnitDef;
  /** Valor en el SI (si la unidad es conocida) */
  si?: number;
}

/** Separa «6,56·10^-7 m» en expresión y unidad; reconoce la unidad solo si está registrada. */
export function parseMember(text: string): Member {
  const t = text.trim();
  if (!/\d/.test(t)) return { text: t, label: true };
  // Probar a quitar una unidad del final (la más larga que se reconozca)
  const m = /^(.*?)[\s]*([a-zA-ZµμÅ°%][a-zA-ZµμÅ°%·*/^⁻¹²³0-9-]*)$/.exec(t);
  if (m) {
    const unit = parseUnit(m[2]!);
    const v = evalExpr(m[1]!);
    if (unit && v !== null) return { text: t, label: false, value: v, unit, si: v * unit.toSI };
  }
  const v = evalExpr(t);
  if (v !== null) return { text: t, label: false, value: v };
  return { text: t, label: true };
}

// ── Verificación de un procedimiento ────────────────────────────────────────

export interface Checkpoint {
  /** Qué representa («1/λ», «λ en m», «E del fotón») */
  label: string;
  /** Valor esperado en el SI */
  si: number;
}

export type StepIssue =
  | { kind: 'aritmetica'; line: number; from: string; to: string; expected: number; got: number }
  | { kind: 'unidades'; line: number; from: string; to: string }
  | { kind: 'no-entiendo'; line: number; text: string }
  | { kind: 'final'; got: number; expected: number };

export interface ProcedureReport {
  lines: { text: string; ok: boolean; checkpoint?: string }[];
  /** Primer problema encontrado (el punto donde el razonamiento se rompe) */
  issue: StepIssue | null;
  /** Puntos de control alcanzados correctamente (crédito por procedimiento) */
  reached: string[];
  /** Fracción 0–1 de puntos de control alcanzados antes del primer error */
  procedureCredit: number;
  finalOk: boolean;
}

const close = (a: number, b: number, rel: number) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-300);

/**
 * Comprueba un procedimiento línea a línea:
 * 1. dentro de cada línea, todos los miembros numéricos encadenados por «=» deben ser iguales (en el SI si
 *    tienen unidad): si no, ahí hay un error de cálculo o de conversión;
 * 2. cada valor se compara con los puntos de control del ejercicio (resultados intermedios esperados);
 * 3. el último valor escrito se compara con la respuesta final.
 * La tolerancia (2 %) admite el redondeo razonable de los resultados intermedios.
 */
export function checkProcedure(text: string, checkpoints: Checkpoint[], final: Checkpoint, rel = 0.02): ProcedureReport {
  const raw = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const lines: ProcedureReport['lines'] = [];
  const reached = new Set<string>();
  let issue: StepIssue | null = null;
  let last: Member | null = null;
  raw.forEach((line, k) => {
    const members = line.split('=').map(parseMember);
    const nums = members.filter((m) => !m.label);
    let ok = true;
    let cp: string | undefined;
    if (!nums.length && members.length > 0 && line.includes('=')) {
      ok = false;
      if (!issue) issue = { kind: 'no-entiendo', line: k + 1, text: line };
    }
    for (let i = 1; i < nums.length; i++) {
      const a = nums[i - 1]!;
      const b = nums[i]!;
      const bothUnits = a.si !== undefined && b.si !== undefined;
      if (bothUnits && a.unit!.quantity !== b.unit!.quantity) {
        ok = false;
        if (!issue) issue = { kind: 'unidades', line: k + 1, from: a.text, to: b.text };
        break;
      }
      const va = bothUnits ? a.si! : a.value!;
      const vb = bothUnits ? b.si! : b.value!;
      if (!close(va, vb, rel)) {
        ok = false;
        if (!issue) issue = { kind: 'aritmetica', line: k + 1, from: a.text, to: b.text, expected: va, got: vb };
        break;
      }
    }
    if (ok) {
      for (const m of nums) {
        const v = m.si ?? m.value!;
        for (const c of checkpoints) if (close(v, c.si, rel)) {
          reached.add(c.label);
          cp = c.label;
        }
      }
      if (nums.length) last = nums[nums.length - 1]!;
    }
    lines.push({ text: line, ok, checkpoint: cp });
  });
  const lastV = last ? ((last as Member).si ?? (last as Member).value!) : NaN;
  const finalOk = Number.isFinite(lastV) && close(lastV, final.si, rel);
  if (!issue && Number.isFinite(lastV) && !finalOk) issue = { kind: 'final', got: lastV, expected: final.si };
  return { lines, issue, reached: [...reached], procedureCredit: checkpoints.length ? reached.size / checkpoints.length : finalOk ? 1 : 0, finalOk };
}

/** Mensaje para el alumno: dónde se rompe el procedimiento y por qué. */
export function explainIssue(issue: StepIssue | null): string {
  if (!issue) return 'Procedimiento coherente de principio a fin.';
  const f = (v: number) => formatNumber(v, { sig: 4 });
  switch (issue.kind) {
    case 'aritmetica':
      return `Línea ${issue.line}: «${issue.from}» vale ${f(issue.expected)}, pero escribes «${issue.to}» (${f(issue.got)}). El error está en ese paso; lo anterior es coherente.`;
    case 'unidades':
      return `Línea ${issue.line}: «${issue.from}» y «${issue.to}» son magnitudes distintas: no pueden ser iguales. Revisa qué estás calculando en ese paso.`;
    case 'no-entiendo':
      return `Línea ${issue.line}: no reconozco ningún número que evaluar en «${issue.text}». Escribe cada paso como «magnitud = operación = resultado».`;
    case 'final':
      return `Las operaciones son coherentes entre sí, pero el resultado (${f(issue.got)}) no es el que se pide (${f(issue.expected)} en el SI). Revisa la fórmula elegida o un dato.`;
  }
}

/** Puntos de control de un ejercicio: el valor (en el SI) de cada paso numérico; el último es el final. */
export function procedureCheckpoints(ex: Exercise): { checkpoints: Checkpoint[]; final: Checkpoint } | null {
  const cps: Checkpoint[] = [];
  for (const p of ex.parts) {
    if (p.answer.kind !== 'numeric') continue;
    const u = p.answer.unit ? parseUnit(p.answer.unit) : null;
    if (p.answer.unit && !u) continue;
    cps.push({ label: p.prompt, si: p.answer.value * (u?.toSI ?? 1) });
  }
  return cps.length ? { checkpoints: cps, final: cps[cps.length - 1]! } : null;
}

