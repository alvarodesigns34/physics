/**
 * ATOM 5.1 · Mapa tridimensional de la campaña.
 *
 * El atrio de 5.0 mostraba los laboratorios, pero no las 41 misiones: el progreso solo vivía en el panel.
 * Ahora la campaña ES el espacio: un camino en espiral que asciende alrededor de un átomo de neón. Cada
 * misión es un nodo; cada capítulo, un tramo con su anillo y su rótulo (que abre su laboratorio).
 * - completada: oro encendido · en curso: acento · siguiente: late y la cámara la busca · pendiente: grafito.
 * - El tramo recorrido del camino brilla; el resto es una línea tenue.
 * Coste: unas diez llamadas de dibujo (nodos y anillos instanciados), frente a las 163 del atrio.
 * ESQUEMA: la espiral es una metáfora del recorrido; el átomo central sí es CÁLCULO (densidad del Ne).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { create } from 'zustand';
import { Stage } from '../../render/Stage';
import { ElectronCloud } from '../../render/ElectronCloud';
import { Nucleus } from '../../render/Nucleus';
import { LabelProjector, type Anchor } from '../../render/labels';
import { requestFrames } from '../../render/demand';
import { atomDensity } from '../../science/orbitals';
import { groundState } from '../../science/configuration';
import { mulberry32 } from '../../science/numbers';
import { useQuality, useReducedMotion } from '../../app/hooks';
import { useStore } from '../../state/store';
import { CHAPTERS, MISSIONS } from '../../learning/campaign';

export const useMapUI = create<{ hovered: string | null; set: (h: string | null) => void }>((set) => ({ hovered: null, set: (hovered) => set({ hovered }) }));

const RADIUS = 7.2;
const TURNS = 1.55;
const RISE = 7.5;
const GAP = 0.6; // separación extra entre capítulos (en «pasos» de misión)

/** Posición de cada misión en la espiral (con un pequeño hueco entre capítulos). */
export function missionPositions(): THREE.Vector3[] {
  const params: number[] = [];
  let t = 0;
  MISSIONS.forEach((m, i) => {
    if (i > 0 && m.chapter !== MISSIONS[i - 1]!.chapter) t += GAP;
    params.push(t);
    t += 1;
  });
  const total = params[params.length - 1]!;
  return params.map((p) => {
    const u = p / total;
    const a = -Math.PI * 0.62 + u * TURNS * Math.PI * 2;
    const r = RADIUS * (1 - 0.32 * u);
    return new THREE.Vector3(Math.cos(a) * r, 0.35 + u * RISE, Math.sin(a) * r);
  });
}

const POS = missionPositions();
export const CHAPTER_ANCHORS: Anchor[] = CHAPTERS.map((ch) => {
  const i = MISSIONS.findIndex((m) => m.chapter === ch.id);
  const p = POS[i]!;
  return { id: `ch-${ch.id}`, position: [p.x * 1.16, p.y - 0.7, p.z * 1.16] as [number, number, number] };
});
export const MISSION_ANCHORS: Anchor[] = MISSIONS.map((m, i) => ({ id: `ms-${m.id}`, position: [POS[i]!.x, POS[i]!.y + 0.75, POS[i]!.z] as [number, number, number] }));

const GOLD = new THREE.Color('#f2a93b');
const ACCENT = new THREE.Color('#6fa8ff');
const DIM = new THREE.Color('#3a3d45');

