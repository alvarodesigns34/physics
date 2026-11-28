# ATOM 6.0 — Informe

Rama: `claude/determined-carson-j2d320`, a partir de `main` en `d178ecc` (ATOM 5.2; no había commits posteriores en `main`). **No se ha publicado en producción**: la fusión con `main` queda pendiente de autorización.

Entorno de todas las mediciones: contenedor Linux, Chromium (Playwright) con **SwiftShader** (GPU por software). **No hay mediciones en GPU real, Safari, WebKit ni iPadOS**: no estaban disponibles. «iPad» significa aquí Chromium con la ventana de un iPad (1180 × 820 y 820 × 1180) y eventos táctiles, no un iPad.

## 1. Resumen ejecutivo

- **Preparar examen** (`#/preparar`), sección nueva en el inicio y la navegación principal: 51 familias de problemas en los 7 bloques, cada una con competencia, motivo, dificultad, tiempo, errores habituales, presencia en tus fuentes (calculada, contada por pregunta) y tu preparación según tu evidencia, sin porcentajes. Sesiones de 15, 30, 60 y 90 min, imprescindibles antes del examen y la secuencia ejemplo guiado → otro equivalente sin ayuda → más exigente.
- **Cinco defectos reales corregidos**, cada uno reproducido antes con una prueba: estado incoherente en `gradeQuestion()`; corrector de procedimientos que acreditaba resultados fabricados con números redondos; cliente de Workers que se bloqueaba si fallaba `postMessage` y que abortaba la vista previa del mismo orbital; tipografía que componía superíndices y subíndices con dos fuentes; barra inferior móvil que dejaba fuera una pestaña.
- **Dos familias nuevas** con una estructura de razonamiento que no existía.
- **Simulacro**: ruta de repaso por familias y errores agrupados por tipo.
- **Publicación segura**: el despliegue ahora exige que pasen E2E, accesibilidad y resiliencia.
- **Quantum Space**: la latencia se ha descompuesto con mediciones. El 99 % es rasterizado por software y no hay mejora demostrable en este entorno. **Espectroscopio**: la regresión del 17 % de 5.2 no se reproduce.

## 2. Estado inicial (línea base, `d178ecc`)

`npm ci`, `typecheck`, 1358/1358 pruebas y `build` correctos. Capturas «antes» en `docs/capturas/antes-60/` (compilación de `d178ecc`). Las referencias visuales de 5.2 se conservan en `docs/capturas/referencia-52/`.

## 3. Fallos descubiertos y correcciones

| # | Gravedad | Fallo (reproducido) | Corrección | Prueba |
|---|---|---|---|---|
| 1 | Alta (nota/informe) | `gradeQuestion()`: con las respuestas directas vacías y un procedimiento válido, la pregunta obtenía 5,6/10 puntos y a la vez figuraba **«sin responder»**, contaba en `unanswered` y se atribuía a «sin terminar». El estado se calculaba aparte con `questionState()`, que ignora el procedimiento. | El estado se deriva de los mismos pasos que reciben crédito. | `examSession.test.ts` (3 casos, incluida la propiedad sobre todas las familias) |
| 2 | Alta (evaluación) | Corrector de procedimientos: «ν = 10^14 · 6 = 6·10^14 Hz» **acreditaba** el paso, porque 10¹⁴ y 6 cuentan como números «estructurales». Cualquier resultado de mantisa entera podía fabricarse. | Una operación debe usar al menos un dato, una constante (valor o símbolo) o un resultado anterior. Los métodos alternativos válidos (E = hc/λ, conversión directa) se siguen aceptando. | `procedure51.test.ts` (4 casos) y las 45 pruebas previas del corrector |
| 3 | Media (iPad) | `computeClient`: si `postMessage` lanzaba una excepción, `busy` quedaba en `true` y **ninguna petición posterior se atendía**; un `messageerror` tenía el mismo efecto. | Liberación y cálculo en el hilo principal; manejador de `onmessageerror`. | `computeClient.test.ts` |
| 4 | Media (iPad) | La versión refinada (220 ms después) **abortaba la vista previa del mismo orbital** si el Worker tardaba más de 220 ms: en un dispositivo lento la vista previa no llegaba nunca. | Opción `group`: dos versiones del mismo orbital no se abortan entre sí; un orbital distinto, sí. | `computeClient.test.ts` |
| 5 | Media (visual, todas las vistas) | Los subconjuntos de Fontsource de **todas** las familias probadas omiten U+2070–209F (⁴–⁹, ⁺, ⁻, ₀–₉), las flechas y ≥/≤: «2p⁶», «10⁻¹⁹» o «Fe²⁺» mezclaban dos tipografías, y en iPad la segunda depende del sistema. | Fuente propia subconjuntada desde Inter 4 completa (§5). | Comprobación del mapa de caracteres con fontTools; capturas |
| 6 | Media (móvil) | La barra inferior tenía `repeat(4, 1fr)`; al añadir «Examen», la quinta pestaña quedaba **fuera de la pantalla**. | Columnas automáticas. | E2E «las cinco pestañas caben en pantalla» |
| 7 | Baja (móvil) | La guía desbordaba en horizontal a 390 px: botones de lección con `nowrap`, más anchos con la fuente nueva. | Los botones se parten en dos líneas. | E2E existente |
| 8 | Baja | Caché: una entrada mayor que todo el presupuesto se quedaba guardada por encima del límite. | No se guarda. | `computeClient.test.ts` |
| 9 | Baja (laboratorio) | Espectroscopio: «Prisma de vidrio SF11» caía sobre la cara del prisma y «400 nm» sobre el haz de rayos. Tabla periódica: la pestaña «Átomos e iones» se partía en dos líneas. | Etiquetas recolocadas y pestañas en una línea. | Capturas `c60-5` |
| 10 | Arquitectura | `deploy.yml` solo ejecutaba las pruebas unitarias y la compilación: podía publicarse una regresión de E2E, a11y o resiliencia. | `ci.yml` es reutilizable (`workflow_call`) y el despliegue depende de él. | — |
| 11 | Documental | `01-matriz-cobertura.md` definía las especies isoelectrónicas como «misma configuración»; `sources2.ts` decía «isoelectrónicas: misma configuración». | Armonizado: mismo número de electrones (Ca y Ti²⁺ como contraejemplo). | `guideConsistency.test.ts` (existente) |

