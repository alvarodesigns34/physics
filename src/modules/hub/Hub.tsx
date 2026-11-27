import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { GlassMaterial } from '../../render/Glass';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, OrbitControls } from '@react-three/drei';
import { create } from 'zustand';
import { AnchoredLabel, LabelLayer, LabelProjector } from '../../render/labels';
import * as THREE from 'three';
import { Stage } from '../../render/Stage';
import { ElectronCloud } from '../../render/ElectronCloud';
import { Nucleus } from '../../render/Nucleus';
import { atomDensity, sampleOrbital } from '../../science/orbitals';
import { ELEMENTS } from '../../science/elements';
import { CATEGORY_COLOR } from '../../render/palette';
import { groundState } from '../../science/configuration';
import { mulberry32 } from '../../science/numbers';
import { transition } from '../../science/hydrogen';
import { wavelengthToLinearRGB } from '../../science/photon';
import { navigate, useQuality, useReducedMotion } from '../../app/hooks';
import { useStore } from '../../state/store';
import { BLOCKS, NODES } from '../../learning/syllabus';
import { masteryLevel } from '../../learning/mastery';
import { CHAPTERS, MISSIONS, ROMAN, missionRoute } from '../../learning/campaign';
import { EpiTag, Stars } from '../../ui/common';
import { Icon } from '../../ui/Icon';

const useHubUI = create<{ hovered: string | null; setHovered: (id: string | null) => void }>((set) => ({ hovered: null, setHovered: (hovered) => set({ hovered }) }));

interface StationDef {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  position: [number, number, number];
}

const STATIONS: StationDef[] = [
  { id: 'forja', route: '/forja', title: 'Atomic Forge', subtitle: 'Átomos, isótopos e iones', position: [-8.08, 0, 1.58] },
  { id: 'historia', route: '/historia', title: 'Time Machine', subtitle: 'Modelos y experimentos históricos', position: [-6.58, 0, -1.90] },
  { id: 'fotones', route: '/fotones', title: 'Photon Lab', subtitle: 'Luz, espectros e hidrógeno', position: [-3.68, 0, -4.33] },
  { id: 'masas', route: '/masas', title: 'Mass Spectrometry', subtitle: 'Isótopos y masa atómica', position: [0.00, 0, -5.20] },
  { id: 'cuantico', route: '/cuantico', title: 'Quantum Space', subtitle: 'Orbitales y números cuánticos', position: [3.68, 0, -4.33] },
  { id: 'arquitecto', route: '/arquitecto', title: 'Electron Architect', subtitle: 'Configuración electrónica', position: [6.58, 0, -1.90] },
  { id: 'periodico', route: '/periodico', title: 'Periodic Universe', subtitle: 'Tabla y propiedades periódicas', position: [8.08, 0, 1.58] },
  { id: 'guia', route: '/guia', title: 'Guía de estudio', subtitle: 'Teoría, fórmulas y ejemplos', position: [-2.4, 0, 3.3] },
  { id: 'entrenamiento', route: '/entrenamiento', title: 'Centro de entrenamiento', subtitle: 'Práctica, repaso y examen tipo', position: [2.4, 0, 3.3] },
];

function Floor({ reflective }: { reflective: boolean }) {
  const rings = useMemo(() => [2.2, 4.6, 7.4, 11], []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[30, 96]} />
        {reflective ? (
          <MeshReflectorMaterial resolution={512} blur={[380, 120]} mixBlur={1} mixStrength={2.2} mirror={0.35} roughness={0.75} depthScale={0.4} minDepthThreshold={0.4} maxDepthThreshold={1.2} color="#121110" metalness={0.35} />
        ) : (
          <meshStandardMaterial color="#121110" roughness={0.38} metalness={0.15} envMapIntensity={0.35} />
        )}
      </mesh>
      {rings.map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position-y={0.002}>
          <ringGeometry args={[r, r + 0.012, 160]} />
          <meshBasicMaterial color="#ece6dc" transparent opacity={0.06} />
        </mesh>
      ))}
    </group>
  );
}

const GOLD_LIT = new THREE.Color('#f2a93b').multiplyScalar(1.4);

