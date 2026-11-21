# ATOM · The Matter Experience

Laboratorio interactivo de **estructura atómica y sistema periódico** para 1.º de Bachillerato. Combina escenas 3D, simulaciones con cálculos verificados, una campaña de misiones y un sistema de ejercicios con corrección razonada, dominio adaptativo y repaso espaciado.

## Puesta en marcha

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm test           # 159 pruebas del núcleo científico y del motor de aprendizaje
npm run build      # comprobación de tipos + compilación en dist/
npm run e2e        # prueba de humo en navegador (requiere build previo)
```

## Qué incluye

| Área | Contenido |
|---|---|
| **Atrio** | Mundo central 3D con la densidad electrónica *calculada* del neón y acceso a las estaciones y la campaña |
| **Atomic Forge** | Construcción de átomos e iones con botones, arrastre o teclado (P, N, E); identidad, estabilidad nuclear (NUBASE), isótopos naturales, configuración e isoelectrónicos. Nube electrónica con Z efectiva de Slater |
| **Photon Lab** | Banco de ondas (λ, ν, T, E), escalera de niveles del hidrógeno con Rydberg, emisión, absorción y cascadas, detector UV-visible-IR y espectroscopio con líneas NIST |
| **Entrenamiento** | Práctica adaptativa (26 generadores), repaso espaciado (Leitner), examen con informe por apartados, progreso sobre los 54 apartados del temario (todos con ejercicios) y 64 ejercicios de los apuntes |
| **Time Machine** | Modelos de Dalton a la mecánica cuántica, colapso clásico de Rutherford, tubo de rayos catódicos (fuerza de Lorentz y q/m) y Geiger–Marsden con Monte Carlo en vivo frente a la fórmula de Rutherford |
| **Mass Spectrometry Lab** | Sector magnético con isótopos naturales reales, espectro acumulado y masa media medida con su incertidumbre estadística |
| **Quantum Space** | Orbitales reales (n ≤ 5) con fase, corte para ver nodos, órbita de Bohr superpuesta, P(r) y paquete de incertidumbre mínima |
| **Electron Architect** | Torre de energía 3D con cajas interactivas, Pauli, Hund y Aufbau en vivo, excepciones reales y diagrama de Möller editable |
| **Periodic Universe** | Tabla 3D de 118 elementos con propiedades reales, comparador razonado que detecta excepciones y tamaños de átomos frente a iones |
| **Campaña** | 7 capítulos y 35 misiones con objetivos experimentales verificables |
| **Ajustes** | Calidad gráfica adaptable, movimiento reducido, sonido opcional, escala de texto, orden de configuraciones y exportar o importar el progreso |

## Documentación

1. [Matriz de cobertura curricular y erratas de las fuentes](docs/01-matriz-cobertura.md)
2. [Arquitectura funcional](docs/02-arquitectura.md)
3. [Diseño de experiencias y jugabilidad](docs/03-diseno-experiencia.md)
4. [Simulaciones y fundamentos físicos](docs/04-simulaciones-fundamentos.md)
5. [Propuesta visual y tecnológica](docs/05-propuesta-visual-tecnologica.md)
6. [Plan de desarrollo por fases](docs/06-plan-fases.md)

## Estructura

```
src/science/    Núcleo científico puro (sin React ni Three.js), con pruebas
src/learning/   Temario, generadores, corrector, dominio, repaso, examen y campaña
src/state/      Estado persistente (zustand + localStorage versionado)
src/render/     Piezas 3D reutilizables: escenario, nube electrónica, núcleo y etiquetas
src/modules/    Atrio, los 7 laboratorios y el Centro de entrenamiento
src/ui/         Componentes de interfaz: reproductor de ejercicios, panel de misión…
tools/          Generador de datos (mendeleev) y prueba de humo
```

## Fuentes de datos

CODATA 2018 (constantes) · IUPAC/CIAAW (pesos atómicos) · NIST ASD (energías de ionización) y *NIST Handbook of Basic Atomic Spectroscopic Data* (líneas espectrales) · NUBASE (nucleidos) · Pyykkö y Atsumi 2009 (radios covalentes) · Shannon 1976 (radios iónicos) · CIE 1931 2° (color espectral). Los datos de elementos se regeneran con `tools/generate_data.py`.

## Publicación

El flujo `.github/workflows/deploy.yml` compila, prueba y publica la aplicación en GitHub Pages con cada push a `main`. Solo hay que activar, una vez, **Settings → Pages → Source: GitHub Actions**. La aplicación usa rutas relativas y funciona en `https://<usuario>.github.io/<repositorio>/`.
