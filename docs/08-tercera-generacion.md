# ATOM 3.0 — Informe de la tercera generación

> Documento vivo. Resumen ejecutivo al final de cada ciclo. Detalle de tareas en `ATOM3-PROGRESS.md`; criterios en `ATOM3-QUALITY-GATES.md`.

## 1. Línea base (ATOM 2.0, commit cdce04f)
- 112 archivos versionados · 223 pruebas vitest · 23 comprobaciones e2e · 129 ejercicios de documentos · 54 apartados · 35 misiones · 7 laboratorios.
- `global.css`: 2 905 líneas, tema oscuro único, títulos en Instrument Serif.
- Capturas: `docs/capturas/antes/*.png` (escritorio). Render SwiftShader: válidas para composición, no para FPS.

## 2. Ciclo 2 — Defectos de la auditoría externa
**P0.1 — Evidencia conceptual injustificada.** Antes, «27» frente a 500 nm sin unidad se clasificaba como «unidad-falta» y el apartado recibía un suelo del 75 %. Ahora el corrector evalúa el número en la unidad pedida: si es incorrecto, el error es numérico (cálculo, potencia de 10…) y la falta de unidad se añade como error secundario; el suelo solo se concede con `valueCorrect` y si el paso acabó resolviéndose. «orden-de-magnitud» baja a 0,5 (podría ser fórmula errónea); «unidad-incompatible» no tiene suelo.

**P0.2 — Soluciones en enunciados.** Dos enunciados (HOJ 9, HOJ 10) llevaban «(Sol.: …)». Se separaron en `originalSolution`, visible solo al revisar. Una prueba recorre los 129 ejercicios de documentos y todos los generadores con tres semillas en busca de «Sol.», «Solución:», «Respuesta:» y del valor numérico esperado (≥ 4 cifras).

**P0.3 — Informe agregado.** `aggregateNodeEvidence` construye el informe por apartados con la misma evidencia por paso que el motor adaptativo; los reintentos de la práctica también.

**P0.4 — Cifras significativas.** Antes solo había evidencia negativa. Ahora `sigFigsAssessed` indica si la respuesta permitía evaluarlas (criterio definido y número no ambiguo, p. ej. «500» no lo es); entonces suma evidencia positiva o negativa.

**P1.1 — Calidad gráfica.** El monitor entrega la mediana del fotograma. Se distinguen: pestaña oculta, gracia de 3 s tras cambiar de escena, pico aislado (mediana fluida), rendimiento bajo (3 ventanas) y muy bajo (< 20 fps, 2 ventanas). La prueba antigua que afirmaba «20 fps con fotogramas de 900 ms no degrada» describía el defecto; se reescribió con una mediana explícita.

**P1.2 — Nube cuántica.** Cliente genérico de Worker (`src/workers/computeClient.ts`) compartido por superficies y nubes. La nube solo se calcula en la vista «nube» (antes se calculaba siempre, también para la superficie, solo para obtener la escala); la escala sale ahora del cuantil radial analítico.

**P1.3 — Validación.** byNode (ok ≤ total, apartados existentes), tipos de error y competencias, marcas de tiempo plausibles, relaciones (correcto ⇒ puntuación > 0; demostrados ≤ intentos; misión completada ⇒ todos los pasos), ajustes desconocidos, Forja y misión activa, repasos huérfanos.

**P1.4 — Umbral.** La probabilidad encerrada se calcula sobre todo el conjunto {ρ ≥ u}; con empates en el umbral (simetría) entran todos los puntos.

**P1.5 — Exámenes.** `buildExamDetailed` solo usa generadores puros del ámbito, recorre sin repetir los ejercicios de documentos y, si el ámbito no da para más, lo explica en la interfaz.

**P1.6 — Atribución.** Tabla `attribution.ts`. Las nuevas pruebas destaparon cuatro incoherencias reales: pasos anotados con apartados que el ejercicio no declaraba (3.5, 3.2, 3.3 en el examen de espectros; 7.2 y 6.4 en el de elementos; 1.4 en filas de átomos neutros) y tres generadores cuyo ámbito estático no cubría sus ejercicios, lo que permitía que un examen «puro» se saliera del ámbito.

