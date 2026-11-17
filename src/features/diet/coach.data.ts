import { coach, type Coach, type DayState } from "@/src/features/diet/coach";
import { dietDayFor, type DietPlan } from "@/src/features/diet/diet";
import { parseTime } from "@/src/lib/time";
import { getDayState, getDiet, getHealth } from "@/src/features/diet/diet.repository";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import { getMealEntries, getUserFoods } from "@/src/features/nutrition/nutrition.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { targetsForWeekday } from "@/src/features/profile/targets";
import { sleepMinutes } from "@/src/features/sleep/sleep";
import { getSleepSince } from "@/src/features/sleep/sleep.repository";
import { getRoutine } from "@/src/features/training/training.repository";
import { weekdayId } from "@/src/features/training/week";
import { getRecentWellbeingEntries } from "@/src/features/wellbeing/wellbeing.repository";
import { localDateKey } from "@/src/lib/dates";

// Junta todo lo que el asesor necesita para hoy. Usa repositorios que ya tienen
// versión SQLite y web. Devuelve null si no hay dieta cargada.

export type CoachToday = {
  plan: DietPlan;
  state: DayState;
  result: Coach;
  date: string;
  trainingDay: boolean;
};

export async function getCoachToday(now = new Date()): Promise<CoachToday | null> {
  const plan = await getDiet();
  if (!plan) return null;
  const date = localDateKey(now);
  const [saved, health, logged, mine, profile, routine, wellbeing, nights] = await Promise.all([
    getDayState(date),
    getHealth(),
    getMealEntries(date),
    getUserFoods(),
    getNutritionProfile(),
    getRoutine(),
    getRecentWellbeingEntries(3),
    getSleepSince(date),
  ]);
  const weekday = weekdayId(now);
  const today = dietDayFor(plan, routine.days.includes(weekday), weekday);
  // Si la dieta trae la hora del gimnasio de hoy, ya no hace falta preguntarla.
  const gymStart = today?.gym ? parseTime(today.gym.start) : null;
  const trainingDay = gymStart !== null || routine.days.includes(weekday);
  const state =
    gymStart !== null && saved.trainTime === undefined ? { ...saved, trainTime: gymStart } : saved;
  const day = today?.weekday ? today : dietDayFor(plan, trainingDay && !state.noTraining, weekday);
  if (!day) return null;
  const feelingToday = wellbeing.find((entry) => entry.date === date);
  const night = nights.find((entry) => entry.date === date);
  const targets = profile ? targetsForWeekday(profile, weekday, routine.days) : { calories: 0, protein: 0 };
  const result = coach({
    day,
    state,
    logged,
    now: now.getHours() * 60 + now.getMinutes(),
    trainingDay,
    feeling: {
      energy: feelingToday?.energy ?? null,
      stress: feelingToday?.stress ?? null,
      sleepMinutes: night ? sleepMinutes(night.bedtime, night.wakeTime) : null,
    },
    health,
    foods: [...mine, ...BUILTIN_FOODS],
    // Las metas que trae la dieta mandan sobre las del plan mientras se la sigue.
    targets: plan.targets
      ? { calories: plan.targets.kcal, protein: plan.targets.proteinG }
      : { calories: targets.calories, protein: targets.protein },
  });
  return { plan, state, result, date, trainingDay };
}
