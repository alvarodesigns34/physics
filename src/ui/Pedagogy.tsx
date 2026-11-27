/**
 * Piezas pedagógicas del reproductor de ejercicios (ATOM 3.0):
 * - ResolutionView: resolución explicada por bloques, con fórmulas renderizadas.
 * - FigureView: gráficas y esquemas del enunciado en SVG (datos del propio ejercicio).
 * - EssayInput: respuesta de desarrollo con rúbrica y autoevaluación transparente.
 */
import { useMemo, useState } from 'react';
import type { AnswerSpec, ExerciseFigure, ResolutionKind, ResolutionStep } from '../learning/types';
import { suggestCriteria } from '../learning/checker';
import { MathText } from './MathText';
import { Rich } from './common';
import { wavelengthToCss } from '../science/photon';

const KIND_LABEL: Record<ResolutionKind, string> = {
  pregunta: 'Qué nos piden',
  datos: 'Datos',
  principio: 'Principio físico',
  'por-que': 'Por qué esta fórmula',
  despeje: 'Despeje',
  unidades: 'Unidades',
  sustitucion: 'Sustitución',
  calculo: 'Cálculo',
  resultado: 'Resultado',
  interpretacion: 'Interpretación',
  comprobacion: 'Comprobación',
  errores: 'Errores a evitar',
  metodo: 'Método',
};

