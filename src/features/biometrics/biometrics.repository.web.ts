import { readStore, webId, webToday, writeStore } from "@/src/db/web-storage";

export type DailyBiometrics = { id: string; date: string; weightKg: number; caloriesIn: number; proteinG: number; carbsG: number; fatsG: number };
export type BiometricsInput = Pick<DailyBiometrics, "weightKg" | "caloriesIn" | "proteinG" | "carbsG" | "fatsG">;
const normalize = (record: DailyBiometrics) => ({ ...record, carbsG: record.carbsG ?? 0, fatsG: record.fatsG ?? 0 });

export async function saveDailyBiometrics(input: BiometricsInput) {
  const store = readStore();
  const date = webToday();
  const existing = store.biometrics.find((record) => record.date === date);
  if (existing) Object.assign(existing, input); else store.biometrics.push({ id: webId(), date, ...input });
  writeStore(store);
}
export async function getLatestBiometrics(): Promise<DailyBiometrics | null> { const row = [...readStore().biometrics].sort((a, b) => b.date.localeCompare(a.date))[0]; return row ? normalize(row as DailyBiometrics) : null; }
export async function getBiometricsWindow(days: number): Promise<DailyBiometrics[]> { return [...readStore().biometrics].sort((a, b) => b.date.localeCompare(a.date)).slice(0, days).map((record) => normalize(record as DailyBiometrics)); }
export async function getRecentBiometrics() { return getBiometricsWindow(7); }

