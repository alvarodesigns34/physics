/**
 * ATOM 4.0 · Modelo de aprendizaje: inflación del dominio, azar, ayuda y autoevaluación.
 */
import { describe, expect, it } from 'vitest';
import { initialMastery, updateMasteryY, masteryEstimate, masteryPercent, displayTheta } from './mastery';
import { buildEvidence, guessChance, type PartRecord } from './evidence';
import { buildWaveExercise } from './generators/photon';
import type { Exercise } from './types';

const T = 1.75e12;

describe('sin inflación con poca evidencia', () => {
  it('un único acierto difícil no muestra un dominio alto', () => {
    const m = updateMasteryY(initialMastery(), 3, 1, 0, T);
    const e = masteryEstimate(m);
    expect(e.mid).toBeLessThan(50);
    expect(e.evidence).toBe('escasa');
    expect(e.high - e.low).toBeGreaterThanOrEqual(30);
  });
  it('con evidencia abundante la estimación converge al θ ajustado', () => {
    let m = initialMastery();
    for (let i = 0; i < 30; i++) m = updateMasteryY(m, 2, 1, 0, T + i);
    expect(Math.abs(displayTheta(m) - m.theta)).toBeLessThan(0.15 * Math.abs(m.theta + 0.5) + 0.05);
    expect(masteryPercent(m)).toBeGreaterThan(75);
  });
});

describe('aciertos casuales: probabilidad de adivinar', () => {
  it('un acierto en una pregunta de 2 opciones sube θ mucho menos que uno de respuesta abierta', () => {
    const open = updateMasteryY(initialMastery(), 2, 1, 0, T, 1, 0);
    const twoOpt = updateMasteryY(initialMastery(), 2, 1, 0, T, 1, 0.5);
    expect(twoOpt.theta - -0.5).toBeLessThan((open.theta - -0.5) * 0.6);
  });
  it('un fallo en una pregunta adivinable sigue bajando θ', () => {
    const m = updateMasteryY(initialMastery(), 2, 0, 0, T, 1, 0.25);
    expect(m.theta).toBeLessThan(-0.5);
  });
  it('los aciertos con alta probabilidad de azar no cuentan como demostrados', () => {
    const m = updateMasteryY(initialMastery(), 2, 1, 0, T, 1, 0.5);
    expect(m.demonstrated).toBe(0);
  });
  it('probabilidad de azar por tipo de respuesta', () => {
    const ch = { id: 'a', prompt: '', canonical: '', explanation: '', answer: { kind: 'choice' as const, options: [{ id: '1', text: 'a' }, { id: '2', text: 'b' }, { id: '3', text: 'c' }, { id: '4', text: 'd' }], correct: ['1'] } };
    expect(guessChance(ch)).toBe(0.25);
    expect(guessChance({ ...ch, answer: { ...ch.answer, multiple: true } })).toBe(1 / 16);
    expect(guessChance({ ...ch, answer: { kind: 'numeric', value: 1, unit: '' } })).toBe(0);
  });
});

describe('tipos de evidencia por apartado', () => {
  const ex: Exercise = buildWaveExercise({ value: 500, unit: 'nm' }, 2, 't');
  const rec = (id: string, o: Partial<PartRecord> = {}): PartRecord => ({ id, credit: 1, attempts: 1, revealed: false, errors: [], carried: false, sigFigIssue: false, ...o });
  it('al primer intento y sin ayuda → demostrada; con reintento → asistida', () => {
    const ok = buildEvidence(ex, ex.parts.map((p) => rec(p.id)));
    expect(Object.values(ok.nodes).some((n) => n.kind === 'demostrada')).toBe(true);
    const assisted = buildEvidence(ex, ex.parts.map((p, i) => rec(p.id, i === 0 ? { attempts: 2, credit: 0.5 } : {})));
    const firstNodes = ex.parts[0]!.nodeIds ?? ex.nodeIds;
    for (const n of firstNodes) expect(assisted.nodes[n]!.kind).toBe('asistida');
  });
  it('la evidencia asistida y la autoevaluada pesan menos en el dominio', () => {
    const full = updateMasteryY(initialMastery(), 2, 1, 0, T, 1);
    const assisted = updateMasteryY(initialMastery(), 2, 1, 0, T, 0.6);
    const self = updateMasteryY(initialMastery(), 2, 1, 0, T, 0.4);
    expect(full.theta).toBeGreaterThan(assisted.theta);
    expect(assisted.theta).toBeGreaterThan(self.theta);
    expect(assisted.demonstrated).toBe(0);
  });
});
