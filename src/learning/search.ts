/**
 * Búsqueda global de conceptos (⌘K / Ctrl K). Índice local y determinista, sin servicios externos.
 * Cada concepto del temario devuelve a la vez la teoría (guía), el laboratorio donde se observa y la
 * práctica del apartado. Admite sinónimos habituales en clase («Rydberg», «Hund», «Möller», «EI»…),
 * ignora tildes y mayúsculas y tolera prefijos («isotop» → isótopos).
 */
import { BLOCKS, NODES, type ModuleId } from './syllabus';
import { LESSONS, TRICKS, guideAnchor } from './guide';
import { GENERATORS } from './registry';

export type HitKind = 'teoria' | 'laboratorio' | 'practica' | 'formula' | 'truco' | 'pagina';

export interface SearchHit {
  kind: HitKind;
  title: string;
  detail: string;
  href: string;
  score: number;
}

const MODULE_ROUTE: Partial<Record<ModuleId, { route: string; label: string }>> = {
  forja: { route: '/forja', label: 'Atomic Forge' },
  historia: { route: '/historia', label: 'Time Machine' },
  fotones: { route: '/fotones', label: 'Photon Lab' },
  masas: { route: '/masas', label: 'Mass Spectrometry Lab' },
  cuantico: { route: '/cuantico', label: 'Quantum Space' },
  arquitecto: { route: '/arquitecto', label: 'Electron Architect' },
  periodico: { route: '/periodico', label: 'Periodic Universe' },
};

