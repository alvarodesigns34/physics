import { useEffect, useMemo, useRef, useState } from 'react';
import { Prediction } from '../../ui/Prediction';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { cachedSurface as cachedSurfaceA, requestSurface as requestSurfaceA, cachedSurfaceB, requestSurfaceB, cachedCloud, requestCloud, cancelCloud } from './surfaceClient';
import type { SurfaceResult } from '../../science/orbitalSurfaces';
import * as THREE from 'three';
import { create } from 'zustand';
import { Stage } from '../../render/Stage';
import { AnchoredLabel, LabelLayer, LabelProjector } from '../../render/labels';
import { radialProbability, radialCutoff, meanRadius, REAL_ORBITAL_NAMES } from '../../science/orbitals';
import { lLetter, validateQuantumSet } from '../../science/quantum';
import { levelEnergyEV } from '../../science/hydrogen';
import { formatNumber } from '../../science/numbers';
import { radius90, CLOUD_M_COLORS, CLOUD_PHASE_POS, CLOUD_PHASE_NEG, type CloudRequest, type CloudResult } from '../../science/orbitalCloud';
import { gaussian, momentumSpread, packetReal, HBAR } from '../../science/uncertainty';
import { parseQuantumTuple } from '../../learning/checker';
import { useQuality, useReducedMotion, useMediaQuery, useRoute } from '../../app/hooks';
import { MissionPanel } from '../../ui/MissionPanel';
import { EpiTag, Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';

type Tab = 'orbitales' | 'incertidumbre';

interface QState {
  n: number;
  l: number;
  m: number;
  slice: boolean;
  bohr: boolean;
  subshell: boolean;
  view: 'nube' | 'superficie';
  /** Fracción de probabilidad encerrada por la superficie */
  fraction: number;
  tab: Tab;
  sigmaNm: number;
  /** Orbital de comparación (se dibuja a la derecha con la MISMA escala) */
  compare: { n: number; l: number; m: number } | null;
  set: (p: Partial<Omit<QState, 'set'>>) => void;
}

/** Estado del cálculo de la superficie (para informar en la interfaz). */
export const useSurfaceInfo = create<{ enclosed: number; res: number; computing: boolean; set: (i: { enclosed: number; res: number; computing: boolean }) => void }>((set) => ({ enclosed: NaN, res: 0, computing: false, set: (i) => set(i) }));

export const useQuantum = create<QState>((set) => ({ n: 2, l: 1, m: 0, slice: false, bohr: false, subshell: false, view: 'superficie', fraction: 0.9, tab: 'orbitales', sigmaNm: 0.1, compare: null, set: (p) => set(p) }));

const fmt = (v: number, sig = 3) => formatNumber(v, { sig });

export function orbitalName(n: number, l: number, m: number): string {
  const sub = REAL_ORBITAL_NAMES[l]?.[m] ?? '';
  return `${n}${lLetter(l)}${sub ? `_${sub}` : ''}`;
}

/** Radio más probable: máximo de P(r) = r²R²(r). */
export function mostProbableRadius(n: number, l: number): number {
  const rmax = radialCutoff(n, 1);
  let best = 0;
  let arg = 0;
  for (let i = 1; i <= 4000; i++) {
    const r = (rmax * i) / 4000;
    const p = radialProbability(n, l, 1, r);
    if (p > best) {
      best = p;
      arg = r;
    }
  }
  return arg;
}

type CloudData = CloudResult;

/**
 * Nube calculada en un Web Worker (P1.2): vista previa de 6 000 puntos inmediata y, después, la nube
 * completa. Solo se pide cuando la vista activa es «nube»; al desmontar se cancela lo pendiente.
 */
function useCloud(n: number, l: number, m: number, subshell: boolean, count: number): CloudData | null {
  const full: CloudRequest = { n, l, m, subshell, count };
  const preview: CloudRequest = { ...full, count: Math.min(6000, count) };
  const [data, setData] = useState<CloudData | null>(() => cachedCloud(full) ?? cachedCloud(preview) ?? null);
  useEffect(() => {
    let alive = true;
    const hit = cachedCloud(full);
    if (hit) {
      setData(hit);
      return;
    }
    requestCloud(preview)
      .then((r) => {
        if (!alive) return;
        if (r) setData(r);
        return requestCloud(full);
      })
      .then((r) => alive && r && setData(r))
      .catch(() => {});
    return () => {
      alive = false;
      cancelCloud();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, l, m, subshell, count]);
  return data;
}

const vertex = /* glsl */ `
  attribute vec3 aTint;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uSlice;
  varying vec3 vTint;
  varying float vKeep;
  void main() {
    vec3 p = position * uScale;
    vTint = aTint;
    vKeep = (uSlice > 0.0 && abs(p.z) > uSlice) ? 0.0 : 1.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Límite bajo: los puntos cercanos a la cámara eran manchas de 14 px que tapaban la estructura.
    gl_PointSize = min(uSize * uPixelRatio / -mv.z, 7.0 * uPixelRatio);
  }
`;
const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vTint;
  varying float vKeep;
  void main() {
    if (vKeep < 0.5) discard;
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    gl_FragColor = vec4(vTint * 1.35, smoothstep(0.25, 0.0, d) * uOpacity);
  }
`;

function OrbitalCloud({ data, scale, slice, reduced, size }: { data: CloudData; scale: number; slice: boolean; reduced: boolean; size: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('aTint', new THREE.BufferAttribute(data.tint, 3));
    return g;
  }, [data]);
  useEffect(() => () => geo.dispose(), [geo]);
  const uniforms = useMemo(() => ({ uSize: { value: size }, uPixelRatio: { value: 1 }, uScale: { value: scale }, uSlice: { value: 0 }, uOpacity: { value: 0 } }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const fade = useRef(0);
  useEffect(() => {
    fade.current = 0;
  }, [data]);
  useFrame((state, dt) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    fade.current = Math.min(1, fade.current + dt * 2);
    u.uOpacity!.value = (slice ? 0.85 : 0.55) * (reduced ? 1 : fade.current);
    u.uScale!.value += (scale - u.uScale!.value) * Math.min(1, dt * 5);
    u.uPixelRatio!.value = state.gl.getPixelRatio();
    u.uSize!.value = size;
    u.uSlice!.value = slice ? 0.09 * 3.2 : 0;
    if (group.current && !reduced && !slice) group.current.rotation.y += dt * 0.08;
    if (group.current && slice) group.current.rotation.y += (0 - group.current.rotation.y) * Math.min(1, dt * 4);
  });
  return (
    <group ref={group}>
      <points geometry={geo} frustumCulled={false}>
        <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function CloudView({ n, l, m, subshell, count, ...rest }: { n: number; l: number; m: number; subshell: boolean; count: number; scale: number; slice: boolean; reduced: boolean; size: number }) {
  const data = useCloud(n, l, m, subshell, count);
  return data ? <OrbitalCloud data={data} {...rest} /> : null;
}

// ── Superficie de contorno (fracción de probabilidad elegible) ───────────

/** Materiales compartidos: uno por color, creados una sola vez (no se reconstruyen al cambiar de orbital). */
const SURFACE_MATERIALS = new Map<string, THREE.MeshPhysicalMaterial>();
/**
 * ATOM 5.1: el barniz y el brillo aterciopelado (sheen) evalúan BRDF adicionales en cada píxel de una
 * superficie que ocupa media pantalla; eran la causa principal de la latencia al cambiar de orbital
 * (regresión de 5.0). Solo se usan en calidad alta.
 */
function surfaceMaterial(color: string, rich: boolean) {
  const key = `${color}|${rich ? 1 : 0}`;
  let m = SURFACE_MATERIALS.get(key);
  if (!m) {
    m = rich
      ? new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.32, roughness: 0.26, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 1.3, sheen: 0.4, sheenColor: new THREE.Color(color), side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.34, roughness: 0.3, metalness: 0, envMapIntensity: 1.4, side: THREE.DoubleSide });
    SURFACE_MATERIALS.set(key, m);
  }
  return m;
}

const PREVIEW_RES = 32;

/**
 * Superficie calculada en un Web Worker. Primero aparece una vista previa rápida (32³) y, cuando los
 * controles dejan de cambiar durante 220 ms, la versión refinada. Las peticiones obsoletas se descartan.
 */
function OrbitalSurface({ n, l, m, subshell, scale, slice, res, p, onInfo, slot = 'a' }: { n: number; l: number; m: number; subshell: boolean; scale: number; slice: boolean; res: number; p: number; onInfo?: (i: { enclosed: number; res: number; computing: boolean }) => void; slot?: 'a' | 'b' }) {
  const requestSurface = slot === 'a' ? requestSurfaceA : requestSurfaceB;
  const cachedSurface = slot === 'a' ? cachedSurfaceA : cachedSurfaceB;
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)], []);
  const group = useRef<THREE.Group>(null);
  const [result, setResult] = useState<SurfaceResult | null>(null);
  useEffect(() => {
    let alive = true;
    const base = { n, l, m, subshell, p };
    const target = subshell ? Math.min(res, 48) : res;
    const cached = cachedSurface({ ...base, res: target });
    if (cached) {
      setResult(cached);
      onInfo?.({ enclosed: cached.enclosed, res: cached.res, computing: false });
      return;
    }
    onInfo?.({ enclosed: NaN, res: PREVIEW_RES, computing: true });
    requestSurface({ ...base, res: PREVIEW_RES }).then((r) => {
      if (alive && r) setResult(r);
    });
    const t = setTimeout(() => {
      requestSurface({ ...base, res: target }).then((r) => {
        if (alive && r) {
          setResult(r);
          onInfo?.({ enclosed: r.enclosed, res: r.res, computing: false });
        }
      });
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, l, m, subshell, res, p]);
  const meshes = useMemo(() => {
    if (!result) return [];
    return result.meshes.map((mesh, k) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
      g.computeBoundingSphere();
      const color = mesh.sign === 0 ? CLOUD_M_COLORS[k % CLOUD_M_COLORS.length]! : mesh.sign === 1 ? CLOUD_PHASE_POS : CLOUD_PHASE_NEG;
      return { g, color, key: `${result.res}-${k}-${mesh.sign}-${mesh.m}` };
    });
  }, [result]);
  useEffect(() => () => meshes.forEach(({ g }) => g.dispose()), [meshes]);
  useEffect(() => {
    for (const mat of SURFACE_MATERIALS.values()) {
      mat.clippingPlanes = slice ? clip : [];
      mat.needsUpdate = true;
    }
  }, [slice, clip]);
  const reduced = useReducedMotion();
  const rich = useQuality().tier === 'alta';
  useEffect(() => {
    for (const mat of SURFACE_MATERIALS.values()) {
      if (mat.clippingPlanes?.length !== (slice ? 1 : 0)) {
        mat.clippingPlanes = slice ? clip : [];
        mat.needsUpdate = true;
      }
    }
  }, [meshes, slice, clip, rich]);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.scale.setScalar(scale * 0.74);
    if (!reduced && !slice) group.current.rotation.z += dt * 0.08;
    if (slice) group.current.rotation.z += (0 - group.current.rotation.z) * Math.min(1, dt * 4);
  });
  return (
    <group ref={group}>
      {meshes.map(({ g, color, key }) => (
        <mesh key={key} geometry={g} material={surfaceMaterial(color, rich)} />
      ))}
    </group>
  );
}

function FractionControl() {
  const fraction = useQuantum((s) => s.fraction);
  const set = useQuantum((s) => s.set);
  const info = useSurfaceInfo();
  const [draft, setDraft] = useState(fraction);
  useEffect(() => setDraft(fraction), [fraction]);
  return (
    <div className="field" style={{ gap: 4 }}>
      <label htmlFor="q-frac" className="row row--between">
        <span>Probabilidad encerrada</span>
        <span className="mono">{Math.round(draft * 100)} %</span>
      </label>
      <input id="q-frac" type="range" min={0.5} max={0.95} step={0.05} value={draft} onChange={(e) => setDraft(Number(e.target.value))} onPointerUp={() => set({ fraction: draft })} onKeyUp={() => set({ fraction: draft })} onBlur={() => set({ fraction: draft })} />
      <span className="small faint" aria-live="polite">
        {info.computing ? 'Calculando la superficie (en segundo plano)…' : Number.isFinite(info.enclosed) ? `Encierra realmente el ${(info.enclosed * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} % (rejilla ${info.res}³). Cuanto mayor la fracción, más grande la superficie.` : ''}
      </span>
    </div>
  );
}

function Axes() {
  const L = 4;
  return (
    <group>
      {[
        [L, 0, 0],
        [0, L, 0],
        [0, 0, L],
      ].map((v, i) => (
        <mesh key={i} position={[v[0]! / 2 - (i === 0 ? L / 2 : 0), v[1]! / 2 - (i === 1 ? L / 2 : 0), v[2]! / 2 - (i === 2 ? L / 2 : 0)]} rotation={i === 0 ? [0, 0, Math.PI / 2] : i === 2 ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, L * 2, 6]} />
          <meshBasicMaterial color="#ece6dc" transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  );
}

const AXIS_ANCHORS = [
  { id: 'ax-x', position: [4.15, 0, 0] as [number, number, number] },
  { id: 'ax-y', position: [0, 0, -4.15] as [number, number, number] },
  { id: 'ax-z', position: [0, 4.15, 0] as [number, number, number] },
];

export function QuantumScene() {
  const { n, l, m, slice, bohr, subshell, view, fraction, compare } = useQuantum();
  const setInfo = useSurfaceInfo((st) => st.set);
  const q = useQuality();
  const reduced = useReducedMotion();
  const res = q.tier === 'alta' ? 72 : q.tier === 'media' ? 56 : 40;
  if (compare) {
    // Comparación: la MISMA escala para los dos (la del mayor), para que los tamaños relativos sean reales.
    const common = 2.0 / Math.max(radius90(n, l), radius90(compare.n, compare.l));
    return (
      <Stage mood="cuantico" camera={slice ? [0, 11, 0.01] : [0, 3.2, 10.5]} fov={40} key={slice ? 'corte-c' : 'libre-c'}>
        <group position={[-2.35, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <OrbitalSurface n={n} l={l} m={m} subshell={false} scale={common} slice={slice} res={Math.min(res, 56)} p={fraction} onInfo={setInfo} />
        </group>
        <group position={[2.35, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <OrbitalSurface n={compare.n} l={compare.l} m={compare.m} subshell={false} scale={common} slice={slice} res={Math.min(res, 56)} p={fraction} slot="b" />
        </group>
        <OrbitControls enablePan={false} enableDamping minDistance={5} maxDistance={20} />
      </Stage>
    );
  }
  // Escala a partir del radio que encierra el 90 % de la probabilidad radial (analítico, sin muestrear).
  const scale = 3.2 / radius90(n, l);
  // Las coordenadas químicas (z hacia arriba) se dibujan con el eje y de la escena hacia arriba.
  return (
    // La nube incluye también el 10 % exterior de la probabilidad (llega a ~2 veces el radio del 90 %): la
    // cámara se aleja un 25 % en esa vista, sin cambiar la escala del mundo, para que nube y superficie
    // sigan siendo comparables.
    <Stage mood="cuantico" camera={slice ? (view === 'nube' ? [0, 11.5, 0.01] : [0, 9, 0.01]) : view === 'nube' ? [6.5, 4.25, 7.75] : [5.2, 3.4, 6.2]} fov={40} key={`${slice ? 'corte' : 'libre'}-${view}`}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {view === 'nube' ? (
          <CloudView n={n} l={l} m={m} subshell={subshell} count={Math.min(60000, Math.round(q.points * 2.2))} scale={scale} slice={slice} reduced={reduced} size={q.tier === 'baja' ? 44 : 30} />
        ) : (
          <OrbitalSurface n={n} l={l} m={m} subshell={subshell} scale={scale} slice={slice} res={res} p={fraction} onInfo={setInfo} />
        )}
        {bohr && (
          <mesh>
            <torusGeometry args={[n * n * scale, 0.012, 8, 160]} />
            <meshBasicMaterial color={new THREE.Color('#ece6dc').multiplyScalar(1.6)} toneMapped={false} />
          </mesh>
        )}
      </group>
      <Axes />
      <mesh>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color={new THREE.Color('#e8775c').multiplyScalar(2)} toneMapped={false} />
      </mesh>
      <LabelProjector anchors={AXIS_ANCHORS} />
      <OrbitControls enablePan={false} enableDamping minDistance={4} maxDistance={16} />
    </Stage>
  );
}

// ── Interfaz ─────────────────────────────────────────────────────────────

const COMPARE_PRESETS: { label: string; a: [number, number, number]; b: [number, number, number]; why: string }[] = [
  { label: '1s ↔ 2s', a: [1, 0, 0], b: [2, 0, 0], why: 'Mismo l, distinto n: el 2s es mayor y tiene un nodo radial.' },
  { label: '2p ↔ 3p', a: [2, 1, 0], b: [3, 1, 0], why: 'Misma forma (l = 1); al subir n crece el tamaño y aparece un nodo radial más.' },
  { label: '2s ↔ 2p', a: [2, 0, 0], b: [2, 1, 0], why: 'Mismo n, distinto l: cambia la forma y el número de nodos angulares.' },
  { label: '3d_z² ↔ 3d_xy', a: [3, 2, 0], b: [3, 2, -2], why: 'Mismo subnivel, distinta orientación (m): misma energía en el átomo de hidrógeno.' },
];

/** Comparar dos orbitales con la misma escala (tamaños relativos reales) y sus P(r) superpuestas. */
function CompareSection() {
  const st = useQuantum();
  const c = st.compare;
  const set = (a: [number, number, number], b: [number, number, number]) => st.set({ n: a[0], l: a[1], m: a[2], subshell: false, view: 'superficie', compare: { n: b[0], l: b[1], m: b[2] } });
  return (
    <section className="section">
      <div className="row row--between">
        <span className="eyebrow">Comparar orbitales</span>
        {c && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => st.set({ compare: null })}>
            Quitar
          </button>
        )}
      </div>
      <div className="row row--wrap" style={{ gap: 6 }}>
        {COMPARE_PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn btn--sm mono" aria-pressed={!!c && st.n === p.a[0] && st.l === p.a[1] && st.m === p.a[2] && c.n === p.b[0] && c.l === p.b[1] && c.m === p.b[2]} onClick={() => set(p.a, p.b)}>
            {p.label}
          </button>
        ))}
      </div>
      {c ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>
            Izquierda: <b>{orbitalName(st.n, st.l, st.m).replace('_', '')}</b> · derecha: <b>{orbitalName(c.n, c.l, c.m).replace('_', '')}</b>. Misma escala: los tamaños relativos son reales.
            {' '}
            {COMPARE_PRESETS.find((p) => st.n === p.a[0] && st.l === p.a[1] && st.m === p.a[2] && c.n === p.b[0] && c.l === p.b[1] && c.m === p.b[2])?.why ?? ''}
          </p>
          <div className="row row--wrap" style={{ gap: 6 }}>
            <span className="small faint">Derecha: n</span>
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" className="btn btn--sm mono" aria-pressed={c.n === v} onClick={() => st.set({ compare: { n: v, l: Math.min(c.l, v - 1), m: Math.max(-Math.min(c.l, v - 1), Math.min(c.m, Math.min(c.l, v - 1))) } })}>
                {v}
              </button>
            ))}
            <span className="small faint">l</span>
            {Array.from({ length: c.n }, (_, v) => v).map((v) => (
              <button key={v} type="button" className="btn btn--sm mono" aria-pressed={c.l === v} onClick={() => st.set({ compare: { ...c, l: v, m: Math.max(-v, Math.min(c.m, v)) } })}>
                {lLetter(v)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="small faint" style={{ margin: 0 }}>
          Elige una pareja para ver los dos orbitales a la vez, con la misma escala y sus distribuciones radiales superpuestas.
        </p>
      )}
    </section>
  );
}

function RadialPlot({ n, l, scaleBohr, other }: { n: number; l: number; scaleBohr: boolean; other?: { n: number; l: number } | null }) {
  const W = 340;
  const H = 120;
  const rmax = Math.max(radialCutoff(n, 1), other ? radialCutoff(other.n, 1) : 0) * 0.75;
  // Curva del orbital de comparación (misma escala de r; cada curva normalizada a su máximo).
  let dOther = '';
  if (other) {
    const po: [number, number][] = [];
    let mo = 0;
    for (let i = 0; i <= 240; i++) {
      const r = (rmax * i) / 240;
      const p = radialProbability(other.n, other.l, 1, r);
      mo = Math.max(mo, p);
      po.push([r, p]);
    }
    dOther = 'M' + po.map(([r, p]) => `${((r / rmax) * W).toFixed(1)},${(H - (p / mo) * (H - 10)).toFixed(1)}`).join(' L');
  }
  const pts: [number, number][] = [];
  let max = 0;
  for (let i = 0; i <= 240; i++) {
    const r = (rmax * i) / 240;
    const p = radialProbability(n, l, 1, r);
    max = Math.max(max, p);
    pts.push([r, p]);
  }
  const x = (r: number) => (r / rmax) * W;
  const y = (p: number) => H - (p / max) * (H - 10);
  const d = `M0,${H} ` + pts.map(([r, p]) => `L${x(r).toFixed(1)},${y(p).toFixed(1)}`).join(' ') + ` L${W},${H} Z`;
  const mean = meanRadius(n, l, 1);
  const mp = mostProbableRadius(n, l);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', display: 'block' }} role="img" aria-label={`Distribución radial P(r) del orbital ${n}${lLetter(l)}: radio más probable ${fmt(mp, 3)} a₀, radio medio ${fmt(mean, 3)} a₀`}>
        <path d={d} fill="color-mix(in srgb, var(--b4) 16%, transparent)" stroke="var(--b4)" strokeWidth="1.5" />
        {other && <path d={dOther} fill="none" stroke="var(--b5)" strokeWidth="1.8" strokeDasharray="5 3" />}
        <line x1={x(mp)} x2={x(mp)} y1={0} y2={H} stroke="var(--ink)" strokeDasharray="3 3" strokeWidth="1" />
        <line x1={x(mean)} x2={x(mean)} y1={0} y2={H} stroke="var(--electron)" strokeDasharray="2 4" strokeWidth="1" />
        {scaleBohr && n * n < rmax && <line x1={x(n * n)} x2={x(n * n)} y1={0} y2={H} stroke="var(--proton)" strokeWidth="1.5" />}
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--hairline-strong)" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={f * W} y={H + 14} fill="var(--ink-faint)" fontSize="9" fontFamily="var(--font-mono)" textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}>
            {fmt(f * rmax, 2)} a₀
          </text>
        ))}
      </svg>
      <figcaption className="row row--wrap small" style={{ gap: 12, marginTop: 6 }}>
        {other && (
          <span className="muted">
            <span style={{ color: 'var(--b4)' }}>━</span> {n}
            {lLetter(l)} · <span style={{ color: 'var(--b5)' }}>╍</span> {other.n}
            {lLetter(other.l)} (cada curva escalada a su máximo)
          </span>
        )}
        <span className="muted">
          <span style={{ color: 'var(--ink)' }}>┆</span> más probable {fmt(mp, 3)} a₀
        </span>
        <span className="muted">
          <span style={{ color: 'var(--electron)' }}>┆</span> medio {fmt(mean, 3)} a₀
        </span>
        {scaleBohr && (
          <span className="muted">
            <span style={{ color: 'var(--proton)' }}>│</span> órbita de Bohr n²a₀ = {n * n} a₀
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function Picker({ label, values, value, onChange, render }: { label: string; values: number[]; value: number; onChange: (v: number) => void; render?: (v: number) => string }) {
  return (
    <div className="field">
      <span className="label" id={`qp-${label}`}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={`qp-${label}`} style={{ flexWrap: 'wrap' }}>
        {values.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={v === value} className="mono" onClick={() => onChange(v)} style={{ minWidth: 40 }}>
            {render ? render(v) : v}
          </button>
        ))}
      </div>
    </div>
  );
}

function UncertaintyPanel() {
  const sigmaNm = useQuantum((s) => s.sigmaNm);
  const set = useQuantum((s) => s.set);
  const ref = useRef<HTMLCanvasElement>(null);
  const sx = sigmaNm * 1e-9;
  const sp = momentumSpread(sx);
  const sv = sp / 9.1093837015e-31;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = 220;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const half = h / 2 - 12;
    const drawAxis = (y0: number, label: string) => {
      ctx.strokeStyle = 'rgba(236,230,220,0.18)';
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(w, y0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(236,230,220,0.55)';
      ctx.font = '11px "JetBrains Mono Variable", monospace';
      ctx.fillText(label, 4, y0 - half + 12);
    };
    // Posición: ventana fija de ±2 nm
    const X = 2e-9;
    drawAxis(half + 6, '|ψ(x)|²  (posición, ±2 nm)');
    ctx.beginPath();
    for (let i = 0; i <= w; i++) {
      const x = ((i / w) * 2 - 1) * X;
      const env = packetReal(x, sx, (6 * Math.PI) / (sx * 6 + 0.5e-9));
      const y = half + 6 - env * (half - 18) * 0.5 - (half - 18) * 0.5 * Math.exp(-(x * x) / (2 * sx * sx));
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.strokeStyle = 'rgba(169,205,245,0.5)';
    ctx.stroke();
    ctx.beginPath();
    const g0 = gaussian(0, sx);
    for (let i = 0; i <= w; i++) {
      const x = ((i / w) * 2 - 1) * X;
      const y = half + 6 - (gaussian(x, sx) / g0) * (half - 18);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.strokeStyle = '#f2a93b';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Momento: ventana fija de ±1,5·10⁻²⁴ kg·m/s
    const P = 1.5e-24;
    const y1 = h - 4;
    drawAxis(y1, '|φ(p)|²  (momento, ±1,5·10⁻²⁴ kg·m/s)');
    ctx.beginPath();
    const gp0 = gaussian(0, sp);
    for (let i = 0; i <= w; i++) {
      const p = ((i / w) * 2 - 1) * P;
      const y = y1 - (gaussian(p, sp) / gp0) * (half - 18);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.strokeStyle = '#a497db';
    ctx.stroke();
    ctx.lineWidth = 1;
  }, [sx, sp]);
  return (
    <section className="section">
      <span className="eyebrow">Principio de incertidumbre</span>
      <p className="small muted">Un electrón descrito por un paquete de ondas gaussiano: es el caso de incertidumbre mínima. Estrecha la posición y mira qué le pasa al momento.</p>
      <div className="field">
        <label htmlFor="sigx">Incertidumbre en la posición Δx = {fmt(sigmaNm, 2)} nm</label>
        <input id="sigx" type="range" min={0.02} max={0.6} step={0.005} value={sigmaNm} onChange={(e) => set({ sigmaNm: Number(e.target.value) })} />
      </div>
      <canvas ref={ref} style={{ width: '100%', height: 220, display: 'block', borderRadius: 8, background: 'var(--surface-sunken)', border: '1px solid var(--hairline)' }} role="img" aria-label={`Con Δx = ${fmt(sigmaNm, 2)} nm, Δp = ${fmt(sp, 3)} kg·m/s`} />
      <dl className="kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <dt>Δx</dt>
          <dd>{fmt(sx, 3)} m</dd>
        </div>
        <div>
          <dt>Δp = ħ/(2Δx)</dt>
          <dd>{fmt(sp, 3)} kg·m/s</dd>
        </div>
        <div>
          <dt>Δv = Δp/mₑ</dt>
          <dd>{fmt(sv, 3)} m/s</dd>
        </div>
        <div>
          <dt>Δx·Δp</dt>
          <dd>{fmt(sx * sp, 4)} J·s</dd>
        </div>
      </dl>
      <p className="note">
        <b>Lectura.</b> El producto Δx·Δp = ħ/2 = {fmt(HBAR / 2, 4)} J·s no cambia: si localizamos el electrón dentro de un átomo (Δx ≈ 0,1 nm), su velocidad queda indeterminada en cientos de km/s. Por eso no tiene sentido hablar de órbitas.
      </p>
      <EpiTag kind="calculo">Paquete gaussiano exacto (incertidumbre mínima)</EpiTag>
    </section>
  );
}

export function QuantumOverlay() {
  const st = useQuantum();
  const { query } = useRoute();
  const mobile = useMediaQuery('(max-width: 760px)');
  const [collapsed, setCollapsed] = useState(false);
  const [tuple, setTuple] = useState('');
  const [tupleMsg, setTupleMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [predictNodes, setPredictNodes] = useState(false);
  const [nodesRevealed, setNodesRevealed] = useState<string | null>(null);
  useEffect(() => {
    const t = query.get('tab');
    if (t === 'orbitales' || t === 'incertidumbre') st.set({ tab: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.get('tab')]);
  const { n, l, m } = st;
  const signal = useMemo(() => ({ quantum: { n, l, m, slice: st.slice, bohr: st.bohr, tab: st.tab, sigmaNm: st.sigmaNm, compare: st.compare } }), [n, l, m, st.slice, st.bohr, st.tab, st.sigmaNm, st.compare]);
  const tryTuple = () => {
    const t = parseQuantumTuple(tuple);
    if (!t) return setTupleMsg({ ok: false, msg: 'Escribe cuatro números: (n, l, m_l, m_s).' });
    const v = validateQuantumSet({ n: t[0], l: t[1], ml: t[2], ms: t[3] });
    if (!v.valid) return setTupleMsg({ ok: false, msg: v.errors.map((e) => e.message).join(' ') });
    if (t[0] > 5 || t[1] > 3) return setTupleMsg({ ok: true, msg: `Válido: ${v.orbital}. ${v.note ?? ''} El visor muestra hasta n = 5 y l = 3.` });
    st.set({ n: t[0], l: t[1], m: t[2], subshell: false });
    setTupleMsg({ ok: true, msg: `Válido: electrón ${v.orbital} con espín ${t[3] > 0 ? '+½' : '−½'}. Mostrando el orbital ${orbitalName(t[0], t[1], t[2])}.` });
  };
  return (
    <div className="workspace">
      <LabelLayer>
        {!st.compare && (['x', 'y', 'z'] as const).map((a) => (
          <AnchoredLabel key={a} id={`ax-${a}`}>
            <span className="scene-label">{a}</span>
          </AnchoredLabel>
        ))}
      </LabelLayer>
      <div style={{ position: 'relative' }}>
        <div className="desktop-only" style={{ position: 'absolute', left: 'var(--gutter)', top: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', lineHeight: 1 }}>
            {st.subshell ? `${n}${lLetter(l)}` : orbitalName(n, l, m).replace('_', '')}
            {st.compare && <span style={{ color: 'var(--ink-faint)' }}> ↔ {orbitalName(st.compare.n, st.compare.l, st.compare.m).replace('_', '')}</span>}
          </span>
          <p className="small muted" style={{ marginTop: 6 }}>
            n = {n} · l = {l} · {st.subshell ? `m = −${l}…+${l}` : `m = ${m}`} · E = {fmt(levelEnergyEV(n), 3)} eV
          </p>
        </div>
        <div className="stage-caption desktop-only">
          {st.view === 'nube' ? (
            <EpiTag kind="calculo">Puntos muestreados de |ψ|² del hidrógeno; color = signo de ψ (fase), no carga</EpiTag>
          ) : (
            <EpiTag kind="calculo">Superficie |ψ| = constante que encierra el {Math.round(st.fraction * 100)} % de la probabilidad; color = signo de ψ (fase), no carga</EpiTag>
          )}
          {st.bohr && <EpiTag kind="historico">Anillo: órbita de Bohr de radio n²·a₀</EpiTag>}
        </div>
      </div>
      <aside className={`side interactive enter${mobile && collapsed ? ' side--collapsed' : ''}`} aria-label="Quantum Space">
        <button type="button" className="side__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span className="h3">Quantum Space · {orbitalName(n, l, m)}</span>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <MissionPanel lab="cuantico" signal={signal} />
          <div className="segmented" role="tablist" style={{ alignSelf: 'stretch' }}>
            <button type="button" role="tab" aria-selected={st.tab === 'orbitales'} style={{ flex: 1 }} onClick={() => st.set({ tab: 'orbitales' })}>
              Orbitales
            </button>
            <button type="button" role="tab" aria-selected={st.tab === 'incertidumbre'} style={{ flex: 1 }} onClick={() => st.set({ tab: 'incertidumbre' })}>
              Incertidumbre
            </button>
          </div>
          {st.tab === 'orbitales' ? (
            <>
              <section className="section">
                <div className="field">
                  <span className="label" id="q-view">Representación</span>
                  <div className="segmented" role="radiogroup" aria-labelledby="q-view">
                    <button type="button" role="radio" aria-checked={st.view === 'superficie'} onClick={() => st.set({ view: 'superficie' })}>
                      Superficie de probabilidad
                    </button>
                    <button type="button" role="radio" aria-checked={st.view === 'nube'} onClick={() => st.set({ view: 'nube' })}>
                      Nube de probabilidad
                    </button>
                  </div>
                  <span className="small faint">{st.view === 'superficie' ? `La forma que dibujan los libros: dentro de esa superficie hay un ${Math.round(st.fraction * 100)} % de probabilidad de encontrar al electrón. No es un borde: el electrón también puede estar fuera.` : 'Cada punto es una posición posible del electrón: donde hay más puntos, más probabilidad.'}</span>
                </div>
                {st.view === 'superficie' && <FractionControl />}
                <span className="eyebrow">Números cuánticos</span>
                <Picker label="n · nivel (tamaño y energía)" values={[1, 2, 3, 4, 5]} value={n} onChange={(v) => st.set({ n: v, l: Math.min(l, v - 1), m: Math.max(-Math.min(l, v - 1), Math.min(m, Math.min(l, v - 1))) })} />
                <Picker label="l · subnivel (forma)" values={Array.from({ length: Math.min(4, n) }, (_, i) => i)} value={l} onChange={(v) => st.set({ l: v, m: Math.max(-v, Math.min(m, v)) })} render={(v) => `${v} · ${lLetter(v)}`} />
                {!st.subshell && <Picker label="m_l · orientación" values={Array.from({ length: 2 * l + 1 }, (_, i) => i - l)} value={m} onChange={(v) => st.set({ m: v })} render={(v) => (v > 0 ? `+${v}` : String(v).replace('-', '−'))} />}
                <div className="row row--wrap" style={{ gap: 6 }}>
                  <button type="button" className="btn btn--sm" aria-pressed={st.slice} onClick={() => st.set({ slice: !st.slice })} style={st.slice ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
                    Corte (ver nodos)
                  </button>
                  <button type="button" className="btn btn--sm" aria-pressed={st.bohr} onClick={() => st.set({ bohr: !st.bohr })} style={st.bohr ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
                    Órbita de Bohr
                  </button>
                  <button type="button" className="btn btn--sm" aria-pressed={st.subshell} disabled={l === 0} onClick={() => st.set({ subshell: !st.subshell })} style={st.subshell ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
                    Subnivel completo
                  </button>
                </div>
              </section>
              <CompareSection />
              <section className="section">
                <label className="row small" style={{ gap: 8 }}>
                  <input type="checkbox" checked={predictNodes} onChange={(e) => setPredictNodes(e.target.checked)} />
                  Predecir los nodos antes de verlos
                </label>
                {predictNodes && (
                  <Prediction
                    resetKey={`${n}-${l}`}
                    question={`¿Cuántos nodos en total (radiales + angulares) tiene un orbital ${n}${lLetter(l)}?`}
                    options={[0, 1, 2, 3, 4].map((k) => ({ id: String(k), label: String(k) }))}
                    correct={String(n - 1)}
                    explanation={`Nodos totales = n − 1 = ${n - 1}: ${l} angular${l === 1 ? '' : 'es'} (= l) y ${n - l - 1} radial${n - l - 1 === 1 ? '' : 'es'} (= n − l − 1). Con el corte activado se ven ${n - l - 1 > 0 ? 'las capas concéntricas (radiales)' : 'que no hay capas concéntricas'}${l > 0 ? ' y los planos o conos donde ψ cambia de signo (angulares)' : ''}.`}
                    onRun={() => {
                      st.set({ slice: true });
                      setNodesRevealed(`${n}-${l}`);
                    }}
                    runLabel="Ver el corte y comprobar"
                  />
                )}
                {(!predictNodes || nodesRevealed === `${n}-${l}`) && (
                <dl className="kv" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div>
                    <dt>nodos radiales</dt>
                    <dd>{n - l - 1}</dd>
                  </div>
                  <div>
                    <dt>nodos angulares</dt>
                    <dd>{l}</dd>
                  </div>
                  <div>
                    <dt>orbitales en {n}{lLetter(l)}</dt>
                    <dd>{2 * l + 1}</dd>
                  </div>
                </dl>
                )}
                <span className="small muted">Distribución radial de probabilidad P(r) = r²·R²(r)</span>
                <RadialPlot n={n} l={l} scaleBohr={st.bohr} other={st.compare} />
                {n === 1 && st.bohr && <Feedback tone="info">En el 1s el radio más probable coincide con el radio de Bohr (a₀ = 52,9 pm), pero el electrón no está «en» la órbita: puede encontrarse más cerca o más lejos.</Feedback>}
                {st.subshell && <Feedback tone="info">Cada color es un orbital del subnivel {n}{lLetter(l)}. Juntos forman una distribución con simetría esférica (teorema de Unsöld): por eso un subnivel lleno no tiene dirección preferente.</Feedback>}
                {st.slice && <Feedback tone="info">{st.view === 'nube' ? 'Corte por el plano xy: las zonas vacías son nodos, superficies donde ψ = 0 y la probabilidad es nula. Al cruzar un nodo, ψ cambia de signo (de color).' : 'Corte por el plano xy: se ve el interior de las superficies. Los nodos radiales aparecen como capas concéntricas separadas por huecos.'}</Feedback>}
              </section>
              <section className="section">
                <span className="eyebrow">Comprobar una combinación</span>
                <div className="row">
                  <input className="input" placeholder="(n, l, m_l, m_s)" value={tuple} onChange={(e) => setTuple(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && tryTuple()} aria-label="Números cuánticos" />
                  <button type="button" className="btn" onClick={tryTuple}>
                    Ver
                  </button>
                </div>
                {tupleMsg && <Feedback tone={tupleMsg.ok ? 'ok' : 'bad'}>{tupleMsg.msg}</Feedback>}
              </section>
              <p className="note">
                <b>Fase.</b> Ámbar y azul indican el signo de la función de onda ψ, que importa al combinar orbitales (enlaces). No son cargas: el electrón siempre es negativo.
              </p>
            </>
          ) : (
            <UncertaintyPanel />
          )}
        </div>
      </aside>
    </div>
  );
}
