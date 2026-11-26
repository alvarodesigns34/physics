/**
 * Ejercicios de las fuentes añadidas en la segunda generación:
 * - AMP 2–5: todas las filas de las tablas (antes solo 8 de 27), con las casillas originales.
 * - HOJ: hoja de ejercicios del tema (1–28) y tres cuestiones EBAU de La Rioja (julio 2021 y 2025),
 *   reproducidas con sus datos. Las soluciones se calculan; las del alumno solo se usaron como referencia
 *   de los errores típicos.
 */
import type { Exercise, ExercisePart } from './types';
import { THEORY_DATA } from '../science/constants';
import { elementByZ } from '../science/elements';
import { ionSymbol, nuclearNotation, type Species } from '../science/nucleus';
import { diagnoseConfiguration, formatConfiguration, speciesConfiguration, STATUS_LABEL } from '../science/configuration';
import { validateQuantumSet } from '../science/quantum';
import { choicePart, integerPart } from './generators/util';
import { buildReverseSpeciesExercise, buildSpeciesExercise } from './generators/nucleus';
import { buildAverageMassExercise, buildConcept } from './generators/extra';
import { buildInverseSeriesExercise, buildRydbergExercise, buildWaveExercise } from './generators/photon';
import { buildFixedQuantum } from './generators/electrons';

export interface SourceExercise3 {
  ref: string;
  nodeIds: string[];
  build: () => Exercise;
  /** Nivel orientativo: 1 básico, 2 examen, 3 avanzado */
  level: 1 | 2 | 3;
}

const O = (id: string, text: string, feedback?: string) => ({ id, text, feedback });
const sp = (z: number, a: number, q = 0): Species => ({ z, n: a - z, e: z - q });

function ex(ref: string, nodeIds: string[], level: 1 | 2 | 3, title: string, statement: string, parts: ExercisePart[], hints: [string, string, string], extra: Partial<Exercise> = {}): SourceExercise3 {
  return {
    ref,
    nodeIds,
    level,
    build: () => ({ id: `src:${ref}`, generatorId: 'fuentes', nodeIds, difficulty: level, title, statement, parts, stepwise: false, hints, solution: parts.map((p) => p.explanation), source: ref, ...extra }),
  };
}

function configPart(id: string, z: number, e: number, label?: string): ExercisePart {
  const conf = speciesConfiguration(z, e);
  const el = elementByZ(z)!;
  const name = ionSymbol(el.symbol, z - e);
  return {
    id,
    prompt: label ?? `Configuración de ${name} (${e} e⁻)`,
    answer: { kind: 'config', electrons: e, z },
    canonical: formatConfiguration(conf),
    explanation: `${name}: ${formatConfiguration(conf)} (abreviada: ${formatConfiguration(conf, { abbreviate: true })}).${e !== z ? (e > z ? ' Un anión añade electrones al siguiente hueco.' : ' Un catión pierde primero los electrones de la capa más externa.') : ''}`,
    placeholder: 'p. ej. 1s2 2s2 2p6 o [Ne] 3s2',
  };
}

// ── Filas de tablas (AMP 2–5, HOJ 4, HOJ 5, EBAU-3b) ─────────────────────

type Field = 'z' | 'a' | 'p' | 'n' | 'e' | 'q' | 'el';
const FIELD_LABEL: Record<Field, string> = { z: 'Número atómico Z', a: 'Número másico A', p: 'Protones', n: 'Neutrones', e: 'Electrones', q: 'Carga (con signo)', el: 'Elemento (símbolo o nombre)' };

/**
 * Fila de una tabla «Completa la siguiente tabla»: `given` son las casillas que da el enunciado (texto) y se
 * preguntan solo las vacías. Las explicaciones muestran la relación que se usa en cada casilla.
 */
function tableRow(ref: string, s: Species, given: string, ask: Field[], level: 1 | 2 | 3 = 1, note?: string): SourceExercise3 {
  const el = elementByZ(s.z)!;
  const a = s.z + s.n;
  const q = s.z - s.e;
  const value: Record<Field, number> = { z: s.z, a, p: s.z, n: s.n, e: s.e, q, el: s.z };
  const why: Record<Field, string> = {
    z: `Z = número de protones = ${s.z} (${el.name}).`,
    a: `A = Z + N = ${s.z} + ${s.n} = ${a}.`,
    p: `Protones = Z = ${s.z}.`,
    n: `N = A − Z = ${a} − ${s.z} = ${s.n}.`,
    e: q === 0 ? `Átomo neutro: electrones = protones = ${s.e}.` : `e⁻ = Z − carga = ${s.z} − (${q > 0 ? '+' : '−'}${Math.abs(q)}) = ${s.e}.`,
    q: `Carga = protones − electrones = ${s.z} − ${s.e} = ${q > 0 ? '+' : ''}${q}.`,
    el: `Z = ${s.z} → ${el.name} (${el.symbol}).`,
  };
  const parts: ExercisePart[] = ask.map((f) =>
    f === 'el'
      ? { id: f, prompt: FIELD_LABEL[f], answer: { kind: 'element', z: s.z }, canonical: el.symbol, explanation: why[f], placeholder: 'p. ej. Na', nodeIds: ['1.1'] }
      : { ...integerPart(f, FIELD_LABEL[f], value[f], why[f], f === 'q' ? 'p. ej. +2, −1 o 0' : 'número entero'), nodeIds: f === 'n' || f === 'a' ? ['1.2'] : f === 'e' || f === 'q' ? [q === 0 ? '1.1' : '1.4'] : ['1.1'] },
  );
  return ex(ref, q === 0 ? ['1.1', '1.2'] : ['1.1', '1.2', '1.4'], level, `Completa la fila: ${given}`, `Datos de la fila: **${given}**. Completa las casillas vacías.${note ? `\n${note}` : ''}`, parts, ['El elemento lo decide Z (protones). A = Z + N.', 'Electrones = Z − carga (un anión tiene carga negativa: suma electrones).', `Fila completa: ${nuclearNotation(s)}.`]);
}

