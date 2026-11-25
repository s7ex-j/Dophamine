import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { estimateExpenditure } from "@/src/features/profile/expenditure";
import { checkInDaysOf } from "@/src/features/profile/profile";
import { ENGINE_DAYS, forecastWeight } from "@/src/features/tdee/adaptive";
import { adherenceGap, averageIntake } from "@/src/features/tdee/checkin";
import { rangeText } from "@/src/features/tdee/tdee";
import { addDays } from "@/src/lib/dates";

/**
 * "Cómo se calcula": el algoritmo paso a paso con los números de la persona.
 * Cada paso dice qué hace, con qué fórmula y qué dio. Módulo puro.
 */
export type AlgorithmStep = {
  id: string;
  title: string;
  /** El resultado del paso, ya formateado ("2520 kcal"), o "—" si aún no hay datos. */
  value: string;
  /** Qué significa con tus datos. */
  detail: string;
  /** Cómo se calcula, en una línea. */
  formula: string;
  /** El paso aún no tiene datos suficientes. */
  pending: boolean;
};

const kcal = (value: number) => `${Math.round(value)} kcal`;
const signed = (value: number, decimals = 0) =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(decimals)}`;

const WEEKDAYS = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];
/** Los días con los que el motor mide el ritmo. */
const RATE_DAYS = 14;
const CONFIDENCE = { high: "alta", medium: "media", low: "baja" } as const;
const ENGINE_FORMULA =
  "peso real de mañana = peso real + (comido − gasto) ÷ energía por kilo. Báscula = peso real + agua + ruido. Un filtro de Kalman corrige el peso real y el gasto con cada pesaje.";

export function explainAlgorithm(snapshot: DashboardSnapshot, today: string): AlgorithmStep[] {
  const { profile, analysis } = snapshot;
  if (!profile) return [];
  const steps: AlgorithmStep[] = [];

  // 1. Gasto inicial.
  const estimate =
    profile.trainingDays !== undefined && profile.sessionMinutes && profile.trainingType
      ? estimateExpenditure({
          sex: profile.sex,
          age: profile.age,
          heightCm: profile.heightCm,
          weightKg: profile.startWeightKg ?? snapshot.weightKg ?? 70,
          bodyFatPct: profile.bodyFatPct,
          activity: profile.activity,
          trainingDays: profile.trainingDays,
          sessionMinutes: profile.sessionMinutes,
          trainingType: profile.trainingType,
          knownIntake: profile.knownIntake,
          recentTrend: profile.recentTrend,
        })
      : null;
  steps.push({
    id: "initial",
    title: "Gasto inicial",
    value: estimate
      ? kcal(estimate.tdee)
      : profile.initialExpenditure
        ? kcal(profile.initialExpenditure)
        : "—",
    detail: estimate
      ? `El punto de partida, antes de tener datos tuyos: basal ${estimate.bmr} + día a día ${estimate.dailyActivity} + entreno ${estimate.training} kcal, con un ajuste de ${signed(estimate.calibration)} por la ecuación del IOM${estimate.usedKnownIntake ? " y por lo que dijiste que comes" : ""}. Deja de usarse cuando aparece tu gasto real.`
      : "El punto de partida, según tu evaluación inicial. Se usa solo hasta tener tu gasto real.",
    formula:
      "Basal (Mifflin-St Jeor, o Katch-McArdle si sabes tu % de grasa) × actividad + MET del entreno × peso × horas, promediado con la ecuación del IOM.",
    pending: false,
  });

  // 2. Tendencia de peso.
  const last = analysis.points.at(-1);
  const damped = analysis.points.filter((point) => point.damped).length;
  steps.push({
    id: "trend",
    title: "Tendencia de peso",
    value: last ? `${last.trendKg.toFixed(1)} kg` : "—",
    detail: last
      ? `Un pesaje suelto engaña: el agua mueve la báscula más que la grasa. Por eso miro ${analysis.points.length} pesajes juntos${damped ? `, ${damped} con poco peso por parecer agua` : ""}. Ritmo: ${analysis.weeklyRateKg === null ? "aún sin calcular" : `${signed(analysis.weeklyRateKg, 2)} kg por semana`}.`
      : "Anota tu peso para empezar la tendencia.",
    formula:
      "Media móvil exponencial: cada pesaje mueve la tendencia un 28 %, o un 10 % si parece agua. Tras varios días sin pesarte, más. El ritmo es la pendiente de una recta ajustada a tus pesajes.",
    pending: !last,
  });

  // 3. Energía por kilo.
  steps.push({
    id: "density",
    title: "Energía de cada kilo",
    value: `${analysis.energyPerKg} kcal/kg`,
    detail: `${
      analysis.energyPerKg === 7700
        ? "Convierte kilos en calorías. Uso 7700, el valor habitual; si anotas tu % de grasa, lo calculo con lo que cambió en ti."
        : analysis.body && !analysis.body.strength
          ? "Convierte kilos en calorías. Parte de cuánta grasa tienes (con menos grasa, más de lo que se pierde es masa magra) y se acerca a lo que mida tu báscula: un kilo de grasa guarda unas 9400 kcal y uno de masa magra, unas 1800."
          : "Convierte kilos en calorías. Sale de tu composición: un kilo de grasa guarda unas 9400 kcal y uno de masa magra, unas 1800."
    }${analysis.tdeeRange ? ` ${rangeText(analysis.tdeeRange)}` : ""}`,
    formula:
      "proporción de grasa × 9400 + proporción de masa magra × 1800. El punto de partida es 7700, o grasa ÷ (grasa + 10.4 kg) si bajas de peso sin entrenar fuerza. Cuanto más ruido traen las lecturas, más se acerca a él; si no son posibles, se usa 7700.",
    pending: false,
  });

  // 4. Gasto observado.
  const intake = analysis.averageIntake;
  const engine = analysis.adaptive;
  steps.push({
    id: "observed",
    title: "Gasto real (observado)",
    value: analysis.tdee ? `${analysis.tdee} ± ${analysis.tdeeMargin ?? 0} kcal` : "—",
    detail: analysis.tdee
      ? engine?.active
        ? `Lo que gastas de verdad, medido con ${engine.days} días tuyos por el motor de autoajuste. El margen dice cuánto puede moverse con estos datos.`
        : `Lo que gastas de verdad: comiste en promedio ${intake ? kcal(intake) : "—"} y tu peso cambió ${signed(analysis.weeklyRateKg ?? 0, 2)} kg por semana. El margen dice cuánto puede moverse con estos datos.`
      : `Se activa con 14 días de tendencia y 10 de comida completos. Días de comida antes de tu último pesaje: ${analysis.loggedDays}.`,
    formula: engine?.active
      ? "El motor (paso siguiente) corrige el gasto con cada pesaje. Margen = 1.96 · √(desviación del gasto² + (3 % de lo que comes)²)."
      : "gasto = lo que comes − cambio de peso por día × energía por kilo, los dos del primer al último pesaje. Los días incompletos no cuentan.",
    pending: !analysis.tdee,
  });

  // 5. Motor de autoajuste.
  if (engine?.active) {
    const notes = [
      `Peso real estimado: ${engine.weightKg.toFixed(1)} kg${
        engine.water && Math.abs(engine.water.totalKg) >= 0.3
          ? ` (hoy la báscula marca ${signed(engine.water.totalKg, 1)} kg que son agua y contenido digestivo)`
          : ""
      }.`,
      `Tu peso varía ±${engine.noiseKg.toFixed(2)} kg de un día a otro sin motivo.`,
    ];
    const carbs = engine.effects.carbsPer100g;
    if (carbs.learned && Math.abs(carbs.value) >= 0.05)
      notes.push(
        `Por cada 100 g de carbohidratos sobre lo habitual, al día siguiente pesas ${signed(carbs.value, 2)} kg.`,
      );
    if (engine.effects.lutealKg.learned)
      notes.push(`En la fase lútea retienes ${signed(engine.effects.lutealKg.value, 1)} kg.`);
    if (engine.adaptation?.flagged)
      notes.push(
        `En ${engine.adaptation.weeks} semanas tu gasto ${engine.adaptation.flagged === "down" ? "bajó" : "subió"} unas ${Math.abs(engine.adaptation.kcal)} kcal más de lo que explica tu cambio de peso.`,
      );
    if (engine.weekday)
      notes.push(
        `Los ${WEEKDAYS[engine.weekday.day]} comes unas ${Math.abs(engine.weekday.kcal)} kcal ${engine.weekday.kcal > 0 ? "más" : "menos"} que tu promedio.`,
      );
    if (engine.outliers.length)
      notes.push(
        `${engine.outliers.length} ${engine.outliers.length === 1 ? "pesaje atípico pesó" : "pesajes atípicos pesaron"} menos.`,
      );
    const forecast = forecastWeight(engine, profile.calorieTarget, 14);
    notes.push(
      `Con tu objetivo actual, en 14 días: ${forecast.kg.toFixed(1)} ± ${(1.96 * forecast.sd).toFixed(1)} kg.`,
    );
    notes.push(
      "La certeza dice cuánto coinciden tus datos entre sí. Si anotas siempre de menos, el gasto sale más bajo en la misma medida, aunque la certeza sea alta.",
    );
    steps.push({
      id: "engine",
      title: "Motor de autoajuste",
      value: `Activo · certeza ${CONFIDENCE[engine.confidence]}`,
      detail: notes.join(" "),
      formula: ENGINE_FORMULA,
      pending: false,
    });
  } else
    steps.push({
      id: "engine",
      title: "Motor de autoajuste",
      value: `${engine?.streak ?? 0}/${ENGINE_DAYS} días seguidos`,
      detail:
        "Se activa con 15 días seguidos de peso y comida completos. Desde ahí aprende de ti: cuánto varía tu peso sin motivo, cuánta agua retienes y cómo cambia tu gasto.",
      formula: ENGINE_FORMULA,
      pending: true,
    });

  // 6. Entreno.
  const training = snapshot.training;
  steps.push({
    id: "training",
    title: `Entreno (últimos ${snapshot.period} días)`,
    value: training ? `${training.done}/${training.planned} sesiones` : "—",
    detail: training
      ? `${training.minutes} min registrados ≈ ${training.kcalPerDay} kcal netas por día (previsto: ${training.plannedKcalPerDay}). Ya está dentro de tu gasto real; mientras se construye, se compara con lo previsto. En volumen, sin la mitad de los entrenos no se suben calorías.`
      : "Anota tu peso para estimar la energía del entreno.",
    formula:
      "Por sesión: hora de fin − hora de inicio; fuerza 3.5 MET netos y cada cardio con su MET; × peso × horas.",
    pending: !training,
  });

  // 7. Revisión.
  const since = addDays(today, -(snapshot.period - 1));
  const gap = adherenceGap(
    snapshot.records.filter((record) => record.date >= since),
    profile.calorieTarget,
  );
  const checkIn = snapshot.checkIn;
  const sleep = snapshot.sleepMinutes;
  steps.push({
    id: "review",
    title: `Revisión cada ${checkInDaysOf(profile)} días`,
    value:
      checkIn?.ready && checkIn.delta !== null
        ? checkIn.delta === 0
          ? `${profile.calorieTarget} kcal (sin cambio)`
          : `${profile.calorieTarget} → ${profile.calorieTarget + checkIn.delta} kcal`
        : `${profile.calorieTarget} kcal`,
    detail: [
      gap === null
        ? "Cumplimiento: sin datos."
        : `Cumplimiento: ${signed(Math.round(gap * 100))} % frente a tu meta (más de 10 % → no se cambia).`,
      sleep === null
        ? "Sueño: sin registros."
        : `Sueño: ${Math.floor(sleep / 60)} h ${sleep % 60} min de media (menos de 7 h → no se recorta).`,
      profile.goalWeightKg
        ? `Meta: ${profile.goalWeightKg} kg (en las últimas 4 semanas el ritmo baja; al llegar, mantenimiento).`
        : "Meta: sin peso meta.",
      checkIn?.message ?? "",
    ]
      .filter(Boolean)
      .join(" "),
    formula: `objetivo nuevo = gasto real + ajuste de tu meta, con pasos de ±${checkInDaysOf(profile) === 3 ? 50 : 100} kcal (×1.5 si vas muy lejos del ritmo).`,
    pending: !checkIn?.ready,
  });
  return steps;
}

/** La cuenta central en una frase: lo que comes menos lo que tu peso dice que sobró (o faltó). */
export type EnergyBalance = {
  intake: number;
  weeklyRateKg: number;
  energyPerKg: number;
  /** Lo que el cambio de peso equivale por día; negativo si el cuerpo puso la diferencia. */
  fromWeight: number;
  tdee: number;
  margin: number;
  /** El motor pesa cada día por separado: su gasto no es exactamente la resta. */
  engine: boolean;
};

export function energyBalance({ analysis, records }: DashboardSnapshot): EnergyBalance | null {
  const { tdee, tdeeMargin, weeklyRateKg, energyPerKg } = analysis;
  const engine = Boolean(analysis.adaptive?.active);
  // El ritmo del motor es el de los últimos 14 días: la ingesta tiene que ser la de los mismos días.
  const intake = engine ? averageIntake(records.slice(0, RATE_DAYS)) : analysis.averageIntake;
  if (tdee === null || weeklyRateKg === null || intake === null) return null;
  return {
    intake: Math.round(intake),
    weeklyRateKg,
    energyPerKg,
    fromWeight: Math.round((weeklyRateKg / 7) * energyPerKg),
    tdee,
    margin: tdeeMargin ?? 0,
    engine,
  };
}

/** Lo que el cálculo no puede saber, por bueno que sea. */
export const LIMITS = [
  "Si anotas siempre de menos, tu gasto sale más bajo en la misma medida. Como tu objetivo se mide igual, el plan suele seguir funcionando mientras anotes del mismo modo.",
  "En pocos días el agua pesa más que la grasa. Por eso hacen falta dos semanas, y cada día con peso y comida completos estrecha el margen.",
  "Nadie sabe con exactitud cuánta energía guarda cada kilo tuyo. Por eso ves el gasto con varios supuestos.",
  "Pasos, sueño y entreno no se suman a tu gasto: ya están dentro de lo que mide tu peso. Sumarlos otra vez los contaría dos veces.",
];
