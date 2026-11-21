/**
 * Diagramas de orbitales (cajas y flechas): construcción, diagnóstico de Pauli, Hund y Aufbau.
 * Código de cada caja: 0 vacía · 1 ↑ · 2 ↓ · 3 ↑↓ · 4 ↑↑ (prohibida por Pauli).
 */
import { MADELUNG_ORDER, madelungIndex, subshellLabel, speciesConfiguration, sameConfiguration, type Configuration, type Subshell } from './configuration';
import { lFromLetter } from './quantum';
import { toSuperscript } from './numbers';

export type BoxState = 0 | 1 | 2 | 3 | 4;
export type Boxes = Record<string, BoxState[]>;

export const BOX_ELECTRONS: Record<BoxState, number> = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2 };
/** Ciclo al tocar una caja: vacía → ↑ → ↓ → ↑↓ → ↑↑ → vacía. */
export const NEXT_BOX: Record<BoxState, BoxState> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 0 };

export function parseLabel(label: string): Subshell {
  return { n: Number(label[0]), l: lFromLetter(label[1]!) };
}

export function emptyBoxes(): Boxes {
  return {};
}

/** Cajas de una configuración siguiendo Hund: primero una ↑ en cada orbital, después las ↓. */
export function boxesFromConfiguration(conf: Configuration): Boxes {
  const out: Boxes = {};
  for (const s of conf) {
    const k = 2 * s.l + 1;
    const arr: BoxState[] = new Array(k).fill(0);
    for (let i = 0; i < s.e; i++) {
      const j = i % k;
      arr[j] = i < k ? 1 : 3;
    }
    out[subshellLabel(s)] = arr;
  }
  return out;
}

export function boxesElectronCount(b: Boxes): number {
  return Object.values(b).reduce((a, arr) => a + arr.reduce<number>((x, s) => x + BOX_ELECTRONS[s], 0), 0);
}

export function configurationFromBoxes(b: Boxes): Configuration {
  return Object.entries(b)
    .map(([label, arr]) => ({ ...parseLabel(label), e: arr.reduce<number>((x, s) => x + BOX_ELECTRONS[s], 0) }))
    .filter((s) => s.e > 0)
    .sort((a, c) => madelungIndex(a) - madelungIndex(c));
}

export interface BoxIssue {
  rule: 'pauli' | 'hund' | 'aufbau' | 'recuento';
  label?: string;
  message: string;
}

export type BoxStatus = 'vacio' | 'incompleto' | 'exceso' | 'prohibido' | 'excitado' | 'fundamental';

export interface BoxDiagnosis {
  electrons: number;
  status: BoxStatus;
  issues: BoxIssue[];
  pauli: string[];
  hund: string[];
  exception: boolean;
}

