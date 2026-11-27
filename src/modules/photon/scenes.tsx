import { requestFrames } from '../../render/demand';
import { PotentialWell, useHydroView, WELL_ANCHORS } from './PotentialWell';
import { GlassMaterial } from '../../render/Glass';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LabelProjector, type Anchor } from '../../render/labels';
import * as THREE from 'three';
import { Stage } from '../../render/Stage';
import { useReducedMotion } from '../../app/hooks';
import { levelEnergyEV, type Transition } from '../../science/hydrogen';
import { wavelengthToLinearRGB, isVisible } from '../../science/photon';
import { VISIBLE_SPECTRA } from '../../science/data/spectralLines';
import { usePhoton } from './state';
import { sfx } from '../../app/sound';

/** Color de escena (lineal, HDR para el bloom) de una longitud de onda; gris neutro fuera del visible. */
export function lineColor(lambdaNm: number, boost = 2.6): THREE.Color {
  if (!isVisible(lambdaNm)) return new THREE.Color('#bdb4a7').multiplyScalar(boost * 0.55);
  const [r, g, b] = wavelengthToLinearRGB(lambdaNm);
  return new THREE.Color(r, g, b).multiplyScalar(boost);
}

// ── Banco de ondas ────────────────────────────────────────────────────────

/** Longitud de onda DIBUJADA: escala logarítmica comprimida (10⁻¹⁴ m → 0,3 u; 10⁴ m → 6 u). */
export function displayWavelength(lambdaM: number): number {
  const t = Math.min(1, Math.max(0, (Math.log10(lambdaM) + 14) / 18));
  return 0.3 * Math.pow(20, t);
}

function WaveLine({ axis, color, amplitude, lambdaVis, phase, opacity }: { axis: 'y' | 'z'; color: THREE.Color; amplitude: number; lambdaVis: number; phase: React.MutableRefObject<number>; opacity: number }) {
  const N = 700;
  const X0 = -4.2;
  const X1 = 4.2;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false }), [color, opacity]);
  useEffect(() => () => geom.dispose(), [geom]);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const a = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const x = X0 + ((X1 - X0) * i) / (N - 1);
      const env = Math.min(1, (x - X0) / 0.8, (X1 - x) / 0.8);
      const v = amplitude * env * Math.sin(((2 * Math.PI) / lambdaVis) * x - phase.current);
      a.setXYZ(i, x, axis === 'y' ? v : 0, axis === 'z' ? v : 0);
    }
    a.needsUpdate = true;
  });
  const line = useMemo(() => new THREE.Line(geom, mat), [geom, mat]);
  return <primitive object={line} />;
}

/**
 * ATOM 5.1 · Lámina y vectores del campo (imagen de libro de texto). La lámina une el eje con la curva; los
 * vectores, muestreados cada λ/8 dibujada, muestran que E y B son perpendiculares, están en fase y
 * perpendiculares a la propagación. ESQUEMA: amplitudes y velocidad ilustrativas.
 */
