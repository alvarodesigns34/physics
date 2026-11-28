/**
 * ATOM 6.0 · Casos predefinidos de un laboratorio: un clic reproduce un caso del temario o de los ejercicios
 * de clase (con su referencia: AMP 7, TEO ej. 1…). El caso activo se marca; los datos los calcula siempre el
 * núcleo científico, el preset solo fija los controles.
 */
export interface LabPreset {
  id: string;
  label: string;
  /** Detalle breve (p. ej., «3 → 2 · visible») */
  detail?: string;
  /** Referencia a las fuentes (AMP 7, TEO ej. 1, HOJ 10…) */
  source?: string;
}

export function LabPresets({ title = 'Casos de examen', presets, active, onPick }: { title?: string; presets: LabPreset[]; active?: string | null; onPick: (id: string) => void }) {
  return (
    <div className="presets" role="group" aria-label={title}>
      <span className="eyebrow">{title}</span>
      <div className="presets__row">
        {presets.map((p) => (
          <button key={p.id} type="button" className="preset" aria-pressed={active === p.id} onClick={() => onPick(p.id)}>
            <span className="preset__label">{p.label}</span>
            {(p.detail || p.source) && (
              <span className="preset__detail">
                {p.detail}
                {p.source && <span className="preset__src">{p.source}</span>}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
