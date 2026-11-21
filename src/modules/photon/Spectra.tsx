import { useEffect, useRef } from 'react';
import { wavelengthToCss, isVisible, INVISIBLE_LINE_CSS, EM_REGIONS } from '../../science/photon';
import type { DetectedLine } from './state';
import { formatNumber } from '../../science/numbers';

/**
 * Detector del Photon Lab: eje logarítmico de 80 nm a 8 µm con las zonas UV, visible e IR.
 * Las líneas visibles llevan su color calculado; las invisibles, un gris neutro y su etiqueta.
 */
const LMIN = 80;
const LMAX = 8000;
const xOf = (nm: number) => (Math.log10(nm / LMIN) / Math.log10(LMAX / LMIN)) * 100;

export function DetectorStrip({ lines, highlightStamp }: { lines: DetectedLine[]; highlightStamp?: number }) {
  const ticks = [100, 200, 400, 700, 1000, 2000, 4000, 8000];
  return (
    <figure style={{ margin: 0 }} aria-label="Detector de líneas espectrales">
      <svg viewBox="0 0 100 26" preserveAspectRatio="none" style={{ width: '100%', height: 84, display: 'block', borderRadius: 8, background: '#070606', border: '1px solid var(--hairline)' }} role="img" aria-hidden="true">
        <defs>
          <linearGradient id="visband" x1="0" x2="1">
            {[380, 420, 460, 500, 540, 580, 620, 660, 700, 780].map((nm) => (
              <stop key={nm} offset={(nm - 380) / 400} stopColor={wavelengthToCss(nm)} stopOpacity={0.16} />
            ))}
          </linearGradient>
        </defs>
        <rect x={xOf(LMIN)} y={0} width={xOf(380)} height={26} fill="rgb(140 120 200 / 0.05)" />
        <rect x={xOf(380)} y={0} width={xOf(780) - xOf(380)} height={26} fill="url(#visband)" />
        <rect x={xOf(780)} y={0} width={100 - xOf(780)} height={26} fill="rgb(200 110 90 / 0.04)" />
        {lines.map((d) => {
          const nm = d.t.wavelength * 1e9;
          const x = xOf(nm);
          const vis = isVisible(nm);
          const hi = d.stamp === highlightStamp;
          return <rect key={`${d.t.from}-${d.t.to}-${d.stamp}`} x={x - (hi ? 0.28 : 0.18)} y={2} width={hi ? 0.56 : 0.36} height={22} fill={vis ? wavelengthToCss(nm) : INVISIBLE_LINE_CSS} opacity={d.t.type === 'absorcion' ? 0.55 : 1} />;
        })}
      </svg>
      <div style={{ position: 'relative', height: 30, marginTop: 4 }} aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className="mono faint" style={{ position: 'absolute', left: `${xOf(t)}%`, transform: 'translateX(-50%)', fontSize: 10 }}>
            {t >= 1000 ? `${t / 1000} µm` : `${t} nm`}
          </span>
        ))}
        <span className="eyebrow" style={{ position: 'absolute', left: `${xOf(140)}%`, top: 14, fontSize: 9, transform: 'translateX(-50%)' }}>
          UV
        </span>
        <span className="eyebrow" style={{ position: 'absolute', left: `${xOf(540)}%`, top: 14, fontSize: 9, transform: 'translateX(-50%)' }}>
          Visible
        </span>
        <span className="eyebrow" style={{ position: 'absolute', left: `${xOf(2500)}%`, top: 14, fontSize: 9, transform: 'translateX(-50%)' }}>
          Infrarrojo
        </span>
      </div>
      <figcaption className="sr-only">
        {lines.length ? `Líneas detectadas: ${lines.map((d) => `${formatNumber(d.t.wavelength * 1e9, { sig: 4 })} nm`).join(', ')}` : 'Sin líneas detectadas'}
      </figcaption>
    </figure>
  );
}

