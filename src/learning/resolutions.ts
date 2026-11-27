/**
 * Resoluciones explicadas por bloques para los generadores más usados de ATOM 2.0 (Rydberg y ondas).
 * Se construyen a partir de los mismos números que el ejercicio: nunca se copian a mano.
 */
import type { ResolutionStep } from './types';
import { formatNumber } from '../science/numbers';
import type { ConstantSet } from '../science/constants';
import type { Transition } from '../science/hydrogen';

/** Notación científica para MathText (entre 0,01 y 9 999 se escribe sin potencia). */
export function texNum(v: number, sig = 4): string {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return Number(v.toPrecision(sig)).toLocaleString('es-ES', { maximumFractionDigits: 8, useGrouping: false });
  const m = (v / 10 ** e).toFixed(sig - 1).replace('.', ',');
  return `${m}\\cdot 10^{${e}}`;
}

const sci = (v: number, sig = 3) => formatNumber(v, { sig });
const SERIES = ['', 'Lyman', 'Balmer', 'Paschen', 'Brackett', 'Pfund'];

export function rydbergResolution(t: Transition, k: ConstantSet, rUnit: 'm' | 'cm'): ResolutionStep[] {
  const { n1, n2 } = t;
  const emits = t.type === 'emision';
  const steps: ResolutionStep[] = [
    { kind: 'pregunta', text: `Caracterizar el fotón ${emits ? 'emitido' : 'absorbido'} cuando el electrón pasa de n = ${t.from} a n = ${t.to}: su longitud de onda, su frecuencia y su energía.` },
    { kind: 'datos', text: `n₁ = ${n1} (nivel inferior), n₂ = ${n2} (nivel superior); R = ${rUnit === 'cm' ? `${Math.round(k.R / 100).toLocaleString('es-ES')} cm⁻¹` : `${sci(k.R, 4)} m⁻¹`}; c, h.` },
    { kind: 'principio', text: 'La ecuación de Rydberg da directamente el número de ondas del fotón (siempre con n₁ < n₂, se emita o se absorba):', math: `\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)` },
    { kind: 'por-que', text: 'El fotón lleva exactamente la diferencia de energía entre los dos niveles; Rydberg es esa diferencia expresada como 1/λ.' },
  ];
  if (rUnit === 'cm') steps.push({ kind: 'unidades', text: 'R está en cm⁻¹: pásala a m⁻¹ antes de calcular (1 cm⁻¹ = 100 m⁻¹).', math: `R = ${Math.round(k.R / 100).toLocaleString('es-ES')}\\;\\text{cm}^{-1} = ${texNum(k.R)}\\;\\text{m}^{-1}` });
  steps.push(
    { kind: 'sustitucion', text: '', math: `\\frac{1}{\\lambda} = ${texNum(k.R)}\\left(\\frac{1}{${n1 * n1}} - \\frac{1}{${n2 * n2}}\\right) = ${texNum(t.wavenumber)}\\;\\text{m}^{-1}` },
    { kind: 'calculo', text: 'Invertir y, a partir de λ, obtener ν y E:', math: `\\lambda = ${texNum(t.wavelength)}\\;\\text{m} = ${texNum(t.wavelength * 1e9)}\\;\\text{nm}\\qquad \\nu = \\frac{c}{\\lambda} = ${texNum(t.frequency)}\\;\\text{Hz}\\qquad E = h\\nu = ${texNum(t.energyJ)}\\;\\text{J}` },
    { kind: 'resultado', text: `λ = ${sci(t.wavelength * 1e9, 4)} nm · ν = ${sci(t.frequency)} Hz · E = ${sci(t.energyJ)} J (${sci(t.energyEV)} eV).` },
    { kind: 'interpretacion', text: `Termina en n = ${n1}: serie de ${SERIES[n1] ?? `n₁ = ${n1}`}, línea n.º ${n2 - n1}. ${emits ? 'El átomo pierde esa energía (ΔE < 0) y la emite como fotón.' : 'El átomo gana esa energía (ΔE > 0) al absorber el fotón.'}` },
    { kind: 'comprobacion', text: 'Lyman cae en 91–122 nm (UV), Balmer en 365–656 nm (visible) y Paschen en 820–1 875 nm (IR). Si tu λ no está en la franja de su serie, revisa los cuadrados o las unidades.' },
    { kind: 'errores', text: 'No elevar n al cuadrado, restar al revés (λ negativa), olvidar invertir 1/λ, dejar R en cm⁻¹ (λ 100 veces mayor) y dar a E un signo: la energía del fotón siempre es positiva.' },
  );
  return steps;
}

export function waveResolution(value: number, unit: string, lambda: number, nu: number, E: number, k: ConstantSet, withEV: boolean): ResolutionStep[] {
  return [
    { kind: 'pregunta', text: 'Caracterizar una radiación electromagnética a partir de su longitud de onda: frecuencia y energía de sus fotones.' },
    { kind: 'datos', text: `λ = ${value.toLocaleString('es-ES')} ${unit}; c = ${sci(k.c)} m/s; h = ${sci(k.h, 4)} J·s.` },
    { kind: 'unidades', text: 'Todo en unidades del SI antes de operar:', math: `\\lambda = ${value.toLocaleString('es-ES')}\\;\\text{${unit}} = ${texNum(lambda, 3)}\\;\\text{m}` },
    { kind: 'principio', text: 'Toda onda electromagnética cumple c = λ·ν; cada fotón tiene E = h·ν (Planck).', math: `c = \\lambda\\nu \\;\\to\\; \\nu = \\frac{c}{\\lambda}\\qquad E = h\\nu = \\frac{hc}{\\lambda}` },
    { kind: 'calculo', text: '', math: `\\nu = \\frac{${texNum(k.c, 3)}}{${texNum(lambda, 3)}} = ${texNum(nu, 3)}\\;\\text{Hz}\\qquad E = ${texNum(k.h)}\\cdot ${texNum(nu, 3)} = ${texNum(E, 3)}\\;\\text{J}` },
    ...(withEV ? [{ kind: 'unidades' as const, text: 'En electronvoltios (1 eV = 1,602·10⁻¹⁹ J):', math: `E = \\frac{${texNum(E, 3)}}{1,602\\cdot 10^{-19}} = ${texNum(E / 1.602e-19, 3)}\\;\\text{eV}` }] : []),
    { kind: 'comprobacion', text: 'Orden de magnitud del visible: λ ≈ 5·10⁻⁷ m, ν ≈ 6·10¹⁴ Hz, E ≈ 4·10⁻¹⁹ J ≈ 2,5 eV. A menor λ, mayor ν y mayor E.' },
    { kind: 'errores', text: 'No pasar nm a m (10⁻⁹), calcular λ/c en lugar de c/λ, o multiplicar h por λ en vez de por ν.' },
  ];
}
