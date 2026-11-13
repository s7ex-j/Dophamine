import type { Store } from "@/src/db/web-storage";
import type { Food } from "@/src/features/nutrition/foods";
import type { MealSlot } from "@/src/features/nutrition/meals";

/**
 * Conversión entre las filas de SQLite (teléfono) y el `Store` del respaldo.
 * Módulo puro: no toca la base. `backup.repository.ts` lee y escribe las filas.
 *
 * El respaldo usa la misma forma en las dos plataformas, así que un archivo
 * exportado en el teléfono se abre en la web y al revés.
 */
export type BiometricsRow = {
  id: string;
  date: string;
  weight_kg: number | null;
  calories_in: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
  partial?: number | null;
};
export type WellbeingRow = {
  id: string;
  date: string;
  mood: number;
  energy: number | null;
  stress: number | null;
  sleep_hours: number | null;
  note: string;
  created_at: string;
};
export type WorkoutRow = { id: string; name: string; started_at: string | null; completed_at: string | null };
export type SetRow = {
  id: string;
  workout_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  set_type?: string | null;
  exercise_id?: string | null;
  side?: string | null;
};
export type HabitRow = { id: string; habit_id: string; date: string; completed: number };
export type SettingRow = { key: string; value: string };
export type ReviewRow = {
  id: string;
  date: string;
  decision: string;
  previous_calories: number;
  suggested_calories: number;
  tdee: number | null;
};
export type FoodRow = { id: string; data: string; barcode: string | null };
export type MealRow = {
  id: string;
  date: string;
  slot: string;
  food_id: string | null;
  name: string;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};
export type SleepRow = {
  id: string;
  date: string;
  bedtime: string;
  wake_time: string;
  quality: number | null;
  source: string;
};
export type Tables = {
  sleep?: SleepRow[];
  foods: FoodRow[];
  meals: MealRow[];
  biometrics: BiometricsRow[];
  wellbeing: WellbeingRow[];
  workouts: WorkoutRow[];
  sets: SetRow[];
  habits: HabitRow[];
  settings: SettingRow[];
  reviews: ReviewRow[];
};

export const PROFILE_KEY = "nutrition_profile";
export const ROUTINE_KEY = "training_routine";
export const ONLINE_KEY = "online_lookup";

const parseJson = (text: string | undefined): unknown => {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
};

