import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Núcleo como agregado de esferas (ESQUEMA: los nucleones no son bolas rígidas y la escala no es real).
 * Posiciones deterministas: bola rellena con espiral de Fibonacci; protones y neutrones intercalados
 * de forma uniforme. Cada nucleón conserva su identidad y se desliza hacia su nuevo hueco al cambiar A.
 */
export const NUCLEON_RADIUS = 0.085;
const MAX_P = 120;
const MAX_N = 180;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export function nucleusRadius(a: number): number {
  return a <= 1 ? NUCLEON_RADIUS : NUCLEON_RADIUS * Math.cbrt(a / 0.62);
}

function slots(a: number): THREE.Vector3[] {
  const R = nucleusRadius(a) - NUCLEON_RADIUS * 0.9;
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < a; i++) {
    const r = a === 1 ? 0 : R * Math.cbrt((i + 0.5) / a);
    const y = 1 - (2 * (i + 0.5)) / a;
    const s = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * GOLDEN;
    out.push(new THREE.Vector3(Math.cos(th) * s * r, y * r, Math.sin(th) * s * r));
  }
  return out;
}

interface Particle {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  scale: number;
}

export function Nucleus({ z, n, reduced, flash = 0 }: { z: number; n: number; reduced: boolean; flash?: number }) {
  const pRef = useRef<THREE.InstancedMesh>(null);
  const nRef = useRef<THREE.InstancedMesh>(null);
  const protons = useRef<Particle[]>([]);
  const neutrons = useRef<Particle[]>([]);
  const flashRef = useRef(0);
  const group = useRef<THREE.Group>(null);

  const geometry = useMemo(() => new THREE.SphereGeometry(NUCLEON_RADIUS, 24, 16), []);
  const pMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e8775c', roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color('#ffc2a8'), emissive: new THREE.Color('#e8775c'), emissiveIntensity: 0.06 }), []);
  const nMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#bcb3a6', roughness: 0.42, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35, emissive: new THREE.Color('#bcb3a6'), emissiveIntensity: 0.03 }), []);

  useEffect(
    () => () => {
      geometry.dispose();
      pMat.dispose();
      nMat.dispose();
    },
    [geometry, pMat, nMat],
  );

  useEffect(() => {
    flashRef.current = flash ? 1 : 0;
  }, [flash]);

  useEffect(() => {
    const a = z + n;
    const sl = slots(a);
    // Intercalado uniforme: el hueco i es protón si ⌊(i+1)Z/A⌋ > ⌊iZ/A⌋
    const pSlots: THREE.Vector3[] = [];
    const nSlots: THREE.Vector3[] = [];
    sl.forEach((v, i) => (Math.floor(((i + 1) * z) / a) > Math.floor((i * z) / a) ? pSlots : nSlots).push(v));
    const sync = (list: Particle[], targets: THREE.Vector3[], spawn: THREE.Vector3) => {
      while (list.length > targets.length) list.pop();
      while (list.length < targets.length) list.push({ pos: reduced ? targets[list.length]!.clone() : spawn.clone(), target: new THREE.Vector3(), scale: reduced ? 1 : 0.2 });
      list.forEach((p, i) => p.target.copy(targets[i]!));
    };
    sync(protons.current, pSlots, new THREE.Vector3(-3.2, 1.6, 1.2));
    sync(neutrons.current, nSlots, new THREE.Vector3(3.2, 1.6, 1.2));
  }, [z, n, reduced]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    const write = (mesh: THREE.InstancedMesh | null, list: Particle[]) => {
      if (!mesh) return;
      list.forEach((p, i) => {
        p.pos.lerp(p.target, k);
        p.scale += (1 - p.scale) * k;
        sc.setScalar(p.scale);
        m.compose(p.pos, q, sc);
        mesh.setMatrixAt(i, m);
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    write(pRef.current, protons.current);
    write(nRef.current, neutrons.current);
    if (flashRef.current > 0) {
      flashRef.current = Math.max(0, flashRef.current - dt * 1.6);
      pMat.emissiveIntensity = 0.06 + flashRef.current * 2.2;
      nMat.emissiveIntensity = 0.03 + flashRef.current * 1.2;
    }
    if (group.current && !reduced) group.current.rotation.y += dt * 0.12;
    void state;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={pRef} args={[geometry, pMat, MAX_P]} frustumCulled={false} />
      <instancedMesh ref={nRef} args={[geometry, nMat, MAX_N]} frustumCulled={false} />
    </group>
  );
}
