/**
 * Generadores de los bloques 2, 3.1, 4, 5, 6 y 7 (fase 2+). Todas las soluciones se calculan con
 * el núcleo científico o con datos de referencia; las preguntas conceptuales llevan retroalimentación
 * específica para cada distractor.
 */
import { abundanceResolution, averageMassResolution } from '../resolutions';
import { ELEMENTS, elementByZ, familyName, type ElementRecord } from '../../science/elements';
import { NATURAL_ISOTOPES } from '../../science/data/naturalIsotopes';
import { averageAtomicMass, twoIsotopeAbundance } from '../../science/massSpec';
import { groundState, formatConfiguration, valenceElectrons } from '../../science/configuration';
import { slater } from '../../science/slater';
import { compare, commonIon, PROPERTIES, type PropertyId } from '../../science/trends';
import { lLetter, orbitalsInSubshell, subshellCapacity } from '../../science/quantum';
import { ionSymbol } from '../../science/nucleus';
import type { ChoiceOption, Difficulty, Exercise, ExerciseGenerator, ExercisePart } from '../types';
import { choicePart, exId, fmt, integerPart, numericPart, pick, randInt, rngFor, shuffle, type Rng } from './util';

// ── Banco conceptual genérico ─────────────────────────────────────────────

export interface ConceptItem {
  q: string;
  options: ChoiceOption[];
  correct: string;
  explanation: string;
  nodes: string[];
  hints?: [string, string, string];
}

export function conceptGenerator(id: string, title: string, items: ConceptItem[], difficulty: Difficulty = 1): ExerciseGenerator {
  const nodeIds = [...new Set(items.flatMap((i) => i.nodes))];
  return {
    id,
    title,
    nodeIds,
    difficulties: [difficulty],
    create(seed, d) {
      const rng = rngFor(id, seed, d);
      const item = items[seed % items.length]!;
      return buildConcept(item, exId(id, d, seed), id, d, rng);
    },
  };
}

export function buildConcept(item: ConceptItem, seedId: string, generatorId: string, difficulty: Difficulty, rng?: Rng, source?: string): Exercise {
  return {
    id: seedId,
    generatorId,
    nodeIds: item.nodes,
    difficulty,
    title: 'Razona',
    statement: item.q,
    parts: [choicePart('c', 'Elige una respuesta', rng ? shuffle(rng, item.options) : item.options, [item.correct], item.explanation)],
    stepwise: false,
    hints: item.hints ?? ['Relee el enunciado: ¿qué magnitud o qué modelo está en juego?', 'Descarta las opciones que contradicen una regla o un experimento concreto.', 'Piensa en el experimento o la regla que lo demuestra.'],
    solution: [item.explanation],
    source,
  };
}

const O = (id: string, text: string, feedback?: string): ChoiceOption => ({ id, text, feedback });

