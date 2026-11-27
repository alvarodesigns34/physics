/**
 * Electron Architect 3.0 · Desafíos dentro del laboratorio.
 * El alumno CONSTRUYE en el diagrama de cajas (no elige una opción) y ATOM comprueba con el mismo
 * diagnóstico de Pauli, Hund y Aufbau que usa el laboratorio. En los desafíos «repara», primero debe
 * nombrar la regla incumplida y después corregirla.
 */
import { boxesFromConfiguration, diagnoseBoxes, BOX_ELECTRONS, type Boxes, type BoxDiagnosis } from '../science/boxes';
import { speciesConfiguration, type Configuration } from '../science/configuration';
import { elementByZ } from '../science/elements';
import { ionSymbol } from '../science/nucleus';

export type Rule = 'pauli' | 'hund' | 'aufbau';

export interface ArchitectChallenge {
  id: string;
  title: string;
  brief: string;
  z: number;
  charge: number;
  /** Cajas iniciales (desafíos de reparación) */
  preset?: Boxes;
  /** Regla que incumple el preset (se pregunta antes de reparar) */
  brokenRule?: Rule;
  /** Condición de éxito sobre el diagnóstico y las cajas */
  goal: (d: BoxDiagnosis, b: Boxes) => boolean;
  /** Explicación tras completarlo */
  success: string;
  hint: string;
  /** Una solución válida (para las pruebas y para «ver una solución») */
  solution: () => Boxes;
}

/** «1s2 2s1 2p3» → configuración (solo para los datos fijos de este archivo). */
const conf = (t: string): Configuration =>
  t.split(/\s+/).map((tok) => {
    const m = tok.match(/^(\d)([spdf])(\d+)$/);
    if (!m) throw new Error(`Configuración inválida en un desafío: ${t}`);
    return { n: Number(m[1]), l: 'spdf'.indexOf(m[2]!), e: Number(m[3]) };
  });
const ground = (z: number, q = 0) => boxesFromConfiguration(speciesConfiguration(z, z - q));
export const unpairedInBoxes = (b: Boxes) => Object.values(b).flat().filter((s) => s === 1 || s === 2).length;
const nameOf = (z: number, q: number) => (q === 0 ? elementByZ(z)!.name : ionSymbol(elementByZ(z)!.symbol, q));

