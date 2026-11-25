-- Base creada por el código de la 0.42.0. No se edita: es lo que un teléfono puede traer.
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE daily_biometrics (
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
, water_ml INTEGER NOT NULL DEFAULT 0, partial INTEGER NOT NULL DEFAULT 0, fasting INTEGER NOT NULL DEFAULT 0, steps INTEGER);
CREATE TABLE exercise_sets (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL CHECK(set_number > 0),
  reps INTEGER CHECK(reps >= 0),
  load_kg REAL CHECK(load_kg >= 0),
  rpe REAL CHECK(rpe BETWEEN 1 AND 10)
, set_type TEXT, exercise_id TEXT, side TEXT);
CREATE TABLE foods (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  barcode TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE habit_entries (
  id TEXT PRIMARY KEY NOT NULL,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 1 CHECK(completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(habit_id, date)
);
CREATE TABLE meal_entries (
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
, alcohol_g REAL NOT NULL DEFAULT 0);
CREATE TABLE sleep_entries (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL UNIQUE,
  bedtime TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  quality INTEGER,
  source TEXT NOT NULL DEFAULT 'manual'
);
CREATE TABLE weekly_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  decision TEXT NOT NULL,
  previous_calories INTEGER NOT NULL,
  suggested_calories INTEGER NOT NULL,
  tdee INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE wellbeing_entries (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  mood INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
  energy INTEGER CHECK(energy BETWEEN 1 AND 5),
  anxiety INTEGER CHECK(anxiety BETWEEN 1 AND 5),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
, sleep_hours REAL CHECK(sleep_hours BETWEEN 0 AND 24), stress INTEGER CHECK(stress BETWEEN 1 AND 5));
CREATE TABLE workouts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX foods_barcode_idx ON foods(barcode);
CREATE INDEX habit_entries_date_idx ON habit_entries(date DESC);
CREATE INDEX meal_entries_date_idx ON meal_entries(date DESC);
CREATE INDEX weekly_reviews_date_idx ON weekly_reviews(date DESC);
CREATE INDEX wellbeing_entries_date_idx ON wellbeing_entries(date DESC);
