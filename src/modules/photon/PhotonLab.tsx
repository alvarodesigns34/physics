import { useEffect, useMemo, useState } from 'react';
import { usePhoton, type PhotonTab } from './state';
import { WaveScene, HydrogenScene, LampScene } from './scenes';
import { DetectorStrip, EMBand, VisibleSpectrum, VisibleAxis } from './Spectra';
import { fromWavelength, colorName, wavelengthToCss, isVisible } from '../../science/photon';
import { SIM_CONSTANTS, R_H, CODATA } from '../../science/constants';
import { formatNumber, parseNumber } from '../../science/numbers';
import { cascadeLineCount, transition, seriesLimitWavelength } from '../../science/hydrogen';
import { VISIBLE_SPECTRA } from '../../science/data/spectralLines';
import { MissionPanel } from '../../ui/MissionPanel';
import { AnchoredLabel, LabelLayer } from '../../render/labels';
import { levelEnergyEV } from '../../science/hydrogen';
import { EpiTag, Feedback, announce } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { useMediaQuery, useRoute } from '../../app/hooks';
import { useStore } from '../../state/store';
import { MISSION_BY_ID } from '../../learning/campaign';

const TABS: { id: PhotonTab; label: string }[] = [
  { id: 'ondas', label: 'Ondas' },
  { id: 'hidrogeno', label: 'Hidrógeno' },
  { id: 'espectroscopio', label: 'Espectroscopio' },
];

const fmt = (v: number, sig = 4) => formatNumber(v, { sig });
const ORD = ['1.ª', '2.ª', '3.ª', '4.ª', '5.ª', '6.ª'];

function useTabFromRoute() {
  const { query } = useRoute();
  const setTab = usePhoton((s) => s.setTab);
  const q = query.get('tab');
  useEffect(() => {
    if (q === 'ondas' || q === 'hidrogeno' || q === 'espectroscopio') setTab(q);
  }, [q, setTab]);
}

/** Muestra activa del espectroscopio: la de la misión, o una muestra problema aleatoria. */
function useSpectroSample() {
  const activeId = useStore((s) => s.activeMission);
  const progress = useStore((s) => (activeId ? s.campaign[activeId] : undefined));
  const mission = activeId ? MISSION_BY_ID.get(activeId) : undefined;
  const step = mission?.steps[progress?.step ?? 0];
  const [random, setRandom] = useState(() => VISIBLE_SPECTRA[Math.floor(Math.random() * VISIBLE_SPECTRA.length)]!.symbol);
  if (step?.kind === 'espectro' && progress?.status !== 'completada') return { symbol: step.answerSymbol, mode: step.mode, fromMission: true, reroll: () => undefined };
  return {
    symbol: random,
    mode: 'emision' as const,
    fromMission: false,
    reroll: () => setRandom((cur) => {
      const others = VISIBLE_SPECTRA.filter((s) => s.symbol !== cur);
      return others[Math.floor(Math.random() * others.length)]!.symbol;
    }),
  };
}

export function PhotonScene() {
  const tab = usePhoton((s) => s.tab);
  const el = usePhoton((s) => s.spectroElement);
  const mode = usePhoton((s) => s.spectroMode);
  useTabFromRoute();
  if (tab === 'ondas') return <WaveScene />;
  if (tab === 'espectroscopio') return <LampScene symbol={el} mode={mode} />;
  return <HydrogenScene />;
}

// ── Pestaña Ondas ─────────────────────────────────────────────────────────

const LOG_MIN = -14;
const LOG_MAX = 4;

