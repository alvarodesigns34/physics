/**
 * Espectroscopio de prisma en 3D: lámpara de descarga → rendija → prisma de SF11 → pantalla.
 * Las trayectorias y la posición de cada línea en la pantalla se calculan con la ley de Snell y el
 * índice de refracción real del vidrio (Sellmeier); no son un dibujo.
 */
import { GlassMaterial } from '../../render/Glass';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from '../../render/Stage';
import { LabelProjector, type Anchor } from '../../render/labels';
import { useQuality, useReducedMotion } from '../../app/hooks';
import { absorptionLines, VISIBLE_SPECTRA, type GasCondition } from '../../science/data/spectralLines';
import { prismGeometry, type PrismRay } from '../../science/prism';
import { wavelengthToLinearRGB } from '../../science/photon';
import { lampColor, lineColor } from './scenes';

/** Geometría compartida del bulbo de la lámpara (antes se creaba una nueva en cada render y no se liberaba). */
const LAMP_BOX = new THREE.BoxGeometry(0.5, 0.55, 0.42);

export const PRISM = prismGeometry();
// Plano del haz: (u, v) → (x, z) con z = v, de modo que el abanico se aleja de la cámara y la pantalla la mira.
const to3 = (p: [number, number], y = 0) => new THREE.Vector3(p[0], y, p[1]);

/** Posición en la pantalla (coordenada s) de cada longitud de onda visible, tabulada para invertirla. */
const S_TABLE = (() => {
  const out: { l: number; s: number }[] = [];
  for (let l = 370; l <= 760; l += 0.5) out.push({ l, s: PRISM.trace(l)!.s });
  return out;
})();
const S_MIN = PRISM.trace(380)!.s;
const S_MAX = PRISM.trace(760)!.s;
const SCREEN_W = (S_MAX - S_MIN) * 1.3;
const SCREEN_H = 0.62;
const S_CENTER = (S_MAX + S_MIN) / 2;

function lambdaAtS(s: number): number | null {
  if (s < S_TABLE[0]!.s || s > S_TABLE[S_TABLE.length - 1]!.s) return null;
  let lo = 0;
  let hi = S_TABLE.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (S_TABLE[mid]!.s < s) lo = mid;
    else hi = mid;
  }
  const a = S_TABLE[lo]!;
  const b = S_TABLE[hi]!;
  return a.l + ((s - a.s) / (b.s - a.s)) * (b.l - a.l);
}

function srgb(c: number) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(255 * Math.min(1, Math.max(0, v)));
}

