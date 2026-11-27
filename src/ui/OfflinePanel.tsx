/**
 * ATOM 5.1 · Estudiar sin conexión: tamaño del paquete, progreso, disponibilidad, versión y actualizaciones.
 */
import { useEffect } from 'react';
import { applyUpdate, downloadForOffline, formatBytes, refreshOfflineStatus, removeOfflineCopy, useOffline } from '../app/offline';

export function OfflinePanel() {
  const st = useOffline();
  useEffect(() => void refreshOfflineStatus(), []);
  if (!st.supported) return <p className="small muted">Este navegador no permite guardar ATOM para usarlo sin conexión.</p>;
  if (!import.meta.env.PROD) return <p className="small muted">El modo sin conexión solo funciona en la versión publicada (no en desarrollo).</p>;
  const complete = st.files !== undefined && st.have === st.files;
  const pct = st.progress !== null ? Math.round(st.progress * 100) : st.total ? Math.round(((st.haveBytes ?? 0) / st.total) * 100) : 0;
  return (
    <div className="offline stack-8">
      <div className="offline__head">
        <span className={`offline__dot ${complete ? 'is-ok' : ''}`} aria-hidden="true" />
        <span className="small">
          {st.progress !== null ? `Descargando… ${pct} %` : complete ? 'Todo ATOM está guardado: puedes estudiar sin conexión.' : st.files ? `Guardado en parte (${pct} %): lo que no hayas abierto no funcionará sin red.` : 'Comprobando…'}
        </span>
      </div>
      <div className="offline__bar" role="progressbar" aria-label="Contenido guardado para usar sin conexión" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      <p className="small faint" style={{ margin: 0 }}>
        Paquete completo: {formatBytes(st.total)} en {st.files ?? '—'} archivos · versión <span className="mono">{st.version ?? '—'}</span>
        {st.usage !== undefined && st.quota ? ` · ocupado en el navegador: ${formatBytes(st.usage)} de ${formatBytes(st.quota)}` : ''}
        {st.persisted ? ' · almacenamiento protegido' : ''}
      </p>
      {st.error && <p className="small" role="alert" style={{ color: 'var(--bad)', margin: 0 }}>{st.error}</p>}
      <div className="row row--wrap">
        {!complete && (
          <button type="button" className="btn btn--sm" disabled={st.progress !== null} onClick={() => void downloadForOffline()}>
            Descargar todo ({formatBytes(st.total ? st.total - (st.haveBytes ?? 0) : undefined)})
          </button>
        )}
        {complete && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void removeOfflineCopy()}>
            Liberar espacio
          </button>
        )}
        {st.updateReady && (
          <button type="button" className="btn btn--sm" onClick={applyUpdate}>
            Actualizar a la versión nueva
          </button>
        )}
      </div>
    </div>
  );
}

/** Aviso discreto cuando hay una versión nueva lista: se actualiza solo si el alumno quiere. */
export function UpdateBanner() {
  const ready = useOffline((s) => s.updateReady);
  if (!ready) return null;
  return (
    <div className="update-banner" role="status">
      <span className="small">Hay una versión nueva de ATOM.</span>
      <button type="button" className="btn btn--sm" onClick={applyUpdate}>
        Actualizar
      </button>
    </div>
  );
}
