/**
 * Ejercicios de las fuentes de los bloques 2, 3.1, 5 y 7 (AMP 11–31, TEO 9, 19, 20 y el ejemplo del cloro).
 */
import type { Exercise } from './types';
import { buildConcept, buildAverageMassExercise, buildIonRadiusExercise, buildSubshellExercise, buildTrendOrderExercise, E, QUANTUM_CONCEPT_ITEMS, type ConceptItem } from './generators/extra';
import { choicePart } from './generators/util';
import { elementByZ } from '../science/elements';

const O = (id: string, text: string, feedback?: string) => ({ id, text, feedback });

function concept(ref: string, item: Omit<ConceptItem, 'hints'> & { hints?: [string, string, string] }): { ref: string; nodeIds: string[]; build: () => Exercise } {
  return { ref, nodeIds: item.nodes, build: () => buildConcept(item as ConceptItem, `src:${ref}`, 'fuentes', 2, undefined, ref) };
}

function elementsExercise(ref: string, title: string, statement: string, items: { prompt: string; z: number; why: string }[], nodeIds: string[]): { ref: string; nodeIds: string[]; build: () => Exercise } {
  return {
    ref,
    nodeIds,
    build: () => ({
      id: `src:${ref}`,
      generatorId: 'fuentes',
      nodeIds,
      difficulty: 2,
      title,
      statement,
      parts: items.map((it, i) => ({ id: `p${i}`, prompt: it.prompt, answer: { kind: 'element', z: it.z }, canonical: elementByZ(it.z)!.symbol, explanation: it.why, placeholder: 'símbolo o nombre' })),
      stepwise: false,
      hints: ['Escribe la configuración o busca la posición en la tabla de cada caso.', 'Grupo 1: alcalinos; 2: alcalinotérreos; 17: halógenos; 18: gases nobles.', 'El periodo coincide con la capa de valencia.'],
      solution: items.map((it) => it.why),
      source: ref,
    }),
  };
}

const tf = (ref: string, statement: string, truth: boolean, explanation: string, nodes: string[]) =>
  concept(ref, {
    q: `¿Verdadero o falso? «${statement}»`,
    options: [O('v', 'Verdadero', truth ? undefined : explanation), O('f', 'Falso', truth ? explanation : undefined)],
    correct: truth ? 'v' : 'f',
    explanation,
    nodes,
  });

