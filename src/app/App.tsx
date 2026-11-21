import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate, useRoute, useReducedMotion, type Route } from './hooks';
import { useStore, type QualitySetting, type MotionSetting } from '../state/store';
import { Announcer, Toaster, toast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { HubScene, HubOverlay } from '../modules/hub/Hub';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const ForgeScene = lazy(() => import('../modules/forge/Forge').then((m) => ({ default: m.ForgeScene })));
const ForgeOverlay = lazy(() => import('../modules/forge/Forge').then((m) => ({ default: m.ForgeOverlay })));
const PhotonScene = lazy(() => import('../modules/photon/PhotonLab').then((m) => ({ default: m.PhotonScene })));
const PhotonOverlay = lazy(() => import('../modules/photon/PhotonLab').then((m) => ({ default: m.PhotonOverlay })));
const TrainingOverlay = lazy(() => import('../modules/training/Training').then((m) => ({ default: m.TrainingOverlay })));
const PeriodicScene = lazy(() => import('../modules/periodic/Periodic').then((m) => ({ default: m.PeriodicScene })));
const QuantumScene = lazy(() => import('../modules/quantum/Quantum').then((m) => ({ default: m.QuantumScene })));
const QuantumOverlay = lazy(() => import('../modules/quantum/Quantum').then((m) => ({ default: m.QuantumOverlay })));
const ArchitectScene = lazy(() => import('../modules/architect/Architect').then((m) => ({ default: m.ArchitectScene })));
const ArchitectOverlay = lazy(() => import('../modules/architect/Architect').then((m) => ({ default: m.ArchitectOverlay })));
const PeriodicOverlay = lazy(() => import('../modules/periodic/Periodic').then((m) => ({ default: m.PeriodicOverlay })));

/** Laboratorios disponibles (en el orden del temario). */
export const LABS: { route: Route; label: string; blurb: string }[] = [
  { route: '/forja', label: 'Atomic Forge', blurb: 'Átomos, isótopos e iones' },
  { route: '/historia', label: 'Time Machine', blurb: 'Modelos y experimentos históricos' },
  { route: '/fotones', label: 'Photon Lab', blurb: 'Luz, espectros e hidrógeno' },
  { route: '/masas', label: 'Mass Spectrometry Lab', blurb: 'Isótopos y masa atómica' },
  { route: '/cuantico', label: 'Quantum Space', blurb: 'Orbitales y números cuánticos' },
  { route: '/arquitecto', label: 'Electron Architect', blurb: 'Configuración electrónica' },
  { route: '/periodico', label: 'Periodic Universe', blurb: 'Tabla y propiedades periódicas' },
];

const CRUMB: Record<Route, string> = {
  '/': 'The Matter Experience',
  '/forja': 'Atomic Forge',
  '/fotones': 'Photon Lab',
  '/entrenamiento': 'Centro de entrenamiento',
  '/campana': 'Campaña',
  '/periodico': 'Periodic Universe',
  '/cuantico': 'Quantum Space',
  '/arquitecto': 'Electron Architect',
  '/historia': 'Time Machine',
  '/masas': 'Mass Spectrometry Lab',
};

function LabsMenu({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  const active = LABS.some((l) => l.route === route);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <a
        href="#"
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        {active ? CRUMB[route] : 'Laboratorios'} <span aria-hidden="true" style={{ opacity: 0.6 }}>▾</span>
      </a>
      {open && (
        <div role="menu" className="labs-menu fade">
          {LABS.map((l) => (
            <a key={l.route} role="menuitem" href={`#${l.route}`} aria-current={route === l.route ? 'page' : undefined} onClick={() => setOpen(false)}>
              <span style={{ display: 'block', color: 'var(--ink)', fontWeight: 550 }}>{l.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)' }}>{l.blurb}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function SegmentedSetting<T extends string | number | boolean>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label} style={{ flexWrap: 'wrap' }}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSettings);
  const exportProgress = useStore((s) => s.exportProgress);
  const importProgress = useStore((s) => s.importProgress);
  const resetProgress = useStore((s) => s.resetProgress);
  const storageOk = useStore((s) => s.storageAvailable);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `atom-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Ajustes">
        <div className="row row--between">
          <span className="h2">Ajustes</span>
          <button ref={closeRef} type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Cerrar ajustes">
            <Icon name="x" />
          </button>
        </div>
        <div className="field">
          <label htmlFor="alias">Tu nombre o alias (opcional, solo en este dispositivo)</label>
          <input id="alias" className="input" style={{ fontFamily: 'var(--font-ui)' }} value={settings.alias} maxLength={24} onChange={(e) => set({ alias: e.target.value })} />
        </div>
        <SegmentedSetting<QualitySetting> label="Calidad gráfica" value={settings.quality} onChange={(v) => set({ quality: v })} options={[{ v: 'auto', label: 'Automática' }, { v: 'alta', label: 'Alta' }, { v: 'media', label: 'Media' }, { v: 'baja', label: 'Baja' }]} />
        <SegmentedSetting<MotionSetting> label="Movimiento" value={settings.motion} onChange={(v) => set({ motion: v })} options={[{ v: 'sistema', label: 'Como el sistema' }, { v: 'reducido', label: 'Reducido' }, { v: 'completo', label: 'Completo' }]} />
        <SegmentedSetting<boolean> label="Sonido" value={settings.sound} onChange={(v) => set({ sound: v })} options={[{ v: false, label: 'Desactivado' }, { v: true, label: 'Activado' }]} />
        <SegmentedSetting<number> label="Tamaño del texto" value={settings.textScale} onChange={(v) => set({ textScale: v })} options={[{ v: 0.9, label: '90 %' }, { v: 1, label: '100 %' }, { v: 1.15, label: '115 %' }, { v: 1.3, label: '130 %' }]} />
        <SegmentedSetting<'llenado' | 'capas'> label="Orden de las configuraciones" value={settings.configOrder} onChange={(v) => set({ configOrder: v })} options={[{ v: 'llenado', label: 'Orden de llenado (Möller)' }, { v: 'capas', label: 'Por capas' }]} />
        <hr className="divider" />
        <div className="stack-12">
          <span className="h3">Progreso</span>
          {!storageOk && <p className="small" style={{ color: 'var(--warn)' }}>Este navegador no permite guardar datos: el progreso solo durará mientras la página esté abierta. Exporta un archivo para conservarlo.</p>}
          <div className="row row--wrap">
            <button type="button" className="btn btn--sm" onClick={download}>
              Exportar
            </button>
            <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
              Importar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                toast(importProgress(await f.text()) ? 'Progreso importado' : 'El archivo no es un progreso de ATOM válido');
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                if (window.confirm('¿Borrar todo el progreso (dominio, repasos, misiones y exámenes)? No se puede deshacer.')) {
                  resetProgress();
                  toast('Progreso borrado');
                }
              }}
            >
              Borrar progreso
            </button>
          </div>
        </div>
        <p className="small faint" style={{ marginTop: 'auto' }}>
          ATOM · Fase 1. Datos: CODATA 2018, NIST, IUPAC/CIAAW y NUBASE (vía mendeleev). Sin cuentas ni seguimiento: todo se guarda en este navegador.
        </p>
      </div>
    </>
  );
}

function TopBar({ route, onSettings }: { route: Route; onSettings: () => void }) {
  const sound = useStore((s) => s.settings.sound);
  const set = useStore((s) => s.setSettings);
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => navigate('/')} aria-label="ATOM, volver al Atrio">
        <span className="brand__mark">ATOM</span>
        <span className="brand__crumb">{CRUMB[route]}</span>
      </button>
      <span className="topbar__spacer" />
      <nav className="topnav" aria-label="Secciones">
        <a href="#/" aria-current={route === '/' ? 'page' : undefined}>
          Atrio
        </a>
        <LabsMenu route={route} />
        <a href="#/entrenamiento" aria-current={route === '/entrenamiento' ? 'page' : undefined}>
          Entrenamiento
        </a>
      </nav>
      <button type="button" className="btn btn--ghost btn--icon interactive" style={{ pointerEvents: 'auto' }} onClick={() => set({ sound: !sound })} aria-label={sound ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={sound}>
        <Icon name={sound ? 'sound' : 'mute'} />
      </button>
      <button type="button" className="btn btn--ghost btn--icon" style={{ pointerEvents: 'auto' }} onClick={onSettings} aria-label="Ajustes">
        <Icon name="settings" />
      </button>
    </header>
  );
}

function SceneFor({ route }: { route: Route }) {
  switch (route) {
    case '/forja':
      return <ForgeScene />;
    case '/fotones':
      return <PhotonScene />;
    case '/periodico':
      return <PeriodicScene />;
    case '/cuantico':
      return <QuantumScene />;
    case '/arquitecto':
      return <ArchitectScene />;
    case '/entrenamiento':
      return null;
    default:
      return <HubScene />;
  }
}

function OverlayFor({ route }: { route: Route }): ReactNode {
  switch (route) {
    case '/forja':
      return <ForgeOverlay />;
    case '/fotones':
      return <PhotonOverlay />;
    case '/periodico':
      return <PeriodicOverlay />;
    case '/cuantico':
      return <QuantumOverlay />;
    case '/arquitecto':
      return <ArchitectOverlay />;
    case '/entrenamiento':
      return <TrainingOverlay />;
    default:
      return <HubOverlay />;
  }
}

export function App() {
  const { route } = useRoute();
  const reduced = useReducedMotion();
  const textScale = useStore((s) => s.settings.textScale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webgl] = useState(hasWebGL);
  const effectiveRoute: Route = route === '/campana' ? '/' : route;

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(textScale));
  }, [textScale]);
  useEffect(() => {
    document.title = `ATOM · ${CRUMB[effectiveRoute]}`;
  }, [effectiveRoute]);

  return (
    <div className="app" data-motion={reduced ? 'reducido' : 'completo'}>
      <a href="#contenido" className="sr-only">
        Saltar al contenido
      </a>
      <div className="stage" key={effectiveRoute}>
        {webgl ? (
          <ErrorBoundary label="la escena 3D">
            <Suspense fallback={<div className="loading">Preparando el laboratorio…</div>}>
              <SceneFor route={effectiveRoute} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          effectiveRoute !== '/entrenamiento' && (
            <div className="loading" style={{ padding: 32, textAlign: 'center' }}>
              Este dispositivo no ofrece WebGL: las escenas 3D no están disponibles, pero los paneles, cálculos y ejercicios funcionan.
            </div>
          )
        )}
        {effectiveRoute === '/entrenamiento' && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% -20%, rgb(242 169 59 / 0.07), transparent 60%), var(--surface)' }} />}
      </div>
      <div className="overlay">
        <TopBar route={effectiveRoute} onSettings={() => setSettingsOpen(true)} />
        <main id="contenido" style={{ minHeight: 0, display: 'grid' }}>
          <ErrorBoundary label="este panel" key={effectiveRoute}>
            <Suspense fallback={null}>
              <OverlayFor route={effectiveRoute} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
      <Announcer />
      <Toaster />
    </div>
  );
}
