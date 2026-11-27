import type { ConstantSet } from '../science/constants';

export type Difficulty = 1 | 2 | 3;

export interface ChoiceOption {
  id: string;
  text: string;
  /** Retroalimentación específica si se elige esta opción y es incorrecta. */
  feedback?: string;
}

/** Detector de un error típico para respuestas numéricas (valor expresado en la unidad esperada). */
export interface NumericMisconception {
  test: (value: number) => boolean;
  message: string;
  /** Competencia que revela el error (por defecto, elección o despeje de la fórmula). */
  skill?: SkillId;
}

/**
 * Competencias que se diagnostican por separado. Un apartado puede aportar evidencia sobre varias.
 */
export type SkillId = 'concepto' | 'formula' | 'unidades' | 'calculo' | 'cifras' | 'notacion' | 'razonamiento';

/** Tipo de error identificado por el corrector. */
export type ErrorKind =
  | 'unidad-falta'
  | 'unidad-incompatible'
  | 'orden-de-magnitud'
  | 'signo'
  | 'inverso'
  | 'idea-erronea'
  | 'redondeo'
  | 'calculo'
  | 'cifras'
  | 'incompleto'
  | 'regla'
  | 'concepto'
  | 'formato';

export type AnswerSpec =
  | {
      kind: 'numeric';
      /** Valor esperado en `unit` */
      value: number;
      /** Símbolo canónico de la unidad esperada (clave de UNITS); '' si es adimensional */
      unit: string;
      /** Tolerancia relativa (por defecto 1 %) */
      relTol?: number;
      /** Cifras significativas justificadas por los datos */
      sigFigs?: number;
      misconceptions?: NumericMisconception[];
      /**
       * Arrastre de error: si el alumno falló un paso anterior, recalcula el valor esperado con SU
       * resultado (en la unidad esperada de ese paso).
       */
      recompute?: { from: string; fn: (studentPrev: number) => number };
    }
  | { kind: 'integer'; value: number }
  | { kind: 'choice'; options: ChoiceOption[]; correct: string[]; multiple?: boolean }
  | { kind: 'element'; z: number }
  | { kind: 'config'; electrons: number; z: number }
  | { kind: 'order'; items: ChoiceOption[]; correctOrder: string[] }
  /** Conjunto (n, l, m_l, m_s) válido que describa un electrón del subnivel indicado */
  | { kind: 'quantum'; n: number; l: number }
  /**
   * Respuesta de desarrollo. No hay corrección semántica automática: el alumno escribe, compara con la
   * respuesta modelo y se autoevalúa con la rúbrica. ATOM solo SUGIERE qué criterios parecen presentes
   * (palabras clave detectadas), y lo dice así.
   */
  | { kind: 'essay'; criteria: EssayCriterion[]; model: string; minWords?: number };

export interface EssayCriterion {
  id: string;
  /** Lo que debe aparecer en una respuesta completa */
  text: string;
  /** Grupos de palabras clave: el criterio se sugiere si cada grupo tiene al menos una coincidencia */
  keywords: string[][];
  /** Peso relativo (por defecto 1) */
  weight?: number;
}

/** Bloques de una resolución explicada (se usan los necesarios; una pregunta sencilla no lleva 12). */
export type ResolutionKind = 'pregunta' | 'datos' | 'principio' | 'por-que' | 'despeje' | 'unidades' | 'sustitucion' | 'calculo' | 'resultado' | 'interpretacion' | 'comprobacion' | 'errores' | 'metodo';

export interface ResolutionStep {
  kind: ResolutionKind;
  text: string;
  /** Fórmula en el subconjunto de LaTeX de MathText */
  math?: string;
}

/** Figuras que acompañan al enunciado (se dibujan en SVG; los datos son los del ejercicio). */
export type ExerciseFigure =
  | { kind: 'onda'; lambdaNm: number; windowNm: number; title: string }
  | { kind: 'puntos'; title: string; xLabel: string; yLabel: string; points: { x: number; y: number; label: string }[]; highlight?: string[] }
  | { kind: 'espectro'; title: string; linesNm: number[]; fromNm: number; toNm: number }
  | { kind: 'resolucion'; title: string; lines: string[] };

