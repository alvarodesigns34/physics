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

// ── ATOM 5.0 · Resoluciones específicas de más familias ─────────────────────

export function inverseSeriesResolution(o: { n1: number; n2: number; seriesName: string; byLambda: boolean; lambdaNm?: number; nu?: number; c: number; R: number; w: number; x: number; inv1: number; invN2sq: number; n2sq: number; ord: number }): ResolutionStep[] {
  return [
    { kind: 'pregunta', text: `Encontrar desde qué nivel n₂ baja el electrón para producir esa línea de la serie de ${o.seriesName}, y qué número de línea es.` },
    { kind: 'datos', text: `${o.byLambda ? `λ = ${sci(o.lambdaNm!, 4)} nm` : `ν = ${sci(o.nu!, 3)} Hz`}; serie de ${o.seriesName} → n₁ = ${o.n1}; R = ${sci(o.R, 5)} m⁻¹.` },
    { kind: 'principio', text: 'Ecuación de Rydberg, ahora con n₂ como incógnita:', math: '\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)' },
    { kind: 'por-que', text: 'La serie fija el nivel de llegada (n₁). La longitud de onda fija la energía del salto, y con ella el nivel de partida.' },
    o.byLambda
      ? { kind: 'unidades', text: 'λ al SI y su inverso:', math: `\\lambda = ${texNum(o.lambdaNm! * 1e-9)}\\;\\text{m} \\Rightarrow \\frac{1}{\\lambda} = ${texNum(o.w)}\\;\\text{m}^{-1}` }
      : { kind: 'unidades', text: 'De la frecuencia al número de ondas (c = λν):', math: `\\frac{1}{\\lambda} = \\frac{\\nu}{c} = \\frac{${texNum(o.nu!)}}{${texNum(o.c)}} = ${texNum(o.w)}\\;\\text{m}^{-1}` },
    { kind: 'despeje', text: 'Se divide entre R y se deja solo el término de n₂:', math: `\\frac{1}{n_2^2} = \\frac{1}{n_1^2} - \\frac{1}{\\lambda R} = ${texNum(o.inv1)} - ${texNum(o.x)} = ${texNum(o.invN2sq)}` },
    { kind: 'calculo', text: 'Se invierte y se saca la raíz:', math: `n_2 = \\sqrt{${texNum(o.n2sq)}} = ${texNum(Math.sqrt(o.n2sq), 3)} \\approx ${o.n2}` },
    { kind: 'resultado', text: `n₂ = ${o.n2}: el salto ${o.n2} → ${o.n1}, ${['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta'][o.ord - 1] ?? `${o.ord}.ª`} línea de la serie de ${o.seriesName}.` },
    { kind: 'comprobacion', text: `n₂ tiene que ser un entero mayor que n₁ = ${o.n1}. Si 1/n₂² sale negativo, la línea no pertenece a esa serie. Si n₂ sale lejos de un entero, revisa las unidades de λ o el valor de R.` },
    { kind: 'errores', text: 'Olvidar pasar λ a metros, restar al revés (1/λR − 1/n₁²), no invertir antes de la raíz y redondear n₂ hacia arriba «por si acaso»: tiene que salir casi entero.' },
  ];
}

export function cascadeResolution(n: number, total: number, visible: { from: number; to: number; nm: number }[] | null): ResolutionStep[] {
  const steps: ResolutionStep[] = [
    { kind: 'pregunta', text: `Cuántas líneas distintas puede emitir una muestra excitada hasta n = ${n}${visible ? ' y cuántas son visibles' : ''}.` },
    { kind: 'principio', text: 'Cada línea es un salto entre dos niveles distintos, y una muestra con muchos átomos recorre todos los caminos posibles. Contar líneas es contar parejas de niveles:', math: '\\text{líneas} = \\frac{n(n-1)}{2}' },
    { kind: 'calculo', text: '', math: `\\frac{${n} \\cdot ${n - 1}}{2} = ${total}` },
    { kind: 'metodo', text: `Comprobación sumando: desde ${n} hay ${n - 1} saltos, desde ${n - 1} hay ${n - 2}… → ${Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join(' + ')} = ${total}.` },
  ];
  if (visible) steps.push({ kind: 'interpretacion', text: `Solo pueden ser visibles los saltos que terminan en n = 2 (Balmer): ${visible.length ? visible.map((v) => `${v.from}→${v.to} (${sci(v.nm, 3)} nm)`).join(', ') : 'ninguno con estos niveles'}. Los que acaban en n = 1 son UV y los que acaban en n ≥ 3, IR.` });
  steps.push(
    { kind: 'resultado', text: `${total} líneas${visible ? `, ${visible.length} en el visible` : ''}.` },
    { kind: 'errores', text: 'Contar solo los saltos directos al nivel 1 (n − 1), o contar dos veces cada pareja (n(n − 1) sin dividir entre 2).' },
  );
  return steps;
}

