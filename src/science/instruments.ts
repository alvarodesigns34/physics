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
  /** Desviación vertical en la pantalla (m); positiva hacia la placa positiva. NaN si no llega. */
  screenY: number;
  /** Desviación a la salida de las placas, interpolada en x = L (m). NaN si no sale. */
  exitY: number;
  /** Fuerza eléctrica y magnética netas compensadas (B dentro del 2 % de E/v) */
  balanced: boolean;
  /** Campo B que compensa la fuerza eléctrica: B = E/v */
  balanceB: number;
  /** Trayectoria (x, y) en metros desde el inicio de las placas, hasta el impacto */
  path: Float32Array;
  /** La partícula choca con una placa */
  hitsPlate: boolean;
  /** La partícula invierte su avance dentro de las placas (B muy intenso) y no llega a la pantalla */
  turnsBack: boolean;
}

function assertFinite(name: string, v: number, positive = false) {
  if (!Number.isFinite(v) || (positive ? v <= 0 : false)) throw new RangeError(`${name} debe ser un número finito${positive ? ' positivo' : ''} (recibido ${v})`);
}

/**
 * Trayectoria del haz bajo F = q(E + v × B) en el plano, integrada con el método de Boris (salto de rana
 * con rotación magnética exacta): conserva |v| en un campo magnético puro y reproduce exactamente la
 * deriva E × B. Fuera de las placas no hay campos y el vuelo hasta la pantalla es rectilíneo (se calcula
 * de forma analítica). La salida de las placas y el choque con una placa se interpolan dentro del paso.
 * El haz solo depende de q/m: es independiente del gas y de los electrodos (resultado de Thomson).
 */
export function cathodeBeam(s: CathodeSetup, steps = 400): CathodeResult {
  assertFinite('La tensión de aceleración', s.accel, true);
  assertFinite('La separación entre placas', s.gap, true);
  assertFinite('La longitud de las placas', s.length, true);
  assertFinite('La distancia a la pantalla', s.drift);
  assertFinite('La tensión entre placas', s.plates);
  assertFinite('El campo magnético', s.B);
  if (s.drift < 0) throw new RangeError('La distancia a la pantalla no puede ser negativa');
  const q = s.charge ?? -CODATA.e;
  const m = s.mass ?? CODATA.me;
  const qm = q / m;
  const speed = Math.sqrt((2 * Math.abs(q) * s.accel) / m);
  const E = s.plates / s.gap;
  // Placa superior positiva: el campo apunta hacia abajo (−y); sobre una carga negativa la fuerza va hacia arriba.
  const Ey = -E;
  // B a lo largo de −z (orientado para oponerse a la fuerza eléctrica sobre el electrón).
  const Bz = -s.B;
  const nIn = Math.max(60, Math.round(steps * (s.length / (s.length + s.drift))));
  const dt = s.length / speed / nIn;

  /** Paso de Boris de duración h sobre (vx, vy): medio impulso eléctrico, rotación magnética, medio impulso. */
  const push = (vx: number, vy: number, h: number): [number, number] => {
    let ux = vx;
    let uy = vy + (qm * Ey * h) / 2;
    const t = (qm * Bz * h) / 2;
    const k = (2 * t) / (1 + t * t);
    const px = ux + uy * t;
    const py = uy - ux * t;
    ux += py * k;
    uy -= px * k;
    return [ux, uy + (qm * Ey * h) / 2];
  };

  const pts: number[] = [0, 0];
  let x = 0;
  let y = 0;
  // Velocidad en el semipaso −dt/2 (esquema de salto de rana sincronizado con la posición inicial).
  let [vx, vy] = push(speed, 0, -dt / 2);
  let exitY = NaN;
  let exitSlope = NaN;
  let hit = false;
  let turnsBack = false;
  const half = s.gap / 2;
  for (let i = 0; i < nIn * 40; i++) {
    [vx, vy] = push(vx, vy, dt);
    const nx = x + vx * dt;
    const ny = y + vy * dt;
    if (Math.abs(ny) >= half) {
      // Choque: fracción del paso hasta |y| = d/2.
      const f = (half - Math.abs(y)) / (Math.abs(ny) - Math.abs(y));
      pts.push(x + f * (nx - x), Math.sign(ny) * half);
      hit = true;
      break;
    }
    if (nx >= s.length) {
      const f = (s.length - x) / (nx - x);
      exitY = y + f * (ny - y);
      // Velocidad en el instante de salida: v(t) = paso de Boris desde el semipaso, de duración (f − ½)·dt.
      const [ex, ey] = push(vx, vy, (f - 0.5) * dt);
      exitSlope = ey / ex;
      pts.push(s.length, exitY);
      break;
    }
    if (nx < 0) {
      turnsBack = true;
      pts.push(nx, ny);
      break;
    }
    x = nx;
    y = ny;
    pts.push(x, y);
  }
  let screenY = NaN;
  if (!hit && !turnsBack && Number.isFinite(exitY)) {
    screenY = exitY + exitSlope * s.drift;
    // Vuelo libre: se muestrea la recta para dibujarla.
    const nOut = Math.max(2, steps - nIn);
    for (let k = 1; k <= nOut; k++) {
      const dx = (s.drift * k) / nOut;
      pts.push(s.length + dx, exitY + exitSlope * dx);
    }
  }
  const balanceB = E / speed;
  return { speed, field: E, screenY, exitY, balanced: s.B > 0 && balanceB > 0 && Math.abs(s.B - balanceB) / balanceB < 0.02, balanceB, path: Float32Array.from(pts), hitsPlate: hit, turnsBack };
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