function FieldSheet({ axis, color, amplitude, lambdaVis, phase, opacity }: { axis: 'y' | 'z'; color: THREE.Color; amplitude: number; lambdaVis: number; phase: React.MutableRefObject<number>; opacity: number }) {
  const N = 260;
  const X0 = -4.2;
  const X1 = 4.2;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    return g;
  }, []);
  useEffect(() => () => geom.dispose(), [geom]);
  useFrame(() => {
    const a = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const x = X0 + ((X1 - X0) * i) / (N - 1);
      const env = Math.min(1, (x - X0) / 0.8, (X1 - x) / 0.8);
      const v = amplitude * env * Math.sin(((2 * Math.PI) / lambdaVis) * x - phase.current);
      a.setXYZ(i * 2, x, 0, 0);
      a.setXYZ(i * 2 + 1, x, axis === 'y' ? v : 0, axis === 'z' ? v : 0);
    }
    a.needsUpdate = true;
  });
  return (
    <mesh geometry={geom} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function FieldVectors({ axis, color, amplitude, lambdaVis, phase }: { axis: 'y' | 'z'; color: THREE.Color; amplitude: number; lambdaVis: number; phase: React.MutableRefObject<number> }) {
  const MAX = 48;
  const shafts = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const shaftGeo = useMemo(() => new THREE.CylinderGeometry(0.008, 0.008, 1, 6).translate(0, 0.5, 0), []);
  const headGeo = useMemo(() => new THREE.ConeGeometry(0.035, 0.09, 10), []);
  useEffect(() => () => {
    shaftGeo.dispose();
    headGeo.dispose();
  }, [shaftGeo, headGeo]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const qx = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), []);
  const flip = useMemo(() => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), []);
  useFrame(() => {
    const sm = shafts.current;
    const hm = heads.current;
    if (!sm || !hm) return;
    const step = lambdaVis / 8;
    const count = Math.min(MAX, Math.floor(8.4 / step));
    let k = 0;
    for (let i = 0; i < count; i++) {
      const x = -4.2 + 0.4 + i * step;
      if (x > 3.8) break;
      const env = Math.min(1, (x + 4.2) / 0.8, (4.2 - x) / 0.8);
      const v = amplitude * env * Math.sin(((2 * Math.PI) / lambdaVis) * x - phase.current);
      const len = Math.abs(v);
      if (len < 0.06) continue;
      q.identity();
      if (axis === 'z') q.multiply(qx);
      if (v < 0) q.multiply(flip);
      m4.compose(new THREE.Vector3(x, 0, 0), q, new THREE.Vector3(1, len - 0.06, 1));
      sm.setMatrixAt(k, m4);
      const tip = new THREE.Vector3(0, len - 0.045, 0).applyQuaternion(q).add(new THREE.Vector3(x, 0, 0));
      m4.compose(tip, q, new THREE.Vector3(1, 1, 1));
      hm.setMatrixAt(k, m4);
      k++;
    }
    sm.count = k;
    hm.count = k;
    sm.instanceMatrix.needsUpdate = true;
    hm.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={shafts} args={[shaftGeo, undefined, MAX]} frustumCulled={false}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[headGeo, undefined, MAX]} frustumCulled={false}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** Anclas de las etiquetas de la onda (el grupo de la escena está girado −0,12 rad en Y). */
function waveAnchors(): Anchor[] {
  const rot = (x: number, y: number, z: number): [number, number, number] => {
    const c = Math.cos(-0.12);
    const s = Math.sin(-0.12);
    return [x * c + z * s, y, -x * s + z * c];
  };
  return [
    { id: 'wave-E', position: rot(-4.3, 1.25, 0) },
    { id: 'wave-B', position: rot(-4.3, 0.1, 0.95) },
    { id: 'wave-c', position: rot(4.6, 0, 0) },
    { id: 'wave-ruler', position: rot(0, -1.8, 0) },
  ];
}

const WAVE_ANCHORS = waveAnchors();

function PhaseDriver({ phase, running }: { phase: React.MutableRefObject<number>; running: boolean }) {
  useFrame((_, dt) => {
    if (running) phase.current += dt * 2.2;
  });
  return null;
}

export function WaveScene() {
  const lambdaNm = usePhoton((s) => s.lambdaNm);
  const reduced = useReducedMotion();
  const lambdaM = lambdaNm * 1e-9;
  const vis = displayWavelength(lambdaM);
  const phase = useRef(0);
  const color = useMemo(() => lineColor(lambdaNm, 2.4), [lambdaNm]);
  const bColor = useMemo(() => new THREE.Color('#a9cdf5').multiplyScalar(0.7), []);
  return (
    <Stage mood="fotones" camera={[2.2, 1.6, 7.6]} fov={40}>
      <PhaseDriver phase={phase} running={!reduced} />
      <LabelProjector anchors={WAVE_ANCHORS} />
      <ambientLight intensity={0.3} />
      <group rotation-y={-0.12}>
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.006, 0.006, 8.6, 8]} />
          <meshBasicMaterial color="#5c564e" />
        </mesh>
        <WaveLine axis="y" color={color} amplitude={1.05} lambdaVis={vis} phase={phase} opacity={1} />
        <WaveLine axis="z" color={bColor} amplitude={0.75} lambdaVis={vis} phase={phase} opacity={0.55} />
        <FieldSheet axis="y" color={color} amplitude={1.05} lambdaVis={vis} phase={phase} opacity={0.045} />
        <FieldSheet axis="z" color={bColor} amplitude={0.75} lambdaVis={vis} phase={phase} opacity={0.06} />
        <FieldVectors axis="y" color={color} amplitude={1.05} lambdaVis={vis} phase={phase} />
        <FieldVectors axis="z" color={bColor} amplitude={0.75} lambdaVis={vis} phase={phase} />
        {/* Regla: una longitud de onda dibujada */}
        <group position={[-vis / 2, -1.55, 0]}>
          <mesh position={[vis / 2, 0, 0]}>
            <boxGeometry args={[vis, 0.006, 0.006]} />
            <meshBasicMaterial color="#ece6dc" />
          </mesh>
          {[0, vis].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.006, 0.16, 0.006]} />
              <meshBasicMaterial color="#ece6dc" />
            </mesh>
          ))}
        </group>
      </group>
      <OrbitControls enablePan={false} enableDamping minDistance={4} maxDistance={14} target={[0, 0, 0]} />
    </Stage>
  );
}

