/**
 * ATOM 6.0 · Centro de preparación del examen (lógica pura, sin React).
 *
 * Qué NO hace: no estima la probabilidad de que algo «caiga». ATOM no sabe qué preguntará tu profesor.
 * Separa tres ejes que no deben confundirse:
 *
 * - Importancia curricular (`tier` + `scope`): decisión razonada a partir de la profundidad que fija la
 *   teoría (TEO) en la matriz de cobertura: «esencial» es lo que todo lo demás presupone; «examen», un
 *   problema de nivel examen; «exigente», un problema multiconcepto o inverso. `scope` dice si es
 *   contenido examinable, ampliación (TEO lo trata solo cualitativamente) o enriquecimiento.
 * - Representatividad observada (`representativity`): se CALCULA contando preguntas distintas de las
 *   fuentes (TEO, AMP, HOJ, EBAU) que tocan los apartados centrales de la familia. Los apartados de una
 *   misma pregunta (AMP 12a–d, EBAU-1 a y b…) cuentan UNA vez.
 * - Dificultad (`difficulty`) y tiempo estimado: propiedades del problema, no de su frecuencia.
 *
 * La preparación del alumno sale de SU evidencia (intentos de esa familia), con reglas explícitas y sin
 * porcentajes: con poca evidencia se dice que hay poca evidencia.
 */
import { SOURCE_EXERCISES } from './registry';
import { guideAnchorFor } from './guide';
import type { Difficulty } from './types';
import { familyVariety, problemKeyOfId } from './equivalence';

export type Tier = 'esencial' | 'examen' | 'exigente';
export type Scope = 'examinable' | 'ampliacion' | 'enriquecimiento';
export type LabRoute = '/forja' | '/historia' | '/fotones' | '/masas' | '/cuantico' | '/arquitecto' | '/periodico';

export interface PrepFamily {
  generatorId: string;
  /** Bloque del centro (1–7, los del temario) */
  block: number;
  title: string;
  /** Qué competencia evalúa */
  competence: string;
  tier: Tier;
  scope: Scope;
  /** Apartados centrales (para representatividad y teoría); más estrechos que los del generador */
  core: string[];
  /** Dificultad con que se practica por defecto, y la exigente si existe */
  difficulty: Difficulty;
  hard?: Difficulty;
  /** Minutos orientativos para resolver un ejercicio sin ayuda */
  minutes: number;
  /** Por qué está aquí */
  why: string;
  pitfalls: string[];
  lab?: { route: LabRoute; label: string };
}

export const TIER_LABEL: Record<Tier, string> = { esencial: 'Esencial', examen: 'Tipo examen', exigente: 'Exigente' };
export const SCOPE_LABEL: Record<Scope, string> = { examinable: 'Examinable', ampliacion: 'Ampliación', enriquecimiento: 'Enriquecimiento' };

const F = (p: PrepFamily) => p;