const AMP_ROWS: SourceExercise3[] = [
  tableRow('AMP 2 · U', sp(92, 238), 'U · Z = 92 · A = 238', ['p', 'n', 'e']),
  tableRow('AMP 3 · B', sp(5, 11), 'B · Z = 5 · A = 11', ['el', 'p', 'n', 'e']),
  tableRow('AMP 3 · Al', sp(13, 27), 'Aluminio · protones = 13 · electrones = 13', ['el', 'z', 'q'], 1, 'A y los neutrones no se pueden deducir con estos datos (faltan los neutrones): en clase se toma el isótopo más abundante, ²⁷Al.'),
  tableRow('AMP 3 · Ar', sp(18, 40), 'Argón · Z = 18 · A = 40 · electrones = 18', ['el', 'p', 'n']),
  tableRow('AMP 3 · Be', sp(4, 9), 'Be · A = 9 · neutrones = 5', ['z', 'p', 'e']),
  tableRow('AMP 3 · Ba', sp(56, 131), 'Ba · A = 131 · electrones = 56', ['z', 'p', 'n']),
  tableRow('AMP 3 · U', sp(92, 235), 'Uranio · protones = 92 · neutrones = 143', ['el', 'z', 'a', 'e']),
  tableRow('AMP 3 · Sr', sp(38, 90), 'Estroncio · Z = 38 · neutrones = 52', ['el', 'a', 'p', 'e']),
  tableRow('AMP 3 · P', sp(15, 32), 'Fósforo · A = 32 · protones = 15', ['el', 'z', 'n', 'e']),
  { ref: 'AMP 4 · Cl⁻', nodeIds: ['1.4'], level: 1, build: () => buildSpeciesExercise(sp(17, 35, -1), 1, 'src:AMP4cl', 'AMP 4') },
  { ref: 'AMP 4 · Ca²⁺', nodeIds: ['1.4'], level: 1, build: () => buildSpeciesExercise(sp(20, 40, 2), 1, 'src:AMP4ca', 'AMP 4') },
  { ref: 'AMP 4 · K⁺', nodeIds: ['1.4'], level: 1, build: () => buildSpeciesExercise(sp(19, 39, 1), 1, 'src:AMP4k', 'AMP 4') },
  tableRow('AMP 5 · Cloro', sp(17, 35), 'Cloro · Z = 17 · neutrones = 18 · electrones = 17', ['a', 'p', 'q']),
  tableRow('AMP 5 · ³⁹K', sp(19, 39), '³⁹₁₉K', ['el', 'z', 'a', 'p', 'n', 'e', 'q']),
  tableRow('AMP 5 · Argón', sp(18, 40), 'Argón · Z = 18 · A = 40 · electrones = 18', ['p', 'n', 'q']),
  tableRow('AMP 5 · Ion cloruro', sp(17, 35, -1), 'Ion cloruro · Z = 17 · A = 35', ['p', 'n', 'e', 'q'], 2),
  tableRow('AMP 5 · ²⁰⁰Hg', sp(80, 200), '²⁰⁰₈₀Hg', ['el', 'p', 'n', 'e', 'q']),
  tableRow('AMP 5 · Cesio', sp(55, 133), 'Cesio · A = 133 · protones = 55', ['z', 'n', 'e', 'q']),
  tableRow('AMP 5 · Ion sulfuro', sp(16, 32, -2), 'Ion sulfuro · ³²₁₆S²⁻', ['z', 'a', 'p', 'n', 'e', 'q'], 2),
];

// ── Hoja de ejercicios del tema (HOJ) ─────────────────────────────────────

