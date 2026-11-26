/**
 * Más tipos de pregunta habituales en examen, con datos reales:
 * - Asignar energías de ionización a elementos (AMP 31).
 * - ¿Qué iones son probables? (AMP 22a).
 * - Masa de un isótopo desconocido a partir de la masa atómica (inverso de 3.1).
 * - Segunda energía de ionización: ¿salto grande o pequeño? (AMP 30).
 */
import { elementByZ, ieKJPerMol, type ElementRecord } from '../../science/elements';
import { formatConfiguration, groundState } from '../../science/configuration';
import { commonIon } from '../../science/trends';
import { ionSymbol } from '../../science/nucleus';
import { NATURAL_ISOTOPES } from '../../science/data/naturalIsotopes';
import type { Difficulty, Exercise, ExerciseGenerator, ExercisePart } from '../types';
import { choicePart, exId, fmt, numericPart, pick, rngFor, shuffle } from './util';

const O = (id: string, text: string, feedback?: string) => ({ id, text, feedback });
const abbr = (z: number) => formatConfiguration(groundState(z), { abbreviate: true });
const ei = (e: ElementRecord) => Math.round(ieKJPerMol(e.ie1!));

// ── Asignar energías de ionización ────────────────────────────────────────

/** Ternas en las que el orden de EI sigue la tendencia (sin excepciones). */
const EI_TRIPLES: [number, number, number][] = [
  [11, 17, 19],
  [3, 9, 11],
  [12, 16, 20],
  [19, 35, 37],
  [11, 15, 18],
  [4, 9, 12],
  [3, 7, 10],
  [20, 34, 36],
];

export function buildIonizationMatch(triple: [number, number, number], difficulty: Difficulty, seedId: string, rng: () => number): Exercise {
  const els = triple.map((z) => elementByZ(z)!);
  const letters = ['A', 'B', 'C'];
  const values = shuffle(rng, els.map(ei));
  const parts: ExercisePart[] = els.map((e, i) =>
    choicePart(
      `ei${i}`,
      `EI₁ de ${letters[i]} (Z = ${e.z})`,
      values.map((v) => O(String(v), `${v} kJ/mol`, 'Ordena primero los tres elementos por su EI esperada: más a la derecha y más arriba → mayor EI.')),
      [String(ei(e))],
      `${letters[i]} = ${e.name} (${abbr(e.z)}): ${ei(e)} kJ/mol.`,
    ),
  );
  const biggest = [...els].sort((a, b) => b.covalentRadius! - a.covalentRadius!)[0]!;
  parts.push(choicePart('radio', '¿Cuál tiene mayor radio atómico?', els.map((e, i) => O(letters[i]!, `${letters[i]} (Z = ${e.z})`, 'El mayor radio corresponde al de más capas y, en el mismo periodo, al de menor Z_ef.')), [letters[els.indexOf(biggest)]!], `${biggest.name}: más capas (o menor Z_ef en su periodo) → mayor radio. La EI más baja suele ir con el radio más grande.`));
  const sorted = [...els].sort((a, b) => ei(a) - ei(b));
  return {
    id: seedId,
    generatorId: 'asignar-ei',
    nodeIds: ['7.9', '7.7'],
    difficulty,
    title: 'Asigna las energías de ionización',
    statement: `Los elementos A (Z = ${triple[0]}), B (Z = ${triple[1]}) y C (Z = ${triple[2]}) tienen primeras energías de ionización de **${values.join(', ')} kJ/mol** (no necesariamente en ese orden). Asigna cada valor de forma razonada.`,
    parts,
    stepwise: false,
    hints: ['Escribe la configuración de cada uno para situarlos (periodo y grupo).', 'La EI crece hacia la derecha en un periodo y hacia arriba en un grupo. Un gas noble tiene la EI más alta de su periodo; un alcalino, la más baja.', `Orden esperado: ${sorted.map((e) => e.symbol).join(' < ')}.`],
    solution: [`Orden: ${sorted.map((e) => `${e.symbol} (${ei(e)})`).join(' < ')} kJ/mol.`, ...parts.map((p) => p.explanation)],
  };
}

export const ionizationMatchGenerator: ExerciseGenerator = {
  id: 'asignar-ei',
  title: 'Asignar energías de ionización',
  nodeIds: ['7.9', '7.7'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildIonizationMatch(shuffle(rng, pick(rng, EI_TRIPLES)) as [number, number, number], difficulty, exId(this.id, difficulty, seed), rng);
  },
};

// ── ¿Qué iones son probables? ─────────────────────────────────────────────

