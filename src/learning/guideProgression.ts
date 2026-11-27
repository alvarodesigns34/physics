/**
 * ATOM 5.0 · Progresión didáctica de cada apartado: intuición inicial → fundamento → visual → fórmula →
 * DEDUCCIÓN → ejemplo → errores → contraejemplos → examen → CONEXIONES.
 *
 * Este módulo aporta las tres capas que faltaban:
 * - `intuition`: la idea en una o dos frases, antes de cualquier término técnico.
 * - `derivation`: de dónde sale la fórmula, paso a paso, y qué significa cada término. Cada deducción
 *   numérica está verificada en guideProgression.test.ts (p. ej., que 13,6 eV/(h·c) da la constante de
 *   Rydberg).
 * - `connections`: con qué otros apartados se relaciona y por qué.
 */
export interface Derivation {
  title: string;
  steps: { text: string; math?: string }[];
  /** Qué significa el resultado (no solo cómo se obtiene) */
  meaning: string;
}

export interface Progression {
  intuition: string;
  derivation?: Derivation;
  connections: { to: string; why: string }[];
}

export const PROGRESSION: Record<string, Progression> = {
  '1.1': {
    intuition: 'Cada átomo lleva su «número de identidad» en el núcleo: cuántos protones tiene. Ese número decide qué elemento es; los neutrones solo añaden peso.',
    derivation: {
      title: 'De dónde salen A = Z + N y N = A − Z',
      steps: [
        { text: 'El núcleo contiene dos tipos de partículas, los nucleones: protones (Z) y neutrones (N). A los cuenta todos:', math: 'A = Z + N' },
        { text: 'Despejar N es restar Z en los dos miembros:', math: 'N = A - Z' },
      ],
      meaning: 'A no es una masa, sino un recuento de partículas, y por eso siempre es entero. La masa del átomo en u es muy parecida a A, pero no igual (véase 3.1).',
    },
    connections: [
      { to: '1.3', why: 'Los isótopos son átomos con el mismo Z y distinto N.' },
      { to: '1.4', why: 'Los iones cambian el número de electrones, no Z ni A.' },
      { to: '7.1', why: 'La tabla periódica está ordenada por Z.' },
    ],
  },
  '1.3': {
    intuition: 'Hermanos del mismo elemento con distinto peso: el mismo número de protones (y de electrones), pero distinto número de neutrones.',
    connections: [
      { to: '3.1', why: 'La masa atómica de la tabla es la media de los isótopos.' },
      { to: '1.1', why: 'Mismo Z, distinto A.' },
    ],
  },
  '1.4': {
    intuition: 'Un ion es un átomo al que le sobran o le faltan electrones. El núcleo no se toca: por eso sigue siendo el mismo elemento.',
    derivation: {
      title: 'De dónde sale e⁻ = Z − q',
      steps: [
        { text: 'La carga de la especie es la suma de las cargas: +1 por protón y −1 por electrón:', math: 'q = Z - e^{-}' },
        { text: 'Despejando el número de electrones:', math: 'e^{-} = Z - q' },
      ],
      meaning: 'Con q negativa (anión) se resta un número negativo, es decir, se SUMA: un anión tiene más electrones que protones.',
    },
    connections: [
      { to: '6.8', why: 'Su configuración electrónica sale de quitar o añadir electrones a la del átomo.' },
      { to: '7.5', why: 'Qué ion forma cada elemento depende de su grupo.' },
      { to: '7.8', why: 'Ganar o perder electrones cambia el tamaño.' },
    ],
  },
  '1.5': {
    intuition: 'Distintas especies con el mismo número de electrones: la misma «nube», sujeta por núcleos de distinta fuerza.',
    connections: [
      { to: '7.8', why: 'Más protones con los mismos electrones dan menor radio.' },
      { to: '7.9', why: 'Y mayor energía de ionización.' },
    ],
  },
  '1.6': {
    intuition: 'Casi toda la masa está en un punto diminuto del centro; casi todo el volumen lo ocupa una nube de electrones ligerísimos.',
    connections: [
      { to: '2.4', why: 'El experimento de Geiger–Marsden reveló ese núcleo diminuto.' },
      { to: '2.2', why: 'El electrón fue la primera partícula subatómica descubierta.' },
    ],
  },
  '2.1': {
    intuition: 'Si la materia se combina siempre en proporciones fijas y en números enteros, lo más sencillo es pensar que está hecha de piezas indivisibles.',
    connections: [
      { to: '2.7', why: 'Es el primer eslabón de la cadena de modelos.' },
      { to: '1.3', why: 'Los isótopos refutan uno de sus postulados.' },
    ],
  },
  '2.2': {
    intuition: 'Un haz invisible que sale del cátodo, se curva con imanes y con placas cargadas: no es luz, son partículas con carga negativa.',
    connections: [
      { to: '2.3', why: 'El electrón obliga a proponer un nuevo modelo de átomo.' },
      { to: '1.6', why: 'Propiedades del electrón.' },
    ],
  },
  '2.3': {
    intuition: 'Si dentro del átomo hay electrones negativos y el átomo es neutro, en algún sitio tiene que estar la carga positiva. Thomson la imaginó repartida por todo el volumen.',
    connections: [
      { to: '2.4', why: 'Su predicción falla en la lámina de oro.' },
      { to: '2.2', why: 'Nace del descubrimiento del electrón.' },
    ],
  },
  '2.4': {
    intuition: 'Disparar «balas» contra una hoja finísima y que alguna rebote: tiene que haber algo pequeño, muy denso y cargado dentro.',
    connections: [
      { to: '2.5', why: 'De este experimento sale el modelo nuclear.' },
      { to: '1.6', why: 'Tamaño del núcleo frente al del átomo.' },
    ],
  },
  '2.5': {
    intuition: 'Así lo imaginó Rutherford: un sistema solar en miniatura, con el núcleo en el centro y los electrones girando alrededor. Es un modelo histórico, no la imagen actual.',
    connections: [
      { to: '2.6', why: 'La física clásica predice que ese sistema colapsaría.' },
      { to: '4.1', why: 'Bohr lo corrige con la cuantización.' },
    ],
  },
  '2.6': {
    intuition: 'Un electrón que gira está acelerado y, según el electromagnetismo, debería perder energía radiando hasta caer al núcleo. Los átomos, sin embargo, son estables.',
    connections: [
      { to: '4.1', why: 'Bohr postula órbitas que no radian.' },
      { to: '3.5', why: 'Además, el espectro observado es de líneas, no continuo.' },
    ],
  },
  '2.7': {
    intuition: 'Cada modelo dura hasta que aparece un experimento que no puede explicar.',
    connections: [
      { to: '5.3', why: 'El modelo actual sustituye la órbita por el orbital.' },
      { to: '2.1', why: 'Punto de partida de la cadena.' },
    ],
  },
  '3.1': {
    intuition: 'La masa atómica de la tabla es una media, como la nota media de un curso: cada isótopo pesa según lo abundante que sea.',
    derivation: {
      title: 'De dónde sale la media ponderada',
      steps: [
        { text: 'En una muestra con N átomos, una fracción x₁ = %₁/100 son del isótopo 1, y así con cada isótopo. La masa total es la suma de las masas:', math: 'M_{total} = N x_1 m_1 + N x_2 m_2 + \\ldots' },
        { text: 'La masa media de un átomo es la total entre N:', math: 'M = x_1 m_1 + x_2 m_2 + \\ldots = \\frac{m_1 \\cdot \\%_1 + m_2 \\cdot \\%_2 + \\ldots}{100}' },
        { text: 'Problema inverso con dos isótopos: si x₁ = x, entonces x₂ = 1 − x y se despeja:', math: 'x = \\frac{M - m_2}{m_1 - m_2}' },
      ],
      meaning: 'La media siempre queda entre la masa del isótopo más ligero y la del más pesado; con dos isótopos, más cerca de la del más abundante. Si te sale fuera de ese intervalo, hay un error.',
    },
    connections: [
      { to: '1.3', why: 'Los isótopos son los que se promedian.' },
      { to: '1.1', why: 'La masa de cada isótopo es aproximadamente su A en u.' },
    ],
  },
  '3.2': {
    intuition: 'Una onda es una ola que avanza: la distancia entre crestas (λ) por el número de crestas que pasan cada segundo (ν) da la rapidez con que avanza.',
    derivation: {
      title: 'De dónde sale v = λ·ν',
      steps: [
        { text: 'En un periodo T la onda completa una oscilación y avanza exactamente una longitud de onda:', math: 'v = \\frac{\\lambda}{T}' },
        { text: 'La frecuencia es el número de oscilaciones por segundo, la inversa del periodo:', math: '\\nu = \\frac{1}{T} \\Rightarrow v = \\lambda \\cdot \\nu' },
        { text: 'Para la luz en el vacío, v = c:', math: 'c = \\lambda \\cdot \\nu' },
      ],
      meaning: 'λ y ν son inversamente proporcionales: si una se duplica, la otra se reduce a la mitad, porque su producto es fijo (c).',
    },
    connections: [
      { to: '3.4', why: 'La frecuencia fija la energía de cada fotón.' },
      { to: '3.3', why: 'El espectro electromagnético ordena las ondas por λ.' },
    ],
  },
  '3.3': {
    intuition: 'Radio, microondas, luz, rayos X: todo es la misma radiación. Solo cambia lo deprisa que oscila.',
    connections: [
      { to: '3.4', why: 'Cuanto mayor es la frecuencia, más energía lleva cada fotón.' },
      { to: '3.7', why: 'Cada serie del hidrógeno cae en una región.' },
    ],
  },
  '3.4': {
    intuition: 'La luz llega en paquetes. Cada paquete (fotón) lleva una energía fija que solo depende del color, no del brillo.',
    derivation: {
      title: 'De dónde sale E = h·c/λ',
      steps: [
        { text: 'Planck: la energía de cada fotón es proporcional a su frecuencia:', math: 'E = h \\cdot \\nu' },
        { text: 'Con ν = c/λ (3.2):', math: 'E = \\frac{h \\cdot c}{\\lambda}' },
        { text: 'En eV y nm, con h·c ≈ 1240 eV·nm, sale un atajo útil para comprobar resultados:', math: 'E(\\text{eV}) \\approx \\frac{1240}{\\lambda(\\text{nm})}' },
      ],
      meaning: 'La energía de cada fotón es inversamente proporcional a λ. El brillo de la luz no cambia esa energía, sino el número de fotones que llegan.',
    },
    connections: [
      { to: '3.2', why: 'Se combina con c = λ·ν.' },
      { to: '3.6', why: 'La energía del fotón es la diferencia entre dos niveles.' },
      { to: '5.1', why: 'De Broglie aplica a la materia la misma relación entre onda y partícula.' },
    ],
  },
  '3.5': {
    intuition: 'Cada elemento tiene su «código de barras» de colores. Si está caliente, los emite; si está frío y lo atraviesa luz blanca, se los queda.',
    connections: [
      { to: '3.6', why: 'La ecuación de Rydberg calcula las líneas del hidrógeno.' },
      { to: '4.3', why: 'Bohr explica por qué son líneas.' },
    ],
  },
  '3.6': {
    intuition: 'Las líneas del hidrógeno no están en posiciones al azar: siguen una fórmula sencilla con números enteros, como si hubiera escalones de energía.',
    derivation: {
      title: 'La ecuación de Rydberg sale del modelo de Bohr',
      steps: [
        { text: 'Energía de cada nivel del hidrógeno (4.2):', math: 'E_n = -\\frac{13,6\\;\\text{eV}}{n^2}' },
        { text: 'El fotón se lleva la diferencia entre dos niveles (n₂ > n₁):', math: '\\Delta E = 13,6\\;\\text{eV}\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)' },
        { text: 'Y esa energía es h·c/λ (3.4):', math: '\\frac{1}{\\lambda} = \\frac{13,6\\;\\text{eV}}{h \\cdot c}\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)' },
        { text: 'El cociente es la constante de Rydberg. Con 13,6 eV = 2,179·10⁻¹⁸ J:', math: 'R = \\frac{2,179 \\cdot 10^{-18}}{6,626 \\cdot 10^{-34} \\cdot 2,998 \\cdot 10^{8}} \\approx 1,097 \\cdot 10^{7}\\;\\text{m}^{-1}' },
      ],
      meaning: 'Rydberg encontró R ajustando datos. Bohr la DEDUJO a partir de constantes fundamentales, y esa coincidencia fue la gran prueba de su modelo.',
    },
    connections: [
      { to: '4.2', why: 'De ahí salen las energías de los niveles.' },
      { to: '3.7', why: 'Cada n₁ define una serie.' },
      { to: '3.7-inv', why: 'El problema inverso despeja n.' },
    ],
  },
  '3.7': {
    intuition: 'Todas las líneas que «aterrizan» en el mismo nivel forman una familia: la serie.',
    connections: [
      { to: '3.6', why: 'Rydberg con n₁ fijo.' },
      { to: '3.3', why: 'Cada serie cae en una región del espectro.' },
    ],
  },
  '3.7-inv': {
    intuition: 'Si conoces la línea, puedes deducir de qué escalón bajó el electrón: es Rydberg recorrida al revés.',
    derivation: {
      title: 'Despejar n₂ en Rydberg',
      steps: [
        { text: 'Se parte de Rydberg:', math: '\\frac{1}{\\lambda R} = \\frac{1}{n_1^2} - \\frac{1}{n_2^2}' },
        { text: 'Se deja solo el término de n₂:', math: '\\frac{1}{n_2^2} = \\frac{1}{n_1^2} - \\frac{1}{\\lambda R}' },
        { text: 'Se invierte y se saca la raíz:', math: 'n_2 = \\frac{1}{\\sqrt{\\frac{1}{n_1^2} - \\frac{1}{\\lambda R}}}' },
      ],
      meaning: 'n₂ tiene que salir entero, o casi, por el redondeo de los datos. Si sale lejos de un entero, el n₁ elegido o las unidades están mal.',
    },
    connections: [{ to: '3.6', why: 'Es la misma ecuación.' }],
  },
  '3.8': {
    intuition: 'Desde lo alto de una escalera se puede bajar de muchas maneras distintas, y cada pareja de escalones da una línea.',
    derivation: {
      title: 'De dónde sale n(n − 1)/2',
      steps: [
        { text: 'Cada línea corresponde a una pareja de niveles distintos entre 1 y n. Se elige el de arriba (n opciones) y el de abajo (n − 1 opciones):', math: 'n \\cdot (n - 1)' },
        { text: 'Así se cuenta cada pareja dos veces (como 3→1 y como 1→3), de modo que hay que dividir entre 2:', math: '\\text{líneas} = \\frac{n(n - 1)}{2}' },
      ],
      meaning: 'Cada nivel nuevo añade tantas líneas como niveles hay por debajo: 1, 3, 6, 10, 15…',
    },
    connections: [{ to: '3.7', why: 'Esas líneas se reparten en series.' }],
  },
  '4.1': {
    intuition: 'Bohr se atrevió a decir que el electrón solo puede estar en ciertas órbitas, como en los peldaños de una escalera, y nunca entre ellos.',
    connections: [
      { to: '2.6', why: 'Resuelve, por decreto, el colapso del átomo de Rutherford.' },
      { to: '4.2', why: 'De la cuantización salen radios y energías.' },
    ],
  },
  '4.2': {
    intuition: 'Los peldaños se separan cada vez más en distancia (crecen con n²) y se juntan cada vez más en energía.',
    derivation: {
      title: 'Radios y energías de Bohr (ampliación)',
      steps: [
        { text: 'La atracción eléctrica hace de fuerza centrípeta:', math: '\\frac{m v^2}{r} = \\frac{k e^2}{r^2}' },
        { text: 'Cuantización del momento angular (postulado 2):', math: 'm v r = n \\hbar' },
        { text: 'Eliminando v entre las dos ecuaciones:', math: 'r_n = n^2 \\frac{\\hbar^2}{m k e^2} = n^2 \\cdot a_0, \\quad a_0 \\approx 0,529\\;\\text{Å}' },
        { text: 'Energía total (cinética + potencial) = −ke²/(2r):', math: 'E_n = -\\frac{k e^2}{2 a_0} \\cdot \\frac{1}{n^2} = -\\frac{13,6\\;\\text{eV}}{n^2}' },
      ],
      meaning: 'El signo negativo indica que el electrón está ligado: para liberarlo hay que darle |Eₙ|. El curso pide aplicar los resultados, no esta deducción.',
    },
    connections: [
      { to: '3.6', why: 'De Eₙ sale la ecuación de Rydberg.' },
      { to: '7.9', why: 'La energía de ionización del H es |E₁| = 13,6 eV.' },
    ],
  },
  '4.3': {
    intuition: 'Cada línea del espectro es la huella de un salto concreto entre dos peldaños.',
    connections: [
      { to: '3.6', why: 'La energía del salto fija λ.' },
      { to: '3.8', why: 'Contar los saltos posibles es contar las líneas.' },
    ],
  },
  '4.4': {
    intuition: 'Al mirar las líneas con más detalle aparecieron sorpresas (líneas dobles, líneas que se separan en un imán), y cada sorpresa obligó a añadir un número cuántico.',
    connections: [{ to: '5.4', why: 'Los cuatro números cuánticos del modelo actual.' }],
  },
  '5.1': {
    intuition: 'Si la luz, que es una onda, se comporta a veces como partícula, ¿por qué la materia no iba a comportarse a veces como onda?',
    derivation: {
      title: 'De dónde sale λ = h/p',
      steps: [
        { text: 'Un fotón tiene energía E = h·c/λ y cantidad de movimiento p = E/c:', math: 'p = \\frac{h}{\\lambda}' },
        { text: 'De Broglie propuso que la relación vale para cualquier partícula, con p = m·v:', math: '\\lambda = \\frac{h}{p} = \\frac{h}{m v}' },
      ],
      meaning: 'λ es grande solo si m·v es diminuto: es apreciable en electrones e inobservable en objetos cotidianos.',
    },
    connections: [
      { to: '3.4', why: 'Misma relación entre onda y partícula que en los fotones.' },
      { to: '5.2', why: 'La naturaleza ondulatoria lleva a la incertidumbre.' },
    ],
  },
  '5.2': {
    intuition: 'Cuanto mejor sabes dónde está el electrón, peor sabes hacia dónde va y a qué velocidad. No es torpeza al medir: es la naturaleza.',
    connections: [
      { to: '5.3', why: 'Por eso se abandona la idea de órbita.' },
      { to: '5.1', why: 'Es consecuencia del carácter ondulatorio.' },
    ],
  },
  '5.3': {
    intuition: 'Una órbita es un camino; un orbital es un «mapa de dónde es probable encontrarlo».',
    connections: [
      { to: '5.4', why: 'Cada orbital queda definido por (n, l, m).' },
      { to: '4.1', why: 'Contraste con las órbitas de Bohr.' },
    ],
  },
  '5.4': {
    intuition: 'Los números cuánticos son la «dirección postal» de un electrón: nivel, subnivel, orientación y espín.',
    connections: [
      { to: '5.5', why: 'Contar combinaciones da la capacidad de cada nivel.' },
      { to: '6.2', why: 'Pauli: no hay dos electrones con los mismos cuatro números cuánticos.' },
    ],
  },
  '5.5': {
    intuition: 'Cada subnivel tiene un número fijo de «cajas» (orbitales) y en cada caja caben dos electrones.',
    derivation: {
      title: 'De dónde salen 2l + 1 y 2n²',
      steps: [
        { text: 'm toma los enteros de −l a +l:', math: '\\text{orbitales del subnivel} = 2l + 1' },
        { text: 'Un nivel n contiene l = 0, 1, …, n − 1. Sumando los orbitales:', math: '\\sum_{l=0}^{n-1} (2l+1) = 1 + 3 + 5 + \\ldots + (2n-1) = n^2' },
        { text: 'Con dos electrones por orbital (Pauli):', math: '\\text{electrones del nivel} = 2n^2' },
      ],
      meaning: 'La suma de los n primeros impares es n²: 1, 4, 9, 16. De ahí las capacidades 2, 8, 18, 32.',
    },
    connections: [
      { to: '6.2', why: 'El 2 de cada orbital es el principio de Pauli.' },
      { to: '7.3', why: 'La forma de la tabla refleja s², p⁶, d¹⁰ y f¹⁴.' },
    ],
  },
  '5.6': {
    intuition: 'Contar estados es contar «plazas» distintas para los electrones.',
    connections: [{ to: '5.5', why: 'Cada orbital tiene dos estados.' }],
  },
  '6.1': {
    intuition: 'La configuración electrónica es el «plano de ocupación» del átomo: qué subnivel tiene cuántos electrones.',
    connections: [
      { to: '6.3', why: 'El orden de llenado decide el plano.' },
      { to: '6.4', why: 'El diagrama de cajas muestra los espines.' },
    ],
  },
  '6.2': {
    intuition: 'En una misma caja caben como mucho dos electrones, y tienen que ser «opuestos».',
    connections: [
      { to: '5.4', why: 'Se basa en los cuatro números cuánticos.' },
      { to: '6.5', why: 'Si se incumple, la configuración es prohibida.' },
    ],
  },
  '6.3': {
    intuition: 'Los electrones van ocupando primero los escalones de menor energía, aunque esos escalones no siempre estén en el orden que parece lógico (4s antes que 3d).',
    connections: [
      { to: '7.3', why: 'El último subnivel ocupado da el bloque.' },
      { to: '6.7', why: 'Excepciones del Cr y del Cu.' },
    ],
  },
  '6.4': {
    intuition: 'Los electrones prefieren estar solos antes que compartir caja, y con el mismo espín.',
    connections: [
      { to: '7.13', why: 'Explica por qué la EI del N es mayor que la del O.' },
      { to: '6.5', why: 'Incumplir Hund da un estado excitado.' },
    ],
  },
  '6.5': {
    intuition: 'Hay configuraciones normales (fundamental), posibles pero inestables (excitadas), que rompen las reglas (prohibidas) y que usan cajas que no existen (imposibles).',
    connections: [
      { to: '3.5', why: 'Al volver del estado excitado se emite luz.' },
      { to: '5.4', why: 'Un subnivel como el 2d no existe porque l < n.' },
    ],
  },
  '6.6': {
    intuition: 'Para no repetir lo que comparten todos los elementos de periodos posteriores, se resume la parte interna con el gas noble.',
    connections: [{ to: '6.9', why: 'Lo que queda tras el gas noble es lo químicamente relevante.' }],
  },
  '6.7': {
    intuition: 'A veces el átomo «prefiere» un subnivel d medio lleno o lleno del todo, y mueve un electrón del 4s para conseguirlo.',
    connections: [
      { to: '6.3', why: 'Es una excepción al orden de llenado.' },
      { to: '6.8', why: 'Afecta también a la configuración de sus iones.' },
    ],
  },
  '6.8': {
    intuition: 'Al formar un catión salen primero los electrones más externos, que no son necesariamente los últimos que entraron.',
    connections: [
      { to: '1.4', why: 'Cuántos electrones tiene el ion.' },
      { to: '7.5', why: 'Qué ion es estable.' },
    ],
  },
  '6.9': {
    intuition: 'Los electrones de la última capa son los que «se ven» desde fuera: deciden cómo reacciona el átomo.',
    connections: [
      { to: '7.4', why: 'Misma valencia, misma familia.' },
      { to: '7.5', why: 'Cuántos electrones gana o pierde.' },
    ],
  },
  '7.1': {
    intuition: 'Al ordenar los elementos por Z, las propiedades se repiten a intervalos: por eso la tabla tiene filas y columnas.',
    connections: [
      { to: '6.3', why: 'La repetición viene de las configuraciones.' },
      { to: '7.3', why: 'Bloques s, p, d y f.' },
    ],
  },
  '7.3': {
    intuition: 'Los bloques de la tabla son los subniveles que se están llenando: su anchura es la capacidad del subnivel.',
    connections: [
      { to: '5.5', why: '2, 6, 10 y 14 electrones.' },
      { to: '6.3', why: 'El orden de Möller da el bloque.' },
    ],
  },
  '7.4': {
    intuition: 'Las familias son columnas de elementos «parientes»: misma valencia, comportamiento parecido.',
    connections: [
      { to: '6.9', why: 'Comparten configuración de valencia.' },
      { to: '7.5', why: 'Forman el mismo tipo de ion.' },
    ],
  },
  '7.5': {
    intuition: 'Muchos átomos ganan o pierden los electrones justos para quedarse con la configuración de un gas noble.',
    connections: [
      { to: '6.8', why: 'Configuración del ion.' },
      { to: '7.9', why: 'Perder electrones cuesta energía de ionización.' },
    ],
  },
  '7.6': {
    intuition: 'Los electrones internos hacen de «sombrilla»: tapan parte de la atracción del núcleo sobre los externos.',
    derivation: {
      title: 'Estimación de Z_ef (Slater, ampliación)',
      steps: [
        { text: 'La carga que siente un electrón es la del núcleo menos la apantallada por los demás:', math: 'Z_{ef} = Z - a' },
        { text: 'Slater asigna 0,35 a cada electrón del mismo grupo (n s, n p), 0,85 a cada uno de la capa n − 1 y 1,00 a los más internos. Por ejemplo, para el 3s del Na:', math: 'a = 8 \\cdot 0,85 + 2 \\cdot 1,00 = 8,8 \\Rightarrow Z_{ef} = 11 - 8,8 = 2,2' },
      ],
      meaning: 'Hacia la derecha de un periodo, Z sube de 1 en 1 y el apantallamiento solo 0,35: Z_ef crece. Eso explica casi todas las tendencias.',
    },
    connections: [
      { to: '7.7', why: 'Explica el radio.' },
      { to: '7.9', why: 'Explica la energía de ionización.' },
    ],
  },
  '7.7': {
    intuition: 'Hacia la derecha el núcleo tira más fuerte de la misma capa (los átomos se encogen); hacia abajo se añaden capas (crecen).',
    connections: [
      { to: '7.6', why: 'Z_ef y número de capas.' },
      { to: '7.8', why: 'Radio de los iones.' },
    ],
  },
  '7.8': {
    intuition: 'Quitar electrones encoge la nube; añadirlos la hincha.',
    connections: [
      { to: '1.5', why: 'Series isoelectrónicas.' },
      { to: '1.4', why: 'Cationes y aniones.' },
    ],
  },
  '7.9': {
    intuition: 'Lo que cuesta arrancar un electrón: más cuanto más cerca está del núcleo y más fuerte tira este.',
    connections: [
      { to: '7.13', why: 'Las excepciones Be > B y N > O.' },
      { to: '4.2', why: 'En el H coincide con |E₁| = 13,6 eV.' },
    ],
  },
  '7.10': {
    intuition: 'Lo que «agradece» un átomo al recibir un electrón: mucho en los halógenos, nada en los gases nobles.',
    connections: [
      { to: '7.11', why: 'Contribuye a la electronegatividad.' },
      { to: '7.13', why: 'La excepción Cl > F.' },
    ],
  },
  '7.11': {
    intuition: 'Quién se queda con los electrones cuando dos átomos los comparten.',
    connections: [
      { to: '7.9', why: 'Combina la EI…' },
      { to: '7.10', why: '…y la afinidad electrónica.' },
    ],
  },
  '7.12': {
    intuition: 'Los metales se desprenden de sus electrones con facilidad; los no metales tienden a quedárselos.',
    connections: [
      { to: '7.9', why: 'EI baja, carácter metálico alto.' },
      { to: '7.4', why: 'Situación en la tabla.' },
    ],
  },
  '7.13': {
    intuition: 'Las tendencias son reglas generales, pero los detalles de los subniveles producen pequeñas excepciones que se pueden explicar.',
    connections: [
      { to: '6.4', why: 'Hund y el apareamiento explican N > O.' },
      { to: '7.9', why: 'Tendencia general de la EI.' },
    ],
  },
};
