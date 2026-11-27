import { describe, expect, it } from 'vitest';
import { decodeTransfer, encodeTransfer } from './transfer';

describe('código de transferencia', () => {
  const json = JSON.stringify({ app: 'ATOM', version: 2, history: Array.from({ length: 300 }, (_, i) => ({ exerciseId: `onda-lambda:2:${i}`, at: 1_790_000_000_000 + i, ñ: 'λ ν ⁻¹' })) });
  it('ida y vuelta exacta (también con caracteres no ASCII) y comprimido', async () => {
    const code = await encodeTransfer(json);
    expect(code.startsWith('ATOM1.')).toBe(true);
    expect(code.length).toBeLessThan(json.length / 4);
    expect(await decodeTransfer(code)).toEqual({ ok: true, json });
    expect(await decodeTransfer(`  ${code.slice(0, 40)}\n${code.slice(40)} `)).toEqual({ ok: true, json });
  });
  it('rechaza códigos truncados, alterados o ajenos', async () => {
    const code = await encodeTransfer(json);
    expect((await decodeTransfer(code.slice(0, -20))).ok).toBe(false);
    const k = code.length - 30;
    const flipped = code.slice(0, k) + (code[k] === 'A' ? 'B' : 'A') + code.slice(k + 1);
    expect((await decodeTransfer(flipped)).ok).toBe(false);
    expect((await decodeTransfer('hola')).ok).toBe(false);
    expect((await decodeTransfer('ATOM1.zzzzzzzz.abc')).ok).toBe(false);
  });
});
