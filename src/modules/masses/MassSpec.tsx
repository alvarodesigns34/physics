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
  const ACC_LEN = 2.2;
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
        const a = isotopes[d]!.a;
        sfx.detector(1 + d * 0.12);
        counts[a] = (counts[a] ?? 0) + 1;
      }
      st.set({ counts, total: st.total + done.length });
    }
    const mm = mesh.current;
    if (!mm) return;
    ions.current.slice(0, 400).forEach((ion, i) => {
      const r = radii[ion.iso]!;
      // Fase 1 (0–0,35): aceleración en línea recta; fase 2 (0,35–1): semicircunferencia de radio r
      let x: number;
      let y: number;
      if (ion.t < 0.35) {
        x = -ACC_LEN + (ion.t / 0.35) * ACC_LEN;
        y = 0;
      } else {
        const ang = ((ion.t - 0.35) / 0.65) * Math.PI;
        x = r * Math.sin(ang);
        y = r - r * Math.cos(ang);
      }
      m4.makeTranslation(x, 0, -y);
      mm.setMatrixAt(i, m4);
      mm.setColorAt(i, color.set(ISO_COLORS[ion.iso % ISO_COLORS.length]!).multiplyScalar(2.4));
    });
    mm.count = Math.min(400, ions.current.length);
    mm.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
  });
  const anchors = useMemo(() => isotopes.map((iso, i) => ({ id: `iso-${iso.a}`, position: [0.25, 0, -2 * radii[i]!] as [number, number, number], offset: [10, (i - (isotopes.length - 1) / 2) * 16] as [number, number] })), [isotopes, radii.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <LabelProjector anchors={anchors} />
      {/* fuente y aceleración */}
      <mesh position={[-ACC_LEN - 0.4, 0, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.5]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1.6, -0.9].map((x, i) => (
        <mesh key={x} position={[x, 0, 0]} rotation-y={Math.PI / 2}>
          <ringGeometry args={[0.05, 0.32, 32]} />
          <meshStandardMaterial color={i === 0 ? '#c0782c' : '#4a5a70'} metalness={0.7} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* sector magnético: media luna */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, -rMean]}>
        <circleGeometry args={[rMean * 1.35, 96, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#2a3a52" transparent opacity={0.35} roughness={0.5} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.12, -rMean]}>
        <circleGeometry args={[rMean * 1.35, 96, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#2a3a52" transparent opacity={0.18} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* trayectorias */}
      {radii.map((r, i) => (
        <mesh key={i} rotation-x={Math.PI / 2} position={[0, 0, -r]}>
          <torusGeometry args={[r, 0.006, 6, 160, Math.PI]} />
          <meshBasicMaterial color={new THREE.Color(ISO_COLORS[i % ISO_COLORS.length]!).multiplyScalar(1.4)} transparent opacity={0.45} toneMapped={false} />
        </mesh>
      ))}
      {/* detector */}
      <mesh position={[-0.05, 0, -rMean * 2]}>
        <boxGeometry args={[0.08, 0.4, rMean * 0.9 + 0.6]} />
        <meshStandardMaterial color="#1d2a22" roughness={0.7} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, 400]} frustumCulled={false}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

export function MassScene() {
  return (
    <Stage camera={[0.4, 8.5, 1.2]} fov={40}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 8, 4]} intensity={1.8} color="#ffe6c8" />
      <Spectrometer />
      <OrbitControls enablePan={false} enableDamping minDistance={3} maxDistance={16} target={[0, 0, -2.2]} />
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
  const signal = useMemo(() => ({ masas: { z: st.z, ions: Math.floor(st.total / 100) * 100, measured: measured ? Number(measured.toFixed(2)) : null } }), [st.z, Math.floor(st.total / 100), measured ? measured.toFixed(2) : null]); // eslint-disable-line react-hooks/exhaustive-deps
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
