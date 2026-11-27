# 5. Propuesta visual y tecnológica

## 5.1 Dirección artística

```
Sujeto:      Laboratorio de materia para 1.º de Bachillerato. Su trabajo: que tocar un átomo
             sea la forma más rápida de entenderlo.
Tono:        nocturno · preciso · cálido (un museo de ciencia de noche, con lámparas de instrumento)
Paleta:      grafito cálido (superficie), marfil (tinta), ámbar de sodio 589 nm (único acento),
             coral (protón), piedra (neutrón), azul-hielo (densidad electrónica)
Tipografía:  Instrument Serif (títulos: el tono de museo y cartela)
             Inter Tight (interfaz: compacta y legible a 13–16 px)
             JetBrains Mono (datos y fórmulas: cifras tabulares, subíndices limpios)
Retícula:    escena a sangre completa; paneles DOM en una columna lateral de 360–420 px que
             rompe la simetría (escena 8/12, panel 4/12); en móvil, panel inferior deslizable
Movimiento:  la cámara se mueve solo para cambiar de contexto; las partículas se mueven porque
             la física lo pide (un electrón que sale, un fotón emitido); entradas en 280–480 ms
             con easing (0.16, 1, 0.3, 1)
Gesto:       la única saturación de la pantalla es la luz calculada. Cuando aparece una línea
             espectral, es el objeto más intenso del mundo
```

**Lo que no hacemos:** degradados morado-azul, neón cian y violeta, glassmorphism sin motivo, orbes decorativos, emojis como iconos o un radio de borde idéntico en todo. Los paneles son superficies mates con un *hairline* de 1 px y radios anidados (12 px exterior y 8 px interior). La profundidad viene de la iluminación de la escena, no de sombras CSS.

**Materiales 3D**
- Nucleones: `MeshPhysicalMaterial` con *clearcoat* y *sheen* sutil; coral para el protón y piedra para el neutrón, con un rótulo «+» al acercar la cámara.
- Densidad electrónica: puntos aditivos con tamaño atenuado por distancia, tono hielo, con la opacidad según la densidad local y mezcla aditiva limitada para no quemar.
- Fotones: núcleo blanco con halo del color espectral; *bloom* selectivo por luminancia.
- Arquitectura: hormigón pulido muy oscuro con rugosidad variable y anillos de luz ámbar en el suelo bajo cada estación.
- Postproceso (calidad alta): bloom con umbral alto (solo la luz «física» florece), viñeta muy suave y *tone mapping* Neutral de Khronos, que conserva el tono y la saturación. Se descartaron AgX y ACES porque desplazan los rojos espectrales hacia el naranja, y la fidelidad del color de las líneas es un requisito científico.

**Sonido (opcional, desactivado por defecto):** síntesis WebAudio sin archivos. Clics de cristal al añadir partículas y un tono breve al emitir un fotón. La altura del tono es una *analogía* (se mapea log ν al audible) y así se rotula.

## 5.2 Tecnología

| Decisión | Elección | Justificación |
|---|---|---|
| Lenguaje | **TypeScript** estricto | El núcleo científico necesita tipos fuertes (unidades y estructuras) |
| UI | **React 19** | Ecosistema maduro, *concurrent rendering* y `lazy` por módulo |
| 3D | **Three.js + React Three Fiber 9** | Escenas declarativas y reutilizables; integración directa con el estado de React; acceso completo a Three.js cuando hace falta (shaders e instancias) |
| Utilidades 3D | **drei** (importaciones selectivas) | Controles de cámara, monitor de rendimiento y DPR adaptativo sin reinventarlos |
| Postproceso | **postprocessing** | Bloom y tonemapping eficientes en una sola pasada combinada |
| Estado | **zustand** | Mínimo, sin *boilerplate*, con selectores que evitan renders de la escena 3D |
| Construcción | **Vite 8** | Arranque instantáneo y *code splitting* nativo |
| Tests | **Vitest** (unitarios) + **Playwright** (humo end-to-end y capturas) | Los cálculos se validan en Node; la integración, en un navegador real |

**Alternativas evaluadas.** *Babylon.js*: muy completo, pero más pesado y menos integrado con un árbol de UI React. *Motor de juego* (Unity o Godot exportados a WebGL): carga inicial de decenas de MB, accesibilidad DOM pobre y peor integración con texto y fórmulas. *WebGPU nativo*: aún sin cobertura universal en dispositivos escolares. Three.js permite migrar a su `WebGPURenderer` más adelante sin rehacer escenas. **Conclusión:** la pila propuesta es la más adecuada para este producto.

## 5.3 Calidad gráfica adaptable

| Nivel | DPR máx. | Postproceso | Puntos por nube | Sombras |
|---|---|---|---|---|
| Alta | 2 | Bloom + viñeta | 24 000 | Contacto suave |
| Media | 1,5 | Bloom ligero | 12 000 | No |
| Baja | 1 | No | 5 000 | No |

El modo **Auto** arranca en el nivel que corresponde por hardware (núcleos, memoria y GPU anunciada) y ajusta según los FPS medidos (PerformanceMonitor).

## Actualización ATOM 3.0 (dirección visual vigente)
La dirección «museo de noche» de este documento queda sustituida por «laboratorio a la luz del día»: tema claro principal, sans única (Inter Tight), un acento cobalto y escenas 3D en un visor de tono pizarra. Detalle y justificación en [08-tercera-generacion.md](08-tercera-generacion.md) §3; tokens en `src/styles/tokens.css`.
