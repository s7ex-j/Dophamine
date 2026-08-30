import * as SQLite from "expo-sqlite";

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!database) database = await SQLite.openDatabaseAsync("balance.db");
  return database;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS daily_biometrics (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL UNIQUE,
      weight_kg REAL CHECK(weight_kg > 0),
      body_fat_pct REAL CHECK(body_fat_pct BETWEEN 0 AND 100),
      muscle_mass_kg REAL CHECK(muscle_mass_kg >= 0),
      water_pct REAL CHECK(water_pct BETWEEN 0 AND 100),
      bone_mass_kg REAL CHECK(bone_mass_kg >= 0),
      calories_in INTEGER NOT NULL DEFAULT 0 CHECK(calories_in >= 0),
      protein_g REAL NOT NULL DEFAULT 0 CHECK(protein_g >= 0),
      carbs_g REAL NOT NULL DEFAULT 0 CHECK(carbs_g >= 0),
      fats_g REAL NOT NULL DEFAULT 0 CHECK(fats_g >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wellbeing_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      mood INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
      energy INTEGER CHECK(energy BETWEEN 1 AND 5),
      anxiety INTEGER CHECK(anxiety BETWEEN 1 AND 5),
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS wellbeing_entries_date_idx ON wellbeing_entries(date DESC);
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS exercise_sets (
      id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL CHECK(set_number > 0),
      reps INTEGER CHECK(reps >= 0),
      load_kg REAL CHECK(load_kg >= 0),
      rpe REAL CHECK(rpe BETWEEN 1 AND 10)
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

