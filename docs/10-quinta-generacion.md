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
