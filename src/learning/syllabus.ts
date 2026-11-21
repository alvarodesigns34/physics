/**
 * Temario como datos: los 52 nodos de la matriz de cobertura (docs/01-matriz-cobertura.md).
 */
export type ModuleId = 'forja' | 'historia' | 'fotones' | 'masas' | 'cuantico' | 'arquitecto' | 'periodico' | 'entrenamiento';

export interface SyllabusBlock {
  id: number;
  title: string;
  short: string;
}

export interface SyllabusNode {
  id: string;
  block: number;
  title: string;
  modules: ModuleId[];
  sources: string;
}

export const BLOCKS: SyllabusBlock[] = [
  { id: 1, title: 'Identificación de un átomo', short: 'Identidad' },
  { id: 2, title: 'Revisión histórica de los modelos atómicos', short: 'Modelos' },
  { id: 3, title: 'Espectros atómicos', short: 'Espectros' },
  { id: 4, title: 'Modelo de Bohr y correcciones', short: 'Bohr' },
  { id: 5, title: 'Modelo actual: orbitales y números cuánticos', short: 'Cuántica' },
  { id: 6, title: 'Configuración electrónica', short: 'Configuración' },
  { id: 7, title: 'Sistema periódico y propiedades periódicas', short: 'Periodicidad' },
];

const N = (id: string, title: string, modules: ModuleId[], sources: string): SyllabusNode => ({
  id,
  block: Number(id.split('.')[0]),
  title,
  modules,
  sources,
});

