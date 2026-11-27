/**
 * Guía de estudio: el temario explicado para el examen. Cada sección corresponde a un nodo de la
 * matriz de cobertura e incluye lo esencial, fórmulas con unidades, errores típicos y un consejo de examen.
 */
export type WidgetId = 'rydberg-inverso' | 'notacion' | 'onda' | 'espectro-em' | 'rydberg' | 'numeros-cuanticos' | 'configuracion' | 'tendencias' | 'masa-media' | 'modelos' | 'particulas';

export interface Formula {
  expr: string;
  vars: [string, string, string][];
  note?: string;
}

export interface GuideSection {
  node: string;
  /** Identificador propio cuando hay varias secciones del mismo apartado */
  id?: string;
  title: string;
  body: string[];
  formulas?: Formula[];
  widget?: WidgetId;
  mistakes?: string[];
  tip?: string;
}

export interface WorkedStep {
  label: string;
  work: string;
  why: string;
}

export interface WorkedExample {
  title: string;
  source?: string;
  statement: string;
  steps: WorkedStep[];
}

export interface Lesson {
  block: number;
  title: string;
  summary: string;
  examFocus: string[];
  sections: GuideSection[];
  worked: WorkedExample[];
  lab: { route: string; label: string };
}

export const LESSONS: Lesson[] = [
  {
    block: 1,
    title: 'Identificación de un átomo',
    summary: 'Un átomo se identifica por su número de protones (Z). Los neutrones fijan el isótopo y los electrones, la carga.',
    examFocus: ['Completar tablas de Z, A, p, n y e⁻ de átomos e iones', 'Distinguir isótopos, iones y especies isoelectrónicas', 'Decir dónde está cada partícula'],
    lab: { route: '/forja', label: 'Atomic Forge' },
    sections: [
      {
        node: '1.1',
        title: 'Número atómico y número másico',
        body: [
          'El **número atómico Z** es el número de protones. Identifica al elemento: todos los átomos de carbono tienen Z = 6, y cualquier átomo con Z = 6 es carbono.',
          'El **número másico A** es el número de nucleones (protones + neutrones). Se escribe arriba a la izquierda del símbolo; Z, abajo a la izquierda: ᴬ_Z X.',
          'En un **átomo neutro**, el número de electrones es igual al de protones.',
        ],
        formulas: [
          { expr: 'A = Z + N', vars: [['A', 'número másico', '—'], ['Z', 'número de protones', '—'], ['N', 'número de neutrones', '—']] },
          { expr: 'N = A − Z', vars: [['N', 'neutrones', '—']] },
        ],
        widget: 'notacion',
        mistakes: ['Confundir A con el número de neutrones: en ²³₁₁Na hay 23 nucleones, pero solo 12 neutrones.', 'Creer que la masa atómica de la tabla (22,99 u) es A: A siempre es entero y depende del isótopo.'],
        tip: 'Empieza siempre por Z: te da el elemento y los protones. Después, N = A − Z, y por último los electrones con la carga.',
      },
      {
        node: '1.3',
        title: 'Isótopos',
        body: [
          'Los **isótopos** de un elemento tienen el mismo Z y distinto número de neutrones, así que distinto A. Químicamente se comportan casi igual.',
          'El hidrógeno tiene tres con nombre propio: **protio** (¹H, sin neutrones), **deuterio** (²H, un neutrón) y **tritio** (³H, dos neutrones, radiactivo).',
          'La mayoría de los elementos son **mezclas isotópicas**: por eso su masa atómica no es un número entero (véase el apartado 3.1).',
        ],
        mistakes: ['Llamar isótopos a especies con distinto Z: ¹⁴C y ¹⁴N tienen el mismo A, pero son elementos distintos.'],
      },
      {
        node: '1.4',
        title: 'Iones',
        body: [
          'Un **ion** es un átomo (o grupo de átomos) con carga neta por haber ganado o perdido electrones. El núcleo no cambia.',
          '**Catión**: ha perdido electrones, tiene carga positiva (Na⁺, Ca²⁺). **Anión**: ha ganado electrones, tiene carga negativa (Cl⁻, O²⁻).',
        ],
        formulas: [{ expr: 'e⁻ = Z − q', vars: [['e⁻', 'número de electrones', '—'], ['q', 'carga del ion (con signo)', '—']], note: 'Ejemplos: O²⁻ → 8 − (−2) = 10 e⁻ · Al³⁺ → 13 − 3 = 10 e⁻' }],
        mistakes: ['Restar la carga negativa en lugar de sumarla: un anión tiene MÁS electrones que protones.', 'Pensar que un ion cambia de elemento: Fe²⁺ sigue siendo hierro.'],
      },
      {
        node: '1.5',
        title: 'Especies isoelectrónicas',
        body: [
          'Son especies con el **mismo número de electrones** (y la misma configuración electrónica), aunque tengan distinto Z. Ejemplo con 10 e⁻: N³⁻, O²⁻, F⁻, Ne, Na⁺, Mg²⁺, Al³⁺.',
          'Entre ellas, la que tiene **más protones** atrae más a la nube electrónica: es la más pequeña y la que tiene mayor energía de ionización.',
        ],
        tip: 'Para ordenar por tamaño una serie isoelectrónica no necesitas la tabla: ordena por Z (más protones, menor radio).',
      },
      {
        node: '1.6',
        title: 'Partículas subatómicas',
        body: ['Los protones y los neutrones forman el **núcleo**, diminuto y con casi toda la masa. Los electrones ocupan la **corteza**, una región unas 10⁵ veces mayor.'],
        widget: 'particulas',
        tip: 'El protón tiene una masa unas 1836 veces la del electrón: la masa del átomo está prácticamente toda en el núcleo.',
      },
    ],
    worked: [
      {
        title: 'Ion cromo(II)',
        source: 'AMP 5',
        statement: 'Una especie tiene 28 neutrones y 22 electrones, y es el ion cromo(II). Completa Z, A, protones y carga, y escribe su representación.',
        steps: [
          { label: 'Elemento → Z', work: 'Cromo: Z = 24 → 24 protones', why: 'El nombre del elemento fija Z (búscalo en la tabla).' },
          { label: 'Número másico', work: 'A = Z + N = 24 + 28 = 52', why: 'Nucleones = protones + neutrones.' },
          { label: 'Carga', work: 'q = p − e⁻ = 24 − 22 = +2', why: 'Le faltan dos electrones: es un catión, como indica «(II)».' },
          { label: 'Representación', work: '⁵²₂₄Cr²⁺', why: 'A arriba a la izquierda, Z abajo a la izquierda, carga arriba a la derecha.' },
        ],
      },
    ],
  },
  {
    block: 2,
    title: 'Modelos atómicos',
    summary: 'Cada modelo se propuso para explicar un experimento y se abandonó cuando otro experimento lo contradijo.',
    examFocus: ['Describir cada modelo y su experimento clave', 'Explicar por qué Rutherford invalida a Thomson', 'Limitaciones del modelo de Rutherford'],
    lab: { route: '/historia', label: 'Time Machine' },
    sections: [
      {
        node: '2.1',
        title: 'Dalton (principios del s. XIX)',
        body: ['Retoma la idea de Demócrito: el átomo es una **esfera maciza, indivisible e indestructible**. Cada elemento tiene átomos de una masa característica.', 'Lo superan la radiactividad (Becquerel, 1896) y el descubrimiento del electrón (Thomson, 1897): el átomo tiene partes.'],
        widget: 'modelos',
      },
      {
        node: '2.2',
        title: 'Thomson y el electrón (1897)',
        body: [
          'En el **tubo de rayos catódicos**, un gas a muy baja presión y un alto voltaje producen un haz que sale del cátodo y se detecta con una pantalla fluorescente.',
          'Resultados: los rayos viajan en línea recta, se desvían hacia la placa positiva en un campo eléctrico (y también con un campo magnético), y sus propiedades no dependen del gas ni de los electrodos. Conclusión: son partículas negativas comunes a toda la materia, los **electrones**.',
        ],
      },
      { node: '2.3', title: 'Modelo de Thomson (1904)', body: ['El «pastel de pasas»: una esfera de **carga positiva repartida** con los electrones incrustados. En conjunto, el átomo es neutro.'] },
      {
        node: '2.4',
        title: 'Experimento de Geiger–Marsden (1911)',
        body: [
          'Lanzaron partículas α (positivas) contra una lámina de oro muy fina y contaron los destellos en una pantalla de ZnS.',
          '**La mayoría** la atravesaban sin desviarse; **muy pocas** se desviaban mucho; **alguna** incluso rebotaba.',
          'Con el modelo de Thomson no debería haber desviaciones grandes. Las grandes desviaciones exigen una carga positiva **muy concentrada** en un núcleo diminuto.',
        ],
        tip: 'Respuesta modelo: «La mayoría pasa → el átomo es casi vacío. Algunas rebotan → hay un núcleo pequeño, positivo y con casi toda la masa. Thomson no lo explica porque su carga positiva está repartida».',
      },
      { node: '2.5', title: 'Modelo de Rutherford', body: ['Núcleo pequeñísimo y positivo con casi toda la masa. Los electrones giran a su alrededor como planetas. El protón se identifica en 1919.'] },
      {
        node: '2.6',
        title: 'Limitaciones de Rutherford',
        body: [
          '**Estabilidad del núcleo**: los protones se repelen. Se resuelve con el **neutrón** (Chadwick, 1932) y la fuerza nuclear fuerte.',
          '**Colapso atómico**: según Maxwell, un electrón con aceleración normal radia energía. Caería en espiral al núcleo (en ≈ 10⁻¹¹ s) emitiendo un **espectro continuo**. Pero la materia es estable y los espectros son de líneas.',
        ],
      },
      { node: '2.7', title: 'Cronología', body: ['Demócrito → Dalton (1808) → Thomson (1904) → Rutherford (1911) → Bohr (1913) → Chadwick, neutrón (1932) → modelo mecanocuántico (1926 en adelante).'] },
    ],
    worked: [
      {
        title: 'Por qué cae el modelo de Thomson',
        statement: 'Explica por qué el experimento de la lámina de oro obligó a abandonar el modelo de Thomson.',
        steps: [
          { label: 'Predicción de Thomson', work: 'Carga positiva repartida → fuerzas débiles → desviaciones de muy pocos grados', why: 'Una carga difusa no puede frenar ni invertir una partícula α rápida.' },
          { label: 'Observación', work: 'La mayoría pasa sin desviarse, pero alguna se desvía mucho o rebota', why: 'Datos de Geiger y Marsden.' },
          { label: 'Conclusión', work: 'Hay un núcleo pequeñísimo, positivo y con casi toda la masa', why: 'Solo una carga concentrada produce una repulsión capaz de hacer rebotar la partícula.' },
        ],
      },
    ],
  },
  {
    block: 3,
    title: 'Espectros atómicos y radiación',
    summary: 'La luz es una onda electromagnética. Los átomos solo emiten o absorben ciertas frecuencias: sus espectros son de líneas y permiten identificarlos.',
    examFocus: ['Calcular λ, ν, T y E de una radiación (con conversiones)', 'Aplicar la ecuación de Rydberg y decir serie y región', 'Masa atómica media a partir del espectro de masas'],
    lab: { route: '/fotones?tab=ondas', label: 'Photon Lab' },
    sections: [
      {
        node: '3.1',
        title: 'Espectrometría de masas y masa atómica media',
        body: ['El espectrómetro separa los isótopos por su masa y mide su **abundancia relativa**. La masa atómica del elemento es la **media ponderada** de las masas de sus isótopos.'],
        formulas: [{ expr: 'M = (m₁·%₁ + m₂·%₂ + …) / 100', vars: [['M', 'masa atómica media', 'u'], ['mᵢ', 'masa del isótopo i', 'u'], ['%ᵢ', 'abundancia del isótopo i', '%']] }],
        widget: 'masa-media',
        mistakes: ['Hacer la media aritmética sin ponderar.', 'Olvidar dividir entre 100.', 'No comprobar que las abundancias sumen 100 % (los apuntes tienen una errata: 74,771 % debería ser 75,771 %).'],
        tip: 'Comprueba siempre: el resultado debe quedar más cerca del isótopo más abundante.',
      },
      {
        node: '3.2',
        title: 'Ondas: longitud de onda, frecuencia, periodo y velocidad',
        body: [
          'Una onda es una perturbación que se propaga transportando energía sin transportar materia. Las ondas electromagnéticas son campos eléctrico y magnético que oscilan y se propagan incluso en el vacío.',
          '**Longitud de onda λ**: distancia entre dos crestas (o dos valles) consecutivas; se mide en metros. **Amplitud**: altura máxima de la oscilación.',
          '**Periodo T**: tiempo que tarda en completarse una oscilación, es decir, en avanzar una longitud de onda (s). **Frecuencia ν (o f)**: oscilaciones por segundo (Hz = s⁻¹). Son inversas.',
          '**Velocidad de propagación v**: distancia que avanza la onda por segundo. En el vacío, todas las ondas electromagnéticas viajan a **c = 3·10⁸ m/s**.',
        ],
        formulas: [
          { expr: 'T = 1/ν', vars: [['T', 'periodo', 's'], ['ν', 'frecuencia', 'Hz = s⁻¹']] },
          { expr: 'v = λ/T = λ·ν', vars: [['v', 'velocidad de propagación', 'm/s'], ['λ', 'longitud de onda', 'm']] },
          { expr: 'c = λ·ν  (luz en el vacío)', vars: [['c', '3·10⁸ m/s', 'm/s']] },
        ],
        widget: 'onda',
        mistakes: ['No pasar nm a metros: 1 nm = 10⁻⁹ m (500 nm = 5·10⁻⁷ m).', 'Confundir periodo y frecuencia: T = 1/ν.', 'Pensar que a mayor λ, mayor frecuencia: son inversamente proporcionales (λ·ν = c es constante).'],
        tip: 'Escribe siempre la fórmula, sustituye con unidades del SI y comprueba el orden de magnitud: la luz visible tiene ν ≈ 10¹⁴–10¹⁵ Hz.',
      },
      {
        node: '3.3',
        title: 'El espectro electromagnético',
        body: [
          'De menor a mayor longitud de onda (de mayor a menor energía): **rayos γ, rayos X, ultravioleta, visible, infrarrojo, microondas y ondas de radio**.',
          'El **visible** va de unos 380 nm (violeta) a 780 nm (rojo). El rojo tiene la frecuencia más baja del visible y el violeta, la más alta.',
        ],
        widget: 'espectro-em',
      },
      {
        node: '3.4',
        title: 'Energía del fotón',
        body: ['La luz se emite y se absorbe en paquetes, los **fotones**. Su energía es proporcional a la frecuencia (Planck): a mayor frecuencia (menor λ), más energía.'],
        formulas: [
          { expr: 'E = h·ν = h·c/λ', vars: [['E', 'energía del fotón', 'J'], ['h', 'constante de Planck 6,626·10⁻³⁴', 'J·s']] },
          { expr: '1 eV = 1,602·10⁻¹⁹ J', vars: [['eV', 'electronvoltio', 'J']], note: 'De J a eV: divide entre 1,602·10⁻¹⁹.' },
        ],
        mistakes: ['Multiplicar h por λ en lugar de dividir: E = h·c/λ.', 'Para pasar de J a eV, multiplicar en vez de dividir.'],
      },
      {
        node: '3.5',
        title: 'Espectros de emisión y absorción',
        body: [
          'Un gas **excitado** emite solo ciertas longitudes de onda: **espectro de emisión**, con líneas brillantes sobre fondo negro.',
          'Si la luz blanca atraviesa un gas frío, faltan longitudes de onda de ese mismo conjunto: **espectro de absorción**, con líneas oscuras. Ojo: en un gas frío casi todos los átomos están en el estado fundamental, así que solo aparecen las líneas de los saltos que parten de él (en el hidrógeno, la serie de Lyman, en el UV). Cada línea de absorción coincide con una de emisión, pero no todas las de emisión aparecen en absorción.',
          'Cada elemento tiene un espectro **único**: sirve para identificarlo, incluso en las estrellas.',
        ],
      },
      {
        node: '3.6',
        title: 'Ecuación de Rydberg',
        body: ['Las líneas del hidrógeno cumplen la ecuación empírica de Rydberg. Bohr la explicó como saltos del electrón entre niveles de energía.'],
        formulas: [
          { expr: '1/λ = R·(1/n₁² − 1/n₂²)', vars: [['R', 'constante de Rydberg 1,097·10⁷', 'm⁻¹'], ['n₁', 'nivel inferior', '—'], ['n₂', 'nivel superior (n₂ > n₁)', '—']], note: 'R = 109 740 cm⁻¹ = 1,0974·10⁷ m⁻¹' },
          { expr: 'ΔE = h·c·R·(1/n₁² − 1/n₂²)', vars: [['ΔE', 'energía del fotón', 'J']] },
        ],
        widget: 'rydberg',
        mistakes: ['Dar como λ el número de ondas sin invertirlo.', 'Poner n₂ < n₁ (sale negativo).', 'Usar R en cm⁻¹ sin convertir: el resultado sale 100 veces menor.', 'Olvidar elevar los niveles al cuadrado.'],
        tip: 'Orden del cálculo: 1/λ (Rydberg) → λ (invertir) → ν = c/λ → E = h·ν → E en eV.',
      },
      {
        node: '3.7',
        title: 'Series espectrales del hidrógeno',
        body: [
          'Cada serie reúne los saltos que terminan en el mismo nivel n₁: **Lyman** (n₁ = 1, ultravioleta), **Balmer** (n₁ = 2, visible y UV cercano), **Paschen** (n₁ = 3), **Brackett** (n₁ = 4) y **Pfund** (n₁ = 5), estas tres en el infrarrojo.',
          'La primera línea de cada serie viene de n₂ = n₁ + 1, la segunda de n₂ = n₁ + 2, y así sucesivamente.',
        ],
        mistakes: ['Decir que Balmer está en el infrarrojo (errata de los apuntes): está en el visible y el UV cercano.'],
      },
      {
        node: '3.7',
        id: '3.7-inv',
        title: 'El problema inverso: hallar n₂ (o n₁) a partir de una línea',
        body: [
          'Es el ejercicio de espectros que más cuesta en el examen porque hay que **despejar** dentro de la ecuación de Rydberg. La clave es no hacerlo de una vez, sino en pasos pequeños, comprobando cada uno.',
          '**1.** Pasa el dato a número de ondas: si te dan λ, calcula 1/λ (en m); si te dan ν, 1/λ = ν/c. **2.** Divide entre R: (1/λ)/R = 1/n₁² − 1/n₂². **3.** Despeja: 1/n₂² = 1/n₁² − (1/λ)/R. **4.** Invierte: n₂² = 1/(…). **5.** Raíz cuadrada y redondea al entero más próximo.',
          'Si lo que falta es n₁ (te dan n₂), el paso 3 cambia: 1/n₁² = (1/λ)/R + 1/n₂². Comprueba siempre que el resultado es un entero (o muy cercano) y que n₂ > n₁.',
        ],
        formulas: [{ expr: 'n₂ = 1 / √(1/n₁² − 1/(λ·R))', vars: [['n₁', 'nivel inferior (fija la serie)', '—'], ['λ', 'longitud de onda', 'm'], ['R', '1,097·10⁷', 'm⁻¹']], note: 'Con frecuencia: 1/λ = ν/c.' }],
        widget: 'rydberg-inverso',
        mistakes: ['Usar λ en nm sin pasar a metros (sale n₂² absurdo).', 'Restar al revés y obtener 1/n₂² negativo.', 'Olvidar invertir o hacer la raíz: n₂² = 25 → n₂ = 5, no 25.', 'Aceptar un n₂ no entero sin sospechar de los cálculos.'],
        tip: 'Cuando el resultado salga 7,99 o 5,02, el nivel es 8 o 5: la diferencia viene del redondeo de los datos. Si sale 5,5, revisa el cálculo.',
      },
      {
        node: '3.8',
        title: 'Cuántas líneas aparecen',
        body: ['Si se excitan los átomos hasta el nivel n, al desexcitarse pueden aparecer todas las parejas de niveles posibles.'],
        formulas: [{ expr: 'líneas = n·(n − 1)/2', vars: [['n', 'nivel máximo alcanzado', '—']], note: 'Desde n = 4: 4·3/2 = 6 líneas.' }],
      },
    ],
    worked: [
      {
        title: 'Transición 3 → 1 del hidrógeno',
        source: 'AMP 7',
        statement: 'Un electrón del H pasa de n = 3 a n = 1. Calcula λ, ν y la energía (J y eV), di la región y explica por qué tiene más energía que el salto 3 → 2. Datos: R = 109 740 cm⁻¹; h = 6,626·10⁻³⁴ J·s; c = 3·10⁸ m/s.',
        steps: [
          { label: 'Unidades', work: 'R = 109 740 cm⁻¹ = 1,0974·10⁷ m⁻¹', why: '1 cm⁻¹ = 100 m⁻¹: así λ saldrá en metros.' },
          { label: 'Rydberg', work: '1/λ = 1,0974·10⁷·(1/1² − 1/3²) = 9,755·10⁶ m⁻¹', why: 'n₁ = 1 (nivel inferior), n₂ = 3.' },
          { label: 'Longitud de onda', work: 'λ = 1/9,755·10⁶ = 1,025·10⁻⁷ m = 102,5 nm', why: 'Hay que invertir el número de ondas.' },
          { label: 'Frecuencia', work: 'ν = c/λ = 3·10⁸/1,025·10⁻⁷ = 2,93·10¹⁵ Hz', why: 'c = λ·ν.' },
          { label: 'Energía', work: 'E = h·ν = 1,94·10⁻¹⁸ J = 12,1 eV', why: 'Para pasar a eV se divide entre 1,602·10⁻¹⁹.' },
          { label: 'Región y serie', work: 'Ultravioleta · serie de Lyman', why: 'λ < 380 nm; termina en n = 1.' },
          { label: 'Comparación', work: 'E₃ − E₁ (12,1 eV) > E₃ − E₂ (1,9 eV)', why: 'Los niveles se juntan al subir (Eₙ ∝ −1/n²): bajar hasta n = 1 libera mucha más energía.' },
        ],
      },
      {
        title: '¿Qué línea de Paschen tiene esta frecuencia?',
        source: 'AMP 9',
        statement: 'Indica qué línea de la serie de Paschen tiene una frecuencia de 2,34·10¹⁴ s⁻¹. Datos: c = 3·10⁸ m/s; R = 109 740 cm⁻¹.',
        steps: [
          { label: 'Datos clave', work: 'Paschen → n₁ = 3; incógnita n₂', why: 'La serie fija el nivel inferior.' },
          { label: 'Número de ondas', work: '1/λ = ν/c = 2,34·10¹⁴ / 3·10⁸ = 7,80·10⁵ m⁻¹', why: 'De c = λ·ν se obtiene 1/λ = ν/c.' },
          { label: 'Divide entre R', work: '7,80·10⁵ / 1,0974·10⁷ = 0,07108', why: 'R en m⁻¹ (109 740 cm⁻¹ × 100). Queda 1/3² − 1/n₂² = 0,07108.' },
          { label: 'Despeja', work: '1/n₂² = 1/9 − 0,07108 = 0,04003', why: 'Pasamos 1/n₂² a un miembro y lo demás al otro.' },
          { label: 'Invierte y raíz', work: 'n₂² = 24,98 → n₂ = 5', why: 'Debe salir (casi) entero.' },
          { label: 'Respuesta', work: 'Segunda línea de Paschen (5 → 3)', why: 'La primera es 4 → 3; la segunda, 5 → 3.' },
        ],
      },
      {
        title: 'Balmer a 389 nm: ¿qué n₂?',
        source: 'HOJ 11',
        statement: '¿Qué valor de n₂ en la ecuación de Rydberg corresponde a la línea de la serie de Balmer a 389 nm? Dato: R = 1,097·10⁷ m⁻¹.',
        steps: [
          { label: 'Datos clave', work: 'Balmer → n₁ = 2; λ = 389 nm = 3,89·10⁻⁷ m', why: 'Siempre a metros antes de operar.' },
          { label: 'Número de ondas', work: '1/λ = 1/3,89·10⁻⁷ = 2,571·10⁶ m⁻¹', why: '' },
          { label: 'Divide entre R', work: '2,571·10⁶ / 1,097·10⁷ = 0,2343', why: 'Queda 1/4 − 1/n₂² = 0,2343.' },
          { label: 'Despeja', work: '1/n₂² = 0,25 − 0,2343 = 0,01566', why: '' },
          { label: 'Invierte y raíz', work: 'n₂² = 63,9 → n₂ = 7,99 ≈ 8', why: 'El 7,99 se debe al redondeo de λ: el nivel es 8.' },
        ],
      },
    ],
  },
  {
    block: 4,
    title: 'Modelo de Bohr',
    summary: 'Bohr aplicó la cuantización de Planck al átomo de Rutherford: solo hay ciertas órbitas permitidas y el átomo emite o absorbe luz al saltar entre ellas.',
    examFocus: ['Enunciar los tres postulados', 'Interpretar las líneas como saltos entre niveles', 'Correcciones de Sommerfeld, Zeeman y el espín'],
    lab: { route: '/historia', label: 'Time Machine' },
    sections: [
      {
        node: '4.1',
        title: 'Los tres postulados',
        body: [
          '**1. Órbitas estacionarias**: el electrón gira en ciertas órbitas circulares sin emitir energía.',
          '**2. Cuantización**: solo se permiten las órbitas en las que el momento angular es múltiplo de h/2π: L = m·v·r = n·h/2π (n = 1, 2, 3…).',
          '**3. Emisión y absorción**: el electrón absorbe o emite un fotón al saltar entre órbitas; la energía del fotón es la diferencia entre niveles.',
        ],
        formulas: [{ expr: 'E_fotón = |E_final − E_inicial| = h·ν', vars: [['E', 'energía', 'J']], note: 'Si sube de nivel, absorbe; si baja, emite. La energía del fotón siempre es positiva.' }],
      },
      {
        node: '4.2',
        title: 'Radios y energías',
        body: ['Los radios crecen con n² y las energías son negativas (electrón ligado) y se acercan a 0 al subir.'],
        formulas: [
          { expr: 'rₙ = n²·r₀', vars: [['r₀', '0,53 Å (radio de Bohr)', 'Å']] },
          { expr: 'Eₙ = −13,6 eV / n²', vars: [['Eₙ', 'energía del nivel n del H', 'eV']], note: 'E₁ = −13,6 eV · E₂ = −3,40 eV · E₃ = −1,51 eV' },
        ],
      },
      { node: '4.3', title: 'Interpretación del espectro', body: ['Cada línea del espectro del hidrógeno corresponde a un salto concreto entre dos niveles. Como los niveles son discretos, el espectro es de líneas, no continuo.'] },
      {
        node: '4.4',
        title: 'Correcciones al modelo',
        body: [
          '**Sommerfeld (1915)**: la estructura fina (líneas dobles) se explica con órbitas elípticas → número cuántico secundario **l**.',
          '**Zeeman (1896)**: el desdoblamiento de las líneas en un campo magnético se explica con distintas orientaciones → número cuántico magnético **m**.',
          '**Uhlenbeck y Goudsmit (1925)**: proponen el espín del electrón → **s**.',
        ],
      },
    ],
    worked: [
      {
        title: 'Energía para ionizar desde n = 2',
        statement: '¿Qué energía mínima hay que dar a un electrón del H en el nivel n = 2 para arrancarlo?',
        steps: [
          { label: 'Energía inicial', work: 'E₂ = −13,6/2² = −3,40 eV', why: 'Fórmula de Bohr.' },
          { label: 'Energía final', work: 'E∞ = 0', why: 'Electrón libre: n → ∞.' },
          { label: 'Resultado', work: 'ΔE = 0 − (−3,40) = 3,40 eV = 5,45·10⁻¹⁹ J', why: 'Hay que aportar la diferencia de energía.' },
        ],
      },
    ],
  },
  {
    block: 5,
    title: 'Modelo actual: orbitales y números cuánticos',
    summary: 'No se puede conocer la trayectoria del electrón; solo la probabilidad de encontrarlo. Cada orbital queda definido por tres números cuánticos y cada electrón, por cuatro.',
    examFocus: ['Decir si una combinación (n, l, m, s) es posible y por qué', 'Número de orbitales y electrones por subnivel y por nivel', 'Diferencia entre órbita y orbital'],
    lab: { route: '/cuantico', label: 'Quantum Space' },
    sections: [
      { node: '5.1', title: 'Dualidad onda-partícula', body: ['**De Broglie**: la materia, como la luz, puede comportarse como onda o como partícula. El electrón tiene propiedades ondulatorias.'] },
      {
        node: '5.2',
        title: 'Principio de incertidumbre',
        body: ['**Heisenberg**: no se pueden conocer a la vez, con precisión ilimitada, la posición y la velocidad (el momento) del electrón. Cuanto mejor se conoce una, peor se conoce la otra.'],
        formulas: [{ expr: 'Δx·Δp ≥ ħ/2', vars: [['Δx', 'incertidumbre en la posición', 'm'], ['Δp', 'incertidumbre en el momento', 'kg·m/s'], ['ħ', 'h/2π', 'J·s']] }],
      },
      {
        node: '5.3',
        title: 'Órbita frente a orbital',
        body: ['Una **órbita** (Bohr) es una trayectoria definida. Un **orbital** es la función matemática que describe el tamaño, la forma y la orientación de la región donde es **más probable** encontrar al electrón.'],
        tip: 'Respuesta modelo: «La órbita es un camino definido; el orbital es una región de probabilidad, porque el principio de incertidumbre impide conocer la trayectoria».',
      },
      {
        node: '5.4',
        title: 'Los cuatro números cuánticos',
        body: [
          '**n** (principal): 1, 2, 3… Indica el nivel, el tamaño y la energía.',
          '**l** (secundario o azimutal): de 0 a n − 1. Indica el subnivel y la forma: 0 = s, 1 = p, 2 = d, 3 = f.',
          '**m** (magnético, m_l): de −l a +l. Indica la orientación del orbital.',
          '**s** (espín, m_s): +½ o −½. Es propio del electrón.',
        ],
        widget: 'numeros-cuanticos',
        mistakes: ['Admitir l = n (siempre l ≤ n − 1: no existe el 2d).', 'Admitir |m| > l.', 'Dar a s valores distintos de ±½ (como 0 o 1).'],
        tip: 'Para validar (n, l, m, s), comprueba en este orden: n ≥ 1 → l < n → |m| ≤ l → s = ±½. Si falla una, di cuál y por qué.',
      },
      {
        node: '5.5',
        title: 'Orbitales y capacidad',
        body: ['Cada subnivel tiene 2l + 1 orbitales: s → 1, p → 3, d → 5, f → 7. Cada orbital admite 2 electrones. Un nivel n tiene n² orbitales y admite 2n² electrones.'],
        formulas: [
          { expr: 'orbitales del subnivel = 2l + 1', vars: [['l', 'número cuántico secundario', '—']] },
          { expr: 'orbitales del nivel = n² · electrones = 2n²', vars: [['n', 'nivel', '—']] },
        ],
      },
      { node: '5.6', title: 'Estados cuánticos', body: ['Con n = 2 hay 8 estados (n, l, m, s): dos del 2s y seis del 2p. En general, 2n².'] },
    ],
    worked: [
      {
        title: '¿Combinaciones posibles?',
        source: 'AMP 12',
        statement: 'Indica si son posibles: (1, 1, −1, +½), (2, 0, 0, −1), (2, 1, −2, +½) y (7, 5, −2, −½).',
        steps: [
          { label: '(1, 1, −1, +½)', work: 'No posible', why: 'Con n = 1, l solo puede valer 0.' },
          { label: '(2, 0, 0, −1)', work: 'No posible', why: 's solo puede ser ±½.' },
          { label: '(2, 1, −2, +½)', work: 'No posible', why: 'Con l = 1, m solo puede ser −1, 0 o +1.' },
          { label: '(7, 5, −2, −½)', work: 'Posible (orbital 7h)', why: 'l = 5 < 7, |m| = 2 ≤ 5 y s = −½. Ningún átomo lo ocupa en estado fundamental, pero la combinación es válida.' },
        ],
      },
    ],
  },
  {
    block: 6,
    title: 'Configuración electrónica',
    summary: 'Los electrones ocupan los orbitales de menor a mayor energía (Möller), como máximo dos por orbital (Pauli) y desapareados mientras puedan (Hund).',
    examFocus: ['Escribir configuraciones de átomos e iones (también abreviadas)', 'Decir si una configuración es fundamental, excitada o imposible', 'Electrones desapareados y de valencia; grupo y periodo'],
    lab: { route: '/arquitecto', label: 'Electron Architect' },
    sections: [
      { node: '6.1', title: 'Notación', body: ['En **n xᵉ**, n es el nivel, x el tipo de orbital y e el número de electrones: 3p⁴ son 4 electrones en el subnivel 3p. En el **diagrama de cajas**, cada caja es un orbital y cada flecha, un electrón con su espín.'] },
      { node: '6.2', title: 'Principio de exclusión de Pauli', body: ['En un átomo no puede haber dos electrones con los cuatro números cuánticos iguales: **como máximo 2 electrones por orbital, con espines opuestos**. Capacidad: s², p⁶, d¹⁰, f¹⁴.'] },
      {
        node: '6.3',
        title: 'Orden de llenado (Möller)',
        body: [
          'Los electrones ocupan primero los subniveles de **menor energía**: menor n + l; a igualdad de n + l, menor n.',
          'Orden: 1s 2s 2p 3s 3p **4s 3d** 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p.',
        ],
        widget: 'configuracion',
        mistakes: ['Llenar el 3d antes que el 4s.', 'Superar la capacidad de un subnivel (p⁷).', 'Equivocarse al contar el total de electrones: suma siempre los exponentes.'],
      },
      { node: '6.4', title: 'Regla de Hund', body: ['En un subnivel con varios orbitales, los electrones ocupan primero **cada orbital por separado y con espines paralelos**; después se aparean. Por eso el O (2p⁴) tiene 2 electrones desapareados y el N (2p³), 3.'] },
      {
        node: '6.5',
        title: 'Fundamental, excitado, prohibido e imposible',
        body: [
          '**Fundamental**: sigue Möller sin dejar huecos. **Excitado**: es posible, pero algún electrón ocupa un subnivel superior quedando huecos debajo (1s² 2s² 2p⁶ 4s² es Mg excitado).',
          '**Prohibido**: un subnivel tiene más electrones de los que caben (2p⁷). **Imposible**: aparece un subnivel que no existe (2d, 1p, 3f).',
        ],
      },
      { node: '6.6', title: 'Notación abreviada', body: ['Se sustituye la parte que coincide con el gas noble anterior por su símbolo entre corchetes: Fe = [Ar] 4s² 3d⁶.'] },
      {
        node: '6.7',
        title: 'Excepciones',
        body: ['El **Cr** y el **Mo** prefieren d⁵s¹ (subnivel d semilleno) y el **Cu**, la **Ag** y el **Au** prefieren d¹⁰s¹ (subnivel d lleno): Cr = [Ar] 3d⁵ 4s¹ y Cu = [Ar] 3d¹⁰ 4s¹.', 'Son excepciones al orden de Möller, no a la regla de Hund (los apuntes lo dicen mal).'],
      },
      {
        node: '6.8',
        title: 'Configuración de iones',
        body: ['Primero se escribe la del átomo neutro. **Aniones**: se añaden electrones al siguiente hueco. **Cationes**: se quitan del nivel **más externo** (mayor n), así que en los metales de transición se quitan antes los 4s que los 3d: Fe²⁺ = [Ar] 3d⁶.'],
        mistakes: ['Quitar los 3d antes que los 4s en los cationes de transición.'],
      },
      { node: '6.9', title: 'Electrones de valencia', body: ['Son los de la **capa más externa** (mayor n). Determinan las propiedades químicas: el Br ([Ar] 3d¹⁰ 4s² 4p⁵) tiene 7.'] },
    ],
    worked: [
      {
        title: 'Tres elementos',
        source: 'TEO ej. 8',
        statement: 'Para A (Z = 8), B (Z = 20) y C (Z = 35): justifica grupo y periodo con la configuración y razona su ion más estable.',
        steps: [
          { label: 'A (Z = 8)', work: '1s² 2s² 2p⁴ → periodo 2, grupo 16 (oxígeno)', why: 'Capa de valencia n = 2 con 6 electrones (ns² np⁴ → grupo 16).' },
          { label: 'B (Z = 20)', work: '[Ar] 4s² → periodo 4, grupo 2 (calcio)', why: 'Capa n = 4 con 2 electrones.' },
          { label: 'C (Z = 35)', work: '[Ar] 3d¹⁰ 4s² 4p⁵ → periodo 4, grupo 17 (bromo)', why: 'Capa n = 4 con 7 electrones: ns² np⁵ → grupo 17.' },
          { label: 'Iones', work: 'O²⁻ = [Ne] · Ca²⁺ = [Ar] · Br⁻ = [Kr]', why: 'Cada uno alcanza la configuración del gas noble más cercano.' },
        ],
      },
    ],
  },
  {
    block: 7,
    title: 'Sistema periódico y propiedades periódicas',
    summary: 'La posición en la tabla resume la configuración. Las propiedades varían de forma periódica porque dependen de la carga nuclear efectiva y del número de capas.',
    examFocus: ['Ordenar elementos por radio, energía de ionización, afinidad electrónica o electronegatividad y razonarlo', 'Radios de iones y especies isoelectrónicas', 'Explicar las excepciones relevantes'],
    lab: { route: '/periodico', label: 'Periodic Universe' },
    sections: [
      { node: '7.1', title: 'Organización', body: ['118 elementos ordenados por Z en **7 periodos** (filas) y **18 grupos** (columnas). El periodo es el n de la capa de valencia; los elementos de un grupo tienen la misma configuración de valencia y propiedades parecidas.'] },
      {
        node: '7.3',
        title: 'Bloques',
        body: ['**s** (grupos 1–2): ns¹–². **p** (13–18): ns² npˣ. **d** (3–12): ns² (n−1)dˣ. **f** (lantánidos y actínidos): ns² (n−2)fˣ. El bloque lo indica el subnivel del último electrón según Möller.'],
      },
      { node: '7.4', title: 'Familias', body: ['Grupo 1: **alcalinos** (salvo el H); 2: **alcalinotérreos**; 3–12: **metales de transición**; 16: anfígenos; 17: **halógenos**; 18: **gases nobles**. Metales a la izquierda, no metales a la derecha y semimetales en la frontera.'] },
      { node: '7.5', title: 'Iones estables', body: ['Los elementos representativos ganan o pierden electrones hasta alcanzar la configuración del gas noble: grupo 1 → +1, grupo 2 → +2, grupo 13 → +3, grupo 15 → −3, grupo 16 → −2, grupo 17 → −1.'] },
      {
        node: '7.6',
        title: 'Apantallamiento y carga nuclear efectiva',
        body: ['Los electrones internos «tapan» parte de la carga del núcleo. La carga que siente un electrón externo es la **carga nuclear efectiva**. **Aumenta hacia la derecha** en un periodo y es casi constante en un grupo.'],
        formulas: [{ expr: 'Z_ef = Z − a', vars: [['Z', 'número atómico', '—'], ['a', 'constante de apantallamiento', '—']], note: 'Slater: misma capa 0,35 · capa n−1 0,85 · capas internas 1. Simplificado: internos ≈ 1, misma capa < 1.' }],
      },
      {
        node: '7.7',
        title: 'Radio atómico',
        body: ['**En un periodo disminuye hacia la derecha**: misma capa y más Z_ef, así que la nube se contrae. **En un grupo aumenta hacia abajo**: más capas ocupadas.'],
        widget: 'tendencias',
        tip: 'Plantilla de respuesta: 1) Sitúa los elementos (periodo y grupo). 2) Si comparten periodo, compara Z_ef; si comparten grupo, compara el número de capas. 3) Concluye para la propiedad que te piden.',
      },
      { node: '7.8', title: 'Radio iónico', body: ['Un catión es **más pequeño** que su átomo (menos electrones, menos repulsión) y un anión, **más grande**: r(catión) < r(neutro) < r(anión). En una serie isoelectrónica, a más protones, menor radio.'] },
      {
        node: '7.9',
        title: 'Energía de ionización',
        body: ['Energía mínima para arrancar un electrón a un átomo **gaseoso** en estado fundamental: X(g) + EI → X⁺(g) + e⁻. **Aumenta hacia la derecha y hacia arriba**: cuanto más pequeño es el átomo y más Z_ef tiene, más cuesta arrancar el electrón.', 'La 2.ª EI es siempre mayor, y da un salto enorme cuando el electrón sale de una capa interna (K: 419 → 3052 kJ/mol).'],
      },
      { node: '7.10', title: 'Afinidad electrónica', body: ['Energía liberada cuando un átomo gaseoso **capta** un electrón: X(g) + e⁻ → X⁻(g) + AE. Crece hacia la derecha y hacia arriba (no metales). Algunos átomos (N, Be, Mg, gases nobles) no forman aniones estables.'] },
      { node: '7.11', title: 'Electronegatividad', body: ['Tendencia de un átomo a **atraer los electrones de un enlace**. Crece hacia la derecha y hacia arriba: el F es el más electronegativo (3,98).'] },
      { node: '7.12', title: 'Carácter metálico', body: ['Los **metales** tienen EI, AE y electronegatividad bajas: tienden a perder electrones (cationes). Los **no metales**, altas: tienden a ganarlos (aniones). El carácter metálico crece hacia la izquierda y hacia abajo.'] },
      {
        node: '7.13',
        title: 'Excepciones relevantes',
        body: [
          'EI: **Be > B** y **Mg > Al** (el electrón np¹ es más fácil de arrancar que el ns²); **N > O** y **P > S** (el np³ semilleno es especialmente estable; en el O el electrón sale de un orbital doblemente ocupado).',
          'AE: **Cl > F** (el F es tan pequeño que el electrón extra sufre mucha repulsión).',
        ],
      },
    ],
    worked: [
      {
        title: 'Radios y afinidades de P, S y Cl',
        source: 'TEO ej. 9',
        statement: 'A = 3s² 3p³, B = 3s² 3p⁴ y C = 3s² 3p⁵. Ordena razonadamente sus radios atómicos y sus afinidades electrónicas.',
        steps: [
          { label: 'Situar', work: 'Los tres están en el periodo 3 (A = P, B = S, C = Cl)', why: 'La capa de valencia es n = 3.' },
          { label: 'Z_ef', work: 'Z_ef(C) > Z_ef(B) > Z_ef(A)', why: 'Más protones y apantallamiento casi igual (misma capa).' },
          { label: 'Radios', work: 'A > B > C', why: 'A más Z_ef, más atraídos los electrones y menor radio.' },
          { label: 'Afinidades', work: 'C > B > A', why: 'Átomo más pequeño y con más Z_ef → atrae con más fuerza un electrón extra. Datos: 349 > 200 > 72 kJ/mol.' },
        ],
      },
    ],
  },
];

