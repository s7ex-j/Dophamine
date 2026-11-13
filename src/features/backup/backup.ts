import { localDateKey } from "@/src/lib/dates";
import type { Store } from "@/src/db/web-storage";
import { isFood } from "@/src/features/nutrition/foods";
import { isMealEntry } from "@/src/features/nutrition/meals";
import { isWeeklyReview } from "@/src/features/reviews/reviews";
import { isSleepEntry } from "@/src/features/sleep/sleep";

/**
 * Respaldo de los datos en un archivo JSON.
 *
 * Este módulo es puro: arma y valida el contenido. Leer y escribir el archivo
 * es trabajo de `backup.repository` (una variante por plataforma).
 */

// Formato 2: agrega `reviews` (historial de revisiones semanales). Un respaldo
// de formato 1 se sigue leyendo; simplemente no trae revisiones.
// Formato 3: composición corporal en cada día, datos de la evaluación inicial en
// el plan y revisiones "auto". Son campos nuevos y opcionales: los formatos 1 y 2
// se leen igual.
// Formato 4: comidas por entrada (`meals`), alimentos propios y recetas (`foods`),
// ajustes (`settings`) y días sin pesaje (`weightKg` puede ser null). Los formatos
// anteriores se leen igual: sus días conservan el total que ya tenían.
// Formato 5: plan con datos de entrenamiento e ingesta (evaluación ampliada),
// alimentos con estado crudo/cocido, y ajustes libres en `settings` (orden del
// Panel, recordatorios). Todo opcional: los formatos 1 a 4 se leen igual.
// Formato 6: noches de sueño (`sleep`) y días marcados como incompletos
// (`partial`). Los formatos 1 a 5 se leen igual.
// Formato 7: sesiones de entreno serie por serie (`workouts[].sets`, con tipo de
// serie, ejercicio del catálogo y lado) e inicio de la sesión. Los formatos 1 a 6
// se leen igual: sus sesiones conservan una línea por ejercicio.
export const BACKUP_FORMAT = 7;

export type Backup = { app: "dophamine"; format: number; exportedAt: string; data: Store };

export class BackupError extends Error {}

export function buildBackup(store: Store, now = new Date()): Backup {
  return { app: "dophamine", format: BACKUP_FORMAT, exportedAt: now.toISOString(), data: store };
}

export const backupFileName = (now = new Date()) => `dophamine-respaldo-${localDateKey(now)}.json`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value);
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

/** Lee el texto de un respaldo. Lanza BackupError con un mensaje para mostrar si no es válido. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError("El archivo no es un respaldo de Dophamine: no se pudo leer.");
  }
  if (!isRecord(raw) || raw.app !== "dophamine" || !isRecord(raw.data))
    throw new BackupError("El archivo no es un respaldo de Dophamine.");
  if (!isNumber(raw.format) || (raw.format as number) > BACKUP_FORMAT)
    throw new BackupError("Este respaldo viene de una versión más nueva de Dophamine. Actualiza la app.");

  const data = raw.data;
  for (const key of ["biometrics", "wellbeing", "workouts"]) {
    if (!Array.isArray(data[key])) throw new BackupError(`El respaldo está incompleto: falta "${key}".`);
  }
  for (const key of ["habits", "routines", "reviews", "foods", "meals", "sleep"]) {
    if (data[key] !== undefined && !Array.isArray(data[key]))
      throw new BackupError(`El respaldo está dañado: "${key}" no tiene el formato esperado.`);
  }
  const biometricsOk = (data.biometrics as unknown[]).every(
    (entry) =>
      isRecord(entry) &&
      isDate(entry.date) &&
      (entry.weightKg === null || isNumber(entry.weightKg)) &&
      isNumber(entry.caloriesIn),
  );
  const wellbeingOk = (data.wellbeing as unknown[]).every((entry) => isRecord(entry) && isDate(entry.date));
  if (!biometricsOk || !wellbeingOk)
    throw new BackupError("El respaldo está dañado: hay registros sin fecha o con valores inválidos.");
  if (!((data.reviews as unknown[] | undefined) ?? []).every(isWeeklyReview))
    throw new BackupError("El respaldo está dañado: el historial de revisiones no es válido.");
  if (data.settings !== undefined && !isRecord(data.settings))
    throw new BackupError("El respaldo está dañado: los ajustes no tienen el formato esperado.");
  if (!((data.sleep as unknown[] | undefined) ?? []).every(isSleepEntry))
    throw new BackupError("El respaldo está dañado: hay noches de sueño con datos inválidos.");
  if (!((data.foods as unknown[] | undefined) ?? []).every(isFood))
    throw new BackupError("El respaldo está dañado: hay alimentos con datos inválidos.");
  if (!((data.meals as unknown[] | undefined) ?? []).every(isMealEntry))
    throw new BackupError("El respaldo está dañado: hay comidas con datos inválidos.");
  if (data.profile !== undefined && !(isRecord(data.profile) && isNumber(data.profile.calorieTarget)))
    throw new BackupError("El respaldo está dañado: el plan nutricional no es válido.");

  return {
    app: "dophamine",
    format: raw.format as number,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    data: {
      ...(data as unknown as Store),
      reviews: (data.reviews as Store["reviews"]) ?? [],
      foods: (data.foods as Store["foods"]) ?? [],
      meals: (data.meals as Store["meals"]) ?? [],
      sleep: (data.sleep as Store["sleep"]) ?? [],
    },
  };
}

/** Resumen corto de lo que contiene un respaldo, para mostrarlo antes de restaurar. */
export function describeBackup(backup: Backup): string {
  const { data } = backup;
  const count = (total: number, one: string, many: string) => `${total} ${total === 1 ? one : many}`;
  const parts = [
    count(data.biometrics.length, "día de registro", "días de registro"),
    count(data.workouts.length, "entreno", "entrenos"),
    count(data.wellbeing.length, "chequeo de bienestar", "chequeos de bienestar"),
    count(data.routines?.length ?? 0, "rutina", "rutinas"),
    count(data.reviews?.length ?? 0, "revisión", "revisiones"),
    count(data.meals?.length ?? 0, "comida registrada", "comidas registradas"),
    count(data.foods?.length ?? 0, "alimento propio", "alimentos propios"),
    count(data.sleep?.length ?? 0, "noche de sueño", "noches de sueño"),
  ];
  const date = backup.exportedAt ? ` del ${backup.exportedAt.slice(0, 10)}` : "";
  return `Respaldo${date}: ${parts.join(", ")}${data.profile ? " y tu plan" : ""}.`;
}
