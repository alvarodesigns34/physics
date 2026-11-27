# ATOM 5.0 — Informe de la quinta generación

Rama de desarrollo; sin publicar en producción. Cada afirmación remite a una prueba o a una medición
reproducible. Lo que no se ha podido verificar se dice explícitamente.

## 1. Auditoría externa de ATOM 4.0: hallazgos y corrección

### 1.1 Gradiente y Fisher del modelo 3PL (P1)
Para P = c + (1 − c)·s, con s = σ(θ − b):
- **Gradiente.** dℓ/dθ = (y − P)·s/P.
- **Información de Fisher.** I = (1 − c)·s²·(1 − s)/P.

**El defecto.** El código usaba s(1 − c)/P solo en los aciertos y una información con un factor (1 − c)³.

**Verificación.** `model5.test.ts` compara el gradiente y la información con derivadas numéricas de la log-verosimilitud (diferencias centradas), sin reutilizar las fórmulas que se verifican: 72 combinaciones de θ, b y c, con y ∈ {0; 0,4; 1}.

**Consecuencia que la prueba hizo explícita.** Con y = 0 el gradiente vale −s, sea cual sea c: un fallo informa lo mismo en un ítem adivinable que en uno abierto. Es lógico, porque el azar solo produce aciertos.

### 1.2 Evidencia: pistas, competencias y repetición
- **Pistas.** Cada paso registra si había pistas a la vista al resolverlo (`hinted`). Si las había, el acierto es «asistida», nunca «demostrada».
- **Competencias.** Reciben el mismo tratamiento del azar, de las ayudas y de la autoevaluación que los apartados: peso según el tipo de evidencia y probabilidad de acertar al azar en el 3PL.
- **Repetición.** Repetir el mismo enunciado pesa 0,35 la segunda vez y 0,15 a partir de la tercera. Si han pasado al menos 2 días desde la vez anterior, pesa 0,6 (recuperación espaciada). En ningún caso cuenta como «demostrada» (`repetitionFactor`).
- **Pruebas.** `audit5.test.ts` y una prueba de integración del almacén (`store.test.ts`).

### 1.3 Cuaderno de errores
Una entrada solo se supera con una variante del mismo generador que cumpla tres condiciones:
- tiene dificultad igual o mayor;
- contiene cada paso fallado (identificado por su id de paso);
- resuelve esos pasos de forma limpia: primer intento, sin pistas y sin que sea una repetición.

Así se cierran los dos agujeros que señaló la auditoría:
- acertar otro paso distinto del mismo generador ya no supera el error;
- un examen respondido a medias ya no cierra los pasos que quedaron sin responder.

### 1.4 P0: ordenación en los simulacros
**El defecto.** Si el orden inicial ya coincidía con el correcto, la pregunta se contaba como «sin responder».

**La corrección.** La sesión registra la confirmación explícita (`confirmed`). Mover un elemento confirma, y el botón «Confirmo este orden» permite dar por buena una respuesta que no exige mover nada. La confirmación se valida al recuperar una sesión guardada.

### 1.5 Rutas de estudio: ejercicio en curso
El reproductor de ejercicios conserva, con `persistKey`, las respuestas a medio escribir, los intentos, las pistas y el estado de terminado. Lo guardado se valida y, si no es válido, se descarta. Un ejercicio ya terminado no vuelve a registrarse al volver a él. La prueba e2e escribe una respuesta, va al laboratorio y comprueba que sigue ahí al volver.

### 1.6 Almacenamiento dañado
`tools/resilience.mjs` (ahora también en CI) inyecta seis estados en el almacenamiento y recorre cinco vistas en cada caso, sin errores:
- JSON roto;
- tipos erróneos;
- versión futura;
- valores infinitos;
- ruta y simulacro dañados;
- `__proto__`.

### 1.7 Accesibilidad
La auditoría con axe pasa de 11 a 34 vistas: todos los laboratorios y sus pestañas, progreso, documentos, repaso, el simulacro en curso y seis vistas en tema oscuro. Resultado: 0 infracciones.

Axe no ve los problemas de teclado. En la ordenación, ahora se anuncia la nueva posición de cada elemento y el foco no se pierde cuando el botón pulsado queda desactivado.

### 1.8 Pruebas geométricas ligadas a la implementación
La geometría del espectrómetro vive en `masses/geometry.ts`, que usan a la vez la escena y la prueba. La prueba ya no reescribe ninguna fórmula. Comprobación por mutación: girar mal el arco o poner el imán en el lado equivocado hace fallar la prueba.

