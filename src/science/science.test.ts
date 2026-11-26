import { CODATA as CODATA } from './constants';
import { describe, expect, it } from 'vitest';
import { formatNumber, parseNumber, roundSig, sciParts } from './numbers';
import { convert, parseUnit, splitValueAndUnit } from './units';
import { ELEMENTS, elementBySymbol, elementByZ, familyName, ieKJPerMol } from './elements';
import {
  aufbau,
  configurationExceptions,
  diagnoseConfiguration,
  formatConfiguration,
  groundState,
  orbitalBoxes,
  parseConfigurationText,
  speciesConfiguration,
  unpairedElectrons,
  valenceElectrons,
  valenceShell,
} from './configuration';
import { orbitalsInShell, shellCapacity, subshellCapacity, validateQuantumSet } from './quantum';
import { cieXYZ, colorName, emRegion, fromWavelength, wavelengthToLinearRGB } from './photon';
import { cascadeLineCount, cascadeLines, levelEnergyEV, seriesLimitWavelength, transition, upperLevelFromFrequency } from './hydrogen';
import { EXERCISE_DATA, PARTICLES, R_H, THEORY_DATA } from './constants';
import { averageAtomicMass } from './massSpec';
import { outerZeff, slater } from './slater';
import { atomDensity, meanRadius, radialProbability, radialCutoff } from './orbitals';
import { identify, nuclearNotation, chargeLabel } from './nucleus';
import { mulberry32 } from './numbers';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('números escritos por el alumno', () => {
  it.each([
    ['6,626·10^-34', 6.626e-34, 4],
    ['6.626e-34', 6.626e-34, 4],
    ['6,626 x 10^-34', 6.626e-34, 4],
    ['6,626×10⁻³⁴', 6.626e-34, 4],
    ['3·10⁸', 3e8, 1],
    ['3x10^8', 3e8, 1],
    ['1,0284·10^7', 1.0284e7, 5],
    ['−13,6', -13.6, 3],
    ['109 740', 109740, 6],
    ['0,00052', 0.00052, 2],
    ['2,50', 2.5, 3],
    ['10^8', 1e8, 1],
    ['9,723·10-8', 9.723e-8, 4],
  ])('%s → %d (%d c.s.)', (txt, value, sig) => {
    const p = parseNumber(txt)!;
    expect(p).not.toBeNull();
    expect(rel(p.value, value)).toBeLessThan(1e-12);
    expect(p.sigFigs).toBe(sig);
  });
  it('detecta ceros finales ambiguos y rechaza basura', () => {
    expect(parseNumber('500')!.ambiguousSigFigs).toBe(true);
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
  it('formatea en notación española', () => {
    expect(formatNumber(6e14, { sig: 3 })).toBe('6,00·10¹⁴');
    expect(formatNumber(-13.6057, { sig: 3 })).toBe('−13,6');
    expect(formatNumber(656.47, { sig: 4 })).toBe('656,5');
    expect(formatNumber(109740, { sig: 6 })).toBe('109 740');
    expect(formatNumber(9.99e-8, { sig: 2 })).toBe('1,0·10⁻⁷');
    expect(roundSig(35.452715, 5)).toBe(35.453);
    expect(sciParts(1.0284e7, 5)).toEqual({ mantissa: '1,0284', exponent: 7, negative: false });
  });
});

describe('unidades', () => {
  it('reconoce variantes', () => {
    expect(parseUnit('s^-1')!.symbol).toBe('s⁻¹');
    expect(parseUnit('cm-1')!.symbol).toBe('cm⁻¹');
    expect(parseUnit('KJ/mol')!.symbol).toBe('kJ/mol');
    expect(parseUnit('Hz')!.quantity).toBe('frecuencia');
    expect(parseUnit('ev')!.symbol).toBe('eV');
    expect(parseUnit('furlongs')).toBeNull();
  });
  it('convierte', () => {
    expect(convert(500, 'nm', 'm')).toBeCloseTo(5e-7, 20);
    expect(convert(109740, 'cm⁻¹', 'm⁻¹')).toBeCloseTo(1.0974e7, 3);
    expect(convert(1, 'eV', 'J')).toBeCloseTo(1.602176634e-19, 30);
    expect(() => convert(1, 'nm', 'Hz')).toThrow();
  });
  it('separa valor y unidad', () => {
    expect(splitValueAndUnit('6,0·10^14 Hz')).toEqual({ numberText: '6,0·10^14', unitText: 'Hz' });
    expect(splitValueAndUnit('6,626e-34 J')).toEqual({ numberText: '6,626e-34', unitText: 'J' });
    expect(splitValueAndUnit('3 x 10^8 m/s')).toEqual({ numberText: '3x 10^8', unitText: 'm/s' });
    expect(splitValueAndUnit('500nm')).toEqual({ numberText: '500', unitText: 'nm' });
    expect(splitValueAndUnit('2,5')).toEqual({ numberText: '2,5', unitText: '' });
  });
});

describe('elementos', () => {
  it('hay 118, ordenados y con símbolos únicos', () => {
    expect(ELEMENTS).toHaveLength(118);
    ELEMENTS.forEach((e, i) => expect(e.z).toBe(i + 1));
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
  });
  it('posiciones de la tabla según TEO p.17 (Lu y Lr en el grupo 3)', () => {
    expect(elementBySymbol('Lu')!.group).toBe(3);
    expect(elementBySymbol('La')!.group).toBeNull();
    expect(elementBySymbol('La')!.block).toBe('f');
    expect(elementBySymbol('He')!.block).toBe('s');
    expect(elementBySymbol('He')!.group).toBe(18);
    expect(elementBySymbol('Br')!.period).toBe(4);
    expect(familyName(elementBySymbol('Cl')!)).toBe('Halógenos');
    expect(familyName(elementBySymbol('H')!)).toMatch(/no metal/);
  });
  it('energías de ionización de AMP 29 y 31 (kJ/mol)', () => {
    expect(ieKJPerMol(elementBySymbol('Ne')!.ie1!)).toBeCloseTo(2081, -1);
    expect(ieKJPerMol(elementBySymbol('Na')!.ie1!)).toBeCloseTo(496, -0);
    expect(ieKJPerMol(elementBySymbol('Cl')!.ie1!)).toBeCloseTo(1251, -0);
    expect(ieKJPerMol(elementBySymbol('K')!.ie1!)).toBeCloseTo(419, -0);
    // AMP 25: Na 5,14 eV; Mg 7,64 eV
    expect(elementBySymbol('Na')!.ie1!).toBeCloseTo(5.14, 2);
    expect(elementBySymbol('Mg')!.ie1!).toBeCloseTo(7.65, 1);
  });
  it('tendencias con datos reales (AMP 24, 26, 28, 30 y TEO 20)', () => {
    const E = (s: string) => elementBySymbol(s)!;
    expect(E('Cl').ie1!).toBeGreaterThan(E('Si').ie1!);
    expect(E('Mg').ie1!).toBeGreaterThan(E('Ca').ie1!);
    expect(E('Ca').ie1!).toBeGreaterThan(E('Sr').ie1!);
    expect(E('K').ie2! / E('K').ie1!).toBeGreaterThan(7);
    expect(E('Ca').ie2! / E('Ca').ie1!).toBeLessThan(2);
    // Errata E13: Mn y Zn no forman aniones estables
    expect(E('Mn').electronAffinity).toBeNull();
    expect(E('Zn').electronAffinity).toBeNull();
    expect(E('Cl').electronAffinity!).toBeGreaterThan(E('P').electronAffinity!);
    expect(E('P').electronAffinity!).toBeGreaterThan(E('Rb').electronAffinity!);
    // Excepción relevante: AE(Cl) > AE(F)
    expect(E('Cl').electronAffinity!).toBeGreaterThan(E('F').electronAffinity!);
  });
  it('radios cristalinos coinciden con la figura de TEO p.21', () => {
    const r = (s: string, q: number) => elementBySymbol(s)!.ionicRadii.find(([c]) => c === q)?.[1];
    expect(r('Li', 1)).toBe(90);
    expect(r('Na', 1)).toBe(116);
    expect(r('Cl', -1)).toBe(167);
    expect(r('S', -2)).toBe(170);
    expect(r('Ca', 2)).toBe(114);
  });
});

describe('configuración electrónica', () => {
  it('el orden de Möller es el de TEO p.14', () => {
    expect(formatConfiguration(aufbau(118), { superscript: false })).toBe(
      '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p6',
    );
  });
  it('las 118 configuraciones de referencia tienen Z electrones y respetan Pauli', () => {
    for (let z = 1; z <= 118; z++) {
      const c = groundState(z);
      expect(c.reduce((a, s) => a + s.e, 0)).toBe(z);
      c.forEach((s) => expect(s.e).toBeLessThanOrEqual(subshellCapacity(s.l)));
    }
  });
  it('las excepciones del temario (Cr, Mo, Cu, Ag, Au) están entre las excepciones reales', () => {
    const ex = configurationExceptions();
    for (const s of ['Cr', 'Mo', 'Cu', 'Ag', 'Au']) expect(ex).toContain(elementBySymbol(s)!.z);
    expect(formatConfiguration(groundState(24), { abbreviate: true, order: 'capas', superscript: false })).toBe('[Ar] 3d5 4s1');
    expect(formatConfiguration(groundState(29), { abbreviate: true, order: 'capas', superscript: false })).toBe('[Ar] 3d10 4s1');
    // Elementos ligeros y representativos siguen Möller
    for (let z = 1; z <= 23; z++) expect(ex).not.toContain(z);
  });
  it('corrige las erratas E5 y E6 (P y Nd)', () => {
    expect(formatConfiguration(groundState(15), { abbreviate: true, superscript: false })).toBe('[Ne] 3s2 3p3');
    expect(formatConfiguration(groundState(60), { abbreviate: true, superscript: false })).toBe('[Xe] 6s2 4f4');
  });
  it('iones (TEO 7, 8b; AMP 22a)', () => {
    const f = (z: number, e: number) => formatConfiguration(speciesConfiguration(z, e), { abbreviate: true, order: 'capas', superscript: false });
    expect(formatConfiguration(speciesConfiguration(8, 10), { superscript: false })).toBe('1s2 2s2 2p6');
    expect(f(26, 24)).toBe('[Ar] 3d6');
    expect(f(26, 23)).toBe('[Ar] 3d5');
    expect(f(29, 28)).toBe('[Ar] 3d10');
    expect(f(20, 18)).toBe('[Ne] 3s2 3p6');
    expect(f(35, 36)).toBe('[Ar] 3d10 4s2 4p6');
    expect(f(50, 48)).toBe('[Kr] 4d10 5s2');
  });
  it('electrones desapareados y valencia (TEO 7)', () => {
    expect(unpairedElectrons(groundState(8))).toBe(2);
    expect(unpairedElectrons(speciesConfiguration(8, 10))).toBe(0);
    expect(unpairedElectrons(groundState(24))).toBe(6);
    expect(orbitalBoxes(1, 5)).toEqual([2, 2, 1]);
    expect(valenceShell(groundState(35))).toBe(4);
    expect(valenceElectrons(groundState(35))).toBe(7);
    expect(valenceElectrons(groundState(20))).toBe(2);
  });
  it('interpreta escrituras habituales', () => {
    const p = parseConfigurationText('1s22s22p63s23p4');
    expect(p.ok).toBe(true);
    expect(p.tokens.map((t) => t.e)).toEqual([2, 2, 6, 2, 4]);
    const q = parseConfigurationText('[Ar] 3d10 4s2 4p5');
    expect(q.core!.symbol).toBe('Ar');
    expect(q.tokens.map((t) => t.raw)).toEqual(['3d10', '4s2', '4p5']);
    expect(parseConfigurationText('1s²2s²2p⁶3s¹').tokens).toHaveLength(4);
    expect(parseConfigurationText('3d104s2').tokens.map((t) => t.raw)).toEqual(['3d10', '4s2']);
    expect(parseConfigurationText('[Xx] 1s2').ok).toBe(false);
    expect(parseConfigurationText('1x2').ok).toBe(false);
  });
  it('AMP 15: 16 electrones → S, grupo 16, periodo 3', () => {
    const d = diagnoseConfiguration('1s2 2s2 2p6 3s2 3p4', { expectedElectrons: 16 });
    expect(d.status).toBe('fundamental');
    expect(elementByZ(d.electrons)!.symbol).toBe('S');
  });
  it('AMP 17', () => {
    expect(diagnoseConfiguration('1s2 2s2 2p2').status).toBe('fundamental'); // C
    const b = diagnoseConfiguration('1s2 2s2 2p6 2d2');
    expect(b.status).toBe('imposible');
    expect(b.issues[0]!.code).toBe('subnivel-inexistente');
    const c = diagnoseConfiguration('1s2 2s2 2p6 4s2');
    expect(c.status).toBe('excitado'); // Mg excitado
    expect(c.electrons).toBe(12);
    expect(diagnoseConfiguration('1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p3').status).toBe('fundamental'); // As
  });
  it('AMP 19', () => {
    expect(diagnoseConfiguration('[Ar] 4s2').status).toBe('fundamental'); // Ca
    expect(diagnoseConfiguration('[He] 3s2 3p4').status).toBe('excitado'); // salta 2s y 2p
    expect(diagnoseConfiguration('[Ne] 3s2 2d10 3p3').status).toBe('imposible');
    expect(diagnoseConfiguration('[Kr] 5s2 4d10 5p4').status).toBe('fundamental'); // Te
  });
  it('póster: estados fundamental, excitado y prohibido del sodio', () => {
    expect(diagnoseConfiguration('1s2 2s2 2p6 3s1').status).toBe('fundamental');
    expect(diagnoseConfiguration('1s2 2s2 2p6', { z: 11 }).status).toBe('fundamental'); // Na+
    expect(diagnoseConfiguration('1s2 2s2 2p5 3s2').status).toBe('excitado');
    expect(diagnoseConfiguration('1s2 2s2 2p4 3s3').status).toBe('prohibido');
  });
  it('Cr según Möller se señala como excepción', () => {
    const d = diagnoseConfiguration('[Ar] 4s2 3d4');
    expect(d.status).toBe('excitado');
    expect(d.issues.some((i) => i.code === 'excepcion-moller')).toBe(true);
    expect(diagnoseConfiguration('[Ar] 4s1 3d5').status).toBe('fundamental');
  });
  it('detecta electrones de más o de menos', () => {
    const d = diagnoseConfiguration('1s2 2s2 2p5', { expectedElectrons: 8 });
    expect(d.issues.some((i) => i.code === 'numero-electrones')).toBe(true);
  });
});

describe('números cuánticos', () => {
  it('AMP 12', () => {
    expect(validateQuantumSet({ n: 1, l: 1, ml: -1, ms: 0.5 }).valid).toBe(false);
    expect(validateQuantumSet({ n: 2, l: 0, ml: 0, ms: -1 }).errors[0]!.code).toBe('ms-invalido');
    expect(validateQuantumSet({ n: 2, l: 1, ml: -2, ms: 0.5 }).errors[0]!.code).toBe('ml-fuera-de-rango');
    const d = validateQuantumSet({ n: 7, l: 5, ml: -2, ms: -0.5 }); // errata/matiz E18
    expect(d.valid).toBe(true);
    expect(d.orbital).toBe('7h');
    expect(d.note).toBeTruthy();
  });
  it('TEO 2 y 5', () => {
    expect(validateQuantumSet({ n: 2, l: 2, ml: 0, ms: 0.5 }).valid).toBe(false);
    expect(validateQuantumSet({ n: 3, l: 2, ml: 0, ms: 0 }).valid).toBe(false);
    expect(validateQuantumSet({ n: 4, l: 3, ml: -1, ms: 0.5 }).orbital).toBe('4f');
    expect(validateQuantumSet({ n: 4, l: 2, ml: 0, ms: 0.5 }).orbital).toBe('4d');
    expect(validateQuantumSet({ n: 3, l: 3, ml: 2, ms: -0.5 }).valid).toBe(false);
  });
  it('TEO 3: n = 3 → 9 orbitales y 18 electrones', () => {
    expect(orbitalsInShell(3)).toBe(9);
    expect(shellCapacity(3)).toBe(18);
  });
});

describe('fotones (AMP 6)', () => {
  const p = fromWavelength(500e-9, EXERCISE_DATA);
  it('ν = 6·10¹⁴ Hz y E = 3,976·10⁻¹⁹ J', () => {
    expect(rel(p.frequency, 6e14)).toBeLessThan(1e-12);
    expect(rel(p.energyJ, 3.9756e-19)).toBeLessThan(1e-9);
    expect(p.region.id).toBe('visible');
    expect(colorName(500)).toMatch(/verde|cian/);
  });
  it('regiones', () => {
    expect(emRegion(102.5e-9).id).toBe('uv');
    expect(emRegion(1875e-9).id).toBe('ir');
    expect(emRegion(1e-12).id).toBe('gamma');
    expect(emRegion(3).id).toBe('radio');
  });
  it('tabla CIE 1931 y tonos espectrales', () => {
    const [x, y] = cieXYZ(700);
    expect(x).toBeCloseTo(0.011359, 6);
    expect(y).toBeCloseTo(0.004102, 6);
    const [r7, g7, b7] = wavelengthToLinearRGB(700);
    expect(g7).toBeLessThan(0.02 * r7); // 700 nm: rojo puro, no naranja
    expect(b7).toBeLessThan(0.2 * r7);
    const [r58, g58, b58] = wavelengthToLinearRGB(580);
    const enc = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    expect(enc(g58) / enc(r58)).toBeGreaterThan(0.6); // amarillo (sRGB codificado)
    expect(b58).toBeLessThan(0.05);
  });
  it('colores espectrales plausibles', () => {
    const [r, g, b] = wavelengthToLinearRGB(656);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
    const [r2, , b2] = wavelengthToLinearRGB(450);
    expect(b2).toBeGreaterThan(r2);
    expect(wavelengthToLinearRGB(1000)).toEqual([0, 0, 0]);
  });
});

describe('hidrógeno: Bohr y Rydberg', () => {
  it('niveles de energía de la figura de TEO p.10', () => {
    expect(levelEnergyEV(1)).toBeCloseTo(-13.6, 1);
    expect(levelEnergyEV(2)).toBeCloseTo(-3.4, 2);
    expect(levelEnergyEV(3)).toBeCloseTo(-1.51, 2);
    expect(levelEnergyEV(4)).toBeCloseTo(-0.85, 2);
  });
  it('TEO ejemplo 1: tercera línea de Lyman', () => {
    const t = transition(4, 1, THEORY_DATA);
    expect(rel(t.wavenumber, 1.0284e7)).toBeLessThan(1e-4);
    expect(rel(t.wavelength, 9.723e-8)).toBeLessThan(2e-4);
    expect(rel(t.frequency, 3.085e15)).toBeLessThan(5e-4);
    expect(t.lineIndex).toBe(3);
    expect(t.series!.name).toBe('Lyman');
  });
  it('AMP 7: n = 3 → 1', () => {
    const t = transition(3, 1, EXERCISE_DATA);
    expect(t.type).toBe('emision');
    expect(rel(t.wavelength, 1.0252e-7)).toBeLessThan(1e-4);
    expect(rel(t.frequency, 2.9264e15)).toBeLessThan(1e-4);
    expect(rel(t.energyJ, 1.939e-18)).toBeLessThan(1e-3);
    expect(t.energyEV).toBeCloseTo(12.1, 1);
    expect(t.region.id).toBe('uv');
    expect(t.energyJ).toBeGreaterThan(transition(3, 2, EXERCISE_DATA).energyJ);
    expect(t.deltaEJ).toBeLessThan(0);
  });
  it('AMP 8: primera línea de Lyman', () => {
    const t = transition(2, 1, EXERCISE_DATA);
    expect(rel(t.wavelength, 1.215e-7)).toBeLessThan(1e-3);
    expect(rel(t.frequency, 2.469e15)).toBeLessThan(1e-3);
    expect(rel(t.energyJ, 1.636e-18)).toBeLessThan(1e-3);
  });
  it('AMP 9: Paschen con ν = 2,34·10¹⁴ Hz → n₂ = 5 (segunda línea)', () => {
    const r = upperLevelFromFrequency(3, 2.34e14, EXERCISE_DATA);
    expect(r.nearest).toBe(5);
    expect(r.exact).toBeCloseTo(5, 1);
  });
  it('AMP 10: desde n = 4 aparecen 6 líneas', () => {
    expect(cascadeLineCount(4)).toBe(6);
    expect(cascadeLines(4)).toHaveLength(6);
  });
  it('tabla de series de TEO p.10 (con R_H de referencia)', () => {
    const nm = (a: number, b: number) => transition(b, a).wavelength * 1e9;
    expect(nm(1, 2)).toBeCloseTo(121.6, 0);
    expect(nm(2, 3)).toBeCloseTo(656.5, 0);
    expect(nm(2, 4)).toBeCloseTo(486.3, 0);
    expect(nm(3, 4)).toBeCloseTo(1875.6, -1);
    expect(nm(4, 5)).toBeCloseTo(4052, -1);
    expect(nm(5, 6)).toBeCloseTo(7460, -1);
  });
  it('errata E2: el límite de Balmer está en el ultravioleta', () => {
    expect(emRegion(seriesLimitWavelength(2)).id).toBe('uv');
    expect(transition(3, 2).region.id).toBe('visible');
    expect(R_H).toBeCloseTo(10967758.3, 0);
  });
});

describe('espectrometría de masas', () => {
  it('ejemplo del cloro corregido (errata E1)', () => {
    const ok = averageAtomicMass([
      { mass: 34.96885, abundance: 75.771 },
      { mass: 36.9659, abundance: 24.229 },
    ]);
    expect(ok.value).toBeCloseTo(35.453, 3);
    expect(ok.abundancesInconsistent).toBe(false);
    const typo = averageAtomicMass([
      { mass: 34.96885, abundance: 74.771 },
      { mass: 36.9659, abundance: 24.229 },
    ]);
    expect(typo.value).toBeCloseTo(35.103, 3);
    expect(typo.abundancesInconsistent).toBe(true);
  });
});

describe('Slater', () => {
  it('valores clásicos', () => {
    expect(outerZeff(11, groundState(11)).zeff).toBeCloseTo(2.2, 5);
    expect(outerZeff(7, groundState(7)).zeff).toBeCloseTo(3.9, 5);
    expect(outerZeff(30, groundState(30)).zeff).toBeCloseTo(4.35, 5);
    expect(slater(26, groundState(26), { n: 3, l: 2 }).zeff).toBeCloseTo(6.25, 5);
    expect(outerZeff(2, groundState(2)).zeff).toBeCloseTo(1.7, 5);
  });
  it('Z_ef aumenta en el periodo 3 y es casi constante en el grupo 1', () => {
    const zs = [11, 12, 13, 14, 15, 16, 17].map((z) => outerZeff(z, groundState(z)).zeff);
    zs.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(zs[i]!));
    expect(outerZeff(19, groundState(19)).zeff).toBeCloseTo(2.2, 5);
  });
});

describe('orbitales hidrogenoides', () => {
  it.each([
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 0],
  ])('normalización y ⟨r⟩ de %d,%d', (n, l) => {
    const Z = 1;
    const rmax = radialCutoff(n, Z);
    const N = 20000;
    let norm = 0;
    let mean = 0;
    for (let i = 1; i <= N; i++) {
      const r = (rmax * i) / N;
      const p = radialProbability(n, l, Z, r);
      norm += p * (rmax / N);
      mean += r * p * (rmax / N);
    }
    expect(norm).toBeCloseTo(1, 4);
    expect(mean).toBeCloseTo(meanRadius(n, l, Z), 2);
  });
  it('la nube del neón es reproducible y la 2p es más externa que la 1s', () => {
    const conf = groundState(10);
    const a = atomDensity(10, conf, 3000, mulberry32(7));
    const b = atomDensity(10, conf, 3000, mulberry32(7));
    expect(a.positions).toEqual(b.positions);
    expect(a.subshells.map((s) => s.label)).toEqual(['1s', '2s', '2p']);
    expect(a.subshells[2]!.meanRadius).toBeGreaterThan(a.subshells[0]!.meanRadius);
    expect(a.subshells.reduce((x, s) => x + s.count, 0)).toBe(3000);
  });
});

