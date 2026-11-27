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
import { HISTORY_ITEMS, QUANTUM_CONCEPT_ITEMS, buildConcept, averageMassGenerator, buildSubshellExercise, trendGenerator, buildTrendOrderExercise, E } from './generators/extra';
import { configStateGenerator, buildConfigExercise } from './generators/electrons';
import { buildPrediction, PREDICTIONS, buildMysteryIon, buildIEGraph, spectrumIDGenerator, bohrRatiosGenerator } from './generators/reasoning';
import { unknownIsotopeGenerator } from './generators/exam2';
import { mulberry32 } from '../science/numbers';

import type { LabSignal } from '../ui/MissionPanel';

export type LabId = 'forja' | 'fotones' | 'periodico' | 'cuantico' | 'arquitecto' | 'historia' | 'masas';

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const LAB_ROUTE: Record<LabId, string> = { forja: '/forja', fotones: '/fotones', periodico: '/periodico', cuantico: '/cuantico', arquitecto: '/arquitecto', historia: '/historia', masas: '/masas' };

export function missionRoute(m: Mission): string {
  return `${LAB_ROUTE[m.lab]}${m.tab ? `?tab=${m.tab}` : ''}`;
}

export type MissionStep =
  | { kind: 'forja'; text: string; check: (s: Species) => boolean }
  | { kind: 'forja-coleccion'; text: string; count: number; check: (s: Species) => boolean; key: (s: Species) => string }
  | { kind: 'onda'; text: string; check: (lambdaNm: number) => boolean }
  | { kind: 'transicion'; text: string; check: (from: number, to: number) => boolean }
  | { kind: 'cascada'; text: string; n: number }
  | { kind: 'espectro'; text: string; answerSymbol: string; mode: 'emision' | 'absorcion' }
  | { kind: 'ejercicio'; text: string; build: () => Exercise }
  | { kind: 'lab'; text: string; check: (sig: LabSignal) => boolean };

export interface Mission {
  id: string;
  code: string;
  chapter: number;
  title: string;
  brief: string;
  lab: LabId;
  /** Pestaña del laboratorio que se abre al empezar */
  tab?: string;
  nodeIds: string[];
  steps: MissionStep[];
}

