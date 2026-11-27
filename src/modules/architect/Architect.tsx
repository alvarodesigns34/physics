import { requestFrames } from '../../render/demand';
import { Prediction } from '../../ui/Prediction';
import { ChallengesPanel } from './Challenges';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { create } from 'zustand';
import { Stage } from '../../render/Stage';
import { AnchoredLabel, LabelLayer, LabelProjector, type Anchor } from '../../render/labels';
import { MADELUNG_ORDER, formatConfiguration, subshellLabel, unpairedElectrons, valenceElectrons, speciesConfiguration, madelungIndex } from '../../science/configuration';
import { aufbauStep, addToSubshell, boxesFromConfiguration, configurationFromBoxes, diagnoseBoxes, exciteOne, NEXT_BOX, type Boxes, type BoxState } from '../../science/boxes';
import { ELEMENTS, elementByZ, elementBySymbol } from '../../science/elements';
import { ionSymbol, chargeLabel } from '../../science/nucleus';
import { useStore } from '../../state/store';
import { useMediaQuery, useReducedMotion, useRoute } from '../../app/hooks';
import { sfx } from '../../app/sound';
import { MissionPanel } from '../../ui/MissionPanel';
import { EpiTag, Feedback, announce } from '../../ui/common';
import { Icon } from '../../ui/Icon';

interface AState {
  z: number;
  charge: number;
  boxes: Boxes;
  focus: string | null;
  /** Desafío activo: oculta las ayudas que darían la respuesta (objetivo, llenado automático) */
  challenge: string | null;
  set: (p: Partial<Omit<AState, 'set'>>) => void;
}

export const useArchitect = create<AState>((set) => ({ z: 8, charge: 0, boxes: {}, focus: null, challenge: null, set: (p) => set(p) }));

const STATUS_TEXT = {
  vacio: 'Sin electrones',
  incompleto: 'Faltan electrones',
  exceso: 'Sobran electrones',
  prohibido: 'Prohibido (Pauli)',
  excitado: 'Estado excitado',
  fundamental: 'Estado fundamental',
} as const;

function rowsToShow(boxes: Boxes, electrons: number): typeof MADELUNG_ORDER {
  const occupied = Object.entries(boxes)
    .filter(([, a]) => a.some((s) => s !== 0))
    .map(([k]) => madelungIndex({ n: Number(k[0]), l: 'spdf'.indexOf(k[1]!) }));
  const need = speciesConfiguration(1, Math.max(1, electrons)).length; // subniveles que harían falta
  const last = Math.max(4, need + 1, ...occupied.map((i) => i + 2));
  return MADELUNG_ORDER.slice(0, Math.min(MADELUNG_ORDER.length, last));
}

const ROW_H = 0.78;
const BOX = 0.62;
const GAP = 0.1;

function boxX(i: number, k: number) {
  return (i - (k - 1) / 2) * (BOX + GAP);
}

