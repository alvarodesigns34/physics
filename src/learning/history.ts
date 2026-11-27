/**
 * Time Machine 3.0 · Cómo se construye y se corrige el conocimiento científico.
 *
 * Para cada modelo: qué se sabía, qué problema había, qué hipótesis se propuso, qué se observó, cómo se
 * interpretó, qué limitaciones quedaban y por qué apareció el siguiente modelo. Antes de ver la
 * observación, el alumno PREDICE con la hipótesis. Fechas y experimentos según las fuentes históricas
 * habituales (véase docs/04); las reconstrucciones de los laboratorios son didácticas, no réplicas.
 */
export type ModelKey = 'dalton' | 'thomson' | 'rutherford' | 'bohr' | 'chadwick' | 'actual';

export interface StoryStep {
  key: 'sabia' | 'problema' | 'hipotesis' | 'observacion' | 'interpretacion' | 'limites' | 'siguiente';
  title: string;
  text: string;
}

export interface ModelStory {
  model: ModelKey;
  steps: StoryStep[];
  /** Predicción previa a la observación (paso 4) */
  predict: { question: string; options: { id: string; text: string }[]; correct: string; explain: string };
  /** Laboratorio o pestaña donde se reproduce (si existe) */
  lab?: { href: string; label: string };
}

const S = (key: StoryStep['key'], text: string): StoryStep => ({ key, title: STEP_TITLE[key], text });

export const STEP_TITLE: Record<StoryStep['key'], string> = {
  sabia: 'Qué se sabía',
  problema: 'El problema',
  hipotesis: 'La hipótesis',
  observacion: 'Lo que se observó',
  interpretacion: 'Cómo se interpretó',
  limites: 'Lo que no explicaba',
  siguiente: 'Por qué hizo falta otro modelo',
};