/** Espectro visible (380–720 nm) de emisión o absorción dibujado en canvas con colores calculados. */
export function VisibleSpectrum({ lines, mode, height = 64, label }: { lines: { lambdaNm: number; intensity: number }[]; mode: 'emision' | 'absorcion'; height?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    c.width = Math.round(w * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const L0 = 380;
    const L1 = 720;
    const x = (nm: number) => ((nm - L0) / (L1 - L0)) * w;
    if (mode === 'absorcion') {
      for (let px = 0; px < w; px++) {
        const nm = L0 + (px / w) * (L1 - L0);
        ctx.fillStyle = wavelengthToCss(nm);
        ctx.fillRect(px, 0, 1, height);
      }
      for (const l of lines) {
        ctx.fillStyle = `rgba(7,6,6,${0.55 + 0.45 * Math.min(1, l.intensity * 1.5 + 0.2)})`;
        ctx.fillRect(x(l.lambdaNm) - 1.2, 0, 2.4, height);
      }
    } else {
      ctx.fillStyle = '#070606';
      ctx.fillRect(0, 0, w, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lines) {
        const a = 0.35 + 0.65 * Math.min(1, Math.sqrt(l.intensity));
        ctx.fillStyle = wavelengthToCss(l.lambdaNm);
        ctx.globalAlpha = a;
        ctx.fillRect(x(l.lambdaNm) - 1.4, 0, 2.8, height);
        ctx.globalAlpha = a * 0.25;
        ctx.fillRect(x(l.lambdaNm) - 4, 0, 8, height);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [lines, mode, height]);
  return (
    <figure style={{ margin: 0 }}>
      <canvas ref={ref} style={{ width: '100%', height, display: 'block', borderRadius: 6, border: '1px solid var(--hairline)' }} role="img" aria-label={`${label}: líneas en ${lines.map((l) => formatNumber(l.lambdaNm, { sig: 4 })).join(', ')} nm`} />
    </figure>
  );
}

export function VisibleAxis() {
  return (
    <div style={{ position: 'relative', height: 16 }} aria-hidden="true">
      {[400, 450, 500, 550, 600, 650, 700].map((nm) => (
        <span key={nm} className="mono faint" style={{ position: 'absolute', left: `${((nm - 380) / 340) * 100}%`, transform: 'translateX(-50%)', fontSize: 10 }}>
          {nm}
        </span>
      ))}
    </div>
  );
}

/** Banda del espectro electromagnético con marcador (escala logarítmica de 1 pm a 10 km). */
export function EMBand({ lambdaM }: { lambdaM: number }) {
  const lo = -12;
  const hi = 4;
  const pos = (m: number) => ((Math.log10(m) - lo) / (hi - lo)) * 100;
  const regions = EM_REGIONS.map((r) => ({ ...r, a: pos(Math.max(r.min, 1e-12)), b: pos(Math.min(r.max, 1e4)) }));
  const x = Math.min(100, Math.max(0, pos(lambdaM)));
  return (
    <figure style={{ margin: 0 }} aria-label="Espectro electromagnético">
      <div style={{ position: 'relative', height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--hairline)', background: '#0a0908' }}>
        {regions.map((r, i) => (
          <div key={r.id} style={{ position: 'absolute', left: `${r.a}%`, width: `${r.b - r.a}%`, top: 0, bottom: 0, borderLeft: i ? '1px solid var(--hairline)' : 'none', background: r.id === 'visible' ? `linear-gradient(90deg, ${[390, 430, 470, 510, 550, 590, 630, 670, 710].map((nm) => wavelengthToCss(nm)).join(', ')})` : 'transparent', opacity: r.id === 'visible' ? 0.85 : 1 }}>
            {r.id !== 'visible' && (
              <span className="faint" style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 10, whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
            )}
          </div>
        ))}
        <div style={{ position: 'absolute', left: `${x}%`, top: 0, bottom: 0, width: 2, marginLeft: -1, background: 'var(--ink)', boxShadow: '0 0 10px var(--ink)', transition: 'left var(--dur-fast) var(--ease-std)' }} />
      </div>
      <div style={{ position: 'relative', height: 14, marginTop: 4 }} aria-hidden="true">
        {([[1e-12, '1 pm'], [1e-9, '1 nm'], [1e-6, '1 µm'], [1e-3, '1 mm'], [1, '1 m'], [1e4, '10 km']] as const).map(([m, t], i, arr) => (
          <span key={t} className="mono faint" style={{ position: 'absolute', left: `${pos(m)}%`, transform: i === 0 ? 'none' : i === arr.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', fontSize: 10, whiteSpace: 'nowrap' }}>
            {t}
          </span>
        ))}
      </div>
    </figure>
  );
}
