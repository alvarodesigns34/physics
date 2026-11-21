/**
 * Configuración electrónica: orden de Möller (Madelung), estado fundamental de referencia,
 * iones, notación, diagrama de cajas (Hund) y diagnóstico de configuraciones escritas por el alumno.
 */
import { elementByZ, elementBySymbol, NOBLE_GASES, type ElementRecord } from './elements';
import { lFromLetter, lLetter, subshellCapacity } from './quantum';
import { toSuperscript } from './numbers';

export interface Subshell {
  n: number;
  l: number;
}
export interface SubshellOcc extends Subshell {
  e: number;
}
/** Configuración canónica: subniveles con e > 0, ordenados por orden de llenado (Madelung). */
export type Configuration = SubshellOcc[];

export function subshellLabel(s: Subshell): string {
  return `${s.n}${lLetter(s.l)}`;
}

/** Orden de llenado del diagrama de Möller: n + l creciente; a igualdad, n creciente. */
export const MADELUNG_ORDER: readonly Subshell[] = (() => {
  const out: Subshell[] = [];
  for (let k = 1; k <= 8; k++) {
    for (let n = 1; n <= k; n++) {
      const l = k - n;
      if (l < n && l <= 3) out.push({ n, l });
    }
  }
  return out;
})();

const MADELUNG_INDEX = new Map(MADELUNG_ORDER.map((s, i) => [subshellLabel(s), i]));

export function madelungIndex(s: Subshell): number {
  return MADELUNG_INDEX.get(subshellLabel(s)) ?? 1000 + s.n * 10 + s.l;
}

function canonical(map: Map<string, SubshellOcc>): Configuration {
  return [...map.values()].filter((s) => s.e > 0).sort((a, b) => madelungIndex(a) - madelungIndex(b));
}

/** Configuración que resulta de aplicar estrictamente el diagrama de Möller. */
export function aufbau(electrons: number): Configuration {
  let left = electrons;
  const out: Configuration = [];
  for (const s of MADELUNG_ORDER) {
    if (left <= 0) break;
    const e = Math.min(left, subshellCapacity(s.l));
    out.push({ ...s, e });
    left -= e;
  }
  if (left > 0) throw new RangeError(`Demasiados electrones para el diagrama de Möller: ${electrons}`);
  return out;
}

/** Lector estricto del formato de los datos de referencia («[Ar] 3d5 4s1»). */
function parseReference(text: string): Configuration {
  const map = new Map<string, SubshellOcc>();
  for (const tok of text.split(/\s+/)) {
    if (!tok) continue;
    const core = tok.match(/^\[(\w+)\]$/);
    if (core) {
      const el = elementBySymbol(core[1]!);
      if (!el) throw new Error(`Núcleo desconocido ${tok}`);
      for (const s of groundState(el.z)) map.set(subshellLabel(s), { ...s });
      continue;
    }
    const m = tok.match(/^(\d)([spdf])(\d+)$/);
    if (!m) throw new Error(`Token inválido ${tok}`);
    const s = { n: Number(m[1]), l: lFromLetter(m[2]!), e: Number(m[3]) };
    map.set(subshellLabel(s), s);
  }
  return canonical(map);
}

const groundCache = new Map<number, Configuration>();

/** Configuración fundamental de referencia del átomo neutro (incluye las excepciones reales). */
export function groundState(z: number): Configuration {
  const cached = groundCache.get(z);
  if (cached) return cached;
  const el = elementByZ(z);
  if (!el) throw new RangeError(`Z fuera de rango: ${z}`);
  const conf = parseReference(el.groundConfigText);
  groundCache.set(z, conf);
  return conf;
}

export function electronCount(conf: Configuration): number {
  return conf.reduce((a, s) => a + s.e, 0);
}

export function sameConfiguration(a: Configuration, b: Configuration): boolean {
  if (a.length !== b.length) return false;
  const mb = new Map(b.map((s) => [subshellLabel(s), s.e]));
  return a.every((s) => mb.get(subshellLabel(s)) === s.e);
}

/** Elementos cuya configuración fundamental no sigue el diagrama de Möller. */
export function configurationExceptions(maxZ = 118): number[] {
  const out: number[] = [];
  for (let z = 1; z <= maxZ; z++) if (!sameConfiguration(groundState(z), aufbau(z))) out.push(z);
  return out;
}

/**
 * Configuración de una especie (átomo o ion) en su estado fundamental.
 * Cationes: se retiran primero los electrones de mayor n (ns antes que (n−1)d), TEO p.18.
 * Aniones: se añaden siguiendo el orden de Möller.
 */
