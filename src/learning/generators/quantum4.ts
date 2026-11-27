/**
 * ATOM 4.0 · Familias nuevas para los apartados con menos práctica:
 * - de-broglie (5.1): longitud de onda de partículas (electrón con velocidad dada, electrón acelerado por
 *   una diferencia de potencial, comparación partícula/objeto cotidiano).
 * - heisenberg (5.2): incertidumbre mínima en la velocidad de un electrón confinado en un átomo, frente a
 *   un objeto macroscópico. Conclusión: por qué no hay órbitas.
 * - pauli-hund (6.1, 6.2, 6.4): elegir el diagrama de cajas fundamental entre diagramas que incumplen
 *   Pauli o Hund, contar desapareados y clasificar un diagrama posible pero excitado.
 *
 * Constantes de clase: h = 6,626·10⁻³⁴ J·s, mₑ = 9,109·10⁻³¹ kg, mₚ = 1,673·10⁻²⁷ kg, e = 1,602·10⁻¹⁹ C.
 */
import type {
  Difficulty,
  Exercise,
  ExerciseGenerator,
  ResolutionStep,
} from "../types";
import {
  choicePart,
  exId,
  fmt,
  integerPart,
  numericPart,
  pick,
  rngFor,
  shuffle,
} from "./util";
import { texNum } from "../resolutions";

const H = 6.626e-34;
const ME = 9.109e-31;
const MP = 1.673e-27;
const QE = 1.602e-19;
const PI4 = 4 * Math.PI;

const constData = (extra: { label: string; value: string }[] = []) => [
  { label: "h", value: "6,626·10⁻³⁴ J·s" },
  { label: "mₑ", value: "9,109·10⁻³¹ kg" },
  ...extra,
];

// ── 5.1 De Broglie ─────────────────────────────────────────────────────────

const ATOM_SIZE = 1e-10;

function sizeChoice(lambda: number) {
  const ratio = lambda / ATOM_SIZE;
  const correct =
    ratio > 0.1 && ratio < 10 ? "similar" : ratio <= 0.1 ? "menor" : "mayor";
  return choicePart(
    "escala",
    "Comparada con el tamaño de un átomo (≈ 10⁻¹⁰ m), esa longitud de onda es…",
    [
      {
        id: "menor",
        text: "Mucho menor: el comportamiento ondulatorio no se nota",
        feedback:
          "Compara las potencias de 10: λ y el tamaño atómico difieren en menos de un orden de magnitud.",
      },
      {
        id: "similar",
        text: "Del mismo orden: el electrón se comporta como onda dentro del átomo (y se difracta en cristales)",
        feedback: "",
      },
      {
        id: "mayor",
        text: "Mucho mayor que el átomo",
        feedback: "Revisa la potencia de 10 de λ.",
      },
    ],
    [correct],
    `λ/10⁻¹⁰ m ≈ ${fmt(ratio, 2)}: ${correct === "similar" ? "del mismo orden, por eso la difracción de electrones en cristales (Davisson y Germer, 1927) confirmó la hipótesis de De Broglie." : "compáralo con el tamaño atómico."}`,
  );
}

function deBroglieResolution(lines: {
  p: number;
  lambda: number;
  v?: number;
  V?: number;
  E?: number;
  m: number;
  who: string;
}): ResolutionStep[] {
  const steps: ResolutionStep[] = [
    { kind: "pregunta", text: `Longitud de onda asociada a ${lines.who}.` },
    {
      kind: "principio",
      text: "Hipótesis de De Broglie: toda partícula con cantidad de movimiento p tiene asociada una onda de longitud",
      math: "\\lambda = \\frac{h}{p} = \\frac{h}{m\\,v}",
    },
    {
      kind: "por-que",
      text: "Es la misma relación que cumple el fotón (p = h/λ), aplicada a la materia: si la luz tiene comportamiento de partícula, la materia puede tenerlo de onda.",
    },
  ];
  if (lines.V !== undefined && lines.E !== undefined) {
    steps.push(
      {
        kind: "despeje",
        text: "Acelerado desde el reposo por una diferencia de potencial V, gana energía cinética E = e·V, y como E = p²/(2m):",
        math: "p = \\sqrt{2\\,m\\,e\\,V}",
      },
      {
        kind: "sustitucion",
        text: "",
        math: `E = ${texNum(QE)}\\cdot ${lines.V} = ${texNum(lines.E)}\\;\\text{J}\\qquad p = \\sqrt{2\\cdot ${texNum(lines.m)}\\cdot ${texNum(lines.E)}} = ${texNum(lines.p)}\\;\\text{kg·m/s}`,
      },
    );
  } else {
    steps.push({
      kind: "sustitucion",
      text: "",
      math: `p = m\\,v = ${texNum(lines.m)}\\cdot ${texNum(lines.v!)} = ${texNum(lines.p)}\\;\\text{kg·m/s}`,
    });
  }
  steps.push(
    {
      kind: "calculo",
      text: "",
      math: `\\lambda = \\frac{${texNum(H)}}{${texNum(lines.p)}} = ${texNum(lines.lambda)}\\;\\text{m}`,
    },
    { kind: "resultado", text: `λ = ${fmt(lines.lambda, 3)} m.` },
    {
      kind: "comprobacion",
      text: "Para electrones de energías habituales en el laboratorio (decenas a miles de eV), λ sale entre 10⁻¹¹ y 10⁻⁹ m. Un objeto cotidiano da del orden de 10⁻³⁴ m.",
    },
    {
      kind: "errores",
      text: "Usar la masa en gramos, olvidar la raíz al pasar de energía a cantidad de movimiento y confundir V (voltios) con v (velocidad).",
    },
  );
  return steps;
}