Mi propia prueba E2E nueva de «otro equivalente» falló una vez en 9 ejecuciones: comparaba el texto del enunciado, y `nivel-energia` tiene pocas combinaciones. Ahora comprueba la semilla nueva y el modo.

## 4. Ciencia

- Comprobación independiente frente a CODATA 2018 y NIST: E₁ = −13,598 eV; R_H = 1,09678·10⁷ m⁻¹; Hα = 656,47 nm (en vacío; 656,28 nm en aire, NIST); Lyα = 121,57 nm; límites de Lyman y de Balmer, 91,18 y 364,71 nm; configuraciones de Cr, Cu, Nb, Pd, Pt, Gd y Ce; cationes de transición (Fe²⁺/³⁺, Cu⁺/²⁺, Mn²⁺, Ti²⁺, Co³⁺ y Ag⁺, que pierden primero los electrones ns); EI₁, AE y χ de una muestra de 16 elementos. No se encontraron errores en el núcleo. Las auditorías científicas de 5.x (signos, series, Möller frente a Hund, A ≥ Z, fases y fronteras de los orbitales) siguen protegidas por sus pruebas.
- Las familias nuevas usan Eₙ = −13,6 eV/n², declarado en el enunciado.
- Hallazgo con la prueba de 600 semillas: el distractor 13,3 eV quedaba a 0,08 eV del salto 1 → 7 (13,32 eV). Se retiró antes de integrar la familia.

## 5. Diseño y experiencia

- **Tipografía.** Muestrario real con fórmulas, configuraciones, letras griegas y etiquetas pequeñas: Inter Tight (actual), Inter, Geist, IBM Plex Sans y Source Sans 3. Descartadas: **Geist**, por no tener griego (λ y ν salían de otra fuente), e **IBM Plex Sans**, por no tener ⁺ ni ⁻ voladitos (imprescindibles para iones). Entre Inter 4 y Source Sans 3, ambas completas, Inter tiene superíndices más legibles, más altura de x en etiquetas de 13 px y el eje de tamaño óptico (opsz), que ajusta los titulares sin tracking forzado. **Elegida: Inter 4**, subconjuntada por el proyecto (latín, griego, super/subíndices, flechas y operadores): 131 kB, frente a los 135 kB que pesaban latin + latin-ext de Inter Tight. Complemento de 11 kB para JetBrains Mono. El tracking de titulares pasa de −0,035 a −0,018 em (estaban apelmazados) y los 13 valores sueltos de `letter-spacing` usan ahora los dos tokens.
- **Sistema de diseño.** Los selectores redefinidos en varias capas bajan de 34 a 21. Los botones se definen una sola vez (antes, `07-depth.css` redefinía `.btn`, `.btn--primary`, `.btn--ghost`, `:hover` y `:active`). Fuera estilos muertos (fondo y retícula de `.page-bg`, que la capa 09 anulaba; `letter-spacing` duplicados en `.display` y `.brand__mark`; `.stack-24` y `.formula__expr` repetidos; `.topbar` repartido en tres archivos). **Regresión visual: 0,000 % en las 12 vistas de referencia** tras cada fusión. No se añadió ninguna capa de sobrescritura: `15-prep.css` solo contiene clases nuevas (`.prep-*`).
- **Inicio.** Recomendación del motor + **Preparar examen** (con el siguiente imprescindible) + simulacro y repaso compactos, y **Retomar** con el último punto de estudio exacto (ruta y apartado).
- **Navegación.** «Examen» en el raíl, la barra móvil y la búsqueda global (la página y sus siete bloques).
- **Validación visual.** Capturas en 1440 × 900, 1920 × 1080, iPad horizontal y vertical, móvil 390 × 844, tema oscuro y texto al 130 %: `docs/capturas/c60-1` a `c60-5` y `atom6-final` (63 capturas: 21 vistas × 3 formatos, sin errores de página). Comparación con 5.2: `antes-60` frente a `c60-1`/`atom6-final`.