describe('identidad de especies (AMP 1–5)', () => {
  it('oro-197', () => {
    const id = identify({ z: 79, n: 118, e: 79 });
    expect(id.element!.name).toBe('Oro');
    expect(id.massNumber).toBe(197);
    expect(id.kind).toBe('neutro');
  });
  it('iones de AMP 4 y 5', () => {
    expect(identify({ z: 8, n: 8, e: 10 }).charge).toBe(-2);
    expect(identify({ z: 13, n: 14, e: 10 }).kind).toBe('cation');
    const cr = identify({ z: 24, n: 28, e: 22 });
    expect(cr.element!.symbol).toBe('Cr');
    expect(cr.charge).toBe(2);
    expect(cr.massNumber).toBe(52);
    expect(identify({ z: 11, n: 12, e: 10 }).isoelectronicWith!.symbol).toBe('Ne');
    expect(chargeLabel(-1)).toBe('−');
    expect(nuclearNotation({ z: 11, n: 12, e: 10 })).toBe('²³₁₁Na⁺');
  });
  it('partículas: valores CODATA (errata E14)', () => {
    expect(PARTICLES.electron.massU).toBeCloseTo(0.000549, 6);
    expect(PARTICLES.proton.massU).toBeCloseTo(1.007276, 6);
    expect(PARTICLES.neutron.massU).toBeCloseTo(1.008665, 6);
  });
});