export const deBroglieGenerator: ExerciseGenerator = {
  id: "de-broglie",
  title: "Longitud de onda de De Broglie",
  nodeIds: ["5.1"],
  difficulties: [1, 2, 3],
  create(seed: number, difficulty: Difficulty): Exercise {
    const rng = rngFor(this.id, seed, difficulty);
    const id = exId(this.id, difficulty, seed);
    const common = {
      id,
      generatorId: this.id,
      nodeIds: ["5.1"],
      difficulty,
      stepwise: true as const,
    };
    if (difficulty === 1) {
      const v = pick(rng, [1.0e6, 1.5e6, 2.0e6, 2.5e6, 3.0e6, 4.0e6, 5.0e6]);
      const p = ME * v;
      const lambda = H / p;
      return {
        ...common,
        title: "Un electrón como onda",
        statement: `Un electrón se mueve a **${fmt(v, 2)} m/s** (velocidad no relativista). Calcula su longitud de onda de De Broglie.`,
        data: constData(),
        parts: [
          numericPart({
            id: "p",
            prompt: "Cantidad de movimiento p = m·v",
            value: p,
            unit: "kg·m/s",
            explanation: `p = ${fmt(ME, 4)} · ${fmt(v, 2)} = ${fmt(p, 3)} kg·m/s.`,
            misconceptions: [
              {
                test: (x) => Math.abs(x / (p * 1000) - 1) < 0.02,
                message:
                  "Has usado la masa en gramos: en el SI va en kilogramos.",
                skill: "unidades",
              },
            ],
          }),
          numericPart({
            id: "l",
            prompt: "Longitud de onda λ = h/p",
            value: lambda,
            unit: "m",
            explanation: `λ = ${fmt(H, 4)} / ${fmt(p, 3)} = ${fmt(lambda, 3)} m.`,
            recompute: { from: "p", fn: (x) => H / x },
            misconceptions: [
              {
                test: (x) => Math.abs(x / (p / H) - 1) < 0.02,
                message: "Has calculado p/h en lugar de h/p.",
                skill: "formula",
              },
            ],
          }),
          sizeChoice(lambda),
        ],
        hints: [
          "La hipótesis de De Broglie asocia a cada partícula una onda: λ = h/p.",
          "p = m·v con la masa en kg. Después divide h entre p.",
          `p = ${fmt(ME, 4)} · ${fmt(v, 2)}; λ = 6,626·10⁻³⁴ / p.`,
        ],
        solution: [
          `p = ${fmt(p, 3)} kg·m/s`,
          `λ = ${fmt(lambda, 3)} m, del orden del tamaño de un átomo.`,
        ],
        resolution: deBroglieResolution({
          p,
          lambda,
          v,
          m: ME,
          who: `un electrón a ${fmt(v, 2)} m/s`,
        }),
      };
    }
    if (difficulty === 2) {
      const V = pick(rng, [50, 100, 150, 200, 500, 1000]);
      const E = QE * V;
      const p = Math.sqrt(2 * ME * E);
      const lambda = H / p;
      return {
        ...common,
        title: "Electrones acelerados",
        statement: `Un electrón, inicialmente en reposo, se acelera con una diferencia de potencial de **${V} V**. Calcula su longitud de onda de De Broglie (no relativista).`,
        data: constData([{ label: "e", value: "1,602·10⁻¹⁹ C" }]),
        parts: [
          numericPart({
            id: "E",
            prompt: "Energía cinética E = e·V",
            value: E,
            unit: "J",
            explanation: `E = ${fmt(QE, 4)} · ${V} = ${fmt(E, 3)} J (= ${V} eV).`,
          }),
          numericPart({
            id: "p",
            prompt: "Cantidad de movimiento p = √(2·m·E)",
            value: p,
            unit: "kg·m/s",
            explanation: `p = √(2 · ${fmt(ME, 4)} · ${fmt(E, 3)}) = ${fmt(p, 3)} kg·m/s.`,
            recompute: { from: "E", fn: (x) => Math.sqrt(2 * ME * x) },
            misconceptions: [
              {
                test: (x) => Math.abs(x / (2 * ME * E) - 1) < 0.02,
                message: "Te falta la raíz cuadrada: p = √(2mE).",
                skill: "calculo",
              },
            ],
          }),
          numericPart({
            id: "l",
            prompt: "Longitud de onda λ = h/p",
            value: lambda,
            unit: "m",
            explanation: `λ = ${fmt(H, 4)} / ${fmt(p, 3)} = ${fmt(lambda, 3)} m.`,
            recompute: { from: "p", fn: (x) => H / x },
          }),
          sizeChoice(lambda),
        ],
        hints: [
          "La diferencia de potencial da energía cinética: E = e·V.",
          "De E = p²/(2m) se despeja p = √(2mE); luego λ = h/p.",
          `E = 1,602·10⁻¹⁹ · ${V} J; p = √(2 · 9,109·10⁻³¹ · E).`,
        ],
        solution: [
          `E = ${fmt(E, 3)} J`,
          `p = ${fmt(p, 3)} kg·m/s`,
          `λ = ${fmt(lambda, 3)} m`,
        ],
        resolution: deBroglieResolution({
          p,
          lambda,
          V,
          E,
          m: ME,
          who: `un electrón acelerado por ${V} V`,
        }),
      };
    }
    // Dificultad 3: comparación cuantitativa y conceptual.
    const v = pick(rng, [1.0e5, 2.0e5, 5.0e5, 1.0e6]);
    const obj = pick(rng, [
      { name: "un balón de fútbol", m: 0.43, v: 20 },
      { name: "una pelota de tenis", m: 0.058, v: 50 },
      { name: "una canica", m: 0.005, v: 2 },
    ]);
    const ratio = MP / ME;
    const lObj = H / (obj.m * obj.v);
    return {
      ...common,
      title: "Partículas, ondas y objetos cotidianos",
      statement: `Un electrón y un protón se mueven a la misma velocidad, **${fmt(v, 2)} m/s**. Después compara con **${obj.name}** (${obj.m} kg) a ${obj.v} m/s.`,
      data: constData([{ label: "mₚ", value: "1,673·10⁻²⁷ kg" }]),
      parts: [
        numericPart({
          id: "r",
          prompt:
            "¿Cuántas veces mayor es λ del electrón que la del protón? (λₑ/λₚ)",
          value: ratio,
          unit: "",
          sig: 4,
          relTol: 0.005,
          explanation: `Con la misma v, λ ∝ 1/m: λₑ/λₚ = mₚ/mₑ = ${fmt(MP, 4)} / ${fmt(ME, 4)} = ${fmt(ratio, 4)}. No hace falta calcular cada λ.`,
          misconceptions: [
            {
              test: (x) => Math.abs(x * ratio - 1) < 0.01,
              message:
                "Has invertido el cociente: con la misma velocidad, la partícula más ligera tiene la λ MAYOR.",
              skill: "razonamiento",
            },
          ],
        }),
        numericPart({
          id: "o",
          prompt: `λ de ${obj.name}`,
          value: lObj,
          unit: "m",
          explanation: `λ = h/(m·v) = ${fmt(H, 4)} / (${obj.m} · ${obj.v}) = ${fmt(lObj, 3)} m.`,
        }),
        choicePart(
          "c",
          `¿Por qué no se observa el comportamiento ondulatorio de ${obj.name}?`,
          [
            {
              id: "a",
              text: "Porque su λ es muchísimo menor que cualquier rendija u obstáculo: la difracción es inobservable",
              feedback: "",
            },
            {
              id: "b",
              text: "Porque los objetos macroscópicos no tienen longitud de onda asociada",
              feedback:
                "Sí la tienen (λ = h/mv vale para cualquier masa); lo que ocurre es que es diminuta.",
            },
            {
              id: "c",
              text: "Porque se mueve demasiado despacio",
              feedback:
                "Al revés: a menor velocidad, MAYOR λ. El problema es su masa enorme.",
            },
          ],
          ["a"],
          `λ ≈ ${fmt(lObj, 2)} m: unos 10²⁰ veces menor que un núcleo atómico. Ningún obstáculo puede revelar una onda así.`,
        ),
      ],
      hints: [
        "λ = h/(m·v). Si v es la misma, ¿cómo depende λ de m?",
        "El cociente λₑ/λₚ solo depende de las masas.",
        "λₑ/λₚ = mₚ/mₑ.",
      ],
      solution: [
        `λₑ/λₚ = ${fmt(ratio, 4)}`,
        `λ(${obj.name}) = ${fmt(lObj, 3)} m`,
      ],
    };
  },
};

