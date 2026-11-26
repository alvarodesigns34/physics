/**
 * Registro de generadores y ejercicios de las fuentes (TEO y AMP), con su resolución verificada.
 */
import { THEORY_DATA } from '../science/constants';
import { elementByZ } from '../science/elements';
import { diagnoseConfiguration, STATUS_LABEL, formatConfiguration } from '../science/configuration';
import type { Exercise, ExerciseGenerator, ExercisePart } from './types';
import { buildReverseSpeciesExercise, buildSpeciesExercise, isoelectronicGenerator, isotopeGenerator, particleGenerator, speciesGenerator } from './generators/nucleus';
import {
  buildCascadeExercise,
  buildInverseSeriesExercise,
  buildRydbergExercise,
  buildWaveExercise,
  cascadeGenerator,
  energyOrderGenerator,
  inverseSeriesGenerator,
  levelEnergyGenerator,
  rydbergGenerator,
  waveGenerator,
} from './generators/photon';
import {
  buildConfigExercise,
  buildFixedQuantum,
  buildIonConfigExercise,
  configGenerator,
  configStateGenerator,
  ionConfigGenerator,
  orbitalCountGenerator,
  quantumValidityGenerator,
} from './generators/electrons';
import { choicePart } from './generators/util';
import {
  averageMassGenerator,
  familyGenerator,
  historyGenerator,
  ionRadiusGenerator,
  positionGenerator,
  quantumConceptGenerator,
  stableIonGenerator,
  subshellGenerator,
  trendGenerator,
  valenceGenerator,
  zeffGenerator,
  miscGenerator,
} from './generators/extra';
import { SOURCE_EXERCISES_2 } from './sources2';
import { SOURCE_EXERCISES_3 } from './sources3';
import { EXAM_GENERATORS } from './generators/exam';

export const GENERATORS: ExerciseGenerator[] = [
  speciesGenerator,
  isotopeGenerator,
  isoelectronicGenerator,
  particleGenerator,
  waveGenerator,
  energyOrderGenerator,
  rydbergGenerator,
  inverseSeriesGenerator,
  cascadeGenerator,
  levelEnergyGenerator,
  quantumValidityGenerator,
  orbitalCountGenerator,
  configGenerator,
  ionConfigGenerator,
  configStateGenerator,
  historyGenerator,
  quantumConceptGenerator,
  averageMassGenerator,
  trendGenerator,
  positionGenerator,
  stableIonGenerator,
  zeffGenerator,
  ionRadiusGenerator,
  familyGenerator,
  subshellGenerator,
  valenceGenerator,
  miscGenerator,
  ...EXAM_GENERATORS,
];

export const GENERATOR_BY_ID = new Map(GENERATORS.map((g) => [g.id, g]));

/** Nodos del temario cubiertos por algún generador. */
export const COVERED_NODES: string[] = [...new Set(GENERATORS.flatMap((g) => g.nodeIds))].sort((a, b) => {
  const [a1, a2] = a.split('.').map(Number);
  const [b1, b2] = b.split('.').map(Number);
  return a1! - b1! || a2! - b2!;
});

export function generatorsForNode(nodeId: string): ExerciseGenerator[] {
  return GENERATORS.filter((g) => g.nodeIds.includes(nodeId));
}

/** Ejercicio a partir de una configuración escrita (AMP 17, 19): ¿es posible? ¿qué átomo es? */
export function buildConfigDiagnosisExercise(text: string, seedId: string, source: string): Exercise {
  const d = diagnoseConfiguration(text);
  const el = d.status === 'fundamental' || d.status === 'excitado' ? elementByZ(d.electrons) : undefined;
  const parts: ExercisePart[] = [
    choicePart(
      'estado',
      '¿Qué tipo de configuración es?',
      (['fundamental', 'excitado', 'prohibido', 'imposible'] as const).map((s) => ({ id: s, text: STATUS_LABEL[s], feedback: d.issues.map((i) => i.message).join(' ') || `Revisa: ${STATUS_LABEL[d.status].toLowerCase()}.` })),
      [d.status],
      d.status === 'fundamental' ? 'Se respeta el orden de Möller, Pauli y la existencia de los subniveles: estado fundamental.' : d.issues.filter((i) => i.severity !== 'info').map((i) => i.message).join(' '),
    ),
  ];
  if (el) {
    parts.push({ id: 'el', prompt: '¿De qué elemento (átomo neutro) se trata?', answer: { kind: 'element', z: el.z }, canonical: el.symbol, explanation: `Tiene ${d.electrons} electrones; si es neutro, Z = ${d.electrons}: ${el.name} (${el.symbol}).`, placeholder: 'símbolo o nombre' });
  }
  return {
    id: seedId,
    generatorId: 'fuentes',
    nodeIds: ['6.5', '6.3', '6.6'],
    difficulty: 2,
    title: '¿Configuración posible?',
    statement: `Analiza la configuración **${text}**.`,
    parts,
    stepwise: true,
    hints: ['Comprueba primero que cada subnivel existe (l ≤ n − 1) y que ninguno supera su capacidad.', 'Después mira si se llenan en el orden de Möller sin dejar huecos.', 'Para identificar el elemento, suma todos los electrones.'],
    solution: [
      ...parts.map((p) => p.explanation),
      d.expectedGround && d.status === 'excitado' ? `Estado fundamental con ${d.electrons} e⁻: ${formatConfiguration(d.expectedGround, { abbreviate: true })}.` : '',
    ].filter(Boolean),
    source,
  };
}

