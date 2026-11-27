# ATOM 4.0 — Informe de la cuarta generación

> Rama `claude/proyecto-atom-interactive-830d7u`. Producción (`main`) sin cambios hasta autorización expresa.
> Público: alumnado de 1.º de Bachillerato.

## 1. Hallazgos de la auditoría y su corrección

### 1.1 Inflación de las estimaciones de dominio
Causas encontradas en el modelo de 3.0:
1. Un acierto en una pregunta de 2 o 4 opciones contaba igual que una respuesta abierta (sin probabilidad de adivinar).
2. Un acierto tras fallar o con pistas podía seguir subiendo θ con peso completo.
3. Con un solo acierto difícil se mostraba ≈ 62 % de dominio: la estimación no se contraía hacia el punto de partida.
4. Las autoevaluaciones de desarrollo pesaban como una corrección objetiva.

Corrección:
- **Modelo 3PL** (discriminación 1): P = c + (1 − c)·σ(θ − b), con c = 1/opciones (1/2ᵏ en selección múltiple, 1/n! en ordenar). La actualización usa el gradiente de la verosimilitud: un acierto adivinable informa menos.
- **Tipos de evidencia** por apartado y ejercicio: *demostrada*, *posible azar*, *asistida* (reintento, pista, paso revelado o arrastre) y *autoevaluada*, con pesos 1 / 1 (ya penalizada por c) / 0,6 / 0,4. Solo la demostrada (respuesta abierta, primer intento, sin pistas, dificultad ≥ 2) cuenta como «acierto demostrado».
- **θ mostrado con contracción**: θ̂ = θ₀ + (θ − θ₀)·I/(I + I₀). Con poca información, la estimación queda cerca del punto de partida y con intervalo ancho.
- Pruebas: `src/learning/model4.test.ts`.

### 1.2 Datos científicos ausentes interpretados como 0
`null` en la afinidad electrónica mezclaba «anión no ligado» (AE ≤ 0 medida: gases nobles, N, Be, Mg, Mn, Zn, Cd, Hg) con «sin valor en la fuente» (varios lantánidos, actínidos, transactínidos), y ATOM mostraba ambos como 0 kJ/mol. Ahora hay tres estados (`affinityStatus`): solo el primero es 0; el segundo aparece como «sin datos» y queda fuera de gráficas, ordenaciones y excepciones. Prueba en `trends3.test.ts`.

### 1.3 Preguntas no respondidas en los simulacros
Antes, al agotarse el tiempo, las preguntas no respondidas desaparecían del informe por apartados. Ahora (`examSession.ts`) cuentan 0 en la nota, se listan por apartado como «sin responder» y no se usan como evidencia de dominio (no responder por falta de tiempo no demuestra no saber).

### 1.4 Continuidad de las rutas de estudio
El estado de la ruta (paso, pasos hechos, errores, ids de sus ejercicios) se guarda en el navegador; desde un laboratorio o la guía, la barra superior ofrece «Ruta: … · paso n/6» para volver al punto exacto. Comprobado en la e2e.

### 1.5 Renderizado continuo y memoria
- **Bajo demanda** (`src/render/demand.ts`): se dibuja durante la interacción y 5 s después, mientras una simulación lo pide (Monte Carlo, conteo de iones, colapso) o durante animaciones de duración conocida (fotones). La autorrotación decorativa solo actúa en la ventana de actividad (`CalmOrbitControls`).
- **Medición** (fotogramas dibujados en 5 s de reposo, tras la carga, SwiftShader): antes, todas las escenas dibujaban continuamente; ahora Forja 0, Fotones 0, Cuántica 0, Tabla 0, Arquitecto 0, Modelos 0, Campaña 0; solo Geiger–Marsden (158) y Masas (241), que simulan, siguen dibujando.
- **Fugas corregidas**: material de las trayectorias del tubo de Thomson no liberado; `BoxGeometry` creada en cada render del espectroscopio. Recursos WebGL estables tras 4 rondas de cambios de orbital (5 geometrías, 1 textura) y 3 rondas de cambios de lámpara (20 y 2).

### 1.6 Cancelación de cálculos obsoletos
Si llega una petición distinta mientras el Worker calcula otra, el Worker se termina y se crea uno nuevo (antes el cálculo obsoleto seguía consumiendo CPU hasta terminar). `cancel()` al desmontar también lo detiene. Pruebas con un Worker simulado (`computeClient.test.ts`).
