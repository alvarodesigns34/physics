# ATOM 4.0 — Informe de la cuarta generación

> Rama `claude/proyecto-atom-interactive-830d7u`. Producción (`main`) sin cambios hasta autorización expresa.
> Público: alumnado de 1.º de Bachillerato.

## 1. Hallazgos de la auditoría y su corrección

### 1.1 Inflación de las estimaciones de dominio
Causas encontradas en el modelo de 3.0:
1. Un acierto en una pregunta de 2 o 4 opciones contaba igual que una respuesta abierta (sin probabilidad de adivinar).
2. Un acierto tras fallar o con pistas podía seguir subiendo θ con peso completo.
3. Con un solo acierto difícil se mostraba ≈ 62 % de dominio: la estimación no se contraía hacia el punto de partida.
4. Las autoevaluaciones de desarrollo pesaban como una corrección objetiva.

Corrección:
- **Modelo 3PL** (discriminación 1): P = c + (1 − c)·σ(θ − b), con c = 1/opciones (1/2ᵏ en selección múltiple, 1/n! en ordenar). La actualización usa el gradiente de la verosimilitud: un acierto adivinable informa menos.
- **Tipos de evidencia** por apartado y ejercicio: *demostrada*, *posible azar*, *asistida* (reintento, pista, paso revelado o arrastre) y *autoevaluada*, con pesos 1 / 1 (ya penalizada por c) / 0,6 / 0,4. Solo la demostrada (respuesta abierta, primer intento, sin pistas, dificultad ≥ 2) cuenta como «acierto demostrado».
- **θ mostrado con contracción**: θ̂ = θ₀ + (θ − θ₀)·I/(I + I₀). Con poca información, la estimación queda cerca del punto de partida y con intervalo ancho.
- Pruebas: `src/learning/model4.test.ts`.

### 1.2 Datos científicos ausentes interpretados como 0
`null` en la afinidad electrónica mezclaba «anión no ligado» (AE ≤ 0 medida: gases nobles, N, Be, Mg, Mn, Zn, Cd, Hg) con «sin valor en la fuente» (varios lantánidos, actínidos, transactínidos), y ATOM mostraba ambos como 0 kJ/mol. Ahora hay tres estados (`affinityStatus`): solo el primero es 0; el segundo aparece como «sin datos» y queda fuera de gráficas, ordenaciones y excepciones. Prueba en `trends3.test.ts`.

### 1.3 Preguntas no respondidas en los simulacros
Antes, al agotarse el tiempo, las preguntas no respondidas desaparecían del informe por apartados. Ahora (`examSession.ts`) cuentan 0 en la nota, se listan por apartado como «sin responder» y no se usan como evidencia de dominio (no responder por falta de tiempo no demuestra no saber).

### 1.4 Continuidad de las rutas de estudio
El estado de la ruta (paso, pasos hechos, errores, ids de sus ejercicios) se guarda en el navegador; desde un laboratorio o la guía, la barra superior ofrece «Ruta: … · paso n/6» para volver al punto exacto. Comprobado en la e2e.

### 1.5 Renderizado continuo y memoria
- **Bajo demanda** (`src/render/demand.ts`): se dibuja durante la interacción y 5 s después, mientras una simulación lo pide (Monte Carlo, conteo de iones, colapso) o durante animaciones de duración conocida (fotones). La autorrotación decorativa solo actúa en la ventana de actividad (`CalmOrbitControls`).
- **Medición** (fotogramas dibujados en 5 s de reposo, tras la carga, SwiftShader): antes, todas las escenas dibujaban continuamente; ahora Forja 0, Fotones 0, Cuántica 0, Tabla 0, Arquitecto 0, Modelos 0, Campaña 0; solo Geiger–Marsden (158) y Masas (241), que simulan, siguen dibujando.
- **Fugas corregidas**: material de las trayectorias del tubo de Thomson no liberado; `BoxGeometry` creada en cada render del espectroscopio. Recursos WebGL estables tras 4 rondas de cambios de orbital (5 geometrías, 1 textura) y 3 rondas de cambios de lámpara (20 y 2).

