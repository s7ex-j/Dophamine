import { countsForIntake } from "@/src/features/biometrics/dailyLog";
import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  checkInDaysOf,
  goalCalorieOffset,
  targetWeeklyRateKg,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import { SLEEP_ENOUGH_MINUTES } from "@/src/features/sleep/sleep";
import type { MetabolicAnalysis, WeeklyCheckIn } from "@/src/features/tdee/tdee";

/**
 * Revisión periódica (cada 3 o 7 días) con contexto. Además del gasto
 * observado mira tres cosas antes de proponer un cambio:
 *
 * 1. Cumplimiento: si lo comido se apartó más de 10 % de la meta, el problema
 *    no es la meta. Mover la meta no cambia nada si no se come lo que dice.
 * 2. Sueño: con menos de 7 h en promedio, en déficit no se recorta más (se
 *    sostiene o se sube): dormir poco aumenta el hambre y la pérdida de músculo.
 * 3. Meta de peso: al acercarse, el ritmo baja; al llegar, se propone pasar a
 *    mantenimiento.
 * 4. Entreno: en volumen, si se hizo menos de la mitad de las sesiones
 *    planeadas, no se suben calorías (sin estímulo, el extra va sobre todo a
 *    grasa). Mientras el gasto se construye, avisa cuánto difiere el entreno
 *    real del que se usó para el cálculo inicial.
 * 5. Motor de autoajuste (cuando ya está activo): zona muerta. El objetivo
 *    solo se mueve si el intervalo del 95 % de (objetivo buscado − objetivo
 *    actual) no incluye el cero. Costo asimétrico: en volumen, recortar exige
 *    el 99 %, porque equivocarse recortando cuesta más que equivocarse sumando.
 *    Y y si el gasto bajó más de lo que
 *    explica el peso (adaptación) se avisa antes de recortar otra vez.
 */
export type CheckInContext = {
  /** Registros del periodo de revisión (los últimos 3 o 7 días). */
  recent: DailyBiometrics[];
  /** Horas promedio de sueño del periodo, en minutos; null si no hay registros. */
  sleepMinutes: number | null;
  /** Entreno del periodo: sesiones hechas y planeadas, y kcal netas por día reales y previstas. */
  training?: { done: number; planned: number; kcalPerDay: number; plannedKcalPerDay: number } | null;
};

export type CheckInReason =
  | "adherence"
  | "sleep"
  | "approachingGoal"
  | "goalReached"
  | "fastCorrection"
  | "training"
  | "withinMargin"
  | "adaptation";
export type ContextualCheckIn = WeeklyCheckIn & { reasons: CheckInReason[] };

/** Ingesta promedio de los días completos con comida del periodo. */
export function averageIntake(records: DailyBiometrics[]): number | null {
  const days = records.filter(countsForIntake);
  return days.length ? days.reduce((sum, record) => sum + record.caloriesIn, 0) / days.length : null;
}

/** Cuánto se apartó lo comido de la meta, en proporción (0.12 = 12 %). */
export function adherenceGap(records: DailyBiometrics[], calorieTarget: number): number | null {
  const average = averageIntake(records);
  return average === null || calorieTarget <= 0 ? null : (average - calorieTarget) / calorieTarget;
}

/**
 * Factor del ritmo según lo que falta: en las últimas 4 semanas de camino se
 * reduce de forma pareja hasta la mitad, para llegar sin pasarse.
 */
export function taperFactor(remainingKg: number, weeklyRateKg: number): number {
  if (!weeklyRateKg) return 1;
  const weeksLeft = Math.abs(remainingKg / weeklyRateKg);
  return weeksLeft >= 4 ? 1 : Math.max(0.5, weeksLeft / 4);
}

/** Frase sobre el entreno real frente al previsto, mientras el gasto se construye. */
function trainingNote(training: CheckInContext["training"]): string {
  if (!training || !training.planned) return "";
  const diff = Math.round(training.kcalPerDay - training.plannedKcalPerDay);
  const sessions = ` Entrenaste ${training.done} de ${training.planned} sesiones planeadas`;
  if (Math.abs(diff) < 40) return `${sessions}, en línea con lo que se usó para tu cálculo inicial.`;
  return `${sessions}: unas ${Math.abs(diff)} kcal por día ${diff > 0 ? "más" : "menos"} de lo previsto. Tu gasto real lo irá reflejando.`;
}

