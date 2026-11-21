/**
 * Sonido opcional sintetizado con WebAudio (sin archivos). Desactivado por defecto.
 * La altura del tono de un fotón es una ANALOGÍA: se mapea log(ν) al rango audible.
 */
import { useStore } from '../state/store';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!useStore.getState().settings.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  add: (kind: 'p' | 'n' | 'e') => tone(kind === 'p' ? 660 : kind === 'n' ? 520 : 990, 0.12, 'sine', 0.05),
  remove: () => tone(330, 0.1, 'sine', 0.04),
  /** Fotón: ν → tono (analogía logarítmica). */
  photon: (frequencyHz: number) => {
    const t = Math.min(1, Math.max(0, (Math.log10(frequencyHz) - 13) / 3));
    tone(220 * Math.pow(8, t), 0.35, 'triangle', 0.05);
  },
  success: () => {
    tone(784, 0.18, 'sine', 0.045);
    tone(1175, 0.28, 'sine', 0.04, 0.09);
  },
  error: () => tone(196, 0.18, 'sine', 0.045),
};
