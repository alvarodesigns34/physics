import { MISSIONS } from '../learning/campaign';
import { NavRail, SearchPalette, useSearchShortcut } from './Navigation';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate, notifySceneChange, useRoute, useReducedMotion, type Route } from './hooks';
import { useStore, type QualitySetting, type MotionSetting, type ThemeSetting } from '../state/store';
import { Announcer, Toaster, toast } from '../ui/common';
import { installUiSounds, setAmbient, sfx } from './sound';
import { Icon } from '../ui/Icon';
import { HubScene, HubOverlay } from '../modules/hub/Hub';
import { HomeOverlay } from '../modules/hub/Home';
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
const HistoryScene = lazy(() => import('../modules/history/History').then((m) => ({ default: m.HistoryScene })));
const HistoryOverlay = lazy(() => import('../modules/history/History').then((m) => ({ default: m.HistoryOverlay })));
const MassScene = lazy(() => import('../modules/masses/MassSpec').then((m) => ({ default: m.MassScene })));
const MassOverlay = lazy(() => import('../modules/masses/MassSpec').then((m) => ({ default: m.MassOverlay })));
const GuideOverlay = lazy(() => import('../modules/guide/Guide').then((m) => ({ default: m.GuideOverlay })));
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
  '/': 'Inicio',
  '/forja': 'Atomic Forge',
  '/fotones': 'Photon Lab',
  '/entrenamiento': 'Centro de entrenamiento',
  '/campana': 'Campaña',
  '/periodico': 'Periodic Universe',
  '/cuantico': 'Quantum Space',
  '/arquitecto': 'Electron Architect',
  '/historia': 'Time Machine',
  '/masas': 'Mass Spectrometry Lab',
  '/guia': 'Guía de estudio',
};


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
          <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}>
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
  const undoImport = useStore((s) => s.undoImport);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
        {settings.sound && (
          <>
            <SegmentedSetting<boolean> label="Ambiente de cada laboratorio" value={settings.ambient} onChange={(v) => set({ ambient: v })} options={[{ v: true, label: 'Activado' }, { v: false, label: 'Desactivado' }]} />
            <div className="field">
              <label htmlFor="vol">Volumen: {Math.round(settings.volume * 100)} %</label>
              <input id="vol" type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => set({ volume: Number(e.target.value) })} onPointerUp={() => sfx.success()} />
            </div>
          </>
        )}
        <SegmentedSetting<ThemeSetting> label="Tema" value={settings.theme ?? 'claro'} onChange={(v) => set({ theme: v })} options={[{ v: 'claro', label: 'Claro' }, { v: 'oscuro', label: 'Oscuro' }, { v: 'sistema', label: 'Sistema' }]} />
        <SegmentedSetting<number> label="Tamaño del texto" value={settings.textScale} onChange={(v) => set({ textScale: v })} options={[{ v: 0.9, label: '90 %' }, { v: 1, label: '100 %' }, { v: 1.15, label: '115 %' }, { v: 1.3, label: '130 %' }]} />
        <SegmentedSetting<'llenado' | 'capas'> label="Orden de las configuraciones" value={settings.configOrder} onChange={(v) => set({ configOrder: v })} options={[{ v: 'llenado', label: 'Orden de llenado (Möller)' }, { v: 'capas', label: 'Por capas' }]} />
        <hr className="divider" />
        <div className="stack-12">
          <span className="h3">Progreso</span>
          {importMsg && (
            <p className="small" role="status" style={{ color: importMsg.ok ? 'var(--ok)' : 'var(--bad)' }}>
              {importMsg.text}
            </p>
          )}
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
                const res = importProgress(await f.text());
                setImportMsg(res.ok ? { ok: true, text: 'Progreso importado. Tu progreso anterior se ha guardado por si quieres deshacerlo.' } : { ok: false, text: `No se ha importado nada: ${res.issues.slice(0, 3).join(' ')}${res.issues.length > 3 ? ` (y ${res.issues.length - 3} problema(s) más)` : ''} Tu progreso actual no ha cambiado.` });
                e.target.value = '';
              }}
            />
            {importMsg?.ok && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  if (undoImport()) toast('Importación deshecha');
                  setImportMsg(null);
                }}
              >
                Deshacer importación
              </button>
            )}
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
          ATOM. Datos: CODATA 2018, NIST, IUPAC/CIAAW y NUBASE (vía mendeleev). Sin cuentas ni seguimiento: todo se guarda en este navegador.
        </p>
      </div>
    </>
  );
}

