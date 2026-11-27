/**
 * Bloque 1 · Identificación de un átomo (Atomic Forge). Orientado por AMP 1–5.
 */
import { elementByZ } from '../../science/elements';
import { identify, nuclearNotation, chargeLabel, type Species } from '../../science/nucleus';
import type { Difficulty, Exercise, ExerciseGenerator } from '../types';
import { choicePart, exId, integerPart, pick, rngFor, shuffle, type Rng } from './util';

/** Nucleidos naturales frecuentes (y algunos de los ejercicios de AMP): [Z, A]. */
export const COMMON_NUCLIDES: [number, number][] = [
  [1, 1], [1, 2], [2, 4], [3, 7], [4, 9], [5, 11], [6, 12], [6, 13], [7, 14], [8, 16], [8, 18], [9, 19], [10, 20],
  [11, 23], [12, 24], [13, 27], [14, 28], [15, 31], [16, 32], [17, 35], [17, 37], [18, 40], [19, 39], [20, 40],
  [26, 56], [29, 63], [29, 65], [30, 64], [35, 79], [35, 81], [38, 88], [47, 107], [53, 127], [55, 133],
  [56, 138], [79, 197], [80, 200], [82, 208], [92, 235], [92, 238],
];

/** Iones habituales: [Z, carga]. */
export const COMMON_IONS: [number, number][] = [
  [3, 1], [11, 1], [19, 1], [12, 2], [20, 2], [13, 3], [9, -1], [17, -1], [35, -1], [53, -1], [8, -2], [16, -2],
  [7, -3], [26, 2], [26, 3], [29, 1], [29, 2], [30, 2], [47, 1], [24, 2], [79, 3],
];

/** A de referencia para un elemento (primer nucleido común o masa atómica redondeada). */
export function typicalA(z: number): number {
  const hit = COMMON_NUCLIDES.find(([zz]) => zz === z);
  if (hit) return hit[1];
  return Math.round(elementByZ(z)!.atomicWeight);
}

function speciesOf(z: number, a: number, charge: number): Species {
  return { z, n: a - z, e: z - charge };
}

const KIND_OPTIONS = [
  { id: 'neutro', text: 'Átomo neutro', feedback: 'Compara protones y electrones: si no coinciden, la especie tiene carga.' },
  { id: 'cation', text: 'Catión', feedback: 'Un catión tiene más protones que electrones (ha perdido electrones).' },
  { id: 'anion', text: 'Anión', feedback: 'Un anión tiene más electrones que protones (ha ganado electrones).' },
];

export function buildSpeciesExercise(sp: Species, difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const id = identify(sp);
  const el = id.element!;
  const notation = nuclearNotation(sp);
  const q = id.charge;
  return {
    id: seedId,
    generatorId: 'nucleo-especie',
    nodeIds: q === 0 ? ['1.1', '1.2'] : ['1.1', '1.2', '1.4'],
    difficulty,
    title: 'Identidad de una especie',
    statement: `Para la especie **${notation}** (${el.name.toLowerCase()}), indica su composición.`,
    parts: [
      integerPart('p', 'Número de protones', sp.z, `El subíndice es Z = ${sp.z}: el número atómico es el número de protones e identifica al ${el.name.toLowerCase()}.`),
      integerPart('n', 'Número de neutrones', sp.n, `N = A − Z = ${id.massNumber} − ${sp.z} = ${sp.n}.`),
      integerPart(
        'e',
        'Número de electrones',
        sp.e,
        q === 0
          ? `Átomo neutro: tantos electrones como protones, ${sp.e}.`
          : `La carga es ${chargeLabel(q)}: e⁻ = Z − carga = ${sp.z} − (${q > 0 ? '+' : '−'}${Math.abs(q)}) = ${sp.e}.`,
      ),
      choicePart('tipo', 'Tipo de especie', KIND_OPTIONS, [id.kind], q === 0 ? 'Protones = electrones: es neutra.' : q > 0 ? `Tiene ${q} protón(es) más que electrones: es un catión.` : `Tiene ${-q} electrón(es) más que protones: es un anión.`),
    ],
    stepwise: false,
    hints: [
      'En la notación ᴬ_Z X, el número de abajo es Z y el de arriba es A. La carga, si la hay, va arriba a la derecha.',
      'Z = protones; A = protones + neutrones; electrones = Z − carga.',
      `Aquí Z = ${sp.z} y A = ${id.massNumber}. Resta para los neutrones y aplica la carga ${q === 0 ? '(0)' : chargeLabel(q)} a los electrones.`,
    ],
    solution: [
      `Z = ${sp.z} → ${sp.z} protones.`,
      `N = A − Z = ${id.massNumber} − ${sp.z} = ${sp.n} neutrones.`,
      `Electrones = Z − q = ${sp.z} − (${q}) = ${sp.e}.`,
      `Tipo: ${KIND_OPTIONS.find((o) => o.id === id.kind)!.text.toLowerCase()}.`,
    ],
    source,
  };
}