/** Textura de la pantalla: continuo (absorción) o líneas brillantes (emisión) en su posición exacta. */
function screenTexture(symbol: string, mode: 'emision' | 'absorcion', gas: GasCondition = 'frio'): THREE.CanvasTexture {
  const W = 1024;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#050404';
  ctx.fillRect(0, 0, W, H);
  const xOfS = (s: number) => ((s - (S_CENTER - SCREEN_W / 2)) / SCREEN_W) * W;
  const spec = VISIBLE_SPECTRA.find((x) => x.symbol === symbol);
  const lines = !spec ? [] : mode === 'absorcion' ? absorptionLines(spec, gas) : spec.lines;
  if (mode === 'absorcion') {
    for (let x = 0; x < W; x++) {
      const s = S_CENTER - SCREEN_W / 2 + (x / W) * SCREEN_W;
      const l = lambdaAtS(s);
      if (l === null || l < 380 || l > 750) continue;
      const [r, g, b] = wavelengthToLinearRGB(l);
      const edge = Math.min(1, (l - 380) / 25, (750 - l) / 30);
      ctx.fillStyle = `rgb(${srgb(r * edge)} ${srgb(g * edge)} ${srgb(b * edge)})`;
      ctx.fillRect(x, 0, 1, H);
    }
    for (const ln of lines) {
      const x = xOfS(PRISM.trace(ln.lambdaNm)!.s);
      ctx.fillStyle = `rgba(5,4,4,${0.55 + 0.45 * Math.min(1, ln.intensity * 1.4)})`;
      ctx.fillRect(x - 1.5, 0, 3, H);
    }
  } else {
    ctx.globalCompositeOperation = 'lighter';
    for (const ln of lines) {
      const x = xOfS(PRISM.trace(ln.lambdaNm)!.s);
      const [r, g, b] = wavelengthToLinearRGB(ln.lambdaNm);
      const k = 0.35 + 0.65 * ln.intensity;
      const grad = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
      const col = (a: number) => `rgba(${srgb(r)},${srgb(g)},${srgb(b)},${a})`;
      grad.addColorStop(0, col(0));
      grad.addColorStop(0.42, col(0.35 * k));
      grad.addColorStop(0.5, col(k));
      grad.addColorStop(0.58, col(0.35 * k));
      grad.addColorStop(1, col(0));
      ctx.fillStyle = grad;
      ctx.fillRect(x - 7, 0, 14, H);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Haz delgado entre dos puntos (cilindro). */
function Beam({ a, b, color, radius = 0.007, opacity = 1 }: { a: THREE.Vector3; b: THREE.Vector3; color: THREE.Color; radius?: number; opacity?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return { pos: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), quat, len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 6, 1, true]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function RayFan({ rays, thick }: { rays: { ray: PrismRay; color: THREE.Color; weight: number }[]; thick: boolean }) {
  const lines = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    for (const { ray, color, weight } of rays) {
      const pts = [to3(ray.entry), to3(ray.exit), to3(ray.hit)];
      for (let i = 0; i < 2; i++) {
        pos.push(...pts[i]!.toArray(), ...pts[i + 1]!.toArray());
        const c = color.clone().multiplyScalar(i === 0 ? weight * 0.8 : weight);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  }, [rays]);
  useEffect(
    () => () => {
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    },
    [lines],
  );
  return (
    <>
      <primitive object={lines} />
      {thick &&
        rays.map(({ ray, color, weight }) => (
          <group key={ray.lambdaNm}>
            <Beam a={to3(ray.exit)} b={to3(ray.hit)} color={color.clone().multiplyScalar(weight)} radius={0.006} />
          </group>
        ))}
    </>
  );
}

function Prism({ glassy }: { glassy: boolean }) {
  const geo = useMemo(() => {
    const [apex, left, right] = PRISM.vertices;
    const shape = new THREE.Shape();
    shape.moveTo(apex[0], apex[1]);
    shape.lineTo(left[0], left[1]);
    shape.lineTo(right[0], right[1]);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    g.translate(0, 0, -0.5);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo}>
        {glassy ? (
          <GlassMaterial color="#eef4fb" roughness={0.04} transmission={1} thickness={1.2} ior={1.785} attenuationColor="#dfe9f3" attenuationDistance={6} opacity={0.32} envMapIntensity={1.4} />
        ) : (
          <meshStandardMaterial color="#cfdbe7" roughness={0.1} transparent opacity={0.28} />
        )}
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geo, 30]} />
        <lineBasicMaterial color="#dfe8f2" transparent opacity={0.45} />
      </lineSegments>
    </group>
  );
}

function Lamp({ color, flicker, position }: { color: THREE.Color; flicker: boolean; position: THREE.Vector3 }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    if (mat.current) mat.current.color.copy(color).multiplyScalar(flicker ? 0.93 + 0.07 * Math.sin(st.clock.elapsedTime * 11) : 1);
  });
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, 1.3, 24]} />
        <meshBasicMaterial ref={mat} color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.13, 0.13, 1.4, 32, 1, true]} />
        <meshPhysicalMaterial color="#e8eef5" roughness={0.05} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      {[-0.76, 0.76].map((y) => (
        <mesh key={y} position-y={y}>
          <cylinderGeometry args={[0.15, 0.15, 0.14, 32]} />
          <meshStandardMaterial color="#2a2622" metalness={0.7} roughness={0.32} />
        </mesh>
      ))}
      <pointLight color={color} intensity={4} distance={4} />
    </group>
  );
}