export interface SourceExercise {
  ref: string;
  nodeIds: string[];
  build: () => Exercise;
}

const sp = (z: number, a: number, q = 0) => ({ z, n: a - z, e: z - q });

/** Ejercicios de las fuentes, reproducidos con sus datos. */
const SOURCE_EXERCISES_1: SourceExercise[] = [
  { ref: 'AMP 1', nodeIds: ['1.1', '1.2', '1.6'], build: () => buildSpeciesExercise(sp(79, 197), 1, 'src:AMP1', 'AMP 1') },
  { ref: 'AMP 2 · C', nodeIds: ['1.1', '1.2'], build: () => buildSpeciesExercise(sp(6, 12), 1, 'src:AMP2a', 'AMP 2') },
  { ref: 'AMP 2 · Pb', nodeIds: ['1.1', '1.2'], build: () => buildReverseSpeciesExercise(sp(82, 207), 2, 'src:AMP2c', 'AMP 2') },
  { ref: 'AMP 2 · Br', nodeIds: ['1.1', '1.2'], build: () => buildSpeciesExercise(sp(35, 80), 1, 'src:AMP2d', 'AMP 2') },
  { ref: 'AMP 3 · Cu', nodeIds: ['1.1', '1.2'], build: () => buildReverseSpeciesExercise(sp(29, 63), 2, 'src:AMP3cu', 'AMP 3') },
  { ref: 'AMP 3 · Fr', nodeIds: ['1.1', '1.2'], build: () => buildReverseSpeciesExercise(sp(87, 223), 2, 'src:AMP3fr', 'AMP 3') },
  { ref: 'AMP 4 · O²⁻', nodeIds: ['1.4'], build: () => buildSpeciesExercise(sp(8, 16, -2), 2, 'src:AMP4o', 'AMP 4') },
  { ref: 'AMP 4 · Al³⁺', nodeIds: ['1.4'], build: () => buildSpeciesExercise(sp(13, 27, 3), 2, 'src:AMP4al', 'AMP 4') },
  { ref: 'AMP 5 · Cr²⁺', nodeIds: ['1.4'], build: () => buildReverseSpeciesExercise(sp(24, 52, 2), 3, 'src:AMP5cr', 'AMP 5') },
  { ref: 'AMP 5 · Au³⁺', nodeIds: ['1.4'], build: () => buildSpeciesExercise(sp(79, 197, 3), 2, 'src:AMP5au', 'AMP 5') },
  { ref: 'AMP 6', nodeIds: ['3.2', '3.3', '3.4', '3.9'], build: () => buildWaveExercise({ value: 500, unit: 'nm' }, 2, 'src:AMP6', 'AMP 6', true) },
  { ref: 'AMP 7', nodeIds: ['3.6', '3.7', '3.4', '4.3'], build: () => buildRydbergExercise({ from: 3, to: 1, difficulty: 2, seedId: 'src:AMP7', source: 'AMP 7', rUnit: 'cm', compareWith32: true }) },
  { ref: 'AMP 8', nodeIds: ['3.6', '3.7', '3.4'], build: () => buildRydbergExercise({ from: 2, to: 1, difficulty: 1, seedId: 'src:AMP8', source: 'AMP 8', rUnit: 'cm' }) },
  { ref: 'AMP 9', nodeIds: ['3.7'], build: () => buildInverseSeriesExercise(3, 5, 2, 'src:AMP9', 'AMP 9', 2.34e14) },
  { ref: 'AMP 10', nodeIds: ['3.8'], build: () => buildCascadeExercise(4, 1, 'src:AMP10', 'AMP 10') },
  { ref: 'AMP 12a', nodeIds: ['5.4'], build: () => buildFixedQuantum({ n: 1, l: 1, ml: -1, ms: 0.5 }, 'src:AMP12a', 'AMP 12a') },
  { ref: 'AMP 12b', nodeIds: ['5.4'], build: () => buildFixedQuantum({ n: 2, l: 0, ml: 0, ms: -1 }, 'src:AMP12b', 'AMP 12b') },
  { ref: 'AMP 12c', nodeIds: ['5.4'], build: () => buildFixedQuantum({ n: 2, l: 1, ml: -2, ms: 0.5 }, 'src:AMP12c', 'AMP 12c') },
  { ref: 'AMP 12d', nodeIds: ['5.4'], build: () => buildFixedQuantum({ n: 7, l: 5, ml: -2, ms: -0.5 }, 'src:AMP12d', 'AMP 12d') },
  { ref: 'AMP 15', nodeIds: ['6.3', '7.2'], build: () => buildConfigExercise(16, 1, 'src:AMP15', 'AMP 15') },
  { ref: 'AMP 17a', nodeIds: ['6.5'], build: () => buildConfigDiagnosisExercise('1s² 2s² 2p²', 'src:AMP17a', 'AMP 17a') },
  { ref: 'AMP 17b', nodeIds: ['6.5'], build: () => buildConfigDiagnosisExercise('1s² 2s² 2p⁶ 2d²', 'src:AMP17b', 'AMP 17b') },
  { ref: 'AMP 17c', nodeIds: ['6.5'], build: () => buildConfigDiagnosisExercise('1s² 2s² 2p⁶ 4s²', 'src:AMP17c', 'AMP 17c') },
  { ref: 'AMP 17d', nodeIds: ['6.5'], build: () => buildConfigDiagnosisExercise('1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰ 4s² 4p³', 'src:AMP17d', 'AMP 17d') },
  { ref: 'AMP 19a', nodeIds: ['6.5', '6.6'], build: () => buildConfigDiagnosisExercise('[Ar] 4s²', 'src:AMP19a', 'AMP 19a') },
  { ref: 'AMP 19b', nodeIds: ['6.5', '6.6'], build: () => buildConfigDiagnosisExercise('[He] 3s² 3p⁴', 'src:AMP19b', 'AMP 19b') },
  { ref: 'AMP 19c', nodeIds: ['6.5', '6.6'], build: () => buildConfigDiagnosisExercise('[Ne] 3s² 2d¹⁰ 3p³', 'src:AMP19c', 'AMP 19c') },
  { ref: 'AMP 19d', nodeIds: ['6.5', '6.6'], build: () => buildConfigDiagnosisExercise('[Kr] 5s² 4d¹⁰ 5p⁴', 'src:AMP19d', 'AMP 19d') },
  { ref: 'TEO ej. 1', nodeIds: ['3.6', '3.7'], build: () => buildRydbergExercise({ from: 4, to: 1, difficulty: 1, seedId: 'src:TEO1', source: 'TEO ej. 1', rUnit: 'm', k: THEORY_DATA }) },
  { ref: 'TEO ej. 2a', nodeIds: ['5.4'], build: () => buildFixedQuantum({ n: 2, l: 2, ml: 0, ms: 0.5 }, 'src:TEO2a', 'TEO ej. 2') },
  { ref: 'TEO ej. 2d', nodeIds: ['5.4'], build: () => buildFixedQuantum({ n: 4, l: 3, ml: -1, ms: 0.5 }, 'src:TEO2d', 'TEO ej. 2') },
  { ref: 'TEO ej. 7 · O', nodeIds: ['6.1', '6.4'], build: () => buildConfigExercise(8, 2, 'src:TEO7a', 'TEO ej. 7') },
  { ref: 'TEO ej. 7 · O²⁻', nodeIds: ['6.8'], build: () => buildIonConfigExercise(8, -2, 2, 'src:TEO7b', 'TEO ej. 7') },
  { ref: 'TEO ej. 8 · Ca', nodeIds: ['6.3', '7.2'], build: () => buildConfigExercise(20, 2, 'src:TEO8b', 'TEO ej. 8') },
  { ref: 'TEO ej. 8 · Br', nodeIds: ['6.3', '7.2'], build: () => buildConfigExercise(35, 2, 'src:TEO8c', 'TEO ej. 8') },
];

export const SOURCE_EXERCISES: SourceExercise[] = [...SOURCE_EXERCISES_1, ...SOURCE_EXERCISES_2, ...SOURCE_EXERCISES_3];

/** Nivel orientativo de un ejercicio de las fuentes (1 básico, 2 examen, 3 avanzado). */
export function sourceLevel(s: SourceExercise): 1 | 2 | 3 {
  const lv = (s as SourceExercise & { level?: 1 | 2 | 3 }).level;
  if (lv) return lv;
  const ex = s.build();
  const d = ex.difficulty;
  return ex.parts.length >= 5 && d >= 2 ? 3 : d;
}

export const SOURCE_BY_REF = new Map(SOURCE_EXERCISES.map((s) => [s.ref, s]));
