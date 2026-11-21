/**
 * Bloques 5, 6 y 7.2 · Números cuánticos, configuración electrónica y posición en la tabla.
 * Orientado por TEO 2–8 y AMP 12–19.
 */
import { elementByZ } from '../../science/elements';
import {
  aufbau,
  MADELUNG_ORDER,
  madelungIndex,
  configurationExceptions,
  formatConfiguration,
  groundState,
  speciesConfiguration,
  unpairedElectrons,
  valenceShell,
  type Configuration,
} from '../../science/configuration';
import { lLetter, orbitalsInShell, shellCapacity, validateQuantumSet, type QuantumSet } from '../../science/quantum';
import { ionSymbol } from '../../science/nucleus';
import type { Difficulty, Exercise, ExerciseGenerator, ExercisePart } from '../types';
import { choicePart, exId, integerPart, pick, randInt, rngFor, shuffle } from './util';
import { COMMON_IONS } from './nucleus';

const msText = (ms: number) => (ms === 0.5 ? '+½' : ms === -0.5 ? '−½' : String(ms).replace('-', '−'));
export const quantumText = (q: QuantumSet) => `(${q.n}, ${q.l}, ${String(q.ml).replace('-', '−')}, ${msText(q.ms)})`;

const VALIDITY_OPTIONS = [
  { id: 'valida', text: 'Es posible' },
  { id: 'l-fuera-de-rango', text: 'No: l debe valer entre 0 y n − 1' },
  { id: 'ml-fuera-de-rango', text: 'No: m_l debe valer entre −l y +l' },
  { id: 'ms-invalido', text: 'No: m_s solo puede ser +½ o −½' },
];

export function buildQuantumValidity(q: QuantumSet, difficulty: Difficulty, seedId: string, source?: string, rng: () => number = () => 0.5): Exercise {
  const v = validateQuantumSet(q);
  const correct = v.valid ? 'valida' : v.errors[0]!.code;
  const parts: ExercisePart[] = [
    choicePart(
      'valida',
      '¿Es posible esta combinación?',
      VALIDITY_OPTIONS.map((o) => ({
        ...o,
        feedback: o.id === 'valida' ? `No es posible: ${v.errors.map((e) => e.message).join(' ')}` : v.valid ? `Comprueba las cuatro reglas: con n = ${q.n}, l = ${q.l} es válido; |m_l| = ${Math.abs(q.ml)} ≤ ${q.l} y m_s = ${msText(q.ms)}. Todo se cumple.` : `Esa regla se cumple aquí. ${v.errors[0]!.message}`,
      })),
      [correct],
      v.valid ? `Se cumplen todas las reglas: describe un electrón en un orbital ${v.orbital}.${v.note ? ' ' + v.note : ''}` : v.errors.map((e) => e.message).join(' '),
    ),
  ];
  if (v.valid && difficulty >= 2) {
    const options = shuffle(rng, [`${q.n}${lLetter(q.l)}`, `${q.n}${lLetter(Math.max(0, q.l - 1) === q.l ? q.l + 1 : q.l - 1)}`, `${q.n + 1}${lLetter(q.l)}`, `${Math.max(1, q.n - 1)}${lLetter(0)}`])
      .filter((x, i, a) => a.indexOf(x) === i)
      .map((t) => ({ id: t, text: t, feedback: `n indica el nivel (${q.n}) y l el tipo de orbital (l = ${q.l} → ${lLetter(q.l)}).` }));
    parts.push(choicePart('orb', '¿En qué tipo de orbital está el electrón?', options.sort((a, b) => a.text.localeCompare(b.text)), [`${q.n}${lLetter(q.l)}`], `n = ${q.n} y l = ${q.l} (${lLetter(q.l)}): orbital ${q.n}${lLetter(q.l)}.`));
  }
  return {
    id: seedId,
    generatorId: 'cuanticos-validez',
    nodeIds: ['5.4'],
    difficulty,
    title: '¿Combinación posible?',
    statement: `¿Puede un electrón tener los números cuánticos **${quantumText(q)}**?`,
    parts,
    stepwise: true,
    hints: ['Comprueba las reglas una a una: n, después l, después m_l y por último m_s.', 'n ≥ 1; 0 ≤ l ≤ n − 1; −l ≤ m_l ≤ +l; m_s = ±½.', `Con n = ${q.n}, l puede valer de 0 a ${Math.max(0, q.n - 1)}.`],
    solution: parts.map((p) => p.explanation),
    source,
  };
}