### 1.9 Simplificaciones científicas engañosas
**Espectros de absorción (en la simulación, no solo en el texto).**
- **El defecto.** El espectroscopio dibujaba en absorción todas las líneas de emisión, y la guía decía que «faltan exactamente esas longitudes de onda». Es falso para un gas frío: casi todos sus átomos están en el estado fundamental y solo absorben las líneas que parten de él.
- **Los datos.** De los cinco elementos, solo el sodio (doblete D) tiene líneas de resonancia en el visible. El H, el He, el Ne y el Hg las tienen en el UV (NIST ASD).
- **La corrección.** El espectroscopio distingue «gas frío (laboratorio)» de «gas caliente (estrella)», y en caliente las profundidades se declaran ilustrativas. La guía lo explica. Hay pruebas con datos de referencia.

**Otras afirmaciones matizadas.**
- El truco «cinco pasos y nunca falla».
- «Todos los alcalinos forman cationes +1».

Revisé el resto de los absolutos de la guía y son correctos: A siempre es entero, las energías de ionización sucesivas siempre crecen y la energía del fotón siempre es positiva.

## 2. Rendimiento: metodología corregida y cuellos de botella reales

### 2.1 Qué se medía mal
- **«fps» de la herramienta antigua.** Era la frecuencia de `requestAnimationFrame`, no la de la escena. Con renderizado bajo demanda, rAF sigue a 60 Hz aunque la escena no se dibuje.
- **Memoria.** Se leía el heap sin forzar la recolección de basura, así que dependía del momento en que ocurriera.
- **Llamadas de dibujo.** `gl.info` se reiniciaba en cada pase de posprocesado, de modo que solo se veía el último pase (1 llamada).

`tools/perf.mjs` mide ahora, por separado:
- **rafHz:** la frecuencia de `requestAnimationFrame`;
- **idleFrames:** fotogramas 3D realmente dibujados en reposo;
- **dragFps y dragP95Ms:** fotogramas dibujados por segundo, y su percentil 95, mientras se arrastra la cámara;
- **calls, triangles y programs:** llamadas de dibujo, triángulos y programas del fotograma completo;
- **heapMB:** memoria JS tras `gc()`;
- **recursos de GPU vivos:** geometrías y texturas.

También hace una prueba de estabilidad que recorre los 11 laboratorios cuatro veces seguidas.

### 2.2 Resultados
SwiftShader, calidad media, 1440×900. Datos: `docs/mediciones/perf-atom5-base.json` (antes de optimizar) → `perf-atom5.json`.

| Escena | Llamadas de dibujo | fps al arrastrar | p95 (ms) |
|---|---|---|---|
| Campaña | 372 → 163 | 1,6 → 2,7 | 1 533 → 1 400 |
| Espectroscopio | 46 → 38 | 3,0 → 5,6 | 383 → 217 |

**Causas.**
- **Transmisión de three.js.** Obliga a redibujar la escena opaca en cada fotograma. La usaban el prisma, la lámpara, la celda de gas y un holograma de la campaña. Ahora la aplica `render/Glass.tsx` solo en calidad alta; en media y baja, un vidrio con barniz sin pase extra.
- **Columnata de la campaña.** Eran 68 mallas (17 columnas × 4 piezas), con sus 68 geometrías y 68 llamadas. Ahora son 4 mallas instanciadas.

**Fuga de memoria: descartada.** La memoria JS tras `gc()` se mantiene en 27,6–28,3 MB en los cuatro ciclos por los 11 laboratorios. Las geometrías, texturas y programas de GPU son idénticos en cada ciclo, y nunca hay más de un lienzo. La subida observada en ATOM 4.0 era un artefacto de leer el heap sin forzar la recolección.

**Reposo.** No se dibuja ningún fotograma en Forja, Fotones, Quantum, Arquitecto, Tabla ni Campaña. Historia deja de dibujar a los 9 s, cuando termina su animación de entrada. Masas y Geiger dibujan a propósito mientras la simulación está en marcha.

**Pendiente.**
- La campaña sigue costando unos 1,4 s por fotograma en SwiftShader. Con solo 163 llamadas y 49 000 triángulos, es rasterización por software de una escena grande; las partículas aportan unos 100 000 px por fotograma, así que no son la causa.
- La tabla periódica dibuja 69 000 triángulos (cajas redondeadas).
- Sin medir en una GPU real, en Safari ni en iPadOS: no están disponibles en este entorno.

## 3. Procedimiento escrito con localización del error
- **Qué hace.** `learning/procedure.ts` analiza las cuentas del alumno línea a línea (una cadena de igualdades por línea) y señala la primera línea en que el cálculo deja de cuadrar. Distingue:
  - **error aritmético:** dos miembros de la misma igualdad no valen lo mismo;
  - **error de unidades:** se igualan magnitudes distintas;
  - **línea no interpretable;**
  - **error de planteamiento:** las cuentas son coherentes, pero el resultado no es el pedido, lo que apunta a una fórmula o un dato equivocados.
