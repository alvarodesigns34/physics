# Traspaso a ATOM 5.1: contexto completo para un hilo nuevo

> Escrito al cerrar ATOM 5.0 (commit `3e26283`, rama `claude/proyecto-atom-interactive-830d7u`).
> Léelo entero antes de tocar nada. Después lee `docs/10-quinta-generacion.md`, el informe de la última generación.

## 1. Qué es ATOM
**ATOM, The Matter Experience**, es una aplicación web educativa e interactiva para estudiar el tema **T1, «Estructura atómica y sistema periódico»**, de **Física y Química de 1.º de Bachillerato** (currículo español; las cuestiones EBAU son de La Rioja).

Tiene cuatro partes:
- **Siete laboratorios 3D:**
  - Atomic Forge (construir átomos e iones);
  - Time Machine (modelos atómicos, tubo de Thomson, Geiger–Marsden);
  - Photon Lab (ondas, hidrógeno y espectroscopio);
  - Mass Spectrometry;
  - Quantum Space (orbitales);
  - Electron Architect (configuraciones electrónicas);
  - Periodic Universe (tabla periódica y tendencias).
- **Una campaña 3D** (atrio con 41 misiones).
- **Una guía de estudio** con 7 lecciones, 52 secciones y widgets.
- **Un centro de entrenamiento** con varias áreas:
  - práctica adaptativa;
  - ruta de estudio por concepto;
  - repaso espaciado;
  - simulacros profesionales;
  - cuaderno de errores;
  - progreso;
  - ejercicios de los documentos de clase.

El destinatario son alumnos de 1.º de Bachillerato, pero el propietario pide trabajar al máximo nivel sin rebajar la ambición por el público. **Plataformas prioritarias: ordenador e iPad**, tanto en vertical como en horizontal. El móvil es secundario.

## 2. Material fuente de la asignatura
El usuario compartió al principio del proyecto los documentos de clase, en PDF o fotografías. **No están como archivos en el repositorio**; su contenido está transcrito y referenciado:

| Código | Documento | Dónde vive en el repo |
|---|---|---|
| TEO | *T1. Estructura atómica. El sistema periódico. Teoría 26-27* (23 págs., fija el temario y su profundidad) | `src/learning/guide.ts`, `src/learning/syllabus.ts`, `docs/01-matriz-cobertura.md` |
| HOJ | Hoja de ejercicios del tema (ej. 1–28) | `src/learning/sources2.ts`, `src/learning/sources3.ts` |
| AMP | *T1. Ejercicios de ampliación y repaso* (31 ejercicios) | `src/learning/registry.ts` (SOURCE_EXERCISES), `sources*.ts` |
| EBAU | Cuestiones EBAU de La Rioja (2021 y 2025) del tema | `sources*.ts` (ref «EBAU…») |
| PMA / PSP | Pósteres «Modelos atómicos» y «Sistema periódico» (4.º ESO, complementarios) | `docs/01-matriz-cobertura.md` |

Las erratas detectadas en los apuntes están documentadas en las notas de rigor (`RIGOR_NOTES` en `guide.ts`). Si necesitas ver un documento original, pídeselo al usuario.