export function storeFromTables(tables: Tables): Store {
  const setting = (key: string) => parseJson(tables.settings.find((row) => row.key === key)?.value);
  const profile = setting(PROFILE_KEY) as Store["profile"];
  const routine = setting(ROUTINE_KEY) as NonNullable<Store["routines"]>[number] | undefined;
  return {
    biometrics: tables.biometrics.map((row) => ({
      id: row.id,
      date: row.date,
      weightKg: row.weight_kg,
      caloriesIn: row.calories_in,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatsG: row.fats_g,
      bodyFatPct: row.body_fat_pct,
      muscleMassKg: row.muscle_mass_kg,
      waterPct: row.water_pct,
      boneMassKg: row.bone_mass_kg,
      ...(row.partial === 1 ? { partial: true } : {}),
    })),
    // La web guarda los chequeos del más reciente al más antiguo.
    wellbeing: [...tables.wellbeing]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((row) => ({
        id: row.id,
        date: row.date,
        mood: row.mood,
        ...(row.energy === null ? {} : { energy: row.energy }),
        ...(row.stress === null ? {} : { stress: row.stress }),
        ...(row.sleep_hours === null ? {} : { sleepHours: row.sleep_hours }),
        note: row.note,
      })),
    workouts: [...tables.workouts]
      .filter((row) => row.completed_at)
      .sort((a, b) => (b.completed_at as string).localeCompare(a.completed_at as string))
      .map((row) => {
        // En el teléfono cada serie es una fila; el respaldo guarda una línea por ejercicio.
        const sets = tables.sets
          .filter((set) => set.workout_id === row.id)
          .sort((a, b) => a.set_number - b.set_number);
        const names = [...new Set(sets.map((set) => set.exercise_name))];
        // Desde la 0.12.0 las series tienen tipo: entonces se guardan todas, no solo una por ejercicio.
        const detailed = sets.some((set) => set.set_type);
        return {
          id: row.id,
          name: row.name,
          completedAt: row.completed_at as string,
          ...(detailed && row.started_at ? { startedAt: row.started_at } : {}),
          exerciseCount: names.length,
          sessionLogs: names.map((exerciseName) => {
            const first = sets.find((set) => set.exercise_name === exerciseName) as SetRow;
            return {
              exerciseName,
              loadKg: first.load_kg,
              reps: first.reps,
              rir: first.rpe === null ? null : 10 - first.rpe,
            };
          }),
          ...(detailed
            ? {
                // En el orden en que se hicieron, no agrupadas por número de serie.
                sets: tables.sets
                  .filter((set) => set.workout_id === row.id)
                  .map((set) => ({
                    exerciseName: set.exercise_name,
                    ...(set.exercise_id ? { exerciseId: set.exercise_id } : {}),
                    setNumber: set.set_number,
                    type:
                      set.set_type === "warmup" || set.set_type === "drop"
                        ? set.set_type
                        : ("working" as const),
                    loadKg: set.load_kg,
                    reps: set.reps,
                    rir: set.rpe === null ? null : 10 - set.rpe,
                    ...(set.side === "left" || set.side === "right" ? { side: set.side } : {}),
                  })),
              }
            : {}),
        };
      }),
    habits: tables.habits.map((row) => ({
      id: row.habit_id,
      date: row.date,
      completed: row.completed === 1,
    })),
    routines: routine ? [routine] : [],
    ...(profile ? { profile } : {}),
    reviews: tables.reviews.map((row) => ({
      id: row.id,
      date: row.date,
      decision: row.decision as "accepted" | "dismissed" | "auto",
      previousCalories: row.previous_calories,
      suggestedCalories: row.suggested_calories,
      tdee: row.tdee,
    })),
    foods: tables.foods.flatMap((row) => {
      const food = parseJson(row.data) as Food | undefined;
      return food ? [food] : [];
    }),
    meals: tables.meals.map((row) => ({
      id: row.id,
      date: row.date,
      slot: row.slot as MealSlot,
      ...(row.food_id ? { foodId: row.food_id } : {}),
      name: row.name,
      ...(row.grams === null ? {} : { grams: row.grams }),
      kcal: row.kcal,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatsG: row.fats_g,
    })),
    sleep: (tables.sleep ?? []).map((row) => ({
      id: row.id,
      date: row.date,
      bedtime: row.bedtime,
      wakeTime: row.wake_time,
      quality: row.quality,
      source: row.source === "health" ? "health" : "manual",
    })),
    settings: {
      onlineLookup: tables.settings.find((row) => row.key === ONLINE_KEY)?.value === "on",
      // El resto de ajustes (orden del Panel, recordatorios) viaja tal cual, como JSON.
      ...Object.fromEntries(
        tables.settings.flatMap((row) => {
          if ([PROFILE_KEY, ROUTINE_KEY, ONLINE_KEY].includes(row.key)) return [];
          const value = parseJson(row.value);
          return value === undefined ? [] : [[row.key, value]];
        }),
      ),
    },
  };
}

