import { coach, type Coach, type DayState } from "@/src/features/diet/coach";
import { dietDayFor, type DietPlan } from "@/src/features/diet/diet";
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
  const [state, health, logged, mine, profile, routine, wellbeing, nights] = await Promise.all([
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
  const trainingDay = routine.days.includes(weekday);
  const day = dietDayFor(plan, trainingDay && !state.noTraining);
  if (!day) return null;
  const today = wellbeing.find((entry) => entry.date === date);
  const night = nights.find((entry) => entry.date === date);
  const targets = profile ? targetsForWeekday(profile, weekday, routine.days) : { calories: 0, protein: 0 };
  const result = coach({
    day,
    state,
    logged,
    now: now.getHours() * 60 + now.getMinutes(),
    trainingDay,
    feeling: {
      energy: today?.energy ?? null,
      stress: today?.stress ?? null,
      sleepMinutes: night ? sleepMinutes(night.bedtime, night.wakeTime) : null,
    },
    health,
    foods: [...mine, ...BUILTIN_FOODS],
    targets: { calories: targets.calories, protein: targets.protein },
  });
  return { plan, state, result, date, trainingDay };
}