export const HISTORY_ITEMS: ConceptItem[] = [
  {
    q: '¿Qué hecho experimental obligó a abandonar el modelo atómico de Dalton?',
    options: [O('e', 'El descubrimiento del electrón (Thomson, 1897)'), O('n', 'El descubrimiento del neutrón', 'El neutrón (1932) es muy posterior; Dalton ya había sido superado por Thomson.'), O('esp', 'Los espectros del hidrógeno', 'Los espectros obligaron a revisar el modelo de Rutherford, no el de Dalton.')],
    correct: 'e',
    explanation: 'Si el átomo contiene electrones, no es una esfera maciza e indivisible: tiene partes. La radiactividad (Becquerel, 1896) apuntaba en la misma dirección.',
    nodes: ['2.1', '2.2'],
  },
  {
    q: 'En el tubo de rayos catódicos de Thomson, ¿qué observación indica que los rayos son partículas con carga negativa?',
    options: [O('desv', 'Se desvían hacia la placa positiva al aplicar un campo eléctrico'), O('recto', 'Viajan en línea recta sin campos', 'También lo haría la luz: no informa sobre la carga.'), O('gas', 'Sus propiedades no dependen del gas del tubo', 'Eso indica que son un componente común a toda la materia, no su signo.')],
    correct: 'desv',
    explanation: 'Un haz que se curva hacia la placa positiva (y responde también a campos magnéticos) está formado por partículas con carga negativa: los electrones.',
    nodes: ['2.2'],
  },
  {
    q: '¿Por qué el resultado del experimento de Geiger–Marsden contradice el modelo de Thomson?',
    options: [
      O('rebote', 'Algunas partículas α rebotaban: necesitan chocar con una carga positiva muy concentrada'),
      O('todas', 'Todas las partículas α atravesaban la lámina', 'Eso sí era compatible con Thomson; lo que no encajaba eran las grandes desviaciones.'),
      O('luz', 'La lámina emitía luz', 'La pantalla de ZnS centelleaba al recibir partículas α; no es lo que refuta el modelo.'),
    ],
    correct: 'rebote',
    explanation: 'En el modelo de Thomson la carga positiva está repartida: solo produce desviaciones pequeñísimas. Las grandes desviaciones y los rebotes exigen un núcleo diminuto, positivo y con casi toda la masa.',
    nodes: ['2.3', '2.4', '2.5'],
  },
  {
    q: 'Que la mayoría de las partículas α atravesaran la lámina de oro sin desviarse indica que…',
    options: [O('vacio', 'el átomo es, sobre todo, espacio vacío'), O('blanda', 'el oro es un metal muy blando', 'La desviación depende de las cargas, no de la dureza del metal.'), O('lentas', 'las partículas α eran muy lentas', 'Eran rapidísimas (≈ 1,5·10⁷ m/s); además, más lentas se desviarían más.')],
    correct: 'vacio',
    explanation: 'El núcleo es unas 10⁵ veces menor que el átomo: casi todas las partículas pasan lejos de cualquier núcleo.',
    nodes: ['2.4', '2.5'],
  },
  {
    q: 'Según la física clásica (Maxwell), ¿qué le ocurriría al electrón del átomo de Rutherford?',
    options: [O('colapso', 'Radiaría energía al estar acelerado y caería en espiral hacia el núcleo'), O('escapa', 'Escaparía del átomo', 'Al perder energía se acerca al núcleo, no se aleja.'), O('nada', 'Nada: giraría eternamente como un planeta', 'Un planeta no tiene carga; una carga acelerada emite radiación.')],
    correct: 'colapso',
    explanation: 'Una carga con aceleración (normal, en una órbita circular) emite ondas electromagnéticas. El cálculo clásico da un colapso en ≈ 10⁻¹¹ s y un espectro continuo, en contra de la estabilidad de la materia y de los espectros de líneas.',
    nodes: ['2.6'],
  },
  {
    q: '¿Qué problema del modelo de Rutherford resolvió el descubrimiento del neutrón (Chadwick, 1932)?',
    options: [O('estab', 'Cómo se mantiene unido un núcleo con varios protones que se repelen'), O('esp', 'Por qué los espectros son discretos', 'Eso lo explicó Bohr con la cuantización de la energía.'), O('masa', 'Por qué el electrón tiene tan poca masa', 'El neutrón no tiene relación con la masa del electrón.')],
    correct: 'estab',
    explanation: 'Los neutrones aportan masa y participan en la fuerza nuclear fuerte, que mantiene unidos a los nucleones pese a la repulsión eléctrica entre protones.',
    nodes: ['2.6'],
  },
  {
    q: 'Ordena cronológicamente: modelo de Bohr, modelo de Thomson, descubrimiento del neutrón, modelo de Rutherford. ¿Cuál fue el tercero?',
    options: [O('bohr', 'Modelo de Bohr (1913)'), O('ruth', 'Modelo de Rutherford (1911)', 'Rutherford (1911) fue el segundo, tras Thomson (1904).'), O('chad', 'Neutrón (1932)', 'El neutrón fue lo último (1932).'), O('thom', 'Thomson (1904)', 'Thomson fue el primero de los cuatro.')],
    correct: 'bohr',
    explanation: 'Thomson (1904) → Rutherford (1911) → Bohr (1913) → Chadwick, neutrón (1932).',
    nodes: ['2.7'],
  },
  {
    q: '¿Qué afirma el primer postulado de Bohr?',
    options: [O('estac', 'El electrón gira en ciertas órbitas estacionarias sin emitir energía'), O('salto', 'El electrón emite energía al saltar entre órbitas', 'Ese es el tercer postulado.'), O('momento', 'El momento angular es múltiplo de h/2π', 'Esa es la condición de cuantización (segundo postulado).')],
    correct: 'estac',
    explanation: 'Postulado 1: órbitas estacionarias sin radiación. Postulado 2: solo las órbitas con L = n·h/2π. Postulado 3: emisión o absorción de un fotón con E = |E_f − E_i| = h·ν.',
    nodes: ['4.1'],
  },
  {
    q: 'En el modelo de Bohr, ¿cuánto vale el radio de la órbita n = 3 en función del de la primera (r₀ = 0,53 Å)?',
    options: [O('9', '9·r₀ ≈ 4,76 Å'), O('3', '3·r₀ ≈ 1,59 Å', 'El radio crece con n², no con n.'), O('27', '27·r₀', 'Es n², no n³.')],
    correct: '9',
    explanation: 'rₙ = n²·r₀: r₃ = 9 × 0,53 Å = 4,76 Å (figura de TEO p.8).',
    nodes: ['4.2'],
  },
  {
    q: '¿Qué observación llevó a Sommerfeld a introducir el número cuántico secundario l?',
    options: [O('fina', 'La estructura fina: algunas rayas eran en realidad varias muy próximas'), O('zeeman', 'El desdoblamiento de las rayas en un campo magnético', 'Ese es el efecto Zeeman, que llevó al número cuántico magnético m.'), O('color', 'El color de las lámparas de gas', 'El color depende de las líneas, pero no motivó un nuevo número cuántico.')],
    correct: 'fina',
    explanation: 'Con espectroscopios de más resolución se vio que algunas rayas eran dobles. Sommerfeld propuso órbitas elípticas con energías ligeramente distintas: número cuántico l.',
    nodes: ['4.4'],
  },
  {
    q: '¿Qué número cuántico se introdujo para explicar el desdoblamiento de las rayas espectrales en un campo magnético (efecto Zeeman)?',
    options: [O('m', 'El número cuántico magnético, m'), O('s', 'El de espín, s', 'El espín (Uhlenbeck y Goudsmit, 1925) explica otro desdoblamiento más fino.'), O('l', 'El secundario, l', 'l procede de la estructura fina (Sommerfeld).')],
    correct: 'm',
    explanation: 'En un campo magnético, órbitas (hoy orbitales) con distinta orientación espacial tienen energías distintas: número cuántico magnético m.',
    nodes: ['4.4'],
  },
];

