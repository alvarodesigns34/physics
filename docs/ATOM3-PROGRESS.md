# ATOM 3.0 — Progreso

Rama: `claude/proyecto-atom-interactive-830d7u` · Producción (`main`) intacta en `cdce04f` hasta autorización.
Última actualización: 27/11/2026 (reanudación de las 02:35).

## Ciclo 1 — Auditoría y línea base ✅
- [x] Cifras verificadas: 112 archivos, 223 pruebas, 129 ejercicios de fuentes, 54 apartados, 35 misiones.
- [x] Capturas «antes» (escritorio 1440×900): `docs/capturas/antes/` (herramienta `tools/shots.mjs`).
- [x] Hallazgo propio: aviso «Se ha perdido el contexto gráfico» visible en la Guía (sin escena 3D) — pendiente.
- [x] Hallazgo propio: los títulos de apartado quedan bajo la barra superior al saltar a un ancla — pendiente.

## Ciclo 2 — Fundamentos (auditoría externa) ✅
| Hallazgo | Estado | Commit | Prueba |
|---|---|---|---|
| P0.1 unidad-falta con valor erróneo | ✅ corregido | 00c2902 | audit3 «P0.1» (7 casos) |
| P0.2 «Sol.» en enunciados | ✅ campo `originalSolution`, auditoría de todo el banco | 00c2902 | audit3 «P0.2» (≈340 ejercicios) |
| P0.3 informe agregado | ✅ `aggregateNodeEvidence` común | 00c2902 | audit3 «P0.3» |
| P0.4 asimetría de cifras | ✅ `sigFigsAssessed` | 00c2902 | audit3 «P0.4» |
| P1.1 ventanas > 250 ms | ✅ clasificación por mediana + gracia de escena | 00c2902 | audit3 «P1.1» (5) |
| P1.2 nube en hilo principal | ✅ Worker + LRU + cancelación + vista previa | 478fd37 | audit3 «P1.2» |
| P1.3 validación incompleta | ✅ estructuras anidadas y relaciones | 478fd37 | audit3 «P1.3» (18) |
| P1.4 densidades repetidas | ✅ conjunto completo ρ ≥ u | 478fd37 | audit3 «P1.4» (4) |
| P1.5 exámenes incompletos | ✅ `buildExamDetailed` + aviso en UI | 478fd37 | audit3 «P1.5» |
| P1.6 atribución granular | ✅ `attribution.ts` + 4 incoherencias reales corregidas | d0392a6 | audit3 «P1.6» |
| P2.1 documentación | ✅ `tools/stats.mjs` → docs/ESTADISTICAS.md; README sin cifras manuales | | |
| P2.2 regresión visual / a11y / CI | ⏳ | | |

## Ciclo 3 — Sistema de diseño y experiencia ✅ (primera pasada, 6558b6f + siguientes)
- [x] `src/styles/tokens.css`: tema claro principal, oscuro opcional (Ajustes → Tema), escala tipográfica, espaciado, elevación, movimiento.
- [x] 101 colores fijos de `global.css` convertidos a tokens; Instrument Serif retirada (dependencia eliminada).
- [x] Visor de laboratorio (escena 3D en panel pizarra redondeado a la izquierda del panel); tinta del visor por tokens locales.
- [x] Inicio para estudiar (recomendación del motor, examen, repaso, laboratorios + campaña, temario por bloque, competencias, errores repetidos, accesos).
- [x] Raíl lateral escritorio/iPad + búsqueda global ⌘K / «/» (`src/learning/search.ts`, 7 pruebas).
- [x] iPad horizontal y vertical (visor arriba/panel abajo en vertical); barra inferior solo en móvil (≤ 760 px).
- [x] Aviso falso «contexto gráfico perdido» al cambiar de laboratorio: corregido.
- [ ] Partir `global.css` (≈ 3 600 líneas) en archivos por capa; retirar reglas muertas (`.topnav`, «capa de diseño 2»).
- [ ] Revisar contraste AA de todos los tokens con un script (G8).

## Ciclo 4 — Pedagogía ✅ (primera pasada: 7045916 y siguientes)
- [x] Fórmulas: `src/ui/MathText.tsx` (subconjunto LaTeX propio; KaTeX descartado por peso ≈ 270 kB + fuentes).
- [x] Resolución estructurada por bloques (`resolution`, `methods`) y `ResolutionView`.
- [x] Pistas: prueba permanente «la 1.ª no revela»; corregidas EBAU-2 (2025) y EBAU-3 a.
- [x] Modos guiado / autónomo / desafío / revisión (+ examen existente), selector persistente en la práctica.
- [x] Desarrollo con rúbrica, respuesta modelo, sugerencias por palabras clave declaradas como orientativas y autoevaluación (9 preguntas).
- [x] 10 familias nuevas de razonamiento (ver 08-tercera-generacion.md §3).
- [x] Simulacros por perfil (6) con ponderación declarada como propuesta.
- [x] Enlace directo `#/entrenamiento?gen=<id>`.
- [ ] Añadir `resolution` estructurada a los generadores antiguos más usados (Rydberg, ondas, masa media, configuración).
- [ ] Más familias: interpretación de espectros de varios elementos, cifras significativas, conversiones encadenadas, problemas inversos de masa espectrométrica dentro del laboratorio.
- [ ] Estudio integrado por concepto (comprender → observar → experimentar → practicar → error → consolidar).
- [ ] `level` 1–5 visible en la interfaz cuando se haya validado con datos de uso.

## Ciclo 5 — Laboratorios 3.0 ⏳
Forge · Photon · Quantum (comparación múltiple) · Time Machine (7 pasos por modelo) · Architect (desafíos) · Periodic (vistas, multiselección) · Mass Spec (inversos).

## Ciclos 6–9 ⏳
Optimización y medición · inspección visual (escritorio + iPad) · revisión adversarial · refinamiento.

## Pruebas
- Línea base: 223 vitest + 23 e2e. Actual: 709 vitest + 26 e2e (todas en verde). Cifras: `npm run stats` → docs/ESTADISTICAS.md.
