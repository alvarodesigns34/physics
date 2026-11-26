# ATOM · Segunda generación — registro de progreso

Documento vivo. Registra la línea base, los hallazgos verificados, las decisiones, las mediciones y lo
pendiente, para que cualquier persona (o agente) pueda continuar el trabajo sin perder contexto.

Rama de trabajo: `claude/proyecto-atom-interactive-830d7u` (reiniciada desde `main` = `21f9104`).
Producción (GitHub Pages, `main`) **no se modifica** sin autorización explícita.

---

## 1. Línea base (ciclo 1)

Entorno de medición: contenedor Linux, Node 22, Chromium de Playwright con **SwiftShader** (GPU por
software). Las cifras de fotogramas solo sirven para comparar versiones en esta misma máquina; no
representan una GPU real.

| Comprobación | Resultado |
|---|---|
| `tsc --noEmit` | sin errores (4,7 s) |
| `vitest run` | 177 pruebas superadas (3 ficheros) |
| `vite build` | correcto; `motor-3d` 1 164,7 kB (322,3 kB gzip), `registry` 161,8 kB (58,5 kB gzip), `index` 71,8 kB, CSS 37,3 kB; `dist/` 2,4 MB |
| `npm run e2e` (prueba de humo) | 20/20 (esperas fijas; no se ejecuta en CI) |

### Cálculo científico (Node, un hilo; `npm run bench`, mediana)

| Operación | Tiempo |
|---|---|
| `orbitalGrid` 3d, 72³ | 51,8 ms |
| `orbitalGrid` 3p, 56³ | 23,2 ms |
| `orbitalGrid` 4f, 40³ | 7,3 ms |
| Superficie 3d_z² (rejilla + marching cubes), 72³ | 48,8 ms |
| Subnivel 3d completo (5 superficies), 48³ | 100,5 ms |
| `sampleOrbital` 3d, 52 800 puntos | 35,6 ms |
| `atomDensity` Fe, 20 000 puntos | 5,9 ms |
| Prisma + 400 rayos | 0,6 ms |

### Navegador (SwiftShader, 1440×900, calidad «media»; `node tools/perf.mjs`)

| Ruta | listo (ms) | fps | p95 fotograma (ms) | tareas largas en 3 s | máx. (ms) | heap (MB) |
|---|---|---|---|---|---|---|
| Atrio | 414 | 2,2 | 583 | 6 | 582 | 17 |
| Forja | 1495 | 6,3 | 200 | 20 | 185 | 18 |
| Time Machine | 778 | 6,1 | 217 | 19 | 217 | 21 |
| Photon · Ondas | 750 | 6,7 | 183 | 21 | 183 | 16 |
| Photon · Espectroscopio | 713 | 2,8 | 500 | 7 | 453 | 26 |
| Masas | 1211 | 5,8 | 267 | 17 | 261 | 29 |
| Quantum | 756 | 5,0 | 250 | 14 | 241 | 56 |
| Arquitecto | 850 | 6,4 | 200 | 19 | 189 | 44 |
| Periódico | 696 | 3,7 | 350 | 11 | 341 | 58 |
| Guía (bloque 3) | 954 | 60,1 | 16,7 | 0 | 0 | 47 |
| Entrenamiento | 385 | 60,5 | 16,7 | 0 | 0 | 15 |

Interacción en Quantum Space (clic → dos fotogramas): cambiar n = 3960 ms, cambiar l = 3520 ms,
subnivel completo = 4242 ms, con tareas largas de hasta 1,0–1,3 s. Con renderizado por software
domina el coste de GPU, pero el cálculo síncrono en el hilo principal (≈ 50–100 ms en esta CPU, varias
veces más en un móvil) también bloquea la interfaz.

---

## 2. Auditoría curricular (fuentes reanalizadas)

Materiales localizados y leídos completos (texto extraído con `pdftotext` e inspección visual de las
páginas con tablas en imagen):

| Documento | Páginas | Estado |
|---|---|---|
| T1. Estructura atómica. El sistema periódico. Teoría 26-27 | 23 | Leído completo |
| T1. Ejercicios de ampliación y repaso | 4 | Leído completo; tablas de los ejercicios 2–5 inspeccionadas visualmente |
| Póster «Modelos atómicos» (R. Alcaraz de la Osa, fisiquimicamente) | 1 | Leído |
| Póster «Sistema periódico y configuración electrónica» (ídem) | 1 | Leído |

No hay más materiales disponibles en el entorno.

### Omisiones detectadas en la cobertura de ejercicios originales

- **AMP 2–5 (tablas):** 28 filas en total (4 + 10 + 5 + 9); solo 8 estaban implementadas con sus datos originales.
  Faltan: AMP 2 U; AMP 3 B, Al, Ar, Be, Ba, U, Sr, P; AMP 4 Cl⁻, Ca²⁺, K⁺; AMP 5 Cl, K, Ar, Cl⁻, Hg, Cs, S²⁻.