function Path({ doneUpTo }: { doneUpTo: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(POS, false, 'centripetal'), []);
  const full = useMemo(() => new THREE.TubeGeometry(curve, 400, 0.022, 6, false), [curve]);
  const done = useMemo(() => {
    if (doneUpTo < 1) return null;
    const pts = POS.slice(0, doneUpTo + 1);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), Math.max(8, pts.length * 10), 0.05, 8, false);
  }, [doneUpTo]);
  useEffect(() => () => full.dispose(), [full]);
  useEffect(() => () => done?.dispose(), [done]);
  return (
    <group>
      <mesh geometry={full}>
        <meshBasicMaterial color="#8a93a6" transparent opacity={0.28} />
      </mesh>
      {done && (
        <mesh geometry={done}>
          <meshBasicMaterial color={GOLD.clone().multiplyScalar(1.6)} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Nodes({ states, next, onPick }: { states: ('hecha' | 'curso' | 'pendiente')[]; next: number; onPick: (id: string) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.26, 24, 16), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const hovered = useMapUI((s) => s.hovered);
  const setHovered = useMapUI((s) => s.set);
  useEffect(() => {
    const mm = ref.current;
    if (!mm) return;
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    POS.forEach((p, i) => {
      const s = states[i] === 'hecha' ? 1 : states[i] === 'curso' ? 1.1 : 0.78;
      const h = MISSIONS[i]!.id === hovered ? 1.35 : 1;
      m4.makeScale(s * h, s * h, s * h).setPosition(p);
      mm.setMatrixAt(i, m4);
      c.copy(states[i] === 'hecha' ? GOLD : states[i] === 'curso' ? ACCENT : DIM);
      if (states[i] !== 'pendiente') c.multiplyScalar(1.5);
      mm.setColorAt(i, c);
    });
    mm.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
    requestFrames(200);
  }, [states, hovered]);
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    setHovered(MISSIONS[e.instanceId]!.id);
    document.body.style.cursor = 'pointer';
  };
  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[geo, undefined, POS.length]}
        onPointerMove={onMove}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) onPick(MISSIONS[e.instanceId]!.id);
        }}
      >
        <meshPhysicalMaterial roughness={0.25} metalness={0.3} clearcoat={1} emissive="#ffffff" emissiveIntensity={0.08} />
      </instancedMesh>
      {next >= 0 && <Beacon position={POS[next]!} />}
    </group>
  );
}

/** Faro de la siguiente misión: anillo que se expande y un haz vertical. */
function Beacon({ position }: { position: THREE.Vector3 }) {
  const ring = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ring.current) return;
    t.current = (t.current + dt * 0.6) % 1;
    const k = reduced ? 0.5 : t.current;
    ring.current.scale.setScalar(0.4 + k * 1.4);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
  });
  return (
    <group position={position}>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.56, 48]} />
        <meshBasicMaterial color={ACCENT.clone().multiplyScalar(2)} transparent opacity={0.6} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position-y={-position.y / 2}>
        <cylinderGeometry args={[0.012, 0.012, position.y, 6]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.45} toneMapped={false} />
      </mesh>
      <pointLight color="#8fb8ff" intensity={3} distance={4} decay={2} />
    </group>
  );
}

/** Anillos de inicio de capítulo (instanciados) y discos de suelo bajo cada tramo. */
function ChapterRings({ progress }: { progress: number[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.TorusGeometry(0.42, 0.018, 8, 64), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => {
    const mm = ref.current;
    if (!mm) return;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const c = new THREE.Color();
    CHAPTERS.forEach((ch, k) => {
      const i = MISSIONS.findIndex((m) => m.chapter === ch.id);
      m4.compose(POS[i]!, q, new THREE.Vector3(1, 1, 1));
      mm.setMatrixAt(k, m4);
      mm.setColorAt(k, c.copy(DIM).lerp(GOLD, progress[k] ?? 0).multiplyScalar(1.4));
    });
    mm.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
  }, [progress]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, CHAPTERS.length]}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Ground() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(512, 512, 0, 512, 512, 512);
    grd.addColorStop(0, '#161922');
    grd.addColorStop(0.7, '#0e1016');
    grd.addColorStop(1, '#0b0c10');
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = 'rgba(236,230,220,0.07)';
    for (let r = 60; r < 512; r += 52) {
      g.lineWidth = r % 156 === 112 ? 2 : 1;
      g.beginPath();
      g.arc(512, 512, r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.beginPath();
      g.moveTo(512 + Math.cos(a) * 60, 512 + Math.sin(a) * 60);
      g.lineTo(512 + Math.cos(a) * 500, 512 + Math.sin(a) * 500);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
      <circleGeometry args={[11, 96]} />
      <meshPhysicalMaterial map={tex} roughness={0.6} clearcoat={0.4} clearcoatRoughness={0.45} envMapIntensity={0.25} />
    </mesh>
  );
}

function CentralAtom({ reduced, points }: { reduced: boolean; points: number }) {
  const density = useMemo(() => atomDensity(10, groundState(10), points, mulberry32(10)), [points]);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current && !reduced) g.current.rotation.y += dt * 0.05;
  });
  return (
    <group ref={g} position={[0, 4.4, 0]}>
      <ElectronCloud density={density} scale={1.5} size={70} opacity={0.18} gain={1.5} animate={!reduced} />
      <group scale={0.8}>
        <Nucleus z={10} n={10} reduced={reduced} />
      </group>
    </group>
  );
}

