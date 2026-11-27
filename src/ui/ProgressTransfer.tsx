/**
 * ATOM 5.1 · Llevar y traer el progreso entre dispositivos (ordenador ↔ iPad) sin servidor.
 * Al traerlo, se elige FUSIONAR (recomendado: no se pierde nada de ninguno de los dos) o REEMPLAZAR.
 * Siempre se puede deshacer la última importación.
 */
import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { decodeTransfer, encodeTransfer, shareProgressFile } from '../state/transfer';
import { toast } from './common';

type Pending = { json: string; from: string };

export function ProgressTransfer() {
  const exportProgress = useStore((s) => s.exportProgress);
  const importProgress = useStore((s) => s.importProgress);
  const resetProgress = useStore((s) => s.resetProgress);
  const undoImport = useStore((s) => s.undoImport);
  const storageOk = useStore((s) => s.storageAvailable);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pasting, setPasting] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string; undo?: boolean } | null>(null);
  const name = `atom-progreso-${new Date().toISOString().slice(0, 10)}.json`;

  const download = (json: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const share = async () => {
    const json = exportProgress();
    if (!(await shareProgressFile(json, name))) download(json);
  };
  const copyCode = async () => {
    try {
      const c = await encodeTransfer(exportProgress());
      await navigator.clipboard.writeText(c);
      setMsg({ ok: true, text: `Código copiado (${Math.round(c.length / 1000)} k caracteres). Pégalo en ATOM en el otro dispositivo: Ajustes → Traer progreso → Pegar código.` });
    } catch {
      setMsg({ ok: false, text: 'No se ha podido copiar al portapapeles. Usa «Compartir archivo».' });
    }
  };
  const apply = (mode: 'fusionar' | 'reemplazar') => {
    if (!pending) return;
    const res = importProgress(pending.json, mode);
    setPending(null);
    if (!res.ok) {
      setMsg({ ok: false, text: `No se ha importado nada: ${res.issues.slice(0, 3).join(' ')}${res.issues.length > 3 ? ` (y ${res.issues.length - 3} problema(s) más)` : ''} Tu progreso actual no ha cambiado.` });
      return;
    }
    const s = res.summary;
    setMsg({
      ok: true,
      undo: true,
      text:
        mode === 'fusionar' && s
          ? `Fusionado: ${s.addedAttempts} intento(s), ${s.addedExams} simulacro(s) y ${s.addedNotebook} entrada(s) del cuaderno nuevas; ${s.nodesUpdated} apartado(s) actualizados. No se ha perdido nada de este dispositivo.`
          : 'Progreso reemplazado. El anterior se ha guardado por si quieres deshacerlo.',
    });
  };

  return (
    <div className="stack-12 transfer">
      {!storageOk && <p className="small" style={{ color: 'var(--warn)' }}>Este navegador no permite guardar datos: el progreso solo durará mientras la página esté abierta. Llévatelo a otro dispositivo o a un archivo para conservarlo.</p>}
      <div className="transfer__group">
        <span className="eyebrow">Llevar a otro dispositivo</span>
        <div className="row row--wrap">
          <button type="button" className="btn btn--sm" onClick={() => void share()}>
            Compartir archivo
          </button>
          <button type="button" className="btn btn--sm" onClick={() => void copyCode()}>
            Copiar código
          </button>
        </div>
      </div>
      <div className="transfer__group">
        <span className="eyebrow">Traer de otro dispositivo</span>
        <div className="row row--wrap">
          <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
            Abrir archivo
          </button>
          <button type="button" className="btn btn--sm" aria-expanded={pasting} onClick={() => setPasting((v) => !v)}>
            Pegar código
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 5_000_000) return setMsg({ ok: false, text: 'El archivo es demasiado grande para ser un progreso de ATOM.' });
            setPending({ json: await f.text(), from: f.name });
          }}
        />
        {pasting && (
          <div className="stack-8">
            <label htmlFor="transfer-code" className="small muted">
              Código copiado en el otro dispositivo (empieza por «ATOM1.»)
            </label>
            <textarea id="transfer-code" className="input mono" rows={3} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
            <button
              type="button"
              className="btn btn--sm"
              disabled={!code.trim()}
              onClick={async () => {
                const r = await decodeTransfer(code);
                if (!r.ok) return setMsg({ ok: false, text: r.error });
                setPending({ json: r.json, from: 'código pegado' });
                setCode('');
                setPasting(false);
              }}
            >
              Leer código
            </button>
          </div>
        )}
      </div>
      {pending && (
        <div className="transfer__choice card" role="group" aria-label="Cómo traer el progreso">
          <p className="small" style={{ margin: 0 }}>
            ¿Cómo quieres traer el progreso de <b>{pending.from}</b>?
          </p>
          <div className="row row--wrap">
            <button type="button" className="btn btn--sm btn--primary" onClick={() => apply('fusionar')}>
              Fusionar con este dispositivo (recomendado)
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => apply('reemplazar')}>
              Reemplazar lo de este dispositivo
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
          <p className="small faint" style={{ margin: 0 }}>Fusionar une los intentos, simulacros, misiones y cuaderno de los dos sin contar dos veces lo que ya compartían.</p>
        </div>
      )}
      {msg && (
        <p className="small" role="status" style={{ color: msg.ok ? 'var(--ok)' : 'var(--bad)', margin: 0 }}>
          {msg.text}{' '}
          {msg.undo && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                if (undoImport()) toast('Importación deshecha');
                setMsg(null);
              }}
            >
              Deshacer
            </button>
          )}
        </p>
      )}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ alignSelf: 'flex-start', color: 'var(--bad)' }}
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
  );
}
