import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AtomDensity } from '../science/orbitals';

/**
 * Densidad electrónica como nube de puntos (cálculo aproximado; ver science/orbitals.ts).
 * Shader propio: disco suave, atenuación por distancia y mezcla aditiva contenida.
 * El brillo del subnivel de valencia es algo mayor para distinguir la capa externa.
 */
const vertex = /* glsl */ `
  attribute float aShell;
  attribute float aSeed;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uMaxShell;
  uniform float uScale;
  uniform float uShimmer;
  varying float vShell;
  varying float vAlpha;
  void main() {
    vec3 p = position * uScale;
    // Parpadeo sutil: los puntos son muestras de una probabilidad, no partículas en reposo.
    float tw = 0.75 + 0.25 * sin(uTime * (1.3 + aSeed * 2.1) + aSeed * 40.0);
    vAlpha = mix(1.0, tw, uShimmer);
    vShell = aShell / max(uMaxShell, 1.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * uPixelRatio * (1.0 / -mv.z), 18.0 * uPixelRatio);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform float uOpacity;
  uniform float uGain;
  varying float vShell;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    // ATOM 5.2 · Caída gaussiana con núcleo suave: grano fino, sin el borde de disco de los puntos.
    float a = exp(-d * 16.0) - 0.018;
    vec3 col = mix(uInner, uOuter, vShell);
    float gain = mix(0.55, 1.0, vShell) * uGain;
    gl_FragColor = vec4(col * gain, a * uOpacity * vAlpha);
  }
`;

export interface ElectronCloudProps {
  density: AtomDensity;
  /** Unidades de escena por radio de Bohr */
  scale: number;
  size?: number;
  opacity?: number;
  gain?: number;
  animate?: boolean;
  inner?: string;
  outer?: string;
}

export function ElectronCloud({ density, scale, size = 26, opacity = 0.55, gain = 1.4, animate = true, inner = '#ffe3c2', outer = '#a9cdf5' }: ElectronCloudProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const fade = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(density.positions, 3));
    const shell = new Float32Array(density.subshellIndex.length);
    const seed = new Float32Array(density.subshellIndex.length);
    // Índice de capa (n) relativo: capas internas cálidas y tenues; la de valencia, fría y brillante.
    const maxN = Math.max(1, ...density.subshells.map((s) => s.n));
    const minN = Math.min(maxN, ...density.subshells.map((s) => s.n));
    for (let i = 0; i < shell.length; i++) {
      const s = density.subshells[density.subshellIndex[i]!]!;
      shell[i] = maxN === minN ? 1 : (s.n - minN) / (maxN - minN);
      seed[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    }
    g.setAttribute('aShell', new THREE.BufferAttribute(shell, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.computeBoundingSphere();
    return g;
  }, [density]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    fade.current = 0;
  }, [density]);

  const uniforms = useMemo(
    () => ({
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
      uMaxShell: { value: 1 },
      uScale: { value: scale },
      uShimmer: { value: animate ? 1 : 0 },
      uInner: { value: new THREE.Color(inner) },
      uOuter: { value: new THREE.Color(outer) },
      uOpacity: { value: 0 },
      uGain: { value: gain },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, dt) => {
    const m = matRef.current;
    if (!m) return;
    fade.current = Math.min(1, fade.current + dt * 2.4);
    m.uniforms.uTime!.value = animate ? state.clock.elapsedTime : 0;
    m.uniforms.uPixelRatio!.value = state.gl.getPixelRatio();
    m.uniforms.uOpacity!.value = opacity * (animate ? fade.current : 1);
    m.uniforms.uScale!.value += (scale - m.uniforms.uScale!.value) * Math.min(1, dt * 6);
    m.uniforms.uSize!.value = size;
    m.uniforms.uShimmer!.value = animate ? 1 : 0;
    m.uniforms.uGain!.value = gain;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={matRef} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}
