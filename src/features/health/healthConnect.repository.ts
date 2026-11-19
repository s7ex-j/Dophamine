import type * as HealthConnect from "react-native-health-connect";

import {
  getBiometricsByDate,
  saveDayBody,
  saveDayNutrition,
  setDaySteps,
} from "@/src/features/biometrics/biometrics.repository";
import {
  foodToImport,
  IMPORT_DAYS,
  nightsToImport,
  stepsByDay,
  weightsToImport,
} from "@/src/features/health/healthConnect";
import { getSleepSince, saveSleep } from "@/src/features/sleep/sleep.repository";
import { addDays, localDateKey } from "@/src/lib/dates";

// Lectura de Health Connect en Android (variante web: healthConnect.repository.web.ts).
// Solo lee, y solo lo que la persona autoriza en la ventana del sistema. Todo queda en el teléfono.

// El módulo nativo se carga al usarlo: en un build sin él, Más no se rompe y la tarjeta no aparece.
const native = () => require("react-native-health-connect") as typeof HealthConnect;

export type HealthConnectStatus = "available" | "needs-update" | "unavailable";
export type HealthImport = { weights: number; nights: number; stepDays: number; foodDays: number };

const PERMISSIONS = [
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "BodyFat" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "Nutrition" },
] as const;

export async function healthConnectStatus(): Promise<HealthConnectStatus> {
  try {
    const { getSdkStatus, SdkAvailabilityStatus } = native();
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return "available";
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "needs-update";
    return "unavailable";
  } catch {
    // Sin el módulo nativo (development build viejo): como si no estuviera.
    return "unavailable";
  }
}

/** Abre Health Connect para instalarlo, actualizarlo o revisar los permisos. */
export function openHealthConnect() {
  try {
    native().openHealthConnectSettings();
  } catch {
    // Sin el módulo nativo no hay nada que abrir.
  }
}

/**
 * Pide permiso (si falta) y trae peso, % de grasa y sueño de los últimos 30 días. Solo llena días
 * sin datos: lo anotado a mano no se toca. Devuelve cuántos días de peso y noches se agregaron.
 */
export async function importFromHealthConnect(): Promise<HealthImport> {
  const { initialize, readRecords, requestPermission } = native();
  await initialize();
  const granted = await requestPermission([...PERMISSIONS]);
  const allowed = (type: string) => granted.some((permission) => permission.recordType === type);
  if (!PERMISSIONS.some((permission) => allowed(permission.recordType)))
    throw new Error("No se dio permiso para leer los datos.");

  const today = localDateKey();
  const from = addDays(today, -IMPORT_DAYS);
  const timeRangeFilter = {
    operator: "between" as const,
    startTime: new Date(`${from}T00:00:00`).toISOString(),
    endTime: new Date().toISOString(),
  };

  const days = Array.from({ length: IMPORT_DAYS + 1 }, (_, index) => addDays(from, index));
  const daysWithWeight = new Set<string>();
  const daysWithFood = new Set<string>();
  for (const day of days) {
    const record = await getBiometricsByDate(day);
    if (record?.weightKg) daysWithWeight.add(day);
    if (record && (record.caloriesIn > 0 || record.fasting)) daysWithFood.add(day);
  }
  const daysWithSleep = new Set((await getSleepSince(from)).map((entry) => entry.date));

  let weights = 0;
  if (allowed("Weight")) {
    const weightRecords = (await readRecords("Weight", { timeRangeFilter })).records;
    const fatRecords = allowed("BodyFat") ? (await readRecords("BodyFat", { timeRangeFilter })).records : [];
    const toSave = weightsToImport(
      weightRecords.map((record) => ({ time: record.time, kg: record.weight.inKilograms })),
      fatRecords.map((record) => ({ time: record.time, pct: record.percentage })),
      daysWithWeight,
    );
    for (const day of toSave)
      await saveDayBody({ weightKg: day.weightKg, bodyFatPct: day.bodyFatPct }, day.date);
    weights = toSave.length;
  }

  let nights = 0;
  if (allowed("SleepSession")) {
    const sleepRecords = (await readRecords("SleepSession", { timeRangeFilter })).records;
    const toSave = nightsToImport(
      sleepRecords.map((record) => ({ start: record.startTime, end: record.endTime })),
      daysWithSleep,
    );
    for (const night of toSave)
      await saveSleep(
        { bedtime: night.bedtime, wakeTime: night.wakeTime, quality: null },
        night.date,
        "health",
      );
    nights = toSave.length;
  }
  // Los pasos no se anotan a mano: lo de Health Connect manda.
  let stepDays = 0;
  if (allowed("Steps")) {
    const stepRecords = (await readRecords("Steps", { timeRangeFilter })).records;
    const toSave = stepsByDay(
      stepRecords.map((record) => ({ start: record.startTime, count: record.count })),
    );
    for (const day of toSave) await setDaySteps(day.date, day.steps);
    stepDays = toSave.length;
  }

  let foodDays = 0;
  if (allowed("Nutrition")) {
    const mealRecords = (await readRecords("Nutrition", { timeRangeFilter })).records;
    const toSave = foodToImport(
      mealRecords.map((record) => ({
        start: record.startTime,
        kcal: record.energy?.inKilocalories ?? 0,
        proteinG: record.protein?.inGrams ?? 0,
        carbsG: record.totalCarbohydrate?.inGrams ?? 0,
        fatsG: record.totalFat?.inGrams ?? 0,
      })),
      daysWithFood,
    );
    for (const day of toSave)
      await saveDayNutrition(
        { kcal: day.kcal, proteinG: day.proteinG, carbsG: day.carbsG, fatsG: day.fatsG },
        day.date,
      );
    foodDays = toSave.length;
  }
  return { weights, nights, stepDays, foodDays };
}