export function speciesConfiguration(z: number, electrons: number): Configuration {
  if (electrons < 0) throw new RangeError('Número de electrones negativo');
  if (electrons === 0) return [];
  if (z < 1 || z > 118) return aufbau(electrons);
  const map = new Map(groundState(z).map((s) => [subshellLabel(s), { ...s }]));
  let diff = electrons - z;
  while (diff < 0) {
    const occupied = [...map.values()].filter((s) => s.e > 0);
    occupied.sort((a, b) => b.n - a.n || b.l - a.l);
    const target = occupied[0]!;
    target.e -= 1;
    diff += 1;
  }
  while (diff > 0) {
    let placed = false;
    for (const s of MADELUNG_ORDER) {
      const key = subshellLabel(s);
      const cur = map.get(key)?.e ?? 0;
      if (cur < subshellCapacity(s.l)) {
        map.set(key, { ...s, e: cur + 1 });
        placed = true;
        break;
      }
    }
    if (!placed) throw new RangeError('No caben más electrones');
    diff -= 1;
  }
  return canonical(map);
}

// ── Notación ───────────────────────────────────────────────────────────────

export type ConfigOrder = 'llenado' | 'capas';

export interface FormatConfigOptions {
  order?: ConfigOrder;
  /** Abreviar con el gas noble anterior: «[Ne] 3s² 3p⁴». */
  abbreviate?: boolean;
  superscript?: boolean;
}

function sortByShell(conf: Configuration): Configuration {
  return [...conf].sort((a, b) => a.n - b.n || a.l - b.l);
}

/** Gas noble cuyo núcleo electrónico está contenido por completo en la configuración. */
export function nobleGasCore(conf: Configuration): ElementRecord | undefined {
  let best: ElementRecord | undefined;
  const have = new Map(conf.map((s) => [subshellLabel(s), s.e]));
  for (const z of NOBLE_GASES) {
    const core = groundState(z);
    if (electronCount(core) >= electronCount(conf)) break;
    if (core.every((s) => have.get(subshellLabel(s)) === s.e)) best = elementByZ(z);
  }
  return best;
}

export function formatConfiguration(conf: Configuration, opts: FormatConfigOptions = {}): string {
  const { order = 'llenado', abbreviate = false, superscript = true } = opts;
  if (conf.length === 0) return '—';
  let list = conf;
  let prefix = '';
  if (abbreviate) {
    const core = nobleGasCore(conf);
    if (core) {
      const coreLabels = new Set(groundState(core.z).map(subshellLabel));
      list = conf.filter((s) => !coreLabels.has(subshellLabel(s)));
      prefix = `[${core.symbol}]`;
    }
  }
  const ordered = order === 'capas' ? sortByShell(list) : list;
  const body = ordered.map((s) => `${subshellLabel(s)}${superscript ? toSuperscript(s.e) : s.e}`).join(' ');
  return [prefix, body].filter(Boolean).join(' ');
}

// ── Hund, valencia y electrones desapareados ──────────────────────────────

/** Ocupación de cada orbital de un subnivel según Hund: primero uno en cada uno (espines paralelos). */
export function orbitalBoxes(l: number, e: number): number[] {
  const k = 2 * l + 1;
  const boxes = new Array<number>(k).fill(0);
  for (let i = 0; i < e; i++) boxes[i % k]! += 1;
  return boxes;
}

export function unpairedElectrons(conf: Configuration): number {
  return conf.reduce((acc, s) => acc + orbitalBoxes(s.l, s.e).filter((b) => b === 1).length, 0);
}

/** Capa de valencia = la de mayor n ocupada (TEO p.16). */
export function valenceShell(conf: Configuration): number {
  return conf.reduce((m, s) => Math.max(m, s.n), 0);
}

export function valenceElectrons(conf: Configuration): number {
  const n = valenceShell(conf);
  return conf.filter((s) => s.n === n).reduce((a, s) => a + s.e, 0);
}

/** Subnivel del electrón diferenciador según el orden de llenado. */
export function lastFilled(conf: Configuration): SubshellOcc | undefined {
  return conf[conf.length - 1];
}

// ── Lectura y diagnóstico de configuraciones escritas ─────────────────────

export interface ParsedToken {
  n: number;
  l: number;
  e: number;
  raw: string;
}

export interface ParsedConfig {
  ok: boolean;
  core: ElementRecord | null;
  tokens: ParsedToken[];
  error: string | null;
}

