/**
 * ATOM 4.0 · Profundidad didáctica de la guía.
 *
 * Cada sección de la guía (clave: `id` o `node`) gana cuatro capas que la teoría básica no tenía:
 * - `why`: POR QUÉ es así (el mecanismo o la razón física, no solo la regla).
 * - `analogy`: una analogía y, siempre, DÓNDE DEJA DE FUNCIONAR (una analogía sin límites enseña errores).
 * - `exam`: cómo se pregunta en el examen.
 * - `doubts`: dudas que suelen aparecer, con su respuesta; `counter`: un contraejemplo o caso límite.
 *
 * Criterio de rigor: valores numéricos con su fuente habitual (CODATA, NIST) y redondeados como en clase.
 * Cuando algo es una simplificación del curso, se dice.
 */
export interface SectionDepth {
  why: string;
  analogy?: { text: string; limit: string };
  exam: string[];
  doubts: { q: string; a: string }[];
  counter?: string;
}

export const DEPTH: Record<string, SectionDepth> = {
  '1.1': {
    why: 'La química de un átomo la deciden sus electrones, y en un átomo neutro hay tantos electrones como protones. Por eso Z, el número de protones, basta para saber de qué elemento se trata. A, en cambio, solo cambia la masa.',
    analogy: { text: 'Z es como el DNI del elemento: lo identifica sin ambigüedad. A es como el peso de la persona: puede variar (isótopos) sin que cambie quién es.', limit: 'Un DNI es una etiqueta arbitraria; Z no: es una propiedad física (la carga del núcleo) que determina el comportamiento del átomo.' },
    exam: ['Completar la tabla Z, A, protones, neutrones y electrones de varias especies.', 'Escribir la notación ᴬ_Z X a partir de las partículas, o al revés.'],
    doubts: [
      { q: '¿Por qué la tabla periódica no da A?', a: 'Porque A depende del isótopo. La tabla da la masa atómica media de la mezcla natural de isótopos, que no es un número entero.' },
      { q: '¿Puede A ser menor que Z?', a: 'No: A = Z + N y N ≥ 0. Solo coinciden cuando no hay neutrones, como en el protio (¹H).' },
    ],
    counter: 'El protio, ¹₁H, tiene A = Z = 1 y ningún neutrón: es el único núcleo estable sin neutrones.',
  },
  '1.3': {
    why: 'Los isótopos tienen el mismo Z y, por tanto, los mismos electrones en la misma disposición. Como la química depende de los electrones, reaccionan casi igual. Los neutrones solo añaden masa y afectan a la estabilidad del núcleo.',
    exam: ['Decidir qué especies de una lista son isótopos entre sí.', 'Contar neutrones de varios isótopos del mismo elemento.', 'Enlazar con la masa atómica media (apartado 3.1).'],
    doubts: [
      { q: '¿Un isótopo radiactivo es otro elemento?', a: 'No mientras no se desintegre: el ¹⁴C es carbono. Al desintegrarse (β⁻) cambia Z y se convierte en ¹⁴N, que ya es otro elemento.' },
      { q: '¿¹⁴C y ¹⁴N son isótopos?', a: 'No: tienen el mismo A pero distinto Z. Son elementos diferentes (se llaman isóbaros).' },
    ],
    counter: '«Químicamente iguales» es una aproximación: el agua pesada (D₂O) hierve a unos 101,4 °C. El efecto de la masa es mayor cuanto más ligero es el átomo, y por eso se nota sobre todo en el hidrógeno.',
  },
  '1.4': {
    why: 'Las reacciones químicas ponen en juego energías de unos pocos electronvoltios, suficientes para mover electrones. Cambiar el núcleo exige millones de electronvoltios. Por eso un ion se forma ganando o perdiendo electrones, nunca protones.',
    exam: ['Calcular los electrones de un ion: e⁻ = Z − q.', 'Deducir la carga a partir de protones y electrones.', 'Escribir la notación completa de un ion.'],
    doubts: [
      { q: '¿Cambia A al formarse un ion?', a: 'No. A cuenta nucleones (protones y neutrones) y los electrones no están en el núcleo. Además, la masa del electrón es unas 1836 veces menor que la del protón.' },
      { q: '¿Por qué el sodio forma Na⁺ y no Na⁻?', a: 'Al perder su único electrón 3s queda con la configuración del neón. Arrancarlo cuesta poco (EI baja), mientras que añadir uno no lleva a una configuración especialmente estable.' },
    ],
    counter: 'El H⁺ es un caso límite: es un protón solo, sin ningún electrón. En agua no existe libre; se une a moléculas de agua (H₃O⁺).',
  },
  '1.5': {
    why: 'Las especies isoelectrónicas tienen el mismo número de electrones repartidos de la misma forma. La repulsión entre ellos y el apantallamiento son parecidos, así que lo único que cambia es la carga del núcleo: con más protones, la nube se contrae más y cuesta más arrancar un electrón.',
    exam: ['Ordenar por radio (o por energía de ionización) una serie como N³⁻, O²⁻, F⁻, Ne, Na⁺, Mg²⁺, Al³⁺.', 'Encontrar en una lista las especies isoelectrónicas con un gas noble.'],
    doubts: [{ q: '¿Mismo número de electrones implica siempre la misma configuración?', a: 'En los elementos representativos, sí. En los metales de transición no siempre: mira el contraejemplo.' }],
    counter: 'Ca y Ti²⁺ tienen 20 electrones cada uno, pero el Ca es [Ar] 4s² y el Ti²⁺ es [Ar] 3d². En los cationes de transición los electrones 3d quedan por debajo de los 4s.',
  },
  '1.6': {
    why: 'Toda la carga positiva y casi toda la masa están en el núcleo, de unos 10⁻¹⁵ m. Los electrones ocupan una región de unos 10⁻¹⁰ m. El átomo es casi todo «espacio vacío» en volumen, pero no en carga eléctrica: el campo eléctrico llena ese espacio.',
    analogy: { text: 'Si el núcleo fuera un guisante de 1 cm, el átomo sería una esfera de alrededor de 1 km: la proporción es de unas 100 000 veces.', limit: 'La esfera no tiene borde nítido y los electrones no son bolitas que orbitan: son una nube de probabilidad (bloque 5).' },
    exam: ['Comparar masas y cargas relativas de protón, neutrón y electrón.', 'Explicar dónde está cada partícula y por qué la masa del átomo es prácticamente la del núcleo.'],
    doubts: [{ q: 'Si el átomo está casi vacío, ¿por qué no atravesamos las paredes?', a: 'Porque las nubes electrónicas de los átomos se repelen eléctricamente y, además, el principio de exclusión de Pauli impide que los electrones de dos átomos ocupen el mismo estado. Lo que notamos como «tocar» es esa repulsión.' }],
  },
  '2.1': {
    why: 'Dalton necesitaba explicar dos leyes experimentales: los elementos se combinan en proporciones fijas (Proust) y, cuando forman varios compuestos, en proporciones de números enteros sencillos (proporciones múltiples). Si la materia está hecha de átomos que se unen enteros, esas leyes salen solas.',
    exam: ['Enunciar los postulados de Dalton.', 'Decir qué hechos posteriores los contradicen (electrón, radiactividad, isótopos).'],
    doubts: [{ q: '¿Se equivocó Dalton?', a: 'En parte. Su idea central, que la materia está hecha de átomos que se combinan en proporciones enteras, sigue siendo válida. Falla en que el átomo sea indivisible y en que todos los átomos de un elemento tengan la misma masa.' }],
    counter: 'Los isótopos contradicen directamente el postulado de que todos los átomos de un elemento son idénticos en masa: el ³⁵Cl y el ³⁷Cl son ambos cloro.',
  },
  '2.2': {
    why: 'El haz se desvía hacia la placa positiva, así que lleva carga negativa. Además, la relación carga/masa (e/m) sale igual sea cual sea el gas y el metal del cátodo. Por eso Thomson concluyó que esas partículas forman parte de todos los átomos.',
    exam: ['Describir el tubo de rayos catódicos y sus observaciones.', 'Relacionar cada observación con su conclusión (carga negativa, partícula con masa, universal).'],
    doubts: [{ q: '¿Thomson midió la carga del electrón?', a: 'No. Midió el cociente e/m, de unos 1,76·10¹¹ C/kg. La carga la midió Millikan con su experimento de la gota de aceite (1909), y con ella se obtuvo la masa.' }],
  },
  '2.3': {
    why: 'Si el átomo es neutro y contiene electrones negativos, en algún sitio tiene que haber carga positiva. Sin datos sobre dónde está, lo más sencillo era suponerla repartida por todo el átomo.',
    analogy: { text: 'Un bizcocho con pasas: la masa del bizcocho es la carga positiva y las pasas, los electrones.', limit: 'En el modelo de Thomson los electrones podían moverse dentro de la esfera, y la carga positiva no tenía masa apreciable: no es un sólido como el bizcocho.' },
    exam: ['Describir el modelo y dibujarlo.', 'Explicar qué experimento lo descarta y por qué.'],
    doubts: [{ q: '¿Por qué con este modelo las partículas α no deberían desviarse?', a: 'La carga positiva, repartida por todo el átomo, crea un campo débil, y los electrones son unas 7300 veces más ligeros que una α: no pueden frenarla, como una pelota de ping-pong no frena una bala.' }],
  },
  '2.4': {
    why: 'Solo un campo eléctrico muy intenso, creado por una carga positiva concentrada en un punto diminuto, puede hacer rebotar una partícula α. Y solo si ese punto tiene más masa que la α puede devolverla hacia atrás. Que casi todas pasen sin desviarse indica que ese punto ocupa una fracción minúscula del átomo.',
    exam: ['Asociar cada observación (la mayoría pasa, pocas se desvían, alguna rebota) con su conclusión.', 'Explicar por qué el resultado era incompatible con el modelo de Thomson.'],
    doubts: [{ q: '¿Por qué una lámina de oro?', a: 'El oro es muy maleable: se puede laminar hasta un espesor del orden de mil átomos, de modo que cada α atraviesa pocos átomos. Además, su núcleo es pesado (Z = 79), lo que hace muy visibles las desviaciones grandes.' }],
  },
  '2.5': {
    why: 'Si el núcleo atrae a los electrones, estos no pueden estar quietos: caerían. Rutherford los hizo girar para que la atracción eléctrica actuara como fuerza centrípeta, igual que la gravedad con los planetas.',
    exam: ['Describir el modelo nuclear.', 'Compararlo con el de Thomson: dónde está la carga positiva y dónde la masa.'],
    doubts: [{ q: '¿Descubrió Rutherford el neutrón?', a: 'No. Propuso su existencia hacia 1920 para explicar la masa de los núcleos, pero lo descubrió Chadwick en 1932.' }],
  },
  '2.6': {
    why: 'Según el electromagnetismo clásico, una carga acelerada emite radiación. Un electrón que gira está acelerado, así que perdería energía y caería en espiral al núcleo en una fracción de nanosegundo. Además, al caer emitiría todas las frecuencias, y el espectro sería continuo, no de líneas.',
    exam: ['Enunciar las dos limitaciones (estabilidad del núcleo y colapso del átomo).', 'Decir cómo se resolvió cada una (neutrón y fuerza nuclear fuerte; cuantización de Bohr).'],
    doubts: [{ q: '¿La gravedad mantiene unido el núcleo?', a: 'No. Entre dos protones, la repulsión eléctrica es unas 10³⁶ veces mayor que la atracción gravitatoria. Hace falta otra interacción, la nuclear fuerte, que solo actúa a distancias nucleares.' }],
  },
  '2.7': {
    why: 'Cada modelo se abandona cuando aparece un experimento que no puede explicar: el electrón refuta a Dalton, las partículas α a Thomson y los espectros de líneas a Rutherford. Así avanza la ciencia: los modelos son provisionales y se contrastan con experimentos.',
    exam: ['Ordenar los modelos cronológicamente.', 'Asociar cada modelo con el experimento que lo motivó y el que lo superó.'],
    doubts: [{ q: '¿El modelo actual es el definitivo?', a: 'Es el mejor disponible y describe con enorme precisión la química. Para efectos muy finos se usa una teoría aún más completa (la electrodinámica cuántica), pero eso no forma parte del curso.' }],
  },
  '3.1': {
    why: 'Una muestra de cualquier elemento contiene billones de átomos de varios isótopos en sus proporciones naturales. La masa que medimos es la media ponderada por esas proporciones, no la de ningún átomo concreto.',
    analogy: { text: 'Es como la nota media ponderada de una asignatura: cada examen (isótopo) cuenta según su peso (abundancia).', limit: 'Las abundancias no las elige nadie: vienen de la historia nuclear del material y pueden variar ligeramente según su origen.' },
    exam: ['Calcular la masa atómica media a partir de masas y abundancias.', 'Problema inverso: hallar las abundancias de dos isótopos conocida la masa media (x y 100 − x).'],
    doubts: [{ q: '¿Por qué en el problema inverso las abundancias son x y 100 − x?', a: 'Porque, si solo hay dos isótopos, sus porcentajes suman 100. Con tres isótopos haría falta un dato más.' }],
    counter: 'La masa media del cloro es 35,45 u, pero ningún átomo de cloro pesa 35,45 u: unos pesan unos 35 u (³⁵Cl) y otros, unos 37 u (³⁷Cl).',
  },
  '3.2': {
    why: 'En un periodo T la onda completa una oscilación y avanza exactamente una longitud de onda. Por tanto, v = λ/T = λ·ν. En el vacío, todas las ondas electromagnéticas viajan a c.',
    analogy: { text: 'Un tren de vagones iguales que pasa por un paso a nivel: la longitud de cada vagón es λ, los vagones que pasan por segundo son ν, y la velocidad del tren es su producto.', limit: 'En una onda no se desplaza nada material de un lugar a otro: lo que avanza es la perturbación y su energía.' },
    exam: ['Calcular ν a partir de λ (o al revés) convirtiendo bien las unidades (nm → m).', 'Relacionar periodo y frecuencia (T = 1/ν).'],
    doubts: [{ q: 'Cuando la luz pasa del aire al vidrio, ¿qué cambia: λ o ν?', a: 'La frecuencia se mantiene (la fija la fuente). Lo que disminuye es la velocidad, y con ella la longitud de onda.' }],
  },
  '3.3': {
    why: 'Todas las regiones del espectro son la misma radiación: solo cambia la frecuencia. Como la energía de cada fotón es E = h·ν, ordenar por frecuencia equivale a ordenar por energía, y es lo contrario de ordenar por longitud de onda.',
    exam: ['Ordenar regiones por λ, ν o energía.', 'Clasificar una longitud de onda dada (p. ej., 250 nm → ultravioleta).'],
    doubts: [{ q: 'Una luz roja muy intensa, ¿lleva fotones más energéticos que una luz ultravioleta débil?', a: 'No. La intensidad indica cuántos fotones llegan; la energía de cada fotón depende solo de la frecuencia. Cada fotón UV tiene más energía que cada fotón rojo.' }],
    counter: 'Un láser rojo muy potente no arranca electrones del zinc, y una lámpara ultravioleta débil sí: lo que cuenta es la energía de cada fotón (efecto fotoeléctrico).',
  },
  '3.4': {
    why: 'Planck (1900) supuso que la energía se intercambia en paquetes E = h·ν para explicar la radiación del cuerpo negro. Einstein (1905) mostró que la luz misma viaja en esos paquetes (fotones) y así explicó el efecto fotoeléctrico.',
    exam: ['Energía de un fotón en J y en eV.', 'Energía de un mol de fotones (multiplicando por N_A, en kJ/mol).', 'Número de fotones de una energía total dada.'],
    doubts: [{ q: '¿Hay un atajo para pasar de λ a energía?', a: 'Sí: h·c ≈ 1240 eV·nm, así que E(eV) ≈ 1240 / λ(nm). Por ejemplo, 620 nm → 2,0 eV. Sirve para comprobar el resultado, pero en el examen conviene mostrar el cálculo completo.' }],
  },
  '3.5': {
    why: 'Un átomo solo puede tener ciertas energías. Al bajar de un nivel a otro emite un fotón con exactamente esa diferencia de energía, y para subir absorbe un fotón con esa misma energía. Por eso las líneas de absorción aparecen en las mismas longitudes de onda que las de emisión.',
    exam: ['Distinguir los espectros de emisión, de absorción y continuo, y cómo se obtiene cada uno.', 'Identificar un elemento comparando sus líneas con las de una muestra.'],
    doubts: [{ q: '¿Por qué el hidrógeno frío solo absorbe en el ultravioleta (serie de Lyman)?', a: 'A temperatura ambiente casi todos sus átomos están en n = 1, así que solo pueden absorber subiendo desde n = 1, y esas líneas son de Lyman, en el UV. Para ver Balmer en absorción hacen falta átomos en n = 2, como en la atmósfera de estrellas calientes.' }],
  },
  '3.6': {
    why: 'Bohr dedujo que las energías del hidrógeno son E_n = −13,6 eV/n². La energía del fotón es la diferencia entre dos niveles, y al pasarla a 1/λ sale exactamente la ecuación que Rydberg había encontrado ajustando datos.',
    exam: ['Calcular λ de la línea de un salto concreto.', 'Identificar la serie y la región del espectro.', 'Calcular la energía de la transición.'],
    doubts: [
      { q: '¿Qué valor de R uso: 1,097·10⁷ m⁻¹ o 109 677 cm⁻¹?', a: 'Son el mismo valor en unidades distintas (1 m⁻¹ = 0,01 cm⁻¹). Usa el del enunciado y mantén las unidades coherentes: con R en m⁻¹, λ sale en metros.' },
      { q: '¿Qué nivel va en cada término?', a: 'n₁ es el nivel inferior y n₂ el superior (n₂ > n₁). Si te sale 1/λ negativo, los has intercambiado.' },
    ],
  },
  '3.7': {
    why: 'Todos los saltos que acaban en el mismo nivel inferior tienen energías parecidas, porque la mayor parte de la diferencia la marca ese nivel. Por eso caen en la misma región del espectro y forman una serie.',
    exam: ['Asociar cada serie con su nivel final y su región.', 'Calcular la primera línea o el límite de una serie (n₂ → ∞).'],
    doubts: [{ q: '¿La serie de Balmer está entera en el visible?', a: 'No. Solo cuatro líneas son visibles: Hα (656 nm), Hβ (486 nm), Hγ (434 nm) y Hδ (410 nm). Las demás y el límite de la serie (unos 365 nm) están en el ultravioleta cercano.' }],
  },
  '3.7-inv': {
    why: 'Despejar n dentro de la ecuación de Rydberg exige invertir, restar y sacar una raíz. Si se hace todo a la vez es fácil equivocarse. Por pasos, cada resultado intermedio se puede comprobar.',
    exam: ['Dada λ y la serie, hallar el nivel de partida.', 'Decidir si una λ puede pertenecer al hidrógeno.'],
    doubts: [{ q: '¿Y si me sale n₂ = 3,98?', a: 'Es el redondeo de los datos: n₂ = 4. Si sale muy lejos de un entero (p. ej., 3,5), algo falla: el n₁ elegido, las unidades de λ o el valor de R.' }],
  },
  '3.8': {
    why: 'Desde el nivel n, cada línea corresponde a una pareja de niveles distintos entre 1 y n. El número de parejas es n(n − 1)/2.',
    exam: ['Contar las líneas posibles desde un nivel.', 'Contar cuántas caen en una serie o región concreta.'],
    doubts: [{ q: '¿Un solo átomo emite todas esas líneas?', a: 'No. Cada átomo baja por un camino concreto (una cascada) y emite solo algunas líneas. En una muestra con muchísimos átomos aparecen todos los caminos posibles, y por eso se ven todas.' }],
  },
  '4.1': {
    why: 'Bohr no dedujo sus postulados: los impuso porque así salían los niveles discretos que explican el espectro de líneas del hidrógeno. Su mérito fue que, con ellos, calculó los valores numéricos correctos de las líneas.',
    exam: ['Enunciar los tres postulados.', 'Explicar cómo resuelven las limitaciones del modelo de Rutherford.'],
    doubts: [{ q: '¿Por qué no radia el electrón en una órbita estacionaria?', a: 'Bohr lo postuló sin justificarlo, en contra del electromagnetismo clásico. La explicación llegó con la mecánica cuántica: en un estado estacionario, la distribución de carga no cambia con el tiempo y no emite.' }],
  },
  '4.2': {
    why: 'Se toma como cero la energía del electrón libre (muy lejos y en reposo). Un electrón ligado tiene menos energía que libre, así que su energía es negativa. Liberarlo desde n = 1 cuesta 13,6 eV, que es la energía de ionización del hidrógeno.',
    exam: ['Calcular el radio de una órbita (r = 0,529 Å·n²) o la energía de un nivel (E = −13,6 eV/n²).', 'Energía necesaria para ionizar desde un nivel dado.'],
    doubts: [{ q: '¿Energía negativa significa «menos que nada»?', a: 'No: el cero se elige por convenio (el electrón libre). Solo tienen sentido físico las diferencias de energía, que son las que emite o absorbe el átomo.' }],
    counter: 'Los niveles se juntan al subir: de n = 1 a n = 2 hay 10,2 eV, pero de n = 5 a n = 6 solo unos 0,17 eV.',
  },
  '4.3': {
    why: 'Como los niveles son discretos, también lo son sus diferencias. Cada línea del espectro es la huella de una de esas diferencias.',
    exam: ['Asociar una línea con su salto.', 'Calcular la energía de un salto y la λ del fotón.'],
    doubts: [{ q: '¿Saltar más niveles da siempre un fotón más energético?', a: 'No si los saltos acaban en niveles distintos: mira el contraejemplo. Solo es cierto comparando saltos que terminan en el mismo nivel.' }],
    counter: 'El salto 2 → 1 (un nivel) emite 10,2 eV, y el salto 5 → 2 (tres niveles) solo 2,86 eV. Lo que importa es la diferencia de energía, no cuántos niveles se saltan.',
  },
  '4.4': {
    why: 'Con espectroscopios mejores, algunas líneas resultaron ser varias muy juntas, y en un campo magnético se separaban aún más. Cada nuevo detalle exigió un número cuántico nuevo, hasta que la mecánica cuántica los explicó todos juntos.',
    exam: ['Asociar cada corrección con su número cuántico (Sommerfeld → l; Zeeman → m; espín → s).'],
    doubts: [{ q: '¿Por qué el modelo de Bohr falla con átomos de varios electrones?', a: 'Porque no tiene en cuenta la repulsión entre electrones. Solo funciona bien en especies con un único electrón, como H, He⁺ o Li²⁺.' }],
  },
  '5.1': {
    why: 'Si la luz, que es una onda, se comporta también como partícula (fotones), De Broglie propuso que la materia podía comportarse también como onda, con λ = h/(m·v). Se confirmó en 1927 al observar difracción de electrones (Davisson y Germer).',
    exam: ['Calcular la longitud de onda de De Broglie de un electrón o de un objeto.', 'Explicar por qué no observamos el comportamiento ondulatorio de objetos cotidianos.'],
    doubts: [{ q: '¿Una pelota de tenis es una onda?', a: 'Formalmente tiene λ = h/(m·v), pero con 0,06 kg y 50 m/s sale unos 2·10⁻³⁴ m, muchísimo menor que cualquier rendija o átomo: el efecto ondulatorio es inobservable. En un electrón, λ es comparable al tamaño de un átomo.' }],
  },
  '5.2': {
    why: 'Para un electrón descrito como onda, una posición muy definida exige combinar muchas longitudes de onda, y por tanto muchos momentos distintos. Precisar uno desdibuja el otro: Δx·Δp ≥ h/4π.',
    exam: ['Enunciar el principio.', 'Explicar por qué hace imposible hablar de órbitas con trayectoria definida.'],
    doubts: [{ q: '¿Es un problema de los instrumentos de medida?', a: 'No. Es una propiedad de la naturaleza: ni con instrumentos perfectos se podrían conocer a la vez posición y momento con precisión ilimitada.' }],
  },
  '5.3': {
    why: 'Si no se puede conocer a la vez posición y velocidad, no tiene sentido hablar de una trayectoria. Solo se puede dar la probabilidad de encontrar al electrón en cada región, y eso es lo que describe un orbital.',
    analogy: { text: 'Una foto de larga exposición de un ventilador en marcha muestra un disco borroso, más denso donde las aspas pasan más tiempo. El orbital se parece a esa nube.', limit: 'Las aspas sí tienen trayectoria y la foto solo la emborrona. El electrón no tiene trayectoria: la nube no es un movimiento promediado, es la descripción completa.' },
    exam: ['Diferenciar órbita y orbital.', 'Explicar qué representa el dibujo de un orbital.'],
    doubts: [{ q: '¿El dibujo del orbital marca dónde está el electrón?', a: 'Marca la región donde hay una probabilidad alta (normalmente el 90 %) de encontrarlo. Fuera del dibujo la probabilidad es pequeña, pero no nula.' }],
  },
  '5.4': {
    why: 'Al resolver la ecuación de Schrödinger del átomo, solo algunas soluciones son físicamente aceptables, y quedan etiquetadas por números enteros (n, l, m) con restricciones entre ellos. El espín (s) es una propiedad intrínseca del electrón que no sale de esa ecuación.',
    exam: ['Decidir si una combinación (n, l, m, s) es válida.', 'Dar los cuatro números cuánticos de un electrón concreto (p. ej., el último del O).'],
    doubts: [{ q: '¿Por qué l tiene que ser menor que n?', a: 'Sale de la resolución matemática: con n dado, solo existen soluciones con l = 0, 1, …, n − 1. Para el curso, basta con aplicar la regla.' }],
    counter: '(2, 2, 0, +½) no es válida: con n = 2, l solo puede valer 0 o 1.',
  },
  '5.5': {
    why: 'Cada valor de m es un orbital distinto y hay 2l + 1 valores posibles. En cada orbital caben dos electrones (espín +½ y −½). Sumando para todos los l de un nivel salen n² orbitales y 2n² electrones.',
    exam: ['Calcular el número de orbitales o de electrones de un nivel o subnivel.'],
    doubts: [{ q: '¿Hay algún átomo real con 32 electrones en el nivel 4?', a: 'Sí: a partir del iterbio (Z = 70) la capa 4 está completa (4s² 4p⁶ 4d¹⁰ 4f¹⁴).' }],
  },
  '5.6': {
    why: 'Un estado cuántico es una combinación concreta de los cuatro números. Por el principio de exclusión, cada estado admite un único electrón, así que contar estados es contar la capacidad.',
    exam: ['Contar los estados posibles con unas condiciones (p. ej., n = 3 y m = 0).'],
    doubts: [{ q: '¿Estado cuántico y orbital es lo mismo?', a: 'No: un orbital queda fijado por (n, l, m) y admite dos estados, uno con cada espín.' }],
  },
  '6.1': {
    why: 'La notación nxᵉ resume en poco espacio cuántos electrones hay en cada subnivel. El diagrama de cajas añade lo que la notación no muestra: cómo se reparten en los orbitales y con qué espín.',
    exam: ['Escribir configuraciones y diagramas de cajas.', 'Contar electrones desapareados a partir del diagrama.'],
    doubts: [{ q: '¿3p⁴ son cuatro orbitales?', a: 'No: son 4 electrones repartidos en los 3 orbitales del subnivel 3p (dos apareados en uno y uno en cada uno de los otros dos).' }],
  },
  '6.2': {
    why: 'Dos electrones en el mismo orbital ya comparten n, l y m, así que solo pueden diferenciarse en el espín, que tiene dos valores. Por eso caben como máximo dos electrones por orbital, con espines opuestos.',
    analogy: { text: 'Cada orbital es una butaca doble con un asiento «arriba» y otro «abajo»: no se pueden sentar dos personas en el mismo asiento.', limit: 'El espín no es un sitio ni un giro real del electrón: es una propiedad cuántica sin equivalente clásico exacto.' },
    exam: ['Decidir si un diagrama de cajas cumple Pauli.', 'Explicar por qué un subnivel p admite 6 electrones.'],
    doubts: [{ q: '¿Pauli dice que los espines deben ser opuestos «por preferencia»?', a: 'No es una preferencia, es una prohibición: dentro de un orbital, dos espines iguales darían dos electrones con los cuatro números cuánticos idénticos.' }],
  },
  '6.3': {
    why: 'En un átomo con varios electrones, la energía de un subnivel depende de n y de l. Los orbitales con l pequeño penetran más cerca del núcleo, quedan menos apantallados y bajan de energía. Por eso el 4s (n + l = 4) se llena antes que el 3d (n + l = 5).',
    exam: ['Escribir la configuración de un elemento siguiendo el diagrama de Möller.', 'Deducir Z, el periodo o el grupo a partir de una configuración.'],
    doubts: [{ q: 'Si el 4s se llena antes que el 3d, ¿por qué los cationes de transición pierden primero el 4s?', a: 'Porque, una vez ocupados los 3d, el 4s queda por encima en energía y además es el más externo (mayor n). El orden de llenado no es lo mismo que el orden de energías en el átomo ya formado.' }],
  },
  '6.4': {
    why: 'Dos electrones en orbitales distintos están más separados y se repelen menos que en el mismo orbital. Además, con espines paralelos la energía baja algo más (energía de intercambio). Por eso primero se ocupan los orbitales de uno en uno.',
    analogy: { text: 'En un autobús vacío la gente ocupa primero un asiento doble cada uno, y solo se sienta al lado de alguien cuando no quedan asientos dobles libres.', limit: 'La analogía explica el «primero separados», pero no por qué los espines son paralelos: eso es un efecto cuántico sin equivalente cotidiano.' },
    exam: ['Dibujar el diagrama de cajas de un subnivel parcialmente lleno.', 'Contar electrones desapareados (paramagnetismo).'],
    doubts: [{ q: '¿Hund se aplica entre subniveles distintos?', a: 'No: solo dentro de un mismo subnivel, entre orbitales de igual energía (los tres 2p, los cinco 3d…).' }],
  },
  '6.5': {
    why: 'Un estado excitado es posible: el átomo ha absorbido energía y un electrón ocupa un subnivel superior. Uno prohibido viola Pauli (más electrones de los que caben), y uno imposible usa subniveles que no existen (como 2d).',
    exam: ['Clasificar configuraciones como fundamental, excitada, prohibida o imposible, justificándolo.'],
    doubts: [{ q: '¿Excitado significa imposible?', a: 'No. Un estado excitado existe, aunque dura poco: el átomo vuelve al fundamental emitiendo luz (bloque 3).' }],
    counter: '1s² 2s² 2p⁶ 3s¹ 3p¹ es magnesio excitado, no un elemento distinto: tiene los 12 electrones del Mg.',
  },
  '6.6': {
    why: 'Las capas completas del gas noble anterior apenas intervienen en la química. Abreviarlas destaca lo que importa: los electrones de valencia.',
    exam: ['Escribir configuraciones abreviadas.', 'Pasar de abreviada a completa.'],
    doubts: [{ q: '¿Qué gas noble pongo entre corchetes?', a: 'El gas noble del periodo anterior, es decir, el último cuyo Z es menor que el del elemento: para el Fe (Z = 26), el Ar (Z = 18).' }],
  },
  '6.7': {
    why: 'En el Cr y en el Cu, los subniveles 4s y 3d tienen energías muy parecidas. Pasar un electrón del 4s al 3d da un subnivel d semilleno o lleno, configuraciones especialmente estables por la energía de intercambio, y el balance sale a favor.',
    exam: ['Escribir correctamente las configuraciones del Cr y del Cu (y de sus iones).'],
    doubts: [{ q: '¿Hay que memorizar todas las excepciones?', a: 'En este curso, las del Cr, Cu y, si te las piden, Mo, Ag y Au. Existen otras (sobre todo en el bloque d del periodo 5 y en el bloque f), pero no se deducen con reglas sencillas.' }],
  },
  '6.8': {
    why: 'Al ionizar un átomo se arrancan los electrones más externos, los de mayor n, que son los menos atraídos. En los metales de transición son los 4s, aunque se hayan llenado antes que los 3d.',
    exam: ['Configuración de un catión de transición (Fe²⁺, Fe³⁺, Cu⁺…) y de aniones (O²⁻, Cl⁻).'],
    doubts: [{ q: '¿Por qué el Fe³⁺ es más estable que el Fe²⁺ en muchos compuestos?', a: 'Una razón es que el Fe³⁺, [Ar] 3d⁵, tiene el subnivel d semilleno. Pero no es la única: también influyen el entorno y el disolvente.' }],
    counter: 'Fe²⁺ es [Ar] 3d⁶ y no [Ar] 4s² 3d⁴: salen primero los dos electrones 4s.',
  },
  '6.9': {
    why: 'Los electrones más externos son los menos atraídos por el núcleo y los primeros en interactuar con otros átomos. Por eso deciden cómo se enlaza y reacciona el elemento.',
    exam: ['Contar los electrones de valencia y relacionarlos con el grupo.'],
    doubts: [{ q: 'En los metales de transición, ¿cuentan los 3d como electrones de valencia?', a: 'En química se suelen considerar parte de la valencia (ns + (n−1)d). En este curso, la definición operativa es «los de la capa de mayor n», así que sigue la que use tu profesor y dilo explícitamente.' }],
  },
  '7.1': {
    why: 'Al aumentar Z, las configuraciones de valencia se repiten cada cierto número de elementos. Como la química depende de la valencia, también se repiten las propiedades: esa es la periodicidad que Mendeléiev encontró empíricamente.',
    exam: ['Situar un elemento (periodo y grupo) a partir de su configuración, y al revés.'],
    doubts: [{ q: '¿Mendeléiev ordenó por Z?', a: 'No: ordenó por masa atómica, y en algunos casos alteró ese orden para respetar las propiedades (Te y I). La ordenación por Z llegó con Moseley (1913) y justificó esos cambios.' }],
  },
  '7.3': {
    why: 'El bloque indica qué tipo de subnivel se está llenando, y eso decide la forma de la tabla: 2 columnas para s, 6 para p, 10 para d y 14 para f.',
    exam: ['Indicar el bloque de un elemento a partir de su configuración.'],
    doubts: [{ q: '¿Por qué el He está en el grupo 18 si es 1s²?', a: 'Por sus propiedades: es un gas noble, con la capa completa. Por configuración sería del bloque s, y la tabla prioriza el comportamiento químico.' }],
  },
  '7.4': {
    why: 'Los elementos de una misma familia tienen la misma configuración de valencia y, por tanto, comportamientos químicos parecidos: todos los alcalinos forman cationes +1 y reaccionan con el agua.',
    exam: ['Nombrar la familia de un elemento.', 'Relacionar la familia con su configuración de valencia.'],
    doubts: [{ q: '¿El hidrógeno es un alcalino?', a: 'No, aunque se coloque en el grupo 1 por su configuración 1s¹. Es un no metal: forma moléculas H₂ y enlaces covalentes.' }],
  },
  '7.5': {
    why: 'Los elementos representativos ganan o pierden los pocos electrones que los separan de la configuración de un gas noble, que es especialmente estable.',
    exam: ['Predecir el ion estable de un elemento representativo y escribir su configuración.'],
    doubts: [{ q: '¿Por qué el grupo 14 no tiene un ion estable típico?', a: 'Necesitaría ganar o perder 4 electrones, lo que cuesta demasiado energía. Por eso el C suele formar enlaces covalentes.' }],
    counter: 'Los metales de transición forman varios iones (Fe²⁺ y Fe³⁺, Cu⁺ y Cu²⁺): la regla del gas noble solo vale para los representativos.',
  },
  '7.6': {
    why: 'En un periodo se añaden protones, y también electrones a la misma capa. Los electrones de una misma capa se apantallan mal entre sí, así que la carga efectiva crece. En un grupo, cada capa nueva queda apantallada por todas las anteriores.',
    analogy: { text: 'Es como intentar oír a alguien en una sala: cuanta más gente se interpone (electrones internos), menos te llega su voz (la atracción del núcleo).', limit: 'Los electrones no son una pantalla opaca y los de la misma capa también se apantallan algo entre sí. Una estimación cuantitativa usa reglas como las de Slater.' },
    exam: ['Explicar la variación de una propiedad periódica usando la carga nuclear efectiva.'],
    doubts: [{ q: '¿Z_ef = Z − electrones internos?', a: 'Es una primera estimación grosera (Na: 11 − 10 = 1). Con las reglas de Slater sale unos 2,2, porque el apantallamiento no es perfecto. Para razonar tendencias basta la idea cualitativa.' }],
  },
  '7.7': {
    why: 'Hacia la derecha, los electrones entran en la misma capa mientras la carga efectiva crece, así que la nube se contrae. Hacia abajo, cada periodo añade una capa más externa, y eso pesa más que el aumento de carga.',
    exam: ['Ordenar elementos por radio y justificarlo con capas y carga efectiva.'],
    doubts: [{ q: '¿Por qué hay un salto grande de radio al empezar cada periodo?', a: 'Porque el primer elemento de cada periodo estrena una capa nueva, mucho más externa, con un solo electrón muy apantallado: con radios covalentes del mismo tipo, del Ne (unos 58 pm) se pasa al Na (unos 166 pm), casi el triple.' }],
  },
  '7.8': {
    why: 'Un catión pierde electrones (a veces una capa entera) y los que quedan sienten más carga nuclear. Un anión gana electrones, aumenta la repulsión entre ellos y la nube se expande.',
    exam: ['Comparar el radio de un ion con el de su átomo.', 'Ordenar una serie isoelectrónica.'],
    doubts: [{ q: '¿El Na⁺ es más pequeño que el Ne aunque tengan los mismos electrones?', a: 'Sí: con los mismos 10 electrones, el Na⁺ tiene 11 protones y el Ne, 10. Más carga nuclear, nube más contraída.' }],
  },
  '7.9': {
    why: 'Cuanto más cerca del núcleo está el electrón (átomo pequeño) y más carga efectiva siente, más energía cuesta arrancarlo.',
    exam: ['Ordenar elementos por EI y justificarlo.', 'Interpretar energías de ionización sucesivas para deducir el grupo.'],
    doubts: [{ q: '¿Por qué las energías de ionización sucesivas dan saltos?', a: 'Porque, al vaciar la capa de valencia, el siguiente electrón sale de una capa interna, mucho más atraída. En el Mg: EI₁ ≈ 738, EI₂ ≈ 1451 y EI₃ ≈ 7733 kJ/mol. El salto tras la segunda indica 2 electrones de valencia.' }],
  },
  '7.10': {
    why: 'Un átomo pequeño y con mucha carga efectiva atrae con fuerza al electrón que entra, y se libera más energía. Si el electrón tiene que entrar en una capa nueva o en un subnivel desfavorable, el anión no es estable.',
    exam: ['Comparar afinidades electrónicas y justificar las excepciones más conocidas.'],
    doubts: [{ q: '¿La afinidad electrónica es positiva o negativa?', a: 'Depende del convenio. Si se define como energía liberada, es positiva para el Cl (unos 349 kJ/mol). Si se expresa como variación de energía del proceso, ΔE = −349 kJ/mol. Usa el convenio de tus apuntes y no los mezcles.' }],
  },
  '7.11': {
    why: 'La electronegatividad combina la tendencia a retener los propios electrones (EI) y a captar otros (AE). Por eso sigue la misma tendencia que ambas.',
    exam: ['Ordenar por electronegatividad.', 'Predecir la polaridad de un enlace por la diferencia de electronegatividades.'],
    doubts: [{ q: '¿Por qué no se dan electronegatividades de los gases nobles?', a: 'Porque casi no forman enlaces, y la electronegatividad se define en un enlace. Al Kr y al Xe, que sí forman algunos compuestos, a veces se les asigna un valor.' }],
  },
  '7.12': {
    why: 'Un metal pierde con facilidad sus electrones de valencia (EI baja), y eso explica su conductividad, su brillo y su tendencia a formar cationes. Un no metal los retiene y tiende a captar otros.',
    exam: ['Ordenar por carácter metálico.', 'Relacionar el carácter metálico con EI, AE y electronegatividad.'],
    doubts: [{ q: '¿Hay una frontera nítida entre metales y no metales?', a: 'No: los semimetales (B, Si, Ge, As, Sb, Te) tienen propiedades intermedias. Por ejemplo, el silicio es semiconductor.' }],
  },
  '7.13': {
    why: 'Las excepciones salen de la estructura de subniveles. Un electrón np¹ está algo más alto en energía y más apantallado que uno ns² (Be > B). En el O, el cuarto electrón 2p comparte orbital y sufre una repulsión extra (N > O). El F es tan pequeño que el electrón que entra se repele mucho con los demás (Cl > F en afinidad).',
    exam: ['Justificar Be > B, N > O y Cl > F con la configuración, no solo enunciarlas.'],
    doubts: [{ q: '¿Contradicen las excepciones la tendencia general?', a: 'No: la tendencia es global y las excepciones son pequeñas y locales. Además, se explican con el mismo modelo (subniveles, apareamiento y tamaño).' }],
    counter: 'Afinidad electrónica: Cl ≈ 349 kJ/mol frente a F ≈ 328 kJ/mol, aunque el F esté más arriba en el grupo.',
  },
};