### 1.6 Cancelación de cálculos obsoletos
Si llega una petición distinta mientras el Worker calcula otra, el Worker se termina y se crea uno nuevo (antes el cálculo obsoleto seguía consumiendo CPU hasta terminar). `cancel()` al desmontar también lo detiene. Pruebas con un Worker simulado (`computeClient.test.ts`).

### 1.7 Límites del comprobador de respuestas
La auditoría señaló formas de escribir correctas que el comprobador rechazaba. Ahora `parseNumber` acepta `2**3`, `10^{14}`, `3 . 10^8` y la multiplicación con espacio, y `splitValueAndUnit` normaliza las llaves antes de separar la unidad. También se añadieron los alias `/s`, `/m` y `/cm`. Todo ello está cubierto con pruebas en `audit3.test.ts`. Sigue sin evaluarse ninguna expresión del usuario: no hay `eval`.

## 2. Cuaderno inteligente de errores
- **Registro.** Cada ejercicio terminado con algún paso no superado deja una entrada con su enunciado, sus apartados y los pasos fallados. Cada paso fallado lleva el diagnóstico real (unidades, cálculo, idea errónea…). Solo se anota «revelado» si el paso se vio resuelto sin que hubiera un error diagnosticado.
- **Superación.** No basta con repetir el mismo enunciado, porque eso puede ser memoria. Una entrada se supera al acertar una variante nueva del mismo tipo al primer intento y sin ayuda. Los ejercicios de los documentos no tienen variantes: para ellos vale el mismo enunciado pasados al menos 2 días.
- **Dificultades recurrentes.** Se señala un tipo de error cuando aparece en 3 o más entradas abiertas, o en 2 entradas de apartados distintos.
- **Lagunas conceptuales probables.** Se señalan cuando se repiten errores de concepto o de regla en un mismo apartado, o cuando hay fallos repetidos en un apartado cuyo prerrequisito está sin practicar o tiene un dominio estimado por debajo del 60 %. Siempre se formulan como posibilidad e indican la evidencia en que se basan.
- **Dónde está.** En Entrenamiento → Cuaderno. Cada entrada enlaza a una variante nueva (`?gen=`) o al mismo ejercicio en modo revisión (`?ex=…&modo=revision`). El cuaderno se guarda en el progreso y se incluye en la copia de seguridad exportada, que se valida al importarla.
- **Pruebas.** `notebook.test.ts` cubre la lógica. En el navegador, `tools/smoke.mjs` falla un ejercicio completo y comprueba que la entrada aparece, y `tools/a11y.mjs` audita la vista con axe.

## 3. Calidad de la evidencia, repaso y selección
- **Evidencia por apartado.** Cada intento guarda el resultado y el tipo de evidencia de cada apartado que evalúa (`nodeEvidence`). En Progreso, cada apartado muestra una barra con los aciertos demostrados, los que pudieron ser casuales, los logrados con ayuda, los autoevaluados y los intentos no superados (`evidenceBreakdown`). Una leyenda explica cada tipo. Los intentos anteriores a ATOM 4.0 no registraban el tipo: si fueron limpios se cuentan como demostrados, y si hubo pistas, como asistidos.
- **Repaso espaciado graduado.** El repaso usa cajas de Leitner con intervalos de 1, 2, 4, 8 y 16 días. Solo un acierto demostrado sube de caja. Un acierto con ayuda, autoevaluado o que pudo ser casual mantiene la caja: no prueba recuerdo autónomo, pero tampoco cuenta como fallo. Antes, cualquier acierto alargaba el intervalo, otra forma de inflación.
- **Selección.**
  - Orden de prioridad: reintento en la sesión, repaso vencido, cuaderno de errores, recomendación diagnóstica y, por último, el apartado más débil.
  - Las entradas abiertas del cuaderno vuelven como variante nueva en torno a 1 de cada 3 ejercicios. Para que no se repitan en caliente, solo vuelven cuando han pasado al menos 10 minutos desde el fallo. El ejercicio explica por qué aparece.
  - El apartado más débil se elige con el θ mostrado (encogido hacia el prior) y con una prima de exploración para los apartados con poca información.
