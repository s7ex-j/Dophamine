import { getDatabase } from "@/src/db/database";
import type { SleepEntry, SleepInput } from "@/src/features/sleep/sleep";

// Variante SQLite. Una noche por fecha (el día en que se despierta).
type Row = {
  id: string;
  date: string;
  bedtime: string;
  wake_time: string;
  quality: number | null;
  source: "manual" | "health";
};
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fromRow = (row: Row): SleepEntry => ({
  id: row.id,
  date: row.date,
  bedtime: row.bedtime,
  wakeTime: row.wake_time,
  quality: row.quality,
  source: row.source,
});

export async function saveSleep(input: SleepInput, date: string, source: SleepEntry["source"] = "manual") {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sleep_entries (id, date, bedtime, wake_time, quality, source) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET bedtime = excluded.bedtime, wake_time = excluded.wake_time,
      quality = excluded.quality, source = excluded.source`,
    id(),
    date,
    input.bedtime,
    input.wakeTime,
    input.quality,
    source,
  );
}

export async function deleteSleep(date: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM sleep_entries WHERE date = ?", date);
}

/** Las noches desde una fecha, de la más antigua a la más reciente. */
export async function getSleepSince(date: string): Promise<SleepEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>("SELECT * FROM sleep_entries WHERE date >= ? ORDER BY date", date);
  return rows.map(fromRow);
}