// ── Átomo de hidrógeno: escalera de niveles ───────────────────────────────

const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const Y_BOTTOM = -1.75;
const Y_TOP = 2.25;
/** Eje vertical = energía, escala LINEAL: −13,6 eV → abajo; 0 eV (ionización) → arriba. */
export const yOfEnergy = (eV: number) => Y_BOTTOM + ((eV + 13.6057) / 13.6057) * (Y_TOP - Y_BOTTOM);
const MARKER_X = -1.6;

export const HYDROGEN_ANCHORS: Anchor[] = [
  ...[1, 2, 3, 4].map((n) => ({ id: `lvl-${n}`, position: [2.2, yOfEnergy(levelEnergyEV(n)), 0] as [number, number, number], offset: [8, 0] as [number, number] })),
  { id: 'lvl-high', position: [2.2, yOfEnergy(levelEnergyEV(6)), 0], offset: [8, 0] },
  { id: 'lvl-inf', position: [2.2, yOfEnergy(0), 0], offset: [8, 0] },
  { id: 'axis-energy', position: [-2.6, 0, 0] },
  { id: 'electron', object: electronLabelRefProxy() },
];

function electronLabelRefProxy(): React.RefObject<THREE.Object3D | null> {
  return { get current() { return electronLabelRef.current; } } as React.RefObject<THREE.Object3D | null>;
}

function Level({ n, active, onPick }: { n: number; active: boolean; onPick: (n: number) => void }) {
  const y = yOfEnergy(levelEnergyEV(n));
  return (
    <group position-y={y}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick(n);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[4.2, 0.16, 0.02]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[4.2, n > 4 ? 0.008 : 0.014, 0.014]} />
        <meshBasicMaterial color={active ? new THREE.Color('#f2a93b').multiplyScalar(2) : new THREE.Color('#ece6dc')} transparent opacity={active ? 1 : n > 4 ? 0.3 : 0.55} toneMapped={!active} />
      </mesh>
    </group>
  );
}

