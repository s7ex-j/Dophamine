import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { estimateExpenditure } from "@/src/features/profile/expenditure";
import { checkInDaysOf } from "@/src/features/profile/profile";
import { adherenceGap, averageIntake } from "@/src/features/tdee/checkin";
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
      ? `Basal ${estimate.bmr} + día a día ${estimate.dailyActivity} + entreno ${estimate.training} kcal, ajustado ${signed(estimate.calibration)} al combinarlo con la ecuación del IOM${estimate.usedKnownIntake ? " y con lo que dijiste que comes" : ""}.`
      : "Sale de tu evaluación inicial. Se usa solo hasta tener tu gasto real.",
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
      ? `${analysis.points.length} pesajes suavizados${damped ? `, ${damped} con poco peso por parecer agua` : ""}. Ritmo: ${analysis.weeklyRateKg === null ? "aún sin calcular" : `${signed(analysis.weeklyRateKg, 2)} kg por semana`}.`
      : "Anota tu peso para empezar la tendencia.",
    formula:
      "Media móvil exponencial (cada pesaje mueve la tendencia un 28 %, o un 10 % si parece agua). El ritmo es la pendiente de una recta ajustada a toda la tendencia.",
    pending: !last,
  });

  // 3. Energía por kilo.
  steps.push({
    id: "density",
    title: "Energía de cada kilo",
    value: `${analysis.energyPerKg} kcal/kg`,
    detail:
      analysis.energyPerKg === 7700
        ? "Valor estándar. Si anotas tu % de grasa, se calcula cuánto del cambio es grasa y cuánto masa magra."
        : "Calculado con tu composición: la grasa aporta ~9400 kcal/kg y la masa magra ~1800.",
    formula: "proporción de grasa × 9400 + proporción de masa magra × 1800 (7700 si no hay composición).",
    pending: false,
  });

  // 4. Gasto observado.
  const intake = averageIntake(snapshot.records);
  steps.push({
    id: "observed",
    title: "Gasto real (observado)",
    value: analysis.tdee ? `${analysis.tdee} ± ${analysis.tdeeMargin ?? 0} kcal` : "—",
    detail: analysis.tdee
      ? `Comiste en promedio ${intake ? kcal(intake) : "—"} y tu tendencia cambió ${signed(analysis.weeklyRateKg ?? 0, 2)} kg/semana: eso equivale a ${kcal(analysis.tdee)} de gasto.`
      : `Se activa con 14 días de tendencia y 10 de comida completos. Llevas ${analysis.loggedDays} días de comida.`,
    formula:
      "ingesta media − (cambio de peso por día × energía por kilo). Los días marcados como incompletos no cuentan.",
    pending: !analysis.tdee,
  });

  // 5. Entreno.
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

  // 6. Revisión.
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
