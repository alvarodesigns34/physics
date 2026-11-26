/**
 * Bloques 3 y 4 · Radiación electromagnética, espectro del hidrógeno y Bohr (Photon Lab). Orientado por AMP 6–10.
 */
import { EXERCISE_DATA, type ConstantSet } from '../../science/constants';
import { fromWavelength, colorName, EM_REGIONS } from '../../science/photon';
import { cascadeLines, SERIES, transition } from '../../science/hydrogen';
import { relClose } from '../../science/numbers';
import { convert } from '../../science/units';
import type { Difficulty, Exercise, ExerciseGenerator, ExercisePart } from '../types';
import { choicePart, exId, fmt, integerPart, numericPart, pick, rngFor, shuffle, randInt } from './util';

const K = EXERCISE_DATA;

function constantsData(k: ConstantSet, rUnit?: 'm' | 'cm') {
  const d = [
    { label: 'h', value: `${fmt(k.h, 4)} J·s` },
    { label: 'c', value: `${fmt(k.c, 1)} m/s` },
  ];
  if (rUnit) d.push({ label: 'R', value: rUnit === 'cm' ? `${fmt(k.R / 100, 6)} cm⁻¹` : `${fmt(k.R, 5)} m⁻¹` });
  d.push({ label: '1 eV', value: `${fmt(k.eV, 4)} J` });
  return d;
}

const REGION_OPTIONS = EM_REGIONS.map((r) => ({ id: r.id, text: r.name }));

function regionPart(id: string, lambda: number): ExercisePart {
  const p = fromWavelength(lambda, K);
  const color = colorName(lambda * 1e9);
  return choicePart(
    id,
    'Región del espectro electromagnético',
    REGION_OPTIONS.map((o) => ({ ...o, feedback: `Con λ = ${fmt(lambda, 3)} m no corresponde a ${o.text.toLowerCase()}. Compara con los límites: visible entre 380 y 780 nm.` })),
    [p.region.id],
    `λ = ${fmt(lambda * 1e9, 4)} nm pertenece a la región ${p.region.name.toLowerCase()}${color ? ` (color ${color})` : ''}.`,
  );
}

interface WaveSpec {
  value: number;
  unit: 'nm' | 'µm' | 'cm' | 'm' | 'pm';
}

const WAVE_POOL: Record<Difficulty, WaveSpec[]> = {
  1: [{ value: 500, unit: 'nm' }, { value: 650, unit: 'nm' }, { value: 450, unit: 'nm' }, { value: 589, unit: 'nm' }, { value: 400, unit: 'nm' }, { value: 700, unit: 'nm' }],
  2: [{ value: 250, unit: 'nm' }, { value: 121.6, unit: 'nm' }, { value: 1.5, unit: 'µm' }, { value: 10, unit: 'µm' }, { value: 530, unit: 'nm' }],
  3: [{ value: 12.2, unit: 'cm' }, { value: 3, unit: 'm' }, { value: 150, unit: 'pm' }, { value: 0.85, unit: 'µm' }, { value: 310, unit: 'nm' }],
};