function WavePanel() {
  const lambdaNm = usePhoton((s) => s.lambdaNm);
  const setLambda = usePhoton((s) => s.setLambda);
  const [text, setText] = useState('');
  const lambda = lambdaNm * 1e-9;
  const p = fromWavelength(lambda, SIM_CONSTANTS);
  const sliderVal = Math.log10(lambda);
  const color = colorName(lambdaNm);
  const apply = () => {
    const m = text.trim().match(/^(.*?)(pm|nm|µm|um|mm|cm|m|km)?$/i);
    const num = parseNumber((m?.[1] ?? '').trim());
    if (!num) return;
    const unit = (m?.[2] ?? 'nm').toLowerCase();
    const f: Record<string, number> = { pm: 1e-12, nm: 1e-9, 'µm': 1e-6, um: 1e-6, mm: 1e-3, cm: 1e-2, m: 1, km: 1e3 };
    const meters = num.value * (f[unit] ?? 1e-9);
    if (meters > 0) {
      setLambda(Math.min(1e13, Math.max(1e-5, meters * 1e9)));
      setText('');
    }
  };
  return (
    <>
      <section className="section">
        <span className="eyebrow">Banco de ondas</span>
        <div className="field">
          <label htmlFor="lambda-slider">Longitud de onda (escala logarítmica)</label>
          <input
            id="lambda-slider"
            type="range"
            min={LOG_MIN}
            max={LOG_MAX}
            step={0.001}
            value={sliderVal}
            onChange={(e) => setLambda(Math.pow(10, Number(e.target.value)) * 1e9)}
            aria-valuetext={`${fmt(lambda, 3)} metros, ${p.region.name}`}
          />
        </div>
        <div className="row">
          <input className="input" aria-label="Escribir longitud de onda" placeholder="p. ej. 500 nm, 1,5 µm, 3 m" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} />
          <button type="button" className="btn" onClick={apply}>
            Fijar
          </button>
        </div>
        <div className="row row--wrap" style={{ gap: 6 }}>
          {[
            ['γ', 1e-12],
            ['X', 1e-10],
            ['UV', 2e-7],
            ['Na', 589e-9],
            ['Hα', 656.3e-9],
            ['IR', 1e-5],
            ['μondas', 0.122],
            ['FM', 3],
          ].map(([l, v]) => (
            <button key={l as string} type="button" className="btn btn--sm" onClick={() => setLambda((v as number) * 1e9)}>
              {l}
            </button>
          ))}
        </div>
      </section>
      <section className="section" aria-live="polite">
        <div className="row row--between">
          <span className="h3">{p.region.name}</span>
          {color && (
            <span className="row small muted" style={{ gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: wavelengthToCss(lambdaNm) }} aria-hidden="true" /> {color}
            </span>
          )}
        </div>
        <dl className="kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <dt>λ</dt>
            <dd>{fmt(lambda, 4)} m</dd>
          </div>
          <div>
            <dt>ν = c/λ</dt>
            <dd>{fmt(p.frequency, 4)} Hz</dd>
          </div>
          <div>
            <dt>T = 1/ν</dt>
            <dd>{fmt(p.period, 4)} s</dd>
          </div>
          <div>
            <dt>ṽ = 1/λ</dt>
            <dd>{fmt(p.wavenumber, 4)} m⁻¹</dd>
          </div>
          <div>
            <dt>E = h·ν</dt>
            <dd>{fmt(p.energyJ, 4)} J</dd>
          </div>
          <div>
            <dt>E</dt>
            <dd>{fmt(p.energyEV, 4)} eV</dd>
          </div>
        </dl>
        <p className="small faint">h = 6,626 070 15·10⁻³⁴ J·s · c = 299 792 458 m/s (CODATA, exactas). Los ejercicios usan los datos de su enunciado.</p>
      </section>
    </>
  );
}

// ── Pestaña Hidrógeno ─────────────────────────────────────────────────────

