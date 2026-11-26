/**
 * Espectroscopio de prisma: índice de refracción del vidrio SF11 (ecuación de Sellmeier, datos de
 * SCHOTT) y trazado de rayos 2D con la ley de Snell en forma vectorial. Prisma equilátero (A = 60°)
 * en el plano (u, v), con el vértice hacia +v; el haz entra por la cara izquierda.
 */

/** Coeficientes de Sellmeier del SF11 (λ en µm). */
const SF11 = { B: [1.73759695, 0.313747346, 1.89878101], C: [0.013188707, 0.0623068142, 155.23629] } as const;

/** Intervalo de validez de la fórmula de Sellmeier del SF11 según el catálogo (nm). */
export const SF11_RANGE_NM: readonly [number, number] = [370, 2500];

/** Índice de refracción del SF11 para λ en nm. Fuera de 370–2500 nm la fórmula no es válida y se rechaza. */
export function refractiveIndexSF11(lambdaNm: number): number {
  if (!Number.isFinite(lambdaNm) || lambdaNm < SF11_RANGE_NM[0] || lambdaNm > SF11_RANGE_NM[1]) {
    throw new RangeError(`La fórmula de Sellmeier del SF11 solo es válida entre ${SF11_RANGE_NM[0]} y ${SF11_RANGE_NM[1]} nm (recibido ${lambdaNm})`);
  }
  const l2 = (lambdaNm / 1000) ** 2;
  let s = 1;
  for (let i = 0; i < 3; i++) s += (SF11.B[i]! * l2) / (l2 - SF11.C[i]!);
  return Math.sqrt(s);
}

type V2 = [number, number];
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V2, k: number): V2 => [a[0] * k, a[1] * k];
const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];
const norm = (a: V2): V2 => mul(a, 1 / Math.hypot(a[0], a[1]));

/** Refracción vectorial: d incidente unitario, nrm normal unitaria hacia el lado incidente, eta = n₁/n₂. */
export function refract(d: V2, nrm: V2, eta: number): V2 | null {
  const cosi = -dot(nrm, d);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null; // reflexión total
  return norm(add(mul(d, eta), mul(nrm, eta * cosi - Math.sqrt(k))));
}

/** Intersección del rayo p + t·d con la recta que pasa por a y b: t a lo largo del rayo y u ∈ [0, 1] sobre el segmento ab. */
function hitLine(p: V2, d: V2, a: V2, b: V2): { t: number; u: number } | null {
  const e = sub(b, a);
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-12) return null;
  const w = sub(a, p);
  return { t: (w[0] * e[1] - w[1] * e[0]) / den, u: (w[0] * d[1] - w[1] * d[0]) / den };
}

export type PrismFailure = 'fuera-de-dominio' | 'reflexion-total-entrada' | 'no-alcanza-la-cara-de-salida' | 'reflexion-total-salida' | 'no-alcanza-la-pantalla';

export interface PrismSetup {
  /** Lado del prisma */
  side: number;
  /** Longitud de onda de diseño (desviación mínima), nm */
  designNm: number;
  /** Distancia de la fuente al punto de entrada */
  sourceDist: number;
  /** Distancia de la pantalla al punto de salida (medida sobre el rayo de diseño) */
  screenDist: number;
}

export const DEFAULT_PRISM: PrismSetup = { side: 1.5, designNm: 550, sourceDist: 2.4, screenDist: 5.6 };

export interface PrismRay {
  lambdaNm: number;
  n: number;
  source: V2;
  entry: V2;
  exit: V2;
  hit: V2;
  /** Desviación total (rad) respecto a la dirección incidente */
  deviation: number;
  /** Coordenada a lo largo de la pantalla (0 = rayo de diseño; el violeta, más desviado, queda en s < 0) */
  s: number;
}

export interface PrismGeometry {
  vertices: [V2, V2, V2];
  incident: V2;
  screenCenter: V2;
  screenDir: V2;
  /** Normal de la pantalla (dirección del rayo de diseño) */
  screenNormal: V2;
}

export function prismGeometry(setup: PrismSetup = DEFAULT_PRISM): PrismGeometry & { trace: (lambdaNm: number) => PrismRay | null; traceDetailed: (lambdaNm: number) => PrismRay | PrismFailure } {
  const s = setup.side;
  const h = (s * Math.sqrt(3)) / 2;
  const apex: V2 = [0, (2 * h) / 3];
  const left: V2 = [-s / 2, -h / 3];
  const right: V2 = [s / 2, -h / 3];
  const A = Math.PI / 3;
  // Desviación mínima para λ de diseño: rayo interior paralelo a la base.
  const n0 = refractiveIndexSF11(setup.designNm);
  const i0 = Math.asin(n0 * Math.sin(A / 2));
  const inward1: V2 = norm([Math.sqrt(3) / 2, -0.5]); // normal interior de la cara izquierda
  const angIn = Math.atan2(inward1[1], inward1[0]);
  const incident: V2 = [Math.cos(angIn + i0), Math.sin(angIn + i0)];
  const entry: V2 = mul(add(left, apex), 0.5);
  const source = sub(entry, mul(incident, setup.sourceDist));
  const outward1: V2 = mul(inward1, -1);
  const outward2: V2 = norm([Math.sqrt(3) / 2, 0.5]);

  const traceRaw = (lambdaNm: number): { n: number; exit: V2; out: V2 } | PrismFailure => {
    if (!Number.isFinite(lambdaNm) || lambdaNm < SF11_RANGE_NM[0] || lambdaNm > SF11_RANGE_NM[1]) return 'fuera-de-dominio';
    const n = refractiveIndexSF11(lambdaNm);
    const t1 = refract(incident, outward1, 1 / n);
    if (!t1) return 'reflexion-total-entrada';
    const h = hitLine(entry, t1, apex, right);
    // El rayo interior debe cortar la cara de salida dentro del segmento físico (si no, saldría por la base).
    if (h === null || h.t <= 0 || h.u < 0 || h.u > 1) return 'no-alcanza-la-cara-de-salida';
    const exit = add(entry, mul(t1, h.t));
    const t2 = refract(t1, mul(outward2, -1), n);
    if (!t2) return 'reflexion-total-salida';
    return { n, exit, out: t2 };
  };
  const designRaw = traceRaw(setup.designNm);
  if (typeof designRaw === 'string') throw new RangeError(`La longitud de onda de diseño no atraviesa el prisma (${designRaw})`);
  const design = designRaw;
  const screenNormal = design.out;
  const screenCenter = add(design.exit, mul(design.out, setup.screenDist));
  const screenDir: V2 = [-screenNormal[1], screenNormal[0]];
  /** Traza un rayo; devuelve el motivo físico si no llega a la pantalla. */
  const traceDetailed = (lambdaNm: number): PrismRay | PrismFailure => {
    const r = traceRaw(lambdaNm);
    if (typeof r === 'string') return r;
    const h = hitLine(r.exit, r.out, screenCenter, add(screenCenter, screenDir));
    if (h === null || h.t <= 0) return 'no-alcanza-la-pantalla';
    const hit = add(r.exit, mul(r.out, h.t));
    const deviation = Math.acos(Math.max(-1, Math.min(1, dot(incident, r.out))));
    return { lambdaNm, n: r.n, source, entry, exit: r.exit, hit, deviation, s: dot(sub(hit, screenCenter), screenDir) };
  };
  const trace = (lambdaNm: number): PrismRay | null => {
    const r = traceDetailed(lambdaNm);
    return typeof r === 'string' ? null : r;
  };
  return { vertices: [apex, left, right], incident, screenCenter, screenDir, screenNormal, trace, traceDetailed };
}
