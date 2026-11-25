import { describe, expect, it } from "vitest";

import { ADDED_COLUMNS, migrate, SCHEMA_VERSION, type MigrationDb } from "@/src/db/migrations";

/** Una base de mentira que recuerda sus columnas y lo que se le pide. */
function fakeDb(
  options: { columns?: Record<string, string[]>; version?: number; oldReviews?: boolean; fail?: string } = {},
) {
  const columns = new Map(
    Object.entries(options.columns ?? {}).map(([table, list]) => [table, new Set(list)]),
  );
  const state = { version: options.version ?? 0, log: [] as string[] };
  const db: MigrationDb = {
    execAsync: async (sql) => {
      state.log.push(sql);
      if (options.fail && sql.includes(options.fail)) throw new Error("database is locked");
      const add = /ALTER TABLE (\w+) ADD COLUMN (\w+)/.exec(sql);
      if (add) {
        const set = columns.get(add[1]) ?? new Set<string>();
        if (set.has(add[2])) throw new Error(`duplicate column name: ${add[2]}`);
        columns.set(add[1], set.add(add[2]));
      }
      const version = /user_version = (\d+)/.exec(sql);
      if (version) state.version = Number(version[1]);
    },
    getAllAsync: async <T>(sql: string) =>
      [...(columns.get(/table_info\((\w+)\)/.exec(sql)?.[1] ?? "") ?? [])].map((name) => ({ name })) as T[],
    getFirstAsync: async <T>(sql: string) =>
      (sql.includes("user_version")
        ? { user_version: state.version }
        : {
            sql: options.oldReviews
              ? "CREATE TABLE weekly_reviews (decision TEXT CHECK(decision IN ('a')))"
              : "",
          }) as T,
  };
  return { db, columns, state };
}

describe("migraciones", () => {
  it("una base antigua recibe todo lo que le falta", async () => {
    const { db, columns, state } = fakeDb();
    await migrate(db);
    for (const { table, column } of ADDED_COLUMNS) expect(columns.get(table)?.has(column)).toBe(true);
    expect(state.version).toBe(SCHEMA_VERSION);
  });

  it("una base al día (0.42.0, sin número de versión) solo recibe el número", async () => {
    const full: Record<string, string[]> = {};
    for (const { table, column } of ADDED_COLUMNS) (full[table] ??= []).push(column);
    const { db, state } = fakeDb({ columns: full });
    await migrate(db);
    expect(state.log).toEqual([`PRAGMA user_version = ${SCHEMA_VERSION}`]);
  });

  it("repetirla no hace nada", async () => {
    const { db, state } = fakeDb();
    await migrate(db);
    state.log.length = 0;
    await migrate(db);
    expect(state.log).toEqual([]);
  });

  it("un error real se muestra y no marca la base como al día; luego se puede reintentar", async () => {
    const { db, state, columns } = fakeDb({ fail: "ADD COLUMN steps" });
    await expect(migrate(db)).rejects.toThrow("database is locked");
    expect(state.version).toBe(0);
    const again = fakeDb({ columns: Object.fromEntries([...columns].map(([key, set]) => [key, [...set]])) });
    await migrate(again.db);
    expect(again.columns.get("daily_biometrics")?.has("steps")).toBe(true);
  });

  it("si falla reconstruir las revisiones se deshace y se avisa", async () => {
    const { db, state } = fakeDb({ oldReviews: true, fail: "weekly_reviews_old" });
    await expect(migrate(db)).rejects.toThrow("database is locked");
    expect(state.log.at(-1)).toBe("ROLLBACK");
    expect(state.version).toBe(0);
  });

  it("no baja el número de una versión más nueva", async () => {
    const { db, state } = fakeDb({ version: 9 });
    await migrate(db);
    expect(state.version).toBe(9);
  });
});
