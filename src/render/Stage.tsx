import { installInteractionWatch, markInteraction, onWake, shouldRender } from './demand';
import { Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { degradeAutoTier, reportFrameWindow, useQuality, useReducedMotion, WINDOW_MS } from '../app/hooks';
import { toast } from '../ui/common';
import { useStore } from '../state/store';

/** Mide los fotogramas por ventanas y los entrega al controlador de calidad (solo en modo automático). */
/**
 * Controlador del renderizado bajo demanda: un bucle rAF ligero que solo invalida el lienzo mientras
 * `shouldRender()`; cuando no hay nada que dibujar, se detiene y espera a `onWake`.
 * Cuenta los fotogramas dibujados en `window.__atomFrames` (medición de tools/perf.mjs).
 */
function DemandDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    installInteractionWatch();
    let raf = 0;
    let running = false;
    const tick = () => {
      if (!shouldRender()) {
        running = false;
        return;
      }
      invalidate();
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    markInteraction();
    start();
    const off = onWake(start);
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [invalidate]);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  // El posprocesado hace varios pases por fotograma y three.js reinicia gl.info en cada uno: para medir el
  // coste del fotograma completo, el reinicio se hace aquí una vez por fotograma.
  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
      // Referencia de diagnóstico: se suelta al desmontar para no retener la escena anterior en memoria.
      const w = window as unknown as { __atomScene?: THREE.Scene };
      if (w.__atomScene === scene) delete w.__atomScene;
    };
  }, [gl, scene]);
  useFrame(() => {
    // Instrumentación para tools/perf.mjs: fotogramas 3D REALMENTE dibujados (no ticks de rAF), recursos
    // de GPU vivos y coste del último fotograma dibujado (llamadas de dibujo y triángulos; con autoReset,
    // gl.info.render conserva aquí los valores del fotograma anterior).
    const w = window as unknown as { __atomFrames?: number; __atomGL?: { geometries: number; textures: number; programs: number; calls: number; triangles: number } };
    w.__atomFrames = (w.__atomFrames ?? 0) + 1;
    (window as unknown as { __atomScene?: THREE.Scene }).__atomScene = scene;
    w.__atomGL = { geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls, triangles: gl.info.render.triangles };
    gl.info.reset();
  });
  return null;
}

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

/**
 * ATOM 5.1 · Dirección artística por laboratorio dentro de una identidad común: cada uno tiene su cielo
 * (degradado vertical con un halo), su niebla y el tinte de sus reflejos. Todo procedural, sin descargas.
 */
export type Mood = 'forja' | 'historia' | 'fotones' | 'masas' | 'cuantico' | 'arquitecto' | 'periodico' | 'campana' | 'neutro';
export const MOODS: Record<Mood, { top: string; bottom: string; halo: string; key: string; rim: string; fog: string }> = {
  forja: { top: '#17140f', bottom: '#2c2116', halo: '#5a3a1e', key: '#ffd3a0', rim: '#8fb6ea', fog: '#1d1711' },
  historia: { top: '#1a1713', bottom: '#2d251b', halo: '#54412a', key: '#ffdcae', rim: '#9fbbe0', fog: '#1e1914' },
  fotones: { top: '#0b0d15', bottom: '#161a28', halo: '#2a3150', key: '#f3ead8', rim: '#7d9ce8', fog: '#0e1019' },
  masas: { top: '#10151d', bottom: '#1b2531', halo: '#2d405a', key: '#e6eef8', rim: '#7fb0e8', fog: '#131a23' },
  cuantico: { top: '#0e0e26', bottom: '#191b3c', halo: '#33367a', key: '#e9e4ff', rim: '#8a8dff', fog: '#111230' },
  arquitecto: { top: '#0d1a2c', bottom: '#16283f', halo: '#24497a', key: '#e8f1ff', rim: '#6fb6ff', fog: '#101d30' },
  periodico: { top: '#141417', bottom: '#212227', halo: '#3a3c45', key: '#fff1dc', rim: '#a9c7ee', fog: '#17171a' },
  campana: { top: '#0b0d16', bottom: '#181c2a', halo: '#2c3352', key: '#ffe2bd', rim: '#9dbfe8', fog: '#0e1018' },
  neutro: { top: '#151a25', bottom: '#1f2635', halo: '#323d55', key: '#ffd9a8', rim: '#a9c7ee', fog: '#141820' },
};

