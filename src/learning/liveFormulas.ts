/**
 * ATOM 4.0 · Fórmulas manipulables de la guía.
 *
 * Cada fórmula de la guía (identificada por su expresión) puede tener un explorador: deslizadores para
 * las variables de entrada y el resultado recalculado al instante, con una observación sobre cómo
 * depende una magnitud de otra. Son CÁLCULOS con los mismos valores de las constantes que la teoría de
 * clase (THEORY_DATA), no ilustraciones: se indica en la interfaz.
 *
 * Funciones puras y deterministas (probadas en liveFormulas.test.ts).
 */
import { THEORY_DATA } from '../science/constants';
import { elementByZ } from '../science/elements';
import { formatNumber, toSuperscript } from '../science/numbers';
import { emRegion } from '../science/photon';
import { seriesFor } from '../science/hydrogen';

export interface LiveInput {
  key: string;
  sym: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
  /** Escala logarítmica (para longitudes de onda que abarcan muchos órdenes de magnitud) */
  log?: boolean;
}

export interface LiveOutput {
  sym: string;
  value: string;
  unit: string;
  /** Resultado principal de la fórmula */
  main?: boolean;
}

export interface LiveResult {
  outputs: LiveOutput[];
  /** Comentario sobre el caso concreto (región del espectro, elemento…) */
  note?: string;
  /** Combinación de entradas sin sentido físico: se explica en lugar de calcular */
  invalid?: string;
}

export interface LiveFormula {
  inputs: LiveInput[];
  compute: (v: Record<string, number>) => LiveResult;
  /** Qué observar al mover los deslizadores */
  observe: string;
}

const k = THEORY_DATA;
const NA = 6.022e23;
const f = (x: number, sig = 3) => formatNumber(x, { sig });