// ── 5.2 Heisenberg ─────────────────────────────────────────────────────────

export const heisenbergGenerator: ExerciseGenerator = {
  id: "heisenberg",
  title: "Principio de incertidumbre",
  nodeIds: ["5.2", "5.3"],
  difficulties: [2, 3],
  create(seed: number, difficulty: Difficulty): Exercise {
    const rng = rngFor(this.id, seed, difficulty);
    const dx = pick(rng, [0.5e-10, 1.0e-10, 2.0e-10]);
    const dp = H / (PI4 * dx);
    const dv = dp / ME;
    const vBohr = 2.19e6;
    const parts = [
      numericPart({
        id: "dp",
        nodeIds: ["5.2"],
        prompt: "Incertidumbre mínima en la cantidad de movimiento Δp",
        value: dp,
        unit: "kg·m/s",
        explanation: `Δp ≥ h/(4π·Δx) = ${fmt(H, 4)} / (4π · ${fmt(dx, 2)}) = ${fmt(dp, 3)} kg·m/s.`,
        misconceptions: [
          {
            test: (x) => Math.abs(x / (H / dx) - 1) < 0.02,
            message: "Falta dividir entre 4π: Δx·Δp ≥ h/(4π).",
            skill: "formula",
          },
        ],
      }),
      numericPart({
        id: "dv",
        nodeIds: ["5.2"],
        prompt: "Incertidumbre mínima en la velocidad Δv = Δp/m",
        value: dv,
        unit: "m/s",
        explanation: `Δv = ${fmt(dp, 3)} / ${fmt(ME, 4)} = ${fmt(dv, 3)} m/s.`,
        recompute: { from: "dp", fn: (x) => x / ME },
      }),
      {
        nodeIds: ["5.2", "5.3"],
        ...choicePart(
          "c",
          `La velocidad del electrón en la primera órbita de Bohr es unos 2,2·10⁶ m/s. ¿Qué se concluye?`,
          [
            {
              id: "a",
              text: "La incertidumbre es comparable a la propia velocidad: no se puede asignar al electrón una trayectoria (órbita) definida",
              feedback: "",
            },
            {
              id: "b",
              text: "La incertidumbre es despreciable: el modelo de órbitas de Bohr es exacto",
              feedback: `Δv ≈ ${fmt(dv, 2)} m/s es del mismo orden que 2,2·10⁶ m/s: nada despreciable.`,
            },
            {
              id: "c",
              text: "Con mejores instrumentos se podría reducir Δv por debajo de ese valor",
              feedback:
                "El límite es de la naturaleza, no de los instrumentos.",
            },
          ],
          ["a"],
          `Δv/v ≈ ${fmt(dv / vBohr, 2)}: la velocidad está tan indeterminada como su propio valor. Por eso se sustituyen las órbitas por orbitales (probabilidad).`,
        ),
      },
    ];
    if (difficulty === 3) {
      const m = pick(rng, [0.01, 0.15, 1]);
      const dx2 = 1e-6;
      const dvObj = H / (PI4 * dx2 * m);
      parts.push(
        numericPart({
          id: "obj",
          nodeIds: ["5.2"],
          prompt: `Δv mínima de un objeto de ${m} kg localizado con Δx = 1 µm`,
          value: dvObj,
          unit: "m/s",
          explanation: `Δv = h/(4π·Δx·m) = ${fmt(dvObj, 3)} m/s: absolutamente inobservable. El principio solo se nota a escala atómica.`,
        }),
      );
    }
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ["5.2", "5.3"],
      difficulty,
      title: "Un electrón encerrado en un átomo",
      statement: `Un electrón está confinado en una región del tamaño de un átomo, **Δx = ${fmt(dx, 2)} m**. Usa el principio de incertidumbre, Δx·Δp ≥ h/(4π).`,
      data: constData(),
      parts,
      stepwise: true,
      hints: [
        "Δx·Δp ≥ h/(4π): con Δx conocido, despeja el Δp mínimo.",
        "Después, Δv = Δp/m con la masa del electrón.",
        `Δp = 6,626·10⁻³⁴ / (4π · ${fmt(dx, 2)}).`,
      ],
      solution: parts.map((p) => p.explanation),
      resolution: [
        {
          kind: "pregunta",
          text: "Cuánto queda indeterminada la velocidad de un electrón si sabemos que está dentro de un átomo.",
        },
        {
          kind: "principio",
          text: "Principio de incertidumbre de Heisenberg:",
          math: "\\Delta x\\,\\Delta p \\ge \\frac{h}{4\\pi}",
        },
        {
          kind: "por-que",
          text: "Describir al electrón como onda obliga a que una posición muy precisa lleve asociada una gran dispersión de cantidades de movimiento. No es un defecto de los instrumentos.",
        },
        {
          kind: "despeje",
          text: "Incertidumbre mínima (igualdad):",
          math: "\\Delta p = \\frac{h}{4\\pi\\,\\Delta x}\\qquad \\Delta v = \\frac{\\Delta p}{m}",
        },
        {
          kind: "sustitucion",
          text: "",
          math: `\\Delta p = \\frac{${texNum(H)}}{4\\pi\\cdot ${texNum(dx)}} = ${texNum(dp)}\\;\\text{kg·m/s}\\qquad \\Delta v = ${texNum(dv)}\\;\\text{m/s}`,
        },
        {
          kind: "interpretacion",
          text: "Δv es del mismo orden que la velocidad del electrón en el átomo: no tiene sentido una órbita con posición y velocidad definidas. De ahí el concepto de orbital.",
        },
        {
          kind: "errores",
          text: "Olvidar el 4π, confundir Δp con Δv (falta dividir por la masa) y pensar que el límite es tecnológico.",
        },
      ],
    };
  },
};

