/**
 * Problemas de nivel examen: enunciados compuestos con varios apartados encadenados, como los de
 * las pruebas de 1.º de Bachillerato. Cada apartado se corrige por separado (con arrastre de error)
 * y todos los datos y resultados se calculan, no se copian.
 */
import { EXERCISE_DATA } from '../../science/constants';
import { elementByZ, type ElementRecord } from '../../science/elements';
import { fromWavelength, EM_REGIONS, colorName } from '../../science/photon';
import { cascadeLineCount, SERIES, transition } from '../../science/hydrogen';
import { formatConfiguration, groundState, lastFilled, unpairedElectrons, valenceElectrons, valenceShell } from '../../science/configuration';
import { lLetter, validateQuantumSet } from '../../science/quantum';
import { commonIon, compare, PROPERTIES, type PropertyId } from '../../science/trends';
import { NATURAL_ISOTOPES } from '../../science/data/naturalIsotopes';
import { averageAtomicMass, twoIsotopeAbundance } from '../../science/massSpec';
import { relClose, toSuperscript } from '../../science/numbers';
import type { ChoiceOption, Difficulty, Exercise, ExerciseGenerator, ExercisePart } from '../types';
import { choicePart, exId, fmt, integerPart, numericPart, pick, randInt, rngFor, shuffle } from './util';

const K = EXERCISE_DATA;
const O = (id: string, text: string, feedback?: string): ChoiceOption => ({ id, text, feedback });
const REGION_OPTIONS = EM_REGIONS.map((r) => O(r.id, r.name, 'Compara λ con los límites: visible de 380 a 780 nm; por debajo, UV, X y γ; por encima, IR, microondas y radio.'));

function constants(withR: 'm' | 'cm' | null, extra: { label: string; value: string }[] = []) {
  const d = [
    { label: 'h', value: '6,626·10⁻³⁴ J·s' },
    { label: 'c', value: '3·10⁸ m/s' },
  ];
  if (withR === 'm') d.push({ label: 'R', value: '1,0974·10⁷ m⁻¹' });
  if (withR === 'cm') d.push({ label: 'R', value: '109 740 cm⁻¹' });
  d.push({ label: '1 eV', value: '1,602·10⁻¹⁹ J' });
  return [...d, ...extra];
}

// ── 1. Espectro del hidrógeno completo ────────────────────────────────────

