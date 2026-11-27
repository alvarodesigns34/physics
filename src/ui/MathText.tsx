/**
 * Renderizador de fórmulas ligero (sin dependencias): un subconjunto de LaTeX suficiente para el temario.
 * Admite \frac{a}{b}, ^{…}/^x, _{…}/_x, \sqrt{…}, \text{…}, \cdot, \times, \approx, \to, \le, \ge, \pm,
 * \Delta, \lambda, \nu, \mu, \psi, \pi, \infty, espacios (\, \;), \left/\right (se ignoran).
 * Se evaluó KaTeX (≈ 270 kB + fuentes): para fracciones, potencias y letras griegas no compensa.
 * El parser es puro (`parseMath`) y está probado aparte; nunca ejecuta código.
 */
import { Fragment, type ReactNode } from 'react';

export type MathNode =
  | { t: 'text'; v: string }
  | { t: 'sym'; v: string }
  | { t: 'frac'; num: MathNode[]; den: MathNode[] }
  | { t: 'sup'; base: MathNode[]; v: MathNode[] }
  | { t: 'sub'; base: MathNode[]; v: MathNode[] }
  | { t: 'sqrt'; v: MathNode[] }
  | { t: 'word'; v: string };

const SYMBOLS: Record<string, string> = {
  cdot: '·', times: '×', approx: '≈', to: '→', rightarrow: '→', le: '≤', ge: '≥', pm: '±', neq: '≠',
  Delta: 'Δ', lambda: 'λ', nu: 'ν', mu: 'µ', psi: 'ψ', pi: 'π', infty: '∞', alpha: 'α', theta: 'θ', rho: 'ρ', sigma: 'σ',
  ',': ' ', ';': ' ', quad: ' ', qquad: '  ', '%': '%', minus: '−', hbar: 'ħ', ldots: '…', cdots: '⋯', sum: 'Σ', Rightarrow: '⇒', ell: 'ℓ', varepsilon: 'ε', epsilon: 'ε',
};

/** Analiza una expresión. Lanza un Error con mensaje claro si está mal formada. */
export function parseMath(src: string): MathNode[] {
  let i = 0;
  const group = (): MathNode[] => {
    if (src[i] === '{') {
      i++;
      const out = seq('}');
      if (src[i] !== '}') throw new Error(`Falta «}» en «${src}»`);
      i++;
      return out;
    }
    // Un solo carácter o un comando
    const one = atom();
    return one ? [one] : [];
  };
  const atom = (): MathNode | null => {
    const c = src[i];
    if (c === undefined) return null;
    if (c === '\\') {
      i++;
      let name = '';
      if (/[a-zA-Z]/.test(src[i] ?? '')) while (/[a-zA-Z]/.test(src[i] ?? '')) name += src[i++];
      else name = src[i++] ?? '';
      if (name === 'frac') {
        const num = group();
        const den = group();
        return { t: 'frac', num, den };
      }
      if (name === 'sqrt') return { t: 'sqrt', v: group() };
      if (name === 'tilde') {
        const g = group();
        return { t: 'word', v: g.map((n) => (n.t === 'text' || n.t === 'sym' || n.t === 'word' ? n.v : '')).join('') + '\u0303' };
      }
      if (name === 'text' || name === 'mathrm') {
        const g = group();
        return { t: 'word', v: g.map((n) => (n.t === 'text' || n.t === 'sym' || n.t === 'word' ? n.v : '')).join('') };
      }
      if (name === 'left' || name === 'right') return atom();
      const sym = SYMBOLS[name];
      if (sym === undefined) throw new Error(`Comando desconocido \\${name}`);
      return { t: 'sym', v: sym };
    }
    i++;
    if (c === '-') return { t: 'sym', v: '−' };
    if (c === '*') return { t: 'sym', v: '·' };
    return { t: 'text', v: c };
  };
  const seq = (end?: string): MathNode[] => {
    const out: MathNode[] = [];
    while (i < src.length && src[i] !== end) {
      const c = src[i];
      if (c === '^' || c === '_') {
        i++;
        const v = group();
        const base = out.length ? [out.pop()!] : [];
        out.push(c === '^' ? { t: 'sup', base, v } : { t: 'sub', base, v });
        continue;
      }
      if (c === '}') throw new Error(`«}» sin abrir en «${src}»`);
      const a = atom();
      if (a) out.push(a);
    }
    return merge(out);
  };
  const out = seq();
  return out;
}

/** Une caracteres de texto contiguos (más legible y menos nodos). */
function merge(ns: MathNode[]): MathNode[] {
  const out: MathNode[] = [];
  for (const n of ns) {
    const last = out[out.length - 1];
    if (n.t === 'text' && last?.t === 'text') last.v += n.v;
    else out.push(n);
  }
  return out;
}

function render(ns: MathNode[]): ReactNode {
  return ns.map((n, k) => {
    switch (n.t) {
      case 'text':
        return (
          <Fragment key={k}>
            {n.v.split(/([A-Za-z]+)/).map((part, j) =>
              /^[A-Za-z]+$/.test(part) ? (
                <i key={j} className="mx-var">
                  {part}
                </i>
              ) : (
                <Fragment key={j}>{part.replace(/=/g, ' = ')}</Fragment>
              ),
            )}
          </Fragment>
        );
      case 'sym':
        return <span key={k} className={/[·×≈→≤≥±≠−]/.test(n.v) ? 'mx-op' : undefined}>{n.v}</span>;
      case 'word':
        return (
          <span key={k} className="mx-word">
            {n.v}
          </span>
        );
      case 'frac':
        return (
          <span key={k} className="mx-frac" role="group">
            <span className="mx-num">{render(n.num)}</span>
            <span className="mx-den">{render(n.den)}</span>
          </span>
        );
      case 'sup':
        return (
          <span key={k}>
            {render(n.base)}
            <sup className="mx-sup">{render(n.v)}</sup>
          </span>
        );
      case 'sub':
        return (
          <span key={k}>
            {render(n.base)}
            <sub className="mx-sub">{render(n.v)}</sub>
          </span>
        );
      case 'sqrt':
        return (
          <span key={k} className="mx-sqrt">
            √<span className="mx-sqrt__body">{render(n.v)}</span>
          </span>
        );
    }
  });
}

/** Fórmula en línea o en bloque. Si la expresión está mal formada, se muestra tal cual (y se avisa en consola en desarrollo). */
export function MathText({ tex, block = false, label }: { tex: string; block?: boolean; label?: string }) {
  let nodes: MathNode[];
  try {
    nodes = parseMath(tex);
  } catch {
    return <code className="mono">{tex}</code>;
  }
  return (
    <span className={block ? 'mx mx--block' : 'mx'} aria-label={label}>
      {render(nodes)}
    </span>
  );
}
