import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { averageIntake } from "@/src/features/tdee/checkin";
import { ENGINE_DAYS } from "@/src/features/tdee/adaptive";
import { explainAlgorithm, type AlgorithmStep } from "@/src/features/tdee/explain";
import { rangeText } from "@/src/features/tdee/tdee";

/**
 * "Cómo se calcula" como red: de dónde sale cada número y hacia dónde va.
 * Cuatro capas: lo que registras, lo que el filtro estima por dentro, lo que
 * aprende de ti y la decisión. Cada nodo lleva su valor con tus datos y si ya
 * tiene datos suficientes; cada arista, cuánto pesa hoy. Módulo puro.
 */
export type GraphLayer = 0 | 1 | 2 | 3;
export const LAYER_LABELS = [
  "Lo que registras",
  "Lo que estima el filtro",
  "Lo que aprende de ti",
  "La decisión",
];

export type GraphNode = {
  id: string;
  layer: GraphLayer;
  label: string;
  value: string;
  active: boolean;
  detail: string;
  formula: string;
};
export type GraphEdge = { from: string; to: string; strength: number };
export type AlgorithmGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

const signed = (value: number, digits = 0) =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(digits)}`;

export function algorithmGraph(snapshot: DashboardSnapshot, today: string): AlgorithmGraph {
  const steps = new Map<string, AlgorithmStep>(
    explainAlgorithm(snapshot, today).map((step) => [step.id, step]),
  );
  const { analysis, profile } = snapshot;
  const engine = analysis.adaptive?.active ? analysis.adaptive : null;
  const intake = averageIntake(snapshot.records);
  const step = (id: string) => steps.get(id);
  const node = (
    id: string,
    layer: GraphLayer,
    label: string,
    value: string,
    active: boolean,
    detail: string,
    formula: string,
  ): GraphNode => ({ id, layer, label, value, active, detail, formula });

  const sessions = snapshot.training;
  const effects = engine?.effects;
  const nodes: GraphNode[] = [
    // 0. Lo que registras.
    node(
      "intake",
      0,
      "Comida",
      intake ? `${Math.round(intake)}` : "—",
      analysis.loggedDays > 0,
      `${analysis.loggedDays} días con comida completa${analysis.partialDays ? ` y ${analysis.partialDays} incompletos (no cuentan)` : ""}. Los días con calorías estimadas suman incertidumbre en lugar de sesgar.`,
      "ingesta del día → peso real de mañana = peso real + (comido − gasto) ÷ energía por kilo",
    ),
    node(
      "scale",
      0,
      "Báscula",
      `${analysis.points.length}`,
      analysis.points.length > 0,
      `${analysis.points.length} pesajes. La báscula no mide tu peso real: mide peso real + agua + ruido.`,
      "báscula = peso real + agua (carbohidratos, comida de ayer, ciclo) + ruido",
    ),
    node(
      "carbs",
      0,
      "Carbos",
      effects?.carbsPer100g.learned ? `${signed(effects.carbsPer100g.value, 2)}` : "—",
      Boolean(effects?.carbsPer100g.learned),
      "Los carbohidratos de ayer retienen agua (glucógeno). El motor aprende cuánto en tu caso.",
      "agua por carbohidratos = efecto aprendido × (carbos de ayer − tu promedio) ÷ 100",
    ),
    node(
      "cycle",
      0,
      "Ciclo",
      snapshot.periods.length ? "sí" : "—",
      snapshot.periods.length > 0,
      snapshot.periods.length
        ? "Tu ciclo anotado separa la retención de la fase lútea y la menstruación."
        : "Si anotas tu ciclo menstrual, su retención de líquido deja de confundirse con grasa.",
      "agua del ciclo = efecto lútea (aprendido) + efecto menstruación (aprendido)",
    ),
    node(
      "training",
      0,
      "Entreno",
      sessions ? `${sessions.done}/${sessions.planned}` : "—",
      Boolean(sessions && sessions.planned),
      step("training")?.detail ?? "",
      step("training")?.formula ?? "",
    ),
    node(
      "sleep",
      0,
      "Sueño",
      snapshot.sleepMinutes
        ? `${Math.floor(snapshot.sleepMinutes / 60)}h${String(snapshot.sleepMinutes % 60).padStart(2, "0")}`
        : "—",
      snapshot.sleepMinutes !== null,
      "Con menos de 7 h en promedio no se profundiza un déficit.",
      "sueño medio < 7 h y ajuste < 0 → ajuste = 0",
    ),
    // 1. Lo que estima el filtro.
    node(
      "trueWeight",
      1,
      "Peso real",
      engine
        ? `${engine.weightKg.toFixed(1)}`
        : analysis.points.at(-1)
          ? analysis.points.at(-1)!.trendKg.toFixed(1)
          : "—",
      analysis.points.length > 0,
      engine
        ? `Peso real estimado ${engine.weightKg.toFixed(1)} ± ${(1.96 * engine.weightSd).toFixed(1)} kg.`
        : (step("trend")?.detail ?? ""),
      engine ? "estado del filtro de Kalman, corregido con cada pesaje" : (step("trend")?.formula ?? ""),
    ),
    node(
      "water",
      1,
      "Agua",
      engine?.water ? `${signed(engine.water.totalKg, 1)}` : "—",
      Boolean(engine),
      engine?.water
        ? `Hoy la báscula marca ${signed(engine.water.totalKg, 1)} kg sobre tu peso real: ${signed(engine.water.carbsKg, 2)} por carbohidratos, ${signed(engine.water.foodKg, 2)} por la comida de ayer, ${signed(engine.water.cycleKg, 2)} por el ciclo y el resto es ruido.`
        : `Se separa del peso real cuando el motor se activa (${ENGINE_DAYS} días seguidos).`,
      "agua = báscula − peso real",
    ),
    node(
      "noise",
      1,
      "Ruido",
      engine ? `±${engine.noiseKg.toFixed(2)}` : "—",
      Boolean(engine),
      engine
        ? `Tu peso varía ±${engine.noiseKg.toFixed(2)} kg de un día a otro sin motivo. Los pesajes a más de 2.5 desviaciones pesan menos${engine.outliers.length ? ` (${engine.outliers.length} atípicos)` : ""}.`
        : "Se aprende de lo que el modelo no logra explicar de cada pesaje.",
      "ruido² ← 0.9 · ruido² + 0.1 · (residuo² + incertidumbre); pérdida de Huber > 2.5σ",
    ),
    node(
      "expenditure",
      1,
      "Gasto",
      analysis.tdee ? `${analysis.tdee}` : "—",
      Boolean(analysis.tdee),
      step("observed")?.detail ?? "",
      engine
        ? `estado del filtro; deriva elegida por máxima verosimilitud: ${engine.driftKcal} kcal/día`
        : (step("observed")?.formula ?? ""),
    ),
    // 2. Lo que aprende de ti.
    node(
      "rate",
      2,
      "Ritmo",
      analysis.weeklyRateKg === null ? "—" : `${signed(analysis.weeklyRateKg, 2)}`,
      analysis.weeklyRateKg !== null,
      analysis.weeklyRateKg === null
        ? "Aún sin datos suficientes."
        : `Tu peso real cambia ${signed(analysis.weeklyRateKg, 2)} kg por semana.`,
      engine
        ? "suavizador RTS: (peso real hoy − hace 14 días) ÷ 2 semanas"
        : "pendiente de una recta ajustada a tus pesajes",
    ),
    node(
      "adaptation",
      2,
      "Adaptación",
      engine?.adaptation ? `${signed(engine.adaptation.kcal)}` : "—",
      Boolean(engine?.adaptation),
      engine?.adaptation
        ? engine.adaptation.flagged
          ? `En ${engine.adaptation.weeks} semanas tu gasto ${engine.adaptation.flagged === "down" ? "bajó" : "subió"} ${Math.abs(engine.adaptation.kcal)} kcal más de lo que explica tu cambio de peso.`
          : `Sin adaptación clara: el cambio de tu gasto (${signed(engine.adaptation.kcal)} kcal) cabe en lo que explica tu peso.`
        : "Se mide con 4 semanas de motor activo.",
      "cambio del gasto en 4–8 semanas − 22 kcal × cambio del peso real",
    ),
    node(
      "confidence",
      2,
      "Certeza",
      analysis.tdeeMargin ? `±${analysis.tdeeMargin}` : "—",
      Boolean(analysis.tdeeMargin),
      engine
        ? `Margen del 95 % del gasto: ±${analysis.tdeeMargin} kcal (desviación ${Math.round(engine.totalSd)}). Incluye un 3 % por errores que se repiten al anotar; la revisión no lo cuenta porque supone que anotas igual antes y después. Da por buena la energía de cada kilo.${analysis.tdeeRange ? ` ${rangeText(analysis.tdeeRange)}` : ""}`
        : "Margen aproximado del gasto según lo estable que es la tendencia.",
      "margen = 1.96 · √(σ²gasto + (3 % de la ingesta)²)",
    ),
    // 3. La decisión.
    node(
      "review",
      3,
      "Revisión",
      snapshot.checkIn?.ready && snapshot.checkIn.delta !== null ? signed(snapshot.checkIn.delta) : "—",
      Boolean(snapshot.checkIn?.ready),
      step("review")?.detail ?? "",
      "solo se mueve si el intervalo del 95 % (99 % para recortar en volumen) de (objetivo buscado − actual) no incluye el cero; usa la desviación de los datos, sin el 3 % de registro",
    ),
    node(
      "target",
      3,
      "Objetivo",
      profile ? `${profile.calorieTarget}` : "—",
      Boolean(profile),
      profile ? `Tu objetivo actual: ${profile.calorieTarget} kcal al día.` : "",
      "objetivo nuevo = gasto + ajuste de tu meta, en pasos de 50 o 100 kcal",
    ),
  ];

  const edges: GraphEdge[] = [
    ["intake", "trueWeight", 1],
    ["intake", "expenditure", 1],
    ["scale", "trueWeight", 1],
    ["scale", "water", 0.8],
    ["scale", "noise", 0.8],
    ["carbs", "water", 0.6],
    ["cycle", "water", 0.6],
    ["training", "expenditure", 0.5],
    ["trueWeight", "rate", 1],
    ["trueWeight", "adaptation", 0.6],
    ["water", "trueWeight", 0.5],
    ["noise", "confidence", 0.7],
    ["expenditure", "adaptation", 0.8],
    ["expenditure", "confidence", 0.8],
    ["expenditure", "review", 1],
    ["rate", "review", 0.8],
    ["confidence", "review", 0.8],
    ["adaptation", "review", 0.5],
    ["sleep", "review", 0.4],
    ["training", "review", 0.4],
    ["review", "target", 1],
  ].map(([from, to, strength]) => ({ from: from as string, to: to as string, strength: strength as number }));
  const active = new Map(nodes.map((item) => [item.id, item.active]));
  return {
    nodes,
    // Una arista entre nodos sin datos se dibuja tenue.
    edges: edges.map((edge) =>
      active.get(edge.from) && active.get(edge.to) ? edge : { ...edge, strength: edge.strength * 0.25 },
    ),
  };
}