- **TEO (ejercicios de la teoría):** faltan 2b, 2c, 3, 4, 5a–c, 6a–d, 19a, 20a–b.
- **Póster del sistema periódico:** estado físico a temperatura ambiente y elementos radiactivos/sintéticos
  no aparecían en la tabla de la aplicación.

### Discrepancias nuevas (se suman a E1–E22 de `01-matriz-cobertura.md`)

| Id | Fuente | Texto | Análisis |
|---|---|---|---|
| E23 | TEO p.8 | «La intensidad de las líneas es proporcional al número de átomos» | Simplificación: la intensidad depende también de la probabilidad de transición, de la población del nivel (temperatura) y de la autoabsorción. Solo es aproximadamente proporcional en muestras ópticamente delgadas y condiciones fijas. |
| E24 | TEO p.10 | ΔE = h·c·R·(…) con c = 299 792 458 m/s, mientras el resto del tema usa c = 3·10⁸ m/s y R = 1,097·10⁷ m⁻¹ | Constantes mezcladas; afectan a la 4.ª cifra. Se conservan los datos de cada enunciado. |
| E25 | Póster modelos | «Muy pocas (1/10 000 aprox.) se desviaban más de unos 10°» | Cifra orientativa: la fracción depende del espesor de la lámina y de la energía de las α. El dato histórico más citado (Geiger y Marsden, 1909) es ≈ 1 de cada 8 000 α reflejadas (> 90°) con una lámina de platino. |
| E26 | TEO p.20 | Radio iónico explicado solo por el apantallamiento | Explicación de clase aceptable; la rigurosa añade la menor repulsión interelectrónica y, sobre todo, que muchos cationes pierden la capa externa completa (Na → Na⁺ pierde la capa n = 3). |

---

## 3. Hallazgos técnicos verificados

Gravedad: **C** crítica · **A** alta · **M** media · **B** baja.

| Id | Hallazgo | Verificado | Gravedad | Estado |
|---|---|---|---|---|
| T1 | `instruments.ts`: el integrador documentado como «Verlet de velocidad» es Euler semimplícito; la posición en pantalla no se interpola (el último paso sobrepasa x = L + D); el choque con la placa no se localiza; `exitY === 0` se usa como centinela | Sí | A | **resuelto** (Boris, ver §5) |
| T2 | `massSpec.ts`: suma de abundancias nula → `normalizedValue = NaN`; no se rechazan valores no finitos; `twoIsotopeAbundance` divide por cero si m₁ = m₂ | Sí | M | **resuelto** |
| T3 | `prism.ts`: dominio de Sellmeier (370–2500 nm) no validado; intersección con rectas infinitas, no con las caras; los usos con `!` fallan si hay reflexión total | Sí | M | **resuelto** |
| T4 | `Quantum.tsx`: `orbitalGrid` + marching cubes síncronos en `useMemo`; sin caché ni cancelación | Sí (medido) | A | **resuelto** (Worker) |
| T5 | `store.ts`: importación sin validación estructural ni semántica; `migrate` es la identidad | Sí | A | **resuelto** |
| T6 | `session.ts`: `sort(() => rng() − 0,5)`; en exámenes por bloques entran ejercicios de fuentes cuyo ámbito solo coincide parcialmente | Sí | M | **resuelto** |
| T7 | `store.recordAttempt`: un booleano global actualiza todos los nodos de un problema compuesto | Sí | A | **resuelto** |
| T8 | E2E fuera de CI, con esperas fijas | Sí | M | **resuelto** |
| T9 | Calidad automática: solo degrada, nunca se recupera; sin histéresis | Sí | M | **resuelto** |

---

## 4. Decisiones

- Las constantes de los ejercicios (`EXERCISE_DATA`, `THEORY_DATA`) **no** se actualizan a CODATA: reproducen
  los resultados de clase. Las simulaciones usan CODATA 2018 (`SIM_CONSTANTS`).
- Motor adaptativo determinista y explicable; no se introduce IA generativa.

---

## 5. Registro de ciclos

### Ciclo 1 · Línea base
Auditoría del repositorio, banco de rendimiento (`npm run bench`), medición en navegador
(`tools/perf.mjs`), reanálisis completo de las fuentes y clasificación de hallazgos (§2–§3).

### Ciclo 2 · Fundamentos
- **T1** Tubo de rayos catódicos con el método de Boris; pruebas contra soluciones analíticas
  (deflexión eléctrica exacta < 1e-9, circunferencia magnética < 1e-5, campos compensados < 1e-12 m,
  convergencia, choque en la placa, haz que se curva hacia atrás, entradas inválidas).
- **T2/T3** Validación de dominio en masa media y prisma (Sellmeier 370–2500 nm, caras reales, motivo
  físico cuando un rayo no llega).