export const quantumValidityGenerator: ExerciseGenerator = {
  id: 'cuanticos-validez',
  title: 'Validez de números cuánticos',
  nodeIds: ['5.4'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n = randInt(rng, 1, 5);
    let l = randInt(rng, 0, n - 1);
    let ml = randInt(rng, -l, l);
    let ms = rng() < 0.5 ? 0.5 : -0.5;
    const fault = pick(rng, ['none', 'none', 'l', 'ml', 'ms']);
    if (fault === 'l') l = n + randInt(rng, 0, 1);
    if (fault === 'ml') {
      if (l === 0) l = Math.min(1, n - 1);
      ml = (l + randInt(rng, 1, 2)) * (rng() < 0.5 ? -1 : 1);
    }
    if (fault === 'ms') ms = pick(rng, [0, 1, -1]);
    return buildQuantumValidity({ n, l, ml, ms }, difficulty, exId(this.id, difficulty, seed), undefined, rng);
  },
};

export const orbitalCountGenerator: ExerciseGenerator = {
  id: 'orbitales-recuento',
  title: 'Orbitales y electrones por nivel',
  nodeIds: ['5.5', '5.4'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const n = randInt(rng, 1, 4);
    const sub = Array.from({ length: n }, (_, l) => `${n}${lLetter(l)} (${2 * l + 1} orbital${l ? 'es' : ''})`).join(' + ');
    const parts: ExercisePart[] = [
      integerPart('orb', `Número máximo de orbitales con n = ${n}`, orbitalsInShell(n), `l = 0…${n - 1}: ${sub} = ${orbitalsInShell(n)} = n².`),
      integerPart('e', `Número máximo de electrones con n = ${n}`, shellCapacity(n), `2 electrones por orbital (Pauli): 2·${orbitalsInShell(n)} = ${shellCapacity(n)} = 2n².`),
    ];
    if (difficulty === 2) parts.unshift(integerPart('tipos', `¿Cuántos tipos de subnivel hay con n = ${n}?`, n, `l puede valer 0…${n - 1}: ${n} tipo${n > 1 ? 's' : ''} (${Array.from({ length: n }, (_, l) => lLetter(l)).join(', ')}).`));
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['5.5', '5.4'],
      difficulty,
      title: 'Capacidad de un nivel',
      statement: `Considera el nivel de energía **n = ${n}**.`,
      parts,
      stepwise: true,
      hints: ['Cada valor de l es un subnivel y cada valor de m_l, un orbital.', 'Un subnivel l tiene 2l + 1 orbitales; cada orbital admite 2 electrones.', `Suma 2l + 1 para l = 0…${n - 1}.`],
      solution: parts.map((p) => p.explanation),
    };
  },
};

function configPart(z: number, electrons: number, conf: Configuration, label = 'Configuración electrónica'): ExercisePart {
  return {
    id: 'conf',
    prompt: label,
    answer: { kind: 'config', electrons, z },
    canonical: formatConfiguration(conf, { order: 'llenado' }),
    explanation: `Siguiendo el diagrama de Möller${electrons !== z ? ' y la regla para iones' : ''}: ${formatConfiguration(conf, { order: 'llenado' })}${conf.length > 4 ? ` (abreviada: ${formatConfiguration(conf, { abbreviate: true })})` : ''}.`,
    placeholder: 'p. ej. 1s2 2s2 2p6 o [Ne] 3s2',
  };
}

const EXCEPTIONS_IN_SYLLABUS = [24, 29, 42, 47, 79];

