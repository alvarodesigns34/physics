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
