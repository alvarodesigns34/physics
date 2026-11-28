import { useContinuousRender } from '../../render/demand';
import { ACC_LEN, ARC_ROTATION, arcArgs, arcPosition, ionPosition, MAGNET_SCALE } from './geometry';
import { Prediction } from '../../ui/Prediction';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import { Stage } from '../../render/Stage';
import { AnchoredLabel, LabelLayer, LabelProjector } from '../../render/labels';
import { loadNuclides, naturalIsotopes, type NuclideTable } from '../../science/nucleus';
import { sectorRadius } from '../../science/instruments';
import { averageAtomicMass } from '../../science/massSpec';
import { ELEMENTS, elementByZ } from '../../science/elements';
import { mulberry32, formatNumber } from '../../science/numbers';
import { useMediaQuery, useReducedMotion } from '../../app/hooks';
import { MissionPanel } from '../../ui/MissionPanel';
import { sfx } from '../../app/sound';
import { EpiTag, Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { UNKNOWN_POOL, identifyByMean, checkAbundance } from '../../learning/massInverse';
import { checkAnswer } from '../../learning/checker';

interface Iso {
  a: number;
  mass: number;
  abundance: number;
}

interface MState {
  z: number;
  accel: number;
  B: number;
  counts: Record<number, number>;
  total: number;
  running: boolean;
  isotopes: Iso[];
  /** Problema inverso: la muestra es desconocida (se ocultan nombre, símbolo y valores de tabla) */
  unknown: boolean;
  set: (p: Partial<Omit<MState, 'set'>>) => void;
}

export const useMass = create<MState>((set) => ({ z: 17, accel: 2000, B: 0.3, counts: {}, total: 0, running: true, isotopes: [], unknown: false, set: (p) => set(p) }));

const fmt = (v: number, sig = 4) => formatNumber(v, { sig });
const SCALE = 14; // unidades de escena por metro (radio de la trayectoria)
const ISO_COLORS = ['#f2a93b', '#8fc3f2', '#d9785a', '#9fd3a6', '#b892c2', '#e6c56d', '#7fb0c9', '#e8a0a0', '#c2c2a3', '#a3c2c2'];

/** Isótopos naturales (abundancia > 0) desde la tabla NUBASE. */
function useIsotopes(z: number) {
  const [table, setTable] = useState<NuclideTable | null>(null);
  useEffect(() => {
    let alive = true;
    loadNuclides().then((t) => alive && setTable(t));
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => (table ? naturalIsotopes(table, z).map(([a, m, ab]) => ({ a, mass: m ?? a, abundance: ab })) : []), [table, z]);
}

interface Ion {
  iso: number;
  t: number;
  speed: number;
}

function Spectrometer() {
  const { isotopes, accel, B, running } = useMass();
  const reduced = useReducedMotion();
  const radii = isotopes.map((i) => sectorRadius(i.mass, 1, accel, B) * SCALE);
  const rMean = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 2;
  const ions = useRef<Ion[]>([]);
  // ATOM 6.0 · Al cambiar de muestra, los iones en vuelo pertenecen a la anterior: su índice de isótopo no
  // vale en la nueva lista (de Hg, 7 isótopos, a Cu, 2, rompía la escena con «reading 'a'»). Se vacía el haz.
  useEffect(() => {
    ions.current = [];
    carry.current = 0;
  }, [isotopes]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const carry = useRef(0);
  const rng = useMemo(() => mulberry32(77), []);
  const cum = useMemo(() => {
    const out: number[] = [];
    let s = 0;
    for (const i of isotopes) out.push((s += i.abundance));
    return out.map((v) => v / (s || 1));
  }, [isotopes]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const st = useMass.getState();
    if (!isotopes.length) return;
    if (running) {
      carry.current += Math.min(dt, 0.05) * 90;
      while (carry.current >= 1) {
        carry.current -= 1;
        const u = rng();
        const k = cum.findIndex((c) => u <= c);
        ions.current.push({ iso: Math.max(0, k), t: 0, speed: 1 });
      }
    }
    const done: number[] = [];
    ions.current.forEach((ion) => (ion.t += dt * (reduced ? 3 : 0.9)));
    ions.current = ions.current.filter((ion) => {
      if (ion.t >= 1) {
        done.push(ion.iso);
        return false;
      }
      return true;
    });
    if (done.length) {
      const counts = { ...st.counts };
      for (const d of done) {
        const iso = isotopes[d];
        if (!iso) continue;
        const a = iso.a;
        sfx.detector(1 + d * 0.12);
        counts[a] = (counts[a] ?? 0) + 1;
      }
      st.set({ counts, total: st.total + done.length });
    }
    const mm = mesh.current;
    if (!mm) return;
    ions.current = ions.current.filter((ion) => ion.iso < radii.length);
    ions.current.slice(0, 400).forEach((ion, i) => {
      ionPosition(ion.t, radii[ion.iso]!, tmp);
      m4.makeTranslation(tmp.x, tmp.y, tmp.z);
      mm.setMatrixAt(i, m4);
      mm.setColorAt(i, color.set(ISO_COLORS[ion.iso % ISO_COLORS.length]!).multiplyScalar(2.4));
    });
    mm.count = Math.min(400, ions.current.length);
    mm.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
  });
  const anchors = useMemo(
    () => [
      ...isotopes.map((iso, i) => ({ id: `iso-${iso.a}`, position: [0.25, 0, -2 * radii[i]!] as [number, number, number], offset: [10, (i - (isotopes.length - 1) / 2) * 16] as [number, number] })),
      // Partes del instrumento (la separación automática evita que se pisen con las de los isótopos).
      { id: 'ms-src', position: [-ACC_LEN - 0.4, 0, 0.42] as [number, number, number], offset: [0, 12] as [number, number] },
      { id: 'ms-acc', position: [-1.25, 0, 0.42] as [number, number, number], offset: [0, 12] as [number, number] },
      { id: 'ms-mag', position: [rMean * 0.45, 0, -rMean] as [number, number, number] },
      { id: 'ms-det', position: [-0.05, 0, -rMean * 2 - (rMean * 0.45 + 0.3)] as [number, number, number], offset: [0, -10] as [number, number] },
    ],
    [isotopes, radii.join(','), rMean], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <>
      <LabelProjector anchors={anchors} avoidOverlap />
      <Instrument rMean={rMean} radii={radii} />
      {/* trayectorias */}
      {radii.map((r, i) => (
        // Arco del toro de θ = −π/2 a π/2 (Rz) llevado al plano horizontal (Rx): (r·cosθ, 0, −r + r·senθ),
        // exactamente la trayectoria de los iones, de (0, 0, 0) a (0, 0, −2r) pasando por (r, 0, −r).
        <mesh key={i} rotation={ARC_ROTATION} position={arcPosition(r)}>
          <torusGeometry args={arcArgs(r)} />
          <meshBasicMaterial color={new THREE.Color(ISO_COLORS[i % ISO_COLORS.length]!).multiplyScalar(1.4)} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
      {/* Colector: una copa de Faraday donde aterriza cada isótopo (x = 0, z = −2r) */}
      {radii.map((r, i) => (
        <mesh key={`cup-${i}`} position={[-0.16, 0, -2 * r]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.075, 0.06, 0.16, 20, 1, true]} />
          <meshStandardMaterial color={ISO_COLORS[i % ISO_COLORS.length]} emissive={ISO_COLORS[i % ISO_COLORS.length]} emissiveIntensity={0.55} metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <instancedMesh ref={mesh} args={[undefined, undefined, 400]} frustumCulled={false}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/** Contorno en D (semidisco x ≥ 0 en el plano de los iones) para extruir piezas polares y bobinas. */
function dShape(R: number, hole = 0, edge = 0, holeEdge = 0): THREE.Shape {
  // En coordenadas de la forma, u = x y v = −(z + rMean) tras la rotación; semicírculo en u ≥ edge.
  const sh = new THREE.Shape();
  sh.moveTo(edge, -R);
  sh.lineTo(0, -R);
  sh.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
  sh.lineTo(edge, R);
  sh.lineTo(edge, -R);
  if (hole > 0) {
    const h = new THREE.Path();
    h.moveTo(holeEdge, -hole);
    h.lineTo(0, -hole);
    h.absarc(0, 0, hole, -Math.PI / 2, Math.PI / 2, false);
    h.lineTo(holeEdge, hole);
    h.lineTo(holeEdge, -hole);
    sh.holes.push(h);
  }
  return sh;
}

/**
 * ATOM 5.2 · El instrumento, reconstruido: cámara de ionización con filamento, electrodos con rendija sobre
 * aisladores cerámicos, tubo de vuelo, electroimán con piezas polares en D y bobinas de cobre, y un
 * colector con una copa de Faraday por isótopo. Las cotas que importan (arcos, imán, aterrizajes) salen
 * de geometry.ts, la misma fuente que verifican las pruebas.
 */
function Instrument({ rMean, radii }: { rMean: number; radii: number[] }) {
  const R = rMean * MAGNET_SCALE;
  const geos = useMemo(() => {
    const pole = new THREE.ExtrudeGeometry(dShape(R), { depth: 0.26, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 72 });
    const coil = new THREE.ExtrudeGeometry(dShape(R + 0.2, R + 0.05, -0.2, 0.04), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 72 });
    return { pole, coil };
  }, [R]);
  useEffect(() => () => {
    geos.pole.dispose();
    geos.coil.dispose();
  }, [geos]);
  const zMin = -2 * Math.max(...radii, rMean) - 0.6;
  const zMax = 0.9;
  const xMin = -ACC_LEN - 1.25;
  const xMax = R + 0.5;
  // Las formas extruidas crecen en +z local; con rotación −π/2 en x quedan horizontales (z local → y).
  const flat: [number, number, number] = [-Math.PI / 2, 0, 0];
  return (
    <group>
      {/* Bancada */}
      <mesh position={[(xMin + xMax) / 2, -0.72, (zMin + zMax) / 2]} receiveShadow>
        <boxGeometry args={[xMax - xMin, 0.12, zMax - zMin]} />
        <meshPhysicalMaterial color="#2b3038" metalness={0.55} roughness={0.42} clearcoat={0.4} clearcoatRoughness={0.3} />
      </mesh>
      {/* Cámara de ionización: cilindro con bridas y filamento incandescente */}
      <group position={[-ACC_LEN - 0.62, 0, 0]}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.7, 40]} />
          <meshPhysicalMaterial color="#b9bec7" metalness={0.9} roughness={0.28} clearcoat={0.6} />
        </mesh>
        {[-0.37, 0.37].map((x) => (
          <mesh key={x} position-x={x} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.33, 0.33, 0.05, 40]} />
            <meshStandardMaterial color="#8e949e" metalness={0.9} roughness={0.32} />
          </mesh>
        ))}
        <mesh position={[0.4, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
          <meshBasicMaterial color={new THREE.Color('#ffb46b').multiplyScalar(2)} toneMapped={false} />
        </mesh>
        {/* entrada de gas */}
        <mesh position={[-0.1, 0.42, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.36, 12]} />
          <meshStandardMaterial color="#c9a46a" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.47, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 0.42, 24]} />
          <meshStandardMaterial color="#e9e5dc" roughness={0.55} />
        </mesh>
      </group>
      {/* Electrodos de aceleración con rendija (+ cobre, − acero) sobre aisladores */}
      {([[-1.6, '#c98a4b'], [-0.9, '#a7b3c4']] as const).map(([x, c]) => (
        <group key={x} position-x={x}>
          {[0.19, -0.19].map((y) => (
            <mesh key={y} position-y={y} castShadow>
              <boxGeometry args={[0.05, 0.3, 0.62]} />
              <meshPhysicalMaterial color={c} metalness={0.95} roughness={0.25} clearcoat={0.4} />
            </mesh>
          ))}
          {[0.24, -0.24].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <boxGeometry args={[0.05, 0.08, 0.14]} />
              <meshPhysicalMaterial color={c} metalness={0.95} roughness={0.25} />
            </mesh>
          ))}
          <mesh position-y={-0.5}>
            <cylinderGeometry args={[0.06, 0.08, 0.36, 16]} />
            <meshStandardMaterial color="#ece8df" roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Tubo de vuelo recto (vidrio) */}
      <mesh position={[-ACC_LEN / 2 - 0.1, 0, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.1, 0.1, ACC_LEN + 0.2, 24, 1, true]} />
        <meshPhysicalMaterial color="#dfe9f2" transparent opacity={0.12} roughness={0.05} metalness={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Electroimán: piezas polares en D arriba (casi transparente, para ver las trayectorias) y abajo, y bobinas */}
      <group position={[0, 0, -rMean]}>
        <mesh geometry={geos.pole} rotation={flat} position-y={-0.48} castShadow receiveShadow>
          <meshPhysicalMaterial color="#30353e" metalness={0.8} roughness={0.38} clearcoat={0.7} clearcoatRoughness={0.25} />
        </mesh>
        <mesh geometry={geos.pole} rotation={flat} position-y={0.18}>
          <meshPhysicalMaterial color="#9aa6b8" metalness={0.3} roughness={0.15} transparent opacity={0.1} depthWrite={false} />
        </mesh>
        <mesh geometry={geos.coil} rotation={flat} position-y={-0.5}>
          <meshPhysicalMaterial color="#b8733a" metalness={1} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} />
        </mesh>
        <mesh geometry={geos.coil} rotation={flat} position-y={0.24}>
          <meshPhysicalMaterial color="#b8733a" metalness={1} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
      {/* Carcasa del colector, paralela a la rendija de entrada */}
      <mesh position={[-0.28, 0, (zMin + 0.6 - 0.25) / 2 - 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.34, Math.abs(zMin + 0.6) + 0.1]} />
        <meshPhysicalMaterial color="#2f3a46" metalness={0.7} roughness={0.35} clearcoat={0.5} />
      </mesh>
    </group>
  );
}

export function MassScene() {
  // El espectrómetro cuenta iones de forma continua mientras está en marcha.
  useContinuousRender(useMass((s) => s.running));
  return (
    <Stage mood="masas" camera={[-1.5, 6.3, 3.4]} fov={40}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 8, 4]} intensity={2} color="#ffe6c8" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -4]} intensity={0.7} color="#a9c7ee" />
      <Spectrometer />
      <OrbitControls enablePan={false} enableDamping minDistance={3} maxDistance={16} target={[0.5, -0.5, -1.5]} />
    </Stage>
  );
}

