import { Suspense, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { degradeAutoTier, reportFrameWindow, useQuality, useReducedMotion, WINDOW_MS } from '../app/hooks';
import { toast } from '../ui/common';
import { useStore } from '../state/store';

/** Mide los fotogramas por ventanas y los entrega al controlador de calidad (solo en modo automático). */
function FrameMonitor() {
  const acc = useRef({ start: -1, frames: 0, longest: 0, last: -1, deltas: [] as number[] });
  useFrame(() => {
    const now = performance.now();
    const a = acc.current;
    if (document.hidden) {
      a.start = -1;
      return;
    }
    if (a.start < 0) {
      a.start = now;
      a.last = now;
      a.frames = 0;
      a.longest = 0;
      a.deltas = [];
      return;
    }
    a.frames++;
    a.longest = Math.max(a.longest, now - a.last);
    if (a.deltas.length < 600) a.deltas.push(now - a.last);
    a.last = now;
    if (now - a.start >= WINDOW_MS) {
      const sorted = a.deltas.sort((x, y) => x - y);
      reportFrameWindow((a.frames * 1000) / (now - a.start), a.longest, sorted[sorted.length >> 1]);
      a.deltas = [];
      a.start = now;
      a.frames = 0;
      a.longest = 0;
    }
  });
  return null;
}

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
function ViewOffset({ panel, fov }: { panel: number; fov: number }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const mobile = window.innerWidth <= 760;
    // ATOM 3.0: en escritorio el visor ya no queda bajo el panel (está a su izquierda): sin desplazamiento.
    if (!mobile && document.querySelector('.app[data-kind="laboratorio"]')) panel = 0;
    // Área visible de la escena: a la izquierda del panel (escritorio) o encima de la hoja inferior (móvil).
    const visW = mobile ? size.width : size.width - panel;
    const visH = mobile ? size.height * 0.5 : size.height;
    if (mobile) cam.setViewOffset(size.width, size.height, 0, size.height * 0.25, size.width, size.height);
    else if (panel > 0) cam.setViewOffset(size.width, size.height, panel / 2, 0, size.width, size.height);
    else cam.clearViewOffset();
    // El área visible debe abarcar al menos el campo vertical de diseño y el horizontal equivalente a una
    // relación 1,6; después se amplía al lienzo completo (la parte tapada por la hoja inferior).
    const rad = (d: number) => (d * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(rad(fov) / 2) * 1.6);
    const visFov = Math.max(rad(fov), 2 * Math.atan(Math.tan(hfov / 2) / (visW / visH)));
    const fullFov = 2 * Math.atan(Math.tan(visFov / 2) * (size.height / visH));
    cam.fov = Math.min(100, (fullFov * 180) / Math.PI);
    cam.updateProjectionMatrix();
    return () => {
      cam.clearViewOffset();
      cam.updateProjectionMatrix();
    };
  }, [camera, size.width, size.height, panel, fov]);
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
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
          // Permite al navegador restaurar el contexto; mientras tanto se reduce la carga gráfica.
          e.preventDefault();
          // Al cambiar de laboratorio el lienzo se desmonta y libera su contexto a propósito
          // (forceContextLoss): eso no es una pérdida real y no debe degradar ni avisar.
          setTimeout(() => {
            if (!canvas.isConnected) return;
            degradeAutoTier();
            toast('Se ha perdido el contexto gráfico; se recupera con menos calidad.');
          }, 0);
        });
        canvas.addEventListener('webglcontextrestored', () => toast('Contexto gráfico recuperado.'));
        gl.toneMapping = q.bloom ? THREE.NoToneMapping : THREE.NeutralToneMapping;
        gl.setClearColor('#121722');
      }}
      frameloop={reduced ? 'demand' : 'always'}
      aria-hidden="true"
    >
      <color attach="background" args={['#121722']} />
      <fog attach="fog" args={['#0b0a09', 14, 42]} />
      <ViewOffset panel={panel} fov={fov} />
      {auto && !reduced && <FrameMonitor />}
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
