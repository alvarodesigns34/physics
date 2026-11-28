import { LabPresets, type LabPreset } from '../../ui/LabPresets';
import { CalmOrbitControls } from '../../render/CalmControls';
import { Prediction } from '../../ui/Prediction';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Stage } from '../../render/Stage';
import { Nucleus, nucleusRadius } from '../../render/Nucleus';
import { ElectronCloud } from '../../render/ElectronCloud';
import { useStore } from '../../state/store';
import { useQuality, useReducedMotion, useMediaQuery } from '../../app/hooks';
import { sfx } from '../../app/sound';
import { atomDensity } from '../../science/orbitals';
import { speciesConfiguration, formatConfiguration, unpairedElectrons, valenceElectrons, sameConfiguration, groundState } from '../../science/configuration';
import { mulberry32 } from '../../science/numbers';
import { identify, KIND_LABEL, chargeLabel, loadNuclides, nuclideStatus, knownIsotopes, formatHalfLife, type NuclideTable, type Species } from '../../science/nucleus';
import { ELEMENTS, CATEGORY_LABEL, elementBySymbol, displayWeight } from '../../science/elements';
import { MissionPanel } from '../../ui/MissionPanel';
import { EpiTag, announce } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { RealScale } from './RealScale';
import { NeutralIonCompare, SpeciesCompare } from './Compare';
import { Flights, Pedestal, ProbabilityShell, Reservoirs } from './ForgeChamber';

/** Unidades de escena por radio de Bohr para la nube (la escala del núcleo NO es real). */
const CLOUD_SCALE = 1.15;
const MAX_Z = 118;
const MAX_N = 177;

function useSpecies() {
  const s = useStore((st) => st.forge);
  const set = useStore((st) => st.setForge);
  return [s, set] as const;
}

function useDensity(sp: Species, points: number) {
  return useMemo(() => {
    if (sp.z < 1 || sp.e < 1) return null;
    const conf = speciesConfiguration(sp.z, sp.e);
    return atomDensity(sp.z, conf, points, mulberry32(sp.z * 1000 + sp.e));
  }, [sp.z, sp.e, points]);
}

/** Radio que contiene la fracción q de los puntos (unidades de escena). */
function rq(positions: Float32Array, scale: number, q: number): number {
  const n = positions.length / 3;
  if (n === 0) return 0;
  const r: number[] = [];
  for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 1500))) r.push(Math.hypot(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!));
  r.sort((a, b) => a - b);
  return r[Math.floor(r.length * q)]! * scale;
}

function NucleusScaled({ scale, reduced, children }: { scale: number; reduced: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const cur = g.current.scale.x;
    g.current.scale.setScalar(reduced ? scale : cur + (scale - cur) * Math.min(1, dt * 3));
  });
  return <group ref={g}>{children}</group>;
}

