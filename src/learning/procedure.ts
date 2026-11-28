/**
 * ATOM 5.1 · Corrector de procedimientos escritos.
 *
 * El alumno escribe sus cuentas (una igualdad o cadena de igualdades por línea) y ATOM decide, con reglas
 * explícitas, qué partes de su razonamiento están DEMOSTRADAS. La versión 5.0 concedía crédito a cualquier
 * línea cuyo número coincidiera con un resultado intermedio, aunque las unidades fueran incompatibles, la
 * operación no tuviera sentido o el número estuviera escrito sin más (P0 de la auditoría externa). Ahora un
 * resultado solo cuenta si se cumplen TODAS estas condiciones:
 *
 * 1. **Derivación real.** La línea contiene una operación o una conversión (al menos dos miembros
 *    evaluables encadenados por «=»). Escribir «ν = 6·10¹⁴ Hz» sin más es una afirmación, no un paso.
 * 2. **Aritmética coherente.** Todos los miembros evaluables de la cadena valen lo mismo (en el SI cuando
 *    tienen unidades, o en la unidad escrita cuando el otro miembro no la tiene).
 * 3. **Coherencia dimensional.** Cada miembro se evalúa con su dimensión (L, M, T, Q, N): las unidades
 *    escritas dentro de la expresión, las constantes (h, c, R…) y las variables ya definidas llevan la
 *    suya. Igualar magnitudes distintas, sumar magnitudes distintas o asignar a «E» una longitud es un
 *    error de unidades. Además, la magnitud del resultado debe coincidir con la del punto de control.
 * 4. **Procedencia de cada número.** Cada número de la operación debe ser un dato del enunciado, una
 *    constante conocida, un número estructural (enteros pequeños, 1/n², potencias de 10) o un resultado
 *    de una línea anterior. Un número de procedencia desconocida deja la línea «sin justificar».
 * 5. **Nada se hereda de un error.** Los resultados derivados de un valor erróneo quedan «arrastrados»:
 *    pueden ser coherentes con el error (y se dice), pero no demuestran el paso. Una línea posterior al
 *    error solo cuenta si sus números proceden, de forma independiente, de datos o resultados correctos.
 * 6. **Seguimiento de variables y despejes.** «λ = …» define λ; «1/λ = …» define λ por su inverso;
 *    «n₂² = …» define n₂. Una fórmula posterior («ν = c/λ») se evalúa con esos valores y se compara con
 *    la sustitución numérica: si no cuadra, el despeje o la sustitución están mal. Definir dos veces la
 *    misma variable con valores distintos es una contradicción.
 * 7. **Expresiones inválidas.** Un miembro que no se puede analizar (caracteres extraños, operadores
 *    colgantes, paréntesis sin cerrar) NUNCA se toma como etiqueta: es un error «no entiendo».
 *
 * Seguridad: nunca se evalúa código del usuario. Analizador descendente recursivo propio.
 */
import { CODATA } from '../science/constants';
import { formatNumber } from '../science/numbers';
import { parseUnit, UNITS, type Quantity, type UnitDef } from '../science/units';
import type { Exercise } from './types';

// ── Dimensiones ─────────────────────────────────────────────────────────────

/** Exponentes de [L, M, T, Q, N] (longitud, masa, tiempo, carga, cantidad de sustancia). */
export type Dim = readonly [number, number, number, number, number];
const D0: Dim = [0, 0, 0, 0, 0];
const dim = (L = 0, M = 0, T = 0, Q = 0, N = 0): Dim => [L, M, T, Q, N];
const dAdd = (a: Dim, b: Dim): Dim => a.map((x, i) => x + b[i]!) as unknown as Dim;
const dSub = (a: Dim, b: Dim): Dim => a.map((x, i) => x - b[i]!) as unknown as Dim;
const dScale = (a: Dim, k: number): Dim => a.map((x) => x * k) as unknown as Dim;
export const dimEq = (a: Dim, b: Dim) => a.every((x, i) => Math.abs(x - b[i]!) < 1e-9);

const ENERGY = dim(2, 1, -2);
export const QUANTITY_DIM: Record<Quantity, Dim> = {
  longitud: dim(1),
  frecuencia: dim(0, 0, -1),
  tiempo: dim(0, 0, 1),
  energia: ENERGY,
  'energia-molar': dim(2, 1, -2, 0, -1),
  'numero-ondas': dim(-1),
  masa: dim(0, 1),
  velocidad: dim(1, 0, -1),
  'cantidad-movimiento': dim(1, 1, -1),
  carga: dim(0, 0, 0, 1),
  porcentaje: D0,
  adimensional: D0,
};

/** Nombre legible de una dimensión (para los mensajes). */
export function dimName(d: Dim): string {
  for (const [q, v] of Object.entries(QUANTITY_DIM)) if (dimEq(v, d) && q !== 'porcentaje') return q === 'adimensional' ? 'un número sin unidades' : q.replace('energia-molar', 'energía por mol').replace('energia', 'energía').replace('numero-ondas', 'número de ondas').replace('cantidad-movimiento', 'cantidad de movimiento');
  if (dimEq(d, dim(2, 1, -1))) return 'acción (J·s)';
  return 'una magnitud compuesta';
}

/** Unidades que se reconocen DENTRO de una expresión (factor al SI y dimensión). */
interface UnitAtom {
  f: number;
  d: Dim;
}
const UNIT_ATOMS: Record<string, UnitAtom> = (() => {
  const out: Record<string, UnitAtom> = {};
  for (const [k, u] of Object.entries(UNITS)) {
    if (!k || /[⁻¹·/%]/.test(k)) continue; // las compuestas se escriben con operadores
    out[k] = { f: u.toSI, d: QUANTITY_DIM[u.quantity] };
  }
  out.mol = { f: 1, d: dim(0, 0, 0, 0, 1) };
  out.N = { f: 1, d: dim(1, 1, -2) };
  out.W = { f: 1, d: dim(2, 1, -3) };
  out.um = out['µm']!;
  out['μm'] = out['µm']!;
  out.A = out['Å']!;
  return out;
})();

