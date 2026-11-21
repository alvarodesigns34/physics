/**
 * Motor de sonido de ATOM, sintetizado por completo con WebAudio (sin archivos).
 * Buses: efectos e interfaz → compresor → maestro; ambiente (drones suaves por laboratorio) aparte.
 * Las alturas de los fotones son una ANALOGÍA: log(ν) se mapea al rango audible.
 */
import { useStore } from '../state/store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let fxBus: GainNode | null = null;
let ambBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function settings() {
  return useStore.getState().settings;
}

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master = ctx.createGain();
      fxBus = ctx.createGain();
      ambBus = ctx.createGain();
      fxBus.connect(comp);
      ambBus.connect(comp);
      comp.connect(master).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    master!.gain.value = settings().volume ?? 0.8;
    return ctx;
  } catch {
    return null;
  }
}

function fx(): { a: AudioContext; out: GainNode } | null {
  if (!settings().sound) return null;
  const a = ensure();
  return a && fxBus ? { a, out: fxBus } : null;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  delay?: number;
  to?: number; // glissando hasta esta frecuencia
  detune?: number;
  filter?: number;
  pan?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const f = fx();
  if (!f) return;
  const { a, out } = f;
  const t0 = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  if (o.detune) osc.detune.value = o.detune;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.05, t0 + (o.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = osc.connect(g);
  if (o.filter) {
    const bq = a.createBiquadFilter();
    bq.type = 'lowpass';
    bq.frequency.value = o.filter;
    node = node.connect(bq);
  }
  if (o.pan !== undefined) {
    const p = a.createStereoPanner();
    p.pan.value = o.pan;
    node = node.connect(p);
  }
  node.connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Campana FM: portadora + moduladora con índice decreciente (timbre de vidrio/metal). */
function bell(freq: number, dur: number, gain = 0.04, delay = 0) {
  const f = fx();
  if (!f) return;
  const { a, out } = f;
  const t0 = a.currentTime + delay;
  const car = a.createOscillator();
  const mod = a.createOscillator();
  const mg = a.createGain();
  const g = a.createGain();
  car.frequency.value = freq;
  mod.frequency.value = freq * 3.5;
  mg.gain.setValueAtTime(freq * 2.2, t0);
  mg.gain.exponentialRampToValueAtTime(1, t0 + dur);
  mod.connect(mg).connect(car.frequency);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  car.connect(g).connect(out);
  car.start(t0);
  mod.start(t0);
  car.stop(t0 + dur + 0.05);
  mod.stop(t0 + dur + 0.05);
}

/** Ráfaga de ruido filtrado (clics de detector, soplidos). */
function noise(dur: number, o: { gain?: number; freq?: number; q?: number; type?: BiquadFilterType; delay?: number; sweepTo?: number } = {}) {
  const f = fx();
  if (!f || !noiseBuf) return;
  const { a, out } = f;
  const t0 = a.currentTime + (o.delay ?? 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const bq = a.createBiquadFilter();
  bq.type = o.type ?? 'bandpass';
  bq.frequency.setValueAtTime(o.freq ?? 2000, t0);
  if (o.sweepTo) bq.frequency.exponentialRampToValueAtTime(o.sweepTo, t0 + dur);
  bq.Q.value = o.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.05, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bq).connect(g).connect(out);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

let lastHover = 0;
let lastGeiger = 0;

export const sfx = {
  // ── Interfaz ──
  click: () => tone(1800, 0.035, { type: 'triangle', gain: 0.018, filter: 5000 }),
  hover: () => {
    const now = performance.now();
    if (now - lastHover < 60) return;
    lastHover = now;
    tone(2600, 0.02, { gain: 0.006 });
  },
  toggle: (on: boolean) => tone(on ? 880 : 660, 0.07, { type: 'triangle', gain: 0.025, to: on ? 1320 : 440 }),
  open: () => noise(0.25, { gain: 0.015, freq: 600, sweepTo: 2400, type: 'bandpass', q: 0.8 }),
  // ── Partículas y núcleo ──
  add: (kind: 'p' | 'n' | 'e') => {
    if (kind === 'p') bell(523, 0.5, 0.035);
    else if (kind === 'n') bell(392, 0.45, 0.03);
    else tone(1568, 0.18, { gain: 0.03, to: 2093 });
  },
  remove: () => tone(440, 0.14, { type: 'triangle', gain: 0.025, to: 220 }),
  transmute: () => {
    noise(0.6, { gain: 0.02, freq: 300, sweepTo: 4000, q: 2 });
    [523, 659, 784].forEach((f, i) => bell(f, 0.9, 0.022, 0.05 + i * 0.06));
  },
  // ── Luz ──
  /** Fotón: emisión = barrido descendente; absorción = ascendente. Altura según log ν (analogía). */
  photon: (frequencyHz: number, kind: 'emision' | 'absorcion' = 'emision') => {
    const t = Math.min(1, Math.max(0, (Math.log10(frequencyHz) - 13) / 3));
    const base = 220 * Math.pow(8, t);
    tone(kind === 'emision' ? base * 1.5 : base * 0.7, 0.45, { type: 'sine', gain: 0.045, to: kind === 'emision' ? base : base * 1.2 });
    bell(base * 2, 0.6, 0.015, 0.02);
  },
  // ── Detectores ──
  geiger: () => {
    const now = performance.now();
    if (now - lastGeiger < 25) return;
    lastGeiger = now;
    noise(0.012, { gain: 0.06, freq: 3500, q: 0.7, type: 'highpass' });
  },
  detector: (pitch = 1) => tone(1200 * pitch, 0.03, { type: 'square', gain: 0.008, filter: 3000 }),
  // ── Electrones y reglas ──
  spin: (up: boolean) => tone(up ? 784 : 587, 0.12, { type: 'triangle', gain: 0.03, to: up ? 988 : 466 }),
  forbidden: () => {
    tone(110, 0.25, { type: 'sawtooth', gain: 0.025, filter: 900 });
    tone(116, 0.25, { type: 'sawtooth', gain: 0.025, filter: 900 });
  },
  // ── Aprendizaje ──
  success: () => {
    bell(784, 0.5, 0.035);
    bell(1175, 0.7, 0.03, 0.09);
  },
  error: () => tone(220, 0.2, { type: 'triangle', gain: 0.035, to: 180 }),
  complete: () => [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, 1.2, 0.03, i * 0.09)),
};

// ── Ambiente por laboratorio ──────────────────────────────────────────────

const AMBIENT_ROOT: Record<string, number> = { '/': 55, '/forja': 49, '/fotones': 58.3, '/historia': 46.2, '/masas': 51.9, '/cuantico': 61.7, '/arquitecto': 65.4, '/periodico': 43.7, '/entrenamiento': 0, '/guia': 0 };

let ambNodes: { stop: () => void } | null = null;

export function setAmbient(route: string) {
  ambNodes?.stop();
  ambNodes = null;
  const s = settings();
  if (!s.sound || !s.ambient) return;
  const root = AMBIENT_ROOT[route] ?? 55;
  if (!root) return;
  const a = ensure();
  if (!a || !ambBus) return;
  const t0 = a.currentTime;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.05, t0 + 3);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  const lfo = a.createOscillator();
  const lfoG = a.createGain();
  lfo.frequency.value = 0.05;
  lfoG.gain.value = 220;
  lfo.connect(lfoG).connect(lp.frequency);
  const oscs = [1, 1.5, 2, 3.01].map((r, i) => {
    const o = a.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = root * r;
    o.detune.value = (i - 1.5) * 4;
    const og = a.createGain();
    og.gain.value = [0.5, 0.25, 0.2, 0.08][i]!;
    o.connect(og).connect(lp);
    o.start();
    return o;
  });
  lp.connect(g).connect(ambBus);
  lfo.start();
  ambNodes = {
    stop: () => {
      const t = a.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
      }, 1400);
    },
  };
}

/** Clic suave para cualquier control: se engancha una vez a nivel de documento. */
export function installUiSounds() {
  const onDown = (e: PointerEvent) => {
    const el = (e.target as HTMLElement).closest('button, [role=tab], [role=radio], a, summary');
    if (el && !(el as HTMLButtonElement).disabled) sfx.click();
  };
  const onOver = (e: PointerEvent) => {
    const el = (e.target as HTMLElement).closest('button, a');
    if (el && e.pointerType === 'mouse') sfx.hover();
  };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('pointerover', onOver, true);
  return () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('pointerover', onOver, true);
  };
}