export function buildWaveExercise(w: WaveSpec, difficulty: Difficulty, seedId: string, source?: string, extraFrequencyQuestion = false): Exercise {
  const lambda = convert(w.value, w.unit, 'm');
  const p = fromWavelength(lambda, K);
  const parts: ExercisePart[] = [
    numericPart({ id: 'lm', prompt: 'Longitud de onda en metros', value: lambda, unit: 'm', sig: 3, explanation: `${fmt(w.value, 3)} ${w.unit} = ${fmt(lambda, 3)} m (1 ${w.unit} = ${fmt(convert(1, w.unit, 'm'), 1)} m).` }),
    numericPart({
      id: 'nu',
      prompt: 'Frecuencia ν',
      value: p.frequency,
      unit: 'Hz',
      sig: 3,
      explanation: `ν = c/λ = ${fmt(K.c, 1)} / ${fmt(lambda, 3)} = ${fmt(p.frequency, 3)} Hz.`,
      recompute: { from: 'lm', fn: (l) => K.c / l },
      misconceptions: [{ test: (v) => relClose(v, lambda / K.c, 0.02), message: 'Has calculado λ/c. De c = λ·ν se despeja ν = c/λ.' }],
    }),
    numericPart({
      id: 'E',
      prompt: 'Energía del fotón (J)',
      value: p.energyJ,
      unit: 'J',
      sig: 3,
      explanation: `E = h·ν = ${fmt(K.h, 4)} · ${fmt(p.frequency, 3)} = ${fmt(p.energyJ, 3)} J.`,
      recompute: { from: 'nu', fn: (nu) => K.h * nu },
      misconceptions: [{ test: (v) => relClose(v, K.h * lambda, 0.02), message: 'Has multiplicado h por λ. La energía es proporcional a la frecuencia: E = h·ν = h·c/λ.' }],
    }),
  ];
  if (difficulty >= 2) {
    parts.push(
      numericPart({
        id: 'eV',
        prompt: 'Energía del fotón (eV)',
        value: p.energyEV,
        unit: 'eV',
        sig: 3,
        explanation: `E(eV) = E(J) / ${fmt(K.eV, 4)} = ${fmt(p.energyEV, 3)} eV.`,
        recompute: { from: 'E', fn: (e) => e / K.eV },
        misconceptions: [{ test: (v) => relClose(v, p.energyJ * K.eV, 0.02), message: 'Para pasar de J a eV hay que dividir entre 1,602·10⁻¹⁹, no multiplicar.', skill: 'unidades' }],
      }),
    );
  }
  parts.push(regionPart('reg', lambda));
  if (extraFrequencyQuestion) {
    parts.push(
      choicePart(
        'mas-nu',
        '¿Qué ocurre con la energía de un fotón si aumenta su frecuencia?',
        [
          { id: 'aumenta', text: 'Aumenta proporcionalmente (E = h·ν)' },
          { id: 'disminuye', text: 'Disminuye', feedback: 'E = h·ν: si ν aumenta, E aumenta. Lo que disminuye es la longitud de onda.' },
          { id: 'igual', text: 'No cambia', feedback: 'La energía de cada fotón depende solo de su frecuencia: E = h·ν.' },
        ],
        ['aumenta'],
        'E = h·ν: la energía es directamente proporcional a la frecuencia (e inversamente proporcional a λ).',
      ),
    );
  }
  return {
    id: seedId,
    generatorId: 'onda-lambda',
    nodeIds: difficulty >= 2 ? ['3.2', '3.3', '3.4', '3.9'] : ['3.2', '3.3', '3.4'],
    difficulty,
    title: 'Una radiación, todas sus magnitudes',
    statement: `Una radiación electromagnética tiene una longitud de onda de **${fmt(w.value, 4)} ${w.unit}**. Calcula sus magnitudes.`,
    data: constantsData(K),
    parts,
    stepwise: true,
    hints: [
      'Primero pasa la longitud de onda a metros: todas las constantes están en el SI.',
      'c = λ·ν → ν = c/λ. Después, E = h·ν. Para pasar a eV, divide entre 1,602·10⁻¹⁹ J/eV.',
      `λ = ${fmt(lambda, 3)} m → ν = ${fmt(K.c, 1)} / ${fmt(lambda, 3)} …`,
    ],
    solution: parts.map((x) => x.explanation),
    source,
    constants: K,
  };
}

export const waveGenerator: ExerciseGenerator = {
  id: 'onda-lambda',
  title: 'λ, ν y energía de un fotón',
  nodeIds: ['3.2', '3.3', '3.4', '3.9'],
  difficulties: [1, 2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildWaveExercise(pick(rng, WAVE_POOL[difficulty]), difficulty, exId(this.id, difficulty, seed));
  },
};

const ENERGY_ITEMS = [
  { id: 'gamma', text: 'Rayos γ de 1 pm', lambda: 1e-12 },
  { id: 'x', text: 'Rayos X de 1 nm', lambda: 1e-9 },
  { id: 'uv', text: 'Ultravioleta de 200 nm', lambda: 200e-9 },
  { id: 'verde', text: 'Luz verde de 530 nm', lambda: 530e-9 },
  { id: 'rojo', text: 'Luz roja de 680 nm', lambda: 680e-9 },
  { id: 'ir', text: 'Infrarrojo de 10 µm', lambda: 10e-6 },
  { id: 'micro', text: 'Microondas de 12 cm', lambda: 0.12 },
  { id: 'radio', text: 'Radio FM de 3 m', lambda: 3 },
];