/** Catálogo razonado por bloques (orden = orden recomendado de estudio dentro del bloque). */
export const PREP_FAMILIES: PrepFamily[] = [
  // ── 1. Identificación de un átomo ─────────────────────────────────────
  F({ generatorId: 'nucleo-especie', block: 1, title: 'Protones, neutrones, electrones y carga', competence: 'Deducir la composición de un átomo o ion a partir de datos incompletos (Z, A, carga o número de electrones).', tier: 'esencial', scope: 'examinable', core: ['1.1', '1.2', '1.4'], difficulty: 2, hard: 3, minutes: 4, why: 'Es la base de todo el tema y la familia con más preguntas en tus fuentes (las tablas de AMP 2–5 y HOJ 2–5).', pitfalls: ['Calcular N = A − e en lugar de N = A − Z.', 'En un anión X²⁻ restar electrones: un anión GANA electrones.', 'Confundir el número másico A (entero) con la masa atómica.'], lab: { route: '/forja', label: 'Atomic Forge' } }),
  F({ generatorId: 'isoelectronicas', block: 1, title: 'Isótopos, iones e isoelectrónicos', competence: 'Distinguir isótopos (mismo Z), iones (distinto número de electrones) y especies isoelectrónicas (mismo número de electrones).', tier: 'esencial', scope: 'examinable', core: ['1.5', '1.3'], difficulty: 2, hard: 3, minutes: 3, why: 'Conceptos que se confunden entre sí y que reaparecen al ordenar radios iónicos y energías de ionización.', pitfalls: ['Creer que isoelectrónicas implica la misma configuración: Ca y Ti²⁺ tienen 20 e⁻ y configuraciones distintas.', 'Decir que los isótopos tienen distinto número de protones.'], lab: { route: '/forja', label: 'Atomic Forge' } }),
  F({ generatorId: 'masa-media', block: 1, title: 'Masa atómica media y abundancias', competence: 'Calcular la masa atómica media a partir de masas isotópicas y abundancias, y el problema inverso.', tier: 'esencial', scope: 'examinable', core: ['3.1', '1.3'], difficulty: 2, hard: 3, minutes: 5, why: 'Problema numérico clásico (HOJ 6–7, TEO del cloro): aparece en directo y en inverso.', pitfalls: ['No dividir los porcentajes entre 100.', 'Usar el número másico en lugar de la masa isotópica cuando el enunciado da esta.', 'En el problema inverso, olvidar que las abundancias suman 1 (100 %).'], lab: { route: '/masas', label: 'Mass Spectrometry Lab' } }),
  F({ generatorId: 'isotopo-desconocido', block: 1, title: 'Masa de un isótopo desconocido', competence: 'Despejar la masa de un isótopo a partir de la masa media y las abundancias.', tier: 'examen', scope: 'examinable', core: ['3.1'], difficulty: 2, hard: 3, minutes: 5, why: 'Misma ecuación que la masa media, pero despejando otra incógnita: distingue quien entiende la media ponderada de quien aplica una plantilla.', pitfalls: ['Despejar mal: hay que restar la contribución del isótopo conocido ANTES de dividir.', 'Dar un resultado fuera del intervalo de masas razonable sin comprobarlo.'], lab: { route: '/masas', label: 'Mass Spectrometry Lab' } }),
  F({ generatorId: 'espectro-masas-lectura', block: 1, title: 'Leer un espectro de masas', competence: 'Interpretar las alturas relativas de los picos como abundancias y calcular la masa media.', tier: 'examen', scope: 'examinable', core: ['3.1', '1.3'], difficulty: 2, hard: 3, minutes: 5, why: 'Interpretación de una gráfica experimental: las alturas son relativas, no porcentajes.', pitfalls: ['Tomar las alturas relativas como porcentajes sin normalizar.', 'Leer la posición del pico como número másico sin decimales cuando se pide la masa.'], lab: { route: '/masas', label: 'Mass Spectrometry Lab' } }),
  F({ generatorId: 'examen-masa-iones', block: 1, title: 'Problema completo: isótopos, iones y masa', competence: 'Encadenar composición de iones, isótopos y masa atómica media en un mismo problema.', tier: 'exigente', scope: 'examinable', core: ['3.1', '1.1', '1.3', '1.4'], difficulty: 2, hard: 3, minutes: 9, why: 'Estructura de problema de examen con varios apartados dependientes.', pitfalls: ['Arrastrar un error del primer apartado sin comprobar la coherencia del resultado final.'], lab: { route: '/masas', label: 'Mass Spectrometry Lab' } }),
  F({ generatorId: 'ion-misterioso', block: 1, title: 'El ion misterioso (multibloque)', competence: 'Identificar un ion a partir de pistas sobre su composición y su configuración.', tier: 'exigente', scope: 'examinable', core: ['1.4', '6.8'], difficulty: 3, minutes: 8, why: 'Conecta el bloque 1 con la configuración de iones: exige razonar hacia atrás.', pitfalls: ['Quitar electrones 3d antes que 4s en cationes de transición.', 'Confundir el número de electrones del ion con Z.'], lab: { route: '/forja', label: 'Atomic Forge' } }),

  // ── 2. Modelos atómicos ───────────────────────────────────────────────
  F({ generatorId: 'historia', block: 2, title: 'Modelos y experimentos clave', competence: 'Relacionar cada modelo con el experimento que lo motivó o lo refutó.', tier: 'esencial', scope: 'examinable', core: ['2.2', '2.3', '2.4', '2.5', '2.6'], difficulty: 1, minutes: 2, why: 'Teoría que se pregunta de forma breve y casi siempre combinada con justificaciones.', pitfalls: ['Atribuir el núcleo a Thomson o los niveles a Rutherford.', 'Decir que en Geiger–Marsden «todas» las partículas se desvían.'], lab: { route: '/historia', label: 'Time Machine' } }),
  F({ generatorId: 'prediccion-modelos', block: 2, title: 'Predice con el modelo', competence: 'Predecir qué observaría cada modelo en un experimento y justificar por qué un resultado lo contradice.', tier: 'examen', scope: 'examinable', core: ['2.3', '2.4', '2.5', '2.6'], difficulty: 2, minutes: 3, why: 'Exige razonamiento, no memoria: por qué la dispersión a gran ángulo refuta a Thomson o por qué Rutherford no explica los espectros.', pitfalls: ['Confundir «el modelo no lo explica» con «el modelo predice lo contrario».', 'Olvidar que el electrón en órbita debería radiar y caer (limitación de Rutherford).'], lab: { route: '/historia', label: 'Time Machine' } }),
  F({ generatorId: 'desarrollo', block: 2, title: 'Preguntas de desarrollo con rúbrica', competence: 'Redactar una justificación completa y rigurosa (incluye preguntas de otros bloques).', tier: 'examen', scope: 'examinable', core: ['2.6', '5.3'], difficulty: 2, minutes: 6, why: 'Las cuestiones teóricas del examen se puntúan por criterios: la rúbrica los hace explícitos. ATOM sugiere qué criterios detecta, pero la nota es tu autoevaluación.', pitfalls: ['Dar la conclusión sin el motivo físico.', 'Usar «órbita» cuando se habla del modelo actual.'], lab: { route: '/historia', label: 'Time Machine' } }),

  // ── 3. Ondas, fotones y espectros ─────────────────────────────────────
  F({ generatorId: 'onda-lambda', block: 3, title: 'λ, ν, T y energía de un fotón', competence: 'Relacionar longitud de onda, frecuencia, periodo y energía, con conversión de unidades y región del espectro.', tier: 'esencial', scope: 'examinable', core: ['3.2', '3.4', '3.9'], difficulty: 2, hard: 3, minutes: 4, why: 'Herramienta de todos los problemas de espectros (AMP 6, HOJ 8–9).', pitfalls: ['Usar λ en nm dentro de c = λ·ν.', 'Confundir E = h·ν con E = h·λ.', 'Asignar la región sin convertir antes a nm.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'conversiones', block: 3, title: 'Conversiones encadenadas', competence: 'Pasar entre J, eV, kJ/mol, nm, Hz y cm⁻¹ sin perder potencias de 10.', tier: 'esencial', scope: 'examinable', core: ['3.9'], difficulty: 2, hard: 3, minutes: 3, why: 'La fuente más frecuente de errores numéricos en este tema.', pitfalls: ['Olvidar ÷ N_A al pasar de kJ/mol a J por átomo.', 'Invertir el factor (nm → m multiplicando por 10⁹).'] }),
  F({ generatorId: 'rydberg', block: 3, title: 'Transiciones del hidrógeno (Rydberg)', competence: 'Aplicar la ecuación de Rydberg para obtener λ, ν y E de una transición y su serie.', tier: 'esencial', scope: 'examinable', core: ['3.6', '3.7'], difficulty: 2, hard: 3, minutes: 5, why: 'Problema estrella del bloque (AMP 7–8, HOJ 10, TEO ej. 1).', pitfalls: ['Poner n₁ y n₂ al revés y obtener una λ negativa.', 'Usar R en m⁻¹ con λ en cm (o al revés).', 'Asignar la serie por el nivel de partida en vez del de llegada.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'serie-inversa', block: 3, title: 'Identificar una línea por su frecuencia', competence: 'Usar Rydberg en sentido inverso para deducir el nivel de partida.', tier: 'examen', scope: 'examinable', core: ['3.7', '3.6'], difficulty: 2, hard: 3, minutes: 5, why: 'Problema inverso que aparece en AMP 9 y HOJ 11.', pitfalls: ['No comprobar que el n obtenido es entero.', 'Redondear demasiado pronto y obtener un n que no cuadra.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'cascada', block: 3, title: 'Número de líneas de emisión', competence: 'Contar las transiciones posibles desde un nivel y clasificarlas por series.', tier: 'esencial', scope: 'examinable', core: ['3.8'], difficulty: 2, minutes: 3, why: 'Pregunta breve y frecuente (AMP 10).', pitfalls: ['Contar solo los saltos directos al fundamental.', 'Usar n² en vez de n(n − 1)/2.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'absorcion-fundamental', block: 3, title: 'Absorción desde el estado fundamental', competence: 'Decidir qué fotones absorbe un átomo en n = 1, deducir la emisión posterior y la energía del electrón arrancado.', tier: 'exigente', scope: 'examinable', core: ['3.5', '4.3'], difficulty: 2, hard: 3, minutes: 7, why: 'Nueva en ATOM 6.0: diferencia emisión y absorción con datos que parecen útiles y no lo son (una línea de Balmer).', pitfalls: ['Creer que un fotón «casi» resonante se absorbe en parte.', 'Pensar que un átomo en n = 1 absorbe una línea de Balmer.', 'No restar la energía de ionización para la energía cinética.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'error-rydberg', block: 3, title: 'Encuentra el error (Rydberg)', competence: 'Detectar el fallo en un procedimiento aparentemente correcto.', tier: 'examen', scope: 'examinable', core: ['3.6', '3.9'], difficulty: 2, hard: 3, minutes: 4, why: 'Revisar un razonamiento ajeno obliga a conocer cada paso, no solo el resultado.', pitfalls: ['Dar por buena una resolución porque el número «parece razonable».'] }),
  F({ generatorId: 'espectro-problema', block: 3, title: 'Identificar elementos por su espectro', competence: 'Comparar un espectro problema con espectros de referencia (emisión y absorción).', tier: 'examen', scope: 'examinable', core: ['3.5'], difficulty: 2, hard: 3, minutes: 3, why: 'Interpretación experimental del bloque: el espectro como huella del elemento.', pitfalls: ['Exigir que coincidan también las intensidades.', 'Confundir líneas brillantes (emisión) con oscuras (absorción).'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'examen-ondas', block: 3, title: 'Problema completo de ondas y fotones', competence: 'Resolver un problema de varios apartados sobre radiación electromagnética.', tier: 'examen', scope: 'examinable', core: ['3.2', '3.4', '3.9'], difficulty: 2, hard: 3, minutes: 7, why: 'Formato de problema de examen con apartados encadenados.', pitfalls: ['Arrastrar una conversión errónea a todos los apartados.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'examen-espectro', block: 3, title: 'Problema completo del espectro del hidrógeno', competence: 'Encadenar transición, serie, energía, región y número de líneas.', tier: 'exigente', scope: 'examinable', core: ['3.6', '3.7', '3.8'], difficulty: 2, hard: 3, minutes: 10, why: 'El problema más completo del bloque: combina todo lo anterior.', pitfalls: ['Signo de la energía: el fotón emitido tiene energía positiva aunque ΔE del átomo sea negativa.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'linea-desconocida', block: 3, title: 'Línea del H sin serie conocida', competence: 'Deducir los dos niveles de una línea probando series (dos métodos).', tier: 'exigente', scope: 'examinable', core: ['3.7', '3.6'], difficulty: 3, minutes: 8, why: 'Problema inverso con dos incógnitas: exige una estrategia, no una fórmula.', pitfalls: ['Aceptar un n no entero.', 'No justificar por qué se descartan otras series.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'luz-ionizante', block: 3, title: 'Luz capaz de ionizar', competence: 'Relacionar una energía de ionización en kJ/mol con la λ máxima de un fotón.', tier: 'exigente', scope: 'examinable', core: ['3.4', '7.9'], difficulty: 2, hard: 3, minutes: 6, why: 'Conecta espectros y sistema periódico; trampa de unidades (por mol frente a por átomo).', pitfalls: ['Olvidar ÷ N_A.', 'Decir que es una λ mínima.'] }),

  // ── 4. Modelo de Bohr ─────────────────────────────────────────────────
  F({ generatorId: 'nivel-energia', block: 4, title: 'Energías y radios de Bohr', competence: 'Calcular energías y radios permitidos e interpretar el signo de la energía.', tier: 'esencial', scope: 'examinable', core: ['4.2'], difficulty: 2, minutes: 4, why: 'Base cuantitativa del modelo de Bohr.', pitfalls: ['Olvidar el signo negativo de Eₙ.', 'Usar n en lugar de n² en el radio.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'bohr-proporciones', block: 4, title: 'Proporciones entre niveles', competence: 'Comparar radios y energías de distintos niveles sin calcular valores absolutos.', tier: 'examen', scope: 'examinable', core: ['4.2', '4.3'], difficulty: 2, hard: 3, minutes: 4, why: 'Distingue la comprensión de la estructura n², 1/n² de la aplicación mecánica.', pitfalls: ['Invertir el cociente de energías.', 'Suponer niveles equidistantes.'], lab: { route: '/fotones', label: 'Photon Lab' } }),
  F({ generatorId: 'ionizacion-nivel-minimo', block: 4, title: 'Nivel mínimo para ionizar', competence: 'Resolver una desigualdad con niveles de Bohr: desde qué n un fotón ioniza.', tier: 'exigente', scope: 'examinable', core: ['4.2', '7.9'], difficulty: 2, hard: 3, minutes: 5, why: 'Problema inverso con redondeo razonado hacia arriba.', pitfalls: ['Redondear al entero más próximo en lugar de hacia arriba.'], lab: { route: '/fotones', label: 'Photon Lab' } }),

  // ── 5. Orbitales y números cuánticos ──────────────────────────────────
  F({ generatorId: 'cuanticos-validez', block: 5, title: 'Validar números cuánticos', competence: 'Decidir si un conjunto (n, l, m_l, m_s) es posible y por qué.', tier: 'esencial', scope: 'examinable', core: ['5.4'], difficulty: 2, minutes: 2, why: 'Una de las preguntas más repetidas en tus fuentes (AMP 12, HOJ 23, TEO ej. 2, EBAU).', pitfalls: ['Permitir l = n.', 'Olvidar que m_s solo vale ±½.', 'Permitir |m_l| > l.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),
  F({ generatorId: 'orbitales-recuento', block: 5, title: 'Orbitales y electrones por nivel', competence: 'Determinar orbitales y electrones máximos de un nivel o subnivel.', tier: 'esencial', scope: 'examinable', core: ['5.5', '5.6'], difficulty: 2, minutes: 3, why: 'Recuentos que se piden directamente y que sostienen la configuración electrónica.', pitfalls: ['Confundir n² orbitales con 2n² electrones.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),
  F({ generatorId: 'subnivel', block: 5, title: 'Números cuánticos de un subnivel', competence: 'Identificar orbitales y subniveles a partir de n y l (y al revés).', tier: 'examen', scope: 'examinable', core: ['5.4', '5.5'], difficulty: 2, minutes: 3, why: 'Aparece en AMP 13, HOJ 24–26 y EBAU 2021.', pitfalls: ['Asociar l = 2 con p.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),
  F({ generatorId: 'cuantica-conceptos', block: 5, title: 'Órbita, orbital, dualidad e incertidumbre', competence: 'Diferenciar órbita y orbital y explicar la dualidad y la incertidumbre de forma cualitativa.', tier: 'esencial', scope: 'examinable', core: ['5.3', '5.1', '5.2'], difficulty: 1, minutes: 2, why: 'Teoría que TEO trata cualitativamente y que se pregunta para justificar el modelo actual.', pitfalls: ['Describir el orbital como una trayectoria.', 'Decir que la incertidumbre es un error de medida.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),
  F({ generatorId: 'electrones-por-numeros', block: 5, title: 'Contar electrones con números cuánticos', competence: 'Contar cuántos electrones de un átomo cumplen una condición sobre n, l o n + l.', tier: 'examen', scope: 'examinable', core: ['5.4', '6.3'], difficulty: 2, hard: 3, minutes: 4, why: 'Nueva en ATOM 6.0: obliga a traducir números cuánticos a subniveles reales de una configuración.', pitfalls: ['Contar solo la capa de valencia.', 'Olvidar los 3d al contar n = 3.'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),
  F({ generatorId: 'examen-cuantico', block: 5, title: 'Problema completo de números cuánticos', competence: 'Combinar números cuánticos, orbitales y configuración en un problema de varios apartados.', tier: 'exigente', scope: 'examinable', core: ['5.4', '5.5'], difficulty: 2, hard: 3, minutes: 7, why: 'Formato de examen del bloque (EBAU 2025).', pitfalls: ['Asignar al electrón diferenciador un m_l imposible para su subnivel.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),
  F({ generatorId: 'de-broglie', block: 5, title: 'Longitud de onda de De Broglie', competence: 'Aplicar λ = h/(m·v) a partículas.', tier: 'examen', scope: 'ampliacion', core: ['5.1'], difficulty: 2, hard: 3, minutes: 4, why: 'TEO presenta la dualidad de forma cualitativa: el cálculo es ampliación útil para entenderla.', pitfalls: ['Usar la masa en gramos.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),
  F({ generatorId: 'heisenberg', block: 5, title: 'Principio de incertidumbre (cálculo)', competence: 'Estimar Δx o Δp con Δx·Δp ≥ h/4π.', tier: 'examen', scope: 'ampliacion', core: ['5.2'], difficulty: 2, hard: 3, minutes: 4, why: 'Ampliación: en TEO el principio es cualitativo.', pitfalls: ['Interpretarlo como un límite de los aparatos.'], lab: { route: '/cuantico', label: 'Quantum Space' } }),

  // ── 6. Configuración electrónica ──────────────────────────────────────
  F({ generatorId: 'configuracion', block: 6, title: 'Configuración de átomos', competence: 'Escribir configuraciones completas y abreviadas con el orden de Möller, incluidas Cr y Cu.', tier: 'esencial', scope: 'examinable', core: ['6.3', '6.6'], difficulty: 2, hard: 3, minutes: 3, why: 'Imprescindible: sin ella no se resuelve el bloque 7 (AMP 15, TEO ej. 7–8).', pitfalls: ['Llenar 3d antes que 4s.', 'Aplicar la «excepción» del Cr o del Cu a elementos que no la tienen.'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),
  F({ generatorId: 'configuracion-ion', block: 6, title: 'Configuración de iones', competence: 'Escribir configuraciones de cationes y aniones, también de metales de transición.', tier: 'esencial', scope: 'examinable', core: ['6.8'], difficulty: 2, hard: 3, minutes: 3, why: 'Error clásico de examen en cationes de transición (TEO ej. 7).', pitfalls: ['Quitar primero los electrones 3d: en los cationes de transición salen antes los 4s.'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),
  F({ generatorId: 'estado-configuracion', block: 6, title: 'Fundamental, excitado o imposible', competence: 'Clasificar configuraciones según Möller, Pauli y la existencia de subniveles.', tier: 'esencial', scope: 'examinable', core: ['6.5'], difficulty: 2, minutes: 2, why: 'Muy representado en tus fuentes (AMP 17 y 19, EBAU-3).', pitfalls: ['Llamar «imposible» a un estado excitado.', 'Aceptar subniveles inexistentes (2d, 1p).'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),
  F({ generatorId: 'pauli-hund', block: 6, title: 'Pauli y Hund en diagramas de cajas', competence: 'Dibujar y juzgar diagramas de orbitales; contar electrones desapareados.', tier: 'examen', scope: 'examinable', core: ['6.2', '6.4', '6.1'], difficulty: 2, minutes: 3, why: 'Representación que se pide explícitamente (HOJ 18, 22).', pitfalls: ['Aparear antes de ocupar todos los orbitales del subnivel.', 'Llamar «excepción a Hund» al Cr: lo es al orden de llenado.'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),
  F({ generatorId: 'valencia', block: 6, title: 'Electrones de valencia', competence: 'Identificar la capa de valencia y sus electrones.', tier: 'esencial', scope: 'examinable', core: ['6.9'], difficulty: 1, minutes: 2, why: 'Paso previo para deducir grupo, iones estables y propiedades.', pitfalls: ['Contar los (n−1)d como valencia en elementos del bloque p.'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),
  F({ generatorId: 'error-ion-transicion', block: 6, title: 'Detecta el error: catión de transición', competence: 'Encontrar el fallo en la configuración de un catión de transición.', tier: 'examen', scope: 'examinable', core: ['6.8'], difficulty: 2, hard: 3, minutes: 3, why: 'Ataca directamente el error más frecuente del bloque.', pitfalls: ['Aceptar [Ar] 4s² 3d⁴ para Fe²⁺.'], lab: { route: '/arquitecto', label: 'Electron Architect' } }),

  // ── 7. Sistema periódico ──────────────────────────────────────────────
  F({ generatorId: 'posicion-tabla', block: 7, title: 'Grupo, periodo y bloque', competence: 'Deducir grupo, periodo, bloque y elemento desde la configuración.', tier: 'esencial', scope: 'examinable', core: ['7.1', '7.2', '7.3'], difficulty: 2, minutes: 3, why: 'Muy representado en tus fuentes (HOJ 12–15, AMP 15–20).', pitfalls: ['Dar como grupo el número de electrones de valencia en el bloque p (13–18).', 'Confundir periodo con número de electrones de la última capa.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'familia-periodo', block: 7, title: 'Identificar por familia y periodo', competence: 'Localizar un elemento por su familia y su periodo.', tier: 'esencial', scope: 'examinable', core: ['7.4', '7.2'], difficulty: 1, minutes: 2, why: 'Paso rápido que aparece en AMP 16 y 21.', pitfalls: ['Confundir halógenos y anfígenos.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'pistas-elemento', block: 7, title: 'Identifica el elemento por pistas', competence: 'Combinar pistas de configuración, posición y propiedades para identificar un elemento.', tier: 'examen', scope: 'examinable', core: ['7.2', '6.3'], difficulty: 2, hard: 3, minutes: 5, why: 'Razonamiento inverso con varias condiciones (estilo AMP 20–21).', pitfalls: ['Quedarse con el primer candidato sin comprobar todas las pistas.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'tendencia-ordenar', block: 7, title: 'Ordenar por radio, EI, AE o electronegatividad', competence: 'Ordenar especies por una propiedad periódica y justificarlo con Z efectiva y número de capas.', tier: 'esencial', scope: 'examinable', core: ['7.7', '7.9', '7.10', '7.11'], difficulty: 2, hard: 3, minutes: 4, why: 'La pregunta de razonamiento más frecuente del bloque 7 (TEO ej. 9, EBAU 2021).', pitfalls: ['Justificar solo con «la tendencia» sin explicar la causa.', 'Olvidar que el radio crece hacia abajo y hacia la izquierda.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'radio-ionico', block: 7, title: 'Radios iónicos e isoelectrónicos', competence: 'Ordenar átomos e iones por tamaño, en especial series isoelectrónicas.', tier: 'examen', scope: 'examinable', core: ['7.8', '1.5'], difficulty: 2, hard: 3, minutes: 3, why: 'Aparece en AMP 23 y HOJ 19.', pitfalls: ['Pensar que en una serie isoelectrónica todos tienen el mismo tamaño.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'ion-estable', block: 7, title: 'Ion más estable', competence: 'Predecir el ion más probable de un elemento a partir de su configuración.', tier: 'esencial', scope: 'examinable', core: ['7.5', '6.8'], difficulty: 2, minutes: 2, why: 'AMP 22a y HOJ 12: une configuración y propiedades.', pitfalls: ['Predecir Na²⁺ o Cl²⁻.'], lab: { route: '/forja', label: 'Atomic Forge' } }),
  F({ generatorId: 'asignar-ei', block: 7, title: 'Asignar energías de ionización', competence: 'Asignar valores de EI a elementos y justificar las anomalías (Be/B, N/O).', tier: 'examen', scope: 'examinable', core: ['7.9', '7.13'], difficulty: 2, hard: 3, minutes: 4, why: 'Bloque de AMP 24–31: el más numeroso de la hoja de ampliación.', pitfalls: ['No justificar las excepciones del grupo 13 y del 16.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'ei-sucesivas', block: 7, title: 'Energías de ionización sucesivas', competence: 'Deducir los electrones de valencia y el grupo a partir del gran salto en las EI sucesivas.', tier: 'exigente', scope: 'examinable', core: ['7.9', '6.9'], difficulty: 2, hard: 3, minutes: 5, why: 'Interpretación de datos experimentales con razonamiento inverso.', pitfalls: ['Buscar el mayor valor en lugar del mayor SALTO relativo.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'grafica-ei', block: 7, title: 'Interpretar la gráfica de EI₁', competence: 'Leer la gráfica de EI₁ frente a Z: periodicidad y excepciones.', tier: 'examen', scope: 'examinable', core: ['7.9', '7.13'], difficulty: 2, hard: 3, minutes: 4, why: 'Análisis de gráfica que exige explicar máximos, mínimos y anomalías.', pitfalls: ['Atribuir el máximo de cada periodo a los halógenos.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'segunda-ei', block: 7, title: 'Segunda energía de ionización', competence: 'Comparar EI₂ de elementos razonando qué electrón se arranca.', tier: 'examen', scope: 'examinable', core: ['7.9'], difficulty: 2, minutes: 3, why: 'AMP 27–28: obliga a pensar en la configuración del catión.', pitfalls: ['Comparar con la tendencia de EI₁ sin mirar el catión.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'zeff', block: 7, title: 'Carga nuclear efectiva (Slater)', competence: 'Estimar Z_ef con las reglas de Slater y usarla para justificar tendencias.', tier: 'examen', scope: 'ampliacion', core: ['7.6'], difficulty: 2, hard: 3, minutes: 5, why: 'El apantallamiento es examinable de forma cualitativa; el cálculo con Slater es una aproximación de ampliación.', pitfalls: ['Tomar Z_ef de Slater como un valor exacto.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
  F({ generatorId: 'examen-elementos', block: 7, title: 'Problema completo de configuración y propiedades', competence: 'Encadenar configuración, posición, iones y propiedades periódicas de varios elementos.', tier: 'exigente', scope: 'examinable', core: ['7.2', '7.7', '7.9', '7.11'], difficulty: 2, hard: 3, minutes: 9, why: 'La estructura más habitual de un problema de sistema periódico.', pitfalls: ['Ordenar bien pero sin justificación: en el examen la justificación puntúa.'], lab: { route: '/periodico', label: 'Periodic Universe' } }),
];

export const PREP_BY_GEN = new Map(PREP_FAMILIES.map((f) => [f.generatorId, f]));

// ── Representatividad observada en las fuentes ─────────────────────────────

export type SourceKind = 'TEO' | 'AMP' | 'HOJ' | 'EBAU';

/** Clave de PREGUNTA (no de registro): «AMP 12a» → «AMP 12», «EBAU-1 (2021) b» → «EBAU-1», «TEO ej. 7 · O» → «TEO ej. 7». */
export function questionKey(ref: string): string {
  const head = ref.split(' · ')[0]!.trim();
  const ebau = head.match(/^EBAU-\d+/);
  if (ebau) return ebau[0];
  const m = head.match(/^(AMP|HOJ|TEO ej\.)\s*(\d+)/);
  if (m) return `${m[1]} ${m[2]}`;
  return head;
}

export function sourceKind(ref: string): SourceKind | null {
  if (ref.startsWith('EBAU')) return 'EBAU';
  if (ref.startsWith('AMP')) return 'AMP';
  if (ref.startsWith('HOJ')) return 'HOJ';
  if (ref.startsWith('TEO')) return 'TEO';
  return null;
}

export interface Representativity {
  /** Preguntas distintas de las fuentes que tocan los apartados centrales */
  questions: number;
  byKind: Record<SourceKind, number>;
  keys: string[];
  level: 'alta' | 'media' | 'baja' | 'ninguna';
}

const QUESTION_NODES: { key: string; kind: SourceKind; nodes: Set<string> }[] = (() => {
  const m = new Map<string, { kind: SourceKind; nodes: Set<string> }>();
  for (const s of SOURCE_EXERCISES) {
    const kind = sourceKind(s.ref);
    if (!kind) continue;
    const k = questionKey(s.ref);
    const cur = m.get(k) ?? { kind, nodes: new Set<string>() };
    for (const n of s.nodeIds) cur.nodes.add(n);
    m.set(k, cur);
  }
  return [...m.entries()].map(([key, v]) => ({ key, ...v }));
})();

export function representativity(core: string[]): Representativity {
  const hits = QUESTION_NODES.filter((q) => core.some((n) => q.nodes.has(n)));
  const byKind: Record<SourceKind, number> = { TEO: 0, AMP: 0, HOJ: 0, EBAU: 0 };
  for (const h of hits) byKind[h.kind]++;
  const n = hits.length;
  const level = n === 0 ? 'ninguna' : n >= 8 || (byKind.EBAU > 0 && n >= 4) ? 'alta' : n >= 3 ? 'media' : 'baja';
  return { questions: n, byKind, keys: hits.map((h) => h.key).sort(), level };
}

export const REP_LABEL: Record<Representativity['level'], string> = { alta: 'Muy presente en tus fuentes', media: 'Presente en tus fuentes', baja: 'Poco presente en tus fuentes', ninguna: 'No aparece en tus fuentes' };

// ── Preparación del alumno a partir de su evidencia ────────────────────────

export interface AttemptForPrep {
  exerciseId: string;
  score: number;
  at: number;
  mode: 'practica' | 'examen' | 'campana';
  evidence?: 'demostrada' | 'posible-azar' | 'asistida' | 'autoevaluada';
  hintsUsed: number;
  difficulty: number;
}
export interface NotebookForPrep {
  generatorId: string;
  resolvedAt?: number;
}

export type ReadinessLevel = 'sin-evidencia' | 'poca-evidencia' | 'a-reforzar' | 'en-progreso' | 'solida';

export interface Readiness {
  level: ReadinessLevel;
  attempts: number;
  /** Intentos sin ayuda (evidencia demostrada o con posible azar) */
  independent: number;
  /** PROBLEMAS distintos (clave de equivalencia) resueltos sin ayuda y sin posible azar (≥ 0,8) */
  distinctSolved: number;
  openErrors: number;
  /** Explicación en una frase, sin porcentajes */
  text: string;
  /** Problemas distintos que produce la familia a su dificultad de práctica (muestra de 96 semillas) */
  variety: number;
  lastAt?: number;
}

export const READINESS_LABEL: Record<ReadinessLevel, string> = { 'sin-evidencia': 'Sin practicar', 'poca-evidencia': 'Poca evidencia', 'a-reforzar': 'A reforzar', 'en-progreso': 'En progreso', solida: 'Sólida' };

export const generatorOf = (exerciseId: string) => exerciseId.split(':')[0]!;

/**
 * Reglas (explícitas y probadas). ATOM 6.0 (iteración final): todo se cuenta por PROBLEMA (clave de
 * equivalencia, `equivalence.ts`), no por id: otra semilla con los mismos datos es el mismo problema.
 * - sin intentos → sin evidencia;
 * - menos de 2 intentos sin ayuda → poca evidencia (aunque los asistidos hayan ido bien);
 * - errores abiertos en el cuaderno, o media ponderada de los últimos intentos sin ayuda < 0,6 → a reforzar.
 *   En la media, un acierto que pudo ser azar (elección con pocas opciones) pesa 0,5 y repetir un problema
 *   ya resuelto pesa 0,3 (puede ser memoria);
 * - sólida: media ≥ 0,85 Y problemas DISTINTOS resueltos sin ayuda y sin posible azar (evidencia
 *   «demostrada»): 2 si la familia tiene variedad (≥ 6 problemas distintos); en familias con pocas
 *   variantes, 3 (o todas). Si ya se han visto todas las variantes y la familia tiene nivel exigente, hace
 *   falta además acertar uno de ese nivel: con todas vistas, acertar no descarta haberlas memorizado;
 * - en otro caso → en progreso.
 */
export function familyReadiness(generatorId: string, history: AttemptForPrep[], notebook: NotebookForPrep[] = []): Readiness {
  const own = history.filter((h) => generatorOf(h.exerciseId) === generatorId && h.mode !== 'campana');
  const indep = own.filter((h) => (h.evidence ? h.evidence === 'demostrada' || h.evidence === 'posible-azar' : h.hintsUsed === 0));
  const openErrors = notebook.filter((n) => n.generatorId === generatorId && !n.resolvedAt).length;
  const demonstrated = (h: AttemptForPrep) => (h.evidence ? h.evidence === 'demostrada' : h.hintsUsed === 0);
  const solvedKeys = new Set(indep.filter((h) => h.score >= 0.8 && demonstrated(h)).map((h) => problemKeyOfId(h.exerciseId)));
  const distinctSolved = solvedKeys.size;
  const guessed = indep.filter((h) => h.score >= 0.8 && !demonstrated(h)).length;
  // Media ponderada de los últimos 4 intentos sin ayuda.
  const seen = new Set<string>();
  const weighted = indep.map((h) => {
    const k = problemKeyOfId(h.exerciseId);
    const w = (h.evidence === 'posible-azar' ? 0.5 : 1) * (seen.has(k) ? 0.3 : 1);
    seen.add(k);
    return { s: h.score, w };
  });
  const last = weighted.slice(-4);
  const wsum = last.reduce((a, x) => a + x.w, 0);
  const mean = wsum ? last.reduce((a, x) => a + x.s * x.w, 0) / wsum : 0;
  const pf = PREP_BY_GEN.get(generatorId);
  const d = (pf?.difficulty ?? 2) as Difficulty;
  const variety = familyVariety(generatorId, d);
  const need = variety >= 6 ? 2 : Math.max(1, Math.min(3, variety));
  const hardSolved = !!pf?.hard && indep.some((h) => h.score >= 0.8 && demonstrated(h) && Number(h.exerciseId.split(':')[1]) === pf.hard);
  const allSeen = variety > 0 && variety < 6 && new Set(own.map((h) => problemKeyOfId(h.exerciseId))).size >= variety;
  const base = { attempts: own.length, independent: indep.length, distinctSolved, openErrors, lastAt: own.at(-1)?.at, variety };
  const pl = (n: number, s: string, p = `${s}s`) => `${n} ${n === 1 ? s : p}`;
  if (!own.length) return { ...base, level: 'sin-evidencia', text: openErrors ? `Tienes ${pl(openErrors, 'error')} sin resolver en el cuaderno.` : 'Aún no has resuelto ningún ejercicio de esta familia.' };
  if (openErrors > 0 && indep.length < 2) return { ...base, level: 'a-reforzar', text: `${pl(openErrors, 'error')} sin resolver en el cuaderno y ${pl(indep.length, 'intento')} sin ayuda.` };
  if (indep.length < 2) return { ...base, level: 'poca-evidencia', text: `${pl(own.length, 'intento')}, ${indep.length === 0 ? 'ninguno' : 'solo uno'} sin ayuda: todavía no se puede valorar.` };
  if (openErrors > 0 || mean < 0.6) return { ...base, level: 'a-reforzar', text: openErrors ? `${pl(openErrors, 'error')} sin resolver en el cuaderno.` : `Los últimos intentos sin ayuda tienen fallos importantes.` };
  if (mean >= 0.85 && distinctSolved >= need && (!allSeen || !pf?.hard || hardSolved))
    return { ...base, level: 'solida', text: `${pl(distinctSolved, 'problema distinto', 'problemas distintos')} bien resueltos sin ayuda${allSeen && !pf?.hard ? '. Ya has visto todas sus variantes: confírmalo en un simulacro' : ''}.` };
  const why =
    mean < 0.85
      ? 'Aciertos parciales en los últimos intentos sin ayuda.'
      : allSeen && pf?.hard && !hardSolved
        ? `Ya has visto las ${variety} variantes de esta familia: acertar una del nivel exigente demuestra que no es memoria.`
        : distinctSolved < need
          ? `${pl(distinctSolved, 'problema distinto', 'problemas distintos')} resuelto${distinctSolved === 1 ? '' : 's'} sin ayuda de ${need} necesarios${guessed ? ` (${pl(guessed, 'acierto', 'aciertos')} de elección no cuentan: pudo ser azar)` : ''}${variety < 6 ? ` · familia con solo ${variety} variantes` : ''}.`
          : 'En progreso.';
  return { ...base, level: 'en-progreso', text: why };
}

// ── Prioridad, imprescindibles e itinerarios ───────────────────────────────

const TIER_W: Record<Tier, number> = { esencial: 3, examen: 2, exigente: 1.6 };
const SCOPE_W: Record<Scope, number> = { examinable: 1, ampliacion: 0.35, enriquecimiento: 0.15 };
const REP_W: Record<Representativity['level'], number> = { alta: 1.5, media: 1, baja: 0.5, ninguna: 0 };
const NEED_W: Record<ReadinessLevel, number> = { 'a-reforzar': 1.3, 'sin-evidencia': 1, 'poca-evidencia': 0.85, 'en-progreso': 0.55, solida: 0.12 };

export interface PrepItem {
  family: PrepFamily;
  rep: Representativity;
  readiness: Readiness;
  priority: number;
}

export function prepItems(history: AttemptForPrep[], notebook: NotebookForPrep[] = []): PrepItem[] {
  return PREP_FAMILIES.map((family) => {
    const rep = representativity(family.core);
    const readiness = familyReadiness(family.generatorId, history, notebook);
    const priority = SCOPE_W[family.scope] * (TIER_W[family.tier] + REP_W[rep.level]) * NEED_W[readiness.level];
    return { family, rep, readiness, priority };
  });
}

/**
 * Imprescindibles antes del examen: solo examinables y no «exigentes». Primero la familia más prioritaria
 * de CADA bloque (el examen abarca los siete), después se completa hasta `max` con la segunda de cada
 * bloque, siempre por prioridad.
 */
export function essentials(items: PrepItem[], max = 10): PrepItem[] {
  const pool = [...items].filter((i) => i.family.scope === 'examinable' && i.family.tier !== 'exigente').sort((a, b) => b.priority - a.priority);
  const first = new Map<number, PrepItem>();
  for (const it of pool) if (!first.has(it.family.block)) first.set(it.family.block, it);
  const chosen = new Set<PrepItem>([...first.values()].slice(0, max));
  const perBlock = new Map<number, number>([...chosen].map((i) => [i.family.block, 1]));
  for (const it of pool) {
    if (chosen.size >= max) break;
    if (chosen.has(it) || (perBlock.get(it.family.block) ?? 0) >= 2) continue;
    chosen.add(it);
    perBlock.set(it.family.block, (perBlock.get(it.family.block) ?? 0) + 1);
  }
  return pool.filter((i) => chosen.has(i));
}

export type StepMode = 'guiado' | 'autonomo' | 'desafio';
export interface ItineraryStep {
  family: PrepFamily;
  mode: StepMode;
  difficulty: Difficulty;
  minutes: number;
  reason: string;
}

export const SESSION_LENGTHS = [15, 30, 60, 90] as const;

/**
 * Itinerario orientativo: recorre las familias por prioridad, sin repetir bloque hasta haberlos cubierto
 * (variedad), y ajusta el modo a la evidencia: guiado si no hay evidencia, autónomo si la hay, y el nivel
 * exigente si ya es sólida. El tiempo de un paso guiado es mayor (se lee la resolución).
 */
export function itinerary(items: PrepItem[], minutes: number): ItineraryStep[] {
  const pool = [...items].filter((i) => i.family.scope === 'examinable' || minutes >= 90).sort((a, b) => b.priority - a.priority);
  const steps: ItineraryStep[] = [];
  const usedBlocks = new Set<number>();
  const used = new Set<string>();
  let left = minutes;
  const stepFor = (it: PrepItem): ItineraryStep => {
    const lv = it.readiness.level;
    const mode: StepMode = lv === 'sin-evidencia' || lv === 'poca-evidencia' ? 'guiado' : lv === 'solida' && it.family.hard ? 'desafio' : 'autonomo';
    const difficulty = (mode === 'desafio' ? it.family.hard : it.family.difficulty) ?? it.family.difficulty;
    const mins = Math.round(it.family.minutes * (mode === 'guiado' ? 1.5 : mode === 'desafio' ? 1.3 : 1)) + 1;
    const reason = lv === 'a-reforzar' ? 'Tienes fallos recientes aquí.' : lv === 'sin-evidencia' ? 'Aún no lo has practicado.' : lv === 'poca-evidencia' ? 'Falta evidencia sin ayuda.' : lv === 'solida' ? 'Ya va bien: sube el nivel.' : 'Consolidar con un enunciado nuevo.';
    return { family: it.family, mode, difficulty, minutes: mins, reason };
  };
  for (let pass = 0; pass < 2 && left > 0; pass++) {
    for (const it of pool) {
      if (used.has(it.family.generatorId)) continue;
      if (pass === 0 && usedBlocks.has(it.family.block) && usedBlocks.size < 7) continue;
      const st = stepFor(it);
      if (st.minutes > left) continue;
      steps.push(st);
      used.add(it.family.generatorId);
      usedBlocks.add(it.family.block);
      left -= st.minutes;
      if (left < 3) break;
    }
  }
  return steps;
}

/** Enlaces de cada familia (rutas internas existentes). */
export function prepLinks(f: PrepFamily) {
  const anchor = guideAnchorFor(f.core[0]!, f.generatorId);
  return {
    guided: `/entrenamiento?gen=${f.generatorId}&d=${f.difficulty}&modo=guiado`,
    practice: `/entrenamiento?gen=${f.generatorId}&d=${f.difficulty}&modo=autonomo`,
    example: `/entrenamiento?gen=${f.generatorId}&d=${f.difficulty}&modo=revision`,
    hard: f.hard ? `/entrenamiento?gen=${f.generatorId}&d=${f.hard}&modo=desafio` : null,
    theory: `/guia?n=${anchor}`,
    lab: f.lab?.route ?? null,
    errors: '/entrenamiento?v=cuaderno',
  };
}