export const STORIES: ModelStory[] = [
  {
    model: 'dalton',
    steps: [
      S('sabia', 'Lavoisier había establecido la conservación de la masa (1789) y Proust, la ley de las proporciones definidas (1799): un compuesto contiene siempre los mismos elementos en la misma proporción de masa. La idea de «átomo» era filosófica (Demócrito, siglo V a. C.).'),
      S('problema', '¿Por qué los elementos se combinan siempre en proporciones fijas de masa, y no en cualquier cantidad?'),
      S('hipotesis', 'La materia está formada por átomos indivisibles. Todos los átomos de un elemento son iguales en masa; los compuestos se forman uniendo átomos en números enteros sencillos.'),
      S('observacion', 'Ley de las proporciones múltiples: las masas de oxígeno que se combinan con una misma masa de carbono en sus dos óxidos están en relación 1 : 2.'),
      S('interpretacion', 'Si los compuestos son uniones de átomos enteros (CO y CO₂), las masas que se combinan tienen que guardar relaciones de números enteros sencillos.'),
      S('limites', 'El átomo no tiene partes: no explica la electricidad de la materia, los rayos catódicos ni la radiactividad (Becquerel, 1896).'),
      S('siguiente', 'En 1897 Thomson demuestra que de cualquier átomo pueden salir partículas negativas idénticas (electrones): el átomo SÍ es divisible.'),
    ],
    predict: {
      question: 'Si los compuestos son átomos unidos en números enteros, ¿qué esperas al comparar dos óxidos de carbono?',
      options: [
        { id: 'enteros', text: 'Las masas de oxígeno por gramo de carbono estarán en una relación de números enteros sencillos' },
        { id: 'cualquiera', text: 'Cualquier relación de masas es posible' },
        { id: 'iguales', text: 'Las dos masas de oxígeno serán iguales' },
      ],
      correct: 'enteros',
      explain: 'CO y CO₂: con la misma masa de carbono, el CO₂ lleva exactamente el doble de oxígeno (1 : 2).',
    },
  },
  {
    model: 'thomson',
    steps: [
      S('sabia', 'Los rayos catódicos se desvían con campos eléctricos y magnéticos: son partículas negativas. Thomson (1897) midió su relación carga/masa y obtuvo el mismo valor con cualquier gas y cualquier metal del cátodo. La materia es eléctricamente neutra.'),
      S('problema', 'Si todos los átomos contienen electrones negativos y el átomo es neutro, ¿dónde está y cómo se reparte la carga positiva?'),
      S('hipotesis', 'Una esfera de carga positiva uniforme con los electrones incrustados (modelo de 1904, el «pastel de pasas»).'),
      S('observacion', 'El electrón es universal (misma q/m en todas las sustancias) y su masa es unas 1 800 veces menor que la del átomo de hidrógeno.'),
      S('interpretacion', 'Los electrones son componentes de todos los átomos; los iones positivos son átomos que han perdido electrones.'),
      S('limites', 'Con la carga positiva repartida, el campo eléctrico dentro del átomo es débil: una partícula α solo podría desviarse ligeramente. No explica los rebotes de Geiger y Marsden (1909).'),
      S('siguiente', 'Las α rebotadas exigen una carga positiva concentrada en un volumen diminuto.'),
    ],
    predict: {
      question: 'Con la carga positiva repartida por todo el átomo, ¿qué les pasará a las partículas α que atraviesan una lámina de oro muy fina?',
      options: [
        { id: 'pequenas', text: 'Casi todas pasan con desviaciones muy pequeñas; ninguna rebota' },
        { id: 'rebotan', text: 'Una pequeña fracción rebota hacia atrás' },
        { id: 'frenan', text: 'Todas quedan atrapadas en la lámina' },
      ],
      correct: 'pequenas',
      explain: 'Esa era la predicción de Thomson. Geiger y Marsden observaron lo contrario: alguna α rebotaba. El experimento refutó el modelo.',
    },
    lab: { href: '#/historia?tab=thomson', label: 'Tubo de Thomson' },
  },
  {
    model: 'rutherford',
    steps: [
      S('sabia', 'Las partículas α son núcleos de helio: carga +2e y masa unas 7 300 veces la del electrón. Geiger y Marsden (1909) observaron que, con una lámina metálica fina, unas pocas α se desviaban más de 90°: del orden de 1 de cada 8 000.'),
      S('problema', '¿Qué estructura del átomo puede devolver hacia atrás una partícula tan masiva y rápida?'),
      S('hipotesis', 'Toda la carga positiva y casi toda la masa se concentran en un núcleo diminuto (decenas de miles de veces menor que el átomo); los electrones se mueven a su alrededor y el resto es vacío.'),
      S('observacion', 'Geiger y Marsden (1913) midieron cuántas α se desvían cada ángulo: el resultado sigue la ley de dispersión de Rutherford, N ∝ 1/sen⁴(θ/2).'),
      S('interpretacion', 'Solo una carga puntual y muy concentrada produce esa distribución de ángulos: el átomo es casi vacío con un núcleo central.'),
      S('limites', 'Según el electromagnetismo clásico, el electrón en órbita está acelerado y debería radiar, caer en espiral al núcleo en ≈ 10⁻¹¹ s y emitir un espectro continuo. Los átomos son estables y su espectro es de líneas.'),
      S('siguiente', 'Bohr (1913) introduce la cuantización de Planck para explicar a la vez la estabilidad y el espectro del hidrógeno.'),
    ],
    predict: {
      question: 'Con un núcleo diminuto, positivo y masivo, ¿qué esperas en la lámina de oro?',
      options: [
        { id: 'pocos', text: 'La mayoría pasa sin desviarse; muy pocas se desvían mucho y alguna rebota' },
        { id: 'mitad', text: 'Aproximadamente la mitad rebota' },
        { id: 'nada', text: 'Ninguna se desvía' },
      ],
      correct: 'pocos',
      explain: 'Solo las α que pasan muy cerca del núcleo sienten una repulsión intensa; como el núcleo es diminuto, son muy pocas.',
    },
    lab: { href: '#/historia?tab=geiger', label: 'Lámina de oro (Monte Carlo)' },
  },
  {
    model: 'bohr',
    steps: [
      S('sabia', 'El espectro del hidrógeno es de líneas: Balmer (1885) y Rydberg (1888) dieron su fórmula empírica. Planck (1900) había cuantizado la energía de la radiación y Einstein (1905) la había atribuido a fotones, E = h·ν.'),
      S('problema', '¿Por qué el átomo es estable y por qué solo emite ciertas frecuencias?'),
      S('hipotesis', 'El electrón solo puede ocupar órbitas estacionarias, con momento angular L = n·h/2π, en las que no radia. Al saltar entre dos órbitas emite o absorbe un fotón con E = |E₂ − E₁| = h·ν.'),
      S('observacion', 'La teoría calcula la constante de Rydberg a partir de constantes fundamentales (h, la masa y la carga del electrón) y reproduce todas las series del hidrógeno: Lyman (UV), Balmer (visible), Paschen (IR)…'),
      S('interpretacion', 'Cada línea espectral corresponde a la diferencia de energía entre dos niveles: la energía del electrón está cuantizada.'),
      S('limites', 'Solo funciona con un electrón (H, He⁺…). No explica la estructura fina, el efecto Zeeman anómalo, las intensidades de las líneas ni los átomos de varios electrones; además mezcla física clásica (órbitas) con reglas cuánticas.'),
      S('siguiente', 'De Broglie (1924), Heisenberg (1925) y Schrödinger (1926) construyen una teoría cuántica completa sin trayectorias.'),
    ],
    predict: {
      question: 'Si el electrón solo puede estar en niveles de energía concretos, ¿qué espectro emitirá un gas de hidrógeno excitado?',
      options: [
        { id: 'lineas', text: 'Líneas a frecuencias concretas, una por cada salto posible' },
        { id: 'continuo', text: 'Un espectro continuo con todos los colores' },
        { id: 'una', text: 'Una sola línea' },
      ],
      correct: 'lineas',
      explain: 'Solo hay un número limitado de diferencias de energía entre niveles: solo esas frecuencias aparecen.',
    },
    lab: { href: '#/fotones?tab=hidrogeno', label: 'Photon Lab · hidrógeno' },
  },
  {
    model: 'chadwick',
    steps: [
      S('sabia', 'La masa de los núcleos (salvo el hidrógeno) es aproximadamente el doble, o más, que la de sus protones. Rutherford (1920) propuso una partícula neutra en el núcleo.'),
      S('problema', '¿Qué aporta la masa que falta sin aportar carga? ¿Qué es la radiación muy penetrante que sale del berilio al bombardearlo con α?'),
      S('hipotesis', 'Esa radiación está formada por partículas sin carga y con una masa parecida a la del protón: neutrones.'),
      S('observacion', 'Chadwick (1932) midió los protones que esa radiación arrancaba de la parafina y la energía de retroceso del nitrógeno: solo encajaba con una partícula neutra de masa ≈ la del protón.'),
      S('interpretacion', 'El núcleo está formado por protones y neutrones: A = Z + N. Los isótopos son átomos con distinto número de neutrones.'),
      S('limites', 'No describe a los electrones; la fuerza que mantiene unido el núcleo pertenece a la física nuclear.'),
      S('siguiente', 'Para los electrones, la teoría vigente ya era la mecánica cuántica (desde 1926); los dos avances se complementan.'),
    ],
    predict: {
      question: 'Si hubiera neutrones en el núcleo, ¿cómo serían dos átomos del mismo elemento con distinta masa?',
      options: [
        { id: 'isotopos', text: 'Mismo número de protones y distinto número de neutrones' },
        { id: 'protones', text: 'Distinto número de protones' },
        { id: 'electrones', text: 'Distinto número de electrones' },
      ],
      correct: 'isotopos',
      explain: 'Los isótopos (ya conocidos por la espectrometría de masas) se explican con el mismo Z y distinto N.',
    },
    lab: { href: '#/forja', label: 'Atomic Forge' },
  },
  {
    model: 'actual',
    steps: [
      S('sabia', 'De Broglie (1924) propone que toda partícula tiene asociada una onda (λ = h/p). El modelo de Bohr falla con átomos de varios electrones. Uhlenbeck y Goudsmit (1925) proponen el espín.'),
      S('problema', 'Describir todos los átomos, sus espectros y la tabla periódica sin trayectorias imposibles de medir.'),
      S('hipotesis', 'El electrón se describe con una función de onda ψ (Schrödinger, 1926); |ψ|² da la probabilidad de encontrarlo. Posición y velocidad no se pueden conocer a la vez con precisión (Heisenberg, 1927).'),
      S('observacion', 'Davisson y Germer (1927) observan la difracción de electrones en un cristal: los electrones se comportan como ondas, con la λ de De Broglie.'),
      S('interpretacion', 'Las soluciones de la ecuación de Schrödinger son los orbitales, caracterizados por n, l y m (más el espín s): de ellos salen la configuración electrónica y la tabla periódica.'),
      S('limites', 'Es el modelo vigente. Se amplía con la relatividad (Dirac, 1928) y la electrodinámica cuántica, más allá del temario.'),
      S('siguiente', 'Fin del recorrido del temario: este es el modelo que se usa hoy.'),
    ],
    predict: {
      question: 'Si los electrones tienen comportamiento ondulatorio, ¿qué ocurrirá al hacer pasar un haz de electrones por un cristal?',
      options: [
        { id: 'difraccion', text: 'Un patrón de difracción, como el de la luz' },
        { id: 'recto', text: 'Todos siguen en línea recta' },
        { id: 'parar', text: 'El cristal los detiene a todos' },
      ],
      correct: 'difraccion',
      explain: 'Davisson y Germer (1927) observaron exactamente eso: máximos y mínimos de intensidad, como en la difracción de rayos X.',
    },
    lab: { href: '#/cuantico', label: 'Quantum Space' },
  },
];