export const energyOrderGenerator: ExerciseGenerator = {
  id: 'ordenar-energia',
  title: 'Ordenar radiaciones por energía',
  nodeIds: ['3.3', '3.4'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const items = shuffle(rng, ENERGY_ITEMS).slice(0, difficulty === 1 ? 3 : 4);
    const correctOrder = [...items].sort((a, b) => b.lambda - a.lambda).map((i) => i.id);
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['3.3', '3.4'],
      difficulty,
      title: 'Escalera de energía',
      statement: 'Ordena estos fotones de **menor a mayor energía**.',
      parts: [
        {
          id: 'orden',
          prompt: 'De menor a mayor energía',
          answer: { kind: 'order', items: items.map((i) => ({ id: i.id, text: i.text, feedback: 'E = h·c/λ: cuanto MENOR es λ, MAYOR es la energía. Revisa esa posición.' })), correctOrder },
          canonical: correctOrder.map((id) => items.find((i) => i.id === id)!.text).join(' < '),
          explanation: 'E = h·c/λ: la energía es inversamente proporcional a la longitud de onda. Mayor λ implica menor energía.',
        },
      ],
      stepwise: false,
      hints: ['¿De qué magnitud depende la energía de un fotón?', 'E = h·ν = h·c/λ.', 'Ordena las longitudes de onda de mayor a menor: ese es el orden de energía creciente.'],
      solution: ['E = h·c/λ → el orden de energía creciente es el de longitud de onda decreciente.'],
    };
  },
};

export interface RydbergOptions {
  from: number;
  to: number;
  difficulty: Difficulty;
  seedId: string;
  source?: string;
  rUnit?: 'm' | 'cm';
  /** Añade la pregunta de AMP 7e (comparar con 3 → 2). */
  compareWith32?: boolean;
  k?: ConstantSet;
}