// ── Normalización y análisis léxico ─────────────────────────────────────────

const SUP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₑ': 'e', 'ₙ': 'n', 'ᵢ': 'i', 'ₓ': 'x' };

/** Normaliza la notación habitual de clase a una forma única. */
export function normalizeExpr(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) => `^(${[...m].map((c) => SUP[c]).join('')})`);
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉ₑₙᵢₓ]+/g, (m) => `_${[...m].map((c) => SUB[c]).join('')}`);
  s = s.replace(/[×·∙•⋅]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/\*\*/g, '^');
  s = s.replace(/√/g, 'sqrt').replace(/π/g, 'pi');
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/(\d) (?=\d{3}\b)/g, '$1');
  // «mantisa·10^n» es UN número en la notación de clase: 1/1,524·10^6 = 1/(1,524·10⁶).
  s = s.replace(/(\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?/g, '($1e$2)');
  // «10^-7» suelto
  s = s.replace(/(^|[^\d.])10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?/g, '$1(1e$2)');
  return s;
}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'id'; v: string };

const GREEK = 'λνμΔθαβγωσρετφψΩħ';
const WORDS = ['sqrt', 'raiz', 'pi', 'lambda', 'nu', 'mol', 'Zef'];
const UNIT_WORDS = Object.keys(UNIT_ATOMS).filter((k) => k.length > 1).sort((a, b) => b.length - a.length);

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
      // «2..5» o «1.2.3» no son números: no se reinterpretan como productos implícitos.
      if (/^[.\d]/.test(s.slice(i + num[0].length))) return null;
      out.push({ t: 'num', v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '%') {
      out.push({ t: 'id', v: '%' });
      i++;
      continue;
    }
    const run = new RegExp(`^[a-zA-Z${GREEK}µÅ]+(?:_[a-zA-Z0-9]+)?'?`).exec(s.slice(i));
    if (run) {
      const w = run[0];
      // Palabras conocidas completas; si no, letras sueltas (hν = h·ν), conservando el subíndice al final.
      const known = WORDS.includes(w) || UNIT_ATOMS[w] || /_/.test(w) || w.length === 1 || /'$/.test(w);
      if (known) out.push({ t: 'id', v: w });
      else {
        let k = 0;
        while (k < w.length) {
          const u = UNIT_WORDS.find((x) => w.startsWith(x, k));
          const wd = WORDS.find((x) => w.startsWith(x, k));
          const take = wd ?? u ?? w[k]!;
          out.push({ t: 'id', v: take });
          k += take.length;
        }
      }
      i += w.length;
      continue;
    }
    return null;
  }
  return out;
}

// ── Árbol sintáctico ────────────────────────────────────────────────────────

export type Ast =
  | { k: 'num'; v: number }
  | { k: 'id'; name: string }
  | { k: 'neg'; a: Ast }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Ast; b: Ast }
  | { k: 'sqrt'; a: Ast };

export function parseAst(raw: string): Ast | null {
  const toks = tokenize(normalizeExpr(raw));
  if (!toks || !toks.length) return null;
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const eat = (v: string) => (isOp(v) ? (p++, true) : false);
  const expr = (): Ast | null => {
    let a = term();
    while (a && (isOp('+') || isOp('-'))) {
      const op = toks[p++]!.v as '+' | '-';
      const b = term();
      if (!b) return null;
      a = { k: 'bin', op, a, b };
    }
    return a;
  };
  const term = (): Ast | null => {
    let a = unary();
    for (;;) {
      if (!a) return null;
      if (eat('*')) {
        const b = unary();
        if (!b) return null;
        a = { k: 'bin', op: '*', a, b };
      } else if (eat('/')) {
        const b = unary();
        if (!b) return null;
        a = { k: 'bin', op: '/', a, b };
      } else if (peek() && (peek()!.t === 'num' || peek()!.t === 'id' || isOp('('))) {
        const b = unary();
        if (!b) return null;
        a = { k: 'bin', op: '*', a, b };
      } else return a;
    }
  };
  const unary = (): Ast | null => {
    if (eat('-')) {
      const a = unary();
      return a ? { k: 'neg', a } : null;
    }
    if (eat('+')) return unary();
    return power();
  };
  const power = (): Ast | null => {
    const b = atom();
    if (!b) return null;
    if (eat('^')) {
      const e = unary();
      return e ? { k: 'bin', op: '^', a: b, b: e } : null;
    }
    return b;
  };
  const atom = (): Ast | null => {
    const t = peek();
    if (!t) return null;
    if (t.t === 'num') {
      p++;
      return { k: 'num', v: t.v };
    }
    if (t.t === 'id') {
      p++;
      if (t.v === 'sqrt' || t.v === 'raiz') {
        if (!eat('(')) return null;
        const a = expr();
        if (!a || !eat(')')) return null;
        return { k: 'sqrt', a };
      }
      const name = t.v === 'pi' ? 'pi' : t.v === 'lambda' ? 'λ' : t.v === 'nu' ? 'ν' : t.v;
      return { k: 'id', name };
    }
    if (eat('(')) {
      const a = expr();
      if (!a || !eat(')')) return null;
      return a;
    }
    return null;
  };
  const a = expr();
  return a && p === toks.length ? a : null;
}

function ids(a: Ast, out: Set<string> = new Set()): Set<string> {
  if (a.k === 'id') out.add(a.name);
  else if (a.k === 'neg' || a.k === 'sqrt') ids(a.a, out);
  else if (a.k === 'bin') {
    ids(a.a, out);
    ids(a.b, out);
  }
  return out;
}

