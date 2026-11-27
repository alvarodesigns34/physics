/**
 * ATOM 5.1 · Cámara de la Forja: el instrumento que rodea al átomo.
 *
 * - Pedestal hexagonal de metal anodizado con una incrustación que se ilumina al cambiar el elemento.
 * - Tres depósitos de vidrio (protones, neutrones, electrones). Al añadir una partícula, sale volando de
 *   su depósito hasta el átomo; al quitarla, vuelve. ESQUEMA: los depósitos y el vuelo son una metáfora
 *   de la construcción, no un proceso físico (los núcleos no se forman así).
 * - Envolvente de probabilidad: esfera cuyo radio contiene el 90 % de la densidad electrónica calculada
 *   (CÁLCULO, con el mismo modelo que la nube). Su borde se tiñe según la carga: ámbar si es catión,
 *   violeta si es anión, neutro si no hay carga.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestFrames } from '../../render/demand';

export type ParticleKind = 'p' | 'n' | 'e';
const KIND_COLOR: Record<ParticleKind, string> = { p: '#ff7a55', n: '#cfc6b8', e: '#6fb6ff' };
/** Dirección (en el plano) de cada depósito, en el arco trasero de la cámara. */
const KIND_ANGLE: Record<ParticleKind, number> = { p: Math.PI * 0.95, n: Math.PI * 0.62, e: Math.PI * 0.05 };

function reservoirPos(kind: ParticleKind, r: number): THREE.Vector3 {
  const a = KIND_ANGLE[kind];
  return new THREE.Vector3(Math.cos(a) * r * 2.25, -r * 0.62, -Math.sin(a) * r * 2.25);
}

/** Material de borde (Fresnel) barato: opaco en el contorno, transparente de frente. */
function useRimMaterial(color: THREE.Color) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uPower: { value: 3.6 }, uAlpha: { value: 0.42 } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uPower; uniform float uAlpha; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower); gl_FragColor = vec4(uColor * (0.3 + f), f * uAlpha); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => {
    (mat.uniforms.uColor!.value as THREE.Color).copy(color);
  }, [mat, color]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

export function ProbabilityShell({ r90, charge, reduced }: { r90: number; charge: number; reduced: boolean }) {
  const color = useMemo(() => new THREE.Color(charge > 0 ? '#ffb15c' : charge < 0 ? '#a58bff' : '#9fd0ff'), [charge]);
  const mat = useRimMaterial(color);
  const ref = useRef<THREE.Mesh>(null);
  const cur = useRef(r90);
  useFrame((_, dt) => {
    cur.current += (r90 - cur.current) * (reduced ? 1 : Math.min(1, dt * 3));
    ref.current?.scale.setScalar(Math.max(0.01, cur.current));
  });
  if (r90 <= 0) return null;
  return (
    <mesh ref={ref} material={mat} renderOrder={3}>
      <sphereGeometry args={[1, 64, 48]} />
    </mesh>
  );
}