export function ResolutionView({ steps, methods }: { steps: ResolutionStep[]; methods?: { title: string; advantage: string; steps: ResolutionStep[] }[] }) {
  return (
    <div className="resolution">
      <ol className="resolution__list">
        {steps.map((s, i) => (
          <li key={i} className={`res-step res-step--${s.kind}`}>
            <span className="res-step__kind">{KIND_LABEL[s.kind]}</span>
            <div className="res-step__body">
              {s.text && (
                <p>
                  <Rich text={s.text} />
                </p>
              )}
              {s.math && <MathText tex={s.math} block />}
            </div>
          </li>
        ))}
      </ol>
      {methods && methods.length > 0 && (
        <div className="methods">
          <span className="eyebrow">Otros caminos válidos</span>
          {methods.map((m) => (
            <details key={m.title} className="method">
              <summary>
                <strong>{m.title}</strong> <span className="small muted">— {m.advantage}</span>
              </summary>
              <ResolutionView steps={m.steps} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export function FigureView({ fig }: { fig: ExerciseFigure }) {
  if (fig.kind === 'onda') {
    const W = 560;
    const H = 150;
    const pad = 28;
    const pxPerNm = (W - 2 * pad) / fig.windowNm;
    const pts: string[] = [];
    for (let x = 0; x <= W - 2 * pad; x += 2) pts.push(`${pad + x},${H / 2 - 42 * Math.sin((2 * Math.PI * x) / (fig.lambdaNm * pxPerNm))}`);
    const ticks = 5;
    return (
      <figure className="ex-figure">
        <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label={`${fig.title}. Escala horizontal de 0 a ${fig.windowNm} nm.`}>
          <line x1={pad} x2={W - pad} y1={H / 2} y2={H / 2} className="fig-axis" />
          <polyline points={pts.join(' ')} fill="none" stroke="var(--b3)" strokeWidth="2" />
          {Array.from({ length: ticks + 1 }, (_, k) => {
            const x = pad + ((W - 2 * pad) * k) / ticks;
            return (
              <g key={k}>
                <line x1={x} x2={x} y1={H / 2 - 4} y2={H / 2 + 4} className="fig-axis" />
                <text x={x} y={H + 16} textAnchor="middle" className="fig-label">
                  {Math.round((fig.windowNm * k) / ticks)}
                </text>
              </g>
            );
          })}
          <text x={W - pad} y={H + 16} dx="18" className="fig-label">
            nm
          </text>
        </svg>
        <figcaption>{fig.title}</figcaption>
      </figure>
    );
  }
  if (fig.kind === 'espectro') {
    const W = 560;
    const H = 70;
    const x = (nm: number) => 12 + ((nm - fig.fromNm) / (fig.toNm - fig.fromNm)) * (W - 24);
    return (
      <figure className="ex-figure">
        <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={`${fig.title}: líneas en ${fig.linesNm.map((l) => Math.round(l)).join(', ')} nm`}>
          <rect x="12" y="6" width={W - 24} height={H - 12} rx="6" fill="#0d1118" />
          {fig.linesNm.map((l) => (
            <line key={l} x1={x(l)} x2={x(l)} y1="8" y2={H - 8} stroke={l >= 380 && l <= 750 ? wavelengthToCss(l) : '#9aa3b5'} strokeWidth="2.5" />
          ))}
          {[fig.fromNm, (fig.fromNm + fig.toNm) / 2, fig.toNm].map((v) => (
            <text key={v} x={x(v)} y={H + 14} textAnchor="middle" className="fig-label">
              {Math.round(v)} nm
            </text>
          ))}
        </svg>
        <figcaption>{fig.title}</figcaption>
      </figure>
    );
  }
  if (fig.kind === 'espectros') {
    const W = 560;
    const rowH = 34;
    const left = 92;
    const x = (nm: number) => left + ((nm - fig.fromNm) / (fig.toNm - fig.fromNm)) * (W - left - 12);
    const H = fig.rows.length * (rowH + 8) + 20;
    return (
      <figure className="ex-figure">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${fig.title}. ${fig.rows.map((r) => `${r.label}: ${r.lines.map((l) => Math.round(l.nm)).join(', ')} nm`).join('; ')}`}>
          {fig.rows.map((r, k) => {
            const y = k * (rowH + 8);
            return (
              <g key={r.label}>
                <text x={0} y={y + rowH / 2 + 4} className={`fig-label${k === 0 ? ' fig-label--strong' : ''}`}>
                  {r.label}
                </text>
                <rect x={left} y={y} width={W - left - 12} height={rowH} rx="5" fill="#0d1118" />
                {r.lines.map((l) => (
                  <line key={l.nm} x1={x(l.nm)} x2={x(l.nm)} y1={y + 3} y2={y + rowH - 3} stroke={wavelengthToCss(l.nm)} strokeWidth="2.2" opacity={Math.max(0.35, Math.min(1, l.i))} />
                ))}
              </g>
            );
          })}
          {[400, 450, 500, 550, 600, 650, 700].filter((v) => v >= fig.fromNm && v <= fig.toNm).map((v) => (
            <text key={v} x={x(v)} y={H - 4} textAnchor="middle" className="fig-label">
              {v}
            </text>
          ))}
        </svg>
        <figcaption>{fig.title}</figcaption>
      </figure>
    );
  }
  if (fig.kind === 'puntos') {
    const W = 560;
    const H = 220;
    const pad = { l: 52, r: 16, t: 14, b: 34 };
    const xs = fig.points.map((p) => p.x);
    const ys = fig.points.map((p) => p.y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [0, Math.max(...ys) * 1.12];
    const X = (v: number) => pad.l + ((v - x0) / Math.max(1e-9, x1 - x0)) * (W - pad.l - pad.r);
    const Y = (v: number) => H - pad.b - ((v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
    const yTicks = 4;
    return (
      <figure className="ex-figure">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${fig.title}. ${fig.points.map((p) => `${p.label}: ${p.y}`).join('; ')}`}>
          {Array.from({ length: yTicks + 1 }, (_, k) => {
            const v = y0 + ((y1 - y0) * k) / yTicks;
            return (
              <g key={k}>
                <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} className="fig-grid" />
                <text x={pad.l - 6} y={Y(v) + 4} textAnchor="end" className="fig-label">
                  {Math.round(v)}
                </text>
              </g>
            );
          })}
          <polyline points={fig.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} fill="none" stroke="var(--hairline-strong)" strokeWidth="1.5" />
          {fig.points.map((p) => (
            <g key={p.label}>
              <circle cx={X(p.x)} cy={Y(p.y)} r="4.5" fill={fig.highlight?.includes(p.label) ? 'var(--b7)' : 'var(--accent)'} />
              <text x={X(p.x)} y={H - pad.b + 16} textAnchor="middle" className="fig-label fig-label--strong">
                {p.label}
              </text>
            </g>
          ))}
          <text x={14} y={H / 2} transform={`rotate(-90 14 ${H / 2})`} textAnchor="middle" className="fig-label">
            {fig.yLabel}
          </text>
          <text x={(W + pad.l) / 2} y={H - 2} textAnchor="middle" className="fig-label">
            {fig.xLabel}
          </text>
        </svg>
        <figcaption>{fig.title}</figcaption>
      </figure>
    );
  }
  // Resolución de otro alumno (para detectar el error)
  return (
    <figure className="ex-figure ex-figure--work">
      <ol className="work-lines">
        {fig.lines.map((l, i) => (
          <li key={i}>
            <span className="work-lines__n">{i + 1}</span>
            <span className="work-lines__t">
              <Rich text={l} />
            </span>
          </li>
        ))}
      </ol>
      <figcaption>{fig.title}</figcaption>
    </figure>
  );
}

type EssaySpec = Extract<AnswerSpec, { kind: 'essay' }>;

/**
 * Respuesta de desarrollo. Valor = [texto, ...criterios marcados]. Flujo: escribir → comparar con la
 * respuesta modelo → marcar con honestidad qué criterios cumple tu texto → confirmar.
 */
export function EssayInput({ spec, value, onChange, onSubmit, disabled, labelId, reviewOnly }: { spec: EssaySpec; value: string[]; onChange: (v: string[]) => void; onSubmit: () => void; disabled: boolean; labelId: string; reviewOnly?: boolean }) {
  const [compare, setCompare] = useState(false);
  const [text = '', ...ticked] = value;
  const suggested = useMemo(() => (compare ? suggestCriteria(spec, text) : []), [compare, spec, text]);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const toggle = (id: string) => onChange([text, ...(ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id])]);
  return (
    <div className="essay">
      <textarea className="essay__text" aria-labelledby={labelId} value={text} disabled={disabled || compare} rows={6} placeholder="Escribe tu justificación como en el examen: causa → mecanismo → consecuencia." onChange={(e) => onChange([e.target.value, ...ticked])} />
      <div className="row row--between small faint">
        <span>
          {words} palabra{words === 1 ? '' : 's'}
          {spec.minWords ? ` · mínimo orientativo ${spec.minWords}` : ''}
        </span>
        {!compare && !disabled && !reviewOnly && (
          <button type="button" className="btn btn--primary btn--sm" disabled={words === 0} onClick={() => setCompare(true)}>
            Comparar con la respuesta modelo
          </button>
        )}
      </div>
      {(compare || reviewOnly || disabled) && (
        <div className="essay__review fade">
          <div className="essay__model">
            <span className="eyebrow">Respuesta modelo</span>
            <p>
              <Rich text={spec.model} />
            </p>
          </div>
          <fieldset className="rubric" disabled={disabled}>
            <legend className="eyebrow">Rúbrica · marca lo que tu texto incluye de verdad</legend>
            {spec.criteria.map((c) => (
              <label key={c.id} className="rubric__item">
                <input type="checkbox" checked={ticked.includes(c.id)} onChange={() => toggle(c.id)} />
                <span>
                  {c.text}
                  {suggested.includes(c.id) && <span className="rubric__hint">parece estar en tu texto</span>}
                </span>
              </label>
            ))}
            <p className="small faint" style={{ margin: 0 }}>
              ATOM no corrige el significado de tu texto: solo detecta palabras clave para orientarte. La autoevaluación cuenta como evidencia con menos peso.
            </p>
          </fieldset>
          {!disabled && !reviewOnly && (
            <button type="button" className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={onSubmit}>
              Confirmar autoevaluación
            </button>
          )}
        </div>
      )}
    </div>
  );
}