const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Interpreta texto libre: «1s2 2s2 2p6», «1s²2s²2p⁶», «[Ne] 3s2 3p4», «1s22s22p63s1», «3d10 4s2». */
export function parseConfigurationText(input: string): ParsedConfig {
  let s = '';
  let inSup = false;
  for (const ch of input) {
    const i = SUPS.indexOf(ch);
    if (i >= 0) {
      if (!inSup) s += '^';
      s += String(i);
      inSup = true;
    } else {
      if (inSup) s += ' ';
      s += ch;
      inSup = false;
    }
  }
  s = s.replace(/[,;·.]/g, ' ').trim();
  const tokens: ParsedToken[] = [];
  let core: ElementRecord | null = null;
  let i = 0;
  const fail = (msg: string): ParsedConfig => ({ ok: false, core, tokens, error: msg });
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '[') {
      const close = s.indexOf(']', i);
      if (close < 0) return fail('Falta cerrar el corchete del gas noble.');
      const sym = s.slice(i + 1, close).trim();
      const el = elementBySymbol(sym);
      if (!el || !(NOBLE_GASES as readonly number[]).includes(el.z)) return fail(`[${sym}] no es un gas noble.`);
      if (tokens.length > 0 || core) return fail('El gas noble entre corchetes debe ir al principio.');
      core = el;
      i = close + 1;
      continue;
    }
    if (/\d/.test(ch)) {
      const n = Number(ch);
      const letter = s[i + 1];
      if (!letter || !/[a-zA-Z]/.test(letter)) return fail(`Después de «${ch}» falta la letra del subnivel (s, p, d o f).`);
      const l = lFromLetter(letter);
      if (l < 0) return fail(`«${letter}» no es un tipo de orbital (s, p, d, f).`);
      let j = i + 2;
      let caret = false;
      if (s[j] === '^') {
        caret = true;
        j++;
      }
      let digits = '';
      while (j < s.length && /\d/.test(s[j]!)) digits += s[j++];
      if (digits === '') return fail(`Falta el número de electrones en ${n}${letter}.`);
      let exponent = digits;
      if (!caret && digits.length >= 2 && j < s.length && /[a-zA-Z]/.test(s[j]!)) {
        // «3s23p4»: el último dígito es el n del siguiente subnivel.
        exponent = digits.slice(0, -1);
        j -= 1;
      }
      if (exponent.length > 2) return fail(`No se entiende «${s.slice(i, j)}».`);
      tokens.push({ n, l, e: Number(exponent), raw: `${n}${letter}${exponent}` });
      i = j;
      continue;
    }
    return fail(`Carácter inesperado «${ch}».`);
  }
  if (!core && tokens.length === 0) return fail('No se ha escrito ninguna configuración.');
  return { ok: true, core, tokens, error: null };
}

export type ConfigStatus = 'fundamental' | 'excitado' | 'prohibido' | 'imposible' | 'ilegible';

export interface ConfigIssue {
  code:
    | 'ilegible'
    | 'subnivel-inexistente'
    | 'exceso-electrones'
    | 'subnivel-repetido'
    | 'nucleo-solapado'
    | 'numero-electrones'
    | 'hueco-inferior'
    | 'excepcion-moller'
    | 'orden-escritura';
  message: string;
  severity: 'error' | 'aviso' | 'info';
}

export interface ConfigDiagnosis {
  status: ConfigStatus;
  electrons: number;
  configuration: Configuration;
  issues: ConfigIssue[];
  /** Configuración fundamental de referencia para ese número de electrones (y núcleo, si se da). */
  expectedGround: Configuration | null;
}

export interface DiagnoseOptions {
  /** Z del núcleo (para iones); si no se da, se supone átomo neutro con Z = nº de electrones. */
  z?: number;
  expectedElectrons?: number;
}

