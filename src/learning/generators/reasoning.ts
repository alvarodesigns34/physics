/**
 * ATOM 3.0 · Familias de ejercicios que obligan a RAZONAR (no a sustituir números).
 *
 * Cada familia es genuinamente distinta (procedimiento y razonamiento diferentes), con datos reales o
 * calculados, resolución explicada por bloques y, cuando existen, varios caminos válidos:
 *  1. error-rydberg       Detectar y corregir el error en una resolución ajena (Rydberg).
 *  2. pistas-elemento     Deducir un elemento a partir de propiedades indirectas.
 *  3. ei-sucesivas        Grupo y elemento a partir de energías de ionización sucesivas.
 *  4. linea-desconocida   Serie y nivel de una línea del H sin saber n₁ (dos métodos).
 *  5. grafica-ei          Interpretar la gráfica de EI₁ de un periodo: anomalías y su causa.
 *  6. bohr-proporciones   Razonar con proporcionalidades (r ∝ n², E ∝ 1/n²) sin calculadora.
 *  7. luz-ionizante       λ máxima que ioniza un átomo a partir de su EI en kJ/mol (multibloque).
 *  8. ion-misterioso      Identificar un ion por su configuración y su masa (multibloque).
 *  9. prediccion-modelos  Qué predice cada modelo histórico ante un experimento.
 * 10. desarrollo          Preguntas de desarrollo con rúbrica y autoevaluación.
 */
import { CODATA, EXERCISE_DATA } from '../../science/constants';
import { transition } from '../../science/hydrogen';
import { elementByZ, ieKJPerMol } from '../../science/elements';
import { formatConfiguration, groundState, speciesConfiguration, unpairedElectrons, valenceElectrons } from '../../science/configuration';
import { commonIon } from '../../science/trends';
import { ionSymbol } from '../../science/nucleus';
import { formatNumber } from '../../science/numbers';
import type { Difficulty, EssayCriterion, Exercise, ExerciseGenerator, ExercisePart, ResolutionStep } from '../types';
import { choicePart, exId, fmt, integerPart, numericPart, pick, rngFor, shuffle } from './util';

const O = (id: string, text: string, feedback?: string) => ({ id, text, feedback });
const sci = (v: number, sig = 4) => formatNumber(v, { sig });
/** Notación científica en el subconjunto LaTeX de MathText */
const tex = (v: number, sig = 4) => {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  // Entre 0,01 y 9999 se escribe sin potencia (91,2 nm, no 9,12·10¹ nm).
  if (e >= -2 && e <= 3) return Number(v.toPrecision(sig)).toLocaleString('es-ES', { maximumFractionDigits: 6, useGrouping: false });
  const m = v / 10 ** e;
  const ms = m.toFixed(sig - 1).replace('.', ',');
  return e === 0 ? ms : `${ms}\\cdot 10^{${e}}`;
};
const abbr = (z: number) => formatConfiguration(groundState(z), { abbreviate: true });
const SERIES_NAME: Record<number, string> = { 1: 'Lyman', 2: 'Balmer', 3: 'Paschen', 4: 'Brackett', 5: 'Pfund' };

// ── 1. Detectar el error en una resolución (Rydberg) ─────────────────────

type RydbergError = 'cuadrados' | 'suma' | 'inversa' | 'nm';
const ERROR_TEXT: Record<RydbergError, string> = {
  cuadrados: 'Olvida elevar al cuadrado los niveles',
  suma: 'Suma los términos en lugar de restarlos',
  inversa: 'Da 1/λ como si fuera λ (no invierte)',
  nm: 'Convierte de m a nm dividiendo en lugar de multiplicar',
};

export function buildRydbergErrorExercise(n1: number, n2: number, err: RydbergError, difficulty: Difficulty, seedId: string): Exercise {
  const R = EXERCISE_DATA.R;
  const good = R * (1 / n1 ** 2 - 1 / n2 ** 2);
  const lam = 1 / good;
  const lamNm = lam * 1e9;
  const bracketOk = `1/${n1}² − 1/${n2}²`;
  const lines: string[] = [];
  let wrongLine = 0;
  // Línea 1–2: datos y fórmula (siempre correctas, salvo el error de cuadrados que aparece en la sustitución)
  lines.push(`Transición n = ${n2} → n = ${n1}. Dato: R = 1,0974·10⁷ m⁻¹.`);
  lines.push(`1/λ = R·(1/n₁² − 1/n₂²)`);
  if (err === 'cuadrados') {
    const v = R * (1 / n1 - 1 / n2);
    lines.push(`1/λ = 1,0974·10⁷·(1/${n1} − 1/${n2})`);
    lines.push(`1/λ = ${sci(v)} m⁻¹`);
    lines.push(`λ = ${sci(1 / v)} m = ${sci(1e9 / v)} nm`);
    wrongLine = 3;
  } else if (err === 'suma') {
    const v = R * (1 / n1 ** 2 + 1 / n2 ** 2);
    lines.push(`1/λ = 1,0974·10⁷·(1/${n1 * n1} + 1/${n2 * n2})`);
    lines.push(`1/λ = ${sci(v)} m⁻¹`);
    lines.push(`λ = ${sci(1 / v)} m = ${sci(1e9 / v)} nm`);
    wrongLine = 3;
  } else if (err === 'inversa') {
    lines.push(`1/λ = 1,0974·10⁷·(${bracketOk})`);
    lines.push(`1/λ = ${sci(good)} m⁻¹`);
    lines.push(`λ = ${sci(good)} m`);
    wrongLine = 5;
  } else {
    lines.push(`1/λ = 1,0974·10⁷·(${bracketOk})`);
    lines.push(`1/λ = ${sci(good)} m⁻¹ → λ = ${sci(lam)} m`);
    lines.push(`λ = ${sci(lam)} m / 10⁹ = ${sci(lam / 1e9)} nm`);
    wrongLine = 5;
  }
  const kinds = Object.keys(ERROR_TEXT) as RydbergError[];
  const parts: ExercisePart[] = [
    choicePart('linea', '¿En qué línea aparece el primer error?', lines.map((_, i) => O(String(i + 1), `Línea ${i + 1}`)), [String(wrongLine)], `El primer error está en la línea ${wrongLine}: ${ERROR_TEXT[err].toLowerCase()}.`),
    choicePart('tipo', '¿Qué error se ha cometido?', kinds.map((k) => O(k, ERROR_TEXT[k])), [err], `${ERROR_TEXT[err]}.`),
    numericPart({ id: 'lam', prompt: 'Corrige: ¿cuál es la longitud de onda correcta?', value: lamNm, unit: 'nm', sig: 4, explanation: `1/λ = R·(${bracketOk}) = ${sci(good)} m⁻¹ → λ = ${sci(lam)} m = ${sci(lamNm)} nm.`, skills: ['calculo', 'unidades'], nodeIds: ['3.6'] }),
  ];
  const resolution: ResolutionStep[] = [
    { kind: 'pregunta', text: 'Revisar una resolución ajena línea a línea, localizar el PRIMER error y rehacer el cálculo.' },
    { kind: 'metodo', text: 'Comprueba cada línea con una estimación rápida antes de mirar la siguiente: ¿el orden de magnitud es razonable? Para el hidrógeno, Lyman cae en 90–122 nm, Balmer en 365–656 nm y Paschen en 820–1875 nm.' },
    { kind: 'principio', text: 'Ecuación de Rydberg para el hidrógeno:', math: `\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)` },
    { kind: 'sustitucion', text: '', math: `\\frac{1}{\\lambda} = 1,0974\\cdot 10^{7}\\left(\\frac{1}{${n1 * n1}} - \\frac{1}{${n2 * n2}}\\right) = ${tex(good)}\\;\\text{m}^{-1}` },
    { kind: 'calculo', text: 'Invertir y pasar a nm (1 m = 10⁹ nm: se MULTIPLICA por 10⁹):', math: `\\lambda = \\frac{1}{${tex(good)}} = ${tex(lam)}\\;\\text{m} = ${tex(lamNm)}\\;\\text{nm}` },
    { kind: 'resultado', text: `λ = ${sci(lamNm)} nm (serie de ${SERIES_NAME[n1]}).` },
    { kind: 'errores', text: 'Los cuatro errores típicos de este cálculo: no elevar al cuadrado, sumar en vez de restar, no invertir 1/λ y dividir por 10⁹ al pasar a nm. Todos dan valores fuera de la región de la serie: compruébalo siempre.' },
  ];
  return {
    id: seedId,
    generatorId: 'error-rydberg',
    nodeIds: ['3.6', '3.9'],
    difficulty,
    level: 4,
    title: 'Encuentra el error',
    statement: `Un compañero ha calculado la longitud de onda de la línea emitida en el salto **n = ${n2} → n = ${n1}** del hidrógeno. Su resolución tiene **un error**. Localízalo, identifícalo y da el resultado correcto.`,
    figure: { kind: 'resolucion', title: 'Resolución del compañero', lines },
    parts: [{ ...parts[0]!, nodeIds: ['3.6'], skills: ['razonamiento'] }, { ...parts[1]!, nodeIds: ['3.6', '3.9'], skills: ['formula', 'unidades'] }, parts[2]!],
    stepwise: true,
    hints: ['No rehagas todo de golpe: comprueba cada línea por separado y pregúntate si el número es razonable.', `Para n₁ = ${n1} (serie de ${SERIES_NAME[n1]}) la λ debe caer en una región concreta del espectro. ¿Cae ahí el resultado final?`, 'Revisa: ¿están los niveles al cuadrado?, ¿se resta?, ¿se invierte 1/λ?, ¿1 m = 10⁹ nm se aplica multiplicando?'],
    solution: [`Primer error: línea ${wrongLine} (${ERROR_TEXT[err].toLowerCase()}).`, `Correcto: 1/λ = ${sci(good)} m⁻¹ → λ = ${sci(lamNm)} nm.`],
    resolution,
  };
}