export function buildRydbergExercise(o: RydbergOptions): Exercise {
  const k = o.k ?? K;
  const t = transition(o.from, o.to, k);
  const { n1, n2 } = t;
  const rUnit = o.rUnit ?? (o.difficulty === 3 ? 'cm' : 'm');
  const factor = 1 / (n1 * n1) - 1 / (n2 * n2);
  const parts: ExercisePart[] = [
    numericPart({
      id: 'w',
      prompt: 'Número de ondas 1/λ (m⁻¹)',
      value: t.wavenumber,
      unit: 'm⁻¹',
      sig: 4,
      explanation: `1/λ = R·(1/n₁² − 1/n₂²) = ${fmt(k.R, 5)} m⁻¹ · (1/${n1}² − 1/${n2}²) = ${fmt(t.wavenumber, 4)} m⁻¹.${rUnit === 'cm' ? ` (R = ${fmt(k.R / 100, 6)} cm⁻¹ = ${fmt(k.R, 5)} m⁻¹)` : ''}`,
      misconceptions: [
        { test: (v) => relClose(v, k.R * (1 / n1 - 1 / n2), 0.01), message: 'En la ecuación de Rydberg los niveles van al cuadrado: 1/n₁² − 1/n₂².' },
        { test: (v) => relClose(v, (k.R / 100) * factor, 0.01), message: 'Has dejado R en cm⁻¹. Para obtener 1/λ en m⁻¹, R = 109 740 cm⁻¹ = 1,0974·10⁷ m⁻¹.', skill: 'unidades' },
      ],
    }),
    numericPart({
      id: 'l',
      prompt: 'Longitud de onda λ (m)',
      value: t.wavelength,
      unit: 'm',
      sig: 4,
      explanation: `λ = 1/(1/λ) = 1/${fmt(t.wavenumber, 4)} = ${fmt(t.wavelength, 4)} m (${fmt(t.wavelength * 1e9, 4)} nm).`,
      recompute: { from: 'w', fn: (w) => 1 / w },
    }),
    numericPart({
      id: 'f',
      prompt: 'Frecuencia ν (Hz)',
      value: t.frequency,
      unit: 'Hz',
      sig: 4,
      explanation: `ν = c/λ = ${fmt(k.c, 1)} / ${fmt(t.wavelength, 4)} = ${fmt(t.frequency, 4)} Hz.`,
      recompute: { from: 'l', fn: (l) => k.c / l },
    }),
    numericPart({
      id: 'E',
      prompt: 'Energía del fotón (J)',
      value: t.energyJ,
      unit: 'J',
      sig: 4,
      explanation: `E = h·ν = ${fmt(k.h, 4)} · ${fmt(t.frequency, 4)} = ${fmt(t.energyJ, 4)} J. Es positiva: es la energía del fotón ${t.type === 'emision' ? 'emitido' : 'absorbido'}.`,
      recompute: { from: 'f', fn: (f) => k.h * f },
    }),
  ];
  if (o.difficulty >= 2) {
    parts.push(
      numericPart({
        id: 'eV',
        prompt: 'Energía del fotón (eV)',
        value: t.energyEV,
        unit: 'eV',
        sig: 4,
        explanation: `E = ${fmt(t.energyJ, 4)} J / ${fmt(k.eV, 4)} J/eV = ${fmt(t.energyEV, 4)} eV.`,
        recompute: { from: 'E', fn: (e) => e / k.eV },
      }),
    );
    parts.push(
      choicePart(
        'serie',
        'Serie espectral',
        SERIES.filter((s) => s.inSyllabus).map((s) => ({ id: s.id, text: `${s.name} (n₁ = ${s.n1})`, feedback: `La serie la fija el nivel inferior: aquí n₁ = ${n1}.` })),
        [t.series!.id],
        `El nivel inferior es n₁ = ${n1}: serie de ${t.series!.name}.`,
      ),
    );
    parts.push(regionPart('reg', t.wavelength));
  }
  if (o.compareWith32) {
    const t32 = transition(3, 2, k);
    parts.push(
      choicePart(
        'porque',
        `¿Por qué esta radiación tiene más energía que la de la transición 3 → 2?`,
        [
          { id: 'salto', text: 'Porque la diferencia de energía entre n = 3 y n = 1 es mayor que entre n = 3 y n = 2' },
          { id: 'orbita', text: 'Porque el electrón termina en una órbita más grande', feedback: 'Al contrario: n = 1 es el nivel más interno y de menor energía.' },
          { id: 'lambda', text: 'Porque su longitud de onda es mayor', feedback: `Su λ es MENOR (${fmt(t.wavelength * 1e9, 4)} nm frente a ${fmt(t32.wavelength * 1e9, 4)} nm). A menor λ, mayor energía.` },
        ],
        ['salto'],
        `Los niveles se juntan al aumentar n (Eₙ ∝ −1/n²). E₃ − E₁ = ${fmt(t.energyEV, 3)} eV es mucho mayor que E₃ − E₂ = ${fmt(t32.energyEV, 3)} eV, y la energía del fotón es esa diferencia.`,
      ),
    );
  }
  const what = t.type === 'emision' ? `pasa del nivel **n = ${o.from}** al nivel **n = ${o.to}**` : `absorbe un fotón y pasa del nivel **n = ${o.from}** al nivel **n = ${o.to}**`;
  return {
    id: o.seedId,
    generatorId: 'rydberg',
    nodeIds: o.difficulty >= 2 ? ['3.6', '3.7', '3.4', '4.3', '3.9'] : ['3.6', '3.4', '4.3'],
    difficulty: o.difficulty,
    title: t.type === 'emision' ? 'Fotón emitido por el hidrógeno' : 'Fotón absorbido por el hidrógeno',
    statement: `En un átomo de hidrógeno, el electrón ${what}. Aplica la ecuación de Rydberg.`,
    data: constantsData(k, rUnit),
    parts,
    stepwise: true,
    hints: [
      'El fotón lleva exactamente la diferencia de energía entre los dos niveles. Rydberg da su número de ondas.',
      '1/λ = R·(1/n₁² − 1/n₂²), con n₁ el nivel inferior y n₂ el superior; después ν = c/λ y E = h·ν.',
      `Aquí n₁ = ${n1} y n₂ = ${n2}: (1/${n1}² − 1/${n2}²) = ${fmt(factor, 4)}.`,
    ],
    solution: parts.map((p) => p.explanation),
    source: o.source,
    constants: k,
  };
}

