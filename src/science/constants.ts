/**
 * Constantes físicas — CODATA 2018 (valores exactos del SI desde 2019 donde corresponde).
 * Las simulaciones usan estos valores; los ejercicios usan los datos de su enunciado (ver EXERCISE_DATA).
 */
export const CODATA = {
  h: 6.62607015e-34, // J·s (exacta)
  c: 299792458, // m/s (exacta)
  e: 1.602176634e-19, // C (exacta) — también J por eV
  me: 9.1093837015e-31, // kg
  mp: 1.67262192369e-27, // kg
  mn: 1.67492749804e-27, // kg
  u: 1.6605390666e-27, // kg
  NA: 6.02214076e23, // mol⁻¹ (exacta)
  Rinf: 10973731.56816, // m⁻¹
  a0: 5.29177210903e-11, // m (radio de Bohr)
} as const;

/** Constante de Rydberg del hidrógeno con masa reducida: R_H = R∞ / (1 + me/mp). */
export const R_H = CODATA.Rinf / (1 + CODATA.me / CODATA.mp);

/** Conjunto de constantes con el que se calcula una transición o un fotón. */
export interface ConstantSet {
  h: number;
  c: number;
  /** Constante de Rydberg en m⁻¹ */
  R: number;
  /** Julios por electronvoltio */
  eV: number;
}

export const SIM_CONSTANTS: ConstantSet = { h: CODATA.h, c: CODATA.c, R: R_H, eV: CODATA.e };

/**
 * Datos de la hoja de ejercicios de ampliación (AMP): h = 6,626·10⁻³⁴ J·s; c = 3·10⁸ m/s;
 * R = 109 740 cm⁻¹ = 1,0974·10⁷ m⁻¹; 1 eV = 1,602·10⁻¹⁹ J.
 */
export const EXERCISE_DATA: ConstantSet = { h: 6.626e-34, c: 3e8, R: 1.0974e7, eV: 1.602e-19 };

/** Datos de la teoría (TEO p.9–10): R_H = 1,097·10⁷ m⁻¹, c = 3·10⁸ m/s. */
export const THEORY_DATA: ConstantSet = { h: 6.626e-34, c: 3e8, R: 1.097e7, eV: 1.602e-19 };

/** Partículas subatómicas (CODATA 2018). TEO p.3 da valores redondeados (ver errata E14). */
export const PARTICLES = {
  electron: { name: 'Electrón', chargeC: -CODATA.e, relativeCharge: -1, massKg: CODATA.me, massU: CODATA.me / CODATA.u, location: 'corteza' },
  proton: { name: 'Protón', chargeC: CODATA.e, relativeCharge: 1, massKg: CODATA.mp, massU: CODATA.mp / CODATA.u, location: 'núcleo' },
  neutron: { name: 'Neutrón', chargeC: 0, relativeCharge: 0, massKg: CODATA.mn, massU: CODATA.mn / CODATA.u, location: 'núcleo' },
} as const;

/** 1 eV por partícula expresado en kJ/mol. */
export const EV_TO_KJ_PER_MOL = (CODATA.e * CODATA.NA) / 1000;
