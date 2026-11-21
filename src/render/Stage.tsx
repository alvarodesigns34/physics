import { Suspense, useLayoutEffect, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { degradeAutoTier, useQuality, useReducedMotion } from '../app/hooks';
import { useStore } from '../state/store';

/** Entorno de reflejos procedural (sin descargas): lámparas de instrumento cálidas y un contraluz frío. */
function StudioEnvironment() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#ffd9a8" position={[0, 5, -6]} scale={[10, 2, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#a9c7ee" position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#f2a93b" position={[5, 3, 2]} scale={2} />
    </Environment>
  );
}

/**
 * Desplaza el centro óptico hacia la izquierda la mitad del ancho del panel lateral, para que la
 * escena quede centrada en el área visible (en móvil el panel va abajo y no se desplaza).
 */
function ViewOffset({ panel }: { panel: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (size.width > 760 && panel > 0) cam.setViewOffset(size.width, size.height, panel / 2, 0, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    return () => {
      cam.clearViewOffset();
      cam.updateProjectionMatrix();
    };
  }, [camera, size.width, size.height, panel]);
  return null;
}

export function Stage({ children, camera = [0, 2.4, 9] as [number, number, number], fov = 40, panel = 432 }: { children: ReactNode; camera?: [number, number, number]; fov?: number; panel?: number }) {
  const q = useQuality();
  const reduced = useReducedMotion();
  const auto = useStore((s) => s.settings.quality === 'auto');
  return (
    <Canvas
      dpr={q.dpr}
      camera={{ position: camera, fov, near: 0.05, far: 200 }}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = q.bloom ? THREE.NoToneMapping : THREE.NeutralToneMapping;
        gl.setClearColor('#0b0a09');
      }}
      frameloop={reduced ? 'demand' : 'always'}
      aria-hidden="true"
    >
      <color attach="background" args={['#0b0a09']} />
      <fog attach="fog" args={['#0b0a09', 14, 42]} />
      <ViewOffset panel={panel} />
      {auto && <PerformanceMonitor onDecline={degradeAutoTier} flipflops={2} />}
      <Suspense fallback={null}>
        {q.tier !== 'baja' && <StudioEnvironment />}
        {children}
      </Suspense>
      {q.bloom && (
        <EffectComposer multisampling={q.tier === 'alta' ? 4 : 0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={q.tier === 'alta' ? 0.9 : 0.6} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.32} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
