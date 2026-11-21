# ATOM · The Matter Experience

Laboratorio interactivo de **estructura atómica y sistema periódico** para 1.º de Bachillerato. Combina escenas 3D, simulaciones con cálculos verificados, una campaña de misiones y un sistema de ejercicios con corrección razonada, dominio adaptativo y repaso espaciado.

## Puesta en marcha

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm test           # 119 pruebas del núcleo científico y del motor de aprendizaje
npm run build      # comprobación de tipos + compilación en dist/
npm run e2e        # prueba de humo en navegador (requiere build previo)
```

## Qué incluye la fase 1

| Área | Contenido |
|---|---|
| **Atrio** | Mundo central 3D con la densidad electrónica *calculada* del neón y acceso a las estaciones y la campaña |
| **Atomic Forge** | Construcción de átomos e iones con botones, arrastre o teclado (P, N, E); identidad, estabilidad nuclear (NUBASE), isótopos naturales, configuración e isoelectrónicos. Nube electrónica con Z efectiva de Slater |
| **Photon Lab** | Banco de ondas (λ, ν, T, E), escalera de niveles del hidrógeno con Rydberg, emisión, absorción y cascadas, detector UV-visible-IR y espectroscopio con líneas NIST |
| **Entrenamiento** | Práctica adaptativa (15 generadores), repaso espaciado (Leitner), examen con informe por apartados, progreso sobre los 54 nodos del temario y los ejercicios de los apuntes |
| **Campaña** | Capítulo I «Identidad» (7 misiones) y capítulo II «Luz» (7 misiones) |
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
src/modules/    Atrio, Atomic Forge, Photon Lab y Entrenamiento
src/ui/         Componentes de interfaz: reproductor de ejercicios, panel de misión…
tools/          Generador de datos (mendeleev) y prueba de humo
```

## Fuentes de datos

CODATA 2018 (constantes) · IUPAC/CIAAW (pesos atómicos) · NIST ASD (energías de ionización) y *NIST Handbook of Basic Atomic Spectroscopic Data* (líneas espectrales) · NUBASE (nucleidos) · Pyykkö y Atsumi 2009 (radios covalentes) · Shannon 1976 (radios iónicos) · CIE 1931 2° (color espectral). Los datos de elementos se regeneran con `tools/generate_data.py`.
