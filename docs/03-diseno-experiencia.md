# 3. Diseño de experiencias y jugabilidad

## 3.1 Bucle principal

```
 explorar ──► experimentar ──► predecir ──► comprobar con el modelo ──► explicar
    ▲                                                                       │
    └────────── repaso espaciado ◄── dominio por apartado ◄── ejercicios ◄──┘
```

En ATOM, la pregunta llega después de la experiencia: primero tocas la materia y después la explicas. Las misiones obligan a *construir*, *medir* o *razonar*, y su verificación usa el mismo núcleo científico que la simulación.

## 3.2 El Atrio (mundo central)

Sala circular nocturna con suelo de piedra pulida y una cúpula. En el centro flota la **densidad electrónica del neón**, calculada (no decorativa): 10 electrones en 1s, 2s y 2p, con Z_ef de Slater. Alrededor se disponen pedestales para cada estación con su holograma: el núcleo de la Forja y el haz y prisma del Photon Lab. Al tocar una estación, la cámara se desplaza hasta ella y se abre el laboratorio. Desde el panel lateral se accede a la campaña, el entrenamiento y los ajustes.

## 3.3 Atomic Forge (fase 1)

**Experiencia:** un crisol de luz donde se ensambla un átomo partícula a partícula.

- **Tres dispensadores** (protón, neutrón y electrón) con botones ± y atajos de teclado `P`/`N`/`E` (`Mayús` para quitar). En escritorio y pantallas táctiles también se puede *arrastrar* la partícula al crisol.
- **Núcleo** con nucleones empaquetados (modelo pedagógico, escala no real). Cambiar Z transmuta el elemento con un destello y una etiqueta nueva.
- **Corteza** representada como *densidad de probabilidad* por subniveles ocupados (orbitales hidrogenoides con Z_ef), nunca como órbitas. Un aviso permanente indica: «Escala no real: el núcleo sería unas 10⁵ veces menor».
- **Ficha de identidad** en vivo: notación ᴬ_Z X^q, nombre, Z, A, N, e⁻, carga, tipo (átomo neutro, catión o anión), configuración electrónica e isoelectrónico con…
- **Estabilidad nuclear con datos reales:** estable (con abundancia natural), radiactivo (con t½) o «núcleo no observado». No se inventa nada: los datos proceden de NUBASE.
- **Escalera de isótopos** del elemento actual con abundancias naturales; al tocar uno se ajustan los neutrones.

**Misiones del capítulo I «Identidad»**

| # | Misión | Requiere | Nodos |
|---|---|---|---|
| I-1 | *Carbono-12*: construye ¹²C neutro | Z = 6, N = 6, e = 6 | 1.1, 1.2 |
| I-2 | *Lo que decide Z*: construye ²³Na y explica qué cambia si quitas un neutrón o un protón | Construcción + pregunta razonada | 1.1–1.3 |
| I-3 | *Gemelos imperfectos*: construye protio, deuterio y tritio; ¿cuál es radiactivo? | 3 construcciones + datos | 1.3 |
| I-4 | *Ionización*: forma Na⁺, O²⁻ y Al³⁺ | Construcción de iones | 1.4 |
| I-5 | *Familia del neón*: tres especies isoelectrónicas con Ne distintas del Ne | Predicado «e = 10 y Z ≠ 10» ×3 | 1.5 |
| I-6 | *Laboratorio forense*: completa tablas tipo AMP 2–5 | Ejercicios verificados | 1.1–1.4 |
| I-7 | *El oro de Rutherford*: AMP 1 (protones, electrones y localización) | Construcción + explicación | 1.1, 1.6 |

## 3.4 Photon Lab (fase 1)

**Experiencia:** un banco óptico en penumbra. La luz es lo único saturado de la escena.

1. **Banco de ondas.** Selector de λ en escala logarítmica de 10⁻¹⁴ m a 10⁴ m. Se ven la onda, la región del espectro y el color (si es visible), y se calculan en vivo ν, T, E (J y eV) con cifras significativas. Una nota recuerda que la onda dibujada usa una escala comprimida, no real.
2. **Hidrógeno.** Escalera de niveles Eₙ = −13,6/n² eV (cuantitativa). Se elige un salto arrastrando de un nivel a otro, o tocando origen y destino. Un fotón sale (emisión) o entra (absorción) con su color real, y la línea aparece en un **detector** con eje de λ y zonas UV, visible e IR. Aparece la serie y el cálculo de Rydberg paso a paso.
3. **Cascada.** «Excita la muestra hasta n = k» y la escena muestra las k(k−1)/2 líneas posibles (AMP 10).
4. **Espectroscopio.** Espectros de emisión y absorción de H, He, Na, Hg y Ne (datos NIST). Misión: identificar el gas de una muestra problema o de la atmósfera de una estrella.

