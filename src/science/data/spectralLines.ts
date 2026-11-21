// Líneas de emisión más intensas del átomo neutro en el visible (380–720 nm).
// Fuente: NIST Handbook of Basic Atomic Spectroscopic Data (Sansonetti y Martin, J. Phys. Chem. Ref. Data 34, 1559, 2005),
// tablas de "strong lines". Longitudes de onda EN AIRE (nm); intensidades relativas dentro de cada elemento.
// Las líneas separadas menos de 0,5 nm se agrupan conservando la más intensa.
export interface SpectralLine { lambdaNm: number; intensity: number }
export interface ElementSpectrum { symbol: string; name: string; lines: SpectralLine[] }

export const VISIBLE_SPECTRA: ElementSpectrum[] = [
  { symbol: 'H', name: 'Hidrógeno', lines: [{ lambdaNm: 383.54, intensity: 0.028 }, { lambdaNm: 388.9, intensity: 0.033 }, { lambdaNm: 397.01, intensity: 0.044 }, { lambdaNm: 410.17, intensity: 0.083 }, { lambdaNm: 434.05, intensity: 0.167 }, { lambdaNm: 486.14, intensity: 0.333 }, { lambdaNm: 656.29, intensity: 1.0 }] },
  { symbol: 'He', name: 'Helio', lines: [{ lambdaNm: 388.86, intensity: 0.6 }, { lambdaNm: 396.47, intensity: 0.04 }, { lambdaNm: 402.62, intensity: 0.1 }, { lambdaNm: 447.15, intensity: 0.4 }, { lambdaNm: 471.31, intensity: 0.06 }, { lambdaNm: 501.57, intensity: 0.2 }, { lambdaNm: 587.56, intensity: 1.0 }, { lambdaNm: 667.82, intensity: 0.4 }, { lambdaNm: 706.52, intensity: 0.2 }] },
  { symbol: 'Na', name: 'Sodio', lines: [{ lambdaNm: 432.46, intensity: 0.001 }, { lambdaNm: 466.48, intensity: 0.002 }, { lambdaNm: 498.28, intensity: 0.005 }, { lambdaNm: 568.26, intensity: 0.004 }, { lambdaNm: 568.82, intensity: 0.007 }, { lambdaNm: 589.0, intensity: 1.0 }, { lambdaNm: 589.59, intensity: 0.5 }, { lambdaNm: 615.42, intensity: 0.002 }, { lambdaNm: 616.07, intensity: 0.003 }] },
  { symbol: 'Hg', name: 'Mercurio', lines: [{ lambdaNm: 404.66, intensity: 0.4 }, { lambdaNm: 433.92, intensity: 0.06 }, { lambdaNm: 434.75, intensity: 0.1 }, { lambdaNm: 435.83, intensity: 1.0 }, { lambdaNm: 546.07, intensity: 0.5 }, { lambdaNm: 576.96, intensity: 0.05 }, { lambdaNm: 579.07, intensity: 0.06 }, { lambdaNm: 708.19, intensity: 0.025 }] },
  { symbol: 'Ne', name: 'Neón', lines: [{ lambdaNm: 470.44, intensity: 0.15 }, { lambdaNm: 471.21, intensity: 0.15 }, { lambdaNm: 540.06, intensity: 0.2 }, { lambdaNm: 585.25, intensity: 0.2 }, { lambdaNm: 640.22, intensity: 0.2 }, { lambdaNm: 692.95, intensity: 1.0 }, { lambdaNm: 702.41, intensity: 0.3 }, { lambdaNm: 703.24, intensity: 0.8 }, { lambdaNm: 717.39, intensity: 0.8 }] },
];