function Intro() {
  const set = useStore((s) => s.setSettings);
  const sound = useStore((s) => s.settings.sound);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);
  const go = (to: string) => {
    set({ seenIntro: true });
    navigate(to);
  };
  return (
    <div className="intro fade" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro__card enter">
        <div className="stack-12">
          <span className="eyebrow eyebrow--accent">ATOM · Estructura atómica y sistema periódico</span>
          <h1 id="intro-title" className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', lineHeight: 1.02 }}>
            Todo el tema, para verlo, tocarlo y aprobarlo.
          </h1>
          <p className="lead" style={{ margin: 0 }}>
            Laboratorios en 3D con física de verdad, una guía con la teoría que entra en el examen y ejercicios que se corrigen paso a paso. Elige por dónde empezar: todo está abierto.
          </p>
        </div>
        <div className="intro__paths">
          <button ref={btn} type="button" className="intro__path" onClick={() => go('/guia')}>
            <span className="h3">Estudiar</span>
            <span className="small muted">Teoría por apartados con ejemplos interactivos y fórmulas.</span>
          </button>
          <button type="button" className="intro__path" onClick={() => go('/')}>
            <span className="h3">Explorar</span>
            <span className="small muted">Siete laboratorios 3D y una campaña de {MISSIONS.length} misiones.</span>
          </button>
          <button type="button" className="intro__path" onClick={() => go('/entrenamiento?v=examen')}>
            <span className="h3">Practicar</span>
            <span className="small muted">Ejercicios adaptativos, repaso espaciado y examen tipo.</span>
          </button>
        </div>
        <div className="row row--between row--wrap" style={{ gap: 12 }}>
          <label className="row small muted" style={{ gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={sound} onChange={(e) => set({ sound: e.target.checked })} /> Activar sonido (ambiente y efectos)
          </label>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ seenIntro: true })}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Barra de pestañas inferior para pantallas táctiles estrechas (la barra superior se oculta). */
function MobileNav({ route }: { route: Route }) {
  const [labsOpen, setLabsOpen] = useState(false);
  const labActive = LABS.some((l) => l.route === route);
  useEffect(() => setLabsOpen(false), [route]);
  return (
    <>
      {labsOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setLabsOpen(false)} />
          <div className="mobile-labs fade" role="dialog" aria-label="Laboratorios">
            <span className="eyebrow">Laboratorios</span>
            {LABS.map((l) => (
              <a key={l.route} href={`#${l.route}`} aria-current={route === l.route ? 'page' : undefined}>
                <span style={{ fontWeight: 600 }}>{l.label}</span>
                <span className="small faint">{l.blurb}</span>
              </a>
            ))}
          </div>
        </>
      )}
      <nav className="mobile-nav" aria-label="Secciones">
        <a href="#/" aria-current={route === '/' ? 'page' : undefined}>
          <Icon name="target" size={20} />
          <span>Inicio</span>
        </a>
        <a href="#/guia" aria-current={route === '/guia' ? 'page' : undefined}>
          <Icon name="info" size={20} />
          <span>Estudiar</span>
        </a>
        <button type="button" aria-expanded={labsOpen} aria-current={labActive ? 'page' : undefined} onClick={() => setLabsOpen((o) => !o)}>
          <Icon name="flask" size={20} />
          <span>Laboratorios</span>
        </button>
        <a href="#/entrenamiento" aria-current={route === '/entrenamiento' ? 'page' : undefined}>
          <Icon name="star" size={20} />
          <span>Entrenar</span>
        </a>
      </nav>
    </>
  );
}