export function buildConfigExercise(z: number, difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const el = elementByZ(z)!;
  const conf = groundState(z);
  const isException = configurationExceptions().includes(z);
  const parts: ExercisePart[] = [configPart(z, z, conf)];
  if (difficulty >= 2) {
    parts.push(integerPart('desap', 'Número de electrones desapareados', unpairedElectrons(conf), `Por la regla de Hund, en cada subnivel incompleto los electrones ocupan orbitales distintos con espines paralelos: ${unpairedElectrons(conf)} desapareado(s).`));
  }
  if (el.group !== null) {
    parts.push(integerPart('periodo', 'Periodo', el.period, `La capa de valencia es n = ${valenceShell(conf)}: periodo ${el.period}.`));
    parts.push(integerPart('grupo', 'Grupo', el.group, `Electrones en la configuración externa (${formatConfiguration(conf.filter((s) => s.n === valenceShell(conf) || (s.l === 2 && s.n === valenceShell(conf) - 1)), { order: 'capas' })}): grupo ${el.group}.`));
  }
  return {
    id: seedId,
    generatorId: 'configuracion',
    nodeIds: isException ? ['6.3', '6.7', '7.2'] : difficulty >= 2 ? ['6.3', '6.4', '7.2'] : ['6.3', '7.2'],
    difficulty,
    title: 'Configuración de un átomo',
    statement: `Escribe la configuración electrónica del estado fundamental del **${el.name.toLowerCase()} (Z = ${z})**${el.group !== null ? ' e indica su periodo y su grupo' : ''}.`,
    parts,
    stepwise: false,
    hints: [
      `Un átomo neutro con Z = ${z} tiene ${z} electrones. Sigue el diagrama de Möller.`,
      'Orden: 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p… (n + l creciente). Máximo: s² p⁶ d¹⁰ f¹⁴.',
      isException ? `¡Cuidado! El ${el.name.toLowerCase()} es una de las excepciones del temario: un electrón s pasa al subnivel d.` : `Ve sumando electrones hasta llegar a ${z}.`,
    ],
    solution: parts.map((p) => p.explanation),
    source,
  };
}

export const configGenerator: ExerciseGenerator = {
  id: 'configuracion',
  title: 'Configuración electrónica de átomos',
  nodeIds: ['6.3', '6.4', '6.6', '6.7', '7.2'],
  difficulties: [1, 2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const exc = configurationExceptions();
    let z: number;
    if (difficulty === 1) z = randInt(rng, 1, 20);
    else if (difficulty === 2) z = pick(rng, Array.from({ length: 18 }, (_, i) => 19 + i).filter((x) => !exc.includes(x)));
    else z = rng() < 0.4 ? pick(rng, EXCEPTIONS_IN_SYLLABUS) : pick(rng, Array.from({ length: 20 }, (_, i) => 37 + i).filter((x) => !exc.includes(x)));
    return buildConfigExercise(z, difficulty, exId(this.id, difficulty, seed));
  },
};

export const ionConfigGenerator: ExerciseGenerator = {
  id: 'configuracion-ion',
  title: 'Configuración electrónica de iones',
  nodeIds: ['6.8', '7.5'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const pool = COMMON_IONS.filter(([z]) => (difficulty === 2 ? elementByZ(z)!.block !== 'd' : true));
    const [z, q] = pick(rng, pool);
    return buildIonConfigExercise(z, q, difficulty, exId(this.id, difficulty, seed));
  },
};

export function buildIonConfigExercise(z: number, q: number, difficulty: Difficulty, seedId: string, source?: string): Exercise {
  const el = elementByZ(z)!;
  const e = z - q;
  const conf = speciesConfiguration(z, e);
  const isD = el.block === 'd';
  return {
    id: seedId,
    generatorId: 'configuracion-ion',
    nodeIds: ['6.8', '7.5'],
    difficulty,
    title: 'Configuración de un ion',
    statement: `Escribe la configuración electrónica del ion **${ionSymbol(el.symbol, q)}** (${el.name.toLowerCase()}, Z = ${z}).`,
    parts: [configPart(z, e, conf)],
    stepwise: false,
    hints: [
      `Primero cuenta los electrones: Z − carga = ${z} − (${q}) = ${e}.`,
      q > 0 ? (isD ? 'En los metales de transición se pierden primero los electrones del nivel más externo (ns), antes que los (n−1)d.' : 'Se quitan los electrones del nivel más externo.') : 'Los electrones ganados entran en el primer subnivel incompleto, según Möller.',
      `Parte de la configuración del átomo neutro: ${formatConfiguration(groundState(z), { abbreviate: true })}.`,
    ],
    solution: [
      `Electrones: ${z} − (${q}) = ${e}.`,
      `Átomo neutro: ${formatConfiguration(groundState(z), { abbreviate: true })}.`,
      `${ionSymbol(el.symbol, q)}: ${formatConfiguration(conf, { abbreviate: true, order: isD ? 'capas' : 'llenado' })}.`,
    ],
    source,
  };
}

