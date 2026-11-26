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

## 3. Pendiente
Véase `ATOM3-PROGRESS.md`.