const HOJ: SourceExercise3[] = [
  {
    ref: 'HOJ 1',
    nodeIds: ['2.6', '1.6'],
    level: 1,
    build: () =>
      buildConcept(
        {
          q: '¿Cómo se llegó a la conclusión de que debían existir los neutrones?',
          options: [
            O('masa', 'La masa de los átomos era mayor que la de sus protones y un núcleo solo de protones no se mantendría unido: debía haber otra partícula, sin carga, en el núcleo'),
            O('carga', 'Los átomos tenían más carga positiva de la esperada', 'Al contrario: la carga del núcleo la explican por completo los protones; lo que no cuadraba era la masa.'),
            O('espectro', 'Por los espectros de líneas del hidrógeno', 'Los espectros llevaron al modelo de Bohr, no al neutrón.'),
            O('electron', 'Por el tubo de rayos catódicos', 'El tubo de rayos catódicos llevó al descubrimiento del electrón (Thomson, 1897).'),
          ],
          correct: 'masa',
          explanation: 'La masa de los átomos (salvo el hidrógeno) es aproximadamente el doble o más de la de sus protones, y los protones se repelen. Rutherford propuso en 1920 una partícula neutra en el núcleo; Chadwick la detectó en 1932. La fuerza nuclear fuerte entre nucleones mantiene unido el núcleo.',
          nodes: ['2.6', '1.6'],
        },
        'src:HOJ1',
        'fuentes',
        1,
        undefined,
        'HOJ 1',
      ),
  },
  { ref: 'HOJ 2', nodeIds: ['1.1', '1.2', '1.4'], level: 1, build: () => ({ ...buildReverseSpeciesExercise(sp(26, 56, 3), 1, 'src:HOJ2', 'HOJ 2'), statement: 'El ion de carga **+3** de un átomo contiene **26 protones** y **30 neutrones**. Indica sus números másico y atómico y la cantidad de electrones que presenta.', parts: [integerPart('a', 'Número másico A', 56, 'A = Z + N = 26 + 30 = 56.'), integerPart('z', 'Número atómico Z', 26, 'Z = protones = 26 (hierro).'), integerPart('e', 'Electrones', 23, 'Carga +3: ha perdido 3 electrones → e⁻ = 26 − 3 = 23.')] }) },
  { ref: 'HOJ 3', nodeIds: ['1.1', '1.2', '1.4'], level: 1, build: () => ({ ...buildReverseSpeciesExercise(sp(17, 35, -1), 1, 'src:HOJ3', 'HOJ 3'), statement: 'Un **anión monovalente** de un átomo contiene **17 protones** y **18 neutrones**. Indica sus números atómico y másico y la cantidad de electrones.', parts: [integerPart('z', 'Número atómico Z', 17, 'Z = protones = 17 (cloro).'), integerPart('a', 'Número másico A', 35, 'A = 17 + 18 = 35.'), integerPart('e', 'Electrones', 18, 'Anión monovalente (carga −1): ha ganado 1 electrón → 17 + 1 = 18.')] }) },
  tableRow('HOJ 4 · ³H', sp(1, 3), '³H · Z = 1', ['a', 'p', 'n', 'e']),
  tableRow('HOJ 4 · ¹⁴C', sp(6, 14), '¹⁴C · electrones = 6', ['z', 'a', 'p', 'n']),
  tableRow('HOJ 4 · Z = 8', sp(8, 18), 'Z = 8 · neutrones = 10', ['el', 'a', 'p', 'e'], 1, 'Es un isótopo del oxígeno (¹⁸O). Otros isótopos estables del oxígeno: ¹⁶O y ¹⁷O.'),
  tableRow('HOJ 4 · ²³⁵U', sp(92, 235), '²³⁵₉₂U', ['p', 'n', 'e']),
  tableRow('HOJ 4 · Z = 17', sp(17, 37), 'Z = 17 · neutrones = 20', ['el', 'a', 'p', 'e'], 1, 'Es el ³⁷Cl; el otro isótopo natural del cloro es el ³⁵Cl.'),
  tableRow('HOJ 5 · Mg²⁺', sp(12, 26, 2), '²⁶₁₂Mg²⁺', ['z', 'a', 'p', 'e', 'n']),
  tableRow('HOJ 5 · S²⁻', sp(16, 32, -2), 'S²⁻ · electrones = 18 · neutrones = 16', ['z', 'a', 'p'], 2),
  tableRow('HOJ 5 · Fe³⁺', sp(26, 56, 3), 'Fe³⁺ · electrones = 23 · neutrones = 30', ['z', 'a', 'p'], 2),
  tableRow('HOJ 5 · Br⁻', sp(35, 80, -1), 'Br⁻ · A = 80 · electrones = 36', ['z', 'p', 'n'], 2),
  tableRow('HOJ 5 · Pb²⁺', sp(82, 207, 2), 'Pb²⁺ · Z = 82 · A = 207', ['p', 'e', 'n']),
  {
    ref: 'HOJ 6',
    nodeIds: ['3.1', '1.3'],
    level: 1,
    build: () => ({
      ...buildAverageMassExercise(31, 1, 'src:HOJ6', 'HOJ 6', [
        { a: 69, mass: 69, abundance: 60.1 },
        { a: 71, mass: 71, abundance: 39.9 },
      ]),
      statement: 'El galio natural está constituido por una mezcla de dos isótopos estables de números másicos **69** y **71**. El primero tiene una abundancia del **60,1 %** y el segundo del **39,9 %**. Calcula la masa atómica media del galio (toma la masa de cada isótopo igual a su número másico).',
    }),
  },
  {
    ref: 'HOJ 7',
    nodeIds: ['3.1', '1.3'],
    level: 2,
    build: () => ({
      ...buildAverageMassExercise(17, 3, 'src:HOJ7', 'HOJ 7', [
        { a: 35, mass: 35, abundance: 75 },
        { a: 37, mass: 37, abundance: 25 },
      ]),
      statement: 'En la naturaleza se encuentran dos isótopos del cloro, **³⁵Cl** y **³⁷Cl**. Deduce la proporción en que ambos forman parte del cloro natural, sabiendo que la masa atómica del elemento es **35,5 u** (toma la masa de cada isótopo igual a su número másico).',
    }),
  },
  {
    ref: 'HOJ 8',
    nodeIds: ['3.2', '3.3', '3.4'],
    level: 1,
    build: () => {
      const e = buildWaveExercise({ value: 200, unit: 'nm' }, 1, 'src:HOJ8', 'HOJ 8');
      return { ...e, statement: 'Una «estación de radio» emite con una **λ = 200 nm**. Calcula la frecuencia y la energía de los fotones irradiados.\n*Nota de rigor: con 200 nm no es radio sino ultravioleta (las emisoras usan λ de metros); el último apartado te lo hará comprobar.*' };
    },
  },
  { ref: 'HOJ 9', nodeIds: ['3.2', '3.4'], level: 1, build: () => ({ ...buildWaveExercise({ value: 425, unit: 'nm' }, 1, 'src:HOJ9', 'HOJ 9'), statement: 'Las clorofilas a y b absorben sobre todo luz de las zonas roja y azul y reflejan la verde. ¿Cuál es la energía y la frecuencia de una radiación de **425 nm** absorbida por la clorofila a?', originalSolution: '4,68·10⁻¹⁹ J y 7,06·10¹⁴ Hz' }) },
  { ref: 'HOJ 10', nodeIds: ['3.6', '3.7'], level: 2, build: () => ({ ...buildRydbergExercise({ from: 5, to: 2, difficulty: 1, seedId: 'src:HOJ10', source: 'HOJ 10', rUnit: 'm', k: THEORY_DATA }), statement: 'Determina la longitud de onda de la línea de la serie de **Balmer** del hidrógeno correspondiente a la transición de la **tercera línea**. Dato: R = 1,097·10⁷ m⁻¹.', originalSolution: '4,341·10⁻⁷ m' }) },
  { ref: 'HOJ 11', nodeIds: ['3.6', '3.7'], level: 3, build: () => buildInverseSeriesExercise(2, 8, 2, 'src:HOJ11', 'HOJ 11', undefined, { lambdaNm: 389, k: THEORY_DATA }) },
  ex('HOJ 12', ['6.3', '7.2', '7.5'], 1, 'Un elemento por su configuración', 'Dado el elemento cuya configuración electrónica es **1s² 2s² 2p⁶ 3s² 3p⁴**:', [
    integerPart('per', 'a) Periodo', 3, 'La capa más externa es n = 3 → periodo 3.'),
    integerPart('gr', 'a) Grupo', 16, '6 electrones de valencia (3s² 3p⁴): ns² np⁴ → grupo 16 (anfígenos). Es el azufre.'),
    configPart('ion', 16, 18, 'b) Configuración de su ion más estable'),
  ], ['El periodo es el n más alto; el grupo sale de los electrones de valencia.', 'ns² np⁴ → grupo 16. Le faltan 2 electrones para el gas noble.', 'S²⁻ tiene 18 electrones: la configuración del argón.']),
  ex('HOJ 13', ['7.1', '7.2'], 1, 'Mismo periodo, mismo grupo', 'Dados A (Z = 17), B (Z = 19), C (Z = 35) y D (Z = 11), justifica cuáles:', [
    choicePart('per', 'a) Se encuentran en el mismo periodo (marca las parejas)', [O('AD', 'A y D (periodo 3)'), O('BC', 'B y C (periodo 4)'), O('AC', 'A y C', 'A (n = 3) y C (n = 4) están en el mismo grupo, no en el mismo periodo.'), O('BD', 'B y D', 'B y D están en el mismo grupo (1).')], ['AD', 'BC'], 'A = Cl y D = Na tienen la capa de valencia n = 3; B = K y C = Br, n = 4.', true),
    choicePart('gr', 'b) Se encuentran en el mismo grupo (marca las parejas)', [O('BD', 'B y D (grupo 1)'), O('AC', 'A y C (grupo 17)'), O('AD', 'A y D', 'Comparten periodo, no grupo.'), O('BC', 'B y C', 'Comparten periodo, no grupo.')], ['BD', 'AC'], 'B (K) y D (Na) terminan en ns¹ (alcalinos); A (Cl) y C (Br), en ns² np⁵ (halógenos).', true),
  ], ['Escribe la configuración de valencia de cada uno.', 'Mismo n de valencia → mismo periodo; misma configuración de valencia → mismo grupo.', 'A = Cl, B = K, C = Br, D = Na.']),
  ex('HOJ 14', ['7.2', '7.3', '7.4'], 2, 'Grupo a partir de la capa de valencia', 'Para cada configuración de la capa más externa, identifica el **grupo** y el **primer elemento** del grupo (con su periodo).', [
    integerPart('ag', 'a) ns² np⁴ · grupo', 16, '2 + 4 = 6 electrones de valencia en el bloque p → grupo 12 + 4 = 16.'),
    { id: 'ae', prompt: 'a) Primer elemento del grupo', answer: { kind: 'element', z: 8 }, canonical: 'O', explanation: 'Oxígeno (Z = 8), periodo 2: 2s² 2p⁴.', placeholder: 'símbolo' },
    integerPart('bg', 'b) ns² np¹ · grupo', 13, 'Bloque p con 1 electrón p → grupo 13 (térreos).'),
    { id: 'be', prompt: 'b) Primer elemento del grupo', answer: { kind: 'element', z: 5 }, canonical: 'B', explanation: 'Boro (Z = 5), periodo 2.', placeholder: 'símbolo' },
    integerPart('cg', 'c) ns² · grupo', 2, 'Bloque s con 2 electrones → grupo 2 (alcalinotérreos). Matiz: el helio (1s²) también termina en ns², pero es un gas noble (grupo 18) porque su capa n = 1 está llena.'),
    { id: 'ce', prompt: 'c) Primer elemento del grupo', answer: { kind: 'element', z: 4 }, canonical: 'Be', explanation: 'Berilio (Z = 4), periodo 2.', placeholder: 'símbolo' },
    integerPart('dg', 'd) ns² np⁵ · grupo', 17, 'Bloque p con 5 electrones p → grupo 17 (halógenos).'),
    { id: 'de', prompt: 'd) Primer elemento del grupo', answer: { kind: 'element', z: 9 }, canonical: 'F', explanation: 'Flúor (Z = 9), periodo 2.', placeholder: 'símbolo' },
  ], ['Bloque s: grupo = nº de electrones s. Bloque p: grupo = 12 + nº de electrones p.', 'El primer elemento de un grupo del bloque p está en el periodo 2.', 'O, B, Be y F.']),
  ex('HOJ 15', ['6.3', '7.2'], 1, 'Tres átomos del periodo 3', 'Considera A (Z = 11), B (Z = 14) y C (Z = 17). Para cada uno: configuración, grupo y periodo, y nombre.', [
    configPart('ca', 11, 11, 'A (Z = 11) · configuración'),
    integerPart('ga', 'A · grupo', 1, 'Na: [Ne] 3s¹ → grupo 1, periodo 3 (sodio).'),
    configPart('cb', 14, 14, 'B (Z = 14) · configuración'),
    integerPart('gb', 'B · grupo', 14, 'Si: [Ne] 3s² 3p² → grupo 14, periodo 3 (silicio).'),
    configPart('cc', 17, 17, 'C (Z = 17) · configuración'),
    integerPart('gc', 'C · grupo', 17, 'Cl: [Ne] 3s² 3p⁵ → grupo 17, periodo 3 (cloro).'),
  ], ['Rellena con el diagrama de Möller hasta Z electrones.', 'Los tres acaban en n = 3: periodo 3.', 'Na, Si y Cl.']),
  ex('HOJ 16', ['5.6', '5.5'], 1, 'Estados cuánticos por nivel', 'Indica cuántos **estados cuánticos** (n, l, m_l, m_s) hay para los electrones situados en n = 1, 2 y 3.', [
    integerPart('n1', 'n = 1', 2, 'l = 0, m = 0, s = ±½ → 2 estados (1s).'),
    integerPart('n2', 'n = 2', 8, '2s (2) + 2p (6) = 8 = 2·2².'),
    integerPart('n3', 'n = 3', 18, '3s (2) + 3p (6) + 3d (10) = 18 = 2·3².'),
  ], ['Cada orbital (n, l, m) admite 2 estados (m_s = ±½).', 'Un nivel n tiene n² orbitales.', 'Estados = 2n².']),
  ex('HOJ 17', ['6.3', '6.8', '1.5'], 2, 'Átomos e iones del periodo 2', 'Dados C, N, N³⁻, O, O²⁻, F, F⁻, Na y Na⁺: a) escribe su configuración; b) ¿qué observas en las configuraciones de N³⁻, O²⁻, F⁻ y Na⁺?', [
    configPart('c', 6, 6),
    configPart('n', 7, 7),
    configPart('n3', 7, 10),
    configPart('o', 8, 8),
    configPart('o2', 8, 10),
    configPart('f', 9, 9),
    configPart('f1', 9, 10),
    configPart('na', 11, 11),
    configPart('na1', 11, 10),
    choicePart('obs', 'b) ¿Qué tienen en común N³⁻, O²⁻, F⁻ y Na⁺?', [O('iso', 'Son isoelectrónicos: 10 electrones y la configuración del neón'), O('z', 'Tienen el mismo número de protones', 'Cada uno tiene su Z (7, 8, 9 y 11): lo que comparten son los electrones.'), O('rad', 'Tienen el mismo radio', 'Al tener distinto Z, el radio disminuye al aumentar Z: N³⁻ > O²⁻ > F⁻ > Na⁺.')], ['iso'], 'Los cuatro tienen 10 electrones: 1s² 2s² 2p⁶ = [Ne]. Son especies isoelectrónicas con el neón.'),
  ], ['Anión: suma electrones; catión: resta.', 'N³⁻, O²⁻, F⁻ y Na⁺ tienen todos 10 electrones.', '10 electrones = 1s² 2s² 2p⁶.']),
  ex('HOJ 18', ['6.1', '6.4'], 1, 'Diagramas de orbitales', 'Dibuja el diagrama de orbitales del **Mg**, el **P** y el **S** (aquí: configuración y electrones desapareados).', [
    configPart('mg', 12, 12),
    integerPart('umg', 'Mg · electrones desapareados', 0, '3s²: el orbital 3s está lleno → 0 desapareados.'),
    configPart('p', 15, 15),
    integerPart('up', 'P · electrones desapareados', 3, '3p³: por la regla de Hund, un electrón en cada orbital p con espines paralelos → 3.'),
    configPart('s', 16, 16),
    integerPart('us', 'S · electrones desapareados', 2, '3p⁴: un orbital p con 2 electrones y dos con 1 → 2 desapareados.'),
  ], ['Rellena las cajas de menor a mayor energía.', 'Hund: en el subnivel p, primero un electrón en cada caja con el mismo espín.', 'Mg 0, P 3, S 2.']),
  {
    ref: 'HOJ 19',
    nodeIds: ['7.8', '1.5'],
    level: 2,
    build: () => ({
      id: 'src:HOJ19',
      generatorId: 'fuentes',
      nodeIds: ['7.8', '1.5'],
      difficulty: 2,
      title: 'Serie isoelectrónica por tamaño',
      statement: 'Clasifica de **menor a mayor radio**: N³⁻, O²⁻, F⁻, Ne, Na⁺, Mg²⁺.',
      parts: [
        {
          id: 'ord',
          prompt: 'De menor a mayor radio',
          answer: { kind: 'order', items: ['N³⁻', 'O²⁻', 'F⁻', 'Ne', 'Na⁺', 'Mg²⁺'].map((t) => O(t, t, 'Todos tienen 10 electrones: manda el número de protones. Más Z → más atracción → menor tamaño.')), correctOrder: ['Mg²⁺', 'Na⁺', 'Ne', 'F⁻', 'O²⁻', 'N³⁻'] },
          canonical: 'Mg²⁺ < Na⁺ < Ne < F⁻ < O²⁻ < N³⁻',
          explanation: 'Son isoelectrónicos (10 e⁻). Con el mismo número de electrones, el que tiene más protones (Mg, Z = 12) los atrae más y es el más pequeño; el N³⁻ (Z = 7), el mayor. Matiz: el radio del Ne no es iónico (es un átomo neutro), pero en clase se ordena con la misma regla.',
        },
      ],
      stepwise: false,
      hints: ['Cuenta los electrones de cada especie.', 'Si tienen los mismos electrones, compara los protones.', 'Mayor Z → menor radio.'],
      solution: ['Mg²⁺ < Na⁺ < Ne < F⁻ < O²⁻ < N³⁻ (Z = 12, 11, 10, 9, 8, 7).'],
      source: 'HOJ 19',
    }),
  },
  ex('HOJ 20', ['7.11', '7.12'], 2, 'Electronegatividad de cinco elementos', 'Ordena de **mayor a menor electronegatividad** los elementos de números atómicos 1, 6, 9, 19 y 55. ¿Cuáles son metales y cuáles no metales?', [
    { id: 'ord', prompt: 'De mayor a menor electronegatividad', answer: { kind: 'order', items: [O('9', 'F (Z = 9)'), O('6', 'C (Z = 6)'), O('1', 'H (Z = 1)'), O('19', 'K (Z = 19)'), O('55', 'Cs (Z = 55)')].map((o) => ({ ...o, feedback: 'La electronegatividad crece hacia la derecha y hacia arriba: F es el máximo; los alcalinos (K, Cs), los mínimos, y disminuye al bajar en el grupo.' })), correctOrder: ['9', '6', '1', '19', '55'] }, canonical: 'F > C > H > K > Cs', explanation: 'Pauling: F 3,98 > C 2,55 > H 2,20 > K 0,82 > Cs 0,79.' },
    choicePart('met', 'Marca los metales', [O('1', 'H', 'El hidrógeno es un no metal aunque esté en el grupo 1.'), O('6', 'C', 'El carbono es un no metal.'), O('9', 'F', 'El flúor es el no metal más electronegativo.'), O('19', 'K'), O('55', 'Cs')], ['19', '55'], 'K y Cs son metales alcalinos (baja electronegatividad); H, C y F son no metales.', true),
  ], ['Identifica cada elemento por su Z.', 'Electronegatividad: crece hacia la derecha y hacia arriba.', 'F > C > H > K > Cs.']),
  {
    ref: 'HOJ 21',
    nodeIds: ['5.3'],
    level: 1,
    build: () =>
      buildConcept(
        {
          q: '¿Cuál es la diferencia entre órbita y orbital?',
          options: [
            O('ok', 'La órbita (Bohr) es una trayectoria definida; el orbital es la región donde es más probable encontrar al electrón, porque el principio de incertidumbre impide conocer su trayectoria'),
            O('tam', 'El orbital es una órbita más grande', 'No es una cuestión de tamaño: un orbital no es una trayectoria.'),
            O('igual', 'Son sinónimos', 'Pertenecen a modelos distintos (Bohr frente al mecanocuántico).'),
          ],
          correct: 'ok',
          explanation: 'Órbita: camino circular y plano con energía fija (modelo de Bohr). Orbital: función matemática que describe la región tridimensional de alta probabilidad (se suele dibujar la que encierra el 90 %), consecuencia del principio de incertidumbre de Heisenberg.',
          nodes: ['5.3'],
        },
        'src:HOJ21',
        'fuentes',
        1,
        undefined,
        'HOJ 21',
      ),
  },
  ex('HOJ 22', ['6.1', '6.4'], 1, '¿Qué átomo es?', 'Diagramas de orbitales: a) 1s ↑↓ · 2s ↑↓ · 2p ↑ _ _; b) 1s ↑↓ · 2s ↑↓ · 2p ↑ ↑ _; c) 1s ↑↓ · 2s ↑↓ · 2p ↑ ↑ ↑. ¿A qué átomos corresponden?', [
    { id: 'a', prompt: 'a)', answer: { kind: 'element', z: 5 }, canonical: 'B', explanation: '5 electrones: boro.', placeholder: 'símbolo' },
    { id: 'b', prompt: 'b)', answer: { kind: 'element', z: 6 }, canonical: 'C', explanation: '6 electrones: carbono (2p² con Hund: dos desapareados).', placeholder: 'símbolo' },
    { id: 'c', prompt: 'c)', answer: { kind: 'element', z: 7 }, canonical: 'N', explanation: '7 electrones: nitrógeno (2p³ semilleno).', placeholder: 'símbolo' },
  ], ['Cuenta las flechas: cada una es un electrón.', 'Átomo neutro: electrones = Z.', 'B, C y N.']),
  ...[
    { k: 'a', q: { n: 0, l: 2, ml: 1, ms: -0.5 } },
    { k: 'b', q: { n: 1, l: 0, ml: 0, ms: -0.5 } },
    { k: 'c', q: { n: 3, l: -2, ml: 1, ms: 0.5 } },
    { k: 'd', q: { n: 3, l: 1, ml: -1, ms: -0.5 } },
  ].map(({ k, q }) => ({ ref: `HOJ 23${k}`, nodeIds: ['5.4'], level: 1 as const, build: () => buildFixedQuantum(q, `src:HOJ23${k}`, `HOJ 23${k}`) })),
  ex('HOJ 24', ['5.4'], 1, 'Orbital a partir de (n, l, m)', 'Indica a qué orbital corresponde la serie de números cuánticos **n = 4, l = 3, m = −1**.', [choicePart('orb', 'Orbital', [O('4f', '4f'), O('4d', '4d', 'l = 2 sería d; aquí l = 3.'), O('3f', '3f', 'n es 4 y además no existe el 3f (l ≤ n − 1).'), O('4p', '4p', 'p es l = 1.')], ['4f'], 'n = 4 y l = 3 (f): uno de los siete orbitales 4f (m = −1).')], ['l indica el tipo: 0 s, 1 p, 2 d, 3 f.', 'n es el número delante.', '4f.']),
  ex('HOJ 25', ['5.4'], 1, 'Asignar orbital a un electrón', 'Asigna orbital a los electrones **(1, 0, 0, ½)** y **(2, 1, −1, ½)**.', [
    choicePart('a', '(1, 0, 0, ½)', [O('1s', '1s'), O('1p', '1p', 'Con n = 1 solo existe l = 0.'), O('2s', '2s')], ['1s'], 'n = 1, l = 0 → 1s.'),
    choicePart('b', '(2, 1, −1, ½)', [O('2p', '2p'), O('2s', '2s', 'l = 1 es p.'), O('2d', '2d', 'No existe: l ≤ n − 1.')], ['2p'], 'n = 2, l = 1 → 2p.'),
  ], ['El orbital lo fijan n y l.', 'l = 0 s, 1 p.', '1s y 2p.']),
  ex('HOJ 26', ['5.4'], 1, 'Números cuánticos de un orbital', 'Indica los números cuánticos de los orbitales **4f**, **3d** y **5p** (un conjunto válido de cada uno).', [
    { id: 'f', prompt: '4f', answer: { kind: 'quantum', n: 4, l: 3 }, canonical: '(4, 3, 0, +1/2)', explanation: 'n = 4, l = 3, m entre −3 y +3, s = ±½.', placeholder: '(n, l, m_l, m_s)' },
    { id: 'd', prompt: '3d', answer: { kind: 'quantum', n: 3, l: 2 }, canonical: '(3, 2, 0, +1/2)', explanation: 'n = 3, l = 2, m entre −2 y +2.', placeholder: '(n, l, m_l, m_s)' },
    { id: 'p', prompt: '5p', answer: { kind: 'quantum', n: 5, l: 1 }, canonical: '(5, 1, 0, +1/2)', explanation: 'n = 5, l = 1, m = −1, 0 o +1.', placeholder: '(n, l, m_l, m_s)' },
  ], ['La letra da l y el número da n.', 'm_l va de −l a +l; m_s = ±½.', 'Cualquier m_l permitido vale.']),
  ex('HOJ 27', ['5.5', '5.6'], 1, 'Capacidad del nivel 4', '¿Cuántos orbitales son posibles con **n = 4**? ¿Cuántos electrones pueden alojarse en ellos?', [
    integerPart('orb', 'Orbitales', 16, '4s (1) + 4p (3) + 4d (5) + 4f (7) = 16 = 4².'),
    integerPart('e', 'Electrones', 32, '2 por orbital: 2·16 = 32 = 2·4².'),
  ], ['l = 0, 1, 2, 3.', 'Orbitales por subnivel: 2l + 1.', 'n² orbitales y 2n² electrones.']),
  ex('HOJ 28', ['6.8', '5.4', '7.7', '7.9'], 2, 'Magnesio y cloro', 'Considera los elementos **Mg** y **Cl**.', [
    configPart('mg', 12, 10, 'a) Configuración de Mg²⁺'),
    configPart('cl', 17, 18, 'a) Configuración de Cl⁻'),
    { id: 'q', prompt: 'b) Números cuánticos del electrón más externo del Mg', answer: { kind: 'quantum', n: 3, l: 0 }, canonical: '(3, 0, 0, +1/2)', explanation: 'Mg: [Ne] 3s². El más externo está en 3s: n = 3, l = 0, m = 0, s = ±½.', placeholder: '(n, l, m_l, m_s)', nodeIds: ['5.4'] },
    { id: 'tam', prompt: 'c) Orden creciente de tamaño', answer: { kind: 'order', items: [O('Cl', 'Cl'), O('Mg', 'Mg')], correctOrder: ['Cl', 'Mg'] }, canonical: 'Cl < Mg', explanation: 'Mismo periodo (3): el Cl tiene más protones y mayor Z_ef → más pequeño.', nodeIds: ['7.7'] },
    { id: 'ei', prompt: 'd) Orden creciente de 1.ª energía de ionización', answer: { kind: 'order', items: [O('Mg', 'Mg'), O('Cl', 'Cl')], correctOrder: ['Mg', 'Cl'] }, canonical: 'Mg < Cl', explanation: 'En el periodo, la EI crece hacia la derecha (Mg 738 kJ/mol < Cl 1251 kJ/mol).', nodeIds: ['7.9'] },
  ], ['Mg pierde 2 e⁻ y Cl gana 1 para alcanzar un gas noble.', 'Mismo periodo: manda la carga nuclear efectiva.', 'Tamaño Cl < Mg; EI Mg < Cl.']),
];

