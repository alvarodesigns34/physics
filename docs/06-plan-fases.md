# 6. Plan de desarrollo por fases verificables

Cada fase deja el producto **ejecutable, integrado, probado y visualmente coherente**. «Verificable» significa que hay criterios de aceptación objetivos y comprobados por tests o por inspección reproducible (capturas automáticas).

## Fase 0 · Análisis y diseño ✅
- Matriz de cobertura (54 nodos, 7 bloques) con registro de 22 erratas y simplificaciones.
- Arquitectura, diseño de experiencia, fundamentos físicos, propuesta visual y este plan.

## Fase 1 · Fundación y primera experiencia completa (en curso)
**Alcance**
1. Núcleo científico completo y probado: constantes, números, unidades y cifras significativas; 118 elementos; nucleidos; identidad de especies; fotón; hidrógeno; masa media; números cuánticos; configuraciones con excepciones e iones; Slater; orbitales hidrogenoides; color espectral.
2. Motor de aprendizaje: temario como datos, corrector (numérico con unidades y cifras significativas, especies, elección y configuración), pistas, detectores de errores, dominio adaptativo, repaso espaciado, examen y persistencia.
3. Atrio 3D, **Atomic Forge** y **Photon Lab** completos.
4. Campaña: capítulos I «Identidad» y II «Luz».
5. Centro de entrenamiento: práctica adaptativa, repaso, examen y progreso por apartados, con ejercicios de los bloques 1, 3 (salvo 3.1), 5.4 y 6 a partir de los generadores disponibles.
6. Ajustes persistentes: calidad, movimiento reducido, sonido, escala de texto y alias.

**Criterios de aceptación**
- `npm test`: todos los tests verdes. Incluyen los ejemplos de TEO y las soluciones de AMP 1–10, 12, 15, 17 y 19, además de la comprobación de las 118 configuraciones.
- `npm run build` sin errores de tipos.
- `npm run e2e`: recorrido automático Atrio → Forja (construir ¹²C) → Photon Lab (emitir Hα) → Entrenamiento (resolver un ejercicio), sin errores de consola, con capturas en escritorio y móvil.

## Fase 2 · Electron Architect + Quantum Space
- Constructor de diagramas de cajas con validación Pauli/Hund en vivo y estados fundamental, excitado y prohibido.
- Visualizador 3D de orbitales s, p, d y f (isosuperficies y nubes) con números cuánticos manipulables.
- Capítulos III «Probabilidad» y IV «Arquitectura».
- *Aceptación:* tests de AMP 11–19 y TEO 2–8; el visualizador nunca muestra órbitas.

## Fase 3 · Periodic Universe
- Tabla 3D con alturas y colores de propiedades reales (radio, EI, AE, χ), Z_ef de Slater, formación de iones y excepciones.
- Capítulo V «Periodicidad».
- *Aceptación:* tests de AMP 20–31 y TEO 9, 19, 20; las tendencias se muestran con datos y no con flechas inventadas.

## Fase 4 · Time Machine + Mass Spectrometry Lab
- Tubo de rayos catódicos (desviación en campos E y B), dispersión de Rutherford con trayectorias coulombianas hiperbólicas frente al modelo de Thomson y limitaciones de cada modelo.
- Espectros de masas con picos de isótopos reales y cálculo de masa media (incluye el ejemplo del cloro corregido).
- Capítulos VI «Historia» y VII «Masa».

## Fase 5 · Pulido y producción
- Examen global del tema, auditoría de accesibilidad (lectores de pantalla y teclado), presupuesto de rendimiento en dispositivos de gama baja, PWA sin conexión y exportación del informe de progreso.
