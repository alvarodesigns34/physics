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
}

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
  | { kind: 'order'; items: ChoiceOption[]; correctOrder: string[] };

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
}
