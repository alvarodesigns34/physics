/**
 * Widgets interactivos de la guía de estudio. Son representaciones 2D deliberadamente esquemáticas:
 * cada uno declara qué es cálculo y qué es esquema.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EXERCISE_DATA, PARTICLES } from '../../science/constants';
import { formatNumber, toSuperscript } from '../../science/numbers';
import { EM_REGIONS, emRegion, fromWavelength, isVisible, wavelengthToCss, colorName, INVISIBLE_LINE_CSS } from '../../science/photon';
import { levelEnergyEV, seriesFor, transition } from '../../science/hydrogen';
import { identify, KIND_LABEL, nuclearNotation, speciesName } from '../../science/nucleus';
import { elementByZ, elementBySymbol } from '../../science/elements';
import { formatConfiguration, groundState, MADELUNG_ORDER, subshellLabel, unpairedElectrons, valenceElectrons, valenceShell, orbitalBoxes } from '../../science/configuration';
import { lLetter, validateQuantumSet } from '../../science/quantum';
import { compare, PROPERTIES, type PropertyId } from '../../science/trends';
import { averageAtomicMass } from '../../science/massSpec';
import { EpiTag, Feedback } from '../../ui/common';
import { useReducedMotion } from '../../app/hooks';
import { BLOCK_COLOR } from '../../render/palette';

const fmt = (v: number, sig = 3) => formatNumber(v, { sig });
const sci = (v: number, sig = 3) => formatNumber(v, { sig, sci: true });

function Stepper({ label, value, min, max, onChange, step = 1, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper__label">{label}</span>
      <button type="button" className="btn btn--sm btn--icon" aria-label={`Reducir ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, +(value - step).toFixed(6)))}>
        −
      </button>
      <output className="mono stepper__value" aria-live="polite">
        {format ? format(value) : value}
      </output>
      <button type="button" className="btn btn--sm btn--icon" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, +(value + step).toFixed(6)))}>
        +
      </button>
    </div>
  );
}

function Slider({ id, label, value, min, max, step, onChange, display }: { id: string; label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: ReactNode }) {
  return (
    <div className="field" style={{ gap: 4 }}>
      <label htmlFor={id} className="row row--between">
        <span>{label}</span>
        <span className="mono" style={{ color: 'var(--ink)' }}>
          {display}
        </span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function WidgetFrame({ title, kind, children, caption }: { title: string; kind: 'calculo' | 'esquema' | 'historico' | 'analogia'; children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="widget">
      <figcaption className="row row--between row--wrap" style={{ gap: 8 }}>
        <span className="h3" style={{ fontSize: '1.05rem' }}>
          {title}
        </span>
        <EpiTag kind={kind}>{kind === 'calculo' ? 'Valores calculados' : kind === 'esquema' ? 'Dibujo no a escala' : kind === 'historico' ? 'Modelos superados' : 'Comparación'}</EpiTag>
      </figcaption>
      {children}
      {caption && <p className="small faint" style={{ margin: 0 }}>{caption}</p>}
    </figure>
  );
}

// ── Notación de nucleidos ─────────────────────────────────────────────────

export function NotationWidget() {
  const [z, setZ] = useState(11);
  const [a, setA] = useState(23);
  const [q, setQ] = useState(1);
  const el = elementByZ(z)!;
  const aa = Math.max(a, z);
  const n = aa - z;
  const e = z - q;
  const id = identify({ z, n, e });
  return (
    <WidgetFrame title="Lee la notación de un nucleido" kind="calculo" caption="Cambia Z, A o la carga y observa qué cambia: Z cambia el elemento; A, el isótopo; la carga, solo los electrones.">
      <div className="widget__grid">
        <div className="notation" aria-label={`Notación ${nuclearNotation({ z, n, e: Math.max(0, e) })}`}>
          <span className="notation__a" title="Número másico">
            {aa}
          </span>
          <span className="notation__z" title="Número atómico">
            {z}
          </span>
          <span className="notation__sym">{el.symbol}</span>
          <span className="notation__q" title="Carga">
            {q === 0 ? '' : `${Math.abs(q) === 1 ? '' : Math.abs(q)}${q > 0 ? '+' : '−'}`}
          </span>
        </div>
        <div className="stack-8">
          <Stepper label="Z" value={z} min={1} max={36} onChange={(v) => { setZ(v); setA(Math.round(elementByZ(v)!.atomicWeight)); setQ(0); }} />
          <Stepper label="A" value={aa} min={z} max={z * 3 + 4} onChange={setA} />
          <Stepper label="Carga" value={q} min={-3} max={Math.min(4, z)} onChange={setQ} format={(v) => (v > 0 ? `+${v}` : v === 0 ? '0' : `−${-v}`)} />
        </div>
      </div>
      <dl className="kv kv--3">
        <div>
          <dt>Protones</dt>
          <dd className="num" style={{ color: 'var(--proton)' }}>{z}</dd>
        </div>
        <div>
          <dt>Neutrones (A − Z)</dt>
          <dd className="num" style={{ color: 'var(--neutron)' }}>{n}</dd>
        </div>
        <div>
          <dt>Electrones (Z − q)</dt>
          <dd className="num" style={{ color: 'var(--electron)' }}>{e}</dd>
        </div>
      </dl>
      <p className="small muted" style={{ margin: 0 }}>
        {speciesName({ z, n, e })} · {KIND_LABEL[id.kind]}
        {id.nobleGasElectronCount && e > 0 ? ` · isoelectrónico con el ${id.isoelectronicWith?.name.toLowerCase()}` : ''}
      </p>
    </WidgetFrame>
  );
}

// ── Anatomía de una onda ──────────────────────────────────────────────────

type WaveMode = 'cuerda' | 'luz';

export function WaveWidget() {
  const [mode, setMode] = useState<WaveMode>('cuerda');
  const [lambda, setLambda] = useState(2); // m (cuerda)
  const [freq, setFreq] = useState(0.5); // Hz (cuerda)
  const [amp, setAmp] = useState(0.6);
  const [nm, setNm] = useState(550);
  const [playing, setPlaying] = useState(true);
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const plot = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const state = useRef({ mode, lambda, freq, amp, nm });
  state.current = { mode, lambda, freq, amp, nm };
  const photon = fromWavelength(nm * 1e-9, EXERCISE_DATA);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing && !reduced) tRef.current += dt;
      const c = canvas.current;
      const p = plot.current;
      if (c && p) {
        drawWave(c, tRef.current, state.current);
        drawPlot(p, tRef.current, state.current);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const v = lambda * freq;
  const T = 1 / freq;
  return (
    <WidgetFrame
      title="Anatomía de una onda"
      kind={mode === 'cuerda' ? 'esquema' : 'calculo'}
      caption={
        mode === 'cuerda'
          ? 'El punto rojo solo sube y baja: la onda transporta energía, no materia. En un periodo T la onda avanza exactamente una longitud de onda λ.'
          : 'La animación está ralentizada unas 10¹⁵ veces: la luz visible oscila unos 500 billones de veces por segundo. El campo eléctrico (color) y el magnético (gris) son perpendiculares entre sí y a la dirección de avance.'
      }
    >
      <div className="row row--between row--wrap" style={{ gap: 8 }}>
        <div className="segmented" role="tablist" aria-label="Tipo de onda">
          <button type="button" role="tab" aria-selected={mode === 'cuerda'} onClick={() => setMode('cuerda')}>
            Onda en una cuerda
          </button>
          <button type="button" role="tab" aria-selected={mode === 'luz'} onClick={() => setMode('luz')}>
            Onda electromagnética
          </button>
        </div>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
          {playing && !reduced ? 'Pausar' : 'Reanudar'}
        </button>
      </div>
      <canvas ref={canvas} className="wave-canvas" role="img" aria-label={mode === 'cuerda' ? `Onda con longitud de onda ${fmt(lambda)} m, frecuencia ${fmt(freq)} Hz y amplitud ${fmt(amp)} m` : `Onda electromagnética de ${nm} nm`} />
      <canvas ref={plot} className="wave-plot" aria-hidden="true" />
      {mode === 'cuerda' ? (
        <>
          <div className="widget__controls">
            <Slider id="w-lambda" label="Longitud de onda λ" value={lambda} min={0.8} max={4} step={0.1} onChange={setLambda} display={`${fmt(lambda, 2)} m`} />
            <Slider id="w-freq" label="Frecuencia ν" value={freq} min={0.2} max={1.5} step={0.05} onChange={setFreq} display={`${fmt(freq, 2)} Hz`} />
            <Slider id="w-amp" label="Amplitud" value={amp} min={0.15} max={1} step={0.05} onChange={setAmp} display={`${fmt(amp, 2)} m`} />
          </div>
          <div className="formula-live">
            <span>
              T = 1/ν = 1/{fmt(freq, 2)} = <b>{fmt(T, 3)} s</b>
            </span>
            <span>
              v = λ·ν = {fmt(lambda, 2)} · {fmt(freq, 2)} = <b>{fmt(v, 3)} m/s</b>
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            La amplitud no cambia ni λ ni ν: solo la energía que transporta la onda. Si aumentas ν con λ fija, la onda va más rápido; en la luz, en cambio, v = c es fija y por eso λ y ν son inversas.
          </p>
        </>
      ) : (
        <>
          <Slider id="w-nm" label="Longitud de onda λ" value={nm} min={380} max={780} step={1} onChange={setNm} display={`${nm} nm`} />
          <div className="formula-live">
            <span>
              λ = {nm} nm = <b>{sci(nm * 1e-9, 3)} m</b>
            </span>
            <span>
              ν = c/λ = 3·10⁸ / {sci(nm * 1e-9, 3)} = <b>{sci(photon.frequency, 3)} Hz</b>
            </span>
            <span>
              T = 1/ν = <b>{sci(1 / photon.frequency, 3)} s</b>
            </span>
            <span>
              E = h·ν = <b>{sci(photon.energyJ, 3)} J</b> = <b>{fmt(photon.energyEV, 3)} eV</b>
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Color: <span style={{ color: wavelengthToCss(nm) }}>■</span> {colorName(nm) ?? '—'}. Al bajar λ hacia el violeta, la frecuencia y la energía del fotón aumentan.
          </p>
        </>
      )}
    </WidgetFrame>
  );
}

function fitCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

const MUTED = '#a69e92';
const FAINT = 'rgba(236,230,220,0.14)';
const ACCENT = '#f2a93b';
const RED = '#e8775c';

function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 6) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - s * Math.cos(ang - 0.45), y - s * Math.sin(ang - 0.45));
  ctx.moveTo(x, y);
  ctx.lineTo(x - s * Math.cos(ang + 0.45), y - s * Math.sin(ang + 0.45));
  ctx.stroke();
}

function dimension(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, label: string, color: string, labelSide: 'above' | 'below' | 'right' = 'above') {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  arrowHead(ctx, x2, y2, ang);
  arrowHead(ctx, x1, y1, ang + Math.PI);
  ctx.font = '500 13px "Inter Tight Variable", system-ui, sans-serif';
  ctx.textAlign = labelSide === 'right' ? 'left' : 'center';
  ctx.textBaseline = labelSide === 'below' ? 'top' : 'middle';
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  if (labelSide === 'right') ctx.fillText(label, mx + 8, my);
  else ctx.fillText(label, mx, labelSide === 'above' ? my - 11 : my + 6);
}

function drawWave(c: HTMLCanvasElement, t: number, s: { mode: WaveMode; lambda: number; freq: number; amp: number; nm: number }) {
  const { ctx, w, h } = fitCanvas(c);
  const mid = h / 2;
  const left = 16;
  const right = w - 16;
  ctx.font = '500 12px "Inter Tight Variable", system-ui, sans-serif';
  if (s.mode === 'cuerda') {
    const spanM = 8; // metros visibles
    const pxPerM = (right - left) / spanM;
    const A = s.amp * Math.min(56, h * 0.3);
    const k = (2 * Math.PI) / s.lambda;
    const om = 2 * Math.PI * s.freq;
    const y = (xm: number) => mid - A * Math.sin(k * xm - om * t);
    // eje y escala
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(left, mid);
    ctx.lineTo(right, mid);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let m = 0; m <= spanM; m++) {
      const x = left + m * pxPerM;
      ctx.fillStyle = 'rgba(236,230,220,0.35)';
      ctx.fillRect(x - 0.5, h - 18, 1, 5);
      if (m % 2 === 0) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${m} m`, x, h - 12);
      }
    }
    // cuerda
    const grad = ctx.createLinearGradient(left, 0, right, 0);
    grad.addColorStop(0, 'rgba(169,205,245,0.45)');
    grad.addColorStop(0.5, '#a9cdf5');
    grad.addColorStop(1, 'rgba(169,205,245,0.45)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = left; x <= right; x += 2) {
      const yy = y((x - left) / pxPerM);
      if (x === left) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    // crestas: k x - ωt = π/2 + 2πn → x = (π/2 + ωt + 2πn)/k
    const phase0 = (Math.PI / 2 + om * t) / k;
    const crests: number[] = [];
    for (let nIdx = -20; nIdx < 20; nIdx++) {
      const xm = phase0 + nIdx * s.lambda;
      if (xm >= 0.25 && xm <= spanM - 0.25) crests.push(xm);
    }
    // λ entre las dos primeras crestas
    if (crests.length >= 2) {
      const x1 = left + crests[0]! * pxPerM;
      const x2 = left + crests[1]! * pxPerM;
      const yTop = mid - A - 22;
      ctx.strokeStyle = 'rgba(242,169,59,0.35)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, mid - A);
      ctx.lineTo(x1, yTop);
      ctx.moveTo(x2, mid - A);
      ctx.lineTo(x2, yTop);
      ctx.stroke();
      ctx.setLineDash([]);
      dimension(ctx, x1, yTop, x2, yTop, 'λ', ACCENT);
    }
    for (const xm of crests) {
      const x = left + xm * pxPerM;
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.arc(x, mid - A, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // valle y amplitud
    const troughs = crests.map((x) => x + s.lambda / 2).filter((x) => x <= spanM - 0.25);
    if (troughs.length) {
      const xt = left + troughs[troughs.length - 1]! * pxPerM;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('valle', xt, mid + A + 6);
    }
    if (crests.length) {
      const xc = left + crests[crests.length - 1]! * pxPerM;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('cresta', xc, mid - A - 6);
      const tr = troughs[0];
      if (tr !== undefined) {
        const xa = left + tr * pxPerM;
        dimension(ctx, xa, mid, xa, mid + A, 'A (amplitud)', '#95c99b', 'right');
      }
    }
    // partícula marcada en x = 1 m
    const xp = 1;
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(left + xp * pxPerM, y(xp), 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,119,92,0.35)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(left + xp * pxPerM, mid - A);
    ctx.lineTo(left + xp * pxPerM, mid + A);
    ctx.stroke();
    ctx.setLineDash([]);
    // dirección
    ctx.strokeStyle = MUTED;
    ctx.fillStyle = MUTED;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(right - 90, 18);
    ctx.lineTo(right - 10, 18);
    ctx.stroke();
    arrowHead(ctx, right - 10, 18, 0);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`v = ${fmt(s.lambda * s.freq, 3)} m/s`, right - 98, 18);
  } else {
    // Onda EM: campo E (vertical) y campo B (oblicuo, en perspectiva)
    const color = wavelengthToCss(s.nm);
    const lambdaPx = 60 + ((s.nm - 380) / 400) * 120; // escala ilustrativa
    const A = Math.min(52, h * 0.3);
    const k = (2 * Math.PI) / lambdaPx;
    const om = 2 * Math.PI * 0.6;
    // Eje de profundidad (z) en proyección oblicua: el campo B oscila en el plano horizontal.
    const zx = -0.32;
    const zy = 0.5;
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, mid);
    ctx.lineTo(right, mid);
    ctx.stroke();
    // B (gris): vectores y envolvente
    ctx.strokeStyle = 'rgba(188,179,166,0.28)';
    for (let x = left + 5; x <= right; x += 10) {
      const b = Math.sin(k * (x - left) - om * t) * A * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, mid);
      ctx.lineTo(x + b * zx, mid + b * zy);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(188,179,166,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = left; x <= right; x += 2) {
      const b = Math.sin(k * (x - left) - om * t) * A * 0.7;
      const xx = x + b * zx;
      const yy = mid + b * zy;
      if (x === left) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    // E con vectores
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    for (let x = left; x <= right; x += 10) {
      const e = Math.sin(k * (x - left) - om * t) * A;
      ctx.beginPath();
      ctx.moveTo(x, mid);
      ctx.lineTo(x, mid - e);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let x = left; x <= right; x += 2) {
      const e = Math.sin(k * (x - left) - om * t) * A;
      if (x === left) ctx.moveTo(x, mid - e);
      else ctx.lineTo(x, mid - e);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    // λ marcada
    const phase0 = (Math.PI / 2 + om * t) / k;
    let x1 = left + (((phase0 % lambdaPx) + lambdaPx) % lambdaPx);
    if (x1 < left + 30) x1 += lambdaPx;
    const x2 = x1 + lambdaPx;
    if (x2 < right - 10) dimension(ctx, x1, mid - A - 18, x2, mid - A - 18, `λ = ${s.nm} nm`, ACCENT);
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('E (campo eléctrico)', right, 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = MUTED;
    ctx.fillText('B (campo magnético)', left, h - 20);
    ctx.textAlign = 'right';
    ctx.fillText('c = 3·10⁸ m/s →', right, h - 20);
  }
}

function drawPlot(c: HTMLCanvasElement, t: number, s: { mode: WaveMode; lambda: number; freq: number; amp: number; nm: number }) {
  const { ctx, w, h } = fitCanvas(c);
  const left = 40;
  const right = w - 16;
  const mid = h / 2 + 4;
  const window = s.mode === 'cuerda' ? 6 : 3; // segundos (o unidades ralentizadas)
  const f = s.mode === 'cuerda' ? s.freq : 0.6;
  const A = (s.mode === 'cuerda' ? s.amp : 0.8) * (h * 0.32);
  const pxPerS = (right - left) / window;
  ctx.strokeStyle = FAINT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, mid);
  ctx.lineTo(right, mid);
  ctx.moveTo(left, 8);
  ctx.lineTo(left, h - 8);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = '500 11px "Inter Tight Variable", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s.mode === 'cuerda' ? 'y(t) del punto rojo' : 'E(t) en un punto fijo', left + 6, 4);
  ctx.textAlign = 'right';
  ctx.fillText('t →', right, mid + 4);
  // historial: la gráfica se desplaza: se muestra y(τ) para τ ∈ [t − window, t]
  const om = 2 * Math.PI * f;
  const k = s.mode === 'cuerda' ? (2 * Math.PI) / s.lambda : 0;
  const phaseX = s.mode === 'cuerda' ? k * 1 : 0;
  const yOf = (tau: number) => mid - A * Math.sin(phaseX - om * tau);
  ctx.strokeStyle = s.mode === 'cuerda' ? RED : wavelengthToCss(s.nm);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = left; x <= right; x += 2) {
    const tau = t - window + (x - left) / pxPerS;
    const yy = yOf(tau);
    if (x === left) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  // T entre dos máximos visibles
  const T = 1 / f;
  // máximos de sin(phaseX − ωτ) → mid − A: phaseX − ωτ = π/2 + 2πn → τ = (phaseX − π/2 − 2πn)/ω
  const peaks: number[] = [];
  for (let n = -400; n < 400; n++) {
    const tau = (phaseX - Math.PI / 2 - 2 * Math.PI * n) / om;
    if (tau >= t - window + 0.1 && tau <= t - 0.1) peaks.push(tau);
  }
  peaks.sort((a, b) => a - b);
  if (peaks.length >= 2) {
    const xA = left + (peaks[0]! - (t - window)) * pxPerS;
    const xB = left + (peaks[1]! - (t - window)) * pxPerS;
    const yy = Math.max(14, mid - A - 10);
    dimension(ctx, xA, yy, xB, yy, s.mode === 'cuerda' ? `T = ${fmt(T, 3)} s` : `T = ${sci(1 / fromWavelength(s.nm * 1e-9, EXERCISE_DATA).frequency, 3)} s`, ACCENT);
  }
  ctx.fillStyle = s.mode === 'cuerda' ? RED : wavelengthToCss(s.nm);
  ctx.beginPath();
  ctx.arc(right, yOf(t), 4, 0, Math.PI * 2);
  ctx.fill();
}

// ── Espectro electromagnético ─────────────────────────────────────────────

const VISIBLE_GRADIENT = `linear-gradient(90deg, ${Array.from({ length: 21 }, (_, i) => 380 + i * 20).map((l) => `${wavelengthToCss(l)} ${((l - 380) / 400) * 100}%`).join(', ')})`;

const EM_EXAMPLES: { label: string; lambda: number }[] = [
  { label: 'Rayos γ nucleares', lambda: 1e-12 },
  { label: 'Radiografía', lambda: 5e-11 },
  { label: 'Lámpara UV', lambda: 254e-9 },
  { label: 'Hα (Balmer)', lambda: 656.3e-9 },
  { label: 'Mando a distancia', lambda: 940e-9 },
  { label: 'Microondas (horno)', lambda: 0.122 },
  { label: 'Radio FM', lambda: 3.1 },
];

export function SpectrumWidget() {
  const [logL, setLogL] = useState(Math.log10(550e-9));
  const lambda = Math.pow(10, logL);
  const ph = fromWavelength(lambda, EXERCISE_DATA);
  const region = emRegion(lambda);
  const min = -12.5;
  const max = 1.5;
  const pos = (l: number) => ((Math.log10(l) - min) / (max - min)) * 100;
  const nm = lambda * 1e9;
  return (
    <WidgetFrame title="Recorre el espectro electromagnético" kind="calculo" caption="Escala logarítmica: cada marca multiplica λ por 10. Todas son la misma clase de onda, viajan a c en el vacío y solo se diferencian en λ (y por tanto en ν y E).">
      <div className="em-bar" aria-hidden="true">
        {EM_REGIONS.map((r) => {
          const a = Math.max(0, pos(Math.max(r.min, 10 ** min)));
          const b = Math.min(100, pos(Math.min(r.max, 10 ** max)));
          if (r.id === 'visible') return <span key={r.id} className="em-bar__seg em-bar__seg--vis" style={{ left: `${a}%`, width: `${b - a}%`, background: VISIBLE_GRADIENT }} />;
          return (
            <span key={r.id} className="em-bar__seg" data-active={region.id === r.id} style={{ left: `${a}%`, width: `${b - a}%` }}>
              <span>{r.name.replace('Ondas de ', '').replace('Rayos ', '')}</span>
            </span>
          );
        })}
        <span className="em-bar__cursor" style={{ left: `${pos(lambda)}%`, background: isVisible(nm) ? wavelengthToCss(nm) : 'var(--ink)' }} />
      </div>
      <div className="row row--between small faint" aria-hidden="true">
        <span>← más energía, más frecuencia</span>
        <span>más longitud de onda →</span>
      </div>
      <input type="range" aria-label="Longitud de onda (escala logarítmica)" min={min} max={max} step={0.01} value={logL} onChange={(e) => setLogL(Number(e.target.value))} style={{ width: '100%' }} />
      <div className="row row--wrap" style={{ gap: 6 }}>
        {EM_EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" className="btn btn--sm" onClick={() => setLogL(Math.log10(ex.lambda))}>
            {ex.label}
          </button>
        ))}
      </div>
      <dl className="kv kv--4">
        <div>
          <dt>Región</dt>
          <dd style={{ color: isVisible(nm) ? wavelengthToCss(nm) : 'var(--ink)' }}>{region.name}{isVisible(nm) ? ` · ${colorName(nm)}` : ''}</dd>
        </div>
        <div>
          <dt>λ</dt>
          <dd className="num">{sci(lambda, 3)} m</dd>
        </div>
        <div>
          <dt>ν = c/λ</dt>
          <dd className="num">{sci(ph.frequency, 3)} Hz</dd>
        </div>
        <div>
          <dt>E = h·ν</dt>
          <dd className="num">{sci(ph.energyJ, 3)} J</dd>
        </div>
      </dl>
      <div className="vis-strip" aria-hidden="true" style={{ background: VISIBLE_GRADIENT }}>
        <span>380 nm</span>
        <span>Visible ampliado (colores calculados con la CIE 1931)</span>
        <span>780 nm</span>
        {isVisible(nm) && <span className="vis-strip__cursor" style={{ left: `${((nm - 380) / 400) * 100}%` }} />}
      </div>
    </WidgetFrame>
  );
}

// ── Ecuación de Rydberg ───────────────────────────────────────────────────

export function RydbergWidget() {
  const [n1, setN1] = useState(2);
  const [n2, setN2] = useState(3);
  const hi = Math.max(n2, n1 + 1);
  const t = transition(hi, n1, EXERCISE_DATA);
  const nm = t.wavelength * 1e9;
  const series = seriesFor(n1);
  const levels = [1, 2, 3, 4, 5, 6, 7];
  const H = 300;
  const yOf = (n: number) => 22 + (levelEnergyEV(n, EXERCISE_DATA) / levelEnergyEV(1, EXERCISE_DATA)) * (H - 44);
  const lineColor = isVisible(nm) ? wavelengthToCss(nm) : INVISIBLE_LINE_CSS;
  return (
    <WidgetFrame title="Calcula una línea del hidrógeno" kind="calculo" caption="Datos de examen: R = 1,0974·10⁷ m⁻¹, h = 6,626·10⁻³⁴ J·s, c = 3·10⁸ m/s. Cada paso es el que debe aparecer en tu hoja.">
      <div className="widget__grid widget__grid--levels">
        <svg viewBox={`0 0 220 ${H}`} className="levels-svg" role="img" aria-label={`Salto del nivel ${hi} al nivel ${n1}`}>
          <text x="214" y="12" textAnchor="end" className="svg-faint">E = 0 (n → ∞)</text>
          <line x1="40" x2="214" y1={22} y2={22} className="svg-dash" />
          {levels.map((n) => (
            <g key={n}>
              <line x1="40" x2="214" y1={yOf(n)} y2={yOf(n)} className={n === n1 || n === hi ? 'svg-level svg-level--on' : 'svg-level'} />
              {n <= 4 && (
                <text x="34" y={yOf(n) + 4} textAnchor="end" className="svg-label">n = {n}</text>
              )}
              {n <= 3 && (
                <text x="214" y={yOf(n) + 13} textAnchor="end" className="svg-faint">{fmt(levelEnergyEV(n, EXERCISE_DATA), 3)} eV</text>
              )}
            </g>
          ))}
          <line x1="120" x2="120" y1={yOf(hi)} y2={yOf(n1) - 6} stroke={lineColor} strokeWidth="2.5" />
          <path d={`M114 ${yOf(n1) - 10} L120 ${yOf(n1) - 1} L126 ${yOf(n1) - 10}`} fill="none" stroke={lineColor} strokeWidth="2.5" />
          <path d={`M132 ${(yOf(hi) + yOf(n1)) / 2} q 8 -6 16 0 t 16 0 t 16 0`} fill="none" stroke={lineColor} strokeWidth="1.6" />
        </svg>
        <div className="stack-12">
          <div className="row row--wrap" style={{ gap: 12 }}>
            <Stepper label="n₁ (inferior)" value={n1} min={1} max={5} onChange={(v) => { setN1(v); if (n2 <= v) setN2(v + 1); }} />
            <Stepper label="n₂ (superior)" value={hi} min={n1 + 1} max={8} onChange={setN2} />
          </div>
          <ol className="calc-steps">
            <li>
              1/λ = R·(1/n₁² − 1/n₂²) = 1,0974·10⁷·(1/{n1 * n1} − 1/{hi * hi}) = <b>{sci(t.wavenumber, 4)} m⁻¹</b>
            </li>
            <li>
              λ = 1/(1/λ) = <b>{sci(t.wavelength, 4)} m</b> = {fmt(nm, 4)} nm
            </li>
            <li>
              ν = c/λ = <b>{sci(t.frequency, 4)} Hz</b>
            </li>
            <li>
              E = h·ν = <b>{sci(t.energyJ, 4)} J</b> = {fmt(t.energyEV, 3)} eV
            </li>
          </ol>
          <p className="small" style={{ margin: 0 }}>
            <span style={{ color: lineColor }}>■</span> Serie de <b>{series?.name ?? '—'}</b> (línea {t.lineIndex}.ª) · {t.region.name}
            {isVisible(nm) ? ` · ${colorName(nm)}` : ''}
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}

// ── Números cuánticos ─────────────────────────────────────────────────────

export function QuantumNumbersWidget() {
  const [n, setN] = useState(3);
  const [l, setL] = useState(1);
  const [m, setM] = useState(-1);
  const [s, setS] = useState(0.5);
  const v = validateQuantumSet({ n, l, ml: m, ms: s });
  return (
    <WidgetFrame title="¿Es posible esta combinación?" kind="calculo" caption="El árbol muestra todos los valores permitidos para el n elegido: cada nodo l es un subnivel y cada m, un orbital (2 electrones).">
      <div className="row row--wrap" style={{ gap: 12 }}>
        <Stepper label="n" value={n} min={0} max={5} onChange={setN} />
        <Stepper label="l" value={l} min={0} max={5} onChange={setL} />
        <Stepper label="m" value={m} min={-5} max={5} onChange={setM} format={(x) => (x > 0 ? `+${x}` : String(x))} />
        <Stepper label="s" value={s} min={-1} max={1} step={0.5} onChange={setS} format={(x) => (x === 0.5 ? '+½' : x === -0.5 ? '−½' : String(x))} />
      </div>
      {v.valid ? (
        <Feedback tone="ok">
          Posible: describe un electrón en un orbital <b>{v.orbital}</b> ({lLetter(l)}, orientación m = {m > 0 ? `+${m}` : m}) con espín {s > 0 ? '+½' : '−½'}.{v.note ? ` ${v.note}` : ''}
        </Feedback>
      ) : (
        <Feedback tone="bad">
          No es posible. {v.errors.map((e) => e.message).join(' ')}
        </Feedback>
      )}
      {n >= 1 && (
        <div className="qn-tree" aria-label={`Valores permitidos con n = ${n}`}>
          {Array.from({ length: n }, (_, li) => (
            <div key={li} className="qn-tree__l" data-on={li === l}>
              <span className="mono">
                l = {li} <span className="faint">({n}{lLetter(li)})</span>
              </span>
              <span className="qn-tree__m">
                {Array.from({ length: 2 * li + 1 }, (_, k) => k - li).map((mm) => (
                  <span key={mm} className="qn-box" data-on={li === l && mm === m}>
                    {mm > 0 ? `+${mm}` : mm}
                  </span>
                ))}
              </span>
              <span className="small faint">{2 * li + 1} orb. · {2 * (2 * li + 1)} e⁻</span>
            </div>
          ))}
          <p className="small muted" style={{ margin: 0 }}>
            Nivel n = {n}: {n * n} orbitales y {2 * n * n} electrones como máximo.
          </p>
        </div>
      )}
    </WidgetFrame>
  );
}

// ── Configuración electrónica (diagrama de Möller) ────────────────────────

export function ConfigurationWidget() {
  const [z, setZ] = useState(26);
  const conf = groundState(z);
  const el = elementByZ(z)!;
  const occ = new Map(conf.map((s) => [subshellLabel(s), s.e]));
  // Möller: filas por n, columnas por l; diagonales n + l
  const rows = [1, 2, 3, 4, 5, 6, 7];
  const cell = 44;
  const order = MADELUNG_ORDER.filter((s) => s.n <= 7 && s.l <= 3 && !(s.n === 7 && s.l > 1) && !(s.n === 6 && s.l > 2));
  return (
    <WidgetFrame title="Diagrama de Möller" kind="esquema" caption="Sigue las flechas diagonales: es el orden de energía creciente (n + l). Los subniveles se colorean según su ocupación en el estado fundamental.">
      <div className="widget__grid widget__grid--moller">
        <svg viewBox={`-6 -6 ${cell * 4 + 46} ${cell * 7 + 34}`} className="moller-svg" role="img" aria-label={`Orden de llenado hasta el ${el.name}`}>
          {/* diagonales */}
          {Array.from({ length: 8 }, (_, d) => d + 1).map((sum) => {
            const pts = order.filter((s) => s.n + s.l === sum);
            if (!pts.length) return null;
            const first = pts[0]!;
            const last = pts[pts.length - 1]!;
            const P = (s: { n: number; l: number }) => [28 + s.l * cell + cell / 2, 10 + (s.n - 1) * cell + cell / 2] as const;
            const [x1, y1] = P(first);
            const [x2, y2] = P(last);
            const ux = -Math.SQRT1_2;
            const uy = Math.SQRT1_2;
            const ex = x2 + ux * 26;
            const ey = y2 + uy * 26;
            return (
              <g key={sum} className="moller-diag">
                <line x1={x1 - ux * 22} y1={y1 - uy * 22} x2={ex} y2={ey} />
                <path d={`M${ex + 6} ${ey + 1} L${ex} ${ey} L${ex - 1} ${ey - 6}`} />
              </g>
            );
          })}
          {rows.map((n) =>
            [0, 1, 2, 3].map((l) => {
              if (l > n - 1) return null;
              const label = `${n}${lLetter(l)}`;
              const e = occ.get(label) ?? 0;
              const cap = 2 * (2 * l + 1);
              const x = 28 + l * cell + cell / 2;
              const y = 10 + (n - 1) * cell + cell / 2;
              const inOrder = order.some((s) => s.n === n && s.l === l);
              if (!inOrder) return null;
              return (
                <g key={label}>
                  <circle cx={x} cy={y} r={17} className="moller-node" style={{ fill: e ? BLOCK_COLOR[lLetter(l) as 's' | 'p' | 'd' | 'f'] : undefined, fillOpacity: e ? 0.25 + 0.75 * (e / cap) : undefined }} />
                  <text x={x} y={y + 4} textAnchor="middle" className="moller-text">
                    {label}
                    {e ? toSuperscript(e) : ''}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
        <div className="stack-12">
          <Slider id="cfg-z" label="Elemento" value={z} min={1} max={56} step={1} onChange={setZ} display={`${el.symbol} · Z = ${z}`} />
          <div className="config-readout">
            <span className="mono">{formatConfiguration(conf)}</span>
            <span className="mono faint">{formatConfiguration(conf, { abbreviate: true })}</span>
          </div>
          <dl className="kv kv--3">
            <div>
              <dt>Capa de valencia</dt>
              <dd className="num">n = {valenceShell(conf)}</dd>
            </div>
            <div>
              <dt>e⁻ de valencia</dt>
              <dd className="num">{valenceElectrons(conf)}</dd>
            </div>
            <div>
              <dt>Desapareados</dt>
              <dd className="num">{unpairedElectrons(conf)}</dd>
            </div>
          </dl>
          <div className="boxes-row" aria-label="Diagrama de cajas de los subniveles externos">
            {conf.slice(-3).map((s) => (
              <span key={subshellLabel(s)} className="boxes-sub">
                <span className="boxes-cells">
                  {orbitalBoxes(s.l, s.e).map((b, i) => (
                    <span key={i} className="box-cell">{b === 2 ? '↑↓' : b === 1 ? '↑' : ''}</span>
                  ))}
                </span>
                <span className="mono small faint">{subshellLabel(s)}</span>
              </span>
            ))}
          </div>
          {[24, 29, 42, 47].includes(z) && (
            <Feedback tone="warn">
              Excepción: el {el.name.toLowerCase()} real es {el.groundConfigText.replace(/(\d)([spdf])(\d+)/g, (_, n, l, e) => `${n}${l}${toSuperscript(e)}`)}; Möller predice {formatConfiguration(conf, { abbreviate: true })}.
            </Feedback>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}

// ── Tendencias periódicas ─────────────────────────────────────────────────

const TREND_ELEMENTS = ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Br', 'Rb', 'I', 'Cs'];

export function TrendsWidget() {
  const [prop, setProp] = useState<PropertyId>('radio');
  const [a, setA] = useState('Na');
  const [b, setB] = useState('Cl');
  const A = elementBySymbol(a)!;
  const B = elementBySymbol(b)!;
  const cmp = useMemo(() => compare(prop, A, B), [prop, A, B]);
  const P = PROPERTIES[prop];
  const va = P.get(A);
  const vb = P.get(B);
  const arrows: Record<string, { period: string; group: string }> = {
    radio: { period: '← crece hacia la izquierda', group: '↓ crece hacia abajo' },
    ei1: { period: '→ crece hacia la derecha', group: '↑ crece hacia arriba' },
    ae: { period: '→ crece hacia la derecha', group: '↑ crece hacia arriba' },
    en: { period: '→ crece hacia la derecha', group: '↑ crece hacia arriba' },
  };
  return (
    <WidgetFrame title="Compara dos elementos y razónalo" kind="calculo" caption="Datos reales (NIST, CRC, Pyykkö). El razonamiento es el que se pide en el examen: situar, comparar Z_ef o número de capas, concluir.">
      <div className="segmented" role="radiogroup" aria-label="Propiedad" style={{ flexWrap: 'wrap', alignSelf: 'flex-start' }}>
        {(['radio', 'ei1', 'ae', 'en'] as PropertyId[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={prop === p} onClick={() => setProp(p)}>
            {PROPERTIES[p].short}
          </button>
        ))}
      </div>
      <div className="row row--wrap" style={{ gap: 12 }}>
        {[
          [a, setA],
          [b, setB],
        ].map(([val, set], i) => (
          <label key={i} className="field" style={{ gap: 4 }}>
            <span className="label">Elemento {i === 0 ? 'A' : 'B'}</span>
            <select className="input" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}>
              {TREND_ELEMENTS.map((s) => (
                <option key={s} value={s}>
                  {s} — {elementBySymbol(s)!.name} (periodo {elementBySymbol(s)!.period}, grupo {elementBySymbol(s)!.group})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="trend-bars">
        {[
          [A, va],
          [B, vb],
        ].map(([el, v]) => {
          const e = el as typeof A;
          const val = v as number | null;
          const maxV = Math.max(va ?? 0, vb ?? 0) || 1;
          return (
            <div key={e.symbol} className="trend-bar">
              <span className="mono">{e.symbol}</span>
              <span className="trend-bar__track">
                <span style={{ width: `${((val ?? 0) / maxV) * 100}%`, background: cmp.actual === e ? 'var(--accent)' : 'var(--hairline-strong)' }} />
              </span>
              <span className="mono small">{val === null ? 'sin dato' : `${formatNumber(val, { sig: P.digits })} ${P.unit}`}</span>
            </div>
          );
        })}
      </div>
      <ol className="calc-steps">
        {cmp.reasoning.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
      {cmp.exception && <Feedback tone="warn">Excepción: {cmp.exception}</Feedback>}
      {arrows[prop] && (
        <p className="small muted" style={{ margin: 0 }}>
          Regla para {P.label.toLowerCase()}: en un periodo {arrows[prop]!.period.slice(2)}; en un grupo {arrows[prop]!.group.slice(2)}.
        </p>
      )}
    </WidgetFrame>
  );
}

// ── Masa atómica media ────────────────────────────────────────────────────

const MASS_PRESETS: { label: string; peaks: { mass: number; abundance: number; label: string }[] }[] = [
  { label: 'Cloro', peaks: [{ label: '³⁵Cl', mass: 34.969, abundance: 75.77 }, { label: '³⁷Cl', mass: 36.966, abundance: 24.23 }] },
  { label: 'Boro', peaks: [{ label: '¹⁰B', mass: 10.013, abundance: 19.9 }, { label: '¹¹B', mass: 11.009, abundance: 80.1 }] },
  { label: 'Magnesio', peaks: [{ label: '²⁴Mg', mass: 23.985, abundance: 78.99 }, { label: '²⁵Mg', mass: 24.986, abundance: 10.0 }, { label: '²⁶Mg', mass: 25.983, abundance: 11.01 }] },
];

/**
 * Fija la abundancia del isótopo i y reparte el resto (100 − v) entre los demás en proporción a sus
 * valores actuales (a partes iguales si todos valen 0). Así la suma es siempre 100 %.
 */
export function rebalance<T extends { abundance: number }>(peaks: T[], i: number, v: number): T[] {
  const val = Math.min(100, Math.max(0, v));
  const others = peaks.reduce((a, p, j) => (j === i ? a : a + p.abundance), 0);
  const rest = 100 - val;
  const n = peaks.length - 1;
  return peaks.map((p, j) => (j === i ? { ...p, abundance: val } : { ...p, abundance: others > 0 ? (p.abundance / others) * rest : rest / Math.max(1, n) }));
}

export function MassAverageWidget() {
  const [preset, setPreset] = useState(0);
  const [peaks, setPeaks] = useState(MASS_PRESETS[0]!.peaks);
  const res = averageAtomicMass(peaks);
  const lo = Math.min(...peaks.map((p) => p.mass)) - 0.8;
  const hi = Math.max(...peaks.map((p) => p.mass)) + 0.8;
  const xp = (m: number) => ((m - lo) / (hi - lo)) * 100;
  return (
    <WidgetFrame title="Espectro de masas → masa atómica" kind="calculo" caption="Cada barra es un isótopo: su posición es la masa y su altura, la abundancia. La media ponderada cae cerca del isótopo más abundante.">
      <div className="segmented" role="radiogroup" aria-label="Elemento" style={{ alignSelf: 'flex-start' }}>
        {MASS_PRESETS.map((p, i) => (
          <button key={p.label} type="button" role="radio" aria-checked={preset === i} onClick={() => { setPreset(i); setPeaks(p.peaks); }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="ms-plot" aria-hidden="true">
        {peaks.map((p) => (
          <span key={p.label} className="ms-plot__bar" style={{ left: `${xp(p.mass)}%`, height: `${p.abundance}%` }}>
            <span>{p.label}</span>
          </span>
        ))}
        {Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => Math.ceil(lo) + i).map((m) => (
          <span key={m} className="ms-plot__tick" style={{ left: `${xp(m)}%` }}>
            {m}
          </span>
        ))}
        <span className="ms-plot__axis">masa (u)</span>
        <span className="ms-plot__mean" style={{ left: `${xp(res.value)}%` }}>
          <span>M = {fmt(res.value, 4)} u</span>
        </span>
      </div>
      <div className="stack-8">
        {peaks.map((p, i) => (
          <Slider
            key={p.label}
            id={`ms-${i}`}
            label={`${p.label} (${fmt(p.mass, 5)} u)`}
            value={p.abundance}
            min={0}
            max={100}
            step={0.01}
            onChange={(v) => setPeaks(rebalance(peaks, i, v))}
            display={`${fmt(p.abundance, 4)} %`}
          />
        ))}
      </div>
      <div className="formula-live">
        <span>
          M = ({peaks.map((p) => `${fmt(p.mass, 5)}·${fmt(p.abundance, 4)}`).join(' + ')}) / 100 = <b>{fmt(res.value, 4)} u</b>
        </span>
      </div>
      {res.abundancesInconsistent && <Feedback tone="warn">Las abundancias suman {fmt(res.abundanceSum, 4)} %, no 100 %. Revisa los datos: en el examen, esto indica un error en el enunciado o en tu lectura.</Feedback>}
    </WidgetFrame>
  );
}

// ── Modelos atómicos ──────────────────────────────────────────────────────

const MODELS = [
  { id: 'dalton', year: '1808', name: 'Dalton', idea: 'Esfera maciza e indivisible.', exp: 'Leyes ponderales de la química.', fail: 'No explica la electricidad ni la radiactividad: el átomo tiene partes.' },
  { id: 'thomson', year: '1904', name: 'Thomson', idea: 'Esfera positiva con electrones incrustados.', exp: 'Tubo de rayos catódicos (descubre el electrón).', fail: 'No explica que algunas partículas α reboten en la lámina de oro.' },
  { id: 'rutherford', year: '1911', name: 'Rutherford', idea: 'Núcleo diminuto y positivo; electrones girando alrededor.', exp: 'Lámina de oro de Geiger y Marsden.', fail: 'Según Maxwell, el electrón radiaría y caería al núcleo; no explica los espectros de líneas.' },
  { id: 'bohr', year: '1913', name: 'Bohr', idea: 'Órbitas permitidas con energía cuantizada.', exp: 'Espectro de líneas del hidrógeno.', fail: 'Solo funciona para el hidrógeno; no explica el desdoblamiento de líneas.' },
  { id: 'cuantico', year: '1926', name: 'Mecanocuántico', idea: 'Orbitales: regiones de probabilidad, no trayectorias.', exp: 'Dualidad onda-partícula e incertidumbre.', fail: 'Modelo vigente.' },
] as const;

function ModelPictogram({ id }: { id: (typeof MODELS)[number]['id'] }) {
  switch (id) {
    case 'dalton':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <defs>
            <radialGradient id="g-dal" cx="35%" cy="35%">
              <stop offset="0" stopColor="#d9cfc2" />
              <stop offset="1" stopColor="#5d564d" />
            </radialGradient>
          </defs>
          <circle cx="40" cy="40" r="26" fill="url(#g-dal)" />
        </svg>
      );
    case 'thomson':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="27" fill="rgba(232,119,92,0.28)" stroke="rgba(232,119,92,0.6)" />
          {[[30, 30], [50, 28], [40, 42], [28, 50], [52, 50], [40, 58], [22, 38], [58, 40]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.2" fill="#a9cdf5" />
          ))}
        </svg>
      );
    case 'rutherford':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          {[0, 60, 120].map((r) => (
            <ellipse key={r} cx="40" cy="40" rx="30" ry="10" fill="none" stroke="rgba(169,205,245,0.45)" transform={`rotate(${r} 40 40)`} />
          ))}
          <circle cx="40" cy="40" r="3.5" fill="#e8775c" />
          <circle cx="70" cy="40" r="2.6" fill="#a9cdf5" />
          <circle cx="25" cy="14" r="2.6" fill="#a9cdf5" />
        </svg>
      );
    case 'bohr':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          {[10, 20, 31].map((r) => (
            <circle key={r} cx="40" cy="40" r={r} fill="none" stroke="rgba(242,169,59,0.5)" />
          ))}
          <circle cx="40" cy="40" r="3.5" fill="#e8775c" />
          <circle cx="60" cy="40" r="2.6" fill="#a9cdf5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <defs>
            <radialGradient id="g-cl">
              <stop offset="0" stopColor="rgba(169,205,245,0.85)" />
              <stop offset="0.55" stopColor="rgba(169,205,245,0.25)" />
              <stop offset="1" stopColor="rgba(169,205,245,0)" />
            </radialGradient>
          </defs>
          <circle cx="40" cy="40" r="30" fill="url(#g-cl)" />
          <circle cx="40" cy="40" r="2.5" fill="#e8775c" />
        </svg>
      );
  }
}

export function ModelsWidget() {
  const [sel, setSel] = useState(2);
  const m = MODELS[sel]!;
  return (
    <WidgetFrame title="Línea temporal de modelos" kind="historico" caption="Ningún modelo superado es «falso del todo»: cada uno explica bien el experimento para el que se diseñó.">
      <div className="models-row" role="tablist" aria-label="Modelos atómicos">
        {MODELS.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={sel === i} className="model-chip" onClick={() => setSel(i)}>
            <ModelPictogram id={x.id} />
            <span className="small">{x.name}</span>
            <span className="mono small faint">{x.year}</span>
          </button>
        ))}
      </div>
      <dl className="kv kv--3">
        <div>
          <dt>Cómo es</dt>
          <dd className="small">{m.idea}</dd>
        </div>
        <div>
          <dt>Experimento clave</dt>
          <dd className="small">{m.exp}</dd>
        </div>
        <div>
          <dt>Por qué se abandona</dt>
          <dd className="small">{m.fail}</dd>
        </div>
      </dl>
    </WidgetFrame>
  );
}

// ── Partículas subatómicas ────────────────────────────────────────────────

export function ParticlesWidget() {
  const rows = [
    { p: PARTICLES.proton, color: 'var(--proton)', who: 'Rutherford, 1919' },
    { p: PARTICLES.neutron, color: 'var(--neutron)', who: 'Chadwick, 1932' },
    { p: PARTICLES.electron, color: 'var(--electron)', who: 'Thomson, 1897' },
  ];
  const ratio = PARTICLES.proton.massKg / PARTICLES.electron.massKg;
  return (
    <WidgetFrame title="Las tres partículas" kind="calculo" caption={`Valores CODATA 2018. El protón pesa ${fmt(ratio, 4)} veces más que el electrón.`}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Partícula</th>
              <th>Carga (C)</th>
              <th>Carga relativa</th>
              <th>Masa (kg)</th>
              <th>Masa (u)</th>
              <th>Dónde</th>
              <th>Descubrimiento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, color, who }) => (
              <tr key={p.name}>
                <td style={{ color }}>{p.name}</td>
                <td className="mono">{p.chargeC === 0 ? '0' : sci(p.chargeC, 4)}</td>
                <td className="mono">{p.relativeCharge > 0 ? '+1' : p.relativeCharge < 0 ? '−1' : '0'}</td>
                <td className="mono">{sci(p.massKg, 4)}</td>
                <td className="mono">{formatNumber(p.massU, { sig: 4 })}</td>
                <td>{p.location}</td>
                <td className="small muted">{who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mass-compare" aria-hidden="true">
        <span className="mass-compare__p" />
        <span className="mass-compare__e" />
        <span className="small faint">Masa a escala: el punto del electrón es 1/{Math.round(ratio)} del área del protón.</span>
      </div>
    </WidgetFrame>
  );
}

// ── Problema inverso de Rydberg (despeje guiado) ──────────────────────────

const INV_PRESETS = [
  { label: 'AMP 9 · Paschen 2,34·10¹⁴ Hz', n1: 3, kind: 'nu' as const, value: 2.34e14 },
  { label: 'HOJ 11 · Balmer 389 nm', n1: 2, kind: 'lambda' as const, value: 389 },
  { label: 'Hβ · Balmer 486,1 nm', n1: 2, kind: 'lambda' as const, value: 486.1 },
  { label: 'Lyman 102,6 nm', n1: 1, kind: 'lambda' as const, value: 102.6 },
];

export function RydbergInverseWidget() {
  const R = 1.097e7;
  const c = 3e8;
  const [n1, setN1] = useState(3);
  const [kind, setKind] = useState<'lambda' | 'nu'>('nu');
  const [text, setText] = useState('2,34e14');
  const value = Number(text.replace(',', '.').replace(/·10\^?/, 'e').replace(/\s/g, ''));
  const ok = Number.isFinite(value) && value > 0;
  const w = !ok ? NaN : kind === 'lambda' ? 1 / (value * 1e-9) : value / c;
  const x = w / R;
  const inv = 1 / (n1 * n1) - x;
  const n2sq = 1 / inv;
  const n2 = Math.sqrt(n2sq);
  const nearest = Math.round(n2);
  const integerOk = inv > 0 && Math.abs(n2 - nearest) < 0.06 && nearest > n1;
  const series = seriesFor(n1);
  const limitNm = (n1 * n1) / R * 1e9;
  const step = (op: string, eq: ReactNode, note: string) => (
    <li className="deriv__step">
      <span className="deriv__op">{op}</span>
      <span className="deriv__eq mono">{eq}</span>
      <span className="deriv__why">{note}</span>
    </li>
  );
  return (
    <WidgetFrame title="Despeja n₂ paso a paso" kind="calculo" caption="Cada línea es una transformación de la ecuación de Rydberg: lo que se hace a un miembro se hace al otro. R = 1,097·10⁷ m⁻¹ y c = 3·10⁸ m/s.">
      <div className="row row--wrap" style={{ gap: 6 }}>
        {INV_PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn btn--sm" onClick={() => { setN1(p.n1); setKind(p.kind); setText(p.kind === 'nu' ? String(p.value).replace('e+', 'e') : String(p.value).replace('.', ',')); }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="row row--wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
        <label className="field" style={{ gap: 4 }}>
          <span className="label">Serie (n₁)</span>
          <select className="input" value={n1} onChange={(e) => setN1(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((k) => (
              <option key={k} value={k}>
                {seriesFor(k)?.name} · n₁ = {k}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="radiogroup" aria-label="Dato">
          <button type="button" role="radio" aria-checked={kind === 'lambda'} onClick={() => setKind('lambda')}>λ (nm)</button>
          <button type="button" role="radio" aria-checked={kind === 'nu'} onClick={() => setKind('nu')}>ν (Hz)</button>
        </div>
        <label className="field" style={{ gap: 4 }}>
          <span className="label">{kind === 'lambda' ? 'Longitud de onda (nm)' : 'Frecuencia (Hz), p. ej. 2,34e14'}</span>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} inputMode="decimal" />
        </label>
      </div>
      {ok ? (
        <ol className="deriv">
          {step('Partimos de', <>1/λ = R·(1/n₁² − 1/n₂²)</>, `Serie de ${series?.name ?? '—'}: n₁ = ${n1}. La incógnita es n₂.`)}
          {step(kind === 'lambda' ? 'Calculamos 1/λ' : 'ν → 1/λ = ν/c', <>1/λ = {sci(w, 4)} m⁻¹</>, kind === 'lambda' ? `λ = ${fmt(value, 4)} nm = ${sci(value * 1e-9, 4)} m.` : `${sci(value, 3)} Hz / 3·10⁸ m/s.`)}
          {step('÷ R en los dos miembros', <>(1/λ)/R = 1/{n1 * n1} − 1/n₂² = {fmt(x, 4)}</>, 'Así el paréntesis queda solo. Es un número sin unidades.')}
          {step('Despejamos 1/n₂²', <>1/n₂² = 1/{n1 * n1} − {fmt(x, 4)} = {fmt(inv, 4)}</>, 'Pasamos 1/n₂² a un lado y el resto al otro (cambia de signo).')}
          {inv > 0 ? (
            <>
              {step('Invertimos', <>n₂² = 1/{fmt(inv, 4)} = {fmt(n2sq, 4)}</>, 'Si a = b, entonces 1/a = 1/b.')}
              {step('Raíz cuadrada', <>n₂ = √{fmt(n2sq, 4)} = {fmt(n2, 4)}</>, integerOk ? `≈ ${nearest}: la línea ${nearest} → ${n1}, ${['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'][nearest - n1 - 1] ?? `${nearest - n1}.ª`} línea de ${series?.name}.` : 'No sale un entero: con estos datos no hay ninguna línea del hidrógeno en esta serie.')}
            </>
          ) : (
            <li className="deriv__step deriv__step--bad">
              <span className="deriv__op">Sin solución</span>
              <span className="deriv__eq mono">1/n₂² ≤ 0</span>
              <span className="deriv__why">La λ es menor que el límite de la serie de {series?.name} ({fmt(limitNm, 4)} nm) o la frecuencia es demasiado alta: ningún salto a n₁ = {n1} emite esa radiación.</span>
            </li>
          )}
        </ol>
      ) : (
        <Feedback tone="info">Escribe un número positivo (por ejemplo 389 o 2,34e14).</Feedback>
      )}
    </WidgetFrame>
  );
}

export function GuideWidget({ id }: { id: string }) {
  switch (id) {
    case 'notacion':
      return <NotationWidget />;
    case 'rydberg-inverso':
      return <RydbergInverseWidget />;
    case 'onda':
      return <WaveWidget />;
    case 'espectro-em':
      return <SpectrumWidget />;
    case 'rydberg':
      return <RydbergWidget />;
    case 'numeros-cuanticos':
      return <QuantumNumbersWidget />;
    case 'configuracion':
      return <ConfigurationWidget />;
    case 'tendencias':
      return <TrendsWidget />;
    case 'masa-media':
      return <MassAverageWidget />;
    case 'modelos':
      return <ModelsWidget />;
    case 'particulas':
      return <ParticlesWidget />;
    default:
      return null;
  }
}
