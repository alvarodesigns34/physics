# 4. Sistema de simulaciones y fundamentos físicos

Cada visual de ATOM se declara con una de estas cuatro **etiquetas epistémicas**, que se ven en la interfaz:

| Etiqueta | Significado | Ejemplos |
|---|---|---|
| **Cálculo** | Magnitudes obtenidas con ecuaciones o datos de referencia | λ de una transición, Eₙ, densidad orbital, abundancias, EI |
| **Modelo histórico** | Representación fiel a un modelo superado | Átomo de Thomson, órbitas de Bohr (solo en Time Machine) |
| **Esquema** | Representación cualitativa con escala o forma no reales | Nucleones como esferas, tamaño del núcleo frente a la corteza |
| **Analogía** | Imagen didáctica sin correspondencia física directa | «Pastel de pasas», giro del electrón para el espín |

## 4.1 Constantes (CODATA 2018, `science/constants.ts`)

h = 6,626 070 15·10⁻³⁴ J·s (exacta) · c = 299 792 458 m/s (exacta) · e = 1,602 176 634·10⁻¹⁹ C (exacta) · m_e = 9,109 383 7015·10⁻³¹ kg · m_p = 1,672 621 923 69·10⁻²⁷ kg · m_n = 1,674 927 498 04·10⁻²⁷ kg · u = 1,660 539 066 60·10⁻²⁷ kg · R∞ = 10 973 731,568 160 m⁻¹ · R_H = R∞ / (1 + m_e/m_p) · a₀ = 52,917 721 090 3 pm · E_h/2 = 13,605 693 eV

Los ejercicios usan los datos de su enunciado (véase la sección 1.4).

## 4.2 Núcleo e identidad (Atomic Forge)

- Identidad: Z → elemento; A = Z + N; q = Z − e. Si q > 0 es catión; si q < 0, anión.
- **Estabilidad:** consulta de la tabla de nucleidos (NUBASE vía mendeleev): estable, radiactivo con t½ o no observado. No se calcula ningún modelo de estabilidad propio.
- **Empaquetado visual de nucleones:** algoritmo determinista de esferas compactas alrededor del centro (espiral de Fibonacci por capas con relajación por repulsión). Etiqueta: *Esquema*. Radio nuclear real de referencia: R ≈ 1,2 fm·A^(1/3).
- **Corteza:** densidad electrónica aproximada (véase 4.5).

## 4.3 Radiación electromagnética (Photon Lab)

- c = λ·ν; T = 1/ν; E = h·ν = h·c/λ; E(eV) = E(J)/e; número de ondas ṽ = 1/λ.
- **Regiones** (convención usada, límites aproximados): γ < 10 pm · X 10 pm–10 nm · UV 10–380 nm · visible 380–780 nm · IR 780 nm–1 mm · microondas 1 mm–1 m · radio > 1 m. Las fronteras son convencionales y se muestran como transiciones difusas.
- **Color de una λ visible:** funciones de igualación de color CIE 1931 (aproximación analítica multilobular de Wyman, Sloan y Shirley, 2013) → XYZ → sRGB lineal → ajuste de gama por desaturación y normalización. Etiqueta: *Cálculo* con nota «Los monitores no pueden reproducir colores espectrales puros; se muestra la aproximación sRGB más cercana».

## 4.4 Hidrógeno: Bohr y Rydberg