describe('tamaño de la nube electrónica', () => {
  it('sigue las tendencias reales: Cs > K > Na > Li > Ne y el F < O', () => {
    const outer = (z: number) => {
      const d = atomDensity(z, groundState(z), 10, mulberry32(1));
      return Math.max(...d.subshells.filter((s) => s.n === Math.max(...d.subshells.map((x) => x.n))).map((s) => s.meanRadius));
    };
    expect(outer(55)).toBeGreaterThan(outer(19));
    expect(outer(19)).toBeGreaterThan(outer(11));
    expect(outer(11)).toBeGreaterThan(outer(3));
    expect(outer(3)).toBeGreaterThan(outer(10));
    expect(outer(8)).toBeGreaterThan(outer(9));
    // Cs: del orden de 5–10 a₀ (radio covalente real ≈ 4,6 a₀), no 25 a₀ como daría el modelo hidrogenoide
    expect(outer(55)).toBeLessThan(10);
  });
});

import { closestApproach, deflection, impactForAngle, trajectory, finalAngle, fractionAbove, GOLD_NUMBER_DENSITY, sampleAngle, GEIGER_MARSDEN, classicalCollapseTime } from './scattering';
import { cathodeBeam, cathodeExitDeflection, sectorRadius, massAtRadius } from './instruments';
import { compare, commonIon, PROPERTIES } from './trends';
import { momentumSpread, HBAR } from './uncertainty';