export interface ExercisePart {
  id: string;
  /** Lo que se pregunta en este paso */
  prompt: string;
  answer: AnswerSpec;
  /** Respuesta correcta formateada (se muestra en la solución y se usa en las pruebas de autoconsistencia) */
  canonical: string;
  /** Explicación razonada del paso */
  explanation: string;
  /** Ayuda de entrada: «en Hz», «escribe el símbolo»… */
  placeholder?: string;
  /** Apartados del temario que evalúa este paso (por defecto, los del ejercicio). */
  nodeIds?: string[];
  /** Competencias que pone en juego (por defecto, se deducen del tipo de respuesta). */
  skills?: SkillId[];
}

export interface Exercise {
  /** generador:dificultad:semilla */
  id: string;
  generatorId: string;
  nodeIds: string[];
  difficulty: Difficulty;
  title: string;
  /** Enunciado. Admite **negrita** y saltos de línea. */
  statement: string;
  data?: { label: string; value: string }[];
  parts: ExercisePart[];
  /** Si true, los pasos se desbloquean en orden (resolución paso a paso). */
  stepwise: boolean;
  /** Pistas graduadas: idea → herramienta → planteamiento */
  hints: [string, string, string];
  /** Resolución completa, línea a línea */
  solution: string[];
  /** Referencia a la fuente (p. ej. «AMP 7», «TEO ej. 1») */
  source?: string;
  /** Resolución explicada por bloques (qué piden → datos → principio → … → comprobación) */
  resolution?: ResolutionStep[];
  /** Métodos alternativos válidos, con su ventaja */
  methods?: { title: string; advantage: string; steps: ResolutionStep[] }[];
  /** Figura del enunciado (gráfica, onda, espectro o resolución con un error) */
  figure?: ExerciseFigure;
  /**
   * Nivel pedagógico 1–5 (comprender, aplicar, relacionar, razonar, examen exigente). Solo se declara en
   * las familias en las que la diferencia es real; si falta, se deriva de la dificultad.
   */
  level?: 1 | 2 | 3 | 4 | 5;
  /**
   * Solución tal como figura en el documento original («Sol.: …»). Se guarda aparte del enunciado y solo
   * se muestra una vez resuelto el ejercicio y nunca durante un examen.
   */
  originalSolution?: string;
  constants?: ConstantSet;
}

export interface ExerciseGenerator {
  id: string;
  title: string;
  nodeIds: string[];
  difficulties: Difficulty[];
  create: (seed: number, difficulty: Difficulty) => Exercise;
}

export type CheckStatus = 'correcto' | 'correcto-arrastre' | 'incorrecto' | 'formato' | 'vacio';

export interface CheckResult {
  status: CheckStatus;
  correct: boolean;
  /** Mensaje principal de retroalimentación */
  message: string;
  /** Avisos que no invalidan la respuesta (cifras significativas, orden de escritura…) */
  warnings: string[];
  /** Valor numérico interpretado (en la unidad esperada), para el arrastre de errores */
  numericValue?: number;
  /** Tipo de error diagnosticado (si lo hay) y competencia afectada */
  errorKind?: ErrorKind;
  errorSkill?: SkillId;
  /**
   * El valor numérico (expresado en la unidad esperada) es correcto aunque la respuesta falle por otra
   * razón (falta la unidad). Solo entonces un error de unidades preserva evidencia sobre el apartado.
   */
  valueCorrect?: boolean;
  /** La respuesta permitía evaluar las cifras significativas (hay criterio y el número no es ambiguo) */
  sigFigsAssessed?: boolean;
  /** Crédito parcial 0–1 cuando la respuesta no es binaria (desarrollo autoevaluado) */
  credit?: number;
  /** Errores secundarios detectados en la misma respuesta (p. ej., valor erróneo y además sin unidad) */
  secondary?: { kind: ErrorKind; skill?: SkillId }[];
}
