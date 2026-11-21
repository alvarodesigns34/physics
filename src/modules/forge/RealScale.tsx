/**
 * Escala real del átomo: radio nuclear R = r₀·A^(1/3) (r₀ = 1,2 fm) frente al radio atómico
 * (radio covalente). Un zoom logarítmico recorre cinco órdenes de magnitud sin trampas de escala.
 */
import { useEffect, useRef, useState } from 'react';
import { elementByZ } from '../../science/elements';
import { formatNumber } from '../../science/numbers';
import { EpiTag } from '../../ui/common';

const fmt = (v: number, sig = 3) => formatNumber(v, { sig });

export function nuclearRadiusFm(a: number): number {
  return 1.2 * Math.cbrt(a);
}

/** Escala gráfica «bonita»: 1, 2 o 5 × 10ⁿ. */
function niceLength(m: number): number {
  const e = Math.floor(Math.log10(m));
  const f = m / 10 ** e;
  return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * 10 ** e;
}

function lengthLabel(m: number): string {
  if (m >= 1e-9) return `${fmt(m * 1e9, 2)} nm`;
  if (m >= 1e-12) return `${fmt(m * 1e12, 2)} pm`;
  return `${fmt(m * 1e15, 2)} fm`;
}

export function RealScale({ z, a }: { z: number; a: number }) {
  const el = elementByZ(z);
  const [zoom, setZoom] = useState(0); // 0 = átomo completo; 1 = núcleo llena el visor
  const ref = useRef<HTMLCanvasElement>(null);
  const rAtom = (el?.covalentRadius ?? 100) * 1e-12; // m
  const rNuc = nuclearRadiusFm(Math.max(1, a)) * 1e-15; // m
  const ratio = rAtom / rNuc;
  // Campo de visión (semilado, en m) interpolado en escala logarítmica entre el átomo y el núcleo.
  const fovHalf = Math.exp(Math.log(rAtom * 1.25) * (1 - zoom) + Math.log(rNuc * 2.2) * zoom);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#070606';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const pxPerM = Math.min(w, h) / 2 / fovHalf;
    // Nube: degradado radial hasta el radio atómico
    const ra = rAtom * pxPerM;
    if (ra < 1e6) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ra);
      g.addColorStop(0, 'rgba(169,205,245,0.30)');
      g.addColorStop(0.7, 'rgba(169,205,245,0.12)');
      g.addColorStop(1, 'rgba(169,205,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(ra, 4 * Math.max(w, h)), 0, Math.PI * 2);
      ctx.fill();
      if (ra < Math.max(w, h)) {
        ctx.strokeStyle = 'rgba(169,205,245,0.55)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, ra, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Núcleo: si mide menos de 1 px se marca con un anillo
    const rn = rNuc * pxPerM;
    ctx.fillStyle = '#e8775c';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(rn, 0.6), 0, Math.PI * 2);
    ctx.fill();
    if (rn < 3) {
      ctx.strokeStyle = 'rgba(232,119,92,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(232,119,92,0.95)';
      ctx.font = '500 11px "Inter Tight Variable", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(rn < 0.5 ? 'núcleo (menor que un píxel)' : 'núcleo', cx + 13, cy + 4);
    }
    // Barra de escala
    const L = niceLength(fovHalf * 0.6);
    const lp = L * pxPerM;
    ctx.strokeStyle = '#ece6dc';
    ctx.fillStyle = '#ece6dc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, h - 16);
    ctx.lineTo(14 + lp, h - 16);
    ctx.moveTo(14, h - 20);
    ctx.lineTo(14, h - 12);
    ctx.moveTo(14 + lp, h - 20);
    ctx.lineTo(14 + lp, h - 12);
    ctx.stroke();
    ctx.font = '500 11px "JetBrains Mono Variable", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(lengthLabel(L), 14, h - 26);
  }, [fovHalf, rAtom, rNuc]);

  if (!el) return null;
  const marble = 0.01; // m: canica de 1 cm de radio
  const atomIfMarble = marble * ratio;
  return (
    <section className="section" aria-label="Escala real">
      <span className="eyebrow">Escala real</span>
      <canvas ref={ref} style={{ width: '100%', height: 200, borderRadius: 'var(--r-inner)', border: '1px solid var(--hairline)', display: 'block' }} role="img" aria-label={`Átomo de ${el.name.toLowerCase()} a escala: radio atómico ${fmt(rAtom * 1e12)} pm y radio nuclear ${fmt(rNuc * 1e15)} fm`} />
      <div className="field" style={{ gap: 4 }}>
        <label htmlFor="scale-zoom" className="row row--between">
          <span>Acercar al núcleo</span>
          <span className="mono">×{fmt(10 ** (Math.log10(rAtom * 1.25 / fovHalf)), 2)}</span>
        </label>
        <input id="scale-zoom" type="range" min={0} max={1} step={0.005} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
      </div>
      <dl className="kv" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div>
          <dt>Radio atómico</dt>
          <dd>{fmt(rAtom * 1e12)} pm</dd>
        </div>
        <div>
          <dt>Radio nuclear</dt>
          <dd>{fmt(rNuc * 1e15)} fm</dd>
        </div>
        <div>
          <dt>Átomo / núcleo</dt>
          <dd>{fmt(ratio, 2)}</dd>
        </div>
      </dl>
      <p className="note">
        <b>Imagínalo.</b> Si el núcleo fuera una canica de 1 cm de radio, el átomo sería una esfera de unos {fmt(atomIfMarble, 2)} m de radio: {atomIfMarble > 60 ? 'más grande que un estadio de fútbol' : atomIfMarble > 20 ? 'como una plaza mayor' : 'como un edificio'}. El núcleo ocupa solo {formatNumber(1 / ratio ** 3, { sig: 2, sci: true })} del volumen del átomo, pero contiene más del 99,9 % de su masa.
      </p>
      <EpiTag kind="calculo">R = 1,2·A^⅓ fm (núcleo) y radio covalente (átomo)</EpiTag>
    </section>
  );
}