function LevelPicker({ label, value, onChange, disabled }: { label: string; value: number; onChange: (n: number) => void; disabled: (n: number) => boolean }) {
  return (
    <div className="field">
      <span className="label" id={`lp-${label}`}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={`lp-${label}`} style={{ width: '100%', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-pressed={value === n} disabled={disabled(n)} onClick={() => onChange(n)} style={{ flex: 1, padding: '7px 0', opacity: disabled(n) ? 0.3 : 1 }} className="mono">
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function HydrogenPanel() {
  const { mode, from, to, setMode, setFrom, setTo, fire, runCascade, detected, clearDetector } = usePhoton();
  const [cascadeN, setCascadeN] = useState(4);
  const t = from !== to ? transition(from, to, SIM_CONSTANTS) : null;
  const doFire = () => {
    const r = fire();
    if (r) announce(`${r.type === 'emision' ? 'Emitido' : 'Absorbido'} un fotón de ${fmt(r.wavelength * 1e9, 4)} nanómetros, serie de ${r.series?.name ?? '—'}, región ${r.region.name}.`);
  };
  return (
    <>
      <section className="section">
        <span className="eyebrow">Átomo de hidrógeno</span>
        <div className="segmented" role="tablist" aria-label="Tipo de proceso">
          <button type="button" role="tab" aria-selected={mode === 'emision'} onClick={() => setMode('emision')}>
            Emisión
          </button>
          <button type="button" role="tab" aria-selected={mode === 'absorcion'} onClick={() => setMode('absorcion')}>
            Absorción
          </button>
        </div>
        <LevelPicker label="Nivel inicial" value={from} onChange={(n) => { setFrom(n); if (mode === 'emision' && to >= n) setTo(Math.max(1, n - 1)); if (mode === 'absorcion' && to <= n) setTo(Math.min(7, n + 1)); }} disabled={(n) => (mode === 'emision' ? n === 1 : n === 7)} />
        <LevelPicker label="Nivel final" value={to} onChange={setTo} disabled={(n) => (mode === 'emision' ? n >= from : n <= from)} />
        <button type="button" className="btn btn--primary" onClick={doFire} disabled={!t}>
          {mode === 'emision' ? `Emitir fotón ${from} → ${to}` : `Absorber fotón ${from} → ${to}`}
        </button>
        <span className="small faint">También puedes tocar los niveles en la escena.</span>
      </section>

      {t && (
        <section className="section" aria-label="Cálculo de Rydberg">
          <div className="row row--between">
            <span className="h3">
              {t.series ? `${ORD[t.lineIndex - 1] ?? `${t.lineIndex}.ª`} línea de ${t.series.name}` : 'Transición'}
            </span>
            <span className="row small muted" style={{ gap: 6 }}>
              {isVisible(t.wavelength * 1e9) && <span style={{ width: 12, height: 12, borderRadius: 3, background: wavelengthToCss(t.wavelength * 1e9) }} aria-hidden="true" />}
              {t.region.name}
            </span>
          </div>
          <div className="mono small stack-8" style={{ lineHeight: 1.7, color: 'var(--ink-muted)' }}>
            <span>
              1/λ = R<sub>H</sub>·(1/{t.n1}² − 1/{t.n2}²) = <span style={{ color: 'var(--ink)' }}>{fmt(t.wavenumber, 5)} m⁻¹</span>
            </span>
            <span>
              λ = <span style={{ color: 'var(--ink)' }}>{fmt(t.wavelength, 5)} m</span> = {fmt(t.wavelength * 1e9, 5)} nm
            </span>
            <span>
              ν = c/λ = <span style={{ color: 'var(--ink)' }}>{fmt(t.frequency, 4)} Hz</span>
            </span>
            <span>
              E = h·ν = <span style={{ color: 'var(--ink)' }}>{fmt(t.energyJ, 4)} J</span> = {fmt(t.energyEV, 4)} eV
            </span>
            <span>
              ΔE = E<sub>{to}</sub> − E<sub>{from}</sub> = {fmt(t.deltaEJ / CODATA.e, 4)} eV ({t.type === 'emision' ? 'se emite' : 'se absorbe'})
            </span>
          </div>
          <p className="small faint">
            R<sub>H</sub> = {fmt(R_H, 7)} m⁻¹ (con masa reducida). Límite de la serie: λ∞ = {fmt(seriesLimitWavelength(t.n1) * 1e9, 4)} nm.
          </p>
        </section>
      )}

      <section className="section">
        <span className="eyebrow">Cascada</span>
        <div className="row">
          <label className="small muted" htmlFor="casc">
            Excitar la muestra hasta n =
          </label>
          <select id="casc" className="input" style={{ width: 80, minHeight: 36 }} value={cascadeN} onChange={(e) => setCascadeN(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <button type="button" className="btn btn--sm" onClick={() => { runCascade(cascadeN); announce(`Cascada desde n = ${cascadeN}: ${cascadeLineCount(cascadeN)} líneas distintas.`); }}>
            Lanzar
          </button>
        </div>
        <span className="small faint">Una muestra tiene muchos átomos: cada uno baja por un camino distinto y el detector recoge todas las parejas de niveles posibles.</span>
      </section>

      <section className="section">
        <div className="row row--between">
          <span className="eyebrow">Detector · {detected.length} líneas</span>
          {detected.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearDetector}>
              Limpiar
            </button>
          )}
        </div>
        {detected.length > 0 ? (
          <ul className="stack-8 small mono" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[...detected]
              .sort((a, b) => a.t.wavelength - b.t.wavelength)
              .map((d) => (
                <li key={`${d.t.from}-${d.t.to}`} className="row row--between">
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: isVisible(d.t.wavelength * 1e9) ? wavelengthToCss(d.t.wavelength * 1e9) : 'var(--ink-faint)' }} aria-hidden="true" />
                    {d.t.from} → {d.t.to}
                  </span>
                  <span className="muted">{fmt(d.t.wavelength * 1e9, 4)} nm</span>
                  <span className="faint">{d.t.series?.name}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="small faint">Aún no hay líneas.</p>
        )}
      </section>
      <p className="note">
        <b>Ámbito de validez.</b> La ecuación de Rydberg describe solo el átomo de hidrógeno (un electrón); el modelo no es relativista y no incluye la estructura fina. Las longitudes de onda son en el vacío.
      </p>
    </>
  );
}

// ── Pestaña Espectroscopio ────────────────────────────────────────────────

function SpectroPanel() {
  const { spectroElement, spectroMode, setSpectro, guess } = usePhoton();
  const sample = useSpectroSample();
  const [verdict, setVerdict] = useState<{ ok: boolean; msg: string } | null>(null);
  const ref = VISIBLE_SPECTRA.find((s) => s.symbol === spectroElement)!;
  const sampleSpec = VISIBLE_SPECTRA.find((s) => s.symbol === sample.symbol)!;
  const sampleMode = sample.fromMission ? sample.mode : spectroMode;
  useEffect(() => {
    setVerdict(null);
  }, [sample.symbol]);
  const tryGuess = (symbol: string) => {
    const ok = symbol === sample.symbol;
    const s = VISIBLE_SPECTRA.find((x) => x.symbol === symbol)!;
    setVerdict(ok ? { ok, msg: `Correcto: es ${s.name.toLowerCase()}. Cada línea de la muestra coincide con una línea de referencia del ${s.name.toLowerCase()}: los espectros son la huella dactilar de cada elemento.` } : { ok, msg: `No coincide: las líneas del ${s.name.toLowerCase()} no están en las mismas posiciones. Compara la línea más intensa de la muestra con las de cada referencia.` });
    if (ok) guess(symbol);
  };
  return (
    <>
      <section className="section">
        <span className="eyebrow">Espectroscopio</span>
        <div className="segmented" role="tablist" aria-label="Tipo de espectro">
          <button type="button" role="tab" aria-selected={spectroMode === 'emision'} onClick={() => setSpectro({ spectroMode: 'emision' })}>
            Emisión
          </button>
          <button type="button" role="tab" aria-selected={spectroMode === 'absorcion'} onClick={() => setSpectro({ spectroMode: 'absorcion' })}>
            Absorción
          </button>
        </div>
        <div className="row row--wrap" style={{ gap: 6 }} role="radiogroup" aria-label="Elemento de referencia">
          {VISIBLE_SPECTRA.map((s) => (
            <button key={s.symbol} type="button" role="radio" aria-checked={spectroElement === s.symbol} className="btn btn--sm" onClick={() => setSpectro({ spectroElement: s.symbol })} style={spectroElement === s.symbol ? { borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' } : undefined}>
              {s.name}
            </button>
          ))}
        </div>
        <VisibleSpectrum lines={ref.lines} mode={spectroMode} label={`Espectro de ${spectroMode} del ${ref.name.toLowerCase()}`} />
        <VisibleAxis />
        <p className="small faint">
          {spectroMode === 'emision' ? 'Gas excitado: emite solo unas longitudes de onda (líneas brillantes).' : 'Luz blanca que atraviesa el gas: faltan exactamente las mismas longitudes de onda (líneas oscuras).'}
        </p>
      </section>
      <section className="section">
        <div className="row row--between">
          <span className="eyebrow eyebrow--accent">{sample.fromMission ? 'Espectro de la estrella' : 'Muestra problema'}</span>
          {!sample.fromMission && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={sample.reroll}>
              Otra muestra
            </button>
          )}
        </div>
        <VisibleSpectrum lines={sampleSpec.lines} mode={sampleMode} label="Muestra desconocida" />
        <VisibleAxis />
        <span className="small muted">¿Qué elemento produce este espectro?</span>
        <div className="row row--wrap" style={{ gap: 6 }}>
          {VISIBLE_SPECTRA.map((s) => (
            <button key={s.symbol} type="button" className="btn btn--sm" onClick={() => tryGuess(s.symbol)}>
              {s.symbol}
            </button>
          ))}
        </div>
        {verdict && <Feedback tone={verdict.ok ? 'ok' : 'bad'}>{verdict.msg}</Feedback>}
      </section>
      <p className="note">
        <b>Datos.</b> Líneas más intensas del átomo neutro en el visible, NIST Handbook of Basic Atomic Spectroscopic Data (longitudes de onda en aire, unos 0,03 % menores que en el vacío).
      </p>
    </>
  );
}

function SceneLabels({ tab }: { tab: PhotonTab }) {
  const level = usePhoton((s) => s.level);
  const lambdaNm = usePhoton((s) => s.lambdaNm);
  if (tab === 'hidrogeno')
    return (
      <LabelLayer>
        {[1, 2, 3, 4].map((n) => (
          <AnchoredLabel key={n} id={`lvl-${n}`} align="left" className={n === 4 ? 'desktop-only' : undefined}>
            <span className="scene-label" style={{ color: n === level ? 'var(--accent)' : undefined }}>
              n = {n} · {fmt(levelEnergyEV(n), 3)} eV
            </span>
          </AnchoredLabel>
        ))}
        <AnchoredLabel id="lvl-high" align="left" className="desktop-only">
          <span className="scene-label faint" style={{ color: level > 4 ? 'var(--accent)' : 'var(--ink-faint)' }}>
            n = 5, 6, 7…{level > 4 ? ` (electrón en n = ${level})` : ''}
          </span>
        </AnchoredLabel>
        <AnchoredLabel id="lvl-inf" align="left" className="desktop-only">
          <span className="scene-label" style={{ color: 'var(--ink-faint)' }}>
            n → ∞ · 0 eV (ionización)
          </span>
        </AnchoredLabel>
        <AnchoredLabel id="axis-energy">
          <span className="eyebrow" style={{ display: 'block', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10 }}>
            Energía · escala lineal
          </span>
        </AnchoredLabel>
        <AnchoredLabel id="electron">
          <span className="scene-label" style={{ color: 'var(--electron)' }}>e⁻</span>
        </AnchoredLabel>
      </LabelLayer>
    );
  if (tab === 'ondas')
    return (
      <LabelLayer>
        <AnchoredLabel id="wave-E">
          <span className="scene-label" style={{ color: 'var(--ink)' }}>E</span>
        </AnchoredLabel>
        <AnchoredLabel id="wave-B">
          <span className="scene-label" style={{ color: 'var(--electron)' }}>B</span>
        </AnchoredLabel>
        <AnchoredLabel id="wave-c">
          <span className="scene-label">c →</span>
        </AnchoredLabel>
        <AnchoredLabel id="wave-ruler">
          <span className="scene-label" style={{ color: 'var(--ink)' }}>
            λ = {fmt(lambdaNm * 1e-9, 3)} m
          </span>
        </AnchoredLabel>
      </LabelLayer>
    );
  return null;
}

export function PhotonOverlay() {
  const tab = usePhoton((s) => s.tab);
  const setTab = usePhoton((s) => s.setTab);
  const lambdaNm = usePhoton((s) => s.lambdaNm);
  const lastTransition = usePhoton((s) => s.lastTransition);
  const cascade = usePhoton((s) => s.cascade);
  const spectroGuess = usePhoton((s) => s.spectroGuess);
  const detected = usePhoton((s) => s.detected);
  const spectroEl = usePhoton((s) => s.spectroElement);
  const [collapsed, setCollapsed] = useState(false);
  const mobile = useMediaQuery('(max-width: 760px)');
  const signal = useMemo(() => ({ lambdaNm, transition: lastTransition, cascade, spectro: spectroGuess }), [lambdaNm, lastTransition, cascade, spectroGuess]);
  const lampColor = useMemo(() => VISIBLE_SPECTRA.find((s) => s.symbol === spectroEl)!.name, [spectroEl]);

  return (
    <div className="workspace">
      <SceneLabels tab={tab} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 var(--gutter) var(--gutter)' }}>
        <div className="interactive desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 860 }}>
          {tab === 'hidrogeno' && <DetectorStrip lines={detected} highlightStamp={lastTransition?.stamp} />}
          {tab === 'ondas' && <EMBand lambdaM={lambdaNm * 1e-9} />}
          <div className="row row--wrap" style={{ gap: 8 }}>
            {tab === 'hidrogeno' && (
              <>
                <EpiTag kind="calculo">Niveles Eₙ = −13,6 eV/n² y líneas con Rydberg (R_H CODATA)</EpiTag>
                <EpiTag kind="esquema">Trayectoria y momento del fotón: ilustrativos</EpiTag>
              </>
            )}
            {tab === 'ondas' && <EpiTag kind="esquema">Onda dibujada con λ en escala logarítmica comprimida; la velocidad de la animación no es real. E y B, perpendiculares y en fase</EpiTag>}
            {tab === 'espectroscopio' && <EpiTag kind="calculo">Color de la lámpara de {lampColor.toLowerCase()}: suma de sus líneas visibles (aproximado)</EpiTag>}
          </div>
        </div>
      </div>
      <aside className={`side interactive enter${mobile && collapsed ? ' side--collapsed' : ''}`} aria-label="Photon Lab">
        <button type="button" className="side__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          <span className="h3">Photon Lab · {TABS.find((t) => t.id === tab)!.label}</span>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} />
        </button>
        <div className="side__scroll">
          <div className="segmented" role="tablist" aria-label="Instrumento" style={{ alignSelf: 'stretch' }}>
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{ flex: 1 }}>
                {t.label}
              </button>
            ))}
          </div>
          <MissionPanel lab="fotones" signal={signal} />
          <div className="mobile-only stack-8">
            {tab === 'hidrogeno' && <DetectorStrip lines={detected} highlightStamp={lastTransition?.stamp} />}
            {tab === 'ondas' && <EMBand lambdaM={lambdaNm * 1e-9} />}
          </div>
          {tab === 'ondas' && <WavePanel />}
          {tab === 'hidrogeno' && <HydrogenPanel />}
          {tab === 'espectroscopio' && <SpectroPanel />}
        </div>
      </aside>
    </div>
  );
}