export function buildSpectrumExam(n1: number, n2: number, difficulty: Difficulty, seedId: string): Exercise {
  const t = transition(n2, n1, K);
  const rUnit = difficulty === 3 ? 'cm' : 'm';
  const nm = t.wavelength * 1e9;
  const factor = 1 / (n1 * n1) - 1 / (n2 * n2);
  const series = SERIES.filter((s) => s.inSyllabus);
  const parts: ExercisePart[] = [
    integerPart('lineas', `Si una muestra de átomos se excita hasta n = ${n2}, ¿cuántas líneas distintas pueden aparecer al desexcitarse?`, cascadeLineCount(n2), `Todas las parejas de niveles entre 1 y ${n2}: n(n − 1)/2 = ${n2}·${n2 - 1}/2 = ${cascadeLineCount(n2)}.`),
    choicePart(
      'tipo',
      `En el salto ${n2} → ${n1}, ¿el átomo emite o absorbe energía?`,
      [O('emite', 'Emite un fotón'), O('absorbe', 'Absorbe un fotón', 'El electrón baja a un nivel de menor energía: la diferencia se libera como un fotón.')],
      ['emite'],
      `El electrón pasa a un nivel inferior (${n1} < ${n2}), de menor energía: el átomo emite un fotón con E = E${toSubscriptDigit(n2)} − E${toSubscriptDigit(n1)}.`,
    ),
    numericPart({
      id: 'w',
      prompt: 'Número de ondas 1/λ (m⁻¹)',
      value: t.wavenumber,
      unit: 'm⁻¹',
      sig: 4,
      explanation: `1/λ = R·(1/n₁² − 1/n₂²) = 1,0974·10⁷·(1/${n1 * n1} − 1/${n2 * n2}) = 1,0974·10⁷·${fmt(factor, 4)} = ${fmt(t.wavenumber, 4)} m⁻¹${rUnit === 'cm' ? ' (R = 109 740 cm⁻¹ = 1,0974·10⁷ m⁻¹)' : ''}.`,
      misconceptions: [
        { test: (v) => relClose(v, t.wavenumber / 100, 0.02), message: 'Has usado R en cm⁻¹ sin convertir: 109 740 cm⁻¹ = 1,0974·10⁷ m⁻¹ (multiplica por 100).' },
        { test: (v) => relClose(v, K.R * (1 / n1 - 1 / n2), 0.02), message: 'Los niveles van al cuadrado: 1/n₁² − 1/n₂².' },
      ],
    }),
    numericPart({
      id: 'lnm',
      prompt: 'Longitud de onda (nm)',
      value: nm,
      unit: 'nm',
      sig: 4,
      explanation: `λ = 1/(${fmt(t.wavenumber, 4)} m⁻¹) = ${fmt(t.wavelength, 4)} m = ${fmt(nm, 4)} nm.`,
      recompute: { from: 'w', fn: (w) => 1e9 / w },
      misconceptions: [{ test: (v) => relClose(v, t.wavenumber * 1e-9, 0.02) || relClose(v, t.wavenumber, 0.02), message: 'Has dado el número de ondas: hay que invertirlo para obtener λ.' }],
    }),
    numericPart({
      id: 'nu',
      prompt: 'Frecuencia (Hz)',
      value: t.frequency,
      unit: 'Hz',
      sig: 3,
      explanation: `ν = c/λ = 3·10⁸ / ${fmt(t.wavelength, 4)} = ${fmt(t.frequency, 3)} Hz.`,
      recompute: { from: 'lnm', fn: (l) => K.c / (l * 1e-9) },
      misconceptions: [{ test: (v) => relClose(v, K.c / nm, 0.02), message: 'Pasa λ a metros antes de dividir: 1 nm = 10⁻⁹ m.' }],
    }),
    numericPart({
      id: 'E',
      prompt: 'Energía del fotón (J)',
      value: t.energyJ,
      unit: 'J',
      sig: 3,
      explanation: `E = h·ν = 6,626·10⁻³⁴ · ${fmt(t.frequency, 3)} = ${fmt(t.energyJ, 3)} J.`,
      recompute: { from: 'nu', fn: (nu) => K.h * nu },
    }),
    numericPart({
      id: 'eV',
      prompt: 'Energía del fotón (eV)',
      value: t.energyEV,
      unit: 'eV',
      sig: 3,
      explanation: `E = ${fmt(t.energyJ, 3)} J / 1,602·10⁻¹⁹ J/eV = ${fmt(t.energyEV, 3)} eV.`,
      recompute: { from: 'E', fn: (e) => e / K.eV },
      misconceptions: [{ test: (v) => relClose(v, t.energyJ * K.eV, 0.05), message: 'Para pasar de J a eV se divide entre 1,602·10⁻¹⁹.' }],
    }),
    choicePart(
      'serie',
      'Serie espectral',
      series.map((s) => O(s.id, `${s.name} (n₁ = ${s.n1})`, 'La serie la fija el nivel final (inferior) del salto.')),
      [t.series!.id],
      `El salto termina en n = ${n1}: serie de ${t.series!.name}.`,
    ),
    choicePart('reg', 'Región del espectro', REGION_OPTIONS, [t.region.id], `λ = ${fmt(nm, 4)} nm → ${t.region.name.toLowerCase()}${colorName(nm) ? ` (${colorName(nm)})` : ''}.`),
  ];
  return {
    id: seedId,
    generatorId: 'examen-espectro',
    nodeIds: ['3.6', '3.7', '3.8', '3.4', '4.1'],
    difficulty,
    title: `Problema de examen: la línea ${n2} → ${n1} del hidrógeno`,
    statement: `Los átomos de una muestra de hidrógeno se excitan hasta el nivel **n = ${n2}**. Al desexcitarse, uno de sus electrones salta directamente al nivel **n = ${n1}**.\nResponde a todos los apartados con las unidades adecuadas.`,
    data: constants(rUnit),
    parts,
    stepwise: true,
    hints: [
      'Separa el problema: primero las líneas posibles, después el salto concreto con Rydberg y, al final, ν, E, serie y región.',
      '1/λ = R·(1/n₁² − 1/n₂²), con n₁ el nivel inferior. Después λ, ν = c/λ y E = h·ν.',
      `1/λ = 1,0974·10⁷·(1/${n1 * n1} − 1/${n2 * n2}) m⁻¹ → invierte para obtener λ.`,
    ],
    solution: parts.map((p) => p.explanation),
    constants: K,
  };
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
function toSubscriptDigit(n: number) {
  return String(n)
    .split('')
    .map((d) => SUB[Number(d)])
    .join('');
}

export const spectrumExamGenerator: ExerciseGenerator = {
  id: 'examen-espectro',
  title: 'Problema completo de espectro del hidrógeno',
  nodeIds: ['3.6', '3.7', '3.8', '3.4', '4.1'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n1 = difficulty === 2 ? pick(rng, [1, 2, 2]) : pick(rng, [1, 2, 3]);
    const n2 = n1 + randInt(rng, 1, difficulty === 2 ? 3 : 4);
    return buildSpectrumExam(n1, n2, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 2. Ondas: de cualquier magnitud a todas las demás ─────────────────────

type WaveGiven = { kind: 'nu'; value: number; unit: 'MHz' | 'GHz' | 'Hz'; label: string } | { kind: 'T'; fs: number; label: string } | { kind: 'E'; eV: number; label: string };

const WAVE_CASES: WaveGiven[] = [
  { kind: 'nu', value: 98.5, unit: 'MHz', label: 'Una emisora de radio FM emite a' },
  { kind: 'nu', value: 2.45, unit: 'GHz', label: 'Un horno de microondas funciona a' },
  { kind: 'nu', value: 5.0, unit: 'GHz', label: 'Una red wifi emite a' },
  { kind: 'nu', value: 3.0e18, unit: 'Hz', label: 'Un equipo de rayos X produce radiación de' },
  { kind: 'nu', value: 7.5e14, unit: 'Hz', label: 'Una lámpara emite radiación de' },
  { kind: 'T', fs: 2.0, label: 'Una radiación tiene un periodo de' },
  { kind: 'T', fs: 1.5, label: 'Una radiación tiene un periodo de' },
  { kind: 'T', fs: 2.2, label: 'Una radiación tiene un periodo de' },
  { kind: 'E', eV: 2.5, label: 'Cada fotón de una luz tiene una energía de' },
  { kind: 'E', eV: 1.8, label: 'Cada fotón de una luz tiene una energía de' },
  { kind: 'E', eV: 4.9, label: 'Cada fotón de una radiación tiene una energía de' },
];

const UNIT_FACTOR = { Hz: 1, MHz: 1e6, GHz: 1e9 } as const;

export function buildWaveExam(g: WaveGiven, difficulty: Difficulty, seedId: string): Exercise {
  let nu: number;
  let given: string;
  const parts: ExercisePart[] = [];
  if (g.kind === 'nu') {
    nu = g.value * UNIT_FACTOR[g.unit];
    given = `${fmt(g.value, 3)} ${g.unit}`;
    if (g.unit !== 'Hz') parts.push(numericPart({ id: 'nu', prompt: 'Frecuencia en Hz', value: nu, unit: 'Hz', sig: 3, explanation: `1 ${g.unit} = ${fmt(UNIT_FACTOR[g.unit], 1)} Hz → ν = ${fmt(nu, 3)} Hz.` }));
    parts.push(numericPart({ id: 'T', prompt: 'Periodo T (s)', value: 1 / nu, unit: 's', sig: 3, explanation: `T = 1/ν = 1/${fmt(nu, 3)} = ${fmt(1 / nu, 3)} s.`, misconceptions: [{ test: (v) => relClose(v, nu, 0.02), message: 'El periodo es el inverso de la frecuencia: T = 1/ν.' }] }));
  } else if (g.kind === 'T') {
    const T = g.fs * 1e-15;
    nu = 1 / T;
    given = `${fmt(g.fs, 2)} fs (1 fs = 10⁻¹⁵ s)`;
    parts.push(numericPart({ id: 'nu', prompt: 'Frecuencia ν (Hz)', value: nu, unit: 'Hz', sig: 3, explanation: `ν = 1/T = 1/(${fmt(T, 2)} s) = ${fmt(nu, 3)} Hz.`, misconceptions: [{ test: (v) => relClose(v, T, 0.02), message: 'La frecuencia es el inverso del periodo: ν = 1/T.' }, { test: (v) => relClose(v, 1 / g.fs, 0.02), message: 'Pasa el periodo a segundos: 1 fs = 10⁻¹⁵ s.' }] }));
  } else {
    const EJ = g.eV * K.eV;
    nu = EJ / K.h;
    given = `${fmt(g.eV, 2)} eV`;
    parts.push(numericPart({ id: 'EJ', prompt: 'Energía del fotón en julios', value: EJ, unit: 'J', sig: 3, explanation: `E = ${fmt(g.eV, 2)} eV · 1,602·10⁻¹⁹ J/eV = ${fmt(EJ, 3)} J.`, misconceptions: [{ test: (v) => relClose(v, g.eV / K.eV, 0.02), message: 'De eV a J se multiplica por 1,602·10⁻¹⁹.' }] }));
    parts.push(numericPart({ id: 'nu', prompt: 'Frecuencia ν (Hz)', value: nu, unit: 'Hz', sig: 3, explanation: `E = h·ν → ν = E/h = ${fmt(EJ, 3)} / 6,626·10⁻³⁴ = ${fmt(nu, 3)} Hz.`, recompute: { from: 'EJ', fn: (e) => e / K.h } }));
  }
  const lambda = K.c / nu;
  const ph = fromWavelength(lambda, K);
  const nm = lambda * 1e9;
  const visible = ph.region.id === 'visible';
  const useNm = nm < 1e4;
  parts.push(
    numericPart({
      id: 'l',
      prompt: useNm ? 'Longitud de onda (nm)' : 'Longitud de onda (m)',
      value: useNm ? nm : lambda,
      unit: useNm ? 'nm' : 'm',
      sig: 3,
      explanation: `λ = c/ν = 3·10⁸ / ${fmt(nu, 3)} = ${fmt(lambda, 3)} m${useNm ? ` = ${fmt(nm, 3)} nm` : ''}.`,
      misconceptions: [{ test: (v) => relClose(v, (nu / K.c) * (useNm ? 1e-9 : 1), 0.02), message: 'De c = λ·ν se despeja λ = c/ν (no ν/c).' }],
    }),
  );
  if (g.kind !== 'E') {
    parts.push(numericPart({ id: 'E', prompt: 'Energía de un fotón (J)', value: ph.energyJ, unit: 'J', sig: 3, explanation: `E = h·ν = 6,626·10⁻³⁴ · ${fmt(nu, 3)} = ${fmt(ph.energyJ, 3)} J.`, misconceptions: [{ test: (v) => relClose(v, K.h * lambda, 0.02), message: 'E = h·ν: se multiplica h por la frecuencia, no por λ.' }] }));
  }
  if (difficulty === 3) {
    const NA = 6.022e23;
    parts.push(
      numericPart({
        id: 'mol',
        prompt: 'Energía de un mol de estos fotones (kJ/mol)',
        value: (ph.energyJ * NA) / 1000,
        unit: 'kJ/mol',
        sig: 3,
        explanation: `E(mol) = E·N_A = ${fmt(ph.energyJ, 3)} J · 6,022·10²³ mol⁻¹ = ${fmt(ph.energyJ * NA, 3)} J/mol = ${fmt((ph.energyJ * NA) / 1000, 3)} kJ/mol.`,
        misconceptions: [{ test: (v) => relClose(v, ph.energyJ * NA, 0.02), message: 'El resultado está en J/mol: divide entre 1000 para pasarlo a kJ/mol.' }],
      }),
    );
  }
  parts.push(choicePart('reg', 'Región del espectro electromagnético', REGION_OPTIONS, [ph.region.id], `λ = ${fmt(lambda, 3)} m → ${ph.region.name.toLowerCase()}${visible ? ` (${colorName(nm)})` : ''}.`));
  const nodeIds = ['3.2', '3.3', '3.4'];
  if (g.kind === 'E' || parts.some((p) => p.id === 'EJ')) nodeIds.push('3.9');
  return {
    id: seedId,
    generatorId: 'examen-ondas',
    nodeIds,
    difficulty,
    title: 'Problema de examen: caracteriza una radiación',
    statement: `${g.label} **${given}**. Calcula sus magnitudes características y di a qué región del espectro pertenece.`,
    data: constants(null, difficulty === 3 ? [{ label: 'N_A', value: '6,022·10²³ mol⁻¹' }] : []),
    parts,
    stepwise: true,
    hints: [
      'Todas las magnitudes de una onda electromagnética están ligadas: T = 1/ν, c = λ·ν y E = h·ν.',
      'Pasa primero el dato al SI (Hz, s o J) y calcula ν: a partir de ν se obtiene todo lo demás.',
      g.kind === 'E' ? 'E (J) = E (eV)·1,602·10⁻¹⁹ → ν = E/h → λ = c/ν.' : g.kind === 'T' ? 'ν = 1/T con T en segundos → λ = c/ν → E = h·ν.' : 'T = 1/ν → λ = c/ν → E = h·ν.',
    ],
    solution: parts.map((p) => p.explanation),
    constants: K,
  };
}

export const waveExamGenerator: ExerciseGenerator = {
  id: 'examen-ondas',
  title: 'Problema completo de ondas y fotones',
  nodeIds: ['3.2', '3.3', '3.4', '3.9'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildWaveExam(pick(rng, WAVE_CASES), difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 3. Tres elementos: configuración, posición, iones y propiedades ────────

/** Ternas en las que los datos reales siguen la tendencia (comprobado en las pruebas). */
export const ELEMENT_TRIPLES: [number, number, number][] = [
  [11, 15, 17],
  [12, 14, 16],
  [11, 13, 17],
  [3, 6, 9],
  [3, 7, 9],
  [19, 20, 35],
  [3, 11, 19],
  [9, 17, 35],
  [8, 16, 34],
  [4, 12, 20],
];

const PROP_WORD: Record<'radio' | 'ei1' | 'en', string> = { radio: 'radio atómico', ei1: 'primera energía de ionización', en: 'electronegatividad' };

function ionText(q: number | null) {
  if (q === null) return 'ninguno';
  return q > 0 ? `+${q}` : `-${-q}`;
}

function ionSymbolText(symbol: string, q: number) {
  return `${symbol}${toSuperscript((Math.abs(q) === 1 ? '' : String(Math.abs(q))) + (q > 0 ? '+' : '-'))}`;
}

export function buildElementsExam(triple: [number, number, number], prop: 'radio' | 'ei1' | 'en', difficulty: Difficulty, seedId: string, letters = ['A', 'B', 'C']): Exercise {
  const els = triple.map((z) => elementByZ(z)!) as [ElementRecord, ElementRecord, ElementRecord];
  const [A, B, C] = els;
  const confA = groundState(A.z);
  const confB = groundState(B.z);
  const ion = commonIon(C);
  const P = PROPERTIES[prop as PropertyId];
  const order = [...els].sort((x, y) => P.get(x)! - P.get(y)!);
  const ionOpts = [1, 2, 3, -1, -2, -3, null].map((q) => O(ionText(q), q === null ? 'No forma un ion sencillo' : ionSymbolText(C.symbol, q), 'Piensa cuántos electrones le faltan o le sobran para alcanzar la configuración del gas noble más cercano.'));
  const label = (e: ElementRecord) => letters[els.indexOf(e)]!;
  const parts: ExercisePart[] = [
    { id: 'confA', prompt: `Configuración electrónica de ${letters[0]} (Z = ${A.z})`, answer: { kind: 'config', electrons: A.z, z: A.z }, canonical: formatConfiguration(confA), explanation: `Con el diagrama de Möller: ${formatConfiguration(confA)} (abreviada: ${formatConfiguration(confA, { abbreviate: true })}).`, placeholder: 'p. ej. 1s2 2s2 2p6 o [Ne] 3s2' },
    integerPart('perA', `Periodo de ${letters[0]}`, A.period, `La capa de valencia es n = ${valenceShell(confA)}: periodo ${A.period}.`),
    integerPart('grA', `Grupo de ${letters[0]}`, A.group!, `Tiene ${valenceElectrons(confA)} electrones de valencia (${formatConfiguration(confA.filter((s) => s.n === valenceShell(confA)), { order: 'capas' })}): grupo ${A.group}.`),
    { id: 'elB', prompt: `Identifica el elemento ${letters[1]} (Z = ${B.z})`, answer: { kind: 'element', z: B.z }, canonical: B.symbol, explanation: `Z = ${B.z}: ${B.name} (${B.symbol}), periodo ${B.period}, grupo ${B.group}.`, placeholder: 'símbolo o nombre' },
    integerPart('desB', `Electrones desapareados de ${letters[1]} en su estado fundamental`, unpairedElectrons(confB), `${formatConfiguration(confB, { abbreviate: true })}: por la regla de Hund, ${unpairedElectrons(confB)} electrón(es) desapareado(s).`),
    choicePart('ionC', `Ion más estable de ${letters[2]} (Z = ${C.z})`, ionOpts, [ionText(ion.charge)], ion.reason),
    {
      id: 'orden',
      prompt: `Ordena ${letters.join(', ')} de menor a mayor ${PROP_WORD[prop]}`,
      answer: { kind: 'order', items: els.map((e) => O(label(e), `${label(e)} (Z = ${e.z})`, 'Sitúa los tres elementos y aplica la tendencia: misma capa → manda Z_ef; distinto periodo → manda el número de capas.')), correctOrder: order.map(label) },
      canonical: order.map(label).join(' < '),
      explanation: `${compare(prop, order[0]!, order[2]!).reasoning.join(' ')} Datos: ${order.map((e) => `${e.symbol} ${fmt(P.get(e)!, P.digits)}${P.unit ? ' ' + P.unit : ''}`).join(' < ')}.`,
    },
  ];
  if (difficulty === 3) {
    parts.splice(5, 0, {
      id: 'qB',
      prompt: `Un conjunto de números cuánticos (n, l, m_l, m_s) para el electrón diferenciador de ${letters[1]}`,
      answer: { kind: 'quantum', n: lastFilled(confB)!.n, l: lastFilled(confB)!.l },
      canonical: `(${lastFilled(confB)!.n}, ${lastFilled(confB)!.l}, 0, +1/2)`,
      explanation: `El último electrón entra en el ${lastFilled(confB)!.n}${lLetter(lastFilled(confB)!.l)}: n = ${lastFilled(confB)!.n}, l = ${lastFilled(confB)!.l}, m_l entre −${lastFilled(confB)!.l} y +${lastFilled(confB)!.l} y m_s = ±½.`,
      placeholder: '(n, l, m_l, m_s)',
    });
  }
  return {
    id: seedId,
    generatorId: 'examen-elementos',
    nodeIds: ['6.3', '6.9', '7.1', '7.5', prop === 'radio' ? '7.7' : prop === 'ei1' ? '7.9' : '7.11', ...(difficulty === 3 ? ['5.4'] : [])],
    difficulty,
    title: 'Problema de examen: tres elementos',
    statement: `Los elementos ${letters[0]}, ${letters[1]} y ${letters[2]} tienen números atómicos **${A.z}, ${B.z} y ${C.z}**, respectivamente. Puedes usar la tabla periódica.`,
    parts,
    stepwise: true,
    hints: [
      'Empieza por las configuraciones: de ellas salen el periodo (n más alto), el grupo (electrones de valencia) y el ion estable.',
      'Grupo de un elemento representativo: ns¹ → 1; ns² → 2; ns² npˣ → 12 + x (por ejemplo, ns² np⁵ → grupo 17).',
      `Para ordenar por ${PROP_WORD[prop]}: compara primero el número de capas (periodo) y, a igual periodo, la carga nuclear efectiva.`,
    ],
    solution: parts.map((p) => p.explanation),
  };
}

export const elementsExamGenerator: ExerciseGenerator = {
  id: 'examen-elementos',
  title: 'Problema completo de configuración y propiedades',
  nodeIds: ['6.3', '6.9', '7.1', '7.5', '7.7', '7.9', '7.11'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const triple = shuffle(rng, pick(rng, ELEMENT_TRIPLES)) as [number, number, number];
    const prop = pick(rng, ['radio', 'ei1', 'en'] as const);
    return buildElementsExam(triple, prop, difficulty, exId(this.id, difficulty, seed));
  },
};

// ── 4. Números cuánticos y configuración de un elemento ───────────────────

const QUANTUM_Z = [7, 8, 13, 15, 16, 17, 19, 20, 21, 22, 25, 26, 30, 31, 33, 34, 35];

export function buildQuantumExam(z: number, difficulty: Difficulty, seedId: string, rngVal: () => number): Exercise {
  const el = elementByZ(z)!;
  const conf = groundState(z);
  const last = lastFilled(conf)!;
  const pE = conf.filter((s) => s.l === 1).reduce((a, s) => a + s.e, 0);
  const n2E = conf.filter((s) => s.n === 2).reduce((a, s) => a + s.e, 0);
  const candidates = [
    { q: [3, 2, -2, 0.5], text: '(3, 2, −2, +½)' },
    { q: [2, 2, 0, 0.5], text: '(2, 2, 0, +½)' },
    { q: [4, 0, 1, -0.5], text: '(4, 0, 1, −½)' },
    { q: [3, 1, 0, 1], text: '(3, 1, 0, 1)' },
    { q: [1, 0, 0, -0.5], text: '(1, 0, 0, −½)' },
    { q: [4, 3, -3, 0.5], text: '(4, 3, −3, +½)' },
    { q: [2, 1, -2, -0.5], text: '(2, 1, −2, −½)' },
    { q: [0, 0, 0, 0.5], text: '(0, 0, 0, +½)' },
  ];
  const isValid = (c: (typeof candidates)[number]) => validateQuantumSet({ n: c.q[0]!, l: c.q[1]!, ml: c.q[2]!, ms: c.q[3]! }).valid;
  const nValid = 1 + Math.floor(rngVal() * 2);
  const chosen = shuffle(rngVal, [...shuffle(rngVal, candidates.filter(isValid)).slice(0, nValid), ...shuffle(rngVal, candidates.filter((c) => !isValid(c))).slice(0, 4 - nValid)]);
  const valid = chosen.filter((c) => validateQuantumSet({ n: c.q[0]!, l: c.q[1]!, ml: c.q[2]!, ms: c.q[3]! }).valid);
  const parts: ExercisePart[] = [
    { id: 'conf', prompt: `Configuración electrónica del ${el.name.toLowerCase()} (Z = ${z})`, answer: { kind: 'config', electrons: z, z }, canonical: formatConfiguration(conf), explanation: `Möller: ${formatConfiguration(conf)} (abreviada: ${formatConfiguration(conf, { abbreviate: true })}).`, placeholder: 'p. ej. [Ar] 4s2 3d6' },
    {
      id: 'q',
      prompt: 'Números cuánticos (n, l, m_l, m_s) posibles para el electrón diferenciador',
      answer: { kind: 'quantum', n: last.n, l: last.l },
      canonical: `(${last.n}, ${last.l}, 0, +1/2)`,
      explanation: `El último electrón que entra según Möller ocupa el ${last.n}${lLetter(last.l)}: n = ${last.n}, l = ${last.l} (${lLetter(last.l)}), m_l ∈ [−${last.l}, +${last.l}], m_s = ±½.`,
      placeholder: '(n, l, m_l, m_s)',
    },
    integerPart('p', 'Número de electrones con l = 1', pE, `l = 1 corresponde a los orbitales p: ${conf.filter((s) => s.l === 1).map((s) => `${s.n}p${toSuperscript(s.e)}`).join(' + ') || 'ninguno'} = ${pE}.`),
    integerPart('n2', 'Número de electrones con n = 2', n2E, `Nivel 2: ${conf.filter((s) => s.n === 2).map((s) => `${s.n}${lLetter(s.l)}${toSuperscript(s.e)}`).join(' + ')} = ${n2E} (como máximo 2n² = 8).`),
    integerPart('desap', 'Electrones desapareados', unpairedElectrons(conf), `Regla de Hund: ${unpairedElectrons(conf)} desapareado(s).`),
    choicePart(
      'validos',
      'Marca las combinaciones (n, l, m_l, m_s) que son posibles para un electrón cualquiera',
      chosen.map((c) => {
        const v = validateQuantumSet({ n: c.q[0]!, l: c.q[1]!, ml: c.q[2]!, ms: c.q[3]! });
        return O(c.text, c.text, v.valid ? 'Esta combinación sí es posible: revisa n ≥ 1, 0 ≤ l < n, |m_l| ≤ l y m_s = ±½.' : v.errors[0]!.message);
      }),
      valid.map((c) => c.text),
      chosen.map((c) => {
        const v = validateQuantumSet({ n: c.q[0]!, l: c.q[1]!, ml: c.q[2]!, ms: c.q[3]! });
        return `${c.text}: ${v.valid ? `posible (${v.orbital})` : v.errors.map((e) => e.message).join(' ')}`;
      }).join(' · '),
      true,
    ),
  ];
  return {
    id: seedId,
    generatorId: 'examen-cuantico',
    nodeIds: ['5.4', '5.5', '6.3', '6.4'],
    difficulty,
    title: `Problema de examen: el ${el.name.toLowerCase()} por dentro`,
    statement: `Para el **${el.name.toLowerCase()}** (Z = ${z}) en su estado fundamental, responde a los siguientes apartados.`,
    parts,
    stepwise: true,
    hints: ['Todo sale de la configuración: escríbela primero con el diagrama de Möller.', 'Electrón diferenciador = el último que entra. l = 0, 1, 2, 3 ↔ s, p, d, f.', 'Comprueba cada combinación en este orden: n ≥ 1 → l ≤ n − 1 → |m_l| ≤ l → m_s = ±½.'],
    solution: parts.map((p) => p.explanation),
  };
}

export const quantumExamGenerator: ExerciseGenerator = {
  id: 'examen-cuantico',
  title: 'Problema completo de números cuánticos',
  nodeIds: ['5.4', '5.5', '6.3', '6.4'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const z = pick(rng, difficulty === 2 ? QUANTUM_Z.filter((x) => x <= 20) : QUANTUM_Z.filter((x) => x > 15));
    return buildQuantumExam(z, difficulty, exId(this.id, difficulty, seed), rng);
  },
};

// ── 5. Isótopos, iones y masa atómica ─────────────────────────────────────

const ION_CHARGE: Record<number, number> = { 3: 1, 5: 3, 12: 2, 17: -1, 19: 1, 29: 2, 31: 3, 35: -1, 37: 1, 47: 1 };

export function buildMassIonExam(z: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const iso = NATURAL_ISOTOPES[z]!;
  const [l, h] = [iso[0]!, iso[iso.length - 1]!];
  const q = ION_CHARGE[z] ?? 0;
  const res = averageAtomicMass(iso.map((i) => ({ mass: i.mass, abundance: i.abundance })));
  const parts: ExercisePart[] = [];
  let statement: string;
  if (difficulty === 3 && iso.length === 2) {
    const M = Number(res.value.toFixed(3));
    const x = twoIsotopeAbundance(l.mass, h.mass, M);
    statement = `Un elemento X de número atómico **${z}** tiene dos isótopos naturales, de masas **${fmt(l.mass, 7)} u** (A = ${l.a}) y **${fmt(h.mass, 7)} u** (A = ${h.a}). Su masa atómica es **${fmt(M, 5)} u**.`;
    parts.push(
      { id: 'el', prompt: 'Identifica el elemento X', answer: { kind: 'element', z }, canonical: el.symbol, explanation: `Z = ${z} → ${el.name} (${el.symbol}). Lo identifica el número de protones, no la masa.`, placeholder: 'símbolo o nombre' },
      numericPart({ id: 'x', prompt: `Abundancia del isótopo de A = ${l.a} (%)`, value: x, unit: '%', sig: 3, explanation: `M = [m₁·x + m₂·(100 − x)]/100 → x = 100·(M − m₂)/(m₁ − m₂) = 100·(${fmt(M, 5)} − ${fmt(h.mass, 7)})/(${fmt(l.mass, 7)} − ${fmt(h.mass, 7)}) = ${fmt(x, 3)} %.`, placeholder: 'en %' }),
      numericPart({ id: 'y', prompt: `Abundancia del isótopo de A = ${h.a} (%)`, value: 100 - x, unit: '%', sig: 3, explanation: `100 − ${fmt(x, 3)} = ${fmt(100 - x, 3)} %.`, recompute: { from: 'x', fn: (v) => 100 - v }, placeholder: 'en %' }),
    );
  } else {
    statement = `El espectro de masas de un elemento X de número atómico **${z}** muestra estos isótopos: ${iso.map((i) => `A = ${i.a}, ${fmt(i.mass, 7)} u (${fmt(i.abundance, 4)} %)`).join('; ')}.`;
    parts.push(
      { id: 'el', prompt: 'Identifica el elemento X', answer: { kind: 'element', z }, canonical: el.symbol, explanation: `Z = ${z} → ${el.name} (${el.symbol}).`, placeholder: 'símbolo o nombre' },
      numericPart({
        id: 'M',
        prompt: 'Masa atómica media (u)',
        value: res.value,
        unit: 'u',
        sig: 4,
        relTol: 0.0005,
        explanation: `M = (${iso.map((i) => `${fmt(i.mass, 7)}·${fmt(i.abundance, 4)}`).join(' + ')})/100 = ${fmt(res.value, 5)} u.`,
        misconceptions: [{ test: (v) => Math.abs(v - iso.reduce((a, i) => a + i.mass, 0) / iso.length) < 0.003, message: 'Has hecho la media aritmética: hay que ponderar cada masa por su abundancia.' }],
      }),
    );
  }
  parts.push(
    integerPart('nh', `Neutrones del isótopo de A = ${h.a}`, h.a - z, `N = A − Z = ${h.a} − ${z} = ${h.a - z}.`),
    integerPart('nl', `Neutrones del isótopo de A = ${l.a}`, l.a - z, `N = A − Z = ${l.a} − ${z} = ${l.a - z}. Los isótopos solo se diferencian en el número de neutrones.`),
  );
  if (q !== 0) {
    const sym = ionSymbolText(el.symbol, q);
    parts.push(integerPart('e', `Electrones del ion ${sym}`, z - q, `e⁻ = Z − q = ${z} − (${q > 0 ? '+' : '−'}${Math.abs(q)}) = ${z - q}. ${q > 0 ? 'Un catión ha perdido electrones.' : 'Un anión ha ganado electrones.'}`));
    parts.push(choicePart('tipo', `¿Qué tipo de especie es ${sym}?`, [O('cation', 'Catión'), O('anion', 'Anión'), O('isotopo', 'Un isótopo distinto', 'La carga indica electrones ganados o perdidos; los isótopos difieren en neutrones.')], [q > 0 ? 'cation' : 'anion'], q > 0 ? 'Carga positiva: ha perdido electrones → catión.' : 'Carga negativa: ha ganado electrones → anión.'));
  }
  return {
    id: seedId,
    generatorId: 'examen-masa-iones',
    nodeIds: ['3.1', '1.1', '1.3', '1.4'],
    difficulty,
    title: 'Problema de examen: isótopos, iones y masa atómica',
    statement,
    parts,
    stepwise: true,
    hints: ['Z identifica el elemento; A − Z da los neutrones; Z − carga da los electrones.', 'La masa atómica es la media ponderada de las masas isotópicas: M = Σ mᵢ·%ᵢ / 100.', difficulty === 3 ? 'Llama x a una abundancia y 100 − x a la otra, y despeja x de la media ponderada.' : 'Multiplica cada masa por su abundancia, suma y divide entre 100.'],
    solution: parts.map((p) => p.explanation),
  };
}

export const massIonExamGenerator: ExerciseGenerator = {
  id: 'examen-masa-iones',
  title: 'Problema completo de isótopos, iones y masa atómica',
  nodeIds: ['3.1', '1.1', '1.3', '1.4'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const zs = Object.keys(ION_CHARGE).map(Number).filter((z) => NATURAL_ISOTOPES[z] && (difficulty === 2 || NATURAL_ISOTOPES[z]!.length === 2));
    return buildMassIonExam(pick(rng, zs), difficulty, exId(this.id, difficulty, seed));
  },
};

export const EXAM_GENERATORS: ExerciseGenerator[] = [spectrumExamGenerator, waveExamGenerator, elementsExamGenerator, quantumExamGenerator, massIonExamGenerator];