## 6. Preparar examen

Lógica pura y probada en `src/learning/examPrep.ts`; vista en `src/modules/prep/Prep.tsx`.

- **Tres ejes que no se mezclan.** (1) Importancia curricular: esencial, tipo examen o exigente, y examinable o de ampliación según la profundidad que fija TEO en la matriz (De Broglie, Heisenberg cuantitativo y Slater = ampliación). (2) **Presencia en tus fuentes**: se calcula contando preguntas distintas de TEO, AMP, HOJ y EBAU que tocan los apartados centrales de la familia; AMP 12a–d o EBAU-1 a/b cuentan una vez (70 preguntas distintas en total). (3) Dificultad y tiempo, propiedades del problema. Nada se presenta como probabilidad de que salga.
- **Preparación según tu evidencia** (reglas probadas): sin intentos → «Sin practicar»; menos de 2 intentos sin ayuda → «Poca evidencia»; errores abiertos o fallos recientes → «A reforzar»; «Sólida» exige acertar sin ayuda **dos enunciados distintos** (repetir el mismo puede ser memoria). Solo cuenta la evidencia de esa familia: no hay atribución cruzada entre familias que cubren muchos apartados.
- **Sesiones** de 15, 30, 60 y 90 min: por prioridad, sin repetir bloque hasta cubrirlos, en modo guiado si no hay evidencia, sin ayuda si la hay y exigente si ya es sólida.
- **Imprescindibles**: la familia más prioritaria de cada uno de los siete bloques y, después, hasta 10 en total.
- **Secuencia de familia** en el entrenamiento (`?gen=&d=&modo=&s=`): ejemplo guiado → otro equivalente sin ayuda (semilla nueva) → más exigente, con teoría, laboratorio y tus errores.
- **Familias nuevas** (`generators/atom6.ts`): *absorción desde el estado fundamental* (qué fotones absorbe un átomo en n = 1, con una línea de Balmer como distractor que parece útil; emisión posterior; energía cinética del electrón arrancado) y *contar electrones con números cuánticos* (n, l, n + l y desapareados sobre la configuración real, incluidos Cr y Cu; no pregunta por m_l ni m_s, que en subniveles incompletos dependen de una convención). Comprobadas con 600 semillas por dificultad y recálculo independiente.

## 7. Simulacros y evaluación

- Corrección de `gradeQuestion()` (§3.1) y del corrector de procedimientos (§3.2).
- El informe añade una **ruta de repaso**: preguntas ordenadas por puntos perdidos, el error habitual de su familia, ejemplo guiado y otro enunciado sin ayuda. Los errores se agrupan en conceptuales, algebraicos o de cálculo, de unidades y de presentación, con un consejo según el grupo dominante. Solo aparece tras entregar: en el simulacro en curso no se filtra nada.
- Los seis perfiles, el guardado automático y la recuperación no cambian (cubiertos por E2E).

## 8. Laboratorios

Barrido visual de los once laboratorios y sus pestañas con la tipografía nueva (`c60-4`, escritorio e iPad vertical). Correcciones: etiquetas del espectroscopio y pestañas de la tabla periódica (§3.9). La tabla periódica en iPad horizontal deja espacio libre arriba, pero está limitada por el ancho del visor: acercar la cámara recortaría columnas, así que se mantiene. **No se han reconstruido escenas en esta versión**: el esfuerzo se dedicó a la preparación del examen, la evaluación y los defectos medidos. Es la principal limitación respecto a lo pedido.

## 9. Rendimiento y memoria

**Quantum Space** (`docs/mediciones/quantum-60-descomposicion.txt`). Por cambio de orbital: JavaScript total 30–44 ms; todas las llamadas WebGL 1–2 ms; 0 programas de sombreado nuevos (11 → 11); estilo y maquetación < 10 ms; cálculo de la superficie 40–90 ms (56³). El resto, ≈ 3,2 s de una tarea de 3,3–5,8 s, es tiempo nativo del rasterizado por software, que bloquea el hilo principal. La respuesta del Worker llega siempre justo al acabar esa tarea. Conclusión: en este entorno **no hay mejora demostrable**, y la latencia no es representativa de una GPU real. Cambios hechos (§3.3–3.4 y §3.8) y presupuestos de caché de 96 → 64 MiB nominales, según tamaños medidos (orbital a 56³ ≈ 1 MiB; subnivel a 48³, 3–5 MiB).

