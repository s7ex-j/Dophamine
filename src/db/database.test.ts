import { beforeEach, describe, expect, it, vi } from "vitest";

import schema042 from "@/src/db/fixtures/v0.42.0.sql?raw";
import schema05 from "@/src/db/fixtures/v0.5.0.sql?raw";

const SCHEMAS: Record<string, string> = { "v0.5.0": schema05, "v0.42.0": schema042 };

type Row = Record<string, unknown>;
type RealDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { all: () => Row[]; get: () => Row | undefined };
};
type Node = {
  process: { getBuiltinModule: (name: string) => { DatabaseSync: new (path: string) => RealDb } };
};

// El SQLite que trae Node: aquí la base es de verdad, con el mismo SQL que corre en el teléfono.
const { DatabaseSync } = (globalThis as unknown as Node).process.getBuiltinModule("node:sqlite");
let real: RealDb;
let broken: string | null = null;

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: async () => ({
    execAsync: async (sql: string) => {
      real.exec(broken && sql.includes(broken) ? sql.replace(broken, `SELECT no_existe; ${broken}`) : sql);
    },
    getAllAsync: async (sql: string) => real.prepare(sql).all(),
    getFirstAsync: async (sql: string) => real.prepare(sql).get() ?? null,
  }),
}));

async function open(db: RealDb) {
  real = db;
  vi.resetModules();
  await (await import("@/src/db/database")).initializeDatabase();
}

const tablesOf = (db: RealDb) =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => String(row.name));

/** Columnas, llaves foráneas e índices de cada tabla, sin importar el orden en que se agregaron. */
const shape = (db: RealDb) =>
  tablesOf(db).map((table) => ({
    table,
    columns: db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((c) => [c.name, c.type, c.notnull, c.dflt_value, c.pk].join("|"))
      .sort(),
    keys: db
      .prepare(`PRAGMA foreign_key_list(${table})`)
      .all()
      .map((k) => [k.from, k.table, k.to, k.on_delete].join("|")),
    indexes: db
      .prepare(`PRAGMA index_list(${table})`)
      .all()
      .map((i) => [i.name, i.unique].join("|"))
      .sort(),
  }));

const rowsOf = (db: RealDb) =>
  tablesOf(db).map((table) => ({ table, rows: db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all() }));

/** Una base con el esquema de esa versión y datos dentro. */
function phone(version: string) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMAS[version]);
  db.exec(`
    INSERT INTO daily_biometrics (id, date, weight_kg, body_fat_pct, calories_in, protein_g)
      VALUES ('d1', '2026-01-01', 80.4, 18.5, 2310, 150.5), ('d2', '2026-01-02', NULL, NULL, 0, 0);
    INSERT INTO workouts (id, name, completed_at) VALUES ('w1', 'Torso', '2026-01-01 10:00:00');
    INSERT INTO exercise_sets (id, workout_id, exercise_name, set_number, reps, load_kg)
      VALUES ('s1', 'w1', 'Press banca', 1, 8, 62.5);
    INSERT INTO wellbeing_entries (id, date, mood, note, sleep_hours, stress)
      VALUES ('b1', '2026-01-01', 4, 'año nuevo', 7.5, 2);
    INSERT INTO habit_entries (id, habit_id, date) VALUES ('h1', 'agua', '2026-01-01');
    INSERT INTO app_settings (key, value) VALUES ('profile', '{"age":30}');
    INSERT INTO weekly_reviews (id, date, decision, previous_calories, suggested_calories, tdee)
      VALUES ('r1', '2026-01-07', 'accepted', 2300, 2200, 2500);
  `);
  return db;
}

describe("abrir la base de una versión anterior (SQLite real)", () => {
  beforeEach(() => {
    broken = null;
  });

  it.each(["v0.5.0", "v0.42.0"])("%s: conserva cada dato y queda como una recién creada", async (version) => {
    const fresh = new DatabaseSync(":memory:");
    await open(fresh);
    const db = phone(version);
    const before = rowsOf(db);

    // Dos aperturas: la segunda no cambia nada.
    for (let i = 0; i < 2; i += 1) {
      await open(db);
      expect(shape(db)).toEqual(shape(fresh));
      const after = rowsOf(db);
      for (const { table, rows } of before)
        expect(after.find((item) => item.table === table)?.rows).toMatchObject(rows);
      expect(db.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(1);
    }

    // Las restricciones siguen en pie y la decisión "auto" ya entra.
    expect(() => db.exec("UPDATE daily_biometrics SET weight_kg = -1")).toThrow(/CHECK/);
    expect(() => db.exec("UPDATE wellbeing_entries SET stress = 9")).toThrow(/CHECK/);
    db.exec("UPDATE weekly_reviews SET decision = 'auto'");
    db.exec("DELETE FROM workouts");
    expect(db.prepare("SELECT * FROM exercise_sets").all()).toEqual([]);
  });

  it("si la reconstrucción falla a medias, no se pierde nada y la siguiente apertura la termina", async () => {
    const db = phone("v0.5.0");
    const before = db.prepare("SELECT * FROM weekly_reviews").all();
    broken = "DROP TABLE weekly_reviews_old";
    await expect(open(db)).rejects.toThrow("no_existe");
    expect(db.prepare("SELECT * FROM weekly_reviews").all()).toEqual(before);
    expect(tablesOf(db)).not.toContain("weekly_reviews_old");
    expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(0);
    broken = null;
    await open(db);
    expect(db.prepare("SELECT * FROM weekly_reviews").all()).toEqual(before);
  });
});