export const NODES: SyllabusNode[] = [
  N('1.1', 'Número atómico Z', ['forja'], 'TEO p.1 · AMP 1–5'),
  N('1.2', 'Número másico y notación ᴬ_Z X', ['forja'], 'TEO p.1 · AMP 1–5'),
  N('1.3', 'Isótopos', ['forja', 'masas'], 'TEO p.1 · AMP 3'),
  N('1.4', 'Iones: cationes y aniones', ['forja'], 'TEO p.1 · AMP 4–5'),
  N('1.5', 'Especies isoelectrónicas', ['forja', 'periodico'], 'TEO p.1, 21 · AMP 23, 27'),
  N('1.6', 'Partículas subatómicas', ['forja'], 'TEO p.3 · AMP 1'),
  N('2.1', 'Demócrito y Dalton', ['historia'], 'TEO p.2, 4'),
  N('2.2', 'Tubo de rayos catódicos: el electrón', ['historia'], 'TEO p.2 · PMA'),
  N('2.3', 'Modelo de Thomson', ['historia'], 'TEO p.2 · PMA'),
  N('2.4', 'Experimento de Geiger–Marsden', ['historia'], 'TEO p.2–3 · PMA'),
  N('2.5', 'Modelo de Rutherford', ['historia'], 'TEO p.2–3'),
  N('2.6', 'Limitaciones del modelo de Rutherford', ['historia'], 'TEO p.3'),
  N('2.7', 'Cronología de los modelos', ['historia'], 'TEO p.4'),
  N('3.1', 'Espectrometría de masas y masa atómica media', ['masas'], 'TEO p.5'),
  N('3.2', 'Ondas EM: λ, ν, T, c', ['fotones'], 'TEO p.5–6 · AMP 6'),
  N('3.3', 'Espectro electromagnético', ['fotones'], 'TEO p.6 · AMP 6c, 7c'),
  N('3.4', 'Energía del fotón E = h·ν', ['fotones'], 'TEO p.8 · AMP 6–8'),
  N('3.5', 'Espectros de emisión y absorción', ['fotones'], 'TEO p.7'),
  N('3.6', 'Espectro del H: Balmer y Rydberg', ['fotones'], 'TEO p.9 · AMP 7–9'),
  N('3.7', 'Series espectrales del hidrógeno', ['fotones'], 'TEO p.10 · AMP 8–9'),
  N('3.8', 'Número de líneas desde un nivel', ['fotones'], 'AMP 10'),
  N('3.9', 'Conversión de unidades', ['fotones'], 'AMP datos'),
  N('4.1', 'Postulados de Bohr', ['historia', 'fotones'], 'TEO p.8 · PMA'),
  N('4.2', 'Radios y niveles de energía de Bohr', ['fotones', 'historia'], 'TEO p.8, 10'),
  N('4.3', 'El espectro del H como saltos entre niveles', ['fotones'], 'TEO p.9 · AMP 7e'),
  N('4.4', 'Correcciones: Sommerfeld, Zeeman, espín', ['historia', 'cuantico'], 'TEO p.11'),
  N('5.1', 'Dualidad onda-partícula', ['cuantico'], 'TEO p.11'),
  N('5.2', 'Principio de incertidumbre', ['cuantico'], 'TEO p.11'),
  N('5.3', 'Órbita frente a orbital', ['cuantico'], 'TEO p.11 · AMP 11'),
  N('5.4', 'Números cuánticos', ['cuantico'], 'TEO p.12–15 · AMP 12, 14'),
  N('5.5', 'Formas y número de orbitales', ['cuantico'], 'TEO p.12–15 · AMP 13, 18'),
  N('5.6', 'Estados cuánticos de un nivel', ['cuantico'], 'TEO p.13'),
  N('6.1', 'Notación de configuraciones y de cajas', ['arquitecto'], 'TEO p.13'),
  N('6.2', 'Principio de exclusión de Pauli', ['arquitecto'], 'TEO p.13–14'),
  N('6.3', 'Diagrama de Möller y Aufbau', ['arquitecto'], 'TEO p.13–14 · AMP 15, 17'),
  N('6.4', 'Regla de Hund y electrones desapareados', ['arquitecto'], 'TEO p.14–15'),
  N('6.5', 'Estados fundamental, excitado y prohibido', ['arquitecto'], 'PSP · AMP 17, 19'),
  N('6.6', 'Notación abreviada con gas noble', ['arquitecto'], 'TEO p.16–17 · AMP 19'),
  N('6.7', 'Excepciones: Cr, Mo, Cu, Ag, Au', ['arquitecto', 'periodico'], 'TEO p.16'),
  N('6.8', 'Configuración de iones', ['arquitecto', 'forja'], 'TEO p.15, 18 · AMP 22a'),
  N('6.9', 'Electrones de valencia', ['arquitecto', 'periodico'], 'TEO p.16 · PSP'),
  N('7.1', 'Organización de la tabla periódica', ['periodico'], 'TEO p.16 · PSP'),
  N('7.2', 'Grupo y periodo desde la configuración', ['periodico'], 'TEO p.16 · AMP 15–20'),
  N('7.3', 'Bloques s, p, d y f', ['periodico'], 'TEO p.18'),
  N('7.4', 'Familias y clasificación', ['periodico'], 'TEO p.18 · PSP · AMP 16, 21'),
  N('7.5', 'Formación de iones estables', ['periodico', 'forja'], 'TEO p.18 · AMP 22a'),
  N('7.6', 'Apantallamiento y Z efectiva', ['periodico'], 'TEO p.19'),
  N('7.7', 'Radio atómico', ['periodico'], 'TEO p.20 · AMP 22b, 31b'),
  N('7.8', 'Radio iónico', ['periodico'], 'TEO p.20–21 · AMP 22c, 23'),
  N('7.9', 'Energía de ionización', ['periodico'], 'TEO p.21–22 · AMP 24–31'),
  N('7.10', 'Afinidad electrónica', ['periodico'], 'TEO p.21–22'),
  N('7.11', 'Electronegatividad', ['periodico'], 'TEO p.21–22 · AMP 20c'),
  N('7.12', 'Carácter metálico', ['periodico'], 'TEO p.20, 22'),
  N('7.13', 'Excepciones a las tendencias', ['periodico'], 'Matiz añadido · TEO 20c'),
];

export const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

export function nodeTitle(id: string): string {
  return NODE_BY_ID.get(id)?.title ?? id;
}