- **Pruebas.** `selection4.test.ts` y `evidenceBreakdown.test.ts`.

## 4. Teoría con más profundidad (qué, cómo, por qué y para el examen)
- **Contenido.** `src/learning/guideDepth.ts` añade a las 50 secciones de la guía:
  - **Por qué**: el mecanismo o la razón física, no solo la regla.
  - **Cómo lo preguntan** en el examen.
  - **Dudas frecuentes** con su respuesta.
  - En 9 secciones, una **analogía** que declara siempre dónde deja de funcionar.
  - En 14 secciones, un **contraejemplo** o caso límite: Ti²⁺ frente a Ca en especies isoelectrónicas; el salto 2→1 frente al 5→2; el láser rojo frente a la lámpara UV; el Cl frente al F en afinidad electrónica.
- **Rigor.** Las cifras usadas son valores de referencia habituales, redondeados como en clase:
  - e/m del electrón ≈ 1,76·10¹¹ C/kg
  - h·c ≈ 1240 eV·nm
  - energías de ionización del Mg: 738, 1451 y 7733 kJ/mol
  - afinidad electrónica: Cl ≈ 349 kJ/mol, F ≈ 328 kJ/mol
  - radios covalentes: Ne ≈ 58 pm, Na ≈ 166 pm
  - punto de ebullición del D₂O ≈ 101,4 °C

  Cuando algo es una simplificación del curso (Z_ef ≈ Z − electrones internos, o qué cuenta como electrones de valencia en los metales de transición), el texto lo dice.
- **Pruebas.** `guideDepth.test.ts` exige que todas las secciones tengan las capas, que no haya entradas huérfanas, que toda analogía declare su límite y que cada duda sea una pregunta con respuesta.

## 5. Fórmulas manipulables
- `src/learning/liveFormulas.ts` añade un explorador a 11 fórmulas de la guía:
  - A = Z + N
  - e⁻ = Z − q
  - masa media
  - v = λ·ν
  - E = h·c/λ
  - Rydberg
  - número de líneas
  - rₙ
  - Eₙ
  - 2l + 1
  - 2n²

  Cada explorador tiene deslizadores accesibles (`aria-valuetext` con unidades; escala logarítmica para λ), resultados recalculados al instante y una observación sobre la dependencia entre magnitudes.
- Se etiquetan como **cálculo** y usan las constantes de la teoría de clase (`THEORY_DATA`).
- Las combinaciones sin sentido físico (n₂ ≤ n₁, más carga positiva que protones) se explican en lugar de calcularse.
- **Pruebas.** Unitarias en `liveFormulas.test.ts`: valores de referencia (Hα 656,3 nm, ³⁵Cl/³⁷Cl → 35,45 u, 620 nm → 2,00 eV…) y la ida y vuelta del deslizador logarítmico. En el navegador, la prueba e2e mueve n₂ con el teclado y comprueba Hβ (486,2 nm).

## 6. Resoluciones para todas las familias
- **Antes.** 35 de las 48 familias mostraban la solución como una lista plana de frases.
- **Ahora.** `structuredResolution` (`autoResolution.ts`) da a esas familias una resolución por bloques: qué nos piden, datos, principio (fórmula de la guía del apartado), por qué, cada paso con su resultado y su razonamiento, resultado final y errores típicos del apartado.
- **Sin cálculos nuevos.** Solo reorganiza contenido ya verificado: los pasos del propio ejercicio, generados con sus mismos números, y la guía. Se usa también en el informe del simulacro.
- **Defecto encontrado y corregido.** La explicación de Slater citaba un subnivel inexistente, «(1s,1p)». Ahora dice «(1s)». Se añadió una prueba de regresión que recorre todas las familias con varias semillas y prohíbe mencionar 1p, 1d, 2d, 1f, 2f o 3f fuera de las preguntas de validez, que los citan a propósito.

