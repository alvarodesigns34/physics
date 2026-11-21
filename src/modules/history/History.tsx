import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import { Stage } from '../../render/Stage';
import { Nucleus } from '../../render/Nucleus';
import { ElectronCloud } from '../../render/ElectronCloud';
import { atomDensity } from '../../science/orbitals';
import { groundState } from '../../science/configuration';
import { mulberry32, formatNumber } from '../../science/numbers';
import { transition } from '../../science/hydrogen';
import { cathodeBeam, cathodeExitDeflection, type CathodeSetup } from '../../science/instruments';
import { closestApproach, fractionAbove, GOLD_NUMBER_DENSITY, sampleAngle, trajectory, classicalCollapseTime, type ScatteringParams } from '../../science/scattering';
import { CODATA } from '../../science/constants';
import { lineColor } from '../photon/scenes';
import { useMediaQuery, useReducedMotion, useRoute } from '../../app/hooks';
import { sfx } from '../../app/sound';
import { MissionPanel } from '../../ui/MissionPanel';
import { EpiTag, Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';

type Tab = 'modelos' | 'tubo' | 'geiger';
type ModelId = 'dalton' | 'thomson' | 'rutherford' | 'bohr' | 'chadwick' | 'actual';

const BINS = [0, 2, 5, 10, 20, 45, 90, 180];

interface HState {
  tab: Tab;
  model: ModelId;
  collapse: number; // 0: sin simular; >0: instante de inicio
  collapsed: boolean;
  bohrLevel: number;
  accel: number;
  plates: number;
  B: number;
  gas: 'aire' | 'neon' | 'hidrogeno';
  scModel: 'rutherford' | 'thomson';
  energy: number;
  thicknessUm: number;
  running: boolean;
  counts: { rutherford: number[]; thomson: number[] };
  totals: { rutherford: number; thomson: number };
  set: (p: Partial<Omit<HState, 'set'>>) => void;
}

const zeroBins = () => new Array(BINS.length - 1).fill(0);

export const useHistory = create<HState>((set) => ({
  tab: 'modelos',
  model: 'thomson',
  collapse: 0,
  collapsed: false,
  bohrLevel: 1,
  accel: 2000,
  plates: 150,
  B: 0,
  gas: 'aire',
  scModel: 'thomson',
  energy: 4.8,
  thicknessUm: 0.4,
  running: true,
  counts: { rutherford: zeroBins(), thomson: zeroBins() },
  totals: { rutherford: 0, thomson: 0 },
  set: (p) => set(p),
}));

const fmt = (v: number, sig = 3) => formatNumber(v, { sig });

// ── Modelos ───────────────────────────────────────────────────────────────

interface ModelInfo {
  id: ModelId;
  year: string;
  who: string;
  title: string;
  idea: string;
  evidence: string;
  limit: string;
  epi: 'historico' | 'calculo' | 'analogia';
}

export const MODELS: ModelInfo[] = [
  { id: 'dalton', year: '1808', who: 'Dalton (a partir de Demócrito)', title: 'Esfera maciza', idea: 'El átomo es una esfera maciza, indivisible e indestructible. Cada elemento tiene átomos de masa propia.', evidence: 'Explica las leyes de las proporciones en las reacciones químicas.', limit: 'La radiactividad (Becquerel, 1896) y el electrón (Thomson, 1897) muestran que el átomo tiene partes.', epi: 'historico' },
  { id: 'thomson', year: '1904', who: 'J. J. Thomson', title: 'Pastel de pasas', idea: 'Una esfera de carga positiva repartida con los electrones incrustados, como pasas en un pastel. En conjunto, neutro.', evidence: 'Incorpora el electrón descubierto con el tubo de rayos catódicos (1897).', limit: 'No explica que algunas partículas α reboten en una lámina de oro (Geiger–Marsden, 1911).', epi: 'historico' },
  { id: 'rutherford', year: '1911', who: 'E. Rutherford', title: 'Modelo nuclear', idea: 'Un núcleo diminuto, positivo y con casi toda la masa; los electrones giran a su alrededor como planetas.', evidence: 'Explica la dispersión de partículas α por la lámina de oro.', limit: 'Según Maxwell, un electrón acelerado radia: caería en espiral al núcleo en ≈ 10⁻¹¹ s, con un espectro continuo. Tampoco explica la estabilidad del núcleo.', epi: 'historico' },
  { id: 'bohr', year: '1913', who: 'N. Bohr', title: 'Órbitas cuantizadas', idea: 'El electrón solo puede estar en órbitas estacionarias (L = n·h/2π) sin radiar; emite o absorbe un fotón al saltar entre ellas.', evidence: 'Explica la estabilidad y el espectro del hidrógeno (Rydberg) con radios rₙ = n²·r₀.', limit: 'Solo funciona para el hidrógeno; no explica la estructura fina ni los átomos con varios electrones. Sommerfeld, Zeeman y el espín lo amplían.', epi: 'historico' },
  { id: 'chadwick', year: '1932', who: 'J. Chadwick', title: 'El neutrón', idea: 'El núcleo contiene protones y neutrones (partículas sin carga). La fuerza nuclear fuerte los mantiene unidos.', evidence: 'Resuelve la masa del núcleo y su estabilidad pese a la repulsión entre protones.', limit: '—', epi: 'historico' },
  { id: 'actual', year: '1926–', who: 'De Broglie, Heisenberg, Schrödinger', title: 'Modelo mecanocuántico', idea: 'El electrón no sigue trayectorias: se describe con orbitales, regiones de probabilidad definidas por n, l, m y s.', evidence: 'Explica la tabla periódica, los enlaces y los espectros de todos los átomos.', limit: 'Es el modelo vigente.', epi: 'calculo' },
];

function DaltonSphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.3, 64, 48]} />
      <meshPhysicalMaterial color="#b9b1a6" roughness={0.55} clearcoat={0.3} />
    </mesh>
  );
}