/** Cuántas desviaciones exige mover el objetivo: 1.96 (95 %), o 2.58 (99 %) para recortar en volumen. */
export const certaintyFor = (goal: NutritionProfile["goal"], difference: number) =>
  goal === "gain" && difference < 0 ? 2.58 : 1.96;

/** Zona muerta: el intervalo de la diferencia incluye el cero, así que no se mueve el objetivo. */
export const inDeadZone = (difference: number, sd: number, goal: NutritionProfile["goal"]) =>
  Math.abs(difference) < certaintyFor(goal, difference) * sd;

export function contextualCheckIn(
  analysis: MetabolicAnalysis,
  profile: NutritionProfile,
  context: CheckInContext,
): ContextualCheckIn {
  const hold = (message: string, reasons: CheckInReason[]): ContextualCheckIn => ({
    status: "updating",
    ready: true,
    suggestedCalories: profile.calorieTarget,
    delta: 0,
    message,
    reasons,
  });
  if (analysis.status !== "updating" || !analysis.tdee) {
    const message =
      analysis.status === "holding"
        ? `Estimación en pausa: registra al menos 4 días de comida y 1 pesaje esta semana. Ahora llevas ${analysis.nutritionDaysLast7} y ${analysis.weightDaysLast7}.`
        : `Construyendo tu estimación: ${analysis.loggedDays}/10 días de comida y al menos 14 días de tendencia.${trainingNote(context.training)}`;
    return {
      status: analysis.status,
      ready: false,
      suggestedCalories: null,
      delta: null,
      message,
      reasons: [],
    };
  }
  const currentKg = analysis.points.at(-1)?.trendKg ?? 0;
  const reasons: CheckInReason[] = [];

  // 3. Meta alcanzada: se pasa a mantenimiento.
  const goal = profile.goalWeightKg;
  const goingDown = profile.goal === "lose";
  if (goal && profile.goal !== "maintain" && (goingDown ? currentKg <= goal : currentKg >= goal)) {
    const delta = Math.round(analysis.tdee - profile.calorieTarget);
    return {
      status: "updating",
      ready: true,
      suggestedCalories: profile.calorieTarget + delta,
      delta,
      message: `Llegaste a tu peso meta. Para sostenerlo, tu objetivo pasa a tu gasto estimado (${analysis.tdee} kcal). Después puedes definir una meta nueva.`,
      reasons: ["goalReached"],
    };
  }

  // 1. Cumplimiento: si no se comió lo planeado, se mantiene la meta.
  const gap = adherenceGap(context.recent, profile.calorieTarget);
  if (gap !== null && Math.abs(gap) > 0.1)
    return hold(
      `En estos días comiste en promedio un ${Math.round(Math.abs(gap) * 100)} % ${gap > 0 ? "por encima" : "por debajo"} de tu meta. Mantengo el objetivo: primero acércate a él y en la próxima revisión se ajusta con datos reales.`,
      ["adherence"],
    );

  // Ritmo buscado, más lento cerca de la meta.
  // Con la misma energía por kilo con que se midió el gasto: si no, yendo justo al ritmo se propondría cambiar.
  let offset = goalCalorieOffset(profile, currentKg, analysis.energyPerKg);
  const targetRate = targetWeeklyRateKg(profile, currentKg);
  if (goal && targetRate) {
    const factor = taperFactor(goal - currentKg, targetRate);
    if (factor < 1) {
      offset = Math.round(offset * factor);
      reasons.push("approachingGoal");
    }
  }
  const desired = analysis.tdee + offset;
  let step = checkInDaysOf(profile) === 3 ? 50 : 100;
  // Si el ritmo real va muy lejos del buscado (más del doble de diferencia), se corrige más rápido.
  if (
    targetRate !== null &&
    analysis.weeklyRateKg !== null &&
    Math.abs(analysis.weeklyRateKg - targetRate) > Math.max(0.25, Math.abs(targetRate))
  ) {
    step = Math.round(step * 1.5);
    reasons.push("fastCorrection");
  }
  let delta = Math.max(-step, Math.min(step, Math.round(desired - profile.calorieTarget)));

  // Se usa la desviación del filtro y no el margen que se muestra, que suma el error de registro. Hipótesis:
  // la persona anota igual (mismo error) lo que el motor midió y lo que come al seguir el objetivo, y entonces
  // el error se cancela en la diferencia. Si cambia su forma de anotar, o el objetivo viene de una fórmula que
  // aún no se siguió anotando, puede no cumplirse. Tampoco suma la energía por kilo: se usa la misma para
  // medir y para proponer, así que su error se cancela si ya se va al ritmo objetivo; lejos de él, no.
  // 5. Motor de autoajuste: no se persigue una diferencia menor que su incertidumbre.
  const engine = analysis.adaptive?.active ? analysis.adaptive : null;
  const difference = Math.round(desired - profile.calorieTarget);
  const certainty = certaintyFor(profile.goal, difference);
  if (engine && Math.abs(delta) >= 25 && inDeadZone(difference, engine.tdeeSd, profile.goal)) {
    delta = 0;
    reasons.push("withinMargin");
  }

  // 2. Sueño: con poco descanso no se profundiza un déficit.
  const sleptPoorly = context.sleepMinutes !== null && context.sleepMinutes < SLEEP_ENOUGH_MINUTES;
  if (sleptPoorly && delta < 0) {
    delta = 0;
    reasons.push("sleep");
  }

  // 4. Entreno: en volumen, sin el entreno planeado no se suman calorías.
  const training = context.training;
  if (
    profile.goal === "gain" &&
    delta > 0 &&
    training &&
    training.planned > 0 &&
    training.done < training.planned / 2
  ) {
    delta = 0;
    reasons.push("training");
  }

  const parts: string[] = [];
  if (reasons.includes("withinMargin") && engine)
    parts.push(
      `Tus datos apuntan a ${difference > 0 ? "subir" : "bajar"} ${Math.abs(difference)} kcal, pero con lo que varían tus datos (± ${Math.round(certainty * engine.tdeeSd)} kcal) el cambio podría ser cero. Mantengo el plan hasta tener más certeza${certainty > 2 ? ": en volumen, recortar exige más seguridad que sumar" : ""}.`,
    );
  else if (Math.abs(delta) < 25)
    parts.push(
      "Tu objetivo coincide con lo que muestran tus datos. Mantén el plan hasta la próxima revisión.",
    );
  else
    parts.push(
      `Tus datos sugieren ${delta > 0 ? "subir" : "bajar"} ${Math.abs(delta)} kcal por día para seguir el ritmo de tu meta.`,
    );
  if (reasons.includes("sleep"))
    parts.push(
      "No recorto más porque dormiste menos de 7 h en promedio: con poco descanso un déficit mayor cuesta más y se pierde más músculo.",
    );
  if (reasons.includes("approachingGoal"))
    parts.push("Estás cerca de tu meta: el ritmo baja para llegar sin pasarte.");
  if (reasons.includes("fastCorrection"))
    parts.push("Tu ritmo real está lejos del buscado, así que el ajuste es mayor de lo habitual.");
  if (reasons.includes("training") && training)
    parts.push(
      `No subo calorías porque entrenaste ${training.done} de ${training.planned} sesiones: sin el estímulo del entreno, el extra se iría sobre todo a grasa.`,
    );
  if (engine?.adaptation?.flagged === "down" && profile.goal === "lose") {
    reasons.push("adaptation");
    parts.push(
      `Tu gasto bajó unas ${Math.abs(engine.adaptation.kcal)} kcal más de lo que explica tu cambio de peso en ${engine.adaptation.weeks} semanas. Es una respuesta habitual a un déficit largo: una o dos semanas comiendo a mantenimiento suelen ayudar más que recortar otra vez.`,
    );
  }
  return {
    status: "updating",
    ready: true,
    suggestedCalories: profile.calorieTarget + delta,
    delta,
    message: parts.join(" "),
    reasons,
  };
}