**Misiones del capítulo II «Luz»**

| # | Misión | Requiere | Nodos |
|---|---|---|---|
| II-1 | *500 nanómetros*: sitúa λ = 500 nm y calcula ν y E | Experimento + cálculo (AMP 6) | 3.2–3.4 |
| II-2 | *Escalera de energía*: ordena radiaciones por energía | Razonamiento | 3.3, 3.4 |
| II-3 | *La línea roja*: produce Hα (3 → 2) y calcula λ con Rydberg | Experimento + cálculo | 3.6, 4.3 |
| II-4 | *Lyman*: transición 3 → 1. Calcula λ, ν y E (J y eV); explica por qué tiene más energía que 3 → 2 | AMP 7 | 3.6, 3.7, 4.3 |
| II-5 | *Paschen misterioso*: ¿qué línea tiene ν = 2,34·10¹⁴ Hz? | Búsqueda experimental + cálculo inverso (AMP 9) | 3.7 |
| II-6 | *Cascada*: excita a n = 4 y cuenta las líneas | AMP 10 | 3.8 |
| II-7 | *Firma estelar*: identifica el elemento por sus líneas de absorción | Espectroscopio | 3.5 |

## 3.5 Sistema de ejercicios

Cada ejercicio es **verificable** y está **parametrizado**: un generador crea variantes con datos distintos, y su solución se calcula con `science/`.

- **Tipos de respuesta:** numérica (con unidad y cifras significativas), elección (con retroalimentación por distractor), especie (Z, A, N, e y carga), configuración electrónica (texto libre analizado), números cuánticos y ordenación.
- **Resolución paso a paso:** los problemas numéricos se dividen en pasos (por ejemplo, número de ondas → λ → ν → E). Cada paso se corrige por separado, y un error en un paso se arrastra de forma coherente: si el alumno usa su propio resultado anterior, el siguiente paso se corrige *con su valor* y se le indica.
- **Pistas graduadas (3 niveles):** idea → herramienta (fórmula) → planteamiento con números. Cada pista consumida reduce la ganancia de dominio.
- **Retroalimentación específica:** detectores de errores típicos. Por ejemplo: λ en nm cuando se pide m (factor 10⁹); n₁ y n₂ intercambiados (signo); olvido de invertir 1/λ; confundir A con N; electrones mal contados en iones; unidad correcta en magnitud equivocada; cifras significativas excesivas.
- **Explicación razonada:** tras resolver o agotar los intentos se muestra la resolución completa, con fórmulas y unidades.

## 3.6 Aprendizaje adaptativo

- **Dominio por nodo** (modelo tipo Elo/Rasch): P(acierto) = σ(θ_nodo − b_ítem). Tras cada intento, θ += K·(resultado − P), y K se reduce con las pistas usadas.
- **Selección del siguiente ejercicio:** nodo con menor dominio dentro del ámbito elegido y dificultad con P ≈ 0,7 (zona de desafío).
- **Repaso espaciado** (Leitner, 5 cajas, intervalos de 1, 2, 4, 8 y 16 días): cada nodo fallado entra en la caja 1. Además, dentro de la sesión se reintroduce tras otros 3 ejercicios.
- **Modo examen:** sin pistas ni retroalimentación inmediata. Se elige el número de preguntas y los bloques, con temporizador opcional. Al final se muestra un informe por apartado con todas las resoluciones.
- **Seguimiento por apartados:** vista de la matriz de cobertura con el dominio de cada nodo, intentos y fecha del próximo repaso.

## 3.7 Progresión y recompensa

Sin puntos arbitrarios ni instrumentos bloqueados: la recompensa es **iluminar la matriz del temario** (cada nodo dominado se enciende en el mapa de progreso) y obtener hasta 3 **marcas de precisión** por misión: sin pistas, al primer intento y todos los pasos correctos. La campaña sugiere un orden, pero la experimentación libre nunca se restringe: todos los instrumentos de los laboratorios están disponibles desde el principio.
