/**
 * Instrumentos históricos y de laboratorio (mecánica clásica):
 * tubo de rayos catódicos de Thomson y espectrómetro de masas de sector magnético.
 */
import { CODATA } from './constants';

export interface CathodeSetup {
  /** Tensión de aceleración (V) */
  accel: number;
  /** Tensión entre placas (V) */
  plates: number;
  /** Separación entre placas (m) */
  gap: number;
  /** Longitud de las placas (m) */
  length: number;
  /** Distancia de las placas a la pantalla (m) */
  drift: number;
  /** Campo magnético perpendicular en la zona de placas (T) */
  B: number;
  /** Carga y masa de la partícula (por defecto, el electrón) */
  charge?: number;
  mass?: number;
}

export interface CathodeResult {
  speed: number;
  field: number;
  /** Desviación vertical en la pantalla (m); positiva hacia la placa positiva */
  screenY: number;
  /** Desviación a la salida de las placas (m) */
  exitY: number;
  /** Fuerza eléctrica y magnética netas compensadas */
  balanced: boolean;
  /** Campo B que compensa la fuerza eléctrica: B = E/v */
  balanceB: number;
  /** Trayectoria (x, y) en metros desde el inicio de las placas */
  path: Float32Array;
  /** La partícula choca con una placa */
  hitsPlate: boolean;
}

/**
 * Trayectoria del haz: integración numérica de F = q(E + v × B) en el plano (Verlet de velocidad).
 * El haz es independiente del gas y de los electrodos: solo depende de q/m (resultado de Thomson).
 */
export function cathodeBeam(s: CathodeSetup, steps = 400): CathodeResult {
  const q = s.charge ?? -CODATA.e;
  const m = s.mass ?? CODATA.me;
  const speed = Math.sqrt((2 * Math.abs(q) * s.accel) / m);
  const E = s.plates / s.gap;
  // Placa superior positiva: el campo apunta hacia abajo (−y); fuerza sobre carga negativa hacia arriba.
  const Ey = -E;
  const total = s.length + s.drift;
  const dt = total / speed / steps;
  let x = 0;
  let y = 0;
  let vx = speed;
  let vy = 0;
  const path = new Float32Array((steps + 1) * 2);
  let exitY = 0;
  let hit = false;
  for (let i = 0; i <= steps; i++) {
    path[i * 2] = x;
    path[i * 2 + 1] = y;
    const inPlates = x <= s.length;
    // B a lo largo de −z (orientado para oponerse a la fuerza eléctrica): v × B = (−vy·B, vx·B)
    const ax = inPlates ? (q / m) * (-vy * s.B) : 0;
    const ay = inPlates ? (q / m) * (Ey + vx * s.B) : 0;
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    if (inPlates && x > s.length && exitY === 0) exitY = y;
    if (inPlates && Math.abs(y) > s.gap / 2) {
      hit = true;
      for (let k = i + 1; k <= steps; k++) {
        path[k * 2] = x;
        path[k * 2 + 1] = Math.sign(y) * (s.gap / 2);
      }
      break;
    }
    if (x >= total) {
      for (let k = i + 1; k <= steps; k++) {
        path[k * 2] = x;
        path[k * 2 + 1] = y;
      }
      break;
    }
  }
  const balanceB = E / speed;
  return { speed, field: E, screenY: hit ? NaN : y, exitY, balanced: s.B > 0 && Math.abs(s.B - balanceB) / balanceB < 0.02, balanceB, path, hitsPlate: hit };
}

/** Desviación analítica a la salida de las placas: y₁ = (q·E·L²)/(2·m·v²). */
export function cathodeExitDeflection(s: CathodeSetup): number {
  const q = Math.abs(s.charge ?? CODATA.e);
  const m = s.mass ?? CODATA.me;
  const v2 = (2 * q * s.accel) / m;
  return (q * (s.plates / s.gap) * s.length * s.length) / (2 * m * v2);
}

/** Espectrómetro de sector magnético: r = m·v/(q·B), con v = √(2qV/m) → r = √(2mV/q)/B. */
export function sectorRadius(massU: number, chargeE: number, accelV: number, B: number): number {
  const m = massU * CODATA.u;
  const q = chargeE * CODATA.e;
  return Math.sqrt((2 * m * accelV) / q) / B;
}

/** Masa (u) que llega a un detector situado a radio r: m = q·B²·r²/(2V). */
export function massAtRadius(r: number, chargeE: number, accelV: number, B: number): number {
  return (chargeE * CODATA.e * B * B * r * r) / (2 * accelV) / CODATA.u;
}