## 7. Familias nuevas para los apartados con menos práctica
- **`de-broglie` (5.1).** Tres niveles:
  - electrón con una velocidad dada → p, λ y comparación con el tamaño atómico;
  - electrón acelerado por una diferencia de potencial → E = eV, p = √(2mE) y λ (100 V → 1,23·10⁻¹⁰ m, valor de referencia);
  - cociente λₑ/λₚ = mₚ/mₑ y por qué no se observa la onda de un objeto cotidiano.
- **`heisenberg` (5.2, 5.3).** Δp y Δv mínimas de un electrón confinado en un átomo, comparadas con la velocidad de Bohr: por qué no hay órbitas. En nivel 3, la misma cuenta con un objeto macroscópico.
- **`pauli-hund` (6.1, 6.2, 6.4).** Elegir el diagrama de cajas fundamental entre cuatro: el correcto, uno apareado antes de tiempo (incumple Hund), uno con desapareados antiparalelos y uno imposible (incumple Pauli). Después, contar los desapareados y clasificar el diagrama imposible.
- **Detalles.** Las opciones con forma de diagrama se dibujan como cajas, con una lectura accesible («orbital 1, dos electrones apareados…»).
- **Diagnóstico.** Se reconocen la masa en gramos, la falta de raíz, h/p invertido, la falta de 4π y el cociente de masas invertido.
- **Unidades.** Se añade kg·m/s (también se aceptan kg*m/s, kg m/s, N·s y kg·m·s⁻¹).
- **Pruebas.** `quantum4.test.ts`, además de las pruebas de autoconsistencia y de atribución por paso que ya recorren todas las familias.

## 8. Laboratorios: inspección visual y defectos corregidos
Revisé los siete laboratorios con capturas, en calidad alta y baja. Defectos encontrados y corregidos:
- **Espectrómetro de masas: geometría incoherente (defecto científico).**
  - **Defecto.** El semidisco del imán y los arcos dibujados ocupaban x ≤ 0, mientras que los iones, con x = r·sen φ, se movían por x ≥ 0: se curvaban fuera del campo que los desvía.
  - **Corrección.** Ahora el imán, el arco y el movimiento coinciden.
  - **Regresión.** `masses/geometry.test.ts` construye las geometrías con three.js y comprueba que todos los vértices del arco están en el semiplano del imán y sobre la circunferencia de la trayectoria.
  - **Legibilidad.** El instrumento tiene materiales más claros y rótulos de sus partes: fuente, aceleración, campo B y detector.
- **Etiquetas superpuestas.**
  - **Defecto.** Cl‑35 y Cl‑37, con radios casi iguales, se pisaban.
  - **Corrección.** `LabelProjector` separa en vertical las etiquetas que se solapan (`separateLabels`, función pura probada) y respeta la alineación de cada una. Primero lee todas las medidas y después escribe, para no forzar un recálculo de estilos por etiqueta. Es opcional (`avoidOverlap`), porque desplazar una etiqueta la aleja de su ancla. Al activarla para todos, la inspección visual mostró que en el diagrama de niveles del hidrógeno las etiquetas n = 4, 3 y 2 acababan junto a líneas que no eran las suyas. Ahora el espectrómetro separa hacia abajo y el hidrógeno hacia arriba, donde hay espacio. Toda etiqueta desplazada dibuja una línea guía hasta su ancla.
- **Arquitecto: cajas casi invisibles.** Las cajas vacías (azul marino sobre fondo casi negro) no se distinguían.
  - La caja redondeada no tiene aristas vivas, así que `EdgesGeometry` no devolvía contorno; ahora se toma de una caja recta de las mismas medidas.
  - Materiales más claros, menos brillo especular y una luz de relleno lateral (una luz frontal producía un reflejo deslumbrante).
- **Calidad baja: escenas planas.** Sin mapa de entorno, las escenas sin luces propias, como el orbital cuántico, se veían como recortes planos. `Stage` añade en ese nivel un juego de luces sin sombras (hemisférica y dos direccionales).

