/**
 * ATOM 5.1 · Familias de ejercicios genuinamente distintas (no «los mismos con otros números»):
 * - detectar el error en la configuración de un catión de transición (análisis de un razonamiento ajeno);
 * - problema inverso: desde qué nivel mínimo puede ionizar el hidrógeno un fotón dado;
 * - verdadero o falso con su justificación (contraejemplos y conceptos que se confunden);
 * - interpretación de un espectro de masas real a partir de las ALTURAS relativas de los picos.
 * Todos los valores numéricos salen del motor científico o de datos de referencia (NIST/CIAAW).
 */
import { formatConfiguration, speciesConfiguration } from '../../science/configuration';
import { elementByZ } from '../../science/elements';
import { levelEnergyEV } from '../../science/hydrogen';
import { EXERCISE_DATA } from '../../science/constants';
import type { ChoiceOption, Difficulty, Exercise, ExerciseGenerator } from '../types';
import { choicePart, exId, fmt, integerPart, numericPart, pick, rngFor, shuffle } from './util';

const O = (id: string, text: string, feedback?: string): ChoiceOption => ({ id, text, ...(feedback ? { feedback } : {}) });

// ── 1. Detectar el error en la configuración de un catión de transición ────

/** Cationes de transición con su configuración correcta (los ns salen antes que los (n−1)d). */
const TM_IONS: [number, number][] = [
  [26, 2], [26, 3], [25, 2], [27, 2], [28, 2], [29, 2], [30, 2], [24, 3], [22, 2], [23, 3],
];

/** Configuración «del alumno»: quita primero los electrones 3d y solo después los 4s (error típico). */
export function wrongTmConfig(z: number, q: number): string {
  const conf = speciesConfiguration(z, z).map((s) => ({ ...s }));
  let left = q;
  for (const s of [...conf].reverse()) if (left > 0 && s.l === 2) {
    const take = Math.min(left, s.e);
    s.e -= take;
    left -= take;
  }
  for (const s of [...conf].reverse()) if (left > 0 && s.l === 0) {
    const take = Math.min(left, s.e);
    s.e -= take;
    left -= take;
  }
  return formatConfiguration(conf.filter((s) => s.e > 0), { abbreviate: true });
}

export function buildTmIonError(z: number, q: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const ion = `${el.symbol}${q > 1 ? q : ''}+`;
  const correct = speciesConfiguration(z, z - q);
  const neutral = formatConfiguration(speciesConfiguration(z, z), { abbreviate: true });
  const wrong = wrongTmConfig(z, q);
  const right = formatConfiguration(correct, { abbreviate: true });
  return {
    id: seedId,
    generatorId: 'error-ion-transicion',
    nodeIds: ['6.8', '7.5'],
    difficulty,
    title: 'Detecta el error: catión de transición',
    statement: `Un compañero escribe así la configuración del **${ion}**:\n1) ${el.name} neutro: ${neutral}\n2) Pierde ${q} electrón${q > 1 ? 'es' : ''}: «${wrong}».\nLa configuración final no es correcta. Encuentra el error y corrígelo.`,
    parts: [
      {
        nodeIds: ['6.8'],
        ...choicePart(
        'donde',
        '¿Qué ha hecho mal?',
        shuffle(rngFor('error-ion-transicion', z * 10 + q, difficulty), [
          O('d', `Ha quitado los electrones de los orbitales 3d, cuando en un catión de transición se pierden antes los 4s`),
          O('neutro', 'La configuración del átomo neutro de la línea 1 está mal', 'La línea 1 es correcta (compruébala sumando electrones).'),
          O('carga', `Tenía que haber AÑADIDO ${q} electrones, porque la carga es positiva`, 'Una carga positiva significa que faltan electrones: hay que quitarlos.'),
          O('hund', 'Ha incumplido la regla de Hund', 'Hund decide cómo se reparten los electrones en las cajas, no cuáles salen primero.'),
        ]),
        ['d'],
        'En los metales de transición, una vez ocupados los 3d, el 4s queda por encima en energía: es el primero en vaciarse al formar el catión.',
      ),
      },
      {
        id: 'conf',
        prompt: `Configuración correcta del ${ion}`,
        answer: { kind: 'config', electrons: z - q, z },
        canonical: right,
        explanation: `Primero salen los ${Math.min(2, q)} electrones 4s${q > 2 ? ` y después ${q - 2} de los 3d` : ''}: ${right}.`,
        placeholder: 'p. ej. [Ar] 3d6',
        nodeIds: ['6.8'],
      },
    ],
    stepwise: true,
    hints: ['Compara qué subnivel ha vaciado tu compañero con el que se vacía primero en los cationes de transición.', 'Al formar cationes de transición salen antes los electrones ns que los (n−1)d.', `Quita primero los dos electrones 4s del ${el.name.toLowerCase()}.`],
    solution: [`Error: ha quitado electrones 3d en lugar de 4s.`, `Correcto: ${right}.`],
  };
}