- **Cómo funciona.**
  - Los miembros con unidad se comparan en el SI, así que «= 6,562·10⁻⁷ m = 656,2 nm» es válido.
  - Los puntos de control son los valores de los pasos numéricos del propio ejercicio, de modo que funciona en todas las familias sin datos adicionales.
  - En la notación de clase «mantisa·10ⁿ» es un solo número: 1/1,524·10⁶ = 1/(1,524·10⁶).
- **Seguridad.** No se usa `eval`. Un analizador descendente recursivo propio solo admite números, operadores, potencias, √ y π. Las pruebas rechazan entradas como `alert(1)` o `process.exit()` y comparan 200 expresiones aleatorias con su valor calculado de forma independiente.
- **En práctica.** Panel «Escribe tu procedimiento», con cada línea marcada ✓/✗ y los resultados intermedios correctos.
- **En los simulacros.** Hay procedimiento opcional por pregunta y se guarda con la sesión. Si un paso numérico está mal escrito, o en blanco, pero el procedimiento llega a su valor correcto, recibe un crédito de 0,75: es un error de transcripción, no de comprensión. El informe muestra el procedimiento con el error localizado.
- **Pruebas.** `procedure.test.ts` (28), `examSession.test.ts` y un e2e que localiza el error en la línea 3.

## 4. Didáctica: progresión completa en cada apartado
Cada sección de la guía sigue ahora la progresión que pide la directiva:
1. **Intuición**: la idea en una frase, antes de cualquier término técnico.
2. **Fundamento**: el texto de la teoría.
3. **Por qué**: la razón física.
4. **Visual interactivo**: el widget va ahora antes de la fórmula.
5. **Fórmula**: con su explorador manipulable.
6. **Deducción**: de dónde sale la fórmula, en un desplegable.
7. **Analogía y contraejemplo**.
8. **Errores, trucos y cómo lo preguntan en el examen**.
9. **Dudas frecuentes**.
10. **Conexiones**: enlaces razonados a otros apartados.

`learning/guideProgression.ts` aporta las capas nuevas:
- intuición y conexiones para las 50 secciones;
- deducciones en 12 apartados: A = Z + N, e⁻ = Z − q, media ponderada (y su problema inverso), v = λν, E = hc/λ, Rydberg a partir de Bohr, despeje de n₂, n(n − 1)/2, radios y energías de Bohr, λ = h/p, 2l + 1 y 2n², y Z_ef de Slater.

**Las deducciones están verificadas con números.** `guideProgression.test.ts` comprueba que:
- 13,6 eV/(h·c) da 1,097·10⁷ m⁻¹;
- h·c ≈ 1240 eV·nm;
- a₀ = ħ²/(m·k·e²) da 0,529 Å y ke²/(2a₀) da 13,6 eV;
- Σ(2l + 1) = n²;
- el ejemplo de Slater del Na da 2,2.

También comprueba que todas las conexiones apuntan a secciones existentes y que todas las fórmulas se analizan sin error.

## 5. Resoluciones específicas por familia
Cinco familias muy usadas dejan la plantilla genérica y pasan a tener una resolución escrita para ellas:
- línea misteriosa (despejar n₂ en Rydberg, a partir de λ o de ν);
- cascada de líneas, con la comprobación por suma y la identificación de las visibles;
- niveles de Bohr y energía de ionización;
- masa atómica media;
- abundancias a partir de la masa media (problema inverso).

Cada resolución se construye con los números del propio ejercicio y tiene comprobación de coherencia y errores típicos. Las pruebas de buena formación de fórmulas cubren ahora 10 familias con resolución propia.

## 6. Diseño: el inicio
Seguí el método de criterio de diseño: primero fijar el sujeto y el gesto, después comprobar los antipatrones.
- **Sujeto.** La entrada de un estudiante: que quede claro qué estudiar ahora y se llegue allí con un clic.
- **Gesto.** Una firma espectral junto al título: la serie de Balmer del hidrógeno, calculada con el mismo modelo que el laboratorio. Cada línea está en su longitud de onda y con su color, entra escalonada y respeta el movimiento reducido. Encarna el concepto de diseño de ATOM, «el color lo pone la física», que antes no tenía presencia en la página.
- **Antipatrón eliminado.** La cuadrícula de ocho tarjetas idénticas, típica de un panel genérico, pasa a ser un índice editorial en dos columnas, con filas separadas por líneas finas: glifo, nombre, descripción y temas en monoespaciada, y al pasar el cursor el glifo crece y aparece una flecha del color del laboratorio.
- **Título.** Equilibrado con `text-wrap: balance`.
- **Revisión.** Comprobado en escritorio (1440), iPad vertical (834) e iPad horizontal (1194). Las referencias visuales del inicio se han actualizado a propósito. Axe sigue sin encontrar infracciones.
