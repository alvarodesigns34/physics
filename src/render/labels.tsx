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

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  align: 'center' | 'left' | 'right' | 'bottom';
}

const GAP = 2;

function span(b: LabelBox): [number, number] {
  return b.align === 'left' ? [b.x, b.x + b.w] : b.align === 'right' ? [b.x - b.w, b.x] : [b.x - b.w / 2, b.x + b.w / 2];
}

/**
 * Separa en vertical las etiquetas que se solaparían (p. ej., dos isótopos con radios casi iguales en el
 * espectrómetro). Recorre de arriba abajo y empuja hacia abajo cada etiqueta que choque con una ya
 * colocada. Devuelve las nuevas coordenadas y (función pura; probada en labels.test.ts).
 */
export function separateLabels(boxes: LabelBox[], direction: 'down' | 'up' = 'down'): number[] {
  const sign = direction === 'down' ? 1 : -1;
  const order = boxes.map((_, i) => i).sort((a, b) => sign * (boxes[a]!.y - boxes[b]!.y));
  const ys = boxes.map((b) => b.y);
  const placed: number[] = [];
  for (const i of order) {
    const b = boxes[i]!;
    const [l, r] = span(b);
    let moved = true;
    for (let guard = 0; moved && guard < boxes.length; guard++) {
      moved = false;
      for (const j of placed) {
        const o = boxes[j]!;
        const [ol, or] = span(o);
        if (r <= ol || l >= or) continue;
        const minDy = (b.h + o.h) / 2 + GAP;
        if (Math.abs(ys[i]! - ys[j]!) < minDy) {
          ys[i] = ys[j]! + sign * minDy;
          moved = true;
        }
      }
    }
    placed.push(i);
  }
  return ys;
}

/**
 * `avoidOverlap`: separa las etiquetas que se solapan. Es opcional porque desplazar una etiqueta la aleja
 * de su ancla: en diagramas donde la posición vertical ES el dato (niveles de energía), las escenas
 * agrupan ellas mismas las etiquetas muy juntas («n = 5, 6, 7…») y no deben moverse.
 */
export function LabelProjector({ anchors, avoidOverlap = false }: { anchors: Anchor[]; avoidOverlap?: boolean | 'down' | 'up' }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const items: { el: HTMLElement; box: LabelBox; hidden: boolean }[] = [];
    // Primero se leen medidas y se proyecta (sin escribir en el DOM) y después se escribe: así no se
    // fuerza un recálculo de estilos por etiqueta.
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
      const inner = avoidOverlap ? (el.firstElementChild as HTMLElement | null) : null;
      items.push({ el, hidden, box: { x, y, w: inner?.offsetWidth ?? 0, h: inner?.offsetHeight ?? 0, align: (el.dataset.align as LabelBox['align']) ?? 'center' } });
    }
    const shift = new Map<HTMLElement, number>();
    if (avoidOverlap) {
      const visible = items.filter((it) => !it.hidden);
      const ys = separateLabels(visible.map((it) => it.box), avoidOverlap === 'up' ? 'up' : 'down');
      visible.forEach((it, k) => {
        shift.set(it.el, ys[k]! - it.box.y);
        it.box.y = ys[k]!;
      });
    }
    for (const { el, box, hidden } of items) {
      el.style.transform = `translate3d(${box.x.toFixed(1)}px, ${box.y.toFixed(1)}px, 0)`;
      el.style.visibility = hidden ? 'hidden' : 'visible';
      // Línea guía hasta el ancla cuando la etiqueta se ha desplazado para no solaparse.
      const dy = shift.get(el) ?? 0;
      if (Math.abs(dy) > 1) {
        el.dataset.shift = dy < 0 ? 'up' : 'down';
        el.style.setProperty('--leader', `${Math.abs(dy).toFixed(1)}px`);
      } else if (el.dataset.shift) delete el.dataset.shift;
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
    <div ref={ref} className={className} data-align={align} style={{ position: 'absolute', left: 0, top: 0, visibility: 'hidden', willChange: 'transform', ...style }}>
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