describe('dispersión de Rutherford', () => {
  it('distancia de máximo acercamiento para α de 4,8 MeV en oro ≈ 47 fm', () => {
    expect(closestApproach(4.8)).toBeCloseTo(47.4, 0);
  });
  it('la trayectoria integrada reproduce tan(θ/2) = d/(2b)', () => {
    for (const b of [0.25, 0.5, 1, 2, 4]) {
      const traj = trajectory(b, 40000, -400); // la cola coulombiana 1/r exige partir de lejos
      expect(finalAngle(traj)).toBeCloseTo(deflection(b, 1), 2);
    }
    expect(impactForAngle(deflection(3, 2), 2)).toBeCloseTo(3, 10);
  });
  it('la fracción de grandes desviaciones es pequeñísima (núcleo diminuto)', () => {
    const d = closestApproach(4.8);
    const p90 = fractionAbove(Math.PI / 2, d, GOLD_NUMBER_DENSITY, 4e-7);
    expect(p90).toBeGreaterThan(1e-5);
    expect(p90).toBeLessThan(1e-4);
    expect(GOLD_NUMBER_DENSITY).toBeCloseTo(5.9e28, -27);
  });
  it('Monte Carlo: el modelo de Thomson no produce desviaciones > 10°; el nuclear sí', () => {
    const rng = mulberry32(11);
    let rut = 0;
    let tho = 0;
    const N = 200000;
    const ten = (10 * Math.PI) / 180;
    for (let i = 0; i < N; i++) {
      if (sampleAngle('rutherford', GEIGER_MARSDEN, rng) > ten) rut++;
      if (sampleAngle('thomson', GEIGER_MARSDEN, rng) > ten) tho++;
    }
    expect(tho).toBe(0);
    const expected = fractionAbove(ten, closestApproach(GEIGER_MARSDEN.energyMeV), GOLD_NUMBER_DENSITY, GEIGER_MARSDEN.thickness);
    expect(rut / N).toBeGreaterThan(expected * 0.7);
    expect(rut / N).toBeLessThan(expected * 1.3);
  });
  it('colapso clásico del átomo de Rutherford ≈ 1,6·10⁻¹¹ s', () => {
    expect(classicalCollapseTime()).toBeCloseTo(1.56e-11, 12);
  });
});