/** Qué explica cada modelo: ✓ explica · ✗ lo contradice o no lo explica · — fuera de su alcance. */
export type Verdict = 'si' | 'no' | 'na';

export const PHENOMENA: { id: string; label: string; verdicts: Record<ModelKey, Verdict>; note: string }[] = [
  { id: 'proporciones', label: 'Proporciones fijas y múltiples en las reacciones', verdicts: { dalton: 'si', thomson: 'si', rutherford: 'si', bohr: 'si', chadwick: 'si', actual: 'si' }, note: 'Desde Dalton, todos los modelos conservan la idea de átomos que se combinan en números enteros.' },
  { id: 'electron', label: 'Partículas negativas en todos los átomos (rayos catódicos)', verdicts: { dalton: 'no', thomson: 'si', rutherford: 'si', bohr: 'si', chadwick: 'si', actual: 'si' }, note: 'Dalton no admite partes en el átomo.' },
  { id: 'rebotes', label: 'Algunas α rebotan en la lámina de oro', verdicts: { dalton: 'na', thomson: 'no', rutherford: 'si', bohr: 'si', chadwick: 'si', actual: 'si' }, note: 'Thomson predice solo desviaciones pequeñas.' },
  { id: 'estabilidad', label: 'El átomo es estable (no colapsa)', verdicts: { dalton: 'na', thomson: 'na', rutherford: 'no', bohr: 'si', chadwick: 'na', actual: 'si' }, note: 'El colapso por radiación es el problema característico del modelo planetario de Rutherford; Bohr lo resuelve postulando órbitas estacionarias.' },
  { id: 'lineas-h', label: 'Espectro de líneas del hidrógeno', verdicts: { dalton: 'na', thomson: 'no', rutherford: 'no', bohr: 'si', chadwick: 'na', actual: 'si' }, note: 'Bohr es el primero en calcular las líneas del H.' },
  { id: 'multi', label: 'Espectros de átomos con varios electrones', verdicts: { dalton: 'na', thomson: 'no', rutherford: 'no', bohr: 'no', chadwick: 'na', actual: 'si' }, note: 'Bohr solo funciona con un electrón.' },
  { id: 'isotopos', label: 'Isótopos: mismo elemento, distinta masa', verdicts: { dalton: 'no', thomson: 'na', rutherford: 'na', bohr: 'na', chadwick: 'si', actual: 'na' }, note: 'Dalton suponía átomos de un elemento idénticos en masa. Los isótopos se conocían desde 1913, pero su explicación (distinto número de neutrones) llega con Chadwick.' },
  { id: 'difraccion', label: 'Difracción de electrones', verdicts: { dalton: 'na', thomson: 'no', rutherford: 'no', bohr: 'no', chadwick: 'na', actual: 'si' }, note: 'Solo un modelo ondulatorio del electrón la explica.' },
];