/** Una pieza de todas las columnas a la vez (malla instanciada). */
function ColumnPart({ cols, y, args, material }: { cols: [number, number][]; y: number; args: [number, number, number, number]; material: React.ReactElement }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const t = new THREE.Matrix4();
    cols.forEach(([x, z], i) => m.setMatrixAt(i, t.makeTranslation(x, y, z)));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cols, y]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cols.length]}>
      <cylinderGeometry args={args} />
      {material}
    </instancedMesh>
  );
}

/** Columnata y anillo de luz: la arquitectura del Atrio. */
function Architecture({ reduced }: { reduced: boolean }) {
  const cols = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (-110 + (220 * i) / 16) * (Math.PI / 180);
      out.push([Math.sin(a) * 13.5, -Math.cos(a) * 13.5 + 1]);
    }
    return out;
  }, []);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (ring.current && !reduced) (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.22 + 0.06 * Math.sin(st.clock.elapsedTime * 0.6);
  });
  return (
    <group>
      {/* ATOM 5.0: las 17 columnas × 4 piezas eran 68 mallas (68 geometrías y 68 llamadas de dibujo); ahora
          son 4 mallas instanciadas que comparten geometría y material. */}
      <ColumnPart cols={cols} y={3.2} args={[0.16, 0.2, 6.4, 24]} material={<meshStandardMaterial color="#1d1a17" roughness={0.42} metalness={0.3} envMapIntensity={0.7} />} />
      <ColumnPart cols={cols} y={6.45} args={[0.3, 0.22, 0.1, 24]} material={<meshStandardMaterial color="#2a2622" roughness={0.35} metalness={0.5} />} />
      <ColumnPart cols={cols} y={6.52} args={[0.26, 0.26, 0.02, 24]} material={<meshBasicMaterial color={GOLD_LIT} toneMapped={false} />} />
      <ColumnPart cols={cols} y={0.06} args={[0.32, 0.36, 0.12, 24]} material={<meshStandardMaterial color="#24211d" roughness={0.5} metalness={0.3} />} />
      {/* Arquitrabe luminoso: solo el arco de la columnata (−110° a 110°), por detrás de las estaciones */}
      <mesh ref={ring} position={[0, 6.56, 1]} rotation={[-Math.PI / 2, 0, (-20 * Math.PI) / 180]}>
        <torusGeometry args={[13.5, 0.03, 8, 240, (220 * Math.PI) / 180]} />
        <meshBasicMaterial color="#f2a93b" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

/** Libro abierto con fórmulas que se iluminan: la Guía de estudio. */
function GuideHologram({ reduced }: { reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (g.current && !reduced) g.current.position.y = 1.35 + Math.sin(st.clock.elapsedTime * 1.1) * 0.05;
  });
  const lines = useMemo(() => [0.5, 0.36, 0.22, 0.08, -0.06, -0.2].map((y, i) => ({ y, w: [0.42, 0.3, 0.38, 0.24, 0.4, 0.28][i]! })), []);
  return (
    <group ref={g} position={[0, 1.35, 0]} rotation-x={-0.35}>
      {[-1, 1].map((side) => (
        <group key={side} rotation-y={side * 0.32}>
          <mesh position={[side * 0.3, 0.15, 0]}>
            <boxGeometry args={[0.58, 0.82, 0.015]} />
            <meshStandardMaterial color="#e9e1d3" roughness={0.8} emissive="#f2a93b" emissiveIntensity={0.06} />
          </mesh>
          {lines.map((l, i) => (
            <mesh key={i} position={[side * 0.3 - 0.02 * side, l.y, 0.012]}>
              <boxGeometry args={[l.w, 0.025, 0.004]} />
              <meshBasicMaterial color={i === 1 && side === 1 ? new THREE.Color('#f2a93b').multiplyScalar(2) : new THREE.Color('#3a342d')} toneMapped={i !== 1 || side !== 1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Pedestal({ active }: { active: boolean }) {
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    if (!ring.current) return;
    const target = active ? 1.6 : 0.55;
    ring.current.opacity += (target * 0.6 - ring.current.opacity) * Math.min(1, dt * 8);
  });
  return (
    <group>
      <mesh position-y={0.3} castShadow>
        <cylinderGeometry args={[0.72, 0.8, 0.6, 64, 1]} />
        <meshStandardMaterial color="#1b1916" roughness={0.5} metalness={0.25} envMapIntensity={0.6} />
      </mesh>
      <mesh position-y={0.605} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.66, 0.7, 96]} />
        <meshBasicMaterial ref={ring} color={new THREE.Color('#f2a93b').multiplyScalar(2.2)} transparent opacity={0.33} toneMapped={false} />
      </mesh>
      <mesh position-y={0.004} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.1, 1.13, 96]} />
        <meshBasicMaterial color="#f2a93b" transparent opacity={active ? 0.5 : 0.16} />
      </mesh>
    </group>
  );
}

function ForgeHologram({ reduced }: { reduced: boolean }) {
  const density = useMemo(() => atomDensity(6, groundState(6), 1800, mulberry32(3)), []);
  return (
    <group position-y={1.5} scale={0.62}>
      <Nucleus z={6} n={6} reduced={reduced} />
      <ElectronCloud density={density} scale={0.9} size={34} opacity={0.32} animate={!reduced} />
    </group>
  );
}

/** Icono del Photon Lab: las cuatro líneas visibles de Balmer con su color calculado. */
function PhotonHologram({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(() => [3, 4, 5, 6].map((n) => transition(n, 2)), []);
  useFrame((_, dt) => {
    if (group.current && !reduced) group.current.rotation.y += dt * 0.25;
  });
  return (
    <group ref={group} position-y={1.45}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.38, 0.38, 0.32, 3]} />
        <GlassMaterial color="#d9e4ee" roughness={0.05} transmission={0.6} thickness={0.4} opacity={0.55} envMapIntensity={1.2} />
      </mesh>
      {lines.map((t, i) => {
        const [r, g, b] = wavelengthToLinearRGB(t.wavelength * 1e9);
        const col = new THREE.Color(r, g, b).multiplyScalar(3.2);
        return (
          <mesh key={i} position={[0.55 + i * 0.1, 0, 0]} rotation-z={0}>
            <boxGeometry args={[0.025, 0.9 - i * 0.06, 0.025]} />
            <meshBasicMaterial color={col} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[-0.65, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.012, 0.012, 0.8, 8]} />
        <meshBasicMaterial color={new THREE.Color('#fff4e6').multiplyScalar(2.5)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Matriz del temario: 54 placas iluminadas según el dominio real de cada apartado. */
function SyllabusHologram() {
  const mastery = useStore((s) => s.mastery);
  const tiles = useMemo(() => {
    const out: { x: number; y: number; level: ReturnType<typeof masteryLevel> }[] = [];
    BLOCKS.forEach((b, row) => {
      const nodes = NODES.filter((n) => n.block === b.id);
      nodes.forEach((n, col) => out.push({ x: (col - 6) * 0.15, y: (3 - row) * 0.15, level: masteryLevel(mastery[n.id]) }));
    });
    return out;
  }, [mastery]);
  const color = (l: string) => (l === 'dominado' ? new THREE.Color('#f2a93b').multiplyScalar(2.4) : l === 'en-progreso' ? new THREE.Color('#f2a93b').multiplyScalar(0.9) : l === 'iniciado' ? new THREE.Color('#8a6533') : new THREE.Color('#4a433a'));
  return (
    <group position={[0.45, 1.45, 0]}>
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, t.y, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.02]} />
          <meshBasicMaterial color={color(t.level)} toneMapped={t.level !== 'dominado'} />
        </mesh>
      ))}
    </group>
  );
}

function BohrHologram({ reduced }: { reduced: boolean }) {
  const e = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    const a = reduced ? 1 : st.clock.elapsedTime * 1.2;
    e.current?.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
  });
  return (
    <group position-y={1.45} rotation-x={0.5}>
      {[0.18, 0.5, 0.9].map((r) => (
        <mesh key={r} rotation-x={Math.PI / 2}>
          <torusGeometry args={[r, 0.006, 6, 96]} />
          <meshBasicMaterial color="#ece6dc" transparent opacity={0.45} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshBasicMaterial color={new THREE.Color('#e8775c').multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      <mesh ref={e}>
        <sphereGeometry args={[0.045, 12, 10]} />
        <meshBasicMaterial color={new THREE.Color('#bfe0ff').multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
    </group>
  );
}

function MassHologram() {
  return (
    <group position={[0, 1.1, 0]} rotation-x={-0.25}>
      {[0.52, 0.58, 0.64].map((r, i) => (
        <mesh key={r} position={[0, 0, 0]} rotation-z={0}>
          <torusGeometry args={[r, 0.012, 6, 64, Math.PI]} />
          <meshBasicMaterial color={new THREE.Color(['#f2a93b', '#8fc3f2', '#d9785a'][i]!).multiplyScalar(2)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function OrbitalHologram({ reduced }: { reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const [pos, neg] = useMemo(() => {
    const pts = sampleOrbital(2, 1, 0, 1, 2200, mulberry32(21));
    const a: number[] = [];
    const b: number[] = [];
    for (let i = 0; i < pts.length; i += 3) (pts[i + 2]! >= 0 ? a : b).push(pts[i]! * 0.09, pts[i + 2]! * 0.09, pts[i + 1]! * 0.09);
    return [new Float32Array(a), new Float32Array(b)];
  }, []);
  useFrame((_, dt) => {
    if (g.current && !reduced) g.current.rotation.y += dt * 0.4;
  });
  return (
    <group ref={g} position-y={1.55}>
      {[
        [pos, '#f2a93b'],
        [neg, '#8fc3f2'],
      ].map(([arr, c], i) => (
        <points key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[arr as Float32Array, 3]} />
          </bufferGeometry>
          <pointsMaterial color={new THREE.Color(c as string).multiplyScalar(1.6)} size={0.028} sizeAttenuation transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </points>
      ))}
    </group>
  );
}

function BoxesHologram() {
  const rows = [1, 1, 3, 1, 3];
  return (
    <group position={[0, 0.95, 0]}>
      {rows.map((k, r) =>
        Array.from({ length: k }, (_, j) => (
          <group key={`${r}-${j}`} position={[(j - (k - 1) / 2) * 0.24, r * 0.2, 0]}>
            <mesh>
              <boxGeometry args={[0.2, 0.15, 0.06]} />
              <meshStandardMaterial color="#2a2622" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[0.02, 0.11, 0.01]} />
              <meshBasicMaterial color={new THREE.Color('#bfe0ff').multiplyScalar(2)} toneMapped={false} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function TableHologram() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => ELEMENTS.filter((e) => e.layout.row <= 7), []);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const m4 = new THREE.Matrix4();
    cells.forEach((el, i) => {
      const h = 0.02 + (el.electronegativity ?? 0.5) * 0.12;
      m4.makeScale(1, h, 1).setPosition((el.layout.col - 9.5) * 0.065, h / 2, (el.layout.row - 4) * 0.065);
      m.setMatrixAt(i, m4);
      m.setColorAt(i, new THREE.Color(CATEGORY_COLOR[el.category]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cells]);
  return (
    <group position-y={0.95} rotation-x={0.25}>
      <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]}>
        <boxGeometry args={[0.058, 1, 0.058]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
    </group>
  );
}

function Station({ def, reduced, hovered, onHover }: { def: StationDef; reduced: boolean; hovered: boolean; onHover: (id: string | null) => void }) {
  return (
    <group position={def.position}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(def.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          document.body.style.cursor = '';
          navigate(def.route);
        }}
      >
        <Pedestal active={hovered} />
        {def.id === 'forja' && <ForgeHologram reduced={reduced} />}
        {def.id === 'fotones' && <PhotonHologram reduced={reduced} />}
        {def.id === 'entrenamiento' && <SyllabusHologram />}
        {def.id === 'guia' && <GuideHologram reduced={reduced} />}
        {def.id === 'historia' && <BohrHologram reduced={reduced} />}
        {def.id === 'masas' && <MassHologram />}
        {def.id === 'cuantico' && <OrbitalHologram reduced={reduced} />}
        {def.id === 'arquitecto' && <BoxesHologram />}
        {def.id === 'periodico' && <TableHologram />}
        {/* volumen de impacto invisible para facilitar el toque */}
        <mesh position-y={1.2} visible={false}>
          <cylinderGeometry args={[1.1, 1.1, 2.6, 12]} />
          <meshBasicMaterial />
        </mesh>
      </group>
    </group>
  );
}

function CentralAtom({ reduced, points }: { reduced: boolean; points: number }) {
  const density = useMemo(() => atomDensity(10, groundState(10), points, mulberry32(10)), [points]);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current && !reduced) g.current.rotation.y += dt * 0.05;
  });
  return (
    <group ref={g} position={[0, 6.2, -12]}>
      <ElectronCloud density={density} scale={1.35} size={70} opacity={0.16} gain={1.5} animate={!reduced} />
      <group scale={0.8}>
        <Nucleus z={10} n={10} reduced={reduced} />
      </group>
    </group>
  );
}

export function HubScene() {
  const reduced = useReducedMotion();
  const q = useQuality();
  const hovered = useHubUI((st) => st.hovered);
  const setHovered = useHubUI((st) => st.setHovered);
  const anchors = useMemo(() => STATIONS.map((st) => ({ id: `station-${st.id}`, position: [st.position[0], 2.25, st.position[2]] as [number, number, number] })), []);
  return (
    <Stage camera={[0, 12.5, 22]} fov={33}>
      <LabelProjector anchors={anchors} />
      <ambientLight intensity={0.18} />
      <spotLight position={[0, 9, 2]} angle={0.55} penumbra={0.9} intensity={60} color="#ffe2bd" distance={30} decay={2} />
      <pointLight position={[-6, 3, 4]} intensity={10} color="#9dbfe8" distance={18} decay={2} />
      <Floor reflective={q.tier === 'alta'} />
      <Architecture reduced={reduced} />
      <CentralAtom reduced={reduced} points={Math.round(q.points * 0.8)} />
      {STATIONS.map((s) => (
        <Station key={s.id} def={s} reduced={reduced} hovered={hovered === s.id} onHover={setHovered} />
      ))}
      <OrbitControls target={[0, 1.2, -1.6]} enablePan={false} enableDamping minDistance={10} maxDistance={28} minPolarAngle={0.85} maxPolarAngle={1.4} minAzimuthAngle={-0.6} maxAzimuthAngle={0.6} />
    </Stage>
  );
}

function StationLabels() {
  const hovered = useHubUI((s) => s.hovered);
  const setHovered = useHubUI((s) => s.setHovered);
  return (
    <LabelLayer>
      {STATIONS.map((def) => (
        <AnchoredLabel key={def.id} id={`station-${def.id}`} align="bottom">
          <button
            type="button"
            className="station-label"
            onClick={() => navigate(def.route)}
            onMouseEnter={() => setHovered(def.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(def.id)}
            onBlur={() => setHovered(null)}
            style={{
              background: 'rgb(18 23 34 / 0.82)',
              border: `1px solid ${hovered === def.id ? 'var(--accent-line)' : 'var(--hairline-strong)'}`,
              borderRadius: 9,
              padding: '4px 10px',
              color: 'var(--ink)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              transition: 'border-color 120ms',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span style={{ display: 'block', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{def.title}</span>
            {hovered === def.id && <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{def.subtitle}</span>}
          </button>
        </AnchoredLabel>
      ))}
    </LabelLayer>
  );
}

export function HubOverlay() {
  const campaign = useStore((s) => s.campaign);
  const alias = useStore((s) => s.settings.alias);
  const startMission = useStore((s) => s.startMission);
  const next = MISSIONS.find((m) => campaign[m.id]?.status !== 'completada');
  const completed = MISSIONS.filter((m) => campaign[m.id]?.status === 'completada').length;
  const play = (id: string) => {
    const m = MISSIONS.find((x) => x.id === id)!;
    startMission(id);
    navigate(missionRoute(m));
  };
  return (
    <div className="workspace">
      <StationLabels />
      <div style={{ position: 'relative' }}>
        <div className="enter desktop-only" style={{ position: 'absolute', left: 'var(--gutter)', bottom: 'var(--gutter)', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="eyebrow eyebrow--accent">Estructura atómica · Sistema periódico</span>
          <h1 className="display" style={{ fontSize: 'clamp(2.5rem, 4.4vw, 4rem)' }}>La materia, de cerca{alias ? `, ${alias}` : ''}.</h1>
          <p className="lead">Siete laboratorios para construir átomos, repetir los experimentos que los descubrieron y comprobar con cálculos de verdad todo el tema de 1.º de Bachillerato.</p>
          <div className="row row--wrap" style={{ gap: 8 }}>
            <EpiTag kind="calculo">Nube central: densidad electrónica del neón (orbitales con Z efectiva de Slater)</EpiTag>
          </div>
        </div>
      </div>
      <aside className="side interactive enter" aria-label="Campaña" style={{ animationDelay: '80ms' }}>
        <div className="side__scroll">
          <section className="section mobile-only">
            <span className="eyebrow eyebrow--accent">Estructura atómica · Sistema periódico</span>
            <h1 className="h2">La materia, de cerca{alias ? `, ${alias}` : ''}.</h1>
            <p className="small muted">Construye átomos, haz que emitan luz y comprueba con cálculos de verdad lo que dice el temario. Toca una estación para entrar.</p>
          </section>
          <section className="section" aria-label="Preparar el examen">
            <span className="eyebrow">Preparar el examen</span>
            <div className="hub-quick">
              <a href="#/guia" className="card hub-quick__item">
                <span className="h3">Guía de estudio</span>
                <span className="small muted">Teoría explicada, fórmulas, errores típicos y ejemplos resueltos</span>
              </a>
              <a href="#/entrenamiento?v=examen" className="card hub-quick__item">
                <span className="h3">Examen tipo</span>
                <span className="small muted">8 preguntas, 10 puntos, 50 minutos, con corrección</span>
              </a>
            </div>
          </section>
          <section className="section">
            <div className="row row--between">
              <span className="eyebrow">Campaña</span>
              <span className="small faint num">
                {completed}/{MISSIONS.length}
              </span>
            </div>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${(completed / MISSIONS.length) * 100}%` }} />
            </div>
            {next && (
              <button type="button" className="card" onClick={() => play(next.id)} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' }}>
                <span className="eyebrow eyebrow--accent">{campaign[next.id]?.status === 'en-curso' ? 'Continuar' : 'Siguiente misión'} · {next.code}</span>
                <span className="h3">{next.title}</span>
                <span className="small muted">{next.brief}</span>
                <span className="row small" style={{ color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                  Empezar <Icon name="arrow-right" size={16} />
                </span>
              </button>
            )}
          </section>
          {CHAPTERS.map((ch) => (
            <details key={ch.id} className="section chapter" open={ch.id === (next?.chapter ?? 1)}>
              <summary className="row row--between" style={{ cursor: 'pointer', listStyle: 'none' }}>
                <span className="stack-8" style={{ gap: 2 }}>
                  <span className="eyebrow">Capítulo {ROMAN[ch.id]}</span>
                  <span className="h2" style={{ fontSize: '1.6rem' }}>
                    {ch.title}
                  </span>
                  <span className="small muted">{ch.subtitle}</span>
                </span>
                <span className="mono small faint">
                  {MISSIONS.filter((m) => m.chapter === ch.id && campaign[m.id]?.status === 'completada').length}/{MISSIONS.filter((m) => m.chapter === ch.id).length}
                </span>
              </summary>
              <ul className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {MISSIONS.filter((m) => m.chapter === ch.id).map((m) => {
                  const st = campaign[m.id];
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => play(m.id)} className="btn btn--ghost btn--block" style={{ justifyContent: 'space-between', minHeight: 44, padding: '0 10px' }}>
                        <span className="row" style={{ gap: 10, minWidth: 0 }}>
                          <span className="mono faint" style={{ width: 34, textAlign: 'left' }}>
                            {m.code}
                          </span>
                          <span style={{ color: st?.status === 'completada' ? 'var(--ink-muted)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
                        </span>
                        {st?.status === 'completada' ? <Stars n={st.stars} /> : st?.status === 'en-curso' ? <span className="chip" style={{ color: 'var(--accent)' }}>en curso</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
          <p className="small faint">Los laboratorios están abiertos desde el principio: la campaña propone un orden, pero no bloquea nada.</p>
        </div>
      </aside>
    </div>
  );
}