/** Rendija: dos placas oscuras perpendiculares al haz. */
function Slit({ at, dir }: { at: THREE.Vector3; dir: THREE.Vector3 }) {
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize()), [dir]);
  return (
    <group position={at} quaternion={quat}>
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * 0.23, 0, 0]}>
          <boxGeometry args={[0.42, 0.9, 0.03]} />
          <meshStandardMaterial color="#1c1916" metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Screen({ tex }: { tex: THREE.Texture }) {
  const c = PRISM.screenCenter;
  const dir = PRISM.screenDir;
  const center: [number, number] = [c[0] + dir[0] * S_CENTER, c[1] + dir[1] * S_CENTER];
  const ang = Math.atan2(-dir[1], dir[0]);
  return (
    <group position={to3(center)} rotation={[0, ang, 0]}>
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[SCREEN_W + 0.12, SCREEN_H + 0.12, 0.02]} />
        <meshStandardMaterial color="#141210" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* El eje z local apunta hacia el prisma: la cara del plano mira al haz incidente */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color(1.6, 1.6, 1.6)} />
      </mesh>
    </group>
  );
}

/** Mesa óptica: tablero de taladros roscados cada 25 mm (textura procedural, sin descargas). */
const TABLE_Y = -0.76;
function OpticalTable({ center, w, d }: { center: THREE.Vector3; w: number; d: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#3a3f47';
    g.fillRect(0, 0, 256, 256);
    for (let y = 16; y < 256; y += 32)
      for (let x = 16; x < 256; x += 32) {
        g.fillStyle = '#1d2026';
        g.beginPath();
        g.arc(x, y, 4.2, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.beginPath();
        g.arc(x, y, 5.4, Math.PI * 0.9, Math.PI * 1.6);
        g.stroke();
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w / 1.6, d / 1.6);
    t.anisotropy = 8;
    return t;
  }, [w, d]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[center.x, TABLE_Y, center.z]}>
      <mesh position-y={-0.06} receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshPhysicalMaterial color="#5b616b" metalness={0.6} roughness={0.42} clearcoat={0.3} />
      </mesh>
      <mesh position-y={0.001} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w - 0.04, d - 0.04]} />
        <meshPhysicalMaterial map={tex} metalness={0.55} roughness={0.5} clearcoat={0.25} clearcoatRoughness={0.5} />
      </mesh>
    </group>
  );
}

/** Poste de soporte (acero) desde la mesa hasta y = top, con su base. */
function Post({ at, top }: { at: THREE.Vector3; top: number }) {
  const h = top - TABLE_Y;
  return (
    <group position={[at.x, TABLE_Y, at.z]}>
      <mesh position-y={h / 2}>
        <cylinderGeometry args={[0.035, 0.035, h, 16]} />
        <meshStandardMaterial color="#c3c8cf" metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[0.13, 0.15, 0.06, 32]} />
        <meshStandardMaterial color="#2a2e35" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Platina giratoria graduada bajo el prisma. */
function RotationStage({ at }: { at: THREE.Vector3 }) {
  return (
    <group position={[at.x, TABLE_Y, at.z]}>
      <mesh position-y={0.1}>
        <cylinderGeometry args={[0.78, 0.82, 0.2, 96]} />
        <meshPhysicalMaterial color="#9ea5ae" metalness={0.9} roughness={0.28} clearcoat={0.5} />
      </mesh>
      <mesh position-y={0.205} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.68, 0.78, 96]} />
        <meshStandardMaterial color="#2b2f36" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.66, 0.66, 0.04, 96]} />
        <meshStandardMaterial color="#1f2328" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

export const SPECTRO_ANCHORS: Anchor[] = (() => {
  const src = PRISM.trace(550)!.source;
  const c = PRISM.screenCenter;
  const dir = PRISM.screenDir;
  return [
    { id: 'sp-lamp', position: to3(src, 0.95).toArray() as [number, number, number] },
    { id: 'sp-prism', position: to3(PRISM.vertices[0], 0.72).toArray() as [number, number, number] },
    { id: 'sp-screen', position: to3([c[0] + dir[0] * S_CENTER, c[1] + dir[1] * S_CENTER], SCREEN_H / 2 + 0.22).toArray() as [number, number, number] },
    { id: 'sp-violet', position: to3(PRISM.trace(400)!.hit, -SCREEN_H / 2 - 0.16).toArray() as [number, number, number] },
    { id: 'sp-red', position: to3(PRISM.trace(700)!.hit, -SCREEN_H / 2 - 0.16).toArray() as [number, number, number] },
  ];
})();

