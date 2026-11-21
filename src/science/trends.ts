/**
 * Propiedades periódicas con datos reales y razonamiento de tendencias, incluidas las excepciones.
 */
import { elementByZ, ieKJPerMol, type ElementRecord } from './elements';
import { groundState, formatConfiguration } from './configuration';
import { outerZeff } from './slater';

export type PropertyId = 'radio' | 'ei1' | 'ae' | 'en' | 'zeff' | 'masa';

export interface PropertyDef {
  id: PropertyId;
  label: string;
  short: string;
  unit: string;
  get: (el: ElementRecord) => number | null;
  digits: number;
  /** Nota sobre la fuente o el tipo de magnitud */
  note: string;
}

export const PROPERTIES: Record<PropertyId, PropertyDef> = {
  radio: { id: 'radio', label: 'Radio atómico (covalente)', short: 'Radio', unit: 'pm', get: (e) => e.covalentRadius, digits: 3, note: 'Radios covalentes de enlace simple (Pyykkö y Atsumi, 2009).' },
  ei1: { id: 'ei1', label: '1.ª energía de ionización', short: 'EI₁', unit: 'kJ/mol', get: (e) => (e.ie1 === null ? null : ieKJPerMol(e.ie1)), digits: 4, note: 'NIST ASD. 1 eV por átomo = 96,485 kJ/mol.' },
  ae: { id: 'ae', label: 'Afinidad electrónica', short: 'AE', unit: 'kJ/mol', get: (e) => (e.electronAffinity === null ? (e.ie1 === null ? null : 0) : ieKJPerMol(e.electronAffinity)), digits: 3, note: 'Energía liberada al captar un electrón. 0 indica que el anión no es estable (AE ≤ 0).' },
  en: { id: 'en', label: 'Electronegatividad (Pauling)', short: 'χ', unit: '', get: (e) => e.electronegativity, digits: 3, note: 'Escala de Pauling (CRC). Sin valor para He, Ne y Ar.' },
  zeff: { id: 'zeff', label: 'Carga nuclear efectiva (Slater)', short: 'Z_ef', unit: '', get: (e) => outerZeff(e.z, groundState(e.z)).zeff, digits: 3, note: 'Sobre el electrón más externo, con las reglas de Slater completas.' },
  masa: { id: 'masa', label: 'Masa atómica', short: 'M', unit: 'u', get: (e) => e.atomicWeight, digits: 5, note: 'Peso atómico estándar (IUPAC/CIAAW) o número másico del isótopo más estable.' },
};

/** Sentido de crecimiento según el temario (TEO p.20–22). */
const TREND: Record<'radio' | 'ei1' | 'ae' | 'en', { period: 'derecha' | 'izquierda'; group: 'abajo' | 'arriba' }> = {
  radio: { period: 'izquierda', group: 'abajo' },
  ei1: { period: 'derecha', group: 'arriba' },
  ae: { period: 'derecha', group: 'arriba' },
  en: { period: 'derecha', group: 'arriba' },
};

export type Relation = 'mismo-periodo' | 'mismo-grupo' | 'otra';

export function relationOf(a: ElementRecord, b: ElementRecord): Relation {
  if (a.period === b.period) return 'mismo-periodo';
  if (a.group !== null && a.group === b.group) return 'mismo-grupo';
  return 'otra';
}

export interface Comparison {
  prop: PropertyId;
  a: ElementRecord;
  b: ElementRecord;
  relation: Relation;
  /** Elemento con mayor valor según la tendencia (null si no se puede predecir) */
  predicted: ElementRecord | null;
  /** Elemento con mayor valor según los datos (null si faltan datos o son iguales) */
  actual: ElementRecord | null;
  reasoning: string[];
  exception: string | null;
}

const zef = (e: ElementRecord) => outerZeff(e.z, groundState(e.z)).zeff;
const f2 = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 2 });

