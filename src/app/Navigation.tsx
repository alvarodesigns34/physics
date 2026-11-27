/**
 * Navegación de escritorio e iPad (ATOM 3.0): raíl lateral siempre visible con todas las secciones a un
 * clic, y paleta de búsqueda global (⌘K / Ctrl K, o «/»). En móvil se mantiene la barra inferior.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { navigate, type Route } from './hooks';
import { search, type HitKind, type SearchHit } from '../learning/search';
import { LabGlyph } from '../modules/hub/LabGlyph';

const MAIN: { route: Route; label: string; icon: string }[] = [
  { route: '/', label: 'Inicio', icon: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1Z' },
  { route: '/guia', label: 'Guía', icon: 'M5 4.5h5.5A2.5 2.5 0 0 1 13 7v12.5a2 2 0 0 0-2-2H5ZM19 4.5h-3.5A2.5 2.5 0 0 0 13 7v12.5a2 2 0 0 1 2-2h4Z' },
  { route: '/entrenamiento', label: 'Practicar', icon: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 4a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z' },
];

const LABS: { route: Route; label: string }[] = [
  { route: '/forja', label: 'Forja' },
  { route: '/historia', label: 'Historia' },
  { route: '/fotones', label: 'Fotones' },
  { route: '/masas', label: 'Masas' },
  { route: '/cuantico', label: 'Cuántica' },
  { route: '/arquitecto', label: 'Electrones' },
  { route: '/periodico', label: 'Tabla' },
];

const LAB_FULL: Record<string, string> = {
  '/forja': 'Atomic Forge',
  '/historia': 'Time Machine',
  '/fotones': 'Photon Lab',
  '/masas': 'Mass Spectrometry Lab',
  '/cuantico': 'Quantum Space',
  '/arquitecto': 'Electron Architect',
  '/periodico': 'Periodic Universe',
};

export function NavRail({ route, onSearch }: { route: Route; onSearch: () => void }) {
  return (
    <nav className="rail desktop-only" aria-label="Secciones">
      <button type="button" className="rail__search" onClick={onSearch} aria-label="Buscar (⌘K)" title="Buscar  ⌘K">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      </button>
      <div className="rail__group">
        {MAIN.map((m) => (
          <a key={m.route} href={`#${m.route}`} className="rail__item" aria-current={route === m.route ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
              <path d={m.icon} />
            </svg>
            <span>{m.label}</span>
          </a>
        ))}
      </div>
      <div className="rail__sep" role="presentation" />
      <div className="rail__group" aria-label="Laboratorios" role="group">
        {LABS.map((l) => (
          <a key={l.route} href={`#${l.route}`} className="rail__item rail__item--lab" aria-current={route === l.route ? 'page' : undefined} title={LAB_FULL[l.route]} aria-label={LAB_FULL[l.route]}>
            <span className="rail__glyph">
              <LabGlyph route={l.route} />
            </span>
            <span aria-hidden="true">{l.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

const KIND_LABEL: Record<HitKind, string> = { teoria: 'Teoría', formula: 'Fórmula', truco: 'Truco', laboratorio: 'Laboratorio', practica: 'Práctica', pagina: 'Página' };
const SUGGESTIONS = ['Rydberg', 'Hund', 'isótopos', 'energía de ionización', 'Balmer', 'números cuánticos', 'radio iónico', 'masa atómica media'];

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo<SearchHit[]>(() => search(q, 12), [q]);
  useEffect(() => {
    // Al cerrar, el foco vuelve a donde estaba (accesibilidad de diálogos modales).
    const prev = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => prev?.focus?.();
  }, []);
  useEffect(() => setSel(0), [q]);
  const go = (h: SearchHit) => {
    onClose();
    navigate(h.href);
  };
  return (
    <div className="palette-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Buscar en ATOM">
        <div className="palette__field">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un concepto: Rydberg, Hund, isótopos…"
            aria-label="Concepto"
            aria-controls="palette-results"
            aria-activedescendant={hits[sel] ? `hit-${sel}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(hits.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter' && hits[sel]) go(hits[sel]!);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        {q.trim().length < 2 ? (
          <div className="palette__empty">
            <span className="eyebrow">Prueba con</span>
            <div className="row row--wrap" style={{ gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="chip-btn" onClick={() => setQ(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : hits.length === 0 ? (
          <div className="palette__empty small muted">Sin resultados para «{q}». Prueba con otro término o un sinónimo.</div>
        ) : (
          <ul className="palette__list" id="palette-results" role="listbox">
            {hits.map((h, i) => (
              <li key={h.href + h.title} id={`hit-${i}`} role="option" aria-selected={i === sel}>
                <button type="button" className="palette__hit" data-active={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(h)}>
                  <span className={`palette__kind palette__kind--${h.kind}`}>{KIND_LABEL[h.kind]}</span>
                  <span className="palette__text">
                    <span className="palette__title">{h.title}</span>
                    <span className="palette__detail">{h.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="palette__foot small faint">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> elegir · <kbd>↵</kbd> abrir
          </span>
          <span>Teoría, laboratorio y práctica de cada concepto</span>
        </div>
      </div>
    </div>
  );
}

/** Atajo global: ⌘K / Ctrl K, o «/» fuera de un campo de texto. */
export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open();
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}
