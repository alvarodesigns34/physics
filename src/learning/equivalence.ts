/**
 * ATOM 6.0 (iteración final) · Equivalencia REAL entre ejercicios.
 *
 * Dos identificadores distintos (otra semilla) no garantizan dos problemas distintos: muchas familias tienen
 * pocas combinaciones de datos (p. ej., 2–5 enunciados distintos en 200 semillas), y otras presentan el
 * mismo problema con los datos en otro orden. Para no contar como «otro enunciado» lo que es el mismo
 * problema, se compara una CLAVE DE PROBLEMA:
 * - el multiconjunto de términos del enunciado y de los datos (sin importar el orden de la lista: los
 *   mismos fotones en otro orden son el mismo problema);
 * - el multiconjunto de pares (pregunta, respuesta correcta) de los apartados, con las opciones de elección
 *   ordenadas y las respuestas de elección expresadas por su TEXTO (no por su posición).
 * Dos problemas con los mismos términos y exactamente las mismas respuestas en cada apartado se tratan como
 * el mismo: resolver uno demuestra lo mismo que resolver el otro.
 */
import { exerciseFromId } from './examSession';
import { GENERATOR_BY_ID } from './registry';
import type { Difficulty, Exercise } from './types';

/** Normaliza sin perder lo que distingue problemas: signos (−, +, -), «=», «/», cifras, sub/superíndices. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFC')
    .replace(/\*\*/g, '')
    .replace(/[−–]/g, '-')
    .replace(/[^\p{L}\p{N}⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺₀₁₂₃₄₅₆₇₈₉½,.·→=+\-/]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

export function problemKey(ex: Exercise): string {
  if (ex.equivalence) return `${ex.generatorId}:${ex.difficulty}:${fnv(ex.equivalence)}`;
  // El enunciado se compara EN ORDEN y con sus signos: (1, 0, −1, +½) y (1, 0, 1, −½) son problemas
  // distintos. La única excepción es la lista que el propio ejercicio pide ordenar: sus elementos se
  // quitan del enunciado (quedan representados, ya ordenados, en la respuesta), así que la misma lista
  // presentada en otro orden es el mismo problema.
  let st = norm(ex.statement);
  const items = ex.parts.flatMap((p) => (p.answer.kind === 'order' ? p.answer.items.map((i) => norm(i.text)) : [])).filter(Boolean);
  for (const it of [...items].sort((a, b) => b.length - a.length)) st = st.replace(new RegExp(`(^|[\\s,])${escapeRe(it)}(?=$|[\\s,.])`, 'g'), '$1§');
  const data = (ex.data ?? []).map((d) => `${norm(d.label)}=${norm(d.value)}`).sort().join('|');
  const parts = ex.parts
    .map((p) => {
      const a = p.answer;
      const ans =
        a.kind === 'choice'
          ? `${a.options.map((o) => norm(o.text)).sort().join('/')}=>${a.options.filter((o) => a.correct.includes(o.id)).map((o) => norm(o.text)).sort().join('/')}`
          : a.kind === 'order'
            ? a.correctOrder.map((id) => norm(a.items.find((i) => i.id === id)?.text ?? id)).join('>')
            : norm(p.canonical);
      return `${norm(p.prompt)}::${ans}`;
    })
    .sort()
    .join('||');
  return `${ex.generatorId}:${fnv(`${st}##${data}##${parts}`)}`;
}

const KEY_CACHE = new Map<string, string>();
/** Clave de problema a partir del id guardado en el historial (determinista). Si no se puede reconstruir, el propio id. */
export function problemKeyOfId(id: string): string {
  let k = KEY_CACHE.get(id);
  if (k === undefined) {
    const ex = exerciseFromId(id);
    k = ex ? problemKey(ex) : `id:${id}`;
    if (KEY_CACHE.size > 4000) KEY_CACHE.clear();
    KEY_CACHE.set(id, k);
  }
  return k;
}

const VARIETY_CACHE = new Map<string, number>();
/**
 * Número de problemas DISTINTOS que produce una familia a una dificultad (muestra determinista de 96
 * semillas). Es una cota inferior: sirve para saber si la familia permite demostrar transferencia o si sus
 * enunciados se pueden memorizar.
 */
export function familyVariety(generatorId: string, d: Difficulty): number {
  const k = `${generatorId}:${d}`;
  const hit = VARIETY_CACHE.get(k);
  if (hit !== undefined) return hit;
  const g = GENERATOR_BY_ID.get(generatorId);
  if (!g || !g.difficulties.includes(d)) return 0;
  const keys = new Set<string>();
  for (let i = 0; i < 96; i++) keys.add(problemKey(g.create(i * 7919 + 13, d)));
  VARIETY_CACHE.set(k, keys.size);
  return keys.size;
}

/**
 * Semilla para «otro equivalente»: un problema de la misma familia y dificultad cuya clave NO esté entre las
 * ya vistas. Si la familia no tiene más variantes, devuelve la que menos se ha visto y lo indica.
 */
export function freshSeed(generatorId: string, d: Difficulty, seen: Set<string> | Map<string, number>, rand: () => number = Math.random): { seed: number; exhausted: boolean } {
  const g = GENERATOR_BY_ID.get(generatorId);
  if (!g) return { seed: Math.floor(rand() * 1e9), exhausted: false };
  const count = (k: string) => (seen instanceof Map ? (seen.get(k) ?? 0) : seen.has(k) ? 1 : 0);
  // 1) semillas al azar; 2) barrido determinista (por si las variantes no se reparten por igual entre semillas).
  const tried: { seed: number; key: string }[] = [];
  const candidates = [...Array.from({ length: 60 }, () => Math.floor(rand() * 1e9)), ...Array.from({ length: 240 }, (_, i) => i * 7919 + 13)];
  for (const seed of candidates) {
    const key = problemKey(g.create(seed, d));
    if (!count(key)) return { seed, exhausted: false };
    tried.push({ seed, key });
  }
  // Sin variantes nuevas: la menos vista.
  tried.sort((a, b) => count(a.key) - count(b.key));
  return { seed: tried[0]!.seed, exhausted: true };
}
