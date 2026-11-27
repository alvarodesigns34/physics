/**
 * ATOM 5.1 · Resoluciones específicas para las familias que aún usaban la plantilla genérica.
 *
 * Cada familia aporta lo que una plantilla no puede saber: CÓMO reconocer el método (qué pista del
 * enunciado lo delata), el PRINCIPIO que se aplica y su razón física, una COMPROBACIÓN de coherencia propia
 * del tipo de problema y los ERRORES que de verdad se cometen en él. Los pasos se construyen con los datos
 * y respuestas del propio ejercicio (nunca se copian a mano), y cada uno dice por qué se hace.
 */
import type { Exercise, ResolutionStep } from './types';

interface FamilyGuide {
  /** Cómo saber que este es el método */
  method: string;
  principle: string;
  math?: string;
  why: string;
  check: string;
  errors: string;
}

const G: Record<string, FamilyGuide> = {
  'nucleo-especie': {
    method: 'Te dan (o piden) Z, A, N, electrones o carga de una especie: es un problema de recuento de partículas. Tres relaciones bastan para todo.',
    principle: 'Z fija el elemento y es el número de protones. El número másico cuenta nucleones. Los electrones salen de restar la carga a Z.',
    math: 'A = Z + N \\qquad e^- = Z - q',
    why: 'La carga neta es (protones − electrones) porque cada protón aporta +1 y cada electrón −1; los neutrones no aportan carga.',
    check: 'A ≥ Z siempre, porque N no puede ser negativo; la igualdad A = Z solo se da en el protio, ¹H (N = 0), que cumple la regla, no es una excepción. Un catión tiene menos electrones que protones y un anión, más. Si te sale un número negativo de partículas, has restado al revés.',
    errors: 'Sumar la carga en lugar de restarla (e⁻ = Z + q), confundir A con la masa atómica de la tabla (A es entero) y cambiar Z al formar un ion: un ion conserva sus protones.',
  },
  isotopos: {
    method: 'Varias especies del mismo elemento con distinto A: compáralas fijándote en qué cambia y qué no.',
    principle: 'Isótopos: mismo Z (mismo elemento) y distinto número de neutrones, por tanto distinto A.',
    math: 'N = A - Z',
    why: 'Las propiedades químicas dependen de los electrones, que en los átomos neutros de dos isótopos son los mismos; solo cambia la masa del núcleo.',
    check: 'Todos los isótopos de un elemento comparten Z y número de electrones (si son neutros); si dos especies tienen distinto Z, no son isótopos aunque tengan el mismo A (eso son isóbaros).',
    errors: 'Llamar isótopos a especies con el mismo A, pensar que un isótopo tiene distinta química, o que el más abundante es «el elemento» y los otros «impurezas».',
  },
  isoelectronicas: {
    method: 'Te preguntan qué especies tienen «los mismos electrones»: calcula e⁻ = Z − q de cada una y compara.',
    principle: 'Isoelectrónicas: mismo número de electrones, distinto Z.',
    math: 'e^- = Z - q',
    why: 'Con los mismos electrones, lo que distingue a las especies es la carga del núcleo; por eso ordenar por tamaño o por energía de ionización se reduce a ordenar por Z.',
    check: 'Si la especie de referencia es un gas noble o un ion con su configuración, todas las isoelectrónicas representativas comparten esa configuración; en metales de transición puede diferir (Ca y Ti²⁺).',
    errors: 'Sumar la carga (Na⁺ tendría 12 e⁻), mirar el número másico en lugar de Z, o elegir especies del mismo elemento (esas son iones del elemento, no isoelectrónicas).',
  },
  particulas: {
    method: 'Pregunta por carga, masa o localización de protones, neutrones y electrones: es memoria razonada de la tabla de partículas.',
    principle: 'Protón: +1, ≈ 1 u, en el núcleo. Neutrón: 0, ≈ 1 u, en el núcleo. Electrón: −1, ≈ 1/1836 u, en la corteza.',
    math: 'm_p \\approx m_n \\approx 1836\\, m_e',
    why: 'Casi toda la masa del átomo está en el núcleo porque protones y neutrones pesan unas 1836 veces más que un electrón; por eso A (nucleones) da la masa aproximada en u.',
    check: 'La carga del protón y la del electrón son iguales y opuestas (1,602·10⁻¹⁹ C), aunque sus masas son muy distintas.',
    errors: 'Decir que el neutrón tiene carga negativa, que el electrón está en el núcleo o que protón y electrón tienen la misma masa.',
  },
  'ordenar-energia': {
    method: 'Ordenar radiaciones por energía: pásalas todas a una misma magnitud (λ o ν) y usa E = h·ν = hc/λ.',
    principle: 'La energía del fotón crece con la frecuencia y decrece con la longitud de onda.',
    math: 'E = h\\nu = \\frac{hc}{\\lambda}',
    why: 'Cada fotón lleva un cuanto de energía proporcional a su frecuencia (Planck); la intensidad de la luz cambia el número de fotones, no su energía.',
    check: 'Orden de las regiones de más a menos energía: γ > X > UV > visible (violeta > rojo) > IR > microondas > radio.',
    errors: 'Comparar longitudes de onda en unidades distintas sin convertir, pensar que más λ es más energía, o confundir intensidad con energía por fotón.',
  },
  'cuanticos-validez': {
    method: 'Te dan un cuarteto (n, l, m, s) y preguntan si es posible: comprueba las reglas de una en una, en orden.',
    principle: 'n = 1, 2, 3…; l = 0 … n − 1; m = −l … +l; s = ±½.',
    math: 'n \\ge 1 \\quad 0 \\le l \\le n-1 \\quad |m| \\le l \\quad s = \\pm\\frac{1}{2}',
    why: 'Cada número cuántico acota al siguiente: n limita las formas posibles (l) y l limita las orientaciones (m). El espín es independiente.',
    check: 'Basta con que falle UNA regla para que el conjunto sea imposible. Que un orbital no esté ocupado en el estado fundamental (p. ej., 7h) no lo hace imposible.',
    errors: 'Permitir l = n, olvidar los valores negativos de m, dar a s valores como 1 o 0, o rechazar combinaciones válidas porque «ningún átomo las usa».',
  },
  'orbitales-recuento': {
    method: 'Pregunta cuántos orbitales o electrones caben en un subnivel o un nivel: son dos fórmulas de recuento.',
    principle: 'Un subnivel l tiene 2l + 1 orbitales; un nivel n tiene n² orbitales; cada orbital admite 2 electrones (Pauli).',
    math: '2l + 1 \\qquad n^2 \\qquad 2n^2',
    why: 'm toma 2l + 1 valores (de −l a +l), y cada orbital admite dos electrones con espines opuestos. Sumando todos los subniveles de un nivel sale n².',
    check: 'Capacidades de los subniveles: s 2, p 6, d 10, f 14. Del nivel: 2, 8, 18, 32…',
    errors: 'Confundir orbitales con electrones (multiplicar o no por 2), o contar en el nivel n subniveles que no existen (no hay 2d).',
  },
  configuracion: {
    method: 'Escribir la configuración de un átomo neutro: cuenta los electrones (= Z) y reparte siguiendo el diagrama de Möller.',
    principle: 'Aufbau: se ocupa primero el subnivel de menor n + l (a igualdad, el de menor n); Pauli limita a 2 e⁻ por orbital; Hund reparte desapareados en los orbitales de igual energía.',
    why: 'El estado fundamental es el de mínima energía; la regla n + l resume el orden real de energías de los subniveles en átomos neutros.',
    check: 'La suma de superíndices debe ser Z. El último subnivel te dice el bloque; el n mayor, el periodo. Cr y Cu (y Mo, Ag, Au) son excepciones al llenado.',
    errors: 'Llenar 3d antes de 4s, pasarse de capacidad (p⁷, d¹¹), olvidar las excepciones Cr (3d⁵4s¹) y Cu (3d¹⁰4s¹), o abreviar con un gas noble que no corresponde.',
  },
  'configuracion-ion': {
    method: 'Configuración de un ion: escribe primero la del átomo neutro y después quita o añade electrones.',
    principle: 'Los aniones añaden electrones al último subnivel. Los cationes los pierden de la capa más externa (mayor n): en los metales de transición se pierden antes los ns que los (n−1)d.',
    why: 'Cuando el átomo ya tiene electrones d, el 4s queda por encima del 3d en energía, así que es el primero en salir; por eso el Fe²⁺ es [Ar]3d⁶, no [Ar]3d⁴4s².',
    check: 'Los iones representativos estables suelen acabar con configuración de gas noble; los de transición conservan electrones d.',
    errors: 'Quitar los electrones 3d antes que los 4s en un catión de transición, o cambiar Z al formar el ion.',
  },
  'estado-configuracion': {
    method: 'Te dan una configuración y preguntan si es fundamental, excitada o prohibida: compruébala contra tres reglas.',
    principle: 'Prohibida: viola Pauli o usa un subnivel inexistente (2d, 1p). Excitada: respeta Pauli pero deja un hueco por debajo de un electrón. Fundamental: sigue el orden de Möller sin huecos.',
    why: 'Pauli y la existencia de los subniveles son leyes; el orden de llenado solo describe el estado de mínima energía, así que saltárselo da un estado posible pero excitado.',
    check: 'Cuenta los electrones: si no coinciden con los del átomo que se pide, ni siquiera es el mismo átomo o ion.',
    errors: 'Llamar prohibido a un estado excitado (es posible, solo que no es el de menor energía) o aceptar subniveles como 2d.',
  },
  historia: {
    method: 'Pregunta sobre un modelo o experimento histórico: identifica qué hecho experimental obligó a cambiar el modelo anterior.',
    principle: 'Cada modelo explica lo que se sabía y cae ante un experimento nuevo: el electrón (Thomson), la dispersión α (Rutherford), los espectros de líneas (Bohr).',
    why: 'Los modelos científicos son provisionales: se mantienen mientras explican los experimentos y se sustituyen cuando aparece uno que no explican.',
    check: 'Fechas de control: Thomson 1897 (electrón) y 1904 (modelo), Geiger–Marsden 1909–1911, Bohr 1913, Chadwick 1932 (neutrón).',
    errors: 'Atribuir el neutrón a Rutherford, decir que Thomson descubrió el núcleo, o que el modelo de Bohr explica átomos con varios electrones.',
  },
  'cuantica-conceptos': {
    method: 'Pregunta conceptual del modelo actual: distingue lo que describe una órbita (trayectoria) de lo que describe un orbital (probabilidad).',
    principle: 'Dualidad onda-partícula (De Broglie) e incertidumbre (Heisenberg) impiden hablar de trayectorias: un orbital es la región donde es más probable encontrar al electrón.',
    math: '\\Delta x\\,\\Delta p \\ge \\frac{\\hbar}{2}',
    why: 'Si posición y velocidad no se pueden conocer a la vez, no tiene sentido dibujar un camino; solo se puede dar la probabilidad de cada región.',
    check: 'Los números cuánticos n, l y m describen un orbital; el cuarto, s, el electrón.',
    errors: 'Decir que el electrón «gira» dentro del orbital, que la incertidumbre es un defecto de los instrumentos, o confundir órbita con orbital.',
  },
  'tendencia-ordenar': {
    method: 'Ordenar elementos por una propiedad periódica: sitúalos en la tabla (periodo y grupo) y aplica la tendencia de esa propiedad; luego revisa las excepciones.',
    principle: 'En un periodo, de izquierda a derecha, Z_ef aumenta: el radio disminuye y la EI, la AE y la electronegatividad aumentan. En un grupo, hacia abajo, aumenta n: el radio aumenta y las demás disminuyen.',
    why: 'Todo nace de dos efectos: la carga nuclear efectiva (que tira de los electrones externos) y la distancia (el número de capas).',
    check: 'Excepciones de EI de examen: Be > B y N > O (subnivel lleno o semilleno). En AE, Cl > F.',
    errors: 'Aplicar la tendencia del grupo al periodo, olvidar las excepciones o confundir el sentido del radio con el de la energía de ionización (van al revés).',
  },
  'posicion-tabla': {
    method: 'Situar un elemento: escribe su configuración; el n mayor es el periodo y el último subnivel da el bloque y el grupo.',
    principle: 'Periodo = n de la capa de valencia. Bloque s: grupos 1–2; p: 13–18; d: 3–12; f: lantánidos y actínidos.',
    why: 'La tabla está ordenada por Z y agrupa elementos con la misma configuración de valencia, que es lo que decide su química.',
    check: 'Grupo en el bloque p = 12 + electrones p (o 10 + electrones de valencia); en el bloque d = 2 + electrones d (si ns²).',
    errors: 'Tomar como periodo el n del último subnivel llenado en el bloque d (3d está en el periodo 4) o contar mal el grupo en el bloque p.',
  },
  'ion-estable': {
    method: '¿Qué ion forma un elemento representativo? Mira cuántos electrones le faltan o le sobran para tener la configuración del gas noble más cercano.',
    principle: 'Los representativos tienden a ganar o perder electrones hasta la configuración de gas noble; los de transición pierden primero los ns.',
    why: 'Arrancar los primeros electrones de valencia cuesta poco, pero romper una capa completa cuesta muchísimo (salto enorme en las EI sucesivas).',
    check: 'Grupo 1 → +1, grupo 2 → +2, grupo 13 → +3 (Al), grupo 16 → −2, grupo 17 → −1.',
    errors: 'Dar al cloro carga +7 o al sodio −7 («le faltan 7»): el camino corto hasta el gas noble es el que se sigue.',
  },
  zeff: {
    method: 'Calcular Z_ef con Slater: escribe la configuración agrupada y suma las contribuciones de pantalla de cada grupo de electrones.',
    principle: 'Z_ef = Z − a. Para un electrón ns/np: los del mismo grupo apantallan 0,35 (0,30 en 1s), los de la capa n − 1 apantallan 0,85 y los más internos 1,00.',
    math: 'Z_{ef} = Z - a',
    why: 'Los electrones internos se interponen entre el núcleo y el electrón estudiado; los de su misma capa apenas lo hacen porque están, en promedio, a la misma distancia.',
    check: 'Z_ef del electrón de valencia crece a lo largo de un periodo (≈ +0,65 por elemento) y es aproximadamente constante al bajar en un grupo.',
    errors: 'Contar el propio electrón en la pantalla, apantallar con 1,00 la capa n − 1, o aplicar las reglas de los electrones s/p a un electrón d.',
  },
  'radio-ionico': {
    method: 'Comparar radios de iones: decide primero si son del mismo elemento o isoelectrónicos.',
    principle: 'Mismo elemento: r(catión) < r(neutro) < r(anión). Isoelectrónicos: a más protones, menor radio.',
    why: 'Con más electrones para la misma carga nuclear, la repulsión agranda la nube; con la misma nube y más protones, el núcleo la contrae.',
    check: 'En la serie de 10 e⁻: N³⁻ > O²⁻ > F⁻ > Na⁺ > Mg²⁺ > Al³⁺.',
    errors: 'Ordenar isoelectrónicos por su masa o pensar que el anión es menor porque «tiene carga».',
  },
  'familia-periodo': {
    method: 'Te dan pistas (familia, periodo, configuración de valencia) y piden el elemento: traduce cada pista a una coordenada de la tabla.',
    principle: 'La familia fija el grupo y la configuración de valencia (ns¹ alcalinos, ns² alcalinotérreos, ns²np⁵ halógenos, ns²np⁶ gases nobles); el periodo fija n.',
    why: 'Grupo y periodo son las coordenadas de la tabla: con las dos, el elemento queda determinado.',
    check: 'Comprueba que Z del elemento elegido reproduce la configuración de valencia de la pista.',
    errors: 'Confundir el número de periodo con el de grupo o tomar el helio por alcalinotérreo (es un gas noble aunque sea 1s²).',
  },
  subnivel: {
    method: 'Números cuánticos de un subnivel (p. ej. 4d): la cifra es n y la letra es l.',
    principle: 's ↔ l = 0, p ↔ 1, d ↔ 2, f ↔ 3; m va de −l a +l.',
    why: 'La letra codifica la forma del orbital (l); la cifra, su tamaño y energía (n).',
    check: 'l siempre es menor que n: un «3f» no existe.',
    errors: 'Tomar l = n − 1 por defecto, o dar a m solo valores positivos.',
  },
  valencia: {
    method: 'Electrones de valencia: escribe la configuración y cuenta los de la capa de mayor n.',
    principle: 'En representativos: los de la última capa (ns + np). En transición, se indican aparte los (n−1)d.',
    why: 'Los electrones más externos son los menos atraídos y los que participan en el enlace y en la formación de iones.',
    check: 'En el bloque p: electrones de valencia = grupo − 10.',
    errors: 'Contar todos los electrones o solo los del último subnivel llenado (en el P, 3p³ pero 5 de valencia).',
  },
  'conceptos-varios': {
    method: 'Pregunta conceptual mixta: localiza el apartado del temario y aplica su definición exacta.',
    principle: 'Cada concepto tiene una definición operativa: espectro de líneas = huella del elemento; notación nℓˣ; metales: pierden electrones con facilidad.',
    why: 'Las preguntas cortas suelen evaluar si distingues conceptos parecidos (emisión/absorción, orbital/órbita, metal/no metal).',
    check: 'Relee la opción elegida y comprueba que es cierta SIEMPRE, no solo en el ejemplo que tienes en mente.',
    errors: 'Elegir una opción que es «casi» cierta: en ciencia una excepción basta para descartarla.',
  },
  'examen-espectro': {
    method: 'Problema completo de espectro: cada apartado alimenta al siguiente (1/λ → λ → ν → E → serie y región). Plantea primero el esquema de niveles.',
    principle: 'Rydberg para el número de ondas; c = λν; E = hν; la serie la fija n₁ y la región, λ.',
    math: '\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right)',
    why: 'Todos los apartados describen el mismo fotón con magnitudes distintas: si uno está mal, arrastra a los demás.',
    check: 'La energía del fotón coincide con |ΔE| = 13,6·|1/n₁² − 1/n₂²| eV; compara con tu resultado en eV.',
    errors: 'No elevar n al cuadrado, olvidar invertir 1/λ, no pasar nm a m y asignar la serie por el nivel de partida (la fija el de llegada).',
  },
  'examen-ondas': {
    method: 'Problema de ondas: todas las magnitudes (λ, ν, T, E) salen de una; pasa primero el dato al SI.',
    principle: 'c = λν, T = 1/ν, E = hν.',
    math: 'c = \\lambda\\nu \\qquad T = \\frac{1}{\\nu} \\qquad E = h\\nu',
    why: 'En el vacío todas las ondas electromagnéticas viajan a c: fijada una magnitud, las demás quedan determinadas.',
    check: 'Visible: λ ≈ 400–780 nm, ν ≈ 4–7,5·10¹⁴ Hz, E ≈ 1,6–3,1 eV.',
    errors: 'No convertir nm a m, calcular λ/c, o multiplicar h por λ.',
  },
  'examen-elementos': {
    method: 'Problema completo de elementos: escribe las configuraciones primero; de ellas salen posición, iones y tendencias.',
    principle: 'Configuración → periodo, grupo y bloque → ion probable → comparación de propiedades por tendencias.',
    why: 'Las propiedades periódicas se explican por Z_ef y por el número de capas, que se leen en la configuración.',
    check: 'Verifica cada configuración sumando electrones; después comprueba que las tendencias que aplicas van en el sentido correcto (radio al revés que la EI).',
    errors: 'Arrastrar un error de configuración a todo el problema, o justificar una tendencia sin nombrar Z_ef ni el número de capas.',
  },
  'examen-cuantico': {
    method: 'Problema de números cuánticos: identifica el subnivel (n, l) y deriva de él orbitales, electrones y combinaciones posibles.',
    principle: 'l = 0…n−1; m = −l…+l; 2l + 1 orbitales; 2 electrones por orbital.',
    why: 'Los números cuánticos son las «coordenadas» de cada estado del electrón: contarlos es contar estados.',
    check: 'El último electrón de la configuración (el diferenciador) debe tener el n y el l de su subnivel.',
    errors: 'Permitir l = n, olvidar m negativos o asignar al último electrón un subnivel distinto del que se está llenando.',
  },
  'examen-masa-iones': {
    method: 'Problema de isótopos e iones: separa la parte de recuento (Z, N, e⁻) de la de masa media ponderada.',
    principle: 'A = Z + N; e⁻ = Z − q; masa atómica media = Σ (masa isotópica · abundancia) / 100.',
    math: 'M_{\\text{media}} = \\frac{\\sum m_i\\,x_i}{100}',
    why: 'La masa de la tabla es una media de los isótopos naturales, pesada por su abundancia.',
    check: 'La masa media está entre la del isótopo más ligero y la del más pesado; con dos isótopos, más cerca del más abundante.',
    errors: 'Hacer la media aritmética simple, olvidar dividir entre 100 o confundir el número másico con la masa isotópica.',
  },
  'asignar-ei': {
    method: 'Asignar energías de ionización: ordena los elementos por tendencia y reparte los valores de menor a mayor.',
    principle: 'La EI aumenta en el periodo hacia la derecha y disminuye en el grupo hacia abajo, con las excepciones Be > B y N > O.',
    why: 'Arrancar un electrón cuesta más cuanto mayor es Z_ef y menor la distancia al núcleo.',
    check: 'Los gases nobles tienen las EI más altas de su periodo y los alcalinos las más bajas.',
    errors: 'Asignar al revés (mayor radio, mayor EI) o ignorar las excepciones de los subniveles llenos o semillenos.',
  },
  'iones-probables': {
    method: 'Iones probables a partir de la configuración: busca la configuración estable más cercana (gas noble o subnivel lleno o semilleno).',
    principle: 'Se pierden los electrones de valencia hasta quedar con la capa anterior completa, o se ganan hasta completar la capa.',
    why: 'Las EI sucesivas muestran un salto enorme al romper una capa completa: ahí se detiene la ionización.',
    check: 'La carga del ion coincide con el número de electrones de valencia perdidos (o ganados).',
    errors: 'Proponer iones que rompen una capa interna o cargas muy altas para no metales.',
  },
  'isotopo-desconocido': {
    method: 'Problema inverso de masa media: conoces la media y todos los isótopos menos uno; despeja la masa que falta.',
    principle: 'Masa media ponderada con la incógnita dentro.',
    math: 'M_{\\text{media}} = \\frac{m_1 x_1 + m_2 x_2}{100} \\Rightarrow m_2 = \\frac{100\\,M_{\\text{media}} - m_1 x_1}{x_2}',
    why: 'Es la misma ecuación de la media ponderada; solo cambia cuál es la incógnita.',
    check: 'La masa obtenida debe ser próxima a un número entero (su A) y tener sentido para el elemento.',
    errors: 'Despejar mal (restar la abundancia en lugar del producto m·x) o olvidar el factor 100.',
  },
  'segunda-ei': {
    method: 'Comparar primeras y segundas EI: mira de qué capa sale el segundo electrón.',
    principle: 'La segunda EI siempre es mayor que la primera; es enorme si el segundo electrón sale de una capa completa.',
    why: 'El ion ya positivo atrae más a sus electrones, y si hay que romper una capa de gas noble el salto es de un orden de magnitud.',
    check: 'Alcalinos: EI₂ ≫ EI₁ (rompen la capa de gas noble). Alcalinotérreos: el salto grande es entre EI₂ y EI₃.',
    errors: 'Pensar que la segunda EI puede ser menor que la primera, o no relacionar el salto con la configuración.',
  },
  desarrollo: {
    method: 'Pregunta de desarrollo: identifica el concepto, enuncia el principio, aplícalo al caso y concluye; es lo que evalúa la rúbrica.',
    principle: 'Estructura: afirmación → causa física (Z_ef, distancia, Pauli…) → aplicación al caso concreto → conclusión.',
    why: 'Un argumento científico no es una lista de datos: tiene que conectar la causa con el efecto observado.',
    check: 'Relee tu respuesta buscando la palabra «porque»: si no explicas una causa, aún no es una justificación.',
    errors: 'Responder solo con el resultado, describir sin explicar o usar términos vagos («más fuerza», «más energía») sin decir de qué.',
  },
  'de-broglie': {
    method: 'Te dan la masa y la velocidad (o la energía) de una partícula y piden su longitud de onda: es la relación de De Broglie.',
    principle: 'Toda partícula con cantidad de movimiento p = m·v tiene asociada una onda de longitud λ = h/p.',
    math: '\\lambda = \\frac{h}{p} = \\frac{h}{m v}',
    why: 'La dualidad onda-partícula es simétrica: si la luz (onda) tiene cantidad de movimiento p = h/λ, una partícula con p debe tener una λ asociada.',
    check: 'Para un electrón a unos 10⁶ m/s, λ es del orden de 10⁻¹⁰ m (el tamaño de un átomo); para un objeto macroscópico, λ es inapreciable.',
    errors: 'No pasar la masa a kg, usar la velocidad en km/s, o confundir λ = h/p con E = hν.',
  },
  'error-ion-transicion': {
    method: 'Detectar un error en un razonamiento ajeno: comprueba cada línea por separado (¿el punto de partida es correcto?, ¿la operación aplicada es la correcta?) y localiza la primera que falla.',
    principle: 'Para formar un catión de transición se quitan primero los electrones ns y después los (n−1)d.',
    why: 'Con los orbitales 3d ocupados, el 4s queda por encima en energía: sus electrones son los más externos y los primeros en salir. El orden de llenado no es el orden de vaciado.',
    check: 'El ion resultante de un metal de transición conserva sus electrones d: Fe²⁺ [Ar] 3d⁶, Cu²⁺ [Ar] 3d⁹, Zn²⁺ [Ar] 3d¹⁰.',
    errors: 'Vaciar en el orden inverso al de llenado (quitar 3d antes que 4s) o, al revés, añadir electrones para formar un catión.',
  },
  'verdadero-falso': {
    method: 'Verdadero o falso: busca un contraejemplo. Si existe uno solo, la afirmación es falsa; si es verdadera, identifica la razón exacta, no una que «suene bien».',
    principle: 'Una afirmación científica general tiene que cumplirse siempre; las razones correctas citan la causa física (electrones, Z_ef, n, Pauli…).',
    why: 'Muchas afirmaciones falsas mezclan dos conceptos cercanos (intensidad y energía, órbita y orbital, Hund y Aufbau): separarlos es el objetivo.',
    check: 'Relee la justificación elegida: ¿explica el porqué o solo repite la afirmación con otras palabras?',
    errors: 'Elegir una justificación que es cierta pero no explica la afirmación, o aceptar una afirmación por un ejemplo que sí la cumple.',
  },
  'pauli-hund': {
    method: 'Diagramas de cajas: rellena orbital a orbital comprobando primero Pauli y después Hund.',
    principle: 'Pauli: máximo dos electrones por orbital y con espín opuesto. Hund: en orbitales de igual energía, primero uno en cada uno con el mismo espín.',
    why: 'Electrones desapareados en orbitales distintos se repelen menos y el estado resulta de menor energía.',
    check: 'Cuenta los desapareados: N tiene 3, O tiene 2, F tiene 1.',
    errors: 'Emparejar antes de llenar todas las cajas del subnivel o poner dos flechas iguales en la misma caja.',
  },
};

