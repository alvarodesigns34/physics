/**
 * ATOM 6.0 · Familias nuevas que exigen una estructura de razonamiento que el resto no cubre:
 *
 * 1. absorcion-fundamental: el hidrógeno en su estado fundamental recibe varios fotones; hay que decidir
 *    cuáles absorbe (solo los que coinciden EXACTAMENTE con un salto desde n = 1, o los que superan la
 *    energía de ionización) y qué emite después. Incluye información aparentemente útil (un fotón con la
 *    energía de una línea de Balmer, que un átomo en n = 1 NO puede absorber) y conecta absorción,
 *    niveles de Bohr, cascadas e ionización.
 * 2. electrones-por-numeros: cuántos electrones de un átomo cumplen una condición sobre (n, l) o n + l.
 *    Une configuración (bloque 6) y números cuánticos (bloque 5). Solo se pregunta por condiciones que la
 *    configuración fija sin ambigüedad (n, l, n + l, desapareados): m_l y m_s de un subnivel incompleto
 *    dependen de una convención de dibujo y no se preguntan.
 *
 * Convención declarada en el enunciado: Eₙ = −13,6 eV/n² (modelo de Bohr, valor habitual en Bachillerato).
 */
import { groundState, formatConfiguration, unpairedElectrons } from '../../science/configuration';
import { elementByZ } from '../../science/elements';
import { lLetter } from '../../science/quantum';
import type { ChoiceOption, Difficulty, Exercise, ExerciseGenerator } from '../types';
import { toSuperscript } from '../../science/numbers';
import { choicePart, exId, integerPart, numericPart, pick, randInt, rngFor, shuffle } from './util';

const O = (id: string, text: string, feedback?: string): ChoiceOption => ({ id, text, ...(feedback ? { feedback } : {}) });
const E_ION = 13.6;
/** Energía para subir de n = 1 a n (eV), con el modelo del enunciado. */
export const up1 = (n: number) => E_ION * (1 - 1 / (n * n));
const r2 = (x: number) => Math.round(x * 100) / 100;
const ev = (x: number) => r2(x).toFixed(2).replace('.', ',');

// ── 1. Absorción desde el estado fundamental ───────────────────────────────

export interface AbsorptionCase {
  /** Energías de los fotones (eV, dos decimales), en el orden del enunciado */
  photons: number[];
  /** Índices absorbidos */
  absorbed: number[];
  /** Nivel más alto alcanzado sin ionizar (1 si ninguno) */
  nMax: number;
  /** Índice del fotón ionizante */
  ionizing: number;
}

export function absorptionCase(seed: number, difficulty: Difficulty): AbsorptionCase {
  const rng = rngFor('absorcion-fundamental', seed, difficulty);
  // Uno o dos saltos resonantes desde n = 1.
  const levels = shuffle(rng, [2, 3, 4, 5]).slice(0, difficulty === 3 ? 2 : 1).sort((a, b) => a - b);
  const resonant = levels.map((n) => r2(up1(n)));
  // Distractor clave: energía de una línea de Balmer (solo la absorbe un átomo en n = 2).
  const balmerTo = pick(rng, [3, 4]);
  const balmer = r2(E_ION * (1 / 4 - 1 / (balmerTo * balmerTo)));
  // Cerca de un salto pero sin coincidir: la absorción es todo o nada.
  const near = r2(pick(rng, [11.0, 11.5, 9.5, 12.4, 10.8]));
  const ion = r2(E_ION + randInt(rng, 4, 24) / 10);
  const list = shuffle(rng, [...resonant.map((e) => ({ e, k: 'res' })), { e: balmer, k: 'bal' }, { e: near, k: 'near' }, { e: ion, k: 'ion' }]);
  const photons = list.map((x) => x.e);
  const absorbed = list.map((x, i) => (x.k === 'res' || x.k === 'ion' ? i : -1)).filter((i) => i >= 0);
  return { photons, absorbed, nMax: Math.max(...levels), ionizing: list.findIndex((x) => x.k === 'ion') };
}

