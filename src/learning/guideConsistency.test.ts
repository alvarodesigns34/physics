/**
 * ATOM 5.1 · Coherencia científica ENTRE capas de la guía y de los ejercicios (hallazgo de la auditoría):
 * una afirmación corregida en una capa no puede seguir apareciendo, en absoluto, en otra.
 */
import { describe, expect, it } from 'vitest';
import * as guide from './guide';
import * as depth from './guideDepth';
import * as prog from './guideProgression';
import { GENERATORS } from './registry';
import { groundState, sameConfiguration, speciesConfiguration } from '../science/configuration';

/** Todo el texto de las capas didácticas, como una cadena por fragmento. */
function allText(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(guide);
  walk(depth);
  walk(prog);
  for (const g of GENERATORS) for (const d of g.difficulties) for (const s of [1, 2, 3]) {
    const e = g.create(s, d);
    walk([e.statement, e.parts.map((p) => [p.explanation, p.answer]), e.solution]);
  }
  return out;
}

const TEXT = allText();

describe('absorción: un gas frío no muestra todas las líneas de emisión', () => {
  it.each([/mismas (posiciones|longitudes de onda) que las (líneas brillantes|de emisión)/i, /faltan exactamente esas longitudes/i, /absorben justamente las frecuencias que pueden emitir/i])('ninguna capa afirma %s', (re) => {
    expect(TEXT.filter((t) => re.test(t))).toEqual([]);
  });
});

describe('isoelectrónicas: mismo número de electrones no implica misma configuración', () => {
  it('el contraejemplo de la guía es cierto con el motor de configuraciones', () => {
    expect(sameConfiguration(groundState(20), speciesConfiguration(22, 20))).toBe(false); // Ca vs Ti²⁺
    expect(sameConfiguration(groundState(10), speciesConfiguration(11, 10))).toBe(true); // Ne vs Na⁺
  });
  it('ninguna capa lo presenta como regla absoluta', () => {
    expect(TEXT.filter((t) => /\(y la misma configuración electrónica\)/i.test(t))).toEqual([]);
    expect(TEXT.filter((t) => /isoelectrónicas tienen el mismo número de electrones repartidos de la misma forma/i.test(t))).toEqual([]);
  });
});

describe('modelos históricos: sus imágenes se presentan como del modelo, no como hechos', () => {
  it('«giran como planetas» siempre va ligado al modelo', () => {
    const bad = TEXT.filter((t) => /giran (a su alrededor )?como planetas/i.test(t) && !/(modelo|imagin|1911)/i.test(t));
    expect(bad).toEqual([]);
  });
  it('el espín no se describe como un giro literal sin matizar', () => {
    const bad = TEXT.filter((t) => /gira sobre sí mismo/i.test(t) && !/(no es|analog|imagen|clase|literal)/i.test(t));
    expect(bad).toEqual([]);
  });
});

describe('masa media: «más cerca del más abundante» solo está garantizado con dos isótopos', () => {
  it('ninguna capa lo afirma sin esa condición', () => {
    const bad = TEXT.filter((t) => /m[aá]s cerca del (is[oó]topo )?m[aá]s abundante/i.test(t) && !/dos/i.test(t));
    expect(bad).toEqual([]);
  });
});
