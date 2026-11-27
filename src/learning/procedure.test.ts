import { describe, expect, it } from 'vitest';
import { checkProcedure, evalExpr, explainIssue, parseMember } from './procedure';

describe('evalExpr (sin eval; solo aritmética)', () => {
  it.each([
    ['1+2*3', 7],
    ['(1+2)*3', 9],
    ['2^10', 1024],
    ['-3^2', -9],
    ['6,626·10^-34', 6.626e-34],
    ['6,626e-34', 6.626e-34],
    ['3·10⁸/500·10⁻⁹', 6e14],
    ['1,097·10^7·(1/4 − 1/9)', 1.097e7 * (5 / 36)],
    ['√(25)', 5],
    ['sqrt(2·9,109e-31·1,602e-17)', Math.sqrt(2 * 9.109e-31 * 1.602e-17)],
    ['2π', 2 * Math.PI],
    ['109 677', 109677],
    ['13,6/2²', 3.4],
  ])('%s', (e, v) => expect(evalExpr(e as string)!).toBeCloseTo(v as number, 10 + Math.max(0, -Math.floor(Math.log10(Math.abs(v as number))))));
  it.each(['alert(1)', 'constructor', '1+', '()', 'x*2', 'process.exit()', '1/0'])('rechaza «%s»', (e) => expect(evalExpr(e)).toBeNull());
});

describe('parseMember', () => {
  it('reconoce unidad y pasa al SI', () => {
    const m = parseMember('656,2 nm');
    expect(m.si).toBeCloseTo(656.2e-9, 15);
  });
  it('etiquetas sin números', () => expect(parseMember('1/λ').label).toBe(true));
});

describe('checkProcedure: localiza el PRIMER error', () => {
  const lambda = 1 / (1.097e7 * (1 / 4 - 1 / 9));
  const cps = [{ label: '1/λ', si: 1.097e7 * (1 / 4 - 1 / 9) }];
  const final = { label: 'λ', si: lambda };
  it('procedimiento correcto, con cambio de unidades', () => {
    const r = checkProcedure('1/λ = 1,097·10^7·(1/4 − 1/9) = 1,524·10^6 m⁻¹\nλ = 1/1,524·10^6 = 6,562·10^-7 m = 656,2 nm', cps, final);
    expect(r.issue).toBeNull();
    expect(r.finalOk).toBe(true);
    expect(r.procedureCredit).toBe(1);
  });
  it('error aritmético en la línea 1 (resta mal hecha)', () => {
    const r = checkProcedure('1/λ = 1,097·10^7·(1/4 − 1/9) = 1,6·10^6 m⁻¹\nλ = 1/1,6·10^6 = 6,25·10^-7 m', cps, final);
    expect(r.issue).toMatchObject({ kind: 'aritmetica', line: 1 });
    expect(explainIssue(r.issue)).toMatch(/Línea 1/);
  });
  it('error de conversión en la línea 2 (m → nm mal hecho)', () => {
    const r = checkProcedure('1/λ = 1,524·10^6 m⁻¹\nλ = 6,562·10^-7 m = 6562 nm', cps, final);
    expect(r.issue).toMatchObject({ kind: 'aritmetica', line: 2 });
    expect(r.reached).toContain('1/λ');
    expect(r.procedureCredit).toBe(1);
  });
  it('cuentas coherentes pero fórmula equivocada: error final', () => {
    const r = checkProcedure('1/λ = 1,097·10^7·(1/4 + 1/9) = 3,962·10^6 m⁻¹\nλ = 1/3,962·10^6 = 2,524·10^-7 m', cps, final);
    expect(r.issue?.kind).toBe('final');
    expect(r.procedureCredit).toBe(0);
  });
  it('magnitudes incompatibles en una igualdad', () => {
    const r = checkProcedure('E = 3,03·10^-19 J = 656 nm', [], { label: 'E', si: 3.03e-19 });
    expect(r.issue?.kind).toBe('unidades');
  });
});

describe('evalExpr: prueba por propiedades (200 expresiones aleatorias)', async () => {
  const { mulberry32 } = await import('../science/numbers');
  it('coincide con el valor del árbol construido', () => {
    const rng = mulberry32(7);
    const gen = (d: number): [string, number] => {
      if (d === 0 || rng() < 0.3) {
        const v = Math.round(rng() * 900 + 1) / 10;
        return [String(v).replace('.', ','), v];
      }
      const [a, va] = gen(d - 1);
      const [b, vb] = gen(d - 1);
      const op = ['+', '−', '·', '/'][Math.floor(rng() * 4)]!;
      const v = op === '+' ? va + vb : op === '−' ? va - vb : op === '·' ? va * vb : va / vb;
      return [`(${a} ${op} ${b})`, v];
    };
    for (let k = 0; k < 200; k++) {
      const [e, v] = gen(4);
      expect(Math.abs(evalExpr(e)! - v)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(v)));
    }
  });
});