export function SpectroscopeScene({ symbol, mode, gas = 'frio' }: { symbol: string; mode: 'emision' | 'absorcion'; gas?: GasCondition }) {
  const reduced = useReducedMotion();
  const q = useQuality();
  const lamp = useMemo(() => (mode === 'emision' ? lampColor(symbol).multiplyScalar(3) : new THREE.Color('#fff4e6').multiplyScalar(3)), [symbol, mode]);
  const tex = useMemo(() => screenTexture(symbol, mode, gas), [symbol, mode, gas]);
  useEffect(() => () => tex.dispose(), [tex]);
  const rays = useMemo(() => {
    if (mode === 'emision') {
      const lines = VISIBLE_SPECTRA.find((x) => x.symbol === symbol)?.lines ?? [];
      return lines.map((l) => ({ ray: PRISM.trace(l.lambdaNm)!, color: lineColor(l.lambdaNm, 2.4), weight: 0.35 + 0.65 * l.intensity }));
    }
    const out: { ray: PrismRay; color: THREE.Color; weight: number }[] = [];
    for (let l = 395; l <= 735; l += q.tier === 'baja' ? 17 : 8.5) out.push({ ray: PRISM.trace(l)!, color: lineColor(l, 1.5), weight: 0.6 });
    return out;
  }, [symbol, mode, q.tier]);
  const d = PRISM.trace(550)!;
  const src = to3(d.source);
  const entry = to3(d.entry);
  const inc = new THREE.Vector3(PRISM.incident[0], 0, PRISM.incident[1]);
  const slitAt = entry.clone().addScaledVector(inc, -0.9);
  const cellAt = entry.clone().addScaledVector(inc, -1.65);
  const quatCell = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), inc.clone().normalize()), [inc]);
  const prismCenter = useMemo(() => {
    const v = PRISM.vertices;
    return to3([(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3]);
  }, []);
  const screenAt = to3([PRISM.screenCenter[0] + PRISM.screenDir[0] * S_CENTER, PRISM.screenCenter[1] + PRISM.screenDir[1] * S_CENTER]);
  const bench = useMemo(() => {
    const pts = [src, screenAt, prismCenter, slitAt];
    const xs = pts.map((p) => p.x);
    const zs = pts.map((p) => p.z);
    const x0 = Math.min(...xs) - 1.1;
    const x1 = Math.max(...xs) + 1.1;
    const z0 = Math.min(...zs) - 1.3;
    const z1 = Math.max(...zs) + 1.3;
    return { center: new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2), w: x1 - x0, d: z1 - z0 };
  }, [src.x, src.z, screenAt.x, screenAt.z, prismCenter, slitAt.x, slitAt.z]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => {
    const scr = to3(PRISM.screenCenter);
    return new THREE.Vector3().addVectors(src, scr).multiplyScalar(0.5);
  }, [src]);
  return (
    <Stage mood="fotones" camera={[target.x - 0.4, 4.6, target.z + 7.6]} fov={36}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[target.x - 3, 6, target.z + 4]} intensity={1.4} color="#fff1dc" />
      <group>
        <Lamp color={lamp} flicker={!reduced} position={src} />
        <Beam a={src} b={entry} color={lamp.clone().multiplyScalar(0.8)} radius={0.012} />
        <Slit at={slitAt} dir={inc} />
        {mode === 'absorcion' && (
          <group position={cellAt} quaternion={quatCell}>
            <mesh>
              <boxGeometry args={[0.5, 0.55, 0.42]} />
              <meshPhysicalMaterial color={lampColor(symbol)} roughness={0.08} transparent opacity={0.3} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[LAMP_BOX]} />
              <lineBasicMaterial color="#e8eef5" transparent opacity={0.4} />
            </lineSegments>
          </group>
        )}
        <Prism glassy={q.tier !== 'baja'} />
        <RayFan rays={rays} thick={mode === 'emision'} />
        <Screen tex={tex} />
        <OpticalTable center={bench.center} w={bench.w} d={bench.d} />
        <RotationStage at={prismCenter} />
        <Post at={src} top={-0.76} />
        <Post at={slitAt} top={-0.45} />
        <Post at={screenAt} top={-SCREEN_H / 2 - 0.07} />
      </group>
      <LabelProjector anchors={SPECTRO_ANCHORS} />
      <OrbitControls target={target} enablePan={false} enableDamping minDistance={4} maxDistance={13} maxPolarAngle={1.45} />
    </Stage>
  );
}