export function buildReverseSpeciesExercise(sp: Species, difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const id = identify(sp);
  const el = id.element!;
  return {
    id: seedId,
    generatorId: 'nucleo-especie',
    nodeIds: ['1.1', '1.2', '1.4'],
    difficulty,
    title: 'Reconstruye la especie',
    statement: `Una especie química tiene **${sp.z} protones**, **${sp.n} neutrones** y **${sp.e} electrones**. Identifícala.`,
    parts: [
      { id: 'el', prompt: 'Elemento (símbolo o nombre)', answer: { kind: 'element', z: sp.z }, canonical: el.symbol, explanation: `El número de protones (Z = ${sp.z}) determina el elemento: ${el.name}. Los neutrones y los electrones no cambian el elemento.`, placeholder: 'p. ej. Na' },
      integerPart('a', 'Número másico A', id.massNumber, `A = Z + N = ${sp.z} + ${sp.n} = ${id.massNumber}.`),
      integerPart('q', 'Carga (con signo)', id.charge, `q = protones − electrones = ${sp.z} − ${sp.e} = ${id.charge}.`, 'p. ej. +2, −1 o 0'),
    ],
    stepwise: false,
    hints: [
      'Solo una de las tres cantidades decide de qué elemento se trata.',
      'Elemento ← Z (protones). A = Z + N. Carga = protones − electrones.',
      `Busca en la tabla el elemento con Z = ${sp.z}.`,
    ],
    solution: [`Z = ${sp.z} → ${el.name} (${el.symbol}).`, `A = ${sp.z} + ${sp.n} = ${id.massNumber}.`, `q = ${sp.z} − ${sp.e} = ${id.charge} → ${nuclearNotation(sp)}.`],
    source,
  };
}

export const speciesGenerator: ExerciseGenerator = {
  id: 'nucleo-especie',
  title: 'Composición de átomos e iones',
  nodeIds: ['1.1', '1.2', '1.4'],
  difficulties: [1, 2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const sid = exId(this.id, difficulty, seed);
    if (difficulty === 1) {
      const [z, a] = pick(rng, COMMON_NUCLIDES);
      return buildSpeciesExercise(speciesOf(z, a, 0), 1, sid);
    }
    const [z, q] = pick(rng, COMMON_IONS);
    const sp = speciesOf(z, typicalA(z), q);
    return difficulty === 2 ? buildSpeciesExercise(sp, 2, sid) : buildReverseSpeciesExercise(sp, 3, sid);
  },
};

function label(sp: Species): string {
  return nuclearNotation(sp);
}