// ── 6.1 / 6.2 / 6.4 Pauli y Hund en diagramas de cajas ─────────────────────

const PH_CASES = [
  { el: "carbono", z: 6, sub: "2p", k: 2, orb: 3 },
  { el: "nitrógeno", z: 7, sub: "2p", k: 3, orb: 3 },
  { el: "oxígeno", z: 8, sub: "2p", k: 4, orb: 3 },
  { el: "silicio", z: 14, sub: "3p", k: 2, orb: 3 },
  { el: "fósforo", z: 15, sub: "3p", k: 3, orb: 3 },
  { el: "azufre", z: 16, sub: "3p", k: 4, orb: 3 },
  { el: "titanio", z: 22, sub: "3d", k: 2, orb: 5 },
  { el: "vanadio", z: 23, sub: "3d", k: 3, orb: 5 },
  { el: "manganeso", z: 25, sub: "3d", k: 5, orb: 5 },
  { el: "hierro", z: 26, sub: "3d", k: 6, orb: 5 },
  { el: "cobalto", z: 27, sub: "3d", k: 7, orb: 5 },
  { el: "níquel", z: 28, sub: "3d", k: 8, orb: 5 },
] as const;

type Box = "" | "↑" | "↓" | "↑↓" | "↑↑";
const show = (b: Box[]) => b.map((x) => `[${x || " "}]`).join(" ");

