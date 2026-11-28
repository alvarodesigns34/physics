/**
 * ATOM 5.1 · Pruebas adversariales e integradas del corrector de procedimientos (P0 de la auditoría).
 * Cada caso reproduce una forma concreta de obtener crédito SIN un procedimiento real, con ejercicios
 * reales del registro, y comprueba también que un procedimiento honrado sí lo obtiene.
 */
import { describe, expect, it } from 'vitest';
import { checkProcedure, explainIssue, parseMember, procedureCheckpoints } from './procedure';
import { GENERATOR_BY_ID } from './registry';
import { gradeQuestion, PROCEDURE_CREDIT } from './examSession';
import type { Exercise } from './types';

const ex = (id: string, seed = 7, d: 1 | 2 | 3 = 1): Exercise => GENERATOR_BY_ID.get(id)!.create(seed, d);
const onda = ex('onda-lambda'); // λ = 500,0 nm → 5·10⁻⁷ m, ν = 6·10¹⁴ Hz, E = 3,976·10⁻¹⁹ J
const spec = procedureCheckpoints(onda)!;
const [cpL, cpNu, cpE] = spec.checkpoints.map((c) => c.label);

describe('procedimiento honrado: se acredita', () => {
  it('conversión, frecuencia y energía con unidades', () => {
    const r = checkProcedure('λ = 500 nm = 5·10^-7 m\nν = c/λ = 3·10^8 / 5·10^-7 = 6·10^14 Hz\nE = h·ν = 6,626·10^-34 · 6·10^14 = 3,976·10^-19 J', spec);
    expect(r.issue).toBeNull();
    expect(r.reached).toEqual([cpL, cpNu, cpE]);
    expect(r.finalOk).toBe(true);
    expect(r.lines.every((l) => l.status === 'ok')).toBe(true);
  });
  it('unidades escritas dentro de la operación', () => {
    const r = checkProcedure('ν = 3·10^8 m/s / (5·10^-7 m) = 6·10^14 Hz\nE = 6,626·10^-34 J·s · 6·10^14 Hz = 3,976·10^-19 J', spec);
    expect(r.issue).toBeNull();
    expect(r.reached).toEqual([cpNu, cpE]);
  });
  it('fórmula con símbolos y variables definidas antes', () => {
    const r = checkProcedure('λ = 500 nm = 5·10^-7 m\nν = c/λ = 6·10^14 Hz\nE = h·ν = 3,976·10^-19 J', spec);
    expect(r.issue).toBeNull();
    expect(r.reached).toEqual([cpL, cpNu, cpE]);
  });
});