const letter = (i: number, n: number) => (n > 1 ? `${String.fromCharCode(97 + i)}) ` : '');

/** Resolución específica de la familia, o null si la familia ya tiene la suya propia o no está cubierta. */
export function familyResolution(ex: Exercise): ResolutionStep[] | null {
  const g = G[ex.generatorId];
  if (!g) return null;
  const n = ex.parts.length;
  const steps: ResolutionStep[] = [
    { kind: 'pregunta', text: ex.statement.replace(/\*\*/g, '').split('\n')[0]! },
    ...(ex.data?.length ? [{ kind: 'datos' as const, text: ex.data.map((d) => `${d.label} = ${d.value}`).join(' · ') }] : []),
    { kind: 'metodo', text: g.method },
    { kind: 'principio', text: g.principle, ...(g.math ? { math: g.math } : {}) },
    { kind: 'por-que', text: g.why },
  ];
  ex.parts.forEach((p, i) => steps.push({ kind: 'calculo', text: `**${letter(i, n)}${p.prompt}** → ${p.canonical}. Por qué: ${p.explanation}` }));
  steps.push({ kind: 'resultado', text: ex.parts.map((p, i) => `${letter(i, n)}${p.canonical}`).join(' · ') });
  steps.push({ kind: 'comprobacion', text: g.check });
  steps.push({ kind: 'errores', text: g.errors });
  return steps;
}

export const FAMILY_GUIDES = G;