export const isotopeGenerator: ExerciseGenerator = {
  id: 'isotopos',
  title: 'Isótopos',
  nodeIds: ['1.3'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    // Se excluye el hidrógeno: sus «isóbaros» (²He, ¹He) no existen como nucleidos ligados.
    const pairs = COMMON_NUCLIDES.filter(([z], _i, arr) => z > 1 && arr.filter(([zz]) => zz === z).length >= 2);
    const [z, a] = pick(rng, pairs);
    const other = pairs.find(([zz, aa]) => zz === z && aa !== a)!;
    const ref = speciesOf(z, a, 0);
    const iso = speciesOf(z, other[1], 0);
    const isobarZ = z + 1;
    const isobar = speciesOf(isobarZ, a, 0); // mismo A, otro elemento
    const isotone = speciesOf(z + 1, a + 1, 0); // mismo N
    const ion = speciesOf(z, a, 1);
    const options = shuffle(rng, [
      { id: 'iso', text: label(iso), feedback: '' },
      { id: 'isobaro', text: label(isobar), feedback: `${label(isobar)} tiene el mismo A, pero distinto Z: es otro elemento, no un isótopo.` },
      { id: 'isotono', text: label(isotone), feedback: `${label(isotone)} tiene los mismos neutrones (${isotone.n}), pero distinto Z: es otro elemento.` },
      { id: 'ion', text: label(ion), feedback: `${label(ion)} es el mismo nucleido (mismo Z y mismo A) con un electrón menos: es un ion, no un isótopo distinto.` },
    ]);
    const el = elementByZ(z)!;
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['1.3'],
      difficulty,
      title: 'Busca el isótopo',
      statement: `¿Cuál de estas especies es un **isótopo** de ${label(ref)} (${el.name.toLowerCase()})?`,
      parts: [choicePart('iso', 'Elige la especie', options, ['iso'], `Los isótopos tienen el mismo Z (${z}, mismo elemento) y distinto A: ${label(ref)} tiene ${ref.n} neutrones y ${label(iso)} tiene ${iso.n}.`)],
      stepwise: false,
      hints: [
        'Isótopos = mismo elemento, distinta masa.',
        'Mismo número atómico Z y distinto número másico A (distinto número de neutrones).',
        `Busca otra especie con Z = ${z} y A ≠ ${a}.`,
      ],
      solution: [`Isótopo: ${label(iso)}: Z = ${z} (igual) y A = ${other[1]} (distinto).`],
    };
  },
};

const ISOELECTRONIC_SETS: [number, number][][] = [
  // [Z, carga] con 10 electrones
  [[7, -3], [8, -2], [9, -1], [10, 0], [11, 1], [12, 2], [13, 3]],
  // 18 electrones
  [[15, -3], [16, -2], [17, -1], [18, 0], [19, 1], [20, 2]],
];

export const isoelectronicGenerator: ExerciseGenerator = {
  id: 'isoelectronicas',
  title: 'Especies isoelectrónicas',
  nodeIds: ['1.5', '1.4'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const set = pick(rng, ISOELECTRONIC_SETS);
    const [refZ, refQ] = pick(rng, set);
    const ref = speciesOf(refZ, typicalA(refZ), refQ);
    const nCorrect = difficulty === 2 ? 1 : 2;
    const correct = shuffle(rng, set.filter(([z]) => z !== refZ)).slice(0, nCorrect);
    // distractores: misma especie con carga distinta o vecinos neutros
    const distractorPool: [number, number][] = shuffle<[number, number]>(rng, [
      [refZ, 0],
      [refZ + (refZ < 18 ? 8 : -8), refQ],
      [correct[0]![0], 0],
      [refZ + 1, 0],
    ]).filter(([z, q]) => z >= 1 && !(z === refZ && q === refQ) && z - q !== ref.e && !(z === correct[0]![0] && q === correct[0]![1]));
    const distractors = distractorPool.slice(0, 4 - nCorrect);
    const opt = (z: number, q: number, id: string) => {
      const sp = speciesOf(z, typicalA(z), q);
      return { id, text: label(sp), feedback: `${label(sp)} tiene ${sp.e} electrones (Z − q = ${z} − (${q})), no ${ref.e}.` };
    };
    const options = shuffle(rng, [...correct.map(([z, q], i) => opt(z, q, `c${i}`)), ...distractors.map(([z, q], i) => opt(z, q, `d${i}`))]);
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['1.5', '1.4'],
      difficulty,
      title: 'Familia isoelectrónica',
      statement: `Marca ${nCorrect === 1 ? 'la especie que es' : 'todas las especies que son'} **isoelectrónica${nCorrect === 1 ? '' : 's'}** con ${label(ref)}.`,
      parts: [
        choicePart(
          'iso',
          nCorrect === 1 ? 'Elige una' : 'Elige todas las correctas',
          options,
          correct.map((_, i) => `c${i}`),
          `${label(ref)} tiene ${ref.e} electrones. Son isoelectrónicas las especies con ese mismo número de electrones, aunque tengan distinto Z.`,
          nCorrect > 1,
        ),
      ],
      stepwise: false,
      hints: ['Isoelectrónico = mismo número de electrones.', 'Electrones = Z − carga. Calcula los electrones de cada especie.', `La especie de referencia tiene ${ref.e} electrones.`],
      solution: [`e⁻(${label(ref)}) = ${refZ} − (${refQ}) = ${ref.e}.`, ...correct.map(([z, q]) => `e⁻(${label(speciesOf(z, typicalA(z), q))}) = ${z} − (${q}) = ${z - q} ✓`)],
    };
  },
};