export const QUANTUM_CONCEPT_ITEMS: ConceptItem[] = [
  {
    q: '¿Cuál es la diferencia entre órbita y orbital? (AMP 11)',
    options: [
      O('ok', 'Una órbita es una trayectoria definida (Bohr); un orbital es una región donde es más probable encontrar al electrón'),
      O('igual', 'Son sinónimos', 'No: la mecánica cuántica abandona la idea de trayectoria.'),
      O('tam', 'Un orbital es una órbita más pequeña', 'No es cuestión de tamaño: un orbital describe una probabilidad, no un recorrido.'),
    ],
    correct: 'ok',
    explanation: 'El principio de incertidumbre impide conocer a la vez posición y velocidad del electrón, así que no tiene sentido hablar de trayectoria. El orbital es la función matemática que describe tamaño, forma y orientación de la región de máxima probabilidad.',
    nodes: ['5.3'],
  },
  {
    q: 'Según el principio de incertidumbre de Heisenberg…',
    options: [O('ok', 'cuanto mejor se conoce la posición del electrón, peor se conoce su velocidad'), O('aparatos', 'los aparatos de medida actuales no son lo bastante precisos', 'No es un problema técnico: es una propiedad de la naturaleza (Δx·Δp ≥ ħ/2).'), O('nada', 'no se puede saber nada del electrón', 'Se puede conocer, pero no las dos magnitudes a la vez con precisión ilimitada.')],
    correct: 'ok',
    explanation: 'Δx·Δp ≥ ħ/2: el producto de las incertidumbres tiene un mínimo. Por eso se sustituye la trayectoria por una distribución de probabilidad.',
    nodes: ['5.2'],
  },
  {
    q: '¿Qué propuso De Broglie?',
    options: [O('ok', 'Que la materia, como la luz, puede comportarse como onda o como partícula'), O('inc', 'Que no se puede medir la posición del electrón', 'Eso es el principio de incertidumbre (Heisenberg).'), O('orb', 'Que los electrones giran en órbitas circulares', 'Eso es el modelo de Bohr.')],
    correct: 'ok',
    explanation: 'Dualidad onda-partícula: el electrón también tiene comportamiento ondulatorio. Es la base del modelo mecanocuántico.',
    nodes: ['5.1'],
  },
  {
    q: '¿Qué número cuántico caracteriza el tipo (la forma) de un orbital? (AMP 13)',
    options: [O('l', 'El secundario o azimutal, l'), O('n', 'El principal, n', 'n fija el tamaño y la energía: 1s, 2s y 3s tienen la misma forma.'), O('m', 'El magnético, m', 'm fija la orientación (px, py, pz), no el tipo.')],
    correct: 'l',
    explanation: 'l = 0 → s, l = 1 → p, l = 2 → d, l = 3 → f.',
    nodes: ['5.4', '5.5'],
  },
  {
    q: '¿Cuántos estados cuánticos (combinaciones n, l, m, s) hay con n = 2?',
    options: [O('8', '8 = 2n²'), O('4', '4', 'Hay 4 orbitales (n²), pero cada uno admite 2 estados de espín.'), O('6', '6', 'Faltan los dos estados del orbital 2s.')],
    correct: '8',
    explanation: 'Orbitales con n = 2: 2s (1) + 2p (3) = 4 = n². Con dos espines cada uno: 8 = 2n² estados (tabla de TEO p.13).',
    nodes: ['5.6'],
  },
  {
    q: 'Un electrón 3d y un electrón 4d se diferencian en…',
    options: [O('n', 'el número cuántico principal n (tamaño y energía)'), O('l', 'el número cuántico l', 'Ambos tienen l = 2 (d).'), O('forma', 'la forma del orbital', 'Los dos son orbitales d: misma forma, distinto tamaño.')],
    correct: 'n',
    explanation: 'Mismo l = 2 (forma d); n = 3 frente a n = 4: el 4d es mayor y más energético.',
    nodes: ['5.4', '5.5'],
  },
];

export const historyGenerator = conceptGenerator('historia', 'Modelos atómicos e historia', HISTORY_ITEMS);
export const quantumConceptGenerator = conceptGenerator('cuantica-conceptos', 'Modelo mecanocuántico', QUANTUM_CONCEPT_ITEMS);

// ── 3.1 Masa atómica media ────────────────────────────────────────────────

const ISO_Z = Object.keys(NATURAL_ISOTOPES).map(Number);