describe('P0: coincidencia numérica sin procedimiento real', () => {
  it('el resultado escrito sin operación no se acredita', () => {
    const r = checkProcedure('ν = 6·10^14 Hz\nE = 3,976·10^-19 J', spec);
    expect(r.reached).toEqual([]);
    expect(r.unsupported.map((u) => u.label)).toEqual([cpNu, cpE]);
  });
  it('unidades físicamente incompatibles: el valor coincide pero la magnitud no', () => {
    // 3,976·10⁻¹⁹ escrito como una longitud
    const r = checkProcedure('x = 6,626·10^-34 · 3·10^8 / 5·10^-7 = 3,976·10^-19 m', spec);
    expect(r.reached).not.toContain(cpE);
    expect(r.unsupported.find((u) => u.label === cpE)?.reason).toMatch(/magnitud no coincide/);
  });
  it('etiqueta incompatible con la unidad (E en metros) es un error de unidades', () => {
    const r = checkProcedure('E = 6,626·10^-34 · 6·10^14 = 3,976·10^-19 m', spec);
    expect(r.issue?.kind).toBe('unidades');
    expect(r.reached).toEqual([]);
  });
  it('una operación con un número inventado no demuestra nada', () => {
    const r = checkProcedure('ν = 2 · 3·10^14 = 6·10^14 Hz', spec);
    expect(r.issue).toMatchObject({ kind: 'sin-justificar', line: 1 });
    expect(r.reached).toEqual([]);
    expect(explainIssue(r.issue)).toMatch(/no es un dato/);
  });
  it('multiplicar por 1 el resultado tampoco', () => {
    const r = checkProcedure('ν = 6·10^14 · 1 = 6·10^14 Hz', spec);
    expect(r.reached).toEqual([]);
  });
  it('sumar magnitudes distintas es un error dimensional', () => {
    const r = checkProcedure('E = 6,626·10^-34 J·s + 6·10^14 Hz = 6·10^14', spec);
    expect(r.issue?.kind).toBe('unidades');
    expect(r.reached).toEqual([]);
  });
  it('igualar magnitudes distintas en la cadena', () => {
    const r = checkProcedure('ν = 3·10^8/5·10^-7 = 6·10^14 Hz = 6·10^14 m', spec);
    expect(r.issue?.kind).toBe('unidades');
    expect(r.reached).toEqual([]);
  });
  it('sin unidad ni símbolo, el número no identifica la magnitud', () => {
    const r = checkProcedure('3·10^8 / 5·10^-7 = 6·10^14', spec);
    expect(r.reached).toEqual([]);
    expect(r.unsupported[0]?.reason).toMatch(/identificar la magnitud/);
  });
  it('resultados «a escopeta»: dos candidatos distintos de la misma magnitud', () => {
    const r = checkProcedure('3·10^8 / 5·10^-7 = 6·10^14 Hz\n3·10^8 · 5·10^-7 = 150 Hz', spec);
    expect(r.reached).not.toContain(cpNu);
    expect(r.unsupported.some((u) => /otro resultado distinto/.test(u.reason))).toBe(true);
  });
  it('definir la misma variable dos veces con valores distintos es una contradicción', () => {
    const r = checkProcedure('ν = 3·10^8 / 5·10^-7 = 6·10^14 Hz\nν = 3·10^8 · 5·10^-7 = 150 Hz', spec);
    expect(r.issues.some((i) => i.kind === 'contradiccion')).toBe(true);
  });
});

describe('expresiones inválidas nunca son etiquetas', () => {
  it.each(['3 +* 4', '6,6·10^-34 ·', '(3·10^8', 'ν = 3·10^8 $ 5', 'E = h·ν}', '2..5 J'])('«%s» es «no entiendo»', (t) => {
    const r = checkProcedure(t.includes('=') ? t : `E = ${t}`, spec);
    expect(r.issue?.kind).toBe('no-entiendo');
    expect(r.lines[0]!.ok).toBe(false);
  });
  it('parseMember distingue etiqueta, fórmula, valor e inválido', () => {
    expect(parseMember('1/λ').kind).toBe('label');
    expect(parseMember('n₂²').kind).toBe('label');
    expect(parseMember('E (J)').kind).toBe('label');
    expect(parseMember('h·c/λ', new Map(), false).kind).toBe('formula');
    expect(parseMember('656,2 nm', new Map(), false).kind).toBe('value');
    expect(parseMember('3*/4', new Map(), false).kind).toBe('invalid');
  });
});

describe('nada se hereda de un error', () => {
  it('pasos posteriores coherentes con el error quedan como arrastre, sin crédito', () => {
    const r = checkProcedure('ν = 3·10^8 / 5·10^-7 = 6·10^13 Hz\nE = 6,626·10^-34 · 6·10^13 = 3,976·10^-20 J', spec);
    expect(r.issue).toMatchObject({ kind: 'aritmetica', line: 1 });
    expect(r.lines[1]!.status).toBe('arrastre');
    expect(r.reached).toEqual([]);
  });
  it('tras el error, una línea con números independientes sí se verifica', () => {
    const r = checkProcedure('ν = 3·10^8 / 5·10^-7 = 6·10^13 Hz\nE = 6,626·10^-34 · 3·10^8 / 5·10^-7 = 3,976·10^-19 J', spec);
    expect(r.issue).toMatchObject({ kind: 'aritmetica', line: 1 });
    expect(r.lines[1]!.status).toBe('ok');
    expect(r.reached).toEqual([cpE]);
  });
  it('una variable mal calculada contamina la fórmula que la usa', () => {
    const r = checkProcedure('ν = 3·10^8 / 5·10^-7 = 6·10^13 Hz\nE = h·ν = 3,976·10^-20 J', spec);
    expect(r.lines[1]!.status).toBe('arrastre');
    expect(r.reached).toEqual([]);
  });
});

