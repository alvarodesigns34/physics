# ATOM 3.0 — Criterios de aceptación (reproducibles)

Cada criterio indica cómo verificarlo. Estado: ✅ cumple · ⏳ pendiente · ✗ no cumple.

| # | Área | Criterio | Verificación | Estado |
|---|---|---|---|---|
| G1 | Corrección | `npx vitest run` sin fallos; ninguna prueba debilitada (las modificadas se justifican en el commit) | CI job `check` | ✅ 615 |
| G2 | Tipos | `tsc --noEmit` limpio | `npm run typecheck` | ✅ |
| G3 | E2E | `node tools/smoke.mjs` todas las comprobaciones | CI job `e2e` | ⏳ re-ejecutar |
| G4 | Auditoría | P0.1–P1.6 con prueba de regresión en `src/learning/audit3.test.ts` | vitest | ✅ |
| G5 | Exámenes | Ningún enunciado contiene «Sol.»/«Solución:» ni el resultado (≥ 4 cifras) | audit3 P0.2 | ✅ |
| G6 | Diagnóstico | Informe de examen = evidencia de `buildEvidence` (misma fuente) | audit3 P0.3 | ✅ |
| G7 | Rendimiento | Ningún cálculo > 50 ms en el hilo principal al cambiar de orbital | perf trace (tools/perf.mjs) | ⏳ |
| G8 | Diseño | Tema claro por defecto; contraste texto ≥ 4,5:1 (AA) en tokens de texto | script de contraste sobre tokens | ⏳ |
| G9 | Diseño | Sin Instrument Serif; cuerpo ≥ 16 px en escritorio | inspección CSS + capturas | ⏳ |
| G10 | UX | Desde el inicio, ≤ 1 clic a: continuar, cada laboratorio, guía, examen, fórmulas, errores | capturas + e2e | ⏳ |
| G11 | Búsqueda | «Rydberg», «Hund», «isótopos», «energía de ionización» devuelven teoría + laboratorio + práctica | prueba unitaria del índice | ⏳ |
| G12 | iPad | 1180×820 y 820×1180 sin desbordes horizontales; objetivos táctiles ≥ 44 px | e2e con viewport iPad | ⏳ |
| G13 | Accesibilidad | axe-core sin violaciones serias/críticas en inicio, guía, entrenamiento | e2e + axe | ⏳ |
| G14 | Regresión visual | Capturas de referencia comparadas con umbral | tools/shots.mjs + comparación | ⏳ |
| G15 | Documentación | Cifras (ejercicios, generadores, pruebas) generadas desde el código | `npm run stats` | ⏳ |
| G16 | Producción | `main` sin cambios hasta autorización expresa | `git log origin/main` | ✅ |
