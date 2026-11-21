/**
 * Etiquetas DOM ancladas a puntos 3D. La escena proyecta cada ancla en cada fotograma y mueve el
 * elemento DOM correspondiente con `transform` (sin re-renderizar React). Las etiquetas viven en la
 * capa de interfaz: son accesibles, nítidas y respetan el orden de capas del panel lateral.
 */
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const elements = new Map<string, HTMLElement>();

export interface Anchor {
  id: string;
  /** Posición fija en el mundo o un objeto cuya posición mundial se sigue. */
  position?: [number, number, number];
  object?: React.RefObject<THREE.Object3D | null>;
  /** Desplazamiento en píxeles tras proyectar */
  offset?: [number, number];
}

export function LabelProjector({ anchors }: { anchors: Anchor[] }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const a of anchors) {
      const el = elements.get(a.id);
      if (!el) continue;
      if (a.object?.current) a.object.current.getWorldPosition(v);
      else if (a.position) v.set(...a.position);
      else continue;
      v.project(camera);
      const hidden = v.z > 1 || v.z < -1;
      const x = ((v.x + 1) / 2) * size.width + (a.offset?.[0] ?? 0);
      const y = ((1 - v.y) / 2) * size.height + (a.offset?.[1] ?? 0);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.visibility = hidden ? 'hidden' : 'visible';
    }
  });
  return null;
}

/** Elemento DOM anclado. `align` decide qué punto de la etiqueta coincide con el ancla. */
export function AnchoredLabel({ id, children, align = 'center', style, className }: { id: string; children: ReactNode; align?: 'center' | 'left' | 'right' | 'bottom'; style?: CSSProperties; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    elements.set(id, el);
    return () => {
      if (elements.get(id) === el) elements.delete(id);
    };
  }, [id]);
  const inner: CSSProperties =
    align === 'center' ? { transform: 'translate(-50%, -50%)' } : align === 'left' ? { transform: 'translate(0, -50%)' } : align === 'right' ? { transform: 'translate(-100%, -50%)' } : { transform: 'translate(-50%, -100%)' };
  return (
    <div ref={ref} className={className} style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', willChange: 'transform', ...style }}>
      <div style={inner}>{children}</div>
    </div>
  );
}

export function LabelLayer({ children }: { children: ReactNode }) {
  return (
    <div className="label-layer" aria-hidden={false}>
      {children}
    </div>
  );
}