describe('seguimiento de variables y despejes', () => {
  it('despeje dimensionalmente imposible (ν = c·λ) se detecta por las unidades', () => {
    const r = checkProcedure('λ = 500 nm = 5·10^-7 m\nν = c·λ = 3·10^8 / 5·10^-7 = 6·10^14 Hz', spec);
    expect(r.issue).toMatchObject({ kind: 'unidades', line: 2 });
    expect(r.reached).not.toContain(cpNu);
  });
  it('sustitución que no corresponde a la fórmula escrita', () => {
    const r = checkProcedure('λ = 500 nm = 5·10^-7 m\nν = c/λ = 3·10^8 / 2,5·10^-7 = 1,2·10^15 Hz', spec);
    expect(r.issue).toMatchObject({ kind: 'despeje', line: 2 });
    expect(r.reached).not.toContain(cpNu);
  });
  it('1/λ define λ por su inverso', () => {
    const ry = ex('rydberg');
    const s = procedureCheckpoints(ry)!;
    const r = checkProcedure('1/λ = R·(1/2² − 1/4²) = 1,0974·10^7 · (1/4 − 1/16) = 2,0576·10^6 m⁻¹\nν = c/λ = 6,173·10^14 Hz\nE = h·ν = 4,090·10^-19 J', s);
    expect(r.issue).toBeNull();
    expect(r.reached).toContain(s.checkpoints[0]!.label);
    expect(r.reached).toContain(s.checkpoints[2]!.label);
    expect(r.finalOk).toBe(true);
  });
  it('procedimiento incompleto: termina en otra magnitud', () => {
    const r = checkProcedure('ν = 3·10^8 / 5·10^-7 = 6·10^14 Hz', spec);
    expect(r.issue?.kind).toBe('incompleto');
  });
});

describe('integración con el simulacro: crédito parcial riguroso', () => {
  const wrong = { [onda.parts[1]!.id]: '6·10^13 Hz' };
  it('procedimiento real que llega al valor: crédito por transcripción', () => {
    const g = gradeQuestion(onda, wrong, 1, [], 'ν = 3·10^8 / 5·10^-7 = 6·10^14 Hz');
    expect(g.parts[1]!.byProcedure).toBe(true);
    expect(g.parts[1]!.credit).toBe(PROCEDURE_CREDIT);
  });
  it.each([
    ['número suelto', 'ν = 6·10^14 Hz'],
    ['unidad incompatible', 'ν = 3·10^8 / 5·10^-7 = 6·10^14 m'],
    ['número inventado', 'ν = 2·3·10^14 = 6·10^14 Hz'],
    ['sin magnitud', '3·10^8 / 5·10^-7 = 6·10^14'],
  ])('%s: sin crédito', (_n, proc) => {
    const g = gradeQuestion(onda, wrong, 1, [], proc);
    expect(g.parts[1]!.byProcedure).toBe(false);
    expect(g.parts[1]!.credit).toBe(0);
  });
});

describe('robustez del analizador', () => {
  it('no se bloquea con entradas largas o patológicas', () => {
    const big = Array.from({ length: 200 }, (_, i) => `x = ${'('.repeat(30)}${i}${')'.repeat(30)} = ${i}`).join('\n');
    const t0 = performance.now();
    const r = checkProcedure(big, spec);
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(r.lines.length).toBeLessThanOrEqual(80);
  });
  it.each(['constructor', '__proto__ = 1', 'alert(1) = 2', 'process.exit() = 0'])('«%s» no ejecuta nada', (t) => {
    expect(() => checkProcedure(t, spec)).not.toThrow();
  });
});