const STATE_OPTIONS = [
  { id: 'fundamental', text: 'Estado fundamental' },
  { id: 'excitado', text: 'Estado excitado' },
  { id: 'prohibido', text: 'Prohibida: un subnivel tiene más electrones de los permitidos' },
  { id: 'imposible', text: 'Imposible: contiene un subnivel que no existe' },
];

export const configStateGenerator: ExerciseGenerator = {
  id: 'estado-configuracion',
  title: 'Estados fundamental, excitado y prohibido',
  nodeIds: ['6.5', '6.2'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const z = randInt(rng, 5, difficulty === 1 ? 20 : 30);
    const base = aufbau(z).map((s) => ({ ...s }));
    const kind = pick(rng, ['fundamental', 'excitado', 'prohibido', 'imposible'] as const);
    let text: string;
    let explanation: string;
    const fmtc = (c: Configuration) => formatConfiguration(c, { superscript: true });
    if (kind === 'fundamental') {
      text = fmtc(base);
      explanation = 'Los subniveles se llenan en el orden de Möller y sin superar su capacidad: estado fundamental.';
    } else if (kind === 'excitado') {
      // Un electrón del último subnivel salta dos posiciones en el orden de Möller (deja un hueco).
      const last = base[base.length - 1]!;
      const target = MADELUNG_ORDER[madelungIndex(last) + 2]!;
      last.e -= 1;
      const conf = [...base.filter((s) => s.e > 0), { ...target, e: 1 }];
      text = fmtc(conf);
      explanation = `Un electrón ocupa el ${target.n}${lLetter(target.l)} mientras quedan huecos en subniveles de menor energía: estado excitado (no viola ninguna regla).`;
    } else if (kind === 'prohibido') {
      const target = base.find((s) => s.l === 1 && s.e === 6) ?? base[0]!;
      const donor = base[base.length - 1]!;
      if (donor !== target) {
        donor.e -= 1;
        target.e += 1;
      } else {
        target.e += 1;
      }
      text = fmtc(base.filter((s) => s.e > 0));
      explanation = `El subnivel ${target.n}${lLetter(target.l)} tiene ${target.e} electrones y su máximo es ${2 * (2 * target.l + 1)}: viola el principio de exclusión de Pauli.`;
    } else {
      const fake = pick(rng, [
        { n: 2, l: 2, label: '2d' },
        { n: 1, l: 1, label: '1p' },
        { n: 3, l: 3, label: '3f' },
      ]);
      const last = base[base.length - 1]!;
      const take = Math.min(2, last.e);
      last.e -= take;
      text = `${fmtc(base.filter((s) => s.e > 0))} ${fake.label}${'⁰¹²³⁴⁵⁶⁷⁸⁹'[take]}`;
      explanation = `El subnivel ${fake.label} no existe: con n = ${fake.n}, l solo puede valer de 0 a ${fake.n - 1}.`;
    }
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ['6.5', '6.2'],
      difficulty,
      title: '¿Qué estado es?',
      statement: `Clasifica la configuración **${text}**.`,
      parts: [choicePart('estado', 'Elige una opción', STATE_OPTIONS.map((o) => ({ ...o, feedback: explanation })), [kind], explanation)],
      stepwise: false,
      hints: ['Comprueba primero que todos los subniveles existen y que ninguno se pasa de su capacidad.', 'Capacidad: s² p⁶ d¹⁰ f¹⁴. Subniveles: con n = 1 solo s; con n = 2, s y p; con n = 3, s, p y d.', 'Si todo es válido, mira si se respeta el orden de Möller sin dejar huecos.'],
      solution: [explanation],
    };
  },
};

export function buildFixedQuantum(q: QuantumSet, seedId: string, source: string): Exercise {
  return buildQuantumValidity(q, 1, seedId, source);
}
