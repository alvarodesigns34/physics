/**
 * ATOM 4.0 · Validación científica independiente.
 *
 * Contrasta lo que calcula la aplicación con valores de referencia escritos aquí a mano desde fuentes
 * externas al código, NO con fórmulas de la propia aplicación:
 * - Líneas del hidrógeno: longitudes de onda en el VACÍO, NIST Atomic Spectra Database (H I).
 * - Constantes: CODATA 2018.
 * - Energías de ionización: NIST Ground Levels and Ionization Energies (eV).
 * - Afinidades electrónicas: valores experimentales recopilados en el CRC Handbook (eV).
 * - Masas atómicas: pesos atómicos estándar abreviados de la IUPAC (2021).
 * Las tolerancias reflejan la precisión de cada fuente y el modelo (Bohr sin estructura fina).
 */
import { describe, expect, it } from 'vitest';
import { transition, levelEnergyEV, bohrRadius } from './hydrogen';
import { elementBySymbol } from './elements';

const nm = (from: number, to: number) => transition(from, to).wavelength * 1e9;

describe('Hidrógeno frente a NIST ASD (λ en el vacío)', () => {
  it.each([
    ['Lyman α (2→1)', 2, 1, 121.567],
    ['Lyman β (3→1)', 3, 1, 102.572],
    ['Balmer α / Hα (3→2)', 3, 2, 656.469],
    ['Balmer β / Hβ (4→2)', 4, 2, 486.271],
    ['Balmer γ / Hγ (5→2)', 5, 2, 434.169],
    ['Balmer δ / Hδ (6→2)', 6, 2, 410.289],
    ['Paschen α (4→3)', 4, 3, 1875.61],
  ])('%s', (_, a, b, ref) => {
    // Bohr con masa reducida ignora la estructura fina y el desplazamiento de Lamb: < 0,01 % de error.
    expect(Math.abs(nm(a, b) - ref) / ref).toBeLessThan(1e-4);
  });
  it('energía de ionización del H: 13,598 eV', () => {
    expect(-levelEnergyEV(1)).toBeCloseTo(13.598, 2);
  });
  it('radio de la primera órbita ≈ a₀ = 52,92 pm', () => {
    expect(bohrRadius(1) * 1e12).toBeCloseTo(52.92, 1);
  });
});

describe('Datos de los elementos frente a referencias', () => {
  it.each([
    ['H', 13.598], ['He', 24.587], ['Li', 5.392], ['Be', 9.323], ['B', 8.298], ['C', 11.260], ['N', 14.534], ['O', 13.618],
    ['F', 17.423], ['Ne', 21.565], ['Na', 5.139], ['Mg', 7.646], ['Al', 5.986], ['Cl', 12.968], ['K', 4.341], ['Fe', 7.902], ['Cu', 7.726],
  ])('1.ª energía de ionización de %s ≈ %f eV (NIST)', (sym, ref) => {
    const el = elementBySymbol(sym as string)!;
    expect(el.ie1).not.toBeNull();
    expect(Math.abs(el.ie1! - (ref as number))).toBeLessThan(0.01);
  });
  it('excepciones de la energía de ionización que enseña el temario se cumplen con los datos', () => {
    const ie = (s: string) => elementBySymbol(s)!.ie1!;
    expect(ie('Be')).toBeGreaterThan(ie('B'));
    expect(ie('Mg')).toBeGreaterThan(ie('Al'));
    expect(ie('N')).toBeGreaterThan(ie('O'));
    expect(ie('P')).toBeGreaterThan(ie('S'));
  });
  it.each([
    ['F', 3.401], ['Cl', 3.613], ['Br', 3.364], ['O', 1.461], ['C', 1.262], ['H', 0.754],
  ])('afinidad electrónica de %s ≈ %f eV', (sym, ref) => {
    expect(Math.abs(elementBySymbol(sym as string)!.electronAffinity! - (ref as number))).toBeLessThan(0.01);
  });
  it('afinidad electrónica: Cl > F (la excepción del temario) y sin anión estable para N y gases nobles', () => {
    expect(elementBySymbol('Cl')!.electronAffinity!).toBeGreaterThan(elementBySymbol('F')!.electronAffinity!);
    for (const s of ['N', 'He', 'Ne', 'Ar']) expect(elementBySymbol(s)!.electronAffinity).toBeNull();
  });
  it.each([
    ['H', 1.008], ['C', 12.011], ['O', 15.999], ['Na', 22.990], ['Cl', 35.45], ['Fe', 55.845], ['Cu', 63.546], ['Br', 79.904],
  ])('masa atómica de %s ≈ %f u (IUPAC)', (sym, ref) => {
    expect(Math.abs(elementBySymbol(sym as string)!.atomicWeight - (ref as number))).toBeLessThan(0.01);
  });
});

describe('Espectros de absorción: solo absorben en frío las líneas de resonancia (NIST ASD)', async () => {
  const { VISIBLE_SPECTRA, absorptionLines } = await import('./data/spectralLines');
  const spec = (s: string) => VISIBLE_SPECTRA.find((x) => x.symbol === s)!;
  it('sodio frío: solo el doblete D (589,0 y 589,6 nm)', () => {
    expect(absorptionLines(spec('Na'), 'frio').map((l) => l.lambdaNm)).toEqual([589.0, 589.59]);
  });
  it.each(['H', 'He', 'Ne', 'Hg'])('%s frío: ninguna línea visible parte del fundamental', (s) => {
    expect(absorptionLines(spec(s), 'frio')).toEqual([]);
  });
  it('gas caliente: todas las líneas de emisión pueden aparecer en absorción', () => {
    expect(absorptionLines(spec('H'), 'caliente')).toHaveLength(spec('H').lines.length);
  });
});