## 3. Ciclo 3 — Identidad visual y experiencia
- **Dirección artística**: «laboratorio a la luz del día». Tema claro principal; oscuro opcional coherente (no negro). Un único acento de interfaz (cobalto `#2f5bd3`); el color saturado se reserva para la física (fases, espectros) y para los bloques del temario. Sombras cortas (tres elevaciones), radios 10/16 px, escala tipográfica 13–48 px.
- **Tipografía**: Inter Tight variable (autoalojada) para todo; JetBrains Mono solo para magnitudes y datos. Instrument Serif retirada.
- **Visor de laboratorio**: la escena 3D se dibuja en un panel pizarra redondeado a la izquierda del panel de control. Motivo: nubes, espectros y emisiones necesitan fondo oscuro para ser legibles, pero eso no justifica una interfaz negra. Las etiquetas sobre el visor usan tokens locales de tinta clara.
- **Inicio**: página de estudio. Acción principal elegida por el motor (recomendación explicable → repaso vencido → primer paso), simulacro, repaso, 7 laboratorios + campaña, dominio por bloque con su significado («orientativo, no es una nota»), competencias con intervalo y errores repetidos.
- **Navegación**: raíl lateral (escritorio e iPad) con todo a un clic; búsqueda global con índice local, sinónimos de clase y resultados agrupados en teoría / laboratorio / práctica.
- **iPad**: horizontal con raíl + visor + panel; vertical con visor arriba y panel abajo; la barra inferior queda solo para móvil.
- **Defecto propio corregido**: el aviso «Se ha perdido el contexto gráfico» aparecía al salir de cualquier laboratorio (era la liberación intencionada del contexto al desmontar).
- Capturas: `docs/capturas/antes/` frente a `c3b`–`c3e` (escritorio, iPad horizontal y vertical).

## 4. Ciclo 4 — Pedagogía
**Fórmulas.** KaTeX daría la máxima fidelidad, pero añade ≈ 270 kB de JavaScript y sus fuentes para un temario que solo necesita fracciones, potencias, subíndices, raíces y letras griegas. `MathText` implementa ese subconjunto (parser puro, probado, que nunca ejecuta código).

**Resoluciones.** Bloques etiquetados (qué piden, datos, principio, por qué esta fórmula, despeje, unidades, sustitución, cálculo, resultado, interpretación, comprobación, errores) usados según la necesidad del problema, y métodos alternativos con su ventaja (p. ej., la línea sin serie: por regiones o probando cada n₁).

**Familias nuevas (10).** Cada una exige un razonamiento distinto, no otra sustitución numérica:
| Familia | Qué obliga a hacer |
|---|---|
| error-rydberg | Revisar una resolución ajena, localizar el primer error, clasificarlo y corregirlo |
| pistas-elemento | Descartar candidatos con propiedades indirectas (periodo, desapareados, ion, bloque…) |
| ei-sucesivas | Leer saltos de EI (cocientes) para deducir electrones de valencia, grupo y elemento |
| linea-desconocida | Resolver con dos incógnitas fijando n₁ por la región o probando series |
| grafica-ei | Interpretar una gráfica real (NIST) y justificar las anomalías B/O o Al/S |
| bohr-proporciones | Razonar con proporcionalidades sin calcular valores absolutos |
| luz-ionizante | Conectar kJ/mol con la energía de un fotón (EI → λ máxima) |
| ion-misterioso | Ir del ion al átomo: Z, neutrones, desapareados y configuración (4s antes que 3d) |
| prediccion-modelos | Predecir con un modelo histórico y contrastar con el experimento |
| desarrollo | Escribir una justificación y autoevaluarla con rúbrica |

Las pruebas de estas familias encontraron dos defectos propios antes de publicarlas: el método B aceptaba n₂ ≈ 1,03 como «entero» y el cobre era indistinguible del escandio con las pistas disponibles.

**Desarrollo.** No hay corrección semántica automática y la interfaz no la finge: ATOM sugiere qué criterios *parecen* presentes por palabras clave y el alumno marca los que su texto cumple. El crédito es la fracción ponderada de la rúbrica.

**Modos.** Guiado (paso a paso y primera pista visible), autónomo, desafío (pistas y teoría tras dos fallos), revisión (resolución completa, no cuenta para el progreso) y examen.

**Simulacros.** Seis perfiles: equilibrado, numérico, razonamiento, exigente, estilo EBAU (con las cuestiones reales de 2021 y 2025) y puntos débiles (desde el dominio estimado, declarando cuándo hay poca evidencia). Las preguntas de desarrollo no entran en exámenes cronometrados.

**Pistas.** Una prueba recorre todo el banco: la primera pista no puede contener el resultado, la opción correcta (salvo que defina todas) ni datos sustituidos. Encontró y se corrigieron las pistas de EBAU-3 a y EBAU-2 (2025).