/** Pedestal y anillo de trabajo; `pulse` cambia cuando cambia el elemento. */
export function Pedestal({ radius, pulse, reduced }: { radius: number; pulse: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const inlay = useRef<THREE.MeshBasicMaterial>(null);
  const r = useRef(radius);
  const glow = useRef(0);
  useEffect(() => {
    if (pulse) {
      glow.current = 1;
      requestFrames(1600);
    }
  }, [pulse]);
  const top = useMemo(() => new THREE.CylinderGeometry(1.25, 1.36, 0.14, 6, 1), []);
  const base = useMemo(() => new THREE.CylinderGeometry(1.42, 1.6, 0.5, 6, 1), []);
  const ring = useMemo(() => new THREE.TorusGeometry(1.06, 0.012, 8, 6), []);
  useEffect(() => () => [top, base, ring].forEach((x) => x.dispose()), [top, base, ring]);
  useFrame((_, dt) => {
    r.current += (radius - r.current) * (reduced ? 1 : Math.min(1, dt * 2.2));
    const s = Math.max(0.45, r.current * 0.72);
    if (g.current) {
      g.current.scale.setScalar(s);
      g.current.position.y = -Math.max(0.5, r.current) * 1.18;
    }
    glow.current = Math.max(0, glow.current - dt * 0.9);
    if (inlay.current) inlay.current.color.setRGB(1.0 * (0.9 + glow.current * 2.2), 0.62 * (0.9 + glow.current * 2.2), 0.22 * (0.9 + glow.current * 1.5));
  });
  return (
    <group ref={g}>
      <mesh geometry={top} rotation-y={Math.PI / 6} receiveShadow castShadow>
        <meshPhysicalMaterial color="#1b1c20" metalness={0.9} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.2} />
      </mesh>
      <mesh geometry={base} rotation-y={Math.PI / 6} position-y={-0.32} receiveShadow>
        <meshPhysicalMaterial color="#121316" metalness={0.85} roughness={0.45} />
      </mesh>
      <mesh geometry={ring} rotation-x={Math.PI / 2} rotation-z={Math.PI / 6} position-y={0.075}>
        <meshBasicMaterial ref={inlay} color="#f2a93b" toneMapped={false} />
      </mesh>
      {/* Retícula grabada en la placa superior */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.072}>
        <ringGeometry args={[0.5, 0.505, 96]} />
        <meshBasicMaterial color="#ece6dc" transparent opacity={0.18} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.072}>
        <ringGeometry args={[0.8, 0.803, 96]} />
        <meshBasicMaterial color="#ece6dc" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

/** Depósitos de vidrio con partículas dentro; su altura de llenado sugiere cuántas quedan (esquema). */
export function Reservoirs({ radius, reduced }: { radius: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const r = useRef(radius);
  useFrame((_, dt) => {
    r.current += (radius - r.current) * (reduced ? 1 : Math.min(1, dt * 2.2));
    if (!g.current) return;
    const s = Math.max(0.5, r.current);
    g.current.children.forEach((c, i) => {
      const k = (['p', 'n', 'e'] as ParticleKind[])[i]!;
      c.position.copy(reservoirPos(k, s));
      c.scale.setScalar(s * 0.42);
    });
  });
  const capsule = useMemo(() => new THREE.CapsuleGeometry(0.32, 0.7, 8, 24), []);
  const dot = useMemo(() => new THREE.SphereGeometry(0.075, 14, 10), []);
  useEffect(() => () => {
    capsule.dispose();
    dot.dispose();
  }, [capsule, dot]);
  return (
    <group ref={g}>
      {(['p', 'n', 'e'] as ParticleKind[]).map((k) => (
        <group key={k}>
          <mesh geometry={capsule}>
            <meshPhysicalMaterial color="#e8f0f7" roughness={0.05} metalness={0} clearcoat={1} transparent opacity={0.16} depthWrite={false} envMapIntensity={1.6} />
          </mesh>
          <ReservoirParticles kind={k} geo={dot} />
          <mesh position-y={-0.78}>
            <cylinderGeometry args={[0.36, 0.42, 0.16, 32]} />
            <meshPhysicalMaterial color="#1b1c20" metalness={0.9} roughness={0.3} clearcoat={0.6} />
          </mesh>
          <mesh position-y={-0.69} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.37, 0.012, 6, 48]} />
            <meshBasicMaterial color={new THREE.Color(KIND_COLOR[k]).multiplyScalar(1.6)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ReservoirParticles({ kind, geo }: { kind: ParticleKind; geo: THREE.BufferGeometry }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 18;
  useEffect(() => {
    const mm = ref.current;
    if (!mm) return;
    const m4 = new THREE.Matrix4();
    let s = kind.charCodeAt(0) * 7919;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * 0.2;
      m4.makeTranslation(Math.cos(a) * rr, -0.55 + (i / N) * 0.9 + rnd() * 0.05, Math.sin(a) * rr);
      mm.setMatrixAt(i, m4);
    }
    mm.instanceMatrix.needsUpdate = true;
  }, [kind]);
  const c = KIND_COLOR[kind];
  return (
    <instancedMesh ref={ref} args={[geo, undefined, N]}>
      <meshPhysicalMaterial color={c} emissive={c} emissiveIntensity={kind === 'e' ? 0.8 : 0.15} roughness={0.35} clearcoat={0.6} toneMapped={kind !== 'e'} />
    </instancedMesh>
  );
}

interface Flight {
  kind: ParticleKind;
  t: number;
  inbound: boolean;
}

/** Partículas en vuelo entre los depósitos y el átomo. */
export function Flights({ radius, counts, reduced }: { radius: number; counts: Record<ParticleKind, number>; reduced: boolean }) {
  const flights = useRef<Flight[]>([]);
  const prev = useRef(counts);
  const ref = useRef<THREE.InstancedMesh>(null);
  const MAX = 24;
  useEffect(() => {
    if (reduced) {
      prev.current = counts;
      return;
    }
    for (const k of ['p', 'n', 'e'] as ParticleKind[]) {
      const d = counts[k] - prev.current[k];
      for (let i = 0; i < Math.min(6, Math.abs(d)); i++) flights.current.push({ kind: k, t: -i * 0.08, inbound: d > 0 });
    }
    if (flights.current.length > MAX) flights.current.splice(0, flights.current.length - MAX);
    prev.current = counts;
    requestFrames(1400);
  }, [counts, reduced]);
  const geo = useMemo(() => new THREE.SphereGeometry(0.06, 14, 10), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const mm = ref.current;
    if (!mm) return;
    const s = Math.max(0.5, radius);
    let k = 0;
    flights.current = flights.current.filter((f) => (f.t += dt * 1.6) < 1);
    for (const f of flights.current) {
      if (f.t < 0) continue;
      const u = f.inbound ? f.t : 1 - f.t;
      const from = reservoirPos(f.kind, s);
      const ease = 1 - Math.pow(1 - u, 3);
      p.copy(from).multiplyScalar(1 - ease);
      p.y += Math.sin(ease * Math.PI) * s * 0.6;
      const sc = s * (0.9 - 0.5 * ease) * (f.kind === 'e' ? 0.7 : 1);
      m4.makeScale(sc, sc, sc).setPosition(p);
      mm.setMatrixAt(k, m4);
      mm.setColorAt(k, col.set(KIND_COLOR[f.kind]).multiplyScalar(2.2));
      k++;
    }
    mm.count = k;
    mm.instanceMatrix.needsUpdate = true;
    if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, MAX]} frustumCulled={false}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