function Arrow({ up, color, x }: { up: boolean; color: THREE.Color; x: number }) {
  // Aparición elástica (spring): la flecha «salta» al entrar el electrón.
  const g = useRef<THREE.Group>(null);
  const s = useRef(0.2);
  const v = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    requestFrames(900);
  }, []);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (reduced) s.current = 1;
    else {
      const k = 180;
      const c = 14;
      v.current += (-(s.current - 1) * k - v.current * c) * Math.min(dt, 0.05);
      s.current += v.current * Math.min(dt, 0.05);
    }
    g.current.scale.setScalar(Math.max(0.01, s.current));
  });
  return (
    <group ref={g} position={[x, 0, 0.13]} rotation={[0, 0, up ? 0 : Math.PI]}>
      <sprite position={[0, 0.02, -0.02]} scale={[0.42, 0.56, 1]}>
        <spriteMaterial map={haloTexture()} color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.32, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.06, 0.13, 14]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function OrbitalBox({ state, x, onClick, bad, hund }: { state: BoxState; x: number; onClick: () => void; bad: boolean; hund: boolean }) {
  const geo = useMemo(() => new RoundedBoxGeometry(BOX, BOX * 0.8, 0.18, 2, 0.05), []);
  // Contorno: sin él, una caja vacía (azul oscuro) se confundía con el fondo de la escena.
  // La caja redondeada no tiene aristas vivas (EdgesGeometry no devolvería ninguna): el contorno se toma
  // de una caja recta de las mismas medidas.
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(BOX * 1.01, BOX * 0.8 * 1.01, 0.18 * 1.01);
    const e = new THREE.EdgesGeometry(box);
    box.dispose();
    return e;
  }, []);
  useEffect(() => () => {
    geo.dispose();
    edges.dispose();
  }, [geo, edges]);
  const [hover, setHover] = useState(false);
  const ice = useMemo(() => new THREE.Color('#bfe0ff').multiplyScalar(2.2), []);
  const red = useMemo(() => new THREE.Color('#ff8a74').multiplyScalar(2.4), []);
  const col = bad ? red : ice;
  return (
    <group position={[x, 0, 0]}>
      <mesh
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        <meshPhysicalMaterial color={bad ? '#9a3a2c' : hund ? '#8a6c2a' : state ? '#2d4f86' : '#1c2c48'} roughness={0.18} metalness={0.05} clearcoat={1} clearcoatRoughness={0.12} transparent opacity={state ? 0.78 : 0.55} envMapIntensity={1.4} emissive={hover ? '#f2a93b' : state ? '#4f86d8' : '#0c1a30'} emissiveIntensity={hover ? 0.2 : state ? 0.35 : 0.2} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial color={bad ? '#ff9c86' : hund ? '#f2c46b' : hover ? '#f2a93b' : '#a9bde0'} transparent opacity={state ? 0.95 : 0.75} toneMapped={false} />
      </lineSegments>
      {state === 1 && <Arrow up color={col} x={0} />}
      {state === 2 && <Arrow up={false} color={col} x={0} />}
      {state === 3 && (
        <>
          <Arrow up color={col} x={-0.11} />
          <Arrow up={false} color={col} x={0.11} />
        </>
      )}
      {state === 4 && (
        <>
          <Arrow up color={red} x={-0.11} />
          <Arrow up color={red} x={0.11} />
        </>
      )}
    </group>
  );
}

function Tower() {
  const { boxes, z, charge, set } = useArchitect();
  const e = Math.max(0, z - charge);
  const rows = rowsToShow(boxes, e);
  const diag = diagnoseBoxes(boxes, z, e);
  const g = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const targetY = -((rows.length - 1) * ROW_H) / 2;
  useFrame((_, dt) => {
    if (g.current) g.current.position.y += (targetY - g.current.position.y) * (reduced ? 1 : Math.min(1, dt * 4));
  });
  const anchors: Anchor[] = useMemo(() => rows.map((s, i) => ({ id: `row-${subshellLabel(s)}`, position: [-2.95, i * ROW_H + targetY, 0] as [number, number, number] })), [rows, targetY]);
  return (
    <>
      <LabelProjector anchors={anchors} />
      <group ref={g}>
        {rows.map((s, i) => {
          const label = subshellLabel(s);
          const k = 2 * s.l + 1;
          const arr = boxes[label] ?? new Array<BoxState>(k).fill(0);
          return (
            <group key={label} position={[0, i * ROW_H, 0]}>
              <Shelf width={k * (BOX + GAP) + 0.12} l={s.l} />
              {arr.map((st, j) => (
                <OrbitalBox
                  key={j}
                  x={boxX(j, k)}
                  state={st}
                  bad={st === 4}
                  hund={diag.hund.includes(label)}
                  onClick={() => {
                    const next = [...arr];
                    next[j] = NEXT_BOX[st];
                    set({ boxes: { ...boxes, [label]: next }, focus: label });
                    const nx = NEXT_BOX[st];
                    if (nx === 0) sfx.remove();
                    else if (nx === 4) sfx.forbidden();
                    else sfx.spin(nx !== 2);
                  }}
                />
              ))}
            </group>
          );
        })}
      </group>
    </>
  );
}