describe('instrumentos', () => {
  const setup = { accel: 2000, plates: 200, gap: 0.02, length: 0.05, drift: 0.15, B: 0 };
  it('tubo de rayos catódicos: la integración coincide con y₁ = qEL²/(2mv²)', () => {
    const r = cathodeBeam(setup, 4000);
    expect(r.exitY).toBeCloseTo(cathodeExitDeflection(setup), 4);
    expect(r.screenY).toBeGreaterThan(0); // hacia la placa positiva
  });
  it('compensando con B = E/v el haz no se desvía', () => {
    const b0 = cathodeBeam(setup).balanceB;
    const r = cathodeBeam({ ...setup, B: b0 }, 4000);
    expect(Math.abs(r.screenY)).toBeLessThan(1e-4);
    expect(r.balanced).toBe(true);
  });
  // ── Validación independiente del integrador de Boris (soluciones analíticas) ──
  const qm = CODATA.e / CODATA.me;
  const v0 = (s: { accel: number }) => Math.sqrt(2 * qm * s.accel);
  it('Boris, solo E: deflexión en pantalla = (qEL/mv²)·(L/2 + D) con error relativo < 1e-9', () => {
    const r = cathodeBeam(setup, 200);
    const E = setup.plates / setup.gap;
    const v = v0(setup);
    const exact = ((qm * E * setup.length) / (v * v)) * (setup.length / 2 + setup.drift);
    expect(Math.abs(r.screenY - exact) / exact).toBeLessThan(1e-9);
    expect(Math.abs(r.exitY - cathodeExitDeflection(setup)) / cathodeExitDeflection(setup)).toBeLessThan(1e-9);
  });
  it('Boris, solo B: |v| se conserva y la trayectoria es la circunferencia r = mv/(qB)', () => {
    const s2 = { ...setup, plates: 0, B: 5e-4 };
    const v = v0(s2);
    const R = v / (qm * s2.B);
    const r = cathodeBeam(s2, 2000);
    // y(L) sobre la circunferencia que parte tangente al eje x: R − √(R² − L²) (el electrón se curva hacia +y con B en −z)
    // B en −z se opone a la fuerza eléctrica sobre el electrón: la curva va hacia −y.
    const exact = -(R - Math.sqrt(R * R - setup.length * setup.length));
    expect(Math.abs(r.exitY - exact) / Math.abs(exact)).toBeLessThan(1e-5);
    // Conservación de la energía cinética: la pendiente de salida corresponde a una velocidad de módulo v
    const ang = Math.asin(setup.length / R);
    const slopeExact = -Math.tan(ang);
    const slope = (r.screenY - r.exitY) / setup.drift;
    expect(Math.abs(slope - slopeExact) / Math.abs(slopeExact)).toBeLessThan(1e-5);
  });
  it('Boris, campos cruzados compensados (B = E/v): el haz no se desvía (deriva E×B exacta)', () => {
    const b0 = cathodeBeam(setup).balanceB;
    const r = cathodeBeam({ ...setup, B: b0 }, 100);
    expect(Math.abs(r.screenY)).toBeLessThan(1e-12);
  });
  it('Boris: con E y B no compensados converge (error relativo < 1e-5 con 400 pasos y ×10 menor con 3200)', () => {
    const s3 = { ...setup, B: 5e-4 };
    const ref = cathodeBeam(s3, 256000).screenY;
    const e400 = Math.abs(cathodeBeam(s3, 400).screenY - ref);
    const e3200 = Math.abs(cathodeBeam(s3, 3200).screenY - ref);
    expect(e400 / Math.abs(ref)).toBeLessThan(1e-5);
    expect(e3200).toBeLessThan(e400 / 10);
  });
  it('choque con la placa: el punto de impacto está exactamente en |y| = d/2 y no hay punto en pantalla', () => {
    const r = cathodeBeam({ ...setup, plates: 3000 }, 400);
    expect(r.hitsPlate).toBe(true);
    expect(Number.isNaN(r.screenY)).toBe(true);
    expect(Math.abs(r.path[r.path.length - 1]!)).toBeCloseTo(setup.gap / 2, 8); // Float32 en el trazado
  });
  it('B muy intenso: el haz se curva hacia atrás sin bucles infinitos', () => {
    const r = cathodeBeam({ ...setup, plates: 0, gap: 1, B: 0.05 }, 400);
    expect(r.turnsBack || r.hitsPlate).toBe(true);
    expect(Number.isNaN(r.screenY)).toBe(true);
  });
  it('entradas inválidas: errores comprensibles', () => {
    expect(() => cathodeBeam({ ...setup, accel: 0 })).toThrow(/aceleración/);
    expect(() => cathodeBeam({ ...setup, gap: NaN })).toThrow(/separación/);
    expect(() => cathodeBeam({ ...setup, drift: -1 })).toThrow(/pantalla/);
  });
  it('espectrómetro de sector magnético: r ∝ √m y la inversa es coherente', () => {
    const r35 = sectorRadius(34.968853, 1, 2000, 0.3);
    const r37 = sectorRadius(36.965903, 1, 2000, 0.3);
    expect(r37 / r35).toBeCloseTo(Math.sqrt(36.965903 / 34.968853), 10);
    expect(massAtRadius(r35, 1, 2000, 0.3)).toBeCloseTo(34.968853, 6);
  });
  it('incertidumbre mínima del paquete gaussiano', () => {
    expect(momentumSpread(1e-10) * 1e-10).toBeCloseTo(HBAR / 2, 45);
  });
});

