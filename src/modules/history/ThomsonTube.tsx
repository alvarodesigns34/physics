/**
 * ATOM 5.1 · Tubo de rayos catódicos de Thomson, reconstruido como instrumento.
 *
 * Qué es CÁLCULO y qué es ESQUEMA:
 * - CÁLCULO: la trayectoria del haz (F = q(E + v × B), integrada en science/cathode), la desviación en la
 *   pantalla, la compensación B = E/v y la escala en milímetros de la pantalla (misma escala que la
 *   trayectoria: 24 unidades de escena por metro).
 * - ESQUEMA: el tamaño del vidrio, del cátodo y de las bobinas (instrumento de sobremesa estilizado), las
 *   flechas de campo (su densidad crece con E y B, pero no es un mapa de campo calculado) y los «paquetes»
 *   de electrones que recorren el haz (un electrón real no se ve; su velocidad tampoco está a escala).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoundedBoxGeometry } from 'three-stdlib';
import { Stage } from '../../render/Stage';
import { useMergedGeometry } from '../../render/merged';
import { GlassMaterial } from '../../render/Glass';
import { LabelProjector, type Anchor } from '../../render/labels';
import { requestFrames, useContinuousRender } from '../../render/demand';
import { useQuality, useReducedMotion } from '../../app/hooks';
import type { CathodeResult } from '../../science/instruments';

export const TUBE_SCALE = 24; // unidades de escena por metro (x e y): la trayectoria es CÁLCULO a escala
export const PLATES_X0 = -0.8; // inicio de las placas
export const PLATE_LEN = 0.05; // m
export const PLATE_GAP = 0.02; // m
export const DRIFT = 0.15; // m
const SCREEN_X = PLATES_X0 + (PLATE_LEN + DRIFT) * TUBE_SCALE; // 4,0
const SCREEN_R = 1.25;
const CATHODE_X = -3.05;

export type TubeView = 'perspectiva' | 'lateral' | 'pantalla';
const VIEWS: Record<TubeView, { pos: [number, number, number]; target: [number, number, number] }> = {
  perspectiva: { pos: [-1.0, 4.4, 8.4], target: [0.3, -0.15, 0] },
  lateral: { pos: [0.5, 0, 9.4], target: [0.5, 0, 0] },
  pantalla: { pos: [8.6, 0.5, 1.4], target: [3.6, 0, 0] },
};

/** Perfil de revolución del vidrio (x, radio): cuello del cañón, zona de placas, cono y pantalla. */
function envelopeProfile(): THREE.Vector2[] {
  const pts: [number, number][] = [
    [-3.55, 0.0],
    [-3.55, 0.3],
    [-3.48, 0.38],
    [-3.3, 0.4],
    [-1.25, 0.4],
    [-1.0, 0.44],
    [0.55, 0.44],
    [0.9, 0.5],
    [1.6, 0.72],
    [2.5, 0.98],
    [3.4, 1.2],
    [3.85, 1.28],
    [4.02, 1.22],
    [4.1, 1.0],
    [4.14, 0.0],
  ];
  // LatheGeometry gira alrededor de Y: x del tubo → y del perfil; luego se rota el resultado.
  return pts.map(([x, r]) => new THREE.Vector2(r, x));
}