export const SECTION_BY_NODE = new Map<string, { lesson: Lesson; section: GuideSection }>();
for (const l of LESSONS) for (const sec of l.sections) {
  const key = sec.id ?? sec.node;
  if (!SECTION_BY_NODE.has(key)) SECTION_BY_NODE.set(key, { lesson: l, section: sec });
}

/** Sección de la guía para un ejercicio (algunos generadores tienen una sección específica). */
export function guideAnchorFor(nodeId: string, generatorId?: string): string {
  if (generatorId === 'serie-inversa') return '3.7-inv';
  return guideAnchor(nodeId);
}

/** Sección de la guía más cercana para un nodo (si el nodo no tiene sección propia, la de su bloque). */
export function guideAnchor(nodeId: string): string {
  if (SECTION_BY_NODE.has(nodeId)) return nodeId;
  const block = Number(nodeId.split('.')[0]);
  return LESSONS.find((l) => l.block === block)?.sections[0]?.node ?? '1.1';
}

/**
 * Notas de rigor: cuando los apuntes usan una convención, una simplificación o tienen una errata, se
 * muestran tres niveles para no confundir: qué dicen los apuntes, qué responder en el examen y la
 * explicación científicamente rigurosa. Referencias: docs/01-matriz-cobertura.md (E1–E22) y
 * docs/07-segunda-generacion.md (E23–E29).
 */