export function levelResolution(n: number, E: number, withIonization: boolean): ResolutionStep[] {
  const steps: ResolutionStep[] = [
    { kind: 'pregunta', text: `Energía del electrón del hidrógeno en el nivel n = ${n}${withIonization ? ', y la energía necesaria para arrancarlo desde ahí' : ''}.` },
    { kind: 'principio', text: 'Niveles de Bohr del hidrógeno:', math: 'E_n = -\\frac{13,6\\;\\text{eV}}{n^2}' },
    { kind: 'por-que', text: 'El cero de energía es el electrón libre. Ligado al núcleo tiene menos energía, así que es negativa; y es más negativa cuanto más cerca está del núcleo (n pequeño).' },
    { kind: 'sustitucion', text: '', math: `E_{${n}} = -\\frac{13,6}{${n * n}} = ${texNum(E, 3)}\\;\\text{eV}` },
  ];
  if (withIonization) steps.push({ kind: 'calculo', text: 'Ionizar es llevarlo de Eₙ a E = 0:', math: `E_{ion} = 0 - (${texNum(E, 3)}) = ${texNum(-E, 3)}\\;\\text{eV}` });
  steps.push(
    { kind: 'resultado', text: `E(n = ${n}) = ${sci(E, 3)} eV${withIonization ? `; energía de ionización desde ese nivel: ${sci(-E, 3)} eV` : ''}.` },
    { kind: 'comprobacion', text: 'Desde n = 1 hacen falta 13,6 eV, la energía de ionización del hidrógeno. Desde niveles altos cuesta mucho menos.' },
    { kind: 'errores', text: 'Dividir entre n en lugar de entre n², dar la energía de ionización con signo negativo y confundir eV con J (1 eV = 1,602·10⁻¹⁹ J).' },
  );
  return steps;
}

export function averageMassResolution(symbol: string, iso: { a: number; mass: number; abundance: number }[], M: number): ResolutionStep[] {
  const top = [...iso].sort((a, b) => b.abundance - a.abundance)[0]!;
  return [
    { kind: 'pregunta', text: `Masa atómica media del ${symbol} a partir de las masas y abundancias de sus isótopos.` },
    { kind: 'datos', text: iso.map((i) => `${symbol}-${i.a}: ${sci(i.mass, 7)} u, ${sci(i.abundance, 4)} %`).join(' · ') },
    { kind: 'principio', text: 'Media ponderada: cada isótopo pesa según su abundancia.', math: 'M = \\frac{m_1 \\cdot \\%_1 + m_2 \\cdot \\%_2 + \\ldots}{100}' },
    { kind: 'por-que', text: 'Una muestra real contiene billones de átomos en esas proporciones. La masa que se mide es la media, no la de ningún átomo concreto.' },
    { kind: 'sustitucion', text: '', math: `M = \\frac{${iso.map((i) => `${texNum(i.mass, 7)} \\cdot ${texNum(i.abundance, 4)}`).join(' + ')}}{100}` },
    { kind: 'resultado', text: `M = ${sci(M, 6)} u.` },
    { kind: 'comprobacion', text: `M queda entre la masa del isótopo más ligero y la del más pesado, y más cerca del más abundante (${symbol}-${top.a}, ${sci(top.abundance, 3)} %).` },
    { kind: 'errores', text: 'Hacer la media aritmética (sin ponderar), olvidar dividir entre 100 y usar A (entero) en lugar de la masa isotópica cuando el enunciado da la masa exacta.' },
  ];
}

export function abundanceResolution(symbol: string, l: { a: number; mass: number }, h: { a: number; mass: number }, M: number, x: number): ResolutionStep[] {
  return [
    { kind: 'pregunta', text: `Abundancia de cada isótopo del ${symbol} conocida la masa atómica media.` },
    { kind: 'datos', text: `m₁ = ${sci(l.mass, 7)} u (${symbol}-${l.a}); m₂ = ${sci(h.mass, 7)} u (${symbol}-${h.a}); M = ${sci(M, 5)} u.` },
    { kind: 'principio', text: 'Con dos isótopos, las abundancias son x y 100 − x:', math: 'M = \\frac{m_1 x + m_2 (100 - x)}{100}' },
    { kind: 'despeje', text: 'Se agrupan los términos en x:', math: 'x = 100 \\cdot \\frac{M - m_2}{m_1 - m_2}' },
    { kind: 'sustitucion', text: '', math: `x = 100 \\cdot \\frac{${texNum(M, 5)} - ${texNum(h.mass, 7)}}{${texNum(l.mass, 7)} - ${texNum(h.mass, 7)}} = ${texNum(x, 4)}\\;\\%` },
    { kind: 'resultado', text: `${symbol}-${l.a}: ${sci(x, 4)} %; ${symbol}-${h.a}: ${sci(100 - x, 4)} %.` },
    { kind: 'comprobacion', text: `Sustituyendo: (${sci(l.mass, 5)}·${sci(x, 3)} + ${sci(h.mass, 5)}·${sci(100 - x, 3)})/100 ≈ ${sci(M, 5)} u. Además, el isótopo más abundante es el más cercano a M.` },
    { kind: 'errores', text: 'Plantear dos incógnitas sin usar que suman 100 % y equivocarse de signo al despejar: (M − m₂)/(m₁ − m₂) es positivo aunque numerador y denominador sean negativos.' },
  ];
}