describe('propiedad en todas las familias con pasos numéricos', async () => {
  const { GENERATORS } = await import('./registry');
  const { UNITS } = await import('../science/units');
  const cases = GENERATORS.flatMap((g) => g.difficulties.flatMap((d) => [1, 2, 3].map((seed) => g.create(seed, d)))).filter((e) => procedureCheckpoints(e));
  it('hay suficientes casos', () => expect(cases.length).toBeGreaterThan(40));
  it('copiar los resultados correctos sin operación nunca da crédito', () => {
    for (const e of cases) {
      const s = procedureCheckpoints(e)!;
      const text = e.parts.filter((p) => p.answer.kind === 'numeric').map((p) => `x = ${(p.answer as { value: number }).value} ${(p.answer as { unit: string }).unit}`).join('\n');
      const r = checkProcedure(text, s);
      expect(r.reached, e.id).toEqual([]);
      const g = gradeQuestion(e, {}, 1, [], text);
      expect(g.parts.some((p) => p.byProcedure), e.id).toBe(false);
    }
  });
  it('los resultados correctos «derivados» con una unidad de otra magnitud no dan crédito', () => {
    for (const e of cases) {
      const s = procedureCheckpoints(e)!;
      for (const c of s.checkpoints) {
        if (!c.quantity || c.quantity === 'adimensional' || c.quantity === 'porcentaje') continue;
        const other = Object.values(UNITS).find((u) => u.symbol && u.quantity !== c.quantity && u.toSI === 1 && !/[·/⁻%]/.test(u.symbol))!;
        const r = checkProcedure(`x = ${c.si} · 1 = ${c.si} ${other.symbol}`, s);
        expect(r.reached, `${e.id} ${c.label}`).not.toContain(c.label);
      }
    }
  });
});

describe('la ayuda del analizador queda registrada en el modelo', async () => {
  const { buildEvidence } = await import('./evidence');
  it('un acierto tras revisar el procedimiento es «asistida», no «demostrada»', () => {
    const rec = (procedureAssisted: boolean) => onda.parts.map((p) => ({ id: p.id, credit: 1, attempts: 1, revealed: false, errors: [], carried: false, sigFigIssue: false, procedureAssisted: p.answer.kind === 'numeric' && procedureAssisted }));
    const free = buildEvidence(onda, rec(false));
    const helped = buildEvidence(onda, rec(true));
    const node = onda.parts[1]!.nodeIds?.[0] ?? onda.nodeIds[0]!;
    expect(free.nodes[node]!.kind).toBe('demostrada');
    expect(helped.nodes[node]!.kind).toBe('asistida');
  });
});

describe('ATOM 6.0 · operaciones fabricadas con números redondos', () => {
  it.each([
    ['entero por potencia de 10', 'ν = 10^14 · 6 = 6·10^14 Hz'],
    ['potencia por entero', 'ν = 6 · 10^14 = 6·10^14 Hz'],
    ['dividir y multiplicar por lo mismo', 'ν = 6·10^14 · 2 / 2 = 6·10^14 Hz'],
  ])('%s: sin crédito', (_n, proc) => {
    const r = checkProcedure(proc, spec);
    expect(r.reached).toEqual([]);
  });
  it('una operación con un dato o una constante sigue acreditándose (métodos alternativos)', () => {
    expect(checkProcedure('ν = 3·10^8 / 5·10^-7 = 6·10^14 Hz', spec).reached).toEqual([cpNu]);
    expect(checkProcedure('E = h·c/λ = 6,626·10^-34 · 3·10^8 / 5·10^-7 = 3,976·10^-19 J', spec).reached).toEqual([cpE]);
    expect(checkProcedure('λ = 500·10^-9 m = 5·10^-7 m', spec).reached).toEqual([cpL]);
  });
});