// ── EBAU (La Rioja) ───────────────────────────────────────────────────────

const qset = (n: number, l: number, ml: number, ms?: number) => ({ n, l, ml, ms: ms ?? 0.5 });

function validityParts(sets: { label: string; q: ReturnType<typeof qset>; checkSpin: boolean }[]): ExercisePart {
  const options = sets.map(({ label, q, checkSpin }) => {
    const v = validateQuantumSet(checkSpin ? q : { ...q, ms: 0.5 });
    return O(label, label, v.valid ? 'Es una combinación permitida: compruébala en orden (n ≥ 1, 0 ≤ l ≤ n − 1, |m| ≤ l).' : v.errors[0]!.message);
  });
  const valid = sets.filter(({ q, checkSpin }) => validateQuantumSet(checkSpin ? q : { ...q, ms: 0.5 }).valid).map((s) => s.label);
  return choicePart(
    'val',
    'a) Marca las combinaciones permitidas',
    options,
    valid,
    sets
      .map(({ label, q, checkSpin }) => {
        const v = validateQuantumSet(checkSpin ? q : { ...q, ms: 0.5 });
        return `${label}: ${v.valid ? `permitida (${v.orbital})` : `no permitida: ${v.errors.map((e) => e.message).join(' ')}`}`;
      })
      .join(' · '),
    true,
  );
}