export interface RigorNote {
  id: string;
  node: string;
  title: string;
  clase: string;
  examen: string;
  rigor: string;
}

export const RIGOR_NOTES: RigorNote[] = [
  { id: 'E1', node: '3.1', title: 'Las abundancias del ejemplo del cloro', clase: 'Cl-35 74,771 % y Cl-37 24,229 % → 35,453 u.', examen: 'Usa los datos que te den y comprueba que las abundancias sumen 100 %.', rigor: 'Esas abundancias suman 99 %: con ellas sale 35,10 u. El resultado 35,453 u corresponde a 75,771 %.' },
  { id: 'E2', node: '3.7', title: 'Región de la serie de Balmer', clase: 'La tabla de series pone «Visible/Infrarrojo».', examen: 'Balmer: visible (y ultravioleta cercano).', rigor: 'Las líneas de Balmer van de 656 nm al límite de 364,6 nm: visible y UV cercano, nunca infrarrojo.' },
  { id: 'E3', node: '4.1', title: 'Signo de la energía del fotón', clase: 'E = E_f − E_i = h·ν ≤ 0 en la emisión.', examen: 'E_fotón = |E_f − E_i| = h·ν; di si se emite o se absorbe.', rigor: 'h·ν es siempre positiva. Lo que cambia de signo es ΔE del átomo: negativo al emitir, positivo al absorber.' },
  { id: 'E4', node: '6.7', title: '¿Excepciones a Hund?', clase: 'Cr, Mo, Cu, Ag y Au son «excepciones a la regla de Hund».', examen: 'Cr = [Ar] 3d⁵ 4s¹ y Cu = [Ar] 3d¹⁰ 4s¹ (excepciones).', rigor: 'Son excepciones al orden de llenado (Möller), no a Hund: el Cr 3d⁵ 4s¹ cumple Hund con 6 electrones desapareados.' },
  { id: 'E8', node: '5.4', title: '¿n solo llega hasta 7?', clase: 'n toma valores «desde 1 hasta 7».', examen: 'n = 1, 2, 3… (en los átomos conocidos, en estado fundamental, hasta 7).', rigor: 'n puede ser cualquier entero positivo; el 7 es el nivel más alto ocupado en el estado fundamental de los elementos conocidos. Los estados excitados usan n mayores.' },
  { id: 'E9', node: '5.4', title: 'El espín no es un giro', clase: 's: «sentido de giro del electrón sobre sí mismo».', examen: 'm_s = +½ o −½; dos orientaciones posibles del espín.', rigor: 'El espín es un momento angular intrínseco sin equivalente clásico: el electrón no es una bolita que gira. La imagen del giro es solo una analogía.' },
  { id: 'E11', node: '7.6', title: '¿Z_ef constante en un grupo?', clase: 'Z_ef «es constante a lo largo de un grupo»; electrones internos apantallan 1.', examen: 'En un grupo, Z_ef casi constante y aumenta el número de capas → aumenta el radio.', rigor: 'Con las reglas de Slater, la capa n − 1 apantalla 0,85 y solo las anteriores 1,00; Z_ef del electrón de valencia crece algo al bajar (Li 1,3; Na 2,2; K 2,2), pero mucho menos que el aumento del tamaño.' },
  { id: 'E13', node: '7.10', title: 'Afinidad electrónica del Mn y el Zn', clase: 'Ejercicio 20: ordenar Zn, Mn, P, Cl, Rb por afinidad.', examen: 'Razona con la tendencia y menciona que Mn (3d⁵) y Zn (3d¹⁰) tienen subcapas estables.', rigor: 'Mn y Zn no forman aniones estables en fase gaseosa (AE ≤ 0). Datos: Rb 47, P 72, Cl 349 kJ/mol.' },
  { id: 'E23', node: '3.5', title: 'Intensidad de las líneas', clase: '«La intensidad de las líneas es proporcional al número de átomos».', examen: 'Más átomos → líneas más intensas (análisis cuantitativo).', rigor: 'Solo es aproximadamente proporcional en muestras poco densas y en las mismas condiciones; también influyen la probabilidad de cada transición, la temperatura y la autoabsorción.' },
  { id: 'E25', node: '2.4', title: '¿Cuántas α rebotan?', clase: 'Póster: «muy pocas (1/10 000 aprox.) se desviaban más de unos 10°».', examen: 'La mayoría pasa sin desviarse, muy pocas se desvían mucho y alguna rebota.', rigor: 'La fracción depende del espesor de la lámina y de la energía de las α. El dato histórico más citado (Geiger y Marsden, 1909) es ≈ 1 de cada 8 000 α reflejadas (> 90°) con lámina de platino. La Time Machine la calcula con la fórmula de Rutherford.' },
  { id: 'E26', node: '7.8', title: 'Por qué un catión es más pequeño', clase: 'Menos electrones → menos apantallamiento → mayor Z_ef → menor radio.', examen: 'Esa explicación es la esperada; añade que hay menos repulsión entre electrones.', rigor: 'En muchos cationes la razón principal es que pierden la capa externa completa (Na → Na⁺ pierde la capa n = 3).' },
  { id: 'E27', node: '3.3', title: 'La «estación de radio» de 200 nm', clase: 'Hoja, ej. 8: una estación de radio emite con λ = 200 nm.', examen: 'Calcula ν y E con los datos (1,5·10¹⁵ Hz; 9,94·10⁻¹⁹ J).', rigor: '200 nm es ultravioleta, no radio: las emisoras usan λ de metros (FM ≈ 3 m). El cálculo es el mismo, pero conviene notarlo.' },
  { id: 'E28', node: '7.3', title: 'ns² no siempre es el grupo 2', clase: 'Hoja, ej. 14c: configuración externa ns² → grupo 2.', examen: 'Grupo 2 (alcalinotérreos); primer elemento: berilio.', rigor: 'El helio (1s²) también termina en ns², pero es un gas noble (grupo 18): su única capa está completa.' },
  { id: 'E29', node: '7.8', title: 'El Ne en una serie de radios iónicos', clase: 'Hoja, ej. 19: ordenar N³⁻, O²⁻, F⁻, Ne, Na⁺, Mg²⁺ por radio.', examen: 'Ordena por Z: Mg²⁺ < Na⁺ < Ne < F⁻ < O²⁻ < N³⁻.', rigor: 'El Ne es un átomo neutro y su radio (de van der Waals) no se mide igual que los iónicos; la regla «más Z, menor radio» sí se aplica a la serie isoelectrónica.' },
];