export function buildAverageMassExercise(z: number, difficulty: Difficulty, seedId: string, source?: string, override?: { mass: number; abundance: number; a: number }[]): Exercise {
  const el = elementByZ(z)!;
  const iso = override ?? NATURAL_ISOTOPES[z]!;
  const res = averageAtomicMass(iso.map((i) => ({ mass: i.mass, abundance: i.abundance })));
  const table = iso.map((i) => `${el.symbol}-${i.a}: ${fmt(i.mass, 7)} u (${fmt(i.abundance, 4)} %)`).join(' · ');
  if (difficulty === 3 && iso.length === 2) {
    const [l, h] = iso as [{ mass: number; abundance: number; a: number }, { mass: number; abundance: number; a: number }];
    const M = Number(res.value.toFixed(3));
    const x = twoIsotopeAbundance(l.mass, h.mass, M);
    return {
      id: seedId,
      generatorId: 'masa-media',
      nodeIds: ['3.1', '1.3'],
      difficulty,
      title: 'Abundancias a partir de la masa atómica',
      statement: `El ${el.name.toLowerCase()} natural tiene dos isótopos: **${el.symbol}-${l.a}** (${fmt(l.mass, 7)} u) y **${el.symbol}-${h.a}** (${fmt(h.mass, 7)} u). Su masa atómica es **${fmt(M, 5)} u**. Calcula la abundancia de cada isótopo.`,
      parts: [
        numericPart({ id: 'x', prompt: `Abundancia del ${el.symbol}-${l.a} (%)`, value: x, unit: '%', sig: 3, relTol: 0.01, explanation: `M = m₁·x + m₂·(1 − x) → x = (M − m₂)/(m₁ − m₂) = (${fmt(M, 5)} − ${fmt(h.mass, 7)})/(${fmt(l.mass, 7)} − ${fmt(h.mass, 7)}) = ${fmt(x / 100, 4)} → ${fmt(x, 4)} %.`, placeholder: 'en %' }),
        numericPart({ id: 'y', prompt: `Abundancia del ${el.symbol}-${h.a} (%)`, value: 100 - x, unit: '%', sig: 3, relTol: 0.01, explanation: `Las abundancias suman 100 %: ${fmt(100 - x, 4)} %.`, recompute: { from: 'x', fn: (v) => 100 - v }, placeholder: 'en %' }),
      ],
      stepwise: true,
      hints: ['Las dos abundancias suman 100 %: llama x a una y 100 − x a la otra.', 'M = [m₁·x + m₂·(100 − x)] / 100. Despeja x.', `x = 100·(M − m₂)/(m₁ − m₂) con m₁ = ${fmt(l.mass, 7)} u y m₂ = ${fmt(h.mass, 7)} u.`],
      solution: [`x = 100·(${fmt(M, 5)} − ${fmt(h.mass, 7)})/(${fmt(l.mass, 7)} − ${fmt(h.mass, 7)}) = ${fmt(x, 4)} %.`, `Comprobación: con dos isótopos, la masa media queda más cerca del más abundante.`],
      resolution: abundanceResolution(el.symbol, l, h, M, x),
      source,
    };
  }
  return {
    id: seedId,
    generatorId: 'masa-media',
    nodeIds: ['3.1', '1.3'],
    difficulty,
    title: 'Masa atómica a partir del espectro de masas',
    statement: `El espectro de masas del ${el.name.toLowerCase()} muestra estos picos: ${table}. Calcula su masa atómica.`,
    parts: [
      numericPart({
        id: 'M',
        prompt: 'Masa atómica media (u)',
        value: res.value,
        unit: 'u',
        sig: 5,
        relTol: 0.0005,
        explanation: `M = Σ(mᵢ·%ᵢ)/100 = (${iso.map((i) => `${fmt(i.mass, 7)}·${fmt(i.abundance, 4)}`).join(' + ')})/100 = ${fmt(res.value, 6)} u.`,
        misconceptions: [
          { test: (v) => Math.abs(v - iso.reduce((a, i) => a + i.mass, 0) / iso.length) < 0.003, message: 'Has hecho la media aritmética. Hay que ponderar cada masa por su abundancia.' },
          { test: (v) => Math.abs(v - res.value * 100) / (res.value * 100) < 0.001, message: 'Te falta dividir entre 100: las abundancias están en porcentaje.' },
        ],
      }),
      choicePart(
        'cerca',
        '¿A qué isótopo está más cerca la masa media?',
        iso.map((i) => O(String(i.a), `${el.symbol}-${i.a}`, 'La media ponderada se acerca al isótopo con mayor abundancia.')),
        // La respuesta se CALCULA (isótopo más próximo a la media): con dos isótopos coincide siempre con el más
        // abundante; con tres o más no está garantizado, y no se afirma.
        [String([...iso].sort((a, b) => Math.abs(a.mass - res.value) - Math.abs(b.mass - res.value))[0]!.a)],
        iso.length === 2
          ? 'Con dos isótopos, la masa media siempre queda más cerca del más abundante: es una buena forma de comprobar el resultado (TEO p.5).'
          : 'La media ponderada se acerca a los isótopos más abundantes; con más de dos isótopos, compruébalo comparando distancias.',
      ),
    ],
    stepwise: true,
    hints: ['La masa atómica es un promedio ponderado: cada isótopo pesa según su abundancia.', 'M = (m₁·%₁ + m₂·%₂ + …)/100.', `Multiplica ${fmt(iso[0]!.mass, 7)} por ${fmt(iso[0]!.abundance, 4)} y suma el resto de términos.`],
    solution: [`M = ${fmt(res.value, 6)} u (valor tabulado: ${fmt(el.atomicWeight, 5)} u).`],
    resolution: averageMassResolution(el.symbol, iso, res.value),
    source,
  };
}

