/** Lo mínimo de la base que usan las migraciones (para poder probarlas sin el teléfono). */
export type MigrationDb = {
  execAsync: (sql: string) => Promise<unknown>;
  getAllAsync: <T>(sql: string) => Promise<T[]>;
  getFirstAsync: <T>(sql: string) => Promise<T | null>;
};

/** Versión del esquema: sube con cada cambio. Las bases de antes de la 0.42.1 dicen 0. */
export const SCHEMA_VERSION = 1;

/** Columnas que llegaron después de crear cada tabla. */
export const ADDED_COLUMNS: Array<{ table: string; column: string; definition: string }> = [
  // 0.12.0: tipo de serie, ejercicio del catálogo y lado.
  { table: "exercise_sets", column: "set_type", definition: "TEXT" },
  { table: "exercise_sets", column: "exercise_id", definition: "TEXT" },
  { table: "exercise_sets", column: "side", definition: "TEXT" },
  { table: "daily_biometrics", column: "water_ml", definition: "INTEGER NOT NULL DEFAULT 0" },
  { table: "daily_biometrics", column: "partial", definition: "INTEGER NOT NULL DEFAULT 0" },
  // 0.16.0: alcohol por entrada y días de ayuno.
  { table: "meal_entries", column: "alcohol_g", definition: "REAL NOT NULL DEFAULT 0" },
  { table: "daily_biometrics", column: "fasting", definition: "INTEGER NOT NULL DEFAULT 0" },
  // 0.40.0: pasos del día (de Health Connect).
  { table: "daily_biometrics", column: "steps", definition: "INTEGER" },
  {
    table: "wellbeing_entries",
    column: "sleep_hours",
    definition: "REAL CHECK(sleep_hours BETWEEN 0 AND 24)",
  },
  { table: "wellbeing_entries", column: "stress", definition: "INTEGER CHECK(stress BETWEEN 1 AND 5)" },
  // 0.43.0: micronutrientes por entrada, como JSON.
  { table: "meal_entries", column: "micros", definition: "TEXT" },
];

/**
 * Pone al día una base de cualquier versión. Solo agrega lo que falta, mirando el esquema real; cualquier
 * error se propaga (la app lo muestra) en vez de seguir con una base a medias. Se puede repetir sin efecto.
 */
export async function migrate(db: MigrationDb): Promise<void> {
  // La 0.5.0 creó weekly_reviews con un CHECK que solo admitía dos decisiones: se reconstruye sin él,
  // todo o nada.
  const reviews = await db.getFirstAsync<{ sql: string }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'weekly_reviews'",
  );
  if (reviews?.sql.includes("CHECK(decision")) {
    try {
      await db.execAsync(`
        BEGIN IMMEDIATE;
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
        COMMIT;
      `);
    } catch (error) {
      await db.execAsync("ROLLBACK").catch(() => undefined);
      throw error;
    }
  }
  const columns = new Map<string, Set<string>>();
  for (const { table, column, definition } of ADDED_COLUMNS) {
    if (!columns.has(table)) {
      const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      columns.set(table, new Set(rows.map((row) => row.name)));
    }
    if (columns.get(table)?.has(column)) continue;
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    columns.get(table)?.add(column);
  }
  // Nunca se baja: una base abierta antes por una versión más nueva conserva su número.
  const current = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  if ((current?.user_version ?? 0) < SCHEMA_VERSION)
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