describe('tendencias periódicas con datos reales', () => {
  const E = (s: string) => elementBySymbol(s)!;
  it('mismo periodo y mismo grupo siguen la tendencia (radio, EI, χ)', () => {
    const r = compare('radio', E('Na'), E('Cl'));
    expect(r.relation).toBe('mismo-periodo');
    expect(r.predicted!.symbol).toBe('Na');
    expect(r.actual!.symbol).toBe('Na');
    expect(r.exception).toBeNull();
    expect(compare('ei1', E('Mg'), E('Ca')).actual!.symbol).toBe('Mg');
    expect(compare('en', E('F'), E('I')).predicted!.symbol).toBe('F');
  });
  it('excepciones relevantes: EI (N > O, Be > B) y AE (Cl > F)', () => {
    const no = compare('ei1', E('N'), E('O'));
    expect(no.predicted!.symbol).toBe('O');
    expect(no.actual!.symbol).toBe('N');
    expect(no.exception).toMatch(/semillena/);
    expect(compare('ei1', E('Be'), E('B')).exception).toMatch(/np¹/);
    const fcl = compare('ae', E('F'), E('Cl'));
    expect(fcl.actual!.symbol).toBe('Cl');
    expect(fcl.exception).toMatch(/flúor/);
  });
  it('Z_ef de Slater crece en el periodo', () => {
    expect(PROPERTIES.zeff.get(E('Cl'))!).toBeGreaterThan(PROPERTIES.zeff.get(E('Na'))!);
  });
  it('iones estables (TEO p.18, AMP 22a)', () => {
    expect(commonIon(E('Ca')).charge).toBe(2);
    expect(commonIon(E('Na')).charge).toBe(1);
    expect(commonIon(E('S')).charge).toBe(-2);
    expect(commonIon(E('Br')).charge).toBe(-1);
    expect(commonIon(E('Ar')).charge).toBeNull();
  });
});

