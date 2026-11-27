/**
 * ATOM 5.1 · Pestañas con indicador deslizante (muelle): el resaltado viaja de la pestaña anterior a la
 * nueva en lugar de saltar, de modo que el ojo sigue el cambio. Teclado: flechas, Inicio y Fin (patrón
 * WAI-ARIA de pestañas con activación automática). Movimiento reducido: el indicador se coloca sin viajar.
 */
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  badge?: number;
  /** Texto accesible si `label` no es texto */
  aria?: string;
}

export function SlidingTabs<T extends string>({ items, value, onChange, label, className = '' }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (!el || !wrap.current) return;
    // ATOM 5.2 · Mide también la fila (y, alto): si la barra llega a partirse, el indicador cubre solo la
    // pestaña activa y no las dos filas. La barra es de una fila desplazable: la activa se lleva a la vista.
    const place = () => setInd({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    place();
    const box = wrap.current;
    const edges = () => {
      const over = box.scrollWidth > box.clientWidth + 1;
      box.dataset.fadeL = String(over && box.scrollLeft > 4);
      box.dataset.fadeR = String(over && box.scrollLeft < box.scrollWidth - box.clientWidth - 4);
    };
    box.onscroll = edges;
    requestAnimationFrame(edges);
    if (box.scrollWidth > box.clientWidth) {
      const left = el.offsetLeft - 24;
      const right = el.offsetLeft + el.offsetWidth + 24 - box.clientWidth;
      if (box.scrollLeft > left) box.scrollLeft = Math.max(0, left);
      else if (box.scrollLeft < right) box.scrollLeft = right;
    }
    const ro = new ResizeObserver(() => {
      place();
      edges();
    });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [value, items.length]);
  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value);
    let j = i;
    if (e.key === 'ArrowRight') j = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[j]!.id);
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>(`[data-tab="${items[j]!.id}"]`)?.focus());
  };
  return (
    <div ref={wrap} className={`stabs ${className}`} role="tablist" aria-label={label} onKeyDown={onKey}>
      {ind && <span className="stabs__ind" aria-hidden="true" style={{ transform: `translate(${ind.x}px, ${ind.y}px)`, width: ind.w, height: ind.h }} />}
      {items.map((t) => (
        <button key={t.id} type="button" role="tab" data-tab={t.id} aria-selected={t.id === value} tabIndex={t.id === value ? 0 : -1} aria-label={t.aria} className="stabs__tab" onClick={() => onChange(t.id)}>
          {t.label}
          {t.badge ? <span className="stabs__badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