export function tablesFromStore(store: Store): Tables {
  const settings: SettingRow[] = [];
  if (store.profile) settings.push({ key: PROFILE_KEY, value: JSON.stringify(store.profile) });
  if (store.routines?.[0]) settings.push({ key: ROUTINE_KEY, value: JSON.stringify(store.routines[0]) });
  if (store.settings?.onlineLookup) settings.push({ key: ONLINE_KEY, value: "on" });
  for (const [key, value] of Object.entries(store.settings ?? {}))
    if (key !== "onlineLookup" && value !== undefined && value !== null)
      settings.push({ key, value: JSON.stringify(value) });
  // Dos registros del mismo día no caben en el teléfono (la fecha es única): gana el último.
  const byDate = new Map(store.biometrics.map((record) => [record.date, record]));
  const total = store.wellbeing.length;
  return {
    biometrics: [...byDate.values()].map((record) => ({
      id: record.id,
      date: record.date,
      weight_kg: record.weightKg,
      calories_in: Math.round(record.caloriesIn),
      protein_g: record.proteinG,
      carbs_g: record.carbsG ?? 0,
      fats_g: record.fatsG ?? 0,
      body_fat_pct: record.bodyFatPct ?? null,
      muscle_mass_kg: record.muscleMassKg ?? null,
      water_pct: record.waterPct ?? null,
      bone_mass_kg: record.boneMassKg ?? null,
      partial: record.partial ? 1 : 0,
    })),
    // El respaldo no trae la hora del chequeo: se reconstruye una que conserve el orden.
    wellbeing: store.wellbeing.map((entry, index) => ({
      id: entry.id,
      date: entry.date,
      mood: entry.mood,
      energy: entry.energy ?? null,
      stress: entry.stress ?? null,
      sleep_hours: entry.sleepHours ?? null,
      note: entry.note ?? "",
      created_at: `${entry.date} 12:00:00.${String(total - index).padStart(6, "0")}`,
    })),
    workouts: store.workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      started_at: workout.startedAt ?? workout.completedAt,
      completed_at: workout.completedAt,
    })),
    sets: store.workouts.flatMap((workout) =>
      workout.sets
        ? workout.sets.map((set, index) => ({
            id: `${workout.id}-${index + 1}`,
            workout_id: workout.id,
            exercise_name: set.exerciseName,
            set_number: set.setNumber,
            reps: set.reps,
            load_kg: set.loadKg,
            rpe: set.rir === null ? null : Math.min(10, Math.max(1, 10 - set.rir)),
            set_type: set.type,
            exercise_id: set.exerciseId ?? null,
            side: set.side ?? null,
          }))
        : (workout.sessionLogs ?? []).map((log, index) => ({
            id: `${workout.id}-${index + 1}`,
            workout_id: workout.id,
            exercise_name: log.exerciseName,
            set_number: 1,
            reps: log.reps,
            load_kg: log.loadKg,
            // La tabla solo admite RPE de 1 a 10.
            rpe: log.rir === null || log.rir === undefined ? null : Math.min(10, Math.max(1, 10 - log.rir)),
          })),
    ),
    habits: (store.habits ?? []).map((habit) => ({
      id: `${habit.id}-${habit.date}`,
      habit_id: habit.id,
      date: habit.date,
      completed: habit.completed ? 1 : 0,
    })),
    settings,
    reviews: (store.reviews ?? []).map((review) => ({
      id: review.id,
      date: review.date,
      decision: review.decision,
      previous_calories: Math.round(review.previousCalories),
      suggested_calories: Math.round(review.suggestedCalories),
      tdee: review.tdee === null ? null : Math.round(review.tdee),
    })),
    foods: (store.foods ?? []).map((food) => ({
      id: food.id,
      data: JSON.stringify(food),
      barcode: food.barcode ?? null,
    })),
    meals: (store.meals ?? []).map((entry) => ({
      id: entry.id,
      date: entry.date,
      slot: entry.slot,
      food_id: entry.foodId ?? null,
      name: entry.name,
      grams: entry.grams ?? null,
      kcal: entry.kcal,
      protein_g: entry.proteinG,
      carbs_g: entry.carbsG,
      fats_g: entry.fatsG,
    })),
    sleep: (store.sleep ?? []).map((entry) => ({
      id: entry.id,
      date: entry.date,
      bedtime: entry.bedtime,
      wake_time: entry.wakeTime,
      quality: entry.quality,
      source: entry.source,
    })),
  };
}
