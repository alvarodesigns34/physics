/**
 * ATOM 5.1 · Vista «pozo de potencial» del átomo de hidrógeno.
 *
 * - CÁLCULO: la altura es la energía, en la MISMA escala lineal que el diagrama de niveles (−13,6 eV abajo,
 *   0 eV arriba). La pared del pozo es la energía potencial de Coulomb V(r) = −e²/(4πε₀r) = −27,2 eV·a₀/r.
 *   Cada nivel Eₙ = −13,6 eV/n² corta la pared en r = 2n²·a₀ (punto de retorno clásico): ahí se dibuja su
 *   anillo.
 * - ESQUEMA: el radio en la escena está comprimido (∝ √r) para que quepan de n = 1 a n = 7; el electrón
 *   como bolita sobre el anillo es la imagen de Bohr, no la del modelo actual.
 * Lo que enseña: los niveles se apiñan hacia arriba porque la pared del pozo se aplana; ionizar es salir
 * del pozo (E ≥ 0); un salto hacia abajo libera la diferencia de altura como un fotón.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { create } from 'zustand';
import { levelEnergyEV } from '../../science/hydrogen';
import { requestFrames } from '../../render/demand';
import type { Anchor } from '../../render/labels';

export const useHydroView = create<{ view: 'diagrama' | 'pozo'; set: (v: 'diagrama' | 'pozo') => void }>((set) => ({ view: 'diagrama', set: (view) => set({ view }) }));

const RYD_EV = 13.6057;
const HARTREE_EV = 2 * RYD_EV;
const Y_BOTTOM = -1.75;
const Y_TOP = 2.25;
const yE = (eV: number) => Y_BOTTOM + ((eV + RYD_EV) / RYD_EV) * (Y_TOP - Y_BOTTOM);
/** Radio en la escena a partir de r en radios de Bohr (comprimido: ∝ √r). */
export const rScene = (rA0: number) => 0.3 * Math.sqrt(rA0);
/** Punto de retorno clásico del nivel n: Eₙ = V(r) ⇒ r = 2n²·a₀. */
export const turningRadius = (n: number) => 2 * n * n;

export const WELL_ANCHORS: Anchor[] = [
  ...[1, 2, 3].map((n) => ({ id: `pz-${n}`, position: [rScene(turningRadius(n)) + 0.1, yE(levelEnergyEV(n)), 0] as [number, number, number] })),
  { id: 'pz-inf', position: [-rScene(60), yE(0) + 0.25, 0] },
  { id: 'pz-wall', position: [-rScene(5) - 0.15, yE(-HARTREE_EV / 5), 0] },
];

function wellProfile(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const rMin = HARTREE_EV / 15.2; // V = −15,2 eV (un poco por debajo del nivel fundamental)
  pts.push(new THREE.Vector2(0.0001, yE(-15.2)));
  for (let i = 0; i <= 90; i++) {
    const r = rMin * Math.pow(160 / rMin, i / 90);
    pts.push(new THREE.Vector2(rScene(r), yE(-HARTREE_EV / r)));
  }
  return pts;
}

export function PotentialWell({ level, lastStamp, lastColor, reduced }: { level: number; lastStamp: number | undefined; lastColor: THREE.Color; reduced: boolean }) {
  const geo = useMemo(() => new THREE.LatheGeometry(wellProfile(), 96), []);
  const wire = useMemo(() => {
    const g = new THREE.LatheGeometry(wellProfile().filter((_, i) => i % 6 === 0), 36);
    const w = new THREE.WireframeGeometry(g);
    g.dispose();
    return w;
  }, []);
  useEffect(() => () => {
    geo.dispose();
    wire.dispose();
  }, [geo, wire]);
  const bead = useRef<THREE.Mesh>(null);
  const angle = useRef(0);
  const r = useRef(rScene(turningRadius(level)));
  const y = useRef(yE(levelEnergyEV(level)));
  useEffect(() => {
    requestFrames(2500);
  }, [level]);
  // Destello del fotón emitido o absorbido en el último salto
  const flash = useRef<THREE.Mesh>(null);
  const flashT = useRef(1);
  useEffect(() => {
    if (lastStamp !== undefined) {
      flashT.current = 0;
      requestFrames(1800);
    }
  }, [lastStamp]);
  useFrame((_, dt) => {
    const k = reduced ? 1 : Math.min(1, dt * 4);
    r.current += (rScene(turningRadius(level)) - r.current) * k;
    y.current += (yE(levelEnergyEV(level)) - y.current) * k;
    if (!reduced) angle.current += dt * (1.6 / level);
    bead.current?.position.set(Math.cos(angle.current) * r.current, y.current, Math.sin(angle.current) * r.current);
    if (flash.current) {
      flashT.current = Math.min(1, flashT.current + dt * 0.8);
      const s = 0.2 + flashT.current * 3.5;
      flash.current.scale.set(s, s, s);
      flash.current.position.copy(bead.current?.position ?? new THREE.Vector3());
      (flash.current.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - flashT.current);
      flash.current.visible = flashT.current < 1;
    }
  });
  return (
    <group>
      <mesh geometry={geo}>
        <meshPhysicalMaterial color="#3a46a8" emissive="#1c2266" emissiveIntensity={0.5} roughness={0.25} metalness={0.1} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.2} />
      </mesh>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color="#9fb3ff" transparent opacity={0.16} />
      </lineSegments>
      {/* Plano E = 0: borde del pozo (ionización) */}
      <mesh position-y={yE(0)} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[rScene(160) * 0.98, rScene(160) * 1.25, 96]} />
        <meshBasicMaterial color="#9fb3ff" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <mesh key={n} position-y={yE(levelEnergyEV(n))} rotation-x={Math.PI / 2}>
          <torusGeometry args={[rScene(turningRadius(n)), n === level ? 0.022 : 0.012, 8, 128]} />
          <meshBasicMaterial color={n === level ? new THREE.Color('#f2a93b').multiplyScalar(2) : new THREE.Color('#ece6dc')} transparent opacity={n === level ? 1 : n > 4 ? 0.3 : 0.55} toneMapped={n !== level} />
        </mesh>
      ))}
      <mesh ref={bead}>
        <sphereGeometry args={[0.08, 20, 14]} />
        <meshBasicMaterial color={new THREE.Color('#cfe3ff').multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh ref={flash} visible={false}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshBasicMaterial color={lastColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}