export function buildAbsorption(seed: number, difficulty: Difficulty): Exercise {
  const c = absorptionCase(seed, difficulty);
  const letters = 'ABCDE';
  const name = (i: number) => `Fotón ${letters[i]} (${ev(c.photons[i]!)} eV)`;
  const nMax = c.nMax;
  const lines = (nMax * (nMax - 1)) / 2;
  const Ek = r2(c.photons[c.ionizing]! - E_ION);
  const visible = nMax >= 3;
  const jumps = [2, 3, 4, 5].map((n) => `1→${n}: ${ev(up1(n))} eV`).join(' · ');
  const absorbedText = c.absorbed.map((i) => letters[i]).join(' y ');
  const parts = [
    {
      ...choicePart(
        'abs',
        '¿Qué fotones puede absorber un átomo en el estado fundamental? (marca todos)',
        c.photons.map((e, i) => {
          const absorbed = c.absorbed.includes(i);
          const fb = i === c.ionizing ? 'Supera la energía de ionización (13,6 eV): se absorbe y arranca el electrón; el exceso queda como energía cinética.' : absorbed ? 'Coincide con un salto desde n = 1.' : Math.abs(e - E_ION * (1 / 4 - 1 / 9)) < 0.01 || Math.abs(e - E_ION * (1 / 4 - 1 / 16)) < 0.01 ? 'Es la energía de una línea de Balmer: la absorbe un átomo que YA está en n = 2, no uno en n = 1.' : 'No coincide con ningún salto desde n = 1 ni llega a ionizar: la absorción es todo o nada, no «parcial».';
          return O(String(i), name(i), fb);
        }),
        c.absorbed.map(String),
        `Desde n = 1 los únicos saltos posibles cuestan ${jumps} (y 13,6 eV o más para ionizar). Se absorben ${absorbedText}. Un fotón «casi» resonante no se absorbe en parte: o coincide o pasa de largo.`,
        true,
      ),
      nodeIds: ['3.5', '4.3'],
      skills: ['concepto' as const, 'razonamiento' as const],
    },
    { ...integerPart('nmax', 'Nivel más alto que alcanza un electrón SIN ser arrancado', nMax, `El mayor salto resonante es 1 → ${nMax} (${ev(up1(nMax))} eV).`), nodeIds: ['4.2', '4.3'] },
    { ...integerPart('lineas', 'Número de líneas distintas que pueden emitir después los átomos EXCITADOS (no cuentes los ionizados)', lines, `Desde n = ${nMax} se puede bajar por cualquier camino: N = n(n − 1)/2 = ${nMax}·${nMax - 1}/2 = ${lines}. Las de niveles más bajos ya están incluidas en esa cuenta.`), nodeIds: ['3.8'] },
    {
      ...numericPart({
        id: 'ek',
        prompt: `Energía cinética del electrón arrancado por el fotón ${letters[c.ionizing]}`,
        value: Ek,
        unit: 'eV',
        sig: Ek >= 1 ? 2 : 1,
        relTol: 0.03,
        explanation: `E_c = E_fotón − 13,6 eV = ${ev(c.photons[c.ionizing]!)} − 13,6 = ${ev(Ek)} eV.`,
        misconceptions: [{ test: (v) => Math.abs(v - c.photons[c.ionizing]!) < 0.05, message: 'Esa es la energía del fotón entero: hay que restar los 13,6 eV que cuesta arrancar el electrón.', skill: 'formula' }],
        skills: ['formula', 'calculo'],
      }),
      nodeIds: ['7.9', '4.2'],
    },
    {
      ...choicePart(
        'vis',
        '¿Aparecerán líneas visibles en la emisión posterior de los átomos excitados?',
        [O('si', 'Sí: hay saltos que terminan en n = 2 (serie de Balmer)'), O('no', 'No: todas las líneas son ultravioleta (serie de Lyman)'), O('nunca', 'No: el hidrógeno nunca emite en el visible')],
        [visible ? 'si' : 'no'],
        visible ? `Con electrones en n = ${nMax} ≥ 3 son posibles saltos ${nMax} → 2 (Balmer, visible). Por tanto, sí.` : 'Con n = 2 como nivel más alto solo existe el salto 2 → 1 (Lyman, 121,6 nm, ultravioleta).',
      ),
      nodeIds: ['3.7', '3.3'],
      skills: ['razonamiento' as const],
    },
  ];
  return {
    id: exId('absorcion-fundamental', difficulty, seed),
    generatorId: 'absorcion-fundamental',
    nodeIds: ['3.5', '4.3', '4.2', '3.8', '3.7', '3.3', '7.9'],
    difficulty,
    level: difficulty === 3 ? 5 : 4,
    title: '¿Qué luz absorbe el hidrógeno?',
    statement: `Un gas de hidrógeno atómico, con TODOS sus átomos en el estado fundamental, se ilumina con fotones de estas energías: ${c.photons.map((e, i) => `**${letters[i]}: ${ev(e)} eV**`).join(', ')}. Ningún átomo recibe más de un fotón. Usa Eₙ = −13,6 eV/n².`,
    data: [{ label: 'Eₙ', value: '−13,6 eV/n²' }],
    parts,
    stepwise: true,
    hints: [
      'Un átomo en n = 1 solo puede absorber un fotón cuya energía coincida EXACTAMENTE con un salto desde n = 1… o que le sobre para ionizar.',
      'Calcula ΔE = 13,6·(1 − 1/n²) para n = 2, 3, 4, 5 y compáralo con cada fotón. La energía de ionización desde n = 1 es 13,6 eV.',
      'Para la emisión: desde el nivel más alto alcanzado, N = n(n − 1)/2. Una línea es visible si el salto termina en n = 2.',
    ],
    solution: parts.map((p) => p.explanation),
    resolution: [
      { kind: 'pregunta', text: 'Decidir qué fotones absorbe un átomo en n = 1 y deducir después su espectro de emisión y la energía del electrón arrancado.' },
      { kind: 'principio', text: 'Absorción: el fotón se absorbe entero si su energía es exactamente la diferencia entre el nivel actual y otro permitido, o si basta para ionizar (entonces el exceso es energía cinética).', math: '\\Delta E_{1\\to n} = 13,6\\left(1-\\frac{1}{n^2}\\right)\\;\\text{eV}' },
      { kind: 'calculo', text: jumps + ' · ionización: 13,6 eV.' },
      { kind: 'interpretacion', text: `Se absorben ${absorbedText}. El fotón de Balmer no: esa línea conecta n = 2 con un nivel superior, y aquí no hay átomos en n = 2.` },
      { kind: 'resultado', text: `Nivel máximo n = ${nMax}; ${lines} línea${lines === 1 ? '' : 's'} posibles; E_c = ${ev(Ek)} eV; ${visible ? 'sí' : 'no'} hay líneas visibles.` },
      { kind: 'comprobacion', text: 'El espectro de absorción del hidrógeno frío solo muestra la serie de Lyman (ultravioleta): coherente con que solo se absorban saltos desde n = 1.' },
      { kind: 'errores', text: 'Pensar que un fotón «casi» resonante se absorbe en parte; que el átomo absorbe la línea de Balmer estando en n = 1; olvidar restar 13,6 eV para la energía cinética.' },
      { kind: 'metodo', text: 'Cómo reconocerlo en un examen: «estado fundamental» + varias energías o longitudes de onda + «¿cuáles absorbe?». Haz primero la tabla de saltos desde n = 1.' },
    ],
  };
}