/** Sinónimos y términos de clase → apartados. */
const SYNONYMS: Record<string, string[]> = {
  rydberg: ['3.6', '3.7'],
  balmer: ['3.6', '3.7'],
  lyman: ['3.7'],
  paschen: ['3.7'],
  series: ['3.7'],
  hund: ['6.4'],
  pauli: ['6.2'],
  aufbau: ['6.3'],
  moller: ['6.3'],
  'diagrama de moller': ['6.3'],
  desapareados: ['6.4'],
  ei: ['7.9'],
  ionizacion: ['7.9'],
  'energia de ionizacion': ['7.9'],
  electronegatividad: ['7.11'],
  afinidad: ['7.10'],
  radio: ['7.7', '7.8'],
  isotopos: ['1.3', '3.1'],
  isotopo: ['1.3', '3.1'],
  abundancia: ['3.1'],
  'masa atomica': ['3.1'],
  'masa media': ['3.1'],
  espectrometro: ['3.1'],
  iones: ['1.4', '6.8', '7.5'],
  cation: ['1.4', '7.8'],
  anion: ['1.4', '7.8'],
  isoelectronicas: ['1.5'],
  planck: ['3.4'],
  foton: ['3.4'],
  frecuencia: ['3.2'],
  'longitud de onda': ['3.2'],
  lambda: ['3.2'],
  ev: ['3.9'],
  electronvoltio: ['3.9'],
  bohr: ['4.1', '4.2'],
  rutherford: ['2.4', '2.5', '2.6'],
  thomson: ['2.2', '2.3'],
  'rayos catodicos': ['2.2'],
  dalton: ['2.1'],
  heisenberg: ['5.2'],
  incertidumbre: ['5.2'],
  'de broglie': ['5.1'],
  orbital: ['5.3', '5.5'],
  orbitales: ['5.5'],
  'numeros cuanticos': ['5.4'],
  espin: ['5.4', '4.4'],
  zeeman: ['4.4'],
  sommerfeld: ['4.4'],
  slater: ['7.6'],
  'z efectiva': ['7.6'],
  apantallamiento: ['7.6'],
  excepciones: ['6.7', '7.13'],
  cromo: ['6.7'],
  cobre: ['6.7'],
  valencia: ['6.9'],
  'gas noble': ['6.6'],
  bloques: ['7.3'],
  grupo: ['7.2'],
  periodo: ['7.2'],
  metales: ['7.12'],
  'caracter metalico': ['7.12'],
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const nodeTitle = (id: string) => NODES.find((n) => n.id === id)?.title ?? id;

interface Doc {
  nodeIds: string[];
  kind: HitKind;
  title: string;
  detail: string;
  href: string;
  text: string;
}

function buildIndex(): Doc[] {
  const docs: Doc[] = [];
  for (const n of NODES) {
    docs.push({ nodeIds: [n.id], kind: 'teoria', title: n.title, detail: `Teoría · apartado ${n.id}`, href: `/guia?n=${guideAnchor(n.id)}`, text: normalize(`${n.title} ${n.id}`) });
  }
  for (const l of LESSONS) {
    for (const s of l.sections) {
      docs.push({ nodeIds: [s.node], kind: 'teoria', title: s.title, detail: `Guía · ${l.title}`, href: `/guia?n=${s.id ?? s.node}`, text: normalize(`${s.title} ${s.body.join(' ')}`) });
      for (const f of s.formulas ?? []) docs.push({ nodeIds: [s.node], kind: 'formula', title: f.expr, detail: `Fórmula · ${s.title}`, href: `/guia?n=${s.id ?? s.node}`, text: normalize(`${f.expr} ${s.title}`) });
    }
  }
  // Familias de ejercicios: «ion misterioso», «conversiones», «desarrollo», «espectro problema»…
  for (const g of GENERATORS) {
    docs.push({ nodeIds: g.nodeIds, kind: 'practica', title: `Ejercicios: ${g.title}`, detail: `Familia de ejercicios · ${g.nodeIds.slice(0, 3).join(', ')}`, href: `/entrenamiento?gen=${g.id}`, text: normalize(`${g.title} ${g.id.replace(/-/g, ' ')}`) });
  }
  // ATOM 6.0 · Centro de preparación del examen: la página y cada uno de sus bloques.
  docs.push({ nodeIds: [], kind: 'pagina', title: 'Preparar examen', detail: 'Imprescindibles, sesión de 15–90 min y problemas tipo examen por bloque', href: '/preparar', text: normalize('preparar examen imprescindibles sesion itinerario problemas tipo examen repaso final') });
  for (const b of BLOCKS) docs.push({ nodeIds: NODES.filter((n) => n.block === b.id).map((n) => n.id), kind: 'pagina', title: `Preparar examen: ${b.title}`, detail: 'Problemas que debes saber resolver en este bloque', href: `/preparar?b=${b.id}`, text: normalize(`preparar examen ${b.title} ${b.short}`) });
  for (const [node, list] of Object.entries(TRICKS)) {
    docs.push({ nodeIds: [node], kind: 'truco', title: `Trucos: ${nodeTitle(node)}`, detail: list[0]!.slice(0, 90), href: '/guia?v=trucos', text: normalize(`${nodeTitle(node)} ${list.join(' ')}`) });
  }
  return docs;
}

let INDEX: Doc[] | null = null;

/**
 * Busca un concepto. Devuelve, en orden: teoría y fórmulas, el laboratorio donde se observa y la práctica
 * de los apartados encontrados. Máximo `limit` resultados.
 */
export function search(query: string, limit = 12): SearchHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  INDEX ??= buildIndex();
  const terms = q.split(' ').filter((t) => t.length >= 2);
  const nodeScore = new Map<string, number>();
  const bump = (id: string, v: number) => nodeScore.set(id, (nodeScore.get(id) ?? 0) + v);
  for (const [k, ids] of Object.entries(SYNONYMS)) {
    if (k === q || (q.length >= 3 && k.startsWith(q)) || (k.includes(' ') && q.includes(k))) ids.forEach((id, i) => bump(id, 10 - i));
  }
  const hits: SearchHit[] = [];
  for (const d of INDEX) {
    let sc = 0;
    if (d.text.startsWith(q) || normalize(d.title).startsWith(q)) sc += 6;
    if (d.text.includes(q)) sc += 4;
    for (const t of terms) if (d.text.includes(t)) sc += d.kind === 'formula' ? 0.5 : 1;
    if (d.nodeIds.some((n) => nodeScore.has(n))) sc += 3;
    // Una familia de ejercicios cuyo nombre contiene la consulta es una respuesta directa: se prioriza.
    if (d.kind === 'practica' && d.text.includes(q)) sc += 3;
    // Palabra completa en el título («espectro» ≠ «espectrometría»).
    if (new RegExp(`(^|\\s)${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(normalize(d.title))) sc += 5;
    if (sc >= 4 || (terms.length > 1 && sc >= terms.length)) {
      hits.push({ kind: d.kind, title: d.title, detail: d.detail, href: d.href, score: sc + (d.kind === 'teoria' ? 0.5 : 0) });
      for (const n of d.nodeIds) bump(n, sc / 4);
    }
  }
  // Laboratorios y práctica de los apartados más relevantes.
  const topNodes = [...nodeScore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const seenLab = new Set<string>();
  for (const [id, sc] of topNodes) {
    const node = NODES.find((n) => n.id === id);
    if (!node) continue;
    for (const m of node.modules) {
      const lab = MODULE_ROUTE[m];
      if (lab && !seenLab.has(lab.route)) {
        seenLab.add(lab.route);
        hits.push({ kind: 'laboratorio', title: lab.label, detail: `Laboratorio · ${node.title}`, href: lab.route, score: sc + 2 });
      }
    }
    hits.push({ kind: 'practica', title: `Practicar: ${node.title}`, detail: `Ejercicios del apartado ${id}`, href: `/entrenamiento?nodes=${id}`, score: sc + 1 });
  }
  // Una entrada por destino, ordenadas por relevancia y agrupadas por tipo en la interfaz.
  const byHref = new Map<string, SearchHit>();
  for (const h of hits.sort((a, b) => b.score - a.score)) if (!byHref.has(h.href + h.title)) byHref.set(h.href + h.title, h);
  const out = [...byHref.values()];
  // Garantiza variedad: al menos un laboratorio y una práctica si existen.
  const pick = (k: HitKind) => out.find((h) => h.kind === k);
  const head = out.slice(0, limit);
  const missing = (['laboratorio', 'practica'] as const).map(pick).filter((h): h is SearchHit => !!h && !head.includes(h));
  for (const h of missing) {
    // Sustituye el último resultado de tipo teoría/fórmula/truco (nunca uno obligatorio ya añadido).
    for (let i = head.length - 1; i >= 0; i--) {
      if (head[i]!.kind !== 'laboratorio' && head[i]!.kind !== 'practica') {
        head.splice(i, 1);
        break;
      }
    }
    head.push(h);
  }
  return head;
}