export const rydbergGenerator: ExerciseGenerator = {
  id: 'rydberg',
  title: 'Transiciones del hidrógeno (Rydberg)',
  nodeIds: ['3.6', '3.7', '3.4', '4.3', '3.9'],
  difficulties: [1, 2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n1 = difficulty === 1 ? pick(rng, [1, 2]) : randInt(rng, 1, 4);
    const n2 = n1 + randInt(rng, 1, difficulty === 1 ? 2 : 3);
    const absorb = difficulty === 3 && rng() < 0.4;
    return buildRydbergExercise({ from: absorb ? n1 : n2, to: absorb ? n2 : n1, difficulty, seedId: exId(this.id, difficulty, seed) });
  },
};

const ORDINAL = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];

/**
 * Problema inverso de Rydberg: dada una línea (por su frecuencia o su longitud de onda) y la serie, hallar
 * n₂. Resolución guiada: cada transformación algebraica es un paso con su justificación.
 *   1/λ = R·(1/n₁² − 1/n₂²)  →  1/n₂² = 1/n₁² − 1/(λ·R)  →  n₂ = 1/√(1/n₁² − 1/(λ·R))
 */
export function buildInverseSeriesExercise(n1: number, n2: number, difficulty: Difficulty, seedId: string, source?: string, nuGiven?: number, opts: { lambdaNm?: number; k?: ConstantSet } = {}): Exercise {
  const k = opts.k ?? K;
  const t = transition(n2, n1, k);
  const byLambda = opts.lambdaNm !== undefined;
  const lambda = byLambda ? opts.lambdaNm! * 1e-9 : NaN;
  const nu = byLambda ? k.c / lambda : nuGiven ?? Number(t.frequency.toPrecision(3));
  const w = byLambda ? 1 / lambda : nu / k.c;
  const inv1 = 1 / (n1 * n1);
  const x = w / k.R;
  const invN2sq = inv1 - x;
  const n2sq = 1 / invN2sq;
  const s = t.series!;
  const ord = n2 - n1;
  const parts: ExercisePart[] = [];
  if (difficulty <= 2) {
    parts.push(
      numericPart({
        id: 'w',
        prompt: byLambda ? 'Paso 1 · Número de ondas 1/λ (m⁻¹)' : 'Paso 1 · Número de ondas 1/λ = ν/c (m⁻¹)',
        value: w,
        unit: 'm⁻¹',
        sig: 4,
        explanation: byLambda ? `λ = ${fmt(opts.lambdaNm!, 4)} nm = ${fmt(lambda, 4)} m → 1/λ = ${fmt(w, 4)} m⁻¹. Es el miembro izquierdo de la ecuación de Rydberg.` : `De c = λ·ν: 1/λ = ν/c = ${fmt(nu, 3)} / ${fmt(k.c, 1)} = ${fmt(w, 4)} m⁻¹. Así la frecuencia se convierte en el miembro izquierdo de Rydberg.`,
        misconceptions: byLambda ? [{ test: (v) => relClose(v, 1 / opts.lambdaNm!, 0.02), message: 'Pasa λ a metros antes de invertir: 1 nm = 10⁻⁹ m.', skill: 'unidades' }] : [{ test: (v) => relClose(v, k.c / nu, 0.02), message: 'Has calculado λ = c/ν. Aquí se pide su inverso: 1/λ = ν/c.', skill: 'formula' }],
        skills: ['formula', 'unidades', 'calculo'],
      }),
      numericPart({
        id: 'x',
        prompt: 'Paso 2 · Divide entre R: (1/λ)/R = 1/n₁² − 1/n₂²',
        value: x,
        unit: '',
        sig: 4,
        explanation: `Dividimos los dos miembros entre R para dejar solo el paréntesis: ${fmt(w, 4)} / ${fmt(k.R, 5)} = ${fmt(x, 4)}. Es un número sin unidades (m⁻¹/m⁻¹).`,
        recompute: { from: 'w', fn: (v) => v / k.R },
        skills: ['formula', 'calculo'],
      }),
      numericPart({
        id: 'inv',
        prompt: `Paso 3 · Despeja 1/n₂² = 1/${n1}² − ${fmt(x, 4)}`,
        value: invN2sq,
        unit: '',
        sig: 3,
        explanation: `Pasamos 1/n₂² al otro miembro: 1/n₂² = 1/n₁² − (1/λ)/R = ${fmt(inv1, 4)} − ${fmt(x, 4)} = ${fmt(invN2sq, 4)}. Debe salir positivo y menor que 1/n₁²; si no, la línea no pertenece a esta serie.`,
        recompute: { from: 'x', fn: (v) => inv1 - v },
        misconceptions: [{ test: (v) => relClose(v, x - inv1, 0.02), message: 'Has restado al revés: 1/n₂² = 1/n₁² − (1/λ)/R, que debe ser positivo.', skill: 'calculo' }],
        skills: ['formula', 'calculo'],
      }),
      numericPart({
        id: 'n2sq',
        prompt: 'Paso 4 · Invierte: n₂²',
        value: n2sq,
        unit: '',
        sig: 3,
        relTol: 0.03,
        explanation: `n₂² = 1/${fmt(invN2sq, 4)} = ${fmt(n2sq, 4)}.`,
        recompute: { from: 'inv', fn: (v) => 1 / v },
        skills: ['calculo'],
      }),
    );
  }
  parts.push(
    integerPart('n2', difficulty <= 2 ? 'Paso 5 · n₂ (raíz cuadrada, redondeada al entero)' : 'Nivel superior n₂ de la transición', n2, `n₂ = √${fmt(n2sq, 4)} = ${fmt(Math.sqrt(n2sq), 3)} ≈ ${n2}. Los niveles son enteros: si sale ${fmt(Math.sqrt(n2sq), 3)} es por el redondeo de los datos.`),
    choicePart(
      'ord',
      '¿Qué línea de la serie es?',
      ORDINAL.slice(0, Math.max(4, ord)).map((o, i) => ({ id: String(i + 1), text: `La ${o} línea (n₂ = ${n1 + i + 1})`, feedback: `La primera línea de ${s.name} es n₂ = ${n1 + 1}; la línea k-ésima tiene n₂ = ${n1} + k.` })),
      [String(ord)],
      `n₂ = ${n2} = ${n1} + ${ord}: es la ${ORDINAL[ord - 1]} línea de la serie de ${s.name}.`,
    ),
  );
  return {
    id: seedId,
    generatorId: 'serie-inversa',
    nodeIds: ['3.7', '3.6'],
    difficulty,
    title: difficulty <= 2 ? 'Línea misteriosa (resolución guiada)' : 'Línea misteriosa',
    statement: byLambda ? `¿Qué valor de n₂ en la ecuación de Rydberg corresponde a la línea de la serie de **${s.name}** de **${fmt(opts.lambdaNm!, 4)} nm**?` : `Indica qué línea de la serie de **${s.name}** del hidrógeno tiene una frecuencia de **${fmt(nu, 3)} Hz**.`,
    data: constantsData(k, byLambda ? 'm' : 'cm'),
    parts,
    stepwise: true,
    hints: [
      `En la serie de ${s.name}, el nivel inferior es siempre n₁ = ${n1}. La incógnita es n₂.`,
      byLambda ? 'Calcula 1/λ, divide entre R y despeja 1/n₂² = 1/n₁² − 1/(λ·R).' : 'Convierte la frecuencia en número de ondas (1/λ = ν/c), divide entre R y despeja 1/n₂².',
      `1/n₂² = 1/${n1 * n1} − ${fmt(x, 4)} → invierte y haz la raíz cuadrada.`,
    ],
    solution: parts.map((p) => p.explanation),
    source,
    constants: k,
  };
}