export const tmIonErrorGenerator: ExerciseGenerator = {
  id: 'error-ion-transicion',
  title: 'Detecta el error: configuración de un catión de transición',
  nodeIds: ['6.8', '7.5'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const [z, q] = pick(rng, TM_IONS);
    return buildTmIonError(z, q, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 2. Problema inverso: nivel mínimo desde el que un fotón ioniza el H ────

export function buildMinIonizationLevel(lambdaNm: number, difficulty: Difficulty, seedId: string): Exercise {
  const k = EXERCISE_DATA;
  const E = (k.h * k.c) / (lambdaNm * 1e-9);
  const eV = E / k.eV;
  const nMin = Math.ceil(Math.sqrt(13.6 / eV));
  return {
    id: seedId,
    generatorId: 'ionizacion-nivel-minimo',
    nodeIds: ['4.2', '3.4', '7.9'],
    difficulty,
    title: '¿Desde qué nivel ioniza este fotón?',
    statement: `Un fotón de **${fmt(lambdaNm, 3)} nm** incide sobre átomos de hidrógeno. ¿Cuál es el nivel n más bajo en el que debe estar el electrón para que ese fotón pueda arrancarlo? (Eₙ = −13,6 eV/n².)`,
    data: [
      { label: 'h', value: '6,626·10⁻³⁴ J·s' },
      { label: 'c', value: '3·10⁸ m/s' },
      { label: '1 eV', value: '1,602·10⁻¹⁹ J' },
    ],
    parts: [
      numericPart({ id: 'E', prompt: 'Energía del fotón (eV)', value: eV, unit: 'eV', sig: 3, nodeIds: ['3.4'], explanation: `E = hc/λ = ${fmt(E, 3)} J = ${fmt(eV, 3)} eV.` }),
      { ...integerPart('n', 'Nivel mínimo n', nMin, `Ioniza si E ≥ 13,6/n² eV ⇒ n ≥ √(13,6/${fmt(eV, 3)}) = ${fmt(Math.sqrt(13.6 / eV), 3)} ⇒ n = ${nMin}. Desde n = ${nMin} hace falta ${fmt(-levelEnergyEV(nMin), 3)} eV (con R_H; ≈ ${fmt(13.6 / (nMin * nMin), 3)} eV con 13,6 eV).`), nodeIds: ['4.2', '7.9'] },
    ],
    stepwise: true,
    hints: ['Ionizar desde el nivel n cuesta |Eₙ| = 13,6/n² eV.', 'El fotón ioniza si su energía es al menos esa: 13,6/n² ≤ E.', 'Despeja n y redondea HACIA ARRIBA: n tiene que ser entero y cumplir la desigualdad.'],
    solution: [`E = ${fmt(eV, 3)} eV.`, `n ≥ √(13,6/E) = ${fmt(Math.sqrt(13.6 / eV), 3)} → n = ${nMin}.`],
    resolution: [
      { kind: 'pregunta', text: 'Encontrar el nivel más bajo desde el que el fotón tiene energía suficiente para ionizar el átomo (problema inverso: la incógnita es n).' },
      { kind: 'metodo', text: 'Problema inverso: en lugar de calcular la energía de un nivel, se impone una condición (E_fotón ≥ energía de ionización desde n) y se despeja n como desigualdad.' },
      { kind: 'principio', text: 'Arrancar el electrón desde el nivel n cuesta |Eₙ|:', math: 'E_{\\text{fotón}} \\ge \\frac{13,6\\;\\text{eV}}{n^2} \\Rightarrow n \\ge \\sqrt{\\frac{13,6}{E_{\\text{fotón}}}}' },
      { kind: 'calculo', text: `Energía del fotón: E = hc/λ = ${fmt(E, 3)} J = ${fmt(eV, 3)} eV. Raíz: √(13,6/${fmt(eV, 3)}) = ${fmt(Math.sqrt(13.6 / eV), 3)}.` },
      { kind: 'resultado', text: `n mínimo = ${nMin}.` },
      { kind: 'por-que', text: 'Los niveles altos están menos ligados (|Eₙ| decrece con n²): un fotón poco energético solo puede ionizar electrones que ya estaban excitados.' },
      { kind: 'comprobacion', text: `Desde n = ${nMin} hace falta ≈ ${fmt(13.6 / (nMin * nMin), 3)} eV ≤ ${fmt(eV, 3)} eV; desde n = ${nMin - 1}${nMin > 1 ? `, ${fmt(13.6 / ((nMin - 1) * (nMin - 1)), 3)} eV > ${fmt(eV, 3)} eV` : ''}: la frontera está bien.` },
      { kind: 'errores', text: 'Redondear n hacia abajo (incumple la desigualdad), olvidar pasar J a eV, o usar E del fotón como si fuera la del nivel.' },
    ],
  };
}

export const minIonizationLevelGenerator: ExerciseGenerator = {
  id: 'ionizacion-nivel-minimo',
  title: 'Problema inverso: nivel mínimo para ionizar',
  nodeIds: ['4.2', '3.4', '7.9'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    // λ lejos de las fronteras 91,2·n² nm (evita respuestas ambiguas por redondeo de datos)
    for (;;) {
      const lambda = Math.round((difficulty === 2 ? 150 : 400) + rng() * (difficulty === 2 ? 650 : 2600));
      const ratio = Math.sqrt((13.6 * lambda * 1e-9 * EXERCISE_DATA.eV) / (EXERCISE_DATA.h * EXERCISE_DATA.c));
      if (Math.abs(ratio - Math.round(ratio)) > 0.08) return buildMinIonizationLevel(lambda, difficulty, exId(this.id, difficulty, seed));
    }
  },
};

// ── 3. Verdadero o falso, con su justificación ─────────────────────────────

interface TFItem {
  text: string;
  truth: boolean;
  nodes: string[];
  right: string;
  wrong: [string, string];
}

export const TF_ITEMS: TFItem[] = [
  { text: 'Dos isótopos del mismo elemento tienen las mismas propiedades químicas.', truth: true, nodes: ['1.3'], right: 'Tienen los mismos electrones (mismo Z), y la química depende de los electrones.', wrong: ['Tienen la misma masa.', 'Tienen el mismo número de neutrones.'] },
  { text: 'Un ion Na⁺ tiene más electrones que un átomo de Na.', truth: false, nodes: ['1.4'], right: 'Una carga positiva significa que ha PERDIDO un electrón: Na⁺ tiene 10 y Na, 11.', wrong: ['El signo + indica que ha ganado un electrón.', 'Los iones conservan sus electrones y cambian sus protones.'] },
  { text: 'La luz roja tiene fotones más energéticos que la azul porque es más intensa.', truth: false, nodes: ['3.4'], right: 'La energía por fotón depende solo de la frecuencia (E = hν); el azul tiene mayor ν.', wrong: ['La intensidad decide la energía de cada fotón.', 'El rojo tiene mayor frecuencia.'] },
  { text: 'Un gas frío de hidrógeno muestra en el visible las mismas líneas oscuras que líneas brillantes tiene su emisión.', truth: false, nodes: ['3.5'], right: 'En frío casi todos los átomos están en n = 1 y solo absorben la serie de Lyman, que cae en el ultravioleta.', wrong: ['Todo lo que un átomo emite lo absorbe siempre.', 'El hidrógeno no absorbe luz.'] },
  { text: 'El conjunto (n, l, m, s) = (3, 3, 0, +½) es posible.', truth: false, nodes: ['5.4'], right: 'l puede valer como mucho n − 1 = 2: no existe el subnivel 3f.', wrong: ['m no puede valer 0.', 's solo puede valer −½.'] },
  { text: 'En el modelo actual, el electrón del hidrógeno gira en una órbita circular de radio 0,53 Å.', truth: false, nodes: ['5.3'], right: 'Esa es la órbita de Bohr. Hoy se describe con un orbital: 0,53 Å es solo la distancia más probable en el 1s.', wrong: ['El electrón está quieto en el núcleo.', 'El radio de la órbita es 13,6 Å.'] },
  { text: 'El Cr tiene la configuración [Ar] 3d⁵ 4s¹, que no sigue el orden de llenado.', truth: true, nodes: ['6.7'], right: 'Es una excepción al orden de Möller (no a Hund): el subnivel 3d semilleno compensa.', wrong: ['Es una excepción a la regla de Hund.', 'Viola el principio de Pauli.'] },
  { text: 'La primera energía de ionización del oxígeno es mayor que la del nitrógeno.', truth: false, nodes: ['7.9', '7.13'], right: 'Excepción: el N tiene el 2p semilleno; en el O el cuarto electrón 2p está emparejado y la repulsión lo hace más fácil de arrancar.', wrong: ['El oxígeno tiene menos protones que el nitrógeno.', 'La EI disminuye siempre a lo largo del periodo.'] },
  { text: 'El F⁻ es más grande que el átomo de F.', truth: true, nodes: ['7.8'], right: 'Mismos protones y un electrón más: aumenta la repulsión y la nube se expande.', wrong: ['El F⁻ tiene un protón más.', 'Los aniones pierden capas.'] },
  { text: 'El radio atómico aumenta de izquierda a derecha en un periodo, porque aumenta Z.', truth: false, nodes: ['7.7'], right: 'Al aumentar Z en el mismo periodo, aumenta Z_ef sin añadir capas: los electrones se acercan y el radio DISMINUYE.', wrong: ['Más electrones siempre ocupan más espacio.', 'El radio no depende de Z.'] },
  { text: 'Thomson descubrió el núcleo atómico con su tubo de rayos catódicos.', truth: false, nodes: ['2.2', '2.4'], right: 'Thomson descubrió el electrón (1897); el núcleo se dedujo del experimento de Geiger y Marsden (Rutherford, 1911).', wrong: ['Thomson descubrió el neutrón.', 'El núcleo lo descubrió Bohr.'] },
  { text: 'En el átomo de hidrógeno, los niveles de energía están cada vez más juntos al aumentar n.', truth: true, nodes: ['4.2'], right: 'Eₙ = −13,6/n²: la diferencia entre niveles consecutivos disminuye con n y se acumulan cerca de 0 eV.', wrong: ['Están igual de separados, como peldaños.', 'Se separan cada vez más al subir.'] },
];

export function buildTrueFalse(i: number, difficulty: Difficulty, seedId: string, order: number): Exercise {
  const it = TF_ITEMS[i]!;
  const opts = [O('r', it.right), O('w1', it.wrong[0], 'Esa razón es falsa: revisa el concepto.'), O('w2', it.wrong[1], 'Esa razón es falsa: revisa el concepto.')];
  const rot = order % 3;
  const just = [...opts.slice(rot), ...opts.slice(0, rot)];
  return {
    id: seedId,
    generatorId: 'verdadero-falso',
    nodeIds: it.nodes,
    difficulty,
    title: '¿Verdadero o falso? Justifícalo',
    statement: `«${it.text}»`,
    parts: [
      { ...choicePart('vf', '¿Es verdadera o falsa la afirmación?', [O('v', 'Verdadera'), O('f', 'Falsa')], [it.truth ? 'v' : 'f'], it.right), nodeIds: it.nodes },
      { ...choicePart('por', 'Elige la justificación correcta', just, ['r'], it.right), nodeIds: it.nodes },
    ],
    stepwise: true,
    hints: ['Busca la palabra clave de la afirmación: ¿de qué concepto habla?', 'Intenta encontrar un contraejemplo: si existe uno, la afirmación es falsa.', 'Recuerda la definición exacta del concepto.'],
    solution: [it.truth ? 'Verdadera.' : 'Falsa.', it.right],
  };
}

export const trueFalseGenerator: ExerciseGenerator = {
  id: 'verdadero-falso',
  title: 'Verdadero o falso con justificación',
  nodeIds: [...new Set(TF_ITEMS.flatMap((x) => x.nodes))],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const i = Math.floor(rng() * TF_ITEMS.length);
    return buildTrueFalse(i, difficulty, exId(this.id, difficulty, seed), Math.floor(rng() * 3));
  },
};

// ── 4. Interpretar un espectro de masas a partir de las alturas de los picos ─

/** Picos reales: masas isotópicas (u) y abundancias naturales (%), NIST/CIAAW. */
const SPECTRA: { z: number; peaks: [number, number, number][] }[] = [
  { z: 17, peaks: [[35, 34.96885, 75.76], [37, 36.9659, 24.24]] },
  { z: 35, peaks: [[79, 78.91834, 50.69], [81, 80.91629, 49.31]] },
  { z: 5, peaks: [[10, 10.01294, 19.9], [11, 11.00931, 80.1]] },
  { z: 29, peaks: [[63, 62.9296, 69.15], [65, 64.92779, 30.85]] },
  { z: 31, peaks: [[69, 68.92557, 60.108], [71, 70.9247, 39.892]] },
  { z: 3, peaks: [[6, 6.01512, 7.59], [7, 7.016, 92.41]] },
];

export function buildMassSpectrumRead(k: number, difficulty: Difficulty, seedId: string): Exercise {
  const sp = SPECTRA[k]!;
  const el = elementByZ(sp.z)!;
  const top = Math.max(...sp.peaks.map((p) => p[2]));
  const heights = sp.peaks.map((p) => Math.round((p[2] / top) * 1000) / 10);
  const sumH = heights.reduce((a, b) => a + b, 0);
  const ab = heights.map((h) => (h / sumH) * 100);
  const mean = sp.peaks.reduce((a, p, i) => a + p[1] * ab[i]!, 0) / 100;
  const light = sp.peaks[0]!;
  return {
    id: seedId,
    generatorId: 'espectro-masas-lectura',
    nodeIds: ['3.1', '1.3'],
    difficulty,
    title: 'Lee un espectro de masas',
    statement: `El espectro de masas de un elemento desconocido muestra dos picos. Sus alturas son RELATIVAS al pico más alto (= 100):\n${sp.peaks.map((p, i) => `· m/z = ${p[0]} (masa isotópica ${fmt(p[1], 7)} u): altura ${fmt(heights[i]!, 4)}`).join('\n')}\nObtén las abundancias, la masa atómica media e identifica el elemento.`,
    figure: { kind: 'puntos', title: 'Espectro de masas (alturas relativas)', xLabel: 'm/z', yLabel: 'altura relativa', points: sp.peaks.map((p, i) => ({ x: p[0], y: heights[i]!, label: String(p[0]) })) },
    parts: [
      numericPart({ id: 'ab', prompt: `Abundancia del isótopo de m/z = ${light[0]} (%)`, value: ab[0]!, unit: '%', sig: 3, explanation: `Las alturas no son porcentajes: se normalizan. ${fmt(heights[0]!, 4)}/(${heights.map((h) => fmt(h, 4)).join(' + ')})·100 = ${fmt(ab[0]!, 3)} %.`, relTol: 0.01, skills: ['razonamiento', 'calculo'], nodeIds: ['3.1'] }),
      numericPart({ id: 'M', prompt: 'Masa atómica media (u)', value: mean, unit: 'u', sig: 4, explanation: `M = (${sp.peaks.map((p, i) => `${fmt(p[1], 6)}·${fmt(ab[i]!, 4)}`).join(' + ')})/100 = ${fmt(mean, 4)} u.`, relTol: 0.002, nodeIds: ['3.1'], recompute: { from: 'ab', fn: (a: number) => (light[1] * a + sp.peaks[1]![1] * (100 - a)) / 100 } }),
      { id: 'el', prompt: '¿Qué elemento es?', answer: { kind: 'element', z: sp.z }, canonical: el.symbol, nodeIds: ['3.1'], explanation: `La masa media ${fmt(mean, 4)} u coincide con la del ${el.name.toLowerCase()} (${fmt(el.atomicWeight, 5)} u en la tabla).`, placeholder: 'símbolo o nombre' },
    ],
    stepwise: true,
    hints: ['Las alturas están referidas al pico mayor, no suman 100: hay que normalizarlas.', 'Abundancia = altura / suma de alturas · 100.', 'Con las abundancias, haz la media ponderada con las masas isotópicas y busca esa masa en la tabla.'],
    solution: [`Abundancias: ${ab.map((a) => fmt(a, 3)).join(' % y ')} %.`, `M = ${fmt(mean, 4)} u → ${el.name}.`],
    resolution: [
      { kind: 'pregunta', text: 'Pasar de las alturas relativas de los picos a las abundancias, y de ellas a la masa media y al elemento.' },
      { kind: 'metodo', text: 'Interpretación de datos: el instrumento da intensidades relativas (el pico mayor vale 100). Antes de cualquier media hay que convertirlas en fracciones que sumen 100 %.' },
      { kind: 'principio', text: 'Normalización y media ponderada:', math: 'x_i = \\frac{h_i}{\\sum h_j}\\cdot 100 \\qquad M = \\frac{\\sum m_i x_i}{100}' },
      { kind: 'por-que', text: 'La altura de cada pico es proporcional al número de iones de ese isótopo; la proporción entre picos es la proporción de átomos.' },
      { kind: 'calculo', text: `Abundancias: ${ab.map((a, i) => `${sp.peaks[i]![0]}: ${fmt(a, 4)} %`).join(' · ')}. Media: ${fmt(mean, 5)} u.` },
      { kind: 'resultado', text: `${el.name} (${el.symbol}).` },
      { kind: 'comprobacion', text: 'La media cae entre las dos masas isotópicas y más cerca del pico más alto.' },
      { kind: 'errores', text: 'Usar las alturas como si fueran porcentajes (la media saldría mayor que la masa más pesada), o usar los números másicos en lugar de las masas isotópicas.' },
    ],
  };
}

export const massSpectrumReadGenerator: ExerciseGenerator = {
  id: 'espectro-masas-lectura',
  title: 'Interpretar un espectro de masas (alturas relativas)',
  nodeIds: ['3.1', '1.3'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildMassSpectrumRead(Math.floor(rng() * SPECTRA.length), difficulty, exId(this.id, difficulty, seed));
  },
};

export const ATOM51_GENERATORS: ExerciseGenerator[] = [tmIonErrorGenerator, minIonizationLevelGenerator, trueFalseGenerator, massSpectrumReadGenerator];