function ThomsonPudding({ reduced }: { reduced: boolean }) {
  const pts = useMemo(() => {
    const rng = mulberry32(5);
    return Array.from({ length: 12 }, () => {
      const v = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize().multiplyScalar(0.45 + rng() * 0.75);
      return { base: v, ph: rng() * 6 };
    });
  }, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    if (reduced) return;
    pts.forEach((p, i) => refs.current[i]?.position.copy(p.base).addScalar(Math.sin(s.clock.elapsedTime * 1.5 + p.ph) * 0.015));
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.4, 64, 48]} />
        <meshPhysicalMaterial color="#e8775c" roughness={0.4} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {pts.map((p, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} position={p.base}>
          <sphereGeometry args={[0.07, 20, 14]} />
          <meshBasicMaterial color={new THREE.Color('#bfe0ff').multiplyScalar(2)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function RutherfordAtom({ reduced }: { reduced: boolean }) {
  const collapse = useHistory((s) => s.collapse);
  const set = useHistory((s) => s.set);
  const orbits = useMemo(() => [0.7, 1.05, 1.4].map((r, i) => ({ r, tilt: [i * 0.9, i * 0.6, 0] as [number, number, number], speed: 1.6 / Math.pow(r, 1.5), ph: i * 2 })), []);
  const els = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const k = collapse ? Math.min(1, (performance.now() - collapse) / 3200) : 0;
    // Ley clásica r³ = r₀³(1 − t/τ): el radio cae cada vez más deprisa al final
    const factor = Math.cbrt(Math.max(0, 1 - k));
    orbits.forEach((o, i) => {
      const m = els.current[i];
      if (!m) return;
      const ang = (reduced && !collapse ? 0 : t * o.speed / Math.max(0.15, factor * factor)) + o.ph;
      const v = new THREE.Vector3(Math.cos(ang) * o.r * factor, 0, Math.sin(ang) * o.r * factor).applyEuler(new THREE.Euler(...o.tilt));
      m.position.copy(v);
      m.visible = factor > 0.03;
    });
    if (glow.current) glow.current.opacity = collapse ? 0.15 + 0.6 * k : 0;
    if (collapse && k >= 1 && !useHistory.getState().collapsed) set({ collapsed: true });
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.07, 20, 14]} />
        <meshBasicMaterial color={new THREE.Color('#e8775c').multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.45, 32, 24]} />
        <meshBasicMaterial ref={glow} color="#fff1d8" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {orbits.map((o, i) => (
        <group key={i} rotation={o.tilt}>
          {!collapse && (
            <mesh rotation-x={Math.PI / 2}>
              <torusGeometry args={[o.r, 0.004, 6, 120]} />
              <meshBasicMaterial color="#ece6dc" transparent opacity={0.3} />
            </mesh>
          )}
        </group>
      ))}
      {orbits.map((_, i) => (
        <mesh key={`e${i}`} ref={(m) => (els.current[i] = m)}>
          <sphereGeometry args={[0.06, 16, 12]} />
          <meshBasicMaterial color={new THREE.Color('#bfe0ff').multiplyScalar(2)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function BohrAtom({ reduced }: { reduced: boolean }) {
  const level = useHistory((s) => s.bohrLevel);
  const e = useRef<THREE.Mesh>(null);
  const r = useRef(0.18);
  const flash = useRef<THREE.Mesh>(null);
  const prev = useRef(level);
  const flashColor = useRef(new THREE.Color());
  const flashT = useRef(0);
  useEffect(() => {
    if (prev.current !== level) {
      const t = transition(prev.current, level);
      flashColor.current.copy(lineColor(t.wavelength * 1e9, 3));
      flashT.current = 1;
      sfx.photon(t.frequency);
      prev.current = level;
    }
  }, [level]);
  useFrame((s, dt) => {
    const target = 0.18 * level * level;
    r.current += (target - r.current) * (reduced ? 1 : Math.min(1, dt * 5));
    const ang = reduced ? 0.6 : s.clock.elapsedTime * (1.4 / (level * level * level)) * 3;
    e.current?.position.set(Math.cos(ang) * r.current, 0, Math.sin(ang) * r.current);
    if (flash.current) {
      flashT.current = Math.max(0, flashT.current - dt * 1.2);
      const m = flash.current.material as THREE.MeshBasicMaterial;
      m.color.copy(flashColor.current);
      m.opacity = flashT.current;
      flash.current.scale.setScalar(0.3 + (1 - flashT.current) * 3);
    }
  });
  return (
    <group rotation-x={0.35}>
      <mesh>
        <sphereGeometry args={[0.07, 20, 14]} />
        <meshBasicMaterial color={new THREE.Color('#e8775c').multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      {[1, 2, 3].map((n) => (
        <mesh key={n} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.18 * n * n, n === level ? 0.008 : 0.004, 6, 160]} />
          <meshBasicMaterial color={n === level ? new THREE.Color('#f2a93b').multiplyScalar(1.8) : new THREE.Color('#ece6dc')} transparent opacity={n === level ? 1 : 0.3} toneMapped={n !== level} />
        </mesh>
      ))}
      <mesh ref={e}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshBasicMaterial color={new THREE.Color('#bfe0ff').multiplyScalar(2)} toneMapped={false} />
      </mesh>
      <mesh ref={flash}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ModelScene() {
  const model = useHistory((s) => s.model);
  const reduced = useReducedMotion();
  const cloud = useMemo(() => atomDensity(1, groundState(1), 9000, mulberry32(1)), []);
  return (
    <Stage camera={[0, 1.2, 5.6]} fov={40} key={model}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={2} color="#ffe6c8" />
      <directionalLight position={[-4, -1, -3]} intensity={0.8} color="#a8c4ea" />
      {model === 'dalton' && <DaltonSphere />}
      {model === 'thomson' && <ThomsonPudding reduced={reduced} />}
      {model === 'rutherford' && <RutherfordAtom reduced={reduced} />}
      {model === 'bohr' && <BohrAtom reduced={reduced} />}
      {model === 'chadwick' && (
        <group scale={3.2}>
          <Nucleus z={6} n={6} reduced={reduced} />
        </group>
      )}
      {model === 'actual' && <ElectronCloud density={cloud} scale={0.95} size={70} opacity={0.22} animate={!reduced} />}
      <OrbitControls enablePan={false} enableDamping minDistance={3} maxDistance={10} autoRotate={!reduced && model !== 'bohr'} autoRotateSpeed={0.4} />
    </Stage>
  );
}

// ── Tubo de rayos catódicos ───────────────────────────────────────────────

const TUBE: Omit<CathodeSetup, 'accel' | 'plates' | 'B'> = { gap: 0.02, length: 0.05, drift: 0.15 };
const SX = 24; // unidades de escena por metro (x)
const SY = 24;
const X0 = -0.8; // inicio de las placas

function setupFrom(s: Pick<HState, 'accel' | 'plates' | 'B'>): CathodeSetup {
  return { ...TUBE, accel: s.accel, plates: s.plates, B: s.B / 1000 };
}

const GAS_GLOW: Record<HState['gas'], string> = { aire: '#b9a7d6', neon: '#ff8a4c', hidrogeno: '#d9a0ff' };

function TubeScene() {
  const { accel, plates, B, gas } = useHistory();
  const res = useMemo(() => cathodeBeam(setupFrom({ accel, plates, B })), [accel, plates, B]);
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [new THREE.Vector3(-2.3, 0, 0)];
    for (let i = 0; i < res.path.length / 2; i += 4) pts.push(new THREE.Vector3(X0 + res.path[i * 2]! * SX, res.path[i * 2 + 1]! * SY, 0));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color('#9ff0c4').multiplyScalar(2.2), toneMapped: false }));
  }, [res]);
  useEffect(() => () => line.geometry.dispose(), [line]);
  const screenX = X0 + (TUBE.length + TUBE.drift) * SX;
  const spotY = res.hitsPlate ? null : res.screenY * SY;
  return (
    <Stage camera={[0.8, 1.6, 7.2]} fov={40}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 5, 6]} intensity={1.8} color="#ffe6c8" />
      <mesh rotation-z={Math.PI / 2} position={[(screenX - 2.6) / 2 + 0.2, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.62, screenX + 2.9, 48, 1, true]} />
        <meshPhysicalMaterial color="#e6eef5" roughness={0.05} transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} position={[(screenX - 2.6) / 2 + 0.2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, screenX + 2.8, 48, 1, true]} />
        <meshBasicMaterial color={GAS_GLOW[gas]} transparent opacity={0.04} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh position={[-2.4, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.32, 0.32, 0.08, 32]} />
        <meshStandardMaterial color="#5c564e" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-1.5, 0, 0]} rotation-y={Math.PI / 2}>
        <ringGeometry args={[0.06, 0.45, 32]} />
        <meshStandardMaterial color="#8d857a" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[X0 + (TUBE.length * SX) / 2, (s * TUBE.gap * SY) / 2 + s * 0.03, 0]}>
          <boxGeometry args={[TUBE.length * SX, 0.04, 0.6]} />
          <meshStandardMaterial color={s > 0 ? '#c0782c' : '#4a5a70'} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {B > 0 && (
        <mesh position={[X0 + (TUBE.length * SX) / 2, 0, 0]}>
          <boxGeometry args={[TUBE.length * SX, TUBE.gap * SY, 0.62]} />
          <meshBasicMaterial color="#8fc3f2" transparent opacity={0.06 + Math.min(0.12, B * 0.08)} depthWrite={false} />
        </mesh>
      )}
      <primitive object={line} />
      <mesh position={[screenX, 0, 0]} rotation-y={-Math.PI / 2}>
        <circleGeometry args={[0.6, 48]} />
        <meshStandardMaterial color="#1d2a22" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {spotY !== null && Math.abs(spotY) < 0.6 && (
        <mesh position={[screenX - 0.01, spotY, 0]}>
          <sphereGeometry args={[0.06, 16, 12]} />
          <meshBasicMaterial color={new THREE.Color('#9ff0c4').multiplyScalar(3)} toneMapped={false} />
        </mesh>
      )}
      <OrbitControls enablePan={false} enableDamping minDistance={3} maxDistance={12} target={[0.8, 0, 0]} />
    </Stage>
  );
}

