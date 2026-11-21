# 6. Plan de desarrollo por fases verificables

Cada fase deja el producto **ejecutable, integrado, probado y visualmente coherente**. «Verificable» significa que hay criterios de aceptación objetivos y comprobados por tests o por inspección reproducible (capturas automáticas).

## Fase 0 · Análisis y diseño ✅
- Matriz de cobertura (54 nodos, 7 bloques) con registro de 22 erratas y simplificaciones.
- Arquitectura, diseño de experiencia, fundamentos físicos, propuesta visual y este plan.

## Fase 1 · Fundación y primera experiencia completa ✅
**Alcance**
1. Núcleo científico completo y probado: constantes, números, unidades y cifras significativas; 118 elementos; nucleidos; identidad de especies; fotón; hidrógeno; masa media; números cuánticos; configuraciones con excepciones e iones; Slater; orbitales hidrogenoides; color espectral.
2. Motor de aprendizaje: temario como datos, corrector (numérico con unidades y cifras significativas, especies, elección y configuración), pistas, detectores de errores, dominio adaptativo, repaso espaciado, examen y persistencia.
3. Atrio 3D, **Atomic Forge** y **Photon Lab** completos.
4. Campaña: capítulos I «Identidad» y II «Luz».
5. Centro de entrenamiento: práctica adaptativa, repaso, examen y progreso por apartados, con ejercicios de los bloques 1, 3, 4, 5 y 6 (y 7.2/7.5) a partir de los generadores disponibles.
6. Ajustes persistentes: calidad, movimiento reducido, sonido, escala de texto y alias.

**Criterios de aceptación**
- `npm test`: todos los tests verdes. Incluyen los ejemplos de TEO y las soluciones de AMP 1–10, 12, 15, 17 y 19, además de la comprobación de las 118 configuraciones.
- `npm run build` sin errores de tipos.
- `npm run e2e`: recorrido automático Atrio → Forja (construir ¹²C) → Photon Lab (emitir Hα) → Entrenamiento (resolver un ejercicio), sin errores de consola, con capturas en escritorio y móvil.

**Resultado de la verificación**
- 119 pruebas superadas: autoconsistencia de los 15 generadores (60 semillas × dificultad), los 35 ejercicios de las fuentes, las 118 configuraciones de referencia y los ejemplos de TEO y AMP.
- La compilación con comprobación estricta de tipos termina sin errores.
- Prueba de humo superada: 9 de 9 comprobaciones, en escritorio y en iPhone 13 emulado.
- Correcciones científicas detectadas durante la verificación visual: la aproximación analítica CIE se sustituyó por la tabla oficial (700 nm salía naranja); el *tone mapping* AgX se cambió por Neutral (desplazaba el tono de los rojos); se quitaron las mayúsculas automáticas en las fichas (convertían λ en Λ y e⁻ en E⁻); y el radio de la nube se reescaló con el n* de Slater (el modelo hidrogenoide hacía el Cs unas 5 veces mayor).

**Pendiente conocido de la fase 1:** la escena de ondas y la escalera de niveles en móvil son legibles, pero densas. Los niveles n ≥ 4 solo se rotulan en escritorio.

## Fases 2–4 · Los siete laboratorios ✅
**Entregado**
- **Electron Architect:** torre de energía 3D con cajas interactivas (↑, ↓, ↑↓, ↑↑), diagnóstico en vivo de Pauli, Hund y Aufbau, excepciones reales (Cr, Cu…), llenado animado y diagrama de Möller que también sirve de editor accesible.
- **Quantum Space:** orbitales hidrogenoides reales (n ≤ 5, l ≤ 3) muestreados de |ψ|² y coloreados por el signo de ψ, corte para ver los nodos, órbita de Bohr superpuesta, subnivel completo (simetría esférica), gráfica P(r) y paquete gaussiano de incertidumbre mínima.
- **Periodic Universe:** tabla 3D de 118 elementos con alturas proporcionales a datos reales (radio, EI₁, AE, χ, Z_ef de Slater y masa), comparador razonado con detección y explicación de excepciones, y vista de tamaños de átomos frente a iones (radios de Shannon).
- **Time Machine:** modelos de Dalton a la mecánica cuántica (colapso clásico de Rutherford y saltos de Bohr con el color del fotón), tubo de rayos catódicos con la fuerza de Lorentz integrada y la medida de q/m, y Geiger–Marsden con Monte Carlo en vivo (Thomson frente a núcleo), histograma frente a la fórmula de Rutherford y trayectorias hiperbólicas integradas.
- **Mass Spectrometry Lab:** sector magnético con r = √(2mV/q)/B, isótopos naturales reales de cualquier elemento, espectro acumulado, masa media medida con su incertidumbre estadística y la demostración de la errata del cloro.
- **Campaña de 7 capítulos y 35 misiones**, Atrio con 8 estaciones y 26 generadores más 64 ejercicios de las fuentes: **los 54 apartados del temario tienen ejercicios**.

**Verificación**
- 159 pruebas superadas, entre ellas: trayectoria coulombiana integrada frente a tan(θ/2) = d/2b; Monte Carlo frente a la sección eficaz (Thomson: 0 desviaciones > 10°); tubo de Thomson integrado frente a y₁ = qEL²/2mv² y compensación B = E/v; tendencias con datos reales y excepciones N/O, Be/B y F/Cl; diagramas de cajas (Pauli, Hund, excepción del Cr); autoconsistencia de todos los generadores; y cobertura de 54 de 54 apartados.
- Prueba de humo en navegador: 15 de 15 comprobaciones en todos los laboratorios, escritorio y móvil.

## Fase 4b · Preparación del examen ✅
- Guía de estudio (/guia) con 7 lecciones, formulario y 10 widgets interactivos (incluida la anatomía de una onda).
- 5 generadores de problemas compuestos de nivel examen y «Examen tipo» (8 preguntas, 10 puntos, 50 min).
- Enlaces «Repasa la teoría» desde cada ejercicio y desde el informe del examen.
- Realismo 3D: superficies de orbital del 90 % (marching cubes), espectroscopio de prisma SF11 con trazado de rayos, visor de escala real del átomo y arquitectura del Atrio.
- Sonido ampliado: ambientes por laboratorio y efectos por acción.

## Fase 5 · Pulido y producción
- Auditoría de accesibilidad con lectores de pantalla, presupuesto de rendimiento en dispositivos de gama baja, PWA sin conexión, informe de progreso exportable en PDF y modo docente (asignar misiones y exámenes).
