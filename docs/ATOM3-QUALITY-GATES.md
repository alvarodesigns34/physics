# ATOM 3.0 — Criterios de aceptación (reproducibles)

Cada criterio indica cómo verificarlo. Estado: ✅ cumple · ⏳ pendiente · ✗ no cumple.

| # | Área | Criterio | Verificación | Estado |
|---|---|---|---|---|
| G1 | Corrección | `npx vitest run` sin fallos; ninguna prueba debilitada (las modificadas se justifican en el commit) | CI job `check` | ✅ 857 |
| G2 | Tipos | `tsc --noEmit` limpio | `npm run typecheck` | ✅ |
| G3 | E2E | `node tools/smoke.mjs` todas las comprobaciones | CI job `e2e` | ✅ 30 (local) |
| G4 | Auditoría | P0.1–P1.6 con prueba de regresión en `src/learning/audit3.test.ts` | vitest | ✅ |
| G5 | Exámenes | Ningún enunciado contiene «Sol.»/«Solución:» ni el resultado (≥ 4 cifras) | audit3 P0.2 | ✅ |
| G6 | Diagnóstico | Informe de examen = evidencia de `buildEvidence` (misma fuente) | audit3 P0.3 | ✅ |
| G7 | Rendimiento | Ningún cálculo > 50 ms en el hilo principal al cambiar de orbital | perfil CDP (ciclo 6) | ✅ JS propio < 30 ms; las tareas largas son rasterizado de SwiftShader. 60 fps en GPU real: **sin medir** |
| G8 | Diseño | Tema claro por defecto; contraste texto ≥ 4,5:1 (AA) en tokens de texto | `src/styles/contrast.test.ts` (ambos temas) | ✅ (corrigió 2 tokens) |
| G9 | Diseño | Sin Instrument Serif; cuerpo ≥ 16 px en escritorio | inspección CSS + capturas | ✅ |
| G10 | UX | Desde el inicio, ≤ 1 clic a: continuar, cada laboratorio, guía, examen, fórmulas, errores | capturas + e2e («Inicio: siete laboratorios…») | ✅ |
| G11 | Búsqueda | «Rydberg», «Hund», «isótopos», «energía de ionización» devuelven teoría + laboratorio + práctica | `search.test.ts` + e2e | ✅ |
| G12 | iPad | 1180×820 y 820×1180 sin desbordes horizontales; objetivos táctiles ≥ 44 px | capturas `despues/*-ipad` y `*-ipadv` | ◐ desbordes revisados visualmente; tamaño táctil sin verificar automáticamente |
| G13 | Accesibilidad | axe-core sin violaciones serias/críticas en 10 vistas | `npm run a11y` (CI) | ✅ 0 infracciones (revisión con lector de pantalla pendiente) |
| G14 | Regresión visual | 12 vistas deterministas (escritorio + iPad) con umbral 0,5 % | `npm run visual` (local; referencias ligadas a este entorno) | ✅ |
| G15 | Documentación | Cifras (ejercicios, generadores, pruebas) generadas desde el código | `npm run stats` → docs/ESTADISTICAS.md | ✅ |
| G16 | Producción | `main` sin cambios hasta autorización expresa | `git log origin/main` | ✅ |
