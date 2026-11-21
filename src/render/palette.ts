/**
 * Paleta de datos coherente con la identidad (tonos apagados y cálidos; sin neón).
 * Categorías del póster del sistema periódico; bloques s/p/d/f; rampa secuencial perceptual.
 */
import * as THREE from 'three';
import type { Block, Category } from '../science/elements';

export const CATEGORY_COLOR: Record<Category, string> = {
  alcalino: '#d9785a',
  alcalinoterreo: '#dda15e',
  transicion: '#8d9db3',
  lantanido: '#b892c2',
  actinido: '#9d84b8',
  'otro-metal': '#86a89c',
  semimetal: '#adb173',
  'no-metal': '#74b8a8',
  halogeno: '#6aa8cc',
  'gas-noble': '#a497db',
};

export const BLOCK_COLOR: Record<Block, string> = { s: '#d9785a', p: '#74b8a8', d: '#8d9db3', f: '#b892c2' };

const RAMP = ['#231d18', '#4a3523', '#83542a', '#c0782c', '#f2a93b', '#f8d28e', '#fff3dc'].map((c) => new THREE.Color(c));

/** Rampa secuencial 0–1: grafito → ámbar → marfil (luminancia monótona). */
export function rampColor(t: number, out = new THREE.Color()): THREE.Color {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  return out.copy(RAMP[i]!).lerp(RAMP[i + 1]!, x - i);
}

export function rampCss(t: number): string {
  return `#${rampColor(t).getHexString()}`;
}

export const RAMP_GRADIENT = `linear-gradient(90deg, ${RAMP.map((c) => `#${c.getHexString()}`).join(', ')})`;