const RYD_PAIRS: [number, number][] = [
  [1, 2], [1, 3], [2, 3], [2, 4], [2, 5], [2, 6], [3, 4], [3, 5],
];

export const rydbergErrorGenerator: ExerciseGenerator = {
  id: 'error-rydberg',
  title: 'Encuentra el error (Rydberg)',
  nodeIds: ['3.6', '3.9'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const [n1, n2] = pick(rng, RYD_PAIRS);
    const err = pick(rng, ['cuadrados', 'suma', 'inversa', 'nm'] as const);
    return buildRydbergErrorExercise(n1, n2, err, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 2. Elemento a partir de pistas indirectas ────────────────────────────

interface Clue {
  key: string;
  text: string;
  holds: (z: number) => boolean;
}

const CANDIDATES = Array.from({ length: 36 }, (_, i) => i + 1);

function cluesFor(z: number): Clue[] {
  const el = elementByZ(z)!;
  const conf = groundState(z);
  const unp = unpairedElectrons(conf);
  const ion = commonIon(el).charge;
  const val = el.block === 's' || el.block === 'p' ? valenceElectrons(conf) : null;
  const out: Clue[] = [
    { key: 'periodo', text: `Está en el periodo ${el.period}.`, holds: (x) => elementByZ(x)!.period === el.period },
    { key: 'desap', text: `En su estado fundamental tiene ${unp} electrón${unp === 1 ? '' : 'es'} desapareado${unp === 1 ? '' : 's'}.`, holds: (x) => unpairedElectrons(groundState(x)) === unp },
    { key: 'bloque', text: `Pertenece al bloque ${el.block}.`, holds: (x) => elementByZ(x)!.block === el.block },
  ];
  if (ion !== null) out.push({ key: 'ion', text: `Su ion más estable tiene carga ${ion > 0 ? '+' : '−'}${Math.abs(ion)}.`, holds: (x) => commonIon(elementByZ(x)!).charge === ion });
  if (val !== null) out.push({ key: 'val', text: `Tiene ${val} electrones en su capa de valencia.`, holds: (x) => { const e = elementByZ(x)!; return (e.block === 's' || e.block === 'p') && valenceElectrons(groundState(x)) === val; } });
  if (el.category === 'no-metal' || el.category === 'halogeno' || el.category === 'gas-noble') out.push({ key: 'nometal', text: 'Es un no metal.', holds: (x) => ['no-metal', 'halogeno', 'gas-noble'].includes(elementByZ(x)!.category) });
  return out;
}

export function buildCluesExercise(z: number, difficulty: Difficulty, seedId: string, rng: () => number): Exercise {
  const el = elementByZ(z)!;
  const all = shuffle(rng, cluesFor(z));
  // Se añaden pistas hasta que solo un elemento (Z ≤ 36) las cumple todas.
  const chosen: Clue[] = [];
  let left = CANDIDATES;
  for (const c of all) {
    if (left.length === 1) break;
    const next = left.filter(c.holds);
    if (next.length < left.length) {
      chosen.push(c);
      left = next;
    }
  }
  if (left.length !== 1 || left[0] !== z) throw new Error(`Pistas no concluyentes para Z = ${z}`);
  const parts: ExercisePart[] = [
    { id: 'el', prompt: '¿De qué elemento se trata?', answer: { kind: 'element', z }, canonical: el.symbol, explanation: `Solo ${el.name} (${abbr(z)}) cumple todas las pistas entre los 36 primeros elementos.`, placeholder: 'símbolo o nombre', nodeIds: ['7.2'], skills: ['razonamiento', 'concepto'] },
    { id: 'conf', prompt: 'Escribe su configuración electrónica (puedes abreviarla con el gas noble).', answer: { kind: 'config', electrons: z, z }, canonical: abbr(z), explanation: `${el.symbol}: ${abbr(z)}.`, placeholder: 'p. ej. [Ne] 3s2 3p4', nodeIds: ['6.3'] },
  ];
  return {
    id: seedId,
    generatorId: 'pistas-elemento',
    nodeIds: ['7.2', '6.3', '6.4'],
    difficulty,
    level: 4,
    title: 'Identifica el elemento',
    statement: `Un elemento X (Z ≤ 36) cumple todas estas condiciones:\n${chosen.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}\n¿Qué elemento es?`,
    parts,
    stepwise: false,
    hints: ['Empieza por la pista que más reduce las posibilidades (el periodo o el bloque) y descarta con las demás.', 'Escribe la configuración de los candidatos que quedan y cuenta electrones desapareados con la regla de Hund.', `Candidatos tras la primera pista: ${CANDIDATES.filter(chosen[0]!.holds).map((x) => elementByZ(x)!.symbol).join(', ')}.`],
    solution: chosen.map((c) => `${c.text} → quedan ${CANDIDATES.filter((x) => chosen.slice(0, chosen.indexOf(c) + 1).every((k) => k.holds(x))).map((x) => elementByZ(x)!.symbol).join(', ')}.`),
    resolution: [
      { kind: 'pregunta', text: 'Deducir un elemento a partir de propiedades indirectas: un problema de descarte.' },
      { kind: 'metodo', text: 'Aplica las pistas en orden, de la más restrictiva a la menos, y escribe la lista de candidatos que sobrevive a cada una.' },
      ...chosen.map((c, i): ResolutionStep => ({ kind: 'calculo', text: `${c.text} → ${CANDIDATES.filter((x) => chosen.slice(0, i + 1).every((k) => k.holds(x))).map((x) => elementByZ(x)!.symbol).join(', ')}` })),
      { kind: 'resultado', text: `X = ${el.name} (${el.symbol}), ${abbr(z)}.` },
      { kind: 'comprobacion', text: 'Vuelve a comprobar TODAS las pistas con la configuración final: si una falla, has descartado mal en algún paso.' },
    ],
  };
}

// Cu (Z = 29) y Sc comparten periodo, bloque y un electrón desapareado: con estas pistas no se distinguen.
const CLUE_ZS = [5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 19, 20, 24, 26, 31, 32, 33, 34, 35, 3, 11, 4];

export const cluesGenerator: ExerciseGenerator = {
  id: 'pistas-elemento',
  title: 'Identifica el elemento por pistas',
  nodeIds: ['7.2', '6.3', '6.4'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    // Algunas combinaciones de pistas no bastan para un único elemento: se prueba con otro Z (determinista).
    for (let k = 0; k < 40; k++) {
      const rng = rngFor(this.id, seed + k * 7919, difficulty);
      const z = pick(rng, CLUE_ZS);
      try {
        return buildCluesExercise(z, difficulty, exId(this.id, difficulty, seed), rng);
      } catch {
        /* siguiente intento */
      }
    }
    throw new Error('No se pudo generar un conjunto de pistas concluyente');
  },
};

// ── 3. Energías de ionización sucesivas ──────────────────────────────────

/** Energías de ionización sucesivas en kJ/mol (CRC Handbook of Chemistry and Physics; valores redondeados). */
export const SUCCESSIVE_IE: Record<number, number[]> = {
  3: [520, 7298, 11815],
  4: [900, 1757, 14849, 21007],
  5: [801, 2427, 3660, 25026, 32827],
  6: [1086, 2353, 4621, 6223, 37831],
  11: [496, 4562, 6910, 9543, 13354],
  12: [738, 1451, 7733, 10543, 13630],
  13: [578, 1817, 2745, 11577, 14842],
  14: [787, 1577, 3232, 4356, 16091],
  19: [419, 3052, 4420, 5877, 7975],
  20: [590, 1145, 4912, 6491, 8153],
};

export function buildSuccessiveIE(z: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const ie = SUCCESSIVE_IE[z]!;
  const ratios = ie.slice(1).map((v, i) => v / ie[i]!);
  const jumpAt = ratios.indexOf(Math.max(...ratios)) + 1; // electrones antes del gran salto
  const parts: ExercisePart[] = [
    integerPart('val', '¿Cuántos electrones de valencia tiene X?', jumpAt, `El gran salto está entre EI${jumpAt} y EI${jumpAt + 1} (×${fmt(ratios[jumpAt - 1]!, 2)}): tras quitar ${jumpAt} electrón${jumpAt === 1 ? '' : 'es'} se empieza a arrancar de una capa interna completa.`),
    integerPart('grupo', '¿En qué grupo de la tabla está?', el.group!, `${jumpAt} electrones de valencia ${jumpAt <= 2 ? '(ns)' : '(ns² np)'} → grupo ${el.group}.`),
    { id: 'el', prompt: `Sabiendo que está en el periodo ${el.period}, ¿qué elemento es?`, answer: { kind: 'element', z }, canonical: el.symbol, explanation: `Periodo ${el.period}, grupo ${el.group}: ${el.name} (${abbr(z)}).`, placeholder: 'símbolo o nombre' },
    choicePart('porque', '¿Por qué aparece un salto tan grande?', [O('capa', 'Se pasa a arrancar electrones de una capa interna, más cercana al núcleo y menos apantallada'), O('carga', 'Porque el ion tiene más carga positiva, y eso basta para explicarlo'), O('masa', 'Porque los electrones internos tienen más masa'), O('par', 'Porque hay que romper un par de electrones del mismo orbital')], ['capa'], 'Cada EI sucesiva es algo mayor (el ion es más positivo), pero el SALTO grande aparece al pasar a una capa interna: menor n, mucho mayor Z efectiva.'),
  ];
  return {
    id: seedId,
    generatorId: 'ei-sucesivas',
    nodeIds: ['7.9', '6.9', '7.2'],
    difficulty,
    level: 4,
    title: 'Energías de ionización sucesivas',
    statement: `Las energías de ionización sucesivas de un elemento X son (kJ/mol):\n**${ie.map((v, i) => `EI${i + 1} = ${v.toLocaleString('es-ES')}`).join(' · ')}**`,
    figure: { kind: 'puntos', title: 'Energías de ionización sucesivas de X (kJ/mol)', xLabel: 'n.º de electrón arrancado', yLabel: 'kJ/mol', points: ie.map((v, i) => ({ x: i + 1, y: v, label: `EI${i + 1}` })) },
    data: [{ label: 'Fuente', value: 'CRC Handbook (redondeado)' }],
    parts: [{ ...parts[0]!, nodeIds: ['6.9', '7.9'], skills: ['razonamiento'] }, { ...parts[1]!, nodeIds: ['7.2'] }, { ...parts[2]!, nodeIds: ['7.2'] }, { ...parts[3]!, nodeIds: ['7.9'] }],
    stepwise: true,
    hints: ['No mires los valores absolutos: busca dónde se multiplica la EI de golpe.', 'Divide cada EI entre la anterior. El cociente mucho mayor que los demás marca el paso a una capa interna.', `Cocientes: ${ratios.map((r, i) => `EI${i + 2}/EI${i + 1} ≈ ${fmt(r, 2)}`).join(' · ')}.`],
    solution: [`Gran salto tras EI${jumpAt} → ${jumpAt} electrones de valencia → grupo ${el.group}.`, `Periodo ${el.period}: ${el.name}.`],
    resolution: [
      { kind: 'pregunta', text: 'Deducir el número de electrones de valencia a partir de cómo crecen las EI sucesivas.' },
      { kind: 'principio', text: 'Cada electrón arrancado deja un ion más positivo: las EI siempre crecen. Pero al pasar de la capa de valencia a una capa interna (n menor, casi sin apantallamiento) el aumento es enorme.' },
      { kind: 'calculo', text: `Cocientes entre EI consecutivas: ${ratios.map((r, i) => `${fmt(r, 2)} (${i + 1}→${i + 2})`).join(', ')}. El mayor está entre EI${jumpAt} y EI${jumpAt + 1}.` },
      { kind: 'resultado', text: `${jumpAt} electrones de valencia → grupo ${el.group}; periodo ${el.period} → ${el.name}.` },
      { kind: 'comprobacion', text: `Configuración: ${abbr(z)}. La capa de valencia tiene ${jumpAt} electrón${jumpAt === 1 ? '' : 'es'}: coincide.` },
      { kind: 'errores', text: 'Confundir «la EI más alta» con «el salto»: la última EI siempre es la mayor; lo que informa es el cociente.' },
    ],
  };
}

export const successiveIEGenerator: ExerciseGenerator = {
  id: 'ei-sucesivas',
  title: 'Energías de ionización sucesivas',
  nodeIds: ['7.9', '6.9', '7.2'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildSuccessiveIE(pick(rng, Object.keys(SUCCESSIVE_IE).map(Number)), difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 4. Línea desconocida: serie y nivel sin conocer n₁ ───────────────────

export function buildUnknownLine(n1: number, n2: number, difficulty: Difficulty, seedId: string): Exercise {
  const t = transition(n2, n1, EXERCISE_DATA);
  const lamNm = t.wavelength * 1e9;
  const shown = Number(lamNm.toPrecision(4));
  const region = lamNm < 380 ? 'uv' : lamNm <= 750 ? 'vis' : 'ir';
  const regionText = { uv: 'ultravioleta', vis: 'visible', ir: 'infrarrojo' }[region];
  const R = EXERCISE_DATA.R;
  const tryN1 = [1, 2, 3].map((k) => {
    const inv = 1 / k ** 2 - 1 / (shown * 1e-9 * R);
    return { k, n2: inv > 0 ? Math.sqrt(1 / inv) : NaN };
  });
  const parts: ExercisePart[] = [
    choicePart('region', '¿En qué región del espectro está la línea?', [O('uv', 'Ultravioleta'), O('vis', 'Visible'), O('ir', 'Infrarrojo')], [region], `${shown.toLocaleString('es-ES')} nm → ${regionText}.`),
    choicePart('serie', '¿A qué serie pertenece?', [1, 2, 3].map((k) => O(String(k), `${SERIES_NAME[k]} (n₁ = ${k})`)), [String(n1)], `Solo con n₁ = ${n1} sale un n₂ entero: serie de ${SERIES_NAME[n1]}.`),
    integerPart('n2', '¿Desde qué nivel n₂ cae el electrón?', n2, `1/n₂² = 1/n₁² − 1/(λR) → n₂ = ${n2}.`),
  ];
  return {
    id: seedId,
    generatorId: 'linea-desconocida',
    nodeIds: ['3.7', '3.6', '3.3'],
    difficulty,
    level: 5,
    title: 'Una línea sin etiqueta',
    statement: `En el espectro de emisión del hidrógeno se mide una línea de **λ = ${shown.toLocaleString('es-ES')} nm**. No sabemos a qué serie pertenece. Dato: R = 1,0974·10⁷ m⁻¹.`,
    figure: region === 'vis' ? { kind: 'espectro', title: 'Línea medida (escala del visible)', linesNm: [lamNm], fromNm: 380, toNm: 750 } : undefined,
    parts: [{ ...parts[0]!, nodeIds: ['3.3'] }, { ...parts[1]!, nodeIds: ['3.7'], skills: ['razonamiento'] }, { ...parts[2]!, nodeIds: ['3.6'], skills: ['formula', 'calculo'] }],
    stepwise: true,
    hints: ['La región del espectro ya descarta series: cada serie del H ocupa una franja.', 'Lyman: 91–122 nm (UV). Balmer: 365–656 nm (visible y UV cercano). Paschen: 820–1875 nm (IR).', 'Despeja 1/n₂² = 1/n₁² − 1/(λ·R) con el n₁ de la serie y comprueba que n₂ sale entero.'],
    solution: [`Región: ${regionText} → ${SERIES_NAME[n1]} (n₁ = ${n1}).`, `n₂ = ${n2}.`],
    resolution: [
      { kind: 'pregunta', text: 'Dos incógnitas (n₁ y n₂) y una sola ecuación: necesitamos un razonamiento adicional para fijar n₁.' },
      { kind: 'principio', text: 'Ecuación de Rydberg, despejada para el nivel superior:', math: `\\frac{1}{n_2^2} = \\frac{1}{n_1^2} - \\frac{1}{\\lambda R}` },
      { kind: 'metodo', text: `Método A (por regiones): ${shown.toLocaleString('es-ES')} nm es ${regionText}; solo la serie de ${SERIES_NAME[n1]} tiene líneas ahí → n₁ = ${n1}.` },
      { kind: 'calculo', text: '', math: `\\frac{1}{n_2^2} = \\frac{1}{${n1 * n1}} - \\frac{1}{${tex(shown * 1e-9)}\\cdot 1,0974\\cdot 10^{7}} \\to n_2 = ${fmt(Math.sqrt(1 / (1 / n1 ** 2 - 1 / (shown * 1e-9 * R))), 3)} \\approx ${n2}` },
      { kind: 'resultado', text: `Serie de ${SERIES_NAME[n1]}, salto ${n2} → ${n1}.` },
      { kind: 'comprobacion', text: 'n₂ debe salir (casi) entero y mayor que n₁. Si sale 2,6 o negativo, el n₁ supuesto es incorrecto.' },
    ],
    methods: [
      {
        title: 'Método B: probar cada serie',
        advantage: 'no exige recordar las regiones; sirve aunque la línea esté en una zona dudosa',
        steps: tryN1.map((x): ResolutionStep => ({ kind: 'calculo', text: Number.isFinite(x.n2) ? `n₁ = ${x.k} → n₂ = ${fmt(x.n2, 3)}${Math.abs(x.n2 - Math.round(x.n2)) < 0.03 && Math.round(x.n2) > x.k ? ' (entero: ✓)' : ' (no entero: ✗)'}` : `n₁ = ${x.k} → 1/n₂² negativo: imposible (✗)` })),
      },
    ],
  };
}

const UNKNOWN_LINES: [number, number][] = [
  [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [2, 5], [2, 6], [3, 4], [3, 5], [3, 6],
];

export const unknownLineGenerator: ExerciseGenerator = {
  id: 'linea-desconocida',
  title: 'Línea del H sin serie conocida',
  nodeIds: ['3.7', '3.6', '3.3'],
  difficulties: [3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const [n1, n2] = pick(rng, UNKNOWN_LINES);
    return buildUnknownLine(n1, n2, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 5. Interpretar la gráfica de EI₁ de un periodo ───────────────────────

export function buildIEGraph(period: 2 | 3, difficulty: Difficulty, seedId: string): Exercise {
  const zs = period === 2 ? [3, 4, 5, 6, 7, 8, 9, 10] : [11, 12, 13, 14, 15, 16, 17, 18];
  const pts = zs.map((z) => ({ z, el: elementByZ(z)!, v: Math.round(ieKJPerMol(elementByZ(z)!.ie1!)) }));
  const drops = pts.filter((p, i) => i > 0 && p.v < pts[i - 1]!.v).map((p) => p.el.symbol);
  const [g13, g16] = drops as [string, string];
  const parts: ExercisePart[] = [
    choicePart('anom', 'Marca los DOS elementos que rompen la tendencia creciente.', pts.map((p) => O(p.el.symbol, `${p.el.symbol} (${p.v} kJ/mol)`)), drops, `${g13} y ${g16} tienen menor EI₁ que el elemento anterior.`, true),
    choicePart('r13', `¿Por qué la EI₁ de ${g13} es menor que la del elemento anterior?`, [O('p', `El electrón que se arranca está en un orbital ${period}p, de mayor energía y más apantallado por ${period}s²`), O('par', 'Porque arrancar un electrón apareado cuesta menos'), O('radio', `Porque ${g13} tiene un radio mayor que el anterior al tener más protones`), O('noble', 'Porque se acerca a la configuración de gas noble')], ['p'], `${g13}: ${abbr(pts.find((p) => p.el.symbol === g13)!.z)}. Su electrón más externo es el primero ${period}p: más alejado en energía y apantallado por el par ${period}s².`),
    choicePart('r16', `¿Y la de ${g16}?`, [O('par', `Su cuarto electrón ${period}p está apareado: la repulsión entre los dos electrones del mismo orbital facilita arrancarlo`), O('p', `Porque es el primer electrón ${period}p`), O('zef', 'Porque su Z efectiva es menor que la del anterior'), O('semilleno', `Porque ${g16} tiene una subcapa semillena muy estable`)], ['par'], `${g16}: ${period}p⁴. El elemento anterior tiene ${period}p³ (semillena, un electrón por orbital); en ${g16} dos electrones comparten orbital y se repelen.`),
  ];
  return {
    id: seedId,
    generatorId: 'grafica-ei',
    nodeIds: ['7.9', '7.13', '6.4'],
    difficulty,
    level: 4,
    title: 'Lee la gráfica de energías de ionización',
    statement: `La gráfica muestra la primera energía de ionización de los elementos del periodo ${period}. La tendencia general es creciente, pero hay excepciones.`,
    figure: { kind: 'puntos', title: `EI₁ del periodo ${period} (kJ/mol, datos NIST)`, xLabel: 'elemento', yLabel: 'EI₁ (kJ/mol)', points: pts.map((p) => ({ x: p.z, y: p.v, label: p.el.symbol })) },
    parts: [{ ...parts[0]!, nodeIds: ['7.13'] }, { ...parts[1]!, nodeIds: ['7.9', '7.13'], skills: ['razonamiento'] }, { ...parts[2]!, nodeIds: ['6.4', '7.13'], skills: ['razonamiento'] }],
    stepwise: true,
    hints: ['Busca los puntos que están por DEBAJO del punto anterior.', `Escribe la configuración de esos elementos y la del elemento anterior: fíjate en el último subnivel.`, `Uno es el primer elemento con ${period}p¹; el otro, el primero que aparea un electrón ${period}p.`],
    solution: [`Anomalías: ${g13} (primer ${period}p) y ${g16} (primer ${period}p apareado).`],
    resolution: [
      { kind: 'pregunta', text: 'Interpretar una gráfica: localizar las excepciones y justificarlas con la configuración electrónica.' },
      { kind: 'datos', text: pts.map((p) => `${p.el.symbol} ${p.v}`).join(' · ') + ' kJ/mol.' },
      { kind: 'principio', text: 'En un periodo, Z efectiva crece y la EI₁ aumenta. Las excepciones se explican por la ENERGÍA del subnivel de donde sale el electrón y por la repulsión entre electrones apareados.' },
      { kind: 'interpretacion', text: `${g13}: el electrón sale de ${period}p (más energético que ${period}s, y apantallado por ${period}s²). ${g16}: el electrón sale de un orbital ${period}p doblemente ocupado; la repulsión lo desestabiliza.` },
      { kind: 'errores', text: 'Decir que la subcapa semillena «es estable» sin más: hay que explicar POR QUÉ el siguiente electrón se arranca con más facilidad (repulsión de apareamiento).' },
    ],
  };
}

export const ieGraphGenerator: ExerciseGenerator = {
  id: 'grafica-ei',
  title: 'Interpretar la gráfica de EI₁',
  nodeIds: ['7.9', '7.13', '6.4'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildIEGraph(pick(rng, [2, 3] as const), difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 6. Proporciones de Bohr ──────────────────────────────────────────────

export function buildBohrRatios(a: number, b: number, c: number, difficulty: Difficulty, seedId: string): Exercise {
  // r_n ∝ n²; E_n ∝ −1/n²; energía de la transición ∝ (1/n₁² − 1/n₂²)
  const rRatio = (b * b) / (a * a);
  const eRatio = (a * a) / (b * b);
  const t1 = 1 / (c - 1) ** 2 - 1 / c ** 2; // c → c−1
  const t0 = 1 - 1 / 4; // 2 → 1
  const parts: ExercisePart[] = [
    numericPart({ id: 'r', prompt: `¿Cuántas veces mayor es el radio de la órbita n = ${b} que el de n = ${a}?`, value: rRatio, unit: '', sig: 3, explanation: `r ∝ n²: (${b}/${a})² = ${fmt(rRatio, 3)}.`, nodeIds: ['4.2'], skills: ['razonamiento', 'formula'] }),
    numericPart({ id: 'E', prompt: `¿Qué fracción es |E${toSub(b)}| de |E${toSub(a)}|?`, value: eRatio, unit: '', sig: 3, explanation: `|E| ∝ 1/n²: (${a}/${b})² = ${fmt(eRatio, 3)}.`, nodeIds: ['4.2'], skills: ['razonamiento', 'formula'] }),
    numericPart({ id: 'foton', prompt: `El fotón del salto ${c} → ${c - 1}, ¿qué fracción de la energía del fotón 2 → 1 tiene?`, value: t1 / t0, unit: '', sig: 3, explanation: `E ∝ (1/n₁² − 1/n₂²): (1/${(c - 1) ** 2} − 1/${c * c}) / (1 − 1/4) = ${fmt(t1 / t0, 3)}.`, nodeIds: ['4.3'], skills: ['razonamiento', 'calculo'] }),
  ];
  return {
    id: seedId,
    generatorId: 'bohr-proporciones',
    nodeIds: ['4.2', '4.3'],
    difficulty,
    level: 3,
    title: 'Razona sin calculadora',
    statement: 'En el modelo de Bohr para el hidrógeno, el radio de la órbita es proporcional a n² y la energía, a −1/n². Responde SIN calcular radios ni energías absolutos: solo con proporciones.',
    parts,
    stepwise: false,
    hints: ['Si r = k·n², el cociente r_b/r_a no depende de k.', 'Escribe cada cociente como una fracción de cuadrados de n.', 'Para el fotón: E_fotón ∝ (1/n_final² − 1/n_inicial²). Divide las dos expresiones.'],
    solution: parts.map((p) => p.explanation),
    resolution: [
      { kind: 'principio', text: 'Proporcionalidad: si y = k·f(n), entonces y_b/y_a = f(b)/f(a) y la constante se cancela.', math: `\\frac{r_b}{r_a} = \\frac{b^2}{a^2}\\qquad \\frac{|E_b|}{|E_a|} = \\frac{a^2}{b^2}` },
      { kind: 'calculo', text: '', math: `\\frac{r_{${b}}}{r_{${a}}} = \\frac{${b * b}}{${a * a}} = ${fmt(rRatio, 3).replace('.', ',')}\\qquad \\frac{E_{${c}\\to ${c - 1}}}{E_{2\\to 1}} = \\frac{\\frac{1}{${(c - 1) ** 2}} - \\frac{1}{${c * c}}}{1 - \\frac{1}{4}} = ${fmt(t1 / t0, 3)}` },
      { kind: 'interpretacion', text: 'Las órbitas se separan cada vez más y los niveles se juntan: por eso los saltos entre niveles altos emiten fotones de poca energía (IR) y los que acaban en n = 1, de mucha (UV).' },
      { kind: 'errores', text: 'Usar n en lugar de n², o invertir el cociente de energías (|E| DISMINUYE al subir n).' },
    ],
  };
}

function toSub(n: number) {
  return String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]!);
}

export const bohrRatiosGenerator: ExerciseGenerator = {
  id: 'bohr-proporciones',
  title: 'Proporciones en el modelo de Bohr',
  nodeIds: ['4.2', '4.3'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const a = pick(rng, [1, 2]);
    const b = a + pick(rng, [1, 2, 3]);
    const c = pick(rng, [3, 4, 5]);
    return buildBohrRatios(a, b, c, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 7. Luz capaz de ionizar (EI en kJ/mol → λ) ───────────────────────────

const IONIZE_ZS = [3, 11, 19, 37, 55, 12, 20, 1, 2, 10];

export function buildIonizingLight(z: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const eiKJ = Math.round(ieKJPerMol(el.ie1!));
  const NA = 6.022e23;
  const { h, c } = EXERCISE_DATA;
  const Eatom = (eiKJ * 1000) / NA;
  const lam = (h * c) / Eatom;
  const lamNm = lam * 1e9;
  const region = lamNm < 380 ? 'uv' : lamNm <= 750 ? 'vis' : 'ir';
  const parts: ExercisePart[] = [
    numericPart({ id: 'E', prompt: 'Energía necesaria para ionizar UN átomo', value: Eatom, unit: 'J', sig: 3, explanation: `${eiKJ} kJ/mol · 1000 J/kJ / 6,022·10²³ mol⁻¹ = ${sci(Eatom, 3)} J.`, nodeIds: ['7.9', '3.9'], skills: ['unidades', 'calculo'], misconceptions: [{ test: (v) => Math.abs(v / (eiKJ / NA) - 1) < 0.02, message: 'Has olvidado pasar kJ a J (×1000).', skill: 'unidades' }] }),
    numericPart({ id: 'lam', prompt: 'Longitud de onda MÁXIMA de la luz capaz de ionizarlo', value: lamNm, unit: 'nm', sig: 3, explanation: `λ = h·c/E = ${sci(lam, 3)} m = ${sci(lamNm, 3)} nm.`, nodeIds: ['3.4'], recompute: { from: 'E', fn: (E) => ((h * c) / E) * 1e9 } }),
    choicePart('region', '¿En qué región está?', [O('uv', 'Ultravioleta'), O('vis', 'Visible'), O('ir', 'Infrarrojo')], [region], `${sci(lamNm, 3)} nm → ${{ uv: 'ultravioleta', vis: 'visible', ir: 'infrarrojo' }[region]}.`),
    choicePart('max', '¿Por qué es una λ MÁXIMA y no mínima?', [O('inv', 'Porque E = hc/λ: a mayor λ, menos energía; por encima de ese valor el fotón no llega'), O('dir', 'Porque la energía crece con λ'), O('int', 'Porque con más intensidad cualquier λ ioniza'), O('min', 'En realidad es una λ mínima')], ['inv'], 'E y λ son inversamente proporcionales: cualquier fotón con λ MENOR tiene energía de sobra; uno con λ mayor no ioniza, por mucha intensidad que tenga la luz (un fotón por átomo).'),
  ];
  return {
    id: seedId,
    generatorId: 'luz-ionizante',
    nodeIds: ['7.9', '3.4', '3.9', '3.3'],
    difficulty,
    level: 5,
    title: '¿Qué luz arranca el electrón?',
    statement: `La primera energía de ionización del **${el.name.toLowerCase()}** es **${eiKJ} kJ/mol**. ¿Qué longitud de onda máxima debe tener la luz para ionizar sus átomos?`,
    data: [
      { label: 'h', value: '6,626·10⁻³⁴ J·s' },
      { label: 'c', value: '3,00·10⁸ m/s' },
      { label: 'N_A', value: '6,022·10²³ mol⁻¹' },
    ],
    parts: [parts[0]!, parts[1]!, { ...parts[2]!, nodeIds: ['3.3'] }, { ...parts[3]!, nodeIds: ['3.4'], skills: ['razonamiento'] }],
    stepwise: true,
    hints: ['La EI está dada por MOL de átomos; el fotón actúa sobre UN átomo.', 'Pasa kJ/mol a J por átomo: ×1000 y ÷ N_A.', 'Con la energía de un átomo, λ = h·c/E.'],
    solution: parts.map((p) => p.explanation),
    resolution: [
      { kind: 'pregunta', text: 'Relacionar una magnitud química (EI en kJ/mol) con una de la luz (λ de un fotón).' },
      { kind: 'datos', text: `EI₁ = ${eiKJ} kJ/mol; h = 6,626·10⁻³⁴ J·s; c = 3,00·10⁸ m/s; N_A = 6,022·10²³ mol⁻¹.` },
      { kind: 'por-que', text: 'Cada fotón interactúa con UN átomo: hay que comparar la energía de UN fotón con la de ionizar UN átomo.' },
      { kind: 'unidades', text: '', math: `E = \\frac{${eiKJ}\\cdot 10^{3}\\;\\text{J/mol}}{6,022\\cdot 10^{23}\\;\\text{mol}^{-1}} = ${tex(Eatom, 3)}\\;\\text{J}` },
      { kind: 'despeje', text: '', math: `E = \\frac{hc}{\\lambda}\\;\\to\\;\\lambda = \\frac{hc}{E}` },
      { kind: 'calculo', text: '', math: `\\lambda = \\frac{6,626\\cdot 10^{-34}\\cdot 3,00\\cdot 10^{8}}{${tex(Eatom, 3)}} = ${tex(lam, 3)}\\;\\text{m} = ${tex(lamNm, 3)}\\;\\text{nm}` },
      { kind: 'resultado', text: `λ_máx ≈ ${sci(lamNm, 3)} nm.` },
      { kind: 'comprobacion', text: 'Los alcalinos (EI baja) se ionizan con UV cercano o incluso visible; los gases nobles (EI alta) necesitan UV lejano. ¿Encaja tu resultado?' },
      { kind: 'errores', text: 'Olvidar ÷N_A (sale un valor absurdo, de kilómetros) o el ×1000 de kJ a J.' },
    ],
  };
}

export const ionizingLightGenerator: ExerciseGenerator = {
  id: 'luz-ionizante',
  title: 'Luz capaz de ionizar',
  nodeIds: ['7.9', '3.4', '3.9', '3.3'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildIonizingLight(pick(rng, IONIZE_ZS), difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 8. Ion misterioso (multibloque) ──────────────────────────────────────

/** [Z, carga, A del isótopo más abundante] */
const MYSTERY_IONS: [number, number, number][] = [
  [26, 2, 56], [26, 3, 56], [29, 2, 63], [25, 2, 55], [30, 2, 64], [27, 2, 59], [28, 2, 58], [24, 3, 52],
  [16, -2, 32], [17, -1, 35], [20, 2, 40], [13, 3, 27], [34, -2, 80], [35, -1, 79], [12, 2, 24], [19, 1, 39],
];

export function buildMysteryIon(z: number, q: number, a: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const e = z - q;
  const conf = speciesConfiguration(z, e);
  const confText = formatConfiguration(conf, { abbreviate: true });
  const unp = unpairedElectrons(conf);
  const sym = ionSymbol(el.symbol, q);
  const parts: ExercisePart[] = [
    integerPart('z', '¿Cuál es el número atómico de X?', z, `Electrones del ion = ${e}; carga ${q > 0 ? '+' : '−'}${Math.abs(q)} → Z = ${e} ${q > 0 ? '+' : '−'} ${Math.abs(q)} = ${z}.`),
    { id: 'el', prompt: '¿Qué elemento es?', answer: { kind: 'element', z }, canonical: el.symbol, explanation: `Z = ${z}: ${el.name}.`, placeholder: 'símbolo o nombre' },
    integerPart('n', `¿Cuántos neutrones tiene el núcleo si A = ${a}?`, a - z, `N = A − Z = ${a} − ${z} = ${a - z}.`),
    integerPart('desap', '¿Cuántos electrones desapareados tiene el ION?', unp, `${confText}: ${unp} desapareado${unp === 1 ? '' : 's'} (Hund).`),
    { id: 'neutro', prompt: 'Configuración del átomo NEUTRO', answer: { kind: 'config', electrons: z, z }, canonical: abbr(z), explanation: `${el.symbol}: ${abbr(z)}${el.block === 'd' && q > 0 ? `. Observa que el ion ${sym} perdió primero los electrones 4s, no los 3d.` : '.'}`, placeholder: 'p. ej. [Ar] 3d6 4s2' },
  ];
  return {
    id: seedId,
    generatorId: 'ion-misterioso',
    nodeIds: ['1.4', '1.2', '6.8', '6.4', '6.3'],
    difficulty,
    level: 5,
    title: 'El ion misterioso',
    statement: `Un ion **${ionSymbol('X', q)}** tiene la configuración electrónica **${confText}** y su núcleo tiene número másico **A = ${a}**.`,
    parts: [{ ...parts[0]!, nodeIds: ['1.4'] }, { ...parts[1]!, nodeIds: ['1.4'] }, { ...parts[2]!, nodeIds: ['1.2'] }, { ...parts[3]!, nodeIds: ['6.4'] }, { ...parts[4]!, nodeIds: ['6.8', '6.3'] }],
    stepwise: true,
    hints: ['Cuenta los electrones de la configuración (el gas noble entre corchetes también cuenta).', 'Un catión ha PERDIDO electrones y un anión los ha GANADO: Z = electrones + carga.', 'Para el átomo neutro, devuelve los electrones. En los metales de transición, los cationes pierden primero los electrones 4s.'],
    solution: parts.map((p) => p.explanation),
    resolution: [
      { kind: 'pregunta', text: 'Del ion al átomo: deshacer la ionización para identificar el elemento.' },
      { kind: 'calculo', text: `Electrones de ${confText}: ${e}.` },
      { kind: 'principio', text: 'Carga = protones − electrones, así que Z = electrones + carga.', math: `Z = ${e} ${q > 0 ? '+' : '-'} ${Math.abs(q)} = ${z}` },
      { kind: 'resultado', text: `X = ${el.name}; el ion es ${sym}, con ${a - z} neutrones y ${unp} electrón${unp === 1 ? '' : 'es'} desapareado${unp === 1 ? '' : 's'}.` },
      ...(el.block === 'd' && q > 0 ? [{ kind: 'errores' as const, text: `Escribir el ion quitando electrones 3d: el orden de llenado (4s antes que 3d) NO es el orden de ionización. ${sym} = ${confText}, no ${formatConfiguration(groundState(z), { abbreviate: true })} menos ${q} electrones 3d.` }] : []),
      { kind: 'comprobacion', text: `Átomo neutro: ${abbr(z)} (${z} electrones). ✓` },
    ],
  };
}

export const mysteryIonGenerator: ExerciseGenerator = {
  id: 'ion-misterioso',
  title: 'El ion misterioso',
  nodeIds: ['1.4', '1.2', '6.8', '6.4', '6.3'],
  difficulties: [3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const [z, q, a] = pick(rng, MYSTERY_IONS);
    return buildMysteryIon(z, q, a, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 9. Predicciones de los modelos ───────────────────────────────────────

interface Prediction {
  model: string;
  experiment: string;
  options: [string, string][];
  correct: string;
  why: string;
  nodeIds: string[];
}

const PREDICTIONS: Prediction[] = [
  {
    model: 'Thomson', experiment: 'Bombardeas una lámina de oro muy fina con partículas α.', nodeIds: ['2.3', '2.4'],
    options: [['todas', 'Casi todas atraviesan con desviaciones muy pequeñas'], ['rebote', 'La mayoría pasa, pero algunas rebotan'], ['ninguna', 'Ninguna atraviesa la lámina'], ['espiral', 'Las α caen en espiral hacia los átomos']],
    correct: 'todas', why: 'La carga positiva está repartida en todo el átomo: el campo eléctrico es débil en todas partes y solo produce desviaciones pequeñas. Ningún rebote.',
  },
  {
    model: 'Rutherford', experiment: 'Bombardeas una lámina de oro muy fina con partículas α.', nodeIds: ['2.5', '2.4'],
    options: [['rebote', 'La mayoría pasa sin desviarse; muy pocas se desvían mucho y alguna rebota'], ['todas', 'Todas atraviesan con desviaciones pequeñas'], ['mitad', 'La mitad rebota'], ['ninguna', 'Ninguna atraviesa']],
    correct: 'rebote', why: 'Casi todo el átomo está vacío y la carga positiva se concentra en un núcleo diminuto: solo las α que pasan muy cerca se desvían mucho.',
  },
  {
    model: 'Rutherford (con física clásica)', experiment: 'Observas el espectro de emisión del hidrógeno.', nodeIds: ['2.6', '3.5'],
    options: [['continuo', 'Un espectro continuo, y el átomo colapsaría al radiar el electrón energía'], ['lineas', 'Líneas a longitudes de onda concretas'], ['nada', 'Ninguna radiación'], ['balmer', 'Exactamente la serie de Balmer']],
    correct: 'continuo', why: 'Una carga que gira (acelerada) radia continuamente según el electromagnetismo clásico: perdería energía, caería en espiral al núcleo y emitiría un espectro continuo. Es su gran limitación.',
  },
  {
    model: 'Bohr', experiment: 'Observas el espectro de emisión del hidrógeno.', nodeIds: ['4.1', '4.3'],
    options: [['lineas', 'Líneas discretas con 1/λ = R(1/n₁² − 1/n₂²)'], ['continuo', 'Un espectro continuo'], ['todas', 'Todas las longitudes de onda visibles'], ['zeeman', 'Líneas desdobladas aunque no haya campo magnético']],
    correct: 'lineas', why: 'Las órbitas tienen energías cuantizadas; cada línea es un salto entre dos niveles, con E_fotón = |ΔE|.',
  },
  {
    model: 'Bohr', experiment: 'Analizas con mucha resolución el espectro de un átomo de VARIOS electrones, o el H en un campo magnético.', nodeIds: ['4.4'],
    options: [['falla', 'No explica las líneas finas ni el desdoblamiento: hacen falta correcciones (Sommerfeld, Zeeman, espín)'], ['explica', 'Lo explica todo con sus órbitas circulares'], ['continuo', 'Predice un espectro continuo'], ['nada', 'Predice que no hay espectro']],
    correct: 'falla', why: 'Bohr funciona para el H (un electrón) con órbitas circulares; la estructura fina y el efecto Zeeman exigen subniveles y espín.',
  },
];

export function buildPrediction(p: Prediction, difficulty: Difficulty, seedId: string, rng: () => number): Exercise {
  const parts: ExercisePart[] = [
    choicePart('pred', `Según el modelo de ${p.model}, ¿qué se observaría?`, shuffle(rng, p.options).map(([id, text]) => O(id, text)), [p.correct], p.why),
  ];
  return {
    id: seedId,
    generatorId: 'prediccion-modelos',
    nodeIds: p.nodeIds,
    difficulty,
    level: 3,
    title: 'Predice con el modelo',
    statement: `${p.experiment} Ponte en la piel de alguien que solo conoce el **modelo de ${p.model}**.`,
    parts,
    stepwise: false,
    hints: ['Recuerda cómo reparte la carga y la masa este modelo (o cómo describe al electrón).', 'Deduce qué fuerza o qué energía sentiría la partícula o el electrón en ese modelo.', p.why.split(':')[0]!],
    solution: [p.why],
    resolution: [
      { kind: 'pregunta', text: 'Contrastar un modelo con un experimento: primero se PREDICE con el modelo, después se compara con lo observado.' },
      { kind: 'interpretacion', text: p.why },
      { kind: 'comprobacion', text: 'Si la predicción contradice lo observado, el modelo queda superado: así se construye el conocimiento científico.' },
    ],
  };
}

export const predictionGenerator: ExerciseGenerator = {
  id: 'prediccion-modelos',
  title: 'Predice con el modelo',
  nodeIds: ['2.3', '2.4', '2.5', '2.6', '3.5', '4.1', '4.3', '4.4'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildPrediction(pick(rng, PREDICTIONS), difficulty, exId(this.id, difficulty, seed), rng);
  },
};

// ── 10. Preguntas de desarrollo ──────────────────────────────────────────

interface EssayQ {
  key: string;
  nodeIds: string[];
  question: string;
  model: string;
  criteria: EssayCriterion[];
}

const C = (id: string, text: string, keywords: string[][], weight = 1): EssayCriterion => ({ id, text, keywords, weight });

export const ESSAYS: EssayQ[] = [
  {
    key: 'radio-cation', nodeIds: ['7.8'], question: 'Justifica por qué el radio del catión sodio (Na⁺) es menor que el del átomo de sodio (Na).',
    model: 'El Na (1s² 2s² 2p⁶ 3s¹) pierde su único electrón 3s y el Na⁺ queda con 1s² 2s² 2p⁶: **desaparece la capa n = 3**, así que los electrones externos pasan a estar en n = 2, mucho más cerca del núcleo. Además, con los mismos 11 protones y un electrón menos, hay menos repulsión entre electrones y cada uno siente una **carga nuclear efectiva mayor**, que los atrae más.',
    criteria: [C('capa', 'Al perder el electrón 3s desaparece una capa entera (n = 3)', [['capa', 'nivel', 'n = 3', 'n=3', '3s']]), C('protones', 'El número de protones (Z = 11) no cambia', [['proton', 'z = 11', 'carga nuclear', 'nucleo']]), C('zef', 'Mayor carga nuclear efectiva / menos repulsión por electrón', [['efectiva', 'repulsion', 'apantall', 'atrae mas', 'mas atraid']])],
  },
  {
    key: 'rutherford-estabilidad', nodeIds: ['2.6'], question: 'Explica por qué el modelo de Rutherford no podía justificar la estabilidad del átomo.',
    model: 'En el modelo de Rutherford el electrón gira alrededor del núcleo, es decir, es una **carga acelerada**. Según el electromagnetismo clásico (Maxwell), toda carga acelerada **emite radiación** y pierde energía. El electrón describiría una espiral y **caería al núcleo** en una fracción de segundo; además, el espectro emitido sería **continuo**. Como los átomos son estables y sus espectros son de líneas, el modelo era insuficiente.',
    criteria: [C('acel', 'El electrón en órbita es una carga acelerada', [['acelera', 'gira', 'orbita', 'circular']]), C('radia', 'Según el electromagnetismo clásico, emitiría radiación y perdería energía', [['radia', 'emit', 'pierde energia', 'perderia energia']]), C('cae', 'Caería en espiral al núcleo: el átomo no sería estable', [['caer', 'colaps', 'espiral', 'nucleo']]), C('continuo', 'Predice un espectro continuo, no de líneas', [['continuo']], 0.5)],
  },
  {
    key: 'ei-o-n', nodeIds: ['7.13', '7.9', '6.4'], question: 'Razona por qué el oxígeno presenta una primera energía de ionización inferior a la del nitrógeno, aunque está a su derecha en el periodo.',
    model: 'N: 1s² 2s² 2p³, con los tres electrones 2p **desapareados**, uno en cada orbital (Hund): subcapa semillena. O: 1s² 2s² 2p⁴: el cuarto electrón 2p tiene que **aparearse** en un orbital ya ocupado. La **repulsión entre los dos electrones del mismo orbital** hace que ese electrón esté menos retenido, y arrancarlo cuesta menos energía, aunque la Z efectiva del O sea algo mayor.',
    criteria: [C('conf', 'Escribe las configuraciones 2p³ (N) y 2p⁴ (O)', [['2p3', '2p³', 'p3', 'p³'], ['2p4', '2p⁴', 'p4', 'p⁴']]), C('par', 'En el O el electrón que se arranca está apareado', [['apare', 'par ', 'mismo orbital', 'doblemente']]), C('repul', 'La repulsión entre electrones del mismo orbital facilita arrancarlo', [['repul']]), C('tendencia', 'Reconoce que contradice la tendencia general (Z_ef creciente)', [['tendencia', 'excepcion', 'anomal', 'efectiva', 'deberia']], 0.5)],
  },
  {
    key: 'cromo', nodeIds: ['6.7'], question: '¿Por qué la configuración del cromo es [Ar] 3d⁵ 4s¹ y no [Ar] 3d⁴ 4s², como predice el diagrama de Möller?',
    model: 'Los subniveles 3d y 4s tienen **energías muy próximas**. Pasar un electrón del 4s al 3d deja **dos subcapas semillenas** (3d⁵ y 4s¹) con todos los electrones desapareados y del mismo espín, lo que **reduce la repulsión** y aumenta la estabilidad del conjunto. Por eso la configuración real es 3d⁵ 4s¹. Es una excepción al ORDEN DE LLENADO (Möller), no a la regla de Hund, que se cumple.',
    criteria: [C('proximas', '3d y 4s tienen energías muy parecidas', [['proxim', 'parecid', 'similar', 'cercan']]), C('semi', 'La configuración 3d⁵ 4s¹ tiene subcapas semillenas (más estable)', [['semillen', 'medio llen', 'semi-llen']]), C('estable', 'Esa disposición es más estable (menos repulsión / electrones desapareados)', [['estable', 'repul', 'desapare']]), C('moller', 'Es una excepción al orden de llenado, no a Hund', [['moller', 'llenado', 'aufbau']], 0.5)],
  },
  {
    key: 'lineas-niveles', nodeIds: ['4.3', '3.5'], question: 'Explica por qué el espectro de emisión del hidrógeno es de líneas y qué nos dice sobre la energía del electrón en el átomo.',
    model: 'El electrón solo puede tener ciertos valores de energía (**niveles cuantizados**). Al bajar de un nivel a otro emite un fotón cuya energía es **exactamente la diferencia** entre los dos niveles: E = h·ν = |E₂ − E₁|. Como solo hay unas pocas diferencias posibles, solo se emiten ciertas **frecuencias concretas**: líneas, no un espectro continuo. Que el espectro sea discontinuo es la prueba de que la energía del electrón está cuantizada.',
    criteria: [C('cuant', 'La energía del electrón está cuantizada (niveles discretos)', [['cuantiz', 'niveles', 'discret']]), C('salto', 'Cada línea corresponde a un salto entre dos niveles', [['salto', 'transicion', 'baja', 'cae']]), C('formula', 'La energía del fotón es la diferencia de energías: E = h·ν = ΔE', [['h·ν', 'hν', 'h v', 'diferencia', 'δe', 'delta']]), C('frec', 'Por eso solo aparecen frecuencias concretas', [['frecuencias', 'longitudes de onda', 'concret', 'determinad']], 0.5)],
  },
  {
    key: 'orbita-orbital', nodeIds: ['5.3', '5.2'], question: 'Diferencia los conceptos de órbita (Bohr) y orbital (modelo mecanocuántico).',
    model: 'Una **órbita** es una trayectoria definida (circular en Bohr) por la que el electrón se movería con posición y velocidad conocidas en cada instante. Un **orbital** es una función de onda (ψ) que describe una **región del espacio** donde hay una **probabilidad** alta (p. ej. 90 %) de encontrar al electrón; no indica una trayectoria. El cambio se debe al **principio de incertidumbre** de Heisenberg: no se pueden conocer a la vez con precisión posición y velocidad del electrón.',
    criteria: [C('orbita', 'Órbita = trayectoria definida', [['trayectoria', 'camino', 'recorrido']]), C('orbital', 'Orbital = región de probabilidad de encontrar al electrón', [['probabilidad'], ['region', 'zona', 'espacio']]), C('heis', 'Lo justifica con el principio de incertidumbre', [['incertidumbre', 'heisenberg']])],
  },
  {
    key: 'isotopos-quimica', nodeIds: ['1.3'], question: '¿Por qué los isótopos de un mismo elemento tienen las mismas propiedades químicas pero distinta masa?',
    model: 'Los isótopos tienen el **mismo número de protones** (mismo Z) y, en el átomo neutro, el **mismo número de electrones** con la misma configuración. Las propiedades químicas dependen de los **electrones** (sobre todo de los de valencia), así que son iguales. Difieren en el **número de neutrones**, que aporta masa al núcleo pero no interviene en las reacciones químicas.',
    criteria: [C('z', 'Mismo número de protones (mismo Z) y de electrones', [['proton', 'mismo z', 'numero atomico']]), C('electrones', 'La química depende de los electrones (configuración, valencia)', [['electron']]), C('neutrones', 'Difieren en neutrones, que solo cambian la masa', [['neutron']])],
  },
  {
    key: 'radio-periodo', nodeIds: ['7.7', '7.6'], question: 'Explica por qué el radio atómico disminuye al avanzar en un periodo de izquierda a derecha.',
    model: 'En un periodo los electrones de valencia están en la **misma capa** (mismo n). Al avanzar, cada elemento tiene **un protón más**, mientras que el electrón que se añade está en la misma capa y **apantalla muy poco** a los demás. La **carga nuclear efectiva aumenta** y el núcleo atrae con más fuerza a los electrones externos, que se acercan: el radio disminuye.',
    criteria: [C('capa', 'Los electrones externos están en la misma capa', [['misma capa', 'mismo nivel', 'mismo n', 'mismo periodo']]), C('protones', 'Aumenta el número de protones (Z)', [['proton', 'carga nuclear', 'z aumenta', 'aumenta z']]), C('zef', 'Aumenta la Z efectiva (apantallamiento casi constante)', [['efectiva', 'apantall']]), C('atrae', 'Mayor atracción → electrones más cerca del núcleo', [['atrae', 'atraccion', 'acerca', 'mas cerca']], 0.5)],
  },
  {
    key: 'isoelectronicos', nodeIds: ['1.5', '7.8'], question: 'Ordena de mayor a menor radio las especies O²⁻, F⁻, Na⁺ y Mg²⁺ y justifica el orden.',
    model: 'Las cuatro especies son **isoelectrónicas**: tienen 10 electrones (1s² 2s² 2p⁶). Con los mismos electrones, el radio lo decide la **carga nuclear**: cuantos **más protones**, más atrae el núcleo a la misma nube y menor es el radio. Z: O 8, F 9, Na 11, Mg 12. Orden: **O²⁻ > F⁻ > Na⁺ > Mg²⁺**.',
    criteria: [C('iso', 'Identifica que son isoelectrónicas (10 electrones)', [['isoelectron', '10 electrones', 'mismos electrones', 'mismo numero de electrones']]), C('z', 'El radio depende del número de protones: más Z, menor radio', [['proton', 'carga nuclear', 'z ']]), C('orden', 'Da el orden O²⁻ > F⁻ > Na⁺ > Mg²⁺', [['o2', 'o²', 'oxid'], ['mg', 'magnes']])],
  },
];

export function buildEssay(q: EssayQ, difficulty: Difficulty, seedId: string): Exercise {
  return {
    id: seedId,
    generatorId: 'desarrollo',
    nodeIds: q.nodeIds,
    difficulty,
    level: 4,
    title: 'Pregunta de desarrollo',
    statement: q.question,
    parts: [{ id: 'texto', prompt: 'Tu respuesta', answer: { kind: 'essay', criteria: q.criteria, model: q.model, minWords: 25 }, canonical: q.model, explanation: 'Compara la estructura: causa (configuración o modelo) → mecanismo (fuerza, energía, repulsión) → consecuencia observable.', nodeIds: q.nodeIds, skills: ['razonamiento', 'concepto'] }],
    stepwise: false,
    hints: ['Empieza por el dato estructural: la configuración electrónica o lo que dice el modelo.', 'Explica el MECANISMO: qué fuerza, qué energía o qué repulsión cambia.', 'Termina con la consecuencia que se observa y, si puedes, un dato que lo apoye.'],
    solution: [q.model.replace(/\*\*/g, '')],
  };
}

export const essayGenerator: ExerciseGenerator = {
  id: 'desarrollo',
  title: 'Preguntas de desarrollo',
  nodeIds: [...new Set(ESSAYS.flatMap((e) => e.nodeIds))],
  difficulties: [2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildEssay(pick(rng, ESSAYS), difficulty, exId(this.id, difficulty, seed));
  },
};

export const REASONING_GENERATORS: ExerciseGenerator[] = [
  rydbergErrorGenerator,
  cluesGenerator,
  successiveIEGenerator,
  unknownLineGenerator,
  ieGraphGenerator,
  bohrRatiosGenerator,
  ionizingLightGenerator,
  mysteryIonGenerator,
  predictionGenerator,
  essayGenerator,
];

// Constantes usadas solo para documentar la coherencia con CODATA (N_A exacta desde 2019).
export const NA_EXACT = CODATA.NA;