import { boxesFromConfiguration, diagnoseBoxes, aufbauStep, addToSubshell, exciteOne, emptyBoxes, configurationFromBoxes } from './boxes';

describe('diagramas de cajas (Electron Architect)', () => {
  it('estado fundamental del oxígeno y del cromo (excepción)', () => {
    const o = boxesFromConfiguration(groundState(8));
    expect(o['2p']).toEqual([3, 1, 1]);
    expect(diagnoseBoxes(o, 8, 8).status).toBe('fundamental');
    const cr = diagnoseBoxes(boxesFromConfiguration(groundState(24)), 24, 24);
    expect(cr.status).toBe('fundamental');
    expect(cr.exception).toBe(true);
  });
  it('Pauli, Hund y Aufbau', () => {
    const base = boxesFromConfiguration(groundState(7)); // N: 2p ↑↑↑
    expect(diagnoseBoxes({ ...base, '2p': [4, 1, 0] }, 7, 7).status).toBe('prohibido');
    const hundPair = diagnoseBoxes({ ...base, '2p': [3, 1, 0] }, 7, 7);
    expect(hundPair.status).toBe('excitado');
    expect(hundPair.hund).toEqual(['2p']);
    expect(diagnoseBoxes({ ...base, '2p': [1, 2, 1] }, 7, 7).hund).toEqual(['2p']);
    expect(diagnoseBoxes(exciteOne(base), 7, 7).status).toBe('excitado');
    expect(diagnoseBoxes(base, 7, 8).status).toBe('incompleto');
  });
  it('construcción paso a paso: 26 pasos dan el Fe según Möller', () => {
    let b = emptyBoxes();
    for (let i = 0; i < 26; i++) b = aufbauStep(b)!.boxes;
    expect(configurationFromBoxes(b)).toEqual(groundState(26));
    expect(addToSubshell(b, '3d', -1)['3d']).toEqual([1, 1, 1, 1, 1]); // d⁶ → d⁵: quedan cinco desapareados
  });
});

describe('superficies de contorno de orbitales', () => {
  it('1s: la esfera del 90 % tiene r ≈ 2,66 a₀', async () => {
    const { orbitalGrid } = await import('./isosurface');
    const g = orbitalGrid(1, 0, 0, 64, 0.9);
    const r = -Math.log(g.iso * Math.sqrt(Math.PI));
    expect(r).toBeGreaterThan(2.58);
    expect(r).toBeLessThan(2.74);
  });
  it('2p: la rejilla conserva la normalización y el umbral encierra el 90 %', async () => {
    const { orbitalGrid } = await import('./isosurface');
    const g = orbitalGrid(2, 1, 0, 56, 0.9);
    const dx = g.half / (g.size / 2);
    let tot = 0;
    for (const v of g.psi) tot += v * v * dx ** 3;
    expect(tot).toBeGreaterThan(0.97);
    expect(tot).toBeLessThan(1.03);
    expect(g.enclosed).toBeGreaterThan(0.89);
    expect(g.enclosed).toBeLessThan(0.92);
  });
});

describe('dominio y casos degenerados', () => {
  it('masa media: abundancias nulas, negativas, no finitas o > 100 % se rechazan con un mensaje claro', async () => {
    const { averageAtomicMass, twoIsotopeAbundance } = await import('./massSpec');
    expect(() => averageAtomicMass([{ mass: 35, abundance: 0 }, { mass: 37, abundance: 0 }])).toThrow(/suman 0/);
    expect(() => averageAtomicMass([{ mass: 35, abundance: -1 }])).toThrow(/no negativo/);
    expect(() => averageAtomicMass([{ mass: NaN, abundance: 50 }])).toThrow(/positivo/);
    expect(() => averageAtomicMass([{ mass: 35, abundance: Infinity }])).toThrow(/no negativo/);
    expect(() => averageAtomicMass([{ mass: 35, abundance: 120 }])).toThrow(/100 %/);
    expect(() => twoIsotopeAbundance(35, 35, 35)).toThrow(/iguales/);
    expect(() => twoIsotopeAbundance(35, 37, 38)).toThrow(/entre/);
    // Propiedad: la media ponderada está siempre entre la masa mínima y la máxima
    for (let k = 0; k < 200; k++) {
      const a = Math.random() * 100;
      const r = averageAtomicMass([{ mass: 10.01, abundance: a }, { mass: 11.01, abundance: 100 - a }]).value;
      expect(r).toBeGreaterThanOrEqual(10.01 - 1e-12);
      expect(r).toBeLessThanOrEqual(11.01 + 1e-12);
    }
  });
  it('prisma: Sellmeier fuera de su intervalo de validez y rayos que no atraviesan se informan', async () => {
    const { refractiveIndexSF11, prismGeometry } = await import('./prism');
    expect(() => refractiveIndexSF11(300)).toThrow(/370/);
    expect(() => refractiveIndexSF11(NaN)).toThrow();
    const g = prismGeometry();
    expect(g.traceDetailed(250)).toBe('fuera-de-dominio');
    // Todo el visible que usa la interfaz (370–760 nm) llega a la pantalla
    for (let l = 370; l <= 760; l += 1) expect(g.trace(l), `λ = ${l}`).not.toBeNull();
    // Índice monótono decreciente en el visible (dispersión normal)
    for (let l = 380; l < 760; l += 10) expect(refractiveIndexSF11(l)).toBeGreaterThan(refractiveIndexSF11(l + 10));
  });
});

