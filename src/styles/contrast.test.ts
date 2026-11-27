/**
 * G8 · Contraste WCAG 2.x de los tokens de texto (AA: 4,5:1 texto normal; 3:1 texto grande y
 * componentes). Lee tokens.css: si alguien cambia un color, la prueba lo detecta.
 */
import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + ' {');
  const body = css.slice(start, css.indexOf('\n}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]!] = m[2]!;
  return out;
}
if (!css.includes('--ink')) throw new Error('tokens.css vacío en la prueba: ' + css.length);
const light = block(':root');
const dark = { ...light, ...block(":root[data-theme='oscuro']") };

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function ratio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const CASES: [string, string, number][] = [
  ['ink', 'surface', 4.5],
  ['ink', 'surface-raised', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-muted', 'surface-raised', 4.5],
  ['ink-muted', 'surface-sunken', 4.5],
  ['ink-faint', 'surface', 4.5],
  ['ink-faint', 'surface-raised', 4.5],
  ['ink-faint', 'surface-sunken', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'surface-raised', 4.5],
  ['accent-ink', 'accent', 4.5],
  ['ok', 'surface-raised', 4.5],
  ['bad', 'surface-raised', 4.5],
  ['warn', 'surface-raised', 4.5],
  ['ink-on-viewer', 'viewer', 4.5],
  ['ink-on-viewer-muted', 'viewer', 4.5],
];

describe.each([
  ['claro', light],
  ['oscuro', dark],
] as const)('contraste AA · tema %s', (_name, t) => {
  it.each(CASES)('%s sobre %s ≥ %s:1', (fg, bg, min) => {
    expect(t[fg], `falta --${fg}`).toBeDefined();
    expect(t[bg], `falta --${bg}`).toBeDefined();
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
