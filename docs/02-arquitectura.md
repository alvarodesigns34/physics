# 2. Arquitectura funcional del producto

## 2.1 Principio rector

**La física no vive en la escena.** El renderizado solo dibuja el estado que produce un núcleo científico puro, determinista y probado. Por eso cada número que ve el estudiante procede de una función con test, y cada visual sabe si representa un *cálculo*, un *modelo histórico* o una *analogía*.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  app/        Shell, rutas (hash), carga diferida por módulo, ajustes      │
├──────────────────────────────────────────────────────────────────────────┤
│  modules/    Atrio · Atomic Forge · Photon Lab · Entrenamiento · Campaña  │
│              (compone escena 3D + interfaz DOM + estado)                  │
├───────────────────────────────┬──────────────────────────────────────────┤
│  render/  (React Three Fiber) │  ui/  (DOM accesible)                     │
│  materiales, shaders, nubes,  │  paneles, fórmulas, reproductor de        │
│  postproceso, calidad         │  ejercicios, HUD, anuncios ARIA           │
├───────────────────────────────┴──────────────────────────────────────────┤
│  state/      Stores (zustand) + persistencia versionada (localStorage)    │
├──────────────────────────────────────────────────────────────────────────┤
│  learning/   Temario (grafo de nodos) · generadores de ejercicios ·       │
│              corrector (números, unidades, cifras significativas,         │
│              configuraciones) · pistas · dominio adaptativo ·             │
│              repaso espaciado · examen · campaña                          │
├──────────────────────────────────────────────────────────────────────────┤
│  science/    Constantes · números y unidades · elementos (118) ·          │
│              núcleo/iones · fotón · hidrógeno (Bohr/Rydberg) · masas ·    │
│              números cuánticos · configuración · Slater · orbitales ·     │
│              color espectral          ← TypeScript puro, sin dependencias │
└──────────────────────────────────────────────────────────────────────────┘
```

Reglas de dependencia: cada capa importa solo de las inferiores. `science/` y `learning/` no importan React ni Three.js, así que se prueban con Vitest en Node y se pueden mover a un Web Worker si una simulación lo necesita.

## 2.2 Módulos de producto

| Módulo | Ruta | Responsabilidad | Fase |
|---|---|---|---|
| **Atrio** (mundo central) | `#/` | Navegación espacial entre estaciones, estado de la campaña y acceso rápido | 1 |
| **Atomic Forge** | `#/forja` | Construir átomos e iones partícula a partir de partícula; identidad nuclear, isótopos e isoelectrónicos | 1 |
| **Photon Lab** | `#/fotones` | Banco de ondas EM, niveles del hidrógeno, emisión/absorción y espectroscopio | 1 |
| **Centro de entrenamiento** | `#/entrenamiento` | Práctica adaptativa, repaso espaciado, modo examen y progreso por apartados | 1 |
| **Campaña** | `#/campana` | Misiones encadenadas que se juegan dentro de los laboratorios | 1 |
| Electron Architect | `#/arquitecto` | Configuraciones, diagramas de cajas, Pauli, Hund y estados | 2 ✅ |
| Quantum Space | `#/cuantico` | Orbitales como densidad de probabilidad 3D y números cuánticos | 2 ✅ |
| Periodic Universe | `#/periodico` | Tabla 3D, bloques, Z_ef y tendencias con datos reales | 3 ✅ |
| Time Machine | `#/historia` | Dalton → Bohr, tubo de rayos catódicos y dispersión de Rutherford | 4 ✅ |
| Mass Spectrometry Lab | `#/masas` | Espectros de masas, abundancias y masa atómica media | 4 ✅ |

Los siete laboratorios están implementados y accesibles desde el Atrio y desde el menú «Laboratorios».

## 2.3 Modelo de datos principal

```ts
// science
ElementRecord   { z, symbol, name, atomicWeight, period, group, block, category,
                  groundConfig, electronegativity, ie1, ie2, electronAffinity, covalentRadius, ... }
Species         { z, neutrons, electrons }            // cualquier átomo o ion
Nuclide         { z, a, mass, abundance, halfLife }   // NUBASE vía mendeleev, carga diferida
Configuration   Map<subnivel "3d", electrones>

// learning
SyllabusNode    { id: '3.6', block, title, depth, modules, sourceRefs }
Exercise        { id, nodeIds, difficulty 1–3, prompt, data, parts[], hints[3], solution, source? }
ExercisePart    numeric{ value, unit, sigFigs, tolerance } | choice | species | config | quantumSet | order
Attempt         { exerciseId, correct, hintsUsed, errors[], timestamp }
Mastery         { nodeId → rating θ, attempts, lastSeen }
ReviewCard      { nodeId, box 1–5, due }
CampaignState   { missionId → {status, stars, objectives} }
Settings        { alias, quality, reducedMotion, sound, textScale, configOrder }
```

## 2.4 Flujo de una interacción

1. El usuario actúa (arrastra un protón o selecciona un salto n = 3 → 2).
2. El módulo llama a `science/` (`speciesIdentity`, `transition`). El resultado es un objeto inmutable con todos los valores derivados.
3. `render/` anima la transición hacia el nuevo estado: el estado físico se fija al instante y solo se anima su representación.
4. `ui/` actualiza fichas y fórmulas, y una región `aria-live` anuncia el cambio.
5. Si hay una misión activa, `learning/campaign` evalúa sus objetivos sobre el mismo estado. Los objetivos son predicados puros sobre el estado científico, nunca sobre la escena.

## 2.5 Persistencia

- Clave `atom:v1` en `localStorage` con esquema versionado y migraciones. Si el almacenamiento falla (modo privado), la aplicación funciona en memoria y lo indica.
- Exportar e importar el progreso como JSON desde Ajustes.
- No hay backend en la fase 1: ni datos personales ni cuentas. El alias es opcional y local.

## 2.6 Rendimiento y carga

- Cada módulo es un `React.lazy`, así que el Atrio carga primero y los laboratorios se piden al entrar. Los datos de isótopos (≈90 kB) se cargan bajo demanda.
- Geometría instanciada para los nucleones; nubes de puntos en `BufferGeometry` con shader propio.
- Gestor de calidad con tres niveles (alta, media y baja) y modo automático. El automático vigila los FPS y degrada en este orden: DPR, postproceso y número de puntos.
- `frameloop="demand"` cuando la escena está en reposo y el movimiento reducido está activo.
- Ningún recurso binario pesado: geometría procedural, iluminación analítica, tipografías variables con subconjunto latino y sonido sintetizado con WebAudio.

## 2.7 Accesibilidad

- Toda acción 3D tiene un equivalente en DOM: botones, teclado y lectores de pantalla.
- `prefers-reduced-motion` y un ajuste propio: sin vuelos de cámara, sin rotaciones automáticas y partículas estáticas.
- El color nunca es el único canal: las líneas espectrales llevan etiqueta de λ y las partículas, forma o texto.
- Contraste AA verificado en los tokens. Foco visible. Escala de texto de 90 % a 130 %.