describe('espectroscopio de prisma (SF11)', () => {
  it('índice nd del SF11 = 1,78472 (587,56 nm, catálogo SCHOTT)', async () => {
    const { refractiveIndexSF11 } = await import('./prism');
    expect(refractiveIndexSF11(587.56)).toBeCloseTo(1.78472, 4);
    expect(refractiveIndexSF11(400)).toBeGreaterThan(refractiveIndexSF11(700));
  });
  it('desviación mínima para λ de diseño y el violeta se desvía más que el rojo', async () => {
    const { prismGeometry, refractiveIndexSF11 } = await import('./prism');
    const g = prismGeometry();
    const d = g.trace(550)!;
    const n = refractiveIndexSF11(550);
    const dmin = 2 * Math.asin(n * Math.sin(Math.PI / 6)) - Math.PI / 3;
    expect(d.deviation).toBeCloseTo(dmin, 6);
    expect(Math.abs(d.s)).toBeLessThan(1e-9);
    const v = g.trace(410)!;
    const r = g.trace(690)!;
    expect(v.deviation).toBeGreaterThan(r.deviation);
    expect(v.s).toBeLessThan(0);
    expect(r.s).toBeGreaterThan(0);
    // Desviación mínima: cualquier otra λ… y la desviación del diseño es mínima frente a pequeñas variaciones de la incidencia (comprobado por la simetría del rayo interior).
    expect(Math.abs(d.exit[1] - d.entry[1])).toBeLessThan(1e-9);
  });
});

describe('marching cubes propio', () => {
  it('esfera: radio y área convergen a los exactos (4πR²)', async () => {
    const { polygonize, meshArea } = await import('./marching');
    const R = 0.6;
    const half = 1;
    for (const size of [24, 48]) {
      const f = new Float32Array(size ** 3);
      const hs = size / 2;
      for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const c = (i: number) => ((i - hs) / hs) * half;
        f[x + y * size + z * size * size] = -Math.hypot(c(x), c(y), c(z)); // f > iso dentro
      }
      const m = polygonize(f, size, -R, half);
      // Todos los vértices sobre la esfera (interpolación lineal de una función lineal en r: exacta salvo por la curvatura)
      let maxErr = 0;
      for (let i = 0; i < m.positions.length; i += 3) maxErr = Math.max(maxErr, Math.abs(Math.hypot(m.positions[i]!, m.positions[i + 1]!, m.positions[i + 2]!) - R));
      expect(maxErr).toBeLessThan(size === 24 ? 0.01 : 0.003);
      const relA = Math.abs(meshArea(m.positions) - 4 * Math.PI * R * R) / (4 * Math.PI * R * R);
      expect(relA).toBeLessThan(size === 24 ? 0.03 : 0.01);
      // Normales unitarias y hacia fuera (−∇f apunta al exterior)
      for (let i = 0; i < m.normals.length; i += 3) {
        const dot = m.normals[i]! * m.positions[i]! + m.normals[i + 1]! * m.positions[i + 1]! + m.normals[i + 2]! * m.positions[i + 2]!;
        expect(dot).toBeGreaterThan(0);
      }
    }
  });
  it('coincide con el marching cubes de three.js en número de triángulos (orbital 3d)', async () => {
    const { polygonize } = await import('./marching');
    const { orbitalGrid } = await import('./isosurface');
    const THREE = await import('three');
    const { MarchingCubes } = await import('three/examples/jsm/objects/MarchingCubes.js');
    const g = orbitalGrid(3, 2, 0, 40, 0.9);
    const mine = polygonize(g.psi, 40, g.iso, g.half);
    const mc = new MarchingCubes(40, new THREE.MeshBasicMaterial(), false, false, 200000);
    mc.isolation = g.iso;
    mc.field.set(g.psi);
    mc.update();
    // three omite la capa exterior de celdas; con el orbital contenido en la rejilla el resultado coincide.
    expect(mine.triangles).toBe(mc.count / 3);
  });
});

describe('umbral de probabilidad en O(N)', () => {
  it('coincide exactamente con ordenar y acumular', async () => {
    const { thresholdForFraction } = await import('./isosurface');
    const { mulberry32 } = await import('./numbers');
    const rng = mulberry32(9);
    for (let t = 0; t < 20; t++) {
      const d = new Float32Array(5000).map(() => Math.exp(-20 * rng()) * rng());
      const dV = 0.01;
      const p = 0.5 + 0.49 * rng();
      const ref = Float64Array.from(d).sort().reverse();
      const total = ref.reduce((a, b) => a + b, 0) * dV;
      let acc = 0;
      let thr = ref[0]!;
      for (const v of ref) {
        acc += v * dV;
        thr = v;
        if (acc >= p * Math.min(1, total)) break;
      }
      const got = thresholdForFraction(d, dV, p);
      expect(got.threshold).toBe(thr);
      expect(got.enclosed).toBeCloseTo(acc, 12);
    }
  });
});
