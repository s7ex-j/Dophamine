import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getDatabase } from "@/src/db/database";
import { backupFileName, buildBackup, type Backup } from "@/src/features/backup/backup";
import {
  storeFromTables,
  tablesFromStore,
  type BiometricsRow,
  type FoodRow,
  type MealRow,
  type SleepRow,
  type HabitRow,
  type ReviewRow,
  type SetRow,
  type SettingRow,
  type WellbeingRow,
  type WorkoutRow,
} from "@/src/features/backup/backup.sqlite";

// Variante para Android e iOS: los datos viven en SQLite. El respaldo es un
// archivo JSON que se entrega con la hoja de compartir del sistema, para que la
// persona lo guarde donde quiera (Archivos, Drive, enviárselo a sí misma).
export const backupAvailable = true;
export const backupPlace = "este teléfono";
export const exportLabel = "Compartir respaldo";

/** Todos los datos, con la misma forma que el almacén web (para exportar). */
export async function readAllData() {
  const db = await getDatabase();
  return storeFromTables({
    biometrics: await db.getAllAsync<BiometricsRow>("SELECT * FROM daily_biometrics ORDER BY date"),
    wellbeing: await db.getAllAsync<WellbeingRow>("SELECT * FROM wellbeing_entries"),
    workouts: await db.getAllAsync<WorkoutRow>("SELECT * FROM workouts"),
    sets: await db.getAllAsync<SetRow>("SELECT * FROM exercise_sets ORDER BY rowid"),
    habits: await db.getAllAsync<HabitRow>("SELECT * FROM habit_entries ORDER BY date"),
    settings: await db.getAllAsync<SettingRow>("SELECT key, value FROM app_settings"),
    reviews: await db.getAllAsync<ReviewRow>("SELECT * FROM weekly_reviews ORDER BY date DESC, rowid DESC"),
    foods: await db.getAllAsync<FoodRow>("SELECT id, data, barcode FROM foods ORDER BY rowid"),
    meals: await db.getAllAsync<MealRow>("SELECT * FROM meal_entries ORDER BY date, rowid"),
    sleep: await db.getAllAsync<SleepRow>("SELECT * FROM sleep_entries ORDER BY date"),
  });
}

export async function downloadBackup(): Promise<void> {
  const store = await readAllData();
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(buildBackup(store), null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error("Este dispositivo no permite compartir archivos.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Guardar respaldo de Dophamine",
  });
}

/** Abre el selector de archivos del sistema. Devuelve el texto del archivo o null si se cancela. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return new File(result.assets[0].uri).text();
}

/** Reemplaza todos los datos por los del respaldo, en una sola transacción: o entra todo o no cambia nada. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const db = await getDatabase();
  const tables = tablesFromStore(backup.data);
  await db.withTransactionAsync(async () => {
    for (const table of [
      "exercise_sets",
      "workouts",
      "daily_biometrics",
      "wellbeing_entries",
      "habit_entries",
      "weekly_reviews",
      "foods",
      "meal_entries",
      "sleep_entries",
    ])
      await db.runAsync(`DELETE FROM ${table}`);
    // Todos los ajustes vienen del respaldo (plan, rutina, búsqueda en línea, Panel, recordatorios).
    await db.runAsync("DELETE FROM app_settings");

    for (const row of tables.biometrics)
      await db.runAsync(
        `INSERT INTO daily_biometrics
          (id, date, weight_kg, calories_in, protein_g, carbs_g, fats_g, body_fat_pct, muscle_mass_kg, water_pct, bone_mass_kg, partial, water_ml, fasting)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.id,
        row.date,
        row.weight_kg,
        row.calories_in,
        row.protein_g,
        row.carbs_g,
        row.fats_g,
        row.body_fat_pct,
        row.muscle_mass_kg,
        row.water_pct,
        row.bone_mass_kg,
        row.partial ?? 0,
        row.water_ml ?? 0,
        row.fasting ?? 0,
      );
    for (const row of tables.wellbeing)
      await db.runAsync(
        "INSERT INTO wellbeing_entries (id, date, mood, energy, stress, sleep_hours, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        row.id,
        row.date,
        row.mood,
        row.energy,
        row.stress,
        row.sleep_hours,
        row.note,
        row.created_at,
      );
    for (const row of tables.workouts)
      await db.runAsync(
        "INSERT INTO workouts (id, name, started_at, completed_at) VALUES (?, ?, ?, ?)",
        row.id,
        row.name,
        row.started_at,
        row.completed_at,
      );
    for (const row of tables.sets)
      await db.runAsync(
        "INSERT INTO exercise_sets (id, workout_id, exercise_name, set_number, reps, load_kg, rpe, set_type, exercise_id, side) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        row.id,
        row.workout_id,
        row.exercise_name,
        row.set_number,
        row.reps,
        row.load_kg,
        row.rpe,
        row.set_type ?? null,
        row.exercise_id ?? null,
        row.side ?? null,
      );
    for (const row of tables.habits)
      await db.runAsync(
        "INSERT INTO habit_entries (id, habit_id, date, completed) VALUES (?, ?, ?, ?)",
        row.id,
        row.habit_id,
        row.date,
        row.completed,
      );
    for (const row of tables.settings)
      await db.runAsync("INSERT INTO app_settings (key, value) VALUES (?, ?)", row.key, row.value);
    for (const row of tables.foods)
      await db.runAsync(
        "INSERT INTO foods (id, data, barcode) VALUES (?, ?, ?)",
        row.id,
        row.data,
        row.barcode,
      );
    for (const row of tables.meals)
      await db.runAsync(
        "INSERT INTO meal_entries (id, date, slot, food_id, name, grams, kcal, protein_g, carbs_g, fats_g, alcohol_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        row.id,
        row.date,
        row.slot,
        row.food_id,
        row.name,
        row.grams,
        row.kcal,
        row.protein_g,
        row.carbs_g,
        row.fats_g,
        row.alcohol_g ?? 0,
      );
    for (const row of tables.sleep ?? [])
      await db.runAsync(
        "INSERT INTO sleep_entries (id, date, bedtime, wake_time, quality, source) VALUES (?, ?, ?, ?, ?, ?)",
        row.id,
        row.date,
        row.bedtime,
        row.wake_time,
        row.quality,
        row.source,
      );
    for (const row of tables.reviews)
      await db.runAsync(
        "INSERT INTO weekly_reviews (id, date, decision, previous_calories, suggested_calories, tdee) VALUES (?, ?, ?, ?, ?, ?)",
        row.id,
        row.date,
        row.decision,
        row.previous_calories,
        row.suggested_calories,
        row.tdee,
      );
  });
}