/** Explicación específica de las excepciones más relevantes del temario. */
function knownException(prop: PropertyId, hi: ElementRecord, lo: ElementRecord): string | null {
  const pair = (x: number, y: number) => (hi.z === x && lo.z === y) || (hi.z === y && lo.z === x);
  if (prop === 'ei1') {
    if ((hi.group === 2 && lo.group === 13 && hi.period === lo.period) || pair(4, 5) || pair(12, 13))
      return `El ${lo.name.toLowerCase()} pierde un electrón np¹, más energético y más apantallado por los electrones ns² que el electrón ns del ${hi.name.toLowerCase()}: por eso cuesta menos arrancarlo, aunque su Z sea mayor.`;
    if (hi.group === 15 && lo.group === 16 && hi.period === lo.period)
      return `En el ${lo.name.toLowerCase()} (np⁴) el electrón sale de un orbital p doblemente ocupado: la repulsión entre los dos electrones de ese orbital facilita arrancarlo. El ${hi.name.toLowerCase()} tiene la subcapa np³ semillena, especialmente estable.`;
  }
  if (prop === 'ae') {
    if (pair(9, 17)) return 'El flúor es tan pequeño que el electrón añadido sufre una fuerte repulsión de los otros 7 electrones de valencia, concentrados en poco volumen. Por eso el cloro tiene la mayor afinidad electrónica de toda la tabla.';
    if (lo.electronAffinity === null) return `El ${lo.name.toLowerCase()} no forma un anión estable (AE ≤ 0): su configuración (${formatConfiguration(groundState(lo.z), { abbreviate: true })}) tiene subcapas llenas o semillenas y el electrón extra tendría que ocupar un subnivel de mayor energía.`;
  }
  if (prop === 'radio' && hi.block === 'd' && lo.block === 'd') return 'En los metales de transición el radio varía poco y de forma irregular: los electrones se añaden a la capa (n−1)d, que apantalla bastante bien a los electrones ns externos.';
  if (prop === 'radio' && ((hi.period === 5 && lo.period === 6) || (hi.period === 6 && lo.period === 5)) && hi.block === 'd') return 'Contracción lantánida: entre el periodo 5 y el 6 se llenan los orbitales 4f, que apantallan mal; la carga nuclear efectiva sube y los elementos del periodo 6 resultan casi del mismo tamaño que los del 5.';
  return null;
}