interface ConceptItem {
  q: string;
  options: { id: string; text: string; feedback?: string }[];
  correct: string;
  explanation: string;
}

const PARTICLE_ITEMS: ConceptItem[] = [
  {
    q: '¿Dónde se encuentran los protones y los neutrones de un átomo?',
    options: [
      { id: 'nucleo', text: 'En el núcleo' },
      { id: 'corteza', text: 'En la corteza', feedback: 'En la corteza están los electrones. Los nucleones (protones y neutrones) forman el núcleo.' },
      { id: 'repartidos', text: 'Repartidos por todo el volumen del átomo', feedback: 'Eso describía el modelo de Thomson (para la carga positiva). Rutherford demostró que se concentran en un núcleo diminuto.' },
    ],
    correct: 'nucleo',
    explanation: 'Protones y neutrones (nucleones) forman el núcleo, muy pequeño y donde se concentra casi toda la masa. Los electrones ocupan la corteza.',
  },
  {
    q: '¿Qué partícula tiene una masa unas 1836 veces menor que la del protón?',
    options: [
      { id: 'e', text: 'El electrón' },
      { id: 'n', text: 'El neutrón', feedback: 'El neutrón tiene una masa casi igual (algo mayor) a la del protón: 1,0087 u frente a 1,0073 u.' },
      { id: 'ninguna', text: 'Ninguna: todas tienen masas parecidas', feedback: 'm(e⁻) = 9,109·10⁻³¹ kg y m(p⁺) = 1,673·10⁻²⁷ kg: su cociente es ≈ 1836.' },
    ],
    correct: 'e',
    explanation: 'm(p⁺)/m(e⁻) = 1,6726·10⁻²⁷ / 9,109·10⁻³¹ ≈ 1836. Por eso la masa del átomo está casi toda en el núcleo.',
  },
  {
    q: '¿Cuál es la carga relativa del neutrón?',
    options: [
      { id: '0', text: '0' },
      { id: '+1', text: '+1', feedback: '+1 es la carga relativa del protón.' },
      { id: '-1', text: '−1', feedback: '−1 es la carga relativa del electrón.' },
    ],
    correct: '0',
    explanation: 'El neutrón no tiene carga eléctrica: su carga relativa es 0 (Chadwick, 1932).',
  },
  {
    q: 'Un átomo neutro pierde dos electrones. ¿Qué ocurre con su número atómico?',
    options: [
      { id: 'igual', text: 'No cambia: sigue siendo el mismo elemento' },
      { id: 'menos2', text: 'Disminuye en 2', feedback: 'Z cuenta protones, no electrones. Al perder electrones se forma un catión del mismo elemento.' },
      { id: 'mas2', text: 'Aumenta en 2', feedback: 'Aumenta la carga (+2), no el número atómico.' },
    ],
    correct: 'igual',
    explanation: 'Z es el número de protones. Perder electrones forma el catión X²⁺, que sigue siendo el mismo elemento.',
  },
];

export const particleGenerator: ExerciseGenerator = {
  id: 'particulas',
  title: 'Partículas subatómicas',
  nodeIds: ['1.6', '1.1'],
  difficulties: [1],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const item = PARTICLE_ITEMS[seed % PARTICLE_ITEMS.length]!;
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['1.6', '1.1'],
      difficulty,
      title: 'Partículas del átomo',
      statement: item.q,
      parts: [choicePart('c', 'Elige una respuesta', shuffle(rng, item.options), [item.correct], item.explanation)],
      stepwise: false,
      hints: ['Recuerda la tabla de partículas: carga, masa y localización.', 'Núcleo: protones (+1) y neutrones (0). Corteza: electrones (−1), muy ligeros.', 'Z = número de protones; no depende de los electrones.'],
      solution: [item.explanation],
    };
  },
};

/** Generador genérico basado en un estado aleatorio (útil para pruebas). */
export function randomSpecies(rng: Rng): Species {
  const [z, a] = pick(rng, COMMON_NUCLIDES);
  return speciesOf(z, a, 0);
}
