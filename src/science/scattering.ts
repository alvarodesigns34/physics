/**
 * Experimento de Geiger–Marsden: dispersión coulombiana (Rutherford) frente al modelo de Thomson.
 * Unidades nucleares: energías en MeV y longitudes en fm. k·e² = 1,439 96 MeV·fm.
 */
export const KE2_MEV_FM = 1.43996;

/** Distancia de máximo acercamiento en choque frontal: d = k·Z₁Z₂e²/E (fm). */
export function closestApproach(energyMeV: number, z1 = 2, z2 = 79): number {
  return (KE2_MEV_FM * z1 * z2) / energyMeV;
}

/** Ángulo de desviación (rad) para un parámetro de impacto b: tan(θ/2) = d/(2b). */
export function deflection(b: number, d: number): number {
  return 2 * Math.atan(d / (2 * b));
}

/** Parámetro de impacto que produce una desviación θ: b = (d/2)·cot(θ/2). */
export function impactForAngle(theta: number, d: number): number {
  return (d / 2) / Math.tan(theta / 2);
}

/**
 * Fracción de partículas desviadas más de θ al atravesar una lámina de espesor t (m) con n núcleos/m³,
 * en aproximación de dispersión única: P(>θ) = n·t·π·b(θ)².
 */
export function fractionAbove(theta: number, d_fm: number, n: number, t: number): number {
  const b = impactForAngle(theta, d_fm) * 1e-15;
  return Math.min(1, n * t * Math.PI * b * b);
}

/** Lámina de oro: densidad 19,3 g/cm³, M = 196,97 g/mol → n ≈ 5,90·10²⁸ núcleos/m³. */
export const GOLD_NUMBER_DENSITY = (19.3e3 / 0.19697) * 6.02214076e23;

/**
 * Trayectoria hiperbólica integrada numéricamente (Verlet) en unidades de d (posición) y v₀ (velocidad).
 * Aceleración adimensional: a = ½·r̂/r² (de ½mv₀²·d = k·Z₁Z₂e²).
 */
export function trajectory(bOverD: number, steps = 1400, xStart = -12): Float32Array {
  const out = new Float32Array(steps * 2);
  let x = xStart;
  let y = bOverD;
  let vx = 1;
  let vy = 0;
  const dt = (2 * Math.abs(xStart)) / steps * 1.4;
  const acc = (px: number, py: number) => {
    const r2 = px * px + py * py;
    const r = Math.sqrt(r2);
    const f = 0.5 / (r2 * r);
    return [f * px, f * py] as const;
  };
  let [ax, ay] = acc(x, y);
  for (let i = 0; i < steps; i++) {
    out[i * 2] = x;
    out[i * 2 + 1] = y;
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const [nax, nay] = acc(x, y);
    vx += 0.5 * (ax + nax) * dt;
    vy += 0.5 * (ay + nay) * dt;
    ax = nax;
    ay = nay;
  }
  return out;
}

/** Ángulo final (rad) de una trayectoria integrada, para validar contra la fórmula analítica. */
export function finalAngle(traj: Float32Array): number {
  const n = traj.length / 2;
  const dx = traj[(n - 1) * 2]! - traj[(n - 2) * 2]!;
  const dy = traj[(n - 1) * 2 + 1]! - traj[(n - 2) * 2 + 1]!;
  return Math.atan2(dy, dx);
}

export interface ScatteringParams {
  energyMeV: number;
  /** Espesor de la lámina (m) */
  thickness: number;
  /** Desviación cuadrática media por dispersión múltiple de ángulo pequeño (rad) */
  multipleSigma: number;
}

export const GEIGER_MARSDEN: ScatteringParams = { energyMeV: 4.8, thickness: 4e-7, multipleSigma: (0.8 * Math.PI) / 180 };

function gauss(rng: () => number): number {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/**
 * Ángulo de salida de una partícula α (rad).
 * - Modelo nuclear (Rutherford): dispersión única por el núcleo más cercano (b muestreado con la
 *   densidad superficial de núcleos n·t) más una dispersión múltiple gaussiana de ángulo pequeño.
 * - Modelo de Thomson: solo dispersión múltiple gaussiana (la carga positiva difusa no produce
 *   desviaciones grandes).
 */
export function sampleAngle(model: 'rutherford' | 'thomson', p: ScatteringParams, rng: () => number): number {
  const gx = gauss(rng) * p.multipleSigma;
  const gy = gauss(rng) * p.multipleSigma;
  if (model === 'thomson') return Math.hypot(gx, gy);
  const d = closestApproach(p.energyMeV) * 1e-15;
  const areal = GOLD_NUMBER_DENSITY * p.thickness; // núcleos por m²
  // P(b < x) = areal·π·x² → b = sqrt(u/(areal·π)), truncado a u ≤ 1 (un núcleo por celda)
  const b = Math.sqrt(rng() / (areal * Math.PI));
  const th = deflection(b, d);
  const phi = 2 * Math.PI * rng();
  if (th > 0.2) return th; // las desviaciones grandes dominan: la gaussiana es despreciable
  return Math.hypot(th * Math.cos(phi) + gx, th * Math.sin(phi) + gy);
}

/** Tiempo de colapso clásico de un electrón en la órbita de Bohr (radiación de Larmor): ≈ 1,6·10⁻¹¹ s. */
export function classicalCollapseTime(): number {
  const a0 = 5.29177210903e-11;
  const re = 2.8179403262e-15;
  const c = 299792458;
  return (a0 * a0 * a0) / (4 * re * re * c);
}
