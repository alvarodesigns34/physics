import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Texto con **negrita** y saltos de línea. */
export function Rich({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
            seg.startsWith('**') && seg.endsWith('**') ? (
              <strong key={j} style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {seg.slice(2, -2)}
              </strong>
            ) : (
              <Fragment key={j}>{seg}</Fragment>
            ),
          )}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

export type Epistemic = 'calculo' | 'esquema' | 'historico' | 'analogia';
const EPI_LABEL: Record<Epistemic, string> = { calculo: 'Cálculo', esquema: 'Esquema', historico: 'Modelo histórico', analogia: 'Analogía' };

/** Etiqueta epistémica: declara qué tipo de representación es cada visual. */
export function EpiTag({ kind, children }: { kind: Epistemic; children: ReactNode }) {
  return (
    <span className={`tag tag--${kind}`}>
      <b>{EPI_LABEL[kind]}</b>
      <span>{children}</span>
    </span>
  );
}

export function Feedback({ tone, children }: { tone: 'ok' | 'bad' | 'info' | 'warn'; children: ReactNode }) {
  return (
    <div className={`feedback feedback--${tone}`} role={tone === 'bad' || tone === 'ok' ? 'status' : undefined}>
      {tone === 'ok' && <Icon name="check" className="feedback__icon" />}
      {tone === 'bad' && <Icon name="x" className="feedback__icon" />}
      {(tone === 'info' || tone === 'warn') && <Icon name="info" className="feedback__icon" />}
      <div>{children}</div>
    </div>
  );
}

/** Región ARIA viva para anunciar cambios de la escena a lectores de pantalla. */
let announceFn: ((msg: string) => void) | null = null;
export function announce(msg: string) {
  announceFn?.(msg);
}

export function Announcer() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    announceFn = (m) => {
      setMsg('');
      requestAnimationFrame(() => setMsg(m));
    };
    return () => {
      announceFn = null;
    };
  }, []);
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {msg}
    </div>
  );
}

let toastFn: ((msg: string) => void) | null = null;
export function toast(msg: string) {
  toastFn?.(msg);
}

export function Toaster() {
  const [item, setItem] = useState<{ id: number; msg: string } | null>(null);
  useEffect(() => {
    toastFn = (msg) => setItem({ id: Date.now(), msg });
    return () => {
      toastFn = null;
    };
  }, []);
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => setItem(null), 2900);
    return () => clearTimeout(t);
  }, [item]);
  return item ? (
    <div className="toast" key={item.id} role="status">
      {item.msg}
    </div>
  ) : null;
}

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="row" style={{ gap: 2, color: 'var(--accent)' }} aria-label={`${n} de ${of} marcas de precisión`}>
      {Array.from({ length: of }, (_, i) => (
        <Icon key={i} name="star" size={13} filled={i < n} />
      ))}
    </span>
  );
}