export const inverseSeriesGenerator: ExerciseGenerator = {
  id: 'serie-inversa',
  title: 'Identificar una línea por su frecuencia',
  nodeIds: ['3.7', '3.6'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n1 = difficulty === 2 ? pick(rng, [1, 2]) : pick(rng, [2, 3, 4]);
    const n2 = n1 + randInt(rng, 1, 3);
    return buildInverseSeriesExercise(n1, n2, difficulty, exId(this.id, difficulty, seed));
  },
};

export function buildCascadeExercise(n: number, difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const lines = cascadeLines(n);
  const visible = lines.filter((l) => l.region.id === 'visible').length;
  const parts: ExercisePart[] = [
    integerPart('total', '¿Cuántas líneas distintas pueden aparecer?', lines.length, `Cada pareja de niveles entre 1 y ${n} produce una línea: n(n−1)/2 = ${n}·${n - 1}/2 = ${lines.length}.`),
  ];
  if (difficulty >= 2) {
    parts.push(integerPart('vis', '¿Cuántas de ellas están en el visible?', visible, `Solo las de Balmer (llegan a n = 2) con λ entre 380 y 780 nm: ${lines.filter((l) => l.region.id === 'visible').map((l) => `${l.from}→${l.to} (${fmt(l.wavelength * 1e9, 3)} nm)`).join(', ') || 'ninguna'}.`));
  }
  return {
    id: seedId,
    generatorId: 'cascada',
    nodeIds: ['3.8', '4.3'],
    difficulty,
    title: 'Cascada de fotones',
    statement: `Excitamos todos los átomos de una muestra de hidrógeno hasta el nivel **n = ${n}**. Al volver a estados de menor energía, los electrones pueden bajar directamente o en varios saltos.`,
    parts,
    stepwise: true,
    hints: ['Cada línea corresponde a un salto entre dos niveles distintos.', `Cuenta las parejas de niveles posibles entre 1 y ${n}.`, `Desde ${n} hay ${n - 1} saltos posibles; desde ${n - 1}, ${n - 2}…`],
    solution: parts.map((p) => p.explanation),
    source,
  };
}