function SpectrumChart({ isotopes, counts, total }: { isotopes: Iso[]; counts: Record<number, number>; total: number }) {
  const W = 340;
  const H = 130;
  if (!isotopes.length) return null;
  const minA = Math.min(...isotopes.map((i) => i.a)) - 1;
  const maxA = Math.max(...isotopes.map((i) => i.a)) + 1;
  const x = (a: number) => ((a - minA) / (maxA - minA)) * W;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', display: 'block' }} role="img" aria-label={`Espectro de masas: ${isotopes.map((i) => `masa ${i.a}, ${total ? Math.round(((counts[i.a] ?? 0) / total) * 1000) / 10 : 0} %`).join('; ')}`}>
        {isotopes.map((iso, i) => {
          const measured = total ? (counts[iso.a] ?? 0) / total : 0;
          const h = measured * (H - 8);
          return (
            <g key={iso.a}>
              <rect x={x(iso.a) - 5} width={10} y={H - h} height={h} rx={2} fill={ISO_COLORS[i % ISO_COLORS.length]} />
              <line x1={x(iso.a) - 9} x2={x(iso.a) + 9} y1={H - (iso.abundance / 100) * (H - 8)} y2={H - (iso.abundance / 100) * (H - 8)} stroke="var(--ink)" strokeDasharray="2 2" />
              <text x={x(iso.a)} y={H + 13} textAnchor="middle" fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-mono)">
                {iso.a}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--hairline-strong)" />
      </svg>
      <figcaption className="small faint">Barras: abundancia medida. Trazo: abundancia natural de referencia. Eje: masa (u).</figcaption>
    </figure>
  );
}

const CANDIDATES = ELEMENTS.filter((e) => e.z <= 83 && e.hasStandardWeight).map((e) => e.z);

/** Problema inverso: identificar la muestra y deducir abundancias con los datos medidos. */
function InverseProblem({ measured, isotopes }: { measured: number | null; isotopes: Iso[] }) {
  const st = useMass();
  const [guess, setGuess] = useState('');
  const [elMsg, setElMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [abund, setAbund] = useState('');
  const [abMsg, setAbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [frozen, setFrozen] = useState<number | null>(null);
  const start = () => {
    const pool = UNKNOWN_POOL.filter((z) => z !== st.z);
    st.set({ z: pool[Math.floor(Math.random() * pool.length)]!, unknown: true, counts: {}, total: 0, running: true });
    setGuess('');
    setElMsg(null);
    setAbund('');
    setAbMsg(null);
    setFrozen(null);
  };
  if (!st.unknown) {
    return (
      <section className="section">
        <span className="eyebrow eyebrow--accent">Problema inverso</span>
        <p className="small muted" style={{ margin: 0 }}>
          Analiza una muestra desconocida: identifica el elemento con su masa media medida y deduce la abundancia de cada isótopo a partir de los picos.
        </p>
        <button type="button" className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={start}>
          Analizar una muestra desconocida
        </button>
      </section>
    );
  }
  const [light, heavy] = [...isotopes].sort((a, b) => a.mass - b.mass);
  return (
    <section className="section challenge-card">
      <span className="eyebrow eyebrow--accent">Muestra desconocida X</span>
      <p className="small" style={{ margin: 0 }}>
        1. Deja que el detector cuente al menos 2 000 iones ({st.total.toLocaleString('es-ES')} ahora). 2. Con la masa media medida, ¿qué elemento es? 3. ¿Qué porcentaje de la muestra es el isótopo más ligero?
      </p>
      <div className="row" style={{ gap: 6 }}>
        <input className="input" placeholder="símbolo o nombre" value={guess} onChange={(e) => setGuess(e.target.value)} aria-label="Elemento de la muestra" />
        <button
          type="button"
          className="btn btn--sm"
          disabled={!measured || st.total < 2000}
          onClick={() => {
            const r = checkAnswer({ kind: 'element', z: st.z }, guess);
            const id = identifyByMean(measured!);
            setElMsg({ ok: r.correct, text: r.correct ? `Correcto: masa media ${fmt(measured!, 5)} u → ${elementByZ(st.z)!.name}.` : `No. Compara ${fmt(measured!, 4)} u con las masas atómicas de la tabla: el más cercano está a ${fmt(id.delta, 2)} u.` });
          }}
        >
          Comprobar
        </button>
      </div>
      {elMsg && <Feedback tone={elMsg.ok ? 'ok' : 'bad'}>{elMsg.text}</Feedback>}
      {light && heavy && (
        <>
          <div className="row row--wrap" style={{ gap: 6 }}>
            <button type="button" className="btn btn--ghost btn--sm" disabled={!measured} onClick={() => setFrozen(measured)}>
              {frozen ? `Media fijada: ${fmt(frozen, 5)} u` : 'Fijar la media medida'}
            </button>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <input className="input" placeholder={`% de X-${light.a}`} value={abund} onChange={(e) => setAbund(e.target.value)} aria-label={`Abundancia de X-${light.a} en %`} disabled={!frozen} />
            <button
              type="button"
              className="btn btn--sm"
              disabled={!frozen}
              onClick={() => {
                const v = Number(abund.replace(',', '.').replace('%', ''));
                if (!Number.isFinite(v)) return setAbMsg({ ok: false, text: 'Escribe un porcentaje, p. ej. 75,8.' });
                const r = checkAbundance(v, light.mass, heavy.mass, frozen!);
                setAbMsg({ ok: r.ok, text: r.ok ? `Correcto: x = (M − m₂)/(m₁ − m₂) = ${fmt(r.expectedPct, 3)} %. Valor natural tabulado: ${fmt(light.abundance, 4)} %; la diferencia es ruido estadístico de la medida.` : `Plantea M = x·m₁ + (1 − x)·m₂ con m₁ = ${fmt(light.mass, 6)} u, m₂ = ${fmt(heavy.mass, 6)} u y despeja x.` });
              }}
            >
              Comprobar
            </button>
          </div>
          {abMsg && <Feedback tone={abMsg.ok ? 'ok' : 'bad'}>{abMsg.text}</Feedback>}
        </>
      )}
      <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => st.set({ unknown: false })}>
        Terminar y revelar la muestra
      </button>
    </section>
  );
}

/** Predicción: cómo cambia el radio de las trayectorias al duplicar (o reducir a la mitad) el campo B. */
function MassPrediction() {
  const B = useMass((s) => s.B);
  const set = useMass((s) => s.set);
  const [round, setRound] = useState(0);
  // El planteamiento se fija al empezar cada ronda: al comprobar, B cambia y la pregunta no debe cambiar.
  const [base, setBase] = useState(B);
  const up = base <= 0.6;
  return (
    <div className="stack-8">
      <Prediction
        resetKey={`b-${round}`}
        question={`Con B = ${fmt(base, 3)} T, ¿qué le pasa al radio de las trayectorias si ${up ? 'DUPLICAS' : 'REDUCES A LA MITAD'} el campo magnético?`}
        options={[
          { id: 'x2', label: 'Se duplica' },
          { id: 'half', label: 'Se reduce a la mitad' },
          { id: 'quarter', label: 'Se divide entre 4' },
          { id: 'same', label: 'No cambia' },
        ]}
        correct={up ? 'half' : 'x2'}
        explanation={`r = √(2mV/q) / B: el radio es inversamente proporcional a B. ${up ? 'Con el doble de campo, la fuerza magnética curva más la trayectoria: radio a la mitad.' : 'Con la mitad de campo, la trayectoria se curva menos: radio doble.'} Los isótopos siguen separados en la misma proporción, √(m₂/m₁).`}
        onRun={() => set({ B: Math.round((up ? base * 2 : base / 2) * 100) / 100 })}
        runLabel={up ? 'Duplicar B y comprobar' : 'Reducir B a la mitad y comprobar'}
      />
      <button type="button" className="btn btn--ghost btn--sm" style={{ justifySelf: 'start' }} onClick={() => { setBase(useMass.getState().B); setRound((r) => r + 1); }}>
        Otra predicción con el campo actual
      </button>
    </div>
  );
}

export function MassOverlay() {
  const st = useMass();
  // Al salir del laboratorio se abandona el problema inverso (la muestra no queda oculta para siempre).
  useEffect(() => () => useMass.getState().set({ unknown: false }), []);
  const isotopes = useIsotopes(st.z);
  const mobile = useMediaQuery('(max-width: 760px)');
  const [collapsed, setCollapsed] = useState(false);
  const [typo, setTypo] = useState(false);
  useEffect(() => {
    st.set({ isotopes, counts: {}, total: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isotopes]);
  const el = elementByZ(st.z)!;
  const measured = st.total ? isotopes.reduce((a, i) => a + i.mass * (st.counts[i.a] ?? 0), 0) / st.total : null;
  const reference = isotopes.length ? averageAtomicMass(isotopes.map((i) => ({ mass: i.mass, abundance: i.abundance }))).normalizedValue : null;
  const sigma = measured && st.total > 1 ? Math.sqrt(isotopes.reduce((a, i) => a + ((st.counts[i.a] ?? 0) / st.total) * (i.mass - measured) ** 2, 0) / st.total) : null;
  const signal = useMemo(() => ({ masas: { z: st.z, ions: Math.floor(st.total / 100) * 100, measured: measured ? Number(measured.toFixed(2)) : null, unknown: st.unknown } }), [st.z, Math.floor(st.total / 100), measured ? measured.toFixed(2) : null, st.unknown]); // eslint-disable-line react-hooks/exhaustive-deps
  const clTypo = averageAtomicMass([
    { mass: 34.96885, abundance: 74.771 },
    { mass: 36.9659, abundance: 24.229 },
  ]);
  return (
    <div className="workspace">
      <LabelLayer>
        {isotopes.map((iso, i) => (
          <AnchoredLabel key={iso.a} id={`iso-${iso.a}`} align="left">
            <span className="scene-label" style={{ color: ISO_COLORS[i % ISO_COLORS.length] }}>
              {st.unknown ? 'X' : el.symbol}-{iso.a}
            </span>
          </AnchoredLabel>
        ))}
        {[
          ['ms-src', 'Fuente de iones'],
          ['ms-acc', 'Aceleración (V)'],
          ['ms-mag', 'Campo magnético B'],
          ['ms-det', 'Detector'],
        ].map(([id, text]) => (
          <AnchoredLabel key={id} id={id!}>
            <span className="scene-label scene-label--part">{text}</span>
          </AnchoredLabel>
        ))}
      </LabelLayer>
      <div style={{ position: 'relative' }}>
        <div className="desktop-only" style={{ position: 'absolute', left: 'var(--gutter)', top: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.25rem', lineHeight: 1 }}>{st.unknown ? 'Muestra X' : el.name}</span>
          <p className="small muted" style={{ marginTop: 6 }}>
            {isotopes.length} isótopo{isotopes.length === 1 ? '' : 's'} natural{isotopes.length === 1 ? '' : 'es'} · {st.total.toLocaleString('es-ES')} iones detectados
          </p>
        </div>
        <div className="stage-caption desktop-only">
          <EpiTag kind="calculo">Trayectorias con r = √(2mV/q)/B y masas isotópicas reales; los iones más pesados describen arcos mayores</EpiTag>
          <EpiTag kind="esquema">Geometría del instrumento simplificada (sector de 180°)</EpiTag>
        </div>
      </div>
      <aside className={`side interactive enter${mobile && collapsed ? ' side--collapsed' : ''}`} aria-label="Mass Spectrometry Lab">
        <button type="button" className="side__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span className="h3">Espectrómetro · {st.unknown ? 'X' : el.symbol}</span>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <MissionPanel lab="masas" signal={signal} />
          <InverseProblem measured={measured} isotopes={isotopes} />
          {!st.unknown && (
          <section className="section">
            <span className="eyebrow">Muestra</span>
            <select className="input" value={st.z} onChange={(e) => st.set({ z: Number(e.target.value) })} aria-label="Elemento de la muestra">
              {CANDIDATES.map((z) => (
                <option key={z} value={z}>
                  {elementByZ(z)!.symbol} — {elementByZ(z)!.name}
                </option>
              ))}
            </select>
            <div className="row row--wrap" style={{ gap: 6 }}>
              {[17, 12, 5, 29, 35, 47, 50, 80].map((z) => (
                <button key={z} type="button" className="btn btn--sm" onClick={() => st.set({ z })} aria-pressed={st.z === z}>
                  {elementByZ(z)!.symbol}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="msv">Tensión de aceleración: {st.accel} V</label>
              <input id="msv" type="range" min={500} max={5000} step={50} value={st.accel} onChange={(e) => st.set({ accel: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor="msb">Campo magnético: {fmt(st.B, 3)} T</label>
              <input id="msb" type="range" min={0.1} max={1.2} step={0.01} value={st.B} onChange={(e) => st.set({ B: Number(e.target.value) })} />
            </div>
            <div className="row row--wrap" style={{ gap: 6 }}>
              <button type="button" className="btn btn--sm" onClick={() => st.set({ running: !st.running })}>
                {st.running ? 'Pausar' : 'Reanudar'}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => st.set({ counts: {}, total: 0 })}>
                <Icon name="reset" size={16} /> Nueva medida
              </button>
            </div>
            <MassPrediction />
          </section>
          )}
          <section className="section" aria-live="off">
            <span className="eyebrow">Espectro de masas</span>
            <SpectrumChart isotopes={isotopes} counts={st.counts} total={st.total} />
            <dl className="kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <dt>masa media medida</dt>
                <dd>{measured ? `${fmt(measured, 5)} u` : '—'}</dd>
              </div>
              <div>
                <dt>valor de referencia (tabla)</dt>
                <dd>{st.unknown ? 'oculto' : reference ? `${fmt(reference, 5)} u` : '—'}</dd>
              </div>
            </dl>
            {sigma && <p className="small muted">Incertidumbre estadística ≈ ±{fmt(sigma, 2)} u con {st.total.toLocaleString('es-ES')} iones: se reduce como 1/√N. Deja que el detector cuente más para afinar la medida.</p>}
            <table className="small mono" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="faint" style={{ textAlign: 'right' }}>
                  <th style={{ textAlign: 'left', fontWeight: 500 }}>isótopo</th>
                  <th style={{ fontWeight: 500 }}>masa (u)</th>
                  <th style={{ fontWeight: 500 }} title="Abundancia natural tabulada (IUPAC)">natural</th>
                  <th style={{ fontWeight: 500 }} title="Fracción de iones contados por el detector: incluye ruido estadístico">medida</th>
                </tr>
              </thead>
              <tbody>
                {isotopes.map((i, k) => (
                  <tr key={i.a} style={{ textAlign: 'right', borderTop: '1px solid var(--hairline)' }}>
                    <td style={{ textAlign: 'left', color: ISO_COLORS[k % ISO_COLORS.length], padding: '4px 0' }}>
                      {st.unknown ? 'X' : el.symbol}-{i.a}
                    </td>
                    <td>{fmt(i.mass, 7)}</td>
                    <td>{st.unknown ? '?' : `${fmt(i.abundance, 4)} %`}</td>
                    <td>{st.total ? `${fmt(((st.counts[i.a] ?? 0) / st.total) * 100, 3)} %` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isotopes.length === 1 && <Feedback tone="info">El {el.name.toLowerCase()} tiene un único isótopo natural: su masa atómica es la masa de ese isótopo.</Feedback>}
          </section>
          <p className="small faint" style={{ margin: 0 }}>
            «Natural»: abundancia tabulada. «Medida»: iones contados por este detector simulado (fluctúa como 1/√N). La altura de las barras es la fracción medida; el brillo de los haces en la escena es solo ilustrativo.
          </p>
          {st.z === 17 && !st.unknown && (
            <section className="section">
              <span className="eyebrow eyebrow--accent">El ejemplo del cloro (TEO p.5)</span>
              <p className="small muted">
                Los apuntes dan 74,771 % para el Cl-35 y obtienen 35,453 u. Pero 74,771 + 24,229 = 99 %: con esos datos sale otra cosa.
              </p>
              <button type="button" className="btn btn--sm" onClick={() => setTypo((t) => !t)} style={{ alignSelf: 'flex-start' }}>
                {typo ? 'Ocultar' : 'Comprobar'} el cálculo
              </button>
              {typo && (
                <Feedback tone="warn">
                  (34,96885·74,771 + 36,96590·24,229)/100 = <b>{fmt(clTypo.value, 5)} u</b>, no 35,453 u. Con 75,771 % (que sí suma 100 %) sale 35,453 u: es una errata de transcripción. Comprueba siempre que las abundancias sumen 100 %.
                </Feedback>
              )}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
