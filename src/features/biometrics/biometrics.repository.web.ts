import { readStore, webId, webToday, writeStore } from "@/src/db/web-storage";

export type DailyBiometrics = {
  id: string;
  date: string;
  weightKg: number;
  caloriesIn: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  // Composición corporal: opcional, se llena solo cuando hay una medición.
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waterPct?: number | null;
  boneMassKg?: number | null;
};
export type BiometricsInput = Pick<
  DailyBiometrics,
  "weightKg" | "caloriesIn" | "proteinG" | "carbsG" | "fatsG"
> &
  Partial<Pick<DailyBiometrics, "bodyFatPct" | "muscleMassKg" | "waterPct" | "boneMassKg">>;

const normalize = (record: DailyBiometrics): DailyBiometrics => ({
  ...record,
  carbsG: record.carbsG ?? 0,
  fatsG: record.fatsG ?? 0,
  bodyFatPct: record.bodyFatPct ?? null,
  muscleMassKg: record.muscleMassKg ?? null,
  waterPct: record.waterPct ?? null,
  boneMassKg: record.boneMassKg ?? null,
});
// Guardar reemplaza el día completo, igual que en SQLite: una medida que se deja vacía queda en null.
const complete = (input: BiometricsInput) => ({
  ...input,
  bodyFatPct: input.bodyFatPct ?? null,
  muscleMassKg: input.muscleMassKg ?? null,
  waterPct: input.waterPct ?? null,
  boneMassKg: input.boneMassKg ?? null,
});

export async function saveDailyBiometrics(input: BiometricsInput, date = webToday()) {
  const store = readStore();
  const existing = store.biometrics.find((record) => record.date === date);
  if (existing) Object.assign(existing, complete(input));
  else store.biometrics.push({ id: webId(), date, ...complete(input) });
  writeStore(store);
}
export async function deleteDailyBiometrics(date: string) {
  const store = readStore();
  store.biometrics = store.biometrics.filter((record) => record.date !== date);
  writeStore(store);
}
export async function getBiometricsByDate(date: string): Promise<DailyBiometrics | null> {
  const row = readStore().biometrics.find((record) => record.date === date);
  return row ? normalize(row as DailyBiometrics) : null;
}
export async function getLatestBiometrics(): Promise<DailyBiometrics | null> {
  const row = [...readStore().biometrics].sort((a, b) => b.date.localeCompare(a.date))[0];
  return row ? normalize(row as DailyBiometrics) : null;
}
export async function getBiometricsWindow(days: number): Promise<DailyBiometrics[]> {
  return [...readStore().biometrics]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
    .map((record) => normalize(record as DailyBiometrics));
}
export async function getRecentBiometrics() {
  return getBiometricsWindow(7);
}
