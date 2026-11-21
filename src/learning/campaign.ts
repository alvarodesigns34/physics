/**
 * Campaña: misiones cuyos objetivos son predicados puros sobre el estado científico de los laboratorios.
 */
import type { Species } from '../science/nucleus';
import { nuclearNotation } from '../science/nucleus';
import type { Exercise } from './types';
import { SOURCE_BY_REF } from './registry';
import { buildRydbergExercise } from './generators/photon';
import { energyOrderGenerator } from './generators/photon';
import { choicePart } from './generators/util';
import { isoelectronicGenerator } from './generators/nucleus';

export type LabId = 'forja' | 'fotones';

export type MissionStep =
  | { kind: 'forja'; text: string; check: (s: Species) => boolean }
  | { kind: 'forja-coleccion'; text: string; count: number; check: (s: Species) => boolean; key: (s: Species) => string }
  | { kind: 'onda'; text: string; check: (lambdaNm: number) => boolean }
  | { kind: 'transicion'; text: string; check: (from: number, to: number) => boolean }
  | { kind: 'cascada'; text: string; n: number }
  | { kind: 'espectro'; text: string; answerSymbol: string; mode: 'emision' | 'absorcion' }
  | { kind: 'ejercicio'; text: string; build: () => Exercise };

export interface Mission {
  id: string;
  code: string;
  chapter: 1 | 2;
  title: string;
  brief: string;
  lab: LabId;
  /** Pestaña del laboratorio que se abre al empezar */
  tab?: 'ondas' | 'hidrogeno' | 'espectroscopio';
  nodeIds: string[];
  steps: MissionStep[];
}

export const CHAPTERS = [
  { id: 1, title: 'Identidad', subtitle: 'Lo que hace que un átomo sea el que es', lab: 'forja' as const },
  { id: 2, title: 'Luz', subtitle: 'Lo que los átomos cuentan cuando brillan', lab: 'fotones' as const },
];

const src = (ref: string) => () => SOURCE_BY_REF.get(ref)!.build();

const sameSpecies = (z: number, a: number, q: number) => (s: Species) => s.z === z && s.z + s.n === a && s.z - s.e === q;

function conceptExercise(id: string, nodeIds: string[], statement: string, options: { id: string; text: string; feedback?: string }[], correct: string, explanation: string, hints: [string, string, string]): Exercise {
  return {
    id,
    generatorId: 'campana',
    nodeIds,
    difficulty: 2,
    title: 'Razona',
    statement,
    parts: [choicePart('c', 'Elige una respuesta', options, [correct], explanation)],
    stepwise: false,
    hints,
    solution: [explanation],
  };
}