## 5. Laboratorios 3.0 (primera pasada)
- **Time Machine**: recorrido de 7 pasos por modelo (qué se sabía → problema → hipótesis → *predicción del alumno* → observación → interpretación → limitaciones → siguiente modelo) y matriz fenómeno × modelo con la razón de cada veredicto. Revisión histórica: los casos dudosos se marcan «fuera de alcance» y no «✗».
- **Electron Architect**: 11 desafíos (construir, excepciones, iones, excitados con condiciones, reparar Pauli/Hund/Aufbau nombrando antes la regla). Durante el desafío se ocultan el objetivo y el llenado automático.
- **Mass Spectrometry**: muestra desconocida X (siete elementos de dos isótopos): identificar por la masa media MEDIDA y deducir abundancias con la media fijada; se distinguen abundancia natural, medida e intensidad ilustrativa.
- **Quantum Space**: dos orbitales a la vez con la misma escala (tamaños relativos reales) y P(r) superpuestas; parejas didácticas.
- **Photon Lab**: identificar elementos y mezclas comparando con espectros NIST de referencia (familia `espectro-problema`, con prueba de identificabilidad para las 15 muestras posibles); acceso desde el espectroscopio.
- **Periodic Universe**: vista de tendencias (radio, EI₁, χ, AE, Z_ef) por periodo o grupo; las excepciones se detectan EN LOS DATOS y se explican con el comparador razonado.
- **Atomic Forge**: comparación de hasta tres especies con las diferencias resaltadas y su relación (isótopos, iones, isóbaros, isótonos, isoelectrónicas).
- **Ruta de estudio integrada** (§11): comprender → observar (con predicción) → guiado → aplicar → nivel examen → consolidar con refuerzo de la competencia más fallada.

## 6. Ciclo 6 — Mediciones (SwiftShader; solo comparativas)
Misma herramienta (`tools/perf.mjs`), misma máquina y mismo renderizador por software que en ATOM 2.0. Datos: `docs/mediciones/perf-final.json` (2.0) frente a `perf-atom3-ciclo6.json` (3.0).

| Vista | fps 2.0 → 3.0 | p95 fotograma (ms) | memoria JS (MB) |
|---|---|---|---|
| Inicio | 2,2 → **60,3** | 583 → **16,7** | 20 → **9** |
| Forja | 6,6 → 6,8 | 183 → 183 | 25 → 20 |
| Photon (ondas) | 6,2 → 7,4 | 233 → 150 | 14 → 18 |
| Masas | 5,9 → 6,0 | 233 → 217 | 29 → 30 |
| Quantum | 5,1 → 4,7 | 233 → 250 | 24 → **16** |
| Periódico | 3,7 → 3,4 | 317 → 367 | 29 → **21** |
| Guía / Entrenamiento | 60 → 60 | 16,7 → 16,7 | 18 → 23 / 22 → 18 |

- El inicio ya no carga una escena 3D a pantalla completa: 60 fps y 9 MB. El atrio 3D sigue en `#/campana` (2 fps en SwiftShader, como antes).
- Laboratorios: sin cambio significativo. **Interacción en Quantum** (cambiar n): tarea larga máxima 0,9 s → 1,9 s. Perfil de CPU (CDP): el JavaScript propio suma < 30 ms; 6,7 s son «(program)», rasterización síncrona de SwiftShader. No es atribuible a nuestro código ni extrapolable a una GPU real.
- **No se afirma ninguna mejora de FPS en hardware real**: hace falta medir en un ordenador con GPU y en un iPad (pendiente).

## 7. Calidad verificable
- **Accesibilidad**: axe-core en 10 vistas, en CI. Encontró 4 problemas (aria-pressed en radios, contraste de una etiqueta, región desplazable sin teclado, salto de encabezados); 0 tras corregir.
- **Contraste**: prueba WCAG de los tokens en ambos temas; corrigió `--ink-faint` (4,26 → 5,0:1) y `--ok` (4,37 → 5,2:1).
- **Regresión visual**: 12 vistas deterministas (hora y aleatoriedad fijadas) con umbral 0,5 %; local, porque el renderizado de fuentes depende del sistema.
- **Pruebas**: 790 unitarias (223 en 2.0), 33 comprobaciones e2e (23 en 2.0).

## 8. Pendiente
Véase `ATOM3-PROGRESS.md`.