export const LIVE: Record<string, LiveFormula> = {
  'A = Z + N': {
    inputs: [
      { key: 'Z', sym: 'Z', label: 'protones', min: 1, max: 92, step: 1, value: 11 },
      { key: 'N', sym: 'N', label: 'neutrones', min: 0, max: 146, step: 1, value: 12 },
    ],
    compute: ({ Z, N }) => {
      const el = elementByZ(Z!);
      return { outputs: [{ sym: 'A', value: String(Z! + N!), unit: '', main: true }], note: el ? `${el.name}: ${Z! + N!}${el.symbol}. Cambiar N da otro isótopo del mismo elemento; cambiar Z cambia el elemento.` : undefined };
    },
    observe: 'Mueve solo N: el elemento no cambia (isótopos). Mueve Z: cambia el elemento aunque A sea el mismo.',
  },
  'e⁻ = Z − q': {
    inputs: [
      { key: 'Z', sym: 'Z', label: 'protones', min: 1, max: 36, step: 1, value: 8 },
      { key: 'q', sym: 'q', label: 'carga del ion', min: -3, max: 4, step: 1, value: -2 },
    ],
    compute: ({ Z, q }) => {
      const e = Z! - q!;
      if (e < 0) return { outputs: [], invalid: 'No puede haber un número negativo de electrones: la carga positiva no puede superar a Z.' };
      const el = elementByZ(Z!);
      const charge = q === 0 ? '' : toSuperscript(`${Math.abs(q!) > 1 ? Math.abs(q!) : ''}${q! > 0 ? '+' : '-'}`);
      const tipo = q === 0 ? 'átomo neutro' : q! > 0 ? 'catión: ha perdido electrones' : 'anión: ha ganado electrones';
      return { outputs: [{ sym: 'e⁻', value: String(e), unit: '', main: true }], note: el ? `${el.symbol}${charge} (${tipo}).` : undefined };
    },
    observe: 'Con q negativa hay MÁS electrones que protones: restar un número negativo suma.',
  },
  'M = (m₁·%₁ + m₂·%₂ + …) / 100': {
    inputs: [
      { key: 'm1', sym: 'm₁', label: 'masa del isótopo 1', min: 1, max: 240, step: 0.01, value: 34.97, unit: 'u' },
      { key: 'p1', sym: '%₁', label: 'abundancia del isótopo 1', min: 0, max: 100, step: 0.1, value: 75.8, unit: '%' },
      { key: 'm2', sym: 'm₂', label: 'masa del isótopo 2', min: 1, max: 240, step: 0.01, value: 36.97, unit: 'u' },
    ],
    compute: ({ m1, p1, m2 }) => {
      const M = (m1! * p1! + m2! * (100 - p1!)) / 100;
      return { outputs: [{ sym: '%₂', value: f(100 - p1!, 3), unit: '%' }, { sym: 'M', value: f(M, 4), unit: 'u', main: true }], note: 'La media queda siempre entre m₁ y m₂, más cerca del isótopo más abundante.' };
    },
    observe: 'Lleva %₁ a 100 o a 0: la media coincide con la masa de un solo isótopo.',
  },
  'v = λ/T = λ·ν': {
    inputs: [{ key: 'l', sym: 'λ', label: 'longitud de onda', min: 1, max: 1e9, step: 1, value: 500, unit: 'nm', log: true }],
    compute: ({ l }) => {
      const lambda = l! * 1e-9;
      const nu = k.c / lambda;
      return { outputs: [{ sym: 'ν', value: f(nu), unit: 'Hz', main: true }, { sym: 'T', value: f(1 / nu), unit: 's' }], note: `Región: ${emRegion(lambda).name.toLowerCase()}.` };
    },
    observe: 'Duplica λ y ν se reduce a la mitad: λ·ν es siempre c en el vacío.',
  },
  'E = h·ν = h·c/λ': {
    inputs: [{ key: 'l', sym: 'λ', label: 'longitud de onda', min: 1, max: 1e7, step: 1, value: 656, unit: 'nm', log: true }],
    compute: ({ l }) => {
      const lambda = l! * 1e-9;
      const E = (k.h * k.c) / lambda;
      return {
        outputs: [
          { sym: 'E', value: f(E), unit: 'J', main: true },
          { sym: 'E', value: f(E / k.eV), unit: 'eV' },
          { sym: 'E·N_A', value: f((E * NA) / 1000), unit: 'kJ/mol' },
        ],
        note: `Región: ${emRegion(lambda).name.toLowerCase()}.`,
      };
    },
    observe: 'Menor λ, más energía por fotón. Un fotón UV de 200 nm tiene más del triple de energía que uno rojo de 700 nm.',
  },
  '1/λ = R·(1/n₁² − 1/n₂²)': {
    inputs: [
      { key: 'n1', sym: 'n₁', label: 'nivel inferior', min: 1, max: 5, step: 1, value: 2 },
      { key: 'n2', sym: 'n₂', label: 'nivel superior', min: 2, max: 10, step: 1, value: 3 },
    ],
    compute: ({ n1, n2 }) => {
      if (n2! <= n1!) return { outputs: [], invalid: 'n₂ debe ser mayor que n₁: el nivel superior va en el segundo término. Si no, 1/λ saldría negativo o cero.' };
      const inv = k.R * (1 / (n1! * n1!) - 1 / (n2! * n2!));
      const lambda = 1 / inv;
      const s = seriesFor(n1!);
      return { outputs: [{ sym: '1/λ', value: f(inv), unit: 'm⁻¹' }, { sym: 'λ', value: f(lambda * 1e9, 4), unit: 'nm', main: true }], note: `Serie de ${s?.name ?? '—'} · ${emRegion(lambda).name.toLowerCase()}.` };
    },
    observe: 'Con n₁ fijo, al subir n₂ las líneas se apiñan hacia el límite de la serie (n₂ → ∞).',
  },
  'líneas = n·(n − 1)/2': {
    inputs: [{ key: 'n', sym: 'n', label: 'nivel máximo alcanzado', min: 2, max: 10, step: 1, value: 4 }],
    compute: ({ n }) => ({ outputs: [{ sym: 'líneas', value: String((n! * (n! - 1)) / 2), unit: '', main: true }], note: `Son todas las parejas de niveles distintos entre 1 y ${n}.` }),
    observe: 'Cada nivel nuevo añade tantas líneas como niveles hay por debajo de él.',
  },
  'rₙ = n²·r₀': {
    inputs: [{ key: 'n', sym: 'n', label: 'órbita', min: 1, max: 7, step: 1, value: 2 }],
    compute: ({ n }) => ({ outputs: [{ sym: 'rₙ', value: f(n! * n! * 0.529, 3), unit: 'Å', main: true }, { sym: 'rₙ/r₁', value: String(n! * n!), unit: '' }] }),
    observe: 'El radio crece con n²: la órbita 3 es 9 veces mayor que la 1, no 3.',
  },
  'Eₙ = −13,6 eV / n²': {
    inputs: [{ key: 'n', sym: 'n', label: 'nivel', min: 1, max: 7, step: 1, value: 1 }],
    compute: ({ n }) => {
      const E = -13.6 / (n! * n!);
      return { outputs: [{ sym: 'Eₙ', value: f(E, 3), unit: 'eV', main: true }, { sym: 'ionizar desde n', value: f(-E, 3), unit: 'eV' }] };
    },
    observe: 'Las energías se acercan a 0 al subir n y los niveles se juntan: de 1 a 2 hay 10,2 eV; de 6 a 7, menos de 0,1 eV.',
  },
  'orbitales del subnivel = 2l + 1': {
    inputs: [{ key: 'l', sym: 'l', label: 'número cuántico secundario', min: 0, max: 3, step: 1, value: 1 }],
    compute: ({ l }) => ({
      outputs: [
        { sym: 'subnivel', value: 'spdf'[l!]!, unit: '' },
        { sym: 'orbitales', value: String(2 * l! + 1), unit: '', main: true },
        { sym: 'electrones', value: String(2 * (2 * l! + 1)), unit: '' },
      ],
      note: `m va de −${l} a +${l}: ${2 * l! + 1} valores, uno por orbital.`,
    }),
    observe: 'Cada orbital admite dos electrones (Pauli): s², p⁶, d¹⁰, f¹⁴.',
  },
  'orbitales del nivel = n² · electrones = 2n²': {
    inputs: [{ key: 'n', sym: 'n', label: 'nivel', min: 1, max: 7, step: 1, value: 3 }],
    compute: ({ n }) => ({
      outputs: [
        { sym: 'subniveles', value: Array.from({ length: Math.min(n!, 4) }, (_, i) => `${n}${'spdf'[i]}`).join(' ') + (n! > 4 ? ' …' : ''), unit: '' },
        { sym: 'orbitales', value: String(n! * n!), unit: '' },
        { sym: 'electrones', value: String(2 * n! * n!), unit: '', main: true },
      ],
      note: n! > 4 ? 'A partir de n = 5 la fórmula cuenta también subniveles (5g…) que ningún átomo conocido ocupa en su estado fundamental.' : undefined,
    }),
    observe: 'La capacidad crece con n²: 2, 8, 18, 32…',
  },
};

/** Posición del deslizador (0–1000) ↔ valor, en escala lineal o logarítmica. */
export function sliderToValue(inp: LiveInput, pos: number): number {
  if (!inp.log) return Math.round((inp.min + ((inp.max - inp.min) * pos) / 1000) / inp.step) * inp.step;
  const lo = Math.log10(inp.min);
  const hi = Math.log10(inp.max);
  const v = 10 ** (lo + ((hi - lo) * pos) / 1000);
  // Redondeo a 3 cifras significativas para que los valores sean legibles.
  return Number(v.toPrecision(3));
}

export function valueToSlider(inp: LiveInput, v: number): number {
  if (!inp.log) return Math.round(((v - inp.min) / (inp.max - inp.min)) * 1000);
  const lo = Math.log10(inp.min);
  const hi = Math.log10(inp.max);
  return Math.round(((Math.log10(v) - lo) / (hi - lo)) * 1000);
}
