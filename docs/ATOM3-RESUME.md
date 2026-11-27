# ATOM 3.0 — Instrucción de reanudación

> Léelo entero antes de tocar nada. Es el punto de entrada para cualquier sesión que retome la tercera generación.

## Directiva (resumen fiel)
El usuario pidió (26/11/2026) la «ATOM 3.0 — MASTER DIRECTIVE»: transformación integral científica, pedagógica y de diseño. Puntos clave:

1. **Continuidad**: reanudación programada a las 02:35 Europe/Madrid (trigger `trig_01SaMnBxvEsLuQSWw2jeLpTe`, 27/11/2026). Mantener actualizados `08-tercera-generacion.md`, `ATOM3-PROGRESS.md`, `ATOM3-RESUME.md`, `ATOM3-QUALITY-GATES.md` tras cada ciclo.
2. **Dispositivos**: prioridad ordenador > iPad horizontal > móvil (baja; sin regresiones graves).
3. **Estética radical**: tema CLARO como experiencia principal (blancos cálidos, grises suaves, acentos científicos con función), sans-serif moderna (no Instrument Serif), sistema de diseño centralizado con tokens, sin estética genérica de IA (nada de gradientes violetas, glassmorphism excesivo, sombras enormes). Escenas 3D pueden tener fondo oscuro si la legibilidad lo exige. Tema oscuro opcional. Movimiento con intención y `prefers-reduced-motion`.
4. **UX**: página principal para estudiar (continuar, laboratorios, temario, progreso, competencias débiles, examen, fórmulas, ejercicios originales, errores). Navegación lateral de escritorio, búsqueda global de conceptos.
5. **Materiales**: re-analizar todo (T1, ampliación, pósteres, hoja de clase, EBAU); la matriz curricular es referencia, no límite.
6. **Ejercicios originales**: decenas de familias genuinamente distintas (inversos, detección de errores, interpretación de datos, multi-bloque, desarrollo...). Niveles 1–5 solo si el motor los distingue. Múltiples caminos aceptados.
7. **Explicaciones**: resolución estructurada (qué piden, datos, principio, despeje, unidades, sustitución, cálculo, interpretación, comprobación, errores); fórmulas bien renderizadas (evaluar KaTeX); pistas progresivas (la 1.ª no revela); modos guiado / autónomo / examen / revisión / desafío; feedback específico formulado como posibilidad.
8. **Desarrollo**: preguntas de respuesta escrita con rúbrica, conceptos esenciales, respuesta modelo y autoevaluación transparente (sin IA externa).
9. **Simulacros**: varios perfiles (equilibrado, numérico, razonamiento, compuesto, difícil, puntos débiles, por bloque, estilo EBAU), nota /10, crédito parcial, informe; ponderación marcada como propuesta; NUNCA soluciones en el enunciado.
10. **Estudio integrado**: comprender → observar → experimentar → practicar → error → comprender → repetir → consolidar.
11. **Auditoría externa (obligatoria, con prueba de regresión)**: P0.1 unidad-falta con valor erróneo da 75 % conceptual; P0.2 «Sol.» visible en enunciados usados en examen; P0.3 informe de examen agregado por ejercicio; P0.4 asimetría de cifras significativas; P1.1 ventanas >250 ms descartadas impiden degradar; P1.2 nube cuántica en hilo principal; P1.3 validación incompleta; P1.4 umbral con densidades repetidas; P1.5 buildExam puede devolver menos preguntas; P1.6 atribución granular incompleta; P2.1 docs desactualizadas (cifras generadas desde código); P2.2 regresión visual, a11y, CI, etc.
12. **Laboratorios 3.0**: Forge, Photon, Quantum, Time Machine (7 pasos por modelo), Electron Architect (desafíos), Periodic (vistas múltiples, multi-selección), Mass Spec (problemas inversos).
13. **Gráficos/rendimiento**: línea base antes de cambiar; render bajo demanda; pausar invisible; workers; medición honesta (SwiftShader solo comparativo).
14. **Campaña**: revisar las 35 misiones.
15. **Pruebas**: ampliar (no debilitar); Playwright escritorio + iPad.
16. **Inspección visual obligatoria** con capturas antes/después.
17. **Ciclos 1–9** (auditoría, fundamentos, diseño, pedagogía, 3D, optimización, inspección, adversarial, refinamiento).

## Restricciones permanentes
- Responder SIEMPRE en español.
- Rama: `claude/proyecto-atom-interactive-830d7u`. Push solo ahí. Sin force push.
- **NO publicar en producción (no fusionar en `main`) sin autorización expresa del usuario.**
- Sin servicios externos, claves ni costes. Sin `eval` de expresiones del usuario.
- No inventar mediciones, fuentes ni resultados.
- Commits con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` y `Claude-Session: https://claude.ai/code/session_01QDwEvNboyJCrCc3iFYyTjb`. Sin identificadores de modelo en el código.

## Estado (27/11/2026, tras la reanudación de las 02:35)
Hechos los ciclos 1–4, buena parte del 5–8 (ver ATOM3-PROGRESS.md). Siguiente: ciclo 9 (refinamiento) y la revisión de las 35 misiones. Nada publicado en `main`.

## Herramientas
`npm test` · `npm run build` · `npm run e2e` · `npm run a11y` · `npm run visual` (`--update` para nuevas referencias) · `npm run stats` · `node tools/shots.mjs <etiqueta> [desktop|ipad|ipadv]` · `node tools/perf.mjs <salida.json>`.

## Cómo retomar
1. `git status && git log --oneline -15` en la rama.
2. Leer `ATOM3-PROGRESS.md` → primera casilla sin marcar.
3. `npm ci` si falta `node_modules`; `npx vitest run`; `npm run build`; `node tools/smoke.mjs` (sirve `dist` con vite preview).
4. Capturas: `node tools/shots.mjs <etiqueta>` → `docs/capturas/<etiqueta>/`.
5. Trabajar, probar, commit, push, actualizar progreso.