export function diagnoseConfiguration(text: string, opts: DiagnoseOptions = {}): ConfigDiagnosis {
  const parsed = parseConfigurationText(text);
  if (!parsed.ok) {
    return { status: 'ilegible', electrons: 0, configuration: [], issues: [{ code: 'ilegible', message: parsed.error ?? 'No se entiende la configuración.', severity: 'error' }], expectedGround: null };
  }
  const issues: ConfigIssue[] = [];
  const map = new Map<string, SubshellOcc>();
  if (parsed.core) for (const s of groundState(parsed.core.z)) map.set(subshellLabel(s), { ...s });
  const coreLabels = new Set(map.keys());
  let impossible = false;
  let forbidden = false;
  for (const t of parsed.tokens) {
    const label = `${t.n}${lLetter(t.l)}`;
    if (t.l >= t.n) {
      impossible = true;
      issues.push({
        code: 'subnivel-inexistente',
        message: `El subnivel ${label} no existe: para n = ${t.n}, l solo puede valer ${t.n === 1 ? '0 (solo hay 1s)' : `de 0 a ${t.n - 1}`}.`,
        severity: 'error',
      });
    }
    if (t.e > subshellCapacity(t.l)) {
      forbidden = true;
      issues.push({
        code: 'exceso-electrones',
        message: `${label}${toSuperscript(t.e)} es imposible: un subnivel ${lLetter(t.l)} tiene ${2 * t.l + 1} orbital${t.l ? 'es' : ''} y admite como máximo ${subshellCapacity(t.l)} electrones (principio de exclusión de Pauli).`,
        severity: 'error',
      });
    }
    if (coreLabels.has(label)) {
      issues.push({ code: 'nucleo-solapado', message: `${label} ya está incluido en [${parsed.core!.symbol}].`, severity: 'error' });
    } else if (map.has(label)) {
      issues.push({ code: 'subnivel-repetido', message: `El subnivel ${label} aparece dos veces.`, severity: 'error' });
    }
    const prev = map.get(label)?.e ?? 0;
    map.set(label, { n: t.n, l: t.l, e: prev + t.e });
  }
  const configuration = canonical(map);
  const electrons = electronCount(configuration);

  if (opts.expectedElectrons !== undefined && electrons !== opts.expectedElectrons) {
    issues.push({
      code: 'numero-electrones',
      message: `La configuración tiene ${electrons} electrones y deberían ser ${opts.expectedElectrons}.`,
      severity: 'error',
    });
  }

  // Orden de escritura (informativo)
  const writtenIdx = parsed.tokens.map((t) => madelungIndex(t));
  const byFilling = writtenIdx.every((v, k) => k === 0 || v > writtenIdx[k - 1]!);
  const byShell = parsed.tokens.every((t, k) => k === 0 || t.n > parsed.tokens[k - 1]!.n || (t.n === parsed.tokens[k - 1]!.n && t.l > parsed.tokens[k - 1]!.l));
  if (!byFilling && !byShell && !impossible) {
    issues.push({ code: 'orden-escritura', message: 'Los subniveles no están escritos en orden de llenado ni por capas. No es un error de contenido, pero dificulta la lectura.', severity: 'info' });
  }

  if (impossible || forbidden) {
    return { status: impossible ? 'imposible' : 'prohibido', electrons, configuration, issues, expectedGround: null };
  }

  const z = opts.z ?? electrons;
  let expectedGround: Configuration | null = null;
  if (z >= 1 && z <= 118 && electrons > 0) {
    expectedGround = speciesConfiguration(z, electrons);
  } else if (electrons > 0 && electrons <= 118) {
    expectedGround = aufbau(electrons);
  }

  if (expectedGround && sameConfiguration(configuration, expectedGround)) {
    return { status: 'fundamental', electrons, configuration, issues, expectedGround };
  }

  // Coincide con Möller pero el elemento es una excepción (Cr, Cu…)
  if (electrons === z && sameConfiguration(configuration, aufbau(electrons)) && expectedGround) {
    const el = elementByZ(z);
    issues.push({
      code: 'excepcion-moller',
      message: `Es lo que da el diagrama de Möller, pero el ${el?.name.toLowerCase() ?? 'elemento'} es una excepción: su estado fundamental real es ${formatConfiguration(expectedGround, { abbreviate: true })}. La configuración de Möller corresponde a un estado excitado.`,
      severity: 'aviso',
    });
    return { status: 'excitado', electrons, configuration, issues, expectedGround };
  }

  // ¿Hay un subnivel incompleto por debajo (en orden de llenado) de uno ocupado?
  const occupiedMax = Math.max(...configuration.map(madelungIndex));
  const hole = MADELUNG_ORDER.slice(0, occupiedMax).find((s) => (map.get(subshellLabel(s))?.e ?? 0) < subshellCapacity(s.l));
  if (hole) {
    issues.push({
      code: 'hueco-inferior',
      message: `El subnivel ${subshellLabel(hole)} no está completo, pero hay electrones en subniveles de mayor energía: es un estado excitado.`,
      severity: 'aviso',
    });
  }
  return { status: 'excitado', electrons, configuration, issues, expectedGround };
}

export const STATUS_LABEL: Record<ConfigStatus, string> = {
  fundamental: 'Estado fundamental',
  excitado: 'Estado excitado',
  prohibido: 'Configuración prohibida (Pauli)',
  imposible: 'Configuración imposible (subnivel inexistente)',
  ilegible: 'No se puede interpretar',
};