export const CHALLENGES: ArchitectChallenge[] = [
  {
    id: 'n-fund', title: 'Nitrógeno con Hund', brief: 'Construye el estado fundamental del nitrógeno (Z = 7) en las cajas.', z: 7, charge: 0,
    goal: (d) => d.status === 'fundamental', success: '1s² 2s² 2p³ con los tres electrones 2p en orbitales distintos y espines paralelos: 3 desapareados.', hint: 'Llena 1s y 2s; después reparte los electrones 2p de uno en uno antes de aparear.', solution: () => ground(7),
  },
  {
    id: 'fe-fund', title: 'Hierro', brief: 'Construye el estado fundamental del hierro (Z = 26). ¿Cuántos electrones desapareados quedan?', z: 26, charge: 0,
    goal: (d) => d.status === 'fundamental', success: '[Ar] 3d⁶ 4s²: el 4s se llena antes que el 3d y en 3d⁶ quedan 4 electrones desapareados.', hint: 'Sigue el diagrama de Möller: 4s antes que 3d. En 3d, cinco orbitales: uno a uno y después se aparea el sexto.', solution: () => ground(26),
  },
  {
    id: 'cr-exc', title: 'La excepción del cromo', brief: 'Construye el estado fundamental REAL del cromo (Z = 24), no el que predice Möller.', z: 24, charge: 0,
    goal: (d) => d.status === 'fundamental', success: '[Ar] 3d⁵ 4s¹: dos subcapas semillenas con 6 electrones desapareados. Es una excepción al orden de llenado, no a Hund.', hint: 'Möller daría 3d⁴ 4s². Pasa un electrón 4s al 3d.', solution: () => ground(24),
  },
  {
    id: 'cu-exc', title: 'La excepción del cobre', brief: 'Construye el estado fundamental real del cobre (Z = 29).', z: 29, charge: 0,
    goal: (d) => d.status === 'fundamental', success: '[Ar] 3d¹⁰ 4s¹: el 3d queda completo.', hint: 'Como el cromo, pero aquí lo que se gana es un 3d completo.', solution: () => ground(29),
  },
  {
    id: 'fe3', title: 'Ion Fe³⁺', brief: 'Construye el ion Fe³⁺. Ojo: el orden en que se pierden los electrones no es el inverso del de llenado.', z: 26, charge: 3,
    goal: (d) => d.status === 'fundamental', success: 'Fe³⁺ = [Ar] 3d⁵: se pierden primero los dos 4s y después un 3d. Queda una subcapa semillena (5 desapareados), por eso Fe³⁺ es tan estable.', hint: 'Quita primero los electrones de mayor n (4s), después los 3d.', solution: () => ground(26, 3),
  },
  {
    id: 's2-', title: 'Anión sulfuro', brief: 'Construye el ion S²⁻ (Z = 16).', z: 16, charge: -2,
    goal: (d) => d.status === 'fundamental', success: 'S²⁻ = [Ne] 3s² 3p⁶ = [Ar]: isoelectrónico con el argón.', hint: 'Un anión GANA electrones: 16 + 2 = 18.', solution: () => ground(16, -2),
  },
  {
    id: 'c-exc4', title: 'Carbono con 4 desapareados', brief: 'Construye un estado EXCITADO del carbono (Z = 6) que tenga 4 electrones desapareados.', z: 6, charge: 0,
    goal: (d, b) => d.status === 'excitado' && d.pauli.length === 0 && unpairedInBoxes(b) === 4, success: '1s² 2s¹ 2p³: al promocionar un electrón 2s al 2p quedan 4 desapareados (la base de los cuatro enlaces del carbono).', hint: 'Mueve un electrón del 2s al orbital 2p vacío, con el mismo espín que los otros.', solution: () => boxesFromConfiguration(conf('1s2 2s1 2p3')),
  },
  {
    id: 'na-exc', title: 'Sodio excitado', brief: 'Construye un estado excitado del sodio en el que el electrón de valencia esté en el nivel 3p.', z: 11, charge: 0,
    goal: (d, b) => d.status === 'excitado' && (b['3p'] ?? []).reduce<number>((a, s) => a + BOX_ELECTRONS[s], 0) === 1 && (b['3s'] ?? []).every((s) => s === 0), success: '[Ne] 3p¹: al volver a 3s emite la línea amarilla D del sodio (589 nm).', hint: 'Deja el núcleo de neón y pasa el electrón 3s al 3p.', solution: () => boxesFromConfiguration(conf('1s2 2s2 2p6 3p1')),
  },
  {
    id: 'rep-pauli', title: 'Repara: oxígeno', brief: 'Esta configuración del oxígeno está mal. Di qué regla incumple y corrígela hasta el estado fundamental.', z: 8, charge: 0,
    preset: { '1s': [3], '2s': [3], '2p': [4, 1, 1] }, brokenRule: 'pauli',
    goal: (d) => d.status === 'fundamental', success: 'Dos electrones del mismo orbital deben tener espines opuestos (Pauli). Fundamental: 1s² 2s² 2p⁴ con un orbital apareado y dos desapareados.', hint: 'Toca la caja con ↑↑ hasta dejarla en ↑↓ y revisa Hund en las demás.', solution: () => ground(8),
  },
  {
    id: 'rep-hund', title: 'Repara: nitrógeno', brief: 'Esta configuración del nitrógeno tiene los subniveles bien llenos, pero algo falla. Identifícalo y corrígelo.', z: 7, charge: 0,
    preset: { '1s': [3], '2s': [3], '2p': [3, 1, 0] }, brokenRule: 'hund',
    goal: (d) => d.status === 'fundamental', success: 'Hund: en orbitales de igual energía, primero un electrón en cada uno con espines paralelos (2p: ↑ ↑ ↑).', hint: 'Hay un orbital 2p vacío mientras otro está apareado.', solution: () => ground(7),
  },
  {
    id: 'rep-aufbau', title: 'Repara: potasio', brief: 'Esta configuración del potasio no es la fundamental. ¿Qué regla de llenado incumple? Corrígela.', z: 19, charge: 0,
    preset: { '1s': [3], '2s': [3], '2p': [3, 3, 3], '3s': [3], '3p': [3, 3, 3], '3d': [1, 0, 0, 0, 0] }, brokenRule: 'aufbau',
    goal: (d) => d.status === 'fundamental', success: 'Aufbau (Möller): el 4s (n + l = 4) tiene menos energía que el 3d (n + l = 5). K = [Ar] 4s¹.', hint: 'Compara n + l de 4s y de 3d.', solution: () => ground(19),
  },
];

export interface ChallengeCheck {
  ok: boolean;
  message: string;
}

export function checkChallenge(ch: ArchitectChallenge, b: Boxes): ChallengeCheck {
  const e = ch.z - ch.charge;
  const d = diagnoseBoxes(b, ch.z, e);
  if (ch.goal(d, b)) return { ok: true, message: ch.success };
  const first = d.issues[0];
  if (d.electrons !== e) return { ok: false, message: `${nameOf(ch.z, ch.charge)} tiene ${e} electrones y has colocado ${d.electrons}.` };
  if (first) return { ok: false, message: first.message };
  return { ok: false, message: 'Aún no cumple el objetivo del desafío. Relee el enunciado.' };
}