// ── Geiger–Marsden ────────────────────────────────────────────────────────

const RING_R = 2.6;
const MAX_FLASH = 600;

function GeigerContent() {
  const reduced = useReducedMotion();
  const flashes = useRef<THREE.InstancedMesh>(null);
  const tracks = useRef<THREE.InstancedMesh>(null);
  const beam = useRef<THREE.InstancedMesh>(null);
  const store = useRef({ i: 0, life: new Float32Array(MAX_FLASH), pos: Array.from({ length: MAX_FLASH }, () => new THREE.Vector3()), tlife: new Float32Array(40), tdir: Array.from({ length: 40 }, () => new THREE.Vector3()), ti: 0, carry: 0 });
  const rng = useMemo(() => mulberry32(Date.now() % 100000), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const st = useHistory.getState();
    const S = store.current;
    if (st.running && st.tab === 'geiger') {
      const p: ScatteringParams = { energyMeV: st.energy, thickness: st.thicknessUm * 1e-6, multipleSigma: (0.8 * Math.PI) / 180 };
      const rate = 6000; // partículas α simuladas por segundo
      S.carry += rate * Math.min(dt, 0.05);
      const n = Math.floor(S.carry);
      S.carry -= n;
      const bins = [...st.counts[st.scModel]];
      for (let k = 0; k < n; k++) {
        const th = sampleAngle(st.scModel, p, rng);
        const deg = (th * 180) / Math.PI;
        const b = BINS.findIndex((x, i) => deg >= x && deg < BINS[i + 1]!);
        if (b >= 0) bins[b]! += 1;
        // Visualiza todas las desviaciones > 2° y una muestra de las pequeñas
        if (deg > 2 || rng() < 0.012) {
          const phi = rng() * Math.PI * 2;
          const dir = new THREE.Vector3(Math.cos(th), Math.sin(th) * Math.cos(phi), Math.sin(th) * Math.sin(phi));
          S.pos[S.i]!.copy(dir).multiplyScalar(RING_R);
          S.life[S.i] = 1;
          S.i = (S.i + 1) % MAX_FLASH;
          if (deg > 10) {
            S.tdir[S.ti]!.copy(dir);
            S.tlife[S.ti] = 1;
            S.ti = (S.ti + 1) % 40;
            if (deg > 30) sfx.add('n');
          }
        }
      }
      st.set({ counts: { ...st.counts, [st.scModel]: bins }, totals: { ...st.totals, [st.scModel]: st.totals[st.scModel] + n } });
    }
    const fm = flashes.current;
    if (fm) {
      for (let i = 0; i < MAX_FLASH; i++) {
        S.life[i] = Math.max(0, S.life[i]! - dt * 0.7);
        sc.setScalar(0.02 + 0.05 * S.life[i]!);
        m4.compose(S.pos[i]!, q, sc);
        fm.setMatrixAt(i, m4);
      }
      fm.instanceMatrix.needsUpdate = true;
    }
    const tm = tracks.current;
    if (tm) {
      for (let i = 0; i < 40; i++) {
        S.tlife[i] = Math.max(0, S.tlife[i]! - dt * 0.5);
        const d = S.tdir[i]!;
        const len = RING_R * (S.tlife[i]! > 0 ? 1 : 0);
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.lengthSq() ? d.clone().normalize() : new THREE.Vector3(0, 1, 0));
        m4.compose(d.clone().multiplyScalar(len / 2), q, new THREE.Vector3(S.tlife[i]!, len, S.tlife[i]!));
        tm.setMatrixAt(i, m4);
      }
      tm.instanceMatrix.needsUpdate = true;
    }
    const bm = beam.current;
    if (bm) {
      const t = reduced ? 0 : state.clock.elapsedTime;
      for (let i = 0; i < 30; i++) {
        const x = -4 + ((((i / 30) + t * 0.6) % 1) * 4);
        m4.makeTranslation(x, 0, 0);
        bm.setMatrixAt(i, m4);
      }
      bm.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={2} color="#ffe6c8" />
      <mesh position={[-4.3, 0, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.6} roughness={0.5} />
      </mesh>
      <instancedMesh ref={beam} args={[undefined, undefined, 30]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshBasicMaterial color={new THREE.Color('#ffcf8a').multiplyScalar(2.5)} toneMapped={false} />
      </instancedMesh>
      <mesh rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshStandardMaterial color="#d4a641" metalness={1} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[RING_R + 0.02, RING_R + 0.02, 1.2, 96, 1, true]} />
        <meshBasicMaterial color="#5a8f6a" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <instancedMesh ref={flashes} args={[undefined, undefined, MAX_FLASH]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color={new THREE.Color('#b5ffcf').multiplyScalar(3)} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tracks} args={[undefined, undefined, 40]} frustumCulled={false}>
        <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
        <meshBasicMaterial color={new THREE.Color('#ffcf8a').multiplyScalar(2)} toneMapped={false} transparent opacity={0.8} />
      </instancedMesh>
      <OrbitControls enablePan={false} enableDamping minDistance={3} maxDistance={12} />
    </>
  );
}

function GeigerScene() {
  return (
    <Stage camera={[2.2, 3.2, 6.4]} fov={42}>
      <GeigerContent />
    </Stage>
  );
}

export function HistoryScene() {
  const tab = useHistory((s) => s.tab);
  if (tab === 'tubo') return <TubeScene />;
  if (tab === 'geiger') return <GeigerScene />;
  return <ModelScene />;
}

// ── Interfaz ─────────────────────────────────────────────────────────────

function NuclearView({ energy }: { energy: number }) {
  const W = 340;
  const H = 200;
  const d = closestApproach(energy);
  const bs = [0.12, 0.25, 0.5, 1, 2, 3.5];
  const sc = 26; // px por unidad de d
  const paths = bs.map((b) => {
    const tr = trajectory(b, 1200, -9);
    let dstr = '';
    for (let i = 0; i < tr.length / 2; i += 6) {
      const x = W / 2 + tr[i * 2]! * sc;
      const y = H / 2 - tr[i * 2 + 1]! * sc;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      dstr += `${dstr ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return { b, dstr };
  });
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', background: 'var(--surface-sunken)', borderRadius: 8, border: '1px solid var(--hairline)' }} role="img" aria-label="Trayectorias hiperbólicas de partículas α alrededor de un núcleo de oro">
        {paths.map((p) => (
          <path key={p.b} d={p.dstr} fill="none" stroke="#f2a93b" strokeOpacity={0.35 + 0.6 / (1 + p.b)} strokeWidth="1.4" />
        ))}
        <circle cx={W / 2} cy={H / 2} r={4} fill="#e8775c" />
        <text x={8} y={16} fill="var(--ink-faint)" fontSize="10" fontFamily="var(--font-mono)">
          escala: d = {fmt(d, 3)} fm (choque frontal)
        </text>
      </svg>
      <figcaption className="small faint" style={{ marginTop: 6 }}>
        Vista nuclear: cuanto menor es el parámetro de impacto b, mayor la desviación (tan θ/2 = d/2b). Trayectorias integradas numéricamente.
      </figcaption>
    </figure>
  );
}

function Histogram() {
  const { counts, totals, energy, thicknessUm } = useHistory();
  const d = closestApproach(energy);
  const pred = (a: number, b: number) => {
    const P = (x: number) => (x <= 0 ? 1 : fractionAbove((x * Math.PI) / 180, d, GOLD_NUMBER_DENSITY, thicknessUm * 1e-6));
    return Math.max(0, P(a) - P(b));
  };
  const H = 110;
  const W = 340;
  const bw = W / (BINS.length - 1);
  const logy = (v: number) => (v <= 0 ? 0 : (Math.log10(v + 1) / 6) * H);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Histograma de ángulos de desviación">
        {BINS.slice(0, -1).map((b, i) => {
          const r = counts.rutherford[i]!;
          const t = counts.thomson[i]!;
          return (
            <g key={b}>
              <rect x={i * bw + 4} width={bw / 2 - 5} y={H - logy(t)} height={logy(t)} fill="#a497db" opacity={0.8} />
              <rect x={i * bw + bw / 2} width={bw / 2 - 5} y={H - logy(r)} height={logy(r)} fill="#f2a93b" />
              {i >= 2 && totals.rutherford > 0 && <line x1={i * bw + bw / 2} x2={i * bw + bw - 5} y1={H - logy(pred(BINS[i]!, BINS[i + 1]!) * totals.rutherford)} y2={H - logy(pred(BINS[i]!, BINS[i + 1]!) * totals.rutherford)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 2" />}
              <text x={i * bw + bw / 2} y={H + 13} textAnchor="middle" fill="var(--ink-faint)" fontSize="9" fontFamily="var(--font-mono)">
                {b}–{BINS[i + 1]}°
              </text>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--hairline-strong)" />
      </svg>
      <figcaption className="row row--wrap small" style={{ gap: 12 }}>
        <span className="muted">
          <span style={{ color: '#a497db' }}>■</span> Thomson
        </span>
        <span className="muted">
          <span style={{ color: 'var(--accent)' }}>■</span> núcleo
        </span>
        <span className="muted">┄ fórmula de Rutherford</span>
        <span className="faint">escala logarítmica</span>
      </figcaption>
    </figure>
  );
}

function ModelsPanel() {
  const { model, set, collapse, collapsed, bohrLevel } = useHistory();
  const info = MODELS.find((m) => m.id === model)!;
  return (
    <>
      <section className="section">
        <span className="eyebrow">Línea temporal</span>
        <ol className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {MODELS.map((m) => (
            <li key={m.id}>
              <button type="button" className="btn btn--ghost btn--block" aria-pressed={m.id === model} onClick={() => set({ model: m.id, collapse: 0, collapsed: false })} style={{ justifyContent: 'flex-start', gap: 12, ...(m.id === model ? { background: 'var(--accent-quiet)', borderColor: 'var(--accent-line)', color: 'var(--ink)' } : {}) }}>
                <span className="mono" style={{ width: 56, textAlign: 'left', color: 'var(--accent)' }}>
                  {m.year}
                </span>
                <span style={{ textAlign: 'left' }}>
                  {m.title} <span className="faint small">· {m.who}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <section className="section enter" key={model}>
        <h2 className="h2" style={{ fontSize: '1.75rem' }}>
          {info.title}
        </h2>
        <p className="small">{info.idea}</p>
        <p className="small muted">
          <b style={{ color: 'var(--ok)', fontWeight: 600 }}>Explica: </b>
          {info.evidence}
        </p>
        {info.limit !== '—' && (
          <p className="small muted">
            <b style={{ color: 'var(--bad)', fontWeight: 600 }}>Limitación: </b>
            {info.limit}
          </p>
        )}
        {model === 'rutherford' && (
          <div className="stack-8">
            <button type="button" className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }} disabled={!!collapse && !collapsed} onClick={() => set({ collapse: performance.now(), collapsed: false })}>
              Aplicar la física clásica
            </button>
            {collapse > 0 && (
              <Feedback tone={collapsed ? 'bad' : 'warn'}>
                {collapsed ? `Colapso: según Maxwell, el electrón radia energía y cae al núcleo en ${fmt(classicalCollapseTime(), 2)} s, emitiendo un espectro continuo. La materia no sería estable.` : 'El electrón acelerado radia y pierde energía…'}
              </Feedback>
            )}
            <EpiTag kind="calculo">Ritmo de la espiral: ley clásica r³ = r₀³(1 − t/τ); tiempo ralentizado unos 10¹¹ veces</EpiTag>
          </div>
        )}
        {model === 'bohr' && (
          <div className="stack-8">
            <span className="small muted">Haz saltar al electrón entre órbitas permitidas:</span>
            <div className="segmented" role="radiogroup" aria-label="Órbita">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={n === bohrLevel} aria-pressed={n === bohrLevel} onClick={() => set({ bohrLevel: n })}>
                  n = {n}
                </button>
              ))}
            </div>
            <p className="small faint">Radios rₙ = n²·r₀ (a escala). Al bajar, el destello tiene el color calculado del fotón (3 → 2: Hα).</p>
          </div>
        )}
        <EpiTag kind={info.epi}>{info.epi === 'historico' ? 'Representación del modelo histórico, no del átomo real' : 'Densidad electrónica 1s calculada'}</EpiTag>
      </section>
    </>
  );
}

function TubePanel() {
  const st = useHistory();
  const res = cathodeBeam(setupFrom(st));
  const y1 = cathodeExitDeflection(setupFrom({ ...st, B: 0 }));
  const E = st.plates / TUBE.gap;
  const vMeasured = st.B > 0 ? E / (st.B / 1000) : null;
  const em = vMeasured ? (2 * y1 * vMeasured * vMeasured) / (E * TUBE.length * TUBE.length) : null;
  return (
    <>
      <section className="section">
        <span className="eyebrow">Tubo de rayos catódicos</span>
        <div className="field">
          <label htmlFor="va">Tensión de aceleración: {st.accel} V</label>
          <input id="va" type="range" min={500} max={5000} step={50} value={st.accel} onChange={(e) => st.set({ accel: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="vp">Tensión entre placas: {st.plates} V</label>
          <input id="vp" type="range" min={0} max={400} step={5} value={st.plates} onChange={(e) => st.set({ plates: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="bf">Campo magnético: {fmt(st.B, 3)} mT</label>
          <input id="bf" type="range" min={0} max={1.2} step={0.002} value={st.B} onChange={(e) => st.set({ B: Number(e.target.value) })} />
        </div>
        <div className="row row--wrap" style={{ gap: 6 }}>
          <button type="button" className="btn btn--sm btn--primary" onClick={() => st.set({ B: Number((res.balanceB * 1000).toFixed(4)) })}>
            Compensar (B = E/v)
          </button>
          <button type="button" className="btn btn--sm" onClick={() => st.set({ B: 0 })}>
            Quitar B
          </button>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Gas del tubo">
          {(['aire', 'neon', 'hidrogeno'] as const).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={st.gas === g} aria-pressed={st.gas === g} onClick={() => st.set({ gas: g })}>
              {g === 'aire' ? 'Aire' : g === 'neon' ? 'Neón' : 'Hidrógeno'}
            </button>
          ))}
        </div>
        <p className="small faint">Cambia el gas: el haz no cambia. Thomson concluyó que los rayos están formados por una partícula común a toda la materia, el electrón.</p>
      </section>
      <section className="section" aria-live="polite">
        <dl className="kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <dt>v = √(2eV/m)</dt>
            <dd>{fmt(res.speed, 3)} m/s</dd>
          </div>
          <div>
            <dt>E = V/d</dt>
            <dd>{fmt(E, 3)} V/m</dd>
          </div>
          <div>
            <dt>desviación en pantalla</dt>
            <dd>{res.hitsPlate ? 'choca con la placa' : `${fmt(res.screenY * 1000, 3)} mm`}</dd>
          </div>
          <div>
            <dt>B para compensar</dt>
            <dd>{fmt(res.balanceB * 1000, 3)} mT</dd>
          </div>
        </dl>
        {res.balanced && em && (
          <Feedback tone="ok">
            Haz recto: la fuerza magnética compensa la eléctrica, así que v = E/B = {fmt(vMeasured!, 3)} m/s. Con la desviación sin campo magnético (y₁ = {fmt(y1 * 1000, 3)} mm en las placas), Thomson obtuvo q/m = 2y₁v²/(EL²) = <b>{fmt(em, 3)} C/kg</b> (valor actual: {fmt(CODATA.e / CODATA.me, 4)} C/kg).
          </Feedback>
        )}
        <EpiTag kind="calculo">Trayectoria integrada con F = q(E + v × B); medida de q/m, ampliación fuera del temario</EpiTag>
      </section>
    </>
  );
}

function GeigerPanel() {
  const st = useHistory();
  const tot = st.totals[st.scModel];
  const bins = st.counts[st.scModel];
  const over10 = bins.slice(3).reduce((a, b) => a + b, 0);
  const over90 = bins.slice(6).reduce((a, b) => a + b, 0);
  return (
    <>
      <section className="section">
        <span className="eyebrow">Experimento de Geiger–Marsden</span>
        <div className="segmented" role="radiogroup" aria-label="Modelo atómico del oro">
          <button type="button" role="radio" aria-checked={st.scModel === 'thomson'} aria-pressed={st.scModel === 'thomson'} onClick={() => st.set({ scModel: 'thomson' })}>
            Átomo de Thomson
          </button>
          <button type="button" role="radio" aria-checked={st.scModel === 'rutherford'} aria-pressed={st.scModel === 'rutherford'} onClick={() => st.set({ scModel: 'rutherford' })}>
            Átomo nuclear
          </button>
        </div>
        <div className="field">
          <label htmlFor="ea">Energía de las partículas α: {fmt(st.energy, 2)} MeV</label>
          <input id="ea" type="range" min={2} max={8} step={0.1} value={st.energy} onChange={(e) => st.set({ energy: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="th">Espesor de la lámina de oro: {fmt(st.thicknessUm, 2)} µm</label>
          <input id="th" type="range" min={0.1} max={2} step={0.05} value={st.thicknessUm} onChange={(e) => st.set({ thicknessUm: Number(e.target.value) })} />
        </div>
        <div className="row row--wrap" style={{ gap: 6 }}>
          <button type="button" className="btn btn--sm" onClick={() => st.set({ running: !st.running })}>
            {st.running ? 'Pausar' : 'Reanudar'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => st.set({ counts: { rutherford: zeroBins(), thomson: zeroBins() }, totals: { rutherford: 0, thomson: 0 } })}>
            <Icon name="reset" size={16} /> Reiniciar recuento
          </button>
        </div>
      </section>
      <section className="section" aria-live="off">
        <dl className="kv" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div>
            <dt>partículas α</dt>
            <dd>{tot.toLocaleString('es-ES')}</dd>
          </div>
          <div>
            <dt>&gt; 10°</dt>
            <dd>{over10.toLocaleString('es-ES')}</dd>
          </div>
          <div>
            <dt>&gt; 90°</dt>
            <dd>{over90.toLocaleString('es-ES')}</dd>
          </div>
        </dl>
        <p className="small muted">
          {st.scModel === 'thomson'
            ? 'Con la carga positiva repartida, las desviaciones se quedan en un grado o dos. Ninguna partícula debería rebotar.'
            : over10 > 0
              ? `Aproximadamente 1 de cada ${Math.round(tot / Math.max(1, over10)).toLocaleString('es-ES')} se desvía más de 10°${over90 ? `, y 1 de cada ${Math.round(tot / over90).toLocaleString('es-ES')} rebota (> 90°)` : ''}. Solo un núcleo diminuto y muy cargado lo explica.`
              : 'Esperando las primeras grandes desviaciones…'}
        </p>
        <Histogram />
      </section>
      <section className="section">
        <NuclearView energy={st.energy} />
        <p className="note">
          <b>Modelo.</b> Dispersión única por el núcleo más cercano (fórmula de Rutherford) más una dispersión múltiple de ángulo pequeño aproximada como gaussiana (σ ≈ 0,8°). El póster indica «1 de cada 10 000 se desvía más de 10°»; con estos datos la fracción depende del espesor y la energía.
        </p>
        <EpiTag kind="calculo">Monte Carlo con la sección eficaz de Rutherford · n(Au) = 5,9·10²⁸ m⁻³</EpiTag>
      </section>
    </>
  );
}

export function HistoryOverlay() {
  const st = useHistory();
  const { query } = useRoute();
  const mobile = useMediaQuery('(max-width: 760px)');
  const [collapsedUi, setCollapsedUi] = useState(false);
  useEffect(() => {
    const t = query.get('tab');
    if (t === 'modelos' || t === 'tubo' || t === 'geiger') st.set({ tab: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.get('tab')]);
  const res = cathodeBeam(setupFrom(st));
  const bR = st.counts.rutherford;
  const bT = st.counts.thomson;
  const signal = useMemo(
    () => ({ history: { tab: st.tab, model: st.model, alphasR: Math.floor(st.totals.rutherford / 500) * 500, alphasT: Math.floor(st.totals.thomson / 500) * 500, largeR: bR.slice(3).reduce((a, b) => a + b, 0), largeT: bT.slice(3).reduce((a, b) => a + b, 0), balanced: res.balanced, collapsed: st.collapsed } }),
    [st.tab, st.model, Math.floor(st.totals.rutherford / 500), Math.floor(st.totals.thomson / 500), bR[3], bR[4], bR[5], bR[6], res.balanced, st.collapsed], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const TABS: { id: Tab; label: string }[] = [
    { id: 'modelos', label: 'Modelos' },
    { id: 'tubo', label: 'Tubo de Thomson' },
    { id: 'geiger', label: 'Lámina de oro' },
  ];
  const info = MODELS.find((m) => m.id === st.model)!;
  return (
    <div className="workspace">
      <div style={{ position: 'relative' }}>
        {st.tab === 'modelos' && (
          <div className="desktop-only" style={{ position: 'absolute', left: 'var(--gutter)', top: 8 }}>
            <span className="eyebrow eyebrow--accent">{info.year}</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '3.25rem', lineHeight: 1, marginTop: 6 }}>{info.title}</p>
            <p className="small muted" style={{ marginTop: 6 }}>
              {info.who}
            </p>
          </div>
        )}
        {st.tab === 'geiger' && (
          <div className="stage-caption desktop-only">
            <EpiTag kind="esquema">Fuente, lámina y pantalla fuera de escala; cada destello es una partícula α simulada</EpiTag>
          </div>
        )}
      </div>
      <aside className={`side interactive enter${mobile && collapsedUi ? ' side--collapsed' : ''}`} aria-label="Time Machine">
        <button type="button" className="side__toggle" onClick={() => setCollapsedUi((c) => !c)} aria-expanded={!collapsedUi}>
          <span className="h3">Time Machine · {TABS.find((t) => t.id === st.tab)!.label}</span>
          <Icon name={collapsedUi ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <div className="segmented" role="tablist" style={{ alignSelf: 'stretch' }}>
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={st.tab === t.id} style={{ flex: 1, padding: '7px 6px' }} onClick={() => st.set({ tab: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
          <MissionPanel lab="historia" signal={signal} />
          {st.tab === 'modelos' && <ModelsPanel />}
          {st.tab === 'tubo' && <TubePanel />}
          {st.tab === 'geiger' && <GeigerPanel />}
        </div>
      </aside>
    </div>
  );
}