function useEnvelope() {
  return useMemo(() => {
    const g = new THREE.LatheGeometry(envelopeProfile(), 72);
    g.rotateZ(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, []);
}

/** Retícula de la pantalla en milímetros (misma escala que la trayectoria). */
function useGraticule() {
  return useMemo(() => {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0d1a14';
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    g.fill();
    // Escala: radio de la pantalla = SCREEN_R unidades = SCREEN_R / 24 m ≈ 52 mm
    const pxPerMm = S / 2 / ((SCREEN_R / TUBE_SCALE) * 1000);
    for (let mm = -50; mm <= 50; mm += 2) {
      const y = S / 2 - mm * pxPerMm;
      const major = mm % 10 === 0;
      g.strokeStyle = major ? 'rgba(160,240,196,0.55)' : 'rgba(160,240,196,0.22)';
      g.lineWidth = major ? 2 : 1;
      g.beginPath();
      g.moveTo(S / 2 - (major ? 26 : 12), y);
      g.lineTo(S / 2 + (major ? 26 : 12), y);
      g.stroke();
      if (major && mm !== 0) {
        g.fillStyle = 'rgba(160,240,196,0.7)';
        g.font = '600 18px JetBrains Mono, monospace';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillText(`${mm}`, S / 2 + 32, y);
      }
    }
    g.strokeStyle = 'rgba(160,240,196,0.3)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(S * 0.08, S / 2);
    g.lineTo(S * 0.92, S / 2);
    g.moveTo(S / 2, S * 0.08);
    g.lineTo(S / 2, S * 0.92);
    g.stroke();
    g.fillStyle = 'rgba(160,240,196,0.55)';
    g.font = '600 16px JetBrains Mono, monospace';
    g.textAlign = 'center';
    g.fillText('mm', S / 2 + 60, S / 2 - 22);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
}

/** Sprite radial para halos (generado, sin descargas). */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

/** Puntos de la trayectoria en la escena (desde el cátodo hasta la pantalla o la placa). */
export function beamPoints(res: CathodeResult): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [new THREE.Vector3(CATHODE_X + 0.25, 0, 0), new THREE.Vector3(PLATES_X0 - 0.4, 0, 0)];
  for (let i = 0; i < res.path.length / 2; i += 3) pts.push(new THREE.Vector3(PLATES_X0 + res.path[i * 2]! * TUBE_SCALE, res.path[i * 2 + 1]! * TUBE_SCALE, 0));
  const lastI = res.path.length / 2 - 1;
  if (lastI > 0) pts.push(new THREE.Vector3(PLATES_X0 + res.path[lastI * 2]! * TUBE_SCALE, res.path[lastI * 2 + 1]! * TUBE_SCALE, 0));
  // Recorte dentro del vidrio (si el haz se curva hacia atrás o sale de la pantalla)
  return pts.filter((p, i) => i < 2 || (p.x <= SCREEN_X && Math.abs(p.y) < SCREEN_R * 1.05));
}

const BEAM = new THREE.Color('#8ff5c0');

function Beam({ res, flowing }: { res: CathodeResult; flowing: boolean }) {
  const pts = useMemo(() => beamPoints(res), [res]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.1), [pts]);
  const core = useMemo(() => new THREE.TubeGeometry(curve, Math.max(24, pts.length * 2), 0.012, 6, false), [curve, pts.length]);
  const halo = useMemo(() => new THREE.TubeGeometry(curve, Math.max(24, pts.length * 2), 0.05, 8, false), [curve, pts.length]);
  useEffect(() => () => {
    core.dispose();
    halo.dispose();
  }, [core, halo]);
  const packets = useRef<THREE.InstancedMesh>(null);
  const N = 26;
  const geo = useMemo(() => new THREE.SphereGeometry(0.03, 10, 8), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const phase = useRef(0);
  useFrame((_, dt) => {
    if (!packets.current) return;
    if (flowing) phase.current = (phase.current + dt * 0.35) % 1;
    for (let i = 0; i < N; i++) {
      const u = (i / N + phase.current) % 1;
      const p = curve.getPointAt(u);
      const s = 0.6 + 0.4 * Math.sin(u * Math.PI);
      m4.makeScale(s, s, s).setPosition(p);
      packets.current.setMatrixAt(i, m4);
    }
    packets.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={core}>
        <meshBasicMaterial color={BEAM.clone().multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      <mesh geometry={halo}>
        <meshBasicMaterial color={BEAM} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <instancedMesh ref={packets} args={[geo, undefined, N]} frustumCulled={false}>
        <meshBasicMaterial color={BEAM.clone().multiplyScalar(3)} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Flechas del campo eléctrico entre las placas (de + a −); su número y brillo crecen con la tensión. */
function EField({ plates }: { plates: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const shaft = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6);
    const head = new THREE.ConeGeometry(0.04, 0.09, 10);
    head.translate(0, -0.18, 0);
    head.rotateX(Math.PI);
    const g = new THREE.BufferGeometry();
    const merged = mergeTwo(shaft, head);
    shaft.dispose();
    head.dispose();
    g.copy(merged);
    merged.dispose();
    return g;
  }, []);
  const count = plates <= 0 ? 0 : Math.min(15, 5 + Math.round(plates / 40));
  useEffect(() => {
    const mm = ref.current;
    if (!mm) return;
    const m4 = new THREE.Matrix4();
    const cols = Math.max(1, Math.ceil(count / 3));
    let k = 0;
    for (let i = 0; i < cols && k < count; i++)
      for (const z of [-0.18, 0, 0.18]) {
        if (k >= count) break;
        const x = PLATES_X0 + ((i + 0.5) / cols) * PLATE_LEN * TUBE_SCALE;
        m4.makeRotationZ(Math.PI).setPosition(x, 0, z);
        mm.setMatrixAt(k++, m4);
      }
    mm.count = k;
    mm.instanceMatrix.needsUpdate = true;
  }, [count]);
  const intensity = Math.min(1, plates / 300);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, 15]} frustumCulled={false} visible={count > 0}>
      <meshBasicMaterial color="#f0b35c" transparent opacity={0.25 + 0.6 * intensity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const ai = a.toNonIndexed();
  const bi = b.toNonIndexed();
  const pos = new Float32Array([...(ai.getAttribute('position').array as Float32Array), ...(bi.getAttribute('position').array as Float32Array)]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ai.dispose();
  bi.dispose();
  return g;
}

/** Líneas del campo magnético de las bobinas (eje z, hacia el observador en la vista lateral). */
function BField({ B }: { B: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.004, 0.004, 1.5, 4).rotateX(Math.PI / 2), []);
  const head = useMemo(() => new THREE.ConeGeometry(0.02, 0.06, 8).rotateX(Math.PI / 2).translate(0, 0, 0.78), []);
  const n = B <= 0 ? 0 : Math.min(9, 3 + Math.round(B * 6));
  const positions = useMemo(() => {
    const out: [number, number][] = [];
    const side = Math.ceil(Math.sqrt(n));
    for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) if (out.length < n) out.push([PLATES_X0 + 0.1 + ((i + 0.5) / side) * (PLATE_LEN * TUBE_SCALE - 0.2), -0.18 + ((j + 0.5) / side) * 0.36]);
    return out;
  }, [n]);
  const headRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m4 = new THREE.Matrix4();
    positions.forEach(([x, y], i) => {
      m4.makeTranslation(x, y, 0);
      ref.current?.setMatrixAt(i, m4);
      headRef.current?.setMatrixAt(i, m4);
    });
    if (ref.current) {
      ref.current.count = positions.length;
      ref.current.instanceMatrix.needsUpdate = true;
    }
    if (headRef.current) {
      headRef.current.count = positions.length;
      headRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [positions]);
  const op = 0.2 + Math.min(0.6, B * 0.6);
  return (
    <group visible={n > 0}>
      <instancedMesh ref={ref} args={[geo, undefined, 9]} frustumCulled={false}>
        <meshBasicMaterial color="#7fb8ff" transparent opacity={op} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[head, undefined, 9]} frustumCulled={false}>
        <meshBasicMaterial color="#7fb8ff" transparent opacity={op + 0.2} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Bobina de Helmholtz: carrete de cobre con espiras sugeridas por un anillo estriado y un soporte. */
function Coil({ z, energized }: { z: number; energized: number }) {
  const ring = useMemo(() => new THREE.TorusGeometry(0.92, 0.07, 18, 120), []);
  const flange = useMemo(() => new THREE.TorusGeometry(0.92, 0.09, 6, 120), []);
  useEffect(() => () => {
    ring.dispose();
    flange.dispose();
  }, [ring, flange]);
  return (
    <group position={[PLATES_X0 + (PLATE_LEN * TUBE_SCALE) / 2, 0, z]}>
      <mesh geometry={ring} castShadow>
        <meshPhysicalMaterial color="#b86a3c" metalness={0.95} roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.25} emissive="#ff8a3d" emissiveIntensity={energized * 0.08} />
      </mesh>
      <mesh geometry={flange} scale={[1, 1, 0.25]} position-z={z > 0 ? 0.08 : -0.08}>
        <meshStandardMaterial color="#1d1c1b" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -1.32, 0]}>
        <boxGeometry args={[0.16, 0.66, 0.12]} />
        <meshStandardMaterial color="#26282c" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Plates({ plates, hit }: { plates: number; hit: boolean }) {
  const geo = useMemo(() => new RoundedBoxGeometry(PLATE_LEN * TUBE_SCALE, 0.035, 0.55, 2, 0.012), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const cx = PLATES_X0 + (PLATE_LEN * TUBE_SCALE) / 2;
  const glow = Math.min(1, plates / 400);
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s} position={[cx, s * ((PLATE_GAP * TUBE_SCALE) / 2 + 0.02), 0]}>
          <mesh geometry={geo} castShadow>
            <meshPhysicalMaterial color={s > 0 ? '#c98a4b' : '#7d8794'} metalness={1} roughness={0.22} clearcoat={0.4} emissive={s > 0 ? '#ff9a4a' : '#5c8cff'} emissiveIntensity={glow * 0.12 + (hit ? 0.5 : 0)} />
          </mesh>
          {/* Conexión que sale del vidrio hacia su borne */}
          <mesh position={[0, s * 0.24, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.46, 6]} />
            <meshStandardMaterial color="#d8c7a8" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, s * 0.52, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.08, 20]} />
            <meshStandardMaterial color={s > 0 ? '#8c2f22' : '#1f2a3d'} roughness={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const COLLIMATORS = [-2.55, -2.05, -1.55];
function ElectronGun({ accel }: { accel: number }) {
  const heat = 0.6 + Math.min(0.4, accel / 12000);
  // ATOM 5.2 · Piezas estáticas fusionadas por material (antes, 16 mallas y 16 llamadas de dibujo).
  const pins = useMergedGeometry(() => [0, 1, 2, 3, 4].map((k) => ({ geo: new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), position: [-3.78, Math.cos((k / 5) * Math.PI * 2) * 0.18, Math.sin((k / 5) * Math.PI * 2) * 0.18] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number] })));
  const discs = useMergedGeometry(() => COLLIMATORS.map((x, i) => ({ geo: new THREE.RingGeometry(0.035, i === 0 ? 0.3 : 0.34, 48), position: [x, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] })));
  const bands = useMergedGeometry(() => COLLIMATORS.map((x, i) => ({ geo: new THREE.CylinderGeometry(i === 0 ? 0.3 : 0.34, i === 0 ? 0.3 : 0.34, 0.03, 48, 1, true), position: [x, 0, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number] })));
  const rods = useMergedGeometry(() => [1, -1].map((sg) => ({ geo: new THREE.CylinderGeometry(0.01, 0.01, 1.5, 6), position: [-2.3, sg * 0.28, 0] as [number, number, number], rotation: [0, 0, Math.PI / 2] as [number, number, number] })));
  return (
    <group>
      {/* Casquillo de baquelita con patillas */}
      <mesh position={[-3.62, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.34, 0.36, 0.22, 40]} />
        <meshStandardMaterial color="#17130f" roughness={0.55} />
      </mesh>
      <mesh geometry={pins}>
        <meshStandardMaterial color="#d9c49a" metalness={1} roughness={0.25} />
      </mesh>
      {/* Cátodo caliente */}
      <mesh position={[CATHODE_X, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 0.24, 24]} />
        <meshStandardMaterial color="#5b544c" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[CATHODE_X + 0.125, 0, 0]} rotation-y={Math.PI / 2}>
        <circleGeometry args={[0.06, 24]} />
        <meshBasicMaterial color={new THREE.Color('#ff8f3a').multiplyScalar(1.6 * heat)} toneMapped={false} />
      </mesh>
      {/* Ánodo y colimadores (rendijas que dejan pasar un haz fino) */}
      <mesh geometry={discs}>
        <meshPhysicalMaterial color="#a39a8d" metalness={1} roughness={0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={bands}>
        <meshPhysicalMaterial color="#8d857a" metalness={1} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Varillas de soporte del cañón */}
      <mesh geometry={rods}>
        <meshStandardMaterial color="#c9b993" metalness={0.9} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Screen({ spotY, glow, halo }: { spotY: number | null; glow: THREE.Color; halo: THREE.Texture }) {
  const tex = useGraticule();
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[SCREEN_X + 0.04, 0, 0]}>
      <mesh rotation-y={-Math.PI / 2}>
        <circleGeometry args={[SCREEN_R - 0.02, 64]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#2a5a43" emissiveIntensity={0.55} roughness={0.85} />
      </mesh>
      {spotY !== null && (
        <group position={[-0.012, spotY, 0]}>
          <mesh rotation-y={-Math.PI / 2}>
            <circleGeometry args={[0.045, 24]} />
            <meshBasicMaterial color={glow.clone().multiplyScalar(4)} toneMapped={false} />
          </mesh>
          <sprite scale={[0.55, 0.55, 1]}>
            <spriteMaterial map={halo} color={glow} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      )}
    </group>
  );
}

const TRIM: [number, number, number, number][] = [[0, 1.6, 9.62, 0.03], [0, -1.6, 9.62, 0.03], [4.8, 0, 0.03, 3.22], [-4.8, 0, 0.03, 3.22]];
const CRADLES: [number, number][] = [[-2.6, 0.43], [2.3, 0.97]];
function Bench() {
  const trim = useMergedGeometry(() => TRIM.map(([x, z, w, d]) => ({ geo: new THREE.BoxGeometry(w, 0.012, d), position: [x, 0.062, z] as [number, number, number] })));
  // Medio anillo: el toro de arco π (plano xy), girado π en z (cuna inferior) y π/2 en y (eje del tubo).
  const cradles = useMergedGeometry(() =>
    CRADLES.flatMap(([x, r]) => [
      { geo: new THREE.BoxGeometry(0.1, 1.6 - r, 0.14), position: [x, (1.6 - r) / 2 + 0.06, 0] as [number, number, number] },
      { geo: new THREE.TorusGeometry(r + 0.03, 0.025, 8, 40, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2), position: [x, 1.66, 0] as [number, number, number] },
    ]),
  );
  return (
    <group position={[0.3, -1.66, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[9.6, 0.12, 3.2]} />
        {/* ATOM 6.0: superficie de laboratorio (fenólica) visible, no un plano casi negro */}
        <meshStandardMaterial color="#2b241e" roughness={0.72} metalness={0.05} envMapIntensity={0.45} />
      </mesh>
      {/* Filete de latón solo en el perímetro del banco */}
      <mesh geometry={trim}>
        {/* ATOM 6.0: latón satinado y discreto (antes, metal pulido que el bloom convertía en una línea naranja) */}
        <meshStandardMaterial color="#7d6440" metalness={0.85} roughness={0.55} envMapIntensity={0.5} />
      </mesh>
      {/* Cunas que sujetan el tubo: poste desde el banco y medio anillo bajo el vidrio */}
      <mesh geometry={cradles}>
        <meshStandardMaterial color="#2c2e33" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Cámara con transiciones suaves entre las tres vistas del instrumento. */
function ViewRig({ view, reduced }: { view: TubeView; reduced: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    const v = VIEWS[view];
    goal.current = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target), t: 0 };
    requestFrames(1600);
  }, [view]);
  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    g.t += dt;
    if (camera.position.distanceTo(g.pos) < 0.01 || g.t > 2.5) goal.current = null;
  });
  return null;
}