export function compare(prop: PropertyId, a: ElementRecord, b: ElementRecord): Comparison {
  const relation = relationOf(a, b);
  const P = PROPERTIES[prop];
  const va = P.get(a);
  const vb = P.get(b);
  const actual = va === null || vb === null || va === vb ? null : va > vb ? a : b;
  const reasoning: string[] = [];
  let predicted: ElementRecord | null = null;

  if (prop === 'masa') {
    predicted = a.z > b.z ? a : b;
    reasoning.push('La masa atómica crece, en general, con Z: más protones y, normalmente, más neutrones.');
  } else if (prop === 'zeff') {
    if (relation === 'mismo-periodo') {
      predicted = a.z > b.z ? a : b;
      reasoning.push(`En un periodo, cada protón añadido solo queda parcialmente apantallado por el electrón que entra en la misma capa (0,35): Z_ef aumenta hacia la derecha.`);
    } else if (relation === 'mismo-grupo') {
      reasoning.push('En un grupo, la Z_ef del electrón de valencia es aproximadamente constante (con Slater, desde el periodo 3 el valor apenas cambia).');
    }
  } else {
    const t = TREND[prop];
    const more = prop === 'radio' ? 'mayor' : 'mayor';
    if (relation === 'mismo-periodo') {
      const right = a.group !== null && b.group !== null ? (a.group > b.group ? a : b) : a.z > b.z ? a : b;
      const left = right === a ? b : a;
      predicted = t.period === 'derecha' ? right : left;
      reasoning.push(`${a.symbol} y ${b.symbol} están en el periodo ${a.period}: sus electrones externos ocupan la misma capa (n = ${a.period}).`);
      reasoning.push(`El ${right.name.toLowerCase()} (Z = ${right.z}) tiene más protones y, como el apantallamiento crece menos que Z, su carga nuclear efectiva es mayor (Slater: ${f2(zef(right))} frente a ${f2(zef(left))}).`);
      reasoning.push(
        prop === 'radio'
          ? `Los electrones externos están más atraídos por el núcleo: el ${right.name.toLowerCase()} es más pequeño, así que el ${left.name.toLowerCase()} tiene ${more} radio.`
          : `Los electrones externos están más atraídos por el núcleo: cuesta más arrancarlos y el núcleo atrae con más fuerza un electrón ajeno. El ${right.name.toLowerCase()} tiene ${more} ${P.short}.`,
      );
    } else if (relation === 'mismo-grupo') {
      const down = a.period > b.period ? a : b;
      const up = down === a ? b : a;
      predicted = t.group === 'abajo' ? down : up;
      reasoning.push(`${a.symbol} y ${b.symbol} están en el grupo ${a.group}: misma configuración de valencia y Z_ef casi constante.`);
      reasoning.push(`El ${down.name.toLowerCase()} tiene una capa más ocupada (periodo ${down.period} frente a ${up.period}): sus electrones externos están más lejos del núcleo.`);
      reasoning.push(prop === 'radio' ? `Por eso el ${down.name.toLowerCase()} tiene mayor radio.` : `Al estar más lejos, el núcleo los atrae menos: el ${up.name.toLowerCase()} tiene ${more} ${P.short}.`);
    } else {
      reasoning.push(`${a.symbol} (periodo ${a.period}${a.group ? `, grupo ${a.group}` : ''}) y ${b.symbol} (periodo ${b.period}${b.group ? `, grupo ${b.group}` : ''}) no comparten periodo ni grupo: hay que combinar las dos tendencias, y la predicción solo es fiable si ambas apuntan en el mismo sentido.`);
      if (a.group && b.group) {
        const aBetter = t.period === 'derecha' ? a.group > b.group : a.group < b.group;
        const aBetter2 = t.group === 'abajo' ? a.period > b.period : a.period < b.period;
        if (aBetter === aBetter2) predicted = aBetter ? a : b;
        else reasoning.push('Aquí las dos tendencias se oponen: solo los datos deciden.');
      }
    }
  }
  let exception: string | null = null;
  if (predicted && actual && predicted !== actual) {
    exception = knownException(prop, actual, predicted) ?? knownException(prop, predicted, actual) ?? 'Los datos experimentales no siguen la tendencia simple en este caso: la configuración concreta de cada elemento pesa más que la regla general.';
  } else if (predicted && !actual && prop === 'ae') {
    exception = knownException(prop, predicted, predicted === a ? b : a);
  }
  return { prop, a, b, relation, predicted, actual, reasoning, exception };
}

/** Ion monoatómico más habitual de un elemento representativo (TEO p.18) y su justificación. */
export function commonIon(el: ElementRecord): { charge: number | null; reason: string } {
  if (el.z === 1) return { charge: 1, reason: 'El hidrógeno suele perder su electrón (H⁺), aunque frente a metales muy activos forma H⁻.' };
  const g = el.group;
  const ng = [2, 10, 18, 36, 54, 86].reduce((best, z) => (Math.abs(z - el.z) < Math.abs(best - el.z) ? z : best), 2);
  const ngName = elementByZ(ng)!.name.toLowerCase();
  if (g === 1 || g === 2) return { charge: g, reason: `Pierde ${g} electrón${g > 1 ? 'es' : ''} ns y queda con la configuración del ${ngName}.` };
  if (g === 13 && el.z !== 5) return { charge: 3, reason: `Pierde sus 3 electrones ns²np¹ y alcanza una configuración de capa llena.` };
  if (g === 15 && el.period <= 3) return { charge: -3, reason: `Gana 3 electrones para completar np⁶, como el ${ngName}.` };
  if (g === 16 && el.period <= 5) return { charge: -2, reason: `Gana 2 electrones para completar np⁶, como el ${ngName}.` };
  if (g === 17) return { charge: -1, reason: `Gana 1 electrón para completar np⁶, como el ${ngName}.` };
  if (g === 18) return { charge: null, reason: 'Los gases nobles ya tienen la capa de valencia completa: no forman iones con facilidad.' };
  if (el.block === 'd') return { charge: null, reason: 'Los metales de transición suelen perder primero sus electrones ns y forman varios iones (p. ej. Fe²⁺ y Fe³⁺); no hay una regla única.' };
  return { charge: null, reason: 'No forma un ion monoatómico sencillo y habitual (tiende a compartir electrones).' };
}
