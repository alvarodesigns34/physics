import { TrendsChart, TrendsPanel } from './Trends';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { create } from 'zustand';
import { Stage } from '../../render/Stage';
import { AnchoredLabel, LabelLayer, LabelProjector, type Anchor } from '../../render/labels';
import { BLOCK_COLOR, CATEGORY_COLOR, RAMP_GRADIENT, rampColor } from '../../render/palette';
import { STATE_LABEL, standardState, isRadioactive } from '../../science/data/elementState';
import { ELEMENTS, CATEGORY_LABEL, elementByZ, familyName, displayWeight, ieKJPerMol, type ElementRecord, type Category } from '../../science/elements';
import { PROPERTIES, compare, commonIon, type PropertyId } from '../../science/trends';
import { groundState, formatConfiguration, valenceElectrons, unpairedElectrons } from '../../science/configuration';
import { outerZeff } from '../../science/slater';
import { ionSymbol } from '../../science/nucleus';
import { formatNumber } from '../../science/numbers';
import { useStore } from '../../state/store';
import { navigate, useMediaQuery, useReducedMotion, useRoute } from '../../app/hooks';
import { MissionPanel } from '../../ui/MissionPanel';
import { EpiTag, Feedback, announce } from '../../ui/common';
import { Icon } from '../../ui/Icon';

type PropSel = PropertyId | 'ninguna';
type ColorMode = 'categoria' | 'bloque' | 'propiedad';
type View = 'tabla' | 'tamanos' | 'tendencias';

interface PState {
  prop: PropSel;
  color: ColorMode;
  selected: number | null;
  hover: number | null;
  compareMode: boolean;
  compared: [number, number] | null;
  view: View;
  set: (p: Partial<Omit<PState, 'set'>>) => void;
}

export const usePeriodic = create<PState>((set) => ({ prop: 'ninguna', color: 'categoria', selected: null, hover: null, compareMode: false, compared: null, view: 'tabla', set: (p) => set(p) }));

const fmt = (v: number, sig = 3) => formatNumber(v, { sig });

/** Posición en la tabla (filas f separadas del cuerpo principal). */
function cellPos(el: ElementRecord): [number, number] {
  const x = (el.layout.col - 9.5) * 1.06;
  const z = (el.layout.row <= 7 ? el.layout.row - 4.2 : el.layout.row - 0.45 - 4.2) * 1.06;
  return [x, z];
}

function propRange(prop: PropertyId): [number, number] {
  const vals = ELEMENTS.map((e) => PROPERTIES[prop].get(e)).filter((v): v is number => v !== null);
  return [Math.min(...vals), Math.max(...vals)];
}

function useTargets(prop: PropSel, color: ColorMode) {
  return useMemo(() => {
    const range = prop === 'ninguna' ? null : propRange(prop);
    const tmp = new THREE.Color();
    return ELEMENTS.map((el) => {
      const v = prop === 'ninguna' ? null : PROPERTIES[prop].get(el);
      const t = range && v !== null ? (v - range[0]) / (range[1] - range[0] || 1) : 0;
      const height = prop === 'ninguna' ? 0.22 : v === null ? 0.05 : 0.12 + 3.6 * t;
      let c: THREE.Color;
      if (color === 'propiedad' && prop !== 'ninguna') c = v === null ? new THREE.Color('#2a2622') : rampColor(t, tmp).clone();
      else if (color === 'bloque') c = new THREE.Color(BLOCK_COLOR[el.block]);
      else c = new THREE.Color(CATEGORY_COLOR[el.category]);
      if (prop !== 'ninguna' && v === null) c.multiplyScalar(0.35);
      return { height, color: c };
    });
  }, [prop, color]);
}