export const cascadeGenerator: ExerciseGenerator = {
  id: 'cascada',
  title: 'Número de líneas de emisión',
  nodeIds: ['3.8'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildCascadeExercise(randInt(rng, 3, 6), difficulty, exId(this.id, difficulty, seed));
  },
};

export const levelEnergyGenerator: ExerciseGenerator = {
  id: 'nivel-energia',
  title: 'Niveles de energía del hidrógeno',
  nodeIds: ['4.2', '4.3'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n = randInt(rng, 1, 5);
    const E = -13.6 / (n * n);
    const parts: ExercisePart[] = [
      numericPart({ id: 'En', prompt: `Energía del nivel n = ${n} (eV)`, value: E, unit: 'eV', sig: 3, explanation: `Eₙ = −13,6 eV / n² = −13,6 / ${n * n} = ${fmt(E, 3)} eV. Es negativa: el electrón está ligado al núcleo.` }),
    ];
    if (difficulty === 2) {
      parts.push(
        numericPart({
          id: 'ion',
          prompt: `Energía mínima para arrancar el electrón desde n = ${n} (eV)`,
          value: -E,
          unit: 'eV',
          sig: 3,
          explanation: `Hay que llevarlo a n → ∞ (E = 0): E = 0 − (${fmt(E, 3)}) = ${fmt(-E, 3)} eV.`,
          recompute: { from: 'En', fn: (v) => -v },
        }),
      );
    }
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['4.2', '4.3'],
      difficulty,
      title: 'La escalera de Bohr',
      statement: `En el modelo de Bohr, la energía del electrón del hidrógeno en el nivel n es **Eₙ = −13,6 eV / n²**. Considera el nivel **n = ${n}**.`,
      parts,
      stepwise: true,
      hints: ['El signo negativo significa que el electrón está ligado: hay que darle energía para liberarlo.', 'Sustituye n en Eₙ = −13,6/n².', 'Liberar el electrón es llevarlo a E = 0.'],
      solution: parts.map((p) => p.explanation),
    };
  },
};