export const averageMassGenerator: ExerciseGenerator = {
  id: 'masa-media',
  title: 'Espectrometría de masas y masa atómica media',
  nodeIds: ['3.1', '1.3'],
  difficulties: [1, 2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const two = ISO_Z.filter((z) => NATURAL_ISOTOPES[z]!.length === 2);
    const many = ISO_Z.filter((z) => NATURAL_ISOTOPES[z]!.length >= 3);
    const z = pick(rng, difficulty === 2 ? many : two);
    return buildAverageMassExercise(z, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 7.x Tendencias periódicas con datos reales ────────────────────────────

const MAIN = ELEMENTS.filter((e) => e.group !== null && (e.group <= 2 || e.group >= 13) && e.z <= 56 && e.z > 2);
const TREND_PROPS: PropertyId[] = ['radio', 'ei1', 'en', 'ae'];

function orderedByData(prop: PropertyId, els: ElementRecord[]): ElementRecord[] | null {
  const vals = els.map((e) => PROPERTIES[prop].get(e));
  if (vals.some((v) => v === null)) return null;
  if (new Set(vals.map((v) => v!.toFixed(3))).size !== vals.length) return null;
  return [...els].sort((a, b) => PROPERTIES[prop].get(a)! - PROPERTIES[prop].get(b)!);
}

/** ¿Siguen todas las parejas la tendencia simple? */
function followsTrend(prop: PropertyId, els: ElementRecord[]): boolean {
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const c = compare(prop, els[i]!, els[j]!);
    if (!c.predicted || !c.actual || c.predicted !== c.actual) return false;
  }
  return true;
}

export function buildTrendOrderExercise(prop: PropertyId, els: ElementRecord[], difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const order = orderedByData(prop, els)!;
  const P = PROPERTIES[prop];
  const comps = [];
  for (let i = 0; i < order.length - 1; i++) comps.push(compare(prop, order[i]!, order[i + 1]!));
  const exceptions = comps.filter((c) => c.exception).map((c) => c.exception!);
  const rel = comps[0]!.relation;
  const nodeOf: Record<string, string> = { radio: '7.7', ei1: '7.9', ae: '7.10', en: '7.11' };
  return {
    id: seedId,
    generatorId: 'tendencia-ordenar',
    nodeIds: exceptions.length ? [nodeOf[prop]!, '7.13'] : [nodeOf[prop]!, '7.6'],
    difficulty,
    title: `Ordenar por ${P.short}`,
    statement: `Ordena estos elementos de **menor a mayor ${P.label.toLowerCase()}**: ${shuffle(() => 0.37, els).map((e) => `${e.name} (Z = ${e.z})`).join(', ')}.`,
    parts: [
      {
        id: 'orden',
        prompt: `De menor a mayor ${P.short}`,
        answer: { kind: 'order', items: els.map((e) => ({ id: e.symbol, text: `${e.symbol} · ${e.name}`, feedback: exceptions[0] ?? `Revisa la posición en la tabla: ${rel === 'mismo-periodo' ? 'en un periodo, la carga nuclear efectiva crece hacia la derecha' : 'en un grupo, el número de capas crece hacia abajo'}.` })), correctOrder: order.map((e) => e.symbol) },
        canonical: order.map((e) => e.symbol).join(' < '),
        explanation: [...comps[0]!.reasoning, ...exceptions].join(' ') + ` Datos: ${order.map((e) => `${e.symbol} ${fmt(P.get(e)!, 3)}${P.unit ? ' ' + P.unit : ''}`).join(' · ')}.`,
      },
    ],
    stepwise: false,
    hints: [
      'Localiza los elementos en la tabla: ¿comparten periodo o grupo?',
      rel === 'mismo-periodo' ? 'En un periodo: Z_ef aumenta hacia la derecha → radio menor; EI, AE y χ mayores.' : 'En un grupo: hacia abajo hay más capas → radio mayor; EI, AE y χ menores.',
      difficulty === 3 ? 'Ojo: entre estos elementos hay una excepción conocida a la tendencia simple.' : 'Aplica la tendencia a cada pareja.',
    ],
    solution: [...comps.flatMap((c) => c.reasoning.slice(-1)), ...exceptions, `Orden: ${order.map((e) => e.symbol).join(' < ')}.`],
    source,
  };
}

export const trendGenerator: ExerciseGenerator = {
  id: 'tendencia-ordenar',
  title: 'Tendencias periódicas (datos reales)',
  nodeIds: ['7.7', '7.9', '7.10', '7.11', '7.13', '7.6'],
  difficulties: [1, 2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    for (let attempt = 0; attempt < 400; attempt++) {
      const prop = difficulty === 1 ? pick(rng, ['radio', 'en'] as PropertyId[]) : pick(rng, TREND_PROPS);
      const samePeriod = rng() < 0.55;
      let pool: ElementRecord[];
      if (samePeriod) {
        const period = randInt(rng, 2, 5);
        pool = MAIN.filter((e) => e.period === period && e.group !== 18);
      } else {
        const group = pick(rng, [1, 2, 15, 16, 17]);
        pool = MAIN.filter((e) => e.group === group);
      }
      const els = shuffle(rng, pool).slice(0, difficulty === 1 ? 3 : 4);
      if (els.length < 3 || !orderedByData(prop, els)) continue;
      const follows = followsTrend(prop, els);
      if (difficulty < 3 && !follows) continue;
      if (difficulty === 3 && follows) continue;
      return buildTrendOrderExercise(prop, els, difficulty, exId(this.id, difficulty, seed));
    }
    const E = (s: string) => ELEMENTS.find((e) => e.symbol === s)!;
    return buildTrendOrderExercise('ei1', [E('N'), E('O'), E('C')], difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 7.1–7.4 Posición en la tabla ──────────────────────────────────────────

const BLOCK_OPTS = (['s', 'p', 'd', 'f'] as const).map((b) => O(b, `Bloque ${b}`, `El bloque lo da el subnivel del electrón diferenciador (el último que entra según Möller).`));

export const positionGenerator: ExerciseGenerator = {
  id: 'posicion-tabla',
  title: 'Periodo, grupo, bloque y familia',
  nodeIds: ['7.1', '7.2', '7.3', '7.4'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const pool = ELEMENTS.filter((e) => e.group !== null && e.z <= (difficulty === 1 ? 20 : 56) && e.z > 1);
    const el = pick(rng, pool);
    const conf = groundState(el.z);
    const fam = familyName(el);
    const famOpts = shuffle(rng, [...new Set([fam, 'Alcalinos', 'Halógenos', 'Gases nobles', 'Metales de transición', 'Alcalinotérreos', 'Anfígenos (calcógenos)'])]).slice(0, 4);
    if (!famOpts.includes(fam)) famOpts[0] = fam;
    const parts: ExercisePart[] = [
      integerPart('periodo', 'Periodo', el.period, `La capa más externa ocupada es n = ${el.period}: periodo ${el.period}.`),
      integerPart('grupo', 'Grupo', el.group!, `Configuración externa ${formatConfiguration(conf.filter((s) => s.n === el.period || (s.l === 2 && s.n === el.period - 1)), { order: 'capas' })}: grupo ${el.group}.`),
      choicePart('bloque', 'Bloque', BLOCK_OPTS, [el.block], `El último electrón (según Möller) entra en un subnivel ${el.block}: bloque ${el.block}.`),
    ];
    if (difficulty === 2) parts.push(choicePart('familia', 'Familia', famOpts.map((f) => O(f, f, `El ${el.name.toLowerCase()} está en el grupo ${el.group}.`)), [fam], `Grupo ${el.group}: ${fam.toLowerCase()}.`));
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['7.1', '7.2', '7.3', '7.4'],
      difficulty,
      title: 'Sitúa el elemento',
      statement: `Un átomo neutro tiene la configuración **${formatConfiguration(conf, { abbreviate: el.z > 10 })}**. Indica su posición en la tabla periódica.`,
      parts,
      stepwise: false,
      hints: ['El periodo coincide con el número cuántico principal de la capa de valencia.', 'Bloque s: grupos 1–2. Bloque d: grupos 3–12 (ns² (n−1)dˣ → grupo 2 + x). Bloque p: grupos 13–18 (12 + electrones ns np).', `Suma los electrones de valencia: ${valenceElectrons(conf)} en la capa n = ${el.period}.`],
      solution: [...parts.map((p) => p.explanation), `Es el ${el.name.toLowerCase()} (${el.symbol}).`],
    };
  },
};

// ── 7.5 Iones estables ────────────────────────────────────────────────────

const ION_OPTS = ['+1', '+2', '+3', '-1', '-2', '-3', 'ninguno'].map((c) => O(c, c === 'ninguno' ? 'No forma un ion sencillo' : c.replace('-', '−'), ''));

export const stableIonGenerator: ExerciseGenerator = {
  id: 'ion-estable',
  title: 'Ion más estable',
  nodeIds: ['7.5', '6.8'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const pool = MAIN.filter((e) => commonIon(e).charge !== null || e.group === 18).filter((e) => (difficulty === 1 ? e.period <= 3 : true));
    const el = pick(rng, pool);
    const ion = commonIon(el);
    const id = ion.charge === null ? 'ninguno' : ion.charge > 0 ? `+${ion.charge}` : String(ion.charge);
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['7.5', '6.8'],
      difficulty,
      title: 'El ion que forma',
      statement: `Razona qué ion monoatómico forma con más facilidad el **${el.name.toLowerCase()}** (Z = ${el.z}, ${formatConfiguration(groundState(el.z), { abbreviate: el.z > 10 })}).`,
      parts: [choicePart('ion', 'Carga del ion', ION_OPTS.map((o) => ({ ...o, feedback: `Mira la capa de valencia: ¿qué es más fácil, perder ${valenceElectrons(groundState(el.z))} electrones o ganar los que faltan hasta 8?` })), [id], `${ion.reason}${ion.charge !== null ? ` Ion: ${ionSymbol(el.symbol, ion.charge)}.` : ''}`)],
      stepwise: false,
      hints: ['Los elementos representativos tienden a alcanzar la configuración del gas noble más cercano.', 'Si tiene 1–3 electrones de valencia, los pierde (catión); si tiene 5–7, gana los que le faltan (anión).', `Tiene ${valenceElectrons(groundState(el.z))} electrones en la capa externa.`],
      solution: [ion.reason],
    };
  },
};

// ── 7.6 Carga nuclear efectiva ────────────────────────────────────────────

export const zeffGenerator: ExerciseGenerator = {
  id: 'zeff',
  title: 'Carga nuclear efectiva (Slater)',
  nodeIds: ['7.6'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const z = difficulty === 2 ? randInt(rng, 3, 18) : randInt(rng, 19, 36);
    const el = elementByZ(z)!;
    const conf = groundState(z);
    const outer = [...conf].sort((a, b) => b.n - a.n || b.l - a.l)[0]!;
    const r = slater(z, conf, outer);
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['7.6'],
      difficulty,
      title: 'Apantallamiento',
      statement: `Calcula con las reglas de Slater la carga nuclear efectiva que siente un electrón **${outer.n}${lLetter(outer.l)}** del **${el.name.toLowerCase()}** (Z = ${z}; ${formatConfiguration(conf)}).`,
      data: [{ label: 'Slater', value: 'mismo grupo 0,35 (1s: 0,30) · capa n−1: 0,85 · capas n−2 e internas: 1,00' }],
      parts: [
        numericPart({ id: 'a', prompt: 'Constante de apantallamiento a', value: r.shielding, unit: '', sig: 4, relTol: 0.004, explanation: `a = ${r.contributions.map((c) => `${c.electrons}·${fmt(c.factor, 2)} (${c.group})`).join(' + ')} = ${fmt(r.shielding, 3)}.`, placeholder: 'número' }),
        numericPart({ id: 'zef', prompt: 'Z_ef = Z − a', value: r.zeff, unit: '', sig: 4, relTol: 0.004, explanation: `Z_ef = ${z} − ${fmt(r.shielding, 3)} = ${fmt(r.zeff, 3)}.`, recompute: { from: 'a', fn: (a) => z - a }, placeholder: 'número' }),
      ],
      stepwise: true,
      hints: ['Agrupa: (1s)(2s,2p)(3s,3p)(3d)(4s,4p)… Los electrones de grupos posteriores no apantallan.', 'Para un electrón ns/np: los demás de su grupo 0,35; los de la capa n−1, 0,85; los más internos, 1,00.', `Cuenta cuántos electrones hay en cada grupo por debajo del ${outer.n}${lLetter(outer.l)}.`],
      solution: [`a = ${fmt(r.shielding, 3)}; Z_ef = ${fmt(r.zeff, 3)}. TEO simplifica: internos → 1 y misma capa → < 1.`],
    };
  },
};

// ── 7.8 Radios de iones e isoelectrónicos ─────────────────────────────────

const ISO_SERIES: [number, number][][] = [
  [[8, -2], [9, -1], [11, 1], [12, 2], [13, 3]],
  [[16, -2], [17, -1], [19, 1], [20, 2]],
];

export function buildIonRadiusExercise(species: [number, number][], difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const sameEl = species.every(([z]) => z === species[0]![0]);
  const order = sameEl ? [...species].sort((a, b) => b[1] - a[1]) : [...species].sort((a, b) => b[0] - a[0]); // menor radio primero
  const label = ([z, q]: [number, number]) => ionSymbol(elementByZ(z)!.symbol, q);
  return {
    id: seedId,
    generatorId: 'radio-ionico',
    nodeIds: sameEl ? ['7.8'] : ['7.8', '1.5'],
    difficulty,
    title: 'Tamaño de especies',
    statement: `Ordena de **menor a mayor tamaño**: ${species.map(label).join(', ')}.`,
    parts: [
      {
        id: 'orden',
        prompt: 'De menor a mayor radio',
        answer: { kind: 'order', items: species.map((s) => ({ id: label(s), text: label(s), feedback: sameEl ? 'Más electrones con los mismos protones → más repulsión y menos Z_ef → mayor radio.' : 'Mismo número de electrones: el que tiene más protones los atrae más y es más pequeño.' })), correctOrder: order.map(label) },
        canonical: order.map(label).join(' < '),
        explanation: sameEl
          ? `Mismo núcleo (Z = ${species[0]![0]}). Al quitar electrones disminuye la repulsión y la nube se contrae; al añadirlos se expande: r(catión) < r(neutro) < r(anión).`
          : `Todas tienen ${species[0]![0] - species[0]![1]} electrones (isoelectrónicas). Cuantos más protones, más atraídos están: ${order.map(label).join(' < ')}.`,
      },
    ],
    stepwise: false,
    hints: ['¿Qué tienen en común estas especies: el núcleo o el número de electrones?', sameEl ? 'r(catión) < r(neutro) < r(anión).' : 'Especies isoelectrónicas: a más protones, menor radio.', 'Cuenta protones y electrones de cada una.'],
    solution: [`${order.map(label).join(' < ')}.`],
    source,
  };
}

export const ionRadiusGenerator: ExerciseGenerator = {
  id: 'radio-ionico',
  title: 'Radios iónicos e isoelectrónicos',
  nodeIds: ['7.8', '1.5'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    if (difficulty === 2) {
      const el = pick(rng, MAIN.filter((e) => e.period <= 4 && e.group !== 18));
      return buildIonRadiusExercise(shuffle(rng, [[el.z, 1], [el.z, 0], [el.z, -1]] as [number, number][]), 2, exId(this.id, difficulty, seed));
    }
    const series = pick(rng, ISO_SERIES);
    return buildIonRadiusExercise(shuffle(rng, series).slice(0, 4), 3, exId(this.id, difficulty, seed));
  },
};

// ── 7.4 Identificar por familia y periodo (AMP 16, 21) ────────────────────

const FAMILY_DEF = [
  { name: 'metal alcalino', group: 1 },
  { name: 'metal alcalinotérreo', group: 2 },
  { name: 'halógeno', group: 17 },
  { name: 'gas noble', group: 18 },
  { name: 'anfígeno', group: 16 },
];

export const familyGenerator: ExerciseGenerator = {
  id: 'familia-periodo',
  title: 'Identificar un elemento por su familia',
  nodeIds: ['7.4', '7.2'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const f = pick(rng, FAMILY_DEF);
    const minP = f.group === 1 || f.group === 18 ? 2 : 2;
    const period = randInt(rng, minP, difficulty === 1 ? 4 : 6);
    const el = ELEMENTS.find((e) => e.group === f.group && e.period === period)!;
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['7.4', '7.2'],
      difficulty,
      title: '¿Quién es?',
      statement: `Indica el **${f.name} del periodo ${period}**.`,
      parts: [{ id: 'el', prompt: 'Elemento (símbolo o nombre)', answer: { kind: 'element', z: el.z }, canonical: el.symbol, explanation: `Grupo ${f.group}, periodo ${period}: ${el.name} (${el.symbol}), configuración externa ${formatConfiguration(groundState(el.z).filter((s) => s.n === period), { order: 'capas' })}.`, placeholder: 'p. ej. K' }],
      stepwise: false,
      hints: [`Los ${f.name}s forman el grupo ${f.group}.`, `Baja por el grupo ${f.group} hasta la fila ${period}.`, `Su capa de valencia es n = ${period}.`],
      solution: [`${el.name} (${el.symbol}).`],
    };
  },
};

// ── 5.4–5.5 Números cuánticos de un subnivel ──────────────────────────────

export function buildSubshellExercise(n: number, l: number, difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const label = `${n}${lLetter(l)}`;
  const parts: ExercisePart[] = [
    integerPart('n', 'Número cuántico principal n', n, `El número delante de la letra es n = ${n}.`),
    integerPart('l', 'Número cuántico secundario l', l, `${lLetter(l)} ↔ l = ${l} (s = 0, p = 1, d = 2, f = 3).`),
    integerPart('orb', 'Número de orbitales del subnivel', orbitalsInSubshell(l), `m_l va de −${l} a +${l}: 2l + 1 = ${orbitalsInSubshell(l)} orbitales.`),
    integerPart('e', 'Número máximo de electrones', subshellCapacity(l), `2 electrones por orbital (Pauli): ${subshellCapacity(l)}.`),
  ];
  if (difficulty >= 2) parts.push({ id: 'q', prompt: `Un conjunto (n, l, m_l, m_s) posible para un electrón ${label}`, answer: { kind: 'quantum', n, l }, canonical: `(${n}, ${l}, 0, +1/2)`, explanation: `n = ${n}, l = ${l}, m_l cualquiera entre −${l} y +${l}, m_s = ±½.`, placeholder: '(n, l, m_l, m_s)' });
  return {
    id: seedId,
    generatorId: 'subnivel',
    nodeIds: ['5.4', '5.5'],
    difficulty,
    title: `El subnivel ${label}`,
    statement: `Describe el subnivel **${label}** con sus números cuánticos.`,
    parts,
    stepwise: true,
    hints: ['La notación nx significa: n = número; x = letra del tipo de orbital.', 'Un subnivel de número l tiene 2l + 1 orbitales.', 'Cada orbital admite dos electrones con espines opuestos.'],
    solution: parts.map((p) => p.explanation),
    source,
  };
}

export const subshellGenerator: ExerciseGenerator = {
  id: 'subnivel',
  title: 'Números cuánticos de un subnivel',
  nodeIds: ['5.4', '5.5'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n = randInt(rng, 1, 5);
    const l = randInt(rng, 0, Math.min(3, n - 1));
    return buildSubshellExercise(n, l, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 6.9 Electrones de valencia ────────────────────────────────────────────

export const valenceGenerator: ExerciseGenerator = {
  id: 'valencia',
  title: 'Electrones de valencia',
  nodeIds: ['6.9', '6.6'],
  difficulties: [1],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const el = pick(rng, MAIN);
    const conf = groundState(el.z);
    const v = valenceElectrons(conf);
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['6.9', '6.6'],
      difficulty,
      title: 'La capa que reacciona',
      statement: `¿Cuántos electrones de valencia tiene el **${el.name.toLowerCase()}** (Z = ${el.z})?`,
      parts: [integerPart('v', 'Electrones de valencia', v, `Configuración: ${formatConfiguration(conf, { abbreviate: el.z > 10 })}. En la capa más externa (n = ${el.period}) hay ${v} electrones.`)],
      stepwise: false,
      hints: ['Escribe la configuración electrónica.', 'Los electrones de valencia son los de la capa con mayor n.', `En los representativos coincide con la última cifra del grupo (${el.group}).`],
      solution: [`${v} electrones de valencia.`],
    };
  },
};

/** Elección rápida de un elemento por símbolo. */
export const E = (s: string) => ELEMENTS.find((e) => e.symbol === s)!;

export const MISC_ITEMS: ConceptItem[] = [
  {
    q: 'Al iluminar un gas frío con luz blanca y analizar la luz que lo atraviesa se observa…',
    options: [O('abs', 'un espectro continuo con líneas oscuras (absorción)'), O('emi', 'líneas brillantes sobre fondo negro', 'Eso es un espectro de emisión: lo produce el gas excitado, no la luz que lo atraviesa.'), O('cont', 'un espectro continuo sin huecos', 'Los átomos absorben las frecuencias de los saltos que pueden dar desde su nivel: faltan esas líneas.')],
    correct: 'abs',
    explanation: 'El gas absorbe solo las frecuencias de los saltos que sus átomos pueden dar: aparecen líneas oscuras, cada una en la posición de una línea brillante de su espectro de emisión (TEO p.7). Matiz: en un gas frío casi todos los átomos están en el estado fundamental y solo se ven las líneas que parten de él (en el hidrógeno, la serie de Lyman, en el ultravioleta), no todas las de emisión.',
    nodes: ['3.5'],
  },
  {
    q: '¿Por qué la espectroscopía permite saber de qué está hecha una estrella?',
    options: [O('ok', 'Cada elemento tiene un conjunto propio y único de líneas espectrales'), O('color', 'Porque el color de la estrella indica el elemento', 'El color global depende sobre todo de la temperatura; lo característico son las líneas.'), O('masa', 'Porque las líneas indican la masa de la estrella', 'Las líneas identifican elementos (y su abundancia relativa), no la masa total.')],
    correct: 'ok',
    explanation: 'Los espectros son la huella dactilar de cada elemento; la intensidad de las líneas permite estimar además su concentración relativa.',
    nodes: ['3.5'],
  },
  {
    q: 'En la notación 3p⁴, ¿qué indica el 4?',
    options: [O('e', 'El número de electrones en el subnivel 3p'), O('orb', 'El número de orbitales p', 'Un subnivel p siempre tiene 3 orbitales.'), O('n', 'El nivel de energía', 'El nivel es el 3 (número delante de la letra).')],
    correct: 'e',
    explanation: 'n xᵉ: n = nivel (3), x = tipo de orbital (p) y e = número de electrones en ese subnivel (4).',
    nodes: ['6.1'],
  },
  {
    q: 'En la notación de cajas, ¿cuántas cajas se dibujan para un subnivel d?',
    options: [O('5', '5, una por orbital'), O('10', '10', 'Diez son los electrones que caben; cada caja (orbital) admite dos.'), O('2', '2', 'Dos cajas tendría… ningún subnivel: s tiene 1, p tiene 3, d 5 y f 7.')],
    correct: '5',
    explanation: 'Cada caja representa un orbital: s → 1, p → 3, d → 5, f → 7. En cada una caben dos flechas de sentido opuesto.',
    nodes: ['6.1', '5.5'],
  },
  {
    q: '¿Cuál tiene mayor carácter metálico: el potasio o el bromo (ambos del periodo 4)?',
    options: [O('k', 'El potasio'), O('br', 'El bromo', 'El bromo es un halógeno: tiende a captar electrones (no metal).')],
    correct: 'k',
    explanation: 'El carácter metálico (tendencia a perder electrones) aumenta hacia la izquierda y hacia abajo: el K tiene baja EI, baja AE y baja electronegatividad.',
    nodes: ['7.12'],
  },
  {
    q: '¿Qué conjunto de propiedades caracteriza a un no metal?',
    options: [O('ok', 'Energía de ionización, afinidad electrónica y electronegatividad altas'), O('baja', 'Las tres bajas', 'Eso describe a los metales, que pierden electrones con facilidad.'), O('mix', 'EI baja y electronegatividad alta', 'Las tres propiedades van de la mano: si atrae electrones, también cuesta arrancárselos.')],
    correct: 'ok',
    explanation: 'Los no metales tienden a captar electrones y formar aniones: EI, AE y χ altas (TEO p.22).',
    nodes: ['7.12', '7.11'],
  },
];

export const miscGenerator = conceptGenerator('conceptos-varios', 'Espectros, notación y carácter metálico', MISC_ITEMS);