export const SOURCE_EXERCISES_2 = [
  { ref: 'TEO ej. Cl (corregido)', nodeIds: ['3.1'], build: () => buildAverageMassExercise(17, 1, 'src:TEOcl', 'TEO p.5 (errata corregida: 75,771 %)', [{ a: 35, mass: 34.96885, abundance: 75.771 }, { a: 37, mass: 36.9659, abundance: 24.229 }]) },
  concept('AMP 11', QUANTUM_CONCEPT_ITEMS[0]!),
  { ref: 'AMP 13', nodeIds: ['5.4', '5.5'], build: () => buildSubshellExercise(3, 0, 1, 'src:AMP13', 'AMP 13 (3s)') },
  concept('AMP 14', {
    q: '¿Cuál de estos elementos tiene algún electrón con números cuánticos (3, 0, 0, +½)?',
    options: [O('na', 'Sodio (Z = 11)'), O('ne', 'Neón (Z = 10)', 'El neón (1s² 2s² 2p⁶) no tiene electrones en n = 3.'), O('o', 'Oxígeno (Z = 8)', 'El oxígeno solo ocupa n = 1 y n = 2.'), O('he', 'Helio (Z = 2)', 'El helio solo tiene el 1s.')],
    correct: 'na',
    explanation: '(3, 0, 0, +½) es un electrón 3s. Lo tiene cualquier elemento con Z ≥ 11 en su estado fundamental: el primero es el sodio (…3s¹).',
    nodes: ['5.4', '6.3'],
  }),
  concept('AMP 16c', {
    q: 'Elemento con una única capa de electrones que pertenece a una de estas familias: metales alcalinos, alcalinotérreos, metales de transición, halógenos o gases nobles.',
    options: [O('he', 'Helio: gas noble'), O('h', 'Hidrógeno: metal alcalino', 'El hidrógeno tiene una sola capa, pero no es un metal alcalino (es un no metal). Matiz E19.'), O('li', 'Litio: metal alcalino', 'El litio ya tiene dos capas (1s² 2s¹).')],
    correct: 'he',
    explanation: 'Solo H y He tienen una capa (n = 1). El hidrógeno, aunque está en el grupo 1, no es un metal alcalino; el helio es un gas noble (1s², capa completa).',
    nodes: ['7.4'],
  }),
  tf('AMP 18a', 'En cada orbital de tipo d es posible albergar 10 electrones.', false, 'Cada orbital (de cualquier tipo) admite como máximo 2 electrones (Pauli). Es el SUBNIVEL d, con 5 orbitales, el que admite 10.', ['6.2', '5.5']),
  tf('AMP 18b', 'En el nivel n = 3 hay tres tipos de orbitales: dos de tipo s, seis de tipo p y diez de tipo d.', false, 'Hay tres tipos (s, p y d), pero 1 orbital s, 3 orbitales p y 5 orbitales d. Los números 2, 6 y 10 son electrones, no orbitales.', ['5.5']),
  tf('AMP 18c', 'A cada elemento representativo le corresponde una configuración de la capa de valencia sin orbitales d ni f.', true, 'La capa de valencia de los representativos es nsˣ npʸ. Pueden tener orbitales d llenos en capas internas (p. ej. el Br: 3d¹⁰), pero no en la capa de valencia.', ['6.9', '7.3']),
  tf('AMP 18d', 'El número azimutal de los orbitales p puede tener tres valores, porque un orbital p puede ser esférico, elíptico o cúbico.', false, 'Los orbitales p tienen un único valor l = 1 y forma de dos lóbulos. Lo que toma tres valores es m_l (−1, 0, +1): tres orientaciones (px, py, pz).', ['5.4', '5.5']),
  elementsExercise('AMP 20', 'Cinco elementos', 'Los elementos A, B, C, D y E tienen 2, 9, 11, 12 y 13 electrones. Identifica, razonando:', [
    { prompt: 'El gas noble', z: 2, why: 'A (Z = 2): 1s², capa completa. Es el helio, un gas noble.' },
    { prompt: 'El metal alcalino', z: 11, why: 'C (Z = 11): [Ne] 3s¹. Grupo 1, periodo 3: sodio.' },
    { prompt: 'El más electronegativo', z: 9, why: 'B (Z = 9): [He] 2s² 2p⁵. El flúor es el elemento más electronegativo (χ = 3,98): pequeño, Z_ef alta y le falta un electrón para completar la capa.' },
  ], ['7.4', '7.11', '7.2']),
  elementsExercise('AMP 21', 'Por sus señas', 'Indica:', [
    { prompt: 'Metal alcalino del quinto periodo', z: 37, why: 'Grupo 1, periodo 5: rubidio ([Kr] 5s¹).' },
    { prompt: 'Halógeno del sexto periodo', z: 85, why: 'Grupo 17, periodo 6: astato.' },
    { prompt: 'Gas noble más cercano al cesio', z: 54, why: 'El cesio (Z = 55) va justo después del xenón (Z = 54): [Xe] 6s¹.' },
    { prompt: 'Metal de transición que comparte grupo con el oro y la plata', z: 29, why: 'Grupo 11: cobre, plata y oro (y roentgenio).' },
  ], ['7.4']),
  concept('AMP 22a', {
    q: '¿Cuál de estos iones es probable que se forme: Ca²⁺, Na²⁺, S²⁻ o Br²⁻?',
    options: [O('ok', 'Ca²⁺ y S²⁻'), O('na', 'Na²⁺ y Br²⁻', 'Na²⁺ exigiría arrancar un electrón de la capa interna 2p⁶; Br²⁻ tendría un electrón en la capa 5s, por encima de la configuración del Kr.'), O('todos', 'Todos', 'Solo los que alcanzan la configuración de gas noble.')],
    correct: 'ok',
    explanation: 'Ca: [Ar] 4s² → Ca²⁺ = [Ar]. S: [Ne] 3s² 3p⁴ → S²⁻ = [Ar]. Na²⁺ rompería la capa [Ne] y Br²⁻ superaría el [Kr].',
    nodes: ['7.5', '6.8'],
  }),
  concept('AMP 22b', {
    q: '¿Por qué el radio del calcio es mayor que el del bromo?',
    options: [O('ok', 'Ambos están en el periodo 4 y el Br tiene mucha más Z_ef, que contrae su nube electrónica'), O('masa', 'Porque el calcio es más pesado', 'El calcio (40 u) es más ligero que el bromo (80 u); el radio no depende de la masa.'), O('capas', 'Porque el calcio tiene más capas', 'Los dos tienen 4 capas (periodo 4).')],
    correct: 'ok',
    explanation: 'Mismo número de capas (n = 4). El bromo tiene 15 protones más y Z_ef ≈ 7,6 frente a 2,85 del calcio (Slater): sus electrones externos están mucho más atraídos. Radios covalentes: Ca 171 pm, Br 114 pm.',
    nodes: ['7.7', '7.6'],
  }),
  { ref: 'AMP 23a', nodeIds: ['7.8', '1.5'], build: () => buildIonRadiusExercise([[11, 1], [12, 2], [13, 3], [14, 4]], 3, 'src:AMP23a', 'AMP 23a') },
  { ref: 'AMP 23b', nodeIds: ['7.8'], build: () => buildIonRadiusExercise([[17, 1], [17, 0], [17, -1]], 2, 'src:AMP23b', 'AMP 23b') },
  concept('AMP 24', {
    q: 'Por su posición en la tabla, ¿cuál tiene mayor energía de ionización: silicio o cloro?',
    options: [O('cl', 'El cloro'), O('si', 'El silicio', 'Ambos están en el periodo 3; hacia la derecha aumenta la Z_ef y cuesta más arrancar un electrón.')],
    correct: 'cl',
    explanation: 'Periodo 3: el Cl (grupo 17) tiene más Z_ef y menor radio que el Si (grupo 14). EI₁: Cl 1251 kJ/mol frente a Si 787 kJ/mol.',
    nodes: ['7.9'],
  }),
  concept('AMP 25', {
    q: '¿Por qué la EI del Na (5,14 eV) es menor que la del Mg (7,64 eV)?',
    options: [O('ok', 'El Mg tiene un protón más en la misma capa: mayor Z_ef y menor radio, y su 3s² está completo'), O('masa', 'Porque el Mg es más pesado', 'La masa no interviene; lo que cuenta es la atracción núcleo-electrón.'), O('capa', 'Porque el Mg tiene una capa más', 'Ambos tienen la capa n = 3 como externa.')],
    correct: 'ok',
    explanation: 'Na: [Ne] 3s¹; Mg: [Ne] 3s². Con Slater, Z_ef(3s) = 2,20 en el Na y 2,85 en el Mg: el electrón del Mg está más atraído.',
    nodes: ['7.9', '7.6'],
  }),
  concept('AMP 26', {
    q: '«La energía de ionización del magnesio es mayor que la del calcio». ¿Cómo se explica?',
    options: [O('ok', 'El Ca tiene una capa más: su electrón externo está más lejos y más apantallado'), O('zef', 'El Ca tiene menos Z_ef porque tiene menos protones', 'El Ca tiene más protones (20 frente a 12); su Z_ef de valencia es parecida.'), O('igual', 'Es falso: deberían ser iguales', 'Están en el mismo grupo, pero en distinto periodo.')],
    correct: 'ok',
    explanation: 'Mismo grupo (2): Z_ef casi constante, pero el 4s del Ca está más lejos del núcleo que el 3s del Mg. EI₁: Mg 738 kJ/mol; Ca 590 kJ/mol.',
    nodes: ['7.9'],
  }),
  concept('AMP 27', {
    q: 'Na⁺ y Ne tienen 10 electrones. ¿Por qué la energía de ionización del Na⁺ es mayor?',
    options: [O('ok', 'El Na⁺ tiene 11 protones frente a 10: atrae más a la misma nube electrónica'), O('carga', 'Porque el Na⁺ tiene menos electrones', 'Tienen los mismos (10); la diferencia está en el núcleo.'), O('capas', 'Porque el Ne tiene una capa más', 'Ambos son 1s² 2s² 2p⁶.')],
    correct: 'ok',
    explanation: 'Especies isoelectrónicas: misma configuración; el Na⁺ tiene un protón más y una carga positiva neta. Arrancar un electrón a un ion ya positivo cuesta más: 4562 kJ/mol (2.ª EI del Na) frente a 2081 kJ/mol del Ne.',
    nodes: ['7.9', '1.5'],
  }),
  concept('AMP 28', {
    q: '¿Por qué el Sr²⁺ se forma más fácilmente que el Ca²⁺?',
    options: [O('ok', 'El Sr es más grande: sus electrones 5s están más lejos del núcleo y cuesta menos arrancarlos'), O('mas', 'El Sr tiene más protones y los retiene mejor', 'Tiene más protones, pero también más capas: la distancia pesa más.'), O('distinto', 'Porque están en grupos distintos', 'Ambos están en el grupo 2.')],
    correct: 'ok',
    explanation: 'Grupo 2: hacia abajo aumenta el radio y disminuyen la 1.ª y la 2.ª energía de ionización.',
    nodes: ['7.9', '7.5'],
  }),
  concept('AMP 29', {
    q: 'Dos átomos: 1s² 2s² 2p⁶ y 1s² 2s² 2p⁶ 3s¹. Sus primeras EI son 2080 y 496 kJ/mol. ¿Cuál corresponde a cada uno?',
    options: [O('ok', '2080 kJ/mol al Ne (1s² 2s² 2p⁶) y 496 kJ/mol al Na'), O('rev', '2080 kJ/mol al Na y 496 kJ/mol al Ne', 'Al Na se le arranca un electrón 3s solitario, muy apantallado y lejano; al Ne, uno de una capa completa.')],
    correct: 'ok',
    explanation: 'El Ne tiene la capa n = 2 completa y alta Z_ef (5,85). El Na pierde su 3s¹, apantallado por 10 electrones (Z_ef = 2,2) y más lejano.',
    nodes: ['7.9'],
  }),
  concept('AMP 30', {
    q: 'La 2.ª EI del K es unas 7 veces la 1.ª, pero en el Ca no llega al doble. ¿Por qué?',
    options: [O('ok', 'La 2.ª EI del K arranca un electrón de la capa interna [Ar] (3p); la del Ca, el segundo electrón 4s'), O('protones', 'Porque el K tiene menos protones', 'La diferencia de un protón no explica un factor 7.'), O('igual', 'Porque el K⁺ es más pequeño que el Ca⁺', 'Lo decisivo es de qué capa sale el electrón.')],
    correct: 'ok',
    explanation: 'K: [Ar] 4s¹. Tras perder el 4s, el K⁺ tiene configuración de gas noble y el siguiente electrón sale de n = 3 (mucho más atraído). Ca: [Ar] 4s². El segundo electrón todavía es 4s. Datos: K 419 → 3052 kJ/mol; Ca 590 → 1145 kJ/mol.',
    nodes: ['7.9'],
  }),
  concept('AMP 31', {
    q: 'A (Z = 11), B (Z = 17) y C (Z = 19) tienen EI₁ de 1251, 496 y 419 kJ/mol (en otro orden). Asigna y di cuál tiene mayor radio.',
    options: [O('ok', 'Na 496, Cl 1251, K 419; el de mayor radio es el K'), O('ord', 'Na 1251, Cl 496, K 419; mayor radio el Cl', 'El Cl está a la derecha del periodo 3: alta EI y radio pequeño.'), O('na', 'Na 419, Cl 1251, K 496; mayor radio el Na', 'El K está debajo del Na (una capa más): menor EI y mayor radio.')],
    correct: 'ok',
    explanation: 'Cl (periodo 3, grupo 17): Z_ef alta → 1251. Na y K (grupo 1): el K tiene una capa más → menor EI (419) y mayor radio.',
    nodes: ['7.9', '7.7'],
  }),
  { ref: 'TEO ej. 9a', nodeIds: ['7.7'], build: () => buildTrendOrderExercise('radio', [E('P'), E('S'), E('Cl')], 2, 'src:TEO9a', 'TEO ej. 9a') },
  { ref: 'TEO ej. 9b', nodeIds: ['7.10'], build: () => buildTrendOrderExercise('ae', [E('P'), E('S'), E('Cl')], 2, 'src:TEO9b', 'TEO ej. 9b') },
  {
    ref: 'TEO ej. 19b',
    nodeIds: ['7.9', '1.5'],
    build: (): Exercise => ({
      id: 'src:TEO19b',
      generatorId: 'fuentes',
      nodeIds: ['7.9', '1.5'],
      difficulty: 2,
      title: 'Isoelectrónicos e ionización',
      statement: 'Cl⁻, Ar, S²⁻ y K⁺ son isoelectrónicos (18 e⁻). Ordénalos de **menor a mayor** potencial de ionización.',
      parts: [
        {
          id: 'orden',
          prompt: 'De menor a mayor energía de ionización',
          answer: { kind: 'order', items: ['S²⁻', 'Cl⁻', 'Ar', 'K⁺'].map((s) => ({ id: s, text: s, feedback: 'Con los mismos electrones, cuantos más protones, más atraídos están y más cuesta arrancar uno.' })), correctOrder: ['S²⁻', 'Cl⁻', 'Ar', 'K⁺'] },
          canonical: 'S²⁻ < Cl⁻ < Ar < K⁺',
          explanation: 'Protones: S 16, Cl 17, Ar 18, K 19. Mismos 18 electrones: el K⁺ los atrae con más fuerza. Datos: Cl⁻ → 349 kJ/mol (la AE del Cl); Ar 1521; K⁺ 3052. El S²⁻ ni siquiera es estable aislado.',
        },
      ],
      stepwise: false,
      hints: ['Todos tienen 18 electrones: ¿qué cambia entre ellos?', 'Cuenta los protones de cada especie.', 'Más protones para los mismos electrones → más energía para arrancar uno.'],
      solution: ['S²⁻ < Cl⁻ < Ar < K⁺ (de menos a más protones).'],
      source: 'TEO ej. 19b',
    }),
  },
  {
    ref: 'TEO ej. 20c',
    nodeIds: ['7.10', '7.13'],
    build: (): Exercise => ({
      id: 'src:TEO20c',
      generatorId: 'fuentes',
      nodeIds: ['7.10', '7.13'],
      difficulty: 3,
      title: 'Afinidad electrónica: tendencia y realidad',
      statement: 'Según la **tendencia general** (como pide el ejercicio), ordena por afinidad electrónica creciente: Zn, Mn, P, Cl y Rb (Z = 30, 25, 15, 17, 37).',
      parts: [
        {
          id: 'orden',
          prompt: 'De menor a mayor AE (según la tendencia)',
          answer: { kind: 'order', items: ['Rb', 'Mn', 'Zn', 'P', 'Cl'].map((s) => ({ id: s, text: s, feedback: 'La AE crece hacia arriba y hacia la derecha: Rb (periodo 5, grupo 1) es el más bajo; Cl, el más alto.' })), correctOrder: ['Rb', 'Mn', 'Zn', 'P', 'Cl'] },
          canonical: 'Rb < Mn < Zn < P < Cl',
          explanation: 'Por tendencia (TEO p.23): Rb < Mn < Zn < P < Cl. Matiz (errata E13): experimentalmente Mn y Zn NO forman aniones estables (AE ≤ 0, por sus subniveles 3d⁵ y 3d¹⁰), así que su AE real es menor que la del Rb (46,9 kJ/mol). Datos: P 72, Cl 349 kJ/mol.',
        },
      ],
      stepwise: false,
      hints: ['Escribe la posición de cada uno: periodo y grupo.', 'La AE aumenta hacia la derecha y hacia arriba.', 'Los no metales del periodo 3 (P, Cl) quedan al final; el alcalino del periodo 5, al principio.'],
      solution: ['Tendencia: Rb < Mn < Zn < P < Cl.', 'Datos reales: Mn, Zn (≈ 0) < Rb < P < Cl.'],
      source: 'TEO ej. 20c',
    }),
  },
  {
    ref: 'AMP 13 · tipo',
    nodeIds: ['5.4'],
    build: () => buildConcept({ ...QUANTUM_CONCEPT_ITEMS[3]!, q: QUANTUM_CONCEPT_ITEMS[3]!.q }, 'src:AMP13b', 'fuentes', 1, undefined, 'AMP 13'),
  },
  {
    ref: 'AMP 16',
    nodeIds: ['7.4'],
    build: (): Exercise => ({
      id: 'src:AMP16',
      generatorId: 'fuentes',
      nodeIds: ['7.4'],
      difficulty: 1,
      title: 'Familias',
      statement: 'Indica a qué categoría pertenece cada uno: metales alcalinos, alcalinotérreos, metales de transición, halógenos o gases nobles.',
      parts: [
        ['Cloro', 'hal', 'Grupo 17: halógeno ([Ne] 3s² 3p⁵).'],
        ['Elemento con Z = 2', 'gn', 'Helio, 1s²: gas noble.'],
        ['Elemento con Z = 11', 'alc', 'Sodio, [Ne] 3s¹: metal alcalino.'],
      ].map(([p, c, why], i) =>
        choicePart(`p${i}`, p!, [O('alc', 'Metal alcalino'), O('alct', 'Alcalinotérreo'), O('tr', 'Metal de transición'), O('hal', 'Halógeno'), O('gn', 'Gas noble')].map((o) => ({ ...o, feedback: why })), [c!], why!),
      ),
      stepwise: false,
      hints: ['Escribe la configuración de cada uno.', 'La familia la da el grupo: 1, 2, 3–12, 17 o 18.', 'ns¹ → alcalino; ns² np⁵ → halógeno; capa completa → gas noble.'],
      solution: ['Cl: halógeno · Z = 2 (He): gas noble · Z = 11 (Na): alcalino.'],
      source: 'AMP 16',
    }),
  },
];
