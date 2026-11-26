# ATOM 3.0 — Progreso

Rama: `claude/proyecto-atom-interactive-830d7u` · Producción (`main`) intacta en `cdce04f` hasta autorización.
Última actualización: 27/11/2026 (sesión inicial).

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
| P2.1 documentación | ⏳ cifras autogeneradas pendientes | | |
| P2.2 regresión visual / a11y / CI | ⏳ | | |

## Ciclo 3 — Sistema de diseño y experiencia ⏳ (siguiente)
- [ ] Tokens nuevos (tema claro principal, oscuro opcional), escala tipográfica sans (Inter Tight variable ya incluida; retirar Instrument Serif).
- [ ] Reorganizar `global.css` (2 905 líneas) en capas: tokens → base → componentes → módulos.
- [ ] Inicio para estudiar (continuar, laboratorios, temario, competencias débiles, examen, fórmulas).
- [ ] Barra lateral de escritorio + búsqueda global (Ctrl/⌘ K).
- [ ] Escenas 3D compatibles con fondo claro (o fondo oscuro acotado al lienzo).

## Ciclo 4 — Pedagogía ⏳
- [ ] Fórmulas renderizadas (evaluar KaTeX: peso vs. beneficio).
- [ ] Resolución estructurada por pasos (qué piden → comprobación).
- [ ] Pistas progresivas auditadas (la 1.ª no revela).
- [ ] Modos guiado / autónomo / examen / revisión / desafío.
- [ ] Preguntas de desarrollo con rúbrica y autoevaluación.
- [ ] Nuevas familias de ejercicios (objetivo: decenas, genuinamente distintas).
- [ ] Simulacros por perfil.

## Ciclo 5 — Laboratorios 3.0 ⏳
Forge · Photon · Quantum (comparación múltiple) · Time Machine (7 pasos por modelo) · Architect (desafíos) · Periodic (vistas, multiselección) · Mass Spec (inversos).

## Ciclos 6–9 ⏳
Optimización y medición · inspección visual (escritorio + iPad) · revisión adversarial · refinamiento.

## Pruebas
- Línea base: 223. Actual: 615 (vitest) · e2e pendiente de re-ejecutar tras rediseño.