const ION_ZS = [3, 4, 8, 9, 11, 12, 13, 16, 17, 19, 20, 34, 35, 37, 38, 53, 55, 56];

export function buildProbableIons(zs: number[], difficulty: Difficulty, seedId: string, rng: () => number): Exercise {
  const options = zs.map((z, i) => {
    const el = elementByZ(z)!;
    const good = commonIon(el).charge!;
    // La mitad de las opciones son improbables: una carga de más o de signo contrario.
    const fake = rng() < 0.5;
    const q = fake ? (rng() < 0.5 ? good + Math.sign(good) : -good) : good;
    return { id: `i${i}`, z, q, probable: q === good, el, good };
  });
  if (!options.some((o) => o.probable)) options[0] = { ...options[0]!, q: options[0]!.good, probable: true };
  const text = (o: (typeof options)[number]) => ionSymbol(o.el.symbol, o.q);
  return {
    id: seedId,
    generatorId: 'iones-probables',
    nodeIds: ['7.5', '6.9'],
    difficulty,
    title: '¿Qué iones es probable que se formen?',
    statement: `Justifica a partir de la configuración de la última capa cuáles de estos iones es probable que se formen: **${options.map(text).join(', ')}**.`,
    parts: [
      choicePart(
        'ok',
        'Marca los iones probables',
        options.map((o) => O(o.id, text(o), o.probable ? undefined : `${o.el.name}: ${abbr(o.z)}. Su ion estable es ${ionSymbol(o.el.symbol, o.good)}: ${commonIon(o.el).reason}`)),
        options.filter((o) => o.probable).map((o) => o.id),
        options.map((o) => `${text(o)}: ${o.probable ? 'probable' : `improbable (el estable es ${ionSymbol(o.el.symbol, o.good)})`} — ${abbr(o.z)}.`).join(' '),
        true,
      ),
    ],
    stepwise: false,
    hints: ['Escribe la capa de valencia de cada elemento.', 'Los representativos ganan o pierden electrones hasta tener la configuración del gas noble más cercano.', 'Grupo 1 → +1, 2 → +2, 13 → +3, 15 → −3, 16 → −2, 17 → −1.'],
    solution: options.map((o) => `${text(o)}: ${o.probable ? 'probable' : 'improbable'}. ${commonIon(o.el).reason}`),
  };
}

export const probableIonsGenerator: ExerciseGenerator = {
  id: 'iones-probables',
  title: 'Iones probables a partir de la configuración',
  nodeIds: ['7.5', '6.9'],
  difficulties: [1, 2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildProbableIons(shuffle(rng, ION_ZS).slice(0, difficulty === 1 ? 3 : 4), difficulty, exId(this.id, difficulty, seed), rng);
  },
};

// ── Masa de un isótopo desconocido ────────────────────────────────────────

export function buildUnknownIsotopeMass(z: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const [a, b] = NATURAL_ISOTOPES[z]! as [{ a: number; mass: number; abundance: number }, { a: number; mass: number; abundance: number }];
  const sum = a.abundance + b.abundance;
  const xa = (a.abundance / sum) * 100;
  const xb = 100 - xa;
  const M = (a.mass * xa + b.mass * xb) / 100;
  const Mr = Number(M.toFixed(3));
  const mb = (100 * Mr - a.mass * xa) / xb;
  return {
    id: seedId,
    generatorId: 'isotopo-desconocido',
    nodeIds: ['3.1'],
    difficulty,
    title: 'La masa del isótopo que falta',
    statement: `El ${el.name.toLowerCase()} tiene dos isótopos naturales. El ${el.symbol}-${a.a} tiene una masa de **${fmt(a.mass, 7)} u** y una abundancia del **${fmt(xa, 4)} %**. Si la masa atómica del ${el.name.toLowerCase()} es **${fmt(Mr, 5)} u**, ¿cuál es la masa del ${el.symbol}-${b.a}?`,
    parts: [
      numericPart({ id: 'xb', prompt: `Abundancia del ${el.symbol}-${b.a} (%)`, value: xb, unit: '%', sig: 4, explanation: `Las abundancias suman 100 %: 100 − ${fmt(xa, 4)} = ${fmt(xb, 4)} %.`, placeholder: 'en %' }),
      numericPart({
        id: 'm',
        prompt: `Masa del ${el.symbol}-${b.a} (u)`,
        value: mb,
        unit: 'u',
        sig: 5,
        relTol: 0.0005,
        explanation: `M = (m₁·x₁ + m₂·x₂)/100 → m₂ = (100·M − m₁·x₁)/x₂ = (100·${fmt(Mr, 5)} − ${fmt(a.mass, 7)}·${fmt(xa, 4)})/${fmt(xb, 4)} = ${fmt(mb, 6)} u. Debe salir cerca de su número másico (${b.a}).`,
        recompute: { from: 'xb', fn: (x) => (100 * Mr - a.mass * (100 - x)) / x },
      }),
    ],
    stepwise: true,
    hints: ['Escribe la fórmula de la media ponderada con la incógnita m₂.', 'Primero la abundancia que falta: 100 − x₁.', 'm₂ = (100·M − m₁·x₁)/x₂. Comprueba que se parece al número másico.'],
    solution: [`x₂ = ${fmt(xb, 4)} %.`, `m₂ = ${fmt(mb, 6)} u.`],
  };
}