/** Números «de entrada» de una expresión (no cuenta los exponentes, que son estructurales). */
function literals(a: Ast, out: number[] = []): number[] {
  if (a.k === 'num') out.push(a.v);
  else if (a.k === 'neg' || a.k === 'sqrt') literals(a.a, out);
  else if (a.k === 'bin') {
    literals(a.a, out);
    if (a.op !== '^') literals(a.b, out);
  }
  return out;
}

// ── Evaluación con dimensiones ──────────────────────────────────────────────

/** Valor con dimensión; `d` null = «no declarada» (número sin unidades: compatible con cualquiera). */
export interface DVal {
  v: number;
  d: Dim | null;
  /** Valor en las unidades escritas (las unidades valen 1): para comparar con miembros sin unidad. */
  raw: number;
}

export interface Binding {
  v: number;
  d: Dim | null;
}

class DimError extends Error {}

function evalAst(a: Ast, env: Map<string, Binding>): DVal | null {
  switch (a.k) {
    case 'num':
      return { v: a.v, d: null, raw: a.v };
    case 'id': {
      const b = env.get(a.name);
      if (b) return { v: b.v, d: b.d, raw: b.v };
      if (a.name === 'pi') return { v: Math.PI, d: null, raw: Math.PI };
      if (a.name === '%') return { v: 1, d: D0, raw: 1 };
      const u = UNIT_ATOMS[a.name];
      if (u) return { v: u.f, d: u.d, raw: 1 };
      return null;
    }
    case 'neg': {
      const x = evalAst(a.a, env);
      return x && { v: -x.v, d: x.d, raw: -x.raw };
    }
    case 'sqrt': {
      const x = evalAst(a.a, env);
      if (!x || x.v < 0) return null;
      return { v: Math.sqrt(x.v), d: x.d && dScale(x.d, 0.5), raw: Math.sqrt(x.raw) };
    }
    case 'bin': {
      const x = evalAst(a.a, env);
      const y = evalAst(a.b, env);
      if (!x || !y) return null;
      switch (a.op) {
        case '+':
        case '-': {
          if (x.d && y.d && !dimEq(x.d, y.d)) throw new DimError(`${dimName(x.d)} ${a.op === '+' ? '+' : '−'} ${dimName(y.d)}`);
          const s = a.op === '+' ? 1 : -1;
          return { v: x.v + s * y.v, d: x.d ?? y.d, raw: x.raw + s * y.raw };
        }
        case '*':
          return { v: x.v * y.v, d: x.d || y.d ? dAdd(x.d ?? D0, y.d ?? D0) : null, raw: x.raw * y.raw };
        case '/':
          if (y.v === 0) return null;
          return { v: x.v / y.v, d: x.d || y.d ? dSub(x.d ?? D0, y.d ?? D0) : null, raw: x.raw / y.raw };
        case '^': {
          if (y.d && !dimEq(y.d, D0)) throw new DimError('exponente con unidades');
          const v = Math.pow(x.v, y.v);
          return { v, d: x.d && dScale(x.d, y.v), raw: Math.pow(x.raw, y.v) };
        }
      }
    }
  }
}

/** Evalúa una expresión aritmética pura (sin variables ni unidades); null si no lo es. */
export function evalExpr(raw: string): number | null {
  const a = parseAst(raw);
  if (!a || ids(a).size > (ids(a).has('pi') ? 1 : 0)) return null;
  try {
    const r = evalAst(a, new Map());
    return r && Number.isFinite(r.v) ? r.v : null;
  } catch {
    return null;
  }
}

// ── Contexto del ejercicio: datos, constantes y símbolos ────────────────────

/** Constantes que se pueden escribir con su símbolo. Los valores del enunciado tienen prioridad. */
const CONST_SYMBOLS: Record<string, Binding> = {
  h: { v: 6.626e-34, d: dim(2, 1, -1) },
  'ħ': { v: 1.0546e-34, d: dim(2, 1, -1) },
  c: { v: 3e8, d: dim(1, 0, -1) },
  R: { v: 1.097e7, d: dim(-1) },
  R_H: { v: 1.097e7, d: dim(-1) },
  e: { v: 1.602e-19, d: dim(0, 0, 0, 1) },
  N_A: { v: 6.022e23, d: dim(0, 0, 0, 0, -1) },
  NA: { v: 6.022e23, d: dim(0, 0, 0, 0, -1) },
  m_e: { v: 9.109e-31, d: dim(0, 1) },
  m_p: { v: 1.673e-27, d: dim(0, 1) },
  m_n: { v: 1.675e-27, d: dim(0, 1) },
};

/** Valores de constantes que se aceptan como números «conocidos» aunque el enunciado no los dé. */
const KNOWN_CONSTANT_VALUES = [
  6.626e-34, 6.63e-34, CODATA.h, 1.0546e-34, 3e8, CODATA.c, 1.097e7, 1.0974e7, 1.0968e7, CODATA.Rinf, 109740, 109677, 109737, 1.602e-19, 1.6e-19, CODATA.e,
  6.022e23, CODATA.NA, 1.6605e-27, 1.66e-27, 9.109e-31, 9.11e-31, 1.673e-27, 1.675e-27, 13.6, 2.18e-18, 2.179e-18, 0.529, 0.53, 5.29e-11, 5.3e-11, 96.485, 96485,
];

