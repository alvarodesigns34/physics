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
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (!el || !wrap.current) return;
    const place = () => setInd({ x: el.offsetLeft, w: el.offsetWidth });
    place();
    const ro = new ResizeObserver(place);
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
      {ind && <span className="stabs__ind" aria-hidden="true" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} />}
      {items.map((t) => (
        <button key={t.id} type="button" role="tab" data-tab={t.id} aria-selected={t.id === value} tabIndex={t.id === value ? 0 : -1} aria-label={t.aria} className="stabs__tab" onClick={() => onChange(t.id)}>
          {t.label}
          {t.badge ? <span className="stabs__badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