function Photon({ t, delay, createdAt }: { t: Transition; delay: number; createdAt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Mesh>(null);
  const col = useMemo(() => lineColor(t.wavelength * 1e9, 4), [t]);
  const emitted = t.type === 'emision';
  const y0 = yOfEnergy(levelEnergyEV(t.from));
  const y1 = yOfEnergy(levelEnergyEV(t.to));
  const sounded = useRef(false);
  // El fotón vuela (delay + 1,6 s): durante ese tiempo la escena debe dibujarse aunque nadie toque nada.
  useEffect(() => requestFrames(Math.max(0, createdAt + (delay + 1.8) * 1000 - performance.now())), [createdAt, delay]);
  useFrame(() => {
    const age = (performance.now() - createdAt) / 1000 - delay;
    const m = ref.current;
    if (!m || !trail.current) return;
    if (age < 0) {
      m.visible = false;
      trail.current.visible = false;
      return;
    }
    if (!sounded.current) {
      sounded.current = true;
      sfx.photon(t.frequency, t.type);
    }
    const dur = 1.6;
    const k = Math.min(1, age / dur);
    const yMid = (y0 + y1) / 2;
    const x = emitted ? MARKER_X + k * 7.5 : -7 + k * (MARKER_X + 7);
    m.position.set(x, emitted ? yMid : y0, 0);
    m.visible = k < 1;
    trail.current.visible = k < 1;
    trail.current.position.set(x + (emitted ? -0.45 : -0.45), m.position.y, 0);
  });
  return (
    <group>
      <mesh ref={ref} visible={false}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={col} toneMapped={false} />
      </mesh>
      <mesh ref={trail} visible={false} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.002, 0.9, 8]} />
        <meshBasicMaterial color={col} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Flechas de transición (como el diagrama de series de TEO p.10), una por línea detectada. */
function TransitionArrows() {
  const detected = usePhoton((s) => s.detected);
  const sorted = [...detected].sort((a, b) => a.t.n1 - b.t.n1 || a.t.n2 - b.t.n2);
  return (
    <group>
      {sorted.map((d, i) => {
        const yA = yOfEnergy(levelEnergyEV(d.t.from));
        const yB = yOfEnergy(levelEnergyEV(d.t.to));
        const x = -0.9 + i * 0.13;
        const len = Math.abs(yA - yB);
        const col = lineColor(d.t.wavelength * 1e9, 2.2);
        const down = yB < yA;
        return (
          <group key={`${d.t.from}-${d.t.to}`} position={[x, (yA + yB) / 2, 0.2]}>
            <mesh>
              <boxGeometry args={[0.022, Math.max(0.01, len - 0.08), 0.022]} />
              <meshBasicMaterial color={col} toneMapped={false} transparent opacity={0.9} />
            </mesh>
            <mesh position-y={(down ? -1 : 1) * (len / 2 - 0.05)} rotation-z={down ? Math.PI : 0}>
              <coneGeometry args={[0.05, 0.1, 10]} />
              <meshBasicMaterial color={col} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export const electronLabelRef: React.RefObject<THREE.Object3D | null> = { current: null };

function Electron({ reduced }: { reduced: boolean }) {
  const level = usePhoton((s) => s.level);
  const ref = useRef<THREE.Group>(null);
  const labelRef = electronLabelRef as React.RefObject<THREE.Object3D>;
  const target = yOfEnergy(levelEnergyEV(level));
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.y += (target - ref.current.position.y) * (reduced ? 1 : Math.min(1, dt * 6));
  });
  return (
    <group ref={ref} position={[MARKER_X, target, 0]}>
      <mesh>
        <sphereGeometry args={[0.09, 24, 16]} />
        <meshBasicMaterial color={new THREE.Color('#cfe3ff').multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <object3D ref={labelRef} position={[-0.28, 0, 0]} />
    </group>
  );
}

export function HydrogenScene() {
  const view = useHydroView((s) => s.view);
  const reduced = useReducedMotion();
  const level = usePhoton((s) => s.level);
  const last = usePhoton((s) => s.lastTransition);
  const detected = usePhoton((s) => s.detected);
  if (view === 'pozo') {
    const lastT = detected.find((d) => d.stamp === last?.stamp)?.t;
    return (
      <Stage mood="fotones" camera={[0, 3.0, 9.6]} fov={40} key="pozo">
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} color="#e9e4ff" />
        <PotentialWell level={level} lastStamp={last?.stamp} lastColor={lastT ? lineColor(lastT.wavelength * 1e9, 3) : new THREE.Color('#ffffff')} reduced={reduced} />
        <LabelProjector anchors={WELL_ANCHORS} />
        <OrbitControls target={[0, 0.7, 0]} enablePan={false} enableDamping minDistance={4} maxDistance={14} maxPolarAngle={1.5} autoRotate={!reduced} autoRotateSpeed={0.3} />
      </Stage>
    );
  }
  return <HydrogenLadder />;
}

function HydrogenLadder() {
  const reduced = useReducedMotion();
  const flights = usePhoton((s) => s.flights);
  const level = usePhoton((s) => s.level);
  const mode = usePhoton((s) => s.mode);
  const setFrom = usePhoton((s) => s.setFrom);
  const setTo = usePhoton((s) => s.setTo);
  const from = usePhoton((s) => s.from);
  const onPick = (n: number) => {
    // Primer toque: origen; segundo: destino.
    if (n === from) return;
    if ((mode === 'emision' && n < from) || (mode === 'absorcion' && n > from)) setTo(n);
    else setFrom(n);
  };
  return (
    <Stage mood="fotones" camera={[0.4, 0.9, 8.6]} fov={40} key="diagrama">
      <ambientLight intensity={0.3} />
      {LEVELS.map((n) => (
        <Level key={n} n={n} active={n === level} onPick={onPick} />
      ))}
      <group position-y={yOfEnergy(0)}>
        <mesh>
          <boxGeometry args={[4.2, 0.006, 0.006]} />
          <meshBasicMaterial color="#ece6dc" transparent opacity={0.25} />
        </mesh>
      </group>
      {/* Los niveles altos están a pocos píxeles (escala lineal): las etiquetas se separan HACIA ARRIBA, donde
          hay espacio, con una línea guía hasta su nivel. */}
      <LabelProjector anchors={HYDROGEN_ANCHORS} avoidOverlap="up" />
      <TransitionArrows />
      <Electron reduced={reduced} />
      {flights.map((f) => (
        <Photon key={f.stamp} t={f.t} delay={f.delay} createdAt={f.createdAt} />
      ))}
      <OrbitControls target={[0.2, -0.1, 0]} enablePan={false} enableDamping minDistance={5} maxDistance={13} minAzimuthAngle={-0.7} maxAzimuthAngle={0.7} minPolarAngle={1.1} maxPolarAngle={2.0} />
    </Stage>
  );
}

// ── Espectroscopio: lámpara de descarga ───────────────────────────────────

/** Color percibido aproximado de una lámpara: suma de las líneas visibles ponderadas por intensidad. */
export function lampColor(symbol: string): THREE.Color {
  const sp = VISIBLE_SPECTRA.find((s) => s.symbol === symbol);
  if (!sp) return new THREE.Color('#ffffff');
  let r = 0;
  let g = 0;
  let b = 0;
  for (const l of sp.lines) {
    const [lr, lg, lb] = wavelengthToLinearRGB(l.lambdaNm);
    r += lr * l.intensity;
    g += lg * l.intensity;
    b += lb * l.intensity;
  }
  const m = Math.max(r, g, b, 1e-6);
  return new THREE.Color(r / m, g / m, b / m);
}

function Tube({ color, flicker }: { color: THREE.Color; flicker: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (mat.current) mat.current.color.copy(color).multiplyScalar(flicker ? 0.92 + 0.08 * Math.sin(state.clock.elapsedTime * 9) : 1);
  });
  return (
    <mesh>
      <cylinderGeometry args={[0.12, 0.12, 3.4, 32]} />
      <meshBasicMaterial ref={mat} color={color} toneMapped={false} />
    </mesh>
  );
}

export function LampScene({ symbol, mode }: { symbol: string; mode: 'emision' | 'absorcion' }) {
  const reduced = useReducedMotion();
  const col = useMemo(() => (mode === 'emision' ? lampColor(symbol).multiplyScalar(3) : new THREE.Color('#fff6ea').multiplyScalar(3)), [symbol, mode]);
  return (
    <Stage mood="fotones" camera={[0, 0.6, 6.5]} fov={38}>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 1]} color={col} intensity={6} distance={6} />
      <group rotation-z={Math.PI / 2}>
        <Tube color={col} flicker={!reduced} />
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 3.6, 32, 1, true]} />
          <GlassMaterial color="#e8eef5" roughness={0.05} transmission={0.7} thickness={0.2} opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        {[-1.85, 1.85].map((y) => (
          <mesh key={y} position-y={y}>
            <cylinderGeometry args={[0.22, 0.22, 0.25, 32]} />
            <meshStandardMaterial color="#2a2622" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
      </group>
      {mode === 'absorcion' && (
        <mesh position={[0, -0.9, 0]}>
          <boxGeometry args={[1.4, 0.5, 0.5]} />
          <GlassMaterial color={lampColor(symbol)} roughness={0.1} transmission={0.5} opacity={0.35} />
        </mesh>
      )}
      <OrbitControls enablePan={false} enableDamping minDistance={4} maxDistance={10} />
    </Stage>
  );
}