export const unknownIsotopeGenerator: ExerciseGenerator = {
  id: 'isotopo-desconocido',
  title: 'Masa de un isótopo desconocido',
  nodeIds: ['3.1'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    const two = Object.keys(NATURAL_ISOTOPES).map(Number).filter((z) => NATURAL_ISOTOPES[z]!.length === 2);
    return buildUnknownIsotopeMass(pick(rng, two), difficulty, exId(this.id, difficulty, seed));
  },
};

// ── Segunda energía de ionización ─────────────────────────────────────────

const SECOND_IE = [3, 4, 11, 12, 19, 20, 37, 38];

export function buildSecondIonization(z: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const e1 = Math.round(ieKJPerMol(el.ie1!));
  const e2 = Math.round(ieKJPerMol(el.ie2!));
  const ratio = e2 / e1;
  const big = ratio > 4;
  return {
    id: seedId,
    generatorId: 'segunda-ei',
    nodeIds: ['7.9', '6.9'],
    difficulty,
    title: 'El salto de la segunda energía de ionización',
    statement: `Para el ${el.name.toLowerCase()} (Z = ${z}), EI₁ = **${e1} kJ/mol** y EI₂ = **${e2} kJ/mol**. Explica el valor del cociente EI₂/EI₁.`,
    parts: [
      numericPart({ id: 'r', prompt: 'Cociente EI₂/EI₁', value: ratio, unit: '', sig: 3, explanation: `${e2}/${e1} = ${fmt(ratio, 3)}.`, relTol: 0.02 }),
      choicePart(
        'why',
        '¿Por qué?',
        [
          O('capa', 'El segundo electrón sale de una capa interna (gas noble), mucho más cercana y menos apantallada', big ? undefined : 'Aquí el segundo electrón sale de la misma capa ns: no hay cambio de capa.'),
          O('misma', 'El segundo electrón sale de la misma capa de valencia; solo cuesta algo más porque el ion ya es positivo', big ? 'Aquí el salto es enorme: el segundo electrón ya no es de valencia.' : undefined),
          O('masa', 'Porque el ion pesa menos que el átomo', 'La masa no interviene: lo decisivo es de qué capa sale el electrón.'),
        ],
        [big ? 'capa' : 'misma'],
        `${el.name}: ${abbr(z)}. ${big ? `Tras perder su único electrón de valencia queda con la configuración de un gas noble: el segundo sale de una capa interna, más cercana al núcleo y menos apantallada → EI₂ ≫ EI₁ (${fmt(ratio, 2)} veces).` : `Tiene dos electrones de valencia: el segundo sale de la misma capa; cuesta algo más (×${fmt(ratio, 2)}) porque ahora se arranca de un ion positivo.`}`,
      ),
    ],
    stepwise: true,
    hints: ['Escribe la configuración y cuenta los electrones de valencia.', '¿El segundo electrón sale de la capa de valencia o de una capa interna?', 'Alcalinos: EI₂ enorme (capa interna). Alcalinotérreos: EI₂ ≈ 2·EI₁.'],
    solution: [`EI₂/EI₁ = ${fmt(ratio, 3)}.`, big ? 'Salto grande: el segundo electrón es interno.' : 'Salto moderado: el segundo electrón es de la misma capa.'],
  };
}

export const secondIonizationGenerator: ExerciseGenerator = {
  id: 'segunda-ei',
  title: 'Segunda energía de ionización',
  nodeIds: ['7.9', '6.9'],
  difficulties: [2],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildSecondIonization(pick(rng, SECOND_IE), difficulty, exId(this.id, difficulty, seed));
  },
};

export const EXAM2_GENERATORS: ExerciseGenerator[] = [ionizationMatchGenerator, probableIonsGenerator, unknownIsotopeGenerator, secondIonizationGenerator];