/** Fundamental: primero uno en cada orbital con espines paralelos; después se aparean. */
export function hundBoxes(k: number, orb: number): Box[] {
  return Array.from(
    { length: orb },
    (_, i) => (i < k - orb ? "↑↓" : i < k ? "↑" : "") as Box,
  );
}

export const pauliHundGenerator: ExerciseGenerator = {
  id: "pauli-hund",
  title: "Pauli y Hund en diagramas de cajas",
  nodeIds: ["6.1", "6.2", "6.4"],
  difficulties: [1, 2],
  create(seed: number, difficulty: Difficulty): Exercise {
    const rng = rngFor(this.id, seed, difficulty);
    const c = pick(
      rng,
      PH_CASES.filter((x) => (difficulty === 1 ? x.orb === 3 : true)),
    );
    const correct = hundBoxes(c.k, c.orb);
    // Apareados antes de tiempo (posible pero excitado: incumple Hund).
    const paired: Box[] = Array.from(
      { length: c.orb },
      (_, i) => (2 * i + 2 <= c.k ? "↑↓" : 2 * i + 1 === c.k ? "↑" : "") as Box,
    );
    // Desapareados con espines antiparalelos (posible pero excitado: incumple la multiplicidad máxima).
    const anti = [...correct];
    const lastSingle = anti.lastIndexOf("↑");
    anti[lastSingle] = "↓";
    // Dos electrones con el mismo espín en un orbital (imposible: incumple Pauli).
    const pauli = [...paired];
    const firstPair = pauli.indexOf("↑↓");
    pauli[firstPair] = "↑↑";
    const opts = shuffle(rng, [
      { id: "ok", text: show(correct), feedback: "" },
      {
        id: "paired",
        text: show(paired),
        feedback:
          "Se han apareado electrones quedando orbitales vacíos: incumple la regla de Hund (sería un estado excitado).",
      },
      {
        id: "anti",
        text: show(anti),
        feedback:
          "Los electrones desapareados deben tener espines PARALELOS en el estado fundamental (regla de Hund).",
      },
      {
        id: "pauli",
        text: show(pauli),
        feedback:
          "Dos electrones con el mismo espín en un orbital: incumple el principio de exclusión de Pauli. Es imposible.",
      },
    ]);
    const unpaired = c.k <= c.orb ? c.k : 2 * c.orb - c.k;
    const parts = [
      {
        ...choicePart(
          "d",
          `Diagrama de cajas del subnivel ${c.sub}${"⁰¹²³⁴⁵⁶⁷⁸⁹"[c.k]} en el estado fundamental`,
          opts,
          ["ok"],
          `Regla de Hund: ${c.k <= c.orb ? `${c.k} electrones, uno en cada orbital y con espines paralelos` : `primero uno en cada uno de los ${c.orb} orbitales; los ${c.k - c.orb} restantes se aparean`}: ${show(correct)}.`,
        ),
        nodeIds: ["6.4", "6.1"],
      },
      {
        ...integerPart(
          "u",
          "Número de electrones desapareados",
          unpaired,
          `${show(correct)} → ${unpaired} desapareado${unpaired === 1 ? "" : "s"}.`,
        ),
        nodeIds: ["6.4"],
      },
    ];
    if (difficulty === 2) {
      parts.push({
        ...choicePart(
          "q",
          `El diagrama ${show(pauli)}…`,
          [
            {
              id: "imp",
              text: "es imposible: incumple el principio de exclusión de Pauli",
              feedback: "",
            },
            {
              id: "exc",
              text: "es posible pero excitado: incumple la regla de Hund",
              feedback:
                "Hund solo decide entre estados posibles. Aquí hay dos electrones con los cuatro números cuánticos iguales.",
            },
            {
              id: "fund",
              text: "es el estado fundamental",
              feedback:
                "Fíjate en la caja con dos flechas en el mismo sentido.",
            },
          ],
          ["imp"],
          "Dos electrones en el mismo orbital comparten n, l y m; si además tienen el mismo espín, tendrían los cuatro números cuánticos iguales, y Pauli lo prohíbe.",
        ),
        nodeIds: ["6.2"],
      });
    }
    return {
      id: exId(this.id, difficulty, seed),
      generatorId: this.id,
      nodeIds: ["6.1", "6.2", "6.4"],
      difficulty,
      title: "Cajas, flechas y reglas",
      statement: `En el estado fundamental del **${c.el}** (Z = ${c.z}), el último subnivel que se llena (orden de Möller) es **${c.sub}${"⁰¹²³⁴⁵⁶⁷⁸⁹"[c.k]}**.`,
      parts,
      stepwise: true,
      hints: [
        "Cada caja es un orbital; caben como máximo dos flechas y en sentidos opuestos (Pauli).",
        `El subnivel ${c.sub} tiene ${c.orb} orbitales. Hund: primero una flecha en cada uno, todas en el mismo sentido.`,
        `Con ${c.k} electrones en ${c.orb} orbitales: ${c.k <= c.orb ? "todos desapareados" : `${c.k - c.orb} parejas y ${2 * c.orb - c.k} desapareados`}.`,
      ],
      solution: parts.map((p) => p.explanation),
    };
  },
};

export const QUANTUM4_GENERATORS: ExerciseGenerator[] = [
  deBroglieGenerator,
  heisenbergGenerator,
  pauliHundGenerator,
];