## 3. Restricciones permanentes (del usuario)
- **Responder SIEMPRE en español.**
- Trabajar solo en la rama `claude/proyecto-atom-interactive-830d7u`. **No** fusionar con `main` ni publicar en producción sin autorización expresa («publica»). Nada de push forzado.
- Sin servicios externos, claves, cuentas, costes ni dependencias de servidor. Sin `eval` sobre entradas del usuario.
- **No inventar mediciones, fuentes ni resultados.** No afirmar pruebas en GPU real, Safari ni iPadOS: aquí solo hay Chromium con SwiftShader (render por software). Las cifras de rendimiento solo sirven para comparar entre versiones.
- Commits incrementales que terminen con estas dos líneas:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: <url de la sesión actual>
  ```
  Ningún identificador de modelo en código, comentarios ni documentación.
- El correo del usuario es privado.
- Precisión científica no negociable. Distinguir siempre **CÁLCULO**, **APROXIMACIÓN** y **ESQUEMA** (componente `EpiTag` y etiquetas `stage-caption` en cada escena).

## 4. Stack y herramientas
- **Base:** Vite 8, React 19, TypeScript estricto, three.js con React Three Fiber (drei, postprocessing), zustand con persistencia (`atom:v1`, PROGRESS_VERSION 2), vitest y Playwright (Chromium en `/opt/pw-browsers`; usar `--use-gl=angle --use-angle=swiftshader`). axe-core en las dependencias de desarrollo.
- **Comandos:**
  - `npm run typecheck`
  - `npm test` (1217 pruebas)
  - `npm run build`
  - `npm run e2e` (`tools/smoke.mjs`)
  - `npm run a11y` (34 vistas, ambos temas)
  - `npm run visual` (`--update` para aceptar cambios intencionados)
  - `npm run resilience` (almacenamiento dañado y modo sin conexión)
  - `npm run stats`
  - `node tools/perf.mjs [salida.json]` (`PERF_ROUTES=/campana,...` para filtrar)
- **CI:** `.github/workflows/ci.yml` ejecuta tipos, pruebas, compilación, e2e, a11y y resiliencia. Estaba en verde al cerrar 5.0.
- **Estilos:** `src/styles/tokens.css` y `src/styles/global/01…12-*.css`, importados en orden desde `global.css`. El visor 3D usa tokens propios (`08-viewer.css`).
- **Renderizado bajo demanda:** `src/render/Stage.tsx` y `src/render/demand.ts` (`useContinuousRender`, `requestFrames`). Se instrumentan `window.__atomFrames`, `__atomGL` (llamadas, triángulos, geometrías, texturas, programas) y `__atomScene`.
- **Calidad adaptativa:** `useQuality()`, con los niveles alta, media y baja. `render/Glass.tsx` solo usa transmisión en calidad alta.

## 5. Historia por generaciones (resumen)
- **ATOM 1.0 y 2.0:** base, siete laboratorios, guía, generadores de ejercicios y medición inicial (docs 01–07).
- **ATOM 3.0:** rediseño claro y oscuro, campaña de 41 misiones, rutas de estudio, ejercicios de razonamiento, ensayos con rúbrica, auditoría P0–P2 (docs 08 y ATOM3-*).
- **ATOM 4.0** (doc 09):
  - modelo 3PL con tipos de evidencia;
  - simulacro profesional (navegación libre, guardado automático, informe);
  - cuaderno de errores;
  - renderizado bajo demanda;
  - cancelación real en los Workers;
  - guía con «por qué», dudas, analogías y contraejemplos;
  - fórmulas manipulables;
  - resoluciones estructuradas;
  - familias De Broglie, Heisenberg y Pauli/Hund;
  - predicciones en tres laboratorios;
  - corrección de la geometría del espectrómetro;
  - CSS modular;
  - validación con NIST.
- **ATOM 5.0** (doc 10):
  - corrección del gradiente y de la información de Fisher del 3PL, con verificación numérica;
  - pistas registradas por paso;
  - el tipo de evidencia aplicado también a las competencias;
  - menos peso al repetir el mismo enunciado;
  - reglas más estrictas para cerrar entradas del cuaderno;
  - confirmación explícita en las preguntas de ordenación;
  - rutas que conservan el ejercicio en curso;
  - resiliencia ante almacenamiento dañado;
  - axe en 34 vistas;
  - espectros de absorción realistas en gas frío y caliente;
  - procedimiento escrito con localización del error y crédito parcial;
  - nueva metodología de rendimiento;
  - columnata instanciada;
  - vidrio adaptativo;
  - nube del orbital y Geiger–Marsden mejorados;
  - inicio rediseñado (firma espectral e índice de laboratorios);
  - guía con intuición, deducciones y conexiones;
  - resoluciones específicas en cinco familias más;
  - service worker y manifiesto;
  - estudio de sincronización;
  - causa probable de lo no respondido en los simulacros.

## 6. Pendiente declarado al cerrar 5.0
- Rediseño profundo de los laboratorios. Sigue pendiente sobre todo en la Forja, la tabla periódica, el tubo de Thomson y la campaña. Los demás laboratorios solo han recibido correcciones puntuales.
- Rediseño del resto de pantallas: guía, ejercicios, simulacro, resultados, progreso, cuaderno y ajustes.
- Resoluciones propias para las familias que aún usan `structuredResolution`.
- Más variedad de ejercicios.
- Descarga deliberada del contenido para uso sin conexión, y fusión segura del progreso entre dispositivos (propuesta en el doc 10 §8).
- Rendimiento de la campaña (unos 1,4 s por fotograma en SwiftShader), de la tabla periódica y de Quantum.

## 7. Nueva auditoría externa (hallazgos de ATOM 5.0 que hay que resolver en 5.1)
Están detallados en la directiva ATOM 5.1. Los principales:
- **P0 en el corrector de procedimientos.** `src/learning/procedure.ts` y el crédito de 0,75 en `examSession.ts` pueden conceder crédito por una coincidencia numérica, con unidades incompatibles o sin un procedimiento real. Faltan:
  - validación dimensional;
  - continuidad entre operaciones;
  - seguimiento de variables y despejes;
  - que las expresiones inválidas no se traten como etiquetas;
  - que los pasos posteriores a un error no se den por buenos sin verificarlos;
  - registrar en el modelo las ayudas del analizador.
- **Contradicción del factor de repetición.** `repetitionFactor` (en `store.ts`) choca con la regla de recuperación «mismo-dias-despues» del cuaderno.
- **Service worker.** `public/sw.js` borra las cachés de otros proyectos del mismo origen. Hacen falta versionado y una actualización segura.
- **Falta de tiempo mal atribuida.** `unansweredCauses` atribuye «tiempo» en simulacros sin límite o entregados antes de tiempo.
- **Validación.** Hay que reforzar la de sesiones, rutas y almacenamiento.
- **Inconsistencias científicas entre capas de la guía:** absorción, especies isoelectrónicas y simplificaciones de los modelos.
- **Posible regresión de rendimiento en Quantum.**
- **Pruebas.** Faltan pruebas de integración y adversariales entre sistemas.

## 8. Mapa del código (lo esencial)
- **`src/learning/`:**
  - `mastery.ts` (3PL), `evidence.ts`, `notebook.ts`, `session.ts` (selección y simulacros) y `examSession.ts`;
  - `procedure.ts` y `checker.ts`;
  - `guide.ts`, `guideDepth.ts` y `guideProgression.ts`;
  - `liveFormulas.ts`, `resolutions.ts`, `autoResolution.ts` y `registry.ts`;
  - `generators/*.ts`.
- **`src/modules/`:** `forge`, `history` (con `geigerGeometry.ts`), `photon` (`PhotonLab.tsx`, `scenes.tsx`, `Spectroscope.tsx`), `masses` (con `geometry.ts`), `quantum`, `architect`, `periodic`, `hub` (`Home.tsx`, `Hub.tsx` para la campaña, `SpectrumSignature.tsx`), `guide` y `training`.
- **`src/science/`:** física y química con datos NIST e IUPAC; pruebas de validación en `reference.test.ts`.
- **`src/ui/`:** `ExercisePlayer.tsx`, `Procedure.tsx`, `Prediction.tsx`, `MathText.tsx` y `Pedagogy.tsx`.
- **`src/render/`:** `Stage.tsx`, `demand.ts`, `labels.tsx` (separación opcional de etiquetas), `Glass.tsx` y `ElectronCloud.tsx`.

## 9. Cómo trabajar (lo que el usuario espera)
Ciclo continuo: auditar → diseñar → implementar → ejecutar → capturar → medir → criticar → corregir. Para cada pantalla:
- inspeccionar capturas reales en escritorio (1440×900), iPad vertical (834×1194) e iPad horizontal (1194×834), en tema claro y oscuro y en calidad alta y baja;
- comparar antes y después;
- documentar en `docs/11-sexta-generacion.md` (o `docs/11-atom-5-1.md`);
- mantener un registro de objetivos con un estado honesto.

No dar algo por terminado si la mejora es parcial. Ante un límite, dejar commits y un plan de reanudación.

Para el diseño hay una skill disponible, `anthropic-skills:criterio-de-diseno`, que conviene cargar antes de rediseñar pantallas.
