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