function CameraRig({ radius, reduced }: { radius: number; reduced: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const target = Math.min(90, Math.max(2.6, radius * 6.2));
  useFrame((_, dt) => {
    const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize();
    const cur = camera.position.distanceTo(controls?.target ?? new THREE.Vector3());
    const next = reduced ? target : cur + (target - cur) * Math.min(1, dt * 2.2);
    if (Math.abs(next - cur) > 1e-3) camera.position.copy(dir.multiplyScalar(next).add(controls?.target ?? new THREE.Vector3()));
    if (controls) {
      controls.minDistance = target * 0.35;
      controls.maxDistance = target * 2.2;
    }
  });
  return null;
}

export function ForgeScene() {
  const [sp] = useSpecies();
  const q = useQuality();
  const reduced = useReducedMotion();
  const density = useDensity(sp, q.points);
  const [flash, setFlash] = useState(0);
  const prevZ = useRef(sp.z);
  useEffect(() => {
    if (prevZ.current !== sp.z) {
      setFlash((f) => f + 1);
      prevZ.current = sp.z;
    }
  }, [sp.z]);
  const r50 = density ? rq(density.positions, CLOUD_SCALE, 0.5) : 0;
  const counts = useMemo(() => ({ p: sp.z, n: sp.n, e: sp.e }), [sp.z, sp.n, sp.e]);
  // El núcleo es un esquema: se dibuja como mucho con un 25 % del radio mediano de la nube.
  const nScale = density ? Math.min(1, (0.25 * r50) / nucleusRadius(Math.max(1, sp.z + sp.n))) : 1;
  const radius = density ? Math.max(nucleusRadius(sp.z + sp.n) * nScale * 2, rq(density.positions, CLOUD_SCALE, 0.9)) : nucleusRadius(Math.max(1, sp.z + sp.n)) * 4;
  return (
    <Stage mood="forja" camera={[0, 0.8, 6]} fov={36}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[3, 5, 5]} intensity={2.3} color="#ffe4c4" castShadow />
      <directionalLight position={[-4, -1, -3]} intensity={1.1} color="#9fc2ee" />
      <pointLight position={[0, 0, 0]} intensity={0.6} color="#ffd2a0" distance={4} />
      <NucleusScaled scale={nScale} reduced={reduced}>
        <Nucleus z={sp.z} n={sp.n} reduced={reduced} flash={flash} />
      </NucleusScaled>
      {density && <ElectronCloud density={density} scale={CLOUD_SCALE} size={(q.tier === 'baja' ? 84 : 58) * Math.max(1, Math.sqrt(radius / 2.5))} opacity={(q.tier === 'baja' ? 0.38 : 0.27) * Math.min(1, Math.max(0.5, 1.2 - 0.25 * Math.log10(sp.e)))} animate={!reduced} />}
      {density && <ProbabilityShell r90={rq(density.positions, CLOUD_SCALE, 0.9)} charge={sp.z - sp.e} reduced={reduced} />}
      <Pedestal radius={radius} pulse={flash} reduced={reduced} />
      <Reservoirs radius={radius} reduced={reduced} />
      <Flights radius={radius} counts={counts} reduced={reduced} />
      <CameraRig radius={radius} reduced={reduced} />
      <CalmOrbitControls makeDefault enablePan={false} enableDamping autoRotate={!reduced} autoRotateSpeed={0.35} />
    </Stage>
  );
}

// ── Interfaz ─────────────────────────────────────────────────────────────

function NuclideNotation({ sp }: { sp: Species }) {
  const id = identify(sp);
  const sym = id.element?.symbol ?? '—';
  // Crisol vacío: en lugar de «0 0 —», la plantilla de la notación (ᴬ_Z X) en gris, que ya enseña algo.
  if (!id.element)
    return (
      <div className="row" style={{ alignItems: 'center', gap: 6, color: 'var(--ink-faint)' }} aria-label="Notación nuclear: número másico A arriba, número atómico Z abajo, símbolo X">
        <span className="mono" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.05, fontSize: '1rem' }}>
          <span>A</span>
          <span>Z</span>
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '4.25rem', lineHeight: 0.9 }}>X</span>
      </div>
    );
  return (
    <div className="row" style={{ alignItems: 'center', gap: 6 }} aria-label={`Notación: ${sym}, Z ${sp.z}, A ${id.massNumber}, carga ${id.charge}`}>
      <span className="mono" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.05, fontSize: '1rem' }}>
        <span>{id.massNumber}</span>
        <span className="muted">{sp.z}</span>
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '4.25rem', lineHeight: 0.9, letterSpacing: '-0.01em' }}>{sym}</span>
      <span className="mono" style={{ alignSelf: 'flex-start', fontSize: '1.25rem', color: id.charge === 0 ? 'var(--ink-faint)' : id.charge > 0 ? 'var(--proton)' : 'var(--electron)' }}>
        {id.charge === 0 ? '' : chargeLabel(id.charge)}
      </span>
    </div>
  );
}

type Kind = 'p' | 'n' | 'e';
const KIND_META: Record<Kind, { label: string; color: string; key: string }> = {
  p: { label: 'Protones', color: 'var(--proton)', key: 'P' },
  n: { label: 'Neutrones', color: 'var(--neutron)', key: 'N' },
  e: { label: 'Electrones', color: 'var(--electron)', key: 'E' },
};

