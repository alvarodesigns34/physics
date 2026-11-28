# ATOM · The Matter Experience

Aplicación para estudiar **estructura atómica y sistema periódico** (Física y Química, 1.º de Bachillerato): teoría con fórmulas, once laboratorios 3D con cálculo real, ejercicios generados y corregidos paso a paso, un centro de preparación del examen y simulacros con informe. Funciona sin conexión (PWA), sin cuentas ni servidores: el progreso se guarda en el navegador y se puede pasar a otro dispositivo.

Versión publicada: <https://alvarodesigns34.github.io/physics/> · Versión actual del código: **ATOM 6.0** ([informe](docs/13-atom-6-definitive.md)).

## Puesta en marcha

```bash
npm ci
npm run dev        # desarrollo en http://localhost:5173
```

## Comprobaciones

```bash
npm run typecheck  # TypeScript
npm test           # pruebas unitarias (núcleo científico, motor de aprendizaje, auditorías)
npm run build      # tipos + compilación en dist/
npm run e2e        # prueba de humo en navegador, escritorio y móvil (requiere build)
npm run a11y       # axe-core en claro y oscuro (requiere build)
npm run resilience # almacenamiento dañado, sin conexión, pérdida de contexto WebGL, service worker
npm run visual     # regresión visual frente a docs/capturas/referencia/
npm run bench      # tiempos de los cálculos científicos más costosos
npm run stats      # regenera docs/ESTADISTICAS.md desde el código
node tools/perf.mjs salida.json   # fotogramas, tareas largas, recursos GPU y memoria por laboratorio
node tools/shots.mjs etiqueta [desktop,ipad,ipadv,wide,movil]   # capturas; THEME=oscuro, TEXT=1.3
```

Las cifras del proyecto (familias, ejercicios, pruebas…) están en [docs/ESTADISTICAS.md](docs/ESTADISTICAS.md), generado desde el código; este README no las repite para que no queden desfasadas.

## Qué incluye

| Área | Contenido |
|---|---|
| **Inicio** | Qué hacer ahora (recomendación explicada del motor adaptativo), **Retomar** el último punto de estudio, acceso a Preparar examen, simulacro y repaso, laboratorios y temario |
| **Preparar examen** (6.0) | Familias de problemas por bloque con su competencia, motivo, dificultad, tiempo, errores habituales, presencia en las fuentes (contada por pregunta) y tu preparación según tu evidencia, sin porcentajes. Sesiones orientativas de 15, 30, 60 y 90 min e imprescindibles antes del examen. Cada familia: ejemplo guiado → otro equivalente sin ayuda → más exigente, teoría y laboratorio |
| **Guía** | 7 lecciones por bloque con fórmulas, errores típicos, trucos, notas de rigor, ejercicios resueltos y widgets interactivos |
| **Entrenamiento** | Práctica adaptativa (modos guiado, autónomo, desafío y revisión), ruta de estudio por apartado, repaso espaciado, cuaderno de errores, progreso con incertidumbre y los ejercicios de clase (TEO, AMP, HOJ y EBAU) |
| **Simulacros** | Seis perfiles, guardado y recuperación, corrección por apartados con crédito por procedimiento, informe con ruta de repaso por familias y errores agrupados por tipo |
| **Laboratorios** | Atomic Forge, Time Machine (modelos, tubo de rayos catódicos, Geiger–Marsden), Photon Lab (ondas, hidrógeno, espectroscopio), Mass Spectrometry, Quantum Space, Electron Architect y Periodic Universe; cada escena declara qué es cálculo y qué es esquema |
| **Corrección** | Números con unidades y cifras significativas, configuraciones, números cuánticos, ordenaciones y procedimientos escritos con análisis dimensional y procedencia de cada número |
| **Progreso** | Clave `atom:v1`, versión de datos 2; exportar, importar y fusionar entre dispositivos de forma exacta e idempotente |

## Documentación

1. [Matriz de cobertura curricular y erratas de las fuentes](docs/01-matriz-cobertura.md)
2. [Arquitectura funcional](docs/02-arquitectura.md)
3. [Simulaciones y fundamentos físicos](docs/04-simulaciones-fundamentos.md)
4. Informes por versión: [2.0](docs/07-segunda-generacion.md) · [3.0](docs/08-tercera-generacion.md) · [4.0](docs/09-cuarta-generacion.md) · [5.0](docs/10-quinta-generacion.md) · [5.1](docs/11-atom-5-1.md) · [5.2](docs/12-atom-5-2.md) · **[6.0](docs/13-atom-6-definitive.md)**
5. [Estadísticas generadas desde el código](docs/ESTADISTICAS.md) · mediciones en [docs/mediciones/](docs/mediciones/) · capturas en [docs/capturas/](docs/capturas/)

## Estructura

```
src/science/    Núcleo científico puro (sin React ni Three.js), con pruebas
src/learning/   Temario, generadores, corrector, procedimientos, dominio, repaso, simulacro, preparación del examen
src/state/      Estado persistente (zustand + localStorage versionado), fusión e importación
src/workers/    Cálculo de orbitales en Web Workers con caché acotada
src/render/     Piezas 3D reutilizables: escenario, materiales, etiquetas
src/modules/    Inicio, guía, entrenamiento, preparar examen y los laboratorios
src/ui/         Componentes de interfaz (reproductor de ejercicios, fórmulas, pedagogía)
src/styles/     tokens.css (sistema de diseño), fonts.css y hojas por área en global/
tools/          Pruebas en navegador, medición, capturas, estadísticas y datos
```

## Fuentes de datos

CODATA 2018 (constantes) · IUPAC/CIAAW (pesos atómicos) · NIST ASD (energías de ionización) y *NIST Handbook of Basic Atomic Spectroscopic Data* (líneas espectrales) · NUBASE (nucleidos) · Pyykkö y Atsumi 2009 (radios covalentes) · Shannon 1976 (radios iónicos) · CIE 1931 2° (color espectral). Tipografías Inter 4 y JetBrains Mono (SIL OFL; licencias en `src/assets/fonts/`).

## Publicación

`.github/workflows/deploy.yml` publica en GitHub Pages con cada push a `main`, **solo si pasa antes el flujo completo de comprobaciones** (`ci.yml`: tipos, pruebas, compilación, E2E, accesibilidad y resiliencia). Requisito único: **Settings → Pages → Source: GitHub Actions**.