const EBAU: SourceExercise3[] = [
  ex('EBAU-1 (2021) a', ['7.11', '7.9', '7.2'], 2, 'EBAU La Rioja 2021 · tres átomos neutros', 'Los átomos neutros X, Y, Z tienen las configuraciones X: **1s² 2s² 2p²**, Y: **1s² 2s² 2p⁵**, Z: **1s² 2s² 2p⁶ 3s²**.', [
    { id: 'en', prompt: 'i. Ordénalos de menor a mayor electronegatividad', answer: { kind: 'order', items: [O('X', 'X (C)'), O('Y', 'Y (F)'), O('Z', 'Z (Mg)')], correctOrder: ['Z', 'X', 'Y'] }, canonical: 'Z < X < Y', explanation: 'X = C (periodo 2, grupo 14), Y = F (periodo 2, grupo 17), Z = Mg (periodo 3, grupo 2). La electronegatividad crece hacia la derecha y hacia arriba: Mg (1,31) < C (2,55) < F (3,98).', nodeIds: ['7.11'] },
    choicePart('ei', 'ii. ¿Cuál tendrá mayor energía de ionización? Razónalo', [O('Y', 'Y (F)'), O('X', 'X (C)', 'C y F comparten periodo; F tiene más carga nuclear efectiva y menor radio.'), O('Z', 'Z (Mg)', 'El Mg tiene una capa más y Z_ef baja en su electrón 3s: es el más fácil de ionizar.')], ['Y'], 'El F (Y) tiene la mayor carga nuclear efectiva y el menor radio: sus electrones están más atraídos y cuesta más arrancarlos (1681 kJ/mol).'),
  ], ['Identifica cada átomo por su número de electrones.', 'Sitúalos en la tabla (periodo y grupo).', 'Mismo periodo: compara Z_ef; distinto periodo: compara capas.'], { source: 'EBAU La Rioja jul. 2021' }),
  ex('EBAU-1 (2021) b', ['5.4', '5.5'], 2, 'EBAU La Rioja 2021 · grupos (n, l, m)', 'Dados los grupos de números cuánticos (n, l, m): **(3, 2, 0); (3, 3, 2); (3, 0, 0); (2, −1, 1); (4, 1, 0)**.', [
    validityParts([
      { label: '(3, 2, 0)', q: qset(3, 2, 0), checkSpin: false },
      { label: '(3, 3, 2)', q: qset(3, 3, 2), checkSpin: false },
      { label: '(3, 0, 0)', q: qset(3, 0, 0), checkSpin: false },
      { label: '(2, −1, 1)', q: qset(2, -1, 1), checkSpin: false },
      { label: '(4, 1, 0)', q: qset(4, 1, 0), checkSpin: false },
    ]),
    integerPart('d', 'ii. (3, 2, 0) es un orbital 3d: ¿cuántos orbitales 3d puede tener un átomo?', 5, 'l = 2 → m = −2…+2: 5 orbitales d.'),
    integerPart('s', 'ii. (3, 0, 0) es un orbital 3s: ¿cuántos orbitales 3s?', 1, 'l = 0 → m = 0: 1 orbital s.'),
    integerPart('p', 'ii. (4, 1, 0) es un orbital 4p: ¿cuántos orbitales 4p?', 3, 'l = 1 → m = −1, 0, +1: 3 orbitales p.'),
  ], ['Comprueba n ≥ 1, después 0 ≤ l ≤ n − 1 y por último |m| ≤ l.', 'Orbitales por subnivel: 2l + 1.', '(3, 3, 2) falla porque l = n; (2, −1, 1), porque l < 0.'], { source: 'EBAU La Rioja jul. 2021' }),
  ex('EBAU-2 (2025)', ['5.4', '6.3'], 2, 'EBAU La Rioja 2025 · números cuánticos', 'Dados los valores de números cuánticos **(4, 2, 3, ½), (3, 2, 1, −½), (3, 3, −1, ½), (2, 1, −1, −½) y (1, 0, 0, ½)**:', [
    validityParts([
      { label: '(4, 2, 3, ½)', q: qset(4, 2, 3, 0.5), checkSpin: true },
      { label: '(3, 2, 1, −½)', q: qset(3, 2, 1, -0.5), checkSpin: true },
      { label: '(3, 3, −1, ½)', q: qset(3, 3, -1, 0.5), checkSpin: true },
      { label: '(2, 1, −1, −½)', q: qset(2, 1, -1, -0.5), checkSpin: true },
      { label: '(1, 0, 0, ½)', q: qset(1, 0, 0, 0.5), checkSpin: true },
    ]),
    choicePart('b1', 'b) Orbital del electrón (3, 2, 1, −½)', [O('3d', '3d'), O('3p', '3p', 'l = 2 es d.'), O('2d', '2d', 'n = 3.')], ['3d'], 'n = 3, l = 2 → 3d.'),
    choicePart('b2', 'b) Orbital del electrón (2, 1, −1, −½)', [O('2p', '2p'), O('2s', '2s', 'l = 1 es p.')], ['2p'], 'n = 2, l = 1 → 2p.'),
    choicePart('b3', 'b) Orbital del electrón (1, 0, 0, ½)', [O('1s', '1s'), O('1p', '1p', 'No existe: con n = 1 solo l = 0.')], ['1s'], '1s.'),
    choicePart('c', 'c) ¿Cuál de esos orbitales tiene mayor energía? Justifícalo', [O('3d', '3d (n + l = 5)'), O('2p', '2p (n + l = 3)', 'Compara n + l: el 3d tiene 5.'), O('1s', '1s (n + l = 1)', 'Es el de menor energía.')], ['3d'], 'Regla n + l: 3d (3 + 2 = 5) > 2p (2 + 1 = 3) > 1s (1 + 0 = 1). Mayor n + l → mayor energía (a igual n + l, el de mayor n).'),
  ], ['(4, 2, 3, ½): |m| ≤ l = 2 no se cumple. (3, 3, −1, ½): l debe ser ≤ n − 1 = 2.', 'El orbital lo dan n y l.', 'Energía: compara n + l.'], { source: 'EBAU La Rioja jul. 2025 (P1A)' }),
  ex(
    'EBAU-3 a',
    ['6.5'],
    2,
    'EBAU · fundamental, excitado o imposible',
    'Indica de manera razonada cuáles de estas configuraciones corresponden a un estado **fundamental**, cuáles a un estado **excitado** y cuáles son **imposibles**.',
    ['1s² 2s² 2p⁶ 3s² 3p⁶', '1s² 2s² 3d¹', '1s² 2s² 2p⁶ 2d²', '1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²', '1s² 2s² 2p⁶ 3p¹'].map((txt, i) => {
      const d = diagnoseConfiguration(txt.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))));
      const el = d.status === 'fundamental' || d.status === 'excitado' ? elementByZ(d.electrons) : undefined;
      return choicePart(
        `c${i}`,
        `${['i', 'ii', 'iii', 'iv', 'v'][i]}) ${txt}`,
        [O('fundamental', 'Fundamental', 'Comprueba si algún electrón ocupa un subnivel superior dejando huecos debajo.'), O('excitado', 'Excitado', 'Mira si sigue el orden de Möller sin huecos.'), O('imposible', 'Imposible', 'Todos los subniveles que aparecen existen y ninguno supera su capacidad.')],
        [d.status === 'prohibido' ? 'imposible' : d.status],
        `${STATUS_LABEL[d.status]}${el ? ` (${el.name}, ${d.electrons} e⁻)` : ''}. ${d.issues.map((x) => x.message).join(' ')}`.trim(),
      );
    }),
    ['Imposible: aparece un subnivel que no existe (2d, 1p, 3f…) o se supera su capacidad.', 'Excitado: subniveles reales, pero queda un hueco por debajo de un electrón.', 'El orden de escritura (3d antes de 4s) no cambia el estado.'],
    { source: 'EBAU (hoja del tema)' },
  ),
  tableRow('EBAU-3 b · ²⁰⁸Pb', sp(82, 208), '²⁰⁸Pb · electrones = 82 · carga 0', ['p', 'n'], 2),
  tableRow('EBAU-3 b · Z = 31', sp(31, 69, 3), 'protones = 31 · neutrones = 38 · carga +3', ['el', 'e'], 2),
  tableRow('EBAU-3 b · Au⁻', sp(79, 196, -1), '₇₉Au⁻ · neutrones = 117 · carga −1', ['p', 'e'], 2),
];

export const SOURCE_EXERCISES_3: SourceExercise3[] = [...AMP_ROWS, ...HOJ, ...EBAU];