## 9. Mediciones (SwiftShader; solo comparativas)
Medido con la misma herramienta (`tools/perf.mjs`) y el mismo renderizador por software que en ATOM 3.0. Datos: `docs/mediciones/perf-atom3-ciclo6.json` → `perf-atom4.json`.

| Vista | fps 3.0 → 4.0 | p95 fotograma (ms) | memoria JS (MB) |
|---|---|---|---|
| Forja | 6,8 → 10,4 | 183 → 133 | 20 → 25 |
| Photon (ondas) | 7,4 → 9,0 | 150 → 133 | 18 → 18 |
| Masas | 6,0 → 7,9 | 217 → 150 | 30 → 30 |
| Quantum | 4,7 → 6,5 | 250 → 200 | 16 → 25 |
| Periódico | 3,4 → 5,4 | 367 → 233 | 21 → 21 |
| Arquitecto | 6,9 → 9,7 | 183 → 133 | 24 → 24 |
| Historia | 5,8 → 8,1 | 217 → 150 | 24 → 31 |
| Inicio / Guía / Entrenamiento | 60 → 60 | 16,7 → 16,7 | 9 / 23 / 18 → 9 / 23 / 16 |

- **Fotogramas.** Mejoran en todos los laboratorios. Lo atribuyo sobre todo al renderizado bajo demanda: en reposo no se dibuja, y la CPU queda libre para el renderizado por software.
- **Memoria.** Sube en Forja, Quantum e Historia. Es una lectura puntual del heap, que depende del momento de la recolección de basura, así que no concluyo que haya una fuga. Los recursos de GPU sí se midieron de forma determinista (§1.5) y permanecen estables tras interacciones repetidas.
- **Interacción en Quantum.** Tarea larga máxima en torno a 1 s, como en 3.0: es la rasterización síncrona de SwiftShader, no código propio.
- **Sin medir en GPU real ni en iPad.** El entorno no dispone de ellos.

## 10. Mantenibilidad y modularidad
- **Estilos.** `global.css` (4 550 líneas) pasa a 12 módulos por área en `src/styles/global/`: base, estructura, componentes, guía, widgets, páginas, profundidad, visor, páginas claras, navegación, pedagogía y ATOM 4.0. Se importan en el orden original, y el CSS compilado es idéntico byte a byte (mismo MD5). Las capturas de referencia muestran un 0 % de píxeles distintos.
- **Entrenamiento.** `Training.tsx` (786 líneas) pasa a 283 líneas y se separan `Scope.tsx` (selector de bloques compartido), `ExamView.tsx`, `Progress.tsx`, `Review.tsx` y `Sources.tsx`. Los imports no usados se eliminaron con ayuda del compilador.
- **Verificación.** Compilación estricta, 955 pruebas unitarias, e2e, accesibilidad (axe) y diferencia visual, todo sin cambios.

## 11. Validación científica independiente
`src/science/reference.test.ts` (42 comprobaciones) contrasta la aplicación con valores escritos a mano desde fuentes externas al código, no con fórmulas de la propia aplicación:
- **Líneas del hidrógeno.** Lyman α y β, Hα–Hδ y Paschen α, frente a NIST ASD (longitudes de onda en el vacío). Error relativo < 10⁻⁴: el modelo de Bohr con masa reducida ignora la estructura fina.
- **Constantes derivadas.** Energía de ionización del H (13,598 eV) y radio de Bohr (52,92 pm).
- **Datos de los elementos.**
  - Primera energía de ionización de 17 elementos (NIST), con una diferencia menor de 0,01 eV.
  - Afinidad electrónica de 6 elementos.
  - Masa atómica de 8 elementos (IUPAC).
- **Excepciones del temario.** Se comprueban con los datos: Be > B, Mg > Al, N > O y P > S en energía de ionización; Cl > F en afinidad electrónica; y N y los gases nobles sin anión estable.

Todas pasaron a la primera: no fue necesario corregir ningún dato.