function Blocks() {
  const { prop, color, selected, hover, compared, set } = usePeriodic();
  const reduced = useReducedMotion();
  const targets = useTargets(prop, color);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const heights = useRef(ELEMENTS.map(() => 0.22));
  const colors = useRef(ELEMENTS.map((e) => new THREE.Color(CATEGORY_COLOR[e.category])));
  const geo = useMemo(() => {
    const g = new RoundedBoxGeometry(0.94, 1, 0.94, 3, 0.07);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }), []);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => {
    const mm = mesh.current;
    if (!mm) return;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6);
    ELEMENTS.forEach((el, i) => {
      const tg = targets[i]!;
      heights.current[i]! += (tg.height - heights.current[i]!) * k;
      const lift = el.z === selected || compared?.includes(el.z) ? 0.25 : el.z === hover ? 0.12 : 0;
      const [x, z] = cellPos(el);
      m4.makeScale(1, heights.current[i]! + lift, 1).setPosition(x, 0, z);
      mm.setMatrixAt(i, m4);
      colors.current[i]!.lerp(tg.color, k);
      tmp.copy(colors.current[i]!);
      if (el.z === selected || compared?.includes(el.z)) tmp.lerp(new THREE.Color('#fff4e0'), 0.35);
      else if (el.z === hover) tmp.multiplyScalar(1.25);
      mm.setColorAt(i, tmp);
    });
    mm.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
  });
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id !== undefined) {
      set({ hover: ELEMENTS[id]!.z });
      document.body.style.cursor = 'pointer';
    }
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined) return;
    const z = ELEMENTS[id]!.z;
    const st = usePeriodic.getState();
    if (st.compareMode && st.selected && st.selected !== z) {
      set({ compared: [st.selected, z], compareMode: false });
      announce(`Comparando ${elementByZ(st.selected)!.name} con ${ELEMENTS[id]!.name}`);
    } else {
      set({ selected: z, compared: null });
      announce(`${ELEMENTS[id]!.name}, Z = ${z}`);
    }
  };
  return (
    <instancedMesh
      ref={mesh}
      args={[geo, mat, ELEMENTS.length]}
      onPointerMove={onMove}
      onPointerOut={() => {
        set({ hover: null });
        document.body.style.cursor = '';
      }}
      onClick={onClick}
      castShadow
    />
  );
}

/** Vista de tamaños: átomos neutros (radio covalente) frente a sus iones (radio cristalino de Shannon, NC 6). */
const SIZE_GROUPS = [1, 2, 13, 16, 17];
function sizeCells() {
  const out: { el: ElementRecord; charge: number; rAtom: number; rIon: number; x: number; z: number }[] = [];
  SIZE_GROUPS.forEach((g, gi) => {
    for (let p = 2; p <= 5; p++) {
      const el = ELEMENTS.find((e) => e.group === g && e.period === p)!;
      const ion = commonIon(el);
      const charge = ion.charge ?? (g === 13 ? 3 : 0);
      const rIon = el.ionicRadii.find(([c]) => c === charge)?.[1];
      if (!rIon || !el.covalentRadius) continue;
      out.push({ el, charge, rAtom: Math.round(el.covalentRadius), rIon: Math.round(rIon), x: (gi - 2) * 3.3, z: (p - 3.5) * 2.9 });
    }
  });
  return out;
}