export const absorptionGenerator: ExerciseGenerator = {
  id: 'absorcion-fundamental',
  title: 'Absorción desde el estado fundamental',
  nodeIds: ['3.5', '4.3', '4.2', '3.8', '3.7', '3.3', '7.9'],
  difficulties: [2, 3],
  create: (seed, difficulty) => buildAbsorption(seed, difficulty),
};

// ── 2. Electrones que cumplen una condición sobre los números cuánticos ────

const COUNT_ZS = [11, 13, 15, 16, 17, 19, 20, 24, 25, 26, 29, 30, 33, 35, 38];

export function countElectrons(z: number, pred: (n: number, l: number) => boolean): number {
  return groundState(z).filter((s) => pred(s.n, s.l)).reduce((a, s) => a + s.e, 0);
}

export function buildQuantumCount(z: number, difficulty: Difficulty, seedId: string): Exercise {
  const el = elementByZ(z)!;
  const conf = groundState(z);
  const full = formatConfiguration(conf);
  const nl = pick(rngFor('electrones-por-numeros-c', z, difficulty), [3, 4]);
  const lP = countElectrons(z, (_n, l) => l === 1);
  const n3 = countElectrons(z, (n) => n === 3);
  const s0 = countElectrons(z, (_n, l) => l === 0);
  const sumNl = countElectrons(z, (n, l) => n + l === nl);
  const unp = unpairedElectrons(conf);
  const subs = (pred: (n: number, l: number) => boolean) => conf.filter((s) => pred(s.n, s.l)).map((s) => `${s.n}${lLetter(s.l)}${toSuperscript(s.e)}`).join(' + ') || 'ninguno';
  const parts = [
    { ...integerPart('lp', 'Electrones con l = 1', lP, `l = 1 son los orbitales p: ${subs((_n, l) => l === 1)} = ${lP}.`), nodeIds: ['5.4', '6.3'] },
    { ...integerPart('n3', 'Electrones con n = 3', n3, `n = 3 incluye 3s, 3p y 3d: ${subs((n) => n === 3)} = ${n3}. Ojo: los 3d cuentan aunque se escriban después del 4s.`), nodeIds: ['5.4', '6.3'] },
    { ...integerPart('s', 'Electrones con l = 0', s0, `l = 0 son los s: ${subs((_n, l) => l === 0)} = ${s0}.`), nodeIds: ['5.4'] },
    ...(difficulty === 3 ? [{ ...integerPart('nl', `Electrones en subniveles con n + l = ${nl}`, sumNl, `n + l = ${nl}: ${nl === 3 ? '3s y 2p' : '4s y 3p'} (la misma diagonal del diagrama de Möller). Aquí: ${subs((n, l) => n + l === nl)} = ${sumNl}.`), nodeIds: ['6.3', '5.4'] }] : []),
    { ...integerPart('unp', 'Electrones desapareados en el estado fundamental', unp, `Regla de Hund: en cada subnivel incompleto los electrones ocupan orbitales distintos con espines paralelos antes de aparearse. Total: ${unp}.`), nodeIds: ['6.4'] },
  ];
  return {
    id: seedId,
    generatorId: 'electrones-por-numeros',
    nodeIds: ['5.4', '6.3', '6.4', '5.5'],
    difficulty,
    level: difficulty === 3 ? 4 : 3,
    title: 'Contar electrones con números cuánticos',
    statement: `Para un átomo neutro de **${el.name.toLowerCase()} (Z = ${z})** en su estado fundamental, ¿cuántos electrones cumplen cada condición?`,
    parts,
    stepwise: false,
    hints: [
      'Escribe primero la configuración completa (sin abreviar con el gas noble): los electrones del «núcleo» también cuentan.',
      'Traduce cada condición a subniveles: l = 0 → s, l = 1 → p, l = 2 → d; n = 3 → 3s, 3p y 3d.',
      'Suma los electrones de esos subniveles. Para los desapareados, dibuja solo los subniveles incompletos.',
    ],
    solution: [`Configuración: ${full}.`, ...parts.map((p) => p.explanation)],
    resolution: [
      { kind: 'pregunta', text: 'Relacionar los números cuánticos (n, l) con los subniveles de una configuración y contar electrones.' },
      { kind: 'datos', text: `Z = ${z} → ${z} electrones en el átomo neutro. Configuración: ${full}.` },
      { kind: 'principio', text: 'n es la capa y l el tipo de subnivel (0 s, 1 p, 2 d, 3 f). Cada condición selecciona subniveles enteros.' },
      { kind: 'calculo', text: parts.map((p) => `${p.prompt}: ${p.canonical}`).join(' · ') },
      { kind: 'comprobacion', text: `Los electrones s y los de l = 1 no pueden sumar más de ${z}; con n = 3 nunca hay más de 18.` },
      { kind: 'errores', text: 'Contar solo la capa de valencia; olvidar los 3d al contar n = 3 porque se escriben tras el 4s; confundir l = 1 con «la primera capa».' },
    ],
  };
}

export const quantumCountGenerator: ExerciseGenerator = {
  id: 'electrones-por-numeros',
  title: 'Contar electrones con números cuánticos',
  nodeIds: ['5.4', '6.3', '6.4', '5.5'],
  difficulties: [2, 3],
  create(seed, difficulty) {
    const rng = rngFor(this.id, seed, difficulty);
    return buildQuantumCount(pick(rng, COUNT_ZS), difficulty, exId(this.id, difficulty, seed));
  },
};

export const ATOM6_GENERATORS: ExerciseGenerator[] = [absorptionGenerator, quantumCountGenerator];