function TopBar({ route, onSettings, onSearch }: { route: Route; onSettings: () => void; onSearch: () => void }) {
  const sound = useStore((s) => s.settings.sound);
  const set = useStore((s) => s.setSettings);
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => navigate('/')} aria-label="ATOM, volver al inicio">
        <span className="brand__mark">ATOM</span>
        <span className="brand__crumb">{CRUMB[route]}</span>
      </button>
      <span className="topbar__spacer" />
      <button type="button" className="topbar__search interactive" onClick={onSearch} aria-label="Buscar un concepto (⌘K)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <span className="desktop-only">Buscar un concepto</span>
        <kbd className="desktop-only">⌘K</kbd>
      </button>
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
    case '/historia':
      return <HistoryScene />;
    case '/masas':
      return <MassScene />;
    case '/entrenamiento':
    case '/guia':
      return null;
    case '/campana':
      return <HubScene />;
    default:
      // ATOM 3.0: el inicio es una página de estudio (sin escena 3D a pantalla completa).
      return null;
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
    case '/historia':
      return <HistoryOverlay />;
    case '/masas':
      return <MassOverlay />;
    case '/entrenamiento':
      return <TrainingOverlay />;
    case '/guia':
      return <GuideOverlay />;
    case '/campana':
      return <HubOverlay />;
    default:
      return <HomeOverlay />;
  }
}

export function App() {
  const { route } = useRoute();
  const reduced = useReducedMotion();
  const textScale = useStore((s) => s.settings.textScale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webgl] = useState(hasWebGL);
  const effectiveRoute: Route = route;

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(textScale));
  }, [textScale]);
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useSearchShortcut(openSearch);
  const theme = useStore((s) => s.settings.theme ?? 'claro');
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'oscuro' || (theme === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'oscuro' : 'claro';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14171d' : '#f5f4f1');
    };
    apply();
    if (theme !== 'sistema') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.title = `ATOM · ${CRUMB[effectiveRoute]}`;
    notifySceneChange();
  }, [effectiveRoute]);
  useEffect(() => installUiSounds(), []);
  const soundOn = useStore((s) => s.settings.sound);
  const seenIntro = useStore((s) => s.settings.seenIntro);
  const ambientOn = useStore((s) => s.settings.ambient);
  useEffect(() => {
    setAmbient(effectiveRoute);
  }, [effectiveRoute, soundOn, ambientOn]);

  return (
    <div className="app" data-motion={reduced ? 'reducido' : 'completo'} data-kind={effectiveRoute === '/' ? 'inicio' : effectiveRoute === '/guia' || effectiveRoute === '/entrenamiento' ? 'pagina' : 'laboratorio'}>
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
          effectiveRoute !== '/entrenamiento' && effectiveRoute !== '/guia' && effectiveRoute !== '/' && (
            <div className="loading" style={{ padding: 32, textAlign: 'center' }}>
              Este dispositivo no ofrece WebGL: las escenas 3D no están disponibles, pero los paneles, cálculos y ejercicios funcionan.
            </div>
          )
        )}
        {(effectiveRoute === '/entrenamiento' || effectiveRoute === '/guia' || effectiveRoute === '/') && <div aria-hidden="true" className="page-bg" />}
      </div>
      <div className="overlay">
        <TopBar route={effectiveRoute} onSettings={() => setSettingsOpen(true)} onSearch={openSearch} />
        <main id="contenido" style={{ minHeight: 0, display: 'grid' }}>
          <ErrorBoundary label="este panel" key={effectiveRoute}>
            <Suspense fallback={null}>
              <OverlayFor route={effectiveRoute} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <NavRail route={effectiveRoute} onSearch={openSearch} />
      <MobileNav route={effectiveRoute} />
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      {!seenIntro && <Intro />}
      {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
      <Announcer />
      <Toaster />
    </div>
  );
}