**Espectroscopio** (`docs/mediciones/perf-60-espectroscopio.json`, tres ejecuciones intercaladas): p95 al arrastrar 5.2 = 200 / 200 / 200 ms; 6.0 = 200,1 / 183,3 / 216,7 ms. **La regresión de 5.2 (233 ms) no se reproduce**: el p95 está cuantizado en pasos de 16,7 ms y 200 → 233 son dos escalones. Se probó reducir el filtrado anisótropo de la mesa (×8 → ×4): 200 / 199,9 / 200 ms, sin efecto. Se revirtió para no perder nitidez.

**Memoria, 30 recorridos por los 11 laboratorios** (`docs/mediciones/perf-60-memoria-30.json`): 17,1 → 22,9 MB (5.2: 16,7 → 22,5 MB). Recursos de GPU idénticos en los 30 ciclos (22 geometrías, 21 texturas, 16 programas), un solo lienzo y 420 nodos DOM. Mismo patrón que 5.2: no se fugan recursos de la aplicación, pero **la estabilización completa sigue sin demostrarse**. Los recorridos son de navegación; no he hecho el recorrido largo con interacciones que se pedía.

**Banco del núcleo** (`docs/mediciones/bench-60.txt`): el código medido no ha cambiado; las diferencias con `bench-final.txt` son ruido (n = 3).

## 10. Pruebas y verificación (compilación final)

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | sin errores |
| `npm test` | **1412 / 1412** (5.2: 1358) |
| `npm run build` | correcto |
| `npm run e2e` (escritorio y móvil, 57 llamadas a `check`) | superada (10 de 11 ejecuciones; el fallo intermitente se corrigió, §3) |
| `npm run a11y` (39 vistas, claro, oscuro y simulacro; incluye Preparar examen y las familias nuevas) | **0 infracciones** |
| `npm run resilience` | superada |
| `npm run visual` | 12/12 a 0,000 %, tras actualizar las referencias por el cambio de tipografía (revisado una a una; las de 5.2 se conservan en `referencia-52/`) |
| `npm run bench`, `npm run stats` | ejecutados |

## 11. Persistencia

Sin cambios de esquema: misma clave `atom:v1` y versión de datos 2. No se ha modificado ningún identificador ni semilla de ejercicio existente: las familias nuevas tienen identificadores nuevos, y `exerciseFromId` reconstruye los antiguos igual (pruebas existentes). «Retomar» (`atom:last`) y la duración de sesión (`atom:prep-min`) son comodidades locales: si fallan, no afectan al progreso. Las pruebas de fusión e importación de 5.2 siguen en verde.

## 12. Limitaciones y riesgos residuales

- **Sin GPU real, Safari, WebKit ni iPadOS**: nada de lo medido aquí equivale a un iPad.
- Laboratorios revisados y corregidos en lo detectado, pero **no reconstruidos**. Sin presets nuevos ni gráficas sincronizadas nuevas.
- Latencia de Quantum en GPU real: sin medir.
- Memoria: crecimiento lento sin explicar del todo. Falta el recorrido largo con interacciones.
- Las sesiones y prioridades del centro son reglas razonadas y explícitas, no un modelo validado con alumnos.
- No se ha recalibrado el modelo 3PL ni el motor adaptativo: se auditó la parte de evaluación (§3), no la calibración.
- Siguen 21 selectores redefinidos entre capas CSS; los restantes requieren revisar vistas que la regresión visual no cubre.

## 13. Rama y commits

Rama `claude/determined-carson-j2d320`, sobre `d178ecc`:

```
c75f108 Simulacro: estado coherente con el crédito; isoelectrónicas; publicación condicionada
9683b5c Centro «Preparar examen»; familias nuevas; Retomar
1ed543f Tipografía Inter 4 completa; E2E y a11y del centro; referencias visuales
6bdce0a Quantum Space: cliente de Workers y presupuestos
86f8530 Corrector de procedimientos: operaciones fabricadas
2a78c3e Simulacro: ruta de repaso y tipos de error
5960fbf CSS: botones unificados y estilos muertos
0910bd2 Móvil: barra inferior y sesión
5cb8522 Laboratorios: etiquetas y pestañas
(+ commit de este informe, mediciones, README y estadísticas)
```

Para publicar: fusionar la rama en `main`. El flujo de despliegue ejecutará antes todas las comprobaciones.