- **Niveles:** Eₙ = −R_H·h·c/n² (≈ −13,6 eV/n²); radios de Bohr rₙ = n²·a₀ (solo en contexto histórico).
- **Transiciones:** 1/λ = R_H·(1/n₁² − 1/n₂²) con n₂ > n₁ ≥ 1; ΔE = h·c/λ. Emisión si n_i > n_f y absorción en caso contrario.
- **Ámbito de validez, explícito en la interfaz:** solo el átomo de hidrógeno (un electrón); modelo no relativista; sin estructura fina ni hiperfina; longitudes de onda **en el vacío**. El espectroscopio usa datos NIST medidos **en aire**, que son unos 0,03 % menores en el visible (Hα: 656,47 nm en el vacío y 656,28 nm en aire). La diferencia se indica.
- **Series:** Lyman (n₁ = 1), Balmer (2), Paschen (3), Brackett (4) y Pfund (5). Límite de serie: λ∞ = n₁²/R_H. La región de cada línea se obtiene a partir de λ y no de una tabla, lo que corrige la errata E2.
- **Cascada desde n:** todas las parejas (i, j) con n ≥ i > j ≥ 1, es decir, n(n−1)/2 líneas.
- **Animación del fotón:** la *dirección* y el *instante* son decorativos (emisión espontánea isotrópica). El color y la posición en el detector son *cálculo*.

## 4.5 Orbitales y densidad electrónica

- Funciones hidrogenoides ψ_nlm = R_nl(r)·Y_lm(θ, φ) con armónicos esféricos **reales** (px, py, pz, d_xy, …) y polinomios asociados de Laguerre generalizados (evaluación recursiva estable).
- **Muestreo:** se muestrea la parte radial con la CDF invertida de P(r) = r²R²(r) sobre una malla adaptativa, y la angular por rechazo de |Y_lm|². Se aplica una semilla fija para que el resultado sea reproducible.
- **Átomos multielectrónicos:** aproximación de electrones independientes; cada subnivel usa una carga Z_ef obtenida con las reglas de Slater. Etiqueta: *Cálculo aproximado*, con la nota de que es una aproximación cualitativamente correcta (tamaños relativos y forma), no una solución exacta de Hartree-Fock.
- **Regla:** nunca se dibujan órbitas planetarias fuera de Time Machine.

## 4.6 Configuración electrónica

- Orden de Madelung (n + l y, a igualdad, menor n), equivalente al diagrama de Möller.
- **Excepciones:** se toman de la configuración fundamental de referencia (NIST/mendeleev), no de una lista escrita a mano. Un test comprueba que «Madelung + tabla de excepciones» reproduce las 118 configuraciones.
- **Iones:** los aniones añaden electrones según Aufbau. En los cationes de los bloques d y f se quitan primero los electrones del mayor n (ns antes que (n−1)d), como indica TEO p.18.
- **Validador de configuraciones escritas por el alumno:** detecta subniveles inexistentes (2d, 1p), exceso de electrones (Pauli), suma incorrecta, orden alterado y estado excitado (alguna vacante por debajo de un subnivel ocupado).

## 4.7 Carga nuclear efectiva (Slater)

Para un electrón del grupo (ns, np): mismo grupo 0,35 (1s: 0,30); capa n−1: 0,85; n−2 y anteriores: 1,00. Para nd o nf: mismo grupo 0,35; todos los anteriores: 1,00. Z_ef = Z − a.

## 4.8 Masa atómica media

M = Σ mᵢ·xᵢ con Σ xᵢ = 1. El corrector comprueba que las abundancias sumen 100 % (véase E1).

## 4.9 Validación numérica

- Todas las funciones de `science/` tienen tests unitarios contra valores de referencia: ejemplos resueltos de TEO, ejercicios de AMP resueltos a mano y valores NIST.
- **Cifras significativas:** `countSigFigs()` interpreta la respuesta *tal como la escribe* el alumno (coma o punto decimal, notación científica con ·10ⁿ, x10^n o e). Tolerancia relativa por defecto del 1 %, ajustable por ejercicio. Las cifras significativas se evalúan aparte y dan una advertencia, no un fallo, si difieren en más de una de las justificadas por los datos.
- **Unidades:** analizador con prefijos SI y conversión dimensional (m, nm, cm, Å, Hz, s⁻¹, s, J, eV, kJ/mol, u, m⁻¹, cm⁻¹). Si la unidad es correcta pero la magnitud no coincide, o si el valor es correcto en otra unidad, se da una retroalimentación específica.