/** Magnitud que se entiende por convenio para cada símbolo de etiqueta. */
const LABEL_DIM: Record<string, Dim> = {
  'λ': dim(1),
  r: dim(1),
  r_n: dim(1),
  d: dim(1),
  x: dim(1),
  'Δx': dim(1),
  'ν': dim(0, 0, -1),
  f: dim(0, 0, -1),
  T: dim(0, 0, 1),
  t: dim(0, 0, 1),
  E: ENERGY,
  'ΔE': ENERGY,
  E_f: ENERGY,
  E_i: ENERGY,
  E_n: ENERGY,
  E_1: ENERGY,
  E_2: ENERGY,
  E_3: ENERGY,
  EI: ENERGY,
  v: dim(1, 0, -1),
  p: dim(1, 1, -1),
  'Δp': dim(1, 1, -1),
  m: dim(0, 1),
  M: dim(0, 1),
  q: dim(0, 0, 0, 1),
  Z: D0,
  A: D0,
  N: D0,
  n: D0,
  n_1: D0,
  n_2: D0,
  l: D0,
  a: D0,
  Z_ef: D0,
  Zef: D0,
  S: D0,
  k: D0,
};

export interface ProcedureContext {
  /** Números del enunciado, de los datos y de las preguntas (valor escrito y en el SI). */
  data: number[];
  /** Constantes con símbolo (h, c, R…) con los valores del enunciado */
  constants: Record<string, Binding>;
}

/** Números «estructurales» que no necesitan justificarse: enteros pequeños, 1/n², 1/a² − 1/b², potencias de 10. */
const STRUCTURAL: number[] = (() => {
  const s = new Set<number>([0.5, 0.25, 0.75, 1.5, 2.5]);
  for (let n = 0; n <= 30; n++) {
    s.add(n);
    s.add(n * n);
  }
  for (let a = 1; a <= 10; a++) {
    s.add(1 / (a * a));
    for (let b = a + 1; b <= 12; b++) s.add(1 / (a * a) - 1 / (b * b));
  }
  for (let k = -30; k <= 30; k++) s.add(Math.pow(10, k));
  for (const x of [60, 100, 1000, 3600]) s.add(x);
  return [...s];
})();

/** Extrae los números de un texto (con su valor en el SI cuando llevan unidad detrás). */
export function extractNumbers(text: string): number[] {
  const s = normalizeExpr(text).replace(/\^\((-?\d+)\)/g, '^$1');
  const out: number[] = [];
  const re = /(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\)?\s*([a-zA-ZµμÅ%][a-zA-ZµμÅ%^\-0-9/*]*)?/g;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    out.push(v);
    if (m[2]) {
      const u = parseUnit(m[2].replace(/\*/g, '·')) ?? parseUnit(m[2].split(/[^a-zA-ZµμÅ%]/)[0] ?? '');
      if (u && u.toSI !== 1) out.push(v * u.toSI);
      if (m[2].startsWith('%')) out.push(v / 100);
    }
  }
  return out;
}

export function contextFromExercise(ex: Exercise): ProcedureContext {
  const texts = [ex.statement, ...ex.parts.map((p) => p.prompt), ...(ex.data ?? []).map((d) => `${d.label} ${d.value}`)];
  for (const f of ex.figure ? [ex.figure] : []) {
    if (f.kind === 'puntos') texts.push(f.points.map((p) => `${p.x} ${p.y}`).join(' '));
    if (f.kind === 'espectro') texts.push(f.linesNm.map((x) => `${x} nm`).join(' '));
    if (f.kind === 'onda') texts.push(`${f.lambdaNm} nm`);
    if (f.kind === 'espectros') texts.push(f.rows.flatMap((r) => r.lines.map((l) => `${l.nm} nm`)).join(' '));
  }
  const constants: Record<string, Binding> = { ...CONST_SYMBOLS };
  for (const d of ex.data ?? []) {
    const lab = d.label.trim();
    const nums = extractNumbers(d.value);
    const si = nums[nums.length - 1];
    if (si === undefined) continue;
    if (lab === 'h' || lab === 'c' || lab === 'R' || lab === 'R_H') constants[lab] = { v: si, d: CONST_SYMBOLS[lab]!.d };
  }
  constants.R_H = constants.R!;
  return { data: texts.flatMap(extractNumbers), constants };
}

// ── Miembros ────────────────────────────────────────────────────────────────

export type MemberKind = 'label' | 'value' | 'formula' | 'invalid';

export interface Member {
  text: string;
  kind: MemberKind;
  /** Compatibilidad: true si es una etiqueta («λ», «1/λ», «E (J)») */
  label: boolean;
  ast?: Ast;
  /** Variable que define la etiqueta y cómo (λ, 1/λ, λ²) */
  defines?: { name: string; power: number };
  /** Valor en el SI (si es evaluable) */
  si?: number;
  /** Valor en la unidad escrita */
  value?: number;
  dim?: Dim | null;
  unit?: UnitDef;
}