export const CHAPTERS: { id: number; title: string; subtitle: string; lab: LabId }[] = [
  { id: 1, title: 'Identidad', subtitle: 'Lo que hace que un átomo sea el que es', lab: 'forja' },
  { id: 2, title: 'Luz', subtitle: 'Lo que los átomos cuentan cuando brillan', lab: 'fotones' },
  { id: 3, title: 'Historia', subtitle: 'Los experimentos que desmontaron cada modelo', lab: 'historia' },
  { id: 4, title: 'Masa', subtitle: 'Pesar átomos uno a uno', lab: 'masas' },
  { id: 5, title: 'Probabilidad', subtitle: 'Del electrón que gira a la nube que se cuenta', lab: 'cuantico' },
  { id: 6, title: 'Arquitectura', subtitle: 'Dónde se colocan los electrones y por qué', lab: 'arquitecto' },
  { id: 7, title: 'Periodicidad', subtitle: 'Por qué la tabla tiene la forma que tiene', lab: 'periodico' },
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

const concept = (item: (typeof HISTORY_ITEMS)[number], id: string) => () => buildConcept(item, `camp:${id}`, 'campana', 2);

MISSIONS.push(
  // ── III · Historia (Time Machine) ──
  {
    id: 'III-1', code: 'III-1', chapter: 3, title: 'Rayos catódicos', lab: 'historia', tab: 'tubo', nodeIds: ['2.2'],
    brief: 'Thomson desvió un haz invisible con campos eléctricos y magnéticos y descubrió la primera partícula subatómica. Repite su experimento.',
    steps: [
      { kind: 'lab', text: 'Equilibra el haz: compensa la fuerza eléctrica con el campo magnético para que vuelva a ir recto.', check: (s) => !!s.history?.balanced },
      { kind: 'ejercicio', text: 'Interpreta el experimento.', build: concept(HISTORY_ITEMS[1]!, 'III-1') },
    ],
  },
  {
    id: 'III-2', code: 'III-2', chapter: 3, title: 'La lámina de oro', lab: 'historia', tab: 'geiger', nodeIds: ['2.3', '2.4', '2.5'],
    brief: 'Si el átomo fuera un pastel de pasas, las partículas α lo atravesarían casi sin desviarse. Pon a prueba los dos modelos con la misma lámina.',
    steps: [
      { kind: 'lab', text: 'Lanza al menos 5000 partículas α contra un oro «de Thomson».', check: (s) => (s.history?.alphasT ?? 0) >= 5000 },
      { kind: 'lab', text: 'Cambia al átomo nuclear y observa al menos 20 desviaciones mayores de 10°.', check: (s) => (s.history?.largeR ?? 0) >= 20 },
      { kind: 'ejercicio', text: 'Interpreta el resultado.', build: concept(HISTORY_ITEMS[2]!, 'III-2') },
      { kind: 'ejercicio', text: '¿Qué dice el espacio vacío?', build: concept(HISTORY_ITEMS[3]!, 'III-2b') },
    ],
  },
  {
    id: 'III-3', code: 'III-3', chapter: 3, title: 'Colapso', lab: 'historia', tab: 'modelos', nodeIds: ['2.6'],
    brief: 'El modelo planetario de Rutherford tenía un problema enorme. Aplícale la física clásica y descúbrelo.',
    steps: [
      { kind: 'lab', text: 'Abre el modelo nuclear y aplica la física clásica hasta el colapso.', check: (s) => !!s.history?.collapsed },
      { kind: 'ejercicio', text: '¿Qué predice Maxwell?', build: concept(HISTORY_ITEMS[4]!, 'III-3') },
      { kind: 'ejercicio', text: 'La otra limitación.', build: concept(HISTORY_ITEMS[5]!, 'III-3b') },
    ],
  },
  {
    id: 'III-4', code: 'III-4', chapter: 3, title: 'Bohr', lab: 'historia', tab: 'modelos', nodeIds: ['4.1', '4.2', '4.4'],
    brief: 'Órbitas permitidas y saltos cuánticos: la idea que explicó el espectro del hidrógeno.',
    steps: [
      { kind: 'ejercicio', text: 'Antes de abrirlo, predice qué espectro dará el hidrógeno según Bohr.', build: () => buildPrediction(PREDICTIONS[3]!, 1, 'camp:III-4p', mulberry32(34)) },
      { kind: 'lab', text: 'Abre el modelo de Bohr y sigue su recorrido hasta «Lo que se observó».', check: (s) => s.history?.model === 'bohr' },
      { kind: 'ejercicio', text: 'Los postulados.', build: concept(HISTORY_ITEMS[7]!, 'III-4') },
      { kind: 'ejercicio', text: 'Los radios.', build: concept(HISTORY_ITEMS[8]!, 'III-4b') },
      { kind: 'ejercicio', text: 'Las correcciones.', build: concept(HISTORY_ITEMS[9]!, 'III-4c') },
    ],
  },
  // ── IV · Masa (Mass Spectrometry Lab) ──
  {
    id: 'IV-1', code: 'IV-1', chapter: 4, title: 'El cloro', lab: 'masas', nodeIds: ['3.1', '1.3'],
    brief: '¿Por qué la masa atómica del cloro es 35,45 y no un número entero? Pésalo ion a ion.',
    steps: [
      { kind: 'lab', text: 'Mide una muestra de cloro con al menos 1000 iones.', check: (s) => s.masas?.z === 17 && (s.masas?.ions ?? 0) >= 1000 },
      { kind: 'ejercicio', text: 'El ejemplo de los apuntes (corregido).', build: () => SOURCE_BY_REF.get('TEO ej. Cl (corregido)')!.build() },
    ],
  },
  {
    id: 'IV-2', code: 'IV-2', chapter: 4, title: 'Tres isótopos', lab: 'masas', nodeIds: ['3.1'],
    brief: 'El magnesio tiene tres isótopos estables. Mide su espectro y calcula la media ponderada.',
    steps: [
      { kind: 'lab', text: 'Mide una muestra de magnesio con al menos 800 iones.', check: (s) => s.masas?.z === 12 && (s.masas?.ions ?? 0) >= 800 },
      { kind: 'ejercicio', text: 'Calcula la masa atómica media.', build: () => averageMassGenerator.create(12, 2) },
    ],
  },
  {
    id: 'IV-3', code: 'IV-3', chapter: 4, title: 'Problema inverso', lab: 'masas', nodeIds: ['3.1'],
    brief: 'Conocida la masa atómica, ¿qué proporción hay de cada isótopo? El problema del examen, al revés, y después con una muestra que nadie te ha identificado.',
    steps: [
      { kind: 'ejercicio', text: 'Calcula las abundancias.', build: () => averageMassGenerator.create(5, 3) },
      { kind: 'lab', text: 'En el laboratorio, analiza una muestra desconocida hasta contar 2 000 iones e identifícala.', check: (s) => !!s.masas?.unknown && (s.masas?.ions ?? 0) >= 2000 },
    ],
  },
  // ── V · Probabilidad (Quantum Space) ──
  {
    id: 'V-1', code: 'V-1', chapter: 5, title: 'La nube 1s', lab: 'cuantico', tab: 'orbitales', nodeIds: ['5.3'],
    brief: 'Bohr dibujó una órbita; la mecánica cuántica dibuja una nube. Superpón las dos.',
    steps: [
      { kind: 'lab', text: 'Muestra el orbital 1s con la órbita de Bohr superpuesta.', check: (s) => s.quantum?.n === 1 && !!s.quantum?.bohr },
      { kind: 'ejercicio', text: 'Órbita frente a orbital (AMP 11).', build: () => SOURCE_BY_REF.get('AMP 11')!.build() },
    ],
  },
  {
    id: 'V-2', code: 'V-2', chapter: 5, title: 'Tres orientaciones', lab: 'cuantico', tab: 'orbitales', nodeIds: ['5.4', '5.5'],
    brief: 'Un subnivel p tiene tres orbitales idénticos salvo en su orientación. Encuéntralos.',
    steps: [
      { kind: 'ejercicio', text: 'Antes de mirar: predice cuántos orbitales y electrones tiene el subnivel 2p.', build: () => buildSubshellExercise(2, 1, 2, 'camp:V-2', 'Campaña V-2') },
      { kind: 'lab', text: 'Comprueba tu predicción: visita el 2p con m = −1…', check: (s) => s.quantum?.n === 2 && s.quantum.l === 1 && s.quantum.m === -1 },
      { kind: 'lab', text: '…y con m = +1. ¿Qué cambia y qué no?', check: (s) => s.quantum?.n === 2 && s.quantum.l === 1 && s.quantum.m === 1 },
    ],
  },
  {
    id: 'V-3', code: 'V-3', chapter: 5, title: 'Nodos', lab: 'cuantico', tab: 'orbitales', nodeIds: ['5.3', '5.4'],
    brief: 'Dentro de un orbital hay superficies donde el electrón nunca está. Córtalo y mira dentro.',
    steps: [
      { kind: 'lab', text: 'Muestra el corte del orbital 3s.', check: (s) => s.quantum?.n === 3 && s.quantum.l === 0 && !!s.quantum.slice },
      { kind: 'ejercicio', text: 'Una combinación sorprendente (AMP 12d).', build: () => SOURCE_BY_REF.get('AMP 12d')!.build() },
    ],
  },
  {
    id: 'V-4', code: 'V-4', chapter: 5, title: 'Incertidumbre', lab: 'cuantico', tab: 'incertidumbre', nodeIds: ['5.1', '5.2'],
    brief: 'Cuanto mejor sabes dónde está, peor sabes a qué velocidad va. Compruébalo con números.',
    steps: [
      { kind: 'lab', text: 'Reduce la incertidumbre en la posición por debajo de 0,05 nm.', check: (s) => s.quantum?.tab === 'incertidumbre' && (s.quantum?.sigmaNm ?? 1) < 0.05 },
      { kind: 'ejercicio', text: 'Heisenberg.', build: () => buildConcept(QUANTUM_CONCEPT_ITEMS[1]!, 'camp:V-4', 'campana', 2) },
      { kind: 'ejercicio', text: 'De Broglie.', build: () => buildConcept(QUANTUM_CONCEPT_ITEMS[2]!, 'camp:V-4b', 'campana', 1) },
    ],
  },
  // ── VI · Arquitectura (Electron Architect) ──
  {
    id: 'VI-1', code: 'VI-1', chapter: 6, title: 'Oxígeno', lab: 'arquitecto', nodeIds: ['6.1', '6.3', '6.4'],
    brief: 'Coloca los ocho electrones del oxígeno caja a caja, respetando las tres reglas.',
    steps: [
      { kind: 'lab', text: 'Construye el estado fundamental del oxígeno (Z = 8).', check: (s) => s.architect?.z === 8 && s.architect.e === 8 && s.architect.status === 'fundamental' },
      { kind: 'ejercicio', text: 'TEO ej. 7.', build: () => SOURCE_BY_REF.get('TEO ej. 7 · O')!.build() },
    ],
  },
  {
    id: 'VI-2', code: 'VI-2', chapter: 6, title: 'Prohibido', lab: 'arquitecto', nodeIds: ['6.2', '6.5'],
    brief: 'Rompe una regla a propósito: pon dos electrones con el mismo espín en un orbital y mira qué pasa.',
    steps: [
      { kind: 'lab', text: 'Crea una violación del principio de exclusión de Pauli (↑↑).', check: (s) => !!s.architect?.pauli },
      { kind: 'ejercicio', text: 'Clasifica configuraciones.', build: () => configStateGenerator.create(3, 2) },
    ],
  },
  {
    id: 'VI-3', code: 'VI-3', chapter: 6, title: 'Hund', lab: 'arquitecto', nodeIds: ['6.4'],
    brief: 'El nitrógeno tiene tres electrones 2p. ¿Juntos o separados? ¿Con qué espín?',
    steps: [
      { kind: 'lab', text: 'Coloca los electrones del nitrógeno violando la regla de Hund…', check: (s) => s.architect?.z === 7 && !!s.architect.hund },
      { kind: 'lab', text: '…y corrígelos hasta el estado fundamental.', check: (s) => s.architect?.z === 7 && s.architect.status === 'fundamental' },
      { kind: 'ejercicio', text: 'Configuración y desapareados.', build: () => buildConfigExercise(7, 2, 'camp:VI-3', 'Campaña VI-3') },
    ],
  },
  {
    id: 'VI-4', code: 'VI-4', chapter: 6, title: 'La excepción del cromo', lab: 'arquitecto', nodeIds: ['6.7'],
    brief: 'Möller predice una cosa; la naturaleza hace otra. Descubre el estado fundamental real del cromo.',
    steps: [
      { kind: 'lab', text: 'Construye el estado fundamental real del cromo (Z = 24).', check: (s) => s.architect?.z === 24 && s.architect.status === 'fundamental' },
      { kind: 'ejercicio', text: 'Escribe su configuración.', build: () => buildConfigExercise(24, 3, 'camp:VI-4', 'Campaña VI-4') },
    ],
  },
  {
    id: 'VI-5', code: 'VI-5', chapter: 6, title: 'Revisión', lab: 'arquitecto', nodeIds: ['6.5', '6.6'],
    brief: 'Dos configuraciones del cuaderno de ejercicios. ¿Son posibles?',
    steps: [
      { kind: 'ejercicio', text: 'AMP 19b.', build: () => SOURCE_BY_REF.get('AMP 19b')!.build() },
      { kind: 'ejercicio', text: 'AMP 19c.', build: () => SOURCE_BY_REF.get('AMP 19c')!.build() },
    ],
  },
  // ── VII · Periodicidad (Periodic Universe) ──
  {
    id: 'VII-1', code: 'VII-1', chapter: 7, title: 'Mapa de tamaños', lab: 'periodico', nodeIds: ['7.7', '7.6'],
    brief: 'Levanta la tabla periódica según el radio de cada átomo y descubre las dos tendencias. Predice antes de mirar.',
    steps: [
      { kind: 'ejercicio', text: 'Predice: ¿qué átomo es mayor en cada pareja?', build: () => buildTrendOrderExercise('radio', [E('Li'), E('C'), E('F')], 2, 'camp:VII-1p', 'Campaña VII-1') },
      { kind: 'lab', text: 'Compruébalo: representa el radio atómico en la tabla 3D.', check: (s) => s.periodic?.prop === 'radio' },
      { kind: 'ejercicio', text: 'TEO ej. 9a.', build: () => SOURCE_BY_REF.get('TEO ej. 9a')!.build() },
    ],
  },
  {
    id: 'VII-2', code: 'VII-2', chapter: 7, title: 'Escalera de ionización', lab: 'periodico', nodeIds: ['7.9', '7.13'],
    brief: 'La energía de ionización sube hacia la derecha… casi siempre. Encuentra el escalón que baja.',
    steps: [
      { kind: 'lab', text: 'Representa la EI₁ y compara el nitrógeno con el oxígeno.', check: (s) => s.periodic?.prop === 'ei1' && !!s.periodic.compared && [7, 8].every((z) => s.periodic!.compared!.includes(z)) },
      { kind: 'ejercicio', text: 'Ordena con datos reales.', build: () => buildTrendOrderExercise('ei1', [E('C'), E('N'), E('O')], 3, 'camp:VII-2', 'Campaña VII-2') },
    ],
  },
  {
    id: 'VII-3', code: 'VII-3', chapter: 7, title: 'Afinidad', lab: 'periodico', nodeIds: ['7.10', '7.13'],
    brief: 'El flúor es el más electronegativo… pero no el que más energía libera al captar un electrón.',
    steps: [
      { kind: 'lab', text: 'Representa la afinidad electrónica y compara el flúor con el cloro.', check: (s) => s.periodic?.prop === 'ae' && !!s.periodic.compared && [9, 17].every((z) => s.periodic!.compared!.includes(z)) },
      { kind: 'ejercicio', text: 'TEO ej. 20c.', build: () => SOURCE_BY_REF.get('TEO ej. 20c')!.build() },
    ],
  },
  {
    id: 'VII-4', code: 'VII-4', chapter: 7, title: 'Iones', lab: 'periodico', tab: 'tamanos', nodeIds: ['7.8', '1.5'],
    brief: 'Perder electrones encoge; ganarlos hincha. Compruébalo con radios reales.',
    steps: [
      { kind: 'lab', text: 'Abre la vista «Átomos e iones».', check: (s) => s.periodic?.view === 'tamanos' },
      { kind: 'ejercicio', text: 'AMP 23a.', build: () => SOURCE_BY_REF.get('AMP 23a')!.build() },
    ],
  },
  {
    id: 'VII-5', code: 'VII-5', chapter: 7, title: 'El examen', lab: 'periodico', nodeIds: ['7.9', '7.7'],
    brief: 'Cuatro preguntas clásicas de propiedades periódicas, resueltas con datos.',
    steps: [
      { kind: 'ejercicio', text: 'AMP 29.', build: () => SOURCE_BY_REF.get('AMP 29')!.build() },
      { kind: 'ejercicio', text: 'AMP 30.', build: () => SOURCE_BY_REF.get('AMP 30')!.build() },
      { kind: 'ejercicio', text: 'AMP 31.', build: () => SOURCE_BY_REF.get('AMP 31')!.build() },
      { kind: 'ejercicio', text: 'Tendencia con excepción.', build: () => trendGenerator.create(4, 3) },
    ],
  },
  // ── Misiones de ATOM 3.0: conectan con el material nuevo y exigen predecir, deducir o reparar ──
  {
    id: 'II-8', code: 'II-8', chapter: 2, title: 'Muestra problema', lab: 'fotones', tab: 'espectroscopio', nodeIds: ['3.5', '4.3'],
    brief: 'Una lámpara con una mezcla de gases. Identifica sus componentes por las líneas, como se descubrió el helio en el Sol.',
    steps: [
      { kind: 'espectro', text: 'Calienta la vista: identifica primero un elemento puro por su espectro de absorción.', answerSymbol: 'Na', mode: 'absorcion' },
      { kind: 'ejercicio', text: 'Analiza la mezcla.', build: () => spectrumIDGenerator.create(8, 3) },
    ],
  },
  {
    id: 'III-5', code: 'III-5', chapter: 3, title: 'Predice y contrasta', lab: 'historia', tab: 'modelos', nodeIds: ['2.3', '2.4', '2.5'],
    brief: 'La ciencia avanza cuando una predicción falla. Predice con Thomson, predice con Rutherford y compara con lo observado.',
    steps: [
      { kind: 'ejercicio', text: 'Predicción con el modelo de Thomson.', build: () => buildPrediction(PREDICTIONS[0]!, 1, 'camp:III-5a', mulberry32(35)) },
      { kind: 'ejercicio', text: 'Predicción con el modelo de Rutherford.', build: () => buildPrediction(PREDICTIONS[1]!, 1, 'camp:III-5b', mulberry32(36)) },
      { kind: 'lab', text: 'Contrástalo en la lámina de oro con al menos 20 desviaciones grandes del átomo nuclear.', check: (s) => (s.history?.largeR ?? 0) >= 20 },
    ],
  },
  {
    id: 'IV-4', code: 'IV-4', chapter: 4, title: 'El isótopo que falta', lab: 'masas', nodeIds: ['3.1', '1.3'],
    brief: 'Conoces la masa atómica y uno de los isótopos: deduce la masa del otro.',
    steps: [{ kind: 'ejercicio', text: 'Masa del isótopo desconocido.', build: () => unknownIsotopeGenerator.create(7, 2) }],
  },
  {
    id: 'V-5', code: 'V-5', chapter: 5, title: 'Tamaños reales', lab: 'cuantico', tab: 'orbitales', nodeIds: ['5.5', '4.2'],
    brief: '¿Cuánto mayor es un orbital 3p que un 2p? Compáralos con la misma escala y razona con proporciones.',
    steps: [
      { kind: 'lab', text: 'Compara el 2p con el 3p (botón «2p ↔ 3p»).', check: (s) => s.quantum?.n === 2 && s.quantum.l === 1 && s.quantum.compare?.n === 3 && s.quantum.compare.l === 1 },
      { kind: 'ejercicio', text: 'Razona con proporciones de Bohr.', build: () => bohrRatiosGenerator.create(5, 2) },
    ],
  },
  {
    id: 'VI-6', code: 'VI-6', chapter: 6, title: 'El ion del hierro', lab: 'arquitecto', nodeIds: ['6.8', '6.4'],
    brief: 'Los metales de transición no pierden los electrones en el orden en que los ganaron. Constrúyelo y compruébalo.',
    steps: [
      { kind: 'lab', text: 'Construye el ion Fe³⁺ en su estado fundamental (desafío «Ion Fe³⁺» o a mano).', check: (s) => s.architect?.z === 26 && s.architect.e === 23 && s.architect.status === 'fundamental' },
      { kind: 'ejercicio', text: 'Identifica un ion misterioso.', build: () => buildMysteryIon(25, 2, 55, 3, 'camp:VI-6') },
    ],
  },
  {
    id: 'VII-6', code: 'VII-6', chapter: 7, title: 'Lee la gráfica', lab: 'periodico', tab: 'tendencias', nodeIds: ['7.9', '7.13'],
    brief: 'Las excepciones a la tendencia no son errores: son pistas sobre la configuración electrónica.',
    steps: [
      { kind: 'lab', text: 'Abre la vista «Tendencias» y localiza las excepciones de la EI₁ en el periodo 3.', check: (s) => s.periodic?.view === 'tendencias' },
      { kind: 'ejercicio', text: 'Justifica las anomalías.', build: () => buildIEGraph(3, 2, 'camp:VII-6') },
    ],
  },
);

// Orden estable por capítulo: las misiones nuevas quedan al final de su capítulo, no de la campaña.
MISSIONS.sort((a, b) => a.chapter - b.chapter);

export const MISSION_BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));

export function missionsOfChapter(ch: number): Mission[] {
  return MISSIONS.filter((m) => m.chapter === ch);
}