const L_COLOR = ['#d9785a', '#74b8a8', '#8d9db3', '#b892c2']; // s, p, d, f: los colores de bloque de la tabla

/** Repisa metálica bajo cada subnivel, con el canto del color de su bloque (s, p, d, f). */
function Shelf({ width, l }: { width: number; l: number }) {
  return (
    <group position={[0, -BOX * 0.4 - 0.05, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.035, 0.36]} />
        <meshStandardMaterial color="#1b2638" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.181]}>
        <boxGeometry args={[width, 0.035, 0.004]} />
        <meshBasicMaterial color={new THREE.Color(L_COLOR[l]!).multiplyScalar(1.5)} toneMapped={false} />
      </mesh>
    </group>
  );
}

let HALO: THREE.Texture | null = null;
function haloTexture(): THREE.Texture {
  if (HALO) return HALO;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  HALO = new THREE.CanvasTexture(c);
  return HALO;
}

/** Plano de fondo con retícula técnica (la identidad «plano de arquitecto» del laboratorio). */
function Blueprint() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0a1628';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i <= 512; i += 16) {
      g.strokeStyle = i % 128 === 0 ? 'rgba(111,182,255,0.22)' : 'rgba(111,182,255,0.07)';
      g.lineWidth = i % 128 === 0 ? 2 : 1;
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 512);
      g.moveTo(0, i);
      g.lineTo(512, i);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={[0, 0, -2.2]}>
      <planeGeometry args={[34, 34]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export function ArchitectScene() {
  return (
    <Stage mood="arquitecto" camera={[0, 0.6, 9.5]} fov={42}>
      <ambientLight intensity={0.9} />
      {/* Relleno frontal: las caras que mira la cámara quedaban sin luz directa. */}
      <directionalLight position={[-6, 6, 8]} intensity={0.8} color="#dfe8f7" />
      <directionalLight position={[3, 5, 6]} intensity={1.6} color="#ffe6c8" />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#a8c4ea" />
      <Blueprint />
      <Tower />
      <OrbitControls enablePan={false} enableDamping minDistance={5} maxDistance={18} minAzimuthAngle={-0.8} maxAzimuthAngle={0.8} minPolarAngle={0.9} maxPolarAngle={2.2} />
    </Stage>
  );
}

// ── Diagrama de Möller interactivo (también es el editor accesible) ─────

const MOLLER: { label: string; row: number; col: number }[] = [];
for (let n = 1; n <= 7; n++) for (let l = 0; l < Math.min(n, 4); l++) if (!(n === 7 && l > 1) && !(n === 6 && l > 2) && !(n === 5 && l > 3)) MOLLER.push({ label: `${n}${'spdf'[l]}`, row: n - 1, col: l });

function MollerDiagram({ boxes, onAdd, highlight }: { boxes: Boxes; onAdd: (label: string, d: 1 | -1) => void; highlight: string | null }) {
  const W = 300;
  const cell = 52;
  const ox = 26;
  const oy = 22;
  const order = MADELUNG_ORDER.map(subshellLabel).filter((l) => MOLLER.some((m) => m.label === l));
  const pos = (label: string) => {
    const m = MOLLER.find((x) => x.label === label)!;
    return [ox + m.col * cell, oy + m.row * 40] as const;
  };
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} 300`} style={{ width: '100%', display: 'block' }} role="group" aria-label="Diagrama de Möller: toca un subnivel para añadir un electrón; con Mayús lo quitas">
        {/* diagonales de llenado */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
          const pts = order.filter((l) => Number(l[0]) + 'spdf'.indexOf(l[1]!) === k).map(pos);
          if (pts.length === 0) return null;
          const [x1, y1] = pts[pts.length - 1]!;
          const [x2, y2] = pts[0]!;
          return <line key={k} x1={x1 + 14} y1={y1 - 10} x2={x2 - 14} y2={y2 + 12} stroke="var(--hairline-strong)" strokeWidth="1.2" markerEnd="url(#arr)" />;
        })}
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--ink-faint)" />
          </marker>
        </defs>
        {MOLLER.map((m) => {
          const [x, y] = pos(m.label);
          const e = (boxes[m.label] ?? []).reduce<number>((a, s) => a + (s === 0 ? 0 : s === 3 || s === 4 ? 2 : 1), 0);
          const cap = 2 * (2 * 'spdf'.indexOf(m.label[1]!) + 1);
          const full = e === cap;
          const on = highlight === m.label;
          return (
            <g
              key={m.label}
              role="button"
              tabIndex={0}
              aria-label={`${m.label}: ${e} de ${cap} electrones. Intro para añadir, Mayús + Intro para quitar.`}
              style={{ cursor: 'pointer', outline: 'none' }}
              onClick={(ev) => onAdd(m.label, ev.shiftKey ? -1 : 1)}
              onContextMenu={(ev) => {
                ev.preventDefault();
                onAdd(m.label, -1);
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onAdd(m.label, ev.shiftKey ? -1 : 1);
                }
              }}
            >
              <circle cx={x} cy={y} r={16} fill={full ? 'var(--accent)' : e > 0 ? 'rgb(242 169 59 / 0.25)' : 'var(--surface-sunken)'} stroke={on ? 'var(--ink)' : e > 0 ? 'var(--accent-line)' : 'var(--hairline-strong)'} strokeWidth={on ? 2 : 1} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fill={full ? 'var(--accent-ink)' : 'var(--ink)'}>
                {m.label}
              </text>
              {e > 0 && (
                <text x={x + 15} y={y - 11} fontSize="10" fontFamily="var(--font-mono)" fill="var(--accent)">
                  {e}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="small faint">Toca un subnivel para añadir un electrón (Hund); clic derecho o Mayús para quitarlo. Las diagonales marcan el orden de llenado.</figcaption>
    </figure>
  );
}

export function ArchitectOverlay() {
  const st = useArchitect();
  const { query } = useRoute();
  const configOrder = useStore((s) => s.settings.configOrder);
  const mobile = useMediaQuery('(max-width: 760px)');
  const [collapsed, setCollapsed] = useState(false);
  const [pick, setPick] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const z = Number(query.get('z'));
    if (Number.isInteger(z) && z >= 1 && z <= 118) st.set({ z, charge: 0, boxes: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.get('z')]);
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);
  const el = elementByZ(st.z)!;
  const e = Math.max(0, st.z - st.charge);
  const diag = diagnoseBoxes(st.boxes, st.z, e);
  const conf = configurationFromBoxes(st.boxes);
  const target = speciesConfiguration(st.z, e);
  const signal = useMemo(() => ({ architect: { z: st.z, e, status: diag.status, pauli: diag.pauli.length > 0, hund: diag.hund.length > 0 } }), [st.z, e, diag.status, diag.pauli.length, diag.hund.length]);
  const species = st.charge === 0 ? el.symbol : ionSymbol(el.symbol, st.charge);
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  const buildAnimated = () => {
    stop();
    let b: Boxes = {};
    useArchitect.getState().set({ boxes: {} });
    timer.current = window.setInterval(() => {
      const cur = useArchitect.getState();
      if ((Object.values(b).flat().reduce<number>((a, s) => a + (s === 0 ? 0 : s >= 3 ? 2 : 1), 0) as number) >= Math.max(0, cur.z - cur.charge)) return stop();
      const r = aufbauStep(b);
      if (!r) return stop();
      b = r.boxes;
      cur.set({ boxes: b, focus: r.label });
      sfx.add('e');
    }, 110);
  };
  const statusTone = diag.status === 'fundamental' ? 'ok' : diag.status === 'prohibido' ? 'bad' : diag.status === 'excitado' ? 'warn' : 'info';
  useEffect(() => {
    if (diag.status === 'fundamental') announce(`${species}: estado fundamental correcto.`);
  }, [diag.status, species]);
  const rows = rowsToShow(st.boxes, e);
  return (
    <div className="workspace">
      <LabelLayer>
        {rows.map((s) => (
          <AnchoredLabel key={subshellLabel(s)} id={`row-${subshellLabel(s)}`} align="right">
            <span className="scene-label" style={{ fontSize: 14, color: st.focus === subshellLabel(s) ? 'var(--accent)' : 'var(--ink-muted)' }}>
              {subshellLabel(s)}
            </span>
          </AnchoredLabel>
        ))}
      </LabelLayer>
      <div style={{ position: 'relative' }}>
        <div className="desktop-only" style={{ position: 'absolute', left: 'var(--gutter)', top: 8, maxWidth: 420 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', lineHeight: 1 }}>{species}</span>
          <p className="small muted" style={{ marginTop: 6 }}>
            {el.name} · Z = {st.z} · {e} electrones
          </p>
        </div>
        <div className="desktop-only" style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%) rotate(180deg)', writingMode: 'vertical-rl' }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>
            Energía creciente ↑ · orden de Möller
          </span>
        </div>
        <div className="stage-caption desktop-only">
          <EpiTag kind="esquema">Altura: orden de llenado (cualitativo). Cada caja es un orbital; toca para cambiar ↑ → ↓ → ↑↓ → ↑↑</EpiTag>
        </div>
      </div>
      <aside className={`side interactive enter${mobile && collapsed ? ' side--collapsed' : ''}`} aria-label="Electron Architect">
        <button type="button" className="side__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span className="h3">Electron Architect · {species}</span>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <ChallengesPanel />
          <MissionPanel lab="arquitecto" signal={signal} />
          <section className="section">
            <span className="eyebrow">Especie</span>
            <div className="row">
              <input
                className="input"
                list="arch-elements"
                placeholder="Elemento (p. ej. Fe)"
                value={pick}
                onChange={(ev) => setPick(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key !== 'Enter') return;
                  const t = pick.split(' ')[0]!;
                  const found = elementBySymbol(t) ?? ELEMENTS.find((x) => x.name.toLowerCase() === pick.trim().toLowerCase());
                  if (found) {
                    stop();
                    st.set({ z: found.z, charge: 0, boxes: {} });
                    setPick('');
                  }
                }}
                aria-label="Elemento"
              />
              <datalist id="arch-elements">
                {ELEMENTS.map((x) => (
                  <option key={x.z} value={`${x.symbol} — ${x.name}`} />
                ))}
              </datalist>
            </div>
            <div className="segmented" role="radiogroup" aria-label="Carga del ion" style={{ flexWrap: 'wrap' }}>
              {[-3, -2, -1, 0, 1, 2, 3].map((q) => (
                <button key={q} type="button" role="radio" aria-checked={st.charge === q} className="mono" onClick={() => st.set({ charge: q })} disabled={st.z - q < 0}>
                  {q === 0 ? '0' : chargeLabel(q)}
                </button>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="row row--between">
              <span className="h3">{STATUS_TEXT[diag.status]}</span>
              <span className="mono small">
                {diag.electrons}/{e} e⁻
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${Math.min(100, (diag.electrons / Math.max(1, e)) * 100)}%`, background: diag.electrons > e || diag.pauli.length ? 'var(--bad)' : undefined }} />
            </div>
            {diag.status === 'fundamental' && (
              <Feedback tone="ok">
                Correcto: es la configuración del estado fundamental del {species}.{diag.exception ? ` Es una excepción al diagrama de Möller: un electrón s pasa al subnivel d para dejarlo ${el.symbol === 'Cr' || el.symbol === 'Mo' ? 'semilleno (d⁵)' : 'lleno (d¹⁰)'}.` : ''}
              </Feedback>
            )}
            {diag.issues
              .filter((i) => i.rule !== 'recuento' || diag.electrons > e)
              .map((i, k) => (
                <Feedback key={k} tone={i.rule === 'pauli' ? 'bad' : 'warn'}>
                  <b style={{ fontWeight: 600, textTransform: 'capitalize' }}>{i.rule === 'aufbau' ? 'Aufbau' : i.rule}. </b>
                  {i.message}
                </Feedback>
              ))}
            {diag.status === 'incompleto' && diag.issues.length <= 1 && <p className="small muted">Añade electrones con el diagrama de Möller o tocando las cajas.</p>}
            <p className="mono" style={{ fontSize: '0.9375rem', lineHeight: 1.6, wordBreak: 'break-word' }} aria-live="polite">
              {conf.length ? formatConfiguration(conf, { order: configOrder }) : '—'}
            </p>
            {conf.length > 4 && <p className="mono small muted">{formatConfiguration(conf, { abbreviate: true, order: configOrder })}</p>}
            <div className="row row--wrap" style={{ gap: 6 }}>
              <span className="chip">{unpairedElectrons(conf)} desapareados</span>
              {conf.length > 0 && <span className="chip">{valenceElectrons(conf)} en la capa externa</span>}
              {!st.challenge && (
                <Prediction
                  resetKey="arq-hund"
                  question="El nitrógeno tiene 2p³. ¿Cuántos electrones desapareados tiene en su estado fundamental?"
                  options={[
                    { id: '1', label: '1' },
                    { id: '3', label: '3' },
                    { id: '5', label: '5' },
                  ]}
                  correct="3"
                  explanation="Regla de Hund: en los tres orbitales 2p, de igual energía, los electrones se reparten primero uno en cada uno con el mismo espín. Así se repelen menos. 2p³ = ↑ ↑ ↑: tres desapareados."
                  onRun={() => {
                    st.set({ z: 7, charge: 0, boxes: {} });
                    requestAnimationFrame(buildAnimated);
                  }}
                  runLabel="Construir el nitrógeno"
                />
              )}
              {!st.challenge && (
                <span className="chip" style={{ color: tone2(statusTone) }}>
                  objetivo: {formatConfiguration(target, { abbreviate: e > 10 })}
                </span>
              )}
            </div>
          </section>
          {st.challenge ? (
            <p className="small faint" style={{ margin: 0 }}>
              Durante el desafío se ocultan el objetivo y el llenado automático. Construye en las cajas o en el diagrama de Möller.
            </p>
          ) : (
          <section className="section">
            <div className="row row--wrap" style={{ gap: 6 }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  const r = aufbauStep(st.boxes);
                  if (r) {
                    st.set({ boxes: r.boxes, focus: r.label });
                    sfx.add('e');
                  }
                }}
              >
                Siguiente electrón
              </button>
              <button type="button" className="btn btn--sm btn--primary" onClick={buildAnimated}>
                Llenar con Möller
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  stop();
                  st.set({ boxes: boxesFromConfiguration(target), focus: null });
                }}
              >
                Estado fundamental real
              </button>
              <button type="button" className="btn btn--sm" onClick={() => st.set({ boxes: exciteOne(st.boxes) })} disabled={!conf.length}>
                Excitar un electrón
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  stop();
                  st.set({ boxes: {}, focus: null });
                }}
              >
                <Icon name="reset" size={16} /> Vaciar
              </button>
            </div>
          </section>
          )}
          <section className="section">
            <span className="eyebrow">Diagrama de Möller</span>
            <MollerDiagram
              boxes={st.boxes}
              highlight={st.focus}
              onAdd={(label, d) => {
                st.set({ boxes: addToSubshell(st.boxes, label, d), focus: label });
                if (d > 0) sfx.add('e');
                else sfx.remove();
              }}
            />
          </section>
          <p className="note">
            <b>Reglas.</b> Pauli: como máximo dos electrones por orbital, con espines opuestos. Hund: en un subnivel, primero un electrón en cada orbital con espines paralelos. Aufbau: se llenan los subniveles de menor energía (n + l menor; a igualdad, menor n).
          </p>
        </div>
      </aside>
    </div>
  );
}

function tone2(t: string) {
  return t === 'ok' ? 'var(--ok)' : 'var(--ink-muted)';
}