const LABEL_SHAPE = /^\(?\s*(1\s*\/\s*)?([a-zA-ZλνμΔθΩħ][a-zA-Z]?(?:_\w+)?'?)\s*(\^\s*\(?\s*([23])\s*\)?)?\s*\)?$/;

/** Separa la etiqueta de la unidad que la acompaña: «E (J)», «λ en nm». */
function stripLabelUnit(t: string): { core: string; unit?: UnitDef } {
  const m = /^(.*?)\s*(?:\(([^()]+)\)|\ben\s+(\S+))$/.exec(t);
  if (m && m[1]) {
    const u = parseUnit((m[2] ?? m[3] ?? '').trim());
    if (u && (m[2] ?? m[3])) return { core: m[1], unit: u };
  }
  return { core: t };
}

function labelOf(text: string): Member | null {
  const { core, unit } = stripLabelUnit(text.trim());
  const n = normalizeExpr(core).replace(/\s+/g, ' ');
  const m = LABEL_SHAPE.exec(n);
  if (!m) return null;
  const name = m[2]!;
  const power = (m[1] ? -1 : 1) * (m[4] ? Number(m[4]) : 1);
  return { text, kind: 'label', label: true, defines: { name, power }, unit };
}

/** Clasifica un miembro. `first` = primer miembro de la línea (el único que puede ser etiqueta). */
export function parseMember(text: string, env: Map<string, Binding> = new Map(), first = true): Member {
  const t = text.trim();
  if (!t) return { text: t, kind: 'invalid', label: false };
  if (first) {
    const lab = labelOf(t);
    if (lab) return lab;
  }
  const ast = parseAst(t);
  if (!ast) return { text: t, kind: 'invalid', label: false };
  let r: DVal | null = null;
  try {
    r = evalAst(ast, env);
  } catch (e) {
    if (e instanceof DimError) return { text: t, kind: 'invalid', label: false, ast, dim: undefined };
    throw e;
  }
  const names = [...ids(ast)].filter((x) => x !== 'pi' && x !== '%' && !UNIT_ATOMS[x]);
  const kind: MemberKind = names.length ? 'formula' : 'value';
  if (!r || !Number.isFinite(r.v)) return { text: t, kind: names.length ? 'formula' : 'invalid', label: false, ast };
  return { text: t, kind, label: false, ast, si: r.v, value: r.raw, dim: r.d };
}

// ── Verificación de un procedimiento ────────────────────────────────────────

export interface Checkpoint {
  /** Qué representa («1/λ», «λ en m», «E del fotón») */
  label: string;
  /** Valor esperado en el SI */
  si: number;
  /** Magnitud esperada (si se conoce) */
  quantity?: Quantity;
  /** Valor en la unidad del enunciado (para detectar «falta la unidad») */
  value?: number;
}

export type StepIssue =
  | { kind: 'aritmetica'; line: number; from: string; to: string; expected: number; got: number }
  | { kind: 'despeje'; line: number; from: string; to: string; expected: number; got: number }
  | { kind: 'unidades'; line: number; from: string; to: string; detail?: string }
  | { kind: 'no-entiendo'; line: number; text: string }
  | { kind: 'sin-justificar'; line: number; number: number }
  | { kind: 'contradiccion'; line: number; name: string; before: number; now: number }
  | { kind: 'incompleto'; got: string; expected: string }
  | { kind: 'final'; got: number; expected: number };

/** Estado de cada línea tal como lo ve el alumno. */
export type LineStatus =
  /** Paso verificado: operación coherente con números de procedencia conocida */
  | 'ok'
  /** Cuentas coherentes, pero parte de un resultado erróneo anterior */
  | 'arrastre'
  /** Afirmación sin operación (no demuestra nada, no es un error) */
  | 'afirmado'
  /** Hay un número cuya procedencia no se conoce */
  | 'sin-justificar'
  | 'error';

export interface ProcedureLine {
  text: string;
  status: LineStatus;
  /** Compatibilidad con 5.0: true si la línea no contiene error */
  ok: boolean;
  /** Punto de control DEMOSTRADO en esta línea */
  checkpoint?: string;
  /** Explicación breve para el alumno */
  note?: string;
}

export interface ProcedureReport {
  lines: ProcedureLine[];
  /** Primer problema encontrado (el punto donde el razonamiento se rompe) */
  issue: StepIssue | null;
  /** Todos los problemas, en orden */
  issues: StepIssue[];
  /** Puntos de control DEMOSTRADOS (derivados, coherentes, con la magnitud correcta y sin heredar errores) */
  reached: string[];
  /** Puntos de control cuyo valor aparece pero NO se acreditan, con el motivo */
  unsupported: { label: string; line: number; reason: string }[];
  /** Fracción 0–1 de puntos de control demostrados */
  procedureCredit: number;
  finalOk: boolean;
}

export interface ProcedureSpec {
  checkpoints: Checkpoint[];
  final: Checkpoint;
  context?: ProcedureContext;
}

const close = (a: number, b: number, rel: number) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-300);

type Origin = 'sound' | 'tainted' | 'unknown';
interface Known {
  v: number;
  origin: Origin;
  line: number;
}

/**
 * Comprueba un procedimiento línea a línea (ver las reglas al principio del archivo).
 * Firma compatible con 5.0: checkProcedure(texto, puntos, final[, tolerancia]) o checkProcedure(texto, spec).
 */
export function checkProcedure(text: string, specOrCps: ProcedureSpec | Checkpoint[], finalArg?: Checkpoint, relArg?: number): ProcedureReport {
  const spec: ProcedureSpec = Array.isArray(specOrCps) ? { checkpoints: specOrCps, final: finalArg! } : specOrCps;
  const rel = relArg ?? 0.02;
  const ctx = spec.context ?? { data: [], constants: { ...CONST_SYMBOLS } };
  const env = new Map<string, Binding>(Object.entries(ctx.constants));
  const userVars = new Map<string, { v: number; origin: Origin; line: number }>();
  const known: Known[] = [];
  const raw = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 80);
  const lines: ProcedureLine[] = [];
  const issues: StepIssue[] = [];
  const reached = new Map<string, number>();
  const unsupported: ProcedureReport['unsupported'] = [];
  /** Resultados verificados sin etiqueta, por línea: para detectar resultados contradictorios «a escopeta» */
  const results: { line: number; si: number; d: Dim | null; label?: string; used: boolean; cps: string[] }[] = [];
  let last: { si: number; d: Dim | null; origin: Origin } | null = null;

  const originOf = (x: number): { origin: Origin; line?: number } => {
    const a = Math.abs(x);
    if (a === 0) return { origin: 'sound' };
    const near = (y: number) => close(a, Math.abs(y), 0.015);
    // Resultados anteriores: el más reciente que coincida decide (puede estar arrastrado)
    const prev = [...known].reverse().find((k) => near(k.v));
    if (prev && prev.origin === 'sound') return { origin: 'sound', line: prev.line };
    if (ctx.data.some(near) || STRUCTURAL.some((y) => a === y || near(y)) || KNOWN_CONSTANT_VALUES.some(near)) return { origin: 'sound' };
    if (prev) return { origin: prev.origin, line: prev.line };
    return { origin: 'unknown' };
  };

  raw.forEach((line, k) => {
    const L = k + 1;
    const parts = line.replace(/≈|≃/g, '=').split('=');
    const members: Member[] = parts.map((p, i) => parseMember(p, env, i === 0));
    const fail = (iss: StepIssue, note: string) => {
      issues.push(iss);
      lines.push({ text: line, status: 'error', ok: false, note });
    };
    // 1. Expresiones inválidas: nunca se toman como etiquetas.
    const bad = members.find((m) => m.kind === 'invalid');
    if (bad) {
      const isDim = bad.ast !== undefined;
      if (isDim) fail({ kind: 'unidades', line: L, from: bad.text, to: bad.text, detail: 'suma o resta magnitudes distintas' }, 'Suma o resta de magnitudes distintas.');
      else fail({ kind: 'no-entiendo', line: L, text: bad.text || line }, `No sé interpretar «${bad.text || line}».`);
      return;
    }
    if (!line.includes('=') && members.length === 1 && members[0]!.kind === 'label') {
      lines.push({ text: line, status: 'afirmado', ok: true, note: 'Título o incógnita.' });
      return;
    }
    const labelM = members[0]!.kind === 'label' ? members[0]! : undefined;
    const evals = members.filter((m) => m.kind !== 'label' && m.si !== undefined);
    if (!evals.length) {
      if (members.some((m) => m.kind === 'formula')) {
        lines.push({ text: line, status: 'afirmado', ok: true, note: 'Planteamiento (sin números que comprobar).' });
        return;
      }
      fail({ kind: 'no-entiendo', line: L, text: line }, 'No hay ningún número que comprobar.');
      return;
    }
    // 2. Coherencia aritmética y dimensional de la cadena.
    let lineDim: Dim | null = null;
    let lineSI: number | null = null;
    let broken = false;
    for (const m of evals) if (m.dim) {
      if (lineDim && !dimEq(lineDim, m.dim)) {
        const a = evals.find((x) => x.dim && dimEq(x.dim, lineDim!))!;
        fail({ kind: 'unidades', line: L, from: a.text, to: m.text }, `${a.text} es ${dimName(lineDim)} y ${m.text} es ${dimName(m.dim)}.`);
        broken = true;
        break;
      }
      lineDim = m.dim;
      lineSI = m.si!;
    }
    if (broken) return;
    const labelName = labelM?.defines?.name;
    const labelDim = labelM ? (labelM.unit ? QUANTITY_DIM[labelM.unit.quantity] : labelName ? (userVars.has(labelName) ? env.get(labelName)?.d ?? null : LABEL_DIM[labelName] ?? null) : null) : null;
    const labelDimEff = labelDim && labelM?.defines && labelM.defines.power !== 1 ? dScale(labelDim, labelM.defines.power) : labelDim;
    if (labelDimEff && lineDim && !dimEq(labelDimEff, lineDim)) {
      const m = evals.find((x) => x.dim)!;
      fail({ kind: 'unidades', line: L, from: labelM!.text, to: m.text, detail: 'etiqueta' }, `${labelM!.text} debería ser ${dimName(labelDimEff)}, pero ${m.text} es ${dimName(lineDim)}.`);
      return;
    }
    for (let i = 1; i < evals.length; i++) {
      const a = evals[i - 1]!;
      const b = evals[i]!;
      const both = !!a.dim && !!b.dim;
      const okEq = both ? close(a.si!, b.si!, rel) : close(a.si!, b.si!, rel) || close(a.si!, b.value!, rel) || close(a.value!, b.si!, rel) || close(a.value!, b.value!, rel);
      if (!okEq) {
        const kind = a.kind === 'formula' ? 'despeje' : 'aritmetica';
        const aShown = a.dim && !b.dim ? a.value! : a.si!;
        const bShown = b.dim && !a.dim ? b.value! : b.si!;
        fail({ kind, line: L, from: a.text, to: b.text, expected: both ? a.si! : aShown, got: both ? b.si! : bShown } as StepIssue, kind === 'despeje' ? `Con tus valores, ${a.text} da ${fmt(aShown)}, no ${b.text}.` : `${a.text} = ${fmt(aShown)}, no ${b.text}.`);
        // El valor escrito (erróneo) queda como resultado arrastrado.
        known.push({ v: Math.abs(b.si!), origin: 'tainted', line: L });
        known.push({ v: Math.abs(b.value!), origin: 'tainted', line: L });
        last = { si: b.si!, d: b.dim ?? lineDim, origin: 'tainted' };
        if (labelM?.defines) bind(labelM.defines, b.dim ? b.si! : b.value!, b.dim ?? labelDim, 'tainted', L);
        broken = true;
        break;
      }
    }
    if (broken) return;
    // Valor de la línea en el SI: el de un miembro con unidades; si no hay, el número tal cual.
    const lastM = evals[evals.length - 1]!;
    const si = lineSI ?? lastM.si!;
    const d = lineDim ?? labelDimEff ?? null;
    // 3. Procedencia de los números de la operación (primer miembro evaluable).
    const head = evals[0]!;
    const derived = evals.length >= 2;
    let origin: Origin = 'sound';
    let unknownNum: number | null = null;
    const headLits = head.ast ? literals(head.ast) : [];
    for (const x of headLits) {
      const o = originOf(x).origin;
      if (o === 'unknown') {
        origin = 'unknown';
        unknownNum = x;
        break;
      }
      if (o === 'tainted') origin = 'tainted';
    }
    // Variables usadas en fórmulas: heredan su procedencia
    for (const m of evals) if (m.kind === 'formula' && m.ast) for (const n of ids(m.ast)) {
      const uv = userVars.get(n);
      if (uv && uv.origin !== 'sound' && origin === 'sound') origin = uv.origin;
      if (uv) results.filter((r) => r.line === uv.line).forEach((r) => (r.used = true));
    }
    for (const x of headLits) {
      const o = originOf(x);
      if (o.line) results.filter((r) => r.line === o.line).forEach((r) => (r.used = true));
    }
    // ATOM 6.0 · Una operación hecha SOLO con números redondos (enteros pequeños, potencias de 10) no parte de
    // ningún dato: «ν = 10^14 · 6 = 6·10^14 Hz» fabrica el resultado. Debe intervenir al menos un dato, una
    // constante (por su valor o su símbolo) o un resultado anterior.
    let trivial = false;
    if (derived && origin === 'sound') {
      const substantive = (x: number) => {
        const a = Math.abs(x);
        if (a === 0) return false;
        const near = (y: number) => close(a, Math.abs(y), 0.015);
        return ctx.data.some(near) || KNOWN_CONSTANT_VALUES.some(near) || known.some((k) => k.origin === 'sound' && near(k.v));
      };
      const namesUsed = evals.flatMap((m) => (m.ast ? [...ids(m.ast)] : []));
      const usesSymbol = namesUsed.some((n) => userVars.has(n) || n in ctx.constants);
      if (!usesSymbol && !headLits.some(substantive)) {
        trivial = true;
        origin = 'unknown';
        unknownNum = headLits[0] ?? si;
      }
    }
    if (!derived) {
      // Afirmación: «λ = 6,56·10⁻⁷ m». Si coincide con un dato o un resultado anterior, es una reescritura.
      const o = originOf(head.value!).origin === 'sound' || originOf(si).origin === 'sound' ? 'sound' : originOf(si).origin === 'tainted' ? 'tainted' : 'unknown';
      origin = o === 'sound' ? 'sound' : o;
    }
    // 4. Contradicciones al definir variables.
    if (labelM?.defines && origin !== 'unknown') {
      const nv = solveLabel(labelM.defines, si);
      const prev = userVars.get(labelM.defines.name);
      if (prev && prev.origin === 'sound' && origin === 'sound' && nv !== null && !close(prev.v, nv, rel)) {
        fail({ kind: 'contradiccion', line: L, name: labelM.defines.name, before: prev.v, now: nv }, `Ya habías obtenido ${labelM.defines.name} = ${fmt(prev.v)}; ahora escribes otro valor.`);
        return;
      }
    }
    // 5. Estado de la línea y puntos de control.
    const status: LineStatus = origin === 'sound' ? (derived ? 'ok' : 'afirmado') : origin === 'tainted' ? 'arrastre' : derived ? 'sin-justificar' : 'afirmado';
    let note: string | undefined;
    if (origin === 'unknown' && derived) {
      issues.push({ kind: 'sin-justificar', line: L, number: unknownNum! });
      note = trivial ? 'La operación solo usa números redondos: no parte de ningún dato, constante ni resultado anterior.' : `¿De dónde sale ${fmt(unknownNum!)}? No es un dato ni un resultado anterior.`;
    } else if (origin === 'tainted') note = 'Coherente con tu error anterior, pero no demuestra este paso.';
    let cp: string | undefined;
    for (const c of spec.checkpoints) {
      const matchSI = close(si, c.si, rel);
      const matchRaw = c.value !== undefined && evals.some((m) => close(m.value!, c.value!, rel));
      if (!matchSI) {
        if (matchRaw && !d && c.quantity && !dimEq(QUANTITY_DIM[c.quantity], D0)) unsupported.push({ label: c.label, line: L, reason: 'Falta la unidad: sin ella el número no identifica la magnitud.' });
        continue;
      }
      const cd = c.quantity ? QUANTITY_DIM[c.quantity] : null;
      let reason: string | null = null;
      if (!derived) reason = 'Se afirma sin ninguna operación que lo justifique.';
      else if (origin === 'tainted') reason = 'Se obtiene a partir de un resultado erróneo.';
      else if (origin === 'unknown') reason = 'Usa un número de procedencia desconocida.';
      else if (cd && d && !dimEq(cd, d)) reason = `La magnitud no coincide: se pide ${dimName(cd)} y la línea da ${dimName(d)}.`;
      else if (cd && !d && !dimEq(cd, D0)) reason = 'Falta identificar la magnitud (escribe su símbolo o su unidad).';
      if (reason) unsupported.push({ label: c.label, line: L, reason });
      else {
        if (!reached.has(c.label)) reached.set(c.label, L);
        cp = c.label;
      }
    }
    lines.push({ text: line, status, ok: true, checkpoint: cp, note });
    for (const m of evals) {
      known.push({ v: Math.abs(m.si!), origin, line: L });
      known.push({ v: Math.abs(m.value!), origin, line: L });
    }
    if (labelM?.defines) bind(labelM.defines, si, d && labelM.defines.power !== 1 ? dScale(d, 1 / labelM.defines.power) : labelDim ?? d, origin, L);
    if (derived && origin === 'sound') results.push({ line: L, si, d, label: labelName, used: false, cps: cp ? spec.checkpoints.filter((c) => reached.get(c.label) === L).map((c) => c.label) : [] });
    last = { si, d, origin };
  });

  function bind(def: { name: string; power: number }, si: number, d: Dim | null, origin: Origin, line: number) {
    const v = solveLabel(def, si);
    if (v === null) return;
    if (CONST_SYMBOLS[def.name] && !userVars.has(def.name) && def.name.length === 1 && 'hceR'.includes(def.name)) {
      // Redefinir h, c, e o R como resultado no tiene sentido físico: se ignora la asignación.
      return;
    }
    env.set(def.name, { v, d });
    userVars.set(def.name, { v, origin, line });
    known.push({ v: Math.abs(v), origin, line });
  }

  // 6. Resultados «a escopeta»: dos resultados verificados sin etiqueta, de la misma magnitud, distintos y sin
  //    usar después. Si uno de ellos acredita un punto de control, ese crédito queda en suspenso.
  for (const r of results) {
    if (r.label || r.used || !r.cps.length) continue;
    const rival = results.find((o) => o !== r && !o.label && !o.used && o.d && r.d && dimEq(o.d, r.d) && !close(o.si, r.si, rel) && !o.cps.length);
    if (rival) for (const c of r.cps) {
      reached.delete(c);
      unsupported.push({ label: c, line: r.line, reason: `Hay otro resultado distinto de la misma magnitud (línea ${rival.line}) sin que se use ninguno: no se sabe cuál defiendes.` });
      const ln = lines[r.line - 1];
      if (ln) {
        ln.checkpoint = undefined;
        ln.note = 'Resultado ambiguo: hay otro distinto de la misma magnitud.';
      }
    }
  }

  const fin = last as { si: number; d: Dim | null; origin: Origin } | null;
  const finalDim = spec.final.quantity ? QUANTITY_DIM[spec.final.quantity] : null;
  const finalOk = reached.has(spec.final.label) || (!spec.checkpoints.some((c) => c.label === spec.final.label) && !!fin && fin.origin === 'sound' && close(fin.si, spec.final.si, rel));
  if (!issues.length && fin && !finalOk) {
    if (finalDim && fin.d && !dimEq(finalDim, fin.d)) issues.push({ kind: 'incompleto', got: dimName(fin.d), expected: dimName(finalDim) });
    else if (fin.origin === 'sound' && !close(fin.si, spec.final.si, rel)) issues.push({ kind: 'final', got: fin.si, expected: spec.final.si });
  }
  const credit = spec.checkpoints.length ? reached.size / spec.checkpoints.length : finalOk ? 1 : 0;
  return { lines, issue: issues[0] ?? null, issues, reached: [...reached.keys()], unsupported, procedureCredit: credit, finalOk };
}