function SizeSpheres() {
  const cells = useMemo(sizeCells, []);
  const k = 1 / 250;
  return (
    <group>
      {cells.map((c) => (
        <group key={c.el.z} position={[c.x, 0, c.z]}>
          <mesh position={[-0.55, c.rAtom * k, 0]} castShadow>
            <sphereGeometry args={[c.rAtom * k, 48, 32]} />
            <meshPhysicalMaterial color="#b9b1a6" roughness={0.35} clearcoat={0.5} />
          </mesh>
          <mesh position={[0.55, c.rIon * k, 0]} castShadow>
            <sphereGeometry args={[c.rIon * k, 48, 32]} />
            <meshPhysicalMaterial color={c.charge > 0 ? '#d9785a' : '#a497db'} roughness={0.3} clearcoat={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function sizeAnchors(): Anchor[] {
  return sizeCells().flatMap((c) => [{ id: `sz-${c.el.z}`, position: [c.x, 0, c.z + 1.25] as [number, number, number] }]);
}

function tableAnchors(): Anchor[] {
  return ELEMENTS.map((el) => {
    const [x, z] = cellPos(el);
    return { id: `pt-${el.z}`, position: [x, 0, z] as [number, number, number] };
  });
}

/** Proyector de etiquetas que sigue la altura animada de cada bloque. */
function TableLabelProjector() {
  const anchors = useMemo(tableAnchors, []);
  const prop = usePeriodic((s) => s.prop);
  const targets = useTargets(prop, 'categoria');
  const live = useRef(ELEMENTS.map(() => 0.22));
  useFrame((_, dt) => {
    ELEMENTS.forEach((_, i) => {
      live.current[i]! += (targets[i]!.height - live.current[i]!) * (1 - Math.exp(-dt * 6));
      anchors[i]!.position![1] = live.current[i]! + 0.02;
    });
  });
  return <LabelProjector anchors={anchors} />;
}

export function PeriodicScene() {
  const view = usePeriodic((s) => s.view);
  const anchors = useMemo(sizeAnchors, []);
  return (
    <Stage camera={view !== 'tamanos' ? [0, 17.5, 15.5] : [0, 17, 10.5]} fov={34} key={view === 'tamanos' ? 'tamanos' : 'tabla'}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 14, 8]} intensity={2.4} color="#ffe6c8" castShadow />
      <directionalLight position={[-8, 6, -6]} intensity={0.9} color="#a8c4ea" />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#100f0e" roughness={0.6} />
      </mesh>
      {view !== 'tamanos' ? (
        <>
          <Blocks />
          <TableLabelProjector />
        </>
      ) : (
        <>
          <SizeSpheres />
          <LabelProjector anchors={anchors} />
        </>
      )}
      <OrbitControls target={[0, 0.4, 0.9]} enablePan={false} enableDamping minDistance={8} maxDistance={34} maxPolarAngle={1.35} />
    </Stage>
  );
}

// ── Interfaz ─────────────────────────────────────────────────────────────

const PROP_OPTIONS: { id: PropSel; label: string }[] = [
  { id: 'ninguna', label: 'Tabla' },
  { id: 'radio', label: 'Radio' },
  { id: 'ei1', label: 'EI₁' },
  { id: 'ae', label: 'AE' },
  { id: 'en', label: 'χ' },
  { id: 'zeff', label: 'Z_ef' },
  { id: 'masa', label: 'Masa' },
];

function ElementLabels() {
  const { selected, compared, prop } = usePeriodic();
  return (
    <LabelLayer>
      {ELEMENTS.map((el) => {
        const on = el.z === selected || compared?.includes(el.z);
        return (
          <AnchoredLabel key={el.z} id={`pt-${el.z}`} align="bottom">
            <span style={{ display: 'block', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.05, color: on ? 'var(--ink)' : 'rgb(236 230 220 / 0.78)', textShadow: '0 1px 6px rgb(0 0 0 / 0.9)', pointerEvents: 'none', fontWeight: on ? 700 : 500 }}>
              {el.symbol}
              {prop !== 'ninguna' && on && (
                <span style={{ display: 'block', fontSize: 10, color: 'var(--accent)' }}>{PROPERTIES[prop].get(el) === null ? 'sin dato' : fmt(PROPERTIES[prop].get(el)!, 3)}</span>
              )}
            </span>
          </AnchoredLabel>
        );
      })}
    </LabelLayer>
  );
}

function SizeLabels() {
  const cells = useMemo(sizeCells, []);
  return (
    <LabelLayer>
      {cells.map((c) => (
        <AnchoredLabel key={c.el.z} id={`sz-${c.el.z}`} align="center">
          <span className="scene-label" style={{ display: 'block', textAlign: 'center', fontSize: 11 }}>
            <span style={{ color: 'var(--ink)' }}>{c.el.symbol}</span> {c.rAtom} pm · <span style={{ color: c.charge > 0 ? 'var(--proton)' : '#b5aaf0' }}>{ionSymbol(c.el.symbol, c.charge)}</span> {c.rIon} pm
          </span>
        </AnchoredLabel>
      ))}
    </LabelLayer>
  );
}

function Legend({ prop, color }: { prop: PropSel; color: ColorMode }) {
  if (color === 'propiedad' && prop !== 'ninguna') {
    const [a, b] = propRange(prop);
    const P = PROPERTIES[prop];
    return (
      <div className="stack-8">
        <div style={{ height: 10, borderRadius: 5, background: RAMP_GRADIENT }} aria-hidden="true" />
        <div className="row row--between mono small faint">
          <span>{fmt(a, 3)}</span>
          <span>{P.unit}</span>
          <span>{fmt(b, 3)}</span>
        </div>
      </div>
    );
  }
  const entries = color === 'bloque' ? (Object.entries(BLOCK_COLOR) as [string, string][]).map(([k, c]) => [`Bloque ${k}`, c]) : (Object.entries(CATEGORY_COLOR) as [Category, string][]).map(([k, c]) => [CATEGORY_LABEL[k], c]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
      {entries.map(([l, c]) => (
        <span key={l} className="row small muted" style={{ gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flex: 'none' }} />
          {l}
        </span>
      ))}
    </div>
  );
}

function ElementCard({ el }: { el: ElementRecord }) {
  const setForge = useStore((s) => s.setForge);
  const conf = groundState(el.z);
  const zef = outerZeff(el.z, conf);
  const ion = commonIon(el);
  const rows: [string, string][] = [
    ['Z', String(el.z)],
    ['Masa atómica', `${displayWeight(el)} u`],
    ['Periodo · grupo', `${el.period} · ${el.group ?? '—'}`],
    ['Bloque', el.block],
    ['Estado a 25 °C', STATE_LABEL[standardState(el.z)]],
    ['Isótopos estables', isRadioactive(el.z) ? 'Ninguno: radiactivo' : el.z === 83 ? 'Bi-209 (casi estable: t½ ≈ 2·10¹⁹ años)' : 'Sí'],
    ['Familia', familyName(el)],
    ['e⁻ de valencia', String(valenceElectrons(conf))],
    ['e⁻ desapareados', String(unpairedElectrons(conf))],
    ['Z_ef (Slater, ' + zef.target + ')', fmt(zef.zeff, 3)],
    ['Radio covalente', el.covalentRadius ? `${el.covalentRadius} pm` : 'sin dato'],
    ['EI₁', el.ie1 ? `${fmt(ieKJPerMol(el.ie1), 4)} kJ/mol (${fmt(el.ie1, 4)} eV)` : 'sin dato'],
    ['EI₂', el.ie2 ? `${fmt(ieKJPerMol(el.ie2), 4)} kJ/mol` : 'sin dato'],
    ['Afinidad electrónica', el.electronAffinity ? `${fmt(ieKJPerMol(el.electronAffinity), 3)} kJ/mol` : el.ie1 ? 'anión no estable (≤ 0)' : 'sin dato'],
    ['Electronegatividad', el.electronegativity ? fmt(el.electronegativity, 3) : 'sin dato'],
  ];
  return (
    <section className="section enter" aria-label={`Ficha del ${el.name}`}>
      <div className="row row--between" style={{ alignItems: 'flex-end' }}>
        <div className="row" style={{ gap: 10, alignItems: 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.75rem', lineHeight: 0.9 }}>{el.symbol}</span>
          <span className="stack-8" style={{ gap: 2 }}>
            <span className="h3">{el.name}</span>
            <span className="small" style={{ color: CATEGORY_COLOR[el.category] }}>
              {CATEGORY_LABEL[el.category]}
            </span>
          </span>
        </div>
        <span className="mono faint">{el.z}</span>
      </div>
      <p className="mono small" style={{ lineHeight: 1.6 }}>
        {formatConfiguration(conf, { abbreviate: el.z > 2 })}
        {el.configPredicted && <span className="faint"> (predicha)</span>}
      </p>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px' }} className="small">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt className="faint">{k}</dt>
            <dd className="mono" style={{ margin: 0, textAlign: 'right' }}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <p className="small muted">
        <b style={{ color: 'var(--ink)', fontWeight: 600 }}>Ion habitual: </b>
        {ion.charge !== null ? `${ionSymbol(el.symbol, ion.charge)}. ` : ''}
        {ion.reason}
      </p>
      <div className="row row--wrap">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setForge({ z: el.z, n: Math.max(0, Math.round(el.atomicWeight) - el.z), e: el.z });
            navigate('/forja');
          }}
        >
          Forjar
        </button>
        <button type="button" className="btn btn--sm" onClick={() => navigate(`/arquitecto?z=${el.z}`)}>
          Ver su configuración
        </button>
        <button type="button" className="btn btn--sm" onClick={() => usePeriodic.getState().set({ compareMode: true })}>
          Comparar con…
        </button>
      </div>
    </section>
  );
}

function ComparisonCard({ a, b, prop }: { a: ElementRecord; b: ElementRecord; prop: PropertyId }) {
  const c = compare(prop, a, b);
  const P = PROPERTIES[prop];
  const va = P.get(a);
  const vb = P.get(b);
  const max = Math.max(va ?? 0, vb ?? 0) || 1;
  return (
    <section className="section enter" aria-label="Comparación">
      <span className="eyebrow eyebrow--accent">Comparación · {P.label}</span>
      {[
        [a, va],
        [b, vb],
      ].map(([el, v]) => (
        <div key={(el as ElementRecord).z} className="stack-8" style={{ gap: 4 }}>
          <div className="row row--between small">
            <span>
              <b style={{ fontWeight: 600 }}>{(el as ElementRecord).symbol}</b> {(el as ElementRecord).name}
            </span>
            <span className="mono">{v === null ? 'sin dato' : `${fmt(v as number, 4)} ${P.unit}`}</span>
          </div>
          <div className="progress" style={{ height: 6 }}>
            <span style={{ width: `${((v as number | null) ?? 0) / max * 100}%` }} />
          </div>
        </div>
      ))}
      <ol className="stack-8 small" style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-muted)' }}>
        {c.reasoning.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
      {c.predicted && c.actual && (
        <Feedback tone={c.predicted === c.actual ? 'ok' : 'warn'}>
          {c.predicted === c.actual ? `Los datos confirman la tendencia: mayor ${P.short} el ${c.actual.name.toLowerCase()}.` : `La tendencia predice el ${c.predicted.name.toLowerCase()}, pero los datos dicen ${c.actual.name.toLowerCase()}. `}
          {c.exception && <span style={{ display: 'block', marginTop: 4 }}>{c.exception}</span>}
        </Feedback>
      )}
      {!c.predicted && c.exception && <Feedback tone="info">{c.exception}</Feedback>}
      <button type="button" className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => usePeriodic.getState().set({ compared: null })}>
        Cerrar comparación
      </button>
    </section>
  );
}

export function PeriodicOverlay() {
  const st = usePeriodic();
  const { query } = useRoute();
  const mobile = useMediaQuery('(max-width: 760px)');
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const v = query.get('tab');
    if (v === 'tamanos' || v === 'tabla' || v === 'tendencias') st.set({ view: v });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.get('tab')]);
  const sel = st.selected ? elementByZ(st.selected)! : null;
  const hov = st.hover ? elementByZ(st.hover)! : null;
  const cmpProp: PropertyId = st.prop === 'ninguna' ? 'radio' : st.prop;
  const signal = useMemo(() => ({ periodic: { prop: st.prop, selected: st.selected, compared: st.compared, view: st.view } }), [st.prop, st.selected, st.compared, st.view]);
  return (
    <div className="workspace">
      {st.view === 'tabla' ? <ElementLabels /> : <SizeLabels />}
      <div style={{ position: 'relative' }}>
        {hov && st.view === 'tabla' && (
          <div className="card desktop-only fade" style={{ position: 'absolute', left: 'var(--gutter)', top: 8, padding: '10px 14px', pointerEvents: 'none', minWidth: 220 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1 }}>{hov.symbol}</span>
              <span className="stack-8" style={{ gap: 0 }}>
                <span className="small" style={{ fontWeight: 600 }}>
                  {hov.name} <span className="faint mono">Z = {hov.z}</span>
                </span>
                <span className="small muted">{st.prop === 'ninguna' ? CATEGORY_LABEL[hov.category] : `${PROPERTIES[st.prop].short}: ${PROPERTIES[st.prop].get(hov) === null ? 'sin dato' : fmt(PROPERTIES[st.prop].get(hov)!, 4) + ' ' + PROPERTIES[st.prop].unit}`}</span>
              </span>
            </div>
          </div>
        )}
        {st.view === 'tendencias' && !mobile && <TrendsChart />}
        <div className="stage-caption desktop-only">
          {st.view !== 'tamanos' ? (
            st.prop === 'ninguna' ? <EpiTag kind="esquema">Disposición de la tabla de TEO p.17 (Lu y Lr en el grupo 3)</EpiTag> : <EpiTag kind="calculo">Altura proporcional a {PROPERTIES[st.prop].label.toLowerCase()} · datos reales</EpiTag>
          ) : (
            <EpiTag kind="calculo">Esferas a escala: radio covalente (gris) frente a radio iónico de Shannon (NC 6). Catión: coral · anión: lavanda</EpiTag>
          )}
        </div>
      </div>
      <aside className={`side interactive enter${mobile && collapsed ? ' side--collapsed' : ''}`} aria-label="Periodic Universe">
        <button type="button" className="side__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span className="h3">Periodic Universe{sel ? ` · ${sel.symbol}` : ''}</span>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <MissionPanel lab="periodico" signal={signal} />
          <div className="segmented" role="tablist" aria-label="Vista" style={{ alignSelf: 'stretch' }}>
            <button type="button" role="tab" aria-selected={st.view === 'tabla'} style={{ flex: 1 }} onClick={() => st.set({ view: 'tabla' })}>
              Tabla 3D
            </button>
            <button type="button" role="tab" aria-selected={st.view === 'tamanos'} style={{ flex: 1 }} onClick={() => st.set({ view: 'tamanos' })}>
              Átomos e iones
            </button>
            <button type="button" role="tab" aria-selected={st.view === 'tendencias'} style={{ flex: 1 }} onClick={() => st.set({ view: 'tendencias' })}>
              Tendencias
            </button>
          </div>
          {st.view === 'tendencias' ? (
            <TrendsPanel showChart={mobile} />
          ) : st.view === 'tabla' ? (
            <>
              <section className="section">
                <span className="eyebrow">Propiedad</span>
                <div className="row row--wrap" style={{ gap: 6 }} role="radiogroup" aria-label="Propiedad representada">
                  {PROP_OPTIONS.map((p) => (
                    <button key={p.id} type="button" role="radio" aria-checked={st.prop === p.id} className="btn btn--sm" style={st.prop === p.id ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined} onClick={() => st.set({ prop: p.id, color: p.id === 'ninguna' ? 'categoria' : st.color === 'categoria' ? 'propiedad' : st.color })}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {st.prop !== 'ninguna' && <p className="small faint">{PROPERTIES[st.prop].note}</p>}
                <div className="segmented" role="radiogroup" aria-label="Color">
                  {(['categoria', 'bloque', 'propiedad'] as ColorMode[]).map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={st.color === c} disabled={c === 'propiedad' && st.prop === 'ninguna'} onClick={() => st.set({ color: c })}>
                      {c === 'categoria' ? 'Categorías' : c === 'bloque' ? 'Bloques' : 'Valor'}
                    </button>
                  ))}
                </div>
                <Legend prop={st.prop} color={st.color} />
              </section>
              {st.compareMode && <Feedback tone="info">Toca otro elemento de la tabla para compararlo con el {sel?.name.toLowerCase()}.</Feedback>}
              {st.compared && <ComparisonCard a={elementByZ(st.compared[0])!} b={elementByZ(st.compared[1])!} prop={cmpProp} />}
              {sel ? <ElementCard el={sel} /> : <p className="small muted">Toca un elemento para ver su ficha. Cambia de propiedad para ver cómo varía a lo largo de periodos y grupos.</p>}
              <div className="mobile-only">
                <EpiTag kind="calculo">Alturas y colores: datos reales</EpiTag>
              </div>
            </>
          ) : (
            <section className="section">
              <span className="eyebrow">Tamaños reales</span>
              <p className="small muted">
                Cada pareja muestra el átomo neutro y su ion habitual con radios reales (pm). Los cationes son más pequeños que su átomo (menos electrones, menos repulsión); los aniones, más grandes: <b style={{ color: 'var(--ink)' }}>r(catión) &lt; r(neutro) &lt; r(anión)</b>.
              </p>
              <p className="small faint">Columnas: grupos 1, 2, 13, 16 y 17. Filas: periodos 2 a 5. Compárala con la figura de TEO p.21.</p>
              <p className="note">
                <b>Matiz.</b> El radio covalente y el iónico se miden de forma distinta (moléculas frente a cristales), así que la comparación es orientativa. La tendencia es la misma con cualquier convenio.
              </p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