function Dispenser({ kind, value, onAdd, onRemove, onDragStart }: { kind: Kind; value: number; onAdd: () => void; onRemove: () => void; onDragStart: (k: Kind, e: RPointerEvent) => void }) {
  const m = KIND_META[kind];
  return (
    <div className="row row--between" style={{ gap: 12 }}>
      <span className="row" style={{ gap: 10 }}>
        <span
          role="presentation"
          title="Arrastra al crisol para añadir"
          onPointerDown={(e) => onDragStart(kind, e)}
          style={{ width: 22, height: 22, borderRadius: 999, background: m.color, boxShadow: `0 0 0 4px rgb(255 255 255 / 0.04), 0 0 18px ${m.color}`, cursor: 'grab', touchAction: 'none' }}
        />
        <span>
          <span style={{ fontWeight: 550 }}>{m.label}</span> <span className="kbd" aria-hidden="true">{m.key}</span>
        </span>
      </span>
      <span className="row" style={{ gap: 4 }}>
        <button type="button" className="btn btn--sm btn--icon" onClick={onRemove} aria-label={`Quitar un ${m.label.toLowerCase().slice(0, -2)}`}>
          <Icon name="minus" size={16} />
        </button>
        <output className="mono" style={{ width: 40, textAlign: 'center', fontSize: '1.125rem' }} aria-label={`${m.label}: ${value}`}>
          {value}
        </output>
        <button type="button" className="btn btn--sm btn--icon" onClick={onAdd} aria-label={`Añadir un ${m.label.toLowerCase().slice(0, -2)}`}>
          <Icon name="plus" size={16} />
        </button>
      </span>
    </div>
  );
}

function NuclearStatus({ sp, table }: { sp: Species; table: NuclideTable | null }) {
  const a = sp.z + sp.n;
  if (sp.z === 0) return <p className="small muted">Sin protones no hay núcleo atómico. Añade al menos un protón.</p>;
  if (!table) return <p className="small faint">Cargando la tabla de nucleidos…</p>;
  const st = nuclideStatus(table, sp.z, a);
  const known = knownIsotopes(table, sp.z);
  if (st.kind === 'estable')
    return (
      <p className="small">
        <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Núcleo estable.</span> <span className="muted">{st.abundance > 0 ? `Abundancia natural: ${st.abundance.toLocaleString('es-ES', { maximumSignificantDigits: 4 })} %.` : 'No aparece en la naturaleza en proporción medible.'}</span>
      </p>
    );
  if (st.kind === 'radiactivo')
    return (
      <p className="small">
        <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Núcleo radiactivo.</span> <span className="muted">Semivida: {formatHalfLife(st.halfLifeS)}.{st.abundance > 0 ? ` Abundancia natural: ${st.abundance.toLocaleString('es-ES', { maximumSignificantDigits: 3 })} %.` : ''}</span>
      </p>
    );
  return (
    <p className="small">
      <span style={{ color: 'var(--bad)', fontWeight: 600 }}>Núcleo no observado.</span>{' '}
      <span className="muted">
        Con {sp.z} protones y {sp.n} neutrones no se conoce ningún núcleo ligado{known.length ? ` (los conocidos van de A = ${known[0]![0]} a A = ${known[known.length - 1]![0]})` : ''}.
      </span>
    </p>
  );
}