- **T4** Marching cubes propio (probado contra una esfera exacta y contra three.js, triángulo a triángulo),
  umbral de probabilidad en O(N) y Web Worker con caché LRU, descarte de peticiones y refinado progresivo.
- **T5** Validación estructural y semántica del progreso, migración tolerante v1→v2, límite de 2 MB y
  «Deshacer importación».
- **T6** Fisher–Yates reproducible (χ² de 24 permutaciones), exámenes sin contenido fuera del ámbito,
  semillas visibles.
- **T7** Evidencia por paso, competencia y apartado; dominio con intervalo e indicador de evidencia;
  diagnóstico con grafo de prerrequisitos y recomendaciones explicadas.
- **T8** Prueba de humo con esperas observables (23 comprobaciones) y trabajo e2e en CI.
- **T9** Calidad automática con histéresis y recuperación ante pérdida del contexto WebGL.

### Ciclo 3 · Material nuevo y transformación
- Hoja del tema (HOJ 1–28) y EBAU de La Rioja (2021, 2025) con sus datos: 62 ejercicios nuevos; las 28
  filas de las tablas AMP 2–5 completas. Soluciones verificadas contra las del enunciado.
- Problema inverso de Rydberg (n₂ desde λ o ν, y n₁ desde n₂ y λ) en pasos guiados; widget
  «Despeja n₂ paso a paso»; ejemplos resueltos AMP 9 y HOJ 11.
- Notas de rigor en tres niveles (apuntes, examen, rigor) para 14 discrepancias.
- Quantum Space: fracción de probabilidad elegible (50–95 %) con la fracción realmente encerrada.
- Atomic Forge: comparación neutro ↔ ion con radios reales.
- Periodic Universe: estado a 25 °C y radiactividad (como el póster).
- Navegación inferior en móvil; foco visible; ayuda de cada modo del Entrenamiento.

### Discrepancias de la hoja nueva
| Id | Fuente | Análisis |
|---|---|---|
| E27 | HOJ 8 | «Estación de radio» con λ = 200 nm: es ultravioleta. El cálculo se conserva y la región lo revela. |
| E28 | HOJ 14c | ns² → grupo 2, pero el He (1s²) es del grupo 18. |
| E29 | HOJ 19 | El Ne en una serie de radios iónicos: su radio no es iónico; la regla «más Z, menor radio» se mantiene. |

---

## 6. Mediciones finales (mismo entorno y procedimiento que la línea base)

| Medida | Línea base | Final |
|---|---|---|
| Pruebas | 177 | 213 |
| Prueba de humo | 20 (esperas fijas) | 23 (esperas observables), también en CI |
| `orbitalGrid` 3d 72³ | 51,8 ms | 25,9 ms |
| Superficie 3d 72³ (cálculo total) | 48,8 ms en el hilo principal | ≈ 45–56 ms **en un Worker** (0 ms en el hilo principal) |
| Fragmento principal `index` | 71,8 kB (24,1 kB gzip) | 55,0 kB (18,0 kB gzip) |
| Atrio listo | 414 ms | 239 ms |
| Memoria JS · Quantum / Arquitecto / Periódico / Guía | 56 / 44 / 58 / 47 MB | 24 / 20 / 29 / 18 MB |
| Interacción en Quantum (SwiftShader) | 3,5–4,2 s | 3,4–3,6 s |

Los tiempos de interacción en 3D están dominados por el renderizado por software de este entorno
(≈ 170–580 ms por fotograma); **no** se pueden extrapolar a una GPU real. El banco de Node tiene una
variación de ±20 % entre ejecuciones. Datos completos en `docs/mediciones/`.

---

## 7. Limitaciones y trabajo pendiente (por prioridad)

1. **Rendimiento en GPU real sin medir**: hace falta medir FPS y tareas largas en un portátil y un móvil
   reales (el entorno solo dispone de SwiftShader).
2. **Time Machine**: falta reestructurar cada modelo en los 7 pasos (conocimiento previo → hipótesis →
   experimento → resultado → interpretación → limitaciones → modelo siguiente) y contrastar predicciones
   de varios modelos en la misma escena.
3. **Electron Architect**: falta un modo de retos basado en los errores de las hojas (p. ej. Cu, Cr,
   cationes de transición) con diagnóstico por regla.
4. **Mass Spectrometry**: faltan los ejercicios inversos dentro del laboratorio (sí existen en el
   Entrenamiento: HOJ 7, abundancias a partir de M).
5. **Campaña**: revisar las 35 misiones para que cada una exija interpretar (no solo pulsar) y añadir
   misiones con el material nuevo (EBAU).
6. **Regresión visual automatizada**: hay capturas en cada ejecución e2e, pero no comparación con umbral.
7. **Accesibilidad**: falta una auditoría automática (axe) y una revisión con lector de pantalla.
8. **Ponderación del examen tipo**: es una propuesta; no hay criterios oficiales del profesor.

