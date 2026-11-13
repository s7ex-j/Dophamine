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
    CREATE TABLE IF NOT EXISTS habit_entries (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(habit_id, date)
    );
    CREATE INDEX IF NOT EXISTS habit_entries_date_idx ON habit_entries(date DESC);
    CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      barcode TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS foods_barcode_idx ON foods(barcode);
    CREATE TABLE IF NOT EXISTS meal_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      food_id TEXT,
      name TEXT NOT NULL,
      grams REAL,
      kcal REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fats_g REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS meal_entries_date_idx ON meal_entries(date DESC);
    CREATE TABLE IF NOT EXISTS sleep_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL UNIQUE,
      bedtime TEXT NOT NULL,
      wake_time TEXT NOT NULL,
      quality INTEGER,
      source TEXT NOT NULL DEFAULT 'manual'
    );
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      decision TEXT NOT NULL,
      previous_calories INTEGER NOT NULL,
      suggested_calories INTEGER NOT NULL,
      tdee INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS weekly_reviews_date_idx ON weekly_reviews(date DESC);
  `);
  // La 0.5.0 creó weekly_reviews con un CHECK que solo admitía dos decisiones.
  // Si esa tabla existe, se reconstruye sin el CHECK para admitir "auto".
  const reviewsTable = await db.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'weekly_reviews'",
  );
  if (reviewsTable?.sql.includes("CHECK(decision"))
    await db.execAsync(`
      ALTER TABLE weekly_reviews RENAME TO weekly_reviews_old;
      CREATE TABLE weekly_reviews (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        decision TEXT NOT NULL,
        previous_calories INTEGER NOT NULL,
        suggested_calories INTEGER NOT NULL,
        tdee INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO weekly_reviews SELECT * FROM weekly_reviews_old;
      DROP TABLE weekly_reviews_old;
      CREATE INDEX IF NOT EXISTS weekly_reviews_date_idx ON weekly_reviews(date DESC);
    `);
  // Desde la 0.12.0 cada serie guarda su tipo, el ejercicio del catálogo y el lado.
  for (const column of ["set_type TEXT", "exercise_id TEXT", "side TEXT"])
    try {
      await db.execAsync(`ALTER TABLE exercise_sets ADD COLUMN ${column}`);
    } catch {
      /* Ya existe. */
    }
  try {
    await db.execAsync("ALTER TABLE daily_biometrics ADD COLUMN water_ml INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* Ya existe. */
  }
  try {
    await db.execAsync("ALTER TABLE daily_biometrics ADD COLUMN partial INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* Ya existe. */
  }
  try {
    await db.execAsync(
      "ALTER TABLE wellbeing_entries ADD COLUMN sleep_hours REAL CHECK(sleep_hours BETWEEN 0 AND 24)",
    );
  } catch {
    /* Existing installs already have their schema. */
  }
  try {
    await db.execAsync(
      "ALTER TABLE wellbeing_entries ADD COLUMN stress INTEGER CHECK(stress BETWEEN 1 AND 5)",
    );
  } catch {
    /* Existing installs already have their schema. */
  }
}