function IsotopeLadder({ sp, table, onPick }: { sp: Species; table: NuclideTable | null; onPick: (n: number) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    const box = listRef.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'auto' });
  }, [sp.z, sp.n, table]);
  if (!table || sp.z < 1) return null;
  const list = knownIsotopes(table, sp.z);
  if (!list.length) return null;
  const a = sp.z + sp.n;
  return (
    <div className="stack-8">
      <span className="small muted">Isótopos conocidos del {identify(sp).element!.name.toLowerCase()} · {list.length}</span>
      <div ref={listRef} className="row" style={{ gap: 4, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin', position: 'relative' }} role="list">
        {list.map(([A, , ab, hl]) => {
          const on = A === a;
          return (
            <button
              key={A}
              role="listitem"
              type="button"
              onClick={() => onPick(A - sp.z)}
              aria-pressed={on}
              aria-label={`A = ${A}${hl === -1 ? ', estable' : ', radiactivo'}${ab ? `, abundancia ${ab} %` : ''}`}
              style={{
                flex: 'none',
                width: 34,
                padding: '4px 0',
                borderRadius: 6,
                cursor: 'pointer',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--hairline)'}`,
                background: on ? 'var(--accent-quiet)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span style={{ width: 4, height: 22, display: 'flex', alignItems: 'flex-end', background: 'var(--hairline)', borderRadius: 2 }}>
                <span style={{ width: '100%', height: `${Math.max(ab ? 8 : 0, ab)}%`, background: 'var(--accent)', borderRadius: 2 }} />
              </span>
              <span className="mono" style={{ fontSize: 11, color: hl === -1 ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {A}
              </span>
            </button>
          );
        })}
      </div>
      <span className="small faint">Barra: abundancia natural. Número claro: estable; tenue: radiactivo.</span>
    </div>
  );
}

function ElementPicker({ table, onPick }: { table: NuclideTable | null; onPick: (z: number, n: number) => void }) {
  const [q, setQ] = useState('');
  const pick = () => {
    const t = q.trim().toLowerCase();
    const el = elementBySymbol(t) ?? ELEMENTS.find((e) => e.name.toLowerCase() === t || `${e.symbol} — ${e.name}`.toLowerCase() === t);
    if (!el) return;
    let n = Math.round(el.atomicWeight) - el.z;
    if (table) {
      const nat = knownIsotopes(table, el.z).filter((r) => r[2] > 0).sort((a, b) => b[2] - a[2])[0];
      if (nat) n = nat[0] - el.z;
      else {
        const longest = knownIsotopes(table, el.z).filter((r) => r[3] !== null).sort((a, b) => (b[3] === -1 ? Infinity : b[3]!) - (a[3] === -1 ? Infinity : a[3]!))[0];
        if (longest) n = longest[0] - el.z;
      }
    }
    onPick(el.z, Math.min(MAX_N, Math.max(0, n)));
    setQ('');
  };
  return (
    <div className="field">
      <label htmlFor="forge-pick">Cargar un elemento</label>
      <div className="row">
        <input id="forge-pick" className="input" list="forge-elements" value={q} placeholder="Símbolo o nombre (p. ej. Au)" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && pick()} />
        <button type="button" className="btn" onClick={pick}>
          Cargar
        </button>
      </div>
      <datalist id="forge-elements">
        {ELEMENTS.map((e) => (
          <option key={e.z} value={`${e.symbol} — ${e.name}`} />
        ))}
      </datalist>
      <span className="small faint">Se carga el átomo neutro con su isótopo natural más abundante.</span>
    </div>
  );
}

/**
 * ATOM 6.0 · Especies típicas del temario (composición calculada aquí: N = A − Z, e⁻ = Z − carga). Sin
 * referencias a ejercicios concretos: la ficha muestra Z, N y e⁻, que son la respuesta de esos ejercicios.
 */
const sp6 = (z: number, a: number, q = 0) => ({ z, n: a - z, e: z - q });
const FORGE_PRESETS: (LabPreset & { z: number; n: number; e: number })[] = [
  { id: 'h1', label: '¹H', detail: 'protio: N = 0', ...sp6(1, 1) },
  { id: 'h2', label: '²H', detail: 'deuterio', ...sp6(1, 2) },
  { id: 'c12', label: '¹²C', detail: 'isótopo estable', ...sp6(6, 12) },
  { id: 'c14', label: '¹⁴C', detail: 'radiactivo', ...sp6(6, 14) },
  { id: 'o2', label: '¹⁶O²⁻', detail: 'anión, 10 e⁻', ...sp6(8, 16, -2) },
  { id: 'al3', label: '²⁷Al³⁺', detail: 'catión, 10 e⁻', ...sp6(13, 27, 3) },
  { id: 'cl35', label: '³⁵Cl⁻', detail: 'cloruro', ...sp6(17, 35, -1) },
  { id: 'fe3', label: '⁵⁶Fe³⁺', detail: '23 e⁻', ...sp6(26, 56, 3) },
];

export function ForgeOverlay() {
  const [sp, setSp] = useSpecies();
  const configOrder = useStore((s) => s.settings.configOrder);
  const [table, setTable] = useState<NuclideTable | null>(null);
  const [drag, setDrag] = useState<{ kind: Kind; x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const mobile = useMediaQuery('(max-width: 760px)');
  const sideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    loadNuclides().then((t) => alive && setTable(t));
    return () => {
      alive = false;
    };
  }, []);

  const id = identify(sp);
  const conf = useMemo(() => (sp.z >= 1 && sp.e >= 0 ? speciesConfiguration(sp.z, sp.e) : null), [sp.z, sp.e]);

  const change = useCallback(
    (kind: Kind, delta: number) => {
      const s = useStore.getState().forge;
      const next = { ...s };
      if (kind === 'p') next.z = Math.min(MAX_Z, Math.max(0, s.z + delta));
      if (kind === 'n') next.n = Math.min(MAX_N, Math.max(0, s.n + delta));
      if (kind === 'e') next.e = Math.min(Math.max(next.z + 3, 2), Math.max(0, s.e + delta));
      if (next.z === s.z && next.n === s.n && next.e === s.e) return;
      setSp(next);
      if (kind === 'p' && next.z !== s.z) sfx.transmute();
      else if (delta > 0) sfx.add(kind);
      else sfx.remove();
      const nid = identify(next);
      announce(`${nid.element ? nid.element.name : 'Sin elemento'}: ${next.z} protones, ${next.n} neutrones, ${next.e} electrones. ${KIND_LABEL[nid.kind]}${nid.charge ? `, carga ${chargeLabel(nid.charge)}` : ''}.`);
    },
    [setSp],
  );

  // Teclado: P, N, E añaden; con Mayús, quitan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'n' || k === 'e') {
        e.preventDefault();
        change(k as Kind, e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [change]);

  // Arrastrar una partícula desde el dispensador hasta la escena.
  const onDragStart = (kind: Kind, e: RPointerEvent) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) moved = true;
      if (moved) setDrag({ kind, x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const panel = sideRef.current?.getBoundingClientRect();
      const overPanel = panel && ev.clientX >= panel.left && ev.clientX <= panel.right && ev.clientY >= panel.top && ev.clientY <= panel.bottom;
      if (!moved || !overPanel) change(kind, 1);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const highlyChargedAnion = id.charge <= -2;

  return (
    <div className="workspace">
      <div style={{ position: 'relative' }}>
        <div className="stage-caption desktop-only">
          <EpiTag kind="esquema">Núcleo: nucleones como esferas; escala no real (el núcleo sería unas 10⁵ veces menor que la nube)</EpiTag>
          {conf && conf.length > 0 && <EpiTag kind="calculo">Nube: densidad electrónica aproximada (orbitales hidrogenoides con Z efectiva de Slater)</EpiTag>}
        </div>
        {sp.z === 0 && sp.n === 0 && sp.e === 0 && (
          <div className="fade" style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', textAlign: 'center', maxWidth: 360 }}>
            <p className="h2" style={{ fontSize: '1.75rem' }}>
              El crisol está vacío.
            </p>
            <p className="small muted" style={{ marginTop: 8 }}>
              Añade un protón: el número de protones decide qué elemento estás forjando.
            </p>
          </div>
        )}
        {drag && (
          <div
            aria-hidden="true"
            style={{ position: 'fixed', left: drag.x - 14, top: drag.y - 14, width: 28, height: 28, borderRadius: 999, background: KIND_META[drag.kind].color, boxShadow: `0 0 28px ${KIND_META[drag.kind].color}`, pointerEvents: 'none', zIndex: 30 }}
          />
        )}
      </div>
      <aside ref={sideRef} className={`side interactive enter${mobile && collapsed ? ' side--collapsed' : ''}`} aria-label="Atomic Forge">
        <button type="button" className="side__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span className="row" style={{ gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1 }}>{id.element?.symbol ?? '—'}</span>
            <span className="small muted">
              p {sp.z} · n {sp.n} · e {sp.e}
            </span>
          </span>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <MissionPanel lab="forja" signal={{ species: sp }} />
          <section className="section">
            <span className="eyebrow">Atomic Forge</span>
            <div className="row row--between" style={{ alignItems: 'flex-end' }}>
              <NuclideNotation sp={sp} />
              <div style={{ textAlign: 'right' }} className="stack-8">
                <span className="h3">{id.element?.name ?? 'Sin protones'}</span>
                <span className="small muted">{sp.z ? KIND_LABEL[id.kind] : 'Partículas libres'}</span>
              </div>
            </div>
            {id.element && (
              <span className="small faint">
                {CATEGORY_LABEL[id.element.category]} · periodo {id.element.period}
                {id.element.group ? ` · grupo ${id.element.group}` : ''} · masa atómica {displayWeight(id.element)} u
              </span>
            )}
          </section>

          <LabPresets
            title="Casos típicos"
            presets={FORGE_PRESETS}
            active={FORGE_PRESETS.find((p) => p.z === sp.z && p.n === sp.n && p.e === sp.e)?.id}
            onPick={(pid) => {
              const p = FORGE_PRESETS.find((x) => x.id === pid)!;
              setSp({ z: p.z, n: p.n, e: p.e });
              sfx.transmute();
              const nid = identify({ z: p.z, n: p.n, e: p.e });
              announce(`${p.label}: ${p.z} protones, ${p.n} neutrones, ${p.e} electrones. ${KIND_LABEL[nid.kind]}.`);
            }}
          />
          <section className="section" aria-label="Partículas">
            <Dispenser kind="p" value={sp.z} onAdd={() => change('p', 1)} onRemove={() => change('p', -1)} onDragStart={onDragStart} />
            <Dispenser kind="n" value={sp.n} onAdd={() => change('n', 1)} onRemove={() => change('n', -1)} onDragStart={onDragStart} />
            <Dispenser kind="e" value={sp.e} onAdd={() => change('e', 1)} onRemove={() => change('e', -1)} onDragStart={onDragStart} />
            <span className="small faint">Pulsa ± o arrastra una partícula a la escena. Teclado: P, N, E (con Mayús, quitar).</span>
          </section>

          <section className="section" aria-label="Identidad">
            <dl className="kv" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div>
                <dt>Z</dt>
                <dd>{sp.z}</dd>
              </div>
              <div>
                <dt>A</dt>
                <dd>{id.massNumber}</dd>
              </div>
              <div>
                <dt>N</dt>
                <dd>{sp.n}</dd>
              </div>
              <div>
                <dt>e⁻</dt>
                <dd>{sp.e}</dd>
              </div>
              <div>
                <dt>carga</dt>
                <dd style={{ color: id.charge > 0 ? 'var(--proton)' : id.charge < 0 ? 'var(--electron)' : undefined }}>{id.charge === 0 ? '0' : chargeLabel(id.charge)}</dd>
              </div>
            </dl>
            <NuclearStatus sp={sp} table={table} />
            <Prediction
              resetKey="forja-neutron"
              question="Tienes un carbono-12 (6 p⁺, 6 n⁰, 6 e⁻). Si le añades UN neutrón, ¿qué obtienes?"
              options={[
                { id: 'otro', label: 'Otro elemento' },
                { id: 'isotopo', label: 'Un isótopo del C' },
                { id: 'ion', label: 'Un ion' },
              ]}
              correct="isotopo"
              explanation="El elemento lo decide Z (protones) y la carga, la diferencia entre protones y electrones. Un neutrón no cambia ninguna de las dos: solo A, de 12 a 13. Es el carbono-13, un isótopo estable (1,1 % del carbono natural)."
              onRun={() => setSp({ z: 6, n: 7, e: 6 })}
              runLabel="Forjar el carbono-13"
            />
            {highlyChargedAnion && (
              <p className="note">
                <b>Matiz.</b> Un anión aislado con carga {chargeLabel(id.charge)} no es estable en fase gaseosa: el electrón extra se escapa. Existe en sólidos iónicos y disoluciones, donde el entorno lo estabiliza.
              </p>
            )}
          </section>

          {conf && sp.e > 0 && (
            <section className="section" aria-label="Corteza">
              <span className="eyebrow">Corteza electrónica</span>
              <p className="mono" style={{ fontSize: '0.9375rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {formatConfiguration(conf, { order: configOrder, abbreviate: sp.e > 18 })}
              </p>
              <div className="row row--wrap" style={{ gap: 6 }}>
                <span className="chip">{unpairedElectrons(conf)} e⁻ desapareados</span>
                <span className="chip">{valenceElectrons(conf)} e⁻ en la capa externa</span>
                {id.isoelectronicWith && id.charge !== 0 && (
                  <span className="chip" style={{ color: 'var(--electron)' }} title={sameConfiguration(conf, groundState(id.isoelectronicWith.z)) ? 'Mismo número de electrones y misma configuración' : 'Mismo número de electrones, pero distinta configuración (en los iones de transición se pierden antes los electrones ns)'}>
                    Isoelectrónico con {id.isoelectronicWith.symbol}
                    {!sameConfiguration(conf, groundState(id.isoelectronicWith.z)) && ' · distinta configuración'}
                  </span>
                )}
              </div>
            </section>
          )}

          {sp.z > 0 && <NeutralIonCompare sp={sp} onPick={setSp} />}
          {sp.z > 0 && <SpeciesCompare sp={sp} onPick={setSp} />}
          {sp.z > 0 && <RealScale z={sp.z} a={sp.z + sp.n} />}

          <section className="section">
            <IsotopeLadder sp={sp} table={table} onPick={(n) => setSp({ ...sp, n })} />
            <ElementPicker table={table} onPick={(z, n) => setSp({ z, n, e: z })} />
            <div className="stack-8 mobile-only">
              <EpiTag kind="esquema">Núcleo: esferas; escala no real</EpiTag>
              <EpiTag kind="calculo">Nube: densidad electrónica aproximada (Slater)</EpiTag>
            </div>
          <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSp({ z: 0, n: 0, e: 0 })}>
              <Icon name="reset" size={16} /> Vaciar el crisol
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}