function solveLabel(def: { name: string; power: number }, si: number): number | null {
  if (def.power === 1) return si;
  if (def.power === -1) return si === 0 ? null : 1 / si;
  const v = Math.pow(Math.abs(si), 1 / Math.abs(def.power));
  return def.power < 0 ? 1 / v : v;
}

const fmt = (v: number) => formatNumber(v, { sig: 4 });

/** Mensaje para el alumno: dónde se rompe el procedimiento y por qué. */
export function explainIssue(issue: StepIssue | null): string {
  if (!issue) return 'Procedimiento coherente de principio a fin.';
  switch (issue.kind) {
    case 'aritmetica':
      return `Línea ${issue.line}: «${issue.from}» vale ${fmt(issue.expected)}, pero escribes «${issue.to}» (${fmt(issue.got)}). El error está en ese paso; lo anterior es coherente.`;
    case 'despeje':
      return `Línea ${issue.line}: con los valores que ya tienes, «${issue.from}» da ${fmt(issue.expected)}, pero sustituyes «${issue.to}» (${fmt(issue.got)}). Revisa el despeje o la sustitución.`;
    case 'unidades':
      return issue.detail === 'etiqueta'
        ? `Línea ${issue.line}: «${issue.from}» y «${issue.to}» no son la misma magnitud. Comprueba qué estás calculando o qué unidad le corresponde.`
        : issue.detail
          ? `Línea ${issue.line}: en «${issue.from}» se ${issue.detail}. Solo se pueden sumar o restar magnitudes de la misma clase.`
          : `Línea ${issue.line}: «${issue.from}» y «${issue.to}» son magnitudes distintas: no pueden ser iguales. Revisa qué estás calculando en ese paso.`;
    case 'no-entiendo':
      return `Línea ${issue.line}: no sé interpretar «${issue.text}». Escribe cada paso como «magnitud = operación = resultado», con números, símbolos (h, c, R, λ…) y unidades.`;
    case 'sin-justificar':
      return `Línea ${issue.line}: el número ${fmt(issue.number)} no es un dato del enunciado ni un resultado anterior. Muestra de dónde sale.`;
    case 'contradiccion':
      return `Línea ${issue.line}: ya habías obtenido ${issue.name} = ${fmt(issue.before)} y ahora le das otro valor (${fmt(issue.now)}). Una magnitud solo puede valer una cosa.`;
    case 'incompleto':
      return `El procedimiento termina en ${issue.got}, pero se pide ${issue.expected}. Falta al menos un paso.`;
    case 'final':
      return `Las operaciones son coherentes entre sí, pero el resultado (${fmt(issue.got)}) no es el que se pide (${fmt(issue.expected)} en el SI). Revisa la fórmula elegida o un dato.`;
  }
}

/** Puntos de control de un ejercicio: el valor (en el SI) de cada paso numérico; el último es el final. */
export function procedureCheckpoints(ex: Exercise): ProcedureSpec | null {
  const cps: Checkpoint[] = [];
  for (const p of ex.parts) {
    if (p.answer.kind !== 'numeric') continue;
    const u = parseUnit(p.answer.unit);
    if (!u) continue;
    cps.push({ label: p.prompt, si: p.answer.value * u.toSI, quantity: u.quantity, value: p.answer.value });
  }
  return cps.length ? { checkpoints: cps, final: cps[cps.length - 1]!, context: contextFromExercise(ex) } : null;
}