/** Trucos y reglas mnemotécnicas por sección (clave: id de sección o apartado). */
export const TRICKS: Record<string, string[]> = {
  '1.1': ['«Z es el DNI del átomo»: si cambia Z, cambia el elemento. A y la carga no lo cambian.', 'Orden infalible en las tablas: Z → protones; A − Z → neutrones; Z − carga → electrones.'],
  '1.4': ['Carga negativa = electrones de MÁS: O²⁻ tiene 8 + 2 = 10. Carga positiva = electrones de MENOS: Al³⁺ tiene 13 − 3 = 10.', 'Truco del signo: «e⁻ = Z − q» funciona siempre si escribes q con su signo.'],
  '1.5': ['Cuenta electrones, no protones: N³⁻, O²⁻, F⁻, Ne, Na⁺, Mg²⁺ y Al³⁺ tienen todos 10.', 'En una serie isoelectrónica, el de MÁS protones es el MÁS pequeño: tira más de los mismos electrones.'],
  '2.4': ['Resume Rutherford en tres frases: «casi todas pasan → vacío; pocas se desvían → algo positivo; alguna rebota → núcleo pequeño y masivo».'],
  '3.1': ['Comprobación en 2 segundos: la media debe quedar más cerca del isótopo más abundante (Cl: 35,45, cerca de 35).', 'Problema inverso (abundancias): llama x a una y 100 − x a la otra; la ecuación es de primer grado.'],
  '3.2': ['λ y ν son como un balancín: λ·ν = c fijo. Si una sube, la otra baja en la misma proporción.', 'Prefijos que caen siempre: nm = 10⁻⁹ m, µm = 10⁻⁶ m, MHz = 10⁶ Hz, GHz = 10⁹ Hz, fs = 10⁻¹⁵ s.', 'Orden de magnitud del visible: λ ≈ 5·10⁻⁷ m, ν ≈ 6·10¹⁴ Hz, E ≈ 4·10⁻¹⁹ J ≈ 2,5 eV. Si te sale muy distinto, revisa las potencias.'],
  '3.3': ['Regla de memoria (de menor λ a mayor): «Gamma Xilofón Ultra Visible Infla Micro Radios» → γ, X, UV, visible, IR, microondas, radio.', 'En el visible: «el rojo es lento y largo» (λ grande, ν pequeña); el violeta, «corto y rápido».'],
  '3.4': ['E = h·c/λ: λ va DIVIDIENDO. Si te sale E ≈ 10⁻⁴⁰ J, has multiplicado por λ.', 'J → eV: divide entre 1,602·10⁻¹⁹ (salen números «normales», 1–15 eV). eV → J: multiplica.'],
  '3.6': ['R en cm⁻¹ (109 740) → multiplica por 100 para tenerla en m⁻¹ (1,0974·10⁷). Si tu λ sale 100 veces grande, es eso.', 'n₁ es SIEMPRE el pequeño (el de abajo) y n₂ el grande: así el paréntesis es positivo.'],
  '3.7': ['Series de abajo arriba: «Le Bailo Pasodobles Bien Pronto» → Lyman (1), Balmer (2), Paschen (3), Brackett (4), Pfund (5).', 'Lyman = ultravioleta, Balmer = visible (y UV cercano), las demás = infrarrojo.', 'k-ésima línea de una serie: n₂ = n₁ + k. Tercera de Balmer → 5 → 2.'],
  '3.7-inv': ['Cinco pasos cortos, cada uno comprobable, evitan casi todos los errores: 1/λ → ÷R → resta de 1/n₁² → invierte → raíz.', 'Si n₂ sale 4,98 o 7,99, el nivel es 5 u 8 (redondeo de datos). Si sale 5,5, hay un error de cálculo.', 'Para n₁ (te dan n₂): el término 1/n₂² pasa SUMANDO.'],
  '3.8': ['Líneas desde el nivel n: n(n − 1)/2. Desde 4 → 6; desde 5 → 10; desde 6 → 15.'],
  '4.1': ['Sube = absorbe energía; baja = emite un fotón. El fotón siempre tiene E positiva.'],
  '4.2': ['Energías del H para memorizar: −13,6 / −3,40 / −1,51 / −0,85 eV (n = 1, 2, 3, 4).'],
  '5.4': ['Valida en cascada: n ≥ 1 → l de 0 a n − 1 → m de −l a +l → s = ±½. Falla el primero que no cumpla.', 'Letras: s p d f = l 0 1 2 3 («Sin Pena De Falla»).', 'Truco de examen: no existe 1p, 2d ni 3f (l nunca llega a n).'],
  '5.5': ['Orbitales por subnivel: 1, 3, 5, 7 (impares). Electrones: 2, 6, 10, 14 (el doble).', 'Nivel n: n² orbitales y 2n² electrones (n = 3 → 9 y 18).'],
  '6.3': ['Möller: escribe la escalera s / p / d / f y lee en diagonal de arriba-derecha a abajo-izquierda.', 'Atajo n + l: menor suma, antes; empate → menor n primero. Por eso 4s (4 + 0) va antes que 3d (3 + 2).', 'Comprueba sumando los exponentes: deben dar el número de electrones.'],
  '6.4': ['Hund = «autobús»: nadie se sienta con otro mientras haya asientos libres.', 'Desapareados rápidos: p¹ 1, p² 2, p³ 3, p⁴ 2, p⁵ 1, p⁶ 0; d⁵ 5, d⁶ 4.'],
  '6.5': ['¿Hueco debajo y electrón arriba? → excitado. ¿Subnivel que no existe o con más electrones de los que caben? → imposible.'],
  '6.7': ['Excepciones del temario: Cr y Mo (d⁵ s¹), Cu, Ag y Au (d¹⁰ s¹). «Medio lleno o lleno» compensa.'],
  '6.8': ['Cationes de transición: los electrones salen primero del 4s (el de mayor n), no del 3d: Fe²⁺ = [Ar] 3d⁶.'],
  '7.2': ['Periodo = n más alto. Grupo: s → nº de electrones s; p → 12 + nº de electrones p; d → 2 + nº de electrones d.'],
  '7.5': ['Gana o pierde lo mínimo para ser gas noble: grupos 1, 2, 13 → +1, +2, +3; 15, 16, 17 → −3, −2, −1.'],
  '7.7': ['Radio: crece hacia ABAJO y hacia la IZQUIERDA. El más grande de la tabla está abajo a la izquierda (Cs, Fr).'],
  '7.9': ['EI, afinidad y electronegatividad van JUNTAS: crecen hacia arriba y a la derecha (hacia el F). El radio y el carácter metálico, al revés.', 'Excepciones que caen: Be > B, Mg > Al, N > O y P > S.'],
  '7.11': ['El más electronegativo es el F (3,98); luego O, N y Cl. Los menos, los alcalinos de abajo (Cs, Fr).'],
};

/** Estrategia general para cualquier problema numérico de examen. */
export const EXAM_STRATEGY: string[] = [
  'Lee el enunciado y subraya datos e incógnita. Escribe los datos con sus unidades.',
  'Pasa todo al SI ANTES de operar (nm → m, cm⁻¹ → m⁻¹, MHz → Hz).',
  'Escribe la fórmula general y despeja la incógnita con letras; sustituye al final.',
  'Opera con al menos 4 cifras en los resultados intermedios; redondea solo el resultado final.',
  'Comprueba el orden de magnitud y la unidad del resultado (¿tiene sentido?).',
  'Contesta con una frase si se pide razonar: «… porque …».',
];