/**
 * ATOM 5.1 · El cielo de cada laboratorio es un degradado CSS DETRÁS de un lienzo transparente: la cúpula
 * en WebGL rellenaba todos los píxeles en cada fotograma (Forja: p95 de 167 a 283 ms en SwiftShader).
 * Así el fondo no cuesta nada a la GPU.
 */
function MoodBackground({ mood }: { mood: Mood }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const m = MOODS[mood];
    const el = gl.domElement.parentElement?.parentElement ?? gl.domElement;
    el.style.background = `radial-gradient(ellipse 70% 55% at 50% 42%, ${m.halo}, transparent 70%), linear-gradient(180deg, ${m.top}, ${m.bottom})`;
    return () => {
      el.style.background = '';
    };
  }, [gl, mood]);
  return null;
}

/** Entorno de reflejos procedural (sin descargas): lámparas tintadas según el laboratorio. */
function StudioEnvironment({ mood }: { mood: Mood }) {
  const m = MOODS[mood];
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={3} color={m.key} position={[0, 5, -6]} scale={[10, 2, 1]} />
      <Lightformer form="rect" intensity={1.3} color={m.rim} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={1.1} color="#ffffff" position={[0, 4, 6]} scale={[8, 3, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#f2a93b" position={[5, 3, 2]} scale={2} />
      <Lightformer form="rect" intensity={0.7} color={m.rim} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
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

export function Stage({ children, camera = [0, 2.4, 9] as [number, number, number], fov = 40, panel = 432, mood = 'neutro' }: { children: ReactNode; camera?: [number, number, number]; fov?: number; panel?: number; mood?: Mood }) {
  const q = useQuality();
  const reduced = useReducedMotion();
  const auto = useStore((s) => s.settings.quality === 'auto');
  return (
    <Canvas
      dpr={q.dpr}
      camera={{ position: camera, fov, near: 0.05, far: 200 }}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance', alpha: true, premultipliedAlpha: true, stencil: false }}
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
        gl.setClearColor('#000000', 0);
      }}
      frameloop="demand"
      aria-hidden="true"
    >
      <fog attach="fog" args={[MOODS[mood].fog, 16, 48]} />
      <MoodBackground mood={mood} />
      <ViewOffset panel={panel} fov={fov} />
      <DemandDriver />
      {auto && !reduced && <FrameMonitor />}
      <Suspense fallback={null}>
        {q.tier !== 'baja' ? (
          <>
            <StudioEnvironment mood={mood} />
            {/* ATOM 5.2 · Relleno suave común: la auditoría vio laboratorios demasiado oscuros. */}
            <hemisphereLight args={[MOODS[mood].key, MOODS[mood].bottom, 0.45]} />
          </>
        ) : (
          // Sin mapa de entorno (calidad baja), las escenas sin luces propias quedaban planas: un juego de
          // luces barato (sin sombras) conserva el volumen.
          <>
            <hemisphereLight args={['#dfe8f7', '#2a2320', 0.9]} />
            <directionalLight position={[4, 6, 5]} intensity={1.4} color="#ffe6c8" />
            <directionalLight position={[-5, -2, -3]} intensity={0.5} color="#a8c4ea" />
          </>
        )}
        {children}
      </Suspense>
      {q.bloom && (
        <EffectComposer multisampling={q.tier === 'alta' ? 4 : 0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={q.tier === 'alta' ? 0.9 : 0.6} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette offset={0.38} darkness={0.32} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