export function diagnoseBoxes(b: Boxes, z: number, targetElectrons: number): BoxDiagnosis {
  const electrons = boxesElectronCount(b);
  const issues: BoxIssue[] = [];
  const pauli: string[] = [];
  const hund: string[] = [];
  for (const [label, arr] of Object.entries(b)) {
    if (arr.includes(4)) {
      pauli.push(label);
      issues.push({ rule: 'pauli', label, message: `${label}: dos electrones con el mismo espín en un orbital. Tendrían los cuatro números cuánticos iguales: lo prohíbe el principio de exclusión de Pauli.` });
    }
    const e = arr.reduce<number>((x, s) => x + BOX_ELECTRONS[s], 0);
    if (e > 0 && e < arr.length * 2) {
      const paired = arr.filter((s) => s === 3 || s === 4).length;
      const empty = arr.filter((s) => s === 0).length;
      const singles = arr.filter((s) => s === 1 || s === 2);
      if (paired > 0 && empty > 0) {
        hund.push(label);
        issues.push({ rule: 'hund', label, message: `${label}: hay electrones apareados mientras quedan orbitales vacíos. Según Hund, primero se ocupa cada orbital con un electrón.` });
      } else if (new Set(singles).size > 1) {
        hund.push(label);
        issues.push({ rule: 'hund', label, message: `${label}: los electrones desapareados deben tener espines paralelos (máxima multiplicidad de Hund).` });
      }
    }
  }
  const conf = configurationFromBoxes(b);
  // Aufbau: ¿algún subnivel incompleto por debajo de uno ocupado?
  const maxIdx = Math.max(-1, ...conf.map(madelungIndex));
  const filled = new Map(conf.map((s) => [subshellLabel(s), s.e]));
  const hole = MADELUNG_ORDER.slice(0, Math.max(0, maxIdx)).find((s) => (filled.get(subshellLabel(s)) ?? 0) < 2 * (2 * s.l + 1));
  const ground = targetElectrons > 0 ? speciesConfiguration(z, targetElectrons) : [];
  const isGround = electrons === targetElectrons && sameConfiguration(conf, ground);
  const exception = isGround && !!hole;
  if (hole && !isGround) issues.push({ rule: 'aufbau', label: subshellLabel(hole), message: `El ${subshellLabel(hole)} no está lleno y hay electrones en subniveles de mayor energía: estado excitado.` });
  if (electrons !== targetElectrons) issues.push({ rule: 'recuento', message: `Hay ${electrons} electrones y la especie tiene ${targetElectrons}.` });
  else if (!isGround && !hole && pauli.length === 0 && hund.length === 0)
    issues.push({ rule: 'aufbau', message: `Es lo que predice el diagrama de Möller, pero esta especie es una excepción: en su estado fundamental real un electrón s pasa al subnivel d (${ground.filter((s) => s.l === 2).map((s) => `${s.n}d${toSuperscript(s.e)}`).join(' ')}), que queda semilleno o lleno. La configuración de Möller corresponde a un estado excitado.` });

  let status: BoxStatus;
  if (electrons === 0) status = 'vacio';
  else if (pauli.length) status = 'prohibido';
  else if (electrons > targetElectrons) status = 'exceso';
  else if (electrons < targetElectrons) status = 'incompleto';
  else if (isGround && hund.length === 0) status = 'fundamental';
  else status = 'excitado';
  return { electrons, status, issues, pauli, hund, exception };
}

/** Siguiente electrón según Möller y Hund (sin excepciones): devuelve cajas nuevas y el subnivel usado. */
export function aufbauStep(b: Boxes): { boxes: Boxes; label: string } | null {
  for (const s of MADELUNG_ORDER) {
    const label = subshellLabel(s);
    const k = 2 * s.l + 1;
    const arr = [...(b[label] ?? new Array<BoxState>(k).fill(0))];
    const e = arr.reduce<number>((x, st) => x + BOX_ELECTRONS[st], 0);
    if (e >= 2 * k) continue;
    const firstEmpty = arr.indexOf(0);
    if (firstEmpty >= 0) arr[firstEmpty] = 1;
    else {
      const single = arr.findIndex((st) => st === 1 || st === 2);
      arr[single] = 3;
    }
    return { boxes: { ...b, [label]: arr }, label };
  }
  return null;
}

/** Añade (o quita) un electrón a un subnivel concreto respetando Hund. */
export function addToSubshell(b: Boxes, label: string, delta: 1 | -1): Boxes {
  const s = parseLabel(label);
  const k = 2 * s.l + 1;
  const arr = [...(b[label] ?? new Array<BoxState>(k).fill(0))];
  const e = arr.reduce<number>((x, st) => x + BOX_ELECTRONS[st], 0);
  if (delta > 0) {
    if (e >= 2 * k) return b;
    const empty = arr.indexOf(0);
    if (empty >= 0 && e < k) arr[empty] = 1;
    else {
      const single = arr.findIndex((st) => st === 1 || st === 2);
      if (single >= 0) arr[single] = 3;
    }
  } else {
    if (e === 0) return b;
    const paired = arr.map((st, i) => [st, i] as const).filter(([st]) => st === 3 || st === 4).pop();
    if (paired) arr[paired[1]] = 1;
    else {
      const idx = arr.map((st, i) => [st, i] as const).filter(([st]) => st === 1 || st === 2).pop()![1];
      arr[idx] = 0;
    }
  }
  return { ...b, [label]: arr };
}

/** Promueve el electrón más externo al siguiente subnivel vacío (estado excitado). */
export function exciteOne(b: Boxes): Boxes {
  const conf = configurationFromBoxes(b);
  const last = conf[conf.length - 1];
  if (!last) return b;
  const from = subshellLabel(last);
  const target = MADELUNG_ORDER.slice(madelungIndex(last) + 1).find((s) => !(b[subshellLabel(s)] ?? []).some((x) => x !== 0));
  if (!target) return b;
  return addToSubshell(addToSubshell(b, from, -1), subshellLabel(target), 1);
}