export const MISSIONS: Mission[] = [
  {
    id: 'I-1',
    code: 'I-1',
    chapter: 1,
    title: 'Carbono-12',
    brief: 'Todo laboratorio de materia empieza por el mismo átomo: el que define la unidad de masa atómica. Constrúyelo partícula a partícula.',
    lab: 'forja',
    nodeIds: ['1.1', '1.2'],
    steps: [{ kind: 'forja', text: 'Construye un átomo neutro de carbono-12 (¹²₆C).', check: sameSpecies(6, 12, 0) }],
  },
  {
    id: 'I-2',
    code: 'I-2',
    chapter: 1,
    title: 'Lo que decide Z',
    brief: 'Un neutrón más o menos cambia la masa. Un protón más o menos cambia… todo. Compruébalo con el sodio.',
    lab: 'forja',
    nodeIds: ['1.1', '1.2', '1.3'],
    steps: [
      { kind: 'forja', text: 'Construye un átomo neutro de sodio-23.', check: sameSpecies(11, 23, 0) },
      { kind: 'forja', text: 'Ahora quita UN protón (y un electrón, para que siga siendo neutro). Observa el nombre.', check: (s) => s.z === 10 && s.n === 12 && s.e === 10 },
      {
        kind: 'ejercicio',
        text: 'Explica lo que acabas de ver.',
        build: () =>
          conceptExercise(
            'camp:I-2',
            ['1.1', '1.3'],
            'Al quitar un protón al sodio-23 (y un electrón) se obtiene neón-22. Si en lugar del protón hubieras quitado un **neutrón**, ¿qué habrías obtenido?',
            [
              { id: 'iso', text: 'Sodio-22: un isótopo del mismo elemento' },
              { id: 'ne', text: 'Neón-22: otro elemento', feedback: 'El elemento lo decide Z, el número de protones. Quitar un neutrón no cambia Z.' },
              { id: 'ion', text: 'Un ion sodio', feedback: 'Los iones se forman al cambiar el número de electrones, no el de neutrones.' },
            ],
            'iso',
            'Quitar un neutrón no cambia Z = 11: sigue siendo sodio, pero A pasa de 23 a 22. Es un isótopo (²²Na, radiactivo).',
            ['¿Qué partícula identifica al elemento?', 'El elemento depende de Z; A = Z + N.', 'Z = 11 se mantiene; A disminuye en 1.'],
          ),
      },
    ],
  },
  {
    id: 'I-3',
    code: 'I-3',
    chapter: 1,
    title: 'Gemelos imperfectos',
    brief: 'El hidrógeno tiene tres isótopos con nombre propio: protio, deuterio y tritio. Fórjalos y descubre cuál de ellos no es estable.',
    lab: 'forja',
    nodeIds: ['1.3'],
    steps: [
      { kind: 'forja-coleccion', text: 'Construye los tres isótopos del hidrógeno (neutros): ¹H, ²H y ³H.', count: 3, check: (s) => s.z === 1 && s.e === 1 && s.n <= 2, key: (s) => nuclearNotation(s) },
      {
        kind: 'ejercicio',
        text: 'Interpreta la ficha nuclear.',
        build: () =>
          conceptExercise(
            'camp:I-3',
            ['1.3'],
            'Según la ficha de estabilidad de la forja, ¿cuál de los isótopos del hidrógeno es **radiactivo**?',
            [
              { id: 't', text: 'Tritio, ³H (semivida ≈ 12,3 años)' },
              { id: 'd', text: 'Deuterio, ²H', feedback: 'El deuterio es estable (abundancia natural ≈ 0,0145 %).' },
              { id: 'p', text: 'Protio, ¹H', feedback: 'El protio es estable y es el isótopo más abundante (≈ 99,99 %).' },
            ],
            't',
            'El tritio (1 protón + 2 neutrones) es radiactivo: se desintegra (β⁻) con una semivida de unos 12,3 años. Protio y deuterio son estables.',
            ['Vuelve a construir cada isótopo y mira la ficha nuclear.', 'Busca el que indica «radiactivo» y una semivida.', 'Es el que tiene más neutrones.'],
          ),
      },
    ],
  },
  {
    id: 'I-4',
    code: 'I-4',
    chapter: 1,
    title: 'Ionización',
    brief: 'Los átomos no cambian de elemento al ganar o perder electrones: se cargan. Forma tres iones que aparecen en todos los exámenes.',
    lab: 'forja',
    nodeIds: ['1.4', '7.5'],
    steps: [
      { kind: 'forja', text: 'Forma el catión Na⁺ (cualquier isótopo).', check: (s) => s.z === 11 && s.e === 10 },
      { kind: 'forja', text: 'Forma el anión O²⁻.', check: (s) => s.z === 8 && s.e === 10 },
      { kind: 'forja', text: 'Forma el catión Al³⁺.', check: (s) => s.z === 13 && s.e === 10 },
      { kind: 'ejercicio', text: 'Completa la ficha de un ion (AMP 4).', build: src('AMP 4 · Al³⁺') },
    ],
  },
  {
    id: 'I-5',
    code: 'I-5',
    chapter: 1,
    title: 'La familia del neón',
    brief: 'Na⁺, O²⁻ y Al³⁺ tienen algo en común con el neón. Encuentra tres miembros más de esa familia.',
    lab: 'forja',
    nodeIds: ['1.5'],
    steps: [
      { kind: 'forja-coleccion', text: 'Construye tres especies distintas con 10 electrones que NO sean neón (Z ≠ 10).', count: 3, check: (s) => s.e === 10 && s.z !== 10, key: (s) => `${s.z}` },
      { kind: 'ejercicio', text: 'Reconoce especies isoelectrónicas.', build: () => isoelectronicGenerator.create(3, 3) },
    ],
  },
  {
    id: 'I-6',
    code: 'I-6',
    chapter: 1,
    title: 'Laboratorio forense',
    brief: 'Dos fichas incompletas del cuaderno de ejercicios. Usa la forja como banco de pruebas si lo necesitas.',
    lab: 'forja',
    nodeIds: ['1.1', '1.2', '1.4'],
    steps: [
      { kind: 'ejercicio', text: 'AMP 2: el plomo.', build: src('AMP 2 · Pb') },
      { kind: 'ejercicio', text: 'AMP 5: el ion cromo(II).', build: src('AMP 5 · Cr²⁺') },
    ],
  },
  {
    id: 'I-7',
    code: 'I-7',
    chapter: 1,
    title: 'El oro de Rutherford',
    brief: 'La lámina de oro que reveló el núcleo atómico. Construye un átomo de oro-197 y responde como en el examen.',
    lab: 'forja',
    nodeIds: ['1.1', '1.6'],
    steps: [
      { kind: 'forja', text: 'Construye un átomo neutro de oro-197.', check: sameSpecies(79, 197, 0) },
      { kind: 'ejercicio', text: 'AMP 1.', build: src('AMP 1') },
      {
        kind: 'ejercicio',
        text: '¿Dónde está cada partícula?',
        build: () =>
          conceptExercise(
            'camp:I-7',
            ['1.6'],
            '¿Dónde se encuentran los 79 protones y los 79 electrones del átomo de oro?',
            [
              { id: 'ok', text: 'Protones en el núcleo; electrones en la corteza, alrededor del núcleo' },
              { id: 'thomson', text: 'Los electrones incrustados en una esfera positiva', feedback: 'Ese es el modelo de Thomson, que la lámina de oro de Rutherford refutó.' },
              { id: 'rev', text: 'Electrones en el núcleo; protones alrededor', feedback: 'Al revés: el núcleo es positivo (protones) y la corteza, negativa (electrones).' },
            ],
            'ok',
            'Los protones (junto con los 118 neutrones) forman el núcleo, diminuto y con casi toda la masa. Los electrones ocupan la corteza, una región unas 10⁵ veces mayor que el núcleo.',
            ['Piensa en el experimento de la lámina de oro.', 'Núcleo: carga positiva y casi toda la masa.', 'Los electrones son negativos y ligeros.'],
          ),
      },
    ],
  },
  {
    id: 'II-1',
    code: 'II-1',
    chapter: 2,
    title: '500 nanómetros',
    brief: 'Una onda, cuatro magnitudes. Sintoniza el banco de ondas y comprueba los cálculos del ejercicio 6.',
    lab: 'fotones',
    tab: 'ondas',
    nodeIds: ['3.2', '3.3', '3.4'],
    steps: [
      { kind: 'onda', text: 'Sintoniza el banco de ondas en λ = 500 nm (±2 nm).', check: (l) => Math.abs(l - 500) <= 2 },
      { kind: 'ejercicio', text: 'AMP 6.', build: src('AMP 6') },
    ],
  },
  {
    id: 'II-2',
    code: 'II-2',
    chapter: 2,
    title: 'Escalera de energía',
    brief: 'Del radio a los rayos gamma, la misma física con distinta λ. Recorre el espectro y ordena.',
    lab: 'fotones',
    tab: 'ondas',
    nodeIds: ['3.3', '3.4'],
    steps: [
      { kind: 'onda', text: 'Lleva el banco de ondas a la región de los rayos X (λ entre 10 pm y 10 nm).', check: (l) => l >= 0.01 && l < 10 },
      { kind: 'onda', text: 'Ahora, a las microondas (λ entre 1 mm y 1 m).', check: (l) => l >= 1e6 && l < 1e9 },
      { kind: 'ejercicio', text: 'Ordena por energía.', build: () => energyOrderGenerator.create(7, 2) },
    ],
  },
  {
    id: 'II-3',
    code: 'II-3',
    chapter: 2,
    title: 'La línea roja',
    brief: 'La línea más famosa de la astronomía, Hα, tiñe de rojo las nebulosas. Haz que un átomo de hidrógeno la emita.',
    lab: 'fotones',
    tab: 'hidrogeno',
    nodeIds: ['3.6', '4.3'],
    steps: [
      { kind: 'transicion', text: 'Provoca la emisión de la transición n = 3 → n = 2.', check: (f, t) => f === 3 && t === 2 },
      { kind: 'ejercicio', text: 'Calcula su longitud de onda con Rydberg.', build: () => buildRydbergExercise({ from: 3, to: 2, difficulty: 1, seedId: 'camp:II-3' }) },
    ],
  },
  {
    id: 'II-4',
    code: 'II-4',
    chapter: 2,
    title: 'Lyman',
    brief: 'Bajar hasta el nivel fundamental libera fotones que no podemos ver. Emite uno y calcula por qué es tan energético.',
    lab: 'fotones',
    tab: 'hidrogeno',
    nodeIds: ['3.6', '3.7', '4.3'],
    steps: [
      { kind: 'transicion', text: 'Provoca la emisión 3 → 1.', check: (f, t) => f === 3 && t === 1 },
      { kind: 'transicion', text: 'Y compárala con la emisión 3 → 2.', check: (f, t) => f === 3 && t === 2 },
      { kind: 'ejercicio', text: 'AMP 7.', build: src('AMP 7') },
    ],
  },
  {
    id: 'II-5',
    code: 'II-5',
    chapter: 2,
    title: 'Paschen misterioso',
    brief: 'Un detector infrarrojo registra ν = 2,34·10¹⁴ Hz. Pertenece a la serie de Paschen. Encuentra la transición experimentando y después demuéstralo.',
    lab: 'fotones',
    tab: 'hidrogeno',
    nodeIds: ['3.7'],
    steps: [
      { kind: 'transicion', text: 'Encuentra en el laboratorio la emisión con ν ≈ 2,34·10¹⁴ Hz.', check: (f, t) => f === 5 && t === 3 },
      { kind: 'ejercicio', text: 'AMP 9.', build: src('AMP 9') },
    ],
  },
  {
    id: 'II-6',
    code: 'II-6',
    chapter: 2,
    title: 'Cascada',
    brief: 'Excita una muestra entera hasta n = 4 y deja que se relaje. ¿Cuántas líneas distintas aparecen?',
    lab: 'fotones',
    tab: 'hidrogeno',
    nodeIds: ['3.8'],
    steps: [
      { kind: 'cascada', text: 'Excita la muestra hasta n = 4 y lanza la cascada.', n: 4 },
      { kind: 'ejercicio', text: 'AMP 10.', build: src('AMP 10') },
    ],
  },
  {
    id: 'II-7',
    code: 'II-7',
    chapter: 2,
    title: 'Firma estelar',
    brief: 'La luz de una estrella atraviesa su atmósfera y llega con huecos oscuros. Cada elemento deja una firma única. Identifica el responsable.',
    lab: 'fotones',
    tab: 'espectroscopio',
    nodeIds: ['3.5'],
    steps: [{ kind: 'espectro', text: 'Compara el espectro de absorción de la estrella con los de referencia e identifica el elemento.', answerSymbol: 'Na', mode: 'absorcion' }],
  },
];

export const MISSION_BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));

export function missionsOfChapter(ch: number): Mission[] {
  return MISSIONS.filter((m) => m.chapter === ch);
}