const GAS_GLOW: Record<'aire' | 'neon' | 'hidrogeno', string> = { aire: '#b9a7d6', neon: '#ff8a4c', hidrogeno: '#d9a0ff' };

export const TUBE_ANCHORS: Anchor[] = [
  { id: 'tb-catodo', position: [CATHODE_X, -0.55, 0] },
  { id: 'tb-anodo', position: [-2.05, 0.55, 0] },
  { id: 'tb-placas', position: [PLATES_X0 + 0.6, 0.85, 0] },
  { id: 'tb-bobinas', position: [PLATES_X0 + 0.6, -1.15, 0.95] },
  { id: 'tb-pantalla', position: [SCREEN_X, SCREEN_R + 0.25, 0] },
];

export function ThomsonTubeScene({ res, plates, B, accel, gas, view }: { res: CathodeResult; plates: number; B: number; accel: number; gas: 'aire' | 'neon' | 'hidrogeno'; view: TubeView }) {
  const env = useEnvelope();
  const halo = useGlowTexture();
  useEffect(() => () => {
    env.dispose();
    halo.dispose();
  }, [env, halo]);
  const q = useQuality();
  const reduced = useReducedMotion();
  // El haz «fluye» de forma continua en calidad alta; en media y baja, solo unos segundos tras cada cambio.
  const flowing = !reduced && q.tier !== 'baja';
  useContinuousRender(flowing && q.tier === 'alta');
  useEffect(() => {
    if (flowing) requestFrames(4000);
  }, [plates, B, accel, gas, flowing]);
  const spotY = !res.hitsPlate && !res.turnsBack && Number.isFinite(res.screenY) && Math.abs(res.screenY * TUBE_SCALE) < SCREEN_R - 0.06 ? res.screenY * TUBE_SCALE : null;
  const gasColor = useMemo(() => new THREE.Color(GAS_GLOW[gas]), [gas]);
  return (
    <Stage mood="historia" camera={VIEWS.perspectiva.pos} fov={36}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[-3, 6, 5]} intensity={1.9} color="#ffe2bf" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[6, 2, -5]} intensity={0.8} color="#9ec2f0" />
      <pointLight position={[CATHODE_X + 0.2, 0, 0]} intensity={0.6} distance={2.5} color="#ff9a4a" />
      <pointLight position={[SCREEN_X - 0.3, spotY ?? 0, 0]} intensity={spotY !== null ? 0.9 : 0} distance={3} color="#8ff5c0" />
      <Bench />
      <ElectronGun accel={accel} />
      <Plates plates={plates} hit={res.hitsPlate} />
      <EField plates={plates} />
      <Coil z={0.92} energized={Math.min(1, B)} />
      <Coil z={-0.92} energized={Math.min(1, B)} />
      <BField B={B} />
      <Beam res={res} flowing={flowing} />
      {/* Brillo tenue del gas residual a lo largo del haz (el color identifica el gas, no el haz) */}
      <mesh position={[0.4, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.36, 0.36, 7.4, 32, 1, true]} />
        <meshBasicMaterial color={gasColor} transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <Screen spotY={spotY} glow={BEAM} halo={halo} />
      <mesh geometry={env} renderOrder={2}>
        <GlassMaterial color="#e9f2f7" opacity={0.07} thickness={0.08} roughness={0.04} envMapIntensity={2.2} side={THREE.FrontSide} />
      </mesh>
      <LabelProjector anchors={TUBE_ANCHORS} />
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3} maxDistance={14} target={VIEWS.perspectiva.target} maxPolarAngle={1.7} />
      <ViewRig view={view} reduced={reduced} />
    </Stage>
  );
}