/** Al entrar, la cámara se acerca desde lejos y se orienta hacia la siguiente misión. */
function FlyIn({ focus, reduced }: { focus: THREE.Vector3; reduced: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    // Vista general elevada, girada hacia la siguiente misión (que queda en primer plano).
    const dir = new THREE.Vector3(focus.x, 0, focus.z).normalize();
    const pos = dir.multiplyScalar(23).add(new THREE.Vector3(0, 14 + focus.y * 0.4, 0));
    goal.current = { pos, target: new THREE.Vector3(focus.x * 0.2, 5.2 + focus.y * 0.15, focus.z * 0.2), t: 0 };
    requestFrames(2600);
  }, [focus]);
  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 1.8);
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    g.t += dt;
    if (g.t > 3) goal.current = null;
  });
  return null;
}

export function CampaignMapScene({ onPick }: { onPick: (id: string) => void }) {
  const reduced = useReducedMotion();
  const q = useQuality();
  const campaign = useStore((s) => s.campaign);
  const states = useMemo(() => MISSIONS.map((m) => (campaign[m.id]?.status === 'completada' ? 'hecha' : campaign[m.id]?.status === 'en-curso' ? 'curso' : 'pendiente') as 'hecha' | 'curso' | 'pendiente'), [campaign]);
  const next = states.findIndex((s) => s !== 'hecha');
  // Tramo encendido: hasta la última misión completada CONSECUTIVA desde el principio.
  const doneUpTo = next < 0 ? POS.length - 1 : next - 1;
  const progress = useMemo(() => CHAPTERS.map((ch) => {
    const ms = MISSIONS.map((m, i) => [m, i] as const).filter(([m]) => m.chapter === ch.id);
    return ms.filter(([, i]) => states[i] === 'hecha').length / ms.length;
  }), [states]);
  const focus = POS[next < 0 ? POS.length - 1 : next]!;
  return (
    <Stage mood="campana" camera={[0, 22, 30]} fov={34}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[6, 14, 8]} intensity={1.2} color="#ffe6c8" />
      <directionalLight position={[-8, 5, -6]} intensity={0.6} color="#a8c4ea" />
      <Ground />
      <Path doneUpTo={doneUpTo} />
      <ChapterRings progress={progress} />
      <Nodes states={states} next={next} onPick={onPick} />
      <CentralAtom reduced={reduced} points={Math.round(q.points * 0.7)} />
      <LabelProjector anchors={[...CHAPTER_ANCHORS, ...MISSION_ANCHORS]} />
      <OrbitControls makeDefault target={[0, 3, 0]} enablePan={false} enableDamping minDistance={9} maxDistance={34} minPolarAngle={0.5} maxPolarAngle={1.42} />
      <FlyIn focus={focus} reduced={reduced} />
    </Stage>
  );
}
