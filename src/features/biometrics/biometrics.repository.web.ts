import { readStore, webId, webToday, writeStore } from "@/src/db/web-storage";

/**
 * Un día: el pesaje y la composición corporal (opcionales) y el total de lo
 * comido. El total lo escribe `nutrition.repository` al sumar las comidas.
 * Puede haber días con comida y sin pesaje, y al revés.
 */
export type DailyBiometrics = {
  id: string;
  date: string;
  weightKg: number | null;
  caloriesIn: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  // Composición corporal: opcional, se llena solo cuando hay una medición.
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  waterPct?: number | null;
  boneMassKg?: number | null;
  /** La persona marcó que no registró todo lo que comió ese día. */
  partial?: boolean;
};
export type BodyInput = Pick<DailyBiometrics, "weightKg"> &
  Partial<Pick<DailyBiometrics, "bodyFatPct" | "muscleMassKg" | "waterPct" | "boneMassKg">>;
export type NutritionTotals = { kcal: number; proteinG: number; carbsG: number; fatsG: number };

const normalize = (record: Partial<DailyBiometrics> & { id: string; date: string }): DailyBiometrics => ({
  ...record,
  weightKg: record.weightKg ?? null,
  caloriesIn: record.caloriesIn ?? 0,
  proteinG: record.proteinG ?? 0,
  carbsG: record.carbsG ?? 0,
  fatsG: record.fatsG ?? 0,
  bodyFatPct: record.bodyFatPct ?? null,
  muscleMassKg: record.muscleMassKg ?? null,
  waterPct: record.waterPct ?? null,
  boneMassKg: record.boneMassKg ?? null,
  partial: record.partial === true,
});

// Devuelve el registro del día dentro del almacén, creándolo vacío si no existe.
function dayIn(store: ReturnType<typeof readStore>, date: string) {
  let record = store.biometrics.find((item) => item.date === date);
  if (!record) {
    record = { id: webId(), date, weightKg: null, caloriesIn: 0, proteinG: 0, carbsG: 0, fatsG: 0 };
    store.biometrics.push(record);
  }
  return record;
}

/** Guarda el pesaje y la composición de un día sin tocar lo comido. */
export async function saveDayBody(input: BodyInput, date = webToday()) {
  const store = readStore();
  Object.assign(dayIn(store, date), {
    weightKg: input.weightKg,
    bodyFatPct: input.bodyFatPct ?? null,
    muscleMassKg: input.muscleMassKg ?? null,
    waterPct: input.waterPct ?? null,
    boneMassKg: input.boneMassKg ?? null,
  });
  writeStore(store);
}

/** Guarda el total de lo comido en un día sin tocar el pesaje. */
export async function saveDayNutrition(totals: NutritionTotals, date = webToday()) {
  const store = readStore();
  Object.assign(dayIn(store, date), {
    caloriesIn: Math.round(totals.kcal),
    proteinG: totals.proteinG,
    carbsG: totals.carbsG,
    fatsG: totals.fatsG,
  });
  writeStore(store);
}

export async function deleteDailyBiometrics(date: string) {
  const store = readStore();
  store.biometrics = store.biometrics.filter((record) => record.date !== date);
  writeStore(store);
}
export async function getBiometricsByDate(date: string): Promise<DailyBiometrics | null> {
  const row = readStore().biometrics.find((record) => record.date === date);
  return row ? normalize(row) : null;
}
export async function getLatestBiometrics(): Promise<DailyBiometrics | null> {
  const row = [...readStore().biometrics].sort((a, b) => b.date.localeCompare(a.date))[0];
  return row ? normalize(row) : null;
}
export async function getBiometricsWindow(days: number): Promise<DailyBiometrics[]> {
  return [...readStore().biometrics]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
    .map(normalize);
}
export async function getRecentBiometrics() {
  return getBiometricsWindow(7);
}

/** Marca o desmarca un día como incompleto (no se registró todo lo comido). */
export async function setDayPartial(date: string, partial: boolean) {
  const store = readStore();
  dayIn(store, date).partial = partial;
  writeStore(store);
}
