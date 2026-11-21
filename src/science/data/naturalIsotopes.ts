// Isótopos naturales (masa en u, abundancia en %) para los ejercicios de masa atómica media.
// Extraído de src/science/data/isotopes.json (NUBASE/IUPAC vía mendeleev). Se omiten isótopos < 0,1 %.
export const NATURAL_ISOTOPES: Record<number, { a: number; mass: number; abundance: number }[]> = {
  3: [{ a: 6, mass: 6.015123, abundance: 4.85 }, { a: 7, mass: 7.016003, abundance: 95.15 }], // Li
  5: [{ a: 10, mass: 10.012937, abundance: 19.65 }, { a: 11, mass: 11.009305, abundance: 80.35 }], // B
  10: [{ a: 20, mass: 19.99244, abundance: 90.48 }, { a: 21, mass: 20.993847, abundance: 0.27 }, { a: 22, mass: 21.991385, abundance: 9.25 }], // Ne
  12: [{ a: 24, mass: 23.985042, abundance: 78.965 }, { a: 25, mass: 24.985837, abundance: 10.011 }, { a: 26, mass: 25.982593, abundance: 11.025 }], // Mg
  14: [{ a: 28, mass: 27.976927, abundance: 92.2545 }, { a: 29, mass: 28.976495, abundance: 4.672 }, { a: 30, mass: 29.97377, abundance: 3.0735 }], // Si
  17: [{ a: 35, mass: 34.968853, abundance: 75.8 }, { a: 37, mass: 36.965903, abundance: 24.2 }], // Cl
  19: [{ a: 39, mass: 38.963706, abundance: 93.2581 }, { a: 41, mass: 40.961825, abundance: 6.7302 }], // K
  29: [{ a: 63, mass: 62.929597, abundance: 69.15 }, { a: 65, mass: 64.927789, abundance: 30.85 }], // Cu
  31: [{ a: 69, mass: 68.925574, abundance: 60.108 }, { a: 71, mass: 70.924703, abundance: 39.892 }], // Ga
  35: [{ a: 79, mass: 78.918338, abundance: 50.65 }, { a: 81, mass: 80.916288, abundance: 49.35 }], // Br
  37: [{ a: 85, mass: 84.91179, abundance: 72.17 }, { a: 87, mass: 86.909181, abundance: 27.83 }], // Rb
  47: [{ a: 107, mass: 106.905092, abundance: 51.839 }, { a: 109, mass: 108.904756, abundance: 48.161 }], // Ag
  51: [{ a: 121, mass: 120.903811, abundance: 57.21 }, { a: 123, mass: 122.904215, abundance: 42.79 }], // Sb
  63: [{ a: 151, mass: 150.919857, abundance: 47.81 }, { a: 153, mass: 152.921237, abundance: 52.19 }], // Eu
  75: [{ a: 185, mass: 184.952958, abundance: 37.4 }, { a: 187, mass: 186.955752, abundance: 62.6 }], // Re
  77: [{ a: 191, mass: 190.960591, abundance: 37.3 }, { a: 193, mass: 192.962924, abundance: 62.7 }], // Ir
  81: [{ a: 203, mass: 202.972344, abundance: 29.515 }, { a: 205, mass: 204.974427, abundance: 70.485 }], // Tl
};
