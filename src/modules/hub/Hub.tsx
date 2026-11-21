import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { create } from 'zustand';
import { AnchoredLabel, LabelLayer, LabelProjector } from '../../render/labels';
import * as THREE from 'three';
import { Stage } from '../../render/Stage';
import { ElectronCloud } from '../../render/ElectronCloud';
import { Nucleus } from '../../render/Nucleus';
import { atomDensity } from '../../science/orbitals';
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
  { id: 'forja', route: '/forja', title: 'Atomic Forge', subtitle: 'Construye átomos, isótopos e iones', position: [-3.5, 0, -0.4] },
  { id: 'entrenamiento', route: '/entrenamiento', title: 'Centro de entrenamiento', subtitle: 'Práctica adaptativa, repaso y examen', position: [0, 0, -2.8] },
  { id: 'fotones', route: '/fotones', title: 'Photon Lab', subtitle: 'Luz, espectros y el átomo de hidrógeno', position: [3.5, 0, -0.4] },
];

function Floor() {
  const rings = useMemo(() => [2.2, 4.6, 7.4, 11], []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[30, 96]} />
        <meshStandardMaterial color="#121110" roughness={0.38} metalness={0.15} envMapIntensity={0.35} />
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
        <cylinderGeometry args={[0.8, 0.88, 0.6, 64, 1]} />
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
        <meshPhysicalMaterial color="#d9e4ee" roughness={0.05} metalness={0} transmission={0.6} thickness={0.4} transparent opacity={0.55} envMapIntensity={1.2} />
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
    <group ref={g} position={[0, 4.5, -9]}>
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
  const anchors = useMemo(() => STATIONS.map((st) => ({ id: `station-${st.id}`, position: [st.position[0], 2.55, st.position[2]] as [number, number, number] })), []);
  return (
    <Stage camera={[0, 8.6, 16.5]} fov={30}>
      <LabelProjector anchors={anchors} />
      <ambientLight intensity={0.18} />
      <spotLight position={[0, 9, 2]} angle={0.55} penumbra={0.9} intensity={60} color="#ffe2bd" distance={30} decay={2} />
      <pointLight position={[-6, 3, 4]} intensity={10} color="#9dbfe8" distance={18} decay={2} />
      <Floor />
      <CentralAtom reduced={reduced} points={Math.round(q.points * 0.8)} />
      {STATIONS.map((s) => (
        <Station key={s.id} def={s} reduced={reduced} hovered={hovered === s.id} onHover={setHovered} />
      ))}
      <OrbitControls target={[0, 1.4, -2]} enablePan={false} enableDamping minDistance={9} maxDistance={22} minPolarAngle={0.85} maxPolarAngle={1.4} minAzimuthAngle={-0.6} maxAzimuthAngle={0.6} />
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
              background: 'rgb(15 14 13 / 0.8)',
              border: `1px solid ${hovered === def.id ? 'var(--accent-line)' : 'var(--hairline-strong)'}`,
              borderRadius: 10,
              padding: '8px 14px',
              color: 'var(--ink)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              transition: 'border-color 120ms',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.1 }}>{def.title}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{def.subtitle}</span>
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
          <p className="lead">Un laboratorio para construir átomos, hacer que emitan luz y comprobar con cálculos de verdad lo que dice el temario de 1.º de Bachillerato.</p>
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
            <section key={ch.id} className="section">
              <div className="stack-8" style={{ gap: 2 }}>
                <span className="eyebrow">Capítulo {ROMAN[ch.id]}</span>
                <span className="h2" style={{ fontSize: '1.75rem' }}>
                  {ch.title}
                </span>
                <span className="small muted">{ch.subtitle}</span>
              </div>
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
            </section>
          ))}
          <p className="small faint">Los laboratorios están abiertos desde el principio: la campaña propone un orden, pero no bloquea nada.</p>
        </div>
      </aside>
    </div>
  );
}
